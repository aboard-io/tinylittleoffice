import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTodos, serializeTodos } from '../src/lib/todomodel.ts';
import { emptyBoard, parseBoard, serializeBoard } from '../src/lib/boardmodel.ts';
import { ganttRange, parseGantt, serializeGantt } from '../src/lib/ganttmodel.ts';
import { distanceKm, formatKm, parseTrip, routeKm, serializeTrip } from '../src/lib/tripmodel.ts';
import { parseTune, serializeTune, pitchName, frequency } from '../src/lib/tunemodel.ts';
import { parseAnim, serializeAnim, stateAt, withKey } from '../src/lib/animmodel.ts';
import { parseDrawing, serializeDrawing, paint } from '../src/lib/drawmodel.ts';
import { TARGETS, blueskyCost, roomFor } from '../src/lib/limits.ts';
import { animToSvg, boardToCsv, boardToMarkdown, cardSvg, ganttToCsv, outlineOf, todosToMarkdown, tripToGeoJson, tripToGpx, tuneToMidi, titleOf } from '../src/lib/exports.ts';

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
  assert.equal(ganttToCsv(s), 'Task,Start,End,Days,Done %\r\n"Design, review",2025-06-23,2025-06-27,5,50\r\n,2025-06-28,2025-06-28,1,0\r\n');
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
  assert.equal(titleOf('trip', s), 'New York, NY to London');
  const gpx = tripToGpx(s);
  assert.ok(gpx.includes('<rtept lat="40.71280" lon="-74.00600"><name>New York, NY</name><desc>Start here</desc></rtept>'));
  assert.equal(gpx.match(/<wpt /g)!.length, 3);
  const geo = JSON.parse(tripToGeoJson(s));
  assert.equal(geo.features.length, 4);
  assert.deepEqual(geo.features[0].geometry.coordinates[1], [-0.12776, 51.50735]);
});

