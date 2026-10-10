// Trip as a view of the document, each command as the ops it produces, the drawing and the files: under node.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, type Doc, type Op } from '../../../doc/index.ts';
import def, { titleOf } from '../def.ts';
import { addStop, distanceKm, duplicateStops, formatLeg, MAX_STOPS, moveStop, moveStops, pasteStops, placesIn, putAfter, readTrip, removeStop, removeStops, routeKm, routeName, setLinked, setPlace, setText, setUnits, stopsTable, tabulate, type TripView } from '../model.ts';
import { templates } from '../templates.ts';
import { tripPage, tripToGeoJson, tripToGpx } from '../view.ts';

const ROUTE = 'Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nNew York, NY | 40.7128 | -74.006 | Start here\nLondon | 51.50735 | -0.12776 |\n| | -33.8688 | 151.2093 | far \\| away\n';
const run = (text: string, ops: (doc: Doc, v: TripView) => Op[]) => {
  const doc = parse(text);
  const made = ops(doc, readTrip(doc));
  const out = applyAll(doc, made);
  // Every command can be taken back exactly.
  expect(applyAll(out, invertAll(doc, made))).toEqual(doc);
  return { ops: made, text: write(out) };
};

test('read: a stop per row that is a place, its columns found by name; units and dots from the head', () => {
  const v = readTrip(parse(ROUTE));
  expect(v.at).toBe(0);
  expect(v.stops).toEqual([
    { row: 0, lat: 40.7128, lon: -74.006, name: 'New York, NY', note: 'Start here' },
    { row: 1, lat: 51.50735, lon: -0.12776, name: 'London', note: '' },
    { row: 2, lat: -33.8688, lon: 151.2093, name: '', note: 'far | away' },
  ]);
  expect([v.units, v.linked, v.loose]).toEqual(['h', true, false]);
  expect(write(parse(ROUTE))).toBe(ROUTE);
  // Columns in any order and named loosely; a row that is not a place is left out (and its index kept by the others).
  const odd = readTrip(parse('# Trip\n\nlongitude | name | latitude\n--- | --- | ---\n-9.1393 | Lisbon | 38.7223\n0 | Nowhere | 91\n-8.6291 | Porto | 41.1579\n'));
  expect(odd.at).toBe(1);
  expect(odd.stops.map((s) => [s.row, s.name, s.lat])).toEqual([[0, 'Lisbon', 38.7223], [2, 'Porto', 41.1579]]);
  expect(readTrip(parse('---\nunits: miles\nroute: dots\n---\n' + ROUTE))).toMatchObject({ units: 'm', linked: false });
  expect(readTrip(parse('---\nunits: KM\n---\n')).units).toBe('k');
  expect(readTrip(parse('')).stops).toEqual([]);
});

test('add: the first stop is the table, after whatever else; then rows at the end, in the table’s own columns', () => {
  const first = run('', (d, v) => addStop(d, v, 38.722345678, -9.1393, 'Lisbon'));
  expect(first.ops.map((o) => o.op)).toEqual(['splice']);
  expect(first.text).toBe('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.72235 | -9.1393 |\n');
  expect(run('# Away\n', (d, v) => addStop(d, v, 1, 2)).text).toBe('# Away\n\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\n| | 1 | 2 |\n');
  const more = run(ROUTE, (d, v) => addStop(d, v, 48.8566, 2.3522, 'Paris'));
  expect(more.ops).toEqual([{ op: 'rows', at: 0, r: 3, n: 1, rows: [['Paris', '48.8566', '2.3522', '']] }]);
  expect(run('Lon | Lat\n--- | ---\n1 | 2\n', (d, v) => addStop(d, v, 5, 6)).text).toBe('Lon | Lat\n--- | ---\n1 | 2\n6 | 5\n');
  // A name with no column for it brings the column.
  expect(run('Lon | Lat\n--- | ---\n1 | 2\n', (d, v) => addStop(d, v, 5, 6, 'Six')).text).toBe('Place | Lon | Lat\n--- | --- | ---\n| | 1 | 2\nSix | 6 | 5\n');
  // Not a place, or the route full: nothing.
  const d = parse(ROUTE);
  expect(addStop(d, readTrip(d), 95, 0)).toEqual([]);
  const full = parse(write({ head: {}, blocks: [{ ...(d.blocks[0] as Extract<Doc['blocks'][number], { k: 'table' }>), rows: Array.from({ length: 40 }, () => ['x', '1', '1', '']) }] }));
  expect(addStop(full, readTrip(full), 1, 1)).toEqual([]);
});

