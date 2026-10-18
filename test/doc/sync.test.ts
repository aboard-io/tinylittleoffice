// Shared editing's properties (src/doc/sync.ts, docs/kernel.md §12): the first transformation property (TP1) for every
// pair of operations, by enumeration on small documents and by fast-check from the grammar's generators; several
// clients and a server, interleaved at random, ending with one document; and an undo transformed over what came
// after it, exact for every kind of op that nothing later touched. The clients and the undo run twice, with ops as the
// grammar makes them and with ops mostly on tables. Each fuzzed property runs 200 cases (2,000 under `npm run fuzz`);
// a failure names the shrunk case. The documents are compared by their writing.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import {
  apply,
  applyAll,
  applyEdits,
  Conflict,
  invert,
  parse,
  rebase,
  runLength,
  transform,
  write,
  type Block,
  type Doc,
  type Edit,
  type Op,
  type Ordered,
  type TableBlock,
} from '../../src/doc/index.ts';
import { arbitraryDoc, arbitraryOp, arbitraryTable, RUNS, sayableDoc } from './tlo-grammar.ts';

/** Long enough for RUNS cases of the slowest property. */
const LONG = Math.max(10_000, RUNS * 60);

/** A property held over RUNS cases; the message carries the shrunk case. */
function holds<T>(name: string, arb: fc.Arbitrary<T>, pred: (x: T) => void): void {
  const out = fc.check(
    fc.property(arb, (x) => (pred(x), true)),
    { numRuns: RUNS },
  );
  if (out.failed)
    throw new Error(
      `${name} fails for ${fc.stringify(out.counterexample?.[0])}\n(seed ${out.seed}, path ${out.counterexample ? out.counterexamplePath : ''})\n${out.errorInstance instanceof Error ? out.errorInstance.message : String(out.errorInstance)}`,
    );
}

/* ---------- the rule a shared document keeps, and how the orders are compared ---------- */

/** A document as the server holds a shared one (rule 3): no lock in its head. */
const shared = (d: Doc): Doc => {
  const head = { ...d.head };
  delete head.lock;
  return { head, blocks: d.blocks };
};
/** An op as the server lets one through: an op on the head's lock is refused, so a generated one names another key. */
const allowed = (op: Op): Op => (op.op === 'head' && op.key === 'lock' ? { ...op, key: 'note' } : op);
const sharedDoc = fc.oneof(arbitraryDoc(), arbitraryDoc(3)).map(shared);
const opOn = (d: Doc): fc.Arbitrary<Op> => arbitraryOp(d).map(allowed);

/**
 * An op on the blocks around the one `a` acts on (one before it to one after, or that block alone), as arbitraryOp makes
 * one there, put back in place: two ops at random seldom meet on one block, a text or a table, and these do.
 */
function near(d: Doc, a: Op): fc.Arbitrary<Op> {
  if (a.op === 'head' || !d.blocks.length) return opOn(d);
  const at = Math.min(a.at, d.blocks.length - 1);
  const around = (from: number, n: number) =>
    opOn({ head: d.head, blocks: d.blocks.slice(from, from + n) }).map((op) =>
      op.op === 'head' ? op : op.op === 'move' ? { ...op, at: op.at + from, to: op.to + from } : { ...op, at: op.at + from },
    );
  return fc.oneof(around(Math.max(0, at - 1), 3), around(at, 1));
}
/** An op on block k alone, a text's or a table's, as arbitraryOp makes one on that block. */
const onBlock = (d: Doc, k: number): fc.Arbitrary<Op> =>
  opOn({ head: d.head, blocks: [d.blocks[k]] })
    .filter((op) => op.op !== 'head' && op.op !== 'splice' && op.op !== 'move')
    .map((op) => ({ ...op, at: k }) as Op);
/** Two ops made against one document: the second at random or near the first, or both on one text or table. */
function twoOn(d: Doc): fc.Arbitrary<[Op, Op]> {
  const held = d.blocks.flatMap((b, k) => ('runs' in b || b.k === 'table' ? [k] : []));
  return fc.oneof(
    opOn(d).chain((a) => fc.oneof(opOn(d), near(d, a)).map((b): [Op, Op] => [a, b])),
    ...(held.length ? [fc.constantFrom(...held).chain((k) => fc.tuple(onBlock(d, k), onBlock(d, k)))] : []),
  );
}

/** A shared document with a table put in among its blocks. */
const tabled = fc
  .tuple(sharedDoc, arbitraryTable(), fc.nat())
  .map(([d, t, i]) => sayableDoc({ head: d.head, blocks: [...d.blocks.slice(0, i % (d.blocks.length + 1)), t, ...d.blocks.slice(i % (d.blocks.length + 1))] }));
/** An op on one of the document's tables three times in four, while it has one; else any op. */
function tableOp(d: Doc): fc.Arbitrary<Op> {
  const tables = d.blocks.flatMap((b, k) => (b.k === 'table' ? [k] : []));
  return tables.length ? fc.oneof({ weight: 3, arbitrary: fc.constantFrom(...tables).chain((k) => onBlock(d, k)) }, { weight: 1, arbitrary: opOn(d) }) : opOn(d);
}
/**
 * What the clients and the undo are fuzzed from: documents and ops as the grammar makes them, where few ops the server
 * appends are on tables; and documents with a table and ops mostly on tables, so that rows, columns and cells meet each
 * other in runs of ops carried over runs. `tables` is the least share of the appended ops on tables; `exact`, the least
 * share of undos checked exactly (later ops on a table mostly touch it), and the kinds of op (each group of them) whose
 * undo is checked exactly at least once over the property's cases.
 */
const MIXES = [
  { name: 'any op', docs: sharedDoc, op: opOn, tables: 0, exact: { share: 1 / 4, kinds: [['head'], ['text'], ['splice'], ['take out'], ['move']] } },
  { name: 'mostly table ops', docs: tabled, op: tableOp, tables: 1 / 4, exact: { share: 1 / 10, kinds: [['cells', 'rows', 'cols', 'col']] } },
];

/**
 * A document as text, its head's keys in one order: the head is a set of keys, and two keys put in at once are written
 * in the order each replica put them in (each replica's document is the server's order applied, so they never differ
 * in fact; two orders of one pair may).
 */
const text = (d: Doc): string => write({ head: Object.fromEntries(Object.entries(d.head).sort(([a], [b]) => (a < b ? -1 : 1))), blocks: d.blocks });

/** A range's rows and columns, from 0: [first row, first column, last row, last column]. */
type Box = [number, number, number, number];
type Axis = 'r' | 'c';

