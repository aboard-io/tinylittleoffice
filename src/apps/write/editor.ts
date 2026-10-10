/**
 * <to-write-editor>: the Write app. One bar (Insert ▾, the kinds of block, the marks, link, footnote, icon,
 * lists, indent, align, the look (the type it is set in, look.ts), paper, undo and redo) over one <to-text shape=doc> that owns the whole document's
 * blocks and is drawn as paper. The editor's ops are applied here with the kernel, recorded in the op-log
 * history (src/kit/history.ts) and written back to the shell as TLO in "docchange"; the title the shell
 * edits is a head field, and comes back as a `head` op in the history like any other.
 *
 * What is not words is a card the editor asks this host to draw: a table block as a grid whose cells are
 * `cells` ops, worked out in place by the formula engine; another document as a picture of its first page;
 * a web address alone as a click-to-load card (<to-embed>); a page break (the kernel's `hr`, from Insert ▾ or
 * Mod+Shift+Enter) as a thin dashed rule with its name in the middle. The document's own head fields (an invoice's
 * from and to) are inputs over the text; the footnotes are listed under it (<to-notes>, kit/notes.ts), each
 * note's words typed there, where they are drawn (a mark tapped, or a new footnote, puts the caret in its note;
 * Enter, Escape or ↩ come back to the mark), and the words are counted at the foot.
 *
 * A card is a thing in hand when it has the focus (a tap, Tab, the table's corner handle, Escape from a
 * cell): the bar under it is Edit, Move up, Move down, Duplicate | Copy, Cut, Paste | Delete (§6's order),
 * and the keys are the same (Enter, Alt+Up/Down, Mod+D, Mod+C/X/V, Delete; Escape or an arrow back to the
 * words). Undo is DocElement's: each edit carries a mark of where the caret, the cell or the card was, and
 * an undo puts it back.
 *
 * A contract's signatures fence is a card of its own (contract.ts): each row with its state, checked on open
 * and after every change (valid, with the day and the key's fingerprint; the words changed since, in red;
 * not signed yet), and **Sign this contract** on it, which signs the words with this device's key under the
 * name asked for and puts the row in, or puts it right where this key signed before.
 */