test('name, note and place are cells; a note with no column makes one', () => {
  const name = run(ROUTE, (d, v) => setText(d, v, v.stops[1], 'name', 'London, UK'));
  expect(name.ops).toEqual([{ op: 'cells', at: 0, r: 1, c: 0, values: [['London, UK']] }]);
  expect(name.text).toContain('\nLondon, UK | 51.50735 | -0.12776 |\n');
  expect(run(ROUTE, (d, v) => setText(d, v, v.stops[0], 'note', 'Start here')).ops).toEqual([]);
  expect(run(ROUTE, (d, v) => setText(d, v, v.stops[0], 'note', 'two\nlines')).text).toContain('| Start here'.replace('Start here', 'two lines'));
  expect(run('Name | Lat | Lon\n--- | --- | ---\nA | 1 | 2\n', (d, v) => setText(d, v, v.stops[0], 'note', 'hello')).text).toBe('Name | Lat | Lon | Note\n--- | --- | --- | ---\nA | 1 | 2 | hello\n');
  const moved = run(ROUTE, (_, v) => setPlace(v, v.stops[0], 40.7, -74.0060000001));
  expect(moved.ops).toEqual([{ op: 'cells', at: 0, r: 0, c: 1, values: [['40.7']] }]);
  expect(run(ROUTE, (_, v) => setPlace(v, v.stops[0], 99, 0)).ops).toEqual([]);
});

test('move is the row out and in again where its neighbour was; remove is rows; the ends stay', () => {
  const down = run(ROUTE, (d, v) => moveStop(d, v, 0, 1));
  expect(down.ops.map((o) => o.op)).toEqual(['rows', 'rows']);
  expect(readTrip(parse(down.text)).stops.map((s) => s.name)).toEqual(['London', 'New York, NY', '']);
  const up = run(ROUTE, (d, v) => moveStop(d, v, 2, -1));
  expect(readTrip(parse(up.text)).stops.map((s) => s.note)).toEqual(['Start here', 'far | away', '']);
  expect(run(ROUTE, (d, v) => moveStop(d, v, 0, -1)).ops).toEqual([]);
  expect(run(ROUTE, (d, v) => moveStop(d, v, 2, 1)).ops).toEqual([]);
  // Past a row that is no place: the neighbour is the next stop, wherever its row is.
  const gap = 'Place | Lat | Lon\n--- | --- | ---\nA | 1 | 1\nnot here | x | y\nB | 2 | 2\n';
  expect(run(gap, (d, v) => moveStop(d, v, 0, 1)).text).toBe('Place | Lat | Lon\n--- | --- | ---\nnot here | x | y\nB | 2 | 2\nA | 1 | 1\n');
  const gone = run(ROUTE, (_, v) => removeStop(v, v.stops[1]));
  expect(gone.ops).toEqual([{ op: 'rows', at: 0, r: 1, n: 1 }]);
  expect(readTrip(parse(gone.text)).stops).toHaveLength(2);
});

