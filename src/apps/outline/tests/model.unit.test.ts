// The outline as a view of the document, and each command as the ops it produces: under node, no DOM. The
// lines between items (their kinds and names as an item's attributes), joins as edges "~ A -> B: name",
// documents as fences; loose words listified; the conversions a deck, a network and an org chart read.
import { expect, test } from 'vitest';
import { applyAll, evaluate, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import {
  appendItem,
  connect,
  copySpan,
  duplicateSpan,
  enterAt,
  insertDoc,
  joinBack,
  joinForward,
  listify,
  mapAt,
  moveItem,
  moveSpan,
  nameOf,
  outlineText,
  outlineToDeck,
  outlineToFamily,
  outlineToMind,
  outlineToNet,
  outlineToOrg,
  personOf,
  pasteBlocks,
  pastesAsItems,
  pasteText,
  placeItem,
  readOutline,
  removeAt,
  removeSpan,
  renameIn,
  setDoc,
  setLine,
  setLink,
  setOrdered,
  shiftItem,
  shiftSpan,
  siblingsOf,
  spanOf,
  toggleOrdered,
  toOpml,
  topsOf,
  unlink,
  notesApart,
  notesAsItems,
} from '../model.ts';
import { docGist, outlinePage, richText, wrapRuns } from '../view.ts';
import { templates } from '../templates.ts';
import def from '../def.ts';

const DOC = '- Launch\n  - Product {.from}\n    - Pricing {.from label=sets}\n  - Marketing {.both}\n  - Ops {label="part of"}\n  - Support {.to}\n\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n';
const TREE = '- Launch\n  - Product\n    - Pricing\n  - Marketing\n';

/** A document edited: the ops applied, the text written. */
const after = (text: string, ops: (doc: Doc, v: ReturnType<typeof readOutline>) => Op[] | null | { ops: Op[] }) => {
  const doc = parse(text);
  const got = ops(doc, readOutline(doc));
  const list = got === null ? [] : 'ops' in got ? got.ops : got;
  return write(applyAll(doc, list));
};

test('read: each kind of line, its name, the joins, and which joins are live', () => {
  const v = readOutline(parse(DOC));
  expect(v.items.map((it) => [nameOf(it.runs), it.depth, it.dir ?? '--', it.label ?? ''])).toEqual([
    ['Launch', 0, '--', ''],
    ['Product', 1, '->', ''],
    ['Pricing', 2, '->', 'sets'],
    ['Marketing', 1, '<->', ''],
    ['Ops', 1, '--', 'part of'],
    ['Support', 1, '<-', ''],
  ]);
  expect(v.items.map((it) => it.at)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(v.links).toEqual([
    { at: 6, from: 'Pricing', to: 'Marketing', dir: '->', label: 'feeds', live: true },
    { at: 7, from: 'Ops', to: 'Product', dir: '--', live: true },
  ]);
  expect(v.depths).toEqual([0, 1, 2, 1, 1, 1, -1, -1]);
  expect(v.loose).toBe(false);
  expect(readOutline(parse('- A\n  - B\n\n~ A -> Gone\n')).links[0].live).toBe(false);
  // Words that only look like a line are left alone.
  expect(readOutline(parse('- A\n  - -5 degrees\n  - <-ish\n  - ~strike~ me\n')).items.map((it) => nameOf(it.runs))).toEqual(['A', '-5 degrees', '<-ish', '~strike~ me']);
  // An empty document is an empty outline.
  expect(readOutline(parse('')).items).toEqual([]);
});

test('documents under items are fences that say their depth; an item that is a web address is a thing from the web', () => {
  const text = '- A\n  - B\n\n```sheet {depth=2}\nx | y\n--- | ---\n1 | 2\n```\n\n    - C\n  - D\n- E\n  - https://example.com/a-video\n';
  const v = readOutline(parse(text));
  expect(v.items.map((it) => [it.depth, it.doc ? it.doc.split('\n')[0] : nameOf(it.runs)])).toEqual([
    [0, 'A'],
    [1, 'B'],
    [2, 'sheet'],
    [2, 'C'],
    [1, 'D'],
    [0, 'E'],
    [1, 'web'],
  ]);
  expect(v.items[2].doc).toBe('sheet\nx | y\n--- | ---\n1 | 2');
  expect(v.items[6].doc).toBe('web\nhttps://example.com/a-video');
  expect(write(parse(text))).toBe(text);
  // A fence with no depth of its own sits at the margin, and Tab gives it one before moving it.
  const loose = '- A\n\n```draw\nKind | X\n--- | ---\n```\n';
  expect(readOutline(parse(loose)).items[1].depth).toBe(0);
  expect(after(loose, (d, v) => shiftItem(d, v, 1, 1))).toBe('- A\n\n```draw {depth=1}\nKind | X\n--- | ---\n```\n');
  // The document under an item replaced by another of the same app keeps the fence's depth.
  expect(after('- A\n\n```sheet {depth=1}\na | b\n--- | ---\n```\n', (d) => setDoc(d, 1, 'sheet\nc | d\n--- | ---\n1 | 2'))).toBe('- A\n\n```sheet {depth=1}\nc | d\n--- | ---\n1 | 2\n```\n');
});

test('loose words read as a tree, and listify is the one splice that makes them an outline', () => {
  const v = readOutline(parse('# Plan\n\n- a\n  - b\n\n## Later\n\nc\nd\n\nhttps://example.com/x\n'));
  expect(v.loose).toBe(true);
  expect(v.items.map((it) => [it.depth, it.doc ?? nameOf(it.runs)])).toEqual([
    [0, 'Plan'],
    [1, 'a'],
    [2, 'b'],
    [1, 'Later'],
    [2, 'c d'],
    [2, 'web\nhttps://example.com/x'],
  ]);
  expect(after('# Plan\n\n- a\n  - b\n\n## Later\n\nc\nd\n\nhttps://example.com/x\n\n~ a -> b\n', listify)).toBe(
    '- Plan\n  - a\n    - b\n  - Later\n    - c\n    - d\n    - https://example.com/x\n\n~ a -> b\n',
  );
  // Canonical text is left alone.
  expect(listify(parse(DOC))).toEqual([]);
  expect(listify(parse(''))).toEqual([]);
});

test('Tab and Shift+Tab shift a family; an item goes at most one deeper than the one above', () => {
  expect(after(TREE, (d, v) => shiftItem(d, v, 3, 1))).toBe('- Launch\n  - Product\n    - Pricing\n    - Marketing\n');
  expect(after(TREE, (d, v) => shiftItem(d, v, 1, -1))).toBe('- Launch\n- Product\n  - Pricing\n  - Marketing\n');
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 0, 1)).toBeNull();
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 2, 1)).toBeNull();
  expect(shiftItem(parse(TREE), readOutline(parse(TREE)), 0, -1)).toBeNull();
  // A line's attributes travel with the item.
  expect(after(DOC, (d, v) => shiftItem(d, v, 3, 1))).toContain('\n    - Marketing {.both}\n');
});