/** A formula's or a lock's ranges, and the rest of it with a mark where each was. */
function ranges(s: string): { rest: string; boxes: Box[] } {
  const boxes: Box[] = [];
  const col = (c: string) => c.toUpperCase().charCodeAt(0) - 65;
  const rest = s.replace(/\b([A-Za-z])(\d{1,4}):([A-Za-z])(\d{1,4})\b/g, (_, c0: string, r0: string, c1: string, r1: string) => {
    boxes.push([+r0 - 1, col(c0), +r1 - 1, col(c1)]);
    return '\u0001';
  });
  return { rest, boxes };
}

/** Whether two ranges are the same on the axis other than `axis` (their columns, for rows). */
const across = (u: Box, v: Box, axis: Axis): boolean => (axis === 'r' ? u[1] === v[1] && u[3] === v[3] : u[0] === v[0] && u[2] === v[2]);

/**
 * Rows (columns) one op put in at an edge of rows (columns) the other took out of the table at `at`: once both have
 * applied, in either order, the m put in lie at [p, p + m), where the rows taken out began.
 */
interface Edge {
  at: number;
  axis: Axis;
  p: number;
  m: number;
}

/** The edge where one op puts rows (columns) in at an edge of rows (columns) the other takes out of one table, or null. */
function atEdge(a: Op, b: Op): Edge | null {
  const lines = (o: Op) =>
    o.op === 'rows' ? { at: o.at, axis: 'r' as const, p: o.r, k: o.n, put: !!o.rows } : o.op === 'cols' ? { at: o.at, axis: 'c' as const, p: o.c, k: o.n, put: !!o.cols } : null;
  const [x, y] = [lines(a), lines(b)];
  if (!x || !y || x.at !== y.at || x.axis !== y.axis || x.put === y.put) return null;
  const [put, out] = x.put ? [x, y] : [y, x];
  return put.p === out.p || put.p === out.p + out.k ? { at: put.at, axis: put.axis, p: out.p, m: put.k } : null;
}

/**
 * Whether two ranges are what an edge leaves apart in the two orders (remapRefs and remapLock grow a range over rows
 * put in inside it and close it over rows taken out of its end, and the two do not commute there): the same on the
 * other axis and at one end, and at the end that lay in the rows taken out, one order's stops short of the rows put
 * in and the other's takes them in. A first row at p + m or p, a last at p - 1 or p + m - 1: exactly m apart.
 */
function edgeApart(u: Box, v: Box, e: Edge): boolean {
  const [s, t] = e.axis === 'r' ? [0, 2] : [1, 3];
  const two = (x: number, y: number, a: number, b: number) => (x === a && y === b) || (x === b && y === a);
  return across(u, v, e.axis) && ((u[s] === v[s] && two(u[t], v[t], e.p - 1, e.p + e.m - 1)) || (u[t] === v[t] && two(u[s], v[s], e.p, e.p + e.m)));
}

/**
 * Whether two documents differ only in ranges, in a table's formulas or its lock, each pair that differs one `apart`
 * allows (`k`, the table's index): the head, every other block, a table's columns, attributes and rows, and every
 * formula's words and single cells are the same.
 */
function rangesOnly(x: Doc, y: Doc, apart: (k: number, u: Box, v: Box) => boolean): boolean {
  const head = (d: Doc) => text({ head: d.head, blocks: [] });
  if (head(x) !== head(y) || x.blocks.length !== y.blocks.length) return false;
  return x.blocks.every((b, k) => {
    const c = y.blocks[k];
    if (write({ head: {}, blocks: [b] }) === write({ head: {}, blocks: [c] })) return true;
    if (b.k !== 'table' || c.k !== 'table' || b.rows.length !== c.rows.length) return false;
    const same = (s: string, z: string) => {
      const [one, two] = [ranges(s), ranges(z)];
      return one.rest === two.rest && one.boxes.length === two.boxes.length && one.boxes.every((u, i) => u.join() === two.boxes[i].join() || apart(k, u, two.boxes[i]));
    };
    const bare = (t: TableBlock) => JSON.stringify({ ...t, a: { ...t.a, kv: { ...t.a?.kv, lock: '' } }, rows: [] });
    const cell = (v: string, w: string) => v === w || (v.startsWith('=') && same(v, w));
    return bare(b) === bare(c) && same(b.a?.kv?.lock ?? '', c.a?.kv?.lock ?? '') && b.rows.every((row, r) => row.length === c.rows[r].length && row.every((v, i) => cell(v, c.rows[r][i])));
  });
}

/** A table pushed past Z, or left with no column (rule 2): what two ops can do together, and either order throws. */
const columns = (e: unknown): e is RangeError => e instanceof RangeError && /column/.test(e.message);

/** A transform, or 'cross' where it finds the two spans crossing (rule 1). */
function tried(a: Op, b: Op, side: 'left' | 'right'): Op | null | 'cross' {
  try {
    return transform(a, b, side);
  } catch (e) {
    if (e instanceof Conflict) return 'cross';
    throw e;
  }
}

/** The document after some ops (a null skipped), or the error a table's columns throw. */
function after(d: Doc, ops: (Op | null)[]): Doc | RangeError {
  try {
    return applyAll(
      d,
      ops.filter((o): o is Op => !!o),
    );
  } catch (e) {
    if (columns(e)) return e;
    throw e;
  }
}

/** Whether an op applies where it says, its block of its kind and its indices inside it (a rectangle of cells may run past the table). */
function fits(d: Doc, op: Op): boolean {
  const n = d.blocks.length;
  switch (op.op) {
    case 'head':
      return true;
    case 'splice':
      return op.at >= 0 && op.n >= 0 && op.at + op.n <= n;
    case 'move':
      return op.at >= 0 && op.n >= 0 && op.at + op.n <= n && op.to >= 0 && op.to <= n - op.n;
    case 'text': {
      const b = d.blocks[op.at];
      return !!b && 'runs' in b && op.from >= 0 && op.from <= op.to && op.to <= runLength(b.runs);
    }
    default: {
      const t = d.blocks[op.at];
      if (t?.k !== 'table') return false;
      if (op.op === 'cells') return op.r >= 0 && op.c >= 0;
      if (op.op === 'rows') return op.rows ? op.r >= 0 && op.r <= t.rows.length && op.n === op.rows.length : op.n >= 1 && op.r >= 0 && op.r + op.n <= t.rows.length;
      if (op.op === 'cols') return op.cols ? op.c >= 0 && op.c <= t.cols.length && op.n === op.cols.length : op.n >= 1 && op.c >= 0 && op.c + op.n <= t.cols.length;
      return op.c >= 0 && op.c < t.cols.length;
    }
  }
}

