// (Zooms are one less than home.ts writes them: MapLibre's tiles are 512px to Leaflet's 256.)
// The Trip Planner's map where it opens (src/apps/trip/home.ts) and what it keeps out of reach: a blank trip opens on
// the country of the site's language (Japan for Japanese with no region), a trip with stops on its stops, and Where I
// am refused leaves that country; no position is asked for until the button is tapped. A pin the map has panned out of
// its own box is inert, and comes back when the map brings it back.
import { afterEach, expect, test } from 'vitest';
import '../../src/styles.css';
import '../../src/apps/trip/editor.ts';
import type { ToTripEditor } from '../../src/apps/trip/editor.ts';
import { COUNTRIES } from '../../src/apps/trip/countries.ts';
import { language, setLanguage, t } from '../../src/kit/core/i18n.ts';
import { cdp, page } from 'vitest/browser';
import { mount, openDrawerDoc, tick, until, settled } from './helpers.ts';

type MapLike = {
  getCenter(): { lat: number; lng: number };
  getZoom(): number;
  jumpTo(o: { center: [number, number]; zoom: number }): unknown;
  easeTo(o: { center: [number, number]; zoom: number }): unknown;
};
const mapOf = (el: ToTripEditor) => (el as unknown as { map: MapLike | null }).map!;
const mapReady = (el: ToTripEditor) => until(() => !!el.querySelector('.trip-map.maplibregl-map') && !!mapOf(el), 8000);
const LISBON_PORTO = 'Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 |\nCoimbra | 40.2033 | -8.4103 |\nPorto | 41.1579 | -8.6291 |\n';

async function editor(value = ''): Promise<ToTripEditor> {
  document.body.innerHTML = '';
  const el = document.createElement('to-trip-editor') as ToTripEditor;
  el.mapStyle = '';
  el.value = value;
  document.body.append(el);
  await el.updateComplete;
  await mapReady(el);
  return el;
}

