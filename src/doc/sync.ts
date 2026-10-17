/**
 * Shared editing: several people, and programs, edit one document at once (docs/kernel.md §12). One server puts their
 * operations in one order. A client sends an operation with the version of the document it was made against; the
 * server transforms it over every operation appended since, appends it, and tells every client; a client transforms
 * its own operations the server has not yet told back over each one it is told of (rebase). Every replica applies the
 * server's order, so all end with one document; the transformation is what keeps an op meaning what its author meant
 * once others land before it. A single order asks one property of it, which test/doc/sync.test.ts holds for every pair
 * of ops: for a and b made against one document, a then transform(b, a, 'right') is b then transform(a, b, 'left').
 *
 * transform(a, b, side) is a as it applies once b has. `side` is a's place in the order: the server transforms an op it
 * receives as 'right' over each it appended after the op's version; a client transforms the server's op as 'left' over
 * its own. Where the two set one thing, the right one (the later) wins; where both put something in at one place, the
 * left one's comes first. Null means b took away what a acts on (its block, its rows, columns or cells, a move's
 * blocks, the blocks a splice replaces), and a is dropped. Blocks have no ids, so everything is by index: blocks,
 * characters (an icon or a footnote counts one), rows and columns.
 *
 *   head × head        another key: independent. The same key: the right's value stands, and the left becomes a write
 *                      of that value, which leaves the key as the right set it.
 *   an op on a block   (text, cells, rows, cols, col) × splice: after the splice's span it moves by the blocks put in
 *                      less those taken out; inside the span it is null (the block was taken out, or replaced).
 *                      × move: it follows its block. Ops on different blocks are independent.
 *   text × text        on one block. Each is a range [from, to) of characters replaced by its runs. The right op's ends
 *                      are carried over the left's: an end before the left's range stays, one after it shifts, one
 *                      strictly inside it goes to the left's new words (a start to their end, an end to their start),
 *                      one at an edge of it stays outside it, and a start where the left only inserted goes after what
 *                      it inserted. So the right op replaces the left's words when its range held the left's whole
 *                      range, and otherwise puts its words beside them with its range clipped to the characters still
 *                      there. The left op is what brings the other order to the same words: nothing (an empty op)
 *                      when the right's range held its own; else the characters of its range outside the right's,
 *                      with its words where the right op put them (before the right's, or after); and where those
 *                      characters lie on both sides of the right's words (the right's range strictly inside its own),
 *                      its range takes the right's words in and its runs put them back after its own. Two insertions
 *                      at one offset: the left's first. Disjoint ranges only shift.
 *   splice × splice    the same, over blocks: a splice is a range of blocks replaced by its blocks, and the left one
 *                      whose span the right's held is null.
 *   splice × move      a splice that only puts blocks in sits at a place between blocks: one inside the moved span goes
 *                      with it, one elsewhere (its edges too) stays among the rest, and where the span lands, side
 *                      decides. A splice that takes blocks out follows them: inside the moved span, with it; holding
 *                      the span where it lands among the splice's own blocks, as it was (and the move is null: its
 *                      blocks are gone); apart from it, as they close up and open again.
 *   move × splice      the moved span takes in what a splice put inside it and loses what one took out of it (null
 *                      when nothing is left); its target moves with the rest, and a splice putting blocks in where
 *                      the span lands: side decides.
 *   move × move        the same span: the right's target (the left does nothing). One span inside the other: the inner
 *                      goes with the outer, and the outer moves what is left of itself, or the whole when the inner
 *                      lands inside it. Apart: each follows the other's blocks; a span that lands inside the other's
 *                      goes along with it. A move that moves nothing moves nothing after anything.
 *   cells × cells      on one table, different cells: independent. The same cell: a forced write beats one that is not
 *                      (an undo is forced: invert in ops.ts), else the right wins; the loser drops the cell where it
 *                      ends a row of its rectangle and writes the winner's value where it does not.
 *   cells × rows/cols  the rectangle follows: rows or columns put in before it move it, put in inside it open a gap
 *                      (a row of nothing; a column of '', which a new column holds already); rows or columns taken out
 *                      drop their cells (null when none is left). Its formulas move as the table's do (remapRefs).
 *   rows × rows        as a splice of rows, except that rows put in strictly inside rows taken out are null (one op
 *   cols × cols        cannot take out rows on both sides of others), and the taking out grows over them. Two puts at
 *                      one place: the left's first. Rows put in carry their formulas as the table's move.
 *   rows × cols        rows put in follow the columns: a cell put in where a column is, taken out where one goes.
 *   col × cols         its column follows; null when it is taken out. col × col on one column: the right wins.
 *   force              on cells, kept.
 *
 * Two orders of one pair still differ in two places, which no transformation of the ops can reach: the head's keys,
 * written in the order they were put in (two keys put in at once, or one taken out while another sets it), and a range
 * in a formula or a table's lock that ends in rows (columns) one op takes out, beside rows (columns) the other puts in
 * at their edge: apply's remapping grows a range over rows put in inside it and closes it over rows taken out of its
 * end, the two do not commute there, and one order's range takes in the rows put in where the other's stops short of
 * them, that end apart by as many rows as were put in. What index transformation cannot know is left to rules the
 * server and its clients keep (docs/kernel.md §12):
 *
 *   1. Crossing spans. A splice that takes out some of a moved span's blocks and some others, or into whose span a
 *      moved span lands, and two moves whose spans overlap without one holding the other, or that each land inside the
 *      other, cannot be brought together by one op on each side: transform throws Conflict. The server refuses the
 *      later op and tells its author, whose client takes the server's document again and drops its pending ops.
 *   2. A table's columns. Two ops can together take out every column of a table, or put it past Z: the second throws
 *      where it is applied, in either order, and the server refuses it alike.
 *   3. No lock in the head. A sheet keeps its lock in the head for its first table, rows and columns move it there,
 *      and which table is first is the document's to say, not an op's: a shared document keeps its lock on its table's
 *      attributes, and the server refuses an op on the head's `lock`. The kernel has no check of this one: the
 *      server keeps it (rules 1 and 2 are transform's Conflict and apply's RangeError; rule 4 is the client's).
 *   4. The server's order is the document. A client keeps the server's document as far as it has been told (the
 *      ordered edits applied) and shows it with its pending ops applied (rebase); applying the server's op, transformed
 *      over its pending ones, to what it shows gives the same but for the two places above, so a client that does that
 *      takes the server's with its pending ops where they differ, and every client ends with the server's document.
 */