/** Whether `by` took away what `op` acts on: the only reason transform may give null. */
function takes(by: Op, op: Op): boolean {
  const within = (x: number, at: number, n: number) => x >= at && x < at + n;
  if (by.op === 'splice') {
    if (op.op === 'head') return false;
    if (op.op === 'splice') return op.n ? op.at >= by.at && op.at + op.n <= by.at + by.n : op.at > by.at && op.at < by.at + by.n;
    if (op.op === 'move') return op.at >= by.at && op.at + op.n <= by.at + by.n;
    return within(op.at, by.at, by.n);
  }
  if ((by.op !== 'rows' && by.op !== 'cols') || (by.op === 'rows' ? by.rows : by.cols) || !('at' in op) || op.at !== by.at) return false;
  const [p, k] = by.op === 'rows' ? [by.r, by.n] : [by.c, by.n];
  if (op.op === 'cells') return op.values.every((row, i) => row.every((_, j) => within(by.op === 'rows' ? op.r + i : op.c + j, p, k)));
  if (op.op === 'col') return by.op === 'cols' && within(op.c, p, k);
  if (op.op === 'rows' && by.op === 'rows') return op.rows ? op.r > p && op.r < p + k : op.r >= p && op.r + op.n <= p + k;
  if (op.op === 'cols' && by.op === 'cols') return op.cols ? op.c > p && op.c < p + k : op.c >= p && op.c + op.n <= p + k;
  return false;
}

/* ---------- the oracle for crossing spans: by brute force, whether any one op on each side meets ---------- */

/** A document of n paragraphs named 0 to n-1, and an op's own blocks renamed `tag`0, `tag`1…, so blocks are told apart by their words. */
const named = (n: number): Doc => ({ head: {}, blocks: Array.from({ length: n }, (_, i) => para(String(i))) });
const para = (t: string): Block => ({ k: 'p', runs: [{ t }] });
const names = (d: Doc): string[] => d.blocks.map((b) => ('runs' in b ? (b.runs[0]?.t ?? '') : '?'));
const tagged = (op: Op, tag: string): Op => (op.op === 'splice' ? { ...op, blocks: op.blocks.map((_, i) => para(tag + i)) } : op);

/** Whether f is p with one span of it moved. */
function oneMove(p: string[], f: string[]): boolean {
  if (p.length !== f.length) return false;
  let i = 0;
  let j = p.length - 1;
  while (i < p.length && p[i] === f[i]) i++;
  if (i === p.length) return true;
  while (p[j] === f[j]) j--;
  const w = p.slice(i, j + 1).join('\u0000');
  for (let k = 1; k <= j - i; k++) if ([...p.slice(i + k, j + 1), ...p.slice(i, i + k)].join('\u0000') === f.slice(i, j + 1).join('\u0000')) return true;
  return w === f.slice(i, j + 1).join('\u0000');
}
/** Whether f is p with one span replaced by blocks a transform knows (`known`: the two ops' own). */
function oneSplice(p: string[], f: string[], known: Set<string>): boolean {
  let s = 0;
  let e = 0;
  while (s < p.length && s < f.length && p[s] === f[s]) s++;
  while (e < p.length - s && e < f.length - s && p[p.length - 1 - e] === f[f.length - 1 - e]) e++;
  return f.slice(s, f.length - e).every((x) => known.has(x));
}
/** Every arrangement one splice (of known blocks) or one move makes of p. */
function* reach(p: string[], known: string[]): Generator<string[]> {
  yield p;
  const n = p.length;
  for (let at = 0; at < n; at++)
    for (let k = 1; at + k <= n; k++) {
      const span = p.slice(at, at + k);
      const rest = [...p.slice(0, at), ...p.slice(at + k)];
      for (let to = 0; to <= rest.length; to++) if (to !== at) yield [...rest.slice(0, to), ...span, ...rest.slice(to)];
    }
  const seqs: string[][] = [[]];
  for (let len = 1; len <= known.length; len++) for (const s of seqs.filter((x) => x.length === len - 1)) for (const x of known) if (!s.includes(x)) seqs.push([...s, x]);
  for (let at = 0; at <= n; at++) for (let k = 0; at + k <= n; k++) for (const s of seqs) yield [...p.slice(0, at), ...s, ...p.slice(at + k)];
}
/**
 * Whether one op after b and one after a (or none) bring a document of n blocks to one arrangement that does what the
 * two did: it keeps every block neither took out and none they did, keeps a moved span's own blocks together and in
 * order (among the document's own: blocks a splice put inside it may sit between them), and is not the document as it
 * was (two moves both undone).
 */
function canMeet(n: number, a: Op, b: Op): boolean {
  const [ta, tb] = [tagged(a, 'a'), tagged(b, 'b')];
  const d = named(n);
  const pa = names(apply(d, ta));
  const pb = names(apply(d, tb));
  const known = [...names({ head: {}, blocks: ta.op === 'splice' ? ta.blocks : [] }), ...names({ head: {}, blocks: tb.op === 'splice' ? tb.blocks : [] })];
  const set = new Set(known);
  const out = (o: Op, i: number) => o.op === 'splice' && i >= o.at && i < o.at + o.n;
  const own = (f: string[]) => f.filter((x) => !set.has(x));
  const kept = names(d)
    .filter((_, i) => !out(a, i) && !out(b, i))
    .join();
  const whole = (o: Op, f: string[]) => {
    if (o.op !== 'move') return true;
    const span = names(d)
      .slice(o.at, o.at + o.n)
      .filter((x) => f.includes(x));
    const at = f.indexOf(span[0]);
    return !span.length || f.slice(at, at + span.length).join() === span.join();
  };
  for (const f of reach(pb, known)) {
    const mine = own(f);
    if ([...mine].sort().join() !== kept.split(',').sort().join() || mine.join() === names(d).join() || !whole(a, mine) || !whole(b, mine)) continue;
    if (oneMove(pa, f) || oneSplice(pa, f, set)) return true;
  }
  return false;
}

/**
 * Whether two moves cross, told by moving blocks rather than by sync.ts's arithmetic: their spans share blocks and
 * neither holds the other, or they share none and each lands inside the other (one moved, the other's blocks are no
 * longer together, both ways).
 */
function movesCross(n: number, a: Op, b: Op): boolean {
  if (a.op !== 'move' || b.op !== 'move') return false;
  const d = named(n);
  const [sa, sb] = [names(d).slice(a.at, a.at + a.n), names(d).slice(b.at, b.at + b.n)];
  const shared = sa.filter((x) => sb.includes(x)).length;
  if (shared) return shared < sa.length && shared < sb.length;
  const split = (f: string[], span: string[]) => {
    const at = span.map((x) => f.indexOf(x)).sort((x, y) => x - y);
    return at[at.length - 1] - at[0] + 1 !== span.length;
  };
  return split(names(apply(d, a)), sb) && split(names(apply(d, b)), sa);
}

