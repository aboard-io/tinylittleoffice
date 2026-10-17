/**
 * <to-sheet-editor>: a spreadsheet with formulas, and a chart of it if you ask. A grid of <input>s over the
 * kernel's table (model.ts reads it; every command is Op[] through edit()).
 *
 * Three columns to start; the + at the end of the header adds one, and a column's menu puts one in after
 * it or takes it out (whatever it holds: references into it become #REF; the table keeps one column, and
 * the sheet is drawn three wide at the least). The letters over the columns and the numbers down the side
 * are the sheet's own controls, not cells: drawn quietly, the side as narrow as its widest number. The table scrolls in a box of its
 * own, its header rows and row numbers stuck to its edges, and the page under it holds still: a cell is
 * focused without scrolling the page, and the bar above keeps its shape whatever is selected.
 *
 * Drag across cells (or hold Shift) to select a block: it can be copied, cut, pasted, cleared, or carried
 * on with the handle at its corner. While a formula is being edited, tapping another cell inserts its
 * reference instead of moving there. Column widths are a view setting, not part of the document.
 *
 * It edits as docs/editing.md §4 says a grid does: a cell reached is selected whole, so typing replaces it (F2
 * puts the caret at the end); Enter, Tab and the arrows move; Escape puts back what the cell held; Mod+D fills
 * down; Alt+Up/Down move rows. A block has a bar under it (fill, Copy, Cut, Paste, Clear), the clipboard holds
 * the cells as text and as our table HTML, and every edit marks the cells it touched so an undo selects them.
 *
 * What a column holds changes its cells: a checkbox is a box a tap (or Space) ticks; an option cell offers
 * the words its column already holds (a <datalist>, opened by its caret) and takes new ones; a rich cell is a
 * <to-text shape=line> (the selection bubble for its marks), its words written by the code in the kernel's
 * inline form, the grid's keys kept round it and the formula strip showing its plain words, read-only.
 *
 * Find in this document (Mod+F) goes from cell to matching cell: `find()` is the kit's Findable.
 *
 * Read-only (a page's, docs/library.md step 8), a cell activated is picked ("docpick", its row and column), and the
 * page may mark rows and cells (`marks`, SheetMark: a count of comments, say): a small badge at the end of the row's
 * first cell, or of the cell named, its words the page's and its title said on hover, drawn over the sheet and never
 * written into the document. A sheet that edits draws none; with none given the sheet is drawn as ever.
 *
 * On a phone with the keyboard up (Paul, 2026-10-11: "no room to navigate"): the header steps aside as for any box
 * (kit/ui/chrome.ts `editing`), the formula strip takes the column's top with the menu button at its end, the column
 * heads are one line (the letter and the name, style.css), the table's box is what is left above the bar, and the cell
 * in hand is kept in sight as that box changes its height. A number, money or percent column asks for the numbers
 * keyboard, a date column for the digits, a formula for the letters from its = on; the bar's ABC (`letters`) asks for
 * the letters in that column for the visit (the device's own switch works too).
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowUp, Lock, LockOpen, MoveHorizontal, Trash2 } from 'lucide';
import { cmdMenu, cmdTool } from '../../kit/ui/bar.ts';
import { contextOf, drawnIn, runKey } from '../../kit/core/commands.ts';
import COMMANDS from './commands.ts';
import type { TextOps, ToText, Sel } from '../../kit/text/text.ts';
import { type ChartKind } from '../../kit/draw/chart.ts';
import { clipText, docToHtml, GENERATOR, htmlToBlocks } from '../../kit/text/clipboard.ts';
import { type ContextEntry, type ToContext } from '../../kit/ui/context.ts';
import { DocElement, type Entry, type Picked } from '../../kit/core/element.ts';
import { icon, UI } from '../../kit/draw/icons.ts';
import { t } from '../../kit/core/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/ui/menu.ts';
import { toast } from '../../kit/core/say.ts';
import type { Found } from '../../kit/ui/find.ts';
import { fold } from '../../kit/share/search.ts';
import {
  COL_NAMES,
  FUNCTIONS,
  MAX_COLS,
  ROWS,
  applyAll,
  clearCells,
  columnText,
  copyCells,
  fillCells,
  isLocked,
  isText,
  parse,
  parseInline,
  pasteCells,
  plainText,
  rangeOf,
  rangeRef,
  rcToRef,
  runLength,
  writeInline,
  type Block,
  type ColType,
  type Column,
  type Doc,
  type Op,
  type Range,
  type Run,
} from '../../doc/index.ts';
import {
  MIN_COLS,
  defaultType,
  addColumn,
  currencyAt,
  deleteRows,
  insertRows,
  isLetterName,
  moveRows,
  putRect,
  readSheet,
  removable,
  removeColumn,
  rename,
  setCell,
  setChart,
  setLock,
  setType,
  sortBy,
  typeName,
  type SheetView,
} from './model.ts';
import { COLUMN_KINDS, choicesOf, kindItems } from '../../kit/text/columns.ts';
import { cellText, chartOf } from './view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/context.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/text/text.ts';
import { remScale } from '../../kit/ui/zoom.ts';
import { reveal } from '../../kit/ui/scroll.ts';
import './style.css';

export const tag = 'to-sheet-editor';

/** A page's mark on a read-only sheet: on a row (at its first cell) or on one cell, its words (a count) and what hovering it says. */
export interface SheetMark {
  /** The table's row, from 0, as "docpick" names it. */
  row: number;
  /** The column, from 0; none, the row's first cell. */
  col?: number;
  text: string;
  title?: string;
}

const MIN_COL = 48;
/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
/** A column put in by hand starts this wide, when widths have been set by hand. */
const NEW_COL = 120;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Where the selection was when an edit began (or the cells it wrote): an undo puts it back. */
type Mark = { sel: [number, number]; end: [number, number] | null };
/** What the clipboard holds: the cells as tab-and-newline text, and as our table HTML. */
type ClipData = { text: string; html: string };
/** Where the caret is in the cell being typed in (an <input>, or a rich cell's words), as the grid's keys ask, and the two ways they move it. */
type Caret = { rich: boolean; atStart: boolean; atEnd: boolean; all: boolean; empty: boolean; selectAll(): void; toEnd(): void };
const flat = (s: string) => s.replace(/[\t\n]+/g, ' ');
const tsv = (rows: string[][]) => rows.map((row) => row.map(flat).join('\t')).join('\n');
/** A table block's cells, its column names as the first row: what it is as a block of a sheet. */
const tableCells = (b: Block) => (b.k === 'table' ? tsv([b.cols.map((c) => columnText(c.name, c.type, c.currency)), ...b.rows]) : '');

const typeOf = (id: ColType) => COLUMN_KINDS.find((x) => x.id === id) ?? COLUMN_KINDS[0];
/** The keyboard a column asks for (a cell's inputmode): numbers for a number, digits for a date, letters for the rest. */
const KEYBOARD: Partial<Record<ColType, 'decimal' | 'numeric'>> = { number: 'decimal', money: 'decimal', percent: 'decimal', date: 'numeric' };
/** A rich cell, drawn as a <to-text>: any of a rich column's cells but one worked out by a formula. */
const isRich = (type: ColType, raw: string) => type === 'rich' && !raw.startsWith('=');
/** The words of a rich cell's paragraph, all of them selected. */
const whole = (runs: Run[]): Sel => ({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: runLength(runs) } });
let sheets = 0;

