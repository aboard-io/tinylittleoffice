// The pinboard as a view of the document, each command as the ops it produces, and two people's ops converging through
// the kernel's transform: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, cross, imageBlock, imageRefs, parse, transform, write, type Doc, type Op } from '../../../doc/index.ts';
import def from '../def.ts';
import { templates } from '../templates.ts';
import {
  addItem,
  addPicture,
  boardText,
  boundsOf,
  duplicateItems,
  frameHolds,
  itemsWithin,
  joinEnds,
  joinItems,
  moveItems,
  newId,
  patchItem,
  penStroke,
  readBoard,
  removeItems,
  setAlt,
  simplify,
  toFront,
  type NewItem,
} from '../model.ts';
import { boardPage, boardToSvg, itemSvg, layWords } from '../view.ts';

const BOARD = [
  'Id | Kind | X | Y | W | H | Color | Words',
  '--- | --- | --- | --- | --- | --- | --- | ---',
  'f1 | frame | 0 | 0 | 600 | 400 | blue | Act one',
  'n1 | note | 40 | 60 | 200 | 160 |  | Jeff **watches**',
  'n2 | note | 300 | 60 | 200 | 160 | pink | Lisa',
  'a1 | arrow | n1 | n2 |  |  |  | sees',
  'n3 | note | 700 | 60 | 200 | 160 |  | Outside',
  '',
].join('\n');
const doc = (text = BOARD) => parse(text);
const run = (d: Doc, ops: Op[]) => write(applyAll(d, ops));
/** A chance that goes round a few answers, so ids differ and the test reads the same each run. */
const cycle = () => {
  let n = 0;
  return () => [0.1, 0.2, 0.3, 0.4, 0.5][n++ % 5];
};
const note = (id: string, x = 0, y = 0, words = ''): NewItem => ({ id, k: 'note', x, y, w: 200, h: 160, color: '', words });

test('a board is read from its table: each row a thing by its id, a join by the ids it joins', () => {
  const v = readBoard(doc());
  expect(v.items.map((i) => `${i.id}:${i.k}`)).toEqual(['f1:frame', 'n1:note', 'n2:note', 'a1:arrow', 'n3:note']);
  expect(v.byId.get('n2')).toMatchObject({ x: 300, y: 60, w: 200, h: 160, color: 'pink', words: 'Lisa' });
  expect(v.byId.get('a1')).toMatchObject({ from: 'n1', to: 'n2', words: 'sees' });
  // The arrow runs from the edge of one note toward the other.
  const [x1, , x2] = joinEnds(v.byId.get('a1')!, v)!;
  expect(x1).toBeGreaterThan(240);
  expect(x2).toBeLessThan(300);
  expect(boundsOf(v)).toEqual([0, 0, 900, 400]);
  // Read leniently: a kind in capitals, a row of no kind left out, a color it does not know left as the kind's own.
  const loose = readBoard(parse('Id | Kind | X | Y | W | H | Color | Words\n--- | --- | --- | --- | --- | --- | --- | ---\nx | NOTE | 1 | 2 | 3 | 4 | teal | hi\ny | blob | 1 | 2 | 3 | 4 |  | no\n'));
  expect(loose.items).toHaveLength(1);
  expect(loose.items[0]).toMatchObject({ k: 'note', color: '', words: 'hi' });
});

test('a new board holds its table; a document with none is given it as the first thing comes', () => {
  expect(def.blank()).toBe('Id | Kind | X | Y | W | H | Color | Words\n--- | --- | --- | --- | --- | --- | --- | ---\n');
  const ops = addItem(parse(def.blank()), note('n9', 10, 20, 'Hello'));
  expect(ops).toEqual([{ op: 'rows', at: 0, r: 0, n: 1, rows: [['n9', 'note', '10', '20', '200', '160', '', 'Hello']] }]);
  const bare = addItem(parse(''), note('n9'));
  expect(bare.map((o) => o.op)).toEqual(['splice', 'rows']);
});

test('moving is cells on X and Y, a thing an op; words and colors are cells of their own; a join never moves', () => {
  const d = doc();
  expect(moveItems(d, ['n1', 'n2', 'a1'], 10, -5)).toEqual([
    { op: 'cells', at: 0, r: 1, c: 2, values: [['50', '55']] },
    { op: 'cells', at: 0, r: 2, c: 2, values: [['310', '55']] },
  ]);
  expect(patchItem(d, 'n2', { words: 'Lisa *Fremont*' })).toEqual([{ op: 'cells', at: 0, r: 2, c: 7, values: [['Lisa *Fremont*']] }]);
  expect(patchItem(d, 'n1', { color: 'green' })).toEqual([{ op: 'cells', at: 0, r: 1, c: 6, values: [['green']] }]);
  expect(patchItem(d, 'n1', { w: 240, h: 180 })).toEqual([{ op: 'cells', at: 0, r: 1, c: 4, values: [['240', '180']] }]);
  // Words that would read as a formula stay words.
  expect(run(d, patchItem(d, 'n1', { words: '=SUM(1)' }))).toContain("| '=SUM(1)\n");
  expect(readBoard(parse(run(d, patchItem(d, 'n1', { words: '=SUM(1)' })))).byId.get('n1')!.words).toBe('=SUM(1)');
});