/**
 * TP1 for one pair, made against `d`: a then b-over-a is b then a-over-b. Null when it holds; else what fails. Both
 * transforms find the spans crossing or neither, and then the moves cross, or no one op on each side does what a splice
 * and a move did; each transformed op fits the document it applies to; a null is a removal; an order that throws for
 * a table's columns throws both ways; and the two documents are the same, but for ranges an edge leaves apart.
 */
function square(d: Doc, a: Op, b: Op): string | null {
  const ba = tried(b, a, 'right');
  const ab = tried(a, b, 'left');
  if ((ba === 'cross') !== (ab === 'cross')) return `one side finds them crossing: ${JSON.stringify([ba, ab])}`;
  if (ba === 'cross' || ab === 'cross') {
    if (a.op === 'move' && b.op === 'move') return movesCross(d.blocks.length, a, b) ? null : 'found crossing, but the moves do not cross';
    return canMeet(d.blocks.length, a, b) ? 'found crossing, but one op on each side does what both did' : null;
  }
  const da = apply(d, a);
  const db = apply(d, b);
  if (ba && !fits(da, ba)) return `b over a does not fit: ${JSON.stringify(ba)}`;
  if (ab && !fits(db, ab)) return `a over b does not fit: ${JSON.stringify(ab)}`;
  if (ba === null && !takes(a, b)) return 'b over a is null, though a took nothing of it';
  if (ab === null && !takes(b, a)) return 'a over b is null, though b took nothing of it';
  const one = after(d, [a, ba]);
  const two = after(d, [b, ab]);
  if (one instanceof Error || two instanceof Error) return one instanceof Error && two instanceof Error ? null : `one order throws: ${String(one instanceof Error ? one : two)}`;
  const [w1, w2] = [text(one), text(two)];
  const edge = atEdge(a, b);
  if (w1 === w2 || (edge && rangesOnly(one, two, (k, u, v) => k === edge.at && edgeApart(u, v, edge)))) return null;
  return `the orders differ:\n${w1}\n--- (b first)\n${w2}\nb over a: ${JSON.stringify(ba)}\na over b: ${JSON.stringify(ab)}`;
}

/** Every pair from two lists, each made against d: the failures, up to a few, each with its pair. */
function pairs(d: Doc, as: Op[], bs: Op[]): string[] {
  const out: string[] = [];
  for (const a of as)
    for (const b of bs) {
      const fail = square(d, a, b);
      if (fail && out.length < 5) out.push(`${JSON.stringify(a)} × ${JSON.stringify(b)}: ${fail}`);
    }
  return out;
}

/* ---------- every pair, on small documents ---------- */

/** Every splice (putting in none, one or two blocks named `tag`) and every move on a document of n blocks. */
function structural(n: number, tag: string): Op[] {
  const out: Op[] = [];
  for (let at = 0; at <= n; at++) for (let k = 0; at + k <= n; k++) for (const m of [0, 1, 2]) out.push({ op: 'splice', at, n: k, blocks: Array.from({ length: m }, (_, i) => para(tag + i)) });
  for (let at = 0; at < n; at++) for (let k = 1; at + k <= n; k++) for (let to = 0; to <= n - k; to++) out.push({ op: 'move', at, n: k, to });
  return out;
}

test('TP1 for every pair of splices and moves on a document of five blocks; a crossing found only for moves that cross, or where no pair of ops does what a splice and a move did', () => {
  const d = named(5);
  const as = structural(5, 'a');
  const bs = structural(5, 'b');
  expect(pairs(d, as, bs)).toStrictEqual([]);
  // A text op on a block meets every one of them too.
  const texts: Op[] = [0, 2, 4].map((at) => ({ op: 'text', at, from: 0, to: 1, runs: [{ t: 'w' }] }));
  expect(pairs(d, texts, bs)).toStrictEqual([]);
  expect(pairs(d, as, texts)).toStrictEqual([]);
}, 60_000);

test('TP1 for every pair of text ops on one block', () => {
  const d: Doc = { head: {}, blocks: [para('abcd'), para('z')] };
  const ops = (w: string): Op[] => {
    const out: Op[] = [];
    for (let from = 0; from <= 4; from++) for (let to = from; to <= 4; to++) for (const t of ['', w, w + w.toLowerCase()]) out.push({ op: 'text', at: 0, from, to, runs: t ? [{ t }] : [] });
    return out;
  };
  expect(pairs(d, ops('P'), ops('R'))).toStrictEqual([]);
});

test('TP1 for every pair of table ops on a table of three rows and three columns, formulas and all, with a lock and without', () => {
  const sheet = (lock: string) => parse(`| A:number | B | C |\n| --- | --- | --- |\n| 1 | =A1+B1 | =SUM(A1:A3) |\n| 2 | =A2*2 | =C1 |\n| 3 | x | =B3+A1 |\n${lock}\nAfter\n`);
  const ops = (w: string): Op[] => {
    const out: Op[] = [];
    for (let r = 0; r <= 3; r++) for (const rows of [[[`=A${r + 1}`, w, '=SUM(A1:C3)']], [[w], ['=B2', '', w]]]) out.push({ op: 'rows', at: 0, r, n: rows.length, rows });
    for (let r = 0; r < 3; r++) for (let k = 1; r + k <= 3; k++) out.push({ op: 'rows', at: 0, r, n: k });
    for (let c = 0; c <= 3; c++) out.push({ op: 'cols', at: 0, c, n: 1, cols: [{ name: w, type: 'text' }] });
    for (let c = 0; c < 3; c++) for (let k = 1; c + k <= 3 && k < 3; k++) out.push({ op: 'cols', at: 0, c, n: k });
    for (let c = 0; c < 3; c++) out.push({ op: 'col', at: 0, c, col: { name: w, type: 'number' } });
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        for (const values of [
          [[w]],
          [
            [w, '=A1'],
            ['=C3', w],
          ],
          [[`=B${r + 1}`, w]],
        ])
          for (const force of [false, true]) out.push({ op: 'cells', at: 0, r, c, values, ...(force ? { force: true as const } : {}) });
    return out;
  };
  expect(pairs(sheet(''), ops('p'), ops('q'))).toStrictEqual([]);
  // A locked range ends in rows and columns others take out, and its cells are written only when forced. The lock is
  // the table's only attribute, so rows or columns taken out that take all of it leave the table with none.
  const locked = sheet('{lock=A1:B2}\n');
  expect((locked.blocks[0] as TableBlock).a?.kv?.lock).toBe('A1:B2');
  expect(pairs(locked, ops('p'), ops('q'))).toStrictEqual([]);
}, 60_000);

