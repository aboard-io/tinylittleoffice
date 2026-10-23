/**
 * <to-table>: a host's records as a typed table (docs/library.md, A typed table): a person's people, companies,
 * events, tasks and projects, a pipeline seen as rows. Not a document: the page holds the rows and gives them as
 * `rows`, says what each column holds in `columns` (kit/ui/table-model.ts: words, numbers, money, dates and moments,
 * a box to tick, a status in its color, a link or a person, tags, or a cell of the page's own drawing), and hears what
 * the person does in events. Nothing in a row is changed here: an edit is told to the page, which keeps it or refuses it.
 *
 * - **Sorting.** A click anywhere on a heading sorts by it, ascending, then descending, then not at all; Shift and a
 *   click sorts by it as well, after the others. Anywhere: the button fills the cell and the cell hears a click on its
 *   padding (Paul, 2026-10-23: "Let me click on the full column head to sort"). Each type by its own order, an empty cell last, ties in the page's order
 *   (`sortchange`, `{ sort }`; the page may set `sort` itself).
 * - **Finding.** `query` keeps the rows with every word of it somewhere in their cells (the library's search: case and
 *   accents aside), `filter` keeps those a function of the page's keeps; `filterable` draws a box that sets `query`.
 *   `hideable` draws the Columns menu, a column hidden or shown told in `columnschange` (`{ hidden }`, the keys).
 * - **Editing.** A cell of an `editable` column (or of a row its `editable(row)` says yes to) is edited where it is:
 *   Enter, F2, a double click, or a click on the cell in hand opens its editor (a number field, a date or a moment, the
 *   options of a status, words, or for a record a field that searches the host's records, `search(q)`, as it is typed;
 *   a box is ticked at once), Enter or leaving it keeps the edit and Escape lets it go (a record is kept only chosen);
 *   words pasted on the cell in hand are kept as its value with no editor opened (`onPaste`). The edit is shown at once and told in a
 *   cancelable `rowchange`, `{ id, column, value, before, row, wait }` (RowChange): the page that refuses it calls
 *   `preventDefault()`, or gives `wait` a promise that rejects or comes back false, and the cell goes back to what it
 *   held. A kept edit is shown until the page gives its rows again.
 * - **Choosing.** A row activated (a click on a cell that is not edited, Enter on one) is told in `rowpick`
 *   (`{ id, row }`); a link with no address, or a person, in `cellpick` (`{ id, column, value, row }`). `selectable`
 *   draws a box before each row and one for all the rows shown (Shift and a click: the rows between), told in
 *   `selection` (`{ ids }`); `selected` sets them. `addable` draws Add row, told in `rowadd`.
 * - **A row's actions.** `rowActions(row)` gives each row a menu at its end (RowAction: an id, words, an icon, `danger`),
 *   opened by its button, by Enter on its cell, or by Shift+F10 or the menu key anywhere in the row; one chosen is told
 *   in `rowaction` (`{ id, action, row }`).
 * - **The toolbar.** A child given with `slot="toolbar"` is drawn at the start of the bar over the table (a page's
 *   My/All, kit/ui/slots.ts), before the filter, the Columns menu and Add row.
 * - **Keys.** It is a grid (ARIA's): one cell takes Tab, the arrows walk the cells and the headings, Home and End the
 *   row's ends (with Mod the table's), Page Up and Page Down a screenful; Enter edits or activates, Space ticks a
 *   row's box (or the cell's, or sorts by a heading), Escape lets an edit go.
 * - **A box** (a row's, the heading's, a boolean cell's) is let toggle itself when tapped, and the table's state follows
 *   it: a click cancelled (preventDefault) is put back by the browser after its handlers, and Safari put it back after
 *   the table had drawn it ticked (Paul, 2026-10-20: "The company checkbox is unchecked even though I expect that"), so
 *   a tap on a phone ticked the row and showed an empty box. The `live` binding draws what the state says either way.
 * - **Size.** The table scrolls in a box of its own, its headings stuck to the top and its first column (and the boxes)
 *   to the start, as the Spreadsheet's grid does (on a phone, sideways too: the page never scrolls, kit/ui/scroll.ts).
 *   Once the box has scrolled sideways the first column gives way, whether it wraps or not, narrowed to
 *   `--to-dt-pin-w` (about twenty characters, or two fifths of a narrow box, so a phone's or a narrowed window's
 *   columns to its right keep the room: host.css) and its words cut at the last whole word that fits,
 *   the whole in its `title` and read whole (the cut is drawn, not written), and scrolled back to the start it opens
 *   again (Paul, 2026-10-20: "In tables, the left column must truncate as I move to the right"; 2026-10-21: "shrink it
 *   and truncate text to about 20 characters"): the box wears `scrolled`, set from its scroll in a frame. A cell's
 *   words and boxes start at its top, in line with the first line of a row that grows, the box's margin reckoned in
 *   the cell's own line (`font: inherit`), not the control's.
 *   Only the rows in sight are drawn, each the one height (`--to-dt-row-h`), so 5,000 rows are as quick as fifty
 *   (test/browser/table.test.ts measures it); where a column `wrap`s, a row grows to hold its words, and the rows are
 *   placed by their heights, measured where drawn and reckoned from their words where not, and measured again in the
 *   frame the box's width changes (a panel opening beside the page), so no row is left over another or a gap under
 *   it. A column that `fit`s is as wide as its widest words, every row's, measured. The box is as tall as `--to-dt-h`
 *   (36rem, or three quarters of the screen) unless the page sets its height.
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { ArrowDown, ArrowUp, Columns3, Ellipsis } from 'lucide';
import { icon, UI, type IconNode } from '../draw/icons.ts';
import { onLanguage, t } from '../core/i18n.ts';
import { type MenuItem, type ToMenu } from './menu.ts';
import './menu.ts';
import { hueOf, initial } from './initials.ts';
import { RecordPicking } from './record-pick.ts';
import { reveal } from './scroll.ts';
import { Slots } from './slots.ts';
import {
  canEdit,
  cellWords,
  fits,
  inputOf,
  isEmpty,
  linkOf,
  nextSort,
  optionOf,
  parseInput,
  recordOf,
  sameValue,
  searchRows,
  sortRows,
  trackOf,
  typeOf,
  valueOf,
  type LinkValue,
  type RecordOption,
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
  /** A record column's: the record chosen (`value` is its id), or null where the cell was emptied. */
  record?: RecordOption | null;
  /** The page's answer, when it comes later: a promise that rejects, or comes back false, puts the cell back. */
  wait(answer: Promise<unknown>): void;
}

