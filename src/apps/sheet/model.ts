/**
 * The sheet as a view of a document, and its commands as operations. The document is the kernel's: one
 * table block (its first), the lock and the chart in the head. `readSheet` is `tableAt` plus what the grid
 * needs drawn: three columns at the least, the values worked out, where the names point, the headline
 * (`{big=…}`). Every command here is pure: given the document and what to do, the `Op[]` that does it,
 * in order, so the editor's `edit()` applies them and undo sees primitives only.
 *
 * A document with no table yet gets one with the first edit (`ensure`): three text columns named for their
 * letters, since the format needs words over its columns. Columns typed into past the table's edge are
 * added as they are needed; trailing blank rows are never written.
 */
import {
  COL_NAMES,
  COLUMN_TYPES,
  currencyOf,
  MAX_COLS,
  apply,
  evaluateTable,
  firstTable,
  formatCell,
  inHead,
  lockText,
  nameKey,
  putCells,
  rcToRef,
  refToRC,
  sortRows,
  tableAt,
  usedSize,
  withLock,
  withTable,
  type Cells,
  type CellValue,
  type Chart,
  type ColType,
  type Column,
  type Doc,
  type Op,
  type Range,
  type Table,
  ROWS,
} from '../../doc/index.ts';

/** A sheet is never narrower than three columns. */
export const MIN_COLS = 3;

/** What the sheet draws, read from the document. */
export interface SheetView {
  /** The table block, or -1 while the document has none. */
  at: number;
  /** The table as the block holds it (its columns may be fewer than `cols`). */
  table: Table;
  /** The columns drawn: the table's, padded to MIN_COLS with default names. */
  cols: Column[];
  /** The values of the held rows, `cols.length` wide. */
  values: CellValue[][];
  named: Map<string, [number, number]>;
  used: { rows: number; cols: number };
  /** The headline (`{big=Payment}` or `{big=D4}`): a name or a reference, with its value as its column shows it. */
  big: { label: string; value: string } | null;
  /** The document's currency (its head's `currency:`), for money columns that name none. */
  currency?: string;
}

/** The currency column c's money is shown in: its own, else the document's, else none ("$"). */
export const currencyAt = (v: Pick<SheetView, 'cols' | 'currency'>, c: number): string | undefined => v.cols[c]?.currency || v.currency || undefined;

const blankTable = (): Table => ({ cols: [], rows: [], lock: [], chart: '' });
/** The name a column goes by when nobody has named it: its letter. */
export const letterName = (c: number): string => `Col${COL_NAMES[c]}`;
export const isLetterName = (name: string): boolean => /^Col[A-Z]$/.test(name);
/** The kind of thing a type is called, as a column's default name ("Date", "Money B" when an earlier column already goes by that). */
export function typeName(c: number, cols: Column[], type: ColType = cols[c]?.type ?? 'text'): string {
  if (type === 'text') return letterName(c);
  const name = COLUMN_TYPES.find((t) => t.id === type)?.name ?? type;
  return cols.slice(0, c).some((x) => x.type === type) ? `${name} ${COL_NAMES[c]}` : name;
}
/** Whether a column goes by a default name (its letter, or what it holds), which follows its type and place. */
export const isDefaultName = (c: number, cols: Column[]): boolean => isLetterName(cols[c].name) || cols[c].name === typeName(c, cols);
const col = (c: number, type: ColType = 'text'): Column => ({ name: letterName(c), type });

/** The document's first table as a sheet, with everything the grid draws. */
export function readSheet(doc: Doc): SheetView {
  const at = firstTable(doc);
  const table = (at >= 0 && tableAt(doc, at)) || blankTable();
  const cols = [...table.cols];
  while (cols.length < MIN_COLS) cols.push(col(cols.length));
  const ev = evaluateTable(table);
  const values = ev.values.map((row) => cols.map((_, c) => row[c] ?? null));
  const used = usedSize(table);
  return { at, table, cols, values, named: ev.named, used, big: bigOf(doc, at, table, ev.values, ev.named), ...(doc.head.currency ? { currency: doc.head.currency } : {}) };
}

