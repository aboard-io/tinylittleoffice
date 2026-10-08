import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTodos, serializeTodos } from '../src/lib/todomodel.ts';
import { emptyBoard, parseBoard, serializeBoard } from '../src/lib/boardmodel.ts';
import { ganttRange, parseGantt, serializeGantt } from '../src/lib/ganttmodel.ts';
import { distanceKm, formatKm, parseTrip, routeKm, serializeTrip } from '../src/lib/tripmodel.ts';
import { depthScale, parseAnim, removeKey, restKey, serializeAnim, stateAt, withKey, withShapes } from '../src/lib/animmodel.ts';
import { parseDrawing, serializeDrawing, paint } from '../src/lib/drawmodel.ts';
import { TARGETS, blueskyCost, roomFor } from '../src/lib/limits.ts';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import type { Kind as LineKind } from '../src/lib/lines.ts';
import { animToSvg, frameSvg } from '../src/apps/anim.def.ts';
import { boardToCsv } from '../src/apps/board.def.ts';
import { toMarkdown, fromMarkdown, parseCsv, looksLikeCsv } from '../src/lib/markdown.ts';
import { ganttToCsv } from '../src/apps/gantt.def.ts';
import { tripToGeoJson, tripToGpx } from '../src/apps/trip.def.ts';
import { ganttSpans } from '../src/lib/ganttmodel.ts';
import { formatLeg, tripUnits } from '../src/lib/tripmodel.ts';

test('todo round trip', () => {
  const tasks = [
    { text: 'Buy milk', done: false, star: false, due: null },
    { text: 'x marks - the spot', done: true, star: true, due: 2000 },
    { text: '', done: false, star: true, due: null },
  ];
  const s = serializeTodos(tasks);
  assert.equal(s, '- Buy milk\nx!@1jk x marks - the spot\n-! ');
  assert.deepEqual(parseTodos(s), tasks);
  assert.deepEqual(parseTodos(''), []);
  assert.deepEqual(parseTodos('junk\n- ok'), [{ text: 'ok', done: false, star: false, due: null }]);
  assert.equal(toMarkdown(appOf('todo')!, s), '- [ ] Buy milk\n- [x] **x marks - the spot** (due 2025-06-23)\n- [ ] ****\n');
});

test('board round trip', () => {
  assert.equal(serializeBoard(emptyBoard()), '');
  assert.deepEqual(parseBoard(''), emptyBoard());
  const stages = [
    { name: 'Backlog', limit: 0, cards: ['Write spec', '#hashtag card', '\\slash'] },
    { name: 'Doing', limit: 2, cards: [] },
    { name: '', limit: 0, cards: ['a, b'] },
  ];
  const s = serializeBoard(stages);
  assert.equal(s, '#Backlog\nWrite spec\n\\#hashtag card\n\\\\slash\n#Doing|2\n#\na, b');
  assert.deepEqual(parseBoard(s), stages);
  assert.equal(boardToCsv(s), 'Stage,Card\r\nBacklog,Write spec\r\nBacklog,#hashtag card\r\nBacklog,\\slash\r\n,"a, b"\r\n');
  assert.ok(toMarkdown(appOf('board')!, s).includes('## Doing (limit 2)'));
});

test('gantt round trip', () => {
  const tasks = [
    { start: 2000, days: 5, done: 50, label: 'Design, review' },
    { start: 2005, days: 1, done: 0, label: '' },
  ];
  const s = serializeGantt(tasks);
  assert.equal(s, '1jk,5,1e,Design, review\n1jp,1,0,');
  assert.deepEqual(parseGantt(s), tasks);
  assert.deepEqual(ganttRange(tasks), { from: 2000, to: 2006 });
  assert.equal(ganttRange([]), null);
  assert.equal(ganttToCsv(s), 'Task,Level,Start,End,Days,Done %\r\n"Design, review",1,2025-06-23,2025-06-27,5,50\r\n,1,2025-06-28,2025-06-28,1,0\r\n');
  // Indented tasks are parts of the one above; it spans them and is as done as they are.
  const nested = '1jk,1,0,Launch\n>1jk,2,2s,Sketch\n>1jm,6,0,Build\n>>1jm,1,0,Deeper\n1k0,1,0,After';
  const t = parseGantt(nested);
  assert.deepEqual(t.map((x) => x.depth ?? 0), [0, 1, 1, 2, 0]);
  assert.equal(serializeGantt(t), nested);
  const spans = ganttSpans(t);
  assert.deepEqual([spans[0].parent, spans[0].start, spans[0].days, spans[0].done], [true, 2000, 8, 22]);
  assert.deepEqual([spans[1].parent, spans[2].parent, spans[4].parent], [false, true, false]);
});

test('trip round trip and distances', () => {
  const stops = [
    { lat: 40.7128, lon: -74.006, name: 'New York, NY', note: 'Start here' },
    { lat: 51.50735, lon: -0.12776, name: 'London', note: '' },
    { lat: -33.8688, lon: 151.2093, name: '', note: 'far' },
  ];
  const s = serializeTrip(stops);
  assert.deepEqual(parseTrip(s), stops);
  assert.ok(s.split('\n')[0].endsWith(',New York, NY\tStart here'));
  assert.ok(Math.abs(distanceKm(stops[0], stops[1]) - 5570) < 15);
  assert.ok(routeKm(stops) > 22000);
  assert.equal(formatKm(0.42), '420 m');
  assert.equal(formatKm(12.345), '12.3 km');
  assert.equal(formatKm(5570.2), '5,570 km');
  assert.deepEqual(parseTrip('zzzzzzz,1,bad latitude\njunk'), []);
  assert.equal(appOf('trip')!.title(s), 'New York, NY to London');
  // Hours by default (a driving estimate), or miles, or kilometres; the choice travels with the route.
  assert.equal(tripUnits(s), 'h');
  assert.equal(tripUnits(serializeTrip(stops, 'm')), 'm');
  assert.deepEqual(parseTrip(serializeTrip(stops, 'k')), stops);
  assert.equal(formatLeg(100, 'k'), '100 km');
  assert.equal(formatLeg(100, 'm'), '62.1 mi');
  assert.equal(formatLeg(100, 'h'), '1 h 38 min');
  assert.equal(formatLeg(20, 'h'), '20 min');
  const gpx = tripToGpx(s);
  assert.ok(gpx.includes('<rtept lat="40.71280" lon="-74.00600"><name>New York, NY</name><desc>Start here</desc></rtept>'));
  assert.equal(gpx.match(/<wpt /g)!.length, 3);
  const geo = JSON.parse(tripToGeoJson(s));
  assert.equal(geo.features.length, 4);
  assert.deepEqual(geo.features[0].geometry.coordinates[1], [-0.12776, 51.50735]);
});

test('motion round trip and interpolation', () => {
  assert.equal(serializeAnim(parseAnim('')), '');
  // A drawing on its own is a motion document in which nothing moves yet.
  const still = parseAnim('r,2,1,12,6,1b3,Box');
  assert.equal(still.frames, 24);
  assert.equal(still.fps, 8);
  assert.equal(serializeDrawing(still.shapes), 'r,2,1,12,6,1b3,Box');
  assert.deepEqual(stateAt(still, 0, 5), { t: 5, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '' });
  const text = '!o\nt,4,20,20,4,04,Lift off\ni,8,36,8,8,0b,rocket\n@0\t0,0,0,0,a,0;n,0,-2s,0,a,0,i\n@1\t0,0,0,0,a,0;n,5k,-5k,2s,a,-u,d';
  const anim = parseAnim(text);
  assert.equal(serializeAnim(anim), text);
  assert.deepEqual(anim.keys[1][1], { t: 23, dx: 200, dy: -200, z: 100, s: 1, r: -30, fx: 'd' });
  // Halfway between two keys, halfway there; effects hold from a key until the next.
  assert.deepEqual(stateAt(anim, 1, 11.5), { t: 11.5, dx: 100, dy: -100, z: 50, s: 1, r: -15, fx: '' });
  assert.equal(stateAt(anim, 1, 23).fx, 'd');
  assert.equal(stateAt(anim, 1, 99).dx, 200);
  // Keys replace at the same moment and are kept in order.
  const more = withKey(anim, 0, { ...restKey(10), s: 2 });
  assert.deepEqual(more.keys[0].map((k) => k.t), [0, 10, 23]);
  assert.equal(withKey(more, 0, { ...restKey(10), s: 3 }).keys[0][1].s, 3);
  assert.deepEqual(removeKey(more, 0, 10).keys[0].map((k) => k.t), [0, 23]);
  assert.equal(depthScale(200), 1.5);
  // The frames and the speed are the first line; keys that are all at rest are not written.
  assert.equal(serializeAnim({ ...still, frames: 36, fps: 12 }), '!10,12\nr,2,1,12,6,1b3,Box');
  assert.equal(serializeAnim(withKey(still, 0, restKey(5))), '!o\nr,2,1,12,6,1b3,Box');
  // Redrawn, the keys follow their shapes: edited in place, reordered, or one taken out.
  const two = parseAnim('!o\nr,2,1,12,6,1,A\ne,20,2,10,6,0,B\n@1\t0,0,0,0,a,0;5,8,0,0,a,0');
  assert.deepEqual(withShapes(two, parseDrawing('r,4,1,12,6,1,A\ne,20,2,10,6,0,B')).keys[1].length, 2);
  assert.deepEqual(withShapes(two, parseDrawing('e,20,2,10,6,0,B\nr,2,1,12,6,1,A')).keys.map((k) => k.length), [2, 0]);
  assert.deepEqual(withShapes(two, parseDrawing('e,20,2,10,6,0,B')).keys.map((k) => k.length), [2]);
  assert.deepEqual(withShapes(two, parseDrawing('r,2,1,12,6,1,A')).keys.map((k) => k.length), [0]);

  // Each frame is the drawing with every shape where its keys put it, nearer things over further ones.
  const f = frameSvg(anim, 23);
  assert.ok(f.includes('transform="translate(296 120) rotate(-30) scale(1.25 1.25) translate(-96 -320)"'), f);
  assert.ok(f.includes('LIFT OFF') && f.includes('fill="#fff"') && f.includes('filter="url(#fx-d)"'));
  assert.ok(f.indexOf('LIFT OFF') < f.indexOf('<path d="M4.5 16.5'), 'the rocket, nearer, is drawn last');
  const mirrored = frameSvg(withKey(still, 0, { ...restKey(0), fx: 'mw' }), 1);
  assert.ok(mirrored.includes('rotate(4) scale(-1 1)'), mirrored);
  const pages = appOf('anim')!.frames!(text);
  assert.equal(pages.pages.length, 24);
  assert.equal(pages.delayMs, 125);
  assert.equal(pages.pages[0].w, 640);
  // On its own it plays and loops; in another document (a slide) it plays once and rests, and a still of it is its end.
  const svg = animToSvg(text);
  assert.ok(svg.includes('type="translate" values="96 320;296 120" keyTimes="0;1" dur="2.88s" repeatCount="indefinite"'), svg);
  assert.ok(svg.includes('<g transform="translate(96 320)">'));
  const once = appOf('anim')!.view(text, { embed: true })[0].svg;
  assert.ok(once.includes('repeatCount="1" fill="freeze"') && !once.includes('indefinite'));
  assert.ok(once.includes('<g transform="translate(296 120)">'));
  assert.deepEqual(appOf('anim')!.outline(text), ['Lift off', 'rocket']);
});

test('drawing colours and text sizes', () => {
  const s = 'r,1,1,4,4,1b3,Blue box\nt,0,0,4,2,04,Big\ne,0,0,2,2,2\na,0,0,2,2,0r';
  const shapes = parseDrawing(s);
  assert.deepEqual(shapes.map((x) => [x.f, x.c, x.z]), [[1, 'b', 3], [0, undefined, 4], [2, undefined, undefined], [0, 'r', undefined]]);
  assert.equal(serializeDrawing(shapes), s);
  const p = paint(shapes[0], '#000', '#fff', '#eee');
  assert.deepEqual([p.stroke, p.fill, p.fillOpacity, p.text, p.px], ['#0072b2', '#0072b2', 0.16, '#0072b2', 20]);
  assert.deepEqual(paint(shapes[2], '#000', '#fff', '#eee').text, '#fff');
  assert.equal(paint(shapes[3], '#000', '#fff', '#eee').marker, 'arrow-r');
});

