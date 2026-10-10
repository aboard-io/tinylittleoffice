// Board as a view of the document, each command as the ops it produces, and the files: under node, no DOM.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { pageSvg } from '../../../kit/draw.ts';
import { applyAll, invertAll, parse, write, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { AUTO, EDGE_MIX, STAGE_COLORS, addCard, addItem, autoHue, setLook, addStage, asCards, asItems, blocksOf, cardsIn, carryCards, duplicateCard, duplicateCards, joinLine, moveCard, moveCards, moveItem, moveStage, progress, readBoard, removeCard, removeCards, removeItem, removeStage, setItemDone, setStage, shifted, splitCard, splitItem, stageOf, type BoardView } from '../model.ts';
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

test('chosen cards: found by their span, removed with their checklists, moved past a neighbour as a run, carried to a stage, duplicated', () => {
  const v = readBoard(parse(BOARD));
  const [spec, review] = v.stages[0].cards;
  const ship = v.stages[1].cards[0];
  expect(cardsIn(v, 1, 5)).toEqual([spec, review]);
  expect(cardsIn(v, 4, 7)).toEqual([review, ship]);
  expect(blocksOf(spec)).toHaveLength(3);
  expect(stageOf(v, [spec, review])).toBe(v.stages[0]);
  expect(stageOf(v, [review, ship])).toBeUndefined();
  // Removed: each with its checklist, the stage between them kept.
  expect(run(BOARD, () => removeCards([review, spec])).text).toBe('## To do {color=b}\n\n## Doing {limit=1 color=g}\n\n- Ship it\n\n## Done\n');
  expect(run(BOARD, () => removeCards([review, ship])).text).toBe('## To do {color=b}\n\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing {limit=1 color=g}\n\n## Done\n');
  // Moved: down past the card after, up past the card before; nothing at an edge or across stages.
  const down = moveCards(v, [spec], 1)!;
  expect(down.at).toBe(2);
  expect(run(BOARD, () => down).text).toContain('## To do {color=b}\n\n- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing');
  expect(run(BOARD, () => moveCards(v, [review], -1)).text).toContain('## To do {color=b}\n\n- Review the copy\n- Write the **spec**\n');
  expect(moveCards(v, [review], -1)!.at).toBe(1);
  expect(moveCards(v, [spec], -1)).toBeNull();
  expect(moveCards(v, [spec, review], 1)).toBeNull();
  expect(moveCards(v, [review, ship], 1)).toBeNull();
  // Carried to the end of a stage, as a run; nothing to their own stage or from several.
  const carried = carryCards(v, [spec, review], v.stages[2])!;
  expect(run(BOARD, () => carried).text).toBe('## To do {color=b}\n\n## Doing {limit=1 color=g}\n\n- Ship it\n\n## Done\n\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Review the copy\n');
  expect(carried.at).toBe(4);
  expect(run(BOARD, () => carryCards(v, [ship], v.stages[0])).text).toContain('- Review the copy\n- Ship it\n\n## Doing {limit=1 color=g}\n\n## Done');
  expect(carryCards(v, [ship], v.stages[0])!.at).toBe(5);
  expect(carryCards(v, [spec], v.stages[0])).toBeNull();
  expect(carryCards(v, [review, ship], v.stages[2])).toBeNull();
  // Duplicated: one card after itself; a run after the run, each stage's after its own.
  expect(run(BOARD, () => duplicateCard(spec)).text).toContain('  - [ ] Draft\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Review');
  expect(duplicateCard(spec).at).toBe(4);
  const twice = duplicateCards(v, [spec, review]);
  expect(twice.at).toBe(5);
  expect(run(BOARD, () => twice).text).toContain('- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Review the copy\n\n## Doing');
  expect(run(BOARD, () => duplicateCards(v, [review, ship])).text).toContain('- Review the copy\n- Review the copy\n\n## Doing {limit=1 color=g}\n\n- Ship it\n- Ship it\n');
});

test('pasted blocks as cards and items: a line a card, a task under a card its item, lines of a paragraph a card each', () => {
  expect(write({ head: {}, blocks: asCards(parse('- a\n  - [x] b\n- [ ] c\n  - d\n\nOne\nTwo\n\n## Three\n').blocks) })).toBe('- a\n  - [x] b\n- c\n- d\n- One\n- Two\n- Three\n');
  expect(asCards(parse('  - [ ] lone\n').blocks)).toEqual([{ k: 'li', depth: 0, runs: [{ t: 'lone' }] }]);
  expect(asCards([{ k: 'p', runs: [{ t: 'x\n\ny', b: true }] }])).toEqual([
    { k: 'li', depth: 0, runs: [{ t: 'x', b: true }] },
    { k: 'li', depth: 0, runs: [{ t: 'y', b: true }] },
  ]);
  expect(write({ head: {}, blocks: asItems(parse('- [x] done\n- open\n\nOne\nTwo\n').blocks) })).toBe('  - [x] done\n  - [ ] open\n  - [ ] One\n  - [ ] Two\n');
});

test('the words of a line: Enter splits a card (its checklist stays with the first half) or an item; Backspace joins the line before; Alt+arrows move an item', () => {
  const v = readBoard(parse(BOARD));
  const [spec, review] = v.stages[0].cards;
  // At the start: an empty card above; in the middle: the rest after the checklist; at the end: an empty card after it.
  expect(run(BOARD, () => splitCard(review, 0)).text).toContain('  - [ ] Draft\n-\n- Review the copy\n');
  expect(splitCard(review, 0).at).toBe(5);
  expect(run(BOARD, () => splitCard(spec, 6)).text).toContain('- Write\\ \n  - [x] Outline\n  - [ ] Draft\n- the **spec**\n- Review');
  expect(splitCard(spec, 6).at).toBe(4);
  expect(run(BOARD, () => splitCard(review, 15)).text).toContain('- Review the copy\n-\n\n## Doing');
  // An empty card at its start: one after it.
  expect(run('## A\n\n-\n', (w) => splitCard(w.stages[0].cards[0], 0)).text).toBe('## A\n\n-\n-\n');
  expect(run(BOARD, () => splitItem(spec.items[1], 2)).text).toContain('  - [ ] Dr\n  - [ ] aft\n');
  expect(run(BOARD, () => splitItem(spec.items[0], 7)).text).toContain('  - [x] Outline\n  - [ ]\n  - [ ] Draft');
  expect(run(BOARD, () => splitItem(spec.items[0], 0)).text).toContain('- Write the **spec**\n  - [ ]\n  - [x] Outline');
  // Joins: an item to the item before, an item to its card, a card to the last item of the card above; never to a heading.
  const doc = parse(BOARD);
  expect(run(BOARD, () => joinLine(doc, 3)).text).toContain('  - [x] OutlineDraft\n');
  expect(run(BOARD, () => joinLine(doc, 2)).text).toContain('- Write the **spec**Outline\n  - [ ] Draft\n');
  expect(run(BOARD, () => joinLine(doc, 4)).text).toContain('  - [ ] DraftReview the copy\n\n## Doing');
  expect(joinLine(doc, 1)).toEqual([]);
  expect(joinLine(doc, 6)).toEqual([]);
  // An item past its neighbour, within its checklist only.
  expect(run(BOARD, () => moveItem(spec, 0, 1)).text).toContain('- Write the **spec**\n  - [ ] Draft\n  - [x] Outline\n');
  expect(moveItem(spec, 1, -1)!.at).toBe(2);
  expect(moveItem(spec, 0, -1)).toBeNull();
  expect(moveItem(spec, 1, 1)).toBeNull();
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
  // The everyday ones first, then work, then the school and the street.
  expect(templates().map((t) => t.id)).toEqual(['project', 'week', 'moving', 'hiring', 'content', 'editorial', 'sales', 'bugs', 'classroom', 'mutual-aid']);
  expect(new Set(templates().map((t) => t.name)).size).toBe(templates().length);
  for (const tpl of templates()) {
    expect(write(parse(tpl.doc))).toBe(tpl.doc);
    const d = parse(tpl.doc);
    // A real board: its own title, its stages coloured, cards in every stage and a checklist on one.
    expect(d.head.title, tpl.id).toBeTruthy();
    expect(tpl.blurb.length).toBeGreaterThan(20);
    expect(tpl.doc).not.toMatch(/lorem|\bTODO\b|example\.com/i);
    const v = readBoard(d);
    expect(v.stages.length).toBeGreaterThanOrEqual(4);
    expect(v.cards).toBeGreaterThanOrEqual(7);
    expect(v.stages.every((s) => s.cards.length && s.color), tpl.id).toBe(true);
    // A limit is kept: no template opens over one.
    expect(v.stages.every((s) => !s.limit || s.cards.length <= s.limit), tpl.id).toBe(true);
    expect(v.stages.some((s) => s.cards.some((c) => c.items.length))).toBe(true);
    // Drawn small on the home page, it shows nearly all of itself.
    expect(def.view(tpl.doc)).toHaveLength(1);
    expect(def.view(tpl.doc, { small: true })[0].svg).toContain(v.stages[0].cards[0].words.slice(0, 12));
  }
  // One draws its stages as rows; one carries a note in a card's words.
  expect(templates().filter((tpl) => readBoard(parse(tpl.doc)).rows).map((tpl) => tpl.id)).toEqual(['mutual-aid']);
  expect(templates().some((tpl) => parse(tpl.doc).blocks.some((b) => b.k === 'li' && b.runs.some((r) => r.fn)))).toBe(true);
  expect(def.retitle(def.blank(), 'Studio').startsWith('---\ntitle: Studio\n---\n## To do')).toBe(true);
  expect(def.exports!.map((e) => e.ext)).toEqual(['csv']);
});

test('every stage has a colour: the one written, else the palette by its place; Automatic writes none', () => {
  const v = readBoard(parse(BOARD));
  // To do and Doing say theirs; Done, third, takes the palette's third.
  expect(v.stages.map((s) => [s.color, s.hue])).toEqual([['b', 'b'], ['g', 'g'], ['', AUTO[2]]]);
  expect(readBoard(parse('## A\n\n## B\n\n## C\n\n## D\n\n## E\n\n## F\n\n## G\n\n## H\n')).stages.map((s) => s.hue)).toEqual([...AUTO, AUTO[0]]);
  // Cards before any heading are the first stage, and take the first colour.
  expect(readBoard(parse('- a\n\n## B\n')).stages.map((s) => s.hue)).toEqual([AUTO[0], AUTO[1]]);
  expect(autoHue(9)).toBe(AUTO[2]);
  // The palette is the kit's, each colour once, in the order a chart's series takes them.
  expect(new Set(AUTO).size).toBe(AUTO.length);
  expect(AUTO.every((k) => k in STAGE_COLORS)).toBe(true);
  expect(AUTO.map((k) => STAGE_COLORS[k].hex).slice(0, 4)).toEqual(['#0072b2', '#d55e00', '#009e73', '#a05ca8']);
  // A template's colours read as they did: nothing about them is written.
  for (const tpl of templates()) expect(write(parse(tpl.doc))).toBe(tpl.doc);
  // The page draws each stage's colour, chosen or not.
  const svg = boardPage(parse('## A\n\n- x\n\n## B {color=r}\n\n- y\n')).svg;
  expect(svg).toContain(STAGE_COLORS[AUTO[0]].hex);
  expect(svg).toContain(STAGE_COLORS.r.hex);
});

/* The stage colours against the page, as style.css draws them: mixed EDGE_MIX% with the ink, in sRGB. */
type Rgb = [number, number, number];
const tokens = readFileSync(new URL('../../../styles/tokens.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
function theme(selector: RegExp): Map<string, string> {
  const vars = new Map<string, string>();
  for (const m of tokens.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) if (selector.test(m[1].trim())) for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars.set(d[1], d[2].trim());
  return vars;
}
const LIGHT = theme(/^:root$/);
const DARK = new Map([...LIGHT, ...theme(/^:root\[data-theme='dark'\]$/)]);
function rgb(c: string): Rgb {
  const h = /^#([0-9a-f]{6})$/i.exec(c);
  if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16) / 255) as Rgb;
  const m = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(c);
  if (!m) throw new Error(`not a colour: ${c}`);
  const [hh, s, l] = [+m[1] / 360, +m[2] / 100, +m[3] / 100];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => ((t = (t + 1) % 1), t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p);
  return [f(hh + 1 / 3), f(hh), f(hh - 1 / 3)];
}
const mix = (a: Rgb, b: Rgb, pa: number): Rgb => a.map((v, i) => v * pa + b[i] * (1 - pa)) as Rgb;
const lum = (c: Rgb) => [0.2126, 0.7152, 0.0722].reduce((n, w, i) => n + w * (c[i] <= 0.03928 ? c[i] / 12.92 : ((c[i] + 0.055) / 1.055) ** 2.4), 0);
const contrast = (a: Rgb, b: Rgb) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

test('the stage colours read in the light and in the dark: edges at 3:1 on every surface, the heading words on its tint, each colour its own', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  expect(css).toContain(`--edge: color-mix(in srgb, var(--c) ${EDGE_MIX}%, var(--to-ink));`);
  expect(css).toContain('background: color-mix(in srgb, var(--edge) 18%, var(--to-surface-2));');
  for (const vars of [LIGHT, DARK]) {
    const ink = rgb(vars.get('--to-ink')!);
    const edges = Object.values(STAGE_COLORS).map((c) => mix(rgb(c.hex), ink, EDGE_MIX / 100));
    for (const e of edges) {
      for (const surface of ['--to-bg', '--to-surface', '--to-surface-2']) expect(contrast(e, rgb(vars.get(surface)!))).toBeGreaterThanOrEqual(3);
      const tint = mix(e, rgb(vars.get('--to-surface-2')!), 0.18);
      expect(contrast(ink, tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgb(vars.get('--to-ink-2')!), tint)).toBeGreaterThanOrEqual(4.5);
    }
    // No two colours alike: each pair apart by a clear step in some channel.
    for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) expect(Math.max(...edges[i].map((v, k) => Math.abs(v - edges[j][k])))).toBeGreaterThan(0.12);
  }
});

