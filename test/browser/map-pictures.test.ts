// A trip's map drawn anywhere is a picture of the ground (Paul, 2026-10-12: "The map shows the locations but not the map
// itself"), drawn by MapLibre from OpenFreeMap (apps/trip/picture.ts; Paul, 2026-11-27, off OpenStreetMap's tile
// servers): a slide that holds a trip leaves a box under its places that the picture fills, and the plain ground with the
// Map switch off; a preview card of a trip has it written in before it is drawn to pixels, and still comes when it does
// not. The drawer is stubbed here (kit/draw/maps.ts drawsMaps): no network and no WebGL in a test.
import { afterEach, expect, test, vi } from 'vitest';
import '../../src/styles.css';
import '../../src/apps/deck/editor.ts';
import type { ToDeckEditor } from '../../src/apps/deck/editor.ts';
import trip from '../../src/apps/trip/def.ts';
import { mapSvg, setMapOn } from '../../src/apps/trip/view.ts';
import { readTrip } from '../../src/apps/trip/model.ts';
import { parse } from '../../src/doc/index.ts';
import { drawsMaps, installMaps } from '../../src/kit/draw/maps.ts';
import { viewOf } from '../../src/apps/trip/picture.ts';
import { cardFor } from '../../src/kit/share/card.ts';
import { until } from './helpers.ts';

const HERE = 'Place | Lat:number | Lon:number\n--- | --- | ---\nGrand Army Plaza | 40.6741 | -73.9708\n';

/** A 1 by 1 PNG of pure red, as a data: URL: the picture the stubbed drawer answers. */
async function redPixel(): Promise<string> {
  const c = new OffscreenCanvas(1, 1);
  const g = c.getContext('2d')!;
  g.fillStyle = '#ff0000';
  g.fillRect(0, 0, 1, 1);
  const blob = await c.convertToBlob({ type: 'image/png' });
  return `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())))}`;
}
/** The drawer stubbed: each box asked for, answered with `picture` (null: it cannot be drawn). */
function drawer(picture: string | null) {
  const asked: string[] = [];
  drawsMaps(async (box) => (asked.push(box), picture));
  return asked;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setMapOn(true);
});

async function deck(value: string): Promise<ToDeckEditor> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-deck-editor') as ToDeckEditor;
  el.value = value;
  main.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('figure.deck-sub svg circle'));
  return el;
}
const boxesOn = (el: HTMLElement) => [...el.querySelectorAll<SVGImageElement>('figure.deck-sub svg image[data-map]')];

test('a slide that holds a trip leaves one box for its map, which the drawer fills once, with the credit; with the Map switch off, the plain ground', async () => {
  const red = await redPixel();
  const asked = drawer(red);
  installMaps();
  const slide = `## The walk\n\n\`\`\`trip\n${HERE}\`\`\`\n`;
  const el = await deck(slide);
  const boxes = boxesOn(el);
  expect(boxes).toHaveLength(1);
  await until(() => boxes[0].getAttribute('href') === red);
  expect(asked).toEqual([boxes[0].dataset.map]);
  expect(document.querySelector('figure.deck-sub svg a')?.textContent).toBe('OpenFreeMap © OpenMapTiles © OpenStreetMap');
  // Drawn again (the slide put on the page anew), the box is not drawn again: once a visit.
  const again = await deck(slide);
  await until(() => boxesOn(again)[0]?.getAttribute('href') === red);
  expect(asked).toHaveLength(1);
  setMapOn(false);
  const off = await deck(slide);
  expect(boxesOn(off)).toEqual([]);
  expect(off.querySelector('figure.deck-sub svg')!.innerHTML).not.toMatch(/OpenStreetMap|<image/);
});

/** The site's /card, stubbed: the card posted, as its pixels. */
function cardStub() {
  const posted: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (!u.endsWith('/card')) throw new Error(`unexpected fetch ${u}`);
    posted.push(JSON.parse(String(init?.body)).png);
    return new Response(JSON.stringify({ id: `c${posted.length}` }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  return posted;
}
/** How many of a PNG's pixels are the stub's red. */
async function reds(base64: string): Promise<number> {
  const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'image/png' }));
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const g = c.getContext('2d')!;
  g.drawImage(bitmap, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] > 240 && px[i + 1] < 16 && px[i + 2] < 16) n++;
  return n;
}

test('a card of a trip: the map drawn and written in, so the picture is not blank where it is; a map that cannot be drawn leaves the ground, and the card still comes', async () => {
  const asked = drawer(await redPixel());
  const posted = cardStub();
  expect(await cardFor('/card', 'https://example.test/#a', trip, HERE, 'The walk')).toBe('c1');
  expect(asked).toHaveLength(1);
  // The map's box, on its picture: a great part of the card is the picture's red.
  expect(await reds(posted[0])).toBeGreaterThan(50_000);
  vi.unstubAllGlobals();
  const failing = drawer(null);
  const failed = cardStub();
  expect(await cardFor('/card', 'https://example.test/#b', trip, HERE, 'The walk')).toBe('c1');
  expect(failing).toEqual(asked);
  expect(await reds(failed[0])).toBe(0);
});

test('a box is MapLibre’s view of the same ground: its centre the stops’ centre, one zoom out for 512-pixel tiles, its size', () => {
  const v = readTrip(parse('Place | Lat:number | Lon:number\n--- | --- | ---\nProspect Park | 40.6602 | -73.969\nConey Island | 40.5749 | -73.9859\n'));
  const box = /data-map="([^"]+)"/.exec(mapSvg(v, 320, 180, Infinity, true))![1];
  const [z] = box.split('/').map(Number);
  const view = viewOf(box);
  expect(view).toMatchObject({ zoom: z - 1, w: 320, h: 180 });
  expect(view.lon).toBeCloseTo((-73.969 + -73.9859) / 2, 3);
  // The centre in Web Mercator, between the two latitudes (nearer the pole's side than their plain mean).
  expect(view.lat).toBeGreaterThan(40.5749);
  expect(view.lat).toBeLessThan(40.6602);
  expect(view.lat).toBeCloseTo((40.6602 + 40.5749) / 2, 2);
});