test('room for a link, service by service', () => {
  const long = 'https://tinylittleoffice.com/#/v0/sheet/' + 'A'.repeat(400);
  assert.equal(blueskyCost(long), 'tinylittleoffice.com'.length + 16);
  assert.equal(blueskyCost('https://a.io/'), 4);
  const rooms = Object.fromEntries(roomFor(long).map((r) => [r.target.id, r.left]));
  assert.equal(rooms.link, 2048 - long.length);
  assert.equal(rooms.bluesky, 300 - 36);
  assert.equal(rooms.mastodon, 477);
  assert.equal(rooms.x, 257);
  assert.ok(rooms.sms < 0);
  assert.equal(rooms.discord, 2000 - long.length);
  assert.equal(rooms.ntag215, 504 - long.length);
  assert.equal(rooms.ntag216, 888 - long.length);
  assert.equal(rooms.qr, 2953 - long.length);
  assert.equal(new Set(TARGETS.map((t) => t.id)).size, TARGETS.length);
});

test('embedding one document in another', async () => {
  const { linkToRef, makeRef, refPage, refSteps, resolve } = await import('../src/kit/embed.ts');
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const { parseDoc, serializeDoc } = await import('../src/lib/richtext.ts');
  const { docToHtml, docToRtf } = await import('../src/apps/write.def.ts');
  const deck = encodeEnvelope({ created: null, body: '::t\nSpring launch\nWhat ships\n\nAgenda\none' });
  const drawing = makeRef('draw', 'r,2,1,12,6,1,Box\ne,20,1,6,6,0');

  // Any TinyLittleOffice link, from any host or version, with or without a download extension.
  assert.equal(linkToRef(` https://tinylittleoffice.com/deck/#/v0/deck/${deck}\n`), `deck/${deck}`);
  assert.equal(linkToRef(`http://localhost:4173/#/v0/deck.pptx/${deck}`), `deck/${deck}`);
  assert.equal(linkToRef(`see https://tinylittleoffice.com/#/v0/deck/${deck}`), null);
  assert.equal(linkToRef('https://example.com/#/v0/nope/abc'), null);
  assert.equal(linkToRef('https://example.com/'), null);

  const d = resolve(`deck/${deck}`);
  assert.deepEqual([d.def!.name, d.title, d.locked, d.hash], ['Deck', 'Spring launch', false, `#/v0/deck/${deck}`]);
  assert.ok(refPage(drawing).svg.includes('>Box</text>'));
  assert.equal(refSteps(drawing), 2);
  assert.deepEqual([resolve('sheet/Eabc').locked, resolve('sheet/Eabc').title], [true, 'Locked sheet']);
  // A new, empty document can be embedded before anything is in it.
  assert.equal(makeRef('draw', ''), 'draw/');
  assert.ok(refPage('draw/').w > 0);

  // In a text it is one line, and survives the round trip beside ordinary paragraphs.
  const text = `# Plan\n@@deck/${deck}\n\\@@not an embed\n@@ nor this\n@@draw/`;
  const blocks = parseDoc(text);
  assert.deepEqual(blocks.map((b) => b.k), ['h1', 'e', 'p', 'p', 'e']);
  assert.equal(blocks[1].ref, `deck/${deck}`);
  assert.equal(blocks[2].runs[0].t, '@@not an embed');
  assert.equal(serializeDoc(blocks), text.replace('@@ nor this', '\\@@ nor this'));

  // Exports carry a working link and a picture of the document.
  const ctx = { created: null, base: 'https://tinylittleoffice.com/' };
  const html = docToHtml(`# Plan\n@@deck/${deck}\n@@${drawing}`, ctx);
  assert.ok(html.includes(`<a href="https://tinylittleoffice.com/#/v0/deck/${deck}">Spring launch</a> <small>Deck</small>`));
  assert.ok(html.includes('>Spring launch</text>') && html.includes('>Box</text>'));
  const rtf = docToRtf(`@@deck/${deck}`, ctx);
  assert.ok(rtf.includes(`HYPERLINK "https://tinylittleoffice.com/#/v0/deck/${deck}"`));
  assert.ok(rtf.includes('Spring launch') && rtf.includes('Agenda'));
});

test('text: nested list items', async () => {
  const { parseDoc, serializeDoc } = await import('../src/lib/richtext.ts');
  const text = '- one\n-- two\n--- three\n---- four\n- back\n++ numbered, in\n\\-- a paragraph';
  const blocks = parseDoc(text);
  assert.deepEqual(blocks.map((b) => [b.k, b.d ?? 0]), [['ul', 0], ['ul', 1], ['ul', 2], ['ul', 3], ['ul', 0], ['ol', 1], ['p', 0]]);
  assert.equal(serializeDoc(blocks), text);
});

test('deck: layouts, columns, embedded documents, transition', async () => {
  const { parseDeck, serializeDeck, deckTransition } = await import('../src/lib/deckmodel.ts');
  const { layoutSlide, slidePage, slideSteps } = await import('../src/apps/deck.def.ts');
  const text = '!zoom\n\n:rocket:t\nBig launch\nSpring\n\n::2\nPlan\nleft\n|\nright one\nright two\n\n:star:i\nWhy\nbecause\n\nShapes\nfirst\n\\|\n@@draw/';
  const slides = parseDeck(text);
  assert.equal(deckTransition(text), 'zoom');
  // Fade is what a deck does unless told otherwise (and what an old "!fade" still means).
  assert.equal(deckTransition(':rocket\nA'), '');
  assert.equal(deckTransition('!fade\n\nA'), '');
  assert.equal(deckTransition('!cut\n\nA'), 'cut');
  assert.deepEqual(slides.map((s) => s.layout ?? ''), ['t', '2', 'i', '']);
  assert.deepEqual(slides[1].right, ['right one', 'right two']);
  assert.deepEqual([slides[3].bullets, slides[3].sub], [['first', '|'], 'draw/']);
  assert.equal(serializeDeck(slides, 'zoom'), text);
  assert.equal(deckTransition(serializeDeck(slides)), '');
  // Builds: a title slide appears whole; others reveal a bullet at a time, then what their document builds.
  assert.deepEqual(slideSteps(slides[0]), { bullets: 0, sub: 0 });
  assert.deepEqual(slideSteps(slides[1]), { bullets: 3, sub: 0 });
  const two = slidePage(slides[1], 1).svg;
  assert.ok(two.includes('>left</text>') && !two.includes('right one'));
  assert.ok(slidePage(slides[1]).svg.includes('>right two</text>'));
  // Type shrinks as a slide fills up.
  const few = layoutSlide({ icon: '', title: 'T', bullets: ['a', 'b'] }).bodyPx;
  const many = layoutSlide({ icon: '', title: 'T', bullets: Array.from({ length: 14 }, (_, i) => `A reasonably long bullet number ${i} that takes some room`) }).bodyPx;
  assert.ok(few > many && few >= 30 && many >= 14, `${few} vs ${many}`);
  // The big icon takes the right-hand half.
  assert.ok(layoutSlide(slides[2]).icon!.w > 200 && layoutSlide(slides[2]).icon!.x > 480);
  // A document shown on a slide has the whole slide: no headline, no bullets, and it builds a piece per click.
  const { makeRef } = await import('../src/kit/embed.ts');
  const taken = { icon: 'star', title: 'Hidden headline', bullets: ['hidden bullet'], sub: makeRef('draw', 'r,2,1,12,6,1,One\ne,20,10,10,8,0,Two') };
  const box = layoutSlide(taken).sub!;
  assert.ok(box.x <= 24 && box.w >= 900 && box.h >= 550);
  assert.deepEqual(slideSteps(taken), { bullets: 0, sub: 2 });
  const whole = slidePage(taken).svg;
  assert.ok(whole.includes('>One</text>') && whole.includes('>Two</text>'));
  assert.ok(!whole.includes('Hidden headline') && !whole.includes('hidden bullet'));
  assert.ok(!slidePage(taken, 0, 0).svg.includes('>One</text>'));
  assert.ok(slidePage(taken, 0, 1).svg.includes('>One</text>') && !slidePage(taken, 0, 1).svg.includes('>Two</text>'));
  // A table fills in a cell per click: across each row, rows top to bottom. Empty cells take no click.
  const table = { icon: '', title: '', bullets: [], sub: makeRef('sheet', 'a\tb\n1\n3\t4') };
  assert.deepEqual(slideSteps(table), { bullets: 0, sub: 5 });
  const cells = (n: number) => ['a', 'b', '1', '3', '4'].filter((t) => slidePage(table, 0, n).svg.includes(`>${t}</text>`));
  assert.deepEqual([cells(0), cells(1), cells(3), cells(4), cells(5)], [[], ['a'], ['a', 'b', '1'], ['a', 'b', '1', '3'], ['a', 'b', '1', '3', '4']]);
  // The grid itself is there before any of it is filled in.
  assert.equal(slidePage(table, 0, 0).svg.match(/<rect /g)!.length, slidePage(table).svg.match(/<rect /g)!.length);
});

test('history: undo and redo, with a burst of changes as one step', async () => {
  const { History } = await import('../src/kit/core.ts');
  const h = new History(700);
  assert.equal(h.undo('a'), null);
  // "a" becomes "ab" then "abc" while typing, then, later, "abcd".
  h.record('a', 1000);
  h.record('ab', 1200);
  h.record('abc', 5000);
  assert.ok(h.canUndo && !h.canRedo);
  assert.equal(h.undo('abcd'), 'abc');
  assert.equal(h.undo('abc'), 'a');
  assert.equal(h.undo('a'), null);
  assert.equal(h.redo('a'), 'abc');
  assert.equal(h.redo('abc'), 'abcd');
  assert.equal(h.redo('abcd'), null);
  // A new change after undoing forgets what was undone.
  assert.equal(h.undo('abcd'), 'abc');
  h.record('abc', 9000);
  assert.ok(!h.canRedo);
  assert.equal(h.undo('abX'), 'abc');
  h.clear();
  assert.ok(!h.canUndo && !h.canRedo);
});

