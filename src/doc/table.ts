/**
 * A table block as a sheet: its typed columns, its rows of raw cells, the
 * cells a reader is to leave be (the lock) and the chart it asks for. A1
 * addressing, the lock's ranges, how formulas and the lock follow rows and
 * columns that move, and what the sheet's commands write (copy, paste,
 * fill, clear, sort) as rectangles of cells for a `cells` op. These are the
 * only places the kernel knows about A1 references.
 *
 * The lock and the chart are not fields of the table block: they ride on
 * the document's header for a sheet document (its first table) and on the
 * table's own attributes anywhere else. tableAt reads them from where they
 * are; withTable writes them back there. A chart is drawn under its table
 * unless "chart-at: top" (beside the chart, wherever it is) puts it above.
 */
import { attr, type Attrs, type Column, type Doc, type TableBlock } from './model.ts';
import type { Op } from './ops.ts';

/** The most rows a reference may name. */
export const ROWS = 1000;
/** One letter a column: A to Z. */
export const MAX_COLS = 26;
/** The columns' letters. */
export const COL_NAMES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const CHARTS = ['bar', 'line', 'pie', 'sankey'] as const;
/** The chart a table asks for, or none. */
export type Chart = '' | (typeof CHARTS)[number];

/** A table block as a sheet sees it. */
export interface Table {
  cols: Column[];
  /** The rows the block holds, each `cols.length` wide. */
  rows: string[][];
  /** From "lock:" (head or attr): the cells a reader is to leave be. */
  lock: Range[];
  chart: Chart;
  /** From "chart-at: top": the chart is drawn above the table rather than under it. */
  above?: true;
}

/** A rectangle of cells, corners included. */
export interface Range {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/* ---------- days ---------- */

/** Day number (days since 1970-01-01) of a civil date, time zone free. */
export const ymdToDay = (y: number, m: number, d: number): number => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
/** The civil date of a day number; wd is 0 for Sunday. */
export function dayToYmd(day: number): { y: number; m: number; d: number; wd: number } {
  const dt = new Date(day * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}
/** "2027-03-01". */
export const ymdString = (y: number, m: number, d: number): string => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/* ---------- A1 ---------- */

/** "B3" as [row, column], both from 0; null for what is no cell. */
export function refToRC(ref: string): [number, number] | null {
  const m = /^([A-Z])(\d+)$/.exec(ref);
  if (!m) return null;
  const row = parseInt(m[2], 10) - 1;
  if (row < 0 || row >= ROWS) return null;
  return [row, m[1].charCodeAt(0) - 65];
}
/** [row, column] as "B3". */
export const rcToRef = (row: number, col: number): string => COL_NAMES[col] + (row + 1);
/** The rectangle with these two corners. */
export const rangeOf = (a: [number, number], b: [number, number] = a): Range => ({ r0: Math.min(a[0], b[0]), c0: Math.min(a[1], b[1]), r1: Math.max(a[0], b[0]), c1: Math.max(a[1], b[1]) });
/** A rectangle as "A1:B3", or "A1" for one cell. */
export const rangeRef = (g: Range): string => (g.r0 === g.r1 && g.c0 === g.c1 ? rcToRef(g.r0, g.c0) : `${rcToRef(g.r0, g.c0)}:${rcToRef(g.r1, g.c1)}`);
const inGrid = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < MAX_COLS;
const colOf = (letter: string) => letter.toUpperCase().charCodeAt(0) - 65;

/* ---------- the lock ---------- */

/** The locked ranges, read from "B6:D9, F2": each a rectangle of cells. What is no range is left out. */
export function lockedRanges(lock: string): Range[] {
  return lock
    .split(/[,\s]+/)
    .map((part) => {
      const m = /^([A-Z]\d+)(?::([A-Z]\d+))?$/i.exec(part);
      const a = m && refToRC(m[1].toUpperCase());
      const b = m?.[2] ? refToRC(m[2].toUpperCase()) : a;
      return a && b ? rangeOf(a, b) : null;
    })
    .filter((g): g is Range => !!g);
}
/** The lock as it is written: "B6:D9, F2". */
export const lockText = (lock: Range[]): string => lock.map(rangeRef).join(', ');
/** Whether a reader is to leave this cell be. */
export const isLocked = (lock: Range[], r: number, c: number): boolean => lock.some((g) => r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1);
/** The lock with these cells locked (or, `on` false, with every range that touches them let go). */
export function withLock(lock: Range[], g: Range, on: boolean): Range[] {
  const kept = lock.filter((x) => on || x.r1 < g.r0 || x.r0 > g.r1 || x.c1 < g.c0 || x.c0 > g.c1);
  return on ? [...kept, g] : kept;
}

/* ---------- rows and columns that move ---------- */

/** Where a row (or column) is after some move: its new place, or null when it is gone. */
export type Moved = (i: number) => number | null;
/** The move that moves nothing. */
export const stays: Moved = (i) => i;
/** Where each row (column) is once n are put in before `at`. */
export const movedIn =
  (at: number, n: number): Moved =>
  (i) =>
    i >= at ? i + n : i;
/** Where each row (column) is once `a` to `b` are taken out: null for one of those. */
export const movedOut =
  (a: number, b: number): Moved =>
  (i) =>
    i < a ? i : i > b ? i - (b - a + 1) : null;

/** A formula as it reads after moving by (dr, dc): its references move with it. Words in quotes, and other text, are untouched. */
export function shiftFormula(raw: string, dr: number, dc: number): string {
  if (!raw.startsWith('=') || (!dr && !dc)) return raw;
  return raw
    .split(/("[^"]*")/)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/\b([A-Za-z])(\d{1,4})\b/g, (whole, col: string, row: string) => {
            const at = refToRC(col.toUpperCase() + row);
            if (!at) return whole;
            return inGrid(at[0] + dr, at[1] + dc) ? rcToRef(at[0] + dr, at[1] + dc) : '#REF';
          }),
    )
    .join('');
}

