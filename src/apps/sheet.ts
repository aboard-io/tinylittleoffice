/**
 * <to-sheet>: a 20x3 spreadsheet with formulas.
 * Document format: rows separated by "\n", cells by "\t", trailing blanks trimmed.
 *
 * While a formula is being edited, tapping another cell inserts its reference
 * instead of moving there. Column widths are a view setting, not part of the
 * document: "fit" squeezes the columns into the page, "show all" sizes each
 * to its longest value, and header edges can be dragged.
 */
import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { COLS, ROWS, COL_NAMES, evaluateGrid, formatValue, parseGrid, serializeGrid, rcToRef, type Grid, type CellValue } from '../lib/formula.ts';
import { icon, UI } from '../lib/icons.ts';
import type { SlInput } from '../lib/shoelace.ts';

/** Every function the engine knows: name, example arguments, what it does. */
export const FUNCTIONS: [string, string, string][] = [
  ['SUM', 'A1:A5', 'Add up'],
  ['AVG', 'A1:A5', 'Average'],
  ['MIN', 'A1:A5', 'Smallest'],
  ['MAX', 'A1:A5', 'Largest'],
  ['COUNT', 'A1:A5', 'How many numbers'],
  ['ROUND', 'A1, 2', 'Round to places'],
  ['INT', 'A1', 'Whole part'],
  ['ABS', 'A1', 'Drop the sign'],
  ['SQRT', 'A1', 'Square root'],
  ['MOD', 'A1, 3', 'Remainder'],
];

const MIN_COL = 48;
/** A reference fits wherever the formula is waiting for a value. */
const WANTS_REF = /[=+\-*/^(,:]\s*$/;

@customElement('to-sheet')
export class ToSheet extends LitElement {
  @property() value = '';
  @state() private grid: Grid = parseGrid('');
  @state() private sel: [number, number] = [0, 0];
  @state() private focused = false;
  /** Column widths in px, or null to fit the columns to the page. */
  @state() private widths: number[] | null = null;
  private computed: CellValue[][] = evaluateGrid(this.grid);
  private lastEmitted = '';
  /** The reference most recently inserted by tapping, so the next tap can replace it. */
  private picked: { r: number; c: number; start: number; end: number } | null = null;
  /** Where the caret was when the selected cell last lost focus. */
  private caret: { r: number; c: number; pos: number } | null = null;

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.grid = parseGrid(this.value);
      this.lastEmitted = this.value;
      this.computed = evaluateGrid(this.grid);
    }
    if (changed.has('grid')) this.computed = evaluateGrid(this.grid);
  }

  private setCell(r: number, c: number, raw: string) {
    const grid = this.grid.map((row) => row.slice());
    grid[r][c] = raw;
    this.grid = grid;
    this.lastEmitted = serializeGrid(grid);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private focusCell(r: number, c: number) {
    r = Math.max(0, Math.min(ROWS - 1, r));
    c = Math.max(0, Math.min(COLS - 1, c));
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

  /** Tapping a cell while editing a formula elsewhere inserts that cell's reference. */
  private onCellDown(e: MouseEvent, r: number, c: number) {
    const ed = this.editor();
    const [sr, sc] = this.sel;
    if (!ed || (r === sr && c === sc)) return;
    const val = this.grid[sr][sc];
    if (!val.startsWith('=')) return;
    let start = ed.selectionStart ?? val.length;
    const end = ed.selectionEnd ?? start;
    const p = this.picked;
    if (p && p.r === sr && p.c === sc && start === p.end && end === p.end && p.end <= val.length) start = p.start;
    else if (!WANTS_REF.test(val.slice(0, start))) return;
    e.preventDefault();
    const ref = rcToRef(r, c);
    this.setCell(sr, sc, val.slice(0, start) + ref + val.slice(end));
    this.picked = { r: sr, c: sc, start, end: start + ref.length };
    this.caretTo(start + ref.length, ed);
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
    return formatValue(this.computed[r][c]);
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
    const input = e.target as HTMLInputElement;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
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
    return html`
      <div class="sheet-bar">
        <span class="ref" aria-label="Selected cell">${rcToRef(sr, sc)}</span>
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
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.focusCell(sr + 1, sc)}
          @sl-blur=${(e: Event) => (this.caret = { r: sr, c: sc, pos: (e.target as SlInput).input.selectionStart ?? 0 })}
        ></sl-input>
        <sl-button-group label="Column widths">
          <sl-tooltip content="Fit to page" hoist><sl-button class="icon" size="small" aria-label="Fit to page" aria-pressed=${w ? 'false' : 'true'} @click=${() => (this.widths = null)}>${icon(UI.fit, 14)}<span class="sr-only">Fit to page</span></sl-button></sl-tooltip>
          <sl-tooltip content="Show all text" hoist><sl-button class="icon" size="small" aria-label="Show all text" @click=${this.showAll}>${icon(UI.expand, 14)}<span class="sr-only">Show all text</span></sl-button></sl-tooltip>
        </sl-button-group>
      </div>
      <div class="sheet-scroll">
        <table class="sheet ${w ? 'sized' : ''} ${picking ? 'picking' : ''}" style=${w ? `width: calc(var(--sheet-row-w) + ${w.reduce((a, b) => a + b, 0)}px)` : ''}>
          <colgroup>
            <col />
            ${COL_NAMES.map((_, c) => html`<col style=${w ? `width:${w[c]}px` : ''} />`)}
          </colgroup>
          <thead>
            <tr>
              <th class="row"></th>
              ${COL_NAMES.map(
                (n, c) => html`<th scope="col">
                  ${n}<span class="grip" role="separator" aria-label="Resize column ${n}" title="Drag to resize, double-click to fit" @pointerdown=${(e: PointerEvent) => this.onGripDown(e, c)} @dblclick=${() => this.fitColumn(c)}></span>
                </th>`,
              )}
            </tr>
          </thead>
          <tbody>
            ${this.grid.map(
              (row, r) => html`<tr>
                <th class="row" scope="row">${r + 1}</th>
                ${row.map((raw, c) => {
                  const isSel = this.focused && r === sr && c === sc;
                  const v = this.computed[r][c];
                  const shown = isSel ? raw : formatValue(v);
                  const cls = typeof v === 'number' ? 'num' : typeof v === 'string' && v.startsWith('#') ? 'err' : '';
                  return html`<td class=${r === sr && c === sc ? 'sel' : ''} @mousedown=${(e: MouseEvent) => this.onCellDown(e, r, c)}>
                    <input
                      id="c${r}_${c}"
                      class=${cls}
                      aria-label=${rcToRef(r, c)}
                      .value=${shown}
                      title=${raw.startsWith('=') ? raw : ''}
                      autocomplete="off"
                      @focus=${() => {
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
                  </td>`;
                })}
              </tr>`,
            )}
          </tbody>
        </table>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-sheet': ToSheet;
  }
}