test('diagram apps: outlines become shapes Draw can draw', async () => {
  const { specOf, toDrawing, outline, placeTree } = await import('../src/lib/diagram.ts');
  const { parseDrawing, isLink } = await import('../src/lib/drawmodel.ts');
  const { pageSvg } = await import('../src/kit/core.ts');
  assert.deepEqual(placeTree(outline('- A\n  - B\n  - C\n    - D\n- E')).map((p) => [p.node.text, p.node.depth, p.across, p.parent]), [['A', 0, 0.5, -1], ['B', 1, 0, 0], ['C', 1, 1, 0], ['D', 2, 1, 2], ['E', 0, 2, -1]]);
  for (const id of ['org', 'mind', 'lanes', 'venn', 'net', 'db', 'floor', 'seating', 'family', 'timeline']) {
    const spec = specOf(id)!;
    const def = appOf(id)!;
    const d = spec.layout!(spec.example);
    assert.ok(d.shapes.length >= 4, `${id} draws its example`);
    // Every join points at two real shapes that are not joins themselves.
    for (const s of d.shapes) if (isLink(s.k)) assert.ok(d.shapes[s.x] && d.shapes[s.y] && !isLink(d.shapes[s.x].k) && !isLink(d.shapes[s.y].k), `${id} join`);
    const svg = pageSvg(def.view(spec.example)[0]);
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${id} draws cleanly`);
    assert.equal(def.steps!(spec.example), d.shapes.length);
    // It builds a shape at a time, and nothing is drawn of an empty one.
    assert.ok(pageSvg(def.view(spec.example, { step: 1 })[0]).length < svg.length);
    assert.equal(spec.layout!('').shapes.length, 0);
    // It opens in Draw: the same number of shapes, fitted to Draw's canvas.
    const shapes = parseDrawing(toDrawing(d));
    assert.equal(shapes.length, d.shapes.length, `${id} converts`);
    assert.ok(shapes.every((s) => isLink(s.k) || (s.x >= 0 && s.x + s.w <= 648 && s.y + s.h <= 408)), `${id} fits`);
  }
  // What the outlines mean.
  const org = specOf('org')!.layout!('- Ada | CEO\n  - Ben\n  - Eve');
  // In reading order: a thing, the next thing, the line between them, the next thing, its line.
  assert.deepEqual(org.shapes.map((s) => s.k), ['o', 'o', 'j', 'o', 'j']);
  assert.deepEqual([org.shapes[2].x, org.shapes[2].y, org.shapes[4].x, org.shapes[4].y], [0, 1, 0, 3]);
  assert.equal(org.shapes[0].text, 'Ada | CEO');
  assert.ok(org.shapes[1].y > org.shapes[0].y && org.shapes[1].x < org.shapes[3].x);
  const lanes = specOf('lanes')!.layout!('A: one\nB: two?\nA: three');
  assert.deepEqual(lanes.shapes.map((s) => s.k), ['r', 't', 'r', 't', 'o', 'd', 'k', 'o', 'k']);
  assert.deepEqual([lanes.shapes[6].x, lanes.shapes[6].y, lanes.shapes[8].x, lanes.shapes[8].y], [4, 5, 5, 7]);
  const net = specOf('net')!.layout!('A > B: calls\nB - C\nD');
  assert.deepEqual(net.shapes.map((s) => s.k + s.text), ['oA', 'oB', 'kcalls', 'oC', 'j', 'oD']);
  const venn = specOf('venn')!.layout!('X: a\nY: b\nX & Y: both');
  assert.equal(venn.shapes.filter((s) => s.k === 'e').length, 2);
  assert.ok(venn.shapes.some((s) => s.text === 'both'));
});

test('drawing: more shapes, and joins that follow', async () => {
  const { parseDrawing, serializeDrawing, removeShape, restack, linkEnds } = await import('../src/lib/drawmodel.ts');
  const { drawingToSvg } = await import('../src/apps/draw.def.ts');
  const text = 'o,2,2,12,6,1b,Web | front end\nc,30,2,12,8,0,Data\nn,2,20,12,8,0,Note\nk,0,1,0,0,1,reads\nj,0,2,0,0,0\nh,30,20,10,6,0\np,50,20,10,6,0';
  const shapes = parseDrawing(text);
  assert.equal(serializeDrawing(shapes), text);
  assert.deepEqual([shapes[3].x, shapes[3].y], [0, 1]);
  const svg = drawingToSvg(text);
  assert.ok(svg.includes('marker-end') && svg.includes('>reads</text>') && svg.includes('>front end</text>'));
  // A join runs from box edge to box edge.
  const [x1, , x2] = linkEnds(shapes[3], shapes)!;
  assert.ok(x1 > 16 + 96 && x2 < 240);
  // Deleting a shape takes its joins with it and renumbers the rest.
  const less = removeShape(shapes, 1);
  assert.deepEqual(less.map((s) => s.k), ['o', 'n', 'j', 'h', 'p']);
  assert.deepEqual([less[2].x, less[2].y], [0, 1]);
  // Bringing a shape to the front keeps joins on the same shapes.
  const up = restack(shapes, 0, true);
  assert.equal(up.at, 6);
  const link = up.shapes.find((s) => s.k === 'k')!;
  assert.deepEqual([up.shapes[link.x].text, up.shapes[link.y].text], ['Web | front end', 'Data']);
});

test('tiny relational database', async () => {
  const { parseDb, runQuery } = await import('../src/lib/reldb.ts');
  const db = parseDb('teams: id, name\n1, Platform\n2, Design\n\npeople: id, name, team_id > teams, salary\n1, Ann, 1, 120\n2, "Bo, Jr", 2, 90\n3, Cy, 1, 100\n4, Di, 2, 110\n\n? select * from teams');
  assert.deepEqual(db.tables.map((t) => [t.name, t.cols.length, t.rows.length]), [['teams', 2, 2], ['people', 4, 4]]);
  assert.equal(db.tables[1].cols[2].ref, 'teams');
  assert.equal(db.tables[1].rows[1][1], 'Bo, Jr');
  assert.deepEqual(db.queries, ['select * from teams']);
  const q = (sql: string) => runQuery(db, sql);
  assert.deepEqual(q('select * from teams'), { cols: ['id', 'name'], rows: [[1, 'Platform'], [2, 'Design']] });
  assert.deepEqual(q("select name from people where salary >= 100 and team_id = 1 or name like 'bo%' order by name").rows, [['Ann'], ['Bo, Jr'], ['Cy']]);
  assert.deepEqual(q('select people.name, teams.name from people join teams on team_id = teams.id where teams.name = \'Design\' order by people.name desc').rows, [['Di', 'Design'], ['Bo, Jr', 'Design']]);
  assert.deepEqual(q('select teams.name, count(*) as n, sum(salary), avg(salary), max(salary) from people join teams on team_id = teams.id group by teams.name order by n desc, teams.name'), { cols: ['teams.name', 'n', 'sum(salary)', 'avg(salary)', 'max(salary)'], rows: [['Design', 2, 200, 100, 110], ['Platform', 2, 220, 110, 120]] });
  assert.deepEqual(q('select count(*) from people where salary > 1000').rows, [[0]]);
  assert.deepEqual(q('select name from people order by salary desc limit 2').rows, [['Ann'], ['Di']]);
  // Mistakes are explained, not thrown.
  assert.match(q('select * from nowhere').error!, /No table called "nowhere"/);
  assert.match(q('select name from people join teams on team_id = teams.id').error!, /more than one table/);
  assert.match(q('select wages from people').error!, /No column called "wages"/);
  assert.match(q('select * from people wher x = 1').error!, /Did not understand/);
});

test('every app reveals itself a piece at a time', () => {
  const count = (id: string, body: string) => appOf(id)!.steps!(body);
  const at = (id: string, body: string, step: number) => appOf(id)!.view(body, { step, embed: true })[0].svg;
  // Tasks, cards, schedule lines, calendar spans, map stops, chart bars.
  assert.equal(count('todo', '- one\nx two\n- three'), 3);
  assert.ok(at('todo', '- one\nx two', 1).includes('one') && !at('todo', '- one\nx two', 1).includes('two'));
  assert.equal(count('board', '#A\nx\ny\n#B\nz'), 3);
  assert.ok(at('board', '#A\nxx\nyy\n#B\nzz', 2).includes('yy') && !at('board', '#A\nxx\nyy\n#B\nzz', 2).includes('zz'));
  assert.equal(count('gantt', '1jk,5,1e,Design\n1jp,2,0,Build'), 2);
  assert.ok(!at('gantt', '1jk,5,1e,Design\n1jp,2,0,Build', 1).includes('Build'));
  assert.equal(count('sheet', '!bar\nQ\tSales\nQ1\t1\nQ2\t2\nQ3\t3'), 3);
  assert.equal(at('sheet', '!bar\nQ\tSales\nQ1\t1\nQ2\t2\nQ3\t3', 2).match(/rx="2"/g)!.length, 2);
  assert.equal(count('cal', 'd2,2,Offsite\ndb,1,Launch'), 2);
  assert.ok(at('cal', 'd2,2,Offsite\ndb,1,Launch', 1).includes('Offsite') && !at('cal', 'd2,2,Offsite\ndb,1,Launch', 1).includes('Launch'));
});

test('calendar: a month drawn as a month, with colours and what they stand for', async () => {
  const { parseCalendar, serializeCalendar } = await import('../src/lib/calmodel.ts');
  const text = 'd2,2.g,Offsite\ntgo,2i.r,Call\ndb,1,Launch\n#g=Sam\n#r=Paul';
  const cal = parseCalendar(text);
  assert.deepEqual(cal.spans.map((s) => s.color ?? ''), ['r', 'g', '']);
  assert.deepEqual(cal.legend, { g: 'Sam', r: 'Paul' });
  assert.equal(serializeCalendar(cal), 'tgo,2i.r,Call\nd2,2.g,Offsite\ndb,1,Launch\n#g=Sam\n#r=Paul');
  // A colour nobody uses any more takes its name with it.
  assert.equal(serializeCalendar({ ...cal, spans: cal.spans.slice(2) }), 'db,1,Launch');
  const page = appOf('cal')!.view(text)[0].svg;
  assert.ok(page.includes('>January 2020</text>') && page.includes('>Sun</text>'));
  assert.ok(page.includes('#009e73') && page.includes('>Offsite</text>') && page.includes('>Sam</text>'));
  assert.equal(page.match(/<rect [^>]*stroke="#d4d4d8"/g)!.length, 35);
});

test('trip: drawn on the real map', () => {
  const page = appOf('trip')!.view('3xa8g,-fuyo,Lisbon\tnote here\n3zkdp,-ep8q,Coimbra')[0].svg;
  const tiles = [...page.matchAll(/<image href="https:\/\/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png"/g)];
  assert.ok(tiles.length >= 4 && tiles.length <= 24, String(tiles.length));
  // Portugal: zoomed in enough to see it, on the tiles that hold it.
  assert.ok(tiles.every((t) => +t[1] >= 6 && +t[1] <= 9));
  assert.ok(page.includes('OpenStreetMap') && page.includes('>Lisbon</text>') && page.includes('note here'));
  // Stops arrive one at a time, each with its name and note.
  const one = appOf('trip')!.view('3xa8g,-fuyo,Lisbon\tnote here\n3zkdp,-ep8q,Coimbra', { step: 1 })[0].svg;
  assert.ok(one.includes('note here') && !one.includes('Coimbra') && !one.includes('<polyline'));
  assert.ok(!appOf('trip')!.view('3xa8g,-fuyo,Lisbon', { step: 0 })[0].svg.includes('>Lisbon</text>'));
});

test('icons in drawings and diagrams', async () => {
  const { parseDrawing, iconOf } = await import('../src/lib/drawmodel.ts');
  const { drawingToSvg, shapeSvg } = await import('../src/apps/draw.def.ts');
  assert.deepEqual(iconOf(':rocket Launch'), ['rocket', 'Launch']);
  assert.deepEqual(iconOf(':rocket'), ['rocket', '']);
  assert.deepEqual(iconOf('No icon: here'), ['', 'No icon: here']);
  const svg = drawingToSvg('i,2,2,6,6,0b,star\no,12,2,16,6,1,:rocket Launch | soon');
  // An icon on its own, and one in front of a label.
  assert.equal(svg.match(/stroke-linecap="round" stroke-linejoin="round"/g)!.length, 2);
  assert.ok(svg.includes('>Launch</text>') && svg.includes('>soon</text>') && !svg.includes(':rocket'));
  assert.equal(parseDrawing('i,2,2,6,6,0,star')[0].text, 'star');
  // The diagram apps pass labels through, so ":icon" works in all of them.
  const { specOf } = await import('../src/lib/diagram.ts');
  const org = specOf('org')!.layout!('- :crown Ada | CEO\n  - :wrench Ben');
  assert.ok(shapeSvg(org.shapes[0], org.shapes).includes('stroke-linecap="round"'));
});

test('page apps: a site, a store, an invoice, a contract', async () => {
  const { specOf } = await import('../src/lib/diagram.ts');
  for (const id of ['site', 'store', 'invoice', 'contract', 'flow', 'adventure', 'hunt', 'trivia', 'madlibs', 'spinner', 'flashcards', 'poll', 'santa', 'split', 'log']) {
    const spec = specOf(id)!;
    const page = spec.page!(spec.example);
    assert.ok(page.startsWith('<!doctype html>') && page.includes('<meta property="og:title"') && page.includes('</html>'), id);
    assert.ok(!page.includes('undefined') && !page.includes('NaN'), `${id} is clean`);
    assert.ok(appOf(id)!.document!(spec.example, { created: null }) === page);
    assert.ok(appOf(id)!.view(spec.example)[0].h > 0 && appOf(id)!.title(spec.example).length > 0, `${id} has a title and a picture`);
    assert.ok(spec.page!('').startsWith('<!doctype html>'), `${id} survives being empty`);
  }
  const site = specOf('site')!.page!(specOf('site')!.example);
  assert.ok(site.includes('<h1>Harbor Coffee</h1>') && site.includes('href="#menu"') && site.includes('<section class="page" id="menu">') && site.includes('<strong>Roasted daily</strong>'));
  const store = specOf('store')!.page!(specOf('store')!.example);
  assert.ok(store.includes('data-add="3"') && store.includes('$12.50') && store.includes('orders@example.com') && store.includes('Send order by email'));
  // Nothing typed into a page can break out of it.
  assert.ok(!specOf('store')!.page!('# <script>alert(1)</script>\nx | 1 | </script><script>alert(2)</script>').includes('<script>alert'));
  const { parseInvoice } = await import('../src/apps/invoice.def.ts');
  const inv = parseInvoice(specOf('invoice')!.example);
  assert.deepEqual([inv.items.length, inv.subtotal, inv.tax, inv.total], [3, 5080, 406.4, 5486.4]);
  assert.equal(inv.money(inv.total), '$5,486.40');
  assert.ok(appOf('invoice')!.view(specOf('invoice')!.example)[0].svg.includes('>$5,486.40</text>'));
  assert.equal(appOf('invoice')!.title(specOf('invoice')!.example), 'Invoice 0042');
});

test('invoice: the sums, and the page that is its editor', async () => {
  const { specOf } = await import('../src/lib/diagram.ts');
  const { parseInvoice } = await import('../src/apps/invoice.def.ts');
  const { readLines, kindsOf } = await import('../src/lib/lines.ts');
  const spec = specOf('invoice')!;
  // "what, price" is one of them; a note with a comma and no number is a note; tax and currency apply to the lot.
  const inv = parseInvoice('Currency: £\nTax: 20\nDesign, 2, 150.5\nHosting, 480\nThanks, pay soon\n\nNet 30');
  assert.deepEqual(inv.items, [{ what: 'Design', qty: 2, unit: '', price: 150.5 }, { what: 'Hosting', qty: 1, unit: '', price: 480 }]);
  assert.deepEqual([inv.subtotal, inv.tax, inv.total, inv.money(inv.total)], [781, 156.2, 937.2, '£937.20']);
  assert.deepEqual(inv.notes, ['Thanks, pay soon', 'Net 30']);
  assert.equal(parseInvoice('Credit, 1, -20').money(parseInvoice('Credit, 1, -20').total), '-$20.00');
  assert.equal(parseInvoice('').total, 0);
  // Each part knows its row of the text (blank lines not counted), which is where the page writes it back.
  assert.deepEqual(inv.rows, { fields: { currency: 0, tax: 1 }, items: [2, 3], notes: [4, 5] });
  // The form reads the same lines the same way: a price is a number, so "Thanks, pay soon" is not a thing with a price.
  const names = readLines('Design, 2, 150.5\nHosting, 480\nThanks, pay soon\na, b, 2, 3', spec.form!).map((r) => kindsOf(spec.form!).kinds[r.kind].name);
  assert.deepEqual(names, ['Item', 'Single item', 'Note', 'Item']);
  assert.deepEqual(readLines('a, b, 2, 3', spec.form!)[0].values, ['a, b', '2', '', '3']);
  // A quantity may carry its units.
  assert.deepEqual(readLines('Design, 12 hours, 150', spec.form!)[0].values, ['Design', '12', 'hours', '150']);
  assert.equal(parseInvoice('Design, 12 hours, 150').items[0].unit, 'hours');
  // The page as it is read has no marks; edited, every field is marked with its row, a hint where it is empty.
  const plain = spec.page!(spec.example);
  assert.ok(!plain.includes('data-lf') && !plain.includes('data-inv'));
  const edit = spec.page!(spec.example, { edit: true });
  assert.ok(edit.includes('data-lf="2,0"') && edit.includes('>0042</span>'), 'the number is row 2');
  assert.ok(edit.includes('data-lf="0,0,0" data-hint="Your name"') && edit.includes('data-lf="0,0,1"') && edit.includes('data-lf="0,0,2" data-hint="Another line"'), 'an address is lines, with one more to type into');
  assert.ok(edit.includes('data-lf="6,1"') && edit.includes('data-lf="6,2"') && edit.includes('data-inv="qty"'), 'an item\'s quantity and price');
  assert.ok(edit.includes('data-lf="8,1"') && !edit.includes('data-lf="8,2"'), 'a single item has a price and no quantity to type');
  assert.ok(edit.includes('data-lf="+7,0" data-hint="Payment terms"') && edit.includes('data-lf="+10,0"'), 'a field not written yet is a hint of its kind');
  assert.ok(edit.includes('data-lf-add="8" data-lf-after="8"') && edit.includes('data-lf-remove="6"'));
  assert.ok(edit.includes('data-inv="total">$5,486.40<'));
  // Empty, it is all hints, and still the invoice.
  const blank = spec.page!('', { edit: true });
  assert.ok(blank.includes('data-lf="+0,0,0"') && blank.includes('data-lf-add="8" data-lf-after="-1"') && blank.includes('data-inv="total">$0.00<'));
  assert.ok(!spec.page!('', { edit: false }).includes('data-lf'));
});

test('contract: two people sign the same words', async () => {
  const { parseContract, serializeContract, signedMessage } = await import('../src/apps/contract.def.ts');
  const { createSigner, verify } = await import('../src/lib/sign.ts');
  const memory = () => {
    let held: string | null = null;
    return { get: () => held, set: (v: string) => void (held = v), remove: () => void (held = null) };
  };
  const [paul, sam] = [createSigner(memory() as never), createSigner(memory() as never)];
  const text = '# Deal\nSam walks the dog.';
  const a = await paul.sign(signedMessage(text, 'Paul'));
  // Sam signs what Paul sent; Paul's signature is untouched by it.
  let doc = serializeContract(text, [{ name: 'Paul', ...a }]);
  const b = await sam.sign(signedMessage(parseContract(doc).text, 'Sam'));
  doc = serializeContract(parseContract(doc).text, [...parseContract(doc).signatures, { name: 'Sam', ...b }]);
  const c = parseContract(doc);
  assert.equal(c.text, text);
  assert.deepEqual(c.signatures.map((s) => s.name), ['Paul', 'Sam']);
  assert.notEqual(c.signatures[0].key, c.signatures[1].key);
  for (const s of c.signatures) assert.equal(await verify(s.key, s.sig, signedMessage(c.text, s.name)), true);
  // Change a word and neither signature matches; nor does one name's signature pass for the other's.
  for (const s of c.signatures) assert.equal(await verify(s.key, s.sig, signedMessage(c.text.replace('dog', 'cat'), s.name)), false);
  assert.equal(await verify(c.signatures[0].key, c.signatures[0].sig, signedMessage(c.text, 'Sam')), false);
  assert.ok(appOf('contract')!.document!(doc, { created: null }).includes('Signed by Paul and Sam'));
});

test('paper that folds: pages land where folding needs them', async () => {
  const { parseFold, serializeFold, foldSheets, fitted, formatOf } = await import('../src/lib/fold.ts');
  const { ZINE } = await import('../src/apps/zine.def.ts');
  const numbered = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`).join('\n\n');
  // Where each page lands, reading a sheet left to right, top row first.
  const order = (svg: string) => [...svg.matchAll(/>P(\d+)<\/text>/g)].map((m) => +m[1]);
  const body = numbered(8);
  const z = parseFold(body, ZINE);
  assert.equal(z.pages.length, 8);
  assert.equal(serializeFold(z, ZINE), body);
  assert.equal(parseFold('', ZINE).pages.length, 8);
  assert.equal(serializeFold(parseFold('', ZINE), ZINE), '');
  assert.equal(serializeFold({ ...parseFold('A', ZINE), two: true }, ZINE), '!two\n\nA');
  assert.equal(parseFold('!two\n\nA', ZINE).two, true);
  const [one] = foldSheets(z, ZINE);
  assert.deepEqual([one.w, one.h], [1056, 816]);
  assert.deepEqual(order(one.svg), [5, 4, 3, 2, 6, 7, 8, 1]);
  assert.equal(one.svg.match(/rotate\(180/g)!.length, 4);
  const sides = foldSheets({ ...z, two: true }, ZINE);
  assert.deepEqual(sides.map((s) => [s.w, s.h]), [[816, 1056], [816, 1056]]);
  // Back to back: 2 is behind 1, 7 behind 8, 4 behind 3, 5 behind 6.
  assert.deepEqual(sides.map((s) => order(s.svg)), [[8, 1, 6, 3], [2, 7, 4, 5]]);
  // Everything stays on its page, however much there is.
  const long = { icon: 'star', title: 'A long headline that runs on', bullets: Array(12).fill('Words and more words to fill the page right up.') };
  for (const [w, h] of [[264, 408], [408, 528], [528, 816]]) {
    const ys = [...fitted(long, w, h).svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"/g)].map((m) => +m[1]);
    assert.ok(Math.max(...ys) <= h, `fits ${w}`);
  }
  // Inside another document it is read a page per click.
  assert.equal(appOf('zine')!.steps!(body), 7);
  assert.ok(appOf('zine')!.view(body, { step: 3, embed: true })[0].svg.includes('>P4</text>'));
  assert.ok(appOf('zine')!.document!(body, { created: null }).includes('aria-label="Back cover"'));

  // A booklet: sheets nested, the last page beside the first. It grows by fours.
  const booklet = formatOf('booklet')!;
  assert.deepEqual(foldSheets(parseFold(numbered(8), booklet), booklet).map((s) => order(s.svg)), [[8, 1], [2, 7], [6, 3], [4, 5]]);
  assert.equal(parseFold(numbered(9), booklet).pages.length, 12);
  assert.equal(parseFold('!16\n\nA', booklet).pages.length, 16);
  assert.equal(serializeFold(parseFold('!16\n\nA', booklet), booklet), '!16\n\nA');
  assert.equal(parseFold(numbered(40), booklet).pages.length, 20);
  assert.deepEqual(appOf('booklet')!.view(numbered(8)).map((p) => [p.w, p.h]), Array(4).fill([1056, 816]));
  // A brochure folds in three, the front outermost.
  const brochure = formatOf('brochure')!;
  const tri = foldSheets(parseFold(numbered(6), brochure), brochure);
  assert.deepEqual(tri.map((s) => order(s.svg)), [[5, 6, 1], [2, 3, 4]]);
  assert.deepEqual([tri[0].w, tri[0].h], [1056, 816]);
});

test('things to print: text in, letter sheets out', async () => {
  const { specOf } = await import('../src/lib/diagram.ts');
  const sizes: Record<string, number[]> = { wordsearch: [816, 1056], menu: [816, 1056], resume: [816, 1056] };
  for (const [id, size] of Object.entries(sizes)) {
    const spec = specOf(id)!;
    for (const text of [spec.example, '', 'x']) {
      const sheets = spec.sheets!(text);
      assert.ok(sheets.length >= 1 && sheets.every((p) => p.w === size[0] && p.h === size[1]), `${id}: letter paper`);
      assert.ok(!sheets.some((p) => /NaN|undefined|Infinity/.test(p.svg)), `${id} is clean`);
    }
    assert.ok(appOf(id)!.title(spec.example).length > 0, `${id} has a title`);
  }
  const svg = (id: string, text?: string) => specOf(id)!.sheets!(text ?? specOf(id)!.example).map((p) => p.svg).join('');
  // A poster is a page laid out by the deck's engine, louder: a short one is very big, and a letter sheet.
  const px = (s: string) => Math.max(...[...s.matchAll(/font-size="([\d.]+)"/g)].map((m) => +m[1]));
  const poster = (text: string) => appOf('poster')!.view(text)[0];
  assert.deepEqual([poster('SALE').w, poster('SALE').h], [816, 1056]);
  assert.ok(px(poster('SALE').svg) > 100, String(px(poster('SALE').svg)));
  assert.ok(px(poster('Open mic night\nFriday 12 March, 8pm\nThe Anchor\nFree. Bring a song.').svg) <= px(poster('SALE').svg));
  // A page type is a deck layout on paper: two columns on a poster.
  assert.ok(poster('::2\nNow and next\nDesign\nBuild\n|\nTest\nLaunch').svg.includes('>Launch</text>'));
  // Six badges to a sheet, one page each; two recipe cards.
  assert.equal(appOf('badges')!.view('!7\n\n' + Array(7).fill('Ada\nEng').join('\n\n')).length, 2);
  assert.equal(appOf('badges')!.view('Ada\nEng\n\nBob\nOps').map((p) => p.svg.match(/stroke-dasharray="6 5"/g)!.length)[0], 2);
  assert.equal(appOf('recipes')!.view('A\nx\n\nB\ny\n\nC\nz').length, 2);
  // The menu: dishes and their prices; a long one is shrunk onto the page rather than run off it.
  assert.ok(svg('menu').includes('>Flat white</text>') && svg('menu').includes('>4.20</text>') && svg('menu').includes('>COFFEE</text>'));
  const long = /<svg x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="([\d.]+)"/.exec(svg('menu', '# M\n' + Array(60).fill('Dish | 1 | about').join('\n')))!;
  assert.ok(+long[2] <= 1056 - 2 * 84 + 1 && +long[1] < 624);
  assert.ok(svg('resume').includes('Ada Lovelace') && svg('resume').includes('Experience'));
  // The comic: a zine whose pages are panels with bubbles and captions. Written plainly, it reads as one.
  const { readComic } = await import('../src/apps/comic.def.ts');
  const plain = '# Biscuit\n\n:dog Walk? | Monday, noon.\n:footprints WALK! | Sam arrives.\n\nLater\n:moon Zzz';
  const body = readComic(plain);
  assert.equal(body, 'Biscuit\n\n \n:dog Walk? | Monday, noon.\n:footprints WALK! | Sam arrives.\n\nLater\n:moon Zzz');
  assert.equal(readComic(body), body);
  const comic = appOf('comic')!.view(body)[0];
  assert.deepEqual([comic.w, comic.h], [1056, 816]);
  assert.ok(['Biscuit', 'WALK!', 'Sam arrives.', 'Later', 'Zzz'].every((t) => comic.svg.includes(`>${t}</text>`)));
  assert.equal(comic.svg.match(/stroke-width="1.5"\/>/g)!.length, 3);
  assert.equal(appOf('comic')!.title(body), 'Biscuit');
});

test('a document on a zine page has the page, at a size to read', async () => {
  const { fitted } = await import('../src/lib/fold.ts');
  const { makeRef } = await import('../src/kit/embed.ts');
  const p = fitted({ icon: '', title: 'Ignored', bullets: ['ignored'], sub: makeRef('todo', '- Book flights\nx Renew the passport before it runs out in the spring\n- Pack') }, 264, 408);
  assert.ok(p.svg.includes('Book flights') && !p.svg.includes('Ignored'));
  // The list is laid out narrow and fills the width: its type prints at about 11px, not 6.
  const [, width, vw] = /<svg x="20" y="20" width="([\d.]+)" height="[\d.]+" viewBox="0 0 (\d+) /.exec(p.svg)!;
  assert.ok((17 * +width) / +vw > 10, `${width}/${vw}`);
  // Long tasks wrap rather than being cut short.
  assert.ok(p.svg.includes('spring'));
});

test('small apps: the sums behind them', async () => {
  const { specOf } = await import('../src/lib/diagram.ts');
  // Stock and flow: sliders, and flows worked out from them and from the stocks they fill.
  const { parseFlow, runFlow } = await import('../src/apps/flow.def.ts');
  const m = parseFlow(specOf('flow')!.example);
  assert.deepEqual(m.sliders.map((s) => [s.id, s.value, s.unit, s.max]), [['visitors', 20000, '', 100000], ['signup_rate', 6, '%', 30], ['paid_rate', 25, '%', 100], ['churn', 8, '%', 50]]);
  assert.deepEqual(runFlow(m, {}), [1200, 18800, 300, 900, 24, 276]);
  assert.deepEqual(runFlow(m, { visitors: 10000, signup_rate: 10 }).slice(0, 3), [1000, 9000, 250]);
  // Only arithmetic is ever worked out, and by hand: no code runs.
  const { arithmetic } = await import('../src/apps/flow.def.ts');
  assert.deepEqual(['1+2*3', '(1+2)*3', '10/4', '-2*-3', '1e3+1', '2 (3)', 'alert(1)', '1/0', ''].map(arithmetic), [7, 9, 2.5, 6, 1001, 0, 0, 0, 0]);
  assert.deepEqual(runFlow(parseFlow('a = 1\nA > B = alert(1)\nA > C = a + 2'), {}), [0, 3]);
  assert.ok(specOf('flow')!.page!(specOf('flow')!.example).includes('type="range" id="s_signup_rate" min="0" max="30"'));

  const { settle } = await import('../src/apps/split.def.ts');
  const s = settle(specOf('split')!.example);
  assert.equal(s.total, 371.5);
  assert.deepEqual(s.pays.map((p) => `${p.from}>${p.to}:${p.amount.toFixed(2)}`), ['Grace>Paul:92.88', 'Ada>Paul:47.88', 'Sam>Paul:6.38']);

  const { draw } = await import('../src/apps/santa.def.ts');
  const names = ['Ada', 'Grace', 'Alan', 'Margaret', 'Linus'];
  const gives = draw(names);
  assert.deepEqual(Object.keys(gives).sort(), [...names].sort());
  assert.deepEqual(Object.values(gives).sort(), [...names].sort());
  assert.ok(names.every((n) => gives[n] !== n));
  assert.deepEqual(draw(names), gives);
  // The organiser's page links to a document per person, each holding one draw and no other.
  const { linkFor, ownDraw } = await import('../src/apps/santa.def.ts');
  const { decodeEnvelope } = await import('../src/lib/envelope.ts');
  const organiser = specOf('santa')!.page!('# Office\n' + names.join('\n'));
  assert.equal((organiser.match(/their link/g) ?? []).length, names.length);
  const ada = decodeEnvelope(linkFor('Office', 'Ada', gives.Ada).split('/').pop()!, 'santa').body;
  assert.equal(ada, `# Office\n= Ada > ${gives.Ada}`);
  assert.ok(!ada.includes(gives.Grace === gives.Ada ? 'zzz' : gives.Grace) || gives.Grace === gives.Ada);
  assert.deepEqual(ownDraw('= Ada > Grace')!.slice(1), ['Ada', 'Grace']);
  const theirs = specOf('santa')!.page!(ada);
  assert.ok(theirs.includes('this link is yours alone') && !theirs.includes(`give to ${gives.Ada}`) && !theirs.includes('their link'));

  const { tally } = await import('../src/apps/poll.def.ts');
  assert.deepEqual(tally(specOf('poll')!.example).map((r) => [r.option, r.who.length]), [['Pizza', 0], ['Sushi', 1], ['Tacos', 2]]);
  assert.deepEqual(tally('- A\nSam: B').map((r) => r.option), ['A', 'B']);

  const { totals } = await import('../src/apps/log.def.ts');
  assert.deepEqual(totals(specOf('log')!.example).sums.map((x) => [x.what, x.n, x.unit, x.times]), [['Run', 22.5, 'km', 3], ['Piano', 75, 'min', 2], ['Swim', 40, 'lengths', 1]]);

  const { hide } = await import('../src/apps/wordsearch.def.ts');
  const { grid, placed } = hide(['espresso', 'filter', 'cup'], 42);
  assert.deepEqual([grid.length, grid[0].length, placed.length], [14, 14, 3]);
  assert.ok(grid.flat().every((c) => /^[A-Z]$/.test(c)));
  const lines = [...grid.map((r) => r.join('')), ...grid[0].map((_, x) => grid.map((r) => r[x]).join(''))].join(' ');
  const diag = (dy: number) => Array.from({ length: 14 }, (_, y) => Array.from({ length: 14 }, (_, x) => Array.from({ length: 8 }, (_, i) => grid[y + dy * i]?.[x + i] ?? ' ').join('')).join(' ')).join(' ');
  assert.ok([lines, diag(1), diag(-1)].join(' ').includes('ESPRESSO'));
  assert.deepEqual(hide(['espresso', 'filter', 'cup'], 42).grid, grid);

  // The hunt keeps later clues out of the page's plain text.
  const hunt = specOf('hunt')!.page!(specOf('hunt')!.example);
  assert.ok(hunt.includes('What colour is the kettle?') && !hunt.includes('count the stairs') && !hunt.includes('"red"'));

  const { parsePixels, serializePixels } = await import('../src/apps/pixel.def.ts');
  assert.equal(serializePixels(parsePixels('ab.c\n\n.zd.', 16)), 'ab.c\n\n..d');
  assert.equal(appOf('pixel')!.view('ab')[0].svg.match(/<rect/g)!.length, 2);
  // Rooms to scale; people round their tables; events in order.
  const floor = specOf('floor')!.layout!('A: 4 x 2 at 0,0\nB: 2 x 2 at 4,0');
  assert.deepEqual(floor.shapes.map((r) => [r.w, r.h, r.text]), [[144, 72, 'A | 4 × 2'], [72, 72, 'B | 2 × 2']]);
  assert.equal(floor.shapes[1].x - floor.shapes[0].x, 144);
  assert.equal(specOf('seating')!.layout!('T1: a, b, c\nT2: d').shapes.length, 6);
  assert.deepEqual(specOf('timeline')!.layout!('1: a\n2: b').shapes.map((x) => x.k), ['e', 'o', 'j', 'e', 'j', 'o', 'j']);
});

test('diagrams worked on the picture: lists of things, regions, place cards', async () => {
  const { readLines, writeLines, listItems, moveItem, fieldsOf } = await import('../src/lib/lines.ts');
  const { specOf } = await import('../src/lib/diagram.ts');
  const { appOf } = await import('../src/kit/core.ts');
  // A list field holds things with commas between, each a thing of its own on the picture; a field in [..] is one a line can do without.
  const seating = specOf('seating')!.form!;
  assert.deepEqual(fieldsOf(seating, 0).map((f) => [f.name, f.type, !!f.optional]), [['Table', 'text', false], ['Who', 'list', false]]);
  assert.deepEqual(fieldsOf(specOf('org')!.form!, 1).map((f) => !!f.optional), [true, false, true]);
  assert.deepEqual(listItems('Sam, Paul,, Ada'), ['Sam', 'Paul', '', 'Ada']);
  assert.deepEqual(listItems(' '), []);
  // A thing moves from one list to another, or along its own.
  const rows = readLines('T1: a, b, c\nT2: d', seating);
  assert.equal(writeLines(moveItem(rows, 0, 1, 1, 1, 1, Infinity), seating), 'T1: a, c\nT2: d, b');
  assert.equal(writeLines(moveItem(rows, 0, 1, 0, 0, 1, 3), seating), 'T1: b, c, a\nT2: d');
  assert.equal(writeLines(moveItem(rows, 0, 1, 2, 0, 1, 0), seating), 'T1: c, a, b\nT2: d');
  assert.equal(writeLines(moveItem(rows, 1, 1, 0, 0, 1, 0), seating), 'T1: d, a, b, c\nT2:');
  assert.equal(moveItem(rows, 1, 1, 5, 0, 1, 0), rows);
  // Regions: a tap in a lane's band names the lane (and a lane may stand empty); in the circles, the sets round the tap.
  const lanes = specOf('lanes')!;
  const d = lanes.layout!(lanes.example);
  const bands = d.shapes.filter((s) => s.k === 'r' && !s.text);
  assert.equal(bands.length, 4);
  assert.equal(lanes.keyAt!(lanes.example, bands[1].x + 10, bands[1].y + 10), 'Sales');
  assert.equal(lanes.keyAt!(lanes.example, bands[1].x + 10, d.h - 2), undefined);
  assert.deepEqual(lanes.layout!('Sales:\nSales: Calls').shapes.map((s) => s.k), ['r', 't', 'o']);
  assert.deepEqual(lanes.layout!('Sales:').shapes.map((s) => s.k), ['r', 't']);
  const venn = specOf('venn')!;
  const circles = venn.layout!(venn.example).shapes.filter((s) => s.k === 'e');
  const mid = (...cs: typeof circles) => [cs.reduce((a, c) => a + c.x + c.w / 2, 0) / cs.length, cs.reduce((a, c) => a + c.y + c.h / 2, 0) / cs.length] as const;
  assert.equal(venn.keyAt!(venn.example, ...mid(circles[0])), 'Fast');
  // Between two circles, away from the third (their midpoint alone is inside all three).
  const [mx, my] = mid(circles[0], circles[1]);
  const [tx, ty] = mid(circles[2]);
  assert.equal(venn.keyAt!(venn.example, mx + (mx - tx) * 0.4, my + (my - ty) * 0.4), 'Fast & Cheap');
  assert.equal(venn.keyAt!(venn.example, ...mid(...circles)), 'Fast & Cheap & Good');
  assert.equal(venn.keyAt!(venn.example, 1, 1), undefined);
  // Place cards: one per seated person with their name and table, eight to a letter sheet, lines to cut along.
  const { placeCards } = await import('../src/apps/seating.def.ts');
  const cards = placeCards(specOf('seating')!.example);
  assert.deepEqual(cards.map((p) => [p.w, p.h]), [[816, 1056], [816, 1056]]);
  assert.equal(cards[0].svg.match(/stroke-dasharray="6 5"/g)!.length, 8);
  assert.equal(cards[1].svg.match(/stroke-dasharray="6 5"/g)!.length, 7);
  assert.ok(cards[0].svg.includes('>Sam</text>') && cards[0].svg.includes('>Top table</text>') && cards[1].svg.includes('>Leslie</text>'));
  // The name is large and the table small; a picture on a person goes on their card.
  const px = [...cards[0].svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => +m[1]);
  assert.ok(Math.max(...px) > 40 && Math.min(...px) < 30, String(px));
  assert.ok(placeCards('Top: :star Ada')[0].svg.includes('stroke-linecap="round"') && placeCards('Top: :star Ada')[0].svg.includes('>Ada</text>'));
  assert.equal(placeCards('').length, 1);
  assert.ok(appOf('seating')!.downloads!.some((x) => x.ext === 'cards.pdf' && x.pages));
  assert.equal(appOf('seating')!.downloads![0].ext, 'svg');
});

test('lines: every text app can be filled in as a form, and what is saved is the same text', async () => {
  const { readLines, writeLines, fieldsOf, kindsOf } = await import('../src/lib/lines.ts');
  const { specOf } = await import('../src/lib/diagram.ts');
  const { apps } = await import('../src/kit/core.ts');
  let forms = 0;
  for (const def of apps()) {
    const spec = specOf(def.id);
    if (!spec) continue;
    assert.ok(spec.form, `${def.id} has a form`);
    forms++;
    // Its own example, read into rows and written back, is the example to the letter.
    const rows = readLines(spec.example, spec.form);
    assert.equal(writeLines(rows, spec.form), spec.example, def.id);
    // And the form understood it: hardly anything fell through as a line it has no kind for.
    const { kinds } = kindsOf(spec.form);
    const own = rows.filter((r) => r.kind < spec.form!.length).length;
    assert.ok(own >= rows.length * 0.8, `${def.id}: ${own} of ${rows.length} lines have a kind`);
    assert.ok(kinds.every((k) => k.name));
  }
  assert.ok(forms >= 29, String(forms));

  const menu = specOf('menu')!.form!;
  const rows = readLines('# Cafe\n## Coffee\nEspresso|3.00 | Dark\nFlat white | 4.20\nOpen daily', menu);
  assert.deepEqual(rows.map((r) => [menu[r.kind].name, ...r.values]), [['Name', 'Cafe'], ['Section', 'Coffee'], ['Dish', 'Espresso', '3.00', 'Dark'], ['Dish', 'Flat white', '4.20', ''], ['Line', 'Open daily']]);
  assert.deepEqual(fieldsOf(menu, 2).map((f) => f.name), ['Dish', 'Price', 'What it is']);
  // Written tidily; a part with nothing in it is left out; a row with nothing in it is not written at all.
  rows[3].values[2] = 'Smooth';
  rows.push({ kind: 2, values: ['', '', ''], depth: 0 }, { kind: 1, values: ['Tea'], depth: 0 });
  assert.equal(writeLines(rows, menu), '# Cafe\n## Coffee\nEspresso | 3.00 | Dark\nFlat white | 4.20 | Smooth\nOpen daily\n## Tea');
  // Outlines keep their depth; an answer is a line under a question.
  const org = specOf('org')!.form!;
  assert.deepEqual(readLines('- Ada | CEO\n  - :wrench Ben\n    - Cy', org).map((r) => [r.depth, ...r.values]), [[0, '', 'Ada', 'CEO'], [1, 'wrench', 'Ben', ''], [2, '', 'Cy', '']]);
  assert.equal(writeLines([{ kind: 1, values: ['crown', 'Ada', 'CEO'], depth: 0 }, { kind: 1, values: ['', 'Ben', ''], depth: 1 }], org), '- :crown Ada | CEO\n  - Ben');
  const faq: LineKind[] = [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Question', is: '{Question}', at: 0 },
    { name: 'Answer', is: '{Answer:long}', at: 1 },
  ];
  assert.deepEqual(readLines('# Help\nWhy?\n  Because.\n    Deeper', faq).map((r) => kindsOf(faq).kinds[r.kind].name), ['Title', 'Question', 'Answer', 'Line']);
  assert.equal(writeLines(readLines('# Help\nWhy?\n  Because.\n    Deeper', faq), faq), '# Help\nWhy?\n  Because.\n    Deeper');
  // Choices, optional parts, words between fields.
  const notes: LineKind[] = [{ name: 'Coloured note', is: '{Colour:choice=red,orange,green,blue,purple}: [:{Picture:icon} ]{Note}' }, { name: 'Note', is: '[:{Picture:icon} ]{Note}' }];
  assert.deepEqual(readLines('green: Thank them\nCall Sam: today', notes).map((r) => r.values), [['green', '', 'Thank them'], ['', 'Call Sam: today']]);
  assert.deepEqual(readLines('Kitchen: 4 x 3 at 5,0\nHall: 8 x 1.5', specOf('floor')!.form!).map((r) => r.values), [['Kitchen', '4', '3', '5', '0'], ['Hall', '8', '1.5', '', '']]);
  assert.deepEqual(readLines('signup rate = 6% (0 to 30)\nVisitors > Signups = visitors * signup rate', specOf('flow')!.form!).map((r) => r.values), [['signup rate', '6%', '0', '30'], ['Visitors', 'Signups', 'visitors * signup rate']]);
  // A blank line that means something is kept as a row.
  const cards: LineKind[] = [{ name: 'Picture', is: ':{Picture:icon}' }, { name: 'Next card', is: '' }, { name: 'Line', is: '{Text}' }];
  assert.equal(writeLines(readLines('A\nx\n\nB\ny', cards), cards), 'A\nx\n\nB\ny');
});

test('outlines: rows move with what is under them; an org chart has dotted lines', async () => {
  const { readLines, writeLines, moveBlock, shiftBlock, removeRow, depths } = await import('../src/lib/lines.ts');
  const { specOf } = await import('../src/lib/diagram.ts');
  const org = specOf('org')!.form!;
  const text = '- Ada\n  - Ben\n    - Cy\n  - Eve\n- Flo';
  const rows = readLines(text, org);
  const after = (r: ReturnType<typeof readLines> | null) => (r ? writeLines(r, org) : null);
  // Ben goes below Eve, and takes Cy along.
  assert.equal(after(moveBlock(rows, org, 1, 1)![0]), '- Ada\n  - Eve\n  - Ben\n    - Cy\n- Flo');
  assert.equal(moveBlock(rows, org, 1, 1)![1], 2);
  assert.equal(after(moveBlock(rows, org, 4, -1)![0]), '- Flo\n- Ada\n  - Ben\n    - Cy\n  - Eve');
  assert.equal(moveBlock(rows, org, 0, -1), null);
  // Indenting takes the rows beneath along; a row goes at most one deeper than the one above.
  assert.equal(after(shiftBlock(rows, org, 1, -1)), '- Ada\n- Ben\n  - Cy\n  - Eve\n- Flo');
  assert.equal(after(shiftBlock(rows, org, 3, 1)), '- Ada\n  - Ben\n    - Cy\n    - Eve\n- Flo');
  assert.equal(shiftBlock(rows, org, 2, 1), null);
  assert.equal(shiftBlock(rows, org, 0, 1), null);
  // Take Ben away and Cy reports to Ada.
  assert.equal(after(removeRow(rows, org, 1)), '- Ada\n  - Cy\n  - Eve\n- Flo');
  // A section and its items are an outline too, though the text does not indent them.
  const menu = specOf('menu')!.form!;
  const m = readLines('# Cafe\n## Coffee\nEspresso | 3\nFilter | 3\n## Food\nBun | 4', menu);
  assert.deepEqual(depths(m, menu), [0, 0, 1, 1, 0, 1]);
  assert.equal(writeLines(moveBlock(m, menu, 1, 1)![0], menu), '# Cafe\n## Food\nBun | 4\n## Coffee\nEspresso | 3\nFilter | 3');
  // An item at the end of its section steps into the next one.
  assert.equal(writeLines(moveBlock(m, menu, 3, 1)![0], menu), '# Cafe\n## Coffee\nEspresso | 3\n## Food\nFilter | 3\nBun | 4');

  // Dotted lines: between two people, by name, whatever their role or picture.
  const chart = specOf('org')!.layout!('- Ada | CEO\n  - :wrench Ben | Eng\n  - Eve\n\n~ ben -- Eve: advises\n~ Ben -- Nobody');
  assert.deepEqual(chart.shapes.map((s) => s.k), ['o', 'o', 'j', 'o', 'j', 'j']);
  const dotted = chart.shapes[5];
  assert.deepEqual([dotted.x, dotted.y, dotted.f, dotted.text], [1, 3, 2, 'advises']);
  assert.equal(chart.shapes.filter((s) => s.k === 'j' && s.f === 2).length, 1);
  const { shapeSvg } = await import('../src/apps/draw.def.ts');
  assert.ok(shapeSvg(dotted, chart.shapes).includes('stroke-dasharray="2 3"'));
  assert.deepEqual(readLines('~ Ben -- Eve: advises', org).map((r) => [org[r.kind].name, ...r.values]), [['Dotted line', 'Ben', 'Eve', 'advises']]);
});

test('a QR code of a link reads back as the link', async () => {
  const { qrCode, qrSvg, QR_MAX_BYTES } = await import('../src/lib/qr.ts');
  const small = qrCode(new TextEncoder().encode('https://tinylittleoffice.com/'));
  assert.equal(small.length, 25);
  // The finder patterns are where they should be, and the dark module too.
  assert.ok(small[0][0] && small[0][6] && small[6][0] && !small[1][1] && small[3][3] && small[0][18] && small[18][0] && small[17][8]);
  assert.equal(qrCode(new Uint8Array(2953)).length, 177);
  assert.throws(() => qrCode(new Uint8Array(QR_MAX_BYTES + 1)));
  assert.ok(qrSvg(new TextEncoder().encode('x')).startsWith('<svg'));
});

test('slides take bold, italic and the rest, like a text does', async () => {
  const { parseDeck } = await import('../src/lib/deckmodel.ts');
  const { slidePage, deckToPptx } = await import('../src/apps/deck.def.ts');
  const { toggleMark, parseInline } = await import('../src/lib/richtext.ts');
  const [s] = parseDeck('A *big* _day_\nShip ^it^ and ~rest~');
  const svg = slidePage(s, Infinity, undefined, '').svg;
  assert.ok(svg.includes('>big<') && !svg.includes('*big*'), 'marks are drawn, not shown');
  assert.ok(/font-weight="700"[^>]*>big</.test(svg) || /<tspan[^>]*font-weight[^>]*>big/.test(svg), 'bold is bold');
  assert.ok(/font-style="italic"[^>]*>day</.test(svg) || /<tspan[^>]*italic[^>]*>day/.test(svg), 'italic is italic');
  assert.equal(appOf('deck')!.title('A *big* _day_\nx'), 'A big day');
  // PowerPoint keeps them as runs.
  const { unzipSync, strFromU8 } = await import('fflate');
  const files = unzipSync(deckToPptx('A *big* day\nShip ^it^', { created: null, png: {} } as never));
  const slide = strFromU8(files['ppt/slides/slide1.xml']);
  assert.ok(slide.includes('b="1"') && slide.includes('<a:t>big</a:t>') && slide.includes('u="sng"'));
  // The toggle: on, and off again, round a word.
  assert.deepEqual(toggleMark('Ship it', 0, 4, '*'), { line: '*Ship* it', from: 1, to: 5 });
  assert.deepEqual(toggleMark('*Ship* it', 1, 5, '*'), { line: 'Ship it', from: 0, to: 4 });
  assert.deepEqual(toggleMark('*Ship* it', 0, 6, '*'), { line: 'Ship it', from: 0, to: 4 });
  assert.deepEqual(parseInline('a *b* c').map((r) => [r.t, !!r.b]), [['a ', false], ['b', true], [' c', false]]);
});

test('a motion slide, held still, is at its end', async () => {
  const { animPage } = await import('../src/apps/anim.def.ts');
  const anim = parseAnim('!9\ni,8,36,8,8,0b,rocket\n@0\t0,0,0,0,a,0;8,5k,-5k,0,a,0');
  // On its own it starts at the start and loops; on a slide it plays once and rests at the end.
  assert.ok(animPage(anim).svg.includes('<g transform="translate(96 320)">'));
  const once = animPage(anim, true).svg;
  assert.ok(once.includes('<g transform="translate(296 120)">') && once.includes('fill="freeze"'));
});

test('slides: bullets nest', async () => {
  const { parseDeck, serializeDeck } = await import('../src/lib/deckmodel.ts');
  const { slidePage, layoutSlide, depthOf, deckToPptx } = await import('../src/apps/deck.def.ts');
  const text = 'Plan\nShip\n  Beta first\n    Then everyone\nRest';
  assert.deepEqual(parseDeck(text)[0].bullets.map(depthOf), [0, 1, 2, 0]);
  assert.equal(serializeDeck(parseDeck(text)), text);
  const L = layoutSlide(parseDeck(text)[0]);
  assert.deepEqual(L.cols[0].depths, [0, 1, 2, 0]);
  const svg = slidePage(parseDeck(text)[0], Infinity, undefined, '').svg;
  // Deeper bullets sit further right, with hollow dots.
  const xs = [...svg.matchAll(/<text x="([\d.]+)"[^>]*>(Ship|Beta first|Then everyone|Rest)</g)].map((m) => +m[1]);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2] && xs[3] === xs[0], xs.join(','));
  assert.equal(svg.match(/<circle [^>]*fill="none"/g)!.length, 2);
  const { unzipSync, strFromU8 } = await import('fflate');
  const slide = strFromU8(unzipSync(deckToPptx(text, { created: null, png: {} } as never))['ppt/slides/slide1.xml']);
  assert.ok(slide.includes('lvl="1"') && slide.includes('lvl="2"') && slide.includes('<a:t>Beta first</a:t>'));
});

