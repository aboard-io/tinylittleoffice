// Edits as operations: each primitive applies purely and shares what it did not touch; invert takes any of them
// back exactly, which a property test over random documents and operations holds to; the composed edits (Enter,
// Backspace, families of items) are lists of primitives.
import { expect, test } from 'vitest';
import {
  apply,
  applyAll,
  family,
  invert,
  invertAll,
  joinBlocks,
  moveFamily,
  parse,
  placeFamily,
  putCells,
  removeItem,
  replaceSpan,
  runLength,
  shiftFamily,
  sliceRuns,
  splitBlock,
  tableAt,
  write,
  type Block,
  type Column,
  type Doc,
  type Op,
  type Run,
} from '../../src/doc/index.ts';
import { rng } from './helpers.ts';

const DOC = parse(
  '---\ntitle: T\nlock: C1:C2\n---\n# Head\n\nSome **bold** words :star: and^[a note] more.\n\n- a\n  - b\n\nItem | Qty:number | Total:money\n--- | --- | ---\nPen | 2 | =B1*3\nInk | 1 | =SUM(B1:B2)+"B1"\n\n~ a -> b\n',
);

test('apply shares every block it did not touch', () => {
  const d = apply(DOC, { op: 'text', at: 1, from: 0, to: 4, runs: [{ t: 'Many' }] });
  expect(d.head).toBe(DOC.head);
  d.blocks.forEach((b, i) => (i === 1 ? expect(b).not.toBe(DOC.blocks[i]) : expect(b).toBe(DOC.blocks[i])));
  const h = apply(DOC, { op: 'head', key: 'title', value: 'U' });
  expect(h.blocks).toBe(DOC.blocks);
  const c = apply(DOC, { op: 'cells', at: 4, r: 0, c: 0, values: [['Pencil']] });
  c.blocks.forEach((b, i) => (i === 4 ? expect(b).not.toBe(DOC.blocks[i]) : expect(b).toBe(DOC.blocks[i])));
  // A cells op that changes nothing gives the document itself.
  expect(apply(DOC, { op: 'cells', at: 4, r: 0, c: 0, values: [['Pen']] })).toBe(DOC);
});

test('text: characters replaced by runs; an icon or a note counts one; runs merge as the parser would merge them', () => {
  const p = DOC.blocks[1] as Extract<Block, { k: 'p' }>;
  expect(runLength(p.runs)).toBe('Some bold words '.length + 1 + ' and'.length + 1 + ' more.'.length);
  expect(sliceRuns(p.runs, 5, 17)).toStrictEqual([{ t: 'bold', b: true }, { t: ' words ' }, { t: '', ic: 'star' }]);
  const d = apply(DOC, { op: 'text', at: 1, from: 4, to: 9, runs: [{ t: ' plain' }] });
  expect((d.blocks[1] as typeof p).runs).toStrictEqual([{ t: 'Some plain words ' }, { t: '', ic: 'star' }, { t: ' and' }, { t: '', fn: 'a note' }, { t: ' more.' }]);
  // Inserting at a position inside a run keeps the run's marks on both sides of what was put in.
  const e = apply(DOC, { op: 'text', at: 1, from: 7, to: 7, runs: [{ t: 'X', i: true }] });
  expect((e.blocks[1] as typeof p).runs.slice(0, 4)).toStrictEqual([{ t: 'Some ' }, { t: 'bo', b: true }, { t: 'X', i: true }, { t: 'ld', b: true }]);
  expect(() => apply(DOC, { op: 'text', at: 4, from: 0, to: 0, runs: [] })).toThrow(RangeError);
});

test('cells: a rectangle written, clipped to the table; a locked cell is left be unless forced', () => {
  const d = apply(DOC, {
    op: 'cells',
    at: 4,
    r: 0,
    c: 1,
    values: [
      ['5', '=B1*4', 'past the edge'],
      ['6', 'locked too'],
    ],
  });
  expect(tableAt(d, 4)!.rows).toStrictEqual([
    ['Pen', '5', '=B1*3'],
    ['Ink', '6', '=SUM(B1:B2)+"B1"'],
  ]);
  const f = apply(DOC, { op: 'cells', at: 4, r: 0, c: 2, values: [['=B1*4']], force: true });
  expect(tableAt(f, 4)!.rows[0][2]).toBe('=B1*4');
  // Past the last row nothing is written; putCells gives the table the rows first.
  expect(apply(DOC, { op: 'cells', at: 4, r: 5, c: 0, values: [['x']] })).toBe(DOC);
  const g = applyAll(DOC, putCells(DOC, 4, 3, 0, [['x', '', '=A1']]));
  expect(tableAt(g, 4)!.rows.slice(2)).toStrictEqual([
    ['', '', ''],
    ['x', '', '=A1'],
  ]);
});

