// Diagram's model and view under node: each kind read from its lines and drawn (each kind's example in the corpus
// gives the same shapes every time), what a tap on each shape edits, and every command as the kernel's ops: each applies,
// writes canonical text, and is undone exactly by its inverse.
import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { pageSvg, textWidth } from '../../../kit/draw/draw.ts';
import { applyAll, invertAll, parse, write, type Block, type Doc, type Op, type Run } from '../../../doc/index.ts';
import { iconOf, labelLines, readDrawing } from '../../draw/model.ts';
import def from '../def.ts';
import { register, setLanguage } from '../../../kit/core/i18n.ts';
import {
  charsOf,
  childOf,
  commitDraft,
  connect,
  dropIn,
  dropOn,
  duplicateThing,
  edgesOf,
  follow,
  partFor,
  wordsInto,
  wordsOn,
  type Which,
  kindOf,
  lineOf,
  linesOf,
  demoteThing,
  moveAcross,
  placeStep,
  setShape,
  shapeOf,
  stepName,
  moveItem,
  moveThing,
  promoteThing,
  newThing,
  nextThing,
  pasteThings,
  removeThing,
  rename,
  setEdge,
  setKind,
  thingBlocks,
  tidy,
  withIcon,
  newLaneName,
  type Hit,
} from '../model.ts';
import { templates } from '../templates.ts';
import { diagramPage, era, lanesOf, layout, moment, places, regionAt, toDrawing, vennOf, type DShape } from '../view.ts';

const doc = (kind: string, body: string): Doc => parse(`---\nkind: ${kind}\n---\n${body}`);
const newThingAt = (_d: Doc, x: { at: number; block: { depth: number; runs: Run[] } }) => [x.at, x.block.depth, x.block.runs.map((r) => r.t).join('')];
const regionsOf = (d: ReturnType<typeof layout>) => d.shapes.filter((s) => s.region !== undefined).map((s) => s.region);
/** The ops applied, written out; and checked: canonical, and undone exactly by their inverse. */
function run(d: Doc, ops: Op[]): string {
  const after = applyAll(d, ops);
  const text = write(after);
  expect(write(parse(text))).toBe(text);
  expect(applyAll(after, invertAll(d, ops))).toStrictEqual(d);
  return text.replace(/^---\n(?:.*\n)*?---\n/, '');
}
const old = (app: string) => (JSON.parse(readFileSync(joinPath(import.meta.dirname, '../../../../test/doc/corpus/apps', `${app}.json`), 'utf8')) as { docs: { text: string }[] }).docs[0].text;
const count = (d: Doc) => {
  const s = layout(d).shapes;
  // (A tree's line to the one above is tapped too, as a branch; it is not one of the things.)
  const thing = (x: DShape) => x.hit && !(x.hit.k === 'edge' && x.hit.branch);
  return { things: s.filter((x) => x.k !== 'k' && x.k !== 'j').length, joins: s.filter((x) => x.k === 'k' || x.k === 'j').length, hits: s.filter(thing).length };
};

describe('reading', () => {
  test('the kind is the head field; none (or an unknown one) is a mind map', () => {
    expect(kindOf(parse('- a\n'))).toBe('mind');
    expect(kindOf(doc('lanes', '- a: b\n'))).toBe('lanes');
    expect(kindOf(doc('Venn', '- a\n'))).toBe('venn');
    expect(kindOf(doc('pie', '- a\n'))).toBe('mind');
  });
  test('a line: its key before the first ": ", its words, and the things of its list, at the line editor\'s offsets', () => {
    const l = linesOf(doc('seating', '- :star: Top table: Jo, **Sam**, Maria\n'))[0];
    expect(l.key).toMatchObject({ from: 0, words: 'Top table', icon: 'star' });
    expect(l.items.map((p) => p.words)).toEqual(['Jo', 'Sam', 'Maria']);
    expect(l.chars.slice(l.items[1].from, l.items[1].to)).toBe('Sam');
    const plain = linesOf(doc('mind', '- Just words, no key\n'))[0];
    expect(plain.key).toBeNull();
    expect(plain.words.words).toBe('Just words, no key');
    // "10:30" is not a key: a key ends at a colon and a space.
    expect(linesOf(doc('timeline', '- 10:30: Coffee\n'))[0].key?.words).toBe('10:30');
  });
});

describe('the eight kinds drawn', () => {
  test('each kind’s example in the corpus (test/doc/corpus/apps), named by kind, draws these shapes', () => {
    expect(count(doc('org', old('org')))).toEqual({ things: 6, joins: 6, hits: 7 });
    expect(count(doc('mind', old('mind')))).toEqual({ things: 9, joins: 8, hits: 9 });
    expect(count(doc('family', old('family')))).toEqual({ things: 6, joins: 5, hits: 6 });
    // Four lanes (a band and a name each), six steps, five arrows between them at right angles (a line and a head each).
    expect(count(doc('lanes', old('lanes')))).toEqual({ things: 24, joins: 0, hits: 10 });
    // Presented, a lane comes with its first step and an arrow with the step it reaches, one click a step (Paul,
    // 2026-10-13: "lane, graphic, lane, graphic"): order to doorstep is Customer, Store, Store, Warehouse, Carrier,
    // Carrier, Customer, so the shapes shown after each step are 3 (band, name, box), 8 (a new lane, an arrow and its
    // head, a box), 11 (an arrow, its head and a box), 16, 21, 24, 27: every shape.
    const order = doc(
      'lanes',
      '- Customer: Places an order\n- Store: Checks the stock\n- Store: In stock?\n- Warehouse: Picks and packs it\n- Carrier: Picks up the package\n- Carrier: Delivers it\n- Customer: Signs for it\n',
    );
    expect(layout(order).steps).toEqual([3, 8, 11, 16, 21, 24, 27]);
    expect(layout(order).shapes).toHaveLength(27);
    expect(def.steps!(write(order))).toBe(7);
    // The page at step n draws the first so many shapes and no more: the words of the first two lanes come with steps one and two, the third lane's not before step four.
    const at = (n: number) => diagramPage(order, n).svg;
    expect(at(0)).not.toContain('Customer');
    expect(at(1)).toContain('Customer');
    expect(at(1)).not.toContain('Store');
    expect(at(2)).toContain('Store');
    expect(at(2)).toContain('Checks the stock');
    expect(at(2)).not.toContain('In stock');
    expect(at(3)).toContain('In stock');
    expect(at(3)).not.toContain('Warehouse');
    expect(at(4)).toContain('Warehouse');
    expect(at(7)).toBe(at(Infinity));
    // An axis, eight dots and their boxes, one era.
    expect(count(doc('timeline', old('timeline')))).toEqual({ things: 18, joins: 8, hits: 9 });
    // Three circles, three names, eight things.
    expect(count(doc('venn', old('venn')))).toEqual({ things: 15, joins: 0, hits: 12 });
    expect(count(doc('seating', old('seating')))).toEqual({ things: 18, joins: 0, hits: 18 });
    expect(count(doc('net', old('net')))).toEqual({ things: 6, joins: 5, hits: 11 });
  });
  test('every template draws something, every thing in it can be tapped, and its page has words for who cannot see it', () => {
    for (const tpl of templates()) {
      const d = parse(tpl.doc);
      const page = diagramPage(d);
      expect(page.svg.length).toBeGreaterThan(20);
      expect(page.alt).toBeTruthy();
      if (tpl.id === kindOf(d)) {
        expect(layout(d).shapes).toEqual([]);
        continue;
      }
      expect(layout(d).shapes.filter((s) => s.hit).length, tpl.id).toBeGreaterThan(2);
    }
    // Blank first for every kind, and each template id once.
    const ids = templates().map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !id.includes('-'))).toEqual(['mind', 'org', 'family', 'lanes', 'timeline', 'venn', 'seating', 'net']);
  });
  test('the blank pages are named by their kind, the mind map first, and no template is called Blank (Paul, 2026-10-10)', () => {
    const all = templates();
    for (const x of all) expect(x.name, x.id).not.toMatch(/blank/i);
    expect(all[0]).toMatchObject({ id: 'mind', name: 'Mind map', blurb: 'An empty mind map to start from.' });
    expect(kindOf(parse(all[0].doc))).toBe(kindOf(parse(def.blank())));
    const blanks = all.filter((x) => !x.id.includes('-'));
    expect(blanks.map((x) => x.name)).toEqual(['Mind map', 'Org chart', 'Family tree', 'Swimlanes', 'Timeline', 'Venn', 'Seating chart', 'Network']);
    expect(def.blankInTemplates).toBe(true);
  });
  test('the templates: at least three real ones a kind, each a whole document with a title, a blurb and no filler', () => {
    const real = templates().filter((x) => x.id.includes('-'));
    expect(real.length).toBeGreaterThanOrEqual(24);
    for (const k of ['mind', 'org', 'family', 'lanes', 'timeline', 'venn', 'seating', 'net']) expect(real.filter((x) => x.id.startsWith(`${k}-`)).length, k).toBeGreaterThanOrEqual(3);
    // Each its kind's group, after that kind's blank page.
    const ids = templates().map((x) => x.id);
    for (const x of real) expect(ids.indexOf(x.id), x.id).toBeGreaterThan(ids.indexOf(x.id.split('-')[0]));
    expect(new Set(real.map((x) => x.name)).size).toBe(real.length);
    for (const x of real) {
      const d = parse(x.doc);
      expect(kindOf(d), x.id).toBe(x.id.split('-')[0]);
      expect(d.head.title, x.id).toBeTruthy();
      expect(x.blurb.length, x.id).toBeGreaterThan(20);
      expect(x.doc, x.id).not.toMatch(/[Ll]orem|ipsum|TODO|TBD|xxx/);
      for (const [y] of x.doc.matchAll(/\b20[2-9]\d\b/g)) expect(+y, x.id).toBeLessThanOrEqual(2027);
      // Drawn small for the home page's list, with something on it.
      const [small] = def.view(x.doc, { small: true });
      expect(small.svg.length, x.id).toBeGreaterThan(500);
    }
    // What a diagram can do, used: icons on things, joins across a tree, decisions, eras, three sets, two-set overlaps.
    const all = real.map((x) => x.doc).join('\n');
    expect(all).toMatch(/:plane:/);
    expect(real.filter((x) => /^~ /m.test(x.doc)).length).toBeGreaterThanOrEqual(10);
    expect(all).toMatch(/\?\n/);
    expect(all).toMatch(/ – /);
    expect(all).toMatch(/& .* & /);
  });
  test('a network thing with an icon is wide enough for the icon and its whole name', () => {
    const d = doc('net', '- Television :film:\n- Router\n\n~ Router -- Television\n');
    const [tv, router] = layout(d).shapes;
    expect(tv.text).toBe(':film Television');
    // The icon (24) and the whole name fit beside the shape's padding (30), and the plain one is narrower.
    expect(tv.w - 24 - 30).toBeGreaterThanOrEqual(textWidth('Television', 14));
    expect(tv.w).toBeGreaterThan(router.w + 24);
  });
  test('the definition: one page, an SVG file, a hand-off to Draw', async () => {
    const tpl = templates().find((x) => x.id === 'org-company')!;
    expect(def.view(tpl.doc)).toHaveLength(1);
    expect(def.view('')).toHaveLength(1);
    const svg = await def.exports![0].build(tpl.doc, { def, title: '', link: '' });
    expect(new TextDecoder().decode(svg as Uint8Array)).toMatch(/^<\?xml[\s\S]*<svg[\s\S]*Ada Diaz/);
    expect(def.title(tpl.doc)).toBe('Who reports to whom');
    expect(def.title(def.retitle(tpl.doc, 'People'))).toBe('People');
  });
  test('open in Draw: the same shapes, a row each, snapped to its grid', () => {
    const d = parse(templates().find((x) => x.id === 'net-webapp')!.doc);
    const drawing = readDrawing(parse(toDrawing(d)));
    expect(drawing.shapes).toHaveLength(layout(d).shapes.length);
    expect(drawing.shapes.filter((s) => s.k === 'k')).toHaveLength(4);
    expect(write(parse(toDrawing(d)))).toBe(toDrawing(d));
  });
  test('the timeline spaces known years as they fell; a span is an era', () => {
    expect(moment('1969')).toBe(1969);
    expect(moment('44 BC')).toBe(-44);
    expect(Number.isNaN(moment('Soon'))).toBe(true);
    expect(era('1990–1999')).toEqual([1990, 1999]);
    expect(era('1999')).toBeNull();
    const xs = places(['1900', '1901', '2000']);
    expect(xs[2] - xs[1]).toBeGreaterThan(xs[1] - xs[0]);
  });
  test('regions: a tap in a lane is in that lane; in the circles, in the sets round it', () => {
    const lanes = layout(doc('lanes', old('lanes')));
    const band = lanes.shapes.find((s) => s.region === 'Sales')!;
    expect(regionAt(lanes, band.x + band.w - 4, band.y + 4)).toBe('Sales');
    const venn = layout(doc('venn', '- Fast: a\n- Cheap: b\n'));
    const [a, b] = venn.shapes.filter((s) => s.region);
    expect(regionAt(venn, a.x + 30, a.y + a.h / 2)).toBe('Fast');
    expect(regionAt(venn, (a.x + a.w + b.x) / 2, a.y + a.h / 2)).toBe('Fast & Cheap');
    expect(regionAt(venn, 1, 1)).toBeUndefined();
  });
});