/**
 * A formula's references after rows or columns move: `rows(r)` is where
 * row r is now, `cols(c)` where column c is, null if it is gone. A range
 * keeps what is left of it (taking rows out of its middle shrinks it;
 * putting rows in its middle grows it); a reference to a row or column
 * that is gone is #REF. Words in quotes are left alone.
 */
export function remapRefs(raw: string, rows: Moved, cols: Moved, gone: { rows?: [number, number]; cols?: [number, number] } = {}): string {
  if (!raw.startsWith('=')) return raw;
  /** One end of a range: where its row (column) went, or the nearest still there. */
  const end = (to: Moved, at: number, taken: [number, number] | undefined, first: boolean) => to(at) ?? (taken ? taken[0] - (first ? 0 : 1) : at);
  return raw
    .split(/("[^"]*")/)
    .map((part, i) => {
      if (i % 2) return part;
      // Ranges first, set aside so their cells are not moved twice; then single cells; then the ranges back.
      const ranges: string[] = [];
      const out = part
        .replace(/\b([A-Za-z])(\d{1,4}):([A-Za-z])(\d{1,4})\b/g, (_, c0: string, r0: string, c1: string, r1: string) => {
          let [a, b] = [+r0 - 1, +r1 - 1];
          if (a > b) [a, b] = [b, a];
          let [x, y] = [colOf(c0), colOf(c1)];
          if (x > y) [x, y] = [y, x];
          const [na, nb] = [end(rows, a, gone.rows, true), end(rows, b, gone.rows, false)];
          const [nx, ny] = [end(cols, x, gone.cols, true), end(cols, y, gone.cols, false)];
          ranges.push(nb < na || na < 0 || nb >= ROWS || ny < nx || nx < 0 || ny >= MAX_COLS ? '#REF' : `${COL_NAMES[nx]}${na + 1}:${COL_NAMES[ny]}${nb + 1}`);
          return `\u0001${ranges.length - 1}\u0002`;
        })
        .replace(/\b([A-Za-z])(\d{1,4})\b/g, (_, c: string, r: string) => {
          const n = rows(+r - 1);
          const m = cols(colOf(c));
          return n === null || n >= ROWS || m === null || m >= MAX_COLS ? '#REF' : `${COL_NAMES[m]}${n + 1}`;
        });
      return out.replace(/\u0001(\d+)\u0002/g, (_, k: string) => ranges[+k]);
    })
    .join('');
}

/** The lock after rows or columns move (movedIn, movedOut): each range follows them and keeps what is left of it, and goes when nothing is. */
export function remapLock(lock: Range[], rows: Moved, cols: Moved = stays): Range[] {
  const kept = (a: number, b: number, to: Moved, most: number) => Array.from({ length: b - a + 1 }, (_, i) => to(a + i)).filter((x): x is number => x !== null && x < most);
  return lock.flatMap((g) => {
    const r = kept(g.r0, g.r1, rows, ROWS);
    const c = kept(g.c0, g.c1, cols, MAX_COLS);
    return r.length && c.length ? [{ r0: r[0], r1: r[r.length - 1], c0: c[0], c1: c[c.length - 1] }] : [];
  });
}

/* ---------- the table in the document ---------- */

/** The first table block of a document, or -1. */
export const firstTable = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'table');