/* ---------- fuzzed from the grammar ---------- */

test(
  'property: TP1 — a then b over a is b then a over b, for any two ops on any document',
  () => {
    holds(
      'TP1',
      sharedDoc.chain((d) => twoOn(d).map(([a, b]) => ({ d, a, b }))),
      ({ d, a, b }) => {
        const fail = square(d, a, b);
        expect(fail, JSON.stringify({ a, b })).toBeNull();
      },
    );
  },
  LONG,
);

/* ---------- clients and a server ---------- */

/** What the server tells a client: an edit it appended (to every client), or that it refused or dropped one (to its author). */
type Told = Ordered | { refused: string } | { dropped: string };
interface Client {
  name: string;
  /** The server's document as far as this client has been told, and its version. */
  known: Doc;
  version: number;
  /** What the client shows: the server's document with its pending ops applied. */
  view: Doc;
  /** Its own ops the server has not yet told back, in order; the first is with the server when `sent` is its id. */
  pending: { id: string; op: Op }[];
  sent: string | null;
  inbox: Told[];
  /** Every op its view has taken since it last started again, and its own among them, for undo. */
  seen: Op[];
  mine: { op: Op; before: Doc; at: number }[];
}

/**
 * Two to four clients and a server, from one document, under a random interleaving of four steps: a client makes an op
 * against its own view (or undoes one of its own: the op's inverse, from the view it was made against, rebased over
 * every op its view took after it); the server takes a client's next op, rebases it over everything appended after its
 * base, applies and appends it (or refuses it: rule 1 or 2), and tells every client; a client takes the server's next
 * message, its pending ops rebased over another's op. Then every queue drains. A client's ops come from `op`, or near
 * its last. Returns the clients, the server and counts of what happened.
 */
function simulate(d: Doc, g: fc.GeneratorValue, op: (d: Doc) => fc.Arbitrary<Op>) {
  const server = { doc: d, log: [] as Ordered[] };
  let count = 0;
  const clients: Client[] = Array.from({ length: g(fc.integer, { min: 2, max: 4 }) }, (_, i) => ({
    name: `c${i}`,
    known: d,
    version: 0,
    view: d,
    pending: [],
    sent: null,
    inbox: [],
    seen: [],
    mine: [],
  }));
  const stats = { made: 0, undone: 0, refused: 0, dropped: 0, startedAgain: 0, crossed: 0, ranges: 0, served: {} as Record<string, number> };
  const startAgain = (c: Client) => {
    Object.assign(c, { view: c.known, pending: [], sent: null, seen: [], mine: [] });
    stats.startedAgain++;
  };
  const make = (c: Client, ops: Op[]) => {
    for (const op of ops) {
      const before = c.view;
      c.view = apply(c.view, op);
      c.pending.push({ id: `${c.name}.${count++}`, op });
      c.mine.push({ op, before, at: c.seen.length });
      c.seen.push(op);
    }
  };
  const undo = (c: Client, k: number) => {
    if (!c.mine.length) return;
    const { op, before, at } = c.mine[k % c.mine.length];
    let back: Op[];
    try {
      back = rebase(invert(before, op), c.seen.slice(at + 1));
    } catch (e) {
      if (!(e instanceof Conflict)) throw e;
      stats.crossed++;
      return;
    }
    stats.undone++;
    make(c, back);
  };
  const serve = (c: Client) => {
    if (c.sent || !c.pending.length) return;
    const edit: Edit = { id: c.pending[0].id, author: c.name, base: c.version, op: c.pending[0].op };
    c.sent = edit.id;
    let op: Op | null;
    let doc = server.doc;
    try {
      op =
        rebase(
          [edit.op],
          server.log.slice(edit.base).map((e) => e.op),
        )[0] ?? null;
      if (op) doc = apply(doc, op);
    } catch (e) {
      if (!(e instanceof Conflict) && !columns(e)) throw e;
      stats.refused++;
      c.inbox.push({ refused: edit.id });
      return;
    }
    if (!op) {
      stats.dropped++;
      c.inbox.push({ dropped: edit.id });
      return;
    }
    stats.served[op.op] = (stats.served[op.op] ?? 0) + 1;
    const ordered: Ordered = { ...edit, op, seq: server.log.length + 1 };
    server.log.push(ordered);
    server.doc = doc;
    for (const k of clients) k.inbox.push(ordered);
  };
  const receive = (c: Client) => {
    const m = c.inbox.shift();
    if (!m) return;
    if ('refused' in m || 'dropped' in m) {
      const id = 'refused' in m ? m.refused : m.dropped;
      if (c.sent !== id) return; // it started again since, and let the op go
      c.sent = null;
      if ('refused' in m) startAgain(c);
      // A dropped op: the client's own rebase dropped it too, over the same ops.
      else expect(c.pending.map((p) => p.id)).not.toContain(id);
      return;
    }
    c.known = apply(c.known, m.op);
    c.version = m.seq;
    if (m.id === c.sent) {
      // Its own op, back: the server transformed it as the client's rebase did.
      expect(c.pending[0]).toStrictEqual({ id: m.id, op: m.op });
      c.pending.shift();
      c.sent = null;
      return;
    }
    try {
      let theirs: Op | null = m.op;
      const next: Client['pending'] = [];
      const edges = new Set<Axis>();
      for (const p of c.pending) {
        if (!theirs) {
          next.push(p);
          continue;
        }
        const edge = atEdge(p.op, theirs);
        if (edge) edges.add(edge.axis);
        const moved = transform(p.op, theirs, 'right');
        theirs = transform(theirs, p.op, 'left');
        if (moved) next.push({ ...p, op: moved });
      }
      expect(
        rebase(
          c.pending.map((p) => p.op),
          [m.op],
        ),
      ).toStrictEqual(next.map((p) => p.op));
      const view = applyAll(
        c.known,
        next.map((p) => p.op),
      );
      // TP1 along the way: the server's op carried over the pending ones and applied to the view is the same document,
      // but in ranges whose ends differ on an axis where it met rows (columns) put in at an edge of rows (columns)
      // taken out. (Ops after that edge carry the two ranges on, so how far apart they end is no longer the edge's.)
      const shown = theirs ? apply(c.view, theirs) : c.view;
      if (text(shown) !== text(view)) {
        expect(
          rangesOnly(shown, view, (_, u, v) => [...edges].some((axis) => across(u, v, axis))),
          `${text(shown)}\n---\n${text(view)}`,
        ).toBe(true);
        stats.ranges++;
      }
      Object.assign(c, { pending: next, view, seen: theirs ? [...c.seen, theirs] : c.seen });
    } catch (e) {
      if (!(e instanceof Conflict) && !columns(e)) throw e;
      stats.crossed++;
      startAgain(c);
    }
  };

  const steps = g(fc.integer, { min: 1, max: 40 });
  for (let s = 0; s < steps; s++) {
    const c = clients[g(fc.integer, { min: 0, max: clients.length - 1 })];
    const step = g(fc.constantFrom, 'make', 'make', 'make', 'serve', 'serve', 'receive', 'receive', 'receive', 'undo');
    if (step === 'make') {
      make(c, [g(() => fc.oneof(op(c.view), ...(c.seen.length ? [near(c.view, c.seen[c.seen.length - 1])] : [])))]);
      stats.made++;
    } else if (step === 'serve') serve(c);
    else if (step === 'receive') receive(c);
    else undo(c, g(fc.nat));
  }
  for (let round = 0; round < 1000; round++) {
    let busy = false;
    for (const c of clients) {
      while (c.inbox.length) [busy] = [true, receive(c)];
      if (!c.sent && c.pending.length) [busy] = [true, serve(c)];
    }
    if (!busy) break;
  }
  return { clients, server, stats };
}