test('rows: put in before r or taken out; formulas follow and so does the lock, in the header or on the table', () => {
  const d = apply(DOC, { op: 'rows', at: 4, r: 1, n: 1, rows: [['Tape', '3']] });
  expect(tableAt(d, 4)!.rows).toStrictEqual([
    ['Pen', '2', '=B1*3'],
    ['Tape', '3', ''],
    ['Ink', '1', '=SUM(B1:B3)+"B1"'],
  ]);
  expect(d.head.lock).toBe('C1:C3');
  const e = apply(DOC, { op: 'rows', at: 4, r: 0, n: 1 });
  expect(tableAt(e, 4)!.rows).toStrictEqual([['Ink', '1', '=SUM(B1:B1)+"B1"']]);
  expect(e.head.lock).toBe('C1');
  const gone = apply(DOC, { op: 'rows', at: 4, r: 0, n: 2 });
  expect(gone.head.lock).toBeUndefined();
  // A table that is not the document's first keeps its lock on itself.
  const two = parse('a | b\n--- | ---\n1 | 2\n\nx | y\n--- | ---\n=A2 | 4\n5 | 6\n{lock=A2}\n');
  const t = apply(two, { op: 'rows', at: 1, r: 0, n: 1, rows: [[]] });
  expect(t.blocks[1].a).toStrictEqual({ kv: { lock: 'A3' } });
  expect(tableAt(t, 1)!.rows).toStrictEqual([
    ['', ''],
    ['=A3', '4'],
    ['5', '6'],
  ]);
  expect(t.blocks[0]).toBe(two.blocks[0]);
  // A lock that is a table's only attribute goes with the last rows it covered, and leaves no other row locked.
  const only = parse('Intro\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n{lock=A1:B1}\n');
  const left = apply(only, { op: 'rows', at: 1, r: 0, n: 1 });
  expect(left.blocks[1].a).toBeUndefined();
  expect(tableAt(left, 1)!.lock).toStrictEqual([]);
  expect(write(left)).not.toContain('lock');
});

test('cols: put in (given, before c) or taken out; cells, names, types and the lock move together, and formulas follow', () => {
  const wider = apply(DOC, { op: 'cols', at: 4, c: 1, n: 1, cols: [{ name: '', type: 'text' }] });
  const t = tableAt(wider, 4)!;
  expect(t.cols.map((c) => c.type)).toStrictEqual(['text', 'text', 'number', 'money']);
  expect(t.rows).toStrictEqual([
    ['Pen', '', '2', '=C1*3'],
    ['Ink', '', '1', '=SUM(C1:C2)+"B1"'],
  ]);
  expect(wider.head.lock).toBe('D1:D2');
  expect(write(wider)).toContain('Item |  | Qty:number | Total:money\n--- | --- | --- | ---\nPen |  | 2 | =C1*3\n');
  const back = apply(wider, { op: 'cols', at: 4, c: 1, n: 1 });
  expect(back.blocks[4]).toStrictEqual(DOC.blocks[4]);
  expect(back.head).toStrictEqual(DOC.head);
  // A column gone that formulas used: #REF; a range loses what it lost.
  const noB = apply(DOC, { op: 'cols', at: 4, c: 1, n: 1 });
  expect(tableAt(noB, 4)!.rows).toStrictEqual([
    ['Pen', '=#REF*3'],
    ['Ink', '=SUM(#REF)+"B1"'],
  ]);
  expect(apply(parse('a | b | c | d\n--- | --- | --- | ---\n1 | 2 | 3 | =SUM(A1:C1)\n'), { op: 'cols', at: 0, c: 1, n: 1 }).blocks[0]).toMatchObject({ rows: [['1', '3', '=SUM(A1:B1)']] });
  // A lock that is a table's only attribute goes with the last column it covered.
  const only = apply(parse('Intro\n\n| A | B |\n|---|---|\n| 1 | 2 |\n{lock=A1:A1}\n'), { op: 'cols', at: 1, c: 0, n: 1 });
  expect(only.blocks[1].a).toBeUndefined();
  expect(write(only)).not.toContain('lock');
  expect(() => apply(DOC, { op: 'cols', at: 4, c: 0, n: 3 })).toThrow(RangeError);
  expect(() => apply(DOC, { op: 'cols', at: 4, c: 0, n: 24, cols: Array.from({ length: 24 }, (): Column => ({ name: '', type: 'text' })) })).toThrow(RangeError);
  const named = apply(DOC, { op: 'col', at: 4, c: 1, col: { name: 'Count', type: 'number' } });
  expect(tableAt(named, 4)!.cols[1]).toStrictEqual({ name: 'Count', type: 'number' });
});

