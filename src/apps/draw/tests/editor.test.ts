// The Draw editor in a real browser: a tool and a tap make a shape, the keys move and remove it, its words are typed
// on it, the contextual bar under it recolours, resizes, copies, cuts, pastes and deletes, alt text is kept, pixel mode paints a grid that can become the background, undo takes it back, and at
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

test('tapping a shape selects it; a drag moves it; Arrange keeps Delete, Bring to front and Send to back, and the joins follow', async () => {
  const { el, last } = await editor(DRAWING);
  await tap(el, 96, 80);
  expect(el.querySelector('svg.draw-canvas .handle')).not.toBeNull();
  await tap(el, 96, 80, [96 + 64, 80 + 32]);
  expect(last()).toContain('\no | 12 | 10 | 16 | 8 | 1b | Browser\n');
  // The bar has no Colour or Style menus now (they are the contextual bar's); Arrange has no Label.
  expect(el.querySelector('.draw-colour, .draw-style')).toBeNull();
  const n = last()!;
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-arrange button')!, 'Send to back');
  expect(last()).toBe(n);
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-arrange button')!, 'Bring to front');
  expect(last()!.split('\n').slice(2)).toEqual(['o | 32 | 6 | 16 | 8 | 1b | Server', 'k | 2 | 0 | 0 | 0 | 0 | asks', 'o | 12 | 10 | 16 | 8 | 1b | Browser', '']);
});

const ctx = (el: HTMLElement) => el.querySelector<HTMLElement>('.draw-context .to-context')!;
const ctxOpen = (el: HTMLElement) => ctx(el).matches(':popover-open');
const ctxButton = (el: HTMLElement, label: string) => ctx(el).querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const ctxLabels = (el: HTMLElement) => [...ctx(el).querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
const words = (el: HTMLElement) => el.querySelector<HTMLElement>('.draw-words')!;
/** Where a canvas point is on the screen. */
const screen = (el: HTMLElement, x: number, y: number) => {
  const b = canvas(el).getBoundingClientRect();
  return [b.left + (x / 640) * b.width, b.top + (y / 400) * b.height];
};
const typeIn = async (el: ToDrawEditor, text: string) => {
  document.execCommand('insertText', false, text);
  await el.updateComplete;
};
const wordsKey = async (el: ToDrawEditor, k: string, more: KeyboardEventInit = {}) => {
  words(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...more }));
  await el.updateComplete;
};
async function clip(el: ToDrawEditor, type: 'copy' | 'cut' | 'paste', data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  (document.activeElement ?? document.body).dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await el.updateComplete;
  await tick();
  return dt;
}