describe('commands as ops', () => {
  test('a new thing is a draft, made real by one splice of its first words', () => {
    const d = doc('org', '- Ada | CEO\n  - Ben | CTO\n');
    const draft = newThing(d);
    expect(draft).toMatchObject({ at: 2, n: 0, block: { depth: 1 } });
    expect(run(d, commitDraft(draft, { ...draft.block, runs: [{ t: 'Cy | CFO' }] }))).toBe('- Ada | CEO\n  - Ben | CTO\n  - Cy | CFO\n');
    // Nothing yet: a root.
    expect(newThing(doc('mind', ''))).toMatchObject({ at: 0, block: { depth: 0, runs: [] } });
    // A step in a lane starts with the lane's name, and goes last, so no step moves; a new table is numbered on.
    expect(charsOf(newThing(doc('lanes', '- Sales: Calls\n- Shop: Sells\n'), 'Sales').block.runs)).toBe('Sales: ');
    expect(newThing(doc('lanes', '- Sales: Calls\n- Shop: Sells\n'), 'Sales').at).toBe(2);
    expect(charsOf(newThing(doc('seating', '- Top table: Jo\n')).block.runs)).toBe('Table 2: ');
    // The table's offered name is chosen whole, so the first letter typed replaces it and the ": " stays.
    expect(newThing(doc('seating', '- Top table: Jo\n')).sel).toEqual([0, 7]);
    expect(newThing(doc('seating', '')).sel).toEqual([0, 9]);
  });
  test('a new lane and a new table are named in the reader’s language, numbered past the names there are', async () => {
    register('de', readFileSync(joinPath(import.meta.dirname, '../../../i18n/de.ftl'), 'utf8'));
    await setLanguage('de');
    try {
      expect(newLaneName(['Kasse'])).toBe('Bahn 2');
      expect(newLaneName(['Kasse', 'bahn 2'])).toBe('Bahn 3');
      expect(charsOf(newThing(doc('seating', '- Ehrentisch: Jo\n')).block.runs)).toBe('Tisch 2: ');
    } finally {
      await setLanguage(null);
    }
  });
  test('a thing more in a list is the line with a comma on the end, replacing it once typed', () => {
    const d = doc('venn', '- Fast: sprinting\n- Cheap: walking\n');
    const draft = newThing(d, 'Fast');
    expect(draft).toMatchObject({ at: 0, n: 1 });
    expect(charsOf(draft.block.runs)).toBe('Fast: sprinting, ');
    expect(run(d, commitDraft(draft, { ...draft.block, runs: [{ t: 'Fast: sprinting, espresso' }] }))).toBe('- Fast: sprinting, espresso\n- Cheap: walking\n');
    // An overlap no line names yet: a new line for it.
    expect(charsOf(newThing(d, 'Fast & Cheap').block.runs)).toBe('Fast & Cheap: ');
    // Named in the other order, it is the same overlap.
    expect(newThing(doc('venn', '- A: x\n- B: y\n- A & B: z\n'), 'B & A')).toMatchObject({ at: 2, n: 1 });
  });
  test('Enter: a root gains a branch, a branch a sibling after its family; a step its next in the same lane', () => {
    const d = doc('mind', '- Root\n  - A\n    - A1\n  - B\n');
    expect(nextThing(d, { k: 'line', at: 0, part: 'all' })).toMatchObject({ at: 4, block: { depth: 1 } });
    expect(nextThing(d, { k: 'line', at: 1, part: 'all' })).toMatchObject({ at: 3, block: { depth: 1 } });
    expect(childOf(d, 1)).toMatchObject({ at: 3, block: { depth: 2 } });
    const lanes = doc('lanes', '- Sales: Calls\n- Shop: Sells\n');
    const next = nextThing(lanes, { k: 'line', at: 0, part: 'words' })!;
    expect([next.at, charsOf(next.block.runs)]).toEqual([1, 'Sales: ']);
  });
  test('taking things away: a tree item (its family up a level, its dotted lines gone), one thing of a list, a lane, a thing of a network', () => {
    const org = doc('org', '- Ada\n  - Ben\n    - Cy\n- Eve\n\n~ Ben -- Eve: advises\n');
    expect(run(org, removeThing(org, { k: 'line', at: 1, part: 'all' }))).toBe('- Ada\n  - Cy\n- Eve\n');
    const seats = doc('seating', '- Top table: Jo, Sam, Maria\n');
    expect(run(seats, removeThing(seats, { k: 'line', at: 0, part: 1 }))).toBe('- Top table: Jo, Maria\n');
    expect(run(seats, removeThing(seats, { k: 'line', at: 0, part: 2 }))).toBe('- Top table: Jo, Sam\n');
    expect(run(seats, removeThing(seats, { k: 'line', at: 0, part: 'key' }))).toBe('');
    const lanes = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(run(lanes, removeThing(lanes, { k: 'lane', name: 'sales' }))).toBe('- Shop: Sells\n');
    const net = doc('net', '- Cache\n\n~ API -> Cache\n~ API -> Database\n');
    expect(run(net, removeThing(net, { k: 'line', at: 0, part: 'all' }))).toBe('~ API -> Database\n');
    expect(run(net, removeThing(net, { k: 'node', name: 'API' }))).toBe('- Cache\n');
    expect(run(net, removeThing(net, { k: 'edge', at: 2 }))).toBe('- Cache\n\n~ API -> Cache\n');
  });
  test('dragging: under another in a tree; after a step and into its lane; a person to another table, beside another', () => {
    const tree = doc('mind', '- Root\n  - A\n  - B\n    - B1\n');
    expect(run(tree, dropOn(tree, { k: 'line', at: 2, part: 'all' }, { k: 'line', at: 1, part: 'all' }))).toBe('- Root\n  - A\n    - B\n      - B1\n');
    // A step is put where it is let go, by placeStep, not after what it lands on.
    const lanes = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(dropOn(lanes, { k: 'line', at: 0, part: 'words' }, { k: 'line', at: 1, part: 'words' })).toEqual([]);
    expect(dropIn(lanes, { k: 'line', at: 2, part: 'words' }, 'Shop')).toEqual([]);
    const time = doc('timeline', '- 1: a\n- 2: b\n- 3: c\n');
    expect(run(time, dropOn(time, { k: 'line', at: 2, part: 'all' }, { k: 'line', at: 0, part: 'all' }))).toBe('- 1: a\n- 3: c\n- 2: b\n');
    const seats = doc('seating', '- Top: Jo, Sam\n- Two: Ann, Bob\n');
    expect(run(seats, dropOn(seats, { k: 'line', at: 0, part: 1 }, { k: 'line', at: 1, part: 0 }))).toBe('- Top: Jo\n- Two: Ann, Sam, Bob\n');
    expect(run(seats, dropOn(seats, { k: 'line', at: 0, part: 0 }, { k: 'line', at: 1, part: 'key' }))).toBe('- Top: Sam\n- Two: Ann, Bob, Jo\n');
    // Within one table: a seat further round.
    expect(run(seats, moveItem(seats, 1, 0, 1, 1))).toBe('- Top: Jo, Sam\n- Two: Bob, Ann\n');
    // To a table with nobody yet.
    const empty = doc('seating', '- Top: Jo, Sam\n- Two:\n');
    expect(run(empty, moveItem(empty, 0, 0, 1))).toBe('- Top: Sam\n- Two: Jo\n');
  });
  test('a step is put where it is let go: its lane, and its place among the others; nothing else moves (#28)', () => {
    const at = (d: Doc, i: number, lane: string, slot: number) => run(d, placeStep(d, i, lane, slot));
    const three = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    // Another lane, its place kept; another place, its lane kept; both at once; and the end.
    expect(at(three, 2, 'Shop', 2)).toBe('- Sales: Calls\n- Shop: Sells\n- Shop: Closes\n');
    expect(at(three, 2, 'Sales', 0)).toBe('- Sales: Closes\n- Sales: Calls\n- Shop: Sells\n');
    expect(at(three, 0, 'Shop', 2)).toBe('- Sales:\n- Shop:\n- Shop: Sells\n- Sales: Closes\n- Shop: Calls\n');
    expect(at(three, 1, 'Shop', 1)).toBe('- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(placeStep(three, 1, 'Shop', 1)).toEqual([]);
    // A step that names no lane followed the one before it: given its lane's name where it would now follow another.
    const follows = doc('lanes', '- Sales: Calls\n- Closes\n- Shop: Sells\n');
    expect(at(follows, 0, 'Shop', 0)).toBe('- Sales:\n- Shop:\n- Shop: Calls\n- Sales: Closes\n- Shop: Sells\n');
    expect(at(follows, 2, 'Shop', 1)).toBe('- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    // One lane with no name, as a blank swimlane or a mind map made one: named "Lane 1" once a step would follow another lane's.
    const one = doc('lanes', '- Asks\n- Answers\n- Thanks\n');
    expect(at(one, 1, 'Lane 2', 1)).toBe('- Lane 1: Asks\n- Lane 2: Answers\n- Lane 1: Thanks\n');
    expect(at(one, 2, 'Lane 2', 2)).toBe('- Asks\n- Answers\n- Lane 2: Thanks\n');
    expect(at(one, 2, '', 0)).toBe('- Thanks\n- Asks\n- Answers\n');
    // The lanes keep their order, a new one at the bottom (Paul, 2026-10-18: four steps, the fourth into Lane 2,
    // then the second into Lane 3): where a step would name a lane first elsewhere, the lanes are named in order on top.
    const four = doc('lanes', '- One\n- Two\n- Three\n- Lane 2: Four\n');
    const placed = applyAll(four, placeStep(four, 1, 'Lane 3', 1));
    expect(write(placed).split('---\n')[2]).toBe('- Lane 1:\n- Lane 2:\n- Lane 3:\n- Lane 1: One\n- Lane 3: Two\n- Lane 1: Three\n- Lane 2: Four\n');
    expect(lanesOf(placed).lanes).toEqual(['Lane 1', 'Lane 2', 'Lane 3']);
    // Those lines are kept, not added to, as steps go on moving.
    const again = applyAll(placed, placeStep(placed, 6, 'Lane 3', 0));
    expect(lanesOf(again).lanes).toEqual(['Lane 1', 'Lane 2', 'Lane 3']);
    expect(write(again).split('---\n')[2]).toMatch(/^- Lane 1:\n- Lane 2:\n- Lane 3:\n- Lane 3: Four\n/);
    // A step taken away, or moved up or down, leaves every other step its lane and the lanes their order.
    const kept = doc('lanes', '- Sales: Calls\n- Closes\n- Shop: Sells\n');
    expect(run(kept, removeThing(kept, { k: 'line', at: 0, part: 'words' }))).toBe('- Sales: Closes\n- Shop: Sells\n');
    const shuffled = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(lanesOf(applyAll(shuffled, removeThing(shuffled, { k: 'line', at: 0, part: 'words' }))).lanes).toEqual(['Sales', 'Shop']);
    const down = moveThing(shuffled, { k: 'line', at: 0, part: 'words' }, 1)!;
    expect(lanesOf(applyAll(shuffled, down.ops)).lanes).toEqual(['Sales', 'Shop']);
    expect(write(applyAll(shuffled, down.ops)).split('---\n')[2]).toMatch(/- Shop: Sells\n- Sales: Calls\n- Sales: Closes\n$/);
    // Mod+Alt+Right: the next lane, its place kept.
    expect(run(three, moveAcross(three, { k: 'line', at: 0, part: 'words' }, 1)!.ops)).toBe('- Sales:\n- Shop:\n- Shop: Calls\n- Shop: Sells\n- Sales: Closes\n');
  });
  test('a tap in a lane adds its step last; editing, the lanes end in an empty band for a new one; the picture shown has none', () => {
    const one = doc('lanes', '- Asks\n- Answers\n');
    expect(regionsOf(layout(one, true))).toEqual(['', 'Lane 2']);
    expect(regionsOf(layout(one))).toEqual(['']);
    expect(regionsOf(layout(doc('lanes', '- Sales: Calls\n- Lane 3: Sells\n'), true))).toEqual(['Sales', 'Lane 3', 'Lane 4']);
    expect(newThing(one, '')).toMatchObject({ at: 2, block: { runs: [] } });
    // The lane with no name, once another follows it, is named first, so the step goes last and stays in it.
    const two = doc('lanes', '- Asks\n- Lane 2: Answers\n');
    const d = newThing(two, '');
    expect(d.at).toBe(2);
    expect(run(two, commitDraft(d, { ...d.block, runs: [...d.block.runs, { t: 'Thanks' }] }))).toBe('- Lane 1: Asks\n- Lane 2: Answers\n- Lane 1: Thanks\n');
  });
  test('swimlanes branch by connections, with a mind map’s arrows and words, drawn at right angles; a step’s shape is what it does (Paul, 2026-10-18)', () => {
    const hospital = doc(
      'lanes',
      '- Patient:\n- NP:\n- Nurse:\n- Doctor:\n- EHR:\n- Patient: Arrives at hospital\n- NP: Triage\n- EHR: Retrieve patient record\n- NP: Doctor needed?\n- NP: Treat patient\n- Nurse: Prepare patient\n- Doctor: Treat patient\n- EHR: Update patient record\n- Nurse: Instruct patient\n- Nurse: Discharge\n- Patient: Leaves hospital\n\n' +
        '~ Triage <-> Retrieve patient record\n~ Doctor needed? -> NP: Treat patient: No\n~ Doctor needed? -> Prepare patient: Yes\n~ NP: Treat patient -> Instruct patient\n~ Doctor: Treat patient -> Instruct patient\n~ Doctor: Treat patient <-> Update patient record\n',
    );
    const d = layout(hospital);
    const box = (words: string, n = 0) => d.shapes.filter((x) => x.hit?.k === 'line' && x.text === words)[n];
    // Where the flow starts and ends, a pill; a question, a hexagon; anything else, a box.
    expect(['Arrives at hospital', 'Doctor needed?', 'Triage', 'Retrieve patient record', 'Leaves hospital'].map((w) => box(w).k)).toEqual(['o', 'h', 'r', 'r', 'o']);
    // Every line runs across or down, never aslant: each pair of points shares an x or a y.
    const lines = d.shapes.filter((x) => x.k === 'w');
    const points = (x: (typeof lines)[number]) => Array.from({ length: x.pts!.length / 2 }, (_, i) => [x.x + (x.pts![2 * i] / 100) * x.w, x.y + (x.pts![2 * i + 1] / 100) * x.h]);
    const aslant = lines.flatMap((l) => points(l).filter((p, i, ps) => i > 0 && Math.abs(p[0] - ps[i - 1][0]) > 0.6 && Math.abs(p[1] - ps[i - 1][1]) > 0.6));
    expect(aslant).toEqual([]);
    // The flow by itself: arrives → triage → decision; prepare → treat (doctor); instruct → discharge → leaves. The
    // record looked up is beside it, a branch leads where it says, and a step left by a connection leads nowhere else.
    const flowLines = lines.filter((x) => !x.hit);
    expect(flowLines).toHaveLength(5);
    expect(lines.filter((x) => x.hit?.k === 'edge')).toHaveLength(6);
    expect(d.shapes.filter((x) => x.k === 't' && x.hit?.k === 'edge').map((x) => x.text)).toEqual(['No', 'Yes']);
    // A step is named by its words, or with its lane's where two have the same ones; so Join writes it.
    const all = linesOf(hospital);
    const triage = all.find((l) => l.words.words === 'Triage')!;
    expect(stepName(all, triage)).toBe('Triage');
    expect(all.filter((l) => l.words.words === 'Treat patient').map((l) => stepName(all, l))).toEqual(['NP: Treat patient', 'Doctor: Treat patient']);
    // Taken away, a step takes its connections with it; renamed, they follow it.
    const at = all.find((l) => l.words.words === 'Prepare patient')!.at;
    expect(write(applyAll(hospital, removeThing(hospital, { k: 'line', at, part: 'words' })))).not.toContain('Prepare patient');
    const later = applyAll(hospital, [{ op: 'text', at, from: 'Nurse: '.length, to: 'Nurse: Prepare patient'.length, runs: [{ t: 'Prep' }] }]);
    expect(write(applyAll(later, follow(hospital, later, at)))).toContain('~ Doctor needed? -> Prep: Yes');
    expect(connect(doc('lanes', '- a\n- b\n'), 'a', 'b')).toEqual([{ op: 'splice', at: 2, n: 0, blocks: [{ k: 'edge', from: 'a', to: 'b', dir: '->' }] }]);
  });
  test('a swimlane nests as a mind map: a step leads to the steps under it, each branch rejoining at the next step on the margin (Paul, 2026-10-18)', () => {
    const d = doc('lanes', '- Desk: Ready?\n  - Desk: Ship it\n  - Lab: Fix it\n    - Lab: Test it\n- Desk: Done\n- Desk: Archive\n');
    const pic = layout(d);
    const boxes = pic.shapes.filter((x) => x.hit?.k === 'line');
    const at = (x: number, y: number) => boxes.find((b) => x >= b.x - 1 && x <= b.x + b.w + 1 && y >= b.y - 1 && y <= b.y + b.h + 1)?.text;
    const end = (x: DShape, i: number) => at(x.x + (x.pts![i] / 100) * x.w, x.y + (x.pts![i + 1] / 100) * x.h);
    const flow = pic.shapes.filter((x) => x.k === 'w').map((x) => `${end(x, 0)} → ${end(x, x.pts!.length - 2)}`);
    expect(flow).toEqual(['Ready? → Ship it', 'Ready? → Fix it', 'Fix it → Test it', 'Ship it → Done', 'Test it → Done', 'Done → Archive']);
    // A step dragged takes its branches with it, and sits at the depth of the step it goes before.
    expect(run(d, placeStep(d, 2, 'Lab', 3))).toBe('- Desk: Ready?\n  - Desk: Ship it\n- Desk: Done\n- Lab: Fix it\n  - Lab: Test it\n- Desk: Archive\n');
    // Enter: the next step after its branches, at its depth; Add a branch: one more under it, in its lane.
    expect(newThingAt(d, nextThing(d, { k: 'line', at: 0, part: 'words' })!)).toEqual([4, 0, 'Desk: ']);
    expect(newThingAt(d, childOf(d, 2))).toEqual([4, 2, 'Lab: ']);
    // Taken away, its branches come out a level to stand where it was.
    expect(run(d, removeThing(d, { k: 'line', at: 2, part: 'words' }))).toBe('- Desk: Ready?\n  - Desk: Ship it\n  - Lab: Test it\n- Desk: Done\n- Desk: Archive\n');
    // Tab and Shift+Tab, any step, the first too where there is one before it.
    expect(run(d, demoteThing(d, { k: 'line', at: 4, part: 'words' })!.ops)).toContain('- Lab: Test it\n  - Desk: Done\n');
    expect(run(d, promoteThing(d, { k: 'line', at: 2, part: 'words' })!.ops)).toContain('  - Desk: Ship it\n- Lab: Fix it\n  - Lab: Test it\n');
  });
  test('swimlanes stack: branches side by side share columns, a step where they rejoin comes after the longest, a look-up sits by its step (Paul, 2026-10-18: "Stack")', () => {
    const hospital = doc(
      'lanes',
      '- Patient: Arrives\n- NP: Triage\n- EHR: Retrieve record\n- NP: Doctor needed?\n  - NP: Treat\n  - Nurse: Prepare\n    - Doctor: Treat patient\n      - EHR: Update record\n- Nurse: Instruct\n- Patient: Leaves\n\n' +
        '~ Triage <-> Retrieve record\n~ Doctor: Treat patient <-> Update record\n',
    );
    const d = layout(hospital);
    const boxes = d.shapes.filter((x) => x.hit?.k === 'line');
    const x0 = boxes[0].x;
    expect(boxes.map((b) => `${Math.round((b.x - x0) / 176)} ${b.text}`)).toEqual([
      '0 Arrives',
      '1 Triage',
      '1 Retrieve record',
      '2 Doctor needed?',
      '3 Treat',
      '3 Prepare',
      '4 Treat patient',
      '4 Update record',
      '5 Instruct',
      '6 Leaves',
    ]);
    // A look-up in its step's column is joined by a line straight down.
    const look = d.shapes.find((x) => x.k === 'w' && x.hit?.k === 'edge' && !x.hit.branch)!;
    expect(look.pts).toEqual([0, 0, 0, 100]);
    // Two steps of one lane never share a column: the later moves on.
    const two = layout(doc('lanes', '- Desk: Ask?\n  - Desk: Yes\n  - Desk: No\n- Desk: Done\n')).shapes.filter((x) => x.hit?.k === 'line');
    expect(two.map((b) => Math.round((b.x - two[0].x) / 176))).toEqual([0, 1, 2, 3]);
  });
  test('swimlanes made a mind map keep every relationship: the flow as nesting, the rest as connections, the lanes in the words (Paul, 2026-10-18)', () => {
    const lanes = doc(
      'lanes',
      '- Patient:\n- NP:\n- EHR:\n- Patient: Arrives\n- NP: Triage\n- EHR: Record\n- NP: Ready?\n  - NP: Treat\n  - NP: Wait\n- Patient: Leaves\n\n~ Triage <-> Record\n~ Ready? -> Wait: No\n',
    );
    const mind = applyAll(lanes, setKind(lanes, 'mind'));
    // Each line to the one above an arrow as the Outliner writes it, a look-up's both ways, a branch's words on it.
    expect(write(mind)).toBe(
      '---\nkind: mind\n---\n- Patient: Arrives\n  - NP: Triage {.from}\n    - EHR: Record {.both}\n    - NP: Ready? {.from}\n      - NP: Treat {.from}\n        - Patient: Leaves {.from}\n      - NP: Wait {.from label=No}\n\n~ NP: Wait -> Patient: Leaves\n',
    );
    // A mind map draws them: an arrow on every line, the words on its line.
    const lines = layout(mind).shapes.filter((x) => x.hit?.k === 'edge' && x.hit.branch);
    expect(lines.every((x) => x.k === 'k')).toBe(true);
    expect(lines.map((x) => x.text).filter(Boolean)).toEqual(['No']);
    // Every connection is drawn; and back to swimlanes, the same lanes, the same flow.
    expect(new Set(layout(mind).shapes.flatMap((x) => (x.hit?.k === 'edge' && !x.hit.branch ? [x.hit.at] : []))).size).toBe(edgesOf(mind).length);
    const back = applyAll(mind, setKind(mind, 'lanes'));
    expect(lanesOf(back).lanes).toEqual(['Patient', 'NP', 'EHR']);
    // Any other change of kind is the kind alone.
    expect(setKind(mind, 'org')).toEqual([{ op: 'head', key: 'kind', value: 'org' }]);
  });
  test('a thing takes a shape by its line’s class, Draw’s names, in every kind that draws boxes; set and taken off from its row', () => {
    const mind = doc('mind', '- Plan {.ellipse}\n  - Ask {.diamond}\n  - Do\n');
    const kinds = (d: Doc) => layout(d).shapes.flatMap((x) => (x.hit?.k === 'line' ? [x.k] : []));
    expect(kinds(mind)).toEqual(['e', 'd', 'o']);
    expect(shapeOf(mind, 1)).toBe('diamond');
    expect(run(mind, setShape(mind, 2, 'note'))).toBe('- Plan {.ellipse}\n  - Ask {.diamond}\n  - Do {.note}\n');
    expect(run(mind, setShape(mind, 0, null))).toBe('- Plan\n  - Ask {.diamond}\n  - Do\n');
    expect(setShape(mind, 1, 'diamond')).toEqual([]);
    // Other classes stay; a timeline's dots are not boxes, so its classes draw nothing new.
    const kept = doc('lanes', '- Desk: Ready? {.big .hexagon}\n');
    expect(run(kept, setShape(kept, 0, 'rectangle'))).toBe('- Desk: Ready? {.big .rectangle}\n');
    const time = doc('timeline', '- 1990: a {.diamond}\n');
    expect(layout(time).shapes.some((x) => x.k === 'd')).toBe(false);
  });
  test('a thing of a set dropped where circles cross goes to that overlap, made if no line names it', () => {
    const d = doc('venn', '- Fast: toast, noodles\n- Cheap: walking\n');
    expect(run(d, dropIn(d, { k: 'line', at: 0, part: 1 }, 'Fast & Cheap'))).toBe('- Fast: toast\n- Cheap: walking\n- Fast & Cheap: noodles\n');
    expect(run(d, dropIn(d, { k: 'line', at: 0, part: 0 }, 'Cheap'))).toBe('- Fast: noodles\n- Cheap: walking, toast\n');
  });
  test('connections: made once, never to itself; their words and direction; a drag of one thing onto another in a network joins them', () => {
    const net = doc('net', '- Web\n- API\n');
    expect(run(net, connect(net, 'Web', 'API'))).toBe('- Web\n- API\n\n~ Web -> API\n');
    expect(connect(net, 'Web', 'web')).toEqual([]);
    const joined = applyAll(net, connect(net, 'Web', 'API'));
    expect(connect(joined, 'API', 'Web')).toEqual([]);
    expect(run(joined, setEdge(joined, 2, { label: 'asks', dir: '--' }))).toBe('- Web\n- API\n\n~ Web -- API: asks\n');
    expect(run(net, dropOn(net, { k: 'line', at: 0, part: 'all' }, { k: 'line', at: 1, part: 'all' }))).toBe('- Web\n- API\n\n~ Web -> API\n');
    // An org chart's connection is a dotted line, named by the person, not their role (a thing's plain words, its role the second line).
    const org = doc('org', '- Ada | CEO\n- Ben | CTO\n');
    expect(run(org, connect(org, linesOf(org)[0].all.words, 'Ben\nCTO'))).toBe('- Ada | CEO\n- Ben | CTO\n\n~ Ada -- Ben\n');
  });
  test('a name that changes is followed: the connections to a person, the overlaps naming a set; a lane renamed is every step in it', () => {
    const org = doc('org', '- Ada | CEO\n- Ben | CTO\n\n~ Ada -- Ben: advises\n');
    const typed: Op[] = [{ op: 'text', at: 0, from: 0, to: 3, runs: [{ t: 'Adah' }] }];
    const after = applyAll(org, typed);
    expect(run(org, [...typed, ...follow(org, after, 0)])).toBe('- Adah | CEO\n- Ben | CTO\n\n~ Adah -- Ben: advises\n');
    // A role changed is not a new name.
    const role = applyAll(org, [{ op: 'text', at: 0, from: 6, to: 9, runs: [{ t: 'Boss' }] }]);
    expect(follow(org, role, 0)).toEqual([]);
    const venn = doc('venn', '- Fast: a\n- Cheap: b\n- Fast & Cheap: c\n');
    const renamed = applyAll(venn, [{ op: 'text', at: 0, from: 0, to: 4, runs: [{ t: 'Quick' }] }]);
    expect(write(applyAll(renamed, follow(venn, renamed, 0)))).toContain('- Quick & Cheap: c');
    const lanes = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(run(lanes, rename(lanes, { k: 'lane', name: 'Sales' }, 'Sales', 'Selling'))).toBe('- Selling: Calls\n- Shop: Sells\n- Selling: Closes\n');
    const net = doc('net', '~ API -> DB\n');
    expect(run(net, rename(net, { k: 'node', name: 'DB' }, 'DB', 'Database'))).toBe('~ API -> Database\n');
    expect(run(net, rename(net, { k: 'edge', at: 0 }, '', 'queries'))).toBe('~ API -> DB: queries\n');
  });
  test('a picture on a thing goes before its words, in place of one already there; "No icon" takes it off', () => {
    const d = doc('seating', '- Top: Jo, Sam\n');
    const hit: Hit = { k: 'line', at: 0, part: 1 };
    const once = applyAll(d, withIcon(d, hit, 'star'));
    expect(write(once)).toContain('- Top: Jo, :star: Sam');
    expect(run(once, withIcon(once, hit, 'heart'))).toBe('- Top: Jo, :heart: Sam\n');
    expect(run(once, withIcon(once, hit, ''))).toBe('- Top: Jo, Sam\n');
    expect(layout(once).shapes.find((s) => s.text.includes('Sam'))!.text).toBe(':star Sam');
  });
  test('a list left tidy: no empty things, nothing after the last; and the kind is one head op', () => {
    const d = doc('seating', '- Top: Jo, , Sam, \n');
    expect(run(d, tidy(d, 0))).toBe('- Top: Jo, Sam\n');
    expect(tidy(doc('seating', '- Top: Jo, Sam\n'), 0)).toEqual([]);
    expect(tidy(doc('mind', '- a, , b\n'), 0)).toEqual([]);
    const m = parse('- a\n');
    expect(setKind(m, 'org')).toEqual([{ op: 'head', key: 'kind', value: 'org' }]);
    expect(setKind(doc('org', '- a\n'), 'org')).toEqual([]);
  });
  test('the line read again after its text ops keeps its parts in step', () => {
    const d = doc('lanes', '- Sales: Calls\n');
    const l = lineOf(applyAll(d, [{ op: 'text', at: 0, from: 7, to: 12, runs: [{ t: 'Rings' }] }]).blocks[0] as never, 0);
    expect([l.key!.words, l.words.words]).toEqual(['Sales', 'Rings']);
  });
});

describe('a thing whole: copied, pasted, duplicated, moved', () => {
  test("a thing as blocks: a tree's line with its family at the margin, a seat as a line, a lane's steps, a connection", () => {
    const t = doc('mind', '- Root\n  - A\n    - A1\n  - B\n');
    expect(write({ head: {}, blocks: thingBlocks(t, { k: 'line', at: 1, part: 'all' }) })).toBe('- A\n  - A1\n');
    const s = doc('seating', '- Top: Jo, Sam\n');
    expect(write({ head: {}, blocks: thingBlocks(s, { k: 'line', at: 0, part: 1 }) })).toBe('- Sam\n');
    const l = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(thingBlocks(l, { k: 'lane', name: 'sales' })).toHaveLength(2);
    const n = doc('net', '- Web\n\n~ Web -> API\n');
    expect(thingBlocks(n, { k: 'edge', at: 1 })).toEqual([n.blocks[1]]);
    expect(write({ head: {}, blocks: thingBlocks(n, { k: 'node', name: 'API' }) })).toBe('- API\n');
  });
  test("pasted at a thing: a tree's after its family at its level; a seat after the one in hand; a step into its lane; a connection once", () => {
    const t = doc('mind', '- Root\n  - A\n    - A1\n  - B\n');
    const p = pasteThings(t, { k: 'line', at: 1, part: 'all' }, parse('- X\n  - Y\n').blocks);
    expect(run(t, p.ops)).toBe('- Root\n  - A\n    - A1\n  - X\n    - Y\n  - B\n');
    expect(p.hit).toEqual({ k: 'line', at: 3, part: 'all' });
    expect(run(t, pasteThings(t, { k: 'line', at: 0, part: 'all' }, parse('- X\n').blocks).ops)).toBe('- Root\n  - A\n    - A1\n  - B\n  - X\n');
    expect(run(t, pasteThings(t, null, parse('Words\n').blocks).ops)).toBe('- Root\n  - A\n    - A1\n  - B\n  - Words\n');
    const s = doc('seating', '- Top: Jo, Sam\n- Two:\n');
    const q = pasteThings(s, { k: 'line', at: 0, part: 0 }, parse('- Ann\n').blocks);
    expect(run(s, q.ops)).toBe('- Top: Jo, Ann, Sam\n- Two:\n');
    expect(q.hit).toEqual({ k: 'line', at: 0, part: 1 });
    expect(run(s, pasteThings(s, { k: 'line', at: 1, part: 'key' }, parse('- Ann\n').blocks).ops)).toBe('- Top: Jo, Sam\n- Two: Ann\n');
    const l = doc('lanes', '- Sales: Calls\n- Shop: Sells\n');
    expect(run(l, pasteThings(l, { k: 'line', at: 0, part: 'words' }, parse('- Rings\n').blocks).ops)).toBe('- Sales: Calls\n- Sales: Rings\n- Shop: Sells\n');
    const n = doc('net', '- Web\n- API\n\n~ Web -> API\n');
    expect(pasteThings(n, null, [n.blocks[2]]).ops).toEqual([]);
    expect(run(n, pasteThings(n, null, parse('~ API -> Web\n').blocks).ops)).toBe('- Web\n- API\n\n~ Web -> API\n');
    expect(run(n, pasteThings(n, null, parse('~ API -> DB\n').blocks).ops)).toBe('- Web\n- API\n\n~ Web -> API\n~ API -> DB\n');
  });
  test('duplicated: a copy right after it; a connection is never doubled', () => {
    const t = doc('org', '- Ada\n  - Ben\n');
    expect(run(t, duplicateThing(t, { k: 'line', at: 1, part: 'all' }).ops)).toBe('- Ada\n  - Ben\n  - Ben\n');
    expect(run(t, duplicateThing(t, { k: 'line', at: 0, part: 'all' }).ops)).toBe('- Ada\n  - Ben\n- Ada\n  - Ben\n');
    const s = doc('seating', '- Top: Jo, Sam\n');
    expect(run(s, duplicateThing(s, { k: 'line', at: 0, part: 0 }).ops)).toBe('- Top: Jo, Jo, Sam\n');
    expect(duplicateThing(doc('net', '~ A -> B\n'), { k: 'edge', at: 0 }).ops).toEqual([]);
    expect(duplicateThing(doc('net', '- A\n'), { k: 'line', at: 0, part: 'all' }).ops).toEqual([]);
  });
  test("moved past a neighbour: a tree's family among its siblings, a step, a seat past the one beside it; none past the end", () => {
    const t = doc('mind', '- Root\n  - A\n    - A1\n  - B\n');
    const down = moveThing(t, { k: 'line', at: 1, part: 'all' }, 1)!;
    expect(run(t, down.ops)).toBe('- Root\n  - B\n  - A\n    - A1\n');
    expect(down.hit).toEqual({ k: 'line', at: 2, part: 'all' });
    const up = moveThing(t, { k: 'line', at: 3, part: 'all' }, -1)!;
    expect(run(t, up.ops)).toBe('- Root\n  - B\n  - A\n    - A1\n');
    expect(up.hit).toEqual({ k: 'line', at: 1, part: 'all' });
    expect(moveThing(t, { k: 'line', at: 1, part: 'all' }, -1)).toBeNull();
    const s = doc('seating', '- Top: Jo, **Sam**, Cy\n');
    const m = moveThing(s, { k: 'line', at: 0, part: 1 }, -1)!;
    expect(run(s, m.ops)).toBe('- Top: **Sam**, Jo, Cy\n');
    expect(m.hit).toEqual({ k: 'line', at: 0, part: 0 });
    expect(moveThing(s, { k: 'line', at: 0, part: 2 }, 1)).toBeNull();
    const tl = doc('timeline', '- 1990: a\n- 2000: b\n\n~ x -> y\n');
    expect(run(tl, moveThing(tl, { k: 'line', at: 0, part: 'all' }, 1)!.ops)).toBe('- 2000: b\n- 1990: a\n\n~ x -> y\n');
    expect(moveThing(tl, { k: 'line', at: 1, part: 'all' }, 1)).toBeNull();
  });
  test('brought out and indented in a tree: a thing with its family up to its grandparent or under the sibling before it', () => {
    const L = (at: number): Hit => ({ k: 'line', at, part: 'all' });
    const t = doc('mind', '- Root\n  - A\n    - A1\n      - A1a\n        - A1a1\n    - A2\n  - B\n');
    // A leaf out: after its parent, a sibling of it.
    const leaf = promoteThing(t, L(5))!;
    expect(run(t, leaf.ops)).toBe('- Root\n  - A\n    - A1\n      - A1a\n        - A1a1\n  - A2\n  - B\n');
    expect(leaf.hit).toEqual(L(5));
    const deep = promoteThing(t, L(4))!;
    expect(run(t, deep.ops)).toBe('- Root\n  - A\n    - A1\n      - A1a\n      - A1a1\n    - A2\n  - B\n');
    // A thing with children and grandchildren: all a level out, right after its parent's family.
    const fam = promoteThing(t, L(2))!;
    expect(run(t, fam.ops)).toBe('- Root\n  - A\n    - A2\n  - A1\n    - A1a\n      - A1a1\n  - B\n');
    expect(fam.hit).toEqual(L(3));
    // A root, and a root's child: nowhere further out.
    expect(promoteThing(t, L(0))).toBeNull();
    expect(promoteThing(t, L(1))).toBeNull();
    // Indented: the last child of the sibling before it, its family with it.
    const under = demoteThing(t, L(6))!;
    expect(run(t, under.ops)).toBe('- Root\n  - A\n    - A1\n      - A1a\n        - A1a1\n    - A2\n    - B\n');
    expect(under.hit).toEqual(L(6));
    const famIn = demoteThing(t, L(5))!;
    expect(run(t, famIn.ops)).toBe('- Root\n  - A\n    - A1\n      - A1a\n        - A1a1\n      - A2\n  - B\n');
    const back = demoteThing(applyAll(t, fam.ops), L(3))!;
    expect(write(applyAll(applyAll(t, fam.ops), back.ops))).toBe(write(parse(`---\nkind: mind\n---\n- Root\n  - A\n    - A2\n    - A1\n      - A1a\n        - A1a1\n  - B\n`)));
    // A first child, and a root: no sibling before it to go under.
    expect(demoteThing(t, L(1))).toBeNull();
    expect(demoteThing(t, L(2))).toBeNull();
    expect(demoteThing(t, L(0))).toBeNull();
    expect(demoteThing(doc('mind', '- One\n- Two\n'), L(1))).toBeNull();
    // The other kinds have no hierarchy.
    expect(promoteThing(doc('lanes', '- Sales: a\n- Sales: b\n'), { k: 'line', at: 1, part: 'words' })).toBeNull();
    expect(demoteThing(doc('net', '- A\n- B\n'), L(1))).toBeNull();
  });
  test("a family's couple carries its children, and a cross-link still joins the same two things", () => {
    const L = (at: number): Hit => ({ k: 'line', at, part: 'all' });
    const f = doc('family', '- Anne + Bo | 1790\n  - Ada + Charles | 1815\n    - Byron\n    - Ann\n  - Cy\n');
    expect(run(f, demoteThing(f, L(4))!.ops)).toBe('- Anne + Bo | 1790\n  - Ada + Charles | 1815\n    - Byron\n    - Ann\n    - Cy\n');
    const inF = applyAll(f, demoteThing(f, L(4))!.ops);
    expect(run(inF, demoteThing(inF, L(4))!.ops)).toBe('- Anne + Bo | 1790\n  - Ada + Charles | 1815\n    - Byron\n    - Ann\n      - Cy\n');
    const o = doc('org', '- Ada | CEO\n  - Ben | CTO\n    - Cy | Dev\n      - Di | Intern\n\n~ Di -- Ada: mentor\n');
    const up = promoteThing(o, L(2))!;
    expect(run(o, up.ops)).toBe('- Ada | CEO\n  - Ben | CTO\n  - Cy | Dev\n    - Di | Intern\n\n~ Di -- Ada: mentor\n');
    expect(count(applyAll(o, up.ops))).toEqual(count(o));
    expect(layout(applyAll(o, up.ops)).shapes.some((x) => x.hit?.k === 'edge')).toBe(true);
    const m = doc('mind', '- Idea\n  - A\n    - A1\n  - B\n\n~ A1 -> B\n');
    const out = applyAll(m, promoteThing(m, L(2))!.ops);
    expect(count(out)).toEqual(count(m));
    // The cross-link is drawn only while both its ends are found.
    expect(layout(out).shapes.some((x) => x.hit?.k === 'edge')).toBe(true);
  });
  test('moved across: a step to the next lane, a seat to the next table', () => {
    const l = doc('lanes', '- Sales: Calls\n- Shop: Sells\n');
    expect(run(l, moveAcross(l, { k: 'line', at: 0, part: 'words' }, 1)!.ops)).toBe('- Shop: Calls\n- Shop: Sells\n');
    expect(moveAcross(l, { k: 'line', at: 0, part: 'words' }, -1)).toBeNull();
    const s = doc('seating', '- Top: Jo, Sam\n- Two: Ann\n');
    const m = moveAcross(s, { k: 'line', at: 0, part: 1 }, 1)!;
    expect(run(s, m.ops)).toBe('- Top: Jo\n- Two: Ann, Sam\n');
    expect(m.hit).toEqual({ k: 'line', at: 1, part: 1 });
  });
});

describe("joins across a tree: a mind map's cross-links, a family's dotted lines", () => {
  const MIND = '- Launch\n  - Product\n    - Pricing\n  - Marketing\n    - Press\n';
  test('read and written byte for byte, every kind of line; made once by Join, followed when a name changes, gone with the idea', () => {
    for (const dir of ['--', '->', '<-', '<->']) {
      const text = `---\nkind: mind\n---\n${MIND}\n~ Pricing ${dir} Press: feeds\n`;
      expect(write(parse(text))).toBe(text);
    }
    const m = doc('mind', MIND);
    expect(run(m, connect(m, 'Pricing', 'Press'))).toBe(`${MIND}\n~ Pricing -- Press\n`);
    const joined = applyAll(m, connect(m, 'Pricing', 'Press'));
    expect(connect(joined, 'Press', 'Pricing')).toEqual([]);
    expect(run(joined, setEdge(joined, 5, { label: 'feeds', dir: '->' }))).toBe(`${MIND}\n~ Pricing -> Press: feeds\n`);
    const typed: Op[] = [{ op: 'text', at: 2, from: 0, to: 7, runs: [{ t: 'Prices' }] }];
    expect(run(joined, [...typed, ...follow(joined, applyAll(joined, typed), 2)])).toContain('~ Prices -- Press');
    expect(run(joined, removeThing(joined, { k: 'line', at: 2, part: 'all' }))).not.toContain('~ ');
    const fam = doc('family', '- Rose + Albert | m. 1948\n  - Helen | b. 1950\n- Ada | b. 1985\n');
    expect(run(fam, connect(fam, 'Ada\nb. 1985', 'Rose + Albert\nm. 1948'))).toBe('- Rose + Albert | m. 1948\n  - Helen | b. 1950\n- Ada | b. 1985\n\n~ Ada -- Rose + Albert\n');
  });
  test('drawn: a dashed curve bowing away from the middle idea, an arrowhead where it points, its words at its middle, all tapped as the join', () => {
    const plain = layout(doc('mind', `${MIND}\n~ Pricing -- Press\n`)).shapes;
    const curve = plain.find((s) => s.k === 'w')!;
    expect(curve).toMatchObject({ f: 1, hit: { k: 'edge', at: 5 } });
    expect(curve.pts!.length).toBe(50);
    expect(plain.filter((s) => s.k === 'v')).toEqual([]);
    // Pricing and Press are both at depth 2, one above the other: the curve bows right, away from Launch.
    const [pricing, press] = ['Pricing', 'Press'].map((w) => plain.find((s) => s.text === w)!);
    expect(curve.x + curve.w).toBeGreaterThan(Math.max(pricing.x + pricing.w, press.x + press.w));
    const arrows = layout(doc('mind', `${MIND}\n~ Pricing <-> Press: feeds\n`)).shapes;
    expect(arrows.filter((s) => s.k === 'v' && s.f === 2)).toHaveLength(2);
    expect(arrows.find((s) => s.k === 't' && s.text === 'feeds')?.hit).toEqual({ k: 'edge', at: 5 });
    expect(layout(doc('mind', `${MIND}\n~ Pricing -> Press\n`)).shapes.filter((s) => s.k === 'v')).toHaveLength(1);
    // A join naming no idea is not drawn; the page and the SVG have the curve.
    expect(layout(doc('mind', `${MIND}\n~ Pricing -- Nowhere\n`)).shapes.some((s) => s.k === 'w')).toBe(false);
    expect(diagramPage(doc('mind', `${MIND}\n~ Pricing -- Press: feeds\n`)).svg).toMatch(/<polyline[^>]*stroke-dasharray="6 4"/);
    // A family's (and an org chart's) is a dotted line, an arrow where it points.
    const fam = layout(doc('family', '- Rose + Albert | m. 1948\n  - Helen | b. 1950\n  - Ada | b. 1985\n\n~ Helen -- Ada: godparent\n')).shapes;
    expect(fam.find((s) => s.k === 'j' && s.f === 2)).toMatchObject({ text: 'godparent', hit: { k: 'edge', at: 3 } });
    const org = layout(doc('org', '- Ada\n  - Ben\n  - Eve\n\n~ Eve <- Ben\n')).shapes;
    const k = org.find((s) => s.k === 'k')!;
    expect([org[k.x].text, org[k.y].text]).toEqual(['Ben', 'Eve']);
  });
});

test('a seating chart’s place cards: one a guest, the name large and the table small, eight to a letter sheet with lines to cut along', async () => {
  const { placeCards, CARD, LETTER } = await import('../view.ts');
  const wedding = parse(templates().find((x) => x.id === 'seating-wedding')!.doc);
  const sheets = placeCards(wedding);
  // 6 + 5 + 6 + 4 guests: 21 cards, three sheets.
  expect(sheets.length).toBe(3);
  expect(sheets.every((s) => s.w === LETTER.w && s.h === LETTER.h)).toBe(true);
  expect(sheets.map((s) => (s.svg.match(/stroke-dasharray="6 5"/g) ?? []).length)).toEqual([8, 8, 5]);
  expect(sheets[0].svg).toContain(`width="${CARD.w}" height="${CARD.h}"`);
  expect(sheets[0].svg).toContain('>Jo</text>');
  expect(sheets[0].svg).toContain('>Head table</text>');
  expect(sheets[0].alt!.split('; ')[0]).toBe('Jo, Head table');
  // Centred on the sheet: two across, four down.
  expect(sheets[0].svg).toContain(`<svg x="${(LETTER.w - 2 * CARD.w) / 2}" y="${(LETTER.h - 4 * CARD.h) / 2}"`);
  // A chart with nobody seated: one blank sheet.
  expect(placeCards(parse('---\nkind: seating\n---\n'))).toEqual([{ ...LETTER, svg: '' }]);
});

// The drawings as they were before thumbnails (sha1 of every page's SVG): a page, and drawn small on a slide, are
// unchanged by `thumb`.
const sha1 = (pages: { w: number; h: number; svg: string }[]) =>
  createHash('sha1')
    .update(pages.map((p) => pageSvg(p)).join('\n'))
    .digest('hex');
const BRONTES =
  '---\ntitle: The Brontës of Haworth\nkind: family\n---\n- Patrick Brontë + Maria Branwell | m. 1812\n  - Maria | 1814–1825\n  - Elizabeth | 1815–1825\n  - Charlotte + Arthur Bell Nicholls | m. 1854\n  - Branwell | 1817–1848\n  - Emily | 1818–1848\n  - Anne | 1820–1849\n- Elizabeth Branwell | 1776–1842\n\n~ Elizabeth Branwell -- Patrick Brontë + Maria Branwell: kept house from 1821\n';

test('a thumbnail of a family tree more than twice as wide as tall is its middle, twice as wide as tall; a page and a slide are as before', () => {
  const page = def.view(BRONTES)[0];
  expect(page.w / page.h).toBeGreaterThan(2);
  const [p] = def.view(BRONTES, { small: true, thumb: true });
  expect(p.w / p.h).toBe(2);
  expect(p.h).toBe(page.h);
  expect(p.svg).toContain(`translate(-${Math.round((page.w - 2 * page.h) / 2)} 0)`);
  // A diagram no wider than twice its height is drawn whole.
  const mind = templates().find((x) => x.id === 'mind-launch')!.doc;
  expect(def.view(mind, { small: true, thumb: true })).toEqual(def.view(mind, { small: true }));
  expect(sha1(def.view(BRONTES))).toBe('e39d71aadcedf8365e1a5fc3ab21f445ed072e9f');
  expect(sha1(def.view(BRONTES, { small: true }))).toBe('e39d71aadcedf8365e1a5fc3ab21f445ed072e9f');
});

describe("the separators in a thing's words", () => {
  /** Plain words put on part `which` of line `at` as the editor puts them; the document written, read again, and that part's words, its line's other parts and its drawn label. */
  function put(d: Doc, at: number, which: Which, words: string) {
    const kind = kindOf(d);
    const l = lineOf(d.blocks[at] as Extract<Block, { k: 'li' }>, at);
    const p = partFor(l, which)!;
    const text = run(d, [{ op: 'text', at, from: p.from, to: p.to, runs: wordsInto(kind, l, which, [{ t: words }]) }]);
    const again = parse(write(applyAll(d, [{ op: 'text', at, from: p.from, to: p.to, runs: wordsInto(kind, l, which, [{ t: words }]) }])));
    const now = lineOf(again.blocks[at] as Extract<Block, { k: 'li' }>, at);
    const shape = layout(again).shapes.find((s) => JSON.stringify(s.hit) === JSON.stringify({ k: 'line', at, part: which }));
    const drawn = shape
      ? labelLines(iconOf(shape.text)[1])
          .map((runs) => runs.map((r) => r.t).join(''))
          .join('\n')
      : null;
    return { text, line: now, words: partFor(now, which)?.words, drawn, shown: charsOf(wordsOn(kind, now, which, partFor(now, which)!.from, partFor(now, which)!.to)) };
  }

  test("a comma in a guest's or a set's thing is one thing; a colon, a bar and a backslash in it are plain", () => {
    const seat = doc('seating', '- Top table: Jo, Sam\n');
    for (const w of ['Smith, Jones', 'Dr: Who', 'A | B', 'C:\\Users\\, me', 'Ann,']) {
      const r = put(seat, 0, 1, w);
      expect([r.words, r.drawn, r.shown]).toEqual([w, w, w]);
      expect(r.line.items.map((p) => p.words)).toEqual(['Jo', w]);
      expect(r.line.key!.words).toBe('Top table');
    }
    expect(put(seat, 0, 1, 'Smith, Jones').text).toBe('- Top table: Jo, Smith\\\\, Jones\n');
    const venn = doc('venn', '- Fast: trains\n- Cheap: buses\n');
    const r = put(venn, 0, 0, 'salt, pepper');
    expect([r.words, r.drawn]).toEqual(['salt, pepper', 'salt, pepper']);
    expect(r.line.items).toHaveLength(1);
  });

  test("a colon ending a word, an ampersand and a bar in a key are the key's own: a table's name, a set's, a lane's, a date", () => {
    const seat = put(doc('seating', '- Top table: Jo, Sam\n'), 0, 'key', 'Sales: Q3 | west');
    expect([seat.words, seat.drawn, seat.line.items.map((p) => p.words)]).toEqual(['Sales: Q3 | west', 'Sales: Q3 | west', ['Jo', 'Sam']]);
    // A set's name keeps its ampersand: still one set, its circle and its things where they were.
    const venn = put(doc('venn', '- Fast: trains\n- Cheap: buses\n- Fast & Cheap: bikes\n'), 0, 'key', 'R&D: lab');
    expect([venn.words, venn.drawn]).toEqual(['R&D: lab', 'R&D: lab']);
    const vd = applyAll(doc('venn', '- Fast: trains\n- Cheap: buses\n'), []);
    const named = parse(write(applyAll(vd, [{ op: 'text', at: 0, from: 0, to: 4, runs: wordsInto('venn', linesOf(vd)[0], 'key', [{ t: 'R&D' }]) }])));
    expect(vennOf(named).sets).toEqual(['R&D', 'Cheap']);
    // A thing put in the overlap of a set with "&" in its name finds that set.
    const both = regionAt(layout(named), layout(named).w / 2, layout(named).h / 2)!;
    expect(both).toBe('R\\&D & Cheap');
    expect(run(named, commitDraft(newThing(named, both), { k: 'li', depth: 0, runs: [{ t: 'R\\&D & Cheap: bikes' }] }))).toContain('- R\\\\&D & Cheap: bikes');
    expect(vennOf(applyAll(named, commitDraft(newThing(named, both), newThing(named, both).block))).groups.map((g) => g.names)).toEqual([['R&D'], ['Cheap'], ['R&D', 'Cheap']]);
    // A lane renamed with a colon in it stays one lane; a step of a lane with none keeps its colon.
    const lanes = doc('lanes', '- Sales: Calls\n- Sales: Closes\n- Shop: Sells\n');
    const renamed = applyAll(lanes, rename(lanes, { k: 'lane', name: 'Sales' }, 'Sales', 'Ops: night'));
    expect(lanesOf(renamed).lanes).toEqual(['Ops: night', 'Shop']);
    expect(write(renamed)).toContain('- Ops\\\\: night: Calls\n');
    const keyless = put(doc('lanes', '- Calls\n'), 0, 'words', 'Note: call back');
    expect([keyless.words, keyless.line.key]).toEqual(['Note: call back', null]);
    const keyed = put(doc('lanes', '- Sales: Calls\n'), 0, 'words', 'Ask: why | then');
    expect([keyed.words, keyed.drawn, keyed.text]).toEqual(['Ask: why | then', 'Ask: why | then', '- Sales: Ask: why \\\\| then\n']);
    // A date and what happened: the first line escaped as a key, the second plain; a bar in either is a bar.
    const tl = put(doc('timeline', '- 1990: Born\n'), 0, 'all', '10:30: am\nCoffee | tea: hot');
    expect([tl.line.key!.words, tl.line.words.words, tl.shown]).toEqual(['10:30: am', 'Coffee | tea: hot', '10:30: am\nCoffee | tea: hot']);
    expect(tl.drawn).toBe('10:30: am\nCoffee | tea: hot');
  });

  test("a tree's or a network's words: a bar is plain, a second line is the line's \" | \"; a family's \"+\" is the couple's, plain words", () => {
    const org = put(doc('org', '- Ada | CEO\n  - Ben\n'), 0, 'all', 'Ada | Lovelace\nCEO, Board: chair');
    expect([org.words, org.drawn, org.text]).toEqual(['Ada | Lovelace\nCEO, Board: chair', 'Ada | Lovelace\nCEO, Board: chair', '- Ada \\\\| Lovelace | CEO, Board: chair\n  - Ben\n']);
    const fam = put(doc('family', '- Rose\n'), 0, 'all', 'Ada + Charles\n1815');
    expect([fam.words, fam.text]).toEqual(['Ada + Charles\n1815', '- Ada + Charles | 1815\n']);
    const mind = put(doc('mind', '- Launch\n'), 0, 'all', 'a: b, c & d');
    expect([mind.words, mind.drawn, mind.text]).toEqual(['a: b, c & d', 'a: b, c & d', '- a: b, c & d\n']);
  });

  test('a document written before reads as it did: an unescaped separator still separates; an escaped one is byte for byte', () => {
    expect(linesOf(doc('seating', '- Top table: Jo, Sam\n'))[0].items.map((p) => p.words)).toEqual(['Jo', 'Sam']);
    expect(linesOf(doc('org', '- Ada | CEO\n'))[0].all.words).toBe('Ada\nCEO');
    for (const t of ['- Top table: Smith\\\\, Jones, Ann\n', '- R\\\\&D\\\\: lab: x\n- Ops \\\\| night: y\n', '- a\\\\\\\\, b\n']) {
      const d = doc('seating', t);
      expect(write(d)).toBe(`---\nkind: seating\n---\n${t}`);
    }
    expect(linesOf(doc('seating', '- Top table: Smith\\\\, Jones, Ann\n'))[0].items.map((p) => p.words)).toEqual(['Smith, Jones', 'Ann']);
    expect(linesOf(doc('seating', '- a\\\\\\\\, b\n'))[0].items.map((p) => p.words)).toEqual(['a\\', 'b']);
  });

  test('a connection names things by their plain words; a name holding "--", "->" or ": " is matched whole', () => {
    const net = doc('net', '- A -- B\n- C\n- Q3: plan\n');
    const joined = applyAll(net, connect(net, 'A -- B', 'C'));
    expect(write(joined)).toContain('~ A -- B -> C\n');
    expect(edgesOf(parse(write(joined)))).toMatchObject([{ from: 'A -- B', to: 'C', dir: '->', label: '' }]);
    const two = applyAll(joined, connect(joined, 'C', 'Q3: plan'));
    expect(edgesOf(two).map((e) => [e.from, e.to, e.label])).toEqual([
      ['A -- B', 'C', ''],
      ['C', 'Q3: plan', ''],
    ]);
    // Its words and its direction set; a name followed when it changes.
    const said = applyAll(two, setEdge(two, 4, { label: 'asks', dir: '--' }));
    expect(write(said)).toContain('~ C -- Q3: plan: asks\n');
    expect(edgesOf(parse(write(said)))[1]).toMatchObject({ from: 'C', to: 'Q3: plan', dir: '--', label: 'asks' });
    const typed: Op[] = [{ op: 'text', at: 0, from: 0, to: 6, runs: [{ t: 'A -> Z' }] }];
    expect(run(said, [...typed, ...follow(said, applyAll(said, typed), 0)])).toContain('~ A -> Z -> C\n');
    // Drawn: one link from the thing "A -- B" to "C", none to a thing "A".
    const d = layout(parse(write(joined)));
    expect(d.shapes.filter((s) => s.hit?.k === 'node')).toEqual([]);
    expect(d.shapes.filter((s) => s.k === 'k' || s.k === 'j')).toHaveLength(1);
    // A tree's dotted line to a person whose name holds an arrow.
    const org = doc('org', '- Ada\n  - Ben -> Bob\n  - Eve\n');
    const dotted = applyAll(org, connect(org, 'Ben -> Bob', 'Eve'));
    expect(write(dotted)).toContain('~ Ben -> Bob -- Eve\n');
    expect(layout(parse(write(dotted))).shapes.some((s) => s.hit?.k === 'edge')).toBe(true);
  });
});

test('a diagram shown as an outline: the list as the outline reads it, a role or years back in brackets, joins kept, the kind left behind', async () => {
  const { diagramToOutline } = await import('../model.ts');
  const org = '---\ntitle: Co\nkind: org\n---\n- Ada Diaz | Chief executive\n  - Ben Okoro | Engineering\n    - Cy Lund\n  - Eve Marsh | Design\n\n~ Cy Lund -- Eve Marsh: design partner\n';
  expect(diagramToOutline(parse(org))).toBe(
    '---\ntitle: Co\n---\n- Ada Diaz (Chief executive)\n  - Ben Okoro (Engineering)\n    - Cy Lund\n  - Eve Marsh (Design)\n\n~ Cy Lund -- Eve Marsh: design partner\n',
  );
  // A mind map is the tree itself; a bar in a mind map's words is words.
  expect(diagramToOutline(parse('---\nkind: mind\n---\n- Centre\n  - A | B\n  - C\n'))).toBe('- Centre\n  - A | B\n  - C\n');
  // Swimlanes go as the tree their flow draws, as to a mind map, and every join finds its items in the outline.
  const lanes = '---\nkind: lanes\n---\n- Desk:\n- Lab:\n- Desk: Ready?\n  - Lab: Fix it\n  - Desk: Ship it\n- Desk: Done\n\n~ Ready? -> Fix it: No\n';
  const outline = diagramToOutline(parse(lanes));
  expect(outline).toBe('- Desk: Ready?\n  - Lab: Fix it {.from label=No}\n    - Desk: Done {.from}\n  - Desk: Ship it {.from}\n\n~ Desk Ship it -> Desk Done\n');
  const { readOutline, liveLinks } = await import('../../outline/model.ts');
  const read = readOutline(parse(outline));
  expect(liveLinks(read)).toHaveLength(read.links.length);
  // The hand-off is the first of the Diagram's, to the Outliner.
  expect(def.handoffs![0].to).toBe('outline');
  expect(def.handoffs![0].convert('---\nkind: net\n---\n- A\n- B\n\n~ A -> B: to\n')).toBe('- A\n- B\n\n~ A -> B: to\n');
});