test('taking things out takes their joins with them, and a join left joining nothing', () => {
  const d = doc();
  const ops = removeItems(d, ['n2']);
  expect(ops).toEqual([
    { op: 'rows', at: 0, r: 3, n: 1 },
    { op: 'rows', at: 0, r: 2, n: 1 },
  ]);
  expect(readBoard(applyAll(d, ops)).items.map((i) => i.id)).toEqual(['f1', 'n1', 'n3']);
  // An arrow to a thing someone else took out is drawn nowhere, and goes with the next thing taken out.
  const dangling = parse(BOARD.replace('a1 | arrow | n1 | n2', 'a1 | arrow | n1 | gone'));
  expect(joinEnds(readBoard(dangling).byId.get('a1')!, readBoard(dangling))).toBeNull();
  expect(readBoard(applyAll(dangling, removeItems(dangling, ['n3']))).items.map((i) => i.id)).toEqual(['f1', 'n1', 'n2']);
  expect(removeItems(d, ['nope'])).toEqual([]);
});

test('a join is a row naming two ids; it is refused between a thing and itself, or a join', () => {
  const d = doc();
  expect(joinItems(d, 'n2', 'n3', 'a2')).toEqual([{ op: 'rows', at: 0, r: 5, n: 1, rows: [['a2', 'arrow', 'n2', 'n3', '', '', '', '']] }]);
  expect(joinItems(d, 'n2', 'n2', 'a2')).toEqual([]);
  expect(joinItems(d, 'n2', 'a1', 'a2')).toEqual([]);
  expect(joinItems(d, 'n2', 'n3', 'l2', 'line')[0]).toMatchObject({ rows: [['l2', 'line', 'n2', 'n3', '', '', '', '']] });
});

test('duplicates are new ids, a step along, the joins among them copied; bring to front puts rows back at the end', () => {
  const d = doc();
  let n = 0;
  const rand = () => [0.1, 0.2, 0.3, 0.4][n++ % 4];
  const { ops, ids } = duplicateItems(d, ['n1', 'n2', 'a1'], 24, rand);
  expect(ids).toHaveLength(3);
  const after = readBoard(applyAll(d, ops));
  const [c1, c2, ca] = ids.map((id) => after.byId.get(id)!);
  expect([c1.x, c1.y, c2.x, c2.y]).toEqual([64, 84, 324, 84]);
  expect(ca).toMatchObject({ k: 'arrow', from: c1.id, to: c2.id, words: 'sees' });
  expect(new Set([...after.items.map((i) => i.id)]).size).toBe(8);
  const front = toFront(d, ['n1']);
  expect(readBoard(applyAll(d, front)).items.map((i) => i.id)).toEqual(['f1', 'n2', 'a1', 'n3', 'n1']);
  expect(toFront(d, ['n3'])).toEqual([]);
});

test('a frame holds what lies inside it; a box chooses what it holds wholly, and a join whose ends it holds', () => {
  const v = readBoard(doc());
  expect(frameHolds(v, v.byId.get('f1')!)).toEqual(['n1', 'n2']);
  expect(itemsWithin(v, 0, 0, 550, 300)).toEqual(['n1', 'n2', 'a1']);
  expect(itemsWithin(v, 0, 0, 260, 300)).toEqual(['n1']);
});