for (const mix of MIXES)
  test(
    `property: two to four clients and a server, interleaved at random, end with one document (${mix.name})`,
    () => {
      const served: Record<string, number> = {};
      holds('convergence', fc.tuple(mix.docs, fc.gen()), ([d, g]) => {
        const { clients, server, stats } = simulate(d, g, mix.op);
        for (const [k, n] of Object.entries(stats.served)) served[k] = (served[k] ?? 0) + n;
        for (const c of clients) {
          expect(c.pending).toStrictEqual([]);
          expect(write(c.view)).toBe(write(server.doc));
          expect(write(c.known)).toBe(write(server.doc));
        }
        // The document is the first one with the server's edits applied in order.
        expect(write(applyEdits(d, server.log))).toBe(write(server.doc));
        expect(server.log.map((e) => e.seq)).toStrictEqual(server.log.map((_, i) => i + 1));
      });
      const all = Object.values(served).reduce((x, y) => x + y, 0);
      const tables = ['cells', 'rows', 'cols', 'col'].reduce((x, k) => x + (served[k] ?? 0), 0);
      expect(tables, JSON.stringify(served)).toBeGreaterThanOrEqual(all * mix.tables);
    },
    LONG,
  );

/* ---------- undo ---------- */

/** Ops made one after another from a document: one to four, each from `op` or near the one before. */
function editsOn(d: Doc, op: (d: Doc) => fc.Arbitrary<Op>): fc.Arbitrary<Op[]> {
  const step = (x: Doc, left: number, last: Op | null): fc.Arbitrary<Op[]> =>
    left ? (last ? fc.oneof(op(x), near(x, last)) : op(x)).chain((o) => step(apply(x, o), left - 1, o).map((rest) => [o, ...rest])) : fc.constant([]);
  return fc.integer({ min: 1, max: 4 }).chain((k) => step(d, k, null));
}

/** An op's kind as the undo property counts it: a splice that puts nothing in is one that only takes blocks out. */
const kind = (o: Op): string => (o.op === 'splice' && !o.blocks.length ? 'take out' : o.op);

/** Where a place between blocks is once `l` has applied; null where `l` leaves no one place for it (see untouched). */
function placeOver(g: number, l: Op): number | null {
  if (l.op === 'splice') {
    if (g < l.at || (g === l.at && l.n)) return g; // before it, or before the blocks it replaces
    if (g === l.at) return l.blocks.length ? null : g; // blocks put in at the place
    if (g < l.at + l.n) return l.blocks.length ? null : l.at; // the blocks either side taken out, and others put in
    return g + l.blocks.length - l.n;
  }
  if (l.op !== 'move' || !l.n || l.to === l.at) return g;
  if (g > l.at && g < l.at + l.n) return l.to + g - l.at; // inside the moved span: with it
  if (g === l.at || g === l.at + l.n) return null; // a block beside it moved away
  const r = g < l.at ? g : g - l.n;
  return r === l.to ? null : r < l.to ? r : r + l.n; // the span landed at it, or it stays among the rest
}

/**
 * The document an undo of `o` (made against d) gives back exactly when nothing after it touched what it changed, or
 * null when something did. The later ops are followed over the blocks, each known by its index in d (one put in gets
 * a new mark), and over the place between blocks that a splice taking blocks out, or a move, left:
 *   - a head's key: as it was, unless a later op set it.
 *   - an op on a block, or a splice that put blocks in: the blocks it acted on or replaced, as they were, where its own
 *     are now. Touched when a later op acted on one of its blocks, took one out, moved one, or put blocks in among them.
 *   - a splice that only took blocks out: they come back at the place it left. A move: its blocks, as the later ops
 *     left them, go back to the place it took them from. The place is touched when a later op put blocks in at it or
 *     moved a span there, moved a block beside it away (it was between two blocks no longer side by side), or took out
 *     the blocks on both sides of it and put others in (it is before those or after, and neither is the exact one).
 *     A move's blocks are touched when a later op took one out, put blocks in among them, or moved some apart or out
 *     of order; one may act on them, or move them all, and the undo takes them back as they are.
 */
