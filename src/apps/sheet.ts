/**
 * <to-sheet>: a 20x3 spreadsheet with formulas.
 * Document format: rows separated by "\n", cells by "\t", trailing blanks trimmed.
 */
import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { retro } from '../lib/styles.ts';
import {
  COLS, ROWS, COL_NAMES, evaluateGrid, formatValue, parseGrid, serializeGrid, rcToRef, type Grid, type CellValue,
} from '../lib/formula.ts';

@customElement('to-sheet')
export class ToSheet extends LitElement {
  static styles = [
    retro,
    css`
      .bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-bottom: 1px solid var(--ink);
        background: var(--paper-dim);
      }
      .bar .ref {
        font-family: var(--mono);
        font-weight: bold;
        min-width: 32px;
        text-align: center;
        border: 1px solid var(--ink);
        background: var(--paper);
        padding: 2px 4px;
      }
      .bar input {
        flex: 1;
        font-family: var(--mono);
      }
      table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
      }
      th,
      td {
        border: 1px solid var(--ink);
        padding: 0;
        height: 24px;
      }
      th {
        background: var(--paper-dim);
        font-weight: normal;
        font-size: 11px;
        text-align: center;
        user-select: none;
      }
      th.row {
        width: 36px;
      }
      td input {
        width: 100%;
        height: 24px;
        border: 0;
        padding: 0 6px;
        background: transparent;
        font-family: var(--mono);
        font-size: 13px;
      }
      td input.num {
        text-align: right;
      }
      td input.err {
        color: #c00;
      }
      td input:focus {
        outline: 2px solid var(--ink);
        outline-offset: -2px;
        background: var(--paper);
      }
      td.sel {
        background: #f3f3f3;
      }
      .foot {
        padding: 4px 8px;
        border-top: 1px solid var(--ink);
      }
    `,
  ];

  @property() value = '';
  @state() private grid: Grid = parseGrid('');
  @state() private sel: [number, number] = [0, 0];
  @state() private focused = false;
  private computed: CellValue[][] = evaluateGrid(this.grid);
  private lastEmitted = '';

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
      const el = this.renderRoot.querySelector<HTMLInputElement>(`#c${r}_${c}`);
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
      <div class="bar">
        <span class="ref">${rcToRef(sr, sc)}</span>
        <input
          aria-label="Formula"
          .value=${this.grid[sr][sc]}
          @input=${(e: Event) => this.setCell(sr, sc, (e.target as HTMLInputElement).value)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.focusCell(sr + 1, sc)}
          placeholder="Type a value, or a formula like =SUM(A1:A5)"
        />
      </div>
      <table>
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
      <div class="foot hint">
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
