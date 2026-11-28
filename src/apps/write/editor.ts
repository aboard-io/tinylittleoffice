/**
 * <to-write-editor>: the Write app. One bar (Insert ▾, the kinds of block, the marks, link, footnote, icon,
 * lists, indent, align, the look (the type it is set in, look.ts), paper, undo and redo) over one <to-text shape=doc> that owns the whole document's
 * blocks and is drawn as paper. The editor's ops are applied here with the kernel, recorded in the op-log
 * history (src/kit/text/history.ts) and written back to the shell as TLO in "docchange"; the title the shell
 * edits is a head field, and comes back as a `head` op in the history like any other.
 *
 * What is not words is a card the editor asks this host to draw: a table block as a grid whose cells are
 * `cells` ops, worked out in place by the formula engine; another document as a picture of its first page;
 * a page break (the kernel's `hr`, from Insert ▾ or Mod+Shift+Enter) as a thin dashed rule with its name in
 * the middle; a horizontal rule (that `hr` marked `{.rule}`, from Insert ▾ or `---` and Space) as a light
 * line with a little room above and below. The document's own head fields (an invoice's from and to) are
 * inputs over the text; the footnotes are listed under it (<to-notes>, kit/draw/notes.ts), each note's words
 * typed there, where they are drawn (a mark tapped, or a new footnote, puts the caret in its note; Enter,
 * Escape or ↩ come back to the mark), and the words are counted at the foot.
 *
 * A card is a thing in hand when it has the focus (a tap, Tab, the table's corner handle, Escape from a
 * cell): the bar under it is Edit, Move up, Move down, Duplicate | Copy, Cut, Paste | Delete (§6's order),
 * and the keys are the same (Enter, Alt+Up/Down, Mod+D, Mod+C/X/V, Delete; Escape or an arrow back to the
 * words). Undo is DocElement's: each edit carries a mark of where the caret, the cell or the card was, and
 * an undo puts it back.

 */
