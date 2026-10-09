// The editor's model maths, without a DOM: positions and offsets, every edit as ops, and the kernel's invert taking
// each of the editor's ops back exactly.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Block, type Doc } from '../src/doc/index.ts';
import { align, backspace, blockLength, caret, charAt, clampPos, forwardDelete, insertBlocks, insertRuns, kindAt, marksAt, ordered, runAt, runsDiff, setKind, setMark, shiftItems, shortcut, skipEmbed, sliceBlocks, smartQuote, splitAt, toggleMark, type Edit, type Sel } from '../src/kit/textops.ts';
import { rng } from './doc/helpers.ts';

const doc = (tlo: string): Doc => parse(tlo);
const blocks = (tlo: string): Block[] => doc(tlo).blocks;
const after = (b: Block[], e: Edit | null): Block[] => (e ? applyAll({ head: {}, blocks: b }, e.ops).blocks : b);
const tlo = (b: Block[]) => write({ head: {}, blocks: b });
const sel = (a: [number, number], f: [number, number] = a): Sel => ({ anchor: { block: a[0], offset: a[1] }, focus: { block: f[0], offset: f[1] } });

const B = blocks('# Head\n\nSome **bold** words :star: and^[a note] more.\n\n- a\n  - b\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```\n\nLast.\n');

test('positions: a chip and a line break count one; clamping; a caret on a card skips to words', () => {
  expect(blockLength(B[1])).toBe('Some bold words '.length + 1 + ' and'.length + 1 + ' more.'.length);
  expect(blockLength(B[4])).toBe(0);
  expect(clampPos(B, { block: 9, offset: 99 })).toEqual({ block: 5, offset: 5 });
  expect(skipEmbed(B, { block: 4, offset: 0 }, 1)).toEqual({ block: 5, offset: 0 });
  expect(skipEmbed(B, { block: 4, offset: 0 }, -1)).toEqual({ block: 3, offset: 1 });
  expect(ordered(sel([2, 1], [0, 3]))).toEqual([{ block: 0, offset: 3 }, { block: 2, offset: 1 }]);
  const runs = (B[1] as Extract<Block, { k: 'p' }>).runs;
  expect(runAt(runs, 5)).toMatchObject({ run: { t: 'bold', b: true }, start: 5, index: 1 });
  expect(charAt(runs, 16)).toBe('');
  expect(charAt(runs, 4)).toBe(' ');
  expect(marksAt(runs, 7)).toEqual({ b: true });
  expect(marksAt(runs, 5)).toEqual({});
  expect(marksAt(runs, 0)).toEqual({});
  expect(marksAt(runs, 17)).toEqual({});
});

test('typing: words go in with the marks in force; a selection across blocks joins them around what is typed', () => {
  const e = insertRuns(B, caret(1, 4), [{ t: 'X', b: true }]);
  expect(tlo(after(B, e).slice(1, 2))).toBe('Some**X** **bold** words :star: and^[a note] more.\n');
  expect(e.sel).toEqual(caret(1, 5));
  const across = insertRuns(B, sel([0, 2], [1, 4]), [{ t: '-' }]);
  const got = after(B, across);
  expect(got.length).toBe(B.length - 1);
  expect(tlo(got.slice(0, 1))).toBe('# He- **bold** words :star: and^[a note] more.\n');
});

test('Enter splits a block; a heading leaves a paragraph; an empty item leaves its list', () => {
  const e = splitAt(B, caret(1, 4));
  const got = after(B, e);
  expect(got[1]).toMatchObject({ k: 'p', runs: [{ t: 'Some' }] });
  expect(tlo(got.slice(2, 3))).toBe(' **bold** words :star: and^[a note] more.\n');
  expect(e.sel).toEqual(caret(2, 0));
  const h = after(B, splitAt(B, caret(0, 4)));
  expect(h[0]).toMatchObject({ k: 'h', level: 1 });
  expect(h[1]).toMatchObject({ k: 'p' });
  const items = blocks('- a\n  - \n');
  const out = after(items, splitAt(items, caret(1, 0)));
  expect(out[1]).toMatchObject({ k: 'li', depth: 0 });
  const p = after(out, splitAt(out, caret(1, 0)));
  expect(p[1]).toMatchObject({ k: 'p' });
});

