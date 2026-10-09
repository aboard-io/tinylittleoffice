// The Trip editor in a real browser: the stops from the document, legs and the total; names and notes typed into
// cells through one-line <to-text>s (a burst one undo, the caret back with it); the map (Leaflet, its own chunk; no
// pictures here) with a pin a stop, a tap adding one after the stop in hand and a double tap adding none; a focused
// pin nudged and deleted by keys; the words' keys (Enter, Backspace, Up/Down, Alt+Up/Down, Mod+D); stops chosen whole
// by the kit's rows (Escape, Shift+arrows, a tap on the number, Select All twice) with the bar under them, the
// clipboard and a drag by the number; the units, dots and the map in the bar; a place found by name (the search
// stubbed); loose words made the table; and at phone width rows a finger tall, the page never wider nor scrolled.
import { afterEach, expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToTripEditor } from '../editor.ts';
import { parse } from '../../../doc/index.ts';
import { caret } from '../../../kit/textops.ts';
import type { ToText } from '../../../kit/text.ts';
import { readTrip } from '../model.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const ROUTE = '---\nunits: km\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\nCoimbra | 40.2033 | -8.4103 |\nPorto | 41.1579 | -8.6291 | Port cellars\n';
const TABLE = (rows: string) => `---\nunits: km\n---\nPlace | Lat:number | Lon:number | Note\n--- | --- | --- | ---\n${rows}`;
const L = 'Lisbon | 38.7223 | -9.1393 | Pastel de nata first\n';
const C = 'Coimbra | 40.2033 | -8.4103 |\n';
const P = 'Porto | 41.1579 | -8.6291 | Port cellars\n';

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
const box = (el: HTMLElement, i: number, field: 'name' | 'note' = 'name') => stops(el)[i].querySelector<ToText>(`to-text.trip-${field}`)!;
const said = (x: ToText) => x.tx.textContent!.trim();
const names = (el: HTMLElement) => stops(el).map((_, i) => said(box(el, i)));
const pins = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.trip-map .trip-pin')];
const bar = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!;
const list = (el: HTMLElement) => el.querySelector<HTMLElement>('.trip-stops')!;
const ranged = (el: HTMLElement) => stops(el).flatMap((r, i) => (r.classList.contains('ranged') ? [i] : []));
const num = (el: HTMLElement, i: number) => stops(el)[i].querySelector<HTMLElement>('.trip-n')!;
const contextButton = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.trip-context button[aria-label="${label}"]`)!;
const mapReady = (el: ToTripEditor) => until(() => !!el.querySelector('.trip-map.leaflet-container'), 8000);
const key = (on: HTMLElement, k: string, o: KeyboardEventInit = {}) => on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o }));
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function caretIn(el: ToTripEditor, i: number, field: 'name' | 'note', at = 99) {
  const x = box(el, i, field);
  await x.updateComplete;
  x.sel = caret(0, Math.min(at, said(x).length));
  await x.updateComplete;
  await tick();
}
async function type(el: ToTripEditor, i: number, field: 'name' | 'note', s: string) {
  for (const ch of s) {
    input(box(el, i, field), 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
  await settle(el);
}
const offset = (el: HTMLElement, i: number, field: 'name' | 'note') => box(el, i, field).sel?.focus.offset;
async function pick(el: ToTripEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
async function tapNumber(el: ToTripEditor, i: number, o: PointerEventInit = {}) {
  const g = num(el, i);
  const r = g.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup']) g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, isPrimary: true, button: 0, pointerType: 'mouse', clientX: r.left + 3, clientY: r.top + 3, ...o }));
  g.click();
  await settle(el);
}
async function clip(el: ToTripEditor, type: 'copy' | 'cut' | 'paste', on: HTMLElement, data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await settle(el);
  return dt;
}
const undo = async (el: ToTripEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
const tapMap = (el: HTMLElement, x: number, y: number, type = 'click') => {
  const map = el.querySelector<HTMLElement>('.trip-map')!;
  const b = map.getBoundingClientRect();
  map.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: b.left + x, clientY: b.top + y }));
};
const realFetch = window.fetch;
afterEach(() => {
  window.fetch = realFetch;
});

test('stops from the document: number, name, note, the leg before each, the count and the total', async () => {
  const { el } = await editor();
  expect(names(el)).toEqual(['Lisbon', 'Coimbra', 'Porto']);
  expect(stops(el).map((_, i) => said(box(el, i, 'note')))).toEqual(['Pastel de nata first', '', 'Port cellars']);
  expect(stops(el).map((r) => r.querySelector('.trip-leg')?.textContent ?? '')).toEqual(['', '176 km', '108 km']);
  expect(el.querySelector('.trip-count')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('3 stops · 284 km');
  expect(box(el, 1).tx.getAttribute('aria-label')).toBe('Name of stop 2');
  expect(bar(el, 'Join the stops in order').getAttribute('aria-pressed')).toBe('true');
});

test('typing a name writes its cell, a burst one undo, and the undo puts the caret back where the typing began', async () => {
  const { el, last } = await editor();
  await caretIn(el, 1, 'name', 3);
  await type(el, 1, 'name', 'XY');
  expect(last()).toContain('\nCoiXYmbra | 40.2033 | -8.4103 |\n');
  // A space typed at the end stays in the words while the table trims it, and the next letter is after it.
  await caretIn(el, 1, 'note');
  await type(el, 1, 'note', 'Old library');
  expect(last()).toContain('\nCoiXYmbra | 40.2033 | -8.4103 | Old library\n');
  expect(said(box(el, 1, 'note'))).toBe('Old library');
  await caretIn(el, 0, 'name');
  await undo(el);
  expect(last()).toContain('\nCoiXYmbra | 40.2033 | -8.4103 |\n');
  expect(document.activeElement).toBe(box(el, 1, 'note').tx);
  expect(offset(el, 1, 'note')).toBe(0);
  await undo(el);
  expect(last()).toBe(ROUTE);
  expect(names(el)[1]).toBe('Coimbra');
  expect(document.activeElement).toBe(box(el, 1).tx);
  expect(offset(el, 1, 'name')).toBe(3);
});

test('the map: Leaflet arrives, a pin a stop (a finger wide), a tap adds a stop after the one in hand, a double tap adds none', async () => {
  const { el, last } = await editor();
  await mapReady(el);
  await until(() => pins(el).length === 3);
  expect(pins(el).map((p) => p.textContent)).toEqual(['1', '2', '3']);
  expect(Math.min(pins(el)[0].offsetWidth, pins(el)[0].offsetHeight)).toBeGreaterThanOrEqual(44);
  expect(el.querySelector('.trip-map .leaflet-overlay-pane path')).not.toBeNull();
  // No pictures were asked for.
  expect(el.querySelector('.leaflet-tile')).toBeNull();
  // Nothing in hand: the route's end.
  tapMap(el, 30, 30);
  await until(() => names(el).length === 4);
  await settle(el);
  const added = readTrip(parse(last()!)).stops[3];
  expect(added.name).toBe('');
  expect(Math.abs(added.lat)).toBeLessThanOrEqual(90);
  expect(document.activeElement).toBe(box(el, 3).tx);
  // The first stop in hand: the next tap's stop comes after it.
  await caretIn(el, 0, 'name');
  tapMap(el, 60, 60);
  await until(() => names(el).length === 5);
  await settle(el);
  expect(names(el)).toEqual(['Lisbon', '', 'Coimbra', 'Porto', '']);
  expect(document.activeElement).toBe(box(el, 1).tx);
  // A double tap zooms, and adds nothing.
  const n = el.value;
  tapMap(el, 90, 90);
  tapMap(el, 90, 90);
  tapMap(el, 90, 90, 'dblclick');
  await tick(450);
  await settle(el);
  expect(el.value).toBe(n);
  await until(() => pins(el).length === 5);
});

test('a tap on a pin chooses its stop; a focused pin is nudged by the arrows (one undo) and Delete takes its stop away', async () => {
  const { el, last } = await editor();
  await mapReady(el);
  await until(() => pins(el).length === 3);
  pins(el)[1].click();
  await settle(el);
  expect(ranged(el)).toEqual([1]);
  await until(() => pins(el)[1].classList.contains('sel'));
  pins(el)[2].focus();
  key(pins(el)[2], 'ArrowRight');
  await settle(el);
  await until(() => document.activeElement === pins(el)[2]);
  key(pins(el)[2], 'ArrowUp', { shiftKey: true });
  await settle(el);
  const moved = readTrip(parse(last()!)).stops[2];
  expect(moved.lon).toBeGreaterThan(-8.6291);
  expect(moved.lat).toBeGreaterThan(41.1579);
  // The burst is one step back.
  await undo(el);
  expect(last()).toBe(ROUTE);
  await until(() => pins(el).length === 3);
  pins(el)[2].focus();
  key(pins(el)[2], 'Delete');
  await settle(el);
  expect(names(el)).toEqual(['Lisbon', 'Coimbra']);
  expect(document.activeElement).toBe(box(el, 1).tx);
});

test('Enter in the name goes to the note, Enter in the note asks for the next stop by name; Backspace in an empty stop takes it away', async () => {
  window.fetch = (async () => new Response(JSON.stringify([{ name: 'Óbidos', display_name: 'Óbidos, Portugal', lat: '39.3606', lon: '-9.1571' }]))) as typeof fetch;
  const { el } = await editor();
  await caretIn(el, 0, 'name');
  input(box(el, 0), 'insertParagraph');
  await settle(el);
  expect(document.activeElement).toBe(box(el, 0, 'note').tx);
  input(box(el, 0, 'note'), 'insertParagraph');
  await settle(el);
  const dialog = el.querySelector<HTMLDialogElement>('to-dialog.trip-find dialog')!;
  expect(dialog.open).toBe(true);
  const q = dialog.querySelector<HTMLInputElement>('input[type=search]')!;
  q.value = 'Obidos';
  q.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  dialog.querySelector<HTMLFormElement>('form')!.requestSubmit();
  await until(() => !!dialog.querySelector('.trip-found button'));
  dialog.querySelector<HTMLButtonElement>('.trip-found button')!.click();
  await settle(el);
  // After the stop Enter was pressed in.
  expect(names(el)).toEqual(['Lisbon', 'Óbidos', 'Coimbra', 'Porto']);
  // An empty stop goes on Backspace, the caret to the end of the note above.
  const { el: e2, last: last2 } = await editor(TABLE(L + '| | 39 | -9 |\n' + P));
  await caretIn(e2, 1, 'name');
  input(box(e2, 1), 'deleteContentBackward');
  await settle(e2);
  expect(last2()).toBe(TABLE(L + P));
  expect(document.activeElement).toBe(box(e2, 0, 'note').tx);
  expect(offset(e2, 0, 'note')).toBe('Pastel de nata first'.length);
  // A stop with words stays; Backspace at the start of a note goes back to the name.
  await caretIn(e2, 1, 'note', 0);
  input(box(e2, 1, 'note'), 'deleteContentBackward');
  await settle(e2);
  expect(document.activeElement).toBe(box(e2, 1).tx);
  expect(last2()).toBe(TABLE(L + P));
});

test('Up/Down go from stop to stop in the same field; Alt+Up/Down move the stop and Mod+D duplicates it, the caret kept', async () => {
  const { el, last } = await editor();
  await caretIn(el, 0, 'note', 3);
  key(box(el, 0, 'note').tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(box(el, 1, 'note').tx);
  await caretIn(el, 1, 'name', 2);
  key(box(el, 1).tx, 'ArrowUp');
  await settle(el);
  expect(document.activeElement).toBe(box(el, 0).tx);
  expect(offset(el, 0, 'name')).toBe(2);
  key(box(el, 0).tx, 'ArrowDown', { altKey: true });
  await settle(el);
  expect(names(el)).toEqual(['Coimbra', 'Lisbon', 'Porto']);
  expect(document.activeElement).toBe(box(el, 1).tx);
  expect(offset(el, 1, 'name')).toBe(2);
  key(box(el, 1).tx, 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe(TABLE(C + L + L + P));
  expect(document.activeElement).toBe(box(el, 2).tx);
  expect(offset(el, 2, 'name')).toBe(2);
  await undo(el);
  await undo(el);
  expect(last()).toBe(ROUTE);
});

test('Escape in the words chooses the stop; Shift+Down extends; Delete takes them away and undo chooses them again', async () => {
  const { el, last } = await editor();
  await caretIn(el, 0, 'name');
  key(box(el, 0).tx, 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual([0]);
  expect(document.activeElement).toBe(list(el));
  // Typing a letter with a stop chosen does nothing to it.
  key(list(el), 'x');
  key(list(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1]);
  expect(num(el, 1).getAttribute('aria-pressed')).toBe('true');
  key(list(el), 'Delete');
  await settle(el);
  expect(last()).toBe(TABLE(P));
  expect(document.activeElement).toBe(box(el, 0).tx);
  await undo(el);
  expect(last()).toBe(ROUTE);
  expect(ranged(el)).toEqual([0, 1]);
  expect(document.activeElement).toBe(list(el));
  // Escape again: the caret back in the words.
  key(list(el), 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual([]);
  expect(document.activeElement).toBe(box(el, 1).tx);
  // Shift+Up from the words chooses too; Alt+Down moves the chosen and Mod+D duplicates them, the range kept.
  key(box(el, 1).tx, 'ArrowUp', { shiftKey: true });
  await settle(el);
  key(list(el), 'ArrowUp', { shiftKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1]);
  key(list(el), 'ArrowDown', { altKey: true });
  await settle(el);
  expect(last()).toBe(TABLE(P + L + C));
  expect(ranged(el)).toEqual([1, 2]);
  key(list(el), 'd', { metaKey: true });
  await settle(el);
  expect(last()).toBe(TABLE(P + L + C + L + C));
  expect(ranged(el)).toEqual([3, 4]);
});

test('Select All in the words twice takes every stop', async () => {
  const { el } = await editor();
  const x = box(el, 0);
  x.focus();
  x.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 6 } };
  await settle(el);
  key(x.tx, 'a', { ctrlKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1, 2]);
});

test('a tap on the number chooses the stop with the bar under it in the standard order; Shift+tap extends; the bar duplicates and deletes', async () => {
  const { el, last } = await editor();
  await tapNumber(el, 0);
  expect(ranged(el)).toEqual([0]);
  const ctx = el.querySelector('.trip-context .to-context')!;
  expect(ctx.matches(':popover-open')).toBe(true);
  expect([...ctx.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Edit', 'Move up', 'Move down', 'Show on the map', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  await tapNumber(el, 1, { shiftKey: true });
  expect(ranged(el)).toEqual([0, 1]);
  contextButton(el, 'Duplicate').click();
  await settle(el);
  expect(last()).toBe(TABLE(L + C + L + C + P));
  contextButton(el, 'Delete').click();
  await settle(el);
  expect(last()).toBe(ROUTE);
  await tapNumber(el, 2);
  contextButton(el, 'Edit').click();
  await settle(el);
  expect(document.activeElement).toBe(box(el, 2).tx);
  // The last stop deleted: the focus goes to Insert, never to the page.
  const { el: one } = await editor(TABLE(P));
  await tapNumber(one, 0);
  key(list(one), 'Backspace');
  await settle(one);
  expect(stops(one)).toHaveLength(0);
  expect(document.activeElement).toBe(one.querySelector('to-insert button'));
});

test('Mod+C/X/V on chosen stops: a table as TLO and our HTML out, stops back in place of the chosen; places pasted in words are stops after it', async () => {
  const { el, last } = await editor();
  await tapNumber(el, 0);
  const out = await clip(el, 'copy', list(el));
  expect(out.getData('text/plain')).toBe('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Pastel de nata first\n');
  expect(out.getData('text/html')).toContain('content="TinyLittleOffice"');
  expect(out.getData('text/html')).toContain('<table');
  await tapNumber(el, 1);
  const cut = await clip(el, 'cut', list(el));
  expect(cut.getData('text/plain')).toContain('\nCoimbra | 40.2033 | -8.4103 |\n');
  expect(last()).toBe(TABLE(L + P));
  await tapNumber(el, 1);
  await clip(el, 'paste', list(el), { 'text/plain': out.getData('text/plain'), 'text/html': out.getData('text/html') });
  expect(last()).toBe(TABLE(L + L));
  // Places pasted into a stop's words are stops after it, the caret at the end of the last one's name.
  await caretIn(el, 0, 'name');
  await clip(el, 'paste', box(el, 0).tx, { 'text/plain': cut.getData('text/plain'), 'text/html': cut.getData('text/html') });
  expect(last()).toBe(TABLE(L + C + L));
  expect(document.activeElement).toBe(box(el, 1).tx);
  // Lines that say where, from elsewhere, too.
  await clip(el, 'paste', box(el, 1).tx, { 'text/plain': 'Porto (41.1579, -8.6291) Port cellars\n' });
  expect(last()).toBe(TABLE(L + C + P + L));
  // Words alone are the stop's own.
  await caretIn(el, 3, 'note');
  await clip(el, 'paste', box(el, 3, 'note').tx, { 'text/plain': ' too' });
  expect(last()).toContain('\nLisbon | 38.7223 | -9.1393 | Pastel de nata first too\n');
});

test('a drag by the number (pointer events) moves the stop after another, with the target drawn; the number alone takes the drag', async () => {
  const { el, last } = await editor();
  const g = num(el, 0);
  const h = g.getBoundingClientRect();
  const c = stops(el)[2].getBoundingClientRect();
  const at = (type: string, x: number, y: number) => g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', c.left + 100, c.top + c.height / 2);
  await el.updateComplete;
  expect(el.rows.drag).toMatchObject({ id: 0, over: 2, how: 'after' });
  expect(stops(el)[0].classList.contains('dragging')).toBe(true);
  expect(document.querySelector<HTMLElement>('.to-rows-target')!.hidden).toBe(false);
  at('pointerup', c.left + 100, c.top + c.height / 2);
  await settle(el);
  expect(last()).toBe(TABLE(C + P + L));
  expect(document.activeElement).toBe(box(el, 2).tx);
  expect(getComputedStyle(num(el, 0)).touchAction).toBe('none');
  expect(getComputedStyle(list(el)).touchAction).toBe('manipulation');
  expect(getComputedStyle(stops(el)[0]).touchAction).not.toBe('none');
});

test('the bar: units, dots and the map; it ends with Undo and Redo; Insert puts a stop after the one in hand', async () => {
  const { el, last } = await editor();
  const tools = [...el.querySelectorAll<HTMLElement>('to-bar > *')].filter((x) => x.offsetWidth > 0);
  expect(tools.slice(-2).map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo']);
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
  await mapReady(el);
  await caretIn(el, 0, 'note');
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert > button')!, 'A stop at the middle of the map');
  expect(names(el)).toEqual(['Lisbon', '', 'Coimbra', 'Porto']);
  expect(document.activeElement).toBe(box(el, 1).tx);
  bar(el, 'Map').click();
  await settle(el);
  expect(el.querySelector('.trip-map')).toBeNull();
  expect(bar(el, 'Map').getAttribute('aria-pressed')).toBe('false');
  expect(bar(el, 'Show the whole route').disabled).toBe(true);
  bar(el, 'Map').click();
  await settle(el);
  await mapReady(el);
  await until(() => pins(el).length === 4);
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
  const q = dialog.querySelector<HTMLInputElement>('input[type=search]')!;
  expect(document.activeElement).toBe(q);
  q.value = 'Obidos';
  q.dispatchEvent(new Event('input', { bubbles: true }));
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
  const b = map.getBoundingClientRect();
  tapMap(el, b.width / 2, b.height / 2);
  await until(() => stops(el).length === 1);
  await settle(el);
  expect(last()!.startsWith('Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\n| | ')).toBe(true);
});

test('at phone width: rows a finger tall, 16px words, the bar one row, the page never wider and never scrolled', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    await mapReady(el);
    for (const r of stops(el)) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const b of el.querySelectorAll<HTMLElement>('.trip-n')) {
      const r = b.getBoundingClientRect();
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    }
    for (const x of el.querySelectorAll<HTMLElement>('.trip-fields .tx')) expect(parseFloat(getComputedStyle(x).fontSize)).toBeGreaterThanOrEqual(16);
    const barEl = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...barEl.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    // The map above the list, the full width.
    const map = el.querySelector<HTMLElement>('.trip-map')!.getBoundingClientRect();
    expect(map.bottom).toBeLessThanOrEqual(stops(el)[0].getBoundingClientRect().top);
    expect(map.width).toBeGreaterThan(300);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await caretIn(el, 0, 'note');
    await type(el, 0, 'note', ' now');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

/** The browser's geolocation faked: each ask recorded, answered by `answer` (a position, a refusal, or never). */
function fakeGeo(answer: { lat: number; lon: number } | 'refuse' | 'never') {
  const asks: PositionOptions[] = [];
  const geo = {
    getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback | null, o?: PositionOptions) {
      asks.push(o ?? {});
      setTimeout(() => {
        if (answer === 'never') return;
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
  return { asks, restore: () => delete (navigator as { geolocation?: unknown }).geolocation };
}
type MapLike = { getCenter(): { lat: number; lng: number }; getZoom(): number };
const mapOf = (el: ToTripEditor) => (el as unknown as { map: MapLike | null }).map!;

test('a trip with no stops opens on where the device is: asked once, 5 s at most, the map centred there at a city’s zoom; nothing written', async () => {
  const geo = fakeGeo({ lat: 51.5072, lon: -0.1276 });
  try {
    const { el, changes } = await editor('');
    await mapReady(el);
    await until(() => Math.abs(mapOf(el).getCenter().lat - 51.5072) < 0.01, 3000);
    expect(mapOf(el).getCenter().lng).toBeCloseTo(-0.1276, 2);
    expect(mapOf(el).getZoom()).toBe(12);
    expect(geo.asks).toHaveLength(1);
    expect(geo.asks[0].timeout).toBe(5000);
    expect(changes).toEqual([]);
    expect(el.querySelector('.trip-privacy')!.textContent).toContain('Your location is asked for only to centre the map, and is never written anywhere.');
    // The map off and on again: not asked a second time.
    bar(el, 'Map').click();
    await settle(el);
    bar(el, 'Map').click();
    await settle(el);
    await mapReady(el);
    await tick(50);
    expect(geo.asks).toHaveLength(1);
  } finally {
    geo.restore();
  }
});

test('the location refused, or a trip with stops: the map stays where it was (the world, or fitted to the stops)', async () => {
  const refused = fakeGeo('refuse');
  try {
    const { el } = await editor('');
    await mapReady(el);
    await tick(80);
    expect(refused.asks).toHaveLength(1);
    expect(mapOf(el).getZoom()).toBe(2);
    expect(mapOf(el).getCenter().lat).toBeCloseTo(25, 0);
  } finally {
    refused.restore();
  }
  const withStops = fakeGeo({ lat: 51.5072, lon: -0.1276 });
  try {
    const { el } = await editor();
    await mapReady(el);
    await tick(80);
    expect(withStops.asks).toHaveLength(0);
    // Fitted to Lisbon, Coimbra and Porto.
    expect(mapOf(el).getCenter().lat).toBeGreaterThan(38);
    expect(mapOf(el).getCenter().lat).toBeLessThan(42);
    expect(el.querySelector('.trip-privacy')!.textContent).not.toContain('location');
  } finally {
    withStops.restore();
  }
});
