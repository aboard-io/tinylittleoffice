// The Motion editor in a real browser: a drawing opens in Move mode; a tap selects a shape and a drag keys it at the
// moment on the scrubber; K, the effects, the sliders and the length menu write the keys table; Draw mode is Draw's own
// editor and what it changes comes back with the keys following; play runs the clock; undo takes edits back; the GIF
// export is a real GIF; and at phone width the bar is one row and nothing is wider than the screen.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToAnimEditor } from '../editor.ts';
import def from '../def.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

const SHAPES = 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nt | 4 | 20 | 20 | 4 | 04 | Lift off\ni | 8 | 36 | 8 | 8 | 0b | rocket\n';
const LIFT = '---\nframes: 24\nfps: 8\n---\n' + SHAPES + '\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n';

async function editor(value = ''): Promise<{ el: ToAnimEditor; last: () => string | undefined; changes: string[] }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-anim-editor') as ToAnimEditor;
  el.value = value;
  const changes: string[] = [];
  main.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const byWords = (el: HTMLElement, words: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === words)!;
const stage = (el: HTMLElement) => el.querySelector<SVGSVGElement>('svg.anim-stage')!;
const keysTable = (text: string | undefined) => (text ?? '').slice((text ?? '').indexOf('Shape | Keys'));
/** A pointer put down on the stage at a point (in stage units, 640 by 400), on whatever is drawn there, and lifted, perhaps elsewhere. */
async function drag(el: ToAnimEditor, x: number, y: number, to?: [number, number]) {
  const svg = stage(el);
  const b = svg.getBoundingClientRect();
  const at = (cx: number, cy: number) => ({ clientX: b.left + (cx / 640) * b.width, clientY: b.top + (cy / 400) * b.height, button: 0, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true });
  const down = at(x, y);
  const under = document.elementFromPoint(down.clientX, down.clientY);
  (under && svg.contains(under) ? under : svg).dispatchEvent(new PointerEvent('pointerdown', down));
  if (to) svg.dispatchEvent(new PointerEvent('pointermove', at(to[0], to[1])));
  svg.dispatchEvent(new PointerEvent('pointerup', { ...at(...(to ?? [x, y])), buttons: 0 }));
  await el.updateComplete;
}
const key = (el: ToAnimEditor, k: string, more: KeyboardEventInit = {}) => stage(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...more }));
async function pick(el: HTMLElement, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await (el as ToAnimEditor).updateComplete;
  await tick();
}

test('a drawing opens in Move mode; a tap selects the rocket, a drag keys it now; later on the scrubber a drag keys it then; undo takes it back', async () => {
  const { el, last, changes } = await editor(LIFT);
  expect(byWords(el, 'Move').getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('to-bar')).not.toBeNull();
  expect(el.querySelectorAll('.anim-thumbs button')).toHaveLength(12);
  // The rocket's box is at (64, 288), 64 square: a tap in it selects it, and the hint and the sliders follow.
  await drag(el, 96, 320);
  expect(el.querySelector('.anim-stage .hit.sel')?.getAttribute('data-idx')).toBe('1');
  expect(el.querySelectorAll('.anim-props input[type=range]')).toHaveLength(3);
  expect(changes).toHaveLength(0);
  await drag(el, 96, 320, [136, 300]);
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,40,-20,0,1,0; 23,200,-200,80,1,-30,d\n');
  // The arrow keys move in time; at frame 6 a drag sets a key where the shape is then, moved by the drag.
  for (let i = 0; i < 6; i++) key(el, 'ArrowRight');
  await el.updateComplete;
  expect(el.querySelector<HTMLInputElement>('.anim-scrub input')!.value).toBe('6');
  const [x, y] = [96 + 40 + (160 * 6) / 23, 320 - 20 - (180 * 6) / 23];
  await drag(el, x, y, [x, y + 40]);
  expect(keysTable(last())).toContain('\n1 | 0,40,-20,0,1,0; 6,82,-27,21,1,-8; 23,200,-200,80,1,-30,d\n');
  // The key is on the scrubber as a dot; tapping another dot goes there.
  expect(el.querySelectorAll('.anim-keys .key')).toHaveLength(3);
  el.querySelector<HTMLButtonElement>('.anim-keys .key:last-child')!.click();
  await el.updateComplete;
  expect(el.querySelector<HTMLInputElement>('.anim-scrub input')!.value).toBe('23');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,40,-20,0,1,0; 23,200,-200,80,1,-30,d\n');
});