/** Follow a pointer that `el` has captured: `move` as it goes, then `done` once it lifts. */
function follow(el: HTMLElement, move: (e: PointerEvent) => void, done = () => {}) {
  const up = () => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    done();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

export class ToSheetEditor extends DocElement<SheetView> {
  static properties: PropertyDeclarations = {
    sel: { state: true },
    end: { state: true },
    focused: { state: true },
    pointed: { state: true },
    rowsShown: { state: true },
    colsShown: { state: true },
    fillTo: { state: true },
    widths: { state: true },
    menuRow: { state: true },
    menuCol: { state: true },
    letters: { state: true },
    marks: { attribute: false },
  };
  /** A page's marks on a read-only sheet's rows and cells (the header); none by default, and none drawn on a sheet that edits. */
  declare marks: SheetMark[];
  /** The selected cell: where typing goes. */
  declare sel: [number, number];
  /** The far corner of a block of cells; `sel` is the corner it was started from. */
  declare end: [number, number] | null;
  declare focused: boolean;
  /** Rows drawn: the sheet goes to ROWS, but only what is in use (and a little room) is on screen; it grows as you go. */
  declare rowsShown: number;
  /** Columns drawn beyond the table's own: the + adds one before anything is typed into it. */
  declare colsShown: number;
  /** While the fill handle is dragged: the block it would fill. */
  declare fillTo: Range | null;
  /** Column widths in px, or null to fit the columns to the page. */
  declare widths: number[] | null;
  /** The row whose menu is open, the column whose menu is open. */
  declare menuRow: number;
  declare menuCol: number;
  /** The columns asked for the letters keyboard (the bar's ABC) while this visit lasts. */
  declare letters: ReadonlySet<number>;
  private dragging = false;
  /** The table's box the ResizeObserver is watching. */
  private watched: Element | null = null;
  /** A press on a cell not yet selected: the click that ends it selects the cell's words whole (the browser would put a caret there). */
  private pressed = false;
  /** What we last put on the clipboard, so pasting it back can move formulas' references. */
  private clip: (ClipData & { r: number; c: number; cut: boolean }) | null = null;
  /** The selected cell as it was when the focus came to it: Escape puts it back. */
  entered: { r: number; c: number; raw: string } | null = null;
  /** The reference most recently inserted by tapping, so the next tap can replace it. */
  private picked: { r: number; c: number; start: number; end: number; to: [number, number] } | null = null;
  /** The cell the formula was last pointed at, while the caret still sits after its reference: drawn with a soft tint and a dashed edge, so the eye sees which cell the arrow keys reached (Paul, 2026-10-13: "gently highlight the targeted cell as you enter it in the formula"). Null the moment the caret moves on. */
  declare pointed: [number, number] | null;
  /** Where the caret was when the selected cell last lost focus. */
  private caret: { r: number; c: number; pos: number } | null = null;
  /** Names this sheet's option lists apart from another's on the page. */
  private readonly uid = `sheet-${++sheets}`;
  /** Each rich cell's paragraph as its <to-text> last had it, kept while the cell still holds those words, so the editor keeps its element and its caret. */
  private drafts = new Map<string, Block>();
  private ones = new WeakMap<Block, Block[]>();

  constructor() {
    super();
    this.sel = [0, 0];
    this.end = null;
    this.focused = false;
    this.pointed = null;
    this.rowsShown = 30;
    this.colsShown = MIN_COLS;
    this.fillTo = null;
    this.widths = null;
    this.menuRow = 0;
    this.menuCol = 0;
    this.letters = new Set();
    this.marks = [];
  }

  protected read(doc: Doc): SheetView {
    return readSheet(doc);
  }

  /* ---------- what is drawn ---------- */

  /** How many columns the sheet shows now: three at the least, more as they are added or typed into. */
  get cols(): number {
    return Math.max(this.view.cols.length, this.colsShown);
  }
  /** The columns drawn, those past the table's edge going by their letters: words in the first, numbers in the second (Paul, 2026-10-12: a sheet's defaults), words after that. */
  columns(): Column[] {
    const cols = [...this.view.cols];
    while (cols.length < this.cols) cols.push({ name: `Col${COL_NAMES[cols.length]}`, type: defaultType(cols.length) });
    return cols;
  }
  private get drawn(): number {
    return Math.min(ROWS, Math.max(this.rowsShown, this.view.used.rows + 6));
  }
  raw(r: number, c: number): string {
    return this.view.table.rows[r]?.[c] ?? '';
  }
  val(r: number, c: number) {
    return this.view.values[r]?.[c] ?? null;
  }
  /** Whether a cell is locked: by the document's own lock, or every cell of a read-only sheet. */
  locked(r: number, c: number): boolean {
    return this.readOnly || isLocked(this.view.table.lock, r, c);
  }
  /** Read-only, a cell activated is picked (kit/core/element.ts): the table's block, and the cell's row and column, from 0. */
  protected pickOf(el: Element): Picked | null {
    const td = el.closest<HTMLElement>('td[data-r]');
    return td && this.contains(td) ? { at: this.view.at, row: Number(td.dataset.r), col: Number(td.dataset.c) } : null;
  }
  /** What the cell held when the focus came to it (from the cell or the formula strip), for Escape. */
  private remember(r: number, c: number) {
    if (!this.entered || this.entered.r !== r || this.entered.c !== c) this.entered = { r, c, raw: this.raw(r, c) };
  }
  /** The focus gone from the cell and its strip both: what it held is no longer what Escape goes back to. */
  private forget(e: FocusEvent, r: number, c: number) {
    const to = e.relatedTarget;
    if (to instanceof HTMLElement && (to.matches('.sheet-fx .fx') || to.closest(`#c${r}_${c}`))) return;
    this.entered = null;
  }
  /** A checkbox cell ticked or unticked by a tap: the cell selected, the focus left where it was (no keyboard comes up). */
  private toggleTick(r: number, c: number) {
    this.sel = [r, c];
    this.end = null;
    this.setCell(r, c, this.val(r, c) ? '' : 'x');
  }
  /** The cell nearest (r, c) that is on the sheet. */
  onSheet(r: number, c: number): [number, number] {
    return [clamp(r, 0, ROWS - 1), clamp(c, 0, this.cols - 1)];
  }
  /** The selected block: one cell unless a far corner has been set. */
  get range(): Range {
    return rangeOf(this.sel, this.end ?? this.sel);
  }
  get many(): boolean {
    return !!this.end && (this.end[0] !== this.sel[0] || this.end[1] !== this.sel[1]);
  }
  private cellAt(x: number, y: number): [number, number] | null {
    const td = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('td[data-r]');
    return td && this.contains(td) ? [Number(td.dataset.r), Number(td.dataset.c)] : null;
  }

  /* ---------- commands ---------- */

  /** Every edit carries where the selection was (or the cells it wrote), so an undo can put it back. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? ({ sel: [...this.sel], end: this.end && [...this.end] } satisfies Mark));
  }
  /** After an undo or a redo: the cells the edit touched selected again, the focus on the first. */
  protected undone(entry: Entry) {
    const m = entry.mark as Mark | undefined;
    if (!m) return;
    const [r, c] = m.sel;
    this.end = m.end;
    this.focusCell(r, c, true);
    this.entered = { r, c, raw: this.raw(r, c) };
  }
  /** The mark for a block of cells: its top left, and its far corner when it is more than one. */
  private markOf(g: Range): Mark {
    return { sel: [g.r0, g.c0], end: g.r0 === g.r1 && g.c0 === g.c1 ? null : [g.r1, g.c1] };
  }

  setCell(r: number, c: number, raw: string) {
    if (this.locked(r, c)) return;
    this.edit(setCell(this.doc, r, c, raw), `cell:${r}:${c}`);
  }
  /** The keyboard a cell asks a phone for: its column's (KEYBOARD), unless it holds a formula or its column was asked for the letters. */
  keyboard(r: number, c: number): 'decimal' | 'numeric' | 'text' {
    const want = KEYBOARD[this.columns()[c]?.type ?? 'text'];
    return !want || this.letters.has(c) || this.raw(r, c).startsWith('=') ? 'text' : want;
  }
  /** The selected cell's column asks for numbers, and the cell holds no formula: the bar's ABC applies. */
  get numeric(): boolean {
    const [r, c] = this.sel;
    return !!KEYBOARD[this.columns()[c]?.type ?? 'text'] && !this.raw(r, c).startsWith('=');
  }
  /** The bar's ABC: the letters keyboard for the selected cell's column (again: the numbers), the focus left in the cell. */
  toggleLetters() {
    const c = this.sel[1];
    const next = new Set(this.letters);
    if (!next.delete(c)) next.add(c);
    this.letters = next;
  }
  /** The selected cells locked, or let go. */
  toggleLock() {
    const g = this.range;
    this.edit(setLock(this.doc, g, !this.locked(g.r0, g.c0)));
  }
  chart(kind: ChartKind | '') {
    this.edit(setChart(this.doc, kind));
  }
  /** Carry the block's first row down it, or its first column across it. One cell takes the one above it (or to its left), as Mod+D does in any spreadsheet. */
  fill(down: boolean) {
    let g = this.range;
    if (!this.many) {
      if (down ? g.r0 === 0 : g.c0 === 0) return;
      g = down ? { ...g, r0: g.r0 - 1 } : { ...g, c0: g.c0 - 1 };
    }
    this.edit(putRect(this.doc, fillCells(this.view.table, down ? { ...g, r1: g.r0 } : { ...g, c1: g.c0 }, g)), undefined, this.markOf(this.range));
  }
  /** The selected cells emptied. */
  clear() {
    const g = this.range;
    this.edit(putRect(this.doc, clearCells(g)), undefined, this.markOf(g));
  }
  private rename(c: number, name: string) {
    this.edit(rename(this.doc, c, name));
  }

  /* ---------- clipboard ---------- */

  /** The block as the clipboard holds it: the raw cells as tab-and-newline text (so a paste here gets its formulas), and a table of what they show, with our marker, for any other app. */
  private clipData(g: Range): ClipData {
    const text = copyCells(this.view.table, g);
    const cols = this.columns();
    const shown: string[][] = [];
    for (let r = g.r0; r <= g.r1; r++) shown.push(Array.from({ length: g.c1 - g.c0 + 1 }, (_, i) => cellText(this.val(r, g.c0 + i), cols[g.c0 + i]?.type, currencyAt(this.view, g.c0 + i))));
    const [head, ...rows] = shown;
    return { text, html: docToHtml([{ k: 'table', cols: head.map((name) => ({ name, type: 'text' })), rows }]) };
  }
  /** The block copied (and, cut, emptied): onto `data` in a clipboard event, else onto the system clipboard. */
  copyOut(cut: boolean, data?: DataTransfer | null) {
    const g = this.range;
    const d = this.clipData(g);
    this.clip = { ...d, r: g.r0, c: g.c0, cut };
    if (data) {
      data.setData('text/plain', d.text);
      data.setData('text/html', d.html);
    } else {
      const plain = () => navigator.clipboard?.writeText(d.text).catch(() => undefined);
      try {
        void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([d.text], { type: 'text/plain' }), 'text/html': new Blob([d.html], { type: 'text/html' }) })]).catch(plain);
      } catch {
        void plain();
      }
    }
    if (cut) this.clear();
  }

  /** Whether a clipboard event is a column name's (the header's input): the browser's own, never the block's (Paul, 2026-10-13: "I cannot cut and paste from the bolded top row of a spreadsheet"). */
  private inName = (e: ClipboardEvent) => (e.target as HTMLElement | null)?.closest?.('thead input.cn') != null;

  /** Heard on the way down (capture), before a rich cell's editor: a block is the sheet's to copy; a rich cell's words alone are its editor's; a column's name is its own input's. */
  private onCopy = (e: ClipboardEvent) => {
    if (this.inName(e)) return;
    const input = e.target as HTMLInputElement;
    const some = !(input instanceof HTMLInputElement) || (input.selectionStart !== input.selectionEnd && !(input.selectionStart === 0 && input.selectionEnd === input.value.length));
    // Some of a cell's text, picked out, is ordinary text; otherwise it is the cell (or the block) that is copied.
    if (!this.many && some) return;
    e.preventDefault();
    e.stopPropagation();
    this.copyOut(e.type === 'cut', e.clipboardData);
  };

  /**
   * What a paste is as cells: our own copy (its formulas move with it); another Tiny Little Office document's
   * table (its names the first row) or its words (a line, an item, a row each); a table from anywhere else;
   * else the text, tabs and newlines between the cells.
   */
  private asCells(data: ClipData): { text: string; ours: ToSheetEditor['clip'] } {
    const text = data.text.replace(/\r\n?/g, '\n');
    const ours = this.clip && this.clip.text === text.replace(/\n$/, '') ? this.clip : null;
    if (ours) return { text, ours };
    const html = data.html ?? '';
    const table = /<table[\s>]/i.test(html);
    if (html.includes(`content="${GENERATOR}"`)) {
      const blocks = parse(clipText({ text, html })).blocks;
      const t = blocks.find((b) => b.k === 'table');
      if (t) return { text: tableCells(t), ours: null };
      // Another sheet's copy: its text is the cells already.
      if (table) return { text, ours: null };
      const words = blocks.filter(isText).map((b) => plainText(b.runs));
      return { text: words.length ? words.map(flat).join('\n') : text, ours: null };
    }
    const t = table ? htmlToBlocks(html).find((b) => b.k === 'table') : undefined;
    return { text: t ? tableCells(t) : text, ours: null };
  }

  /** Cells put in with their top left at the selected cell (or over the whole block, for one value). */
  private pasteIn(text: string, ours: ToSheetEditor['clip']) {
    const g = this.range;
    // A copy moves its formulas' references by how far it travelled; a cut keeps them as they were.
    const moved = ours && !ours.cut ? { dr: g.r0 - ours.r, dc: g.c0 - ours.c } : undefined;
    const block = /[\t\n]/.test(text.replace(/\n$/, ''));
    // A block wider than the sheet widens it, up to the last letter, rather than losing its right-hand columns.
    const widest = Math.max(
      ...text
        .replace(/\n$/, '')
        .split('\n')
        .map((line) => line.split('\t').length),
    );
    const cols = this.columns();
    while (block && cols.length < Math.min(MAX_COLS, g.c0 + widest)) cols.push({ name: `Col${COL_NAMES[cols.length]}`, type: defaultType(cols.length) });
    const done = pasteCells({ cols }, g.r0, g.c0, text, moved, this.many ? g : undefined);
    this.edit(putRect(this.doc, done), undefined, this.markOf(done.range));
    this.colsShown = Math.max(this.colsShown, done.range.c1 + 1);
    this.end = [done.range.r1, done.range.c1];
    this.focusCell(done.range.r0, done.range.c0, true);
  }

  private onPaste = (e: ClipboardEvent) => {
    if (this.inName(e)) return;
    const { text, ours } = this.asCells({ text: e.clipboardData?.getData('text/plain') ?? '', html: e.clipboardData?.getData('text/html') ?? '' });
    const block = /[\t\n]/.test(text.replace(/\n$/, ''));
    // One value into one cell that is being typed in: let the browser (or a rich cell's editor) paste it.
    if (!block && !ours && !this.many) return;
    e.preventDefault();
    e.stopPropagation();
    this.pasteIn(text, ours);
  };

  /** The bar's Paste: the system clipboard if the page may read it, else what was last copied here. */
  async pasteFromClipboard() {
    let data: ClipData | null = null;
    try {
      const [item] = await navigator.clipboard.read();
      const read = async (type: string) => (item?.types.includes(type) ? (await item.getType(type)).text() : '');
      data = { text: await read('text/plain'), html: await read('text/html') };
    } catch {
      try {
        data = { text: await navigator.clipboard.readText(), html: '' };
      } catch {
        // Refused: this page's own copy.
      }
    }
    if (!data?.text && !data?.html) data = this.clip;
    if (!data) return;
    const { text, ours } = this.asCells(data);
    if (text) this.pasteIn(text, ours);
  }

  /* ---------- the bar under a block ---------- */

  /** What can be done to the block in hand, right under it (commands.ts): fill | copy, cut, paste | clear. */
  private contextItems(): ContextEntry[] {
    return contextOf(COMMANDS, this) as ContextEntry[];
  }
  /** The block's box on screen: from its top-left cell to its far corner. */
  private blockRect(): DOMRect | null {
    const g = this.range;
    const a = this.querySelector(`td[data-r="${g.r0}"][data-c="${g.c0}"]`)?.getBoundingClientRect();
    const b = this.querySelector(`td[data-r="${g.r1}"][data-c="${g.c1}"]`)?.getBoundingClientRect();
    return a && b ? new DOMRect(a.left, a.top, b.right - a.left, b.bottom - a.top) : null;
  }
  /** The table's box changes its height (a phone's keyboard, the bar, the heads made one line): the cell in hand kept in sight. */
  private boxWatch = new ResizeObserver(() => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const at = document.activeElement;
    const td = at instanceof HTMLElement && this.contains(at) ? at.closest('td') : null;
    if (!td) return;
    this.reveal(at as HTMLElement);
    // And the table's box itself inside the column, above the bar (kit/ui/scroll.ts).
    reveal(td);
  });
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelectionChange);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.boxWatch.disconnect();
    document.removeEventListener('selectionchange', this.onSelectionChange);
  }
  /** The pointed cell's highlight goes the moment the caret is no longer right after its reference: a letter typed, the caret moved, the cell left. */
  private onSelectionChange = () => {
    if (!this.pointed) return;
    const ed = this.editor();
    if (!ed || !this.pointing(ed)) this.pointed = null;
  };
  protected updated(changed: Map<PropertyKey, unknown>) {
    super.updated(changed);
    const box = this.querySelector('.sheet-scroll');
    if (box && box !== this.watched) {
      this.boxWatch.disconnect();
      this.boxWatch.observe(box);
      this.watched = box;
    }
    const bar = this.querySelector<ToContext>('.sheet-context');
    if (!bar) return;
    // Up while a block is in hand (above it under a finger, so the cells below stay free for the handle), and gone while it is being filled.
    if (this.many && !this.fillTo) bar.show(() => this.blockRect(), matchMedia('(pointer: coarse)').matches ? 'above' : 'below');
    else bar.hide();
  }

  /* ---------- fill handle ---------- */

  private onFillDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget as HTMLElement;
    const src = this.range;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer has already gone; the listeners below still see what follows */
    }
    if (e.pointerType !== 'mouse') {
      // Under a finger, dragging across cells scrolls, so the handle is how a block is stretched, any way at all. (Filling is then a button in the bar.)
      this.sel = [src.r0, src.c0];
      follow(handle, (ev) => {
        const at = this.cellAt(ev.clientX, ev.clientY);
        if (at) this.end = at;
      });
      return;
    }
    const move = (ev: PointerEvent) => {
      const at = this.cellAt(ev.clientX, ev.clientY);
      if (!at) return;
      // Fill goes one way: whichever of down/up or across the pointer has gone furthest.
      const dr = at[0] > src.r1 ? at[0] - src.r1 : at[0] < src.r0 ? at[0] - src.r0 : 0;
      const dc = at[1] > src.c1 ? at[1] - src.c1 : at[1] < src.c0 ? at[1] - src.c0 : 0;
      this.fillTo =
        !dr && !dc ? null : Math.abs(dr) >= Math.abs(dc) ? { ...src, r0: Math.min(src.r0, at[0]), r1: Math.max(src.r1, at[0]) } : { ...src, c0: Math.min(src.c0, at[1]), c1: Math.max(src.c1, at[1]) };
    };
    follow(handle, move, () => {
      const dest = this.fillTo;
      this.fillTo = null;
      if (!dest) return;
      this.edit(putRect(this.doc, fillCells(this.view.table, src, dest)), undefined, this.markOf(dest));
      this.sel = [dest.r0, dest.c0];
      this.end = [dest.r1, dest.c1];
    });
  };

  /* ---------- rows put in and taken out ---------- */

  /** The rows a row command works on: the selected ones, if the selection takes in row r; else just r. */
  rowsFor(r = this.sel[0]): [number, number] {
    const g = this.range;
    return r >= g.r0 && r <= g.r1 ? [g.r0, g.r1] : [r, r];
  }
  insertRowsAt(below: boolean, r?: number) {
    const [r0, r1] = this.rowsFor(r);
    const n = r1 - r0 + 1;
    if (this.view.used.rows + n > ROWS) return void toast(t('sheet-is-full-its-last-rows'));
    const at = below ? r1 + 1 : r0;
    this.edit(insertRows(this.doc, at, n));
    // The new rows are selected, ready to type into.
    this.sel = [at, this.sel[1]];
    this.end = n > 1 ? [at + n - 1, this.sel[1]] : null;
    this.focusCell(at, this.sel[1], n > 1);
  }
  deleteRowsAt(r?: number) {
    const [r0, r1] = this.rowsFor(r);
    this.edit(deleteRows(this.doc, r0, r1));
    this.end = null;
    this.focusCell(Math.min(r0, ROWS - 1), this.sel[1]);
  }
  /** The selected rows (or row r) moved up or down past their neighbour, the selection going with them. */
  moveRowsBy(by: number, r?: number) {
    const [r0, r1] = this.rowsFor(r);
    const ops = moveRows(this.doc, r0, r1, by);
    if (!ops.length) return;
    this.edit(ops);
    this.end = this.end && [this.end[0] + by, this.end[1]];
    this.focusCell(this.sel[0] + by, this.sel[1], true);
  }
  /** A row's number: a tap selects the row (or keeps the selected rows it is in) and opens what can be done to it. */
  private async openRowMenu(r: number, from: HTMLElement) {
    const [r0, r1] = this.rowsFor(r);
    if (r0 === r1) {
      this.sel = [r, 0];
      this.end = [r, this.cols - 1];
    }
    this.menuRow = r;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('.sheet-rowmenu')!;
    await menu.updateComplete;
    menu.openAt(from);
  }
  /* ---------- columns put in and taken out ---------- */

  /** A column put in before column `at`: after the last, from the + at the end of the header; after any, from its menu. */
  addColumn(at: number) {
    if (this.cols >= MAX_COLS) return void toast(t('sheet-is-as-wide-as-it'));
    if (at >= this.view.table.cols.length) {
      // Past the table's edge nothing is written yet: the column is drawn, and becomes real when typed into.
      this.colsShown = Math.max(this.colsShown, at + 1);
    } else {
      const ops = addColumn(this.doc, at);
      if (!ops) return;
      this.edit(ops);
    }
    if (this.widths) this.widths = [...this.widths.slice(0, at), NEW_COL, ...this.widths.slice(at)];
    this.focusCell(this.sel[0], at);
  }
  private removeColumn(c: number) {
    if (!removable(this.view, c)) return;
    if (c >= this.view.table.cols.length) this.colsShown = Math.max(MIN_COLS, this.cols - 1);
    else this.edit(removeColumn(this.doc, this.view, c));
    this.colsShown = Math.max(MIN_COLS, Math.min(this.colsShown, this.cols - 1));
    if (this.widths) this.widths = this.widths.filter((_, i) => i !== c);
    this.focusCell(this.sel[0], Math.min(c, this.cols - 1));
  }
  /** A column's head: a tap selects the column (or keeps the block it is in) and opens what can be done to it. */
  private async openColMenu(c: number, from: HTMLElement) {
    const g = this.range;
    if (!this.many || c < g.c0 || c > g.c1) {
      this.sel = [0, c];
      this.end = [Math.max(1, this.view.used.rows) - 1, c];
    }
    this.menuCol = c;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('.sheet-colmenu')!;
    await menu.updateComplete;
    menu.openAt(from);
  }
  /** What a column's menu does: what it holds, a sort by it, a column after it, or the column gone. */
  private colItems(): MenuItem[] {
    const c = this.menuCol;
    const cols = this.columns();
    const letter = COL_NAMES[c];
    const may = removable(this.view, c);
    return [
      ...kindItems(cols[c], t('common-column-c-holds', { c: letter }), (type, currency) => this.edit(setType(this.doc, c, type, currency))),
      { group: t('sheet-sort-rows-by-it'), label: t('sheet-low-to-high'), icon: ArrowDown, does: () => this.edit(sortBy(this.doc, c, false)) },
      { group: t('sheet-sort-rows-by-it'), label: t('sheet-high-to-low'), icon: ArrowUp, does: () => this.edit(sortBy(this.doc, c, true)) },
      { group: t('common-columns'), label: t('sheet-fit-this-column-to-its'), icon: MoveHorizontal, does: () => this.fitColumn(c) },
      { group: t('common-columns'), label: t('common-add-column-after'), icon: UI.plus, disabled: this.cols >= MAX_COLS, does: () => this.addColumn(c + 1) },
      {
        group: t('common-columns'),
        label: t('common-remove-this-column'),
        icon: Trash2,
        disabled: !may,
        hint: may ? undefined : c < this.view.table.cols.length ? t('sheet-keeps-one-column') : t('sheet-three-at-least'),
        does: () => this.removeColumn(c),
      },
    ];
  }

  /* ---------- Insert ▾ and the chart ---------- */

  /** Insert ▾: the registry's (commands.ts), then the formula language's functions, by name. */
  private inserts(): MenuItem[] {
    return [
      ...drawnIn(COMMANDS, 'menu:insert', this),
      ...FUNCTIONS.map(([name, args, what]) => ({ group: t('sheet-function'), label: `${name}(${args})`, hint: what, does: () => this.insertFunction(name) })),
    ];
  }
  /** Show all the text: every column as wide as its words. */
  showAll() {
    this.widths = this.columns().map((_, c) => this.naturalWidth(c));
  }

  /* ---------- rich cells ---------- */

  /** A rich cell's words as the one paragraph its <to-text> edits (the same array while the cell holds the same words). */
  private richBlocks(r: number, c: number): Block[] {
    const key = `${r}:${c}`;
    const raw = this.raw(r, c);
    let b = this.drafts.get(key);
    if (b?.k !== 'p' || writeInline(b.runs) !== raw) this.drafts.set(key, (b = { k: 'p', runs: parseInline(raw) }));
    let one = this.ones.get(b);
    if (!one) this.ones.set(b, (one = [b]));
    return one;
  }
  /** What a rich cell's editor did, written back as the cell's inline form: a burst of typing undoes as one, per cell. A locked cell is left be. */
  private onRichOps(e: CustomEvent<TextOps>, r: number, c: number) {
    e.stopPropagation();
    if (this.locked(r, c)) return void this.requestUpdate();
    const { ops, kind } = e.detail;
    const runs = applyAll({ head: {}, blocks: this.richBlocks(r, c) }, ops).blocks.flatMap((b) => (isText(b) ? b.runs : []));
    const block: Block = { k: 'p', runs };
    this.drafts.set(`${r}:${c}`, block);
    this.edit(setCell(this.doc, r, c, writeInline(runs)), kind === 'type' ? `cell:${r}:${c}` : undefined);
    this.requestUpdate();
  }
  /** Where the caret is in a rich cell, as the grid's keys ask. */
  private richCaret(x: ToText): Caret {
    const runs = (x.blocks[0] as { runs?: Run[] } | undefined)?.runs ?? [];
    const len = runLength(runs);
    const s = x.sel;
    const [a, b] = s ? [Math.min(s.anchor.offset, s.focus.offset), Math.max(s.anchor.offset, s.focus.offset)] : [len, len];
    return {
      rich: true,
      atStart: b === 0,
      atEnd: a === len,
      all: a === 0 && b === len,
      empty: !len,
      selectAll: () => (x.sel = whole(runs)),
      toEnd: () => (x.sel = { anchor: { block: 0, offset: len }, focus: { block: 0, offset: len } }),
    };
  }
  /** Where the caret is in a cell's <input>, as the grid's keys ask. */
  private inputCaret(input: HTMLInputElement): Caret {
    const [a, b, len] = [input.selectionStart ?? 0, input.selectionEnd ?? 0, input.value.length];
    return {
      rich: false,
      atStart: a === 0 && b === 0,
      atEnd: a === len && b === len,
      all: a === 0 && b === len,
      empty: !len,
      selectAll: () => input.select(),
      toEnd: () => input.setSelectionRange(len, len),
    };
  }
  /** The focus come to a cell (its input, or a rich cell's words): it is the selected cell. */
  private entering(r: number, c: number, el: HTMLElement) {
    if (r !== this.sel[0] || c !== this.sel[1]) this.end = null;
    this.sel = [r, c];
    this.focused = true;
    this.remember(r, c);
    this.reveal(el);
  }
  private leaving(e: FocusEvent, r: number, c: number) {
    const x = e.currentTarget as HTMLElement;
    // Within a rich cell (its link box, its note box) the focus has not left.
    if (e.relatedTarget instanceof Node && x.contains(e.relatedTarget)) return;
    this.focused = false;
    this.forget(e, r, c);
  }

  /* ---------- Find in this document (kit/ui/find.ts): the cells that hold every word, in reading order ---------- */

  /** The cells whose words (as typed, or as shown) hold every term; going to one selects it. */
  find(terms: string[]): Found {
    const cols = this.columns();
    const hits: [number, number][] = [];
    for (let r = 0; r < this.view.used.rows; r++)
      for (let c = 0; c < cols.length; c++) {
        const raw = this.raw(r, c);
        if (!raw) continue;
        const words = fold(`${raw} ${cellText(this.val(r, c), cols[c]?.type, currencyAt(this.view, c))}`);
        if (terms.every((term) => words.includes(term))) hits.push([r, c]);
      }
    // Going to a cell selects it and shows it, the focus left in the find bar; leaving the bar puts the focus in it.
    const go = (i: number) => {
      const [r, c] = hits[i] ?? [];
      if (r === undefined) return;
      if (r >= this.drawn - 2) this.rowsShown = Math.min(ROWS, r + 20);
      this.end = null;
      this.entered = null;
      this.sel = [r, c];
      void this.updateComplete.then(() => {
        const el = this.querySelector<HTMLElement>(`#c${r}_${c}`);
        if (el) this.reveal(el);
      });
    };
    return { count: hits.length, go, leave: () => this.focusCell(...this.sel) };
  }

  /* ---------- focus and the caret ---------- */

  /** Where a person starts: A1, its words selected as a keyboard move leaves them. */
  focusFirst() {
    this.focusCell(0, 0);
  }
  focusCell(row: number, col: number, keepBlock = false) {
    const [r, c] = this.onSheet(row, col);
    // Near the bottom of what is drawn, more rows appear.
    if (r >= this.drawn - 2) this.rowsShown = Math.min(ROWS, this.drawn + 20);
    if (!keepBlock) this.end = null;
    if (r !== this.sel[0] || c !== this.sel[1]) this.entered = null;
    this.sel = [r, c];
    void this.updateComplete.then(async () => {
      const el = this.querySelector<HTMLElement>(`#c${r}_${c}`);
      if (!el) return;
      if (el.localName === 'to-text') {
        // A rich cell: its words selected whole, so typing replaces them (the editor takes the focus with its selection).
        const x = el as ToText;
        await x.updateComplete;
        x.sel = whole((x.blocks[0] as { runs?: Run[] } | undefined)?.runs ?? []);
        this.reveal(x);
        return;
      }
      const input = el as HTMLInputElement;
      // The page holds still: the table's own box scrolls to show the cell (focus() would scroll every ancestor, the page too).
      input.focus({ preventScroll: true });
      input.select();
      this.reveal(input);
    });
  }

  /** The cell on screen, by scrolling the table's box alone, with the stuck header rows and row numbers allowed for. */
  private reveal(el: HTMLElement) {
    const box = this.querySelector<HTMLElement>('.sheet-scroll');
    const td = el.closest('td');
    if (!box || !td) return;
    const b = box.getBoundingClientRect();
    const td0 = td.getBoundingClientRect();
    const head = this.querySelector('table.sheet thead')?.getBoundingClientRect().height ?? 0;
    const side = this.querySelector('table.sheet th.row')?.getBoundingClientRect().width ?? 0;
    if (td0.top < b.top + head) box.scrollTop -= b.top + head - td0.top;
    else if (td0.bottom > b.bottom) box.scrollTop += td0.bottom - b.bottom;
    if (td0.left < b.left + side) box.scrollLeft -= b.left + side - td0.left;
    else if (td0.right > b.right) box.scrollLeft += td0.right - b.right;
  }

  /** The <input> being typed in right now: a cell or the formula strip. */
  private editor(): HTMLInputElement | null {
    const a = document.activeElement;
    return a instanceof HTMLInputElement && this.contains(a) && a.matches('td input, .sheet-fx .fx') ? a : null;
  }

  /** Put the caret at `pos` in `ed` (or in the selected cell) once the new value has rendered. */
  private async caretTo(pos: number, ed?: HTMLInputElement | null) {
    await this.updateComplete;
    const [r, c] = this.sel;
    const el = ed ?? this.querySelector<HTMLInputElement>(`#c${r}_${c}`);
    if (!el) return;
    el.focus({ preventScroll: true });
    // Focusing a cell swaps its computed value for the raw formula on the next render.
    await this.updateComplete;
    el.setSelectionRange(pos, pos);
  }

  /** Point at a cell while a formula is being edited: its reference goes in at the caret, replacing the one just pointed at if there was one. False when the formula is not waiting for a value. */
  private point(ed: HTMLInputElement, r: number, c: number): boolean {
    const [sr, sc] = this.sel;
    const val = this.raw(sr, sc);
    if (!val.startsWith('=') || (r === sr && c === sc)) return false;
    let start = ed.selectionStart ?? val.length;
    const end = ed.selectionEnd ?? start;
    const p = this.pointing(ed);
    if (p) start = p.start;
    else if (!WANTS_REF.test(val.slice(0, start))) return false;
    const ref = rcToRef(r, c);
    this.setCell(sr, sc, val.slice(0, start) + ref + val.slice(end));
    this.picked = { r: sr, c: sc, start, end: start + ref.length, to: [r, c] };
    this.pointed = null;
    // Lit only once the caret sits after the reference: until then a selectionchange would read it as moved on.
    void this.caretTo(start + ref.length, ed).then(() => (this.pointed = this.pointing(ed) ? [r, c] : null));
    return true;
  }

  /** The reference just pointed at, if the caret is still sitting right after it. */
  private pointing(ed: HTMLInputElement) {
    const [sr, sc] = this.sel;
    const p = this.picked;
    const at = ed.selectionStart;
    return p && p.r === sr && p.c === sc && at === p.end && ed.selectionEnd === p.end && p.end <= this.raw(sr, sc).length ? p : null;
  }

  /** Tapping a cell while editing a formula elsewhere inserts that cell's reference. */
  private onCellDown(e: MouseEvent, r: number, c: number) {
    const ed = this.editor();
    if (ed && this.point(ed, r, c)) return e.preventDefault();
    if (e.shiftKey) {
      // Shift+click stretches the block to here; the cell it started from keeps the focus.
      e.preventDefault();
      this.end = [r, c];
      return;
    }
    this.end = null;
    this.pressed = !(e.target as HTMLElement).closest('td.sel');
    this.dragging = true;
    window.addEventListener('mouseup', () => (this.dragging = false), { once: true });
  }

  /** Dragging across cells with the mouse selects a block. */
  private onCellOver(e: MouseEvent, r: number, c: number) {
    if (!this.dragging || e.buttons !== 1) return;
    if (r === this.sel[0] && c === this.sel[1] && !this.end) return;
    this.end = [r, c];
    getSelection()?.removeAllRanges();
  }

  /** Arrow keys while a formula wants a value point at cells the same way a tap does. Left and right only point from the end of the formula, so they can still move the caret through it. */
  private pointWithKey(e: KeyboardEvent): boolean {
    const move = ARROWS[e.key];
    const ed = this.editor();
    if (!move || !ed || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    const [sr, sc] = this.sel;
    const val = this.raw(sr, sc);
    const at = ed.selectionStart ?? 0;
    const p = this.pointing(ed);
    if (!val.startsWith('=') || (!p && !WANTS_REF.test(val.slice(0, at)))) return false;
    if (move[1] !== 0 && at !== val.length) return false;
    const [fr, fc] = p ? p.to : [sr, sc];
    e.preventDefault();
    this.point(ed, ...this.onSheet(fr + move[0], fc + move[1]));
    return true;
  }

  private insertFunction(name: string) {
    const [r, c] = this.sel;
    const val = this.raw(r, c);
    const text = name + '(';
    if (!val.startsWith('=')) {
      this.setCell(r, c, '=' + text);
      void this.caretTo(text.length + 1);
      return;
    }
    const pos = this.caret && this.caret.r === r && this.caret.c === c ? Math.min(this.caret.pos, val.length) : val.length;
    this.setCell(r, c, val.slice(0, pos) + text + val.slice(pos));
    void this.caretTo(pos + text.length);
  }

  /* ---------- column widths ---------- */

  /** Width in the sheet's own pixels that shows every value in column c without clipping. */
  naturalWidth(c: number): number {
    const sample = this.querySelector<HTMLInputElement>('table.sheet td input');
    const ctx = document.createElement('canvas').getContext('2d');
    if (!sample || !ctx) return 120;
    const cs = getComputedStyle(sample);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    let w = 0;
    const type = this.columns()[c].type;
    for (let r = 0; r < this.view.used.rows; r++) w = Math.max(w, ctx.measureText(cellText(this.val(r, c), type, currencyAt(this.view, c))).width);
    return Math.max(MIN_COL, Math.ceil((w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) / remScale() + 6));
  }
  private currentWidths(): number[] {
    if (this.widths) return this.widths.slice();
    // Measured on the screen, kept in the sheet's own pixels.
    const k = remScale();
    return [...this.querySelectorAll<HTMLElement>('table.sheet thead th[scope=col]')].slice(0, this.cols).map((th) => th.getBoundingClientRect().width / k);
  }
  private onGripDown(e: PointerEvent, c: number) {
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    const base = this.currentWidths();
    const x0 = e.clientX;
    const z = remScale();
    grip.setPointerCapture(e.pointerId);
    follow(grip, (ev) => {
      const w = base.slice();
      w[c] = Math.max(MIN_COL, Math.round(base[c] + (ev.clientX - x0) / z));
      this.widths = w;
    });
  }
  /** The grip from the keyboard: Left and Right narrow and widen the column, Enter fits it to its text. */
  private onGripKey(e: KeyboardEvent, c: number) {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'Enter') this.fitColumn(c);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const w = this.currentWidths();
      w[c] = Math.max(MIN_COL, Math.round(w[c] + (e.key === 'ArrowLeft' ? -step : step)));
      this.widths = w;
    } else return;
    e.preventDefault();
  }
  private fitColumn(c: number) {
    const w = this.currentWidths();
    w[c] = this.naturalWidth(c);
    this.widths = w;
  }

  /* ---------- keys ---------- */

  /** The whole sheet selected: from A1 to the last row in use, across every column. */
  selectAll() {
    this.end = [Math.max(1, this.view.used.rows) - 1, this.cols - 1];
    this.focusCell(0, 0, true);
  }

  /**
   * A column's name: Enter keeps what was typed (the change event, as the focus leaves), Escape puts back what it was;
   * either takes the focus to the column's first cell, never to nothing.
   */
  private nameKey(e: KeyboardEvent, c: number, was: string) {
    if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') (e.target as HTMLInputElement).value = was;
    this.focusCell(0, c);
  }
  /** Escape in a cell: what was there when the focus came is put back, and the focus stays on the cell. */
  cancelEdit(r: number, c: number) {
    const b = this.entered;
    if (b && b.r === r && b.c === c && this.raw(r, c) !== b.raw) this.setCell(r, c, b.raw);
    this.entered = { r, c, raw: this.raw(r, c) };
    this.focusCell(r, c);
  }

  /** The grid's keys in a cell, `at` saying where its caret is. A rich cell's editor hears them first (they are caught on the way down to it), and has those left over: its marks, its Escape, its own Select All. */
  /** The cell a key is typed in, and where its caret is, while the grid's commands answer it (commands.ts). */
  here: { r: number; c: number; at: Caret | null } | null = null;
  private onKey(e: KeyboardEvent, r: number, c: number, at: Caret) {
    if (e.defaultPrevented || e.isComposing) return;
    if (this.pointWithKey(e)) return;
    this.here = { r, c, at };
    try {
      if (runKey(e, COMMANDS, this)) return;
    } finally {
      this.here = null;
    }
    // The marks are a rich cell's (its editor's own keys); anywhere else they do nothing, and never reach the browser's.
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && !e.shiftKey && ['b', 'i', 'u', 'k'].includes(e.key.toLowerCase()) && !at.rich) e.preventDefault();
  }
  /** Mod+A: the cell's words first; with them whole (or none), the whole sheet. */
  selectAllKey(): boolean {
    const at = this.here?.at;
    if (!at || at.rich || (!this.many && !at.all && !at.empty)) return false;
    this.selectAll();
    return true;
  }
  /** Mod+Enter: done, staying on the cell. */
  doneHere() {
    const h = this.here;
    if (!h?.at) return false;
    this.entered = { r: h.r, c: h.c, raw: this.raw(h.r, h.c) };
    h.at.selectAll();
  }
  /** Tab and Shift+Tab: the next and previous cell, row after row; at either end of the sheet the focus goes on. */
  tabKey(back: boolean): boolean {
    const h = this.here;
    if (!h) return false;
    const { r, c } = h;
    const last = this.cols - 1;
    const to: [number, number] | null = back ? (c > 0 ? [r, c - 1] : r > 0 ? [r - 1, last] : null) : c < last ? [r, c + 1] : r < ROWS - 1 ? [r + 1, 0] : null;
    if (!to) return false;
    this.focusCell(...to);
    return true;
  }
  /** Shift+arrows stretch the block (sideways only when not selecting words inside the cell). */
  stretch(arrow: [number, number] | undefined): boolean {
    const at = this.here?.at;
    if (!arrow || !(arrow[0] !== 0 || at?.all || this.many)) return false;
    const [fr, fc] = this.end ?? this.sel;
    this.end = this.onSheet(fr + arrow[0], fc + arrow[1]);
    return true;
  }
  /** Space in a checkbox column ticks and unticks. */
  tickHere(): boolean {
    const h = this.here;
    if (!h || this.columns()[h.c].type !== 'check' || this.raw(h.r, h.c).startsWith('=')) return false;
    this.setCell(h.r, h.c, this.val(h.r, h.c) ? '' : 'x');
    return true;
  }
  /** Escape in a cell: what was there put back. A rich cell's editor steps out first and says `text-escape` when it is done. */
  cancelHere(): boolean {
    const h = this.here;
    if (!h || h.at?.rich) return false;
    this.cancelEdit(h.r, h.c);
    return true;
  }
  /** Enter, Shift+Enter and the arrows: the cell below, above, before (from the start of the words), after (from their end). */
  moveKey(e: KeyboardEvent): boolean {
    const h = this.here;
    if (!h?.at) return false;
    const { r, c, at } = h;
    const k = e.key;
    const move: [number, number] | null =
      k === 'Enter'
        ? e.shiftKey
          ? [r - 1, c]
          : [r + 1, c]
        : k === 'ArrowDown'
          ? [r + 1, c]
          : k === 'ArrowUp'
            ? [r - 1, c]
            : k === 'ArrowLeft' && at.atStart
              ? [r, c - 1]
              : k === 'ArrowRight' && at.atEnd
                ? [r, c + 1]
                : null;
    if (!move) return false;
    this.focusCell(move[0], move[1]);
    return true;
  }

  /* ---------- drawing ---------- */

  render() {
    const v = this.view;
    const [sr, sc] = this.sel;
    const cols = this.columns();
    const n = cols.length;
    const w = this.widths;
    const picking = this.raw(sr, sc).startsWith('=');
    const g = this.range;
    const fill = this.fillTo;
    const locked = this.locked(sr, sc);
    // A rich cell's words are its editor's: the strip shows them, plain and read-only.
    const richSel = isRich(cols[sc]?.type ?? 'text', this.raw(sr, sc));
    const chart = chartOf(v);
    const figure = chart
      ? html`<figure class="sheet-chart ${v.table.above ? 'above' : ''}"><svg viewBox="0 0 ${chart.w} ${chart.h}" role="img" aria-label=${chart.alt ?? t('sheet-chart-of-table')}>${unsafeSVG(chart.svg)}</svg></figure>`
      : nothing;
    // The row numbers' side is as wide as the widest number drawn, and no wider.
    const gutter = `--sheet-row-w: calc(${String(this.drawn).length}ch + 0.5rem);`;
    const own = (id: string) => COMMANDS.find((x) => x.id === `sheet.${id}`)!;
    // The bar holds the same tools whatever is selected (a tool that does not apply is disabled, not gone), so it never changes shape under a finger.
    return html`${
      this.readOnly
        ? nothing
        : html`<to-bar class="sheet-bar">
            ${cmdTool(own('letters'), this)}
            <to-insert .items=${this.inserts()}></to-insert>
            ${cmdMenu(own('chart'), this, COMMANDS, 'sheet-chartmenu', { words: true, caret: true })}
            ${['filldown', 'fillright', 'fit', 'showall'].map((id) => cmdTool(own(id), this, id === 'filldown' ? { disabled: !this.many } : {}))}
            ${cmdTool(own('lock'), this, { icon: locked ? Lock : LockOpen })}
            ${this.undoTools()}
          </to-bar>`
    }
      ${v.big ? html`<div class="sheet-big"><b>${v.big.value}</b><span>${v.big.label}</span></div>` : nothing}
      ${v.table.above ? figure : nothing}
      <div class="sheet-fx">
        <span class="ref" aria-label=${t('sheet-selected-cells')}>${rangeRef(g)}</span>
        <input
          class="fx"
          aria-label=${t('sheet-formula')}
          .value=${richSel ? cellText(this.raw(sr, sc), 'rich') : this.raw(sr, sc)}
          placeholder="="
          autocomplete="off"
          spellcheck="false"
          ?readonly=${locked || richSel}
          @focus=${() => this.remember(sr, sc)}
          @input=${(e: InputEvent) => !e.isComposing && this.setCell(sr, sc, (e.target as HTMLInputElement).value)}
          @compositionend=${(e: Event) => this.setCell(sr, sc, (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.isComposing || this.pointWithKey(e)) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              this.focusCell(sr + (e.shiftKey ? -1 : 1), sc);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              this.cancelEdit(sr, sc);
            }
          }}
          @blur=${(e: FocusEvent) => {
            this.caret = { r: sr, c: sc, pos: (e.target as HTMLInputElement).selectionStart ?? 0 };
            this.forget(e, sr, sc);
          }}
        />
      </div>
      <div class="sheet-scroll">
        <table class="sheet ${w ? 'sized' : ''} ${picking ? 'picking' : ''} ${this.many ? 'selecting' : ''}" @copy=${{ handleEvent: this.onCopy, capture: true }} @cut=${{ handleEvent: this.onCopy, capture: true }} @paste=${{ handleEvent: this.onPaste, capture: true }} style=${gutter + (w ? `width: calc(var(--sheet-row-w) + var(--sheet-add-w) + ${w.slice(0, n).reduce((a, b) => a + b, 0) / 16}rem)` : '')}>
          <colgroup>
            <col class="gutter" />
            ${cols.map((_, c) => html`<col style=${w ? `width:${(w[c] ?? NEW_COL) / 16}rem` : ''} />`)}
            <col class="add" />
          </colgroup>
          <thead>
            <tr>
              <td class="corner"></td>
              ${cols.map(
                (col, c) => html`<th scope="col">
                  <button type="button" class="col-head" aria-label=${t('sheet-column-c-type-what-it', { c: COL_NAMES[c], type: typeOf(col.type).name() })} title=${t('sheet-what-it-holds-sort-columns')} aria-haspopup="menu" aria-expanded="false" @click=${(e: Event) => void this.openColMenu(c, e.currentTarget as HTMLElement)}>
                    <span class="cl">${COL_NAMES[c]}</span>${isLetterName(col.name) ? nothing : html`<span class="nm">${col.name}</span>`}${icon(UI.down, 12)}
                  </button>
                  <span class="grip" role="separator" tabindex="0" aria-orientation="vertical" aria-valuenow=${Math.round(w?.[c] ?? NEW_COL)} aria-label=${t('sheet-resize-column-c', { c: COL_NAMES[c] })} title=${t('sheet-drag-to-resize-double-click')} @pointerdown=${(e: PointerEvent) => this.onGripDown(e, c)} @dblclick=${() => this.fitColumn(c)} @keydown=${(e: KeyboardEvent) => this.onGripKey(e, c)}></span>
                </th>`,
              )}
              <td class="add-col" rowspan="2">
                <button type="button" class="add-col-btn" aria-label=${t('common-add-column')} title=${t('common-add-column')} ?disabled=${n >= MAX_COLS} @click=${() => this.addColumn(n)}>${icon(UI.plus, 16)}</button>
              </td>
            </tr>
            <tr class="names">
              <td class="corner"></td>
              ${cols.map(
                (col, c) => html`<th scope="col">
                  <input class="cn" aria-label=${t('common-name-of-column-c', { c: COL_NAMES[c] })} placeholder=${typeName(c, cols)} .value=${isLetterName(col.name) ? '' : col.name} autocomplete="off" spellcheck="false" ?readonly=${this.readOnly}
                    @change=${(e: Event) => this.rename(c, (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => this.nameKey(e, c, isLetterName(col.name) ? '' : col.name)} />
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: this.drawn }, (_, r) => this.renderRow(r, cols, g, fill))}
          </tbody>
        </table>
        ${this.drawn < ROWS ? html`<button type="button" class="sheet-more" @click=${() => (this.rowsShown = Math.min(ROWS, this.drawn + 50))}>${icon(UI.plus, 14)} ${t('sheet-50-more-rows')} <span class="to-hint">${t('sheet-n-of-max-shown', { n: this.drawn, max: ROWS })}</span></button>` : nothing}
      </div>
      ${v.table.above ? nothing : figure}
      ${cols.map((col, c) => (col.type === 'option' ? html`<datalist id="${this.uid}-o${c}">${this.choices(c).map((x) => html`<option value=${x}></option>`)}</datalist>` : nothing))}
      <to-context class="sheet-context" .label=${t('sheet-cells-in-hand')} .items=${this.contextItems()}></to-context>
      <to-menu class="sheet-rowmenu" .label=${t('common-row-n', { n: this.menuRow + 1 })} .items=${drawnIn(COMMANDS, 'menu:row', this)}></to-menu>
      <to-menu class="sheet-colmenu" .label=${t('common-column-c', { c: COL_NAMES[this.menuCol] })} .items=${this.colItems()}></to-menu>`;
  }

  /** The words an option column offers: those its cells already hold, each once, in the order they first come (a formula's are its own). */
  private choices(c: number): string[] {
    return choicesOf(this.view.table.rows, c);
  }
  /** An option cell's caret: the cell selected and its list opened, where the browser can open it (elsewhere its words come up as it is typed in). */
  private async openChoices(r: number, c: number) {
    this.focusCell(r, c);
    await this.updateComplete;
    const input = this.querySelector<HTMLInputElement>(`#c${r}_${c}`);
    try {
      input?.showPicker();
    } catch {
      // No picker for a list here: the words are offered as the cell is typed in.
    }
  }

  /** A page's marks on one cell (SheetMark): small badges at its end, each named for a screen reader by its title. */
  private renderMarks(marks: SheetMark[]) {
    return html`<span class="sheet-marks">${marks.map((m) => html`<span class="sheet-mark" role="note" aria-label=${m.title ?? m.text} title=${m.title ?? nothing}>${m.text}</span>`)}</span>`;
  }

  private renderRow(r: number, cols: Column[], g: Range, fill: Range | null) {
    const [sr, sc] = this.sel;
    return html`<tr>
      <th class="row" scope="row"><button type="button" class="row-num" aria-label=${t('common-row-n-insert-or-delete', { n: r + 1 })} aria-haspopup="menu" aria-expanded="false" @click=${(e: Event) => void this.openRowMenu(r, e.currentTarget as HTMLElement)}>${r + 1}</button></th>
      ${cols.map((col, c) => {
        const raw = this.raw(r, c);
        const isSel = this.focused && r === sr && c === sc;
        const v = this.val(r, c);
        const type = col.type;
        const locked = this.locked(r, c);
        const inBlock = this.many && r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1;
        const inFill = !!fill && r >= fill.r0 && r <= fill.r1 && c >= fill.c0 && c <= fill.c1;
        const fillHandle =
          r === g.r1 && c === g.c1
            ? html`<span class="fill" role="button" aria-label=${t('common-fill-drag-to-carry-these')} title=${t('common-drag-to-fill')} @pointerdown=${this.onFillDown}></span>`
            : nothing;
        const pointed = !!this.pointed && this.focused && r === this.pointed[0] && c === this.pointed[1];
        // A page's marks on this cell, read-only: drawn after its words; with none the cell is drawn as ever.
        const marks = this.readOnly && this.marks.length ? this.marks.filter((m) => m.row === r && (m.col ?? 0) === c) : [];
        const td = (inner: unknown) =>
          html`<td data-r=${r} data-c=${c} class="${r === sr && c === sc ? 'sel' : ''} ${inBlock ? 'in' : ''} ${inFill ? 'filling' : ''} ${pointed ? 'pointed' : ''}" @mousedown=${(e: MouseEvent) => this.onCellDown(e, r, c)} @mouseover=${(e: MouseEvent) => this.onCellOver(e, r, c)}>${marks.length ? html`${inner}${this.renderMarks(marks)}` : inner}${fillHandle}</td>`;
        if (isRich(type, raw)) {
          // A rich cell is its words' editor; the grid's keys are caught on their way down to it.
          return td(html`<to-text
            id="c${r}_${c}"
            class="rich ${locked ? 'locked' : ''}"
            shape="line"
            .blocks=${this.richBlocks(r, c)}
            label=${rcToRef(r, c)}
            title=${locked ? t('sheet-locked-part-of-model') : nothing}
            @keydown=${{ handleEvent: (e: KeyboardEvent) => this.onKey(e, r, c, this.richCaret(e.currentTarget as ToText)), capture: true }}
            @focusin=${(e: FocusEvent) => this.entering(r, c, e.currentTarget as HTMLElement)}
            @focusout=${(e: FocusEvent) => this.leaving(e, r, c)}
            @click=${(e: Event) => {
              if (!this.pressed) return;
              this.pressed = false;
              // Reached by a tap or a click, the words are selected whole, so typing replaces them; a second tap places the caret.
              const x = e.currentTarget as ToText;
              x.sel = whole((x.blocks[0] as { runs?: Run[] } | undefined)?.runs ?? []);
            }}
            @text-ops=${(e: CustomEvent<TextOps>) => this.onRichOps(e, r, c)}
            @text-enter=${(e: CustomEvent<{ shift: boolean }>) => (e.stopPropagation(), this.focusCell(r + (e.detail.shift ? -1 : 1), c))}
            @text-exit=${(e: Event) => e.stopPropagation()}
            @text-escape=${(e: Event) => (e.stopPropagation(), this.cancelEdit(r, c))}
            @text-selectall=${(e: Event) => (e.stopPropagation(), this.selectAll())}
          ></to-text>`);
        }
        const shown = isSel && (type !== 'rich' || raw.startsWith('=')) ? raw : cellText(v, type, currencyAt(this.view, c));
        const link = type === 'url' && /^https?:\/\/\S+$/.test(raw.trim()) ? raw.trim() : '';
        // A checkbox is ticked by a tap on its cell (Space with the keyboard); one worked out by a formula is typed into.
        const tick = type === 'check' && !locked && !raw.startsWith('=');
        const option = type === 'option' && !locked;
        const cls =
          (typeof v === 'number' && type !== 'check' ? 'num' : typeof v === 'string' && v.startsWith('#') ? 'err' : '') +
          (link && !isSel ? ' link' : '') +
          (tick ? ' tick' : '') +
          (option ? ' option' : '') +
          (locked ? ' locked' : '') +
          (type === 'name' ? ' named' : '');
        return td(html`<input
            id="c${r}_${c}"
            class=${cls}
            aria-label=${rcToRef(r, c)}
            .value=${shown}
            list=${option ? `${this.uid}-o${c}` : nothing}
            title=${locked ? t('sheet-locked-part-of-model') : raw.startsWith('=') ? raw : nothing}
            placeholder=${isSel && type === 'date' ? 'YYYY-MM-DD' : nothing}
            inputmode=${this.keyboard(r, c)}
            ?readonly=${locked}
            autocomplete="off"
            @focus=${(e: Event) => {
              this.entering(r, c, e.target as HTMLElement);
              // A cell reached by a tap or a click is selected whole, so typing replaces it; a second tap places the caret.
              (e.target as HTMLInputElement).select();
            }}
            @click=${(e: Event) => {
              if (!this.pressed) return;
              this.pressed = false;
              const input = e.target as HTMLInputElement;
              input.select();
              // WebKit on a phone puts its caret where the finger was just after the click: the words are selected again once it has.
              setTimeout(() => document.activeElement === input && input.selectionStart === input.selectionEnd && input.select(), 0);
            }}
            @blur=${(e: FocusEvent) => {
              this.caret = { r, c, pos: (e.target as HTMLInputElement).selectionStart ?? 0 };
              this.leaving(e, r, c);
            }}
            @input=${(e: InputEvent) => !e.isComposing && this.setCell(r, c, (e.target as HTMLInputElement).value)}
            @compositionend=${(e: Event) => this.setCell(r, c, (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, r, c, this.inputCaret(e.target as HTMLInputElement))}
          />
          ${
            tick
              ? html`<button type="button" class="tick-btn" tabindex="-1" aria-label=${t('sheet-check-ref', { ref: rcToRef(r, c) })} aria-pressed=${String(!!v)} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.toggleTick(r, c)}>
                <span class="box" aria-hidden="true">${v ? icon(UI.check, 18) : nothing}</span>
              </button>`
              : nothing
          }
          ${option ? html`<button type="button" class="opt-btn" tabindex="-1" aria-label=${t('sheet-choices-for-ref', { ref: rcToRef(r, c) })} title=${t('sheet-choices')} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => void this.openChoices(r, c)}>${icon(UI.down, 14)}</button>` : nothing}
          ${link ? html`<a class="go" href=${link} target="_blank" rel="noopener" aria-label=${t('sheet-open-link', { link })} tabindex="-1">${icon(UI.link, 12)}</a>` : nothing}`);
      })}
    </tr>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToSheetEditor);
