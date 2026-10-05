import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTodos, serializeTodos } from '../src/lib/todomodel.ts';
import { emptyBoard, parseBoard, serializeBoard } from '../src/lib/boardmodel.ts';
import { ganttRange, parseGantt, serializeGantt } from '../src/lib/ganttmodel.ts';
import { distanceKm, formatKm, parseTrip, routeKm, serializeTrip } from '../src/lib/tripmodel.ts';
import { parseAnim, serializeAnim, stateAt, withKey } from '../src/lib/animmodel.ts';
import { parseDrawing, serializeDrawing, paint } from '../src/lib/drawmodel.ts';
import { TARGETS, blueskyCost, roomFor } from '../src/lib/limits.ts';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { animToSvg } from '../src/apps/anim.def.ts';
import { boardToCsv, boardToMarkdown } from '../src/apps/board.def.ts';
import { ganttToCsv } from '../src/apps/gantt.def.ts';
import { todosToMarkdown } from '../src/apps/todo.def.ts';
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
  assert.equal(todosToMarkdown(s), '- [ ] Buy milk\n- [x] **x marks - the spot** (due 2025-06-23)\n- [ ] ****\n');
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
  assert.ok(boardToMarkdown(s).includes('## Doing (limit 2)'));
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
  const anim = {
    frames: 9,
    items: [
      { kind: 'i' as const, value: 'rocket', keys: [{ t: 0, x: 80, y: 320, s: 1 }, { t: 8, x: 560, y: 80, s: 2.5 }] },
      { kind: 't' as const, value: 'Lift off, now', keys: [{ t: 4, x: 320, y: 200, s: 1 }] },
    ],
  };
  const s = serializeAnim(anim);
  assert.equal(s, '9\nirocket\t0,a,14,a;8,1y,a,p\ntLift off, now\t4,14,p,a');
  assert.deepEqual(parseAnim(s), anim);
  assert.deepEqual(stateAt(anim.items[0], 4), { t: 4, x: 320, y: 200, s: 1.75 });
  assert.deepEqual(stateAt(anim.items[1], 0), { t: 0, x: 320, y: 200, s: 1 });
  assert.equal(withKey(anim.items[0], { t: 8, x: 0, y: 0, s: 1 }).keys.length, 2);
  assert.equal(withKey(anim.items[0], { t: 3, x: 0, y: 0, s: 1 }).keys[1].t, 3);
  const svg = animToSvg(s);
  assert.ok(svg.includes('type="translate" values="80 320;560 80" keyTimes="0;1" dur="2.00s" repeatCount="indefinite"'));
  assert.ok(svg.includes('type="scale" values="1;2.5"'));
  assert.ok(svg.includes('<path d="M4.5 16.5'));
  assert.ok(svg.includes('<g transform="translate(320 200) scale(1)"><text'));
});

test('drawing colours and text sizes', () => {
  const s = 'r,1,1,4,4,1b3,Blue box\nt,0,0,4,2,04,Big\ne,0,0,2,2,2\na,0,0,2,2,0r';
  const shapes = parseDrawing(s);
  assert.deepEqual(shapes.map((x) => [x.f, x.c, x.z]), [[1, 'b', 3], [0, undefined, 4], [2, undefined, undefined], [0, 'r', undefined]]);
  assert.equal(serializeDrawing(shapes), s);
  const p = paint(shapes[0], '#000', '#fff', '#eee');
  assert.deepEqual([p.stroke, p.fill, p.fillOpacity, p.text, p.px], ['#2563eb', '#2563eb', 0.16, '#2563eb', 20]);
  assert.deepEqual(paint(shapes[2], '#000', '#fff', '#eee').text, '#fff');
  assert.equal(paint(shapes[3], '#000', '#fff', '#eee').marker, 'arrow-r');
});

test('room for a link, service by service', () => {
  const long = 'https://tinyoffice.exe.xyz/#/v1/sheet/' + 'A'.repeat(400);
  assert.equal(blueskyCost(long), 'tinyoffice.exe.xyz'.length + 16);
  assert.equal(blueskyCost('https://a.io/'), 4);
  const rooms = Object.fromEntries(roomFor(long).map((r) => [r.target.id, r.left]));
  assert.equal(rooms.link, 2048 - long.length);
  assert.equal(rooms.bluesky, 300 - 34);
  assert.equal(rooms.mastodon, 477);
  assert.equal(rooms.x, 257);
  assert.ok(rooms.sms < 0);
  assert.equal(rooms.discord, 2000 - long.length);
  assert.equal(new Set(TARGETS.map((t) => t.id)).size, TARGETS.length);
});