import { apply, runLength, type Op } from './ops.ts';
import type { Doc } from './model.ts';
import { movedIn, movedOut, remapRefs, stays, type Moved } from './table.ts';

/** An operation as a client sends it: who made it, and the version of the document (the count of ops before it) it was made against. */
export interface Edit {
  id: string;
  author: string;
  base: number;
  op: Op;
}
/** An edit as the server appended it, transformed to apply after everything before it: its place in the order, from 1. */
export type Ordered = Edit & { seq: number };

/** Two ops whose spans cross (rule 1 above): no one op on each side brings the two orders to one document. */
export class Conflict extends Error {
  constructor(a: Op, b: Op) {
    super(`a ${a.op} and a ${b.op} cross: the server refuses the later`);
    this.name = 'Conflict';
  }
}

type Side = 'left' | 'right';
type Of<K extends Op['op']> = Extract<Op, { op: K }>;
type Move = Of<'move'>;
type Splice = Of<'splice'>;
type Cells = Of<'cells'>;
type TableOp = Cells | Of<'rows'> | Of<'cols'> | Of<'col'>;

const KINDS = new Set(['head', 'splice', 'move', 'text', 'cells', 'rows', 'cols', 'col']);

/** `a` as it applies once `b` has, both made against one document; null when `b` took away what `a` acts on. Throws Conflict where their spans cross, and a TypeError for an op of no kind the kernel has. */
export function transform(a: Op, b: Op, side: Side): Op | null {
  for (const op of [a, b]) if (!op || typeof op !== 'object' || !KINDS.has(op.op)) throw new TypeError(`unknown op ${String((op as { op?: unknown } | null)?.op)}`);
  switch (b.op) {
    case 'head':
      return a.op === 'head' && a.key === b.key && side === 'left' ? { op: 'head', key: a.key, ...(b.value === undefined ? {} : { value: b.value }) } : a;
    case 'splice':
      if (a.op === 'head') return a;
      if (a.op === 'splice') return spliceOver(a, b, side);
      if (a.op === 'move') return moveOverSplice(a, b, side);
      return a.at < b.at ? a : a.at >= b.at + b.n ? { ...a, at: a.at + b.blocks.length - b.n } : null;
    case 'move':
      if (a.op === 'head') return a;
      if (a.op === 'splice') return spliceOverMove(a, b, side);
      if (a.op === 'move') return moveOverMove(a, b, side);
      return { ...a, at: blockTo(a.at, b) };
    case 'text':
      return a.op === 'text' && a.at === b.at ? textOver(a, b, side) : a;
    default:
      return a.op !== 'head' && a.op !== 'splice' && a.op !== 'move' && a.op !== 'text' && a.at === b.at ? overTable(a, b, side) : a;
  }
}