/** One of a row's actions, in its menu: an id the page knows it by, its words, an icon, and whether it destroys (Delete, drawn in the danger color). */
export interface RowAction {
  id: string;
  label: string;
  icon?: IconNode;
  danger?: boolean;
  disabled?: boolean;
}

/** What "rowaction" carries: the row and the action chosen. */
export interface RowActionPick<R extends TableRow = TableRow> {
  id: R['id'];
  action: string;
  row: R;
}

/** The type a table's cells are drawn in, as a canvas names it, the root's rem and a wrapped line's height (CSS pixels). */
interface Fonts {
  cell: string;
  head: string;
  chip: string;
  px: number;
  lineH: number;
}

/** Rows drawn beyond those in sight, above and below, so a quick scroll finds them drawn. */
const OVER = 8;
/** A row's height before one is measured, in CSS pixels (2.75rem at the browser's default). */
const ROW_GUESS = 44;
/** A column that fits is at most this wide unless it says (rem). */
const FIT_MAX = 24;
/** The words of a cell measured, for a column that fits and a row that grows (one canvas for every table). */
let ruler: CanvasRenderingContext2D | null = null;
const widthOf = (words: string, font: string): number => {
  ruler ??= document.createElement('canvas').getContext('2d');
  if (!ruler) return words.length * 8;
  ruler.font = font;
  return ruler.measureText(words).width;
};
/**
 * A column stuck at the start, as wide as it is once the box is off its start: the first column given way to
 * `--to-dt-pin-w` (host.css: eleven rem, or two fifths of the box) where it is wider, mid-way or not; the boxes their
 * own width. The width is the browser's, read from a probe in the cell, since it is reckoned from the box's width.
 */