test('the look: stages as rows is `look: rows` in the head, columns the default and not written; the page draws bands', () => {
  expect(readBoard(parse(BOARD)).rows).toBe(false);
  const on = run(BOARD, (v) => (expect(v.rows).toBe(false), setLook(parse(BOARD), true)));
  expect(on.text.startsWith('---\nlook: rows\n---\n## To do {color=b}')).toBe(true);
  expect(readBoard(parse(on.text)).rows).toBe(true);
  expect(run(on.text, () => setLook(parse(on.text), false)).text).toBe(BOARD);
  expect(setLook(parse(on.text), true)).toEqual([]);
  expect(setLook(parse(BOARD), false)).toEqual([]);
  // Read leniently, written as it was.
  expect(readBoard(parse('---\nlook: Rows\n---\n## A\n')).rows).toBe(true);
  expect(write(parse('---\nlook: columns\n---\n## A\n'))).toBe('---\nlook: columns\n---\n## A\n');
  // The page: a band a stage, one under another, the cards across it.
  const p = boardPage(parse(on.text));
  expect(p.svg).toContain('data-row="2"');
  expect(p.svg).not.toContain('data-col');
  expect(p.svg).toContain('☑ 1/2');
  expect(p.alt).toBe('To do: Write the spec, Review the copy. Doing: Ship it. Done: –');
  expect(boardPage(parse(on.text), 1).svg).not.toContain('Review the copy');
  const band = (n: number) => boardPage(parse(`---\nlook: rows\n---\n## A\n\n${'- x\n'.repeat(n)}\n## B\n\n- y\n`)).h;
  // Four cards are one line across; a fifth wraps onto a second line of the band, a card taller.
  expect(band(4)).toBe(band(1));
  expect(band(5)).toBe(band(4) + 37 + 8);
});