test('invert: every primitive is taken back exactly; invertAll takes back a list', () => {
  const ops: Op[] = [
    { op: 'head', key: 'title', value: 'New' },
    { op: 'head', key: 'lock' },
    { op: 'splice', at: 1, n: 2, blocks: [{ k: 'hr' }] },
    { op: 'move', at: 2, n: 2, to: 0 },
    { op: 'text', at: 1, from: 2, to: 20, runs: [{ t: 'a' }, { t: '', ic: 'x' }] },
    { op: 'cells', at: 4, r: 0, c: 0, values: [['A', 'B', 'C', 'D'], ['E']] },
    { op: 'rows', at: 4, r: 1, n: 2, rows: [['x'], ['y', '=A1']] },
    { op: 'rows', at: 4, r: 0, n: 2 },
    { op: 'cols', at: 4, c: 2, n: 1 },
    {
      op: 'cols',
      at: 4,
      c: 0,
      n: 2,
      cols: [
        { name: 'N', type: 'name' },
        { name: '', type: 'text' },
      ],
    },
    { op: 'col', at: 4, c: 0, col: { name: 'Item', type: 'rich' } },
  ];
  for (const op of ops) expect(applyAll(apply(DOC, op), invert(DOC, op)), op.op).toStrictEqual(DOC);
  expect(applyAll(applyAll(DOC, ops.slice(0, 3)), invertAll(DOC, ops.slice(0, 3)))).toStrictEqual(DOC);
});

/** A random document: words with marks, icons, notes and line breaks; a table of formulas with a lock in the header; a second table with its own lock. */
function randomDoc(r: () => number): Doc {
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const words = ['one', 'two words', ' ', 'x\ny', '5 * 3', 'snake_case', 'https://e.com/a'];
  const run = (): Run => {
    if (r() < 0.1) return { t: '', ic: 'star' };
    if (r() < 0.1) return { t: '', fn: pick(words) };
    const x: Run = { t: pick(words) };
    for (const f of ['b', 'i', 'u', 's', 'h'] as const) if (r() < 0.2) x[f] = true;
    if (r() < 0.15) x.href = 'https://x.y/';
    return x;
  };
  const text = () => Array.from({ length: 1 + Math.floor(r() * 4) }, run);
  const cell = () => pick(['', '1', '2.5', 'words', '=A1+B2', '=SUM(A1:B3)', '=C2*2', '="B1"&A1', '=nothing']);
  const table = (cols: number, rows: number): Block => ({
    k: 'table',
    cols: Array.from({ length: cols }, (_, c): Column => ({ name: pick(['', 'Name', 'Qty']) + c, type: pick(['text', 'number', 'money', 'name']) })),
    rows: Array.from({ length: rows }, () => Array.from({ length: cols }, cell)),
  });
  const blocks: Block[] = [];
  for (let k = 0; k < 2 + r() * 5; k++) {
    const kind = pick(['h', 'p', 'li', 'quote', 'hr', 'table', 'fence']);
    if (kind === 'h') blocks.push({ k: 'h', level: 2, runs: text() });
    if (kind === 'p') blocks.push({ k: 'p', runs: text() });
    if (kind === 'li') blocks.push({ k: 'li', depth: Math.floor(r() * 3), runs: text(), ...(r() < 0.3 ? { done: r() < 0.5 } : {}) });
    if (kind === 'quote') blocks.push({ k: 'quote', runs: text() });
    if (kind === 'hr') blocks.push({ k: 'hr' });
    if (kind === 'table') blocks.push(table(1 + Math.floor(r() * 4), Math.floor(r() * 5)));
    if (kind === 'fence') blocks.push({ k: 'fence', lang: 'sheet', body: 'a | b' });
  }
  blocks.push({ k: 'p', runs: text() });
  blocks.push(table(2 + Math.floor(r() * 3), 1 + Math.floor(r() * 4)));
  blocks.push({ ...table(3, 3), a: { kv: { lock: pick(['A1', 'B1:C2', 'A1:A3, C3']) } } });
  // Runs as the parser leaves them: merged where the marks agree, so a text op's inverse lands on the same runs.
  const doc: Doc = { head: { title: 'T', ...(r() < 0.7 ? { lock: pick(['A1', 'B1:C2', 'A1:A3, C3', 'C1']) } : {}) }, blocks };
  return parse(write(doc));
}

