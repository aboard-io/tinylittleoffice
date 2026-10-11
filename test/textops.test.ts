// The editor's model maths, without a DOM: positions and offsets, every edit as ops, and the kernel's invert taking
// each of the editor's ops back exactly.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Block, type Doc } from '../src/doc/index.ts';
import {
  align,
  backspace,
  blockLength,
  caret,
  charAt,
  clampPos,
  forwardDelete,
  insertBlocks,
  insertRuns,
  kindAt,
  marksAt,
  marksOf,
  moveItems,
  ordered,
  runAt,
  runsDiff,
  setKind,
  setMark,
  shiftItems,
  shortcut,
  skipEmbed,
  sliceBlocks,
  smartQuote,
  splitAt,
  toggleMark,
  wholeSel,
  type Edit,
  type Sel,
} from '../src/kit/textops.ts';
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
  expect(ordered(sel([2, 1], [0, 3]))).toEqual([
    { block: 0, offset: 3 },
    { block: 2, offset: 1 },
  ]);
  const runs = (B[1] as Extract<Block, { k: 'p' }>).runs;
  expect(runAt(runs, 5)).toMatchObject({ run: { t: 'bold', b: true }, start: 5, index: 1 });
  expect(charAt(runs, 16)).toBe('');
  expect(charAt(runs, 4)).toBe(' ');
  expect(marksAt(runs, 7)).toEqual({ b: true });
  expect(marksAt(runs, 5)).toEqual({});
  expect(marksAt(runs, 0)).toEqual({});
  expect(marksAt(runs, 17)).toEqual({});
  // Over a range: the marks every selected word has.
  expect(marksOf(B, sel([1, 5], [1, 9]))).toEqual({ b: true });
  expect(marksOf(B, sel([1, 0], [1, 9]))).toEqual({});
  expect(marksOf(B, caret(1, 7))).toEqual({ b: true });
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
  // (The space after the split is the second half's, and the link says it: "\ ".)
  expect(tlo(got.slice(2, 3))).toBe('\\ **bold** words :star: and^[a note] more.\n');
  expect(e.sel).toEqual(caret(2, 0));
  const h = after(B, splitAt(B, caret(0, 4)));
  expect(h[0]).toMatchObject({ k: 'h', level: 1 });
  expect(h[1]).toMatchObject({ k: 'p' });
  // At a heading's start: an empty paragraph above, the heading the same block, the caret still at its start.
  const top = splitAt(B, caret(0, 0));
  expect(after(B, top).slice(0, 2)).toEqual([{ k: 'p', runs: [] }, B[0]]);
  expect(after(B, top)[1]).toBe(B[0]);
  expect(top.sel).toEqual(caret(1, 0));
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

test('a join that meets an empty block: the empty one goes, the words keep their kind and their block; with words in both the first keeps its kind', () => {
  const title: Block = { k: 'h', level: 1, runs: [{ t: 'Title' }], a: { cls: ['title'] } };
  const b: Block[] = [{ k: 'p', runs: [] }, title, { k: 'p', runs: [] }];
  // Delete at the end of the empty line above: the line goes, the title is the same block.
  const del = forwardDelete(b, caret(0, 0))!;
  expect(after(b, del)).toEqual([title, { k: 'p', runs: [] }]);
  expect(after(b, del)[0]).toBe(title);
  expect(del.sel).toEqual(caret(0, 0));
  // Backspace at the title's start does the same.
  const back = backspace(b, caret(1, 0), 'doc') as Edit;
  expect(after(b, back)[0]).toBe(title);
  expect(back.sel).toEqual(caret(0, 0));
  // Delete at the title's end into the empty line under it, and Backspace from that line: the line goes, the caret at the title's end.
  expect(after(b, forwardDelete(b, caret(1, 5)))).toEqual([{ k: 'p', runs: [] }, title]);
  const up = backspace(b, caret(2, 0), 'doc') as Edit;
  expect(after(b, up)[1]).toBe(title);
  expect(up.sel).toEqual(caret(1, 5));
  // Words in both: the block before keeps its kind, as ever.
  const two = blocks('Para\n\n# Head\n');
  expect(tlo(after(two, backspace(two, caret(1, 0), 'doc') as Edit))).toBe('ParaHead\n');
  expect(tlo(after(two, forwardDelete(two, caret(0, 4))))).toBe('ParaHead\n');
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
});

