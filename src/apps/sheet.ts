/**
 * <to-sheet>: a spreadsheet with formulas, and a chart of it if you ask.
 * Document format: one table, its header row the columns' names and types (lib/formula.ts).
 *
 * Drag across cells (or hold Shift) to select a block: it can be copied,
 * cut, pasted, cleared, or carried on with the handle at its corner.
 *
 * While a formula is being edited, tapping another cell inserts its reference
 * instead of moving there. Column widths are a view setting, not part of the
 * document: "fit" squeezes the columns into the page, "show all" sizes each
 * to its longest value, and header edges can be dragged.
 */
import { DocElement, defineElement, html, state, unsafeSVG, tool, icon, UI, keyLabel, clamp, type PropertyValues, type SlInput, type SlSelect } from '../kit.ts';
import { COLS, ROWS, COL_NAMES, isLocked, lockedRanges, remapLock, rowsIn, rowsOut, withLock, COLUMN_TYPES, FUNCTIONS, columnName, defaultColumnName, deleteRows, evaluateGrid, formatCell, insertRows, readSheet, serializeGrid, rcToRef, clearCells, copyCells, fillCells, pasteCells, rangeOf, rangeRef, sortRows, usedSize, type CellValue, type Range, type Sheet } from '../lib/formula.ts';
import { CHART_KINDS, chartPage, suggestChart, type ChartData, type ChartKind } from '../lib/chart.ts';
import { chartOfSheet, measured } from './sheet.def.ts';
import { linkify, parseInline } from '../lib/richtext.ts';
import { templateGallery, templateTool } from '../widgets/template-picker.ts';

const MIN_COL = 48;
/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
/** The cell nearest (r, c) that is on the sheet. */
const onSheet = (r: number, c: number): [number, number] => [clamp(r, 0, ROWS - 1), clamp(c, 0, COLS - 1)];

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

export class ToSheet extends DocElement<Sheet> {
  @state() private sel: [number, number] = [0, 0];
  @state() private focused = false;
  /** Rows drawn: the sheet goes to ROWS, but only what is in use (and a little room) is on screen; it grows as you go. */
  @state() private rowsShown = 30;
  private get drawn(): number {
    return Math.min(ROWS, Math.max(this.rowsShown, usedSize(this.doc.grid).rows + 6));
  }
  /** The far corner of a block of cells; `sel` is the corner it was started from. */
  @state() private end: [number, number] | null = null;
  /** While the fill handle is dragged: the block it would fill. */
  @state() private fillTo: Range | null = null;
  private dragging = false;
  /** What we last put on the clipboard, so pasting it back can move formulas' references. */
  private clip: { text: string; r: number; c: number; cut: boolean } | null = null;
  /** Column widths in px, or null to fit the columns to the page. */
  @state() private widths: number[] | null = null;
  /** The row whose menu (insert, delete) is open. */
  @state() private rowMenu: number | null = null;
  /** The cells' values, and the sheet they were worked out from. */
  private computed: CellValue[][] = [];
  private evaluated: Sheet | null = null;
  /** The document as last read or written: until there is one, templates are offered. */
  private text = '';
  /** The reference most recently inserted by tapping, so the next tap can replace it. */
  private picked: { r: number; c: number; start: number; end: number; to: [number, number] } | null = null;
  /** Where the caret was when the selected cell last lost focus. */
  private caret: { r: number; c: number; pos: number } | null = null;