/**
 * Ops made one after another on a document (`mine`: a client's pending ops, an undo's) and others made on the same
 * document (`theirs`: the server's, in its order): mine as they apply after theirs, and theirs as they apply after
 * mine, to be carried on. Each of mine is transformed as 'right' over each of theirs, and theirs as 'left' over the
 * one of mine before it moves on to the next, so the later of mine meet it at the indices their own predecessors
 * left; one of mine that comes out null is dropped, and theirs still passes over it; one of theirs that comes out
 * null passes the rest unchanged, and is left out. Throws Conflict as transform does.
 */
export function cross(mine: Op[], theirs: Op[]): [Op[], Op[]] {
  const passed: Op[] = [];
  for (const op of theirs) {
    let t: Op | null = op;
    const next: Op[] = [];
    for (const p of mine) {
      if (!t) {
        next.push(p);
        continue;
      }
      const moved = transform(p, t, 'right');
      t = transform(t, p, 'left');
      if (moved) next.push(moved);
    }
    mine = next;
    if (t) passed.push(t);
  }
  return [mine, passed];
}

/** A client's pending ops (made one after another on its own view) once the server's ops (in the server's order) have been applied before them: `cross`'s first half. */
export const rebase = (pending: Op[], over: Op[]): Op[] => cross(pending, over)[0];

/** The document after the edits, in order: a snapshot and the ordered edits after it give the document now. */
export const applyEdits = (doc: Doc, edits: Edit[]): Doc => edits.reduce((d, e) => apply(d, e.op), doc);

/* ---------- ranges: characters in a block, blocks in a document ---------- */

/** A range [from, to) of a sequence replaced by `len` new items. */
interface Span {
  from: number;
  to: number;
  len: number;
}

/** The right op's range once the left's has been applied: its ends carried over the left's, as the header says. */
function rightOver(r: Span, l: Span): [number, number] {
  const shift = l.len - (l.to - l.from);
  const start = (p: number) => (p < l.from ? p : p === l.from ? (l.from === l.to ? p + l.len : p) : p < l.to ? l.from + l.len : p + shift);
  const end = (p: number) => (p <= l.from ? p : p < l.to ? l.from : p + shift);
  const s = start(r.from);
  return [s, Math.max(s, end(r.to))];
}

/**
 * The left op's range once the right's has been applied, to end where rightOver has the other order end: null when
 * the right's range held the left's (an insertion at its edge excepted); else the left's characters outside the
 * right's range, and `holds` when they lie on both sides of the right's new ones, which the range then takes in.
 */
function leftOver(l: Span, r: Span): { from: number; to: number; holds: boolean } | null {
  const insert = l.from === l.to;
  if (r.from <= l.from && l.to <= r.to && !(insert && (l.from === r.from || l.from === r.to))) return null;
  const shift = r.len - (r.to - r.from);
  // Where an end outside the right's range is once it has applied: at its start, before what it put in, unless it only
  // put something in and the left's range begins there (it went before the left's words).
  const at = (p: number) => (p < r.from || (p === r.from && !(r.from === r.to && !insert)) ? p : p + shift);
  const before = l.from < Math.min(l.to, r.from);
  const after = Math.max(l.from, r.to) < l.to;
  if (before && after) return { from: l.from, to: at(l.to), holds: true };
  if (before) return { from: l.from, to: Math.min(l.to, r.from), holds: false };
  if (after) return { from: at(Math.max(l.from, r.to)), to: at(l.to), holds: false };
  return { from: at(l.from), to: at(l.from), holds: false };
}