function untouched(d: Doc, o: Op, later: Op[]): Doc | null {
  const end = applyAll(apply(d, o), later);
  if (o.op === 'head') {
    if (later.some((l) => l.op === 'head' && l.key === o.key)) return null;
    const head = { ...end.head };
    if (d.head[o.key] === undefined) delete head[o.key];
    else head[o.key] = d.head[o.key];
    return { head, blocks: end.blocks };
  }
  if (o.op === 'move' && (!o.n || o.to === o.at)) return end;
  let fresh = -1;
  /** The blocks' marks once `l` has applied. */
  const after = (ids: number[], l: Op): number[] => {
    if (l.op === 'splice') return [...ids.slice(0, l.at), ...l.blocks.map(() => fresh--), ...ids.slice(l.at + l.n)];
    if (l.op !== 'move') return ids;
    const rest = [...ids.slice(0, l.at), ...ids.slice(l.at + l.n)];
    return [...rest.slice(0, l.to), ...ids.slice(l.at, l.at + l.n), ...rest.slice(l.to)];
  };
  const first = d.blocks.map((_, i) => i);
  let ids = after(first, o);
  // The blocks to put back as they were (or, for a move, to take back), and the place blocks go back to.
  const marked = o.op === 'splice' ? ids.slice(o.at, o.at + o.blocks.length) : o.op === 'move' ? first.slice(o.at, o.at + o.n) : [o.at];
  let place = o.op === 'splice' && !o.blocks.length ? o.at : o.op === 'move' ? (o.at < o.to ? o.at : o.at + o.n) : null;
  const moving = o.op === 'move';
  const run = () => marked.map((m) => ids.indexOf(m));
  for (const l of later) {
    const at = run();
    if (l.op === 'splice' && (ids.slice(l.at, l.at + l.n).some((x) => marked.includes(x)) || (l.at > at[0] && l.at <= at[at.length - 1]))) return null;
    if (!moving && l.op === 'move' && ids.slice(l.at, l.at + l.n).some((x) => marked.includes(x))) return null;
    if (!moving && l.op !== 'head' && l.op !== 'splice' && l.op !== 'move' && marked.includes(ids[l.at])) return null;
    if (place !== null) {
      place = placeOver(place, l);
      if (place === null) return null;
    }
    ids = after(ids, l);
    const now = run();
    if (now.some((p, i) => p !== now[0] + i)) return null; // a move landed among them, or took some apart
  }
  const p = run()[0];
  if (o.op === 'move') {
    const rest = [...end.blocks.slice(0, p), ...end.blocks.slice(p + o.n)];
    const g = place! <= p ? place! : place! - o.n;
    return { head: end.head, blocks: [...rest.slice(0, g), ...end.blocks.slice(p, p + o.n), ...rest.slice(g)] };
  }
  if (o.op === 'splice' && place !== null) return { head: end.head, blocks: [...end.blocks.slice(0, place), ...d.blocks.slice(o.at, o.at + o.n), ...end.blocks.slice(place)] };
  const was = o.op === 'splice' ? d.blocks.slice(o.at, o.at + o.n) : [d.blocks[o.at]];
  return { head: end.head, blocks: [...end.blocks.slice(0, p), ...was, ...end.blocks.slice(p + marked.length)] };
}

for (const mix of MIXES)
  test(
    `property: an op undone under later ops (its inverse rebased over them) applies, and gives back exactly what it changed when nothing later touched it, for every kind of op (${mix.name})`,
    () => {
      const exact: Record<string, number> = {};
      holds(
        'undo',
        mix.docs.chain((d) => mix.op(d).chain((o) => editsOn(apply(d, o), mix.op).map((later) => ({ d, o, later })))),
        ({ d, o, later }) => {
          const now = applyAll(apply(d, o), later);
          let back: Op[];
          try {
            back = rebase(invert(d, o), later);
          } catch (e) {
            if (e instanceof Conflict) return;
            throw e;
          }
          const done = applyAll(now, back);
          const want = untouched(d, o, later);
          if (want) {
            exact[kind(o)] = (exact[kind(o)] ?? 0) + 1;
            expect(text(done)).toBe(text(want));
          }
        },
      );
      // Many cases are ones nothing later touched, which the property checks exactly, of each common kind of op.
      expect(Object.values(exact).reduce((x, y) => x + y, 0)).toBeGreaterThan(RUNS * mix.exact.share);
      for (const ks of mix.exact.kinds)
        expect(
          ks.reduce((x, k) => x + (exact[k] ?? 0), 0),
          `undos of ${ks.join(', ')} checked exactly: ${JSON.stringify(exact)}`,
        ).toBeGreaterThan(0);
    },
    LONG,
  );

/* ---------- the rules and the cases, each shown once ---------- */

/** Both orders of a pair made against d, as text: a then b over a, and b then a over b. */
const orders = (d: Doc, a: Op, b: Op): [string, string] => [
  write(
    applyAll(
      d,
      [a, transform(b, a, 'right')].filter((o): o is Op => !!o),
    ),
  ),
  write(
    applyAll(
      d,
      [b, transform(a, b, 'left')].filter((o): o is Op => !!o),
    ),
  ),
];

test('text: one word replaced by two people is the later one’s; a letter typed inside a word replaced first goes after the new word; a word replaced around a letter typed first takes it in', () => {
  const d = parse('one two three\n');
  const two = (t: string): Op => ({ op: 'text', at: 0, from: 4, to: 7, runs: [{ t }] });
  const typed: Op = { op: 'text', at: 0, from: 5, to: 5, runs: [{ t: 'X' }] };
  expect(orders(d, two('2'), two('II'))).toStrictEqual(['one II three\n', 'one II three\n']);
  expect(orders(d, two('2'), typed)).toStrictEqual(['one 2X three\n', 'one 2X three\n']);
  expect(orders(d, typed, two('II'))).toStrictEqual(['one II three\n', 'one II three\n']);
  // Two letters at one caret: the left one's first.
  expect(orders(d, { ...typed, runs: [{ t: 'L' }] }, typed)).toStrictEqual(['one tLXwo three\n', 'one tLXwo three\n']);
});

test('splices: two people splitting one paragraph (Enter) leave the later split; blocks put in where another took blocks out go after its own', () => {
  const d = parse('A\n\nBC\n\nD\n');
  const split = (at: number): Op => ({ op: 'splice', at: 1, n: 1, blocks: parse(`${'BC'.slice(0, at)}\n\n${'BC'.slice(at)}\n`).blocks });
  expect(orders(d, split(1), { op: 'splice', at: 1, n: 1, blocks: parse('# BC\n').blocks })).toStrictEqual(['A\n\n# BC\n\nD\n', 'A\n\n# BC\n\nD\n']);
  expect(orders(d, split(1), split(2))[0]).toBe(orders(d, split(1), split(2))[1]);
  // A typist's words in a paragraph another replaced go with it (an op on a block inside a span taken out is null).
  expect(transform({ op: 'text', at: 1, from: 2, to: 2, runs: [{ t: '!' }] }, split(1), 'right')).toBeNull();
});

test('a moved block takes the ops on it along; a splice inside a moved span goes with it', () => {
  const move: Op = { op: 'move', at: 0, n: 2, to: 1 };
  expect(transform({ op: 'text', at: 1, from: 0, to: 0, runs: [{ t: 'x' }] }, move, 'right')).toStrictEqual({ op: 'text', at: 2, from: 0, to: 0, runs: [{ t: 'x' }] });
  expect(transform({ op: 'splice', at: 1, n: 0, blocks: [para('new')] }, move, 'right')).toStrictEqual({ op: 'splice', at: 2, n: 0, blocks: [para('new')] });
  expect(transform(move, { op: 'splice', at: 1, n: 0, blocks: [para('new')] }, 'left')).toStrictEqual({ op: 'move', at: 0, n: 3, to: 1 });
});