  protected parse(text: string) {
    this.text = text;
    return readSheet(text);
  }
  protected serialize({ grid, chart, types, names, lock }: Sheet) {
    return (this.text = serializeGrid(grid, chart, types, names, lock));
  }

  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    // The values are worked out again only when the cells or what the columns hold have changed.
    const { grid, types } = this.doc;
    if (grid !== this.evaluated?.grid || types !== this.evaluated.types) {
      this.computed = evaluateGrid(grid, types);
      this.evaluated = this.doc;
    }
  }

  /**
   * Locked cells are the model's own: whatever typing, pasting, filling or
   * clearing would do to them is undone here. A change that brings its own
   * lock (rows put in or taken out, or the lock itself) has moved the cells
   * and the lock together, and goes through as it is.
   */
  private save(change: Partial<Sheet>) {
    const { lock, grid: was } = this.doc;
    if (change.grid && lock && change.lock === undefined) {
      const grid = change.grid;
      for (const g of lockedRanges(lock)) for (let r = g.r0; r <= g.r1; r++) for (let c = g.c0; c <= g.c1; c++) if (grid[r][c] !== was[r][c]) (grid[r] = grid[r].slice())[c] = was[r][c];
    }
    this.commit({ ...this.doc, ...change });
  }
  private locked(r: number, c: number) {
    return !!this.doc.lock && isLocked(this.doc.lock, r, c);
  }
  /** The selected cells locked, or let go. */
  private toggleLock() {
    const g = this.range;
    this.save({ lock: withLock(this.doc.lock, g, !this.locked(g.r0, g.c0)) });
  }

  private setCell(r: number, c: number, raw: string) {
    if (this.locked(r, c)) return;
    const grid = this.doc.grid.map((row) => row.slice());
    grid[r][c] = raw;
    this.save({ grid });
  }

  /** A template becomes the sheet, chart and columns included: one change, one undo. */
  private useTemplate = (t: { body: string }) => {
    this.commit(readSheet(t.body));
    this.focusCell(0, 0);
  };

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

  /* ---------- clipboard ---------- */

  private onCopy(e: ClipboardEvent) {
    const input = e.target as HTMLInputElement;
    const some = input.selectionStart !== input.selectionEnd && !(input.selectionStart === 0 && input.selectionEnd === input.value.length);
    // Some of a cell's text, picked out, is ordinary text; otherwise it is the cell (or the block) that is copied.
    if (!this.many && some) return;
    const g = this.range;
    const text = copyCells(this.doc.grid, g);
    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    this.clip = { text, r: g.r0, c: g.c0, cut: e.type === 'cut' };
    if (e.type === 'cut') this.save({ grid: clearCells(this.doc.grid, g) });
  }

  private onPaste(e: ClipboardEvent) {
    const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r\n?/g, '\n');
    const ours = this.clip && this.clip.text === text.replace(/\n$/, '') ? this.clip : null;
    const block = /[\t\n]/.test(text.replace(/\n$/, ''));
    // One value into one cell that is being typed in: let the browser paste text.
    if (!block && !ours && !this.many) return;
    e.preventDefault();
    const g = this.range;
    // A copy moves its formulas' references by how far it travelled; a cut keeps them as they were.
    const moved = ours && !ours.cut ? { dr: g.r0 - ours.r, dc: g.c0 - ours.c } : undefined;
    const done = pasteCells(this.doc.grid, g.r0, g.c0, text, moved, this.many ? g : undefined);
    this.save({ grid: done.grid });
    this.end = [done.range.r1, done.range.c1];
    this.focusCell(done.range.r0, done.range.c0, true);
  }

  /* ---------- fill handle ---------- */

  private onFillDown(e: PointerEvent) {
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
      // Under a finger, dragging across cells scrolls, so the handle is how a block is stretched,
      // any way at all. (Filling is then a button: see the Fill buttons in the bar.)
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
      this.save({ grid: fillCells(this.doc.grid, src, dest) });
      this.sel = [dest.r0, dest.c0];
      this.end = [dest.r1, dest.c1];
    });
  }

  /** Carry the block's first row down it, or its first column across it. */
  private fill(down: boolean) {
    const g = this.range;
    this.save({ grid: fillCells(this.doc.grid, down ? { ...g, r1: g.r0 } : { ...g, c1: g.c0 }, g) });
  }

  private setType(c: number, type: string) {
    // A column that goes by its default name takes the name of what it now holds ("ColA" becomes "Date"); one named by hand keeps its name.
    this.save({ types: this.doc.types.map((t, i) => (i === c ? type : t)) });
  }
  private rename(c: number, name: string) {
    const clean = name.replace(/[\t\n]/g, ' ').trim();
    this.save({ names: this.doc.names.map((n, i) => (i === c ? (clean === defaultColumnName(c, this.doc.types) ? '' : clean) : n)) });
  }

  /* ---------- rows put in and taken out ---------- */

  /** The rows a row command works on: the selected ones, if the selection takes in row r (or r is not given); else just r. */
  private rowsFor(r = this.sel[0]): [number, number] {
    const g = this.range;
    return r >= g.r0 && r <= g.r1 ? [g.r0, g.r1] : [r, r];
  }
  private insertRowsAt(below: boolean, r?: number) {
    const [r0, r1] = this.rowsFor(r);
    const n = r1 - r0 + 1;
    const grid = insertRows(this.doc.grid, below ? r1 + 1 : r0, n);
    this.rowMenu = null;
    if (!grid) return void this.dispatchEvent(new CustomEvent('to-toast', { detail: 'The sheet is full: its last rows hold something.', bubbles: true, composed: true }));
    const at = below ? r1 + 1 : r0;
    this.save({ grid, lock: remapLock(this.doc.lock, rowsIn(at, n)) });
    // The new rows are selected, ready to type into.
    this.sel = [at, this.sel[1]];
    this.end = n > 1 ? [at + n - 1, this.sel[1]] : null;
    this.focusCell(at, this.sel[1], n > 1);
  }
  private deleteRowsAt(r?: number) {
    const [r0, r1] = this.rowsFor(r);
    this.rowMenu = null;
    this.save({ grid: deleteRows(this.doc.grid, r0, r1), lock: remapLock(this.doc.lock, rowsOut(r0, r1)) });
    this.end = null;
    this.focusCell(Math.min(r0, ROWS - 1), this.sel[1]);
  }
  /** A row's number: a tap selects the row (or keeps the selected rows it is in) and opens what can be done to it. */
  private async openRowMenu(r: number) {
    const [r0, r1] = this.rowsFor(r);
    if (r0 === r1) {
      this.sel = [r, 0];
      this.end = [r, COLS - 1];
    }
    this.rowMenu = r;
    await this.updateComplete;
    void (this.querySelector('.row-menu') as (HTMLElement & { show(): Promise<void> }) | null)?.show();
  }
  private renderRowMenu(r: number) {
    const [r0, r1] = this.rowsFor(r);
    const which = r0 === r1 ? `row ${r0 + 1}` : `rows ${r0 + 1}–${r1 + 1}`;
    const n = r1 - r0 + 1;
    const full = usedSize(this.doc.grid).rows > ROWS - n;
    return html`<sl-dropdown class="row-menu" hoist placement="right-start" @sl-after-hide=${() => (this.rowMenu = null)}
      @sl-select=${(e: CustomEvent) => {
        const v = e.detail.item.value;
        if (v === 'above' || v === 'below') this.insertRowsAt(v === 'below', r);
        else if (v === 'delete') this.deleteRowsAt(r);
      }}>
      <button slot="trigger" class="row-num" aria-label=${`Row ${r + 1}: insert or delete rows`}>${r + 1}</button>
      <sl-menu class="sheet-menu">
        <sl-menu-label>${which[0].toUpperCase() + which.slice(1)}</sl-menu-label>
        <sl-menu-item value="above" ?disabled=${full}>${icon(UI.up, 14, 'pre')} Insert ${n === 1 ? 'a row' : `${n} rows`} above<span slot="suffix" class="to-key">${keyLabel('Mod+Alt+=')}</span></sl-menu-item>
        <sl-menu-item value="below" ?disabled=${full}>${icon(UI.down, 14, 'pre')} Insert ${n === 1 ? 'a row' : `${n} rows`} below</sl-menu-item>
        <sl-divider></sl-divider>
        <sl-menu-item value="delete" class="danger">${icon(UI.trash, 14, 'pre')} Delete ${which}<span slot="suffix" class="to-key">${keyLabel('Mod+Alt+-')}</span></sl-menu-item>
      </sl-menu>
    </sl-dropdown>`;
  }

  /** A cell of rich text, drawn: **bold** and *italic* shown as such, addresses as links. */
  private rich(raw: string) {
    return parseInline(raw).map((run) => {
      const inner = (run.href ? [{ t: run.t, url: run.href }] : linkify(run.t)).map((p) => (p.url ? html`<a href=${p.url} target="_blank" rel="noopener">${p.t}</a>` : p.t));
      return html`<span class="${run.b ? 'b' : ''} ${run.i ? 'i' : ''} ${run.u ? 'u' : ''} ${run.s ? 's' : ''}">${inner}</span>`;
    });
  }

  private focusCell(row: number, col: number, keepBlock = false) {
    const [r, c] = onSheet(row, col);
    // Near the bottom of what is drawn, more rows appear.
    if (r >= this.drawn - 2) this.rowsShown = Math.min(ROWS, this.drawn + 20);
    if (!keepBlock) this.end = null;
    this.sel = [r, c];
    this.focusSoon(`#c${r}_${c}`, true);
  }

  /** The <input> being typed in right now: a cell or the formula bar. */
  private editor(): HTMLInputElement | null {
    const a = document.activeElement;
    if (!a || !this.contains(a)) return null;
    if (a instanceof HTMLInputElement) return a;
    return a.tagName === 'SL-INPUT' ? (a as SlInput).input : null;
  }

  /** Put the caret at `pos` in `ed` (or in the selected cell) once the new value has rendered. */
  private async caretTo(pos: number, ed?: HTMLInputElement | null) {
    await this.updateComplete;
    await this.querySelector<SlInput>('.sheet-bar sl-input')?.updateComplete;
    const [r, c] = this.sel;
    const el = ed ?? this.querySelector<HTMLInputElement>(`#c${r}_${c}`);
    if (!el) return;
    el.focus();
    // Focusing a cell swaps its computed value for the raw formula on the next render.
    await this.updateComplete;
    el.setSelectionRange(pos, pos);
  }

  /**
   * Point at a cell while a formula is being edited: its reference goes in
   * at the caret, replacing the one just pointed at if there was one.
   * Returns false when the formula is not waiting for a value.
   */
  private point(ed: HTMLInputElement, r: number, c: number): boolean {
    const [sr, sc] = this.sel;
    const val = this.doc.grid[sr][sc];
    if (!val.startsWith('=') || (r === sr && c === sc)) return false;
    let start = ed.selectionStart ?? val.length;
    const end = ed.selectionEnd ?? start;
    const p = this.pointing(ed);
    if (p) start = p.start;
    else if (!WANTS_REF.test(val.slice(0, start))) return false;
    const ref = rcToRef(r, c);
    this.setCell(sr, sc, val.slice(0, start) + ref + val.slice(end));
    this.picked = { r: sr, c: sc, start, end: start + ref.length, to: [r, c] };
    this.caretTo(start + ref.length, ed);
    return true;
  }

  /** The reference just pointed at, if the caret is still sitting right after it. */
  private pointing(ed: HTMLInputElement) {
    const [sr, sc] = this.sel;
    const p = this.picked;
    const at = ed.selectionStart;
    return p && p.r === sr && p.c === sc && at === p.end && ed.selectionEnd === p.end && p.end <= this.doc.grid[sr][sc].length ? p : null;
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

  /**
   * Arrow keys while a formula wants a value point at cells the same way a
   * tap does: the first press points next to the cell being edited, further
   * presses move the pointer. Left and right only point from the end of the
   * formula, so they can still move the caret through it.
   */
  private pointWithKey(e: KeyboardEvent): boolean {
    const move = ARROWS[e.key];
    const ed = this.editor();
    if (!move || !ed || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    const [sr, sc] = this.sel;
    const val = this.doc.grid[sr][sc];
    const at = ed.selectionStart ?? 0;
    const p = this.pointing(ed);
    if (!val.startsWith('=') || (!p && !WANTS_REF.test(val.slice(0, at)))) return false;
    if (move[1] !== 0 && at !== val.length) return false;
    const [fr, fc] = p ? p.to : [sr, sc];
    e.preventDefault();
    this.point(ed, ...onSheet(fr + move[0], fc + move[1]));
    return true;
  }

  private insertFunction(name: string) {
    const [r, c] = this.sel;
    const val = this.doc.grid[r][c];
    const text = name + '(';
    if (!val.startsWith('=')) {
      this.setCell(r, c, '=' + text);
      this.caretTo(text.length + 1);
      return;
    }
    const pos = this.caret && this.caret.r === r && this.caret.c === c ? Math.min(this.caret.pos, val.length) : val.length;
    this.setCell(r, c, val.slice(0, pos) + text + val.slice(pos));
    this.caretTo(pos + text.length);
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
    for (let r = 0; r < ROWS; r++) w = Math.max(w, ctx.measureText(formatCell(this.computed[r][c], this.doc.types[c])).width);
    return Math.max(MIN_COL, Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 6));
  }

  private currentWidths(): number[] {
    if (this.widths) return this.widths.slice();
    return [...this.querySelectorAll<HTMLElement>('table.sheet thead th[scope=col]')].map((th) => th.getBoundingClientRect().width);
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
      this.end = onSheet(fr + arrow[0], fc + arrow[1]);
      return;
    }
    if (e.key === ' ' && this.doc.types[c] === 'check' && !this.doc.grid[r][c].startsWith('=')) {
      // In a checkbox column the space bar ticks and unticks.
      e.preventDefault();
      this.setCell(r, c, this.computed[r][c] ? '' : 'x');
      return;
    }
    if (this.many && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      this.save({ grid: clearCells(this.doc.grid, this.range) });
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

  render() {
    const { grid, chart, types, names } = this.doc;
    const [sr, sc] = this.sel;
    const w = this.widths;
    const picking = grid[sr][sc].startsWith('=');
    const g = this.range;
    const fill = this.fillTo;
    const data = chartOfSheet(measured(this.doc, this.computed));
    const best = suggestChart(data);
    return html`
      <div class="to-toolbar sheet-bar">
        <span class="ref" aria-label="Selected cells">${rangeRef(this.range)}</span>
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => this.insertFunction(e.detail.item.value)}>
          <sl-button slot="trigger" class="icon" size="small" caret aria-label="Functions">${icon(UI.fn, 14)}<span class="sr-only">Functions</span></sl-button>
          <sl-menu class="sheet-fns">
            ${FUNCTIONS.map(([name, args, what]) => html`<sl-menu-item value=${name}>${name}<span class="what">${what}</span><code slot="suffix">${name}(${args})</code></sl-menu-item>`)}
            <sl-divider></sl-divider>
            <sl-menu-label>+ &minus; * / ^ % ( ) &nbsp; A1 &nbsp; A1:C3</sl-menu-label>
          </sl-menu>
        </sl-dropdown>
        <sl-input
          size="small"
          label="Formula"
          class="sr-label"
          .value=${grid[sr][sc]}
          placeholder="="
          @sl-input=${(e: Event) => this.setCell(sr, sc, (e.target as SlInput).value)}
          @keydown=${(e: KeyboardEvent) => !this.pointWithKey(e) && e.key === 'Enter' && this.focusCell(sr + 1, sc)}
          @sl-blur=${(e: Event) => (this.caret = { r: sr, c: sc, pos: (e.target as SlInput).input.selectionStart ?? 0 })}
        ></sl-input>
        <sl-select class="sr-label sheet-chart-pick" size="small" label="Chart" placeholder="Chart" hoist .value=${chart || 'none'} @sl-change=${(e: Event) => this.save({ chart: ((e.target as SlSelect).value as string).replace('none', '') })}>
          <span slot="prefix">${icon(UI.chart, 14)}</span>
          <sl-option value="none">No chart</sl-option>
          ${CHART_KINDS.map((k) => html`<sl-option value=${k.id}>${k.name}${k.id === best ? ' (suggested)' : ''}</sl-option>`)}
        </sl-select>
        ${this.many
          ? html`<sl-button-group label="Fill">
              ${tool('Fill down from the top row', 'back', () => this.fill(true))}
              ${tool('Fill right from the first column', 'arrow', () => this.fill(false))}
            </sl-button-group>`
          : ''}
        <sl-button-group label="Column widths">
          ${tool('Fit to page', 'fit', () => (this.widths = null), { pressed: !w })}
          ${tool('Show all text', 'expand', () => (this.widths = COL_NAMES.map((_, c) => this.naturalWidth(c))))}
        </sl-button-group>
        ${tool(this.locked(sr, sc) ? 'Unlock these cells' : 'Lock these cells, so a reader leaves them be', this.locked(sr, sc) ? 'lock' : 'unlock', () => this.toggleLock(), { pressed: this.locked(sr, sc) })}
        ${this.text ? '' : templateTool('sheet', this.useTemplate)}
      </div>
      ${this.text ? '' : templateGallery('sheet', this.useTemplate)}
      <div class="sheet-scroll">
        <table class="sheet ${w ? 'sized' : ''} ${picking ? 'picking' : ''} ${this.many ? 'selecting' : ''}" @copy=${this.onCopy} @cut=${this.onCopy} @paste=${this.onPaste} style=${w ? `width: calc(var(--sheet-row-w) + ${w.reduce((a, b) => a + b, 0)}px)` : ''}>
          <colgroup>
            <col />
            ${COL_NAMES.map((_, c) => html`<col style=${w ? `width:${w[c]}px` : ''} />`)}
          </colgroup>
          <thead>
            <tr>
              <td class="corner"></td>
              ${COL_NAMES.map(
                (n, c) => html`<th scope="col">
                  <sl-dropdown hoist class="col-menu-drop" @sl-select=${(e: CustomEvent) => (String(e.detail.item.value).startsWith('sort:') ? this.save({ grid: sortRows(grid, c, e.detail.item.value === 'sort:desc'), lock: this.doc.lock }) : this.setType(c, e.detail.item.value))}>
                    <button slot="trigger" class="col-type" aria-label="Column ${n}: ${COLUMN_TYPES.find((t) => t.id === types[c])!.name}. Change what it holds, or sort by it" data-tip="What it holds; sort">
                      <span class="cl">${n}</span>${icon(UI.down, 12)}
                    </button>
                    <sl-menu class="sheet-menu col-menu">
                      <sl-menu-label>Column ${n} holds</sl-menu-label>
                      ${COLUMN_TYPES.map((t) => html`<sl-menu-item type="checkbox" value=${t.id} ?checked=${types[c] === t.id}><span class="ct-name">${t.name}</span><small class="ct-hint">${t.hint}</small></sl-menu-item>`)}
                      <sl-divider></sl-divider>
                      <sl-menu-label>Sort the rows by it</sl-menu-label>
                      <sl-menu-item value="sort:asc">${icon(UI.down, 14, 'pre')} Low to high</sl-menu-item>
                      <sl-menu-item value="sort:desc">${icon(UI.up, 14, 'pre')} High to low</sl-menu-item>
                    </sl-menu>
                  </sl-dropdown><span class="grip" role="separator" aria-label="Resize column ${n}" data-tip="Drag to resize, double-click to fit" @pointerdown=${(e: PointerEvent) => this.onGripDown(e, c)} @dblclick=${() => this.fitColumn(c)}></span>
                </th>`,
              )}
            </tr>
            <!-- The columns' names, a row of their own under the letters: typed over where they stand. -->
            <tr class="names">
              <td class="corner"></td>
              ${COL_NAMES.map(
                (n, c) => html`<th scope="col">
                  <input class="cn" aria-label=${`Name of column ${n}`} placeholder=${defaultColumnName(c, types)} .value=${names[c] || columnName(c, types, names)} autocomplete="off" spellcheck="false"
                    @change=${(e: Event) => this.rename(c, (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'Escape') && (e.target as HTMLInputElement).blur()} />
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${grid.slice(0, this.drawn).map(
              (row, r) => html`<tr>
                <th class="row" scope="row">${this.rowMenu === r ? this.renderRowMenu(r) : html`<button class="row-num" aria-label=${`Row ${r + 1}: insert or delete rows`} aria-haspopup="menu" @click=${() => this.openRowMenu(r)}>${r + 1}</button>`}</th>
                ${row.map((raw, c) => {
                  const isSel = this.focused && r === sr && c === sc;
                  const v = this.computed[r][c];
                  const type = types[c];
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
                      data-tip=${locked ? `${raw.startsWith('=') ? raw + '. ' : ''}Locked: part of the model` : raw.startsWith('=') ? raw : ''}
                      placeholder=${isSel && type === 'date' ? 'YYYY-MM-DD' : ''}
                      ?readonly=${locked}
                      autocomplete="off"
                      @focus=${() => {
                        if (r !== this.sel[0] || c !== this.sel[1]) this.end = null;
                        this.sel = [r, c];
                        this.focused = true;
                      }}
                      @blur=${(e: Event) => {
                        this.focused = false;
                        this.caret = { r, c, pos: (e.target as HTMLInputElement).selectionStart ?? 0 };
                      }}
                      @input=${(e: Event) => this.setCell(r, c, (e.target as HTMLInputElement).value)}
                      @keydown=${(e: KeyboardEvent) => this.onKey(e, r, c)}
                    />
                    ${rich ? html`<span class="rich" aria-hidden="true">${this.rich(raw)}</span>` : ''}
                    ${link ? html`<a class="go" href=${link} target="_blank" rel="noopener" aria-label="Open ${link}" data-tip="Open link" tabindex="-1">${icon(UI.send, 12)}</a>` : ''}
                    ${r === g.r1 && c === g.c1 ? html`<span class="fill" role="button" aria-label="Fill: drag to carry these cells on" data-tip="Drag to fill" @pointerdown=${this.onFillDown}></span>` : ''}
                  </td>`;
                })}
              </tr>`,
            )}
          </tbody>
        </table>
        ${this.drawn < ROWS ? html`<button class="to-add sheet-more" @click=${() => (this.rowsShown = Math.min(ROWS, this.drawn + 50))}>${icon(UI.plus, 14)} 50 more rows <span class="to-hint">(${this.drawn} of ${ROWS.toLocaleString()} shown)</span></button>` : ''}
      </div>
      ${chart ? this.renderChart(data, chart as ChartKind) : ''}
    `;
  }

  private renderChart(data: ChartData, kind: ChartKind) {
    const p = chartPage(data, kind);
    return html`<figure class="sheet-chart"><svg viewBox="0 0 ${p.w} ${p.h}" role="img" aria-label="Chart of the table">${unsafeSVG(p.svg)}</svg></figure>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-sheet': ToSheet;
  }
}
defineElement('sheet', ToSheet);
