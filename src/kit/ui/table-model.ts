/**
 * What a host's table (<to-table>, kit/ui/table.ts) knows of its rows without a DOM: its columns and their types, a
 * cell's value and its words, the order of a sort, the rows a quick search keeps, and what an edit typed in a cell
 * means. Pure, so the order and the words are tested under node (test/table.test.ts) and the element only draws them.
 *
 * A column says what its cells hold (ColumnType), and everything follows from it: how a cell is shown, how it sorts,
 * how it is edited. The Spreadsheet's words for a cell are the table's: a number with its commas and money in its
 * currency (the kernel's formatCell and formatMoney), an amount typed as "$1,200" or "1200 GBP" read as the
 * Spreadsheet reads it (parseLiteral), and words ordered as its sort orders them (compareCells). A date is written
 * in the page's language by the kit's dates (kit/core/dates.ts), and a quick search folds case and accents as the
 * library's search does (kit/share/search.ts).
 *
 * A sort is a list of columns, the first the primary: each ascending or descending, every type by its own order
 * (dates as dates, money as numbers, a status by the order of its options), an empty cell last whichever way, and
 * rows that tie in the order they were given.
 */
import { compareCells, formatCell, formatMoney, parseLiteral } from '../../doc/index.ts';
import { dateWords, type DateWords } from '../core/dates.ts';
import { language } from '../core/i18n.ts';
import { fold, termsOf } from '../share/search.ts';

/**
 * What a column's cells hold. text: words. number and money: a number (money in the column's `currency`). date: a
 * day ("2027-03-01", a Date or a time in ms); datetime: a moment. boolean: true or false, drawn as a box to tick.
 * enum: one of the column's `options`, drawn in its color (a status, a stage). link and person: words that open
 * something, a `{ label, href }` or words with the column's `href`; with no address, a tap is told ("cellpick").
 * tags: a list of words. custom: whatever the column's `render` draws.
 */
export type ColumnType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'boolean' | 'enum' | 'link' | 'person' | 'tags' | 'custom';

/** One of an enum column's values: what the row holds, the words shown (the value, without them) and its color (any CSS color). */
export interface EnumOption {
  value: string;
  label?: string;
  color?: string;
}

/** A link or a person's cell, as a row may hold it: the words, and where they open. */
export interface LinkValue {
  label: string;
  href?: string;
}

/** A row of a table: its id, which every event names it by, and its fields, which the columns read. */
export interface TableRow {
  id: string | number;
  [key: string]: unknown;
}

/** A column of a table. Only `key` and `label` are needed: a text column of the row's field `key`. */
export interface TableColumn<R extends TableRow = TableRow> {
  /** The row's field it shows, and its name in every event. */
  key: string;
  /** Its heading, in the page's words. */
  label: string;
  type?: ColumnType;
  /** The value read from a row, where it is not the row's field `key`. */
  value?: (row: R) => unknown;
  /** Money: the currency, a code ("USD", written as the browser writes it) or a symbol ("$", the default). */
  currency?: string;
  /** Enum: its values in their order, which is the order a sort puts them in. */
  options?: EnumOption[];
  /** Link and person: where a row's cell opens, when the value does not say. */
  href?: (row: R) => string | undefined;
  /** Its cells can be changed in place, each change told to the page ("rowchange") to keep or refuse. */
  editable?: boolean;
  /** Hidden until the person shows it from the Columns menu (or the page sets the table's `hiddenColumns`). */
  hidden?: boolean;
  /** Sorted by a click on its heading; true unless said. */
  sortable?: boolean;
  /** Its width, as a CSS grid track ("12rem", "minmax(8rem, 1fr)"); else its type's. */
  width?: string;
  /** Custom: the cell drawn (a Lit template, a node or words). Any type may have one. */
  render?: (value: unknown, row: R) => unknown;
  /** Custom: the order of two values, low to high, where its words are not it. */
  compare?: (a: unknown, b: unknown) => number;
  /** Custom: the cell's words, for the quick search, a sort and a screen reader; else its value as words. */
  text?: (value: unknown, row: R) => string;
}

/** A sort: a column's key and which way. A table's sort is a list of these, the first the primary. */
export interface SortBy {
  key: string;
  dir: 'asc' | 'desc';
}

/** A column's type, text unless said. */
export const typeOf = (col: { type?: ColumnType }): ColumnType => col.type ?? 'text';

/** A row's value in a column: its `value(row)`, else the row's field. */
export const valueOf = <R extends TableRow>(col: TableColumn<R>, row: R): unknown => (col.value ? col.value(row) : row[col.key]);

/** Nothing in the cell: null, undefined, words of spaces, an empty list, a number that is not one. */
export const isEmpty = (v: unknown): boolean => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length) || (typeof v === 'number' && Number.isNaN(v));

/** A day or a moment as a time in ms, and whether it is a day alone ("2027-03-01", counted at midnight UTC, and written so); null where it is none. */
export function timeOf(v: unknown): { ms: number; day: boolean } | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : { ms: v.getTime(), day: false };
  if (typeof v === 'number') return Number.isFinite(v) ? { ms: v, day: false } : null;
  if (typeof v !== 'string' || !v.trim()) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (day) return { ms: Date.UTC(+day[1], +day[2] - 1, +day[3]), day: true };
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? null : { ms, day: false };
}