test('a stop added after another goes in after its row; at the end without one', () => {
  const after = run(ROUTE, (d, v) => addStop(d, v, 1, 2, 'Here', 0));
  expect(after.ops).toEqual([{ op: 'rows', at: 0, r: 1, n: 1, rows: [['Here', '1', '2', '']] }]);
  expect(readTrip(parse(after.text)).stops.map((s) => s.name)).toEqual(['New York, NY', 'Here', 'London', '']);
  expect(run(ROUTE, (d, v) => addStop(d, v, 1, 2, '', null)).ops).toEqual([{ op: 'rows', at: 0, r: 3, n: 1, rows: [['', '1', '2', '']] }]);
});

const names = (text: string) => readTrip(parse(text)).stops.map((s) => s.name || '-');
test('several stops: moved past their neighbour as a block, removed from the last up, duplicated after the last', () => {
  expect(names(run(ROUTE, (d, v) => moveStops(d, v, 0, 2, 1)).text)).toEqual(['-', 'New York, NY', 'London']);
  expect(names(run(ROUTE, (d, v) => moveStops(d, v, 1, 3, -1)).text)).toEqual(['London', '-', 'New York, NY']);
  expect(run(ROUTE, (d, v) => moveStops(d, v, 0, 2, -1)).ops).toEqual([]);
  expect(run(ROUTE, (d, v) => moveStops(d, v, 1, 3, 1)).ops).toEqual([]);
  // The one-stop move is the same thing.
  expect(run(ROUTE, (d, v) => moveStop(d, v, 0, 1)).ops).toEqual(run(ROUTE, (d, v) => moveStops(d, v, 0, 1, 1)).ops);
  const gone = run(ROUTE, (_, v) => removeStops(v, [0, 2]));
  expect(gone.ops).toEqual([{ op: 'rows', at: 0, r: 2, n: 1 }, { op: 'rows', at: 0, r: 0, n: 1 }]);
  expect(names(gone.text)).toEqual(['London']);
  const twice = run(ROUTE, (d, v) => duplicateStops(d, v, 0, 2));
  expect(names(twice.text)).toEqual(['New York, NY', 'London', 'New York, NY', 'London', '-']);
  // Never past the most a route holds.
  const full = Array.from({ length: MAX_STOPS }, (_, i) => `S${i} | 1 | ${i}\n`).join('');
  expect(run(`Place | Lat | Lon\n--- | --- | ---\n${full}`, (d, v) => duplicateStops(d, v, 0, 1)).ops).toEqual([]);
});

test('a stop carried after another: its row out and in again after the other’s; says where it lands', () => {
  const doc = parse(ROUTE);
  const v = readTrip(doc);
  const down = putAfter(doc, v, 0, 2);
  expect(down.at).toBe(2);
  expect(names(write(applyAll(doc, down.ops)))).toEqual(['London', '-', 'New York, NY']);
  const up = putAfter(doc, v, 2, 0);
  expect(up.at).toBe(1);
  expect(names(write(applyAll(doc, up.ops)))).toEqual(['New York, NY', '-', 'London']);
  expect(applyAll(applyAll(doc, up.ops), invertAll(doc, up.ops))).toEqual(doc);
  // Already there: nothing.
  expect(putAfter(doc, v, 1, 0).ops).toEqual([]);
  expect(putAfter(doc, v, 1, 1).ops).toEqual([]);
});

