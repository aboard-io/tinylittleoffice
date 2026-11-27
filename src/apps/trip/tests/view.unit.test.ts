// The drawn map on OpenStreetMap's tiles (Paul, 2026-10-12: "The map shows the locations but not the map itself"): the
// zoom that fits the places, the tiles that cover the box and no more, the credit, every pin over a tile; the plain
// ground with the Map switch off and on a thumbnail. Under node: the markup is read, never looked at.
import { afterEach, expect, test } from 'vitest';
import { parse } from '../../../doc/index.ts';
import def from '../def.ts';
import { readTrip } from '../model.ts';
import { FIT, mapOn, mapSvg, MIN_ZOOM, ONE_ZOOM, setMapOn } from '../view.ts';

const BROOKLYN = 'Place | Lat:number | Lon:number\n--- | --- | ---\nProspect Park | 40.6602 | -73.969\nBrooklyn Bridge Park | 40.7003 | -73.9967\nConey Island | 40.5749 | -73.9859\n';
const ONE = 'Place | Lat:number | Lon:number\n--- | --- | ---\nHere | 53.3446 | -6.2764\n';
const [W, H] = [320, 180];

afterEach(() => setMapOn(true));

/** The box left for the map's picture (kit/draw/maps.ts): its zoom, its top left in pixels of that zoom, its size. */
const boxOf = (svg: string) => {
  const m = /<image data-map="(\d+)\/([\d.-]+)\/([\d.-]+)\/(\d+)\/(\d+)" x="0" y="0" width="(\d+)" height="(\d+)"\/>/.exec(svg);
  return m ? { z: +m[1], x0: +m[2], y0: +m[3], w: +m[4], h: +m[5], width: +m[6], height: +m[7] } : null;
};
const pinsOf = (svg: string) => [...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g)].map((m) => [+m[1], +m[2]]);
/** Web Mercator, in world widths, as the map draws it. */
const wx = (lon: number) => (lon + 180) / 360;
const wy = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

test('three places in Brooklyn: the greatest zoom at which they fit, one box for the map the size of the map, the credit, every pin where its place falls on that ground', () => {
  const v = readTrip(parse(BROOKLYN));
  const svg = mapSvg(v, W, H, Infinity, true);
  const box = boxOf(svg)!;
  expect((svg.match(/<image /g) ?? []).length).toBe(1);
  expect(box).toMatchObject({ w: W, h: H, width: W, height: H });
  const z = box.z;
  // The greatest zoom at which the places' extent fits the box with its margin.
  const dx = Math.max(...v.stops.map((s) => wx(s.lon))) - Math.min(...v.stops.map((s) => wx(s.lon)));
  const dy = Math.max(...v.stops.map((s) => wy(s.lat))) - Math.min(...v.stops.map((s) => wy(s.lat)));
  const fits = (z: number) => dx * 256 * 2 ** z <= W * FIT && dy * 256 * 2 ** z <= H * FIT;
  expect(fits(z)).toBe(true);
  expect(fits(z + 1)).toBe(false);
  expect(z).toBe(10);
  // Each pin is where its place falls on the box's ground: its world pixel at that zoom, less the box's top left.
  const pins = pinsOf(svg);
  expect(pins).toHaveLength(3);
  v.stops.forEach((p, i) => {
    expect(pins[i][0]).toBeCloseTo(wx(p.lon) * 256 * 2 ** z - box.x0, 0);
    expect(pins[i][1]).toBeCloseTo(wy(p.lat) * 256 * 2 ** z - box.y0, 0);
    expect(pins[i][0] > 0 && pins[i][0] < W && pins[i][1] > 0 && pins[i][1] < H).toBe(true);
  });
  // The box under the pins, the credit over them: OpenFreeMap's, OpenMapTiles' and OpenStreetMap's names, a link to OpenStreetMap's copyright page.
  expect(svg.indexOf('<image ')).toBeLessThan(svg.indexOf('<circle'));
  expect(svg).toMatch(/<a href="https:\/\/www\.openstreetmap\.org\/copyright"[^>]*>.*OpenFreeMap © OpenMapTiles © OpenStreetMap<\/text><\/a>$/);
  // Nothing in it asks OpenStreetMap's tile servers.
  expect(svg).not.toContain('tile.openstreetmap.org');
});

test('stops across the world are drawn at the continents’ zoom, never on one tile of the globe', () => {
  const WORLD = 'Place | Lat:number | Lon:number\n--- | --- | ---\nSydney | -33.8688 | 151.2093\nReykjavík | 64.1466 | -21.9426\nSantiago | -33.4489 | -70.6693\n';
  const svg = mapSvg(readTrip(parse(WORLD)), W, H, Infinity, true);
  expect(MIN_ZOOM).toBe(2);
  expect(boxOf(svg)!.z).toBe(MIN_ZOOM);
  expect(pinsOf(svg)).toHaveLength(3);
});

test('one place alone is centred at a neighbourhood’s zoom', () => {
  const svg = mapSvg(readTrip(parse(ONE)), W, H, Infinity, true);
  expect(boxOf(svg)!.z).toBe(ONE_ZOOM);
  expect(pinsOf(svg)).toEqual([[W / 2, H / 2]]);
});

test('the Map switch off, or a thumbnail: the plain ground, no map box and no credit; on, a slide’s or a page’s map has them', () => {
  const shows = (opts?: Parameters<typeof def.view>[1]) => def.view(BROOKLYN, opts)[0].svg;
  expect(mapOn()).toBe(true);
  expect(shows()).toContain('<image data-map="');
  expect(shows({ small: true, still: true })).toContain('OpenFreeMap © OpenMapTiles © OpenStreetMap');
  // A thumbnail (the home page's templates) tells no one anything.
  expect(shows({ small: true, thumb: true })).not.toMatch(/<image|OpenStreetMap/);
  setMapOn(false);
  for (const svg of [shows(), shows({ small: true }), mapSvg(readTrip(parse(BROOKLYN)), W, H)]) expect(svg).not.toMatch(/<image|https?:|OpenStreetMap/);
});
