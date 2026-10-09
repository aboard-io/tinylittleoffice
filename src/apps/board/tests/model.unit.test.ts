// Board as a view of the document, each command as the ops it produces, and the files: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { addCard, addItem, addStage, moveCard, moveStage, progress, readBoard, removeCard, removeItem, removeStage, setItemDone, setStage, shifted, type BoardView } from '../model.ts';
import { boardPage, boardToCsv } from '../view.ts';
import { templates } from '../templates.ts';

const BOARD = `## To do {color=b}

- Write the **spec**
  - [x] Outline
  - [ ] Draft
- Review the copy

## Doing {limit=1 color=g}

- Ship it

## Done
`;
const run = (text: string, ops: (v: BoardView) => Op[] | { ops: Op[] } | null) => {
  const doc = parse(text);
  const got = ops(readBoard(doc));
  const made = !got ? [] : Array.isArray(got) ? got : got.ops;
  const out = applyAll(doc, made);
  // Every command can be taken back exactly.
  expect(applyAll(out, invertAll(doc, made))).toEqual(doc);
  return { ops: made, text: write(out) };
};

test('read: stages from the headings with their limit and colour, cards from the items, a checklist from the tasks under one', () => {
  const v = readBoard(parse(BOARD));
  expect(v.stages.map((s) => [s.name, s.at, s.start, s.end, s.limit, s.color, s.cards.length])).toEqual([
    ['To do', 0, 0, 5, 0, 'b', 2],
    ['Doing', 5, 5, 7, 1, 'g', 1],
    ['Done', 7, 7, 8, 0, '', 0],
  ]);
  const spec = v.stages[0].cards[0];
  expect([spec.at, spec.end, spec.words]).toEqual([1, 4, 'Write the spec']);
  expect(spec.items.map((i) => [i.at, i.done, i.words])).toEqual([[2, true, 'Outline'], [3, false, 'Draft']]);
  expect(progress(spec)).toBe('1/2');
  expect(progress(v.stages[0].cards[1])).toBe('');
  expect(v.cards).toBe(3);
  // Nothing is nothing; a colour or a limit that means nothing is none.
  expect(readBoard(parse('')).stages).toEqual([]);
  expect(readBoard(parse('## A {limit=x color=z}\n')).stages[0]).toMatchObject({ limit: 0, color: '' });
  // Cards before any heading are a stage of their own, without a heading; anything else under a stage goes with it.
  const loose = readBoard(parse('- a\n- b\n\n## B\n\nA note.\n\n- c\n'));
  expect(loose.stages.map((s) => [s.name, s.at, s.start, s.end, s.cards.map((c) => c.words)])).toEqual([['To do', -1, 0, 2, ['a', 'b']], ['B', 2, 2, 5, ['c']]]);
  // A depth-one item that is not a task is a card, and a task before any card is a card.
  expect(readBoard(parse('## A\n\n  - [x] odd\n- b\n  - plain\n')).stages[0].cards.map((c) => c.words)).toEqual(['odd', 'b', 'plain']);
});

test('a stage: its limit and colour are one replaced heading; every other attribute stays; a headless stage gets a heading', () => {
  expect(run(BOARD, (v) => setStage(v.stages[2], { limit: 3, color: 'o' })).text).toContain('## Done {limit=3 color=o}\n');
  expect(run(BOARD, (v) => setStage(v.stages[1], { limit: 0 })).text).toContain('## Doing {color=g}\n');
  expect(run(BOARD, (v) => setStage(v.stages[0], { color: '' })).text).toContain('## To do\n');
  expect(run('## A {#a .wide limit=2}\n', (v) => setStage(v.stages[0], { color: 'r' })).text).toBe('## A {#a .wide limit=2 color=r}\n');
  expect(run(BOARD, (v) => setStage(v.stages[1], { limit: 1 })).ops).toEqual([]);
  expect(run('- a\n', (v) => setStage(v.stages[0], { color: 'g' })).text).toBe('## To do {color=g}\n\n- a\n');
});

