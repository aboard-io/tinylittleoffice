/**
 * <to-table>: a host's records as a typed table (docs/library.md, A typed table): a person's people, companies,
 * events, tasks and projects, a pipeline seen as rows. Not a document: the page holds the rows and gives them as
 * `rows`, says what each column holds in `columns` (kit/ui/table-model.ts: words, numbers, money, dates and moments,
 * a box to tick, a status in its color, a link or a person, tags, or a cell of the page's own drawing), and hears what
 * the person does in events. Nothing in a row is changed here: an edit is told to the page, which keeps it or refuses it.
 *
 * - **Sorting.** A click on a heading sorts by it, ascending, then descending, then not at all; Shift and a click sorts
 *   by it as well, after the others. Each type by its own order, an empty cell last, ties in the page's order
 *   (`sortchange`, `{ sort }`; the page may set `sort` itself).
 * - **Finding.** `query` keeps the rows with every word of it somewhere in their cells (the library's search: case and
 *   accents aside), `filter` keeps those a function of the page's keeps; `filterable` draws a box that sets `query`.
 *   `hideable` draws the Columns menu, a column hidden or shown told in `columnschange` (`{ hidden }`, the keys).
 * - **Editing.** A cell of an `editable` column is edited where it is: Enter, F2, a double click, or a click on the
 *   cell in hand opens its editor (a number field, a date or a moment, the options of a status, words; a box is ticked
 *   at once), Enter or leaving it keeps the edit and Escape lets it go. The edit is shown at once and told in a
 *   cancelable `rowchange`, `{ id, column, value, before, row, wait }` (RowChange): the page that refuses it calls
 *   `preventDefault()`, or gives `wait` a promise that rejects or comes back false, and the cell goes back to what it
 *   held. A kept edit is shown until the page gives its rows again.
 * - **Choosing.** A row activated (a click on a cell that is not edited, Enter on one) is told in `rowpick`
 *   (`{ id, row }`); a link with no address, or a person, in `cellpick` (`{ id, column, value, row }`). `selectable`
 *   draws a box before each row and one for all the rows shown (Shift and a click: the rows between), told in
 *   `selection` (`{ ids }`); `selected` sets them. `addable` draws Add row, told in `rowadd`.
 * - **The toolbar.** A child given with `slot="toolbar"` is drawn at the start of the bar over the table (a page's
 *   My/All, kit/ui/slots.ts), before the filter, the Columns menu and Add row.
 * - **Keys.** It is a grid (ARIA's): one cell takes Tab, the arrows walk the cells and the headings, Home and End the
 *   row's ends (with Mod the table's), Page Up and Page Down a screenful; Enter edits or activates, Space ticks a
 *   row's box (or the cell's, or sorts by a heading), Escape lets an edit go.
 * - **Size.** The table scrolls in a box of its own, its headings stuck to the top and its first column (and the boxes)
 *   to the start, as the Spreadsheet's grid does (on a phone, sideways too: the page never scrolls, kit/ui/scroll.ts).
 *   Only the rows in sight are drawn, each the one height (`--to-dt-row-h`), so 5,000 rows are as quick as fifty
 *   (test/browser/table.test.ts measures it). The box is as tall as `--to-dt-h` (36rem, or three quarters of the
 *   screen) unless the page sets its height.
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { ArrowDown, ArrowUp, Columns3 } from 'lucide';
import { icon, UI } from '../draw/icons.ts';
import { onLanguage, t } from '../core/i18n.ts';
import type { MenuItem } from './menu.ts';
import './menu.ts';
import { Slots } from './slots.ts';
import {
  cellWords,
  inputOf,
  isEmpty,
  linkOf,
  nextSort,
  optionOf,
  parseInput,
  sameValue,
  searchRows,
  sortRows,
  trackOf,
  typeOf,
  valueOf,
  type SortBy,
  type TableColumn,
  type TableRow,
} from './table-model.ts';

/** A change made in a cell, told to the page to keep or refuse ("rowchange", cancelable). */
export interface RowChange<R extends TableRow = TableRow> {
  id: R['id'];
  /** The column's key. */
  column: string;
  /** What the cell holds now, as the row would hold it (table-model.ts parseInput). */
  value: unknown;
  /** What it held. */
  before: unknown;
  row: R;
  /** The page's answer, when it comes later: a promise that rejects, or comes back false, puts the cell back. */
  wait(answer: Promise<unknown>): void;
}

