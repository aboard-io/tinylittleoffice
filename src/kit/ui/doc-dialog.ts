/**
 * <to-doc-dialog>: another document held in this one, edited where it is. A modal (a native <dialog>, the
 * whole screen on a phone, large on a desktop) holding that app's own editor: the Drawing Tool's over a
 * drawing, the Spreadsheet's over a table. Done hands back the document as it now is, Cancel (or Escape,
 * while nothing has changed) hands back nothing; the host writes Done's text as one op, so one undo there
 * takes the whole visit back. Inside, Mod+Z and Mod+Shift+Z are the inner editor's own history.
 *
 *   editDoc({ app, text })  the app's editor (its definition's editor(), in the app file) over `text`; resolves the text, or null.
 *   makeDoc(app)            a new document of the app, made there: the fence that holds it, or null.
 *   editFence(fence)        the document a fence holds, edited: the fence as it now is, or null when unchanged
 *                           (a locked one opened first, by kit/ui/locked-doc.ts, and sealed again under the same password).
 *   editTable(table)        the Spreadsheet's editor over a document of that one table block, with Rows and
 *                           Columns in the dialog's bar to set its size; resolves the table block, or null.
 */
import { LitElement, html, nothing } from 'lit';
import { COL_NAMES, MAX_COLS, ROWS, parse, write, type Block, type TableBlock } from '../../doc/index.ts';
import { lookup, type AppDef, type Editor } from '../core/app.ts';
import { icon, UI } from '../draw/icons.ts';
import { LOCKED_LANG, setOpened } from '../share/locked.ts';
import { openPlaced } from './locked-doc.ts';
import { pack } from '../share/crypt.ts';
import { routeHash } from '../core/route.ts';
import { t } from '../core/i18n.ts';

let n = 0;

/** A table of that many rows and columns: rows taken off or put on at the end (blank), columns the same (going by their letters). */
export function resizeTable(table: TableBlock, rows: number, cols: number): TableBlock {
  const c = Math.max(1, Math.min(MAX_COLS, cols));
  const r = Math.max(0, Math.min(ROWS, rows));
  const colsOut = table.cols.slice(0, c);
  while (colsOut.length < c) colsOut.push({ name: `Col${COL_NAMES[colsOut.length]}`, type: 'text' });
  const fit = (row: string[]) => Array.from({ length: c }, (_, i) => row[i] ?? '');
  const rowsOut = table.rows.slice(0, r).map(fit);
  while (rowsOut.length < r) rowsOut.push(fit([]));
  return { ...table, cols: colsOut, rows: rowsOut };
}
/** A new table to type into: three columns that go by their letters, three blank rows. */
export const newTable = (): TableBlock => resizeTable({ k: 'table', cols: [], rows: [] }, 3, 3);
/** The first table of a document's text. */
const tableIn = (text: string): TableBlock | null => (parse(text).blocks.find((b) => b.k === 'table') as TableBlock | undefined) ?? null;

export class ToDocDialog extends LitElement {
  static properties = { heading: {}, sizing: { type: Boolean }, rows: { state: true }, cols: { state: true } };
  declare heading: string;
  /** The Rows and Columns fields are shown (a table). */
  declare sizing: boolean;
  declare rows: number;
  declare cols: number;
  readonly uid = `to-doc-dialog-${++n}`;
  /** The document as it is now, and as it came. */
  text = '';
  private start = '';
  private done: ((text: string | null) => void) | null = null;

  constructor() {
    super();
    this.heading = '';
    this.sizing = false;
    this.rows = 0;
    this.cols = 0;
  }
  createRenderRoot() {
    return this;
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector('dialog')!;
  }
  /** The editor inside. */
  get editor(): Editor | null {
    return this.querySelector<Editor>('.to-doc-dialog-body > *');
  }