test('Backspace: a character, a chip, an unlist, a join, an embed taken out, an exit', () => {
  expect(after(B, backspace(B, caret(1, 17), 'doc') as Edit)[1]).toMatchObject({ runs: [{ t: 'Some ' }, { t: 'bold', b: true }, { t: ' words  and' }, { t: '', fn: 'a note' }, { t: ' more.' }] });
  expect((after(B, backspace(B, caret(1, 1), 'doc') as Edit)[1] as Extract<Block, { k: 'p' }>).runs.slice(0, 2)).toEqual([{ t: 'ome ' }, { t: 'bold', b: true }]);
  const unlisted = after(B, backspace(B, caret(3, 0), 'doc') as Edit);
  expect(unlisted[3]).toMatchObject({ k: 'li', depth: 0 });
  const p = after(unlisted, backspace(unlisted, caret(3, 0), 'doc') as Edit);
  expect(p[3]).toMatchObject({ k: 'p' });
  const joined = backspace(B, caret(1, 0), 'doc') as Edit;
  expect(after(B, joined)[0]).toMatchObject({ k: 'h', level: 1 });
  expect(joined.sel).toEqual(caret(0, 4));
  const gone = backspace(B, caret(5, 0), 'doc') as Edit;
  expect(after(B, gone).map((b) => b.k)).toEqual(['h', 'p', 'li', 'li', 'p']);
  expect(gone.sel).toEqual(caret(4, 0));
  expect(backspace(B, caret(0, 0), 'doc')).toBeNull();
  expect(backspace(B, caret(0, 0), 'lines')).toBe('exit');
  expect(after(B, forwardDelete(B, caret(3, 1)))).toHaveLength(B.length - 1);
  expect(forwardDelete(B, caret(5, 5))).toBeNull();
});

test('marks over a selection: on unless every word has it, then off; links set and taken off; the selection stays', () => {
  const on = toggleMark(B, sel([1, 0], [1, 9]), 'b');
  expect((after(B, on)[1] as Extract<Block, { k: 'p' }>).runs[0]).toEqual({ t: 'Some bold', b: true });
  expect(on.sel).toEqual(sel([1, 0], [1, 9]));
  const off = toggleMark(after(B, on), sel([1, 0], [1, 9]), 'b');
  expect((after(after(B, on), off)[1] as Extract<Block, { k: 'p' }>).runs[0]).toEqual({ t: 'Some bold words ' });
  const linked = after(B, setMark(B, sel([1, 0], [1, 4]), 'href', 'https://x.y'));
  expect((linked[1] as Extract<Block, { k: 'p' }>).runs[0]).toEqual({ t: 'Some', href: 'https://x.y' });
  expect((after(linked, setMark(linked, sel([1, 0], [1, 4]), 'href', ''))[1] as Extract<Block, { k: 'p' }>).runs[0]).toEqual({ t: 'Some ' });
  // Across blocks: one op a block; chips are left as they are.
  const two = toggleMark(B, sel([0, 0], [1, 20]), 'i');
  expect(two.ops).toHaveLength(2);
  expect((after(B, two)[1] as Extract<Block, { k: 'p' }>).runs.find((r) => r.ic)).toEqual({ t: '', ic: 'star' });
});

test('kinds and alignment: heading, list on and off, title, indent within the rule, align classes', () => {
  expect(after(B, setKind(B, caret(1, 0), 'h2'))[1]).toMatchObject({ k: 'h', level: 2 });
  expect(kindAt(after(B, setKind(B, caret(1, 0), 'h2')), caret(1, 0))).toBe('h2');
  expect(after(B, setKind(B, caret(1, 0), 'ul'))[1]).toMatchObject({ k: 'li', depth: 0 });
  expect(after(B, setKind(B, caret(2, 0), 'ul'))[2]).toMatchObject({ k: 'p' });
  expect(after(B, setKind(B, caret(2, 0), 'ol'))[2]).toMatchObject({ k: 'li', ord: true });
  expect(after(B, setKind(B, caret(1, 0), 'title'))[1]).toMatchObject({ k: 'h', level: 1, a: { cls: ['title'] } });
  expect(kindAt(after(B, setKind(B, caret(1, 0), 'title')), caret(1, 0))).toBe('title');
  expect(shiftItems(B, caret(2, 0), 1)).toBeNull();
  expect(after(B, shiftItems(B, caret(3, 0), 1))[3]).toMatchObject({ depth: 1 });
  const flat = blocks('- a\n- b\n');
  expect(after(flat, shiftItems(flat, caret(1, 0), 1))[1]).toMatchObject({ depth: 1 });
  expect(shiftItems(flat, caret(0, 0), -1)).toBeNull();
  const c = after(B, align(B, caret(1, 0), 'center'));
  expect(c[1].a?.cls).toEqual(['center']);
  expect(after(c, align(c, caret(1, 0), 'left'))[1].a).toBeUndefined();
});

