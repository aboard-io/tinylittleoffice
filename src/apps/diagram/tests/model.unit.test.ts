// Diagram's model and view under node: each kind read from its lines and drawn (the old tree's examples give the
// same shapes they gave there), what a tap on each shape edits, and every command as the kernel's ops: each applies,
// writes canonical text, and is undone exactly by its inverse.
import { readFileSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { describe, expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import { readDrawing } from '../../draw/model.ts';
import def from '../def.ts';
import { charsOf, childOf, commitDraft, connect, dropIn, dropOn, duplicateThing, follow, kindOf, lineOf, linesOf, moveAcross, moveItem, moveThing, newThing, nextThing, pasteThings, removeThing, rename, setEdge, setKind, thingBlocks, tidy, withIcon, type Hit } from '../model.ts';
import { templates } from '../templates.ts';
import { diagramPage, era, layout, moment, places, regionAt, toDrawing } from '../view.ts';

const doc = (kind: string, body: string): Doc => parse(`---\nkind: ${kind}\n---\n${body}`);
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
  return { things: s.filter((x) => x.k !== 'k' && x.k !== 'j').length, joins: s.filter((x) => x.k === 'k' || x.k === 'j').length, hits: s.filter((x) => x.hit).length };
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
  test("the old tree's examples, named by kind, draw what they drew there", () => {
    expect(count(doc('org', old('org')))).toEqual({ things: 6, joins: 6, hits: 7 });
    expect(count(doc('mind', old('mind')))).toEqual({ things: 9, joins: 8, hits: 9 });
    expect(count(doc('family', old('family')))).toEqual({ things: 6, joins: 5, hits: 6 });
    // Four lanes (a band and a name each), six steps, five arrows between them.
    expect(count(doc('lanes', old('lanes')))).toEqual({ things: 14, joins: 5, hits: 10 });
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
  test('the definition: one page, an SVG file, a hand-off to Draw', async () => {
    const tpl = templates().find((x) => x.id === 'org-company')!;
    expect(def.view(tpl.doc)).toHaveLength(1);
    expect(def.view('')).toHaveLength(1);
    const svg = await def.exports![0].build(tpl.doc, { title: '', link: '' });
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
    // A step in a lane starts with the lane's name; a new table is numbered on.
    expect(charsOf(newThing(doc('lanes', '- Sales: Calls\n- Shop: Sells\n'), 'Sales').block.runs)).toBe('Sales: ');
    expect(newThing(doc('lanes', '- Sales: Calls\n- Shop: Sells\n'), 'Sales').at).toBe(1);
    expect(charsOf(newThing(doc('seating', '- Top table: Jo\n')).block.runs)).toBe('Table 2: ');
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
    const lanes = doc('lanes', '- Sales: Calls\n- Shop: Sells\n- Sales: Closes\n');
    expect(run(lanes, dropOn(lanes, { k: 'line', at: 0, part: 'words' }, { k: 'line', at: 1, part: 'words' }))).toBe('- Shop: Sells\n- Shop: Calls\n- Sales: Closes\n');
    expect(run(lanes, dropIn(lanes, { k: 'line', at: 2, part: 'words' }, 'Shop'))).toBe('- Sales: Calls\n- Shop: Sells\n- Shop: Closes\n');
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
    // An org chart's connection is a dotted line, named by the person, not their role.
    const org = doc('org', '- Ada | CEO\n- Ben | CTO\n');
    expect(run(org, connect(org, 'Ada | CEO', 'Ben | CTO'))).toBe('- Ada | CEO\n- Ben | CTO\n\n~ Ada -- Ben\n');
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
  test('a thing as blocks: a tree\'s line with its family at the margin, a seat as a line, a lane\'s steps, a connection', () => {
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
  test('pasted at a thing: a tree\'s after its family at its level; a seat after the one in hand; a step into its lane; a connection once', () => {
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
  test('moved past a neighbour: a tree\'s family among its siblings, a step, a seat past the one beside it; none past the end', () => {
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