test('Alt+arrows move a family past its neighbour at its level; drag places it under or after another', () => {
  expect(after(TREE, (d, v) => moveItem(d, v, 3, -1))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(after(TREE, (d, v) => moveItem(d, v, 1, 1))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(moveItem(parse(TREE), readOutline(parse(TREE)), 0, -1)).toBeNull();
  expect(moveItem(parse(TREE), readOutline(parse(TREE)), 3, 1)).toBeNull();
  const ops = moveItem(parse(TREE), readOutline(parse(TREE)), 1, 1)!;
  expect(ops).toEqual([{ op: 'move', at: 1, n: 2, to: 2 }]);
  expect(after(TREE, (d, v) => placeItem(d, v, 3, 2, 'under'))).toBe('- Launch\n  - Product\n    - Pricing\n      - Marketing\n');
  expect(after(TREE, (d, v) => placeItem(d, v, 1, 3, 'after'))).toBe('- Launch\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(after(TREE, (d, v) => placeItem(d, v, 3, 0, 'after'))).toBe('- Launch\n  - Product\n    - Pricing\n- Marketing\n');
  expect(placeItem(parse(TREE), readOutline(parse(TREE)), 1, 2, 'under')).toBeNull();
});

test('Enter: at the start of words the row is pushed down; at the end a first child of an open parent, else a sibling after the family; in the middle a split to the same place', () => {
  const d = parse(TREE);
  const v = readOutline(d);
  // At the end.
  expect(enterAt(d, v, 1)).toEqual({ ops: [{ op: 'splice', at: 2, n: 0, blocks: [{ k: 'li', depth: 2, runs: [] }] }], at: 2, offset: 0 });
  expect(enterAt(d, v, 1, 7, true)).toEqual({ ops: [{ op: 'splice', at: 3, n: 0, blocks: [{ k: 'li', depth: 1, runs: [] }] }], at: 3, offset: 0 });
  expect(after(TREE, (d, v) => enterAt(d, v, 2, 7))).toBe('- Launch\n  - Product\n    - Pricing\n    -\n  - Marketing\n');
  expect(after(TREE, (d, v) => enterAt(d, v, 3))).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n  -\n');
  // At the start: one empty item before the row, at its depth; the words (attributes, children and all) move down a place, the caret with them.
  const push = enterAt(parse(DOC), readOutline(parse(DOC)), 1, 0);
  expect(push).toEqual({ ops: [{ op: 'splice', at: 1, n: 0, blocks: [{ k: 'li', depth: 1, runs: [] }] }], at: 2, offset: 0 });
  expect(
    write(applyAll(parse(DOC), push.ops))
      .split('\n')
      .slice(0, 4),
  ).toEqual(['- Launch', '  -', '  - Product {.from}', '    - Pricing {.from label=sets}']);
  // An empty row at the start is the end.
  expect(enterAt(parse('- A\n-\n'), readOutline(parse('- A\n-\n')), 1, 0).at).toBe(2);
  // In the middle: a leaf splits in place; an open parent's words go to its first child; a folded parent's after its family.
  expect(after(TREE, (d, v) => enterAt(d, v, 2, 3))).toBe('- Launch\n  - Product\n    - Pri\n    - cing\n  - Marketing\n');
  expect(after(TREE, (d, v) => enterAt(d, v, 1, 3))).toBe('- Launch\n  - Pro\n    - duct\n    - Pricing\n  - Marketing\n');
  expect(after(TREE, (d, v) => enterAt(d, v, 1, 3, true))).toBe('- Launch\n  - Pro\n    - Pricing\n  - duct\n  - Marketing\n');
  expect(enterAt(d, v, 1, 3, true).at).toBe(3);
  // A numbered row's new sibling is numbered; so is a new first child of a numbered list.
  expect(after('1. A\n2. B\n', (d, v) => enterAt(d, v, 0))).toBe('1. A\n2.\n3. B\n');
  expect(after('- A\n  1. a\n', (d, v) => enterAt(d, v, 0))).toBe('- A\n  1.\n  2. a\n');
  expect(after('1. AB\n', (d, v) => enterAt(d, v, 0, 1))).toBe('1. A\n2. B\n');
  expect(after('1. AB\n', (d, v) => enterAt(d, v, 0, 0))).toBe('1.\n2. AB\n');
  expect(after('', (d, v) => appendItem(d, v))).toBe('-\n');
  expect(after(DOC, (d, v) => appendItem(d, v, 1)).split('\n')[6]).toBe('  -');
  expect(after(TREE, (d, v) => removeAt(d, v, 1))).toBe('- Launch\n  - Pricing\n  - Marketing\n');
  expect(after('-\n', (d, v) => removeAt(d, v, 0))).toBe('');
});

test('Backspace at the start of words joins the row to the item before it in the document; Delete at the end joins the next one in', () => {
  const d = parse(TREE);
  const v = readOutline(d);
  // Into the previous item (here the row's parent); the row's block alone goes, the caret lands at the join.
  const back = joinBack(d, v, 2)!;
  expect(back).toEqual({
    ops: [
      { op: 'splice', at: 2, n: 1, blocks: [] },
      { op: 'splice', at: 1, n: 1, blocks: [{ k: 'li', depth: 1, runs: [{ t: 'ProductPricing' }] }] },
    ],
    at: 1,
    offset: 7,
  });
  expect(after(TREE, (d, v) => joinBack(d, v, 2))).toBe('- Launch\n  - ProductPricing\n  - Marketing\n');
  // Its children stay where they are: now the joined item's (or its descendants', by position).
  expect(after(TREE, (d, v) => joinBack(d, v, 1))).toBe('- LaunchProduct\n    - Pricing\n  - Marketing\n');
  expect(after(TREE, (d, v) => joinBack(d, v, 3))).toBe('- Launch\n  - Product\n    - PricingMarketing\n');
  // Marks are kept and neighbouring runs with the same marks are one.
  expect(after('- **a**\n- **b** c\n', (d, v) => joinBack(d, v, 1))).toBe('- **ab** c\n');
  // The first item, or a document before: nothing.
  expect(joinBack(d, v, 0)).toBeNull();
  const withDoc = parse('- A\n\n```sheet {depth=0}\n```\n\n- B\n');
  expect(joinBack(withDoc, readOutline(withDoc), 2)).toBeNull();
  expect(joinForward(withDoc, readOutline(withDoc), 0)).toBeNull();
  // Forward: the next item's words come in, its block goes, the caret stays where it was.
  expect(joinForward(d, v, 1)).toEqual({
    ops: [
      { op: 'splice', at: 2, n: 1, blocks: [] },
      { op: 'splice', at: 1, n: 1, blocks: [{ k: 'li', depth: 1, runs: [{ t: 'ProductPricing' }] }] },
    ],
    at: 1,
    offset: 7,
  });
  expect(after(TREE, (d, v) => joinForward(d, v, 0))).toBe('- LaunchProduct\n    - Pricing\n  - Marketing\n');
  expect(joinForward(d, v, 3)).toBeNull();
  // A join that named the row joined into follows its new words.
  expect(after('- A\n- B\n- C\n\n~ A -> C\n', (d, v) => joinForward(d, v, 0))).toBe('- AB\n- C\n\n~ AB -> C\n');
});

test('a span of chosen rows: from the first to the end of the furthest family, folded or not; everything with the joins when it holds every item', () => {
  const d = parse(DOC);
  const v = readOutline(d);
  expect(spanOf(d, v, [1])).toEqual({ from: 1, to: 3 });
  expect(spanOf(d, v, [2, 3])).toEqual({ from: 2, to: 4 });
  // A row's whole family is chosen with it, so choosing Launch alone with Product is all of Launch.
  expect(spanOf(d, v, [0, 1])).toEqual({ from: 0, to: 8 });
  expect(spanOf(d, v, [0, 1, 3, 4, 5])).toEqual({ from: 0, to: 8 });
  expect(spanOf(parse(TREE), readOutline(parse(TREE)), [3])).toEqual({ from: 3, to: 4 });
  expect(spanOf(d, v, [])).toBeNull();
  expect(topsOf(v, { from: 1, to: 5 }).map((it) => it.at)).toEqual([1, 3, 4]);
  expect(itemsAt(removeSpan({ from: 1, to: 3 }), DOC)).toBe('- Launch\n  - Marketing {.both}\n  - Ops {label="part of"}\n  - Support {.to}\n\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n');
  expect(write(applyAll(d, removeSpan(spanOf(d, v, [0])!)))).toBe('');
});
const itemsAt = (ops: Op[], text: string) => write(applyAll(parse(text), ops));

test('a place followed through ops: shifted past a splice, gone with a block taken, carried by a move', () => {
  expect(mapAt([{ op: 'splice', at: 1, n: 0, blocks: [{ k: 'hr' }] }], 1)).toBe(2);
  expect(mapAt([{ op: 'splice', at: 1, n: 0, blocks: [{ k: 'hr' }] }], 0)).toBe(0);
  expect(mapAt([{ op: 'splice', at: 1, n: 1, blocks: [] }], 1)).toBe(-1);
  expect(mapAt([{ op: 'splice', at: 1, n: 1, blocks: [] }], 3)).toBe(2);
  expect(mapAt([{ op: 'splice', at: 1, n: 2, blocks: [{ k: 'hr' }, { k: 'hr' }] }], 2)).toBe(2);
  // A family of two at 1 moved after the next item (to 2 in the rest): 1 → 2, 2 → 3, the item that was at 3 → 1.
  const move: Op[] = [{ op: 'move', at: 1, n: 2, to: 2 }];
  expect([0, 1, 2, 3, 4].map((i) => mapAt(move, i))).toEqual([0, 2, 3, 1, 4]);
  expect([0, 1, 2, 3].map((i) => mapAt([{ op: 'move', at: 2, n: 2, to: 0 }], i))).toEqual([2, 3, 0, 1]);
});

test('a span shifts in and out as one splice, moves past its neighbour as one move, and is refused where a family would be', () => {
  const T = '- A\n- B\n  - b1\n- C\n';
  const d = parse(T);
  const v = readOutline(d);
  const bc = spanOf(d, v, [1, 3])!;
  expect(shiftSpan(d, v, bc, 1)).toEqual([
    {
      op: 'splice',
      at: 1,
      n: 3,
      blocks: [
        { k: 'li', depth: 1, runs: [{ t: 'B' }] },
        { k: 'li', depth: 2, runs: [{ t: 'b1' }] },
        { k: 'li', depth: 1, runs: [{ t: 'C' }] },
      ],
    },
  ]);
  expect(itemsAt(shiftSpan(d, v, bc, 1)!, T)).toBe('- A\n  - B\n    - b1\n  - C\n');
  // In needs a sibling before the first row; out needs every item to stay at the floor or deeper.
  expect(shiftSpan(d, v, spanOf(d, v, [0])!, 1)).toBeNull();
  expect(shiftSpan(d, v, spanOf(d, v, [2])!, 1)).toBeNull();
  expect(shiftSpan(d, v, bc, -1)).toBeNull();
  expect(itemsAt(shiftSpan(d, v, spanOf(d, v, [2])!, -1)!, T)).toBe('- A\n- B\n- b1\n- C\n');
  expect(shiftSpan(d, v, spanOf(d, v, [2])!, -1, 1)).toBeNull();
  // A document in the span says its new depth.
  const withDoc = '- A\n- B\n\n```sheet {depth=1}\n```\n';
  expect(itemsAt(shiftSpan(parse(withDoc), readOutline(parse(withDoc)), { from: 1, to: 3 }, 1)!, withDoc)).toBe('- A\n  - B\n\n```sheet {depth=2}\n```\n');
  // Moves.
  expect(moveSpan(d, v, spanOf(d, v, [1])!, -1)).toEqual([{ op: 'move', at: 1, n: 2, to: 0 }]);
  expect(itemsAt(moveSpan(d, v, spanOf(d, v, [0, 1])!, 1)!, T)).toBe('- C\n- A\n- B\n  - b1\n');
  expect(moveSpan(d, v, spanOf(d, v, [0, 1])!, -1)).toBeNull();
  expect(moveSpan(d, v, spanOf(d, v, [3])!, 1)).toBeNull();
  expect(moveSpan(d, v, spanOf(d, v, [2])!, -1)).toBeNull();
});

test('copy: the span as blocks with the shallowest at the margin; paste: items rebased to the target, joins to the end, loose words listified', () => {
  const d = parse(TREE);
  const v = readOutline(d);
  expect(write({ head: {}, blocks: copySpan(d, v, spanOf(d, v, [1])!) })).toBe('- Product\n  - Pricing\n');
  expect(write({ head: {}, blocks: copySpan(d, v, spanOf(d, v, [2, 3])!) })).toBe('  - Pricing\n- Marketing\n');
  const three = pasteText('one\ntwo\nthree');
  // After the caret row's family, at its depth.
  const p = pasteBlocks(d, v, three, 1)!;
  expect(p.from).toBe(3);
  expect(p.to).toBe(6);
  expect(write(applyAll(d, p.ops))).toBe('- Launch\n  - Product\n    - Pricing\n  - one\n  - two\n  - three\n  - Marketing\n');
  // A nested list keeps its shape, rebased.
  expect(write(applyAll(d, pasteBlocks(d, v, pasteText('- x\n  - y\n'), 2)!.ops))).toBe('- Launch\n  - Product\n    - Pricing\n    - x\n      - y\n  - Marketing\n');
  // An empty row is replaced.
  const e = parse('- A\n-\n');
  expect(write(applyAll(e, pasteBlocks(e, readOutline(e), pasteText('1. x\n2. y\n'), 1)!.ops))).toBe('- A\n1. x\n2. y\n');
  // A span is replaced, at its first row's depth.
  expect(write(applyAll(d, pasteBlocks(d, v, pasteText('- x\n- y\n'), spanOf(d, v, [1])!)!.ops))).toBe('- Launch\n  - x\n  - y\n  - Marketing\n');
  // Nowhere: the end, at the margin; joins go after everything.
  const j = parse('- A\n\n~ A -> B\n');
  expect(write(applyAll(j, pasteBlocks(j, readOutline(j), pasteText('- B\n- C\n\n~ B -> C\n'), null)!.ops))).toBe('- A\n- B\n- C\n\n~ A -> B\n~ B -> C\n');
  // Headings and paragraphs are made items first.
  expect(
    write(applyAll(d, pasteBlocks(d, v, pasteText('# Plan\n\nFirst\n'), 3)!.ops))
      .split('\n')
      .slice(4),
  ).toEqual(['  - Plan', '    - First', '']);
  expect(pasteBlocks(d, v, [], 1)).toBeNull();
  // What a row takes as items, and what as words.
  expect(pastesAsItems('one\ntwo')).toBe(true);
  expect(pastesAsItems('- one')).toBe(true);
  expect(pastesAsItems('1. one\n')).toBe(true);
  expect(pastesAsItems('just words')).toBe(false);
  expect(pastesAsItems('-5 degrees')).toBe(false);
});

test('numbered: the list a row belongs to, toggled; the numbers round-trip and count as write counts them', () => {
  const T = '- A\n  - a1\n    - x\n  - a2\n- B\n';
  const d = parse(T);
  const v = readOutline(d);
  expect(siblingsOf(v, 3)).toEqual([1, 3]);
  expect(siblingsOf(v, 0)).toEqual([0, 4]);
  expect(itemsAt(toggleOrdered(d, siblingsOf(v, 1)), T)).toBe('- A\n  1. a1\n    - x\n  2. a2\n- B\n');
  const o = parse('- A\n  1. a1\n    - x\n  2. a2\n- B\n');
  expect(readOutline(o).items.map((it) => !!it.ord)).toEqual([false, true, false, true, false]);
  expect(itemsAt(toggleOrdered(o, [1, 3]), '- A\n  1. a1\n    - x\n  2. a2\n- B\n')).toBe(T);
  // Mixed: numbered unless every one already is.
  expect(itemsAt(toggleOrdered(parse('1. A\n- B\n'), [0, 1]), '1. A\n- B\n')).toBe('1. A\n2. B\n');
  expect(setOrdered(d, [0], false)).toEqual([]);
  // Round trips, the line attributes kept; shifted and moved, a numbered item stays numbered.
  for (const text of ['1. A\n2. B\n  1. b {.from}\n3. C\n', '- A\n  1. one {label=first}\n  2. two\n']) expect(write(parse(text))).toBe(text);
  expect(after('1. A\n2. B\n', (d, v) => shiftItem(d, v, 1, 1))).toBe('1. A\n  1. B\n');
  expect(after('1. A {#x}\n', (d, v) => setLine(d, v, 0, { label: 'y' }))).toBe('1. A {#x}\n');
  expect(after('- A\n  1. B\n', (d, v) => setLine(d, v, 1, { dir: '->' }))).toBe('- A\n  1. B {.from}\n');
});

test('the text export: bullets, numbers, two spaces a level, a document as its app and first line', () => {
  const text = '- Launch\n  1. Product\n     - Pricing\n  2. Marketing\n\n```sheet {depth=1}\nBudget | Cost\n--- | ---\n```\n\n  - https://example.com/v\n  -\n';
  expect(outlineText(readOutline(parse(text)))).toBe('- Launch\n  1. Product\n    - Pricing\n  2. Marketing\n  - [sheet] Budget | Cost\n  - [web] https://example.com/v\n');
  expect(outlineText(readOutline(parse('')))).toBe('');
});

test('the line to the parent: its kind and its name are the item’s attributes; a root has no line', () => {
  expect(after(TREE, (d, v) => setLine(d, v, 2, { dir: '->' }))).toContain('\n    - Pricing {.from}\n');
  expect(after(TREE, (d, v) => setLine(d, v, 2, { dir: '<->', label: 'sets' }))).toContain('\n    - Pricing {.both label=sets}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 2, { dir: '--' }))).toContain('\n    - Pricing {label=sets}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 2, { label: '' }))).toContain('\n    - Pricing {.from}\n');
  expect(after(DOC, (d, v) => setLine(d, v, 4, { label: 'part of it' }))).toContain('\n  - Ops {label="part of it"}\n');
  expect(setLine(parse(TREE), readOutline(parse(TREE)), 0, { dir: '->' })).toEqual([]);
  expect(setLine(parse(DOC), readOutline(parse(DOC)), 2, { dir: '->' })).toEqual([]);
});

test('joins: connected by their words, turned, named, taken away; a renamed item carries its joins', () => {
  expect(after(TREE, (d, v) => connect(d, v, 2, 3))).toBe(TREE + '\n~ Pricing -- Marketing\n');
  expect(connect(parse(TREE), readOutline(parse(TREE)), 2, 2)).toEqual([]);
  expect(connect(parse(DOC), readOutline(parse(DOC)), 3, 2)).toEqual([]);
  expect(
    after(DOC, (d) => setLink(d, 7, { dir: '->' }))
      .split('\n')
      .at(-2),
  ).toBe('~ Ops -> Product');
  expect(
    after(DOC, (d) => setLink(d, 7, { label: 'runs' }))
      .split('\n')
      .at(-2),
  ).toBe('~ Ops -- Product: runs');
  expect(
    after(DOC, (d) => setLink(d, 6, { label: '' }))
      .split('\n')
      .at(-3),
  ).toBe('~ Pricing -> Marketing');
  expect(
    after(DOC, (d) => unlink(d, 6))
      .split('\n')
      .at(-2),
  ).toBe('~ Ops -- Product');
  expect(unlink(parse(DOC), 0)).toEqual([]);
  // Renamed: the edges follow, unless another item still has the old name.
  const renamed = parse(DOC.replace('- Marketing {.both}', '- Growth {.both}'));
  expect(
    write(applyAll(renamed, renameIn(renamed, readOutline(renamed), 'Marketing', 'Growth')))
      .split('\n')
      .at(-3),
  ).toBe('~ Pricing -> Growth: feeds');
  expect(renameIn(parse(DOC), readOutline(parse(DOC)), 'Marketing', 'Growth')).toEqual([]);
});

test('a document goes under an item after its family, at its depth; a web address is an item of its own', () => {
  expect(after(TREE, (d, v) => insertDoc(d, v, 1, 'sheet\na | b\n--- | ---\n1 | 2'))).toBe(
    '- Launch\n  - Product\n    - Pricing\n\n```sheet {depth=1}\na | b\n--- | ---\n1 | 2\n```\n\n  - Marketing\n',
  );
  expect(after(TREE, (d, v) => insertDoc(d, v, -1, 'draw\n'))).toBe(TREE + '\n```draw {depth=0}\n```\n');
  expect(after(TREE, (d, v) => insertDoc(d, v, 2, 'web\nhttps://example.com/v'))).toBe('- Launch\n  - Product\n    - Pricing\n    - https://example.com/v\n  - Marketing\n');
  // The edges stay last.
  expect(
    after(DOC, (d, v) => insertDoc(d, v, -1, 'draw\n'))
      .split('\n')
      .slice(-3),
  ).toEqual(['~ Pricing -> Marketing: feeds', '~ Ops -- Product', '']);
});

test('a mind map gets the tree and its joins as cross-links; an org chart its joins as dotted lines; a network every line and join; a deck a slide per parent', () => {
  const v = readOutline(parse(DOC));
  expect(outlineToMind(v)).toBe('---\nkind: mind\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n');
  expect(outlineToOrg(v, { title: 'Co' })).toBe(
    '---\ntitle: Co\nkind: org\n---\n- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n\n~ Pricing -- Marketing: feeds\n~ Ops -- Product\n',
  );
  expect(outlineToNet(v)).toBe(
    '---\nkind: net\n---\n~ Launch -> Product\n~ Product -> Pricing: sets\n~ Launch <-> Marketing\n~ Launch -- Ops: part of\n~ Launch <- Support\n~ Pricing -> Marketing: feeds\n~ Ops -- Product\n',
  );
  expect(outlineToNet(readOutline(parse('- Alone\n- A\n  - B\n')))).toBe('---\nkind: net\n---\n- Alone\n\n~ A -- B\n');
  const deck = outlineToDeck(
    readOutline(parse('- Launch\n  - Product\n    - Pricing\n      - Tiers\n    - Onboarding\n  - Marketing\n    - Press\n\n```sheet {depth=1}\na | b\n--- | ---\n```\n\n  - Done\n')),
  );
  expect(deck).toBe('## Launch {.title}\n\n---\n\n## Product\n\n- Pricing\n- Onboarding\n\n---\n\n## Pricing\n\n- Tiers\n\n---\n\n## Marketing\n\n- Press\n\n---\n\n```sheet\na | b\n--- | ---\n```\n');
  expect(outlineToDeck(readOutline(parse('- A\n  - a1\n- B\n  - b1\n')))).toBe('## A\n\n- a1\n\n---\n\n## B\n\n- b1\n');
  expect(def.handoffs!.map((h) => h.to)).toEqual(['deck', 'diagram', 'diagram', 'diagram', 'diagram']);
  expect(def.handoffs![0].convert('---\ntitle: Plan\n---\n' + TREE)).toBe('---\ntitle: Plan\n---\n## Launch {.title}\n\n---\n\n## Product\n\n- Pricing\n');
});

test('OPML, plain text and Markdown, and the page', () => {
  const v = readOutline(parse(DOC));
  expect(toOpml(v, 'Launch')).toBe(
    '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>Launch</title></head>\n  <body>\n    <outline text="Launch">\n      <outline text="Product">\n        <outline text="Pricing"/>\n      </outline>\n      <outline text="Marketing"/>\n      <outline text="Ops"/>\n      <outline text="Support"/>\n    </outline>\n  </body>\n</opml>\n',
  );
  expect(outlineText(v)).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n');
  const built = (ext: string, doc: string) => new TextDecoder().decode(def.exports!.find((x) => x.ext === ext)!.build(doc, { def, title: '', link: '' }) as Uint8Array);
  expect(built('txt', TREE)).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n');
  expect(built('txt', '1. A\n2. B\n\n```draw {depth=0}\n```\n')).toBe('1. A\n2. B\n- [Drawing Tool]\n');
  // OPML has no numbers: plain words.
  expect(built('opml', '1. A\n2. B\n')).toContain('<outline text="B"/>');
  // A numbered item's number is drawn where its dot would be; the hand-offs keep the numbers.
  expect(def.view('1. A\n2. B\n')[0].svg).toContain('>2.</text>');
  expect(outlineToMind(readOutline(parse('1. A\n2. B\n')))).toBe('---\nkind: mind\n---\n1. A\n2. B\n');
  expect(outlineToDeck(readOutline(parse('- A\n  1. a\n  2. b\n')))).toBe('## A {.title}\n');
  expect(outlineToDeck(readOutline(parse('- A\n  - a\n    1. x\n')))).toBe('## A {.title}\n\n---\n\n## a\n\n1. x\n');
  // An item's note is a numbered item right under it, first among its children.
  expect(built('md', '- A^[a note]\n  - B\n')).toBe('- A[1]\n  1. a note\n  - B\n');
  expect(built('opml', TREE)).toContain('<title>Launch</title>');
  expect(built('opml', '---\ntitle: Plan\n---\n' + TREE)).toContain('<title>Plan</title>');
  // The page: every item's words, the kind of line before a named one, the notes and the joins under it; a document as a card.
  const page = outlinePage(parse(DOC.replace('- Launch', '- **Launch**^[the plan]') + '\n```sheet {depth=1}\na | b\n--- | ---\n```\n'));
  for (const w of ['Launch', 'Product', 'Pricing', 'Marketing', 'Ops', 'Support', '→ sets', '↔', '— part of', 'the plan', 'Connections', 'Pricing  → feeds  Marketing', 'Spreadsheet', 'a | b'])
    expect(page.svg).toContain(w);
  expect(page.svg).toContain('font-weight="700">Launch</tspan>');
  expect(page.svg).toContain('baseline-shift="super"');
  expect(page.alt).toBe('Launch');
  expect(page.h).toBeGreaterThan(300);
  expect(def.view('')[0].svg).toContain('An empty outline');
  expect(def.view(DOC, { small: true })[0].svg).not.toContain('Connections');
  expect(docGist('sheet\n---\nchart: pie\n---\na | b\n--- | ---')).toEqual({ app: 'sheet', gist: 'a | b' });
  // A document with a title is named by it, never by a title further down in its words.
  expect(docGist('sheet\n---\nchart: pie\ntitle: Budget\n---\na | b\n--- | ---')).toEqual({ app: 'sheet', gist: 'Budget' });
  expect(docGist('write\n---\nlook: serif\n---\nDear Ana,\n\ntitle: not a head field\n')).toEqual({ app: 'write', gist: 'Dear Ana,' });
});

test('rich words wrap between words with their marks, and are drawn as tspans', () => {
  const lines = wrapRuns([{ t: 'one two ', b: true }, { t: 'three four five six' }], 90, 16);
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[0][0].b).toBe(true);
  expect(
    lines
      .flat()
      .map((p) => p.t)
      .join(''),
  ).toBe('one two three four five six');
  const svg = richText(
    10,
    20,
    [
      { t: 'a ', i: true },
      { t: 'b', href: 'https://x.y' },
      { t: '', ic: 'rocket' },
      { t: '1', sup: true },
    ],
    16,
  );
  expect(svg).toContain('font-style="italic">a </tspan>');
  expect(svg).toContain('fill="#4f46e5">b</tspan>');
  expect(svg).toContain('<g transform=');
  expect(svg).toContain('baseline-shift="super" font-size="10.4">1</tspan>');
});