/** The browser's languages, as navigator.languages says them, for one test. */
function browserSays(tags: string[]) {
  Object.defineProperty(navigator, 'languages', { value: tags, configurable: true });
}
/** The browser's geolocation faked: each ask counted, answered by `answer`. */
function fakeGeo(answer: { lat: number; lon: number } | 'refuse') {
  const asks: PositionOptions[] = [];
  const geo = {
    getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback | null, o?: PositionOptions) {
      asks.push(o ?? {});
      setTimeout(() => {
        if (answer === 'refuse') return fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        ok({ coords: { latitude: answer.lat, longitude: answer.lon, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition);
      }, 10);
    },
    watchPosition: () => {
      throw new Error('never watched');
    },
    clearWatch: () => undefined,
  };
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
  return asks;
}
const near = (el: ToTripEditor, code: string) => {
  const c = mapOf(el).getCenter();
  return Math.abs(c.lat - COUNTRIES[code][0]) < 1 && Math.abs(c.lng - COUNTRIES[code][1]) < 1 && mapOf(el).getZoom() === COUNTRIES[code][2] - 1;
};
const locate = (el: ToTripEditor) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${t('Where I am')}"]`)!;

afterEach(async () => {
  delete (navigator as { languages?: unknown }).languages;
  delete (navigator as { geolocation?: unknown }).geolocation;
  if (language() !== 'en') await setLanguage(null);
});

test('a blank trip in Japanese with no region opens on Japan, asking nothing of the device; in English, on New York City', async () => {
  const asks = fakeGeo({ lat: 51.5, lon: -0.12 });
  browserSays(['ja']);
  await setLanguage('ja');
  const el = await editor();
  expect(near(el, 'JP')).toBe(true);
  await tick(60);
  expect(asks).toHaveLength(0);
  browserSays(['en-US']);
  await setLanguage(null);
  const ny = await editor();
  expect(mapOf(ny).getCenter().lat).toBeCloseTo(40.71, 1);
  expect(mapOf(ny).getCenter().lng).toBeCloseTo(-74.01, 1);
  expect(mapOf(ny).getZoom()).toBe(11);
  // The browser's region wins: Spanish in Argentina.
  browserSays(['es-AR', 'en']);
  await setLanguage('es');
  expect(near(await editor(), 'AR')).toBe(true);
});

test('a trip with stops opens on its stops, never the country', async () => {
  browserSays(['ja']);
  await setLanguage('ja');
  const el = await editor(LISBON_PORTO);
  await tick(60);
  const c = mapOf(el).getCenter();
  expect(c.lat).toBeGreaterThan(38);
  expect(c.lat).toBeLessThan(42);
  expect(c.lng).toBeGreaterThan(-10);
  expect(c.lng).toBeLessThan(-8);
});

test('Where I am centers the map on the device at a city’s zoom; refused, the map goes back to the country it opened on', async () => {
  browserSays(['fr-CA']);
  await setLanguage('fr');
  const asks = fakeGeo({ lat: 45.5019, lon: -73.5674 });
  const el = await editor();
  expect(near(el, 'CA')).toBe(true);
  expect(asks).toHaveLength(0);
  locate(el).click();
  await until(() => Math.abs(mapOf(el).getCenter().lat - 45.5019) < 0.01);
  expect(mapOf(el).getZoom()).toBe(11);
  expect(asks).toHaveLength(1);
  expect(asks[0].timeout).toBe(5000);
  fakeGeo('refuse');
  locate(el).click();
  await until(() => near(el, 'CA'));
  // No geolocation at all: the country too.
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  mapOf(el).jumpTo({ center: [0, 0], zoom: 3 });
  locate(el).click();
  await until(() => near(el, 'CA'));
});

test('a pin panned out of the map’s box is inert, out of Tab’s reach, and reachable again once in view', async () => {
  const el = await editor(LISBON_PORTO);
  await settled();
  const pins = () => [...el.querySelectorAll<HTMLElement>('.trip-map .trip-pin')];
  // Walk what Tab reaches in the map: every pin, each inside the map's box.
  const reachable = () => pins().filter((p) => !p.closest('[inert]') && p.tabIndex >= 0);
  expect(reachable()).toHaveLength(3);
  // Far away: every pin is out of the map's box.
  mapOf(el).jumpTo({ center: [120, -30], zoom: 6 });
  await tick(30);
  expect(reachable()).toHaveLength(0);
  // Lisbon alone in view, the others off its box at a street's zoom.
  mapOf(el).jumpTo({ center: [-9.1393, 38.7223], zoom: 14 });
  await tick(30);
  expect(reachable().map((p) => p.textContent)).toEqual(['1']);
  for (const p of pins()) {
    const at = p.getBoundingClientRect();
    const box = el.querySelector('.trip-map')!.getBoundingClientRect();
    const inside = at.left + at.width / 2 >= box.left && at.right - at.width / 2 <= box.right && at.top + at.height / 2 >= box.top && at.bottom - at.height / 2 <= box.bottom;
    expect(p.inert, p.textContent!).toBe(!inside);
  }
  el.fit(false);
  await tick(30);
  expect(reachable()).toHaveLength(3);
  // A zoom on its way (the map's own +, animated): the pins it leaves outside go out of reach as the map moves.
  mapOf(el).easeTo({ center: [-9.1393, 38.7223], zoom: 13 });
  // (On its way the map passes places where another pin alone is in its box: the end is Lisbon's pin alone.)
  await until(
    () =>
      reachable()
        .map((p) => p.textContent)
        .join() === '1',
  );
  expect(reachable().map((p) => p.textContent)).toEqual(['1']);
  // Presented, the map is a show: no pin is a stop to Tab to, until the show ends.
  await el.present();
  expect(reachable()).toHaveLength(0);
  el.endPresenting();
  await el.updateComplete;
  await tick(30);
  expect(reachable().length).toBeGreaterThan(0);
});

// The walks found the focus left on the hidden box that holds a phone's keyboard up (kit/ui/chrome.ts startEditing): a
// tap that makes a new document whose link is the one on view (Blank, on a blank trip) opens nothing, so nothing took
// the focus from it. The document on view takes it where a person starts (docs/editing.md §1): an empty trip's map.
test('390×844 with a finger: Blank chosen on a blank trip leaves the focus where a person starts, never on the keyboard’s hold', async () => {
  const coarse = (on: boolean) => cdp().send('Emulation.setTouchEmulationEnabled', on ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await page.viewport(390, 844);
  await coarse(true);
  try {
    const shell = await mount('#/v1/trip');
    await until(() => !!shell.querySelector('.trip-map.maplibregl-map'), 8000);
    // The drawer lists no apps or templates (Paul, 2026-10-12): the blank trip from inside the trip is New trip, in This document.
    const drawer = await openDrawerDoc(shell);
    drawer.querySelector<HTMLAnchorElement>('.to-drawer-new')!.click();
    // (The map's canvas is its tab stop: MapLibre's keys listen there.)
    await until(() => document.activeElement === shell.querySelector('.trip-map .maplibregl-canvas'), 'Blank never opened the trip with its map in hand');
    expect(location.hash).toBe('#/v1/trip');
    expect(document.activeElement?.classList.contains('to-keyboard-hold')).toBe(false);
    expect(document.activeElement).toBe(shell.querySelector('.trip-map .maplibregl-canvas'));
  } finally {
    await coarse(false);
    await page.viewport(1100, 800);
  }
});