/** Whether the table at `at` keeps its lock or chart in the document's header: a sheet document's first table, with none of its own. */
export const inHead = (doc: Doc, at: number, key: 'lock' | 'chart'): boolean => attr(doc.blocks[at], key) === undefined && firstTable(doc) === at;

/** Block `at` as a table; its lock and chart from the block's attrs, else, when it is the document's first table, from the head. Null for no table. */
export function tableAt(doc: Doc, at: number): Table | null {
  const b = doc.blocks[at];
  if (b?.k !== 'table') return null;
  const read = (key: 'lock' | 'chart') => (inHead(doc, at, key) ? doc.head[key] : attr(b, key)) ?? '';
  const chart = read('chart').toLowerCase();
  const above = (inHead(doc, at, 'chart') ? doc.head['chart-at'] : attr(b, 'chart-at')) === 'top';
  return { cols: b.cols, rows: b.rows, lock: lockedRanges(read('lock')), chart: (CHARTS as readonly string[]).includes(chart) ? (chart as Chart) : '', ...(above ? { above: true as const } : {}) };
}

/** The doc with block `at` written from `t`: cells and columns into the block; lock and chart where they were read from. */
export function withTable(doc: Doc, at: number, t: Table): Op[] {
  const b = doc.blocks[at];
  if (b?.k !== 'table') return [];
  const ops: Op[] = [];
  const kv = { ...b.a?.kv };
  for (const [key, value, home] of [
    ['lock', lockText(t.lock), 'lock'],
    ['chart', t.chart, 'chart'],
    ['chart-at', t.chart && t.above ? 'top' : '', 'chart'],
  ] as const) {
    if (inHead(doc, at, home)) {
      // The chart's place is written only where it changes, so a table that never had one gains no op for it.
      if (key !== 'chart-at' || (doc.head[key] ?? '') !== value) ops.push({ op: 'head', key, value: value || undefined });
    } else value ? (kv[key] = value) : delete kv[key];
  }
  const a: Attrs = { ...b.a, kv };
  if (!Object.keys(kv).length) delete a.kv;
  const block: TableBlock = { k: 'table', cols: t.cols, rows: t.rows.map((r) => t.cols.map((_, c) => r[c] ?? '')), ...(a.id || a.cls || a.kv ? { a } : {}) };
  return [{ op: 'splice', at, n: 1, blocks: [block] }, ...ops];
}

/** How much of a table is in use: rows down to the last with something in it, columns across to the last with something, a name or a type of its own. */
export function usedSize(t: { cols: Column[]; rows: string[][] }): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  t.rows.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === '') return;
      rows = Math.max(rows, r + 1);
      cols = Math.max(cols, c + 1);
    }),
  );
  t.cols.forEach((col, c) => (col.name.trim() || col.type !== 'text') && (cols = Math.max(cols, c + 1)));
  return { rows, cols };
}

/** A name as a formula writes it: upper case, anything that is not a letter or a digit as "_" ("One-off gifts" is ONE_OFF_GIFTS). */
export const nameKey = (s: string): string =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** The cells with names: each cell of a name column names the cell to its right. The first of a name, reading down, is the one. */
export function namedCells(t: { cols: Column[]; rows: string[][] }): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  t.cols.forEach((col, c) => {
    if (col.type !== 'name' || c + 1 >= t.cols.length) return;
    t.rows.forEach((row, r) => {
      const key = nameKey(row[c] ?? '');
      if (key && !out.has(key)) out.set(key, [r, c + 1]);
    });
  });
  return out;
}

/* ---------- rectangles of cells: what the sheet's commands write ---------- */

/** A rectangle of cells to write with a `cells` op: its top left and its values. */
export interface Cells {
  r: number;
  c: number;
  values: string[][];
}

const cellAt = (t: { rows: string[][] }, r: number, c: number) => t.rows[r]?.[c] ?? '';

/** The cells of a range as text: tabs between cells, newlines between rows. What spreadsheets put on the clipboard. */
export function copyCells(t: { rows: string[][] }, g: Range): string {
  const rows: string[] = [];
  for (let r = g.r0; r <= g.r1; r++) rows.push(Array.from({ length: g.c1 - g.c0 + 1 }, (_, i) => cellAt(t, r, g.c0 + i)).join('\t'));
  return rows.join('\n');
}