/** Rows drawn beyond those in sight, above and below, so a quick scroll finds them drawn. */
const OVER = 8;
/** A row's height before one is measured, in CSS pixels (2.75rem at the browser's default). */
const ROW_GUESS = 44;

let n = 0;

export class ToTable<R extends TableRow = TableRow> extends LitElement {
  static properties = {
    rows: { attribute: false },
    columns: { attribute: false },
    sort: { attribute: false },
    query: {},
    filter: { attribute: false },
    hiddenColumns: { attribute: false },
    selected: { attribute: false },
    selectable: { type: Boolean },
    addable: { type: Boolean },
    filterable: { type: Boolean },
    hideable: { type: Boolean },
    label: {},
    addLabel: { attribute: 'add-label' },
    empty: {},
    active: { state: true },
    editing: { state: true },
    top: { state: true },
  };
  declare rows: R[];
  declare columns: TableColumn<R>[];
  declare sort: SortBy[];
  declare query: string;
  declare filter: ((row: R) => boolean) | null;
  /** The keys of the columns hidden; undefined, the columns' own `hidden`. */
  declare hiddenColumns: string[] | undefined;
  declare selected: R['id'][];
  declare selectable: boolean;
  declare addable: boolean;
  declare filterable: boolean;
  declare hideable: boolean;
  /** The table's name, for a screen reader ("People"). */
  declare label: string;
  /** Add row's words ("Add a person"). */
  declare addLabel: string;
  /** What an empty table says ("No people yet"). */
  declare empty: string;
  /** The cell in hand: its row in the rows shown (-1, the headings) and its column in the grid (the boxes' first, where there are boxes). */
  declare active: { r: number; c: number };
  /** The cell being edited, and what its editor starts with. */
  declare editing: { r: number; c: number; start: string } | null;
  /** How far the box is scrolled, in CSS pixels: which rows are drawn. */
  declare top: number;

  readonly uid = `to-table-${++n}`;
  private slots = new Slots(this);
  /** The rows shown: kept by the filter and the query, in the sort's order. */
  private view: R[] = [];
  /** The columns shown. */
  private shown: TableColumn<R>[] = [];
  /** Each row's words, folded, for the quick search: kept while the columns shown and the language stay as they are. */
  private words = new WeakMap<R, string>();
  /** Edits shown while the page has not given its rows again, by row and column. */
  private kept = new Map<string, unknown>();
  /** The row a box was last ticked on, where Shift and a click ticks from. */
  private anchor: R['id'] | null = null;
  private rowH = ROW_GUESS;
  private headH = ROW_GUESS;
  private boxH = 0;
  private sized: ResizeObserver | null = null;
  private frame = 0;
  private unlisten = () => {};

  constructor() {
    super();
    this.rows = [];
    this.columns = [];
    this.sort = [];
    this.query = '';
    this.filter = null;
    this.hiddenColumns = undefined;
    this.selected = [];
    this.selectable = false;
    this.addable = false;
    this.filterable = false;
    this.hideable = false;
    this.label = '';
    this.addLabel = '';
    this.empty = '';
    this.active = { r: 0, c: 0 };
    this.editing = null;
    this.top = 0;
  }
  createRenderRoot() {
    this.slots.take();
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    // Another language: the dates and the kit's words in it, and the search's words read again.
    this.unlisten = onLanguage(() => {
      this.words = new WeakMap();
      this.requestUpdate();
    });
    this.sized = new ResizeObserver(() => this.measure());
    void this.updateComplete.then(() => this.box && this.sized?.observe(this.box));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.sized?.disconnect();
    this.sized = null;
    this.unlisten();
    cancelAnimationFrame(this.frame);
  }