/** A random operation that applies to `doc`. */
function randomOp(doc: Doc, r: () => number): Op {
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const n = doc.blocks.length;
  const tables = doc.blocks.map((b, i) => (b.k === 'table' ? i : -1)).filter((i) => i >= 0);
  const texts = doc.blocks.map((b, i) => ('runs' in b ? i : -1)).filter((i) => i >= 0);
  const at = pick(tables);
  const t = doc.blocks[at] as Extract<Block, { k: 'table' }>;
  const cell = () => pick(['', '9', '=A1', '=SUM(A1:C9)', 'w']);
  switch (pick(['head', 'splice', 'move', 'text', 'text', 'cells', 'cells', 'rows', 'rows', 'cols', 'cols', 'col'])) {
    case 'head':
      return { op: 'head', key: pick(['title', 'lock', 'new']), value: pick([undefined, 'x', 'A1:B2']) };
    case 'splice': {
      const a = Math.floor(r() * (n + 1));
      return { op: 'splice', at: a, n: Math.floor(r() * (n - a + 1)), blocks: r() < 0.5 ? [] : [{ k: 'p', runs: [{ t: 'new' }] }, { k: 'hr' }] };
    }
    case 'move': {
      const a = Math.floor(r() * n);
      const len = 1 + Math.floor(r() * (n - a));
      return { op: 'move', at: a, n: len, to: Math.floor(r() * (n - len + 1)) };
    }
    case 'text': {
      const i = pick(texts);
      const len = runLength((doc.blocks[i] as Extract<Block, { k: 'p' }>).runs);
      const from = Math.floor(r() * (len + 1));
      const to = from + Math.floor(r() * (len - from + 1));
      const runs: Run[] = r() < 0.3 ? [] : [pick([{ t: 'ins' }, { t: 'B', b: true }, { t: '', ic: 'x' }, { t: '', fn: 'n' }, { t: 'a\nb' }])];
      return { op: 'text', at: i, from, to, runs };
    }
    case 'cells':
      return {
        op: 'cells',
        at,
        r: Math.floor(r() * (t.rows.length + 1)),
        c: Math.floor(r() * (t.cols.length + 1)),
        values: Array.from({ length: 1 + Math.floor(r() * 3) }, () => Array.from({ length: 1 + Math.floor(r() * 3) }, cell)),
        ...(r() < 0.5 ? { force: true as const } : {}),
      };
    case 'rows': {
      const rr = Math.floor(r() * (t.rows.length + 1));
      if (r() < 0.5 || !t.rows.length) return { op: 'rows', at, r: rr, n: 1, rows: Array.from({ length: 1 + Math.floor(r() * 2) }, () => Array.from({ length: t.cols.length }, cell)) };
      const rm = Math.floor(r() * t.rows.length);
      return { op: 'rows', at, r: rm, n: 1 + Math.floor(r() * (t.rows.length - rm)) };
    }
    case 'cols': {
      const c = Math.floor(r() * (t.cols.length + 1));
      if (r() < 0.5 || t.cols.length < 2) return { op: 'cols', at, c, n: 1, cols: [{ name: 'N', type: pick(['text', 'number', 'name']) }] };
      const rm = Math.floor(r() * t.cols.length);
      return { op: 'cols', at, c: rm, n: 1 + Math.floor(r() * (t.cols.length - rm - 1)) };
    }
    default:
      return { op: 'col', at, c: Math.floor(r() * t.cols.length), col: { name: 'Renamed', type: 'date' } };
  }
}