const pinWidth = (el: HTMLElement): number => {
  if (!el.classList.contains('to-dt-gives')) return el.offsetWidth;
  const probe = document.createElement('span');
  probe.style.cssText = 'position: absolute; visibility: hidden; display: block; box-sizing: border-box; inline-size: var(--to-dt-pin-w); block-size: 0; padding: 0; border: 0';
  el.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? Math.min(el.offsetWidth, px) : el.offsetWidth;
};

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
    rowActions: { attribute: false },
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
  /** Each row's actions, in a menu at its end; null for none. */
  declare rowActions: ((row: R) => RowAction[]) | null;
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
  /** The box's width when rows that grow were last measured for it (`measure`). */
  private boxW = 0;
  private sized: ResizeObserver | null = null;
  private frame = 0;
  /** The widths measured for the columns that fit, in CSS pixels, by key. */
  private fitPx = new Map<string, number>();
  /** Rows that grow: each row's height measured where it was drawn, reckoned from its words where not; and where each begins. */
  private grown = new WeakMap<R, number>();
  private guessed = new WeakMap<R, number>();
  private offsets: number[] | null = null;
  /** The widths the rows' heights were measured at: other widths, measured again. */
  private widthsAt = '';
  /** The row whose menu is open. */
  private menuRow: R | null = null;
  /** A record cell's picker (kit/ui/record-pick.ts), open while a record cell is being edited. */
  private picker = new RecordPicking(this);
  /** The type the cells are drawn in, read once an update. */
  private fontsNow: Fonts | null = null;
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
    this.rowActions = null;
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
      this.fitPx.clear();
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
    this.picker.end();
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
  /** The grid's columns: the boxes, the columns shown, and the rows' actions. */
  private get cols(): number {
    return this.off + this.shown.length + (this.rowActions ? 1 : 0);
  }
  /** The actions' column in the grid, or -1. */
  private get actsC(): number {
    return this.rowActions ? this.off + this.shown.length : -1;
  }
  /** Whether a column of the shown wraps, so rows grow. */
  private get grows(): boolean {
    return this.shown.some((c) => c.wrap);
  }
  private keyOf = (id: R['id'], col: string) => `${id}\u0000${col}`;
  /** A row's value in a column, an edit kept shown over it. */
  private valueAt(col: TableColumn<R>, row: R): unknown {
    const k = this.keyOf(row.id, col.key);
    return this.kept.has(k) ? this.kept.get(k) : valueOf(col, row);
  }

  protected willUpdate(changed: PropertyValues<this>) {
    this.fontsNow = null;
    if (changed.has('rows')) this.kept.clear();
    if (changed.has('columns') || changed.has('hiddenColumns')) {
      const off = new Set(this.hiddenColumns ?? this.columns.filter((c) => c.hidden).map((c) => c.key));
      this.shown = this.columns.filter((c) => !off.has(c.key));
      this.words = new WeakMap();
    }
    if (changed.has('rows') || changed.has('columns') || changed.has('hiddenColumns')) this.fitPx.clear();
    if (['rows', 'columns', 'hiddenColumns', 'sort', 'query', 'filter', 'rowActions', 'selectable'].some((k) => changed.has(k as keyof ToTable<R>))) {
      const kept = this.filter ? this.rows.filter(this.filter) : this.rows;
      this.view = sortRows(searchRows(kept, this.shown, this.query, this.words), this.columns, this.sort);
      const cols = this.cols;
      this.active = { r: Math.min(this.active.r, this.view.length - 1), c: Math.min(this.active.c, Math.max(0, cols - 1)) };
      if (this.editing && (this.editing.r >= this.view.length || this.editing.c >= cols)) this.editing = null;
      this.offsets = null;
    }
    if (this.isConnected && this.shown.some(fits) && !this.fitPx.size) this.fit();
  }
  protected updated() {
    this.measure();
    this.refit();
    if (this.grows) this.measureRows();
    this.picker.place(this.querySelector('.to-dt-pick'));
  }

  // ---- widths and heights ----

  /** The type the cells are drawn in: the table's own, and the headings' (smaller, as host.css has them). */
  private fonts(): Fonts {
    if (this.fontsNow) return this.fontsNow;
    const cs = getComputedStyle(this);
    const px = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const font = (size: number, weight = cs.fontWeight) => `${weight} ${size}px ${cs.fontFamily}`;
    const size = parseFloat(cs.fontSize) || px;
    return (this.fontsNow = { cell: font(size), head: font(0.8125 * px), chip: font(0.75 * px), px, lineH: 1.4 * size });
  }
  /** Each column that fits measured: its widest words of every row and its heading, with the room its cell's face takes beside them. */
  private fit() {
    const f = this.fonts();
    for (const col of this.shown.filter(fits)) {
      const type = typeOf(col);
      const chip = type === 'enum' || type === 'tags';
      let widest = 0;
      for (const row of this.rows) {
        const v = this.valueAt(col, row);
        if (isEmpty(v)) continue;
        const words = type === 'tags' && Array.isArray(v) ? v.map(String) : [cellWords(col, row, v)];
        const w = words.reduce((sum, word) => sum + widthOf(word, chip ? f.chip : f.cell) + (chip ? 1.25 * f.px : 0), 0);
        widest = Math.max(widest, w + (type === 'person' ? 1.875 * f.px : 0));
      }
      const head = widthOf(col.label, f.head) + (col.sortable === false ? 0 : 1.5 * f.px);
      const bounds = typeof col.fit === 'object' ? col.fit : {};
      const least = (bounds.min ?? trackOf({ type: col.type }).min) * f.px;
      const most = (bounds.max ?? FIT_MAX) * f.px;
      this.fitPx.set(col.key, Math.ceil(Math.min(most, Math.max(least, widest + 1.25 * f.px + 2, head + 1.25 * f.px + 2))));
    }
  }
  /** Where a drawn cell of a column that fits holds more than its width (a face of the page's own drawing), the column is widened to it. */
  private refit() {
    if (!this.fitPx.size) return;
    let wider = false;
    for (const col of this.shown.filter(fits)) {
      const c = this.off + this.shown.indexOf(col);
      const at = this.fitPx.get(col.key) ?? 0;
      const bounds = typeof col.fit === 'object' ? col.fit : {};
      const most = (bounds.max ?? FIT_MAX) * this.fonts().px;
      for (const cell of this.querySelectorAll<HTMLElement>(`.to-dt-body [data-c="${c}"]`)) {
        const want = Math.min(most, cell.scrollWidth + 1);
        if (want > at + 1 && want > (this.fitPx.get(col.key) ?? 0)) {
          this.fitPx.set(col.key, Math.ceil(want));
          wider = true;
        }
      }
    }
    if (wider) this.requestUpdate();
  }
  /** A column's grid track: measured where it fits, else its own or its type's. */
  private trackFor(col: TableColumn<R>): { min: number; track: string } {
    const px = this.fitPx.get(col.key);
    if (px === undefined || !fits(col)) return trackOf(col);
    return { min: px / 16, track: `${px}px` };
  }
  /** A row's height: as measured where it was drawn at these widths, else reckoned from its words; every row one height where nothing wraps. */
  private heightOf(row: R): number {
    if (!this.grows) return this.rowH;
    const got = this.grown.get(row);
    if (got !== undefined) return got;
    let h = this.guessed.get(row);
    if (h === undefined) {
      const f = this.fonts();
      const lineH = f.lineH;
      let lines = 1;
      for (const col of this.shown) {
        if (!col.wrap) continue;
        const head = this.querySelector<HTMLElement>(`#${this.uid}-h-${this.off + this.shown.indexOf(col)}`);
        const room = Math.max(40, (head?.offsetWidth || trackOf(col).min * f.px) - 1.25 * f.px - 2);
        lines = Math.max(lines, Math.ceil(widthOf(cellWords(col, row, this.valueAt(col, row)), f.cell) / room));
      }
      h = Math.max(this.rowH, Math.ceil(lines * lineH + 1.25 * f.px + 1));
      this.guessed.set(row, h);
    }
    return h;
  }
  /** Where each row shown begins, below the headings, by the heights: one more than the rows, the last the body's height. */
  private placesOf(): number[] {
    if (this.offsets) return this.offsets;
    const at = [0];
    for (const row of this.view) at.push(at[at.length - 1] + this.heightOf(row));
    return (this.offsets = at);
  }
  /** Where row `r` begins below the headings. */
  private offsetOf(r: number): number {
    return this.grows ? (this.placesOf()[r] ?? 0) : r * this.rowH;
  }
  /** The row at `y` below the headings. */
  private rowAtY(y: number): number {
    if (!this.grows) return Math.floor(y / this.rowH);
    const at = this.placesOf();
    let [lo, hi] = [0, this.view.length];
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (at[mid + 1] <= y) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  /** The drawn rows' heights read, at the columns' widths now: a row taller or shorter than reckoned, every row after it placed again. */
  private measureRows() {
    const widths = [...this.querySelectorAll<HTMLElement>('.to-dt-head > [role=columnheader]')].map((h) => h.offsetWidth).join(' ');
    if (widths !== this.widthsAt) {
      this.widthsAt = widths;
      this.grown = new WeakMap();
      this.guessed = new WeakMap();
      this.offsets = null;
    }
    let moved = false;
    for (const el of this.querySelectorAll<HTMLElement>('.to-dt-body > [role=row]')) {
      const row = this.view[Number(el.dataset.r)];
      if (!row) continue;
      const h = el.offsetHeight;
      if (h && this.grown.get(row) !== h) {
        if (Math.abs((this.grown.get(row) ?? this.heightOf(row)) - h) > 0.5) moved = true;
        this.grown.set(row, h);
      }
    }
    if (moved) {
      this.offsets = null;
      this.requestUpdate();
    }
  }

  /** The heights the window of rows is reckoned from: a row's, the headings', the box's; and rows that grow measured again at a new width. */
  private measure() {
    const box = this.box;
    if (!box) return;
    const row = box.querySelector<HTMLElement>('.to-dt-body > [role=row]');
    const head = box.querySelector<HTMLElement>('.to-dt-head');
    // Rows that grow are each their own height: the one height is their least.
    const rowH = (row && (this.grows ? parseFloat(getComputedStyle(row).minHeight) : row.offsetHeight)) || this.rowH;
    const headH = head?.offsetHeight || this.headH;
    const boxH = box.clientHeight;
    if (rowH !== this.rowH || headH !== this.headH || boxH !== this.boxH) {
      [this.rowH, this.headH, this.boxH] = [rowH, headH, boxH];
      this.offsets = null;
      this.requestUpdate();
    }
    // Rows that grow are as tall as their words at the columns' widths: the box narrowed or widened (a panel opening
    // beside the page's column) has its drawn rows, already wrapped anew, measured and placed again now, in the frame
    // the width changed, not left where the old heights put them, overlapping or with gaps, until the next update
    // (Paul, 2026-10-23: "The text jumps around and there is sometimes a white gap").
    const boxW = box.clientWidth;
    if (this.grows && boxW !== this.boxW) {
      this.boxW = boxW;
      this.measureRows();
    }
  }
  /** The box scrolled: which rows are drawn, and whether it is off its start sideways (`scrolled`, where the first column gives way). Once a frame. */
  private onScroll = {
    passive: true,
    handleEvent: () => {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = 0;
        const box = this.box;
        if (!box) return;
        box.toggleAttribute('scrolled', Math.abs(box.scrollLeft) >= 1);
        if (Math.abs(box.scrollTop - this.top) >= this.rowH / 2) this.top = box.scrollTop;
      });
    },
  };
  /** The rows drawn: those in sight and OVER more each way, and the row in hand wherever it is, so the focus is never lost. */
  private windowOf(): number[] {
    const sight = this.boxH || 20 * this.rowH;
    const from = Math.max(0, this.rowAtY(this.top - this.headH) - OVER);
    const to = Math.min(this.view.length, this.rowAtY(this.top + sight) + 1 + OVER);
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

  /**
   * The edit told to the page: shown at once, put back if the page refuses it. A record's is told as its id, and shown
   * as the record chosen (`record`), or as nothing where the cell was emptied.
   */
  private commit(col: TableColumn<R>, row: R, value: unknown, record?: RecordOption | null) {
    const isRecord = typeOf(col) === 'record';
    const before = isRecord ? (recordOf(col, row, this.valueAt(col, row))?.id ?? null) : this.valueAt(col, row);
    if (sameValue(value, before)) return;
    const k = this.keyOf(row.id, col.key);
    const had = this.kept.has(k);
    const was = this.kept.get(k);
    const shown = isRecord ? (record ?? null) : value;
    this.kept.set(k, shown);
    const back = () => {
      if (this.kept.get(k) !== shown) return;
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
      ...(isRecord ? { record: record ?? null } : {}),
      wait: (answer) => void answer.then((ok) => ok === false && back(), back),
    };
    if (!this.say('rowchange', change, true)) back();
    this.requestUpdate();
  }
  /** The cell's editor opened (a box is ticked at once instead). */
  edit(r = this.active.r, c = this.active.c) {
    const col = this.shown[c - this.off];
    const row = this.view[r];
    if (!col || !row || !canEdit(col, row)) return;
    if (typeOf(col) === 'boolean') return this.commit(col, row, !this.valueAt(col, row));
    this.active = { r, c };
    this.editing = { r, c, start: inputOf({ ...col, value: (x: R) => this.valueAt(col, x) }, row) };
    if (typeOf(col) === 'record') this.picker.begin(col.search);
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
    this.picker.end();
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

  // ---- a record's picker ----

  /** A record chosen in the picker (null: none, the field emptied), kept and told; the focus back on its cell. */
  private choose(option: RecordOption | null) {
    const at = this.editing;
    if (!at) return;
    const col = this.shown[at.c - this.off];
    const row = this.view[at.r];
    this.editing = null;
    this.picker.end();
    if (col && row) this.commit(col, row, option ? option.id : null, option);
    void this.focusCell();
  }
  private onPickInput = (e: Event) => this.picker.type((e.currentTarget as HTMLInputElement).value);
  private onPickKey = (e: KeyboardEvent) => {
    const p = this.picker.state;
    if (!p || e.isComposing) return;
    const field = e.currentTarget as HTMLInputElement;
    const held = this.picker.held;
    switch (e.key) {
      case 'ArrowDown':
        this.picker.move(1);
        break;
      case 'ArrowUp':
        this.picker.move(-1);
        break;
      case 'Enter':
        // The record in hand; the field emptied, none; words that found nothing, nothing kept yet.
        if (held) this.choose(held);
        else if (!field.value.trim()) this.choose(null);
        else return void e.preventDefault();
        break;
      case 'Escape':
        this.endEdit(false);
        break;
      case 'Tab': {
        const c = this.active.c + (e.shiftKey ? -1 : 1);
        if (held && p.q === field.value.trim()) this.choose(held);
        else this.endEdit(false);
        this.moveTo(this.active.r, c);
        break;
      }
      default:
        e.stopPropagation();
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    void this.updateComplete.then(() => reveal(this.querySelector(`#${this.uid}-o${this.picker.state?.at ?? -1}`)));
  };
  /** Left for somewhere else: a record is kept only by being chosen. */
  private onPickBlur = () => {
    if (this.editing && this.picker.state) this.endEdit(false);
  };

  // ---- a row's actions ----

  /** Row `r`'s menu opened beside its button (`from`, or the button in its actions' cell). */
  async openActions(r: number, from?: HTMLElement | null) {
    const row = this.view[r];
    if (!row || !this.rowActions) return;
    this.menuRow = row;
    this.requestUpdate();
    await this.updateComplete;
    const anchor = from ?? this.cellAt(r, this.actsC)?.querySelector<HTMLElement>('button') ?? this.cellAt(r, this.actsC);
    const menu = this.querySelector<ToMenu>(':scope to-menu.to-dt-menu');
    await menu?.updateComplete;
    if (anchor) menu?.openAt(anchor);
  }
  private actionItems(): MenuItem[] {
    const row = this.menuRow;
    if (!row || !this.rowActions) return [];
    return this.rowActions(row).map((a) => ({
      label: a.label,
      icon: a.icon,
      danger: a.danger,
      disabled: a.disabled,
      does: () => this.say<RowActionPick<R>>('rowaction', { id: row.id, action: a.id, row }),
    }));
  }

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
    if (c === this.actsC) return void this.openActions(r);
    const col = this.shown[c - this.off];
    if (!col) return;
    if (canEdit(col, row)) return this.edit(r, c);
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
      const y = this.headH + this.offsetOf(r);
      const h = this.view[r] ? this.heightOf(this.view[r]) : this.rowH;
      if (y < box.scrollTop + this.headH) box.scrollTop = y - this.headH;
      else if (y + h > box.scrollTop + box.clientHeight) box.scrollTop = y + h - box.clientHeight;
      this.top = box.scrollTop;
      await this.updateComplete;
    }
    const cell = this.cellAt(r, c);
    if (!cell || !box) return;
    // Sideways, past the columns stuck at the start (the boxes, the first column), which a cell scrolls under: the
    // first column as narrow as it is once the box is off its start, which a cell past it is (none is under it there).
    if (!cell.classList.contains('to-dt-pin') && !cell.classList.contains('to-dt-acts')) {
      const pinned = [...(cell.parentElement?.querySelectorAll<HTMLElement>('.to-dt-pin') ?? [])].reduce((w, el) => w + (getComputedStyle(el).position === 'sticky' ? pinWidth(el) : 0), 0);
      const rtl = getComputedStyle(box).direction === 'rtl';
      const left = rtl ? box.scrollWidth - cell.offsetLeft - cell.offsetWidth : cell.offsetLeft;
      const from = Math.abs(box.scrollLeft);
      let to = from;
      if (left < from + pinned) to = Math.max(0, left - pinned);
      else if (left + cell.offsetWidth > from + box.clientWidth) to = left + cell.offsetWidth - box.clientWidth;
      if (to !== from) box.scrollLeft = rtl ? -to : to;
    }
    cell.focus({ preventScroll: true });
  }
  /** The cell in hand moved (kept inside the grid: the headings' row is -1). */
  moveTo(r: number, c: number) {
    const cols = this.cols;
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
      case 'ContextMenu':
      case 'F10':
        if (r < 0 || !this.rowActions || (e.key === 'F10' && !e.shiftKey)) return;
        void this.openActions(r);
        break;
      case 'F2':
        if (r >= 0) this.edit(r, c);
        break;
      case ' ':
        if (r < 0) {
          if (c < this.off) this.tickAll();
          else if (col && col.sortable !== false) this.sortBy(col.key, e.shiftKey);
        } else if (col && row && canEdit(col, row) && typeOf(col) === 'boolean') this.edit(r, c);
        else if (c === this.actsC) void this.openActions(r);
        else if (this.selectable && row) this.tick(row, e.shiftKey);
        else return;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  /**
   * Words pasted on the cell in hand while no editor is open: kept as the cell's value, as typing them in its editor
   * and Enter would, so a value is pasted without opening the cell first (Paul, 2026-10-23: "I need to be able to
   * paste into a value cell without clicking on it first"). A line alone, since the editor is a line; a choice by its
   * option's value or label; words a typed cell cannot read (letters in an amount's) are left where they are, and a
   * box's or a record's cell takes none.
   */
  private onPaste = (e: ClipboardEvent) => {
    if (e.defaultPrevented || this.editing || !(e.target as Element).closest?.('[role=gridcell]')) return;
    const { r, c } = this.active;
    const col = this.shown[c - this.off];
    const row = this.view[r];
    if (r < 0 || !col || !row || !canEdit(col, row)) return;
    const type = typeOf(col);
    if (type === 'boolean' || type === 'record') return;
    const line = (e.clipboardData?.getData('text/plain') ?? '').split(/\r?\n/)[0]?.trim() ?? '';
    const option = type === 'enum' ? (col.options ?? []).find((o) => o.value === line || (o.label ?? o.value).toLowerCase() === line.toLowerCase()) : null;
    const value = type === 'enum' ? option?.value : parseInput(col, line);
    if (value === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    this.commit(col, row, value);
  };
  private onClick = (e: MouseEvent) => {
    const cell = (e.target as Element).closest<HTMLElement>('[role=gridcell]');
    if (!cell || this.editing) return;
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const was = this.active.r === r && this.active.c === c && this.contains(document.activeElement);
    this.active = { r, c };
    const col = this.shown[c - this.off];
    const row = this.view[r];
    const editable = !!col && !!row && canEdit(col, row);
    if (c < this.off) this.tick(row, e.shiftKey);
    else if (c === this.actsC) {
      if (!(e.target as Element).closest('button')) void this.openActions(r);
      return;
    } else if (editable && typeOf(col) === 'boolean') this.edit(r, c);
    else if (editable) {
      // A record's link is followed (or told) as any link is; the rest of its cell edits it.
      if (was && !(e.target as Element).closest('a, button')) this.edit(r, c);
    } else this.activate(r, c, e);
    if (!this.editing) void this.focusCell();
  };
  private onDblClick = (e: MouseEvent) => {
    const cell = (e.target as Element).closest<HTMLElement>('[role=gridcell]');
    if (cell && !this.editing) this.edit(Number(cell.dataset.r), Number(cell.dataset.c));
  };

  // ---- drawing ----

  /** A link's or a person's cell: an address opens as a link does; without one, a tap is told to the page. */
  private linkCell(col: TableColumn<R>, row: R, v: unknown, link: LinkValue = linkOf(col, row, v)): TemplateResult | string {
    const { label, href } = link;
    if (!label) return '';
    const person = typeOf(col) === 'person';
    const words = html`${person ? html`<span class="to-dt-initial" aria-hidden="true" style=${`--to-av-hue: ${hueOf(label)}`}>${initial(label)}</span>` : nothing}<span>${label}</span>`;
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
        return html`<input type="checkbox" class="to-dt-check" tabindex="-1" aria-label=${col.label} .checked=${live(!!v)} ?disabled=${!canEdit(col, row)} />`;
      case 'enum': {
        const o = optionOf(col, v);
        return html`<span class="to-chip tint" style=${o.color ? `--chip: ${o.color}` : nothing}>${o.label ?? o.value}</span>`;
      }
      case 'tags':
        return (Array.isArray(v) ? v : [v]).map((w) => html`<span class="to-chip quiet">${String(w)}</span>`);
      case 'link':
      case 'person':
        return this.linkCell(col, row, v);
      case 'record': {
        const rec = recordOf(col, row, v);
        return rec ? this.linkCell(col, row, rec, rec) : nothing;
      }
      default:
        return cellWords(col, row, v);
    }
  }
  /** A record's editor: a field that searches the host's records as it is typed, the records found in a list under it (kit/ui/record-pick.ts). */
  private recordEditor(col: TableColumn<R>): TemplateResult {
    return html`<input
        class="to-dt-editor to-dt-pick"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-label=${col.label}
        aria-expanded="true"
        aria-controls="${this.uid}-pick"
        aria-autocomplete="list"
        aria-activedescendant=${this.picker.active(this.uid)}
        placeholder=${t('search-label')}
        .value=${this.editing!.start}
        @input=${this.onPickInput}
        @keydown=${this.onPickKey}
        @blur=${this.onPickBlur}
      />
      ${this.picker.list(this.uid, col.label, (o) => this.choose(o))}`;
  }
  /** The cell's editor: a field for its type. */
  private editor(col: TableColumn<R>): TemplateResult {
    const start = this.editing!.start;
    const on = { key: this.onEditorKey, blur: this.onEditorBlur };
    const type = typeOf(col);
    if (type === 'record') return this.recordEditor(col);
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
      class="to-dt-cell ${num ? 'to-dt-num' : ''} ${c === this.off ? 'to-dt-pin to-dt-gives' : ''}"
      aria-colindex=${c + 1}
      aria-sort=${ariaSort}
      tabindex=${this.active.r === -1 && this.active.c === c ? 0 : -1}
      @focus=${() => (this.active = { r: -1, c })}
      @click=${sortable ? (e: MouseEvent) => e.target === e.currentTarget && this.sortBy(col.key, e.shiftKey) : nothing}
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
    const acts = this.actsC;
    return html`<div role="row" class="to-dt-row" data-r=${r} aria-rowindex=${r + 2} aria-selected=${this.selectable ? String(on) : nothing} style=${this.grows ? `top: ${this.offsetOf(r)}px` : `--i: ${r}`}>
      ${
        this.selectable
          ? html`<div role="gridcell" id="${this.uid}-${r}-0" class="to-dt-cell to-dt-pin to-dt-box-cell" data-r=${r} data-c="0" aria-colindex="1" tabindex=${at(0) ? 0 : -1}>
            <input type="checkbox" class="to-dt-check" tabindex="-1" aria-label=${t('table-select-name', { name })} .checked=${live(on)} />
          </div>`
          : nothing
      }
      ${this.shown.map((col, i) => {
        const c = i + this.off;
        const editing = this.editing?.r === r && this.editing.c === c;
        const type = typeOf(col);
        const num = type === 'number' || type === 'money';
        // The first column's words in a span of their own, which is cut at a word once the column gives way (host.css).
        const face = editing ? this.editor(col) : this.face(col, row);
        return html`<div
          role="gridcell"
          id="${this.uid}-${r}-${c}"
          class="to-dt-cell to-dt-t-${type} ${num ? 'to-dt-num' : ''} ${i === 0 ? 'to-dt-pin to-dt-gives' : ''} ${editing ? 'to-dt-editing' : ''} ${col.wrap ? 'to-dt-wrap' : ''}"
          title=${i === 0 && name ? name : nothing}
          data-r=${r}
          data-c=${c}
          aria-colindex=${c + 1}
          aria-readonly=${canEdit(col, row) ? nothing : 'true'}
          tabindex=${at(c) ? 0 : -1}
        >
          ${i === 0 && typeof face === 'string' && face ? html`<span class="to-dt-words">${face}</span>` : face}
        </div>`;
      })}
      ${
        acts >= 0
          ? html`<div role="gridcell" id="${this.uid}-${r}-${acts}" class="to-dt-cell to-dt-acts" data-r=${r} data-c=${acts} aria-colindex=${acts + 1} tabindex=${at(acts) ? 0 : -1}>
              <button
                type="button"
                class="to-btn to-tool to-dt-acts-btn"
                tabindex="-1"
                aria-haspopup="menu"
                aria-label=${t('table-actions-for-name', { name })}
                title=${t('table-row-actions')}
                @click=${(e: Event) => void this.openActions(r, e.currentTarget as HTMLElement)}
              >
                ${icon(Ellipsis, 18)}
              </button>
            </div>`
          : nothing
      }
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
    const cols = this.cols;
    const acts = this.rowActions ? 2.75 : 0;
    const tracks = [...(this.selectable ? ['2.75rem'] : []), ...this.shown.map((c) => this.trackFor(c).track), ...(acts ? ['2.75rem'] : [])].join(' ');
    const least = (this.selectable ? 2.75 : 0) + this.shown.reduce((w, c) => w + this.trackFor(c).min, 0) + acts;
    const all = this.view.length > 0 && this.view.every((r) => this.selected.includes(r.id));
    const some = !all && this.view.some((r) => this.selected.includes(r.id));
    const drawn = this.windowOf().map((r) => ({ r, row: this.view[r] }));
    return html`<div class="to-dt">
      ${this.bar()}
      <div class="to-dt-box" @scroll=${this.onScroll}>
        <div
          role="grid"
          id=${this.uid}
          class="to-dt-grid ${this.grows ? 'to-dt-grow' : ''}"
          aria-label=${this.label || nothing}
          aria-rowcount=${this.view.length + 1}
          aria-colcount=${cols}
          aria-multiselectable=${this.selectable ? 'true' : nothing}
          style="--to-dt-cols: ${tracks}; --to-dt-least: ${least}rem; --to-dt-n: ${this.view.length}"
          @keydown=${this.onKey}
          @paste=${this.onPaste}
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
                    @click=${() => this.tickAll()}
                  />
                </div>`
                : nothing
            }
            ${this.shown.map((col, i) => this.headCell(col, i + this.off))}
            ${
              acts
                ? html`<div role="columnheader" id="${this.uid}-h-${this.actsC}" class="to-dt-cell to-dt-acts" aria-colindex=${this.actsC + 1} tabindex=${this.active.r === -1 && this.active.c === this.actsC ? 0 : -1} @focus=${() => (this.active = { r: -1, c: this.actsC })}>
                    <span class="sr-only">${t('table-row-actions')}</span>
                  </div>`
                : nothing
            }
          </div>
          <div role="rowgroup" class="to-dt-body" style=${this.grows ? `height: ${this.offsetOf(this.view.length)}px` : nothing}>
            ${repeat(
              drawn,
              (d) => d.row.id,
              (d) => this.bodyRow(d.row, d.r),
            )}
          </div>
        </div>
        ${this.view.length ? nothing : html`<p class="to-dt-empty" role="status">${this.rows.length ? t('table-no-rows-match') : this.empty || t('table-no-rows')}</p>`}
      </div>
      ${this.rowActions ? html`<to-menu class="to-dt-menu" buttonless .label=${t('table-row-actions')} .items=${this.actionItems()}></to-menu>` : nothing}
    </div>`;
  }
}
customElements.define('to-table', ToTable);