test('a QR code document: a link as a code, labelled with what it is of', async () => {
  const { qrLabel } = await import('../src/apps/qr.def.ts');
  const { makeRef } = await import('../src/kit/embed.ts');
  const link = 'https://tinylittleoffice.com/#/v0/' + makeRef('todo', '- Buy milk', 'Shopping');
  assert.equal(qrLabel(link), 'Shopping');
  assert.equal(qrLabel('https://example.com/some/path'), 'example.com');
  assert.equal(qrLabel('Hello there'), 'Hello there');
  const page = appOf('qr')!.view(link)[0];
  assert.ok(page.svg.includes('<path d="M') && page.svg.includes('>Shopping</text>'));
  assert.ok(appOf('qr')!.view('')[0].svg.includes('Paste a link'));
  assert.ok(appOf('qr')!.view('x'.repeat(3000))[0].svg.includes('Too long'));
  // It can go on a slide.
  const { parseDeck } = await import('../src/lib/deckmodel.ts');
  const { slidePage } = await import('../src/apps/deck.def.ts');
  const slide = slidePage(parseDeck('Scan this\n@@' + makeRef('qr', link))[0], Infinity, undefined, '').svg;
  assert.ok(slide.includes('shape-rendering="crispEdges"'));
});

test('rich text: highlight, icons in the line, and alignment, in text and in pictures', async () => {
  const { parseDoc, serializeDoc, parseInline } = await import('../src/lib/richtext.ts');
  const { text } = await import('../src/kit/core.ts');
  const body = '>c # A =big= day\nShip :rocket: it\n>r - right\nTime 10:30: fine';
  const blocks = parseDoc(body);
  assert.equal(blocks[0].a, 'c');
  assert.deepEqual(blocks[0].runs.map((r) => [r.t, !!r.h]), [['A ', false], ['big', true], [' day', false]]);
  assert.deepEqual(blocks[1].runs.map((r) => [r.t, r.ic ?? '']), [['Ship ', ''], ['', 'rocket'], [' it', '']]);
  assert.equal(blocks[2].a, 'r');
  assert.equal(blocks[2].k, 'ul');
  // A colon with words round it is not an icon.
  assert.deepEqual(blocks[3].runs.map((r) => r.t), ['Time 10:30: fine']);
  assert.equal(serializeDoc(blocks), body);
  // Words that would read as marks are escaped on the way out, and come back whole.
  assert.equal(parseDoc(serializeDoc([{ k: 'p', runs: [{ t: 'a=b and :not: an icon' }] }]))[0].runs[0].t, 'a=b and :not: an icon');
  // Drawn: a yellow box behind the highlight, a glyph for the icon.
  const svg = text(10, 20, parseInline('=hot= :rocket: x'), { px: 16 });
  assert.ok(svg.includes('fill="#fef08a"') && svg.includes('stroke-linecap="round"') && svg.includes('<tspan dx='));
  const { slidePage } = await import('../src/apps/deck.def.ts');
  const { parseDeck } = await import('../src/lib/deckmodel.ts');
  assert.ok(slidePage(parseDeck('Go :rocket:\n=now=')[0], Infinity, undefined, '').svg.includes('#fef08a'));
  assert.ok(appOf('write')!.html!('>c Hello =there= :star:', { created: null }).includes('text-align:center') && appOf('write')!.html!('=x=', { created: null }).includes('<mark>'));
});

