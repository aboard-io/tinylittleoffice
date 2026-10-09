/**
 * <to-sheet-editor>: a spreadsheet with formulas, and a chart of it if you ask. A grid of <input>s over the
 * kernel's table (model.ts reads it; every command is Op[] through edit()).
 *
 * Three columns to start; the + at the end of the header adds one, and a column's menu puts one in after
 * it or takes it out (an empty one; the sheet never goes under three). The table scrolls in a box of its
 * own, its header rows and row numbers stuck to its edges, and the page under it holds still: a cell is
 * focused without scrolling the page, and the bar above keeps its shape whatever is selected.
 *
 * Drag across cells (or hold Shift) to select a block: it can be copied, cut, pasted, cleared, or carried
 * on with the handle at its corner. While a formula is being edited, tapping another cell inserts its
 * reference instead of moving there. Column widths are a view setting, not part of the document.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowDownToLine, ArrowRightToLine, ArrowUp, ChartColumn, Columns3, Lock, LockOpen, Maximize2, Rows3, Scaling, Trash2 } from 'lucide';
import { keysText, tool } from '../../kit/bar.ts';
import { CHART_KINDS, suggestChart, type ChartKind } from '../../kit/chart.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { toast } from '../../kit/toast.ts';
import { COL_NAMES, FUNCTIONS, MAX_COLS, ROWS, clearCells, copyCells, fillCells, formatCell, isLocked, linkify, parseInline, pasteCells, rangeOf, rangeRef, rcToRef, type ColType, type Column, type Doc, type Range } from '../../doc/index.ts';
import { MIN_COLS, addColumn, deleteRows, insertRows, isLetterName, putRect, readSheet, removable, removeColumn, rename, setCell, setChart, setLock, setType, sortBy, typeName, type SheetView } from './model.ts';
import { chartOf, chartOfSheet } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import './style.css';

export const tag = 'to-sheet-editor';

const MIN_COL = 48;
/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
/** A column put in by hand starts this wide, when widths have been set by hand. */
const NEW_COL = 120;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** What a column may hold, in the person's language. */
const TYPES: { id: ColType; name: () => string; hint: () => string }[] = [
  { id: 'text', name: () => t('Text'), hint: () => t('Shown as typed') },
  { id: 'number', name: () => t('Number'), hint: () => '1,234.5' },
  { id: 'money', name: () => t('Money'), hint: () => '$1,234.50' },
  { id: 'percent', name: () => t('Percent'), hint: () => '12.5%' },
  { id: 'date', name: () => t('Date'), hint: () => '2027-03-01' },
  { id: 'url', name: () => t('Link'), hint: () => t('Opens when clicked') },
  { id: 'check', name: () => t('Checkbox'), hint: () => '☑ ☐' },
  { id: 'rich', name: () => t('Rich text'), hint: () => '**bold** *italic*' },
  { id: 'name', name: () => t('Name'), hint: () => t('Names the cell to its right') },
];
const typeOf = (id: ColType) => TYPES.find((x) => x.id === id) ?? TYPES[0];

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
  static properties: PropertyDeclarations = { sel: { state: true }, end: { state: true }, focused: { state: true }, rowsShown: { state: true }, colsShown: { state: true }, fillTo: { state: true }, widths: { state: true }, menuRow: { state: true }, menuCol: { state: true } };
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
  private dragging = false;
  /** What we last put on the clipboard, so pasting it back can move formulas' references. */
  private clip: { text: string; r: number; c: number; cut: boolean } | null = null;
  /** The reference most recently inserted by tapping, so the next tap can replace it. */
  private picked: { r: number; c: number; start: number; end: number; to: [number, number] } | null = null;
  /** Where the caret was when the selected cell last lost focus. */
  private caret: { r: number; c: number; pos: number } | null = null;

  constructor() {
    super();
    this.sel = [0, 0];
    this.end = null;
    this.focused = false;
    this.rowsShown = 30;
    this.colsShown = MIN_COLS;
    this.fillTo = null;
    this.widths = null;
    this.menuRow = 0;
    this.menuCol = 0;
  }

  protected read(doc: Doc): SheetView {
    return readSheet(doc);
  }

  /* ---------- what is drawn ---------- */

  /** How many columns the sheet shows now: three at the least, more as they are added or typed into. */
  private get cols(): number {
    return Math.max(this.view.cols.length, this.colsShown);
  }
  /** The columns drawn, those past the table's edge going by their letters. */
  private columns(): Column[] {
    const cols = [...this.view.cols];
    while (cols.length < this.cols) cols.push({ name: `Col${COL_NAMES[cols.length]}`, type: 'text' });
    return cols;
  }
  private get drawn(): number {
    return Math.min(ROWS, Math.max(this.rowsShown, this.view.used.rows + 6));
  }
  private raw(r: number, c: number): string {
    return this.view.table.rows[r]?.[c] ?? '';
  }
  private val(r: number, c: number) {
    return this.view.values[r]?.[c] ?? null;
  }
  private locked(r: number, c: number): boolean {
    return isLocked(this.view.table.lock, r, c);
  }
  /** The cell nearest (r, c) that is on the sheet. */
  private onSheet(r: number, c: number): [number, number] {
    return [clamp(r, 0, ROWS - 1), clamp(c, 0, this.cols - 1)];
  }
  /** The selected block: one cell unless a far corner has been set. */
  private get range(): Range {
    return rangeOf(this.sel, this.end ?? this.sel);
  }
  private get many(): boolean {
    return !!this.end && (this.end[0] !== this.sel[0] || this.end[1] !== this.sel[1]);
  }
  private cellAt(x: number, y: number): [number, number] | null {
    const td = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('td[data-r]');
    return td && this.contains(td) ? [Number(td.dataset.r), Number(td.dataset.c)] : null;
  }

  /* ---------- commands ---------- */

  private setCell(r: number, c: number, raw: string) {
    if (this.locked(r, c)) return;
    this.edit(setCell(this.doc, r, c, raw), `cell:${r}:${c}`);
  }
  /** The selected cells locked, or let go. */
  private toggleLock() {
    const g = this.range;
    this.edit(setLock(this.doc, g, !this.locked(g.r0, g.c0)));
  }
  private chart(kind: ChartKind | '') {
    this.edit(setChart(this.doc, kind));
  }
  /** Carry the block's first row down it, or its first column across it. */
  private fill(down: boolean) {
    const g = this.range;
    this.edit(putRect(this.doc, fillCells(this.view.table, down ? { ...g, r1: g.r0 } : { ...g, c1: g.c0 }, g)));
  }
  private setType(c: number, type: ColType) {
    this.edit(setType(this.doc, c, type));
  }
  private rename(c: number, name: string) {
    this.edit(rename(this.doc, c, name));
  }

  /* ---------- clipboard ---------- */

  private onCopy = (e: ClipboardEvent) => {
    const input = e.target as HTMLInputElement;
    const some = input.selectionStart !== input.selectionEnd && !(input.selectionStart === 0 && input.selectionEnd === input.value.length);
    // Some of a cell's text, picked out, is ordinary text; otherwise it is the cell (or the block) that is copied.
    if (!this.many && some) return;
    const g = this.range;
    const text = copyCells(this.view.table, g);
    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    this.clip = { text, r: g.r0, c: g.c0, cut: e.type === 'cut' };
    if (e.type === 'cut') this.edit(putRect(this.doc, clearCells(g)));
  };

  private onPaste = (e: ClipboardEvent) => {
    const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r\n?/g, '\n');
    const ours = this.clip && this.clip.text === text.replace(/\n$/, '') ? this.clip : null;
    const block = /[\t\n]/.test(text.replace(/\n$/, ''));
    // One value into one cell that is being typed in: let the browser paste text.
    if (!block && !ours && !this.many) return;
    e.preventDefault();
    const g = this.range;
    // A copy moves its formulas' references by how far it travelled; a cut keeps them as they were.
    const moved = ours && !ours.cut ? { dr: g.r0 - ours.r, dc: g.c0 - ours.c } : undefined;
    // A block wider than the sheet widens it, up to the last letter, rather than losing its right-hand columns.
    const widest = Math.max(...text.replace(/\n$/, '').split('\n').map((line) => line.split('\t').length));
    const cols = this.columns();
    while (block && cols.length < Math.min(MAX_COLS, g.c0 + widest)) cols.push({ name: `Col${COL_NAMES[cols.length]}`, type: 'text' });
    const done = pasteCells({ cols }, g.r0, g.c0, text, moved, this.many ? g : undefined);
    this.edit(putRect(this.doc, done));
    this.colsShown = Math.max(this.colsShown, done.range.c1 + 1);
    this.end = [done.range.r1, done.range.c1];
    this.focusCell(done.range.r0, done.range.c0, true);
  };

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
      this.fillTo = !dr && !dc ? null : Math.abs(dr) >= Math.abs(dc) ? { ...src, r0: Math.min(src.r0, at[0]), r1: Math.max(src.r1, at[0]) } : { ...src, c0: Math.min(src.c0, at[1]), c1: Math.max(src.c1, at[1]) };
    };
    follow(handle, move, () => {
      const dest = this.fillTo;
      this.fillTo = null;
      if (!dest) return;
      this.edit(putRect(this.doc, fillCells(this.view.table, src, dest)));
      this.sel = [dest.r0, dest.c0];
      this.end = [dest.r1, dest.c1];
    });
  };

  /* ---------- rows put in and taken out ---------- */

  /** The rows a row command works on: the selected ones, if the selection takes in row r; else just r. */
  private rowsFor(r = this.sel[0]): [number, number] {
    const g = this.range;
    return r >= g.r0 && r <= g.r1 ? [g.r0, g.r1] : [r, r];
  }
  private insertRowsAt(below: boolean, r?: number) {
    const [r0, r1] = this.rowsFor(r);
    const n = r1 - r0 + 1;
    if (this.view.used.rows + n > ROWS) return void toast(t('The sheet is full: its last rows hold something.'));
    const at = below ? r1 + 1 : r0;
    this.edit(insertRows(this.doc, at, n));
    // The new rows are selected, ready to type into.
    this.sel = [at, this.sel[1]];
    this.end = n > 1 ? [at + n - 1, this.sel[1]] : null;
    this.focusCell(at, this.sel[1], n > 1);
  }
  private deleteRowsAt(r?: number) {
    const [r0, r1] = this.rowsFor(r);
    this.edit(deleteRows(this.doc, r0, r1));
    this.end = null;
    this.focusCell(Math.min(r0, ROWS - 1), this.sel[1]);
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
  private rowItems(): MenuItem[] {
    const [r0, r1] = this.rowsFor(this.menuRow);
    const n = r1 - r0 + 1;
    const which = n === 1 ? t('row {n}', { n: r0 + 1 }) : t('rows {a}–{b}', { a: r0 + 1, b: r1 + 1 });
    const full = this.view.used.rows > ROWS - n;
    const group = which[0].toUpperCase() + which.slice(1);
    return [
      { group, label: t('Insert {n|a row|# rows} above', { n }), icon: ArrowUp, hint: keysText('Mod+Alt+='), disabled: full, does: () => this.insertRowsAt(false, this.menuRow) },
      { group, label: t('Insert {n|a row|# rows} below', { n }), icon: ArrowDown, disabled: full, does: () => this.insertRowsAt(true, this.menuRow) },
      { group, label: t('Delete {which}', { which }), icon: Trash2, hint: keysText('Mod+Alt+-'), does: () => this.deleteRowsAt(this.menuRow) },
    ];
  }

  /* ---------- columns put in and taken out ---------- */

  /** A column put in before column `at`: after the last, from the + at the end of the header; after any, from its menu. */
  private addColumn(at: number) {
    if (this.cols >= MAX_COLS) return void toast(t('The sheet is as wide as it goes: twenty-six columns.'));
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
  private async openColMenu(c: number, from: HTMLElement) {
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
      ...TYPES.map((ty) => ({ group: t('Column {c} holds', { c: letter }), label: ty.name(), hint: ty.hint(), checked: cols[c].type === ty.id, does: () => this.setType(c, ty.id) })),
      { group: t('Sort the rows by it'), label: t('Low to high'), icon: ArrowDown, does: () => this.edit(sortBy(this.doc, c, false)) },
      { group: t('Sort the rows by it'), label: t('High to low'), icon: ArrowUp, does: () => this.edit(sortBy(this.doc, c, true)) },
      { group: t('Columns'), label: t('Add a column after'), icon: UI.plus, disabled: this.cols >= MAX_COLS, does: () => this.addColumn(c + 1) },
      { group: t('Columns'), label: t('Remove this column'), icon: Trash2, disabled: !may, hint: may ? undefined : this.cols <= MIN_COLS ? t('Three at the least') : t('Once it is empty'), does: () => this.removeColumn(c) },
    ];
  }

  /* ---------- Insert ▾ and the chart ---------- */

  private inserts(): MenuItem[] {
    return [
      { label: t('Row above'), icon: Rows3, hint: keysText('Mod+Alt+='), does: () => this.insertRowsAt(false) },
      { label: t('Row below'), icon: Rows3, does: () => this.insertRowsAt(true) },
      { label: t('Column after'), icon: Columns3, disabled: this.cols >= MAX_COLS, does: () => this.addColumn(this.sel[1] + 1) },
      ...FUNCTIONS.map(([name, args, what]) => ({ group: t('Function'), label: `${name}(${args})`, hint: what, does: () => this.insertFunction(name) })),
    ];
  }
  private chartItems(): MenuItem[] {
    const now = this.view.table.chart;
    const best = suggestChart(chartOfSheet(this.view));
    return [
      { label: t('No chart'), checked: now === '', does: () => this.chart('') },
      ...CHART_KINDS.map((k) => ({ label: k.name(), hint: k.id === best ? t('suggested') : undefined, checked: now === k.id, does: () => this.chart(k.id) })),
    ];
  }

  /** A cell of rich text, drawn: **bold** and *italic* shown as such, addresses as links. */
  private rich(raw: string) {
    return parseInline(raw).map((run) => {
      const inner = (run.href ? [{ t: run.t, url: run.href }] : linkify(run.t)).map((p) => (p.url ? html`<a href=${p.url} target="_blank" rel="noopener">${p.t}</a>` : p.t));
      return html`<span class="${run.b ? 'b' : ''} ${run.i ? 'i' : ''} ${run.u ? 'u' : ''} ${run.s ? 's' : ''}">${inner}</span>`;
    });
  }

  /* ---------- focus and the caret ---------- */

  private focusCell(row: number, col: number, keepBlock = false) {
    const [r, c] = this.onSheet(row, col);
    // Near the bottom of what is drawn, more rows appear.
    if (r >= this.drawn - 2) this.rowsShown = Math.min(ROWS, this.drawn + 20);
    if (!keepBlock) this.end = null;
    this.sel = [r, c];
    void this.updateComplete.then(() => {
      const el = this.querySelector<HTMLInputElement>(`#c${r}_${c}`);
      if (!el) return;
      // The page holds still: the table's own box scrolls to show the cell (focus() would scroll every ancestor, the page too).
      el.focus({ preventScroll: true });
      el.select();
      this.reveal(el);
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
    void this.caretTo(start + ref.length, ed);
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

  /** Width in px that shows every value in column c without clipping. */
  private naturalWidth(c: number): number {
    const sample = this.querySelector<HTMLInputElement>('table.sheet td input');
    const ctx = document.createElement('canvas').getContext('2d');
    if (!sample || !ctx) return 120;
    const cs = getComputedStyle(sample);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    let w = 0;
    const type = this.columns()[c].type;
    for (let r = 0; r < this.view.used.rows; r++) w = Math.max(w, ctx.measureText(formatCell(this.val(r, c), type)).width);
    return Math.max(MIN_COL, Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 6));
  }
  private currentWidths(): number[] {
    if (this.widths) return this.widths.slice();
    return [...this.querySelectorAll<HTMLElement>('table.sheet thead th[scope=col]')].slice(0, this.cols).map((th) => th.getBoundingClientRect().width);
  }
  private onGripDown(e: PointerEvent, c: number) {
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    const base = this.currentWidths();
    const x0 = e.clientX;
    grip.setPointerCapture(e.pointerId);
    follow(grip, (ev) => {
      const w = base.slice();
      w[c] = Math.max(MIN_COL, Math.round(base[c] + ev.clientX - x0));
      this.widths = w;
    });
  }
  private fitColumn(c: number) {
    const w = this.currentWidths();
    w[c] = this.naturalWidth(c);
    this.widths = w;
  }

  /* ---------- keys ---------- */

  private onKey(e: KeyboardEvent, r: number, c: number) {
    if (this.pointWithKey(e)) return;
    // Rows in and out, as in other spreadsheets: Mod+Alt+= puts rows in above, Mod+Alt+- takes the selected rows out.
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.code === 'Equal' || e.code === 'Minus')) {
      e.preventDefault();
      if (e.code === 'Equal') this.insertRowsAt(false, r);
      else this.deleteRowsAt(r);
      return;
    }
    const input = e.target as HTMLInputElement;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const arrow = ARROWS[e.key];
    if (e.shiftKey && arrow && (arrow[0] !== 0 || all || this.many)) {
      // Shift+arrows stretch the block. (Sideways, only when not selecting text inside the cell.)
      const [fr, fc] = this.end ?? this.sel;
      e.preventDefault();
      this.end = this.onSheet(fr + arrow[0], fc + arrow[1]);
      return;
    }
    if (e.key === ' ' && this.columns()[c].type === 'check' && !this.raw(r, c).startsWith('=')) {
      // In a checkbox column the space bar ticks and unticks.
      e.preventDefault();
      this.setCell(r, c, this.val(r, c) ? '' : 'x');
      return;
    }
    if (this.many && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      this.edit(putRect(this.doc, clearCells(this.range)));
      return;
    }
    if (this.many && e.key === 'Escape') {
      this.end = null;
      return;
    }
    let move: [number, number] | null = null;
    if (e.key === 'Enter') move = e.shiftKey ? [r - 1, c] : [r + 1, c];
    else if (e.key === 'ArrowDown') move = [r + 1, c];
    else if (e.key === 'ArrowUp') move = [r - 1, c];
    else if (e.key === 'ArrowLeft' && atStart) move = [r, c - 1];
    else if (e.key === 'ArrowRight' && atEnd) move = [r, c + 1];
    else if (e.key === 'Escape') input.blur();
    if (move) {
      e.preventDefault();
      this.focusCell(move[0], move[1]);
    }
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
    const chart = chartOf(v);
    // The bar holds the same tools whatever is selected (a tool that does not apply is disabled, not gone), so it never changes shape under a finger.
    return html`<to-bar class="sheet-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        <to-menu class="sheet-chartmenu" .label=${t('Chart')} .icon=${ChartColumn} caret .items=${this.chartItems()}></to-menu>
        ${tool({ label: t('Fill down from the top row'), icon: ArrowDownToLine, disabled: !this.many, does: () => this.fill(true) })}
        ${tool({ label: t('Fill right from the first column'), icon: ArrowRightToLine, disabled: !this.many, does: () => this.fill(false) })}
        ${tool({ label: t('Fit the columns to the page'), icon: Maximize2, pressed: !w, does: () => (this.widths = null) })}
        ${tool({ label: t('Show all the text'), icon: Scaling, pressed: !!w, does: () => (this.widths = cols.map((_, c) => this.naturalWidth(c))) })}
        ${tool({ label: locked ? t('Unlock these cells') : t('Lock these cells, so a reader leaves them be'), icon: locked ? Lock : LockOpen, pressed: locked, does: () => this.toggleLock() })}
      </to-bar>
      ${v.big ? html`<div class="sheet-big"><b>${v.big.value}</b><span>${v.big.label}</span></div>` : nothing}
      <div class="sheet-fx">
        <span class="ref" aria-label=${t('Selected cells')}>${rangeRef(g)}</span>
        <input
          class="fx"
          aria-label=${t('Formula')}
          .value=${this.raw(sr, sc)}
          placeholder="="
          autocomplete="off"
          spellcheck="false"
          ?readonly=${locked}
          @input=${(e: Event) => this.setCell(sr, sc, (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => {
            if (this.pointWithKey(e)) return;
            if (e.key === 'Enter') this.focusCell(sr + 1, sc);
            else if (e.key === 'Escape') this.focusCell(sr, sc);
          }}
          @blur=${(e: Event) => (this.caret = { r: sr, c: sc, pos: (e.target as HTMLInputElement).selectionStart ?? 0 })}
        />
      </div>
      <div class="sheet-scroll">
        <table class="sheet ${w ? 'sized' : ''} ${picking ? 'picking' : ''} ${this.many ? 'selecting' : ''}" @copy=${this.onCopy} @cut=${this.onCopy} @paste=${this.onPaste} style=${w ? `width: calc(var(--sheet-row-w) + var(--sheet-add-w) + ${w.slice(0, n).reduce((a, b) => a + b, 0)}px)` : ''}>
          <colgroup>
            <col />
            ${cols.map((_, c) => html`<col style=${w ? `width:${w[c] ?? NEW_COL}px` : ''} />`)}
            <col class="add" />
          </colgroup>
          <thead>
            <tr>
              <td class="corner"></td>
              ${cols.map(
                (col, c) => html`<th scope="col">
                  <button type="button" class="col-head" aria-label=${t('Column {c}: {type}. What it holds, sort by it, add or remove a column', { c: COL_NAMES[c], type: typeOf(col.type).name() })} title=${t('What it holds; sort; columns')} aria-haspopup="menu" aria-expanded="false" @click=${(e: Event) => void this.openColMenu(c, e.currentTarget as HTMLElement)}>
                    <span class="cl">${COL_NAMES[c]}</span>${icon(UI.down, 12)}
                  </button>
                  <span class="grip" role="separator" aria-label=${t('Resize column {c}', { c: COL_NAMES[c] })} title=${t('Drag to resize, double-click to fit')} @pointerdown=${(e: PointerEvent) => this.onGripDown(e, c)} @dblclick=${() => this.fitColumn(c)}></span>
                </th>`,
              )}
              <td class="add-col" rowspan="2">
                <button type="button" class="add-col-btn" aria-label=${t('Add a column')} title=${t('Add a column')} ?disabled=${n >= MAX_COLS} @click=${() => this.addColumn(n)}>${icon(UI.plus, 16)}</button>
              </td>
            </tr>
            <tr class="names">
              <td class="corner"></td>
              ${cols.map(
                (col, c) => html`<th scope="col">
                  <input class="cn" aria-label=${t('Name of column {c}', { c: COL_NAMES[c] })} placeholder=${typeName(c, cols)} .value=${isLetterName(col.name) ? '' : col.name} autocomplete="off" spellcheck="false"
                    @change=${(e: Event) => this.rename(c, (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'Escape') && (e.target as HTMLInputElement).blur()} />
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${Array.from({ length: this.drawn }, (_, r) => this.renderRow(r, cols, g, fill))}
          </tbody>
        </table>
        ${this.drawn < ROWS ? html`<button type="button" class="sheet-more" @click=${() => (this.rowsShown = Math.min(ROWS, this.drawn + 50))}>${icon(UI.plus, 14)} ${t('50 more rows')} <span class="to-hint">${t('({n} of {max} shown)', { n: this.drawn, max: ROWS })}</span></button>` : nothing}
      </div>
      ${chart ? html`<figure class="sheet-chart"><svg viewBox="0 0 ${chart.w} ${chart.h}" role="img" aria-label=${chart.alt ?? t('Chart of the table')}>${unsafeSVG(chart.svg)}</svg></figure>` : nothing}
      <to-menu class="sheet-rowmenu" .label=${t('Row {n}', { n: this.menuRow + 1 })} .items=${this.rowItems()}></to-menu>
      <to-menu class="sheet-colmenu" .label=${t('Column {c}', { c: COL_NAMES[this.menuCol] })} .items=${this.colItems()}></to-menu>`;
  }

  private renderRow(r: number, cols: Column[], g: Range, fill: Range | null) {
    const [sr, sc] = this.sel;
    return html`<tr>
      <th class="row" scope="row"><button type="button" class="row-num" aria-label=${t('Row {n}: insert or delete rows', { n: r + 1 })} aria-haspopup="menu" aria-expanded="false" @click=${(e: Event) => void this.openRowMenu(r, e.currentTarget as HTMLElement)}>${r + 1}</button></th>
      ${cols.map((col, c) => {
        const raw = this.raw(r, c);
        const isSel = this.focused && r === sr && c === sc;
        const v = this.val(r, c);
        const type = col.type;
        const shown = isSel ? raw : formatCell(v, type);
        const link = type === 'url' && /^https?:\/\/\S+$/.test(raw.trim()) ? raw.trim() : '';
        const rich = type === 'rich' && !isSel && raw !== '' && !raw.startsWith('=');
        const locked = this.locked(r, c);
        const cls = (typeof v === 'number' && type !== 'check' ? 'num' : typeof v === 'string' && v.startsWith('#') ? 'err' : '') + (link && !isSel ? ' link' : '') + (rich ? ' under' : '') + (type === 'check' ? ' tick' : '') + (locked ? ' locked' : '') + (type === 'name' ? ' named' : '');
        const inBlock = this.many && r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1;
        const inFill = !!fill && r >= fill.r0 && r <= fill.r1 && c >= fill.c0 && c <= fill.c1;
        return html`<td data-r=${r} data-c=${c} class="${r === sr && c === sc ? 'sel' : ''} ${inBlock ? 'in' : ''} ${inFill ? 'filling' : ''}" @mousedown=${(e: MouseEvent) => this.onCellDown(e, r, c)} @mouseover=${(e: MouseEvent) => this.onCellOver(e, r, c)}>
          <input
            id="c${r}_${c}"
            class=${cls}
            aria-label=${rcToRef(r, c)}
            .value=${shown}
            title=${locked ? t('Locked: part of the model') : raw.startsWith('=') ? raw : nothing}
            placeholder=${isSel && type === 'date' ? 'YYYY-MM-DD' : nothing}
            ?readonly=${locked}
            autocomplete="off"
            @focus=${(e: Event) => {
              if (r !== this.sel[0] || c !== this.sel[1]) this.end = null;
              this.sel = [r, c];
              this.focused = true;
              this.reveal(e.target as HTMLElement);
            }}
            @blur=${(e: Event) => {
              this.focused = false;
              this.caret = { r, c, pos: (e.target as HTMLInputElement).selectionStart ?? 0 };
            }}
            @input=${(e: Event) => this.setCell(r, c, (e.target as HTMLInputElement).value)}
            @keydown=${(e: KeyboardEvent) => this.onKey(e, r, c)}
          />
          ${rich ? html`<span class="rich" aria-hidden="true">${this.rich(raw)}</span>` : nothing}
          ${link ? html`<a class="go" href=${link} target="_blank" rel="noopener" aria-label=${t('Open {link}', { link })} tabindex="-1">${icon(UI.link, 12)}</a>` : nothing}
          ${r === g.r1 && c === g.c1 ? html`<span class="fill" role="button" aria-label=${t('Fill: drag to carry these cells on')} title=${t('Drag to fill')} @pointerdown=${this.onFillDown}></span>` : nothing}
        </td>`;
      })}
    </tr>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToSheetEditor);