/** A number in a cell: a number as it is, words read as the Spreadsheet reads them in a column of the type ("$1,200"). */
function numberOf(v: unknown, type: 'number' | 'money'): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = parseLiteral(v, type);
  return typeof n === 'number' ? n : null;
}

/** A link's or a person's words and address. */
export function linkOf<R extends TableRow>(col: TableColumn<R>, row: R, v = valueOf(col, row)): LinkValue {
  const own = v && typeof v === 'object' && 'label' in v ? (v as LinkValue) : { label: v === null || v === undefined ? '' : String(v) };
  return { label: own.label, href: own.href ?? col.href?.(row) };
}

/** An enum column's option for a value (or one made of the value, for a value the column does not list). */
export const optionOf = (col: { options?: EnumOption[] }, v: unknown): EnumOption => col.options?.find((o) => o.value === v) ?? { value: String(v ?? '') };

/** Formatters by language and options: a date is written thousands of times in a long table, and Intl builds each slowly. */
const formatters = new Map<string, DateWords>();
function dateFormat(opts: Intl.DateTimeFormatOptions): DateWords {
  const key = `${language()}|${JSON.stringify(opts)}`;
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = dateWords(opts)));
  return f;
}

/** A day or a moment in the page's language: a day as a day ("Mar 1, 2027"), a moment with its time. */
export function dateText(v: unknown, withTime: boolean): string {
  const at = timeOf(v);
  if (!at) return v === null || v === undefined ? '' : String(v);
  const opts: Intl.DateTimeFormatOptions = withTime && !at.day ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium', ...(at.day ? { timeZone: 'UTC' } : {}) };
  return dateFormat(opts).format(at.ms);
}

/**
 * A cell's words, as it is shown and as the quick search and a screen reader read it: a number with its commas,
 * money in its currency, a date in the page's language, an option's label, a link's words, tags with commas between,
 * a box ticked as the column's name (so a search for it finds the rows that have it) and unticked as nothing.
 */