test('a shape tapped has the contextual bar under it: the inks, the style, the sizes with the current one pressed; a swatch recolours, L resizes the words', async () => {
  const { el, last } = await editor(DRAWING);
  expect(ctxOpen(el)).toBe(false);
  await tap(el, 96, 80);
  await until(() => ctxOpen(el));
  await tick();
  const bar = ctx(el).getBoundingClientRect();
  const [, bottom] = screen(el, 96, 112);
  const [cx] = screen(el, 96, 80);
  expect(bar.top).toBeGreaterThanOrEqual(bottom);
  expect(bar.top).toBeLessThan(bottom + 40);
  expect(Math.abs(bar.left + bar.width / 2 - cx) < 4 || bar.left <= 8).toBe(true);
  expect(ctx(el).querySelectorAll('.to-context-swatch')).toHaveLength(6);
  expect(ctxLabels(el)).toEqual(['Black', 'Red', 'Orange', 'Green', 'Blue', 'Purple', 'No fill', 'Grey fill', 'Solid fill', 'Small text', 'Medium text', 'Large text', 'Extra large text', 'Edit the words', 'Duplicate', 'Bring to front', 'Send to back', 'Copy', 'Cut', 'Paste', 'Delete']);
  expect(ctxButton(el, 'Medium text').getAttribute('aria-pressed')).toBe('true');
  expect(ctxButton(el, 'Medium text').textContent).toBe('M');
  expect(ctxButton(el, 'Blue').getAttribute('aria-pressed')).toBe('true');
  // The bar's buttons leave the focus on the canvas.
  expect(document.activeElement).toBe(el.querySelector('.draw-wrap'));
  ctxButton(el, 'Green').click();
  await el.updateComplete;
  expect(last()).toContain('\no | 4 | 6 | 16 | 8 | 1g | Browser\n');
  expect(ctxButton(el, 'Green').getAttribute('aria-pressed')).toBe('true');
  ctxButton(el, 'Large text').click();
  await el.updateComplete;
  expect(last()).toContain('| 1g3 | Browser\n');
  expect(ctxButton(el, 'Large text').getAttribute('aria-pressed')).toBe('true');
  ctxButton(el, 'Solid fill').click();
  await el.updateComplete;
  expect(last()).toContain('| 2g3 | Browser\n');
  // A line has line styles; a drag hides the bar; a tap on nothing lets it go.
  await tap(el, 400, 160);
  expect(ctxOpen(el)).toBe(false);
  await tap(el, 96, 80);
  await until(() => ctxOpen(el));
  const svg = canvas(el);
  const [x0, y0] = screen(el, 96, 80);
  svg.querySelector('[data-idx="0"]')!.dispatchEvent(new PointerEvent('pointerdown', { clientX: x0, clientY: y0, button: 0, buttons: 1, pointerId: 1, bubbles: true }));
  await el.updateComplete;
  expect(ctxOpen(el)).toBe(false);
  svg.dispatchEvent(new PointerEvent('pointerup', { clientX: x0, clientY: y0, button: 0, pointerId: 1, bubbles: true }));
  await el.updateComplete;
  await until(() => ctxOpen(el));
});

test('Delete after a real tap removes the shape (the canvas has the focus); the bar\'s Delete does the same; undo brings them back', async () => {
  const { el, last } = await editor(DRAWING);
  await tap(el, 96, 80);
  expect(document.activeElement).toBe(el.querySelector('.draw-wrap'));
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
  await el.updateComplete;
  // The shape and its join go; the bar goes with the selection.
  expect(last()).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 32 | 6 | 16 | 8 | 1b | Server\n');
  await until(() => !ctxOpen(el));
  await tap(el, 320, 80);
  await until(() => ctxOpen(el));
  ctxButton(el, 'Delete').click();
  await el.updateComplete;
  expect(last()).toBe('');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe(DRAWING);
  // Backspace too.
  await tap(el, 320, 80);
  document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()).not.toContain('Server');
});

