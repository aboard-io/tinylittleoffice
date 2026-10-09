/**
 * Edits as operations on a document. Eight primitives, each pure: `apply`
 * gives a new document that shares every block the operation did not touch
 * (so a view redraws only what changed), and `invert` gives the operations
 * that take the edit back, which is what undo is. Above them, the composed
 * edits every editor shares (Enter, Backspace, a family of list items moved
 * or indented) return lists of primitives, so undo and tests see primitives
 * only.
 *
 * Rows, columns and cells are table-aware: formulas and the lock follow rows
 * and columns that move (table.ts), and a locked cell is left as it is unless
 * the op says `force`. An op that cannot apply (a text op on a table, a
 * column past Z) throws; a rectangle of cells wider or taller than the table
 * is clipped to it.
 */
import { attr, isText, normalRuns, type Attrs, type Block, type Column, type Doc, type Run, type TableBlock } from './model.ts';
import { inHead, isLocked, lockText, MAX_COLS, movedIn, movedOut, remapLock, remapRefs, stays, tableAt, type Moved } from './table.ts';

/** The eight primitive edits. */
export type Op =
  | { op: 'head'; key: string; value?: string } // set or (undefined) remove a header key
  | { op: 'splice'; at: number; n: number; blocks: Block[] } // insert (n = 0), remove (blocks = []), replace
  | { op: 'move'; at: number; n: number; to: number } // a span of blocks moved before index `to` (in the doc without the span)
  | { op: 'text'; at: number; from: number; to: number; runs: Run[] } // in text block `at`: replace characters [from, to) with runs (atomic runs count 1)
  | { op: 'cells'; at: number; r: number; c: number; values: string[][]; force?: true } // a rectangle of a table's cells written, top-left (r, c); force writes locked cells too
  | { op: 'rows'; at: number; r: number; n: number; rows?: string[][] } // rows put in before r (rows given) or taken out
  | { op: 'cols'; at: number; c: number; n: number; cols?: Column[] } // columns put in before c (cols given, or blank ones) or taken out
  | { op: 'col'; at: number; c: number; col: Column }; // a column renamed or retyped

/** How many characters some runs hold: an icon or a footnote mark counts one. */
export const runLength = (runs: Run[]): number => runs.reduce((n, r) => n + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0);

/** The runs between two character positions, cut where they fall inside a run. */
export function sliceRuns(runs: Run[], from: number, to: number): Run[] {
  const out: Run[] = [];
  let at = 0;
  for (const r of runs) {
    const len = r.ic || r.fn !== undefined ? 1 : r.t.length;
    const a = Math.max(from, at);
    const b = Math.min(to, at + len);
    if (a < b) out.push(len === 1 && r.t === '' ? r : { ...r, t: r.t.slice(a - at, b - at) });
    at += len;
  }
  return out;
}

const table = (doc: Doc, at: number): TableBlock => {
  const b = doc.blocks[at];
  if (b?.k !== 'table') throw new RangeError(`no table at ${at}`);
  return b;
};
const withBlock = (doc: Doc, at: number, b: Block): Doc => ({ head: doc.head, blocks: doc.blocks.map((x, i) => (i === at ? b : x)) });

/** A table's rows after its rows or columns moved: every formula remapped. */
const remapped = (rows: string[][], r: Moved, c: Moved, gone: { rows?: [number, number]; cols?: [number, number] }) => rows.map((row) => row.map((v) => remapRefs(v, r, c, gone)));

/** The doc with the table at `at` replaced by `b`, and its lock (head or attr) remapped where that changes its ranges. */
function withMovedTable(doc: Doc, at: number, b: TableBlock, r: Moved, c: Moved): Doc {
  const lock = tableAt(doc, at)!.lock;
  const moved = remapLock(lock, r, c);
  if (lockText(moved) === lockText(lock)) return withBlock(doc, at, b);
  const text = lockText(moved);
  if (inHead(doc, at, 'lock')) {
    const head = { ...doc.head };
    text ? (head.lock = text) : delete head.lock;
    return { head, blocks: withBlock(doc, at, b).blocks };
  }
  const kv = { ...b.a?.kv };
  text ? (kv.lock = text) : delete kv.lock;
  const a: Attrs = { ...b.a, kv };
  if (!Object.keys(kv).length) delete a.kv;
  return withBlock(doc, at, { ...b, ...(a.id || a.cls || a.kv ? { a } : {}) });
}