test('property: apply then invert gives the document back, over random documents and operations, remaps and locks included', () => {
  const r = rng(23);
  let counts: Record<string, number> = {};
  for (let i = 0; i < 1500; i++) {
    const doc = randomDoc(r);
    const op = randomOp(doc, r);
    counts[op.op] = (counts[op.op] ?? 0) + 1;
    const after = apply(doc, op);
    expect(applyAll(after, invert(doc, op)), JSON.stringify(op)).toStrictEqual(doc);
    // What one op touches is one block; everything else keeps its identity (a head op touches none).
    if (op.op === 'head') expect(after.blocks).toBe(doc.blocks);
    else if (op.op !== 'splice' && op.op !== 'move') after.blocks.forEach((b, k) => k !== op.at && expect(b).toBe(doc.blocks[k]));
    // And the document still writes as text.
    expect(typeof write(after)).toBe('string');
  }
  // Every kind of op was tried.
  expect(Object.keys(counts).sort()).toStrictEqual(['cells', 'col', 'cols', 'head', 'move', 'rows', 'splice', 'text']);
});

test('splitBlock and joinBlocks: Enter and Backspace as splices', () => {
  const d = parse('# Head\n\nSome **bold** words\n\n- [ ] task one\n1. step\n');
  expect(applyAll(d, splitBlock(d, 1, 7)).blocks.slice(1, 3)).toStrictEqual([
    { k: 'p', runs: [{ t: 'Some ' }, { t: 'bo', b: true }] },
    { k: 'p', runs: [{ t: 'ld', b: true }, { t: ' words' }] },
  ]);
  expect(applyAll(d, splitBlock(d, 0, 4)).blocks.slice(0, 2)).toStrictEqual([
    { k: 'h', level: 1, runs: [{ t: 'Head' }] },
    { k: 'p', runs: [] },
  ]);
  expect(applyAll(d, splitBlock(d, 2, 4)).blocks.slice(2, 4)).toStrictEqual([
    { k: 'li', depth: 0, done: false, runs: [{ t: 'task' }] },
    { k: 'li', depth: 0, done: false, runs: [{ t: ' one' }] },
  ]);
  expect(applyAll(d, splitBlock(d, 3, 4)).blocks.slice(3)).toStrictEqual([
    { k: 'li', depth: 0, ord: true, runs: [{ t: 'step' }] },
    { k: 'li', depth: 0, ord: true, runs: [] },
  ]);
  expect(applyAll(d, joinBlocks(d, 1)).blocks[0]).toStrictEqual({ k: 'h', level: 1, runs: [{ t: 'HeadSome ' }, { t: 'bold', b: true }, { t: ' words' }] });
  expect(joinBlocks(d, 0)).toStrictEqual([]);
  expect(joinBlocks(parse('a | b\n--- | ---\n\nx\n'), 1)).toStrictEqual([]);
  expect(applyAll(d, replaceSpan(d, 0, 2, [{ k: 'hr' }])).blocks.map((b) => b.k)).toStrictEqual(['hr', 'li', 'li']);
});

const OUTLINE = parse('- Launch\n  - Product {.from}\n    - Pricing\n  - Marketing\n  - Ops\n\n~ Pricing -> Marketing: feeds\n');
const shape = (d: Doc) => d.blocks.map((b) => (b.k === 'li' ? '  '.repeat(b.depth) + b.runs[0].t : b.k)).join('|');

test("family: where an item's family ends; a block that is no item has none, and ends one", () => {
  expect(family(OUTLINE, 0)).toBe(5);
  expect(family(OUTLINE, 1)).toBe(3);
  expect(family(OUTLINE, 3)).toBe(4);
  expect(family(OUTLINE, 5)).toBe(6);
  // A fence under an item says its depth, and belongs to the family.
  const withDoc = parse('- A\n  - B\n\n```sheet {depth=2}\nx | y\n```\n\n    - C {depth=2}\n  - D {depth=1}\n- E\n');
  expect(family(withDoc, 1)).toBe(4);
  expect(family(withDoc, 0)).toBe(5);
});