test('every template is a real outline that round-trips byte for byte and draws', () => {
  const all = templates();
  const ids = all.map((x) => x.id);
  expect(ids.length).toBeGreaterThanOrEqual(13);
  expect(new Set(ids).size).toBe(ids.length);
  // The everyday ones first; the kept four are all there.
  expect(ids.slice(0, 3)).toEqual(['packing', 'decision', 'launch']);
  for (const id of ['talk', 'book', 'novel', 'research', 'choice', 'packing', 'syllabus', 'org', 'speech', 'troubleshoot', 'family']) expect(ids).toContain(id);
  for (const tpl of all) {
    expect(write(parse(tpl.doc)), tpl.id).toBe(tpl.doc);
    expect(tpl.doc.endsWith('\n')).toBe(true);
    expect(tpl.name, tpl.id).toBeTruthy();
    expect(tpl.blurb, tpl.id).toMatch(/\.$/);
    expect(tpl.doc, tpl.id).not.toMatch(/[Ll]orem|TODO|Your name/);
    const d = parse(tpl.doc);
    expect(d.head.title, tpl.id).toBeTruthy();
    const v = readOutline(d);
    expect(v.loose, tpl.id).toBe(false);
    expect(v.items.length, tpl.id).toBeGreaterThanOrEqual(9);
    expect(
      v.items.some((it) => it.depth > 1),
      tpl.id,
    ).toBe(true);
    // Every join names two items of its own outline.
    expect(
      v.links.every((l) => l.live),
      tpl.id,
    ).toBe(true);
    expect(def.view(tpl.doc)[0].svg.length, tpl.id).toBeGreaterThan(400);
    expect(def.view(tpl.doc, { small: true })[0].svg, tpl.id).not.toContain(t_empty);
  }
  const doc = (id: string) => all.find((x) => x.id === id)!.doc;
  expect(doc('launch')).toContain('{.from label=sets}');
  expect(doc('launch')).toContain('\n~ Pricing -> Press: informs\n');
  // The trees you walk: every answer is a yes or a no on its line.
  for (const id of ['choice', 'troubleshoot']) {
    const answers = readOutline(parse(doc(id))).items.filter((it) => it.label);
    expect(answers.length, id).toBeGreaterThanOrEqual(6);
    expect(new Set(answers.map((it) => `${it.dir} ${it.label}`)), id).toEqual(new Set(['-> yes', '-> no']));
  }
  // The research plan's budget is a sheet under its item, and it adds up.
  const v = readOutline(parse(doc('research')));
  const budget = v.items.find((it) => it.doc?.startsWith('sheet\n'))!;
  expect(v.items[v.items.indexOf(budget) - 1].runs[0].t).toBe('Budget');
  expect(docGist(budget.doc!)).toEqual({ app: 'sheet', gist: 'Budget' });
  expect(evaluate(parse(budget.doc!.slice(6)))!.values[4][3]).toBe(2250);
  // Footnotes and numbered items where they fit.
  expect(all.filter((x) => x.doc.includes('^[')).length).toBeGreaterThanOrEqual(8);
  expect(doc('syllabus').match(/^ {4}\d+\. /gm)).toHaveLength(10);
  expect(def.blank()).toBe('');
  expect(def.title('---\ntitle: Plan\n---\n' + TREE)).toBe('Plan');
  expect(def.retitle(TREE, 'Plan')).toBe('---\ntitle: Plan\n---\n' + TREE);
  expect(def.retitle('---\ntitle: Plan\n---\n' + TREE, '')).toBe(TREE);
});
const t_empty = 'An empty outline';