/** The document with one operation applied. Pure: untouched blocks are the same objects. */
export function apply(doc: Doc, op: Op): Doc {
  switch (op.op) {
    case 'head': {
      const head = { ...doc.head };
      op.value === undefined ? delete head[op.key] : (head[op.key] = op.value);
      return { head, blocks: doc.blocks };
    }
    case 'splice':
      return { head: doc.head, blocks: [...doc.blocks.slice(0, op.at), ...op.blocks, ...doc.blocks.slice(op.at + op.n)] };
    case 'move': {
      const span = doc.blocks.slice(op.at, op.at + op.n);
      const rest = [...doc.blocks.slice(0, op.at), ...doc.blocks.slice(op.at + op.n)];
      return { head: doc.head, blocks: [...rest.slice(0, op.to), ...span, ...rest.slice(op.to)] };
    }
    case 'text': {
      const b = doc.blocks[op.at];
      if (!b || !isText(b)) throw new RangeError(`no text at ${op.at}`);
      const runs = normalRuns([...sliceRuns(b.runs, 0, op.from), ...op.runs, ...sliceRuns(b.runs, op.to, runLength(b.runs))]);
      return withBlock(doc, op.at, { ...b, runs });
    }
    case 'cells': {
      const b = table(doc, op.at);
      const lock = tableAt(doc, op.at)!.lock;
      let changed = false;
      const rows = b.rows.map((row, r) => {
        const given = op.values[r - op.r];
        if (r < op.r || !given) return row;
        const next = row.map((v, c) => (c < op.c || given[c - op.c] === undefined || (!op.force && isLocked(lock, r, c)) ? v : given[c - op.c]));
        if (next.every((v, c) => v === row[c])) return row;
        changed = true;
        return next;
      });
      return changed ? withBlock(doc, op.at, { ...b, rows }) : doc;
    }
    case 'rows': {
      const b = table(doc, op.at);
      if (op.rows) {
        const put = op.rows.map((row) => b.cols.map((_, c) => row[c] ?? ''));
        const moved = movedIn(op.r, put.length);
        return withMovedTable(doc, op.at, { ...b, rows: [...remapped(b.rows.slice(0, op.r), moved, stays, {}), ...put, ...remapped(b.rows.slice(op.r), moved, stays, {})] }, moved, stays);
      }
      const last = op.r + op.n - 1;
      const moved = movedOut(op.r, last);
      return withMovedTable(doc, op.at, { ...b, rows: remapped([...b.rows.slice(0, op.r), ...b.rows.slice(last + 1)], moved, stays, { rows: [op.r, last] }) }, moved, stays);
    }
    case 'cols': {
      const b = table(doc, op.at);
      if (op.cols) {
        if (b.cols.length + op.cols.length > MAX_COLS) throw new RangeError('no column past Z');
        const moved = movedIn(op.c, op.cols.length);
        const put = (row: string[]) => [...row.slice(0, op.c), ...op.cols!.map(() => ''), ...row.slice(op.c)];
        return withMovedTable(doc, op.at, { ...b, cols: [...b.cols.slice(0, op.c), ...op.cols, ...b.cols.slice(op.c)], rows: remapped(b.rows.map(put), stays, moved, {}) }, stays, moved);
      }
      const last = op.c + op.n - 1;
      if (b.cols.length - op.n < 1) throw new RangeError('a table keeps a column');
      const cut = <T,>(row: T[]) => [...row.slice(0, op.c), ...row.slice(last + 1)];
      const moved = movedOut(op.c, last);
      return withMovedTable(doc, op.at, { ...b, cols: cut(b.cols), rows: remapped(b.rows.map(cut), stays, moved, { cols: [op.c, last] }) }, stays, moved);
    }
    case 'col': {
      const b = table(doc, op.at);
      return withBlock(doc, op.at, { ...b, cols: b.cols.map((c, i) => (i === op.c ? op.col : c)) });
    }
  }
}

/** Operations applied one after another. */
export const applyAll = (doc: Doc, ops: Op[]): Doc => ops.reduce(apply, doc);

/**
 * The operations that undo `op` applied to `doc`: usually one. Rows or
 * columns put in or taken out are undone by putting the table block back as
 * it was (a formula that lost its reference cannot be remapped home), and
 * the header's lock with it when the table keeps its lock there.
 */
