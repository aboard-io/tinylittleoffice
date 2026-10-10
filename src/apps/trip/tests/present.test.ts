// Trip presenting: Present in the bar (or Mod+Alt+Enter) gives the map the screen and flies it stop to stop, one a
// key or a click, each named; Escape ends and the whole route is in view again. The map's flights are stubbed.
import { expect, test } from 'vitest';
import '../../../styles.css';
import '../editor.ts';
import type { ToTripEditor } from '../editor.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const ROUTE = '| Place | Lat:number | Lon:number | Note |\n|---|---|---|---|\n| Lisbon | 38.7223 | -9.1393 | Pastel de nata first |\n| Coimbra | 40.2033 | -8.4103 | |\n| Porto | 41.1579 | -8.6291 | Port cellars |\n';

async function editor(value = ROUTE) {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-trip-editor') as ToTripEditor;
  el.tiles = '';
  el.value = value;
  main.append(el);
  await el.updateComplete;
  await until(() => !!el.querySelector('.trip-map.leaflet-container'), 8000);
  // The map's flights, recorded instead of flown.
  const map = (el as unknown as { map: { flyTo: (...a: unknown[]) => unknown; setView: (...a: unknown[]) => unknown } }).map;
  const flights: [number, number][] = [];
  map.flyTo = (at: unknown) => (flights.push(at as [number, number]), map);
  return { el, flights };
}
const key = (on: Element, k: string, o: KeyboardEventInit = {}) => on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
const words = (el: HTMLElement) => el.querySelector('.trip-present-words b')?.textContent?.trim();

test('Present flies stop to stop, a key a stop, naming each; the ends stay put; Escape ends', async () => {
  const { el, flights } = await editor();
  const present = el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Present"]')!;
  expect(present.title).toMatch(/Present \((⌘|Ctrl\+)/);
  present.click();
  await until(() => !!el.querySelector('.trip-present'));
  const box = el.querySelector<HTMLElement>('.trip-present')!;
  expect(document.activeElement).toBe(box);
  expect(box.getAttribute('aria-modal')).toBe('true');
  expect(words(el)).toBe('1 of 3 · Lisbon');
  expect(box.textContent).toContain('Pastel de nata first');
  expect(flights).toEqual([[38.7223, -9.1393]]);
  // The map has the screen.
  const side = el.querySelector('.trip-side')!.getBoundingClientRect();
  expect(side.width).toBe(document.documentElement.clientWidth);
  key(box, 'ArrowRight');
  await el.updateComplete;
  expect(words(el)).toBe('2 of 3 · Coimbra');
  // The leg to it, as the trip measures (hours of driving, with no units in the head).
  expect(box.querySelector('small')!.textContent).toMatch(/hr/);
  key(box, ' ');
  await el.updateComplete;
  expect(words(el)).toBe('3 of 3 · Porto');
  key(box, 'ArrowRight');
  await el.updateComplete;
  expect(words(el)).toBe('3 of 3 · Porto');
  key(box, 'ArrowLeft');
  await el.updateComplete;
  expect(words(el)).toBe('2 of 3 · Coimbra');
  expect(flights.length).toBe(5);
  el.querySelector<HTMLButtonElement>('.trip-present button[aria-label="The next stop"]')!.click();
  await el.updateComplete;
  expect(words(el)).toBe('3 of 3 · Porto');
  key(box, 'Escape');
  await until(() => !el.querySelector('.trip-present'));
  expect(el.querySelector('.trip.presenting')).toBeNull();
  await tick(20);
  expect(document.activeElement).toBe(present);
});

test('Mod+Alt+Enter presents from anywhere in the editor; a trip with no stops has nothing to present', async () => {
  const { el } = await editor();
  key(el.querySelector('to-bar')!, 'Enter', { ctrlKey: true, altKey: true });
  await until(() => words(el) === '1 of 3 · Lisbon');
  key(el.querySelector('.trip-present')!, 'End');
  await el.updateComplete;
  expect(words(el)).toBe('3 of 3 · Porto');
  key(el.querySelector('.trip-present')!, 'Escape');
  const empty = await editor('');
  expect(empty.el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Present"]')!.disabled).toBe(true);
});