test('K keeps a key; the effects menu, the sliders and Remove this key write the keys; the length menu the head; Delete takes the shape and its keys', async () => {
  const { el, last } = await editor(LIFT);
  await drag(el, 96, 320);
  key(el, 'ArrowRight');
  key(el, 'ArrowRight');
  key(el, 'k');
  await el.updateComplete;
  expect(keysTable(last())).toContain('\n1 | 0,0,0,0,1,0; 2,17,-17,7,1,-3; 23,');
  expect(button(el, 'Add a key here').disabled).toBe(true);
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-fx button')!, 'Neon');
  expect(keysTable(last())).toContain('; 2,17,-17,7,1,-3,n; ');
  const size = el.querySelectorAll<HTMLInputElement>('.anim-props input[type=range]')[1];
  size.value = '2';
  size.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  expect(keysTable(last())).toContain('; 2,17,-17,7,2,-3,n; ');
  button(el, 'Remove this key').click();
  await el.updateComplete;
  expect(keysTable(last())).toContain('\n1 | 0,0,0,0,1,0; 23,200');
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-length button')!, '12 frames a second');
  expect(last()!.startsWith('---\nframes: 24\nfps: 12\n---\n')).toBe(true);
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-length button')!, '12 frames');
  expect(last()!.startsWith('---\nframes: 12\nfps: 12\n---\n')).toBe(true);
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0\n1 | 0,0,0,0,1,0\n');
  await drag(el, 96, 320);
  key(el, 'Delete');
  await el.updateComplete;
  expect(last()).not.toContain('rocket');
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0\n');
});

test('Draw mode is Draw itself, given the drawing alone; a shape drawn there comes back into the motion with the keys kept, and only Motion speaks to the shell', async () => {
  const { el, last, changes } = await editor(LIFT);
  byWords(el, 'Draw').click();
  await el.updateComplete;
  const draw = el.querySelector<HTMLElement & { value: string; updateComplete: Promise<unknown> }>('to-draw-editor')!;
  expect(draw).not.toBeNull();
  await draw.updateComplete;
  expect(draw.value).toBe(SHAPES);
  // One bar: Draw's, while drawing.
  expect(el.querySelectorAll('to-bar')).toHaveLength(1);
  draw.querySelector<HTMLButtonElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Ellipse'))!.click();
  await el.updateComplete;
  await tick();
  expect(changes).toHaveLength(1);
  expect(last()).toContain('\ni | 8 | 36 | 8 | 8 | 0b | rocket\ne | 38 | 26 | 12 | 6 | 0 |\n');
  expect(keysTable(last())).toBe(keysTable(LIFT));
  // Draw shows what came back, and keeps its own selection (the new ellipse).
  await draw.updateComplete;
  expect(draw.value).toContain('\ne | 38 | 26 | 12 | 6 | 0 |\n');
  // Back to Move: the new shape is on the stage.
  byWords(el, 'Move').click();
  await el.updateComplete;
  expect(el.querySelectorAll('.anim-stage .hit')).toHaveLength(3);
  // Undo, from the shell, is Motion's: the ellipse goes.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe(LIFT);
});

test('an empty motion opens in Draw mode; a list of things is put on the stage as it arrives; play runs the clock and Space stops it', async () => {
  const empty = await editor('');
  expect(empty.el.querySelector('to-draw-editor')).not.toBeNull();
  expect(byWords(empty.el, 'Draw').getAttribute('aria-pressed')).toBe('true');
  const { el, last } = await editor('- :rocket:\n- Hello there\n');
  expect(last()).toContain('\ni | 10 | 15 | 6 | 6 | 0 | rocket\nt | 10 | 31 | 20 | 4 | 03 | Hello there\n');
  expect(byWords(el, 'Move').getAttribute('aria-pressed')).toBe('true');
  button(el, 'Play').click();
  await el.updateComplete;
  expect(button(el, 'Pause').getAttribute('aria-pressed')).toBe('true');
  await tick(300);
  expect(el.querySelector('.anim-stage .hit')).toBeNull();
  key(el, ' ');
  await el.updateComplete;
  expect(button(el, 'Play')).not.toBeNull();
  expect(Number(el.querySelector<HTMLInputElement>('.anim-scrub input')!.value)).toBeGreaterThan(0);
});

test('the GIF export: GIF89a, the stage size, a frame for every frame', async () => {
  const gif = (await def.exports!.find((e) => e.ext === 'gif')!.build(LIFT, { title: '', link: '' })) as Uint8Array;
  expect(new TextDecoder().decode(gif.slice(0, 6))).toBe('GIF89a');
  expect([gif[6] | (gif[7] << 8), gif[8] | (gif[9] << 8)]).toEqual([640, 400]);
  // Each frame starts with a graphic control extension (0x21 0xf9 0x04).
  let frames = 0;
  for (let i = 0; i < gif.length - 2; i++) if (gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 4) frames++;
  expect(frames).toBeGreaterThanOrEqual(24);
});

test('at phone width: the bar is one row, the stage fits, nothing is wider than the screen, the page does not scroll on a tap', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(LIFT);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    expect(stage(el).getBoundingClientRect().width).toBeLessThanOrEqual(390);
    await drag(el, 96, 320);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    byWords(el, 'Draw').click();
    await el.updateComplete;
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});
