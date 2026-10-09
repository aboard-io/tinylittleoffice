// The Trip editor in a real browser: the stops from the document, legs and the total; names and notes typed into
// cells (a burst one undo); the map (Leaflet, its own chunk; no pictures here) with a pin a stop, a tap adding one;
// the row menu and Alt+arrows moving and deleting; the units, dots and the map in the bar; a place found by name
// (the search stubbed); loose words made the table; and at phone width rows a finger tall, the bar one row, the
// page never wider and never scrolled by typing.
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToTripEditor } from '../editor.ts';
import { parse } from '../../../doc/index.ts';
import { readTrip } from '../model.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const ROUTE = '---\nunits: km\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\nCoimbra | 40.2033 | -8.4103 |\nPorto | 41.1579 | -8.6291 | Port cellars\n';

async function editor(value = ROUTE): Promise<{ el: ToTripEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-trip-editor') as ToTripEditor;
  // No pictures from OpenStreetMap in a test.
  el.tiles = '';
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const settle = async (el: ToTripEditor) => {
  await el.updateComplete;
  await tick(30);
  await el.updateComplete;
};
const stops = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.trip-stop')];
const names = (el: HTMLElement) => stops(el).map((r) => r.querySelector<HTMLInputElement>('.trip-name')!.value);
const pins = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.trip-map .trip-pin')];
const bar = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!;
const mapReady = (el: ToTripEditor) => until(() => !!el.querySelector('.trip-map.leaflet-container'), 8000);
async function pick(el: ToTripEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const undo = async (el: ToTripEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
const typeInto = async (el: ToTripEditor, input: HTMLInputElement, s: string) => {
  input.focus();
  for (const ch of s) {
    input.value += ch;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await el.updateComplete;
  }
  await settle(el);
};
const realFetch = window.fetch;
afterEach(() => {
  window.fetch = realFetch;
});

test('stops from the document: number, name, note, the leg before each, the count and the total', async () => {
  const { el } = await editor();
  expect(names(el)).toEqual(['Lisbon', 'Coimbra', 'Porto']);
  expect(stops(el).map((r) => r.querySelector<HTMLInputElement>('.trip-note')!.value)).toEqual(['Pastel de nata first', '', 'Port cellars']);
  expect(stops(el).map((r) => r.querySelector('.trip-leg')?.textContent ?? '')).toEqual(['', '176 km', '108 km']);
  expect(el.querySelector('.trip-count')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('3 stops · 284 km');
  expect(stops(el)[1].querySelector('.trip-name')!.getAttribute('aria-label')).toBe('Name of stop 2');
  expect(bar(el, 'Join the stops in order').getAttribute('aria-pressed')).toBe('true');
});

test('typing a name writes its cell, a burst one undo; a note to a stop with none', async () => {
  const { el, last } = await editor();
  const name = stops(el)[1].querySelector<HTMLInputElement>('.trip-name')!;
  await typeInto(el, name, ' city');
  expect(last()).toContain('\nCoimbra city | 40.2033 | -8.4103 |\n');
  const note = stops(el)[1].querySelector<HTMLInputElement>('.trip-note')!;
  await typeInto(el, note, 'Library');
  expect(last()).toContain('\nCoimbra city | 40.2033 | -8.4103 | Library\n');
  await undo(el);
  expect(last()).toContain('\nCoimbra city | 40.2033 | -8.4103 |\n');
  await undo(el);
  expect(last()).toBe(ROUTE);
  expect(names(el)[1]).toBe('Coimbra');
});

test('the map: Leaflet arrives, a pin a stop, a tap on the map adds a stop there and its name is asked', async () => {
  const { el, last } = await editor();
  await mapReady(el);
  await until(() => pins(el).length === 3);
  expect(pins(el).map((p) => p.textContent)).toEqual(['1', '2', '3']);
  expect(el.querySelector('.trip-map .leaflet-overlay-pane path')).not.toBeNull();
  // No pictures were asked for.
  expect(el.querySelector('.leaflet-tile')).toBeNull();
  const map = el.querySelector<HTMLElement>('.trip-map')!;
  const box = map.getBoundingClientRect();
  map.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: box.left + 30, clientY: box.top + 30 }));
  await settle(el);
  expect(names(el)).toHaveLength(4);
  const added = readTrip(parse(last()!)).stops[3];
  expect(added.name).toBe('');
  expect(Math.abs(added.lat)).toBeLessThanOrEqual(90);
  expect(Math.abs(added.lon)).toBeLessThanOrEqual(180);
  expect(document.activeElement).toBe(stops(el)[3].querySelector('.trip-name'));
  await until(() => pins(el).length === 4);
  // A tap on a stop's number picks it, and its pin shows it.
  stops(el)[0].querySelector<HTMLButtonElement>('.trip-n')!.click();
  await settle(el);
  await until(() => pins(el)[0].classList.contains('sel'));
  expect(stops(el)[0].classList.contains('sel')).toBe(true);
});


test('the row menu moves and deletes; Alt+arrows move and keep the caret in the stop', async () => {
  const { el, last } = await editor();
  const more = (i: number) => stops(el)[i].querySelector<HTMLButtonElement>('.trip-more')!;
  await pick(el, more(0), 'Move down');
  expect(names(el)).toEqual(['Coimbra', 'Lisbon', 'Porto']);
  await pick(el, more(2), 'Delete stop');
  expect(names(el)).toEqual(['Coimbra', 'Lisbon']);
  expect(last()).not.toContain('Porto');
  const name = stops(el)[1].querySelector<HTMLInputElement>('.trip-name')!;
  name.focus();
  name.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
  await settle(el);
  expect(names(el)).toEqual(['Lisbon', 'Coimbra']);
  expect(document.activeElement).toBe(stops(el)[0].querySelector('.trip-name'));
  await undo(el);
  await undo(el);
  await undo(el);
  expect(last()).toBe(ROUTE);
});

test('the bar: units, dots and the map', async () => {
  const { el, last } = await editor();
  await pick(el, el.querySelector<HTMLButtonElement>('to-menu.trip-units > button')!, 'Miles');
  expect(last()!.startsWith('---\nunits: miles\n---\n')).toBe(true);
  expect(stops(el)[1].querySelector('.trip-leg')!.textContent).toBe('109 mi');
  await pick(el, el.querySelector<HTMLButtonElement>('to-menu.trip-units > button')!, 'Hours of driving');
  expect(last()!.startsWith('Place |')).toBe(true);
  expect(stops(el)[1].querySelector('.trip-leg')!.textContent).toBe('about 2 hr 52 min by car');
  bar(el, 'Join the stops in order').click();
  await settle(el);
  expect(last()!.startsWith('---\nroute: dots\n---\n')).toBe(true);
  expect(el.querySelector('.trip-leg')).toBeNull();
  expect(bar(el, 'Join the stops in order').getAttribute('aria-pressed')).toBe('false');
  bar(el, 'Map').click();
  await settle(el);
  expect(el.querySelector('.trip-map')).toBeNull();
  expect(bar(el, 'Map').getAttribute('aria-pressed')).toBe('false');
  expect(bar(el, 'Show the whole route').disabled).toBe(true);
  bar(el, 'Map').click();
  await settle(el);
  await mapReady(el);
  await until(() => pins(el).length === 3);
});

test('a place by name: the search asks only when tapped, a result is a stop with its name', async () => {
  const asked: string[] = [];
  window.fetch = (async (url: string) => {
    asked.push(String(url));
    return new Response(JSON.stringify([{ name: 'Óbidos', display_name: 'Óbidos, Leiria, Portugal', lat: '39.3606', lon: '-9.1571' }]), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const { el, last } = await editor();
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert > button')!, 'A place by name');
  const dialog = el.querySelector<HTMLDialogElement>('to-dialog.trip-find dialog')!;
  expect(dialog.open).toBe(true);
  const input = dialog.querySelector<HTMLInputElement>('input[type=search]')!;
  expect(document.activeElement).toBe(input);
  input.value = 'Obidos';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(asked).toEqual([]);
  dialog.querySelector<HTMLFormElement>('form')!.requestSubmit();
  await until(() => !!dialog.querySelector('.trip-found button'));
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain('nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=Obidos');
  dialog.querySelector<HTMLButtonElement>('.trip-found button')!.click();
  await settle(el);
  expect(dialog.open).toBe(false);
  expect(names(el)).toEqual(['Lisbon', 'Coimbra', 'Porto', 'Óbidos']);
  expect(last()).toContain('\nÓbidos | 39.3606 | -9.1571 |\n');
});

test('words that say where are made the table as they arrive; one undo takes them back', async () => {
  const { el, last } = await editor('38.7223, -9.1393, Lisbon | Pastel de nata first\n\n- Porto (41.1579, -8.6291)\n');
  expect(last()).toBe('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\nPorto | 41.1579 | -8.6291 |\n');
  expect(names(el)).toEqual(['Lisbon', 'Porto']);
  await undo(el);
  expect(last()).toBe('38.7223, -9.1393, Lisbon | Pastel de nata first\n\n- Porto (41.1579, -8.6291)\n');
});

test('an empty trip asks for a tap or a name; the first stop is the table', async () => {
  const { el, last } = await editor('');
  expect(el.querySelector('.trip-empty')!.textContent).toContain('Tap the map');
  await mapReady(el);
  const map = el.querySelector<HTMLElement>('.trip-map')!;
  const box = map.getBoundingClientRect();
  map.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 }));
  await settle(el);
  expect(last()!.startsWith('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\n| | ')).toBe(true);
  expect(stops(el)).toHaveLength(1);
});

test('at phone width: rows a finger tall, 16px inputs, the bar one row, the page never wider and never scrolled', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    await mapReady(el);
    for (const r of stops(el)) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const b of el.querySelectorAll<HTMLElement>('.trip-n, .trip-more')) {
      const box = b.getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    for (const i of el.querySelectorAll<HTMLInputElement>('.trip-fields input')) expect(parseFloat(getComputedStyle(i).fontSize)).toBeGreaterThanOrEqual(16);
    const barEl = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...barEl.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    // The map above the list, the full width.
    const map = el.querySelector<HTMLElement>('.trip-map')!.getBoundingClientRect();
    expect(map.bottom).toBeLessThanOrEqual(stops(el)[0].getBoundingClientRect().top);
    expect(map.width).toBeGreaterThan(300);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await typeInto(el, stops(el)[0].querySelector<HTMLInputElement>('.trip-note')!, ' now');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});