/** The range emptied. */
export const clearCells = (g: Range): Cells => ({ r: g.r0, c: g.c0, values: Array.from({ length: g.r1 - g.r0 + 1 }, () => Array<string>(g.c1 - g.c0 + 1).fill('')) });

/**
 * Tab-and-newline text pasted with its top left at (r, c), as the cells it
 * writes. `moved` shifts formulas' references (a copy within the sheet);
 * `into` repeats a single value over a whole selection. Nothing is written
 * past the table's last column or the thousandth row.
 */
export function pasteCells(t: { cols: Column[] }, r: number, c: number, text: string, moved?: { dr: number; dc: number }, into?: Range): Cells & { range: Range } {
  const rows = text
    .replace(/\r\n?/g, '\n')
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => line.split('\t'));
  const single = rows.length === 1 && rows[0].length === 1;
  const g: Range = single && into ? into : { r0: r, c0: c, r1: Math.min(ROWS - 1, r + rows.length - 1), c1: Math.min(t.cols.length - 1, c + Math.max(...rows.map((x) => x.length)) - 1) };
  const values: string[][] = [];
  for (let y = g.r0; y <= g.r1; y++) {
    const row: string[] = [];
    for (let x = g.c0; x <= g.c1; x++) {
      const raw = single ? rows[0][0] : (rows[y - r]?.[x - c] ?? '');
      // Each copy of a single cell moves by its own distance from the original.
      row.push(moved ? shiftFormula(raw, moved.dr + (single ? y - r : 0), moved.dc + (single ? x - c : 0)) : raw);
    }
    values.push(row);
  }
  return { r: g.r0, c: g.c0, values, range: g };
}

/** Words that are a number (a percentage's sign let be) as that number, else NaN: what a sort counts as a number. */
const numberIn = (s: string) => (/^[+-]?(\d+\.?\d*|\.\d+)%?$/.test(s.trim()) ? parseFloat(s) : NaN);

/**
 * Two cells' words in a sort's order, low to high: numbers by their value and before words, words as a reader orders
 * them (case and accents aside, "Item 2" before "Item 10"). Neither is empty: where blanks go is the caller's. The
 * Spreadsheet's sort (sortRows) and a host's table (kit/ui/table-model.ts) order words by it.
 */
export function compareCells(x: string, y: string): number {
  const nx = numberIn(x),
    ny = numberIn(y);
  return !isNaN(nx) && !isNaN(ny) ? nx - ny : isNaN(nx) === isNaN(ny) ? x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) : isNaN(nx) ? 1 : -1;
}

/**
 * The rows in order of column `c`, numbers before words, blanks last, as
 * the cells to write from the top. (The names above the columns are not a
 * row.) Formulas move with their rows as they are.
 */