test('a deck ends with a QR code of itself', async () => {
  const { closingSlide, slidesWith, deckToPptx } = await import('../src/apps/deck.def.ts');
  const body = ':rocket:t\nLaunch plan\nSpring\n\nGoals\nShip it';
  const end = closingSlide(body)!;
  assert.ok(end.sub?.startsWith('qr/'));
  assert.equal(slidesWith(body).length, 3);
  // The last page is the code, labelled with the deck's title.
  const pages = appOf('deck')!.view(body);
  assert.equal(pages.length, 3);
  assert.ok(pages[2].svg.includes('shape-rendering="crispEdges"') && pages[2].svg.includes('>Launch plan</text>'));
  // An empty deck, or one too long for a code, ends as written.
  assert.equal(closingSlide(''), null);
  assert.equal(closingSlide(Array.from({ length: 300 }, (_, i) => `Slide ${i}\nwords ${i * 7919} that will not pack`).join('\n\n')), null);
  // PowerPoint gets the slide too, as a picture.
  const { unzipSync } = await import('fflate');
  const files = unzipSync(deckToPptx(body, { created: null, png: { 'sub-3': new Uint8Array([137, 80, 78, 71]) } } as never));
  assert.ok(files['ppt/slides/slide3.xml'] && files['ppt/media/sub-3.png']);
});