test('people: "Name (role)" in the outline is "Name | role" in an org chart or a family tree, and the joins name them by name', () => {
  expect(personOf('Ana Ruiz (head baker)')).toEqual({ name: 'Ana Ruiz', what: 'head baker' });
  expect(personOf('Javier Moreno (1955 to 2019)')).toEqual({ name: 'Javier Moreno', what: '1955 to 2019' });
  expect(personOf('Launch (May) plan')).toEqual({ name: 'Launch (May) plan' });
  expect(personOf('Just a name')).toEqual({ name: 'Just a name' });
  const text = '- Rose Hale (born 1926)\n  - Helen **Price**\n  - Tom Hale (born 1952)\n\n~ Helen Price -- Tom Hale (born 1952): twin\n';
  const v = readOutline(parse(text));
  expect(outlineToFamily(v, { title: 'Hales' })).toBe(
    '---\ntitle: Hales\nkind: family\n---\n- Rose Hale | born 1926\n  - Helen **Price**\n  - Tom Hale | born 1952\n\n~ Helen Price -- Tom Hale: twin\n',
  );
  expect(outlineToOrg(v)).toBe('---\nkind: org\n---\n- Rose Hale | born 1926\n  - Helen **Price**\n  - Tom Hale | born 1952\n\n~ Helen Price -- Tom Hale: twin\n');
  // The templates hand off: the company as an org chart, the family as a family tree.
  const conv = (label: string, id: string) => def.handoffs!.find((h) => h.label() === label)!.convert(templates().find((x) => x.id === id)!.doc);
  expect(conv('Draw as an org chart', 'org')).toContain('kind: org\n---\n- Hana Kowalski | owner\n  - Sam Okoro | head baker\n');
  expect(conv('Draw as an org chart', 'org')).toContain('\n~ Ruth Adeyemi -- Mei Lin: learns pastry from\n');
  expect(conv('Draw as a family tree', 'family')).toContain('kind: family\n---\n- Luis and Carmen Moreno | married 1951\n');
  expect(conv('Draw as a family tree', 'family')).toContain('\n~ Rosa Moreno -- Lucía Byrne: godmother\n');
});