export function sortRows(t: { cols: Column[]; rows: string[][] }, c: number, descending = false): Cells {
  const used = usedSize(t).rows;
  const key = (row: string[]) => row[c] ?? '';
  const sorted =
    used < 2
      ? t.rows.slice(0, used)
      : t.rows
          .slice(0, used)
          .map((row, i) => ({ row, i }))
          .sort((a, b) => {
            const x = key(a.row),
              y = key(b.row);
            if (x === '' || y === '') return x === '' ? (y === '' ? a.i - b.i : 1) : -1;
            const d = compareCells(x, y);
            return (descending && x !== '' && y !== '' ? -d : d) || a.i - b.i;
          })
          .map(({ row }) => row);
  return { r: 0, c: 0, values: sorted };
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Steps that are all the same: the step, or null. */
const evenStep = (v: number[]) => (v.length >= 2 && v.every((x, k) => k === 0 || Math.abs(x - v[k - 1] - (v[1] - v[0])) < 1e-9) ? v[1] - v[0] : null);

/**
 * What a run of cells goes on as, when dragged further: the k-th cell
 * (k counted from the first of the run, negative before it), or null when
 * the run is no series and is repeated instead. Numbers in even steps;
 * dates by even days, or by whole months when the day stays put (a lone
 * date goes a day at a time); words ending in a number ("Week 1", "Q1"),
 * a lone one counting up by one; month and weekday names, round the year
 * and the week, spelled as they were (full or three letters).
 */
export function seriesOf(seed: string[]): ((k: number) => string) | null {
  const cells = seed.map((s) => s.trim());
  if (!cells.length || cells.some((c) => !c || c.startsWith('='))) return null;
  const n = cells.length;
  // Numbers, with or without thousands commas.
  const nums = cells.map((c) => (/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/.test(c) && /\d/.test(c) ? parseFloat(c.replace(/,/g, '')) : NaN));
  if (nums.every((v) => !isNaN(v))) {
    const step = evenStep(nums);
    return step === null ? null : (k) => String(Math.round((nums[0] + step * k) * 1e10) / 1e10);
  }
  // Dates.
  const ymd = cells.map((c) => /^(\d{4})-(\d\d)-(\d\d)$/.exec(c));
  if (ymd.every(Boolean)) {
    const parts = ymd.map((m) => [+m![1], +m![2], +m![3]]);
    const days = parts.map(([y, m, d]) => ymdToDay(y, m, d));
    const months = parts.map(([y, m]) => y * 12 + m - 1);
    const monthStep = n >= 2 && parts.every((p) => p[2] === parts[0][2]) ? evenStep(months) : null;
    if (monthStep) {
      return (k) => {
        const total = months[0] + monthStep * k;
        const [y, m] = [Math.floor(total / 12), (total % 12) + 1];
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return ymdString(y, m, Math.min(parts[0][2], last));
      };
    }
    const step = n === 1 ? 1 : evenStep(days);
    if (step === null) return null;
    return (k) => {
      const { y, m, d } = dayToYmd(days[0] + step * k);
      return ymdString(y, m, d);
    };
  }
  // Month and weekday names.
  for (const names of [MONTH_NAMES, DAY_NAMES]) {
    const short = cells.every((c) => c.length === 3);
    const idx = cells.map((c) => names.findIndex((x) => (short ? x.slice(0, 3) : x).toLowerCase() === c.toLowerCase()));
    if (idx.every((i) => i >= 0)) {
      const step = n === 1 ? 1 : evenStep(idx);
      if (step === null) return null;
      const upper = cells[0] === cells[0].toUpperCase();
      return (k) => {
        const name = names[(((idx[0] + step * k) % names.length) + names.length) % names.length];
        const word = short ? name.slice(0, 3) : name;
        return upper ? word.toUpperCase() : cells[0][0] === cells[0][0].toLowerCase() ? word.toLowerCase() : word;
      };
    }
  }
  // Words ending in a number, all with the same words before it.
  const tails = cells.map((c) => /^(.*?\D)(\d+)$/.exec(c));
  if (tails.every(Boolean) && tails.every((t) => t![1] === tails[0]![1])) {
    const v = tails.map((t) => +t![2]);
    const step = n === 1 ? 1 : evenStep(v);
    if (step === null) return null;
    const width = tails[0]![2].startsWith('0') ? tails[0]![2].length : 0;
    return (k) => {
      const at = v[0] + step * k;
      return at < 0 ? cells[((k % n) + n) % n] : tails[0]![1] + String(at).padStart(width, '0');
    };
  }
  return null;
}

/**
 * Drag-fill: the cells of `src` carried out to `dest` (which contains it
 * and extends one way), as the whole of `dest` to write. Formulas move
 * their references; two or more numbers in step carry on counting;
 * anything else repeats.
 */
export function fillCells(t: { rows: string[][] }, src: Range, dest: Range): Cells {
  const values = Array.from({ length: dest.r1 - dest.r0 + 1 }, (_, y) => Array.from({ length: dest.c1 - dest.c0 + 1 }, (_, x) => cellAt(t, dest.r0 + y, dest.c0 + x)));
  const down = dest.r0 < src.r0 || dest.r1 > src.r1;
  const n = down ? src.r1 - src.r0 + 1 : src.c1 - src.c0 + 1;
  for (let line = down ? src.c0 : src.r0; line <= (down ? src.c1 : src.r1); line++) {
    const at = (k: number): [number, number] => (down ? [src.r0 + k, line] : [line, src.c0 + k]);
    const seed = Array.from({ length: n }, (_, k) => cellAt(t, ...at(k)));
    // A lone number is copied, as spreadsheets do; anything else that makes a series goes on as one.
    const series = n === 1 && /^[+-]?[\d,.]+$/.test(seed[0].trim()) ? null : seriesOf(seed);
    for (let k = (down ? dest.r0 : dest.c0) - (down ? src.r0 : src.c0); k <= (down ? dest.r1 : dest.c1) - (down ? src.r0 : src.c0); k++) {
      if (k >= 0 && k < n) continue;
      const from = ((k % n) + n) % n;
      const [r, c] = at(k);
      values[r - dest.r0][c - dest.c0] = series ? series(k) : shiftFormula(seed[from], down ? k - from : 0, down ? 0 : k - from);
    }
  }
  return { r: dest.r0, c: dest.c0, values };
}