test('markdown, both ways, for every app', async () => {
  const { specOf } = await import('../src/lib/diagram.ts');
  const { apps } = await import('../src/kit/core.ts');
  const samples: Record<string, string> = {
    sheet: 'Item\tCost\nRent\t1200\nFood\t600',
    outline: '- Launch\n  - Product\n    - Pricing\n  - Marketing',
    write: '# Memo\nSome *bold* and _slant_ text with =shine= and :star:\n- one\n-- nested\n+ first',
    deck: ':rocket:t\nSpring launch\nWhat ships\n\n::2\nAgenda\none\n  under one\n|\ntwo',
    draw: 'r,2,1,12,6,1b3,Box\no,20,2,10,6,0,Ball',
    cal: 'd2,2.g,Offsite\ndb,1,Launch',
    todo: '- Book flights\nx!@1jk Renew passport\n- Pack',
    board: '#To do|2\nx\ny\n#Done\nz',
    gantt: '1jk,5,1e,Design\n>1jk,2,2s,Sketch',
    trip: '3xa8g,-fuyo,Lisbon\tnote here\n3zkdp,-ep8q,Coimbra',
    anim: '!o\nt,4,20,20,4,04,Lift off\ni,8,36,8,8,0b,rocket\n@0\t0,0,0,0,a,0;n,0,-2s,0,a,0,i\n@1\t0,0,0,0,a,0;n,5k,-5k,2s,a,-u,d',
    pixel: 'ab.c\n.dd',
    zine: ':coffee\nSmall Joys\nIssue one\n\nCoffee\nThe first cup.',
    booklet: 'A book\nby me\n\nOne\nwords',
    calc: '!mortgage\nprice = 300000\nrate = 5',
    poster: ':music\nOpen mic night\nFriday 12 March, 8pm',
    badges: 'Ada Lovelace\nEngineering\n\nGrace Hopper\nCompilers',
    recipes: ':cookie\nCardamom buns\n500g flour\n\nCold brew\n100g coffee',
    brochure: 'Visit\n\nWhy\nbecause',
    comic: 'Biscuit\n\n \n:dog Walk? | Monday',
    qr: 'https://tinylittleoffice.com/',
  };
  for (const def of apps()) {
    const body = samples[def.id] ?? specOf(def.id)?.example ?? '';
    const md = toMarkdown(def, body);
    assert.ok(md.length > 0 && !/undefined|NaN/.test(md), `${def.id} exports`);
    const back = fromMarkdown(def, md);
    assert.equal(typeof back, 'string', `${def.id} imports`);
    // What comes back still draws, and keeps most of its words.
    assert.ok(def.view(back).length >= 1, `${def.id} draws after the round trip`);
    const words = (t: string) => new Set(t.toLowerCase().match(/[a-z]{3,}/g) ?? []);
    const [before, after] = [words(def.outline(body).join(' ')), words(def.outline(back).join(' '))];
    const kept = [...before].filter((w) => after.has(w)).length;
    assert.ok(before.size === 0 || kept / before.size >= 0.6, `${def.id}: ${kept} of ${before.size} words survive the round trip\n${md}\n--\n${back}`);
  }
  // The shapes to expect.
  assert.ok(toMarkdown(appOf('sheet')!, samples.sheet).includes('| Item | Cost |') && toMarkdown(appOf('sheet')!, samples.sheet).includes('| Rent | 1200 |'));
  assert.equal(toMarkdown(appOf('todo')!, samples.todo), '- [ ] Book flights\n- [x] **Renew passport** (due 2025-06-23)\n- [ ] Pack\n');
  assert.equal(toMarkdown(appOf('write')!, samples.write), '# Memo\n\nSome **bold** and *slant* text with ==shine== and :star:\n\n- one\n  - nested\n1. first\n');
  assert.ok(toMarkdown(appOf('deck')!, samples.deck).startsWith('## Spring launch :rocket:\n\n- What ships\n\n## Agenda\n\n- one\n  - under one\n- two'));
  assert.ok(toMarkdown(appOf('menu')!, specOf('menu')!.example).includes('| Dish | Price | What it is |'));
  // And back: a Markdown list is a to-do list; a Markdown table is a sheet; headings are slides.
  assert.equal(fromMarkdown(appOf('todo')!, '- [x] Done\n- [ ] Not yet'), 'x Done\n- Not yet');
  assert.equal(fromMarkdown(appOf('sheet')!, '| A | B |\n|---|---|\n| 1 | 2 |'), 'A\tB\n1\t2');
  assert.equal(fromMarkdown(appOf('deck')!, '# My deck\n\nA line\n\n## Second\n\n- a\n  - b'), '::t\nMy deck\nA line\n\nSecond\na\n  b');
  assert.equal(fromMarkdown(appOf('write')!, '# Hi\n\nSome **bold** text.\n\n- a\n  - b\n1. c'), '# Hi\nSome *bold* text.\n- a\n-- b\n+ c');
  assert.equal(fromMarkdown(appOf('menu')!, '# Cafe\n\n## Coffee\n\n| Dish | Price | What it is |\n|---|---|---|\n| Flat white | 4.20 | Smooth |'), '# Cafe\n## Coffee\nFlat white | 4.20 | Smooth');
  assert.equal(fromMarkdown(appOf('board')!, '## Doing (limit 2)\n\n- x\n- y'), serializeBoardLike('#Doing|2\nx\ny'));
});
const serializeBoardLike = (s: string) => s;