test('cells: the same cell written by two is the later one’s, unless one is forced (an undo): that one’s, in either order and on a locked cell too', () => {
  const d = parse('| A | B |\n| --- | --- |\n| 1 | 2 |\n{lock=A1}\n');
  const put = (c: number, v: string, force?: true): Op => ({ op: 'cells', at: 0, r: 0, c, values: [[v]], ...(force ? { force } : {}) });
  const sheet = (a: string, b: string) => `A | B\n--- | ---\n${a} | ${b}\n{lock=A1}\n`;
  expect(orders(d, put(1, 'x'), put(1, 'y'))).toStrictEqual([sheet('1', 'y'), sheet('1', 'y')]);
  expect(orders(d, put(1, 'x', true), put(1, 'y'))).toStrictEqual([sheet('1', 'x'), sheet('1', 'x')]);
  expect(orders(d, put(0, 'x', true), put(0, 'y'))).toStrictEqual([sheet('x', '2'), sheet('x', '2')]);
  expect(orders(d, put(0, 'x'), put(0, 'y'))).toStrictEqual([sheet('1', '2'), sheet('1', '2')]);
  // A rectangle that loses a cell inside a row writes the winner's value there; a cell in a row taken out is dropped.
  expect(transform({ op: 'cells', at: 0, r: 0, c: 0, values: [['p', 'q', 'r']] }, put(1, 'y'), 'left')).toStrictEqual({ op: 'cells', at: 0, r: 0, c: 0, values: [['p', 'y', 'r']] });
  expect(transform(put(0, 'x'), { op: 'rows', at: 0, r: 0, n: 1 }, 'right')).toBeNull();
});

test('formulas carried by an op move as the table does: a cell written over rows put in above it', () => {
  const d = parse('| A:number | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |\n');
  const put: Op = { op: 'cells', at: 0, r: 1, c: 1, values: [['=A2+A1']] };
  const rows: Op = { op: 'rows', at: 0, r: 1, n: 1, rows: [['9', '9']] };
  expect(transform(put, rows, 'right')).toStrictEqual({ op: 'cells', at: 0, r: 2, c: 1, values: [['=A3+A1']] });
  expect(orders(d, put, rows)[0]).toBe(orders(d, put, rows)[1]);
});

test('rule 1: a splice and a move across each other, and two moves that cross, throw Conflict both ways; rebase passes it on', () => {
  const del: Op = { op: 'splice', at: 1, n: 2, blocks: [] };
  const move: Op = { op: 'move', at: 2, n: 1, to: 3 };
  expect(() => transform(del, move, 'right')).toThrow(Conflict);
  expect(() => transform(move, del, 'left')).toThrow(Conflict);
  expect(() => rebase([del], [move])).toThrow(Conflict);
  expect(() => transform({ op: 'move', at: 0, n: 2, to: 1 }, { op: 'move', at: 1, n: 2, to: 0 }, 'right')).toThrow(Conflict);
});

test('rule 2: two ops that together take out every column of a table throw where the second applies, in either order', () => {
  const d = parse('| A | B |\n| --- | --- |\n| 1 | 2 |\n');
  const [a, b]: Op[] = [
    { op: 'cols', at: 0, c: 0, n: 1 },
    { op: 'cols', at: 0, c: 1, n: 1 },
  ];
  expect(() => applyAll(d, [a, transform(b, a, 'right')!])).toThrow(/keeps a column/);
  expect(() => applyAll(d, [b, transform(a, b, 'left')!])).toThrow(/keeps a column/);
});

test('rule 3, the reason for it: rows put in a sheet’s first table move the head’s lock, and a lock set at once comes out different in the two orders', () => {
  const d = parse('---\nlock: A1:A2\n---\n| A |\n| --- |\n| 1 |\n| 2 |\n');
  const rows: Op = { op: 'rows', at: 0, r: 0, n: 1, rows: [['0']] };
  const lock: Op = { op: 'head', key: 'lock', value: 'A2' };
  const [one, two] = orders(d, rows, lock);
  expect([parse(one).head.lock, parse(two).head.lock]).toStrictEqual(['A2', 'A3']);
});

test('what TP1 leaves to the server’s order: a range ending in rows taken out, beside rows put in, ends as many rows apart as were put in; and the head’s keys in the order they were put in', () => {
  const d = parse('| A:number |\n| --- |\n| 1 |\n| 2 |\n| 3 |\n| =SUM(A1:A3) |\n');
  const [one, two] = orders(d, { op: 'rows', at: 0, r: 2, n: 1, rows: [['9']] }, { op: 'rows', at: 0, r: 2, n: 1 });
  expect([one.split('\n')[5], two.split('\n')[5]]).toStrictEqual(['| =SUM(A1:A3) |', '| =SUM(A1:A2) |']);
  const [three, four] = orders(d, { op: 'rows', at: 0, r: 1, n: 2, rows: [['9'], ['9']] }, { op: 'rows', at: 0, r: 1, n: 2 });
  expect([three.split('\n')[5], four.split('\n')[5]]).toStrictEqual(['| =SUM(A1:A3) |', '| =SUM(A1:A1) |']);
  expect(orders(parse('x\n'), { op: 'head', key: 'title', value: 'T' }, { op: 'head', key: 'by', value: 'B' })).toStrictEqual(['---\ntitle: T\nby: B\n---\nx\n', '---\nby: B\ntitle: T\n---\nx\n']);
});

test('rebase: a client’s pending ops over what the server appended since; applyEdits: a snapshot and the edits after it', () => {
  const d = parse('# Plan\n\nShip it.\n');
  const theirs: Op = { op: 'splice', at: 0, n: 0, blocks: parse('Intro\n').blocks };
  const mine: Op[] = [
    { op: 'text', at: 1, from: 8, to: 8, runs: [{ t: ' Soon.' }] },
    { op: 'head', key: 'title', value: 'Plan' },
  ];
  const moved = rebase(mine, [theirs]);
  expect(moved[0]).toStrictEqual({ op: 'text', at: 2, from: 8, to: 8, runs: [{ t: ' Soon.' }] });
  const log: Edit[] = [{ id: 'e1', author: 'assistant', base: 0, op: theirs }, ...moved.map((op, i) => ({ id: `e${i + 2}`, author: 'ann', base: 0, op }))];
  expect(write(applyEdits(d, log))).toBe('---\ntitle: Plan\n---\nIntro\n\n# Plan\n\nShip it. Soon.\n');
});
