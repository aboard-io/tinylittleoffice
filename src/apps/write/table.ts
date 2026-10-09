/**
 * <to-write-table>: a table block inside a text, as a small grid of <input>s over the sheet's view of it
 * (model.ts tableView): the names over the columns, the values worked out in place, the cell being typed
 * in showing its raw formula, a locked cell left be, and one blank row under the last to type the next
 * line into. Enter in a row puts a new row in after it (inside a sum's reach, so the sum takes it in);
 * Enter in the last row goes to the blank one. Every change is an event the host turns into ops:
 * wt-cell (r, c, raw) and wt-row (a row wanted after r).
 */
import { LitElement, html, nothing } from 'lit';
import { COL_NAMES, formatCell, isLocked, rcToRef } from '../../doc/index.ts';
import { t } from '../../kit/i18n.ts';
import type { SheetView } from '../sheet/model.ts';
import { isLetterName } from '../sheet/model.ts';
import { money } from './model.ts';

export const TABLE_TAG = 'to-write-table';

export class ToWriteTable extends LitElement {
  static properties = { view: { attribute: false }, currency: {}, focused: { state: true } };
  declare view: SheetView | null;
  declare currency: string;
  /** The cell being typed in, if any. */
  declare focused: [number, number] | null;

  constructor() {
    super();
    this.view = null;
    this.currency = '';
    this.focused = null;
  }
  createRenderRoot() {
    return this;
  }
  /** Put the caret in a cell once it is drawn. */
  async focusCell(r: number, c: number) {
    await this.updateComplete;
    const el = this.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`);
    el?.focus({ preventScroll: true });
    el?.select();
  }
  private blank(r: number): boolean {
    const rows = this.view?.table.rows ?? [];
    return r >= rows.length || rows[r].every((v) => v === '');
  }
  private onKey(e: KeyboardEvent, r: number, c: number) {
    const input = e.target as HTMLInputElement;
    const rows = this.view?.table.rows.length ?? 0;
    if (e.key === 'Enter') {
      e.preventDefault();
      // The next row when it is blank (or the blank one under the last); else a new row put in after this one.
      if (r + 1 >= rows || this.blank(r + 1)) return void this.focusCell(r + 1, c);
      this.dispatchEvent(new CustomEvent<{ r: number }>('wt-row', { detail: { r }, bubbles: true }));
      return void this.focusCell(r + 1, c);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      return void this.focusCell(Math.min(r + 1, rows), c);
    }
    if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      return void this.focusCell(r - 1, c);
    }
    if (e.key === 'Escape') input.blur();
  }
  render() {
    const v = this.view;
    if (!v) return nothing;
    const cols = v.cols;
    const rows = v.table.rows.length + 1;
    const f = this.focused;
    return html`<table class="wt" aria-label=${t('Table')}>
      <thead>
        <tr>
          ${cols.map((col, c) => html`<th scope="col" class=${isLetterName(col.name) ? 'letter' : ''}>${isLetterName(col.name) ? COL_NAMES[c] : col.name}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: rows }, (_, r) => {
          return html`<tr>
            ${cols.map((col, c) => {
              const raw = v.table.rows[r]?.[c] ?? '';
              const val = v.values[r]?.[c] ?? null;
              const here = !!f && f[0] === r && f[1] === c;
              const locked = isLocked(v.table.lock, r, c);
              const num = typeof val === 'number' && col.type !== 'check';
              return html`<td>
                <input
                  data-r=${r}
                  data-c=${c}
                  class="${num ? 'num' : ''} ${locked ? 'locked' : ''} ${typeof val === 'string' && val.startsWith('#') ? 'err' : ''}"
                  aria-label=${rcToRef(r, c)}
                  .value=${here ? raw : money(formatCell(val, col.type), this.currency)}
                  title=${locked ? t('Locked: worked out for you') : raw.startsWith('=') ? raw : nothing}
                  ?readonly=${locked}
                  autocomplete="off"
                  @focus=${() => (this.focused = [r, c])}
                  @blur=${() => (this.focused = null)}
                  @input=${(e: Event) => this.dispatchEvent(new CustomEvent<{ r: number; c: number; raw: string }>('wt-cell', { detail: { r, c, raw: (e.target as HTMLInputElement).value }, bubbles: true }))}
                  @keydown=${(e: KeyboardEvent) => this.onKey(e, r, c)}
                />
              </td>`;
            })}
          </tr>`;
        })}
      </tbody>
    </table>`;
  }
}
if (!customElements.get(TABLE_TAG)) customElements.define(TABLE_TAG, ToWriteTable);