export function invert(doc: Doc, op: Op): Op[] {
  switch (op.op) {
    case 'head':
      return [{ op: 'head', key: op.key, value: doc.head[op.key] }];
    case 'splice':
      return [{ op: 'splice', at: op.at, n: op.blocks.length, blocks: doc.blocks.slice(op.at, op.at + op.n) }];
    case 'move':
      return [{ op: 'move', at: op.to, n: op.n, to: op.at }];
    case 'text': {
      const b = doc.blocks[op.at];
      if (!b || !isText(b)) throw new RangeError(`no text at ${op.at}`);
      return [{ op: 'text', at: op.at, from: op.from, to: op.from + runLength(op.runs), runs: sliceRuns(b.runs, op.from, op.to) }];
    }
    case 'cells': {
      const b = table(doc, op.at);
      const values = b.rows.slice(op.r, op.r + op.values.length).map((row, i) => row.slice(op.c, op.c + (op.values[i]?.length ?? 0)));
      return values.length && values.some((r) => r.length) ? [{ op: 'cells', at: op.at, r: op.r, c: op.c, values, force: true }] : [];
    }
    case 'rows':
    case 'cols': {
      const b = table(doc, op.at);
      const after = apply(doc, op);
      const back: Op[] = [{ op: 'splice', at: op.at, n: 1, blocks: [b] }];
      if (after.head.lock !== doc.head.lock) back.push({ op: 'head', key: 'lock', value: doc.head.lock });
      return back;
    }
    case 'col':
      return [{ op: 'col', at: op.at, c: op.c, col: table(doc, op.at).cols[op.c] }];
  }
}

/** The operations that undo a list applied in order (the inverses, last first). */
export function invertAll(doc: Doc, ops: Op[]): Op[] {
  const back: Op[] = [];
  for (const op of ops) {
    back.unshift(...invert(doc, op));
    doc = apply(doc, op);
  }
  return back;
}

/* ---------- composed edits ---------- */

/** One splice: the blocks [from, to) replaced. */
export const replaceSpan = (_doc: Doc, from: number, to: number, blocks: Block[]): Op[] => [{ op: 'splice', at: from, n: to - from, blocks }];

/** Enter: text block `at` becomes two at `offset`. A list item keeps its depth and kind (a task's new item is not done); a heading's second half is a paragraph. */
export function splitBlock(doc: Doc, at: number, offset: number): Op[] {
  const b = doc.blocks[at];
  if (!b || !isText(b)) return [];
  const left = sliceRuns(b.runs, 0, offset);
  const right = sliceRuns(b.runs, offset, runLength(b.runs));
  const first: Block = { ...b, runs: left };
  const second: Block = b.k === 'li' ? { k: 'li', depth: b.depth, ...(b.ord ? { ord: true } : {}), ...(b.done === undefined ? {} : { done: false }), runs: right } : b.k === 'h' ? { k: 'p', runs: right } : { k: b.k, runs: right };
  return [{ op: 'splice', at, n: 1, blocks: [first, second] }];
}

/** Backspace at the start of `at`: its words joined to the text block before it. Nothing when either is not text. */
export function joinBlocks(doc: Doc, at: number): Op[] {
  const prev = doc.blocks[at - 1];
  const b = doc.blocks[at];
  if (!prev || !b || !isText(prev) || !isText(b)) return [];
  return [{ op: 'splice', at: at - 1, n: 2, blocks: [{ ...prev, runs: normalRuns([...prev.runs, ...b.runs]) }] }];
}

/** How far in a block sits as an item: a list item's depth, a block that says `{depth=N}`, or -1 for one that nests nothing. */
export const depthOf = (b: Block): number => (b.k === 'li' ? b.depth : Number.isFinite(Number(attr(b, 'depth'))) && attr(b, 'depth') !== undefined ? Number(attr(b, 'depth')) : -1);

/** Where item i's family ends: the first later block no deeper than it. The depths may be the caller's own (a lines app counts heading levels). */
export function family(doc: Doc, i: number, depths = doc.blocks.map(depthOf)): number {
  if (depths[i] < 0) return i + 1;
  let j = i + 1;
  while (j < doc.blocks.length && depths[j] > depths[i]) j++;
  return j;
}