test('duplicateSpan: the span’s items again right after it, one splice; the joins stay at the end', () => {
  expect(after(TREE, (d, v) => duplicateSpan(d, v, spanOf(d, v, [1])!))).toBe('- Launch\n  - Product\n    - Pricing\n  - Product\n    - Pricing\n  - Marketing\n');
  const d = parse('- A\n- B\n\n~ A -> B\n');
  const v = readOutline(d);
  const all = spanOf(d, v, [0, 1])!;
  const r = duplicateSpan(d, v, all);
  expect(r.at).toBe(2);
  expect(write(applyAll(d, r.ops))).toBe('- A\n- B\n- A\n- B\n\n~ A -> B\n');
});

const NOTED = '- Launch the **app**^[After the *beta*, see https://example.com] in May^[Or June]\n  - Product\n    - Pricing^[Per seat]\n  1. Marketing\n- Wrap up\n';

test('footnotes in the files: each an item right under its own, first among its children, numbered in the item; the marks "[1]" in its words', () => {
  // The words of an item and its notes, apart.
  const it = readOutline(parse(NOTED)).items[0];
  const apart = notesApart(it.runs);
  expect(apart.notes).toEqual(['After the *beta*, see https://example.com', 'Or June']);
  expect(write({ head: {}, blocks: [{ k: 'li', depth: 0, runs: apart.runs }] })).toBe('- Launch the **app**[1] in May[2]\n');
  expect(notesApart([{ t: 'plain' }]).runs).toEqual([{ t: 'plain' }]);
  const built = (ext: string, doc: string) => new TextDecoder().decode(def.exports!.find((x) => x.ext === ext)!.build(doc, { def, title: '', link: '' }) as Uint8Array);
  // Plain text: the note's plain words, numbered under the item, before its children; the item's own numbering untouched.
  expect(built('txt', NOTED)).toBe(
    '- Launch the app[1] in May[2]\n  1. After the beta, see https://example.com\n  2. Or June\n  - Product\n    - Pricing[1]\n      1. Per seat\n  1. Marketing\n- Wrap up\n',
  );
  // Markdown: the same as a numbered list under the item, the note's marks kept as Markdown; no reference notes left.
  const md = built('md', NOTED);
  expect(md).toBe('- Launch the **app**[1] in May[2]\n  1. After the *beta*, see https://example.com\n  2. Or June\n  - Product\n    - Pricing[1]\n      1. Per seat\n  1. Marketing\n- Wrap up\n');
  expect(md).not.toContain('[^');
  // A note somewhere else than an item (an outline that is not yet a list) keeps the reference form.
  expect(write(notesAsItems(parse('A paragraph^[aside]\n')))).toBe('A paragraph[^1]\n\n[^1]: aside\n');
  expect(write(notesAsItems(parse('- plain\n')))).toBe('- plain\n');
  // OPML: the note an outline of its own, first under the item, its mark and its plain words; an item with only notes opens and closes.
  const opml = built('opml', NOTED);
  expect(opml).toContain(
    '    <outline text="Launch the app[1] in May[2]">\n      <outline text="[1] After the beta, see https://example.com"/>\n      <outline text="[2] Or June"/>\n      <outline text="Product">\n',
  );
  expect(opml).toContain(
    '        <outline text="Pricing[1]">\n          <outline text="[1] Per seat"/>\n        </outline>\n      </outline>\n      <outline text="Marketing"/>\n    </outline>\n    <outline text="Wrap up"/>\n',
  );
  expect(built('opml', '- Only^[note & <more>]\n')).toContain('    <outline text="Only[1]">\n      <outline text="[1] note &amp; &lt;more>"/>\n    </outline>\n  </body>');
  // The document itself is untouched: the notes stay inline.
  expect(write(parse(NOTED))).toBe(NOTED);
});