  /** The box that scrolls. */
  get box(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope .to-dt-box');
  }
  /** The rows shown, in their order: what the person sees after the filter, the query and the sort. */
  get shownRows(): readonly R[] {
    return this.view;
  }
  /** Where the boxes are, the first column of the grid is theirs. */
  private get off(): number {
    return this.selectable ? 1 : 0;
  }
  private keyOf = (id: R['id'], col: string) => `${id}\u0000${col}`;
  /** A row's value in a column, an edit kept shown over it. */
  private valueAt(col: TableColumn<R>, row: R): unknown {
    const k = this.keyOf(row.id, col.key);
    return this.kept.has(k) ? this.kept.get(k) : valueOf(col, row);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('rows')) this.kept.clear();
    if (changed.has('columns') || changed.has('hiddenColumns')) {
      const off = new Set(this.hiddenColumns ?? this.columns.filter((c) => c.hidden).map((c) => c.key));
      this.shown = this.columns.filter((c) => !off.has(c.key));
      this.words = new WeakMap();
    }
    if (['rows', 'columns', 'hiddenColumns', 'sort', 'query', 'filter'].some((k) => changed.has(k as keyof ToTable<R>))) {
      const kept = this.filter ? this.rows.filter(this.filter) : this.rows;
      this.view = sortRows(searchRows(kept, this.shown, this.query, this.words), this.columns, this.sort);
      const cols = this.shown.length + this.off;
      this.active = { r: Math.min(this.active.r, this.view.length - 1), c: Math.min(this.active.c, Math.max(0, cols - 1)) };
      if (this.editing && (this.editing.r >= this.view.length || this.editing.c >= cols)) this.editing = null;
    }
  }
  protected updated() {
    this.measure();
  }

  /** The heights the window of rows is reckoned from: a row's, the headings', the box's. */
  private measure() {
    const box = this.box;
    if (!box) return;
    const row = box.querySelector<HTMLElement>('.to-dt-body > [role=row]');
    const head = box.querySelector<HTMLElement>('.to-dt-head');
    const rowH = row?.offsetHeight || this.rowH;
    const headH = head?.offsetHeight || this.headH;
    const boxH = box.clientHeight;
    if (rowH !== this.rowH || headH !== this.headH || boxH !== this.boxH) {
      [this.rowH, this.headH, this.boxH] = [rowH, headH, boxH];
      this.requestUpdate();
    }
  }
  private onScroll = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const box = this.box;
      if (box && Math.abs(box.scrollTop - this.top) >= this.rowH / 2) this.top = box.scrollTop;
    });
  };
  /** The rows drawn: those in sight and OVER more each way, and the row in hand wherever it is, so the focus is never lost. */
  private windowOf(): number[] {
    const sight = this.boxH || 20 * this.rowH;
    const from = Math.max(0, Math.floor((this.top - this.headH) / this.rowH) - OVER);
    const to = Math.min(this.view.length, Math.ceil((this.top + sight) / this.rowH) + OVER);
    const at = Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
    const r = this.active.r;
    // In the rows' order, so the row in hand keeps its place among the others drawn and is never moved (a focused
    // element moved loses the focus).
    if (r >= 0 && r < this.view.length && (r < from || r >= to)) at.splice(r < from ? 0 : at.length, 0, r);
    return at;
  }

  // ---- what the person does ----

  private say<T>(type: string, detail: T, cancelable = false): boolean {
    return this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true, composed: true, cancelable }));
  }
  /** Sorted by a column's heading (with Shift, as well as the sort before). */
  sortBy(key: string, add = false) {
    this.sort = nextSort(this.sort, key, add);
    this.say('sortchange', { sort: this.sort });
  }
  private toggleColumn(key: string) {
    const now = new Set(this.hiddenColumns ?? this.columns.filter((c) => c.hidden).map((c) => c.key));
    if (now.has(key)) now.delete(key);
    else if (this.columns.length - now.size > 1) now.add(key);
    this.hiddenColumns = this.columns.filter((c) => now.has(c.key)).map((c) => c.key);
    this.say('columnschange', { hidden: this.hiddenColumns });
  }
  private setSelected(ids: R['id'][]) {
    this.selected = ids;
    this.say('selection', { ids });
  }
  /** A row's box ticked or not; with `range`, every row shown between the last ticked and this one, as this one now is. */
  private tick(row: R, range = false) {
    const on = new Set(this.selected);
    const turn = !on.has(row.id);
    const ids = this.view.map((r) => r.id);
    const from = range && this.anchor !== null ? ids.indexOf(this.anchor) : -1;
    const to = ids.indexOf(row.id);
    const span = from >= 0 ? ids.slice(Math.min(from, to), Math.max(from, to) + 1) : [row.id];
    for (const id of span) {
      if (turn) on.add(id);
      else on.delete(id);
    }
    this.anchor = row.id;
    this.setSelected(this.rows.map((r) => r.id).filter((id) => on.has(id)));
  }
  private tickAll() {
    const on = new Set(this.selected);
    const all = this.view.length > 0 && this.view.every((r) => on.has(r.id));
    for (const r of this.view) {
      if (all) on.delete(r.id);
      else on.add(r.id);
    }
    this.setSelected(this.rows.map((r) => r.id).filter((id) => on.has(id)));
  }
  private pick(row: R) {
    this.say('rowpick', { id: row.id, row });
  }

  /** The edit told to the page: shown at once, put back if the page refuses it. */
  private commit(col: TableColumn<R>, row: R, value: unknown) {
    const before = this.valueAt(col, row);
    if (sameValue(value, before)) return;
    const k = this.keyOf(row.id, col.key);
    const had = this.kept.has(k);
    const was = this.kept.get(k);
    this.kept.set(k, value);
    const back = () => {
      if (this.kept.get(k) !== value) return;
      if (had) this.kept.set(k, was);
      else this.kept.delete(k);
      this.requestUpdate();
    };
    const change: RowChange<R> = {
      id: row.id,
      column: col.key,
      value,
      before,
      row,
      wait: (answer) => void answer.then((ok) => ok === false && back(), back),
    };
    if (!this.say('rowchange', change, true)) back();
    this.requestUpdate();
  }
  /** The cell's editor opened (a box is ticked at once instead). */
  edit(r = this.active.r, c = this.active.c) {
    const col = this.shown[c - this.off];
    const row = this.view[r];
    if (!col?.editable || !row) return;
    if (typeOf(col) === 'boolean') return this.commit(col, row, !this.valueAt(col, row));
    this.active = { r, c };
    this.editing = { r, c, start: inputOf({ ...col, value: (x: R) => this.valueAt(col, x) }, row) };
    void this.updateComplete.then(() => {
      const field = this.querySelector<HTMLInputElement | HTMLSelectElement>('.to-dt-editor');
      field?.focus({ preventScroll: true });
      if (field instanceof HTMLInputElement && field.type === 'text') field.select();
    });
  }
  /** The edit kept (`keep`) or let go, and the focus back on its cell. */
  private endEdit(keep: boolean, field?: HTMLInputElement | HTMLSelectElement) {
    const at = this.editing;
    if (!at) return;
    this.editing = null;
    if (keep && field) {
      const col = this.shown[at.c - this.off];
      const row = this.view[at.r];
      const value = parseInput(col, field.value);
      if (value !== undefined && col && row) this.commit(col, row, value);
    }
    void this.focusCell();
  }
  private onEditorKey = (e: KeyboardEvent) => {
    const field = e.currentTarget as HTMLInputElement | HTMLSelectElement;
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      if (field instanceof HTMLInputElement && parseInput(this.shown[this.editing!.c - this.off], field.value) === undefined) {
        field.setAttribute('aria-invalid', 'true');
        return;
      }
      this.endEdit(true, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.endEdit(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const c = this.active.c + (e.shiftKey ? -1 : 1);
      this.endEdit(true, field);
      this.moveTo(this.active.r, c);
    }
    e.stopPropagation();
  };
  private onEditorBlur = (e: FocusEvent) => {
    // Left for somewhere else: the edit is kept where it reads, let go where it does not.
    if (!this.editing) return;
    const field = e.currentTarget as HTMLInputElement | HTMLSelectElement;
    this.endEdit(parseInput(this.shown[this.editing.c - this.off], field.value) !== undefined, field);
  };

  /** A cell activated, by Enter or a click: its editor, its box, its link, or the row picked. */
  private activate(r: number, c: number, e?: Event) {
    const row = this.view[r];
    if (!row) return;
    if (c < this.off) return this.tick(row, e instanceof MouseEvent && e.shiftKey);
    const col = this.shown[c - this.off];
    if (col.editable) return this.edit(r, c);
    // By a key, a cell's link is followed (or told); by a click, the link is the link's and the rest of the cell the row's.
    const link = this.cellAt(r, c)?.querySelector<HTMLElement>('a, button');
    if (link && !e) return link.click();
    if (!(e?.target instanceof Element && e.target.closest('a, button'))) this.pick(row);
  }
  private cellAt(r: number, c: number): HTMLElement | null {
    return this.querySelector<HTMLElement>(`#${this.uid}-${r < 0 ? 'h' : r}-${c}`);
  }
  /** The cell in hand brought into the box's sight (past the headings and the columns stuck at the start) and focused. */
  async focusCell() {
    await this.updateComplete;
    const box = this.box;
    const { r, c } = this.active;
    if (box && r >= 0) {
      const y = this.headH + r * this.rowH;
      if (y < box.scrollTop + this.headH) box.scrollTop = y - this.headH;
      else if (y + this.rowH > box.scrollTop + box.clientHeight) box.scrollTop = y + this.rowH - box.clientHeight;
      this.top = box.scrollTop;
      await this.updateComplete;
    }
    const cell = this.cellAt(r, c);
    if (!cell || !box) return;
    // Sideways, past the columns stuck at the start (the boxes, the first column), which a cell scrolls under.
    if (!cell.classList.contains('to-dt-pin')) {
      const pinned = [...(cell.parentElement?.querySelectorAll<HTMLElement>('.to-dt-pin') ?? [])].reduce((w, el) => w + el.offsetWidth, 0);
      const rtl = getComputedStyle(box).direction === 'rtl';
      const left = rtl ? box.scrollWidth - cell.offsetLeft - cell.offsetWidth : cell.offsetLeft;
      const from = Math.abs(box.scrollLeft);
      let to = from;
      if (left < from + pinned) to = left - pinned;
      else if (left + cell.offsetWidth > from + box.clientWidth) to = left + cell.offsetWidth - box.clientWidth;
      if (to !== from) box.scrollLeft = rtl ? -to : to;
    }
    cell.focus({ preventScroll: true });
  }
  /** The cell in hand moved (kept inside the grid: the headings' row is -1). */
  moveTo(r: number, c: number) {
    const cols = this.shown.length + this.off;
    this.active = { r: Math.max(-1, Math.min(this.view.length - 1, r)), c: Math.max(0, Math.min(cols - 1, c)) };
    void this.focusCell();
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || this.editing || !(e.target as Element).closest?.('[role=gridcell], [role=columnheader]')) return;
    const { r, c } = this.active;
    const mod = e.metaKey || e.ctrlKey;
    const page = Math.max(1, Math.floor((this.boxH - this.headH) / this.rowH) - 1);
    const col = this.shown[c - this.off];
    const row = this.view[r];
    switch (e.key) {
      case 'ArrowDown':
        this.moveTo(r + 1, c);
        break;
      case 'ArrowUp':
        this.moveTo(r - 1, c);
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        const rtl = getComputedStyle(this).direction === 'rtl';
        this.moveTo(r, c + ((e.key === 'ArrowRight') !== rtl ? 1 : -1));
        break;
      }
      case 'Home':
        this.moveTo(mod ? 0 : r, 0);
        break;
      case 'End':
        this.moveTo(mod ? this.view.length - 1 : r, Infinity);
        break;
      case 'PageDown':
        this.moveTo(r + page, c);
        break;
      case 'PageUp':
        this.moveTo(Math.max(0, r - page), c);
        break;
      case 'Enter':
        if (r < 0) {
          if (col && col.sortable !== false) this.sortBy(col.key, e.shiftKey);
          else if (c < this.off) this.tickAll();
        } else this.activate(r, c);
        break;
      case 'F2':
        if (r >= 0) this.edit(r, c);
        break;
      case ' ':
        if (r < 0) {
          if (c < this.off) this.tickAll();
          else if (col && col.sortable !== false) this.sortBy(col.key, e.shiftKey);
        } else if (col?.editable && typeOf(col) === 'boolean') this.edit(r, c);
        else if (this.selectable && row) this.tick(row, e.shiftKey);
        else return;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  private onClick = (e: MouseEvent) => {
    const cell = (e.target as Element).closest<HTMLElement>('[role=gridcell]');
    if (!cell || this.editing) return;
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const was = this.active.r === r && this.active.c === c && this.contains(document.activeElement);
    this.active = { r, c };
    const col = this.shown[c - this.off];
    if (c < this.off) this.tick(this.view[r], e.shiftKey);
    else if (col?.editable && typeOf(col) === 'boolean') this.edit(r, c);
    else if (col?.editable) {
      if (was) this.edit(r, c);
    } else this.activate(r, c, e);
    if (!this.editing) void this.focusCell();
  };
  private onDblClick = (e: MouseEvent) => {
    const cell = (e.target as Element).closest<HTMLElement>('[role=gridcell]');
    if (cell && !this.editing) this.edit(Number(cell.dataset.r), Number(cell.dataset.c));
  };

  // ---- drawing ----

  /** A link's or a person's cell: an address opens as a link does; without one, a tap is told to the page. */
  private linkCell(col: TableColumn<R>, row: R, v: unknown): TemplateResult | string {
    const { label, href } = linkOf(col, row, v);
    if (!label) return '';
    const person = typeOf(col) === 'person';
    const words = html`${person ? html`<span class="to-dt-initial" aria-hidden="true">${[...label.trim()][0]?.toUpperCase() ?? ''}</span>` : nothing}<span>${label}</span>`;
    if (href) return html`<a class="to-dt-link" href=${href} tabindex="-1">${words}</a>`;
    return html`<button type="button" class="to-dt-link" tabindex="-1" @click=${() => this.say('cellpick', { id: row.id, column: col.key, value: v, row })}>${words}</button>`;
  }
  /** A cell's face, by its column's type. */
  private face(col: TableColumn<R>, row: R): unknown {
    const v = this.valueAt(col, row);
    if (col.render) return col.render(v, row);
    if (isEmpty(v)) return nothing;
    switch (typeOf(col)) {
      case 'boolean':
        return html`<input type="checkbox" class="to-dt-check" tabindex="-1" aria-label=${col.label} .checked=${live(!!v)} ?disabled=${!col.editable} @click=${(e: Event) => e.preventDefault()} />`;
      case 'enum': {
        const o = optionOf(col, v);
        return html`<span class="to-chip tint" style=${o.color ? `--chip: ${o.color}` : nothing}>${o.label ?? o.value}</span>`;
      }
      case 'tags':
        return (Array.isArray(v) ? v : [v]).map((w) => html`<span class="to-chip quiet">${String(w)}</span>`);
      case 'link':
      case 'person':
        return this.linkCell(col, row, v);
      default:
        return cellWords(col, row, v);
    }
  }
  /** The cell's editor: a field for its type. */
  private editor(col: TableColumn<R>): TemplateResult {
    const start = this.editing!.start;
    const on = { key: this.onEditorKey, blur: this.onEditorBlur };
    const type = typeOf(col);
    if (type === 'enum')
      return html`<select class="to-dt-editor" aria-label=${col.label} @keydown=${on.key} @blur=${on.blur}>
        ${(col.options ?? []).map((o) => html`<option value=${o.value} ?selected=${o.value === start}>${o.label ?? o.value}</option>`)}
      </select>`;
    const kind = type === 'date' ? 'date' : type === 'datetime' ? 'datetime-local' : 'text';
    const numeric = type === 'number' || type === 'money';
    return html`<input
      class="to-dt-editor"
      type=${kind}
      inputmode=${numeric ? 'decimal' : nothing}
      aria-label=${col.label}
      .value=${start}
      @input=${(e: Event) => (e.currentTarget as HTMLElement).removeAttribute('aria-invalid')}
      @keydown=${on.key}
      @blur=${on.blur}
    />`;
  }
  private headCell(col: TableColumn<R>, c: number): TemplateResult {
    const at = this.sort.findIndex((s) => s.key === col.key);
    const dir = at >= 0 ? this.sort[at].dir : null;
    const sortable = col.sortable !== false;
    const ariaSort = at === 0 ? (dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : nothing;
    const num = typeOf(col) === 'number' || typeOf(col) === 'money';
    return html`<div
      role="columnheader"
      id="${this.uid}-h-${c}"
      class="to-dt-cell ${num ? 'to-dt-num' : ''} ${c === this.off ? 'to-dt-pin' : ''}"
      aria-colindex=${c + 1}
      aria-sort=${ariaSort}
      tabindex=${this.active.r === -1 && this.active.c === c ? 0 : -1}
      @focus=${() => (this.active = { r: -1, c })}
    >
      ${
        sortable
          ? html`<button type="button" class="to-dt-sort" tabindex="-1" title=${t('table-sort-hint')} @click=${(e: MouseEvent) => this.sortBy(col.key, e.shiftKey)}>
            <span>${col.label}</span>${dir ? html`${icon(dir === 'asc' ? ArrowUp : ArrowDown, 14)}${this.sort.length > 1 ? html`<small aria-hidden="true">${at + 1}</small>` : nothing}` : nothing}
          </button>`
          : html`<span>${col.label}</span>`
      }
    </div>`;
  }
  private bodyRow(row: R, r: number): TemplateResult {
    const on = this.selected.includes(row.id);
    const first = this.shown[0];
    const name = first ? cellWords(first, row, this.valueAt(first, row)) : String(row.id);
    const at = (c: number) => this.active.r === r && this.active.c === c;
    return html`<div role="row" class="to-dt-row" aria-rowindex=${r + 2} aria-selected=${this.selectable ? String(on) : nothing} style="--i: ${r}">
      ${
        this.selectable
          ? html`<div role="gridcell" id="${this.uid}-${r}-0" class="to-dt-cell to-dt-pin to-dt-box-cell" data-r=${r} data-c="0" aria-colindex="1" tabindex=${at(0) ? 0 : -1}>
            <input type="checkbox" class="to-dt-check" tabindex="-1" aria-label=${t('table-select-name', { name })} .checked=${live(on)} @click=${(e: Event) => e.preventDefault()} />
          </div>`
          : nothing
      }
      ${this.shown.map((col, i) => {
        const c = i + this.off;
        const editing = this.editing?.r === r && this.editing.c === c;
        const type = typeOf(col);
        const num = type === 'number' || type === 'money';
        return html`<div
          role="gridcell"
          id="${this.uid}-${r}-${c}"
          class="to-dt-cell to-dt-${type} ${num ? 'to-dt-num' : ''} ${i === 0 ? 'to-dt-pin' : ''} ${editing ? 'to-dt-editing' : ''}"
          data-r=${r}
          data-c=${c}
          aria-colindex=${c + 1}
          aria-readonly=${col.editable ? nothing : 'true'}
          tabindex=${at(c) ? 0 : -1}
        >
          ${editing ? this.editor(col) : this.face(col, row)}
        </div>`;
      })}
    </div>`;
  }
  private bar(): TemplateResult | typeof nothing {
    const toolbar = this.slots.get('toolbar');
    if (!toolbar.length && !this.filterable && !this.hideable && !this.addable) return nothing;
    const off = new Set(this.hiddenColumns ?? this.columns.filter((c) => c.hidden).map((c) => c.key));
    const items: MenuItem[] = this.columns.map((c) => ({ label: c.label, checked: !off.has(c.key), does: () => this.toggleColumn(c.key) }));
    return html`<div class="to-dt-bar">
      ${toolbar}
      ${
        this.filterable
          ? html`<label class="to-dt-filter">${icon(UI.search, 16)}<input
              type="search"
              placeholder=${t('table-filter-rows')}
              aria-label=${t('table-filter-rows')}
              aria-controls=${this.uid}
              .value=${live(this.query)}
              @input=${(e: Event) => (this.query = (e.currentTarget as HTMLInputElement).value)}
          /></label>`
          : nothing
      }
      ${this.hideable ? html`<to-menu class="to-dt-columns" icon-only .label=${t('common-columns')} .icon=${Columns3} .items=${items}></to-menu>` : nothing}
      ${this.addable ? html`<button type="button" class="to-btn to-dt-add" @click=${() => this.say('rowadd', {})}>${icon(UI.plus)}<span>${this.addLabel || t('table-add-row')}</span></button>` : nothing}
    </div>`;
  }
  render() {
    const cols = this.shown.length + this.off;
    const tracks = [...(this.selectable ? ['2.75rem'] : []), ...this.shown.map((c) => trackOf(c).track)].join(' ');
    const least = (this.selectable ? 2.75 : 0) + this.shown.reduce((w, c) => w + trackOf(c).min, 0);
    const all = this.view.length > 0 && this.view.every((r) => this.selected.includes(r.id));
    const some = !all && this.view.some((r) => this.selected.includes(r.id));
    const drawn = this.windowOf().map((r) => ({ r, row: this.view[r] }));
    return html`<div class="to-dt">
      ${this.bar()}
      <div class="to-dt-box" @scroll=${this.onScroll}>
        <div
          role="grid"
          id=${this.uid}
          class="to-dt-grid"
          aria-label=${this.label || nothing}
          aria-rowcount=${this.view.length + 1}
          aria-colcount=${cols}
          aria-multiselectable=${this.selectable ? 'true' : nothing}
          style="--to-dt-cols: ${tracks}; --to-dt-least: ${least}rem; --to-dt-n: ${this.view.length}"
          @keydown=${this.onKey}
          @click=${this.onClick}
          @dblclick=${this.onDblClick}
          @focusin=${(e: FocusEvent) => {
            const cell = (e.target as Element).closest<HTMLElement>('[role=gridcell]');
            if (cell && !this.editing) this.active = { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
          }}
        >
          <div role="row" class="to-dt-head" aria-rowindex="1">
            ${
              this.selectable
                ? html`<div
                  role="columnheader"
                  id="${this.uid}-h-0"
                  class="to-dt-cell to-dt-pin to-dt-box-cell"
                  aria-colindex="1"
                  tabindex=${this.active.r === -1 && this.active.c === 0 ? 0 : -1}
                  @focus=${() => (this.active = { r: -1, c: 0 })}
                >
                  <input
                    type="checkbox"
                    class="to-dt-check"
                    tabindex="-1"
                    aria-label=${t('table-select-all-rows')}
                    .checked=${live(all)}
                    .indeterminate=${some}
                    ?disabled=${!this.view.length}
                    @click=${(e: Event) => {
                      e.preventDefault();
                      this.tickAll();
                    }}
                  />
                </div>`
                : nothing
            }
            ${this.shown.map((col, i) => this.headCell(col, i + this.off))}
          </div>
          <div role="rowgroup" class="to-dt-body">
            ${repeat(
              drawn,
              (d) => d.row.id,
              (d) => this.bodyRow(d.row, d.r),
            )}
          </div>
        </div>
        ${this.view.length ? nothing : html`<p class="to-dt-empty" role="status">${this.rows.length ? t('table-no-rows-match') : this.empty || t('table-no-rows')}</p>`}
      </div>
    </div>`;
  }
}
customElements.define('to-table', ToTable);