test('CSV imports as a table into any app that takes one', () => {
  assert.deepEqual(parseCsv('a,"b, c",d\n1,"say ""hi""",3\r\n'), [['a', 'b, c', 'd'], ['1', 'say "hi"', '3']]);
  assert.ok(looksLikeCsv('Item,Cost\nRent,1200\nFood,600'));
  assert.ok(looksLikeCsv('Item\tCost\nRent\t1200'));
  assert.ok(!looksLikeCsv('# Heading\n- a, b\n- c, d'));
  assert.ok(!looksLikeCsv('just one line, with commas'));
  assert.equal(fromMarkdown(appOf('sheet')!, 'Item,Cost\nRent,"1,200"\nFood,600'), 'Item\tCost\nRent\t1,200\nFood\t600');
  assert.equal(fromMarkdown(appOf('menu')!, 'Dish,Price,What it is\nFlat white,4.20,Smooth'), 'Flat white | 4.20 | Smooth');
  assert.equal(fromMarkdown(appOf('gantt')!, 'Task,Start,Days,Done\nDesign,2026-10-06,5,20%'), fromMarkdown(appOf('gantt')!, '| Task | Start | Days | Done |\n|---|---|---|---|\n| Design | 2026-10-06 | 5 | 20% |'));
  assert.ok(appOf('gantt')!.outline(fromMarkdown(appOf('gantt')!, 'Task,Start,Days,Done\nDesign,2026-10-06,5,20%')).join(' ').includes('Design'));
});