function textOver(a: Of<'text'>, b: Of<'text'>, side: Side): Of<'text'> {
  const sa = { from: a.from, to: a.to, len: runLength(a.runs) };
  const sb = { from: b.from, to: b.to, len: runLength(b.runs) };
  if (side === 'right') {
    const [from, to] = rightOver(sa, sb);
    return { ...a, from, to };
  }
  const l = leftOver(sa, sb);
  if (!l) return { ...a, from: b.from, to: b.from, runs: [] };
  return { ...a, from: l.from, to: l.to, runs: l.holds ? [...a.runs, ...b.runs] : a.runs };
}

function spliceOver(a: Splice, b: Splice, side: Side): Splice | null {
  const sa = { from: a.at, to: a.at + a.n, len: a.blocks.length };
  const sb = { from: b.at, to: b.at + b.n, len: b.blocks.length };
  if (side === 'right') {
    const [from, to] = rightOver(sa, sb);
    return { ...a, at: from, n: to - from };
  }
  const l = leftOver(sa, sb);
  if (!l) return null;
  return { ...a, at: l.from, n: l.to - l.from, blocks: l.holds ? [...a.blocks, ...b.blocks] : a.blocks };
}

/* ---------- moves ---------- */

/** A move that leaves every block where it was; transformed, it moves nothing. */
const still = (m: Move): boolean => m.n === 0 || m.to === m.at;
const nothing = (m: Move): Move => ({ ...m, at: 0, n: 0, to: 0 });

/** Where block i is once m has moved its span: a block of the span goes with it; the rest close up and open where it lands. */
function blockTo(i: number, m: Move): number {
  if (i >= m.at && i < m.at + m.n) return m.to + i - m.at;
  const r = i < m.at ? i : i - m.n;
  return r < m.to ? r : r + m.n;
}

/** Where a place between blocks is once m has moved its span: inside the span it goes with it; elsewhere, its edges too, it stays among the rest; where the span lands it is before the span when `first`. */
function placeTo(g: number, m: Move, first: boolean): number {
  if (g > m.at && g < m.at + m.n) return m.to + g - m.at;
  const r = g <= m.at ? g : g - m.n;
  return r < m.to || (r === m.to && first) ? r : r + m.n;
}

/** How a splice that takes blocks out sits against a move: inside the moved span, holding it where it lands among the splice's own blocks, apart from it, or across it. */
function relate(s: Splice, m: Move): 'inside' | 'holds' | 'apart' | 'across' {
  const end = s.at + s.n;
  if (s.at >= m.at && end <= m.at + m.n) return 'inside';
  if (m.at >= s.at && m.at + m.n <= end) return m.to >= s.at && m.to <= s.at + s.n - m.n ? 'holds' : 'across';
  if (end <= m.at || s.at >= m.at + m.n) {
    const r = s.at < m.at ? s.at : s.at - m.n;
    return m.to > r && m.to < r + s.n ? 'across' : 'apart';
  }
  return 'across';
}

function spliceOverMove(a: Splice, b: Move, side: Side): Splice {
  if (still(b)) return a;
  if (!a.n) return { ...a, at: placeTo(a.at, b, side === 'left') };
  switch (relate(a, b)) {
    case 'inside':
      return { ...a, at: b.to + a.at - b.at };
    case 'holds':
      return a;
    case 'apart':
      return { ...a, at: blockTo(a.at, b) };
    case 'across':
      throw new Conflict(a, b);
  }
}

function moveOverSplice(a: Move, b: Splice, side: Side): Move | null {
  if (still(a)) return nothing(a);
  const put = b.blocks.length;
  if (!b.n) {
    if (b.at > a.at && b.at < a.at + a.n) return { ...a, n: a.n + put };
    const r = b.at <= a.at ? b.at : b.at - a.n;
    return { ...a, at: b.at <= a.at ? a.at + put : a.at, to: r < a.to || (r === a.to && side === 'right') ? a.to + put : a.to };
  }
  switch (relate(b, a)) {
    case 'inside': {
      const n = a.n - b.n + put;
      return n ? { ...a, n } : null;
    }
    case 'holds':
      return null;
    case 'apart': {
      const r = b.at < a.at ? b.at : b.at - a.n;
      return { ...a, at: b.at < a.at ? a.at - b.n + put : a.at, to: a.to <= r ? a.to : a.to - b.n + put };
    }
    case 'across':
      throw new Conflict(a, b);
  }
}