test('stages are added at the end, removed with their cards, and moved past a neighbour with them', () => {
  expect(run(BOARD, () => addStage(parse(BOARD), 'Later')).text).toBe(BOARD + '\n## Later\n');
  expect(run(BOARD, (v) => removeStage(v.stages[0])).text).toBe('## Doing {limit=1 color=g}\n\n- Ship it\n\n## Done\n');
  const right = run(BOARD, (v) => moveStage(v, 0, 1));
  expect(right.ops).toEqual([{ op: 'move', at: 0, n: 5, to: 2 }]);
  expect(right.text).toBe('## Doing {limit=1 color=g}\n\n- Ship it\n\n## To do {color=b}\n\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Review the copy\n\n## Done\n');
  expect(run(BOARD, (v) => moveStage(v, 2, -1)).text).toBe('## To do {color=b}\n\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Review the copy\n\n## Done\n\n## Doing {limit=1 color=g}\n\n- Ship it\n');
  expect(moveStage(readBoard(parse(BOARD)), 0, -1)).toEqual([]);
  expect(moveStage(readBoard(parse(BOARD)), 2, 1)).toEqual([]);
});

test('cards: added after a card and its checklist, or at the end of the stage; removed with the checklist', () => {
  const after = run(BOARD, (v) => addCard(v.stages[0], v.stages[0].cards[0]));
  expect(after.text).toBe(BOARD.replace('  - [ ] Draft\n', '  - [ ] Draft\n-\n'));
  expect(addCard(readBoard(parse(BOARD)).stages[0], readBoard(parse(BOARD)).stages[0].cards[0]).at).toBe(4);
  expect(run(BOARD, (v) => addCard(v.stages[2])).text).toBe(BOARD + '\n-\n');
  expect(run(BOARD, (v) => addCard(v.stages[0])).text).toContain('- Review the copy\n-\n');
  expect(run(BOARD, (v) => removeCard(v.stages[0].cards[0])).text).toBe(BOARD.replace('- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n', ''));
});

test('a card moved to a stage takes its checklist; landing where it is is nothing', () => {
  const v = readBoard(parse(BOARD));
  const [spec, review] = v.stages[0].cards;
  // To the end of Doing.
  const toDoing = run(BOARD, () => moveCard(spec, v.stages[1], 1));
  expect(toDoing.ops).toEqual([{ op: 'move', at: 1, n: 3, to: 4 }]);
  expect(toDoing.text).toBe('## To do {color=b}\n\n- Review the copy\n\n## Doing {limit=1 color=g}\n\n- Ship it\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Done\n');
  expect(moveCard(spec, v.stages[1], 1)!.at).toBe(4);
  // Into the empty stage after the heading; to the front of Doing; back before the first of its own stage.
  expect(run(BOARD, () => moveCard(review, v.stages[2], 0)).text.endsWith('## Done\n\n- Review the copy\n')).toBe(true);
  expect(run(BOARD, () => moveCard(review, v.stages[1], 0)).text).toContain('## Doing {limit=1 color=g}\n\n- Review the copy\n- Ship it\n');
  expect(run(BOARD, () => moveCard(review, v.stages[0], 0)).text).toContain('## To do {color=b}\n\n- Review the copy\n- Write the **spec**\n');
  // Where it is already: before itself, before the card after it, at the end when it is last.
  expect(moveCard(spec, v.stages[0], 0)).toBeNull();
  expect(moveCard(spec, v.stages[0], 1)).toBeNull();
  expect(moveCard(review, v.stages[0], 2)).toBeNull();
  expect(moveCard(review, v.stages[0], 1)).toBeNull();
  // Down one in its own stage: before the end.
  expect(run(BOARD, () => moveCard(spec, v.stages[0], 2)).text).toContain('- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing');
});