test('shortcuts and quotes: "- ", "1. ", "# " at a paragraph start; curly quotes by what comes before', () => {
  const p = blocks('-rest\n');
  expect(after(p, shortcut(p, caret(0, 1), 'doc'))[0]).toMatchObject({ k: 'li', depth: 0, runs: [{ t: 'rest' }] });
  const o = blocks('1.\n');
  expect(after(o, shortcut(o, caret(0, 2), 'lines'))[0]).toMatchObject({ k: 'li', ord: true });
  const h = blocks('\\##\n');
  expect(after(h, shortcut(h, caret(0, 2), 'doc'))[0]).toMatchObject({ k: 'h', level: 2 });
  expect(shortcut(h, caret(0, 2), 'lines')).toBeNull();
  expect(shortcut(p, caret(0, 1), 'line')).toBeNull();
  expect(shortcut(B, caret(1, 1), 'doc')).toBeNull();
  expect(smartQuote('"', '')).toBe('“');
  expect(smartQuote('"', 'a')).toBe('”');
  expect(smartQuote("'", ' ')).toBe('‘');
  expect(smartQuote("'", 'n')).toBe('’');
});

test('a paste of blocks: words join the block around the caret, the rest stand between; a lone paragraph is words', () => {
  const put = blocks('first\n\n## Mid\n\nlast\n');
  const e = insertBlocks(B, caret(5, 2), put);
  const got = after(B, e);
  expect(tlo(got.slice(5))).toBe('Lafirst\n\n## Mid\n\nlastst.\n');
  expect(e.sel).toEqual(caret(7, 4));
  const one = insertBlocks(B, caret(5, 0), blocks('words\n'));
  expect(one.ops[0].op).toBe('text');
  const card = insertBlocks(B, caret(5, 2), [B[4]]);
  expect(after(B, card).slice(5).map((b) => b.k)).toEqual(['p', 'fence', 'p']);
  expect(card.sel).toEqual(caret(7, 0));
});

test('sliceBlocks cuts the ends; runsDiff finds the one op between two runs', () => {
  expect(tlo(sliceBlocks(B, sel([0, 2], [1, 4])))).toBe('# ad\n\nSome\n');
  const from = [{ t: 'hello world' }];
  expect(runsDiff(0, from, [{ t: 'hello there world' }])).toEqual({ op: 'text', at: 0, from: 6, to: 6, runs: [{ t: 'there ' }] });
  expect(runsDiff(0, from, [{ t: 'hello' }])).toEqual({ op: 'text', at: 0, from: 5, to: 11, runs: [] });
  expect(runsDiff(0, from, [{ t: 'hello world' }])).toBeNull();
  expect(runsDiff(0, [{ t: 'a' }, { t: '', fn: 'n' }, { t: 'b' }], [{ t: 'a' }, { t: '', fn: 'n' }, { t: 'bc' }])).toEqual({ op: 'text', at: 0, from: 3, to: 3, runs: [{ t: 'c' }] });
});

test('invert takes every one of the editor edits back, over random documents and positions', () => {
  const r = rng(7);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  let d: Doc = { head: {}, blocks: B };
  for (let step = 0; step < 300; step++) {
    const textAt = d.blocks.map((b, i) => (b.k === 'h' || b.k === 'p' || b.k === 'li' || b.k === 'quote' ? i : -1)).filter((i) => i >= 0);
    if (!textAt.length) break;
    const i = pick(textAt);
    const j = pick(textAt);
    const s = sel([i, Math.floor(r() * (blockLength(d.blocks[i]) + 1))], [j, Math.floor(r() * (blockLength(d.blocks[j]) + 1))]);
    const [a] = ordered(s);
    const c = caret(a.block, a.offset);
    const kinds: (() => Edit | null | 'exit')[] = [
      () => insertRuns(d.blocks, s, [{ t: pick(['x', ' ', 'yz', '"']) }]),
      () => insertRuns(d.blocks, c, [{ t: '', fn: 'n' }]),
      () => splitAt(d.blocks, s),
      () => backspace(d.blocks, c, 'doc'),
      () => forwardDelete(d.blocks, c),
      () => toggleMark(d.blocks, s, pick(['b', 'i', 'u', 's', 'h'] as const)),
      () => setKind(d.blocks, s, pick(['p', 'h1', 'h2', 'title', 'ul', 'ol'] as const)),
      () => shiftItems(d.blocks, s, pick([1, -1] as const)),
      () => align(d.blocks, s, pick(['left', 'center', 'right', 'justify'] as const)),
      () => insertBlocks(d.blocks, s, blocks(pick(['a\n\nb\n', '## H\n\n- i\n', 'one\n']))),
    ];
    const e = pick(kinds)();
    if (!e || e === 'exit') continue;
    const next = applyAll(d, e.ops);
    const back = applyAll(next, invertAll(d, e.ops));
    expect(back).toStrictEqual(d);
    d = next;
  }
});