test('a block of several lines made a heading is its first line, the lines after it a paragraph, and the caret follows', () => {
  // The letter's address: a paragraph of three lines with {.right}; a heading is one line, so the rest stay a paragraph with every break.
  const L = blocks('Mara Quill\nHarbor Studio\nPortland {.right}\n\nDear Ms Okafor\n');
  const e = setKind(L, sel([0, 15]), 'h1');
  const out = after(L, e);
  expect(out.map((b) => b.k)).toEqual(['h', 'p', 'p']);
  expect(tlo(out)).toBe('# Mara Quill {.right}\n\nHarbor Studio\nPortland {.right}\n\nDear Ms Okafor\n');
  expect(e.sel).toEqual(sel([1, 4]));
  // A caret in the first line stays; a caret in a block after the split is one block further on.
  expect(setKind(L, sel([0, 3]), 'h2').sel).toEqual(sel([0, 3]));
  expect(setKind(L, sel([0, 3], [1, 2]), 'title').sel).toEqual(sel([0, 3], [2, 2]));
  // Back to a paragraph, or to a list, nothing splits.
  expect(after(L, setKind(L, sel([0, 15]), 'ul')).map((b) => b.k)).toEqual(['li', 'p']);
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
  expect(
    after(B, card)
      .slice(5)
      .map((b) => b.k),
  ).toEqual(['p', 'fence', 'p']);
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
  const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
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

test('moveItems: an item with its family past the neighbouring family at its level; never out of its parent nor past a paragraph', () => {
  const b = blocks('- a\n- b\n  - c\n- d\n\nafter\n');
  const down = moveItems(b, sel([1, 1]), 1)!;
  expect(tlo(after(b, down))).toBe('- a\n- d\n- b\n  - c\n\nafter\n');
  expect(down.sel).toEqual(sel([2, 1]));
  const up = moveItems(b, sel([1, 0]), -1)!;
  expect(tlo(after(b, up))).toBe('- b\n  - c\n- a\n- d\n\nafter\n');
  expect(up.sel).toEqual(sel([0, 0]));
  // A child moves among its siblings only: c has none.
  expect(moveItems(b, sel([2, 0]), -1)).toBeNull();
  expect(moveItems(b, sel([2, 0]), 1)).toBeNull();
  // The last item does not cross the paragraph; a paragraph does not move.
  expect(moveItems(b, sel([3, 0]), 1)).toBeNull();
  expect(moveItems(b, sel([4, 0]), -1)).toBeNull();
  // Several items selected go together; the same blocks, only in another order (one splice, invertible).
  const two = moveItems(b, sel([0, 0], [1, 1]), 1)!;
  expect(tlo(after(b, two))).toBe('- d\n- a\n- b\n  - c\n\nafter\n');
  expect(applyAll(applyAll({ head: {}, blocks: b }, two.ops), invertAll({ head: {}, blocks: b }, two.ops)).blocks).toEqual(b);
});

test('the "> " shortcut makes a quote in a doc (not in lines); setKind takes quote and gives it back as a paragraph', () => {
  const b = blocks('>rest\n');
  const q = shortcut(b, sel([0, 1]), 'doc')!;
  expect(after(b, q)[0]).toEqual({ k: 'quote', runs: [{ t: 'rest' }] });
  expect(shortcut(b, sel([0, 1]), 'lines')).toBeNull();
  const p = blocks('words\n');
  const made = after(p, setKind(p, sel([0, 0]), 'quote'));
  expect(made[0].k).toBe('quote');
  expect(kindAt(made, sel([0, 0]))).toBe('quote');
  expect(after(made, setKind(made, sel([0, 0]), 'quote'))[0].k).toBe('p');
});

test('Backspace on an empty item with children takes it away and lifts them a level; Enter at the end of a parent makes a first child', () => {
  const b = blocks('- a\n-\n  - b\n    - c\n- d\n');
  const e = backspace(b, sel([1, 0]), 'doc');
  expect(e && e !== 'exit' && tlo(after(b, e))).toBe('- a\n- b\n  - c\n- d\n');
  expect(e && e !== 'exit' && e.sel).toEqual(sel([0, 1]));
  // First in the editor: the caret goes to the first child's start.
  const top = blocks('-\n  - b\n');
  const t2 = backspace(top, sel([0, 0]), 'doc');
  expect(t2 && t2 !== 'exit' && tlo(after(top, t2))).toBe('- b\n');
  expect(t2 && t2 !== 'exit' && t2.sel).toEqual(sel([0, 0]));
  // Without children an empty item still comes out of its list first.
  const lone = blocks('- a\n-\n');
  const l2 = backspace(lone, sel([1, 0]), 'doc');
  expect(l2 && l2 !== 'exit' && after(lone, l2)[1]).toEqual({ k: 'p', runs: [] });
  const parent = blocks('1. a\n   1. b\n');
  const split = after(parent, splitAt(parent, sel([0, 1])));
  expect(split.map((x) => (x.k === 'li' ? x.depth : -1))).toEqual([0, 1, 1]);
  expect(split[1]).toEqual({ k: 'li', depth: 1, ord: true, runs: [] });
  // In the middle, or with no children, a sibling as before.
  expect(after(parent, splitAt(parent, sel([1, 1]))).map((x) => (x.k === 'li' ? x.depth : -1))).toEqual([0, 1, 1]);
  const flat = blocks('- a\n- b\n');
  expect(after(flat, splitAt(flat, sel([0, 1]))).map((x) => (x.k === 'li' ? x.depth : -1))).toEqual([0, 0, 0]);
});

test('the whole document selected (Select All): an edit over it takes the cards at its ends too and leaves one paragraph', () => {
  const W = blocks('![a](https://example.com/a.png)\n\n# Head\n\nWords.\n\nA | B\n--- | ---\n1 | 2\n');
  const all = wholeSel(W);
  expect(all).toEqual(sel([0, 0], [3, 0]));
  expect(after(W, deleteSelOf(W))).toEqual([{ k: 'p', runs: [] }]);
  expect(after(W, insertRuns(W, all, [{ t: 'x' }]))).toEqual([{ k: 'p', runs: [{ t: 'x' }] }]);
  expect(insertRuns(W, all, [{ t: 'x' }]).sel).toEqual(caret(0, 1));
  expect(tlo(after(W, insertBlocks(W, all, blocks('# One\n\nTwo\n'))))).toBe('# One\n\nTwo\n');
  expect(after(W, splitAt(W, all))).toEqual([
    { k: 'p', runs: [] },
    { k: 'p', runs: [] },
  ]);
  // The words alone, a heading first, selected end to end: a paragraph is what is left there too.
  const H = blocks('# Head\n\nWords.\n');
  expect(after(H, insertRuns(H, wholeSel(H), []))).toEqual([{ k: 'p', runs: [] }]);
  // Within one block, the block keeps its kind.
  expect(tlo(after(H, insertRuns(H, sel([0, 0], [0, 4]), [])))).toBe('#\n\nWords.\n');
  // Every one of these is taken back by the kernel's invert.
  for (const e of [deleteSelOf(W), insertRuns(W, all, [{ t: 'x' }]), splitAt(W, all)]) {
    const d = { head: {}, blocks: W };
    expect(applyAll(applyAll(d, e.ops), invertAll(d, e.ops))).toEqual(d);
  }
});
const deleteSelOf = (b: Block[]) => backspace(b, wholeSel(b), 'doc') as Edit;

test('a linked word is words, not a thing from the web: its marks show the link, and pasted into words it goes in as words', () => {
  // A link alone on a line is a thing from the web (model.ts webOf); a piece of words that is one link is not.
  const B: Block[] = [{ k: 'p', runs: [{ t: 'make ' }, { t: 'this', href: 'https://x.y' }, { t: ' a link' }] }];
  expect(marksOf(B, sel([0, 5], [0, 9]))).toEqual({ href: 'https://x.y' });
  const e = insertBlocks([{ k: 'p', runs: [{ t: 'see  now' }] }], caret(0, 4), [{ k: 'p', runs: [{ t: 'the film', href: 'https://www.youtube.com/watch?v=abc' }] }]);
  expect(applyAll({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'see  now' }] }] }, e.ops).blocks).toEqual([
    { k: 'p', runs: [{ t: 'see ' }, { t: 'the film', href: 'https://www.youtube.com/watch?v=abc' }, { t: ' now' }] },
  ]);
  // A bare address pasted alone stands on its own, a card, as before.
  const bare = insertBlocks([{ k: 'p', runs: [{ t: 'see  now' }] }], caret(0, 4), [{ k: 'p', runs: [{ t: 'https://www.youtube.com/watch?v=abc' }] }]);
  expect(applyAll({ head: {}, blocks: [{ k: 'p', runs: [{ t: 'see  now' }] }] }, bare.ops).blocks).toHaveLength(3);
});
