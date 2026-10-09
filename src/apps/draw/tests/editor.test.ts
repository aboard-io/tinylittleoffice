// The Draw editor in a real browser: a tool and a tap make a shape, the keys move and remove it, the label is typed
// over it, alt text is kept, pixel mode paints a grid that can become the background, undo takes it back, and at
// phone width the bar is one row and nothing is wider than the screen.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToDrawEditor } from '../editor.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

const DRAWING = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\no | 32 | 6 | 16 | 8 | 1b | Server\nk | 0 | 1 | 0 | 0 | 0 | asks\n';

async function editor(value = ''): Promise<{ el: ToDrawEditor; last: () => string | undefined; changes: string[] }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-draw-editor') as ToDrawEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const byWords = (el: HTMLElement, words: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.includes(words))!;
const canvas = (el: HTMLElement) => el.querySelector<SVGSVGElement>('svg.draw-canvas')!;
/** A pointer put down and lifted at a point of the canvas, in canvas units (640 by 400): on whatever is drawn there, as a real pointer lands. */
async function tap(el: ToDrawEditor, x: number, y: number, to?: [number, number]) {
  const svg = canvas(el);
  const b = svg.getBoundingClientRect();
  const at = (cx: number, cy: number) => ({ clientX: b.left + (cx / 640) * b.width, clientY: b.top + (cy / 400) * b.height, button: 0, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true });
  const down = at(x, y);
  const under = document.elementFromPoint(down.clientX, down.clientY);
  (under && svg.contains(under) ? under : svg).dispatchEvent(new PointerEvent('pointerdown', down));
  if (to) svg.dispatchEvent(new PointerEvent('pointermove', at(to[0], to[1])));
  svg.dispatchEvent(new PointerEvent('pointerup', { ...at(...(to ?? [x, y])), buttons: 0 }));
  await el.updateComplete;
}
async function pick(el: ToDrawEditor, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}
const key = (el: HTMLElement, k: string, more: KeyboardEventInit = {}) => el.querySelector<HTMLElement>('.draw-wrap')!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...more }));

test('a tool and a tap make a shape of the default size; a drag draws one; the keys nudge and delete; undo takes it back', async () => {
  const { el, last, changes } = await editor();
  expect(button(el, 'Select').getAttribute('aria-pressed')).toBe('true');
  button(el, 'Rectangle').click();
  await el.updateComplete;
  expect(button(el, 'Rectangle').getAttribute('aria-pressed')).toBe('true');
  await tap(el, 100, 100);
  expect(last()).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 13 | 13 | 12 | 6 | 0 |\n');
  // The new shape is selected and the select tool is back; the handle is drawn.
  expect(button(el, 'Select').getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('svg.draw-canvas .handle')).not.toBeNull();
  key(el, 'ArrowRight');
  await el.updateComplete;
  expect(last()).toContain('\nr | 14 | 13 | 12 | 6 | 0 |\n');
  // E then a drag: an ellipse the size of the drag.
  key(el, 'e');
  await el.updateComplete;
  await tap(el, 300, 200, [400, 280]);
  expect(last()).toContain('\ne | 38 | 25 | 12 | 10 | 0 |\n');
  expect(changes).toHaveLength(3);
  key(el, 'Delete');
  await el.updateComplete;
  expect(last()!.split('\n').filter((l) => /^[a-z] \|/.test(l))).toHaveLength(1);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('\ne | 38 | 25 | 12 | 10 | 0 |\n');
});

test('tapping a shape selects it; a drag moves it; Enter opens the label over it and typing writes it; the colour menu writes the style', async () => {
  const { el, last } = await editor(DRAWING);
  await tap(el, 96, 80);
  expect(el.querySelector('svg.draw-canvas .handle')).not.toBeNull();
  await tap(el, 96, 80, [96 + 64, 80 + 32]);
  expect(last()).toContain('\no | 12 | 10 | 16 | 8 | 1b | Browser\n');
  key(el, 'Enter');
  await el.updateComplete;
  const pop = el.querySelector<HTMLElement>('.draw-label-pop')!;
  await until(() => pop.matches(':popover-open'));
  const input = pop.querySelector<HTMLInputElement>('input')!;
  expect(input.value).toBe('Browser');
  input.value = 'Client';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  expect(last()).toContain('| Client\n');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await until(() => !pop.matches(':popover-open'));
  expect(document.activeElement).toBe(el.querySelector('.draw-wrap'));
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-colour button')!, 'Green');
  expect(last()).toContain('| 1g | Client\n');
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-style button')!, 'Solid');
  expect(last()).toContain('| 2g | Client\n');
  // Already at the back, Send to back writes nothing; Bring to front moves the row to the end and the join follows.
  const n = last()!;
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-arrange button')!, 'Send to back');
  expect(last()).toBe(n);
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-arrange button')!, 'Bring to front');
  expect(last()!.split('\n').slice(2)).toEqual(['o | 32 | 6 | 16 | 8 | 1b | Server', 'k | 2 | 0 | 0 | 0 | 0 | asks', 'o | 12 | 10 | 16 | 8 | 2g | Client', '']);
});