test('a picture is a row and the host’s image fence carrying its id: its words its alt, its bytes never in the document', () => {
  const d = doc();
  const fence = imageBlock('asset:7f3a9c', 'The courtyard', 1280, 720);
  const ops = addPicture(d, { id: 'p1', k: 'picture', x: 40, y: 240, w: 320, h: 180, color: '', words: '' }, fence);
  const text = run(d, ops);
  expect(text).toContain('\np1 | picture | 40 | 240 | 320 | 180 |  |\n');
  expect(text).toContain('```image {#p1 alt="The courtyard" w=1280 h=720}\nasset:7f3a9c\n```\n');
  expect(imageRefs(parse(text))).toEqual(['asset:7f3a9c']);
  const v = readBoard(parse(text));
  expect(v.byId.get('p1')!.image).toEqual({ ref: 'asset:7f3a9c', alt: 'The courtyard', w: 1280, h: 720 });
  // Its words are its alt: the fence replaced, its size riding along.
  const said = run(parse(text), setAlt(parse(text), 'p1', 'The courtyard at night'));
  expect(said).toContain('```image {#p1 alt="The courtyard at night" w=1280 h=720}');
  // Drawn from the host's address where one keeps it; else its words on a card, and nothing fetched.
  expect(itemSvg(v.byId.get('p1')!, v, undefined, { href: (ref) => `/img/${ref}` })).toContain('<image href="/img/asset:7f3a9c"');
  const card = itemSvg(v.byId.get('p1')!, v, undefined, { href: () => null });
  expect(card).not.toContain('<image');
  expect(card).toContain('The courtyard');
  // Taken out, the fence goes with it; a duplicate has a fence of its own.
  const dup = duplicateItems(parse(text), ['p1'], 24, () => 0.5);
  expect(imageRefs(applyAll(parse(text), dup.ops))).toEqual(['asset:7f3a9c']);
  expect(write(applyAll(parse(text), dup.ops)).match(/```image/g)).toHaveLength(2);
  expect(write(applyAll(parse(text), removeItems(parse(text), ['p1'])))).toBe(BOARD);
});

test('a pen stroke keeps its corners as hundredths of its box, its few corners only', () => {
  const pts: [number, number][] = [
    [10, 10],
    [20, 10.4],
    [30, 10],
    [30, 50],
  ];
  const kept = simplify(pts);
  expect(kept).toEqual([
    [10, 10],
    [30, 10],
    [30, 50],
  ]);
  const s = penStroke(kept, 's1', 'pink')!;
  expect(s).toMatchObject({ x: 10, y: 10, w: 20, h: 40, pts: [0, 0, 100, 0, 100, 100] });
  expect(run(doc(), addItem(doc(), s))).toContain('\ns1 | pen | 10 | 10 | 20 | 40 | pink | 0:0;100:0;100:100\n');
});

test('ids: a letter for the kind and four random letters and digits, never one the board has', () => {
  const taken = new Set(['naaaa']);
  let n = 0;
  expect(newId('note', taken, () => (n++ < 4 ? 0 : 0.5))).toBe('nssss');
  expect(newId('frame', new Set(), () => 0.99)).toBe('f9999');
});

/**
 * Two people's ops made against one document, the server's order a then b, as docs/kernel.md §12 has it: the server
 * applies a, then b carried over a; the person who made b, with b applied, takes a carried over b. What each ends with.
 */
function meet(d: Doc, a: Op[], b: Op[]): [string, string] {
  const [bOver, aOver] = cross(b, a);
  return [write(applyAll(applyAll(d, a), bOver)), write(applyAll(applyAll(d, b), aOver))];
}

test('two people editing at once converge: moves of different things, a move and a delete, adds, a join and a new row', () => {
  const d = doc();
  // Two people move two notes: no conflict, both moves kept.
  let [x, y] = meet(d, moveItems(d, ['n1'], 5, 5), moveItems(d, ['n2'], -5, 0));
  expect(x).toBe(y);
  expect(readBoard(parse(x)).byId.get('n1')).toMatchObject({ x: 45, y: 65 });
  expect(readBoard(parse(x)).byId.get('n2')).toMatchObject({ x: 295, y: 60 });
  // Both add a note at the end: both kept, the earlier first.
  [x, y] = meet(d, addItem(d, note('nA', 1, 1, 'A')), addItem(d, note('nB', 2, 2, 'B')));
  expect(x).toBe(y);
  expect(
    readBoard(parse(x))
      .items.map((i) => i.id)
      .slice(-2),
  ).toEqual(['nA', 'nB']);
  // One adds a note while the other draws an arrow to n3: the arrow still joins n2 and n3 (it names them by id).
  [x, y] = meet(d, addItem(d, note('nA')), joinItems(d, 'n2', 'n3', 'a2'));
  expect(x).toBe(y);
  expect(readBoard(parse(x)).byId.get('a2')).toMatchObject({ from: 'n2', to: 'n3' });
  // One takes n1 out while the other moves it and recolors n2: n1 is gone with its arrow, n2's color kept.
  [x, y] = meet(d, removeItems(d, ['n1']), [...moveItems(d, ['n1'], 50, 50), ...patchItem(d, 'n2', { color: 'green' })]);
  expect(x).toBe(y);
  expect(readBoard(parse(x)).items.map((i) => i.id)).toEqual(['f1', 'n2', 'n3']);
  expect(readBoard(parse(x)).byId.get('n2')!.color).toBe('green');
  // Two move one note: each writes only the cells it changed, so a move across and a move down both land; where both
  // change one cell, one of them wins it, the same both ways.
  [x, y] = meet(d, moveItems(d, ['n3'], 10, 0), moveItems(d, ['n3'], 0, 30));
  expect(x).toBe(y);
  expect(readBoard(parse(x)).byId.get('n3')).toMatchObject({ x: 710, y: 90 });
  [x, y] = meet(d, moveItems(d, ['n3'], 10, 10), moveItems(d, ['n3'], 20, 20));
  expect(x).toBe(y);
  expect([710, 720]).toContain(readBoard(parse(x)).byId.get('n3')!.x);
  // One brings n1 to the front while the other edits n2's words and adds a picture.
  const pic = addPicture(d, { id: 'p1', k: 'picture', x: 0, y: 500, w: 320, h: 180, color: '', words: '' }, imageBlock('asset:1', 'Grab'));
  [x, y] = meet(d, toFront(d, ['n1']), [...patchItem(d, 'n2', { words: 'Lisa Fremont' }), ...pic.map((op) => op)]);
  expect(x).toBe(y);
  const v = readBoard(parse(x));
  expect(v.byId.get('n2')!.words).toBe('Lisa Fremont');
  expect(v.byId.get('p1')!.image?.ref).toBe('asset:1');
  expect(v.byId.get('a1')).toMatchObject({ from: 'n1', to: 'n2' });
});

test('every pair of one person’s command and another’s converges under the kernel’s transform (TP1)', () => {
  const d = doc();
  const edits: Op[][] = [
    moveItems(d, ['n1'], 7, 3),
    moveItems(d, ['n1', 'n2'], -4, 9),
    patchItem(d, 'n3', { words: 'Somewhere else' }),
    patchItem(d, 'n2', { color: 'blue', w: 220 }),
    removeItems(d, ['n2']),
    removeItems(d, ['f1', 'n3']),
    addItem(d, note('nX', 5, 5, 'X')),
    joinItems(d, 'n1', 'n3', 'aX'),
    toFront(d, ['n1']),
    duplicateItems(d, ['n1', 'n2', 'a1'], 24, cycle()).ops,
  ];
  for (const [i, a] of edits.entries())
    for (const [j, b] of edits.entries()) {
      if (i === j) continue;
      // Op by op, as a server carries a list: a's ops, then b's carried over them, against b's then a's carried over it.
      const [x, y] = meet(d, a, b);
      expect(x, `${i} then ${j}`).toBe(y);
      // And one op of each, by the transform itself: TP1.
      const [p, q] = [a[0], b[0]];
      const qp = transform(q, p, 'right');
      const pq = transform(p, q, 'left');
      expect(write(applyAll(d, [p, ...(qp ? [qp] : [])])), `${i}/${j} TP1`).toBe(write(applyAll(d, [q, ...(pq ? [pq] : [])])));
    }
});

test('the board as words: frames as headings and what they hold, then the rest, then the arrows', () => {
  const nodes = boardText(readBoard(doc()));
  expect(nodes).toEqual([
    { k: 'h', level: 2, runs: [{ t: 'Act one' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Jeff watches' }] }, { runs: [{ t: 'Lisa' }] }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Outside' }] }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Jeff watches → Lisa (sees)' }] }] },
  ]);
});

test('the page: everything cut to its box with a margin, frames behind, marks drawn as marks; words wrap and shrink to fit a note', () => {
  const page = boardPage(doc());
  expect([page.w, page.h]).toEqual([964, 464]);
  expect(page.svg.indexOf('Act one')).toBeLessThan(page.svg.indexOf('Lisa'));
  expect(page.svg).toContain('<tspan font-weight="600">watches</tspan>');
  expect(page.alt).toBe('A pinboard of 4 things. Frames: Act one');
  expect(boardToSvg(doc())).toMatch(/^<\?xml[^]*<svg[^]*marker-end="url\(#pin-arrow\)"/);
  expect(boardPage(parse(def.blank()))).toMatchObject({ w: 640, h: 400, alt: 'An empty pinboard' });
  const long = layWords('word '.repeat(30), 176, 16, 136);
  expect(long.px).toBeLessThan(16);
  expect(long.lines.length * long.px * 1.3).toBeLessThanOrEqual(136);
});

test('every template is canonical, its joins join things there, and it draws', async () => {
  for (const tpl of templates()) {
    expect(write(parse(tpl.doc)), tpl.id).toBe(tpl.doc);
    const v = readBoard(parse(tpl.doc));
    expect(v.items.length, tpl.id).toBeGreaterThan(10);
    for (const j of v.items.filter((i) => i.k === 'arrow' || i.k === 'line')) expect(joinEnds(j, v), `${tpl.id} ${j.id}`).not.toBeNull();
    expect(new Set(v.items.map((i) => i.id)).size, tpl.id).toBe(v.items.length);
    expect(def.view(tpl.doc)[0].svg.length).toBeGreaterThan(1000);
  }
  expect(await def.templates()).toHaveLength(3);
});
