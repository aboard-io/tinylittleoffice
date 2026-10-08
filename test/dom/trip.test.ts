// Trip: a route of stops, found by searching, with notes, measured as you like (ported from e2e/apps.spec.ts; the map
// itself, its tiles, pins and the taps that add stops on it, is Leaflet laid out in a real browser and stays there).
import { test, expect, vi, afterEach } from 'vitest';
import { settle, type, button, press, setSl } from './helpers.ts';
import { shell, reopen, editorOf, settleAll, until, bodyOf } from './helpers-apps.ts';
import { parseTrip, serializeTrip } from '../../src/lib/tripmodel.ts';

afterEach(() => void vi.restoreAllMocks());

const stops = () => [...editorOf('trip').querySelectorAll('.trip-stops li:not(.to-empty)')];
const field = (label: string) => editorOf('trip').querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
const hint = () => editorOf('trip').querySelector('.to-toolbar .to-hint')!.textContent!.replace(/\s+/g, ' ');

test('trip: a search adds a named stop, with a note', async () => {
  // A canned place search, as Nominatim answers.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json([{ name: 'Lisbon', display_name: 'Lisbon, Portugal', lat: '38.7077507', lon: '-9.1365919' }]));
  await shell('#/v0/trip');
  const el = editorOf('trip');
  const search = el.querySelector('sl-input.trip-search')!;
  setSl(search, 'Lisbon', 'sl-input');
  press(search, 'Enter');
  await until(() => expect(el.querySelector('[aria-label="Places found"] button')?.textContent).toContain('Lisbon'));
  el.querySelector<HTMLElement>('[aria-label="Places found"] button')!.click();
  await settle(el);
  expect(stops()).toHaveLength(1);
  expect(field('Name of stop 1').value).toBe('Lisbon');
  type(field('Note for stop 1'), 'Pastel de nata first');
  await settleAll();
  expect(parseTrip(bodyOf())).toMatchObject([{ name: 'Lisbon', note: 'Pastel de nata first', lat: 38.70775, lon: -9.13659 }]);
});

test('trip: legs in hours, miles or kilometres, remembered in the link; stops moved and taken away', async () => {
  const route = serializeTrip([
    { lat: 38.70775, lon: -9.13659, name: 'Lisbon', note: 'Pastel de nata first' },
    { lat: 41.1496, lon: -8.611, name: 'Second stop', note: '' },
    { lat: 40.2033, lon: -8.4103, name: 'Coimbra', note: '' },
  ]);
  await shell({ app: 'trip', body: route });
  // Hours by default (a driving estimate); miles or kilometres on request, remembered in the link.
  expect(hint()).toMatch(/3 stops · \d+ (h|min)/);
  expect(stops()[1].querySelector('.leg')!.textContent).toMatch(/≈ \d+ (h|min).* drive/);
  setSl(editorOf('trip').querySelector('sl-select.trip-units'), 'm');
  await settleAll();
  expect(stops()[1].querySelector('.leg')!.textContent).toMatch(/^[\d.,]+ (mi|ft)$/);
  setSl(editorOf('trip').querySelector('sl-select.trip-units'), 'k');
  await settleAll();
  expect(hint()).toMatch(/3 stops · [\d.,]+ k?m/);
  expect(bodyOf()).toMatch(/^!k\n/);

  await reopen();
  expect(stops()).toHaveLength(3);
  expect(hint()).toMatch(/3 stops · [\d.,]+ k?m/);
  expect(field('Name of stop 2').value).toBe('Second stop');
  expect(field('Note for stop 1').value).toBe('Pastel de nata first');
  expect(document.title).toBe('Lisbon to Coimbra · TinyLittleOffice');

  button(editorOf('trip'), 'Move stop 3 earlier').click();
  await settleAll();
  expect(field('Name of stop 3').value).toBe('Second stop');
  button(editorOf('trip'), 'Delete stop 1').click();
  await settleAll();
  expect(stops()).toHaveLength(2);
  expect(parseTrip(bodyOf()).map((s) => s.name)).toEqual(['Coimbra', 'Second stop']);
});