  /** The app's editor over `text`, shown; resolves with the text on Done, null on Cancel. */
  async open(def: AppDef, text: string): Promise<string | null> {
    this.text = this.start = text;
    this.heading ||= def.name;
    this.measure();
    await this.updateComplete;
    const { tag } = await def.editor();
    const ed = document.createElement(tag) as Editor;
    ed.value = text;
    ed.addEventListener('docchange', this.onChange);
    this.querySelector('.to-doc-dialog-body')!.replaceChildren(ed);
    this.dialog.showModal();
    // The focus on the document, not on the first field the dialog finds (Rows, or a box that would bring up a phone's keyboard).
    this.querySelector<HTMLElement>('.to-doc-dialog-body')!.focus({ preventScroll: true });
    return new Promise((done) => (this.done = done));
  }
  /** Done: the document as it now is (a table at least the size asked for: the sheet keeps no blank rows at its end). */
  finish(ok: boolean) {
    let out: string | null = ok ? this.text : null;
    if (ok && this.sizing) {
      const tb = tableIn(this.text);
      if (tb) out = write({ head: {}, blocks: [resizeTable(tb, Math.max(this.rows, tb.rows.length), tb.cols.length)] });
    }
    const done = this.done;
    this.done = null;
    if (this.dialog.open) this.dialog.close();
    done?.(out);
  }
  /** The table's size, read from the text: the rows asked for stay until more are typed into. */
  private measure() {
    const tb = this.sizing ? tableIn(this.text) : null;
    if (!tb) return;
    this.rows = Math.max(this.rows, tb.rows.length);
    this.cols = tb.cols.length;
  }
  private onChange = (e: Event) => {
    e.stopPropagation();
    this.text = (e as CustomEvent<string>).detail;
    this.measure();
  };
  /** Rows or Columns set: the table made that size, and the editor given it. */
  private resize(rows: number, cols: number) {
    const tb = tableIn(this.text);
    if (!tb || !Number.isFinite(rows) || !Number.isFinite(cols)) return;
    const next = resizeTable(tb, rows, cols);
    this.rows = next.rows.length;
    this.cols = next.cols.length;
    this.text = write({ head: {}, blocks: [next] });
    const ed = this.editor;
    if (ed) ed.value = this.text;
  }
  /** Undo and redo inside are the inner editor's, as the shell would pass them on; never from a box of the kit's own or a popover. */
  private onKey = (e: KeyboardEvent) => {
    const at = e.target as Element;
    if (e.key === 'Escape') {
      // Escape closes it only while there is nothing to lose, and only when the editor did not take the key itself.
      if (!e.defaultPrevented && this.text === this.start) this.finish(false);
      return;
    }
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
    const ed = this.editor;
    if (!ed || !ed.contains(at) || at.closest('[popover], to-link-pop') || at.closest('dialog') !== this.dialog || at.matches('input[class*="to-"], textarea[class*="to-"]')) return;
    const k = e.key.toLowerCase();
    const which = k === 'z' && !e.shiftKey ? 'docundo' : (k === 'z' && e.shiftKey) || k === 'y' ? 'docredo' : '';
    if (!which) return;
    e.preventDefault();
    ed.dispatchEvent(new CustomEvent(which, { cancelable: true, bubbles: true }));
  };
  render() {
    const num = (label: string, value: number, max: number, set: (v: number) => void) =>
      html`<label class="to-doc-dialog-size"><span>${label}</span><input class="to-num" type="number" inputmode="numeric" min="1" max=${max} .value=${String(value)} @change=${(e: Event) => set(Math.round(Number((e.target as HTMLInputElement).value)))} /></label>`;
    return html`<dialog class="to-doc-dialog" aria-labelledby=${this.uid} @cancel=${(e: Event) => e.preventDefault()} @keydown=${this.onKey}>
      <header class="to-doc-dialog-head">
        <h2 id=${this.uid}>${this.heading}</h2>
        ${this.sizing ? html`<div class="to-doc-dialog-sizes" role="group" aria-label=${t('common-size')}>${num(t('doc-rows'), this.rows, ROWS, (v) => this.resize(v, this.cols))}<span aria-hidden="true">×</span>${num(t('common-columns'), this.cols, MAX_COLS, (v) => this.resize(this.rows, v))}</div>` : nothing}
        <span class="to-doc-dialog-gap"></span>
        <button type="button" class="to-btn to-doc-dialog-cancel" @click=${() => this.finish(false)}>${t('common-cancel')}</button>
        <button type="button" class="to-btn primary to-doc-dialog-done" @click=${() => this.finish(true)}>${icon(UI.check, 16)}<span>${t('common-done')}</span></button>
      </header>
      <div class="to-doc-dialog-body" tabindex="-1"></div>
    </dialog>`;
  }
}
if (!customElements.get('to-doc-dialog')) customElements.define('to-doc-dialog', ToDocDialog);

declare global {
  interface HTMLElementTagNameMap {
    'to-doc-dialog': ToDocDialog;
  }
}

/** A document of an app, edited in the dialog: its text on Done, null on Cancel (or when no app goes by that name). */
export async function editDoc(o: { app: string; text: string; heading?: string; sizing?: boolean }): Promise<string | null> {
  const def = lookup.appOf(o.app);
  // A QR code is drawn, not edited (kit/draw/qr-picture.ts).
  if (!def || o.app === 'qr' || o.app === LOCKED_LANG) return null;
  const d = document.createElement('to-doc-dialog');
  d.heading = o.heading ?? '';
  d.sizing = !!o.sizing;
  document.body.append(d);
  try {
    return await d.open(def, o.text);
  } finally {
    d.remove();
  }
}

/** A table block, edited in the Spreadsheet in the dialog, with its size: the block on Done, null on Cancel. */
export async function editTable(table: TableBlock): Promise<TableBlock | null> {
  const out = await editDoc({ app: 'sheet', text: write({ head: {}, blocks: [table] }), heading: t('common-table'), sizing: true });
  return out === null ? null : (tableIn(out) ?? table);
}

type Fence = Extract<Block, { k: 'fence' }>;
/** A fence's body as its app's text, which ends in a new line, and back: the fence keeps none at its end. */
const asText = (body: string) => (body && !body.endsWith('\n') ? `${body}\n` : body);
const asBody = (text: string) => text.replace(/\n$/, '');

/** A new document of an app, made in its editor in the dialog: the fence that holds it on Done, null on Cancel. */
export async function makeDoc(app: string): Promise<Fence | null> {
  const def = lookup.appOf(app);
  const out = def ? await editDoc({ app, text: def.blank() }) : null;
  return out === null ? null : { k: 'fence', lang: app, body: asBody(out) };
}
/** The document a fence holds, edited in its app in the dialog: the fence with its new body, or null on Cancel or when nothing changed. */
export async function editFence(fence: Fence): Promise<Fence | null> {
  // A locked one is opened first, and sealed again under its password (kit/ui/locked-doc.ts).
  if (fence.lang === LOCKED_LANG) return editLocked(fence);
  const out = await editDoc({ app: fence.lang, text: asText(fence.body) });
  const body = out === null ? fence.body : asBody(out);
  return body === fence.body ? null : { ...fence, body };
}

/** A locked fence's document edited in its app, sealed again under its password: the fence with its new link, or null (not opened, cancelled, unchanged). */
async function editLocked(fence: Fence): Promise<Fence | null> {
  const o = await openPlaced(fence.body);
  if (!o) return null;
  const out = await editDoc({ app: o.app, text: o.text });
  if (out === null || out === o.text) return null;
  const payload = await pack(out, o.locker);
  setOpened(payload, out);
  return { ...fence, body: routeHash(o.app, payload) };
}