test('the clipboard: chosen stops are a trip table of their own; places are read from a table or from words; a paste is stops in place or after', () => {
  const v = readTrip(parse(ROUTE));
  const t = stopsTable(v, 1, 3);
  expect(write({ head: {}, blocks: [t] })).toBe('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLondon | 51.50735 | -0.12776 |\n| | -33.8688 | 151.2093 | far \\| away\n');
  expect(placesIn({ head: {}, blocks: [t] }).map((p) => p.name)).toEqual(['London', '']);
  expect(placesIn(parse('Porto (41.1579, -8.6291) cellars\n'))).toEqual([{ lat: 41.1579, lon: -8.6291, name: 'Porto', note: 'cellars' }]);
  expect(placesIn(parse('Just words\n'))).toEqual([]);
  const porto = [{ lat: 41.1579, lon: -8.6291, name: 'Porto', note: '' }];
  const after = run(ROUTE, (d, v) => pasteStops(d, v, porto, { after: 0 })!.ops);
  expect(names(after.text)).toEqual(['New York, NY', 'Porto', 'London', '-']);
  expect(pasteStops(parse(ROUTE), v, porto, { after: 0 })).toMatchObject({ at: 1, n: 1 });
  const over = run(ROUTE, (d, v) => pasteStops(d, v, porto, { replace: [1, 3] })!.ops);
  expect(names(over.text)).toEqual(['New York, NY', 'Porto']);
  expect(names(run(ROUTE, (d, v) => pasteStops(d, v, porto, { after: null })!.ops).text)).toEqual(['New York, NY', 'London', '-', 'Porto']);
  // No table yet: the paste is its birth.
  expect(run('', (d, v) => pasteStops(d, v, porto, { after: null })!.ops).text).toBe('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nPorto | 41.1579 | -8.6291 |\n');
  expect(pasteStops(parse(ROUTE), v, [], { after: 0 })).toBeNull();
});

test('units and dots are the head', () => {
  expect(run(ROUTE, (d) => setUnits(d, 'm')).text.startsWith('---\nunits: miles\n---\nPlace |')).toBe(true);
  expect(run(ROUTE, (d) => setUnits(d, 'k')).ops).toEqual([{ op: 'head', key: 'units', value: 'km' }]);
  expect(run(ROUTE, (d) => setUnits(d, 'h')).ops).toEqual([]);
  expect(run('---\nunits: kilometres\n---\n' + ROUTE, (d) => setUnits(d, 'k')).ops).toEqual([{ op: 'head', key: 'units', value: 'km' }]);
  expect(run('---\nunits: km\n---\n' + ROUTE, (d) => setUnits(d, 'h')).text).toBe(ROUTE);
  expect(run(ROUTE, (d) => setLinked(d, false)).text.startsWith('---\nroute: dots\n---\n')).toBe(true);
  expect(run(ROUTE, (d) => setLinked(d, true)).ops).toEqual([]);
  expect(run('---\nroute: dots\n---\n' + ROUTE, (d) => setLinked(d, true)).text).toBe(ROUTE);
});

test('loose words that say where become the table, in one splice, with the units they said', () => {
  const words = parse('km\n38.7223, -9.1393, Lisbon | Pastel de nata first\n\n- Porto (41.1579, -8.6291)\n  Port cellars\n');
  expect(readTrip(words).loose).toBe(true);
  const ops = tabulate(words);
  expect(ops.map((o) => o.op)).toEqual(['splice', 'head']);
  expect(write(applyAll(words, ops))).toBe('---\nunits: km\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\nPorto | 41.1579 | -8.6291 | Port cellars\n');
  expect(tabulate(parse(ROUTE))).toEqual([]);
  expect(readTrip(parse('Just words.\n')).loose).toBe(false);
});

test('distances, legs in the units, the title', () => {
  const v = readTrip(parse(ROUTE));
  expect(Math.abs(distanceKm(v.stops[0], v.stops[1]) - 5570)).toBeLessThan(15);
  expect(routeKm(v.stops)).toBeGreaterThan(22000);
  expect(formatLeg(100, 'k')).toBe('100 km');
  expect(formatLeg(12.345, 'k')).toBe('12.3 km');
  expect(formatLeg(5570.2, 'k')).toBe('5,570 km');
  expect(formatLeg(0.42, 'k')).toBe('420 m');
  expect(formatLeg(100, 'm')).toBe('62.1 mi');
  expect(formatLeg(0.1, 'm')).toBe('328 ft');
  expect(formatLeg(100, 'h')).toBe('1 hr 38 min');
  expect(formatLeg(20, 'h')).toBe('20 min');
  expect(formatLeg(123.08, 'h')).toBe('2 hr');
  expect(titleOf(ROUTE)).toBe('');
  expect(routeName(readTrip(parse(ROUTE)))).toBe('New York, NY – London');
  expect(titleOf('---\ntitle: Away\n---\n' + ROUTE)).toBe('Away');
  expect(parse(def.retitle(ROUTE, 'Big trip')).head.title).toBe('Big trip');
});

