/**
 * <to-sheet>: a spreadsheet with formulas, and a chart of it if you ask.
 * Document format: rows separated by "\n", cells by "\t", trailing blanks trimmed.
 *
 * Drag across cells (or hold Shift) to select a block: it can be copied,
 * cut, pasted, cleared, or carried on with the handle at its corner.
 *
 * While a formula is being edited, tapping another cell inserts its reference
 * instead of moving there. Column widths are a view setting, not part of the
 * document: "fit" squeezes the columns into the page, "show all" sizes each
 * to its longest value, and header edges can be dragged.
 */
import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { COLS, ROWS, COL_NAMES, COLUMN_TYPES, FUNCTIONS, chartOf, evaluateGrid, formatCell, parseGrid, serializeGrid, typesOf, rcToRef, clearCells, copyCells, fillCells, pasteCells, rangeOf, rangeRef, type Grid, type CellValue, type Range } from '../lib/formula.ts';
import { CHART_KINDS, chartPage, suggestChart, type ChartData, type ChartKind } from '../lib/chart.ts';
import { chartOfSheet } from './sheet.def.ts';
import { linkify, parseDoc } from '../lib/richtext.ts';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import type { SlSelect } from '../lib/shoelace.ts';
import { icon, UI } from '../lib/icons.ts';
import type { SlInput } from '../lib/shoelace.ts';

const MIN_COL = 48;
/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;