test('shiftFamily: indent and bring out an item with its family; at most one deeper than the item above, never past the margin', () => {
  expect(shape(applyAll(OUTLINE, shiftFamily(OUTLINE, 1, -1)!))).toBe('Launch|Product|  Pricing|  Marketing|  Ops|edge');
  expect(shiftFamily(OUTLINE, 1, 1)).toBeNull();
  expect(shape(applyAll(OUTLINE, shiftFamily(OUTLINE, 3, 1)!))).toBe('Launch|  Product|    Pricing|    Marketing|  Ops|edge');
  expect(shiftFamily(OUTLINE, 0, -1)).toBeNull();
  expect(shiftFamily(OUTLINE, 0, 1)).toBeNull();
  expect(shiftFamily(OUTLINE, 5, 1)).toBeNull();
  // The attributes travel with the item.
  expect(applyAll(OUTLINE, shiftFamily(OUTLINE, 1, -1)!).blocks[1].a).toStrictEqual({ cls: ['from'] });
  // A fence that says its depth is shifted with its family.
  const withDoc = parse('- A\n  - B\n\n```sheet {depth=2}\nx | y\n```\n');
  expect(applyAll(withDoc, shiftFamily(withDoc, 1, -1)!).blocks[2].a).toStrictEqual({ kv: { depth: '1' } });
});

test('moveFamily: past the family before or after at the same level, as one move; a lone item steps past a heading, never its parent', () => {
  expect(moveFamily(OUTLINE, 1, 1)).toStrictEqual([{ op: 'move', at: 1, n: 2, to: 2 }]);
  expect(shape(applyAll(OUTLINE, moveFamily(OUTLINE, 1, 1)!))).toBe('Launch|  Marketing|  Product|    Pricing|  Ops|edge');
  expect(shape(applyAll(OUTLINE, moveFamily(OUTLINE, 3, -1)!))).toBe('Launch|  Marketing|  Product|    Pricing|  Ops|edge');
  expect(moveFamily(OUTLINE, 0, -1)).toBeNull();
  expect(moveFamily(OUTLINE, 0, 1)).toBeNull();
  expect(moveFamily(OUTLINE, 4, 1)).toBeNull();
  expect(moveFamily(OUTLINE, 2, -1)).toBeNull();
  // In a lines app the depths count heading levels, and a lone line crosses into the section before.
  const site = parse('# S1\n\n- a\n\n# S2\n\n- b\n');
  const depths = [0, 1, 0, 1];
  expect(write(applyAll(site, moveFamily(site, 3, -1, depths)!))).toBe('# S1\n\n- a\n- b\n\n# S2\n');
  expect(write(applyAll(site, moveFamily(site, 1, 1, depths)!))).toBe('# S1\n\n# S2\n\n- a\n- b\n');
});

test('placeFamily: under another item as its last child, or after its family at its level; not onto itself or its child', () => {
  expect(shape(applyAll(OUTLINE, placeFamily(OUTLINE, 4, 1, 'under')!))).toBe('Launch|  Product|    Pricing|    Ops|  Marketing|edge');
  expect(shape(applyAll(OUTLINE, placeFamily(OUTLINE, 1, 4, 'after')!))).toBe('Launch|  Marketing|  Ops|  Product|    Pricing|edge');
  expect(shape(applyAll(OUTLINE, placeFamily(OUTLINE, 4, 0, 'after')!))).toBe('Launch|  Product|    Pricing|  Marketing|Ops|edge');
  expect(placeFamily(OUTLINE, 1, 2, 'after')).toBeNull();
  expect(placeFamily(OUTLINE, 1, 1, 'under')).toBeNull();
  // Under a block that is no item means after it.
  expect(shape(applyAll(OUTLINE, placeFamily(OUTLINE, 3, 5, 'under')!))).toBe('Launch|  Product|    Pricing|  Ops|edge|Marketing');
});

test('removeItem: the item goes and its family comes out a level', () => {
  expect(shape(applyAll(OUTLINE, removeItem(OUTLINE, 1)))).toBe('Launch|  Pricing|  Marketing|  Ops|edge');
  expect(shape(applyAll(OUTLINE, removeItem(OUTLINE, 0)))).toBe('Product|  Pricing|Marketing|Ops|edge');
  expect(shape(applyAll(OUTLINE, removeItem(OUTLINE, 5)))).toBe('Launch|  Product|    Pricing|  Marketing|  Ops');
});