test('the page: the map drawn here, with no pictures from anyone; the stops, legs and total; dots have neither', () => {
  const page = tripPage(parse(ROUTE));
  expect(page.svg).not.toMatch(/<image|https?:/);
  expect(page.svg).toContain('<polyline');
  expect(page.svg).toContain('>London</text>');
  expect(page.svg).toContain('far | away');
  expect(page.svg).toContain(formatLeg(routeKm(readTrip(parse(ROUTE)).stops), 'h'));
  expect(page.alt).toBe('1. New York, NY; 2. London; 3. -33.8688, 151.2093');
  const dots = tripPage(parse('---\nroute: dots\n---\n' + ROUTE)).svg;
  expect(dots).not.toContain('<polyline');
  expect(dots).not.toContain(formatLeg(routeKm(readTrip(parse(ROUTE)).stops), 'h'));
  // Small, the map alone; empty, still a page.
  expect(tripPage(parse(ROUTE), true).svg).not.toContain('Start here');
  expect(def.view('').length).toBe(1);
  expect(def.view('', { small: true })[0].h).toBeGreaterThan(100);
});

test('GPX and GeoJSON', () => {
  const gpx = tripToGpx(parse(ROUTE));
  expect(gpx).toContain('<rtept lat="40.71280" lon="-74.00600"><name>New York, NY</name><desc>Start here</desc></rtept>');
  expect(gpx.match(/<wpt /g)).toHaveLength(3);
  expect(gpx).toContain('<rte><name>New York, NY – London</name>');
  expect(gpx).toContain('<name>3</name><desc>far | away</desc>');
  const geo = JSON.parse(tripToGeoJson(parse(ROUTE)));
  expect(geo.features).toHaveLength(4);
  expect(geo.features[0].geometry.type).toBe('LineString');
  expect(geo.features[0].geometry.coordinates[1]).toEqual([-0.12776, 51.50735]);
  expect(geo.features[3].properties).toEqual({ name: '3', note: 'far | away', order: 3 });
  // Dots: no line.
  expect(JSON.parse(tripToGeoJson(parse('---\nroute: dots\n---\n' + ROUTE))).features).toHaveLength(3);
  expect(def.exports!.map((e) => e.ext)).toEqual(['gpx', 'geojson']);
});

test('the templates: real routes, each canonical, every way of measuring among them', () => {
  const all = templates();
  expect(all.map((x) => x.id)).toEqual(['weekend', 'iceland', 'crawl', 'hike', 'cycling', 'colleges', 'portugal', 'coast', 'highlands', 'rome', 'japan', 'camino', 'films', 'wedding']);
  for (const x of all) {
    expect(write(parse(x.doc))).toBe(x.doc);
    expect(readTrip(parse(x.doc)).stops.length).toBeGreaterThanOrEqual(5);
    expect(readTrip(parse(x.doc)).stops.every((s) => s.name && s.note)).toBe(true);
  }
  const ways = all.map((x) => readTrip(parse(x.doc))).map((v) => `${v.units}${v.linked ? '' : ' dots'}`);
  expect(new Set(ways)).toEqual(new Set(['k', 'm', 'h', 'h dots']));
  // Every name and blurb said, none twice; a loop ends where it began.
  expect(new Set(all.map((x) => x.name)).size).toBe(all.length);
  expect(all.every((x) => x.name && x.blurb)).toBe(true);
  const hike = readTrip(parse(all.find((x) => x.id === 'hike')!.doc)).stops;
  expect([hike[0].lat, hike[0].lon]).toEqual([hike.at(-1)!.lat, hike.at(-1)!.lon]);
  expect(def.blank()).toBe('');
});