function moveOverMove(a: Move, b: Move, side: Side): Move {
  if (still(a)) return nothing(a);
  if (still(b)) return a;
  const [a0, a1, b0, b1] = [a.at, a.at + a.n, b.at, b.at + b.n];
  if (a0 === b0 && a1 === b1) return { ...a, at: b.to, to: side === 'right' ? a.to : b.to };
  // a's span inside b's: it went with b, and its target, among the rest without it, follows b's remainder.
  if (a0 >= b0 && a1 <= b1) return { ...a, at: b.to + a0 - b0, to: placeTo(a.to, { ...b, n: b.n - a.n }, side === 'left') };
  if (b0 >= a0 && b1 <= a1) {
    // b's span inside a's: landed inside what is left of a's, a moves the whole; else what is left.
    const rest = a.n - b.n;
    if (b.to > a0 && b.to < a0 + rest) return a;
    const g = b.to <= a0 ? b.to : b.to - rest;
    return { ...a, at: b.to <= a0 ? a0 + b.n : a0, n: rest, to: a.to < g || (a.to === g && side === 'left') ? a.to : a.to + b.n };
  }
  if (a1 <= b0 || b1 <= a0) {
    const ar = a0 < b0 ? a0 : a0 - b.n;
    const br = b0 < a0 ? b0 : b0 - a.n;
    const bIn = b.to > ar && b.to < ar + a.n;
    if (bIn && a.to > br && a.to < br + b.n) throw new Conflict(a, b);
    if (bIn) return { ...a, at: blockTo(a0, b), n: a.n + b.n, to: a.to <= br ? a.to : a.to - b.n };
    return { ...a, at: blockTo(a0, b), to: placeTo(a.to, { ...b, at: br, to: b.to <= ar ? b.to : b.to - a.n }, side === 'left') };
  }
  throw new Conflict(a, b);
}

/* ---------- tables ---------- */

/** Rows or columns put in (k of them before p) or taken out ([p, p + k)). */
interface Lines {
  p: number;
  k: number;
  put: boolean;
}
const rowsOf = (o: Of<'rows'>): Lines => ({ p: o.r, k: o.rows ? o.rows.length : o.n, put: !!o.rows });
const colsOf = (o: Of<'cols'>): Lines => ({ p: o.c, k: o.cols ? o.cols.length : o.n, put: !!o.cols });

/** Lines `a` once lines `b` have been put in or taken out. */
function linesOver(a: Lines, b: Lines, side: Side): Lines | null {
  if (a.put && b.put) return a.p < b.p || (a.p === b.p && side === 'left') ? a : { ...a, p: a.p + b.k };
  if (a.put) return a.p <= b.p ? a : a.p >= b.p + b.k ? { ...a, p: a.p - b.k } : null;
  if (b.put) return b.p <= a.p ? { ...a, p: a.p + b.k } : b.p >= a.p + a.k ? a : { ...a, k: a.k + b.k };
  const lost = Math.max(0, Math.min(a.p + a.k, b.p + b.k) - Math.max(a.p, b.p));
  return lost === a.k ? null : { ...a, p: a.p < b.p ? a.p : Math.max(b.p, a.p - b.k), k: a.k - lost };
}

/** Formulas carried over lines put in or taken out, as apply moves the table's own (remapRefs). */
function remap(values: string[][], l: Lines, axis: 'r' | 'c'): string[][] {
  const moved: Moved = l.put ? movedIn(l.p, l.k) : movedOut(l.p, l.p + l.k - 1);
  const gone = l.put ? {} : axis === 'r' ? { rows: [l.p, l.p + l.k - 1] as [number, number] } : { cols: [l.p, l.p + l.k - 1] as [number, number] };
  return values.map((row) => row.map((v) => (axis === 'r' ? remapRefs(v, moved, stays, gone) : remapRefs(v, stays, moved, gone))));
}