export function cellWords<R extends TableRow>(col: TableColumn<R>, row: R, v = valueOf(col, row)): string {
  if (col.text) return col.text(v, row);
  if (isEmpty(v)) return '';
  switch (typeOf(col)) {
    case 'number': {
      const n = numberOf(v, 'number');
      return n === null ? String(v) : formatCell(n, 'number');
    }
    case 'money': {
      const n = numberOf(v, 'money');
      return n === null ? String(v) : formatMoney(n, col.currency || '$');
    }
    case 'date':
      return dateText(v, false);
    case 'datetime':
      return dateText(v, true);
    case 'boolean':
      return v ? col.label : '';
    case 'enum': {
      const o = optionOf(col, v);
      return o.label ?? o.value;
    }
    case 'link':
    case 'person':
      return linkOf(col, row, v).label;
    case 'tags':
      return Array.isArray(v) ? v.map(String).join(', ') : String(v);
    default:
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}

/** What a cell sorts by: a number (amounts, times, a box, an option's place), words, or null for an empty cell, which goes last. */
export function sortKey<R extends TableRow>(col: TableColumn<R>, row: R): number | string | null {
  const v = valueOf(col, row);
  if (isEmpty(v)) return null;
  switch (typeOf(col)) {
    case 'number':
    case 'money':
      return numberOf(v, typeOf(col) as 'number' | 'money') ?? cellWords(col, row, v);
    case 'date':
    case 'datetime':
      return timeOf(v)?.ms ?? cellWords(col, row, v);
    case 'boolean':
      return v ? 1 : 0;
    case 'enum': {
      const at = col.options?.findIndex((o) => o.value === v) ?? -1;
      return at < 0 ? (col.options?.length ?? 0) : at;
    }
    default:
      return cellWords(col, row, v);
  }
}

/** Two keys, low to high: numbers by value and before words, words as compareCells orders them. */
function compareKeys(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  return compareCells(a, b);
}

/**
 * The rows in the sort's order: by its first column, ties by its second, and so on; an empty cell last whichever way;
 * rows equal in every column in the order given (a stable sort). Columns the sort names that the table lacks are
 * passed over. The rows given are not changed.
 */
export function sortRows<R extends TableRow>(rows: readonly R[], cols: readonly TableColumn<R>[], sort: readonly SortBy[]): R[] {
  const by = sort.flatMap((s) => {
    const col = cols.find((c) => c.key === s.key);
    return col ? [{ col, sign: s.dir === 'desc' ? -1 : 1 }] : [];
  });
  if (!by.length) return rows.slice();
  // Each key worked out once a row, not once a comparison.
  const keyed = rows.map((row, i) => ({ row, i, keys: by.map(({ col }) => (col.compare ? valueOf(col, row) : sortKey(col, row))) }));
  keyed.sort((x, y) => {
    for (let k = 0; k < by.length; k++) {
      const { col, sign } = by[k];
      const a = x.keys[k],
        b = y.keys[k];
      const ea = col.compare ? isEmpty(a) : a === null,
        eb = col.compare ? isEmpty(b) : b === null;
      if (ea || eb) {
        if (ea !== eb) return ea ? 1 : -1;
        continue;
      }
      const d = col.compare ? col.compare(a, b) : compareKeys(a as number | string, b as number | string);
      if (d) return sign * d;
    }
    return x.i - y.i;
  });
  return keyed.map((k) => k.row);
}

/**
 * The sort after a click on a column's heading. A click: the column alone, ascending, then descending, then no sort.
 * With Shift (`add`): the column added after the others, ascending, then descending, then taken out, the others kept.
 */
export function nextSort(sort: readonly SortBy[], key: string, add = false): SortBy[] {
  const at = sort.findIndex((s) => s.key === key);
  const had = at >= 0 ? sort[at] : null;
  if (!add) {
    if (!had || sort.length > 1) return [{ key, dir: had && sort.length === 1 && had.dir === 'asc' ? 'desc' : 'asc' }];
    return had.dir === 'asc' ? [{ key, dir: 'desc' }] : [];
  }
  if (!had) return [...sort, { key, dir: 'asc' }];
  return had.dir === 'asc' ? sort.map((s, i) => (i === at ? { key, dir: 'desc' as const } : s)) : sort.filter((_, i) => i !== at);
}

/**
 * The rows a quick search keeps: those with every word of `query` (in any order, "words in quotes" together, case and
 * accents aside: the library's search) somewhere in the words of the columns given. An empty query keeps every row.
 * `kept` holds each row's words, folded, between searches of the same columns (a person types a word a letter at a time).
 */
export function searchRows<R extends TableRow>(rows: readonly R[], cols: readonly TableColumn<R>[], query: string, kept?: WeakMap<R, string>): R[] {
  const terms = termsOf(query);
  if (!terms.length) return rows.slice();
  return rows.filter((row) => {
    let words = kept?.get(row);
    if (words === undefined) {
      words = fold(cols.map((c) => cellWords(c, row)).join('\n'));
      kept?.set(row, words);
    }
    return terms.every((t) => words.includes(t));
  });
}

/** A cell's value as its editor starts with it: an amount as plain digits, a day as the date field takes it, tags with commas between. */
export function inputOf<R extends TableRow>(col: TableColumn<R>, row: R): string {
  const v = valueOf(col, row);
  if (isEmpty(v)) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  switch (typeOf(col)) {
    case 'number':
    case 'money': {
      const n = numberOf(v, typeOf(col) as 'number' | 'money');
      return n === null ? String(v) : String(n);
    }
    case 'date': {
      const at = timeOf(v);
      if (!at) return String(v);
      const d = new Date(at.ms);
      return at.day ? d.toISOString().slice(0, 10) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    case 'datetime': {
      const at = timeOf(v);
      if (!at) return String(v);
      const d = new Date(at.ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    case 'enum':
      return String(v);
    case 'tags':
      return Array.isArray(v) ? v.join(', ') : String(v);
    default:
      return cellWords(col, row, v);
  }
}

/**
 * What an edit typed in a cell is, as the row would hold it, or undefined where it is not one of the column's
 * (words in a number column): an amount as a number, read as the Spreadsheet reads one ("$1,200", "1200 GBP"); a day
 * as "2027-03-01" and a moment as the date field gives it ("2027-03-01T09:30"); tags as a list; empty as null.
 */
export function parseInput(col: { type?: ColumnType }, raw: string): unknown {
  const s = raw.trim();
  switch (typeOf(col)) {
    case 'number':
    case 'money': {
      if (!s) return null;
      const n = parseLiteral(s, typeOf(col));
      return typeof n === 'number' ? n : undefined;
    }
    case 'date':
      if (!s) return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
    case 'datetime':
      if (!s) return null;
      return Number.isNaN(Date.parse(s)) ? undefined : s;
    case 'tags':
      return s
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);
    case 'boolean':
      return /^(true|1|yes|x)$/i.test(s);
    default:
      return raw;
  }
}

/** Two values the same as far as a cell can tell (a list by its items), so an edit that changes nothing is not told. */
export const sameValue = (a: unknown, b: unknown): boolean => a === b || (isEmpty(a) && isEmpty(b)) || (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]));

/** A column's least width in rem and its grid track: given, or its type's (words wider than numbers, a box narrow). */
export function trackOf(col: { type?: ColumnType; width?: string }): { min: number; track: string } {
  if (col.width) return { min: Number(/(\d+(?:\.\d+)?)r?em/.exec(col.width)?.[1] ?? 8), track: col.width };
  const [min, fr] = (
    {
      text: [10, 2],
      link: [10, 2],
      person: [10, 2],
      tags: [10, 2],
      custom: [10, 2],
      number: [7, 1],
      money: [7, 1],
      date: [8, 1],
      datetime: [11, 1],
      enum: [8, 1],
      boolean: [5, 0],
    } as Record<ColumnType, [number, number]>
  )[typeOf(col)];
  return { min, track: fr ? `minmax(${min}rem, ${fr}fr)` : `${min}rem` };
}