test('a checklist: items added in the card, ticked, removed', () => {
  const v = readBoard(parse(BOARD));
  const spec = v.stages[0].cards[0];
  expect(run(BOARD, () => addItem(spec)).text).toContain('  - [ ] Draft\n  - [ ]\n- Review');
  expect(run(BOARD, () => addItem(spec, 0)).text).toContain('  - [x] Outline\n  - [ ]\n  - [ ] Draft\n');
  expect(run(BOARD, () => addItem(spec, -1)).text).toContain('- Write the **spec**\n  - [ ]\n  - [x] Outline');
  expect(run(BOARD, () => addItem(v.stages[0].cards[1])).text).toContain('- Review the copy\n  - [ ]\n\n## Doing');
  expect(run(BOARD, () => setItemDone(spec.items[1], true)).text).toContain('  - [x] Draft');
  expect(run(BOARD, () => setItemDone(spec.items[0], true)).ops).toEqual([]);
  expect(run(BOARD, () => removeItem(spec.items[0])).text).toContain('- Write the **spec**\n  - [ ] Draft\n');
});

test('ops from an editor over one block are carried to where the block is', () => {
  const text: Op = { op: 'text', at: 0, from: 0, to: 0, runs: [{ t: 'x' }] };
  expect(shifted([text, { op: 'head', key: 'title', value: 'a' }, { op: 'move', at: 0, n: 1, to: 2 }], 3)).toEqual([{ ...text, at: 3 }, { op: 'head', key: 'title', value: 'a' }, { op: 'move', at: 3, n: 1, to: 5 }]);
  expect(write(applyAll(parse(BOARD), shifted([{ op: 'text', at: 0, from: 5, to: 5, runs: [{ t: ' (soon)' }] }], 5)))).toContain('## Doing (soon) {limit=1 color=g}');
});

test('the page: a column a stage, the count against the limit, the cards, the checklist progress; and the CSV', () => {
  const p = boardPage(parse(BOARD));
  expect(p.w).toBe(48 + 3 * 232 - 12);
  expect(p.svg).toContain('To do');
  expect(p.svg).toContain('1 / 1');
  expect(p.svg).toContain('☑ 1/2');
  expect(p.svg).toContain('#0072b2');
  expect(p.alt).toBe('To do: Write the spec, Review the copy. Doing: Ship it. Done: –');
  expect(boardPage(parse(BOARD), 1).svg).not.toContain('Review the copy');
  expect(boardPage(parse('')).h).toBe(160);
  expect(boardToCsv(parse(BOARD), ',')).toBe('Stage,Card\r\nTo do,Write the spec\r\nTo do,Review the copy\r\nDoing,Ship it\r\n');
  expect(boardToCsv(parse('## A\n\n- "quoted", yes\n'), ',')).toBe('Stage,Card\r\nA,"""quoted"", yes"\r\n');
  expect(boardToCsv(parse(BOARD), ';').split('\r\n')[0]).toBe('Stage;Card');
});

test('the definition: a blank board is three stages to type under; the templates are canonical and real', () => {
  expect(def.id).toBe('board');
  expect(readBoard(parse(def.blank())).stages.map((s) => s.name)).toEqual(['To do', 'Doing', 'Done']);
  expect(write(parse(def.blank()))).toBe(def.blank());
  expect(templates().map((t) => t.id)).toEqual(['project', 'hiring', 'content']);
  for (const tpl of templates()) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    const v = readBoard(parse(tpl.doc));
    expect(v.stages.length).toBeGreaterThanOrEqual(3);
    expect(v.cards).toBeGreaterThan(5);
    expect(v.stages.some((s) => s.cards.some((c) => c.items.length))).toBe(true);
    expect(def.view(tpl.doc)).toHaveLength(1);
  }
  expect(def.retitle(def.blank(), 'Studio').startsWith('---\ntitle: Studio\n---\n## To do')).toBe(true);
  expect(def.exports!.map((e) => e.ext)).toEqual(['csv']);
});