test('embedding one document in another', async () => {
  const { linkToRef, makeRef, refPage, refSteps, resolve } = await import('../src/kit/embed.ts');
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const { parseDoc, serializeDoc } = await import('../src/lib/richtext.ts');
  const { docToHtml, docToRtf } = await import('../src/apps/write.def.ts');
  const deck = encodeEnvelope({ created: null, body: '::t\nSpring launch\nWhat ships\n\nAgenda\none' });
  const drawing = makeRef('draw', 'r,2,1,12,6,1,Box\ne,20,1,6,6,0');

  // Any TinyOffice link, from any host or version, with or without a download extension.
  assert.equal(linkToRef(` https://tinyoffice.exe.xyz/deck/#/v2/deck/${deck}\n`), `deck/${deck}`);
  assert.equal(linkToRef(`http://localhost:4173/#/deck.pptx/${deck}`), `deck/${deck}`);
  assert.equal(linkToRef(`see https://tinyoffice.exe.xyz/#/v2/deck/${deck}`), null);
  assert.equal(linkToRef('https://example.com/#/v2/nope/abc'), null);
  assert.equal(linkToRef('https://example.com/'), null);

  const d = resolve(`deck/${deck}`);
  assert.deepEqual([d.def!.name, d.title, d.locked, d.hash], ['Deck', 'Spring launch', false, `#/v2/deck/${deck}`]);
  assert.ok(refPage(drawing).svg.includes('>Box</text>'));
  assert.deepEqual(refSteps(drawing), { steps: 2, auto: false });
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
  const ctx = { created: null, base: 'https://tinyoffice.exe.xyz/' };
  const html = docToHtml(`# Plan\n@@deck/${deck}\n@@${drawing}`, ctx);
  assert.ok(html.includes(`<a href="https://tinyoffice.exe.xyz/#/v2/deck/${deck}">Spring launch</a> <small>Deck</small>`));
  assert.ok(html.includes('>Spring launch</text>') && html.includes('>Box</text>'));
  const rtf = docToRtf(`@@deck/${deck}`, ctx);
  assert.ok(rtf.includes(`HYPERLINK "https://tinyoffice.exe.xyz/#/v2/deck/${deck}"`));
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
  const text = '!fade\n\n:rocket:t\nBig launch\nSpring\n\n::2\nPlan\nleft\n|\nright one\nright two\n\n:star:i\nWhy\nbecause\n\nShapes\nfirst\n\\|\n@@draw/';
  const slides = parseDeck(text);
  assert.equal(deckTransition(text), 'fade');
  assert.deepEqual(slides.map((s) => s.layout ?? ''), ['t', '2', 'i', '']);
  assert.deepEqual(slides[1].right, ['right one', 'right two']);
  assert.deepEqual([slides[3].bullets, slides[3].sub], [['first', '|'], 'draw/']);
  assert.equal(serializeDeck(slides, 'fade'), text);
  assert.equal(deckTransition(serializeDeck(slides)), '');
  // Builds: a title slide appears whole; others reveal a bullet at a time, then what their document builds.
  assert.deepEqual(slideSteps(slides[0]), { bullets: 0, sub: 0, auto: false });
  assert.deepEqual(slideSteps(slides[1]), { bullets: 3, sub: 0, auto: false });
  const two = slidePage(slides[1], 1).svg;
  assert.ok(two.includes('>left</text>') && !two.includes('right one'));
  assert.ok(slidePage(slides[1]).svg.includes('>right two</text>'));
  // Type shrinks as a slide fills up.
  const few = layoutSlide({ icon: '', title: 'T', bullets: ['a', 'b'] }).bodyPx;
  const many = layoutSlide({ icon: '', title: 'T', bullets: Array.from({ length: 14 }, (_, i) => `A reasonably long bullet number ${i} that takes some room`) }).bodyPx;
  assert.ok(few > many && few >= 30 && many >= 14, `${few} vs ${many}`);
  // The big icon and an embedded document each take the right-hand half.
  assert.ok(layoutSlide(slides[2]).icon!.w > 200 && layoutSlide(slides[2]).icon!.x > 480);
  assert.ok(layoutSlide(slides[3]).sub!.x > 480);
});