test('tune round trip and midi', () => {
  assert.equal(serializeTune(parseTune('')), '');
  const tune = { bpm: 96, notes: [{ step: 0, pitch: 12, len: 4 }, { step: 4, pitch: 16, len: 2 }, { step: 31, pitch: 23, len: 1 }] };
  const s = serializeTune(tune);
  assert.equal(s, '2o.0c44g2vn1');
  assert.deepEqual(parseTune(s), tune);
  assert.equal(pitchName(0), 'C3');
  assert.equal(pitchName(21), 'A4');
  assert.equal(Math.round(frequency(21)), 440);
  const midi = tuneToMidi(s);
  assert.equal(String.fromCharCode(...midi.slice(0, 4)), 'MThd');
  assert.equal(String.fromCharCode(...midi.slice(14, 18)), 'MTrk');
  assert.equal((midi[18] << 24) | (midi[19] << 16) | (midi[20] << 8) | midi[21], midi.length - 22);
  // Tempo: 60,000,000 / 96 = 625,000 microseconds per beat.
  assert.deepEqual([...midi.slice(22, 29)], [0, 0xff, 0x51, 3, 0x09, 0x89, 0x68]);
  // First note on: middle C (60), then off after four steps (480 ticks = 0x83 0x60).
  assert.deepEqual([...midi.slice(29, 38)], [0, 0x90, 60, 96, 0x83, 0x60, 0x80, 60, 0]);
  assert.deepEqual([...midi.slice(-3)], [0xff, 0x2f, 0]);
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
  const svg = animToSvg(s, { created: null, iconSvg: { rocket: '<path d="M1 1"/>' } });
  assert.ok(svg.includes('type="translate" values="80 320;560 80" keyTimes="0;1" dur="2.00s" repeatCount="indefinite"'));
  assert.ok(svg.includes('type="scale" values="1;2.5"'));
  assert.ok(svg.includes('<path d="M1 1"/>'));
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

test('share card', () => {
  assert.deepEqual(outlineOf('todo', '- one\nx two'), ['☐  one', '☑  two']);
  assert.deepEqual(outlineOf('board', '#A\nx\ny\n#B'), ['A  ·  2', 'B  ·  0']);
  const card = cardSvg('deck', ':rocket:t\nLaunch <plan>\nSpring\n\nAgenda\none\ntwo');
  assert.ok(card.includes('width="1200" height="630"'));
  assert.ok(card.includes('>Launch &lt;plan&gt;</text>'));
  assert.ok(card.includes('>Agenda</text>'));
  assert.ok(cardSvg('draw', 'r,2,1,12,6,1,Box').includes('<svg x="640"'));
  assert.ok(cardSvg('tune', '').includes('0 notes'));
});

test('embedding one document in another', async () => {
  const { linkToRef, previewOf } = await import('../src/lib/embed.ts');
  const { encodeEnvelope } = await import('../src/lib/envelope.ts');
  const { parseDoc, serializeDoc } = await import('../src/lib/richtext.ts');
  const { docToHtml, docToRtf } = await import('../src/lib/exports.ts');
  const deck = encodeEnvelope({ created: null, body: '::t\nSpring launch\nWhat ships\n\nAgenda\none' });
  const drawing = encodeEnvelope({ created: null, body: 'r,2,1,12,6,1,Box' });

  // Any TinyOffice link, from any host or version, with or without a download extension.
  assert.equal(linkToRef(` https://tinyoffice.exe.xyz/#/v2/deck/${deck}\n`), `deck/${deck}`);
  assert.equal(linkToRef(`http://localhost:4173/#/deck.pptx/${deck}`), `deck/${deck}`);
  assert.equal(linkToRef(`see https://tinyoffice.exe.xyz/#/v2/deck/${deck}`), null);
  assert.equal(linkToRef('https://example.com/#/v2/nope/abc'), null);
  assert.equal(linkToRef('https://example.com/'), null);

  const p = previewOf(`deck/${deck}`);
  assert.deepEqual([p.kind, p.title, p.locked, p.hash], ['Deck', 'Spring launch', false, `#/v2/deck/${deck}`]);
  assert.deepEqual(p.lines, ['•  What ships', 'Agenda', '•  one']);
  assert.ok(previewOf(`draw/${drawing}`).svg.includes('>Box</text>'));
  assert.deepEqual([previewOf('sheet/Eabc').locked, previewOf('sheet/Eabc').title], [true, 'Locked sheet']);

  // In a text it is one line, and survives the round trip beside ordinary paragraphs.
  const text = `# Plan\n@@deck/${deck}\n\\@@not an embed\n@@ nor this`;
  const blocks = parseDoc(text);
  assert.deepEqual(blocks.map((b) => b.k), ['h1', 'e', 'p', 'p']);
  assert.equal(blocks[1].ref, `deck/${deck}`);
  assert.equal(blocks[2].runs[0].t, '@@not an embed');
  assert.equal(serializeDoc(blocks), text.replace('@@ nor this', '\\@@ nor this'));

  // Exports carry a working link and what the document holds.
  const ctx = { created: null, base: 'https://tinyoffice.exe.xyz/' };
  const html = docToHtml(`# Plan\n@@deck/${deck}\n@@draw/${drawing}`, ctx);
  assert.ok(html.includes(`<a href="https://tinyoffice.exe.xyz/#/v2/deck/${deck}">Spring launch</a> <small>Deck</small>`));
  assert.ok(html.includes('<li>Agenda</li>'));
  assert.ok(html.includes('<img src="data:image/svg+xml'));
  const rtf = docToRtf(`@@deck/${deck}`, ctx);
  assert.ok(rtf.includes(`HYPERLINK "https://tinyoffice.exe.xyz/#/v2/deck/${deck}"`));
  assert.ok(rtf.includes('Spring launch') && rtf.includes('Agenda'));
});