test('copy gives the shape as a drawing in TLO and our HTML; paste adds it a step down and right, chosen; cut removes; words paste as a text', async () => {
  const { el, last } = await editor(DRAWING);
  await tap(el, 96, 80);
  const dt = await clip(el, 'copy');
  const text = dt.getData('text/plain');
  expect(text).toBe('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Browser\n');
  expect(dt.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(dt.getData('text/html')).toContain('<td>Browser</td>');
  expect(last()).toBe(undefined);
  await clip(el, 'paste', { 'text/plain': text, 'text/html': dt.getData('text/html') });
  expect(last()).toBe(DRAWING + 'o | 5 | 7 | 16 | 8 | 1b | Browser\n');
  // The pasted shape is the one in hand: an arrow nudges it.
  key(el, 'ArrowRight');
  await el.updateComplete;
  expect(last()!.split('\n').at(-2)).toBe('o | 6 | 7 | 16 | 8 | 1b | Browser');
  // Cut: Server goes, with the join to it.
  await tap(el, 320, 80);
  const cut = await clip(el, 'cut');
  expect(cut.getData('text/plain')).toContain('\no | 32 | 6 | 16 | 8 | 1b | Server\n');
  expect(last()).not.toContain('Server');
  expect(last()).not.toContain('asks');
  // Pasted again: back, a step along.
  await clip(el, 'paste', { 'text/plain': cut.getData('text/plain') });
  expect(last()!.split('\n').at(-2)).toBe('o | 33 | 7 | 16 | 8 | 1b | Server');
  // A line of words from elsewhere: a text in the middle with those words.
  await clip(el, 'paste', { 'text/plain': 'Hello there' });
  expect(last()!.split('\n').at(-2)).toMatch(/^t \| \d+ \| \d+ \| 12 \| 3 \| 0 \| Hello there$/);
  expect(words(el).hidden).toBe(true);
});

test('the bar copies and pastes: the system clipboard where the page may, else what was copied here', async () => {
  const { el, last } = await editor(DRAWING);
  await tap(el, 320, 80);
  await until(() => ctxOpen(el));
  ctxButton(el, 'Copy').click();
  ctxButton(el, 'Paste').click();
  await until(() => last() !== undefined);
  expect(last()).toBe(DRAWING + 'o | 33 | 7 | 16 | 8 | 1b | Server\n');
  ctxButton(el, 'Cut').click();
  await el.updateComplete;
  expect(last()).toBe(DRAWING);
});

test('a double tap puts the words on the shape: typed live into the model, Enter commits, Escape restores, Shift+Enter is " | "; the bar under them holds sizes and inks', async () => {
  const { el, last, changes } = await editor(DRAWING);
  await tap(el, 96, 80);
  canvas(el).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await el.updateComplete;
  const w = words(el);
  expect(w.hidden).toBe(false);
  expect(document.activeElement).toBe(w);
  expect(w.innerText).toBe('Browser');
  expect(getSelection()!.toString()).toBe('Browser');
  expect(['plaintext-only', 'true']).toContain(w.contentEditable);
  expect(el.querySelector('.draw-label-pop, input.draw-label')).toBeNull();
  // Over the shape: centred on it, the shape's size of words on the screen.
  const r = w.getBoundingClientRect();
  const [cx, cy] = screen(el, 96, 80);
  expect(Math.abs(r.left + r.width / 2 - cx)).toBeLessThan(3);
  expect(Math.abs(r.top + r.height / 2 - cy)).toBeLessThan(3);
  const k = canvas(el).getBoundingClientRect().width / 640;
  expect(r.height).toBeCloseTo(14 * k * 1.25, 0);
  // The canvas draws the shape without its words, so nothing doubles.
  expect(canvas(el).querySelector('[data-idx="0"] text')).toBeNull();
  expect(canvas(el).querySelector('[data-idx="1"] text')).not.toBeNull();
  // The bar comes up under the words with sizes and inks only.
  await until(() => ctxOpen(el));
  await tick();
  expect(ctxLabels(el)).toEqual(['Small text', 'Medium text', 'Large text', 'Extra large text', 'Black', 'Red', 'Orange', 'Green', 'Blue', 'Purple']);
  expect(ctx(el).getBoundingClientRect().top).toBeGreaterThanOrEqual(r.bottom);
  // Typing writes the label at once.
  await typeIn(el, 'Client');
  expect(last()).toContain('| 1b | Client\n');
  // A size from the bar keeps the words open.
  ctxButton(el, 'Large text').click();
  await el.updateComplete;
  expect(last()).toContain('| 1b3 | Client\n');
  expect(document.activeElement).toBe(w);
  await wordsKey(el, 'Enter');
  expect(w.hidden).toBe(true);
  expect(document.activeElement).toBe(el.querySelector('.draw-wrap'));
  expect(canvas(el).querySelector('[data-idx="0"] text')!.textContent).toBe('Client');
  // Enter on the shape opens them again; Escape puts back what was there, in one step.
  const n = changes.length;
  key(el, 'Enter');
  await el.updateComplete;
  expect(document.activeElement).toBe(w);
  await typeIn(el, 'Oops');
  expect(last()).toContain('| Oops\n');
  await wordsKey(el, 'Escape');
  expect(last()).toContain('| 1b3 | Client\n');
  expect(w.hidden).toBe(true);
  expect(document.activeElement).toBe(el.querySelector('.draw-wrap'));
  expect(changes.length).toBe(n + 2);
  // Shift+Enter: a new line, written as " | ".
  key(el, 'Enter');
  await el.updateComplete;
  await typeIn(el, 'Name');
  await wordsKey(el, 'Enter', { shiftKey: true });
  await typeIn(el, 'Role');
  expect(last()).toContain('| Name \\| Role\n');
  // A tap elsewhere commits.
  await tap(el, 600, 380);
  expect(w.hidden).toBe(true);
  expect(last()).toContain('| Name \\| Role\n');
  expect(canvas(el).querySelectorAll('[data-idx="0"] text')).toHaveLength(2);
});

test('an icon before the words stays out of the overlay and is put back', async () => {
  const { el, last } = await editor('Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 4 | 6 | 16 | 8 | 0 | :rocket Launch\n');
  await tap(el, 96, 80);
  key(el, 'Enter');
  await el.updateComplete;
  expect(words(el).innerText).toBe('Launch');
  await typeIn(el, 'Go');
  expect(last()).toContain('| :rocket Go\n');
});

test('a new text shape starts with its words open and selected; typing replaces them and the box grows; left empty, it goes', async () => {
  const { el, last } = await editor();
  button(el, 'Text').click();
  await el.updateComplete;
  await tap(el, 100, 100);
  const w = words(el);
  expect(w.hidden).toBe(false);
  expect(document.activeElement).toBe(w);
  expect(getSelection()!.toString()).toBe('Text');
  expect(w.classList.contains('left')).toBe(true);
  await typeIn(el, 'A longer line of words than the box');
  const row = last()!.split('\n').at(-2)!.split(' | ');
  expect(row[0]).toBe('t');
  expect(+row[3]).toBeGreaterThan(12);
  expect(row[6]).toBe('A longer line of words than the box');
  await wordsKey(el, 'Enter', { shiftKey: true });
  await typeIn(el, 'Two');
  expect(+last()!.split('\n').at(-2)!.split(' | ')[4]).toBeGreaterThan(3);
  await wordsKey(el, 'Enter');
  // Another, emptied: taken out when done.
  button(el, 'Text').click();
  await el.updateComplete;
  await tap(el, 100, 300);
  document.execCommand('delete');
  await el.updateComplete;
  await wordsKey(el, 'Enter');
  expect(last()!.split('\n').filter((l) => l.startsWith('t |'))).toHaveLength(1);
});

test('pixel mode has no contextual bar', async () => {
  const { el } = await editor(DRAWING);
  await tap(el, 96, 80);
  await until(() => ctxOpen(el));
  await pick(el, el.querySelector<HTMLButtonElement>('.draw-mode button')!, '8 by 8');
  await el.updateComplete;
  expect(ctxOpen(el)).toBe(false);
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

test('at phone width: the bar is one row of 44px buttons, the words typed on a shape are 16px, nothing is wider than the screen', async () => {
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
    // The words typed on the shape are set at 16px or more (and scaled), so Safari does not zoom; the bar is inside the screen.
    key(el, 'Enter');
    await el.updateComplete;
    expect(parseFloat(getComputedStyle(el.querySelector('.draw-words')!).fontSize)).toBeGreaterThanOrEqual(16);
    expect(document.scrollingElement!.scrollTop).toBe(0);
    el.querySelector<HTMLElement>('.draw-words')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await el.updateComplete;
    await until(() => !!el.querySelector('.draw-context .to-context:popover-open'));
    const ctxRect = el.querySelector('.draw-context .to-context')!.getBoundingClientRect();
    expect(ctxRect.left).toBeGreaterThanOrEqual(0);
    expect(ctxRect.right).toBeLessThanOrEqual(390);
    await pick(el, el.querySelector<HTMLButtonElement>('.draw-mode button')!, '16 by 16');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(el.querySelector<HTMLElement>('to-bar')!.offsetHeight).toBeLessThanOrEqual(56);
  } finally {
    await page.viewport(1100, 800);
  }
});