/** A block with its depth moved by `d`, as an item or as a block that says its depth; any other block is itself. */
function deeper(b: Block, d: number): Block {
  if (b.k === 'li') return d ? { ...b, depth: Math.max(0, b.depth + d) } : b;
  const at = attr(b, 'depth');
  return at === undefined || !d ? b : { ...b, a: { ...b.a, kv: { ...b.a?.kv, depth: String(Math.max(0, Number(at) + d)) } } };
}

/** Indent (by 1) or bring out (by -1) item i with its family; an item goes at most one deeper than the item above it, and no shallower than the margin. */
export function shiftFamily(doc: Doc, i: number, by: 1 | -1, depths = doc.blocks.map(depthOf)): Op[] | null {
  if (depths[i] < 0) return null;
  if (by > 0 && (i === 0 || depths[i - 1] < 0 || depths[i] > depths[i - 1])) return null;
  const end = family(doc, i, depths);
  const span = doc.blocks.slice(i, end);
  if (by < 0 && span.some((b) => depthOf(b) === 0)) return null;
  return [{ op: 'splice', at: i, n: end - i, blocks: span.map((b) => deeper(b, by)) }];
}

/**
 * Move item i's family past the family before or after it at its level, as
 * one `move`. A lone item with no neighbour at its level steps past a block
 * that is no list item but has a depth of its own (a heading, where a lines
 * app gives its headings depths), so a line can cross from one section to
 * the next; it never steps past its own parent.
 */
export function moveFamily(doc: Doc, i: number, by: 1 | -1, depths = doc.blocks.map(depthOf)): Op[] | null {
  const end = family(doc, i, depths);
  const n = end - i;
  const lone = n === 1;
  if (by < 0) {
    let p = i - 1;
    while (p >= 0 && depths[p] > depths[i]) p--;
    if (p < 0 || depths[p] < depths[i]) p = lone && i > 0 && depths[i - 1] >= 0 && doc.blocks[i - 1].k !== 'li' ? i - 1 : -1;
    return p < 0 ? null : [{ op: 'move', at: i, n, to: p }];
  }
  if (end >= doc.blocks.length) return null;
  const next = depths[end] === depths[i] ? family(doc, end, depths) : lone && depths[end] >= 0 && doc.blocks[end].k !== 'li' ? end + 1 : -1;
  return next < 0 ? null : [{ op: 'move', at: i, n, to: next - n }];
}

/**
 * Put item i's family under item `to` (as its last child), or right after
 * `to`'s family at `to`'s level: a drag of one thing onto another. Null
 * when it makes no sense (onto itself or its own child); under a block that
 * is not an item means after it.
 */
export function placeFamily(doc: Doc, i: number, to: number, how: 'under' | 'after', depths = doc.blocks.map(depthOf)): Op[] | null {
  const end = family(doc, i, depths);
  if (to >= i && to < end) return null;
  const n = end - i;
  const rest: Doc = { head: doc.head, blocks: [...doc.blocks.slice(0, i), ...doc.blocks.slice(end)] };
  const restDepths = [...depths.slice(0, i), ...depths.slice(end)];
  const at = to < i ? to : to - n;
  if (!rest.blocks[at]) return null;
  if (how === 'under' && restDepths[at] < 0) how = 'after';
  const depth = how === 'under' ? restDepths[at] + 1 : Math.max(0, restDepths[at]);
  const d = depth - Math.max(0, depths[i]);
  const where = family(rest, at, restDepths);
  return [{ op: 'splice', at: i, n, blocks: doc.blocks.slice(i, end).map((b) => deeper(b, d)) }, { op: 'move', at: i, n, to: where }];
}

/** Take item i away; its family comes out a level to sit where it was. */
export function removeItem(doc: Doc, i: number, depths = doc.blocks.map(depthOf)): Op[] {
  const end = family(doc, i, depths);
  return [{ op: 'splice', at: i, n: end - i, blocks: doc.blocks.slice(i + 1, end).map((b) => deeper(b, -1)) }];
}

/** A rectangle of cells written at (r, c), the table given the rows it needs first: `rows` then `cells`. */
export function putCells(doc: Doc, at: number, r: number, c: number, values: string[][], force?: true): Op[] {
  const b = table(doc, at);
  const need = r + values.length - b.rows.length;
  return [...(need > 0 ? [{ op: 'rows', at, r: b.rows.length, n: need, rows: Array.from({ length: need }, () => []) } as Op] : []), { op: 'cells', at, r, c, values, ...(force ? { force } : {}) }];
}