/** The headline cell, if the table names one: `{big=Payment}` (a named cell) or `{big=D4}` (labelled by its column and row). */
function bigOf(doc: Doc, at: number, t: Table, values: CellValue[][], named: Map<string, [number, number]>): SheetView['big'] {
  const b = doc.blocks[at];
  const want = b?.k === 'table' ? b.a?.kv?.big : undefined;
  if (!want) return null;
  const rc = named.get(nameKey(want)) ?? refToRC(want.toUpperCase());
  if (!rc) return null;
  const [r, c] = rc;
  const nameCol = t.cols.findIndex((x) => x.type === 'name');
  return {
    label: named.has(nameKey(want)) ? (t.rows[r]?.[nameCol] ?? want) : refLabel(t, r, c, want),
    value: formatCell(values[r]?.[c] ?? null, t.cols[c]?.type, t.cols[c]?.currency || doc.head.currency),
  };
}

/** What a headline given by reference is called: its column's name and the words its row starts with ("Raised so far, Oct 26"), or the reference where the column goes by its letter. */
function refLabel(t: Table, r: number, c: number, ref: string): string {
  const name = t.cols[c]?.name;
  if (!name || isLetterName(name)) return ref;
  const row = c > 0 ? (t.rows[r]?.[0] ?? '') : '';
  return row && !row.startsWith('=') ? `${name}, ${row}` : name;
}

/* ---------- commands: each the ops that do it ---------- */

/** Ops gathered in order, each applied to a running copy of the document so the next sees what it did. */
class Builder {
  ops: Op[] = [];
  doc: Doc;
  constructor(doc: Doc) {
    this.doc = doc;
  }
  push(...ops: Op[]) {
    for (const op of ops) {
      this.doc = apply(this.doc, op);
      this.ops.push(op);
    }
    return this;
  }
  get at(): number {
    return firstTable(this.doc);
  }
  get table(): Table {
    return tableAt(this.doc, this.at)!;
  }
}

/** The document given a table if it has none (three letter-named text columns), and columns out to `cols` where a command needs them. */
function ensure(b: Builder, cols = 0): Builder {
  if (b.at < 0)
    b.push({ op: 'splice', at: b.doc.blocks.length, n: 0, blocks: [{ k: 'table', cols: Array.from({ length: Math.max(MIN_COLS, Math.min(MAX_COLS, cols)) }, (_, c) => col(c)), rows: [] }] });
  const have = b.table.cols.length;
  if (cols > have) b.push({ op: 'cols', at: b.at, c: have, n: 0, cols: Array.from({ length: Math.min(MAX_COLS, cols) - have }, (_, i) => col(have + i)) });
  return b;
}

/** Trailing rows with nothing in them taken out: the document never holds them. */
function trim(b: Builder): Builder {
  if (b.at < 0) return b;
  const t = b.table;
  let n = t.rows.length;
  while (n > 0 && t.rows[n - 1].every((v) => v === '')) n--;
  if (n < t.rows.length) b.push({ op: 'rows', at: b.at, r: n, n: t.rows.length - n });
  return b;
}

/** Letter-named columns called by the letter where they now stand, after columns moved. */
function reletter(b: Builder): Builder {
  if (b.at < 0) return b;
  b.table.cols.forEach((x, c) => {
    if (isLetterName(x.name) && x.name !== letterName(c)) b.push({ op: 'col', at: b.at, c, col: { ...x, name: letterName(c) } });
  });
  return b;
}

/** One cell typed into. A locked cell is left as it is (the op's own rule). */
export function setCell(doc: Doc, r: number, c: number, raw: string): Op[] {
  const b = ensure(new Builder(doc), c + 1);
  if (b.table.rows[r]?.[c] === raw) return [];
  if (raw === '' && r >= b.table.rows.length) return [];
  b.push(...putCells(b.doc, b.at, r, c, [[raw]]));
  return trim(b).ops;
}