@customElement('to-sheet')
export class ToSheet extends LitElement {
  @property() value = '';
  @state() private grid: Grid = parseGrid('');
  @state() private sel: [number, number] = [0, 0];
  @state() private focused = false;
  /** Rows drawn: the sheet goes to ROWS, but only what is in use (and a little room) is on screen; it grows as you go. */
  @state() private rowsShown = 30;
  private get used(): number {
    let n = 0;
    this.grid.forEach((row, r) => row.some((v) => v !== '') && (n = r + 1));
    return n;
  }
  private get drawn(): number {
    return Math.min(ROWS, Math.max(this.rowsShown, this.used + 6));
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
  /** The chart asked for: 'bar', 'line', 'pie' or ''. */
  @state() private chart = '';
  /** What each column holds: an id from COLUMN_TYPES per column. */
  @state() private types: string[] = typesOf('');
  private computed: CellValue[][] = evaluateGrid(this.grid, this.types);
  private lastEmitted = '';
  /** The reference most recently inserted by tapping, so the next tap can replace it. */
  private picked: { r: number; c: number; start: number; end: number; to: [number, number] } | null = null;
  /** Where the caret was when the selected cell last lost focus. */
  private caret: { r: number; c: number; pos: number } | null = null;

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.grid = parseGrid(this.value);
      this.chart = chartOf(this.value);
      this.types = typesOf(this.value);
      this.lastEmitted = this.value;
    }
    if (changed.has('grid') || changed.has('types') || changed.has('value')) this.computed = evaluateGrid(this.grid, this.types);
  }

  private setCell(r: number, c: number, raw: string) {
    const grid = this.grid.map((row) => row.slice());
    grid[r][c] = raw;
    this.save(grid, this.chart);
  }

  private save(grid: Grid, chart = this.chart, types = this.types) {
    this.grid = grid;
    this.chart = chart;
    this.types = types;
    this.lastEmitted = serializeGrid(grid, chart, types);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
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

  /* ---------- clipboard ---------- */

  private onCopy(e: ClipboardEvent) {
    const input = e.target as HTMLInputElement;
    const some = input.selectionStart !== input.selectionEnd && !(input.selectionStart === 0 && input.selectionEnd === input.value.length);
    // Some of a cell's text, picked out, is ordinary text; otherwise it is the cell (or the block) that is copied.
    if (!this.many && some) return;
    const g = this.range;
    const text = copyCells(this.grid, g);
    e.clipboardData?.setData('text/plain', text);
    e.preventDefault();
    this.clip = { text, r: g.r0, c: g.c0, cut: e.type === 'cut' };
    if (e.type === 'cut') this.save(clearCells(this.grid, g), this.chart);
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
    const done = pasteCells(this.grid, g.r0, g.c0, text, moved, this.many ? g : undefined);
    this.save(done.grid, this.chart);
    this.selectRange(done.range);
  }

  private selectRange(g: Range) {
    this.end = [g.r1, g.c1];
    this.focusCell(g.r0, g.c0, true);
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
      const stretch = (ev: PointerEvent) => {
        const at = this.cellAt(ev.clientX, ev.clientY);
        if (at) this.end = at;
      };
      const done = () => {
        handle.removeEventListener('pointermove', stretch);
        handle.removeEventListener('pointerup', done);
        handle.removeEventListener('pointercancel', done);
      };
      this.sel = [src.r0, src.c0];
      handle.addEventListener('pointermove', stretch);
      handle.addEventListener('pointerup', done);
      handle.addEventListener('pointercancel', done);
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
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      const dest = this.fillTo;
      this.fillTo = null;
      if (!dest) return;
      this.save(fillCells(this.grid, src, dest), this.chart);
      this.sel = [dest.r0, dest.c0];
      this.end = [dest.r1, dest.c1];
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  /** Carry the block's first row down it, or its first column across it. */
  private fill(down: boolean) {
    const g = this.range;
    this.save(fillCells(this.grid, down ? { ...g, r1: g.r0 } : { ...g, c1: g.c0 }, g));
  }

  private setType(c: number, type: string) {
    this.save(this.grid, this.chart, this.types.map((t, i) => (i === c ? type : t)));
  }

  /** A cell of rich text, drawn: *bold* and _italic_ shown as such, addresses as links. */
  private rich(raw: string) {
    return parseDoc(raw.replace(/^(#+ |[-+]+ |@@)/, '\\$1'))[0].runs.map((run) => {
      const inner = linkify(run.t).map((p) => (p.url ? html`<a href=${p.url} target="_blank" rel="noopener">${p.t}</a>` : p.t));
      return html`<span class="${run.b ? 'b' : ''} ${run.i ? 'i' : ''} ${run.u ? 'u' : ''} ${run.s ? 's' : ''}">${inner}</span>`;
    });
  }

  private focusCell(r: number, c: number, keepBlock = false) {
    r = Math.max(0, Math.min(ROWS - 1, r));
    // Near the bottom of what is drawn, more rows appear.
    if (r >= this.drawn - 2) this.rowsShown = Math.min(ROWS, this.drawn + 20);
    c = Math.max(0, Math.min(COLS - 1, c));
    if (!keepBlock) this.end = null;
    this.sel = [r, c];
    this.updateComplete.then(() => {
      const el = this.querySelector<HTMLInputElement>(`#c${r}_${c}`);
      el?.focus();
      el?.select();
    });
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
    const val = this.grid[sr][sc];
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
    return p && p.r === sr && p.c === sc && at === p.end && ed.selectionEnd === p.end && p.end <= this.grid[sr][sc].length ? p : null;
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
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = d[e.key];
    const ed = this.editor();
    if (!move || !ed || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
    const [sr, sc] = this.sel;
    const val = this.grid[sr][sc];
    const at = ed.selectionStart ?? 0;
    const p = this.pointing(ed);
    if (!val.startsWith('=') || (!p && !WANTS_REF.test(val.slice(0, at)))) return false;
    if (move[1] !== 0 && at !== val.length) return false;
    const [fr, fc] = p ? p.to : [sr, sc];
    const r = Math.max(0, Math.min(ROWS - 1, fr + move[0]));
    const c = Math.max(0, Math.min(COLS - 1, fc + move[1]));
    e.preventDefault();
    this.point(ed, r, c);
    return true;
  }

  private insertFunction(name: string) {
    const [r, c] = this.sel;
    const val = this.grid[r][c];
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

  private shown(r: number, c: number): string {
    return formatCell(this.computed[r][c], this.types[c]);
  }

  /** Width in px that shows every value in column c without clipping. */
  private naturalWidth(c: number): number {
    const sample = this.querySelector<HTMLInputElement>('table.sheet td input');
    const ctx = document.createElement('canvas').getContext('2d');
    if (!sample || !ctx) return 120;
    const cs = getComputedStyle(sample);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    let w = 0;
    for (let r = 0; r < ROWS; r++) w = Math.max(w, ctx.measureText(this.shown(r, c)).width);
    return Math.max(MIN_COL, Math.ceil(w + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 6));
  }

  private currentWidths(): number[] {
    if (this.widths) return this.widths.slice();
    return [...this.querySelectorAll<HTMLElement>('table.sheet thead th[scope=col]')].map((th) => th.getBoundingClientRect().width);
  }

  private showAll() {
    this.widths = COL_NAMES.map((_, c) => this.naturalWidth(c));
  }

  private onGripDown(e: PointerEvent, c: number) {
    e.preventDefault();
    const grip = e.currentTarget as HTMLElement;
    const base = this.currentWidths();
    const x0 = e.clientX;
    grip.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const w = base.slice();
      w[c] = Math.max(MIN_COL, Math.round(base[c] + ev.clientX - x0));
      this.widths = w;
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  }

  private fitColumn(c: number) {
    const w = this.currentWidths();
    w[c] = this.naturalWidth(c);
    this.widths = w;
  }

  private onKey(e: KeyboardEvent, r: number, c: number) {
    if (this.pointWithKey(e)) return;
    const input = e.target as HTMLInputElement;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    const all = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const arrow: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (e.shiftKey && arrow[e.key] && (arrow[e.key][0] !== 0 || all || this.many)) {
      // Shift+arrows stretch the block. (Sideways, only when not selecting text inside the cell.)
      const [fr, fc] = this.end ?? this.sel;
      e.preventDefault();
      this.end = [Math.max(0, Math.min(ROWS - 1, fr + arrow[e.key][0])), Math.max(0, Math.min(COLS - 1, fc + arrow[e.key][1]))];
      return;
    }
    if (e.key === ' ' && this.types[c] === 'c' && !this.grid[r][c].startsWith('=')) {
      // In a checkbox column the space bar ticks and unticks.
      e.preventDefault();
      this.setCell(r, c, this.computed[r][c] ? '' : 'x');
      return;
    }
    if (this.many && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      this.save(clearCells(this.grid, this.range), this.chart);
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
    const [sr, sc] = this.sel;
    const w = this.widths;
    const picking = this.grid[sr][sc].startsWith('=');
    const g = this.range;
    const fill = this.fillTo;
    const data = chartOfSheet(this.lastEmitted);
    const best = suggestChart(data);
    return html`
      <div class="sheet-bar">
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
          .value=${this.grid[sr][sc]}
          placeholder="="
          @sl-input=${(e: Event) => this.setCell(sr, sc, (e.target as SlInput).value)}
          @keydown=${(e: KeyboardEvent) => !this.pointWithKey(e) && e.key === 'Enter' && this.focusCell(sr + 1, sc)}
          @sl-blur=${(e: Event) => (this.caret = { r: sr, c: sc, pos: (e.target as SlInput).input.selectionStart ?? 0 })}
        ></sl-input>
        <sl-select class="sr-label sheet-chart-pick" size="small" label="Chart" placeholder="Chart" hoist .value=${this.chart || 'none'} @sl-change=${(e: Event) => this.save(this.grid, ((e.target as SlSelect).value as string).replace('none', ''))}>
          <span slot="prefix">${icon(UI.chart, 14)}</span>
          <sl-option value="none">No chart</sl-option>
          ${CHART_KINDS.map((k) => html`<sl-option value=${k.id}>${k.name}${k.id === best ? ' (suggested)' : ''}</sl-option>`)}
        </sl-select>
        ${this.many
          ? html`<sl-button-group label="Fill">
              <sl-tooltip content="Fill down from the top row" hoist><sl-button class="icon" size="small" aria-label="Fill down" @click=${() => this.fill(true)}>${icon(UI.back, 14)}<span class="sr-only">Fill down</span></sl-button></sl-tooltip>
              <sl-tooltip content="Fill right from the first column" hoist><sl-button class="icon" size="small" aria-label="Fill right" @click=${() => this.fill(false)}>${icon(UI.arrow, 14)}<span class="sr-only">Fill right</span></sl-button></sl-tooltip>
            </sl-button-group>`
          : ''}
        <sl-button-group label="Column widths">
          <sl-tooltip content="Fit to page" hoist><sl-button class="icon" size="small" aria-label="Fit to page" aria-pressed=${w ? 'false' : 'true'} @click=${() => (this.widths = null)}>${icon(UI.fit, 14)}<span class="sr-only">Fit to page</span></sl-button></sl-tooltip>
          <sl-tooltip content="Show all text" hoist><sl-button class="icon" size="small" aria-label="Show all text" @click=${this.showAll}>${icon(UI.expand, 14)}<span class="sr-only">Show all text</span></sl-button></sl-tooltip>
        </sl-button-group>
      </div>
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
                  <sl-dropdown hoist @sl-select=${(e: CustomEvent) => this.setType(c, e.detail.item.value)}>
                    <button slot="trigger" class="col-type" aria-label="Column ${n}: ${COLUMN_TYPES.find((t) => t.id === this.types[c])!.name}. Change what it holds">${n}${this.types[c] === 't' ? '' : html`<small>${COLUMN_TYPES.find((t) => t.id === this.types[c])!.name}</small>`}</button>
                    <sl-menu>
                      <sl-menu-label>Column ${n} holds</sl-menu-label>
                      ${COLUMN_TYPES.map((t) => html`<sl-menu-item type="checkbox" value=${t.id} ?checked=${this.types[c] === t.id}>${t.name}<span slot="suffix" class="to-hint">${t.hint}</span></sl-menu-item>`)}
                    </sl-menu>
                  </sl-dropdown><span class="grip" role="separator" aria-label="Resize column ${n}" title="Drag to resize, double-click to fit" @pointerdown=${(e: PointerEvent) => this.onGripDown(e, c)} @dblclick=${() => this.fitColumn(c)}></span>
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${this.grid.slice(0, this.drawn).map(
              (row, r) => html`<tr>
                <th class="row" scope="row">${r + 1}</th>
                ${row.map((raw, c) => {
                  const isSel = this.focused && r === sr && c === sc;
                  const v = this.computed[r][c];
                  const type = this.types[c];
                  const shown = isSel ? raw : formatCell(v, type);
                  const link = type === 'u' && /^https?:\/\/\S+$/.test(raw.trim()) ? raw.trim() : '';
                  const rich = type === 'r' && !isSel && raw !== '' && !raw.startsWith('=');
                  const cls = (typeof v === 'number' && type !== 'c' ? 'num' : typeof v === 'string' && v.startsWith('#') ? 'err' : '') + (link && !isSel ? ' link' : '') + (rich ? ' under' : '') + (type === 'c' ? ' tick' : '');
                  const inBlock = this.many && r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1;
                  const inFill = !!fill && r >= fill.r0 && r <= fill.r1 && c >= fill.c0 && c <= fill.c1;
                  return html`<td data-r=${r} data-c=${c} class="${r === sr && c === sc ? 'sel' : ''} ${inBlock ? 'in' : ''} ${inFill ? 'filling' : ''}" @mousedown=${(e: MouseEvent) => this.onCellDown(e, r, c)} @mouseover=${(e: MouseEvent) => this.onCellOver(e, r, c)}>
                    <input
                      id="c${r}_${c}"
                      class=${cls}
                      aria-label=${rcToRef(r, c)}
                      .value=${shown}
                      title=${raw.startsWith('=') ? raw : ''}
                      placeholder=${isSel && type === 'd' ? 'YYYY-MM-DD' : ''}
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
                    ${link ? html`<a class="go" href=${link} target="_blank" rel="noopener" aria-label="Open ${link}" title="Open link" tabindex="-1">${icon(UI.send, 12)}</a>` : ''}
                    ${r === g.r1 && c === g.c1 ? html`<span class="fill" role="button" aria-label="Fill: drag to carry these cells on" title="Drag to fill" @pointerdown=${this.onFillDown}></span>` : ''}
                  </td>`;
                })}
              </tr>`,
            )}
          </tbody>
        </table>
        ${this.drawn < ROWS ? html`<button class="sheet-more" @click=${() => (this.rowsShown = Math.min(ROWS, this.drawn + 50))}>${icon(UI.plus, 14)} 50 more rows <span class="to-hint">(${this.drawn} of ${ROWS.toLocaleString()} shown)</span></button>` : ''}
      </div>
      ${this.chart ? this.renderChart(data) : ''}
    `;
  }

  private renderChart(data: ChartData) {
    const p = chartPage(data, this.chart as ChartKind);
    return html`<figure class="sheet-chart"><svg viewBox="0 0 ${p.w} ${p.h}" role="img" aria-label="Chart of the table">${unsafeSVG(p.svg)}</svg></figure>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-sheet': ToSheet;
  }
}