// The drawings as they were before thumbnails (sha1 of every page's SVG): a page, and drawn small on a slide, are
// unchanged by `thumb`.
const sha1 = (pages: { w: number; h: number; svg: string }[]) => createHash('sha1').update(pages.map((p) => pageSvg(p)).join('\n')).digest('hex');
const BOARD5 = '## Ideas\n\n- A blog\n\n## To do\n\n- Write the words\n- Photograph the studio\n\n## Doing\n\n- Build the home page\n\n## Review\n\n- The logo\n\n## Done\n\n- Pick the domain name\n';

test('a thumbnail of a five-stage board is landscape and holds the first three stages at full width; a page and a slide are as before', () => {
  const [p] = def.view(BOARD5, { small: true, thumb: true });
  expect(p.w).toBeGreaterThan(p.h);
  expect(p.w).toBe(boardPage(parse(BOARD5)).w - 2 * 232);
  expect(p.svg).toContain('Doing');
  expect(p.svg).not.toContain('Review');
  expect(p.svg).not.toContain('Pick the domain name');
  // A stage of many cards keeps the ones that fit whole, inside the page.
  const long = '## Many\n\n' + Array.from({ length: 30 }, (_, i) => `- Card ${i + 1}`).join('\n') + '\n';
  const [q] = def.view(long, { small: true, thumb: true });
  expect(q.w).toBeGreaterThan(q.h);
  expect(q.svg).toContain('Card 1<');
  expect(q.svg).not.toContain('Card 12<');
  expect(sha1(def.view(BOARD5))).toBe('09e6df47b7a6dfab327530b3a28c4cc9cd3330d1');
  expect(sha1(def.view(BOARD5, { small: true }))).toBe('09e6df47b7a6dfab327530b3a28c4cc9cd3330d1');
});