/** A rectangle of cells written (a paste, a fill, a clear, a sort). `force` writes through the lock (a sort moves whole rows). */
export function putRect(doc: Doc, cells: Cells, force?: true): Op[] {
  const width = Math.max(0, ...cells.values.map((row) => row.length));
  const b = ensure(new Builder(doc), Math.min(MAX_COLS, cells.c + width));
  // Rows past the table's end that would be written blank need not be put in at all.
  let n = cells.values.length;
  const held = b.table.rows.length;
  while (n > 0 && cells.r + n - 1 >= held && cells.values[n - 1].every((v) => v === '')) n--;
  if (n > 0) b.push(...putCells(b.doc, b.at, cells.r, cells.c, cells.values.slice(0, n), force));
  return trim(b).ops;
}

/** The rows in order of column c. */
export function sortBy(doc: Doc, c: number, descending = false): Op[] {
  const b = ensure(new Builder(doc), c + 1);
  return b.push(...putRect(b.doc, sortRows(b.table, c, descending), true)).ops;
}

/** `n` blank rows put in before row r. Nothing to move when r is past the rows held. */
export function insertRows(doc: Doc, r: number, n: number): Op[] {
  const b = ensure(new Builder(doc));
  if (r >= b.table.rows.length) return b.ops;
  return b.push({ op: 'rows', at: b.at, r, n, rows: Array.from({ length: n }, () => []) }).ops;
}

/** Rows r0 to r1 taken out; formulas and the lock follow. */
export function deleteRows(doc: Doc, r0: number, r1: number): Op[] {
  const b = ensure(new Builder(doc));
  const last = Math.min(r1, b.table.rows.length - 1);
  if (r0 > last) return b.ops;
  return trim(b.push({ op: 'rows', at: b.at, r: r0, n: last - r0 + 1 })).ops;
}

/** Where each row is once rows r0 to r1 have moved by `by` (±1, or more), the rows they passed taking their place. */
export function rowsMoved(r0: number, r1: number, by: number): (r: number) => number {
  const n = r1 - r0 + 1;
  return (r) => {
    if (r >= r0 && r <= r1) return r + by;
    if (by < 0 && r >= r0 + by && r < r0) return r + n;
    if (by > 0 && r > r1 && r <= r1 + by) return r - n;
    return r;
  };
}

/** A formula's references after rows were reordered by `to`: a cell follows its row; a range follows the rows at its corners (and stays a range, its corners in order). Words in quotes are left alone. */
export function reorderRefs(raw: string, to: (r: number) => number): string {
  if (!raw.startsWith('=')) return raw;
  const at = (ref: string) => refToRC(ref.toUpperCase());
  return raw
    .split(/("[^"]*")/)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/\b([A-Za-z]\d{1,4})(?::([A-Za-z]\d{1,4}))?\b/g, (whole, a: string, b?: string) => {
            const p = at(a);
            const q = b ? at(b) : null;
            if (!p || (b && !q)) return whole;
            if (!q) return rcToRef(to(p[0]), p[1]);
            const [ra, rb] = [to(p[0]), to(q[0])];
            return `${rcToRef(Math.min(ra, rb), p[1])}:${rcToRef(Math.max(ra, rb), q[1])}`;
          }),
    )
    .join('');
}

/** Rows r0 to r1 moved up (by < 0) or down past their neighbours, formulas and the lock following them. Nothing when they would leave the sheet. */
export function moveRows(doc: Doc, r0: number, r1: number, by: number): Op[] {
  if (!by || r0 + by < 0 || r1 + by >= ROWS) return [];
  const b = ensure(new Builder(doc));
  const t = b.table;
  const to = rowsMoved(r0, r1, by);
  const held = Math.max(t.rows.length, r1 + Math.max(0, by) + 1);
  const rows: string[][] = Array.from({ length: held }, () => t.cols.map(() => ''));
  for (let r = 0; r < held; r++) rows[to(r)] = t.cols.map((_, c) => reorderRefs(t.rows[r]?.[c] ?? '', to));
  // Each locked range follows its rows; one the move splits becomes a range per run of rows.
  const lock = t.lock.flatMap((g) => {
    const at = Array.from({ length: g.r1 - g.r0 + 1 }, (_, i) => to(g.r0 + i)).sort((x, y) => x - y);
    const runs: Range[] = [];
    for (const r of at) {
      const last = runs[runs.length - 1];
      if (last && last.r1 === r - 1) last.r1 = r;
      else runs.push({ ...g, r0: r, r1: r });
    }
    return runs;
  });
  b.push(...withTable(b.doc, b.at, { ...t, rows, lock }));
  return trim(b).ops;
}