test('Insert places a shape in the middle; the alt dialog asks until written and saves on Done', async () => {
  const { el, last, changes } = await editor(DRAWING);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Cylinder');
  expect(last()).toContain('\nc | 40 | 28 | 12 | 6 | 0 |\n');
  const alt = el.querySelector<HTMLButtonElement>('.draw-alt')!;
  expect(alt.getAttribute('aria-label')).toMatch(/^Add alt text/);
  alt.click();
  await until(() => !!el.querySelector('dialog[open]'));
  const box = el.querySelector<HTMLTextAreaElement>('.draw-alt-dialog textarea')!;
  expect(box.placeholder).toBe('A drawing of Browser, Server. Browser leads to Server (asks).');
  box.value = 'A browser asks a server for a page.';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  const n = changes.length;
  el.querySelector<HTMLButtonElement>('.draw-alt-done')!.click();
  await until(() => !el.querySelector('dialog[open]'));
  expect(changes).toHaveLength(n + 1);
  expect(last()!.startsWith('---\nalt: A browser asks a server for a page.\n---\n')).toBe(true);
  expect(el.querySelector('.draw-alt')!.getAttribute('aria-label')).toBe('Alt text: A browser asks a server for a page.');
});

test('pixel mode: the menu sets the grid, taps paint squares, fill floods, Use as background writes the tile and goes back to shapes', async () => {
  const { el, last } = await editor();
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-mode button')!, '8 by 8');
  expect(last()).toBe('---\ngrid: 8\n---\n');
  const grid = el.querySelector<SVGSVGElement>('svg.draw-pixels')!;
  const b = grid.getBoundingClientRect();
  const at = (x: number, y: number) => ({ clientX: b.left + ((x + 0.5) / 8) * b.width, clientY: b.top + ((y + 0.5) / 8) * b.height, button: 0, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true });
  button(el, 'Red').click();
  await el.updateComplete;
  grid.dispatchEvent(new PointerEvent('pointerdown', at(0, 0)));
  grid.dispatchEvent(new PointerEvent('pointermove', at(1, 0)));
  grid.dispatchEvent(new PointerEvent('pointerup', { ...at(1, 0), buttons: 0 }));
  await el.updateComplete;
  expect(last()).toBe('---\ngrid: 8\n---\ncc\n');
  // The keyboard: arrows move the cursor, Enter paints.
  key(el, 'ArrowDown');
  key(el, 'Enter');
  await el.updateComplete;
  expect(last()).toBe('---\ngrid: 8\n---\ncc\nc\n');
  button(el, 'Sky').click();
  button(el, 'Fill').click();
  await el.updateComplete;
  expect(button(el, 'Sky').getAttribute('aria-pressed')).toBe('true');
  grid.dispatchEvent(new PointerEvent('pointerdown', at(7, 7)));
  grid.dispatchEvent(new PointerEvent('pointerup', { ...at(7, 7), buttons: 0 }));
  await el.updateComplete;
  expect(last()!.split('\n')[3]).toBe('ccgggggg');
  expect(last()!.split('\n')[4]).toBe('cggggggg');
  button(el, 'Eraser').click();
  await el.updateComplete;
  expect(button(el, 'Fill').getAttribute('aria-pressed')).toBe('true');
  button(el, 'Pencil').click();
  await el.updateComplete;
  expect(button(el, 'Eraser').getAttribute('aria-pressed')).toBe('false');
  expect(button(el, 'Black').getAttribute('aria-pressed')).toBe('true');
  const n = last()!;
  el.querySelector<HTMLButtonElement>('.draw-bar button:has(> span.to-swatch)')!.click();
  await el.updateComplete;
  expect(last()).toBe(n);
  byWords(el, 'Use as background').click();
  await el.updateComplete;
  const doc = last()!;
  expect(doc.startsWith('---\ntile: 8:ccgggggg/cggggggg/gggggggg/gggggggg/gggggggg/gggggggg/gggggggg/gggggggg\n---\n')).toBe(true);
  expect(doc).not.toContain('grid:');
  // Back in shapes mode, the tile is drawn behind the canvas, and the mode menu can take it away.
  expect(el.querySelector('svg.draw-canvas pattern#draw-tile')).not.toBeNull();
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-mode button')!, 'Remove the background');
  expect(last()).not.toContain('tile:');
});

test('at phone width: the bar is one row of 44px buttons, the label input is 16px, nothing is wider than the screen', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(DRAWING);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await tap(el, 96, 80);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(parseFloat(getComputedStyle(el.querySelector('.draw-label')!).fontSize)).toBeGreaterThanOrEqual(16);
    await pick(el, el.querySelector<HTMLButtonElement>('.draw-mode button')!, '16 by 16');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(el.querySelector<HTMLElement>('to-bar')!.offsetHeight).toBeLessThanOrEqual(56);
  } finally {
    await page.viewport(1100, 800);
  }
});