import { html, nothing, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { gateSvg } from '../../kit/pictures.ts';
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, CopyPlus, Palette, Pilcrow, Ruler, Scissors, SeparatorHorizontal, SquarePen } from 'lucide';
import { isEmbed, parse, plainText, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { apps } from '../../kit/apps.ts';
import { keysText, tool } from '../../kit/bar.ts';
import { copyData, linkToFence, pasteFrom } from '../../kit/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { editFence, editTable, makeDoc, newTable } from '../../kit/doc-dialog.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { noteIndex, noteMarks, type ToNotes } from '../../kit/notes.ts';
import { askDocLink, askEmbed, askPicture } from '../../kit/insert-dialogs.ts';
import { myKey, signerName, signWords } from '../../kit/privacy.ts';
import type { MenuItem } from '../../kit/menu.ts';
import { blockLength, caret, insertBlocks, isWords, type Sel } from '../../kit/textops.ts';
import type { NoteAt, TextOps, ToText } from '../../kit/text.ts';
import { PAPERS, defaultPaper, duplicateBlock, fenceTitle, fieldsOf, moveBlock, paperOf, putAfter, removeBlock, setCellAt, tableColIn, tableColOut, tablePut, tableRename, tableSetType, tableRowsIn, tableRowsOut, tableView, webBlock, wordCount, type Paper } from './model.ts';
import def from './def.ts';
import { LOOK_IDS, LOOKS, lookOf, type LookId } from './look.ts';
import { checkContract, contractText, printOf, readSignatures, signaturesAt, signedMessage, signOps, today, verdictOf } from './contract.ts';
import { fenceLink } from './view.ts';
import type { TableCmd, ToWriteTable } from './table.ts';
import '../../kit/bar.ts';
import '../../kit/context.ts';
import '../../kit/dialog.ts';
import '../../kit/doc-dialog.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/notes.ts';
import '../../kit/text.ts';
import './table.ts';
import './style.css';
import { qrBlock } from '../../kit/qr-picture.ts';

export const tag = 'to-write-editor';

/** A question with one box: what it asks, the box's name and hint, what is in it to begin with, and its kind. */
interface Ask {
  heading: string;
  label: string;
  placeholder: string;
  value: string;
  type: 'url' | 'text';
  done: (answer: string | null) => void;
}
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
type Alignment = 'left' | 'center' | 'right' | 'justify';
/** The alignment keys, with Shift and Mod: Google Docs' and Word's (docs/editing.md §1). */
const KEY_OF: Record<Alignment, string> = { left: 'L', center: 'E', right: 'R', justify: 'J' };
const ALIGN_KEYS: Record<string, Alignment> = { l: 'left', e: 'center', r: 'right', j: 'justify' };

export class ToWriteEditor extends DocElement<Doc> {
  static properties: PropertyDeclarations = { ...DocElement.properties, asking: { state: true }, cardAt: { state: true } };
  /** The question open in the dialog, if any. */
  declare asking: Ask | null;
  /** The card in hand (it has the focus): its block; -1 for none. */
  declare cardAt: number;
  /** The selection the editor last reported, for the bar's pressed states. */
  private sel: Sel | null = null;
  /** The last edit's key, time and mark, so a burst's mark says where it ended (for a redo). */
  private last: { key?: string; at: number; mark: Mark } | null = null;
  /** The card last copied here, for a paste when the system clipboard is refused. */
  private clip: Clip | null = null;

  constructor() {
    super();
    this.asking = null;
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
    if (changed.has('value') && this.hasUpdated && this.value !== write(this.doc)) {
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
  private onSelect = (e: CustomEvent<Sel | null>) => {
    this.sel = e.detail;
    this.requestUpdate();
  };

  /* ---------- putting things in ---------- */

  /** Where the caret is, or the end of the text. */
  private where(): Sel {
    const blocks = this.doc.blocks;
    return this.text?.sel ?? caret(Math.max(0, blocks.length - 1), 0);
  }
  /** A block put in at the caret, or where it was (`at`, kept while a dialog was open): the editor's own rule for blocks (words join, cards stand alone), the caret after it. */
  private insertBlock(b: Block, at: Sel = this.where()) {
    const blocks = this.doc.blocks.length ? this.doc.blocks : [{ k: 'p', runs: [] } as Block];
    const prefix: Op[] = this.doc.blocks.length ? [] : [{ op: 'splice', at: 0, n: 0, blocks }];
    const e = insertBlocks(blocks, at, [b]);
    this.change([...prefix, ...e.ops], { before: at, after: e.sel });
    void this.drawn().then(() => (this.text.sel = e.sel));
  }
  /** One question, asked in the dialog; null when it is closed without an answer. */
  private ask(heading: string, label: string, placeholder: string, value = '', type: 'url' | 'text' = 'url'): Promise<string | null> {
    return new Promise((done) => {
      this.asking = { heading, label, placeholder, value, type, done };
      void this.updateComplete.then(() => void this.querySelector<ToDialog>('to-dialog.write-ask')?.show());
    });
  }
  private answer(value: string | null) {
    const a = this.asking;
    if (!a) return;
    this.asking = null;
    this.querySelector<ToDialog>('to-dialog.write-ask')?.close();
    a.done(value);
  }
  /** Insert ▾'s things with an address, each asked for in the kit's dialog, then put in where the caret was. */
  private async insertPicture() {
    const at = this.where();
    const pic = await askPicture();
    if (pic) this.insertBlock({ k: 'img', alt: pic.alt, url: pic.url }, at);
  }
  private async insertWeb() {
    const at = this.where();
    const url = await askEmbed();
    if (url) this.insertBlock(linkToFence(url) ?? webBlock(url), at);
  }
  private async insertDocument() {
    const at = this.where();
    const fence = await askDocLink();
    if (fence) this.insertBlock(fence, at);
  }
  /** A table: three by three, opened in the Spreadsheet at once; Done (or Cancel, which keeps it blank) puts it in as one step. */
  private async insertTable() {
    const at = this.where();
    const blank = newTable();
    this.insertBlock((await editTable(blank)) ?? blank, at);
  }
  /** A new document of another app, made in its own editor in the dialog; Done puts it in, Cancel puts nothing in. */
  private async insertApp(id: string) {
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
  /** An icon from the kit's library (a lazy chunk, the whole of Lucide), put in at the caret. */
  private async insertIcon() {
    const sel = this.text.sel;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon();
    if (!name) return;
    if (sel) this.text.sel = sel;
    this.text.exec('icon', name);
  }
  private inserts(): MenuItem[] {
    return [
      { label: t('Table'), icon: UI.table, does: () => void this.insertTable() },
      { label: t('Web Picture…'), icon: UI.image, does: () => void this.insertPicture() },
      { label: t('Web Embed…'), icon: UI.globe, does: () => void this.insertWeb() },
      { label: t('Tiny Little Office Doc…'), icon: UI.insert, does: () => void this.insertDocument() },
      { label: t('QR code of this document'), icon: UI.qr, does: () => this.insertBlock(qrBlock()) },
      { label: t('Date'), icon: UI.calendar, does: () => this.text.exec('date') },
      { label: t('Page break'), icon: SeparatorHorizontal, hint: keysText('Mod+Shift+Enter'), does: () => this.insertBlock({ k: 'hr' }) },
      ...apps()
        .filter((a) => a.id !== def.id)
        .map((a) => ({ group: t('A new document'), label: a.name, icon: a.icon, does: () => void this.insertApp(a.id) })),
    ];
  }
  /**
   * Mod+Shift+Enter in the words: a page break at the caret (the browser's own would be a line break). Mod+Shift+L, E, R
   * and J: the block in hand left, centred, right or justified (Docs' and Word's keys, the Drawing Tool's too); taken
   * only while the words have the focus, so Mod+Shift+R reloads the page from anywhere else.
   */
  private onKey = (e: KeyboardEvent) => {
    const at = e.target as HTMLElement;
    if (!(e.metaKey || e.ctrlKey) || !e.shiftKey || e.altKey || e.isComposing || e.defaultPrevented || !this.text?.tx.contains(at) || at.closest?.('.tx-card')) return;
    const how = e.key === 'Enter' ? 'hr' : ALIGN_KEYS[e.key.toLowerCase()];
    if (!how) return;
    e.preventDefault();
    if (how === 'hr') this.insertBlock({ k: 'hr' });
    else this.text.exec(how);
  };

  /* ---------- the paper and the fields ---------- */

  private setPaper(paper: Paper) {
    this.apply([{ op: 'head', key: 'paper', value: paper === defaultPaper() ? undefined : paper }]);
  }
  private paperItems(): MenuItem[] {
    const now = paperOf(this.doc);
    return (Object.keys(PAPERS) as Paper[]).map((p) => ({ label: PAPERS[p].name, checked: p === now, does: () => this.setPaper(p) }));
  }
  /** The look: a head field, absent for sans; each item a sample in its own type (style.css sets each by its place). */
  private setLook(look: LookId) {
    this.apply([{ op: 'head', key: 'look', value: look === 'sans' ? undefined : look }]);
  }
  private lookItems(): MenuItem[] {
    const now = lookOf(this.doc).id;
    return LOOK_IDS.map((id) => ({ label: LOOKS[id].name(), hint: LOOKS[id].sample(), checked: id === now, does: () => this.setLook(id) }));
  }
  private alignItems(): MenuItem[] {
    const now = this.sel ? this.text.alignment : 'left';
    const pick = (how: Alignment, label: string, ic: typeof UI.alignLeft) => ({ label, icon: ic, keys: `Mod+Shift+${KEY_OF[how]}`, checked: now === how, does: () => this.text.exec(how) });
    return [pick('left', t('Align left'), UI.alignLeft), pick('center', t('Centre'), UI.alignCenter), pick('right', t('Align right'), UI.alignRight), pick('justify', t('Justify'), UI.alignJustify)];
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
            ${tall
              ? html`<textarea id="write-field-${k}" rows=${Math.max(2, lines.length)} .value=${lines.join('\n')} @change=${(e: Event) => this.setField(k, (e.target as HTMLTextAreaElement).value)}></textarea>`
              : html`<input id="write-field-${k}" type=${k === 'date' || k === 'due' ? 'date' : 'text'} .value=${v} @change=${(e: Event) => this.setField(k, (e.target as HTMLInputElement).value)} />`}
          </dd>
        </div>`;
      })}
    </dl>`;
  }

  /* ---------- the table ---------- */

  /** What the editor shows for a block that is not words: a grid for a table, a picture of another document, a thing from the web. */
  private card = (b: Block, at: number): TemplateResult | null => {
    if (b.k === 'table') {
      const v = tableView(this.doc, at);
      if (!v) return null;
      return html`<to-write-table commands .view=${v} @wt-cell=${(e: CustomEvent<{ r: number; c: number; raw: string }>) => this.onCell(at, e)} @wt-do=${(e: CustomEvent<TableCmd>) => (e.preventDefault(), void this.onTable(at, e.detail))} @wt-exit=${() => this.afterCard(at)}></to-write-table>`;
    }
    if (b.k === 'fence' && b.lang === 'signatures') return this.signaturesCard(b.body);
    if (b.k === 'fence' && b.lang) {
      const def = lookup.appOf(b.lang);
      const page = def?.view(b.body, { small: true })[0];
      const name = fenceTitle(b.body) || def?.name || b.lang;
      return html`<figure class="write-doc">
        ${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${name}>${unsafeSVG(gateSvg(page.svg))}</svg>` : html`<pre>${b.body.split('\n').slice(0, 6).join('\n')}</pre>`}
        <figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption>
      </figure>`;
    }
    if (b.k === 'hr') return html`<div class="write-break" role="separator" aria-label=${t('Page break')}><span>${t('Page break')}</span></div>`;
    if (b.k === 'p' && isEmbed(b)) return html`<to-embed url=${plainText(b.runs).trim()}></to-embed>`;
    return null;
  };
  private tableEl(at: number): ToWriteTable | null {
    return (this.text?.tx.children[at] as HTMLElement | undefined)?.querySelector<ToWriteTable>('to-write-table') ?? null;
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
    const el = this.text?.tx.children[at] as HTMLElement | undefined;
    return el?.classList.contains('tx-card') ? el : null;
  }
  private isCard(at: number): boolean {
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
  private afterCard(at: number, dir: 1 | -1 = 1) {
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
    return [...this.text.tx.children].indexOf(el);
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
  /** What the card's Edit is: into the table's first cell, the address changed, the document opened in its app. */
  private editOf(at: number): ContextEntry | null {
    const b = this.doc.blocks[at];
    if (!b) return null;
    if (b.k === 'fence' && b.lang === 'signatures') return { label: t('Sign this contract'), icon: UI.sign, keys: 'Enter', does: () => void this.signContract() };
    if (b.k === 'table' || (b.k === 'fence' && b.lang && b.lang !== 'signatures' && lookup.appOf(b.lang))) return { label: t('Edit'), icon: SquarePen, keys: 'Enter', does: () => void this.editCard(at) };
    if (b.k === 'img' || (b.k === 'p' && isEmbed(b))) {
      const swap = (next: Block) => this.change([{ op: 'splice', at, n: 1, blocks: [next] }], { before: null, after: null, card: at, cardAfter: at });
      return {
        label: t('Change the address…'),
        icon: UI.pen,
        keys: 'Enter',
        does: async () => {
          if (b.k === 'img') {
            const pic = await askPicture({ url: b.url, alt: b.alt });
            if (pic) swap({ ...b, url: pic.url, alt: pic.alt });
          } else {
            const url = await askEmbed(plainText(b.runs).trim());
            if (url) swap(webBlock(url));
          }
          this.holdCard(at);
        },
      };
    }
    return null;
  }
  /** A document held here, opened in its own app in a new tab: the lesser way, after Edit. */
  private openOf(at: number): ContextEntry[] {
    const b = this.doc.blocks[at];
    if (b?.k !== 'fence' || !b.lang || b.lang === 'signatures') return [];
    const link = fenceLink(b.lang, b.body, `${location.origin}${location.pathname}`);
    return [{ label: t('Open in a new tab'), icon: UI.open, does: () => void window.open(link, '_blank', 'noopener') }];
  }
  private moveCard(at: number, by: 1 | -1) {
    const ops = moveBlock(this.doc, at, by);
    if (!ops) return;
    this.change(ops, { before: null, after: null, card: at, cardAfter: at + by });
    this.holdCard(at + by);
  }
  private duplicateCard(at: number) {
    this.change(duplicateBlock(this.doc, at), { before: null, after: null, card: at, cardAfter: at + 1 });
    this.holdCard(at + 1);
  }
  private removeCard(at: number) {
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
  private copyOut(at: number, cut: boolean) {
    const c = this.copyOf(at);
    const plain = () => navigator.clipboard?.writeText(c.text).catch(() => undefined);
    try {
      void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]).catch(plain);
    } catch {
      void plain();
    }
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
  private async pasteIn(at: number) {
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
  /** The keys on a card in hand; anything else is left to the text. */
  private onCardKey = (e: KeyboardEvent) => {
    const at = this.heldIn(e.target);
    if (at < 0 || e.isComposing) return;
    const mod = e.metaKey || e.ctrlKey;
    const take = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (e.key === 'Enter' && !mod && !e.altKey && !e.shiftKey) {
      const edit = this.editOf(at);
      if (edit && edit !== SEP) {
        take();
        edit.does();
      }
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) return take(), this.removeCard(at);
    if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'd') return take(), this.duplicateCard(at);
    if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return take(), this.moveCard(at, e.key === 'ArrowUp' ? -1 : 1);
    if (e.key === 'Escape') return take(), this.afterCard(at);
    if (!mod && !e.altKey && !e.shiftKey && ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.key)) return take(), this.afterCard(at, e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1);
    // Typing on a card in hand does nothing to it, and nothing else: the text's own keys (Tab, Mod+B) are not the card's.
    if (e.key !== 'Tab' && !(mod && ['z', 'y', 'c', 'x', 'v', 'p'].includes(e.key.toLowerCase()))) e.stopPropagation();
  };
  /** The bar under a card in hand, in the standard's order. */
  private cardItems(at: number): ContextEntry[] {
    if (!this.isCard(at)) return [];
    const n = this.doc.blocks.length;
    const edit = this.editOf(at);
    return [
      ...(edit ? [edit] : []),
      ...this.openOf(at),
      { label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: at === 0, does: () => this.moveCard(at, -1) },
      { label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: at >= n - 1, does: () => this.moveCard(at, 1) },
      { label: t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', does: () => this.duplicateCard(at) },
      SEP,
      { label: t('Copy'), icon: Copy, keys: 'Mod+C', does: () => this.copyOut(at, false) },
      { label: t('Cut'), icon: Scissors, keys: 'Mod+X', does: () => this.copyOut(at, true) },
      { label: t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', does: () => void this.pasteIn(at) },
      SEP,
      { label: t('Delete'), icon: UI.trash, keys: 'Delete', does: () => this.removeCard(at) },
    ];
  }

  /* ---------- a contract's signatures ---------- */

  /** The document last checked, so each is checked once. */
  private checked: Doc | null = null;

  private signaturesCard(body: string): TemplateResult {
    const rows = readSignatures(body);
    const text = contractText(this.doc);
    const words: Record<string, string> = { valid: t('Signed these words'), mismatch: t('The words have changed since this was signed'), unsigned: t('Not signed yet'), checking: t('Checking…') };
    return html`<div class="write-signatures" role="group" aria-label=${t('Signatures')}>
      ${rows.length
        ? html`<div class="write-sig-list" role="list">
            ${rows.map((s) => {
              const v = verdictOf(text, s) ?? 'checking';
              return html`<div class="write-sig ${v}" role="listitem">
                <b>${s.name || t('Unnamed')}</b>
                <span class="write-sig-state">${icon(v === 'valid' ? UI.shield : v === 'mismatch' ? UI.mismatch : UI.unsigned, 14)}<span>${words[v]}</span></span>
                ${s.key ? html`<small>${[s.date, t('key {fp}', { fp: printOf(s.key) })].filter(Boolean).join(' · ')}</small>` : nothing}
              </div>`;
            })}
          </div>`
        : html`<span class="to-hint">${t('No one has signed yet.')}</span>`}
      <button type="button" class="to-btn write-sign" @click=${() => void this.signContract()}>${icon(UI.sign, 16)}<span>${t('Sign this contract')}</span></button>
    </div>`;
  }
  /**
   * The contract signed with this device's key, under the name asked for (the one this key signed under before,
   * else the name this device signs under, else the document's own "by" when nobody has signed under it yet).
   */
  private async signContract() {
    const at = signaturesAt(this.doc);
    if (at < 0) return;
    const b = this.doc.blocks[at];
    const rows = b.k === 'fence' ? readSignatures(b.body) : [];
    const me = await myKey();
    const by = this.doc.head.by ?? '';
    const guess = rows.find((r) => me && r.key === me)?.name || signerName() || (by && !rows.some((r) => r.sig && r.name === by) ? by : '');
    const name = (await this.ask(t('Sign this contract'), t('Your name'), t('Your name, as it is signed'), guess, 'text'))?.replace(/\s+/g, ' ').trim();
    if (!name) return void (signaturesAt(this.doc) >= 0 && this.holdCard(signaturesAt(this.doc)));
    const { key, sig } = await signWords(signedMessage(contractText(this.doc), name), name);
    const ops = signOps(this.doc, { name, key, sig, date: today() });
    this.change(ops, { before: null, after: null, card: at, cardAfter: at });
    await this.check();
    this.holdCard(signaturesAt(this.doc));
  }
  /** Every signature verified against the words as they are now, then drawn with what was found. */
  private async check() {
    const doc = this.doc;
    this.checked = doc;
    if (signaturesAt(doc) < 0) return;
    await checkContract(doc);
    if (this.doc === doc) this.text?.requestUpdate();
  }

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
    return html`<section class="write-notes" role="doc-endnotes" aria-label=${t('Footnotes')}>
      <hr />
      <to-notes class="write-notes-list" backs .notes=${notes} @note-change=${this.onNoteChange} @note-back=${this.onNoteBack} @note-remove=${this.onNoteRemove}></to-notes>
    </section>`;
  }

  /* ---------- drawing ---------- */

  render() {
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    const kind = x?.kind ?? null;
    const on = (c: 'b' | 'i' | 'u' | 's' | 'h') => !!m[c];
    const paper = paperOf(this.doc);
    const look = lookOf(this.doc);
    const words = wordCount(this.doc);
    const alignIcon = { left: UI.alignLeft, center: UI.alignCenter, right: UI.alignRight, justify: UI.alignJustify }[x?.alignment ?? 'left'];
    const a = this.asking;
    return html`<to-bar class="write-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Title'), icon: UI.text, keep: true, pressed: kind === 'title', does: () => this.text.exec(kind === 'title' ? 'p' : 'title') })}
        ${tool({ label: t('Heading'), icon: UI.heading1, keep: true, pressed: kind === 'h1', does: () => this.text.exec(kind === 'h1' ? 'p' : 'h1') })}
        ${tool({ label: t('Subheading'), icon: UI.heading, keep: true, pressed: kind === 'h2', does: () => this.text.exec(kind === 'h2' ? 'p' : 'h2') })}
        ${tool({ label: t('Paragraph'), icon: Pilcrow, keep: true, pressed: kind === 'p', does: () => this.text.exec('p') })}
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: on('b'), does: () => this.text.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: on('i'), does: () => this.text.exec('i') })}
        ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: on('u'), does: () => this.text.exec('u') })}
        ${tool({ label: t('Strikethrough'), icon: UI.strike, keys: 'Mod+Shift+X', keep: true, pressed: on('s'), does: () => this.text.exec('s') })}
        ${tool({ label: t('Highlight'), icon: UI.highlight, keys: 'Mod+Shift+H', keep: true, pressed: on('h'), does: () => this.text.exec('h') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.text.exec('link') })}
        ${tool({ label: t('Footnote'), icon: UI.footnote, keep: true, does: () => this.text.exec('fn') })}
        ${tool({ label: t('Icon'), icon: UI.icon, keep: true, does: () => void this.insertIcon() })}
        ${tool({ label: t('Bulleted list'), icon: UI.list, keep: true, pressed: kind === 'ul', does: () => this.text.exec('ul') })}
        ${tool({ label: t('Numbered list'), icon: UI.listOrdered, keep: true, pressed: kind === 'ol', does: () => this.text.exec('ol') })}
        ${tool({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', keep: true, disabled: kind !== 'ul' && kind !== 'ol', does: () => this.text.exec('outdent') })}
        ${tool({ label: t('Indent'), icon: UI.indent, keys: 'Tab', keep: true, disabled: kind !== 'ul' && kind !== 'ol', does: () => this.text.exec('indent') })}
        <to-menu class="write-align" icon-only keep .label=${t('Align')} .icon=${alignIcon} .items=${this.alignItems()}></to-menu>
        <to-menu class="write-look" icon-only keep .label=${t('Look: {theme}', { theme: look.name() })} .icon=${Palette} .items=${this.lookItems()}></to-menu>
        <to-menu class="write-paper" icon-only keep .label=${t('Paper: {paper}', { paper: PAPERS[paper].name })} .icon=${Ruler} .items=${this.paperItems()}></to-menu>
        ${this.undoTools()}
      </to-bar>
      <div class="write-page" data-paper=${paper} data-look=${look.id}>
        ${this.renderFields()}
        <to-text class="write-text" shape="doc" notes .blocks=${this.doc.blocks} .card=${this.card} label=${t('Document')} placeholder=${t('Write here.')} @text-ops=${this.onOps} @text-select=${this.onSelect} @text-embed=${this.onCardTap} @text-note=${this.onNote}></to-text>
        ${this.renderNotes()}
      </div>
      <div class="write-foot"><span>${t('{n|one word|# words}', { n: words })}</span><span>${PAPERS[paper].name}</span></div>
      <to-context class="write-cardbar" .label=${t('This card')} .items=${this.cardItems(this.cardAt)}></to-context>
      <to-dialog class="write-ask" heading=${a?.heading ?? ''} @to-close=${() => this.answer(null)} .body=${a
        ? html`<form class="write-ask-form" @submit=${(e: Event) => (e.preventDefault(), this.answer((e.target as HTMLFormElement).querySelector('input')!.value))}>
            <label class="to-field"><span>${a.label}</span><input type=${a.type} name="answer" .value=${a.value} placeholder=${a.placeholder} autocomplete="off" autocapitalize="off" spellcheck="false" inputmode=${a.type === 'url' ? 'url' : 'text'} enterkeyhint="done" ?required=${a.type === 'url'} /></label>
            <div class="to-row"><button type="submit" class="to-btn primary">${icon(UI.check, 16)}<span>${t('OK')}</span></button></div>
          </form>`
        : nothing}></to-dialog>`;
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (this.checked !== this.doc) void this.check();
    if (changed.has('asking') && this.asking) void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.write-ask-form input')?.focus({ preventScroll: true }));
    const bar = this.querySelector<ToContext>('to-context.write-cardbar');
    const card = this.cardAt >= 0 ? this.cardEl(this.cardAt) : null;
    if (bar && card) bar.show(card);
    else bar?.hide();
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToWriteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-write-editor': ToWriteEditor;
    'to-write-table': ToWriteTable;
  }
}