import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { guard } from 'lit/directives/guard.js';
import { SquarePen } from 'lucide';
import { isRule, parse, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { lookup } from '../../kit/core/app.ts';
import { cmdTool } from '../../kit/ui/bar.ts';
import { contextOf, drawnIn, labelOf, runKey } from '../../kit/core/commands.ts';
import { BOLD, BULLETS, CODE, FOOTNOTE, HIGHLIGHT, INDENT, ITALIC, LINK, NUMBERS, OUTDENT, STRIKE, UNDERLINE } from '../../kit/text/text-commands.ts';
import { copyData, pasteFrom, writeClip } from '../../kit/text/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/ui/context.ts';
import { editFence, editTable, makeDoc, newTable } from '../../kit/ui/doc-dialog.ts';
import { DocElement, firstAt, type Entry } from '../../kit/core/element.ts';
import { UI } from '../../kit/draw/icons.ts';
import { language, t } from '../../kit/core/i18n.ts';
import { noteIndex, noteMarks, type ToNotes } from '../../kit/draw/notes.ts';
import { askDocLink } from '../../kit/ui/insert-dialogs.ts';
import { blockLength, caret, insertBlocks, isWords, type Sel } from '../../kit/text/textops.ts';
import type { NoteAt, TextOps, ToText } from '../../kit/text/text.ts';
import {
  PAPERS,
  defaultPaper,
  duplicateBlock,
  fenceTitle,
  fieldsOf,
  moveBlock,
  paperOf,
  putAfter,
  removeBlock,
  setCellAt,
  tableColIn,
  tableColOut,
  tablePut,
  tableRename,
  tableSetType,
  tableRowsIn,
  tableRowsOut,
  tableView,
  wordCount,
  type Paper,
} from './model.ts';
import COMMANDS, { CARD, alignIcon } from './commands.ts';
import { lookOf, type LookId } from './look.ts';
import { fenceLink } from './view.ts';
import { LOCKED_LANG } from '../../kit/share/locked.ts';
import '../../kit/ui/locked-doc.ts';
import type { TableCmd, ToWriteTable } from './table.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/context.ts';
import '../../kit/ui/doc-dialog.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/draw/notes.ts';
import '../../kit/text/text.ts';
import './table.ts';
import './style.css';
import { qrBlock } from '../../kit/draw/qr-picture.ts';

export const tag = 'to-write-editor';

/** Where things were around an edit, handed back by an undo (the entry's mark): the caret before and after, a table's cell, a card in hand. */
interface Mark {
  before: Sel | null;
  after: Sel | null;
  cell?: { at: number; r: number; c: number; end?: [number, number] | null };
  /** The card in hand before the edit, and after it. */
  card?: number;
  cardAfter?: number;
  /** The footnote whose words were typed: an undo puts the caret back in it. */
  note?: number;
}
/** What a copy of a card holds. */
interface Clip {
  text: string;
  html: string;
}
/** How long a burst of typing stays one step (DocElement's own). */
const BURST = 700;

export class ToWriteEditor extends DocElement<Doc> {
  static properties: PropertyDeclarations = { ...DocElement.properties, cardAt: { state: true } };
  /** The question open in the dialog, if any. */
  /** The card in hand (it has the focus): its block; -1 for none. */
  declare cardAt: number;
  /** The selection the editor last reported, for the bar's pressed states. */
  sel: Sel | null = null;
  /** The last edit's key, time and mark, so a burst's mark says where it ended (for a redo). */
  private last: { key?: string; at: number; mark: Mark } | null = null;
  /** The card last copied here, for a paste when the system clipboard is refused. */
  private clip: Clip | null = null;

  constructor() {
    super();
    this.cardAt = -1;
  }
  protected read(doc: Doc): Doc {
    return doc;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onCardKey, true);
    this.addEventListener('keydown', this.onKey);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onCardKey, true);
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('focusout', this.onFocusOut);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener, true);
  }
  get text(): ToText {
    return this.querySelector<ToText>('to-text.write-text')!;
  }

  /* ---------- the document ---------- */

  /** A value from outside with the same blocks and another head is the head edited (the title): an edit like any other, undoable. */
  protected willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.hasUpdated && !this.ours(this.value) && this.value !== write(this.doc)) {
      const next = parse(this.value);
      if (write({ head: {}, blocks: next.blocks }) === write({ head: {}, blocks: this.doc.blocks })) {
        const keys = new Set([...Object.keys(this.doc.head), ...Object.keys(next.head)]);
        const ops: Op[] = [...keys].filter((k) => this.doc.head[k] !== next.head[k]).map((key) => ({ op: 'head', key, value: next.head[key] }));
        const sel = this.text?.sel ?? null;
        this.change(ops, { before: sel, after: sel });
      }
    }
    super.willUpdate(changed);
  }
  /** Ops applied and recorded, with the mark an undo hands back; a burst under one key keeps its first mark and learns where it ended. */
  private change(ops: Op[], mark: Mark, key?: string) {
    if (!ops.length) return;
    const now = Date.now();
    let l = this.last;
    if (key && l && l.key === key && now - l.at < BURST) {
      l.mark.after = mark.after;
      l.at = now;
    } else l = this.last = { key, at: now, mark };
    this.edit(ops, key, l.mark);
  }
  /** Ops from anywhere but the text (a head field, a block put in): recorded with the caret as it is. */
  private apply(ops: Op[], after: Sel | null = this.text?.sel ?? null) {
    this.change(ops, { before: this.text?.sel ?? null, after });
  }
  /** Ops from the words: a letter typed is a burst of its own block only, so typing here and then there is two steps. */
  private onOps = (e: CustomEvent<TextOps>) => {
    const { ops, sel, before, kind } = e.detail;
    this.change(ops, { before, after: sel }, kind === 'type' ? `type:${(before ?? sel).focus.block}` : undefined);
  };
  /** After an undo or a redo: the cell, the card or the caret where the change was. */
  protected undone(entry: Entry, redo: boolean) {
    const m = entry.mark as Mark | undefined;
    void this.drawn().then(() => {
      if (m?.cell && this.doc.blocks[m.cell.at]?.k === 'table') return void this.focusCell(m.cell.at, m.cell.r, m.cell.c, m.cell.end ?? null);
      const card = redo ? m?.cardAfter : m?.card;
      if (card !== undefined && this.isCard(card)) return this.holdCard(card);
      if (m?.note !== undefined && m.note < noteMarks(this.doc.blocks).length) return void this.notesEl?.focusNote(m.note);
      const sel = redo ? m?.after : m?.before;
      if (sel) this.text.sel = sel;
      else this.text.sel = caret(Math.max(0, firstAt(entry)), 0);
    });
  }
  /** Once this and the text are drawn. */
  private async drawn() {
    await this.updateComplete;
    await this.text.updateComplete;
  }
  /** The caret moved (or the words were drawn under it): drawn again only when the bar would show something else. */
  private onSelect = (e: CustomEvent<Sel | null>) => {
    this.sel = e.detail;
    if (this.barKey() !== this.barDrawn) this.requestUpdate();
  };
  /**
   * Everything the bar shows, as one key: the block's kind, its alignment and the marks at the caret, the look, the
   * paper, Undo and Redo, the language. The bar is drawn again only when it changes (`guard`), so a letter typed
   * into a paragraph draws the words and not the bar.
   */
  private barKey(): string {
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    return [this.text ? 1 : 0, x?.kind ?? '', x?.alignment ?? 'left', m.b, m.i, m.u, m.s, m.h, m.c, !!m.href, lookOf(this.doc).id, paperOf(this.doc), this.canUndo, this.canRedo, language()].join('|');
  }
  private barDrawn = '';

  /* ---------- putting things in ---------- */

  /** Where the caret is, or the end of the text. */
  private where(): Sel {
    const blocks = this.doc.blocks;
    return this.text?.sel ?? caret(Math.max(0, blocks.length - 1), 0);
  }
  /** A block put in at the caret, or where it was (`at`, kept while a dialog was open): the editor's own rule for blocks (words join, cards stand alone), the caret after it. */
  insertBlock(b: Block, at: Sel = this.where()) {
    const blocks = this.doc.blocks.length ? this.doc.blocks : [{ k: 'p', runs: [] } as Block];
    const prefix: Op[] = this.doc.blocks.length ? [] : [{ op: 'splice', at: 0, n: 0, blocks }];
    const e = insertBlocks(blocks, at, [b]);
    this.change([...prefix, ...e.ops], { before: at, after: e.sel });
    void this.drawn().then(() => (this.text.sel = e.sel));
  }
  /** Insert ▾'s Tiny Little Office Doc, asked for in the kit's dialog, then put in where the caret was. */
  async insertDocument() {
    const at = this.where();
    const fence = await askDocLink();
    if (fence) this.insertBlock(fence, at);
  }
  /** A table: three by three, opened in the Spreadsheet at once; Done (or Cancel, which keeps it blank) puts it in as one step. */
  async insertTable() {
    const at = this.where();
    const blank = newTable();
    this.insertBlock((await editTable(blank)) ?? blank, at);
  }
  /** A new document of another app, made in its own editor in the dialog; Done puts it in, Cancel puts nothing in. */
  async insertApp(id: string) {
    const at = this.where();
    const fence = await makeDoc(id);
    if (fence) this.insertBlock(fence, at);
  }
  /** The document or the table at `at` edited in its app, in the dialog: Done writes it back as one step, and it is in hand again. */
  private async editCard(at: number) {
    const b = this.doc.blocks[at];
    let next: Block | null = null;
    if (b?.k === 'table') next = await editTable(b);
    else if (b?.k === 'fence' && b.lang) next = await editFence(b);
    if (next && this.doc.blocks[at] === b) this.change([{ op: 'splice', at, n: 1, blocks: [next] }], { before: null, after: null, card: at, cardAfter: at });
    this.holdCard(at);
  }
  /** An icon from the kit's library (the whole of Lucide, imported lazily with the picker), put in at the caret. */
  async insertIcon() {
    const sel = this.text.sel;
    const { chooseIcon } = await import('../../kit/ui/icons-picker.ts');
    const name = await chooseIcon();
    if (!name) return;
    if (sel) this.text.sel = sel;
    this.text.exec('icon', name);
  }
  /** Insert ▾ QR code: a picture of this document's own link, drawn from the link as it is when it is shown. */
  insertQr() {
    this.insertBlock(qrBlock());
  }
  /** Whether a key is the words' own: typed in them (not a card's, not a field's), so Mod+Shift+R reloads the page from anywhere else. */
  wordsHave(e: KeyboardEvent): boolean {
    const at = e.target as HTMLElement;
    return !!this.text?.tx.contains(at) && !at.closest?.('.tx-card');
  }
  /** The Word Processor's keys (commands.ts: the alignments, the page break), after the words have answered theirs. */
  private onKey = (e: KeyboardEvent) => runKey(e, COMMANDS, this);

  /* ---------- the paper and the fields ---------- */

  setPaper(paper: Paper) {
    this.apply([{ op: 'head', key: 'paper', value: paper === defaultPaper() ? undefined : paper }]);
  }
  /** The look: a head field, absent for sans; each item a sample in its own type (style.css sets each by its place). */
  setLook(look: LookId) {
    this.apply([{ op: 'head', key: 'look', value: look === 'sans' ? undefined : look }]);
  }
  private setField(key: string, value: string) {
    this.apply([{ op: 'head', key, value: value.replace(/\n/g, ' | ').trim() || '' }]);
  }
  private renderFields() {
    const fields = fieldsOf(this.doc);
    if (!fields.length) return nothing;
    return html`<dl class="write-fields">
      ${fields.map(([k, v]) => {
        const lines = v.split(' | ');
        const tall = lines.length > 1 || k === 'from' || k === 'to';
        return html`<div>
          <dt><label for="write-field-${k}">${k}</label></dt>
          <dd>
            ${
              tall
                ? html`<textarea id="write-field-${k}" rows=${Math.max(2, lines.length)} .value=${lines.join('\n')} @change=${(e: Event) => this.setField(k, (e.target as HTMLTextAreaElement).value)}></textarea>`
                : html`<input id="write-field-${k}" type=${k === 'date' || k === 'due' ? 'date' : 'text'} .value=${v} @change=${(e: Event) => this.setField(k, (e.target as HTMLInputElement).value)} />`
            }
          </dd>
        </div>`;
      })}
    </dl>`;
  }

  /* ---------- the table ---------- */

  /** What the editor shows for a block that is not words: a grid for a table, a picture of another document. */
  private card = (b: Block, at: number): TemplateResult | null => {
    if (b.k === 'table') {
      const v = tableView(this.doc, at);
      if (!v) return null;
      return html`<to-write-table commands .view=${v} @wt-cell=${(e: CustomEvent<{ r: number; c: number; raw: string }>) => this.onCell(at, e)} @wt-do=${(e: CustomEvent<TableCmd>) => (e.preventDefault(), void this.onTable(at, e.detail))} @wt-exit=${() => this.afterCard(at)}></to-write-table>`;
    }
    // A document locked with a password: the locked card, which a tap opens for this visit (kit/ui/locked-doc.ts).
    if (b.k === 'fence' && b.lang === LOCKED_LANG) return html`<figure class="write-doc"><to-locked-doc caption .ref=${b.body}></to-locked-doc></figure>`;
    if (b.k === 'fence' && b.lang) {
      const def = lookup.appOf(b.lang);
      const page = def?.view(b.body, { small: true })[0];
      const name = fenceTitle(b.body) || def?.name || b.lang;
      return html`<figure class="write-doc">
        ${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${name}>${unsafeSVG(page.svg)}</svg>` : html`<pre>${b.body.split('\n').slice(0, 6).join('\n')}</pre>`}
        <figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption>
      </figure>`;
    }
    if (isRule(b)) return html`<div class="write-rule"><hr aria-label=${t('write-horizontal-rule')} /></div>`;
    if (b.k === 'hr') return html`<div class="write-break" role="separator" aria-label=${t('write-page-break')}><span>${t('write-page-break')}</span></div>`;
    return null;
  };
  private tableEl(at: number): ToWriteTable | null {
    return this.text?.blockEls()[at]?.querySelector<ToWriteTable>('to-write-table') ?? null;
  }
  /** The caret into a cell of the table at `at` (and a range from it), once drawn. */
  private async focusCell(at: number, r: number, c: number, end: [number, number] | null = null) {
    await this.drawn();
    await this.tableEl(at)?.focusCell(r, c, end);
  }
  private onCell(at: number, e: CustomEvent<{ r: number; c: number; raw: string }>) {
    const { r, c, raw } = e.detail;
    const sel = this.text?.sel ?? null;
    this.change(setCellAt(this.doc, at, r, c, raw), { before: sel, after: sel, cell: { at, r, c } }, `cell:${at}:${r}:${c}`);
  }
  /** What the grid asked for, as ops; then the cell it named takes the focus. */
  private async onTable(at: number, cmd: TableCmd) {
    let ops: Op[] = [];
    if (cmd.cmd === 'put') ops = tablePut(this.doc, at, cmd.cells);
    else if (cmd.cmd === 'rowsIn') ops = tableRowsIn(this.doc, at, cmd.r, cmd.n);
    else if (cmd.cmd === 'rowsOut') ops = tableRowsOut(this.doc, at, cmd.r0, cmd.r1);
    else if (cmd.cmd === 'colIn') ops = tableColIn(this.doc, at, cmd.c);
    else if (cmd.cmd === 'colOut') ops = tableColOut(this.doc, at, cmd.c);
    else if (cmd.cmd === 'type') ops = tableSetType(this.doc, at, cmd.c, cmd.type, cmd.currency);
    else if (cmd.cmd === 'rename') {
      ops = tableRename(this.doc, at, cmd.c, cmd.name);
    }
    const f = cmd.focus;
    const sel = this.text?.sel ?? null;
    this.change(ops, { before: sel, after: sel, ...(f ? { cell: { at, r: f[0], c: f[1], end: cmd.end ?? null } } : {}) });
    if (f) await this.focusCell(at, f[0], f[1], cmd.end ?? null);
  }

  /* ---------- a card in hand ---------- */

  private cardEl(at: number): HTMLElement | null {
    const el = this.text?.blockEls()[at];
    return el?.classList.contains('tx-card') ? el : null;
  }
  isCard(at: number): boolean {
    const b = this.doc.blocks[at];
    return !!b && !isWords(b);
  }
  /** Where a person starts: the caret at the start of the first words (a card in hand when there are none). */
  async focusFirst() {
    await this.drawn();
    const at = this.doc.blocks.findIndex(isWords);
    if (at < 0 && this.doc.blocks.length) return this.holdCard(0);
    this.text.sel = caret(Math.max(0, at), 0);
  }
  /** The card at `at` taken in hand: it has the focus, and the bar comes up under it. */
  holdCard(at: number) {
    void this.drawn().then(() => this.cardEl(at)?.focus({ preventScroll: true }));
  }
  /** Back to the words after the card (or before it, when there are none after). */
  afterCard(at: number, dir: 1 | -1 = 1) {
    const blocks = this.doc.blocks;
    const find = (d: 1 | -1) => {
      for (let i = at + d; i >= 0 && i < blocks.length; i += d) if (isWords(blocks[i])) return i;
      return -1;
    };
    let i = find(dir);
    let d = dir;
    if (i < 0) [i, d] = [find(dir === 1 ? -1 : 1), dir === 1 ? -1 : 1];
    if (i < 0) {
      // A card alone in the text: a paragraph is put in after it to write in.
      this.apply([{ op: 'splice', at: at + 1, n: 0, blocks: [{ k: 'p', runs: [] }] }], caret(at + 1, 0));
      return void this.drawn().then(() => (this.text.sel = caret(at + 1, 0)));
    }
    this.text.sel = caret(i, d === 1 ? 0 : blockLength(blocks[i]));
  }
  /** The card that has the focus, if it is one of the text's. */
  private heldIn(target: EventTarget | null): number {
    const el = target as HTMLElement | null;
    if (!el?.classList?.contains('tx-card') || el.parentElement !== this.text?.tx) return -1;
    return this.text.blockEls().indexOf(el);
  }
  private onFocusIn = (e: FocusEvent) => {
    const at = this.heldIn(e.target);
    if (at >= 0) this.cardAt = at;
  };
  private onFocusOut = (e: FocusEvent) => {
    if (this.heldIn(e.target) < 0) return;
    const to = e.relatedTarget as Node | null;
    if (to && this.querySelector('to-context.write-cardbar')?.contains(to)) return;
    this.cardAt = -1;
  };
  /** A card tapped: taken in hand. */
  private onCardTap = (e: CustomEvent<{ block: number }>) => {
    if (this.isCard(e.detail.block)) this.holdCard(e.detail.block);
  };
  /** What the card's Edit is: into the table's first cell, the document opened in its app. */
  private editOf(at: number): ContextEntry | null {
    const b = this.doc.blocks[at];
    if (!b) return null;
    if (b.k === 'table' || (b.k === 'fence' && b.lang && lookup.appOf(b.lang))) return { label: t('common-edit'), icon: SquarePen, keys: 'Enter', does: () => void this.editCard(at) };
    return null;
  }
  /** The card's Edit, as its words say it ('' where it has none), and done: for the card's commands (commands.ts). */
  editLabel(at: number): string {
    const e = this.editOf(at);
    return e && e !== SEP ? e.label : '';
  }
  editHeld() {
    const e = this.editOf(this.cardAt);
    if (e && e !== SEP) void e.does();
  }
  /** Whether the card is a document that opens in a new tab, and that done. */
  opensIn(at: number): boolean {
    return this.openOf(at).length > 0;
  }
  openHeld() {
    const o = this.openOf(this.cardAt)[0];
    if (o && o !== SEP) o.does();
  }
  /** How many blocks the document has. */
  get blockCount(): number {
    return this.doc.blocks.length;
  }
  /** A document held here, opened in its own app in a new tab: the lesser way, after Edit. */
  private openOf(at: number): ContextEntry[] {
    const b = this.doc.blocks[at];
    if (b?.k !== 'fence' || !b.lang) return [];
    const link = fenceLink(b.lang, b.body, `${location.origin}${location.pathname}`);
    return [{ label: t('common-open-in-new-tab'), icon: UI.open, does: () => void window.open(link, '_blank', 'noopener') }];
  }
  moveCard(at: number, by: 1 | -1) {
    const ops = moveBlock(this.doc, at, by);
    if (!ops) return;
    this.change(ops, { before: null, after: null, card: at, cardAfter: at + by });
    this.holdCard(at + by);
  }
  duplicateCard(at: number) {
    this.change(duplicateBlock(this.doc, at), { before: null, after: null, card: at, cardAfter: at + 1 });
    this.holdCard(at + 1);
  }
  removeCard(at: number) {
    const ops = removeBlock(this.doc, at);
    if (!ops.length) return;
    this.cardAt = -1;
    const after = caret(Math.min(at, this.doc.blocks.length - 2), 0);
    this.change(ops, { before: null, after, card: at });
    void this.drawn().then(() => {
      if (!this.doc.blocks.length) return this.text.focus();
      // Where the card was: the words after it, else those before (or the card that is there now, in hand).
      if (isWords(this.doc.blocks[Math.min(at, this.doc.blocks.length - 1)])) this.text.sel = caret(Math.min(at, this.doc.blocks.length - 1), 0);
      else this.afterCard(Math.min(at, this.doc.blocks.length - 1) - 1);
    });
  }
  /** The card as the clipboard holds it: its TLO, and our HTML. */
  private copyOf(at: number): Clip {
    return (this.clip = copyData(this.doc.blocks, caret(at, 0)));
  }
  /** The bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  copyOut(at: number, cut: boolean) {
    void writeClip(this.copyOf(at));
    if (cut) this.removeCard(at);
  }
  /** What is pasted onto a card in hand goes in after it: a card stays in hand, words get the caret at their end. */
  private pasteAfter(at: number, data: Clip) {
    const got = pasteFrom(data, 'doc');
    if (!got) return;
    const blocks: Block[] = 'runs' in got ? [{ k: 'p', runs: got.runs }] : got.blocks;
    const end = at + blocks.length;
    const lastB = blocks[blocks.length - 1];
    this.change(putAfter(at, blocks), { before: null, after: isWords(lastB) ? caret(end, blockLength(lastB)) : null, card: at, cardAfter: isWords(lastB) ? undefined : end });
    if (isWords(lastB)) void this.drawn().then(() => (this.text.sel = caret(end, blockLength(lastB))));
    else this.holdCard(end);
  }
  /** The bar's Paste: the system clipboard's words if the page may read them, else what was last copied here. */
  async pasteIn(at: number) {
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).replace(/\r\n?/g, '\n');
    } catch {
      // Refused: this page's own copy.
    }
    const data = text ? { text, html: this.clip?.text === text ? this.clip.html : '' } : this.clip;
    if (data) this.pasteAfter(at, data);
  }
  /** Mod+C, Mod+X, Mod+V with a card in hand. */
  private onClipboard = (e: ClipboardEvent) => {
    const at = this.heldIn(document.activeElement);
    const dt = e.clipboardData;
    if (at < 0 || !dt) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'paste') return this.pasteAfter(at, { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') });
    const c = this.copyOf(at);
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.removeCard(at);
  };
  /** The keys on a card in hand (commands.ts CARD, before the text hears them); anything else is left to the text. */
  private onCardKey = (e: KeyboardEvent) => {
    if (this.heldIn(e.target) < 0 || e.isComposing) return;
    if (runKey(e, CARD, this)) return void e.stopPropagation();
    const mod = e.metaKey || e.ctrlKey;
    // Typing on a card in hand does nothing to it, and nothing else: the text's own keys (Tab, Mod+B) are not the card's.
    if (e.key !== 'Tab' && !(mod && ['z', 'y', 'c', 'x', 'v', 'p', 'k'].includes(e.key.toLowerCase()))) e.stopPropagation();
  };
  /* ---------- the notes ---------- */

  get notesEl(): ToNotes | null {
    return this.querySelector<ToNotes>('to-notes.write-notes-list');
  }
  /** A mark tapped, or a footnote just put in: the caret in its note's words, at the end of the page. */
  private onNote = (e: CustomEvent<NoteAt>) => {
    const i = noteIndex(noteMarks(this.doc.blocks), e.detail.block, e.detail.nth);
    void this.updateComplete.then(() => this.notesEl?.focusNote(i));
  };
  /** A note's words typed: one `text` op on its mark, a burst of typing in one note one step. */
  private onNoteChange = (e: CustomEvent<{ nth: number; fn: string }>) => {
    const m = noteMarks(this.doc.blocks)[e.detail.nth];
    if (!m || m.fn === e.detail.fn) return;
    this.change([{ op: 'text', at: m.block, from: m.offset, to: m.offset + 1, runs: [{ t: '', fn: e.detail.fn }] }], { before: null, after: null, note: e.detail.nth }, `note:${e.detail.nth}`);
  };
  /** Back from a note to the words, the caret after its mark. */
  private onNoteBack = (e: CustomEvent<{ nth: number }>) => {
    const m = noteMarks(this.doc.blocks)[e.detail.nth];
    if (m) this.text.sel = caret(m.block, m.offset + 1);
  };
  /** A note left empty: its mark goes (the caret where it was, when the note was left for the words). */
  private onNoteRemove = (e: CustomEvent<{ nth: number; back: boolean }>) => {
    const m = noteMarks(this.doc.blocks)[e.detail.nth];
    if (!m) return;
    const at = caret(m.block, m.offset);
    this.change([{ op: 'text', at: m.block, from: m.offset, to: m.offset + 1, runs: [] }], { before: caret(m.block, m.offset + 1), after: at });
    if (e.detail.back) void this.drawn().then(() => (this.text.sel = at));
  };
  private renderNotes() {
    const notes = noteMarks(this.doc.blocks).map((m) => m.fn);
    if (!notes.length) return nothing;
    return html`<section class="write-notes" role="doc-endnotes" aria-label=${t('common-footnotes')}>
      <hr />
      <to-notes class="write-notes-list" backs .notes=${notes} @note-change=${this.onNoteChange} @note-back=${this.onNoteBack} @note-remove=${this.onNoteRemove}></to-notes>
    </section>`;
  }

  /* ---------- drawing ---------- */

  /** The bar, drawn from what barKey() names: the registry's commands (commands.ts, kit/text/text-commands.ts), the words' with the text as their context. */
  private renderBar(): TemplateResult {
    const x = this.text ?? null;
    const own = (id: string) => COMMANDS.find((c) => c.id === `write.${id}`)!;
    const menu = (id: string, cls: string, icon = own(id).icon!) =>
      html`<to-menu class=${cls} data-tool-group=${own(id).group ?? nothing} icon-only keep .label=${labelOf(own(id), this)} .icon=${icon} .items=${drawnIn(COMMANDS, `menu:${own(id).menu}`, this)}></to-menu>`;
    return html`<to-bar class="write-bar">
        <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${cmdTool(own('title'), this)} ${cmdTool(own('heading'), this)} ${cmdTool(own('subheading'), this)} ${cmdTool(own('paragraph'), this)}
        ${[BOLD, ITALIC, UNDERLINE, STRIKE, HIGHLIGHT, CODE, LINK, FOOTNOTE].map((c) => cmdTool(c, x))}
        ${cmdTool(own('icon'), this)}
        ${[BULLETS, NUMBERS, OUTDENT, INDENT].map((c) => cmdTool(c, x))}
        ${menu('align', 'write-align', alignIcon(this))} ${menu('look', 'write-look')} ${menu('paper', 'write-paper')}
        ${this.undoTools()}
      </to-bar>`;
  }

  render() {
    const paper = paperOf(this.doc);
    const look = lookOf(this.doc);
    const words = wordCount(this.doc);
    const key = (this.barDrawn = this.barKey());
    return html`${guard([key], () => this.renderBar())}
      <div class="write-page" data-paper=${paper} data-look=${look.id}>
        ${this.renderFields()}
        <to-text class="write-text" shape="doc" notes .blocks=${this.doc.blocks} .card=${this.card} label=${t('write-document')} placeholder=${t('write-here')} @text-ops=${this.onOps} @text-select=${this.onSelect} @text-embed=${this.onCardTap} @text-note=${this.onNote}></to-text>
        ${this.renderNotes()}
      </div>
      <div class="write-foot"><span>${t('write-n-words', { n: words })}</span><span>${PAPERS[paper].name}</span></div>
      <to-context class="write-cardbar" .label=${t('write-this-card')} .items=${(this.cardAt >= 0 ? contextOf(CARD, this) : []) as ContextEntry[]}></to-context>`;
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const bar = this.querySelector<ToContext>('to-context.write-cardbar');
    const card = this.cardAt >= 0 ? this.cardEl(this.cardAt) : null;
    if (bar && card) bar.show(card);
    else bar?.hide();
    // The words drawn the first time: the bar, drawn before them, again with them as its context.
    if (this.barKey() !== this.barDrawn) this.requestUpdate();
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToWriteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-write-editor': ToWriteEditor;
    'to-write-table': ToWriteTable;
  }
}