const blank = (k: number): string[] => Array.from({ length: k }, () => '');
const some = (values: string[][]): boolean => values.some((row) => row.length);

/** A rectangle without its empty rows at either end. */
function trim(o: Cells): Cells {
  let { r, values } = o;
  while (values.length && !values[0].length) [r, values] = [r + 1, values.slice(1)];
  while (values.length && !values[values.length - 1].length) values = values.slice(0, -1);
  return { ...o, r, values };
}

function cellsOverLines(a: Cells, l: Lines, axis: 'r' | 'c'): Cells | null {
  let { r, c, values } = a;
  if (axis === 'r' && l.put) {
    if (l.p <= r) r += l.k;
    else if (l.p < r + values.length) values = [...values.slice(0, l.p - r), ...Array.from({ length: l.k }, (): string[] => []), ...values.slice(l.p - r)];
  } else if (axis === 'r') {
    values = values.filter((_, i) => r + i < l.p || r + i >= l.p + l.k);
    r = r < l.p ? r : Math.max(l.p, r - l.k);
  } else if (l.put) {
    if (l.p <= c) c += l.k;
    else values = values.map((row) => (l.p - c < row.length ? [...row.slice(0, l.p - c), ...blank(l.k), ...row.slice(l.p - c)] : row));
  } else {
    values = values.map((row) => row.filter((_, j) => c + j < l.p || c + j >= l.p + l.k));
    c = c < l.p ? c : Math.max(l.p, c - l.k);
  }
  if (some(a.values) && !some(values)) return null;
  return trim({ ...a, r, c, values: remap(values, l, axis) });
}

function cellsOverCells(a: Cells, b: Cells, side: Side): Cells {
  if (!a.force !== !b.force ? a.force : side === 'right') return a;
  const wrote = (r: number, c: number): string | undefined => (r >= b.r && c >= b.c ? b.values[r - b.r]?.[c - b.c] : undefined);
  const values = a.values.map((row, i) => {
    let end = row.length;
    while (end && wrote(a.r + i, a.c + end - 1) !== undefined) end--;
    return row.slice(0, end).map((v, j) => wrote(a.r + i, a.c + j) ?? v);
  });
  return trim({ ...a, values });
}

function overTable(a: TableOp, b: TableOp, side: Side): Op | null {
  switch (b.op) {
    case 'rows': {
      if (a.op === 'cells') return cellsOverLines(a, rowsOf(b), 'r');
      if (a.op !== 'rows') return a;
      const [la, lb] = [rowsOf(a), rowsOf(b)];
      const moved = linesOver(la, lb, side);
      if (!moved) return null;
      // Rows put in carry their formulas as the table's move once b, as it applies after them, has moved it.
      return a.rows ? { ...a, r: moved.p, n: moved.k, rows: remap(a.rows, linesOver(lb, la, side === 'left' ? 'right' : 'left')!, 'r') } : { ...a, r: moved.p, n: moved.k };
    }
    case 'cols': {
      const l = colsOf(b);
      if (a.op === 'cells') return cellsOverLines(a, l, 'c');
      if (a.op === 'rows') {
        if (!a.rows) return a;
        const rows = a.rows.map((row) => (l.put ? (l.p < row.length ? [...row.slice(0, l.p), ...blank(l.k), ...row.slice(l.p)] : row) : [...row.slice(0, l.p), ...row.slice(l.p + l.k)]));
        return { ...a, rows: remap(rows, l, 'c') };
      }
      if (a.op === 'cols') {
        const moved = linesOver(colsOf(a), l, side);
        return moved && { ...a, c: moved.p, n: moved.k };
      }
      if (l.put) return a.c >= l.p ? { ...a, c: a.c + l.k } : a;
      return a.c < l.p ? a : a.c >= l.p + l.k ? { ...a, c: a.c - l.k } : null;
    }
    case 'cells':
      return a.op === 'cells' ? cellsOverCells(a, b, side) : a;
    case 'col':
      return a.op === 'col' && a.c === b.c && side === 'left' ? { ...a, col: b.col } : a;
    default:
      throw new TypeError(`unknown op ${String((b as { op: unknown }).op)}`);
  }
}