/** A column put in before column c (after the last, from the + at the end of the header). Null when the sheet is as wide as it goes. */
export function addColumn(doc: Doc, c: number): Op[] | null {
  const b = ensure(new Builder(doc), c);
  if (b.table.cols.length >= MAX_COLS) return null;
  b.push({ op: 'cols', at: b.at, c, n: 0, cols: [col(c)] });
  return reletter(b).ops;
}

/** Whether column c may go: any column, whatever it holds, while the table keeps one; one drawn past the table's edge while the sheet is wider than three. */
export function removable(view: SheetView, c: number): boolean {
  const { table } = view;
  if (c >= table.cols.length) return view.cols.length > MIN_COLS;
  return table.cols.length > 1;
}

/** Column c taken out, cells and all: the columns after it move left, and references into it become #REF (the kernel's `cols` op). */
export function removeColumn(doc: Doc, view: SheetView, c: number): Op[] {
  if (!removable(view, c) || c >= view.table.cols.length) return [];
  const b = new Builder(doc).push({ op: 'cols', at: view.at, c, n: 1 });
  return reletter(b).ops;
}

/**
 * What column c holds. A column that goes by a default name takes the name of what it now holds; one named by hand
 * keeps its name. A money column may name its currency ("£", "GBP"); none, or '', takes the document's.
 */
export function setType(doc: Doc, c: number, type: ColType, currency?: string): Op[] {
  const b = ensure(new Builder(doc), c + 1);
  const cols = b.table.cols;
  const name = isDefaultName(c, cols) ? typeName(c, cols, type) : cols[c].name;
  const money = type === 'money' && currency?.trim() ? currencyOf(currency) : null;
  if (cols[c].type === type && cols[c].name === name && (cols[c].currency ?? null) === money) return b.ops;
  return b.push({ op: 'col', at: b.at, c, col: money ? { name, type, currency: money } : { name, type } }).ops;
}

/** Column c named; '' (or its default) gives it its default name back. */
export function rename(doc: Doc, c: number, name: string): Op[] {
  const b = ensure(new Builder(doc), c + 1);
  const cols = b.table.cols;
  const clean = name.replace(/[\t\n]/g, ' ').trim() || typeName(c, cols);
  if (cols[c].name === clean) return b.ops;
  return b.push({ op: 'col', at: b.at, c, col: { ...cols[c], name: clean } }).ops;
}

/**
 * The chart the sheet asks for: head ops where the chart lives in the head (a sheet document), else the table's
 * attributes. A chart put in where there was none goes above the table ("chart-at: top"); another kind keeps the
 * place of the one it replaces (a chart already below stays there); no chart takes the place away with it.
 */
export function setChart(doc: Doc, chart: Chart): Op[] {
  const b = ensure(new Builder(doc));
  const t = b.table;
  const above = !!chart && (t.chart ? !!t.above : true);
  if (t.chart === chart && !!t.above === above) return b.ops;
  if (!inHead(b.doc, b.at, 'chart')) return b.push(...withTable(b.doc, b.at, { ...t, chart, above: above || undefined })).ops;
  if (t.chart !== chart) b.push({ op: 'head', key: 'chart', value: chart || undefined });
  if (!!t.above !== above) b.push({ op: 'head', key: 'chart-at', value: above ? 'top' : undefined });
  return b.ops;
}

/** The cells of `g` locked, or (`on` false) every lock touching them let go; a head op where the lock lives in the head. */
export function setLock(doc: Doc, g: Range, on: boolean): Op[] {
  const b = ensure(new Builder(doc), g.c1 + 1);
  const lock = withLock(b.table.lock, g, on);
  if (inHead(b.doc, b.at, 'lock')) return b.push({ op: 'head', key: 'lock', value: lockText(lock) || undefined }).ops;
  return b.push(...withTable(b.doc, b.at, { ...b.table, lock })).ops;
}