test('deck: a chart written plainly on a slide, speaker notes, and marks left alone inside a web address', async () => {
  const { readDeck } = await import('../src/apps/deck.def.ts');
  const { parseDeck, serializeDeck } = await import('../src/lib/deckmodel.ts');
  const { parseInline } = await import('../src/lib/richtext.ts');
  const plain = ':rocket:t\nResults\nTwo trials\n\nTrial results\n!bar|tnn\nTrial\tDrug %\tControl %\nMAPP1\t67\t32\n> Pause here';
  const body = readDeck(plain);
  const slides = parseDeck(body);
  assert.ok(slides[1].sub?.startsWith('sheet/'), body);
  assert.deepEqual(slides[1].notes, ['Pause here']);
  assert.deepEqual(slides[1].bullets, []);
  assert.equal(readDeck(body), body);
  assert.equal(serializeDeck(parseDeck(serializeDeck(slides))), serializeDeck(slides));
  // The slide's picture carries the chart, and none of the note.
  const page = appOf('deck')!.view(body)[1];
  assert.ok(page.svg.includes('MAPP1') && !page.svg.includes('Pause here'));
  assert.deepEqual(parseInline('See https://x.com/#title=a&doc=b_c now'), [{ t: 'See https://x.com/#title=a&doc=b_c now' }]);
});

test('icons are searched by tag and browsed by kind, once the library is in', async () => {
  const { addIconNames, iconCategories, iconsIn, searchIcons } = await import('../src/lib/iconsearch.ts');
  const { META, CATEGORIES } = await import('../src/lib/icon-meta.ts');
  const { LIBRARY } = await import('../src/lib/icons.ts');
  assert.ok(Object.keys(META).length > 1500 && Object.keys(CATEGORIES).length > 30);
  addIconNames(Object.keys(META).filter((n) => !(n in LIBRARY)), META, CATEGORIES);
  // Lucide's own tags: "ai" finds brain; "weather" finds clouds; a category holds its icons.
  assert.ok(searchIcons('ai').includes('brain'));
  assert.ok(searchIcons('weather').some((n) => n.startsWith('cloud')));
  const cats = iconCategories();
  assert.ok(cats.some((c) => c.name === 'Weather' && c.count > 10));
  assert.ok(iconsIn('weather').includes('cloud-rain'));
});

test('outline: a tree of lines, moved about, and OPML out', async () => {
  const { parseOutline, serializeOutline, shift, move, place, remove, toOpml, hasChildren } = await import('../src/lib/outlinemodel.ts');
  const { specOf } = await import('../src/lib/diagram.ts');
  const items = parseOutline('- Launch\n  - Product\n    - Pricing\n  - Marketing\n- Done');
  assert.deepEqual(items.map((i) => i.depth), [0, 1, 2, 1, 0]);
  assert.equal(serializeOutline(items), '- Launch\n  - Product\n    - Pricing\n  - Marketing\n- Done');
  // Other bullets and indents read; a jump of two levels is forgiven to one.
  assert.equal(serializeOutline(parseOutline('* a\n    * b\n        * c\n            * d')), '- a\n  - b\n    - c\n      - d');
  assert.equal(serializeOutline(parseOutline('a\n      far')), '- a\n  - far');
  assert.ok(hasChildren(items, 0) && !hasChildren(items, 2));
  assert.equal(serializeOutline(shift(items, 3, 1)!), '- Launch\n  - Product\n    - Pricing\n    - Marketing\n- Done');
  assert.equal(shift(items, 1, 1), null);
  assert.equal(serializeOutline(move(items, 1, 1)![0]), '- Launch\n  - Marketing\n  - Product\n    - Pricing\n- Done');
  assert.equal(serializeOutline(place(items, 4, 1, 'under')!), '- Launch\n  - Product\n    - Pricing\n    - Done\n  - Marketing');
  assert.equal(serializeOutline(remove(items, 1)), '- Launch\n  - Pricing\n  - Marketing\n- Done');
  const opml = toOpml(items, 'Plan');
  assert.ok(opml.includes('<outline text="Product">') && opml.includes('<outline text="Pricing"/>') && (opml.match(/<\/outline>/g) ?? []).length === 2);
  // Drawn, and understood by the mind map and org chart as they are.
  assert.ok(appOf('outline')!.view('- Launch\n  - Product').at(0)!.svg.includes('>Product</text>'));
  assert.equal(specOf('mind')!.layout!('- Launch\n  - Product\n  - Marketing').shapes.filter((s) => s.text).length, 3);
  // Its Markdown is its text; Markdown comes in through its reader.
  assert.equal(toMarkdown(appOf('outline')!, '- Launch\n  - *Product*\n    - Pricing'), '- Launch\n  - *Product*\n    - Pricing\n');
  assert.equal(fromMarkdown(appOf('outline')!, '# Plan\n\n- a\n  - b\n\n## Later\n- c'), '- Plan\n  - a\n    - b\n  - Later\n    - c');
  for (const id of ['mind', 'org', 'family']) assert.equal(fromMarkdown(appOf(id)!, toMarkdown(appOf(id)!, specOf(id)!.example)), specOf(id)!.example, id);
  assert.equal(appOf('org')!.read!('Ada\n  Ben\n~ Ben -> Ada: helps'), '- Ada\n  - Ben\n\n~ Ben -- Ada: helps');
});

test('outline: a deck for every level, and documents as items', async () => {
  const { parseOutline, serializeOutline } = await import('../src/lib/outlinemodel.ts');
  const { outlineAs } = await import('../src/apps/outline.def.ts');
  const { decodeEnvelope } = await import('../src/lib/envelope.ts');
  // An item that is a document: a fence, with its depth.
  const doc = '- Plan\n\n```todo {depth=1}\n- [ ] Buy milk\n```';
  const items = parseOutline(doc);
  assert.deepEqual(items[1], { depth: 1, text: '', doc: 'todo\n- [ ] Buy milk' });
  assert.equal(serializeOutline(items), doc);
  // The page draws it, small.
  assert.ok(appOf('outline')!.view(doc)[0].svg.includes('Buy milk'));
  assert.deepEqual(appOf('outline')!.outline(doc), ['Plan']);
  // Seen as another app: the plain list, or the org chart with its joins as dotted lines.
  const as = (app: string, body: string) => {
    const m = /#\/v\d+\/([a-z]+)\/(.*)$/.exec(outlineAs(app, body))!;
    return [m[1], decodeEnvelope(m[2], m[1]).body];
  };
  assert.deepEqual(as('mind', doc + '\n- Next {.to}'), ['mind', '- Plan\n- Next']);
  assert.deepEqual(as('org', '- A\n  - B\n\n~ A -> B: helps'), ['org', '- A\n  - B\n\n~ A -- B: helps']);
  assert.deepEqual(as('net', '- A\n  - B {.from}'), ['net', '~ A -> B']);
});

test('a short link carries its key in the fragment; the server would hold only ciphertext', async () => {
  const { shorten, unshorten } = await import('../src/lib/short.ts');
  // A stand-in for tinier: remembers what it was posted, as the real one does.
  let posted: { c: string; iv: string; ttl: number } | null = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    posted = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ id: 'abc2345', exp: Date.now() + posted!.ttl * 1000 }), { status: 201 });
  }) as typeof fetch;
  try {
    const long = 'https://tinylittleoffice.com/sheet/#/v0/sheet/WAbcdef';
    const { short } = await shorten(long, 86400, 'https://tinier.example/');
    assert.match(short, /^https:\/\/tinier\.example\/abc2345#[A-Za-z0-9_-]{22}$/);
    assert.ok(posted && !JSON.stringify(posted).includes('WAbcdef') && posted.ttl === 86400);
    assert.equal(await unshorten(posted!.c, posted!.iv, short.split('#')[1]), long);
    await assert.rejects(unshorten(posted!.c, posted!.iv, 'AAAAAAAAAAAAAAAAAAAAAA'));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('calculator: expressions, money modes, and the page they draw', async () => {
  const { evaluate, shown, mortgage, invest, cashflow, interest, withDefaults, parseCalc, serializeCalc, plot } = await import('../src/lib/calc.ts');
  assert.equal(evaluate('2+3*4'), 14);
  assert.equal(evaluate('(2+3)*4'), 20);
  assert.equal(evaluate('2^3^2'), 512);
  assert.equal(evaluate('sqrt(16)+5!'), 124);
  assert.equal(evaluate('2x', 3), 6);
  assert.equal(evaluate('10%'), 0.1);
  assert.ok(isNaN(evaluate('2+')) && isNaN(evaluate('alert(1)')) && isNaN(evaluate('foo')));
  assert.equal(shown(1 / 3), '0.3333333333');
  assert.equal(shown(-2), '−2');
  const m = mortgage(withDefaults('mortgage', { price: 400000, deposit: 80000, rate: 6.5, years: 30 }));
  assert.equal(m.monthly.toFixed(2), '2022.62');
  assert.equal(m.years.length, 30);
  assert.ok(m.years[29].owed < 1);
  const i = invest(withDefaults('invest', { start: 0, monthly: 100, return: 0, years: 1 }));
  assert.equal(i.final, 1200);
  const c = cashflow(withDefaults('cashflow', {}));
  assert.equal(c.npv.toFixed(0), '23814');
  assert.equal((c.irr * 100).toFixed(1), '18.0');
  assert.equal(c.payback.toFixed(1), '2.6');
  const r = interest(withDefaults('interest', { principal: 1000, rate: 10, years: 1, times: 1 }));
  assert.equal(r.compound, 100);
  assert.equal(r.simple, 100);
  const doc = parseCalc('!mortgage\nprice = 250,000\nrate = 5');
  assert.equal(doc.mode, 'mortgage');
  assert.equal(serializeCalc(doc), '!mortgage\nprice = 250,000\nrate = 5');
  assert.equal(serializeCalc(parseCalc('')), '');
  assert.equal(plot('x^2', -1, 1, 2).map((p) => p && p[1]).join(','), '1,0,1');
  const page = appOf('calc')!.view('!mortgage\nprice = 400000\ndeposit = 80000\nrate = 6.5\nyears = 30')[0];
  // Every year of the schedule is on the page, which grows to hold it.
  assert.ok(page.svg.includes('2,022.62') && page.svg.includes('Year 14') && page.svg.includes('Year 30') && !page.svg.includes('more'));
  assert.ok(appOf('calc')!.view('!graph\nsin(x)\nx^2/10')[0].svg.includes('y = sin(x)'));
  assert.ok(appOf('calc')!.view('2+2\n7*6')[0].svg.includes('>42<'));
  assert.deepEqual(appOf('calc')!.outline('2+2'), ['2+2 = 4']);
});

test('pen shapes: any corners, kept as hundredths of the box; Motion morphs them between keys', async () => {
  const { parseDrawing, serializeDrawing } = await import('../src/lib/drawmodel.ts');
  const { shapeSvg } = await import('../src/apps/draw.def.ts');
  const { parseAnim, serializeAnim, stateAt, withKey } = await import('../src/lib/animmodel.ts');
  const { frameSvg } = await import('../src/apps/anim.def.ts');
  const line = 'v,2,1,12,6,1b,0:0;100:50;0:100,Wedge';
  const [s] = parseDrawing(line);
  assert.deepEqual(s.pts, [0, 0, 100, 50, 0, 100]);
  assert.equal(serializeDrawing([s]), line);
  assert.ok(shapeSvg(s).includes('<polygon points="16,8 112,32 16,56"'));
  // A key with corners: morphed halfway to the next.
  let anim = parseAnim('!o\n' + line);
  anim = withKey(anim, 0, { t: 0, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '', pts: [0, 0, 100, 50, 0, 100] });
  anim = withKey(anim, 0, { t: 10, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '', pts: [0, 0, 100, 0, 100, 100] });
  assert.deepEqual(stateAt(anim, 0, 5).pts, [0, 0, 100, 25, 50, 100]);
  const text = serializeAnim(anim);
  assert.ok(text.includes(',p0:0/100:50/0:100'), text);
  assert.deepEqual(parseAnim(text).keys[0][1].pts, [0, 0, 100, 0, 100, 100]);
  assert.ok(frameSvg(parseAnim(text), 10).includes('points="16,8 112,8 112,56"'));
});
