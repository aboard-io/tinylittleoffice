/**
 * <to-sheet>: a 20x3 spreadsheet with formulas.
 * Document format: rows separated by "\n", cells by "\t", trailing blanks trimmed.
 */
import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { COLS, ROWS, COL_NAMES, evaluateGrid, formatValue, parseGrid, serializeGrid, rcToRef, type Grid, type CellValue } from '../lib/formula.ts';
import type { SlInput } from '../lib/shoelace.ts';

@customElement('to-sheet')
export class ToSheet extends LitElement {
  @property() value = '';
  @state() private grid: Grid = parseGrid('');
  @state() private sel: [number, number] = [0, 0];
  @state() private focused = false;
  private computed: CellValue[][] = evaluateGrid(this.grid);
  private lastEmitted = '';

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
    return html`
      <div class="sheet-bar">
        <span class="ref" aria-label="Selected cell">${rcToRef(sr, sc)}</span>
        <sl-input
          size="small"
          label="Formula"
          class="sr-label"
          .value=${this.grid[sr][sc]}
          placeholder="Value or formula, e.g. =SUM(A1:A5)"
          @sl-input=${(e: Event) => this.setCell(sr, sc, (e.target as SlInput).value)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.focusCell(sr + 1, sc)}
        ></sl-input>
      </div>
      <div class="sheet-scroll">
        <table class="sheet">
          <thead>
            <tr>
              <th class="row"></th>
              ${COL_NAMES.map((n) => html`<th scope="col">${n}</th>`)}
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
                  return html`<td class=${r === sr && c === sc ? 'sel' : ''}>
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
                      @blur=${() => (this.focused = false)}
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
      <div class="to-foot">
        Formulas start with <code>=</code> and know + − × ÷ ^ %, ranges like <code>A1:A5</code>, and SUM AVG MIN MAX COUNT ROUND ABS SQRT INT MOD.
        Enter and the arrow keys move between cells.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-sheet': ToSheet;
  }
}
