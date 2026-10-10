// The Motion editor in a real browser: a drawing opens in Move mode; a tap selects a shape and a drag keys it at the
// moment on the scrubber; K, the effects, the sliders and the length menu write the keys table; Draw mode is Draw's own
// editor and what it changes comes back with the keys following; play runs the clock; undo takes edits back; the GIF
// export is a real GIF; and at phone width the bar is one row and nothing is wider than the screen.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
// The page's styles first, as on the site, so the layers come in their order.
import '../../../styles.css';
import '../editor.ts';
import type { ToAnimEditor } from '../editor.ts';
import def from '../def.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';

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
/** A point on the stage (in stage units) on the screen. */
function screen(svg: SVGSVGElement, x: number, y: number) {
  const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
  return { clientX: p.x, clientY: p.y };
}
/** A pointer put down on the stage at a point (in stage units, 640 by 400), on whatever is drawn there, and lifted, perhaps elsewhere. */
async function drag(el: ToAnimEditor, x: number, y: number, to?: [number, number]) {
  const svg = stage(el);
  const at = (cx: number, cy: number) => ({ ...screen(svg, cx, cy), button: 0, buttons: 1, pointerId: 1, bubbles: true, isPrimary: true });
  const down = at(x, y);
  const under = document.elementFromPoint(down.clientX, down.clientY);
  (under && svg.contains(under) ? under : svg).dispatchEvent(new PointerEvent('pointerdown', down));
  if (to) svg.dispatchEvent(new PointerEvent('pointermove', at(to[0], to[1])));
  svg.dispatchEvent(new PointerEvent('pointerup', { ...at(...(to ?? [x, y])), buttons: 0 }));
  await el.updateComplete;
}
const key = (el: ToAnimEditor, k: string, more: KeyboardEventInit = {}) => stage(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...more }));
/** A number field given words and committed (Enter), as a person types in it. */
async function setField(el: ToAnimEditor, selector: string, value: string) {
  const input = el.querySelector<HTMLInputElement>(selector)!;
  input.focus();
  input.value = value;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await el.updateComplete;
}
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
  expect(el.querySelectorAll('.anim-props input[type=range]')).toHaveLength(4);
  expect(changes).toHaveLength(0);
  await drag(el, 96, 320, [136, 300]);
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,40,-20,0,1,0; 23,200,-200,80,1,-30,d\n');
  // Full stop steps in time; at frame 6 a drag sets a key where the shape is then, moved by the drag.
  for (let i = 0; i < 6; i++) key(el, '.');
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

test('K keeps a key; the effects menu, the sliders and Remove this key write the keys; the length fields the head; Delete takes the shape and its keys', async () => {
  const { el, last } = await editor(LIFT);
  await drag(el, 96, 320);
  key(el, '.');
  key(el, '.');
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
  await setField(el, '.anim-fps input', '12');
  expect(last()!.startsWith('---\nframes: 24\nfps: 12\n---\n')).toBe(true);
  await setField(el, '.anim-frames input', '12');
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

test('the GIF repeats as the motion says (once: no loop block; bounce: there and back), and its frames draw a label\'s marks', async () => {
  const build = (doc: string) => def.exports!.find((e) => e.ext === 'gif')!.build(doc, { title: '', link: '' }) as Promise<Uint8Array>;
  const count = (gif: Uint8Array) => {
    let n = 0;
    for (let i = 0; i < gif.length - 2; i++) if (gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 4) n++;
    return n;
  };
  const has = (gif: Uint8Array) => new TextDecoder('latin1').decode(gif.slice(0, 64)).includes('NETSCAPE2.0');
  const short = LIFT.replace('frames: 24', 'frames: 6').replace(/; 23,/g, '; 5,');
  const once = await build(short.replace('fps: 8\n', 'fps: 8\nloop: once\n'));
  expect(has(once)).toBe(false);
  expect(count(once)).toBe(6);
  const bounce = await build(short.replace('fps: 8\n', 'fps: 8\nloop: bounce\n'));
  expect(has(bounce)).toBe(true);
  expect(count(bounce)).toBe(10);
  // A bold label rasterises differently from a plain one: the tspan is drawn.
  const { pixels } = await import('../../../kit/raster.ts');
  const { pageSvg } = await import('../../../kit/draw.ts');
  const { frameSvg } = await import('../view.ts');
  const { readAnim } = await import('../model.ts');
  const { parse } = await import('../../../doc/index.ts');
  const ink = async (doc: string) => {
    const px = (await pixels(pageSvg({ w: 640, h: 400, svg: frameSvg(readAnim(parse(doc)), 0) }), 640, 400))!;
    let dark = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] < 300) dark++;
    return dark;
  };
  expect(await ink(LIFT.replace('| Lift off', '| **Lift off**'))).toBeGreaterThan((await ink(LIFT)) * 1.1);
});

test('Move mode\'s length, speed and repeat: the frames and fps fields write the head (out of bounds held, nonsense refused), the seconds follow; the repeat menu; the Turn slider keys a turn; playing once stops at the end', async () => {
  const { el, last } = await editor(LIFT);
  const secs = () => el.querySelector('.anim-secs')!.textContent;
  expect(secs()).toBe('3.0 s');
  await setField(el, '.anim-frames input', '500');
  expect(last()!.startsWith('---\nframes: 120\nfps: 8\n---\n')).toBe(true);
  expect(el.querySelector<HTMLInputElement>('.anim-frames input')!.value).toBe('120');
  expect(secs()).toBe('15.0 s');
  const n = last();
  await setField(el, '.anim-fps input', 'fast');
  expect(last()).toBe(n);
  expect(el.querySelector<HTMLInputElement>('.anim-fps input')!.value).toBe('8');
  await setField(el, '.anim-fps input', '24');
  expect(secs()).toBe('5.0 s');
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-loop button')!, 'Back and forth');
  expect(last()!.startsWith('---\nframes: 120\nfps: 24\nloop: bounce\n---\n')).toBe(true);
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-loop button')!, '3 times');
  expect(last()).toContain('\nloop: 3\n');
  // The Turn slider: a key with its turn.
  await drag(el, 96, 320);
  const turn = el.querySelector<HTMLInputElement>('.anim-u input')!;
  expect(el.querySelector('.anim-u')!.getAttribute('title')).toContain('upright axis');
  expect(el.querySelector('.anim-z')!.getAttribute('title')).toContain('never changes the size');
  turn.value = '180';
  turn.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  expect(keysTable(last())).toContain('\n1 | 0,0,0,0,1,0,,u180; 23,');
  // Played once from near the end, it stops on the last frame.
  await pick(el, el.querySelector<HTMLButtonElement>('.anim-loop button')!, 'Play once');
  await setField(el, '.anim-frames input', '4');
  key(el, ' ');
  await el.updateComplete;
  expect(button(el, 'Pause')).not.toBeNull();
  await until(() => !!button(el, 'Play'), 2000);
  expect(el.querySelector<HTMLInputElement>('.anim-scrub input')!.value).toBe('3');
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

/* ---------- the editing audit: each path the standard (docs/editing.md) asks of a canvas ---------- */

const undo = async (el: ToAnimEditor, which: 'docundo' | 'docredo' = 'docundo') => {
  el.dispatchEvent(new CustomEvent(which, { cancelable: true }));
  await el.updateComplete;
  await tick();
};
const chosen = (el: HTMLElement) => [...el.querySelectorAll('.anim-stage .hit.sel')].map((g) => g.getAttribute('data-idx'));
const press = async (el: ToAnimEditor, k: string, more: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...more });
  stage(el).dispatchEvent(e);
  await el.updateComplete;
  return e;
};
const scrub = (el: HTMLElement) => el.querySelector<HTMLInputElement>('.anim-scrub input')!.value;
async function tap(el: ToAnimEditor, x: number, y: number, more: PointerEventInit = {}) {
  const svg = stage(el);
  const at = { ...screen(svg, x, y), button: 0, pointerId: 1, bubbles: true, isPrimary: true, ...more };
  const under = document.elementFromPoint(at.clientX, at.clientY);
  (under && svg.contains(under) ? under : svg).dispatchEvent(new PointerEvent('pointerdown', { ...at, buttons: 1 }));
  svg.dispatchEvent(new PointerEvent('pointerup', { ...at, buttons: 0 }));
  await el.updateComplete;
}
const clipboard = (type: 'copy' | 'cut' | 'paste', data?: Record<string, string>) => {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data ?? {})) dt.setData(k, v);
  const e = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true });
  document.activeElement!.dispatchEvent(e);
  return dt;
};

test('the arrows nudge the shape in hand a grid step (Shift: five), never off the stage; Mod+arrows size it; with nothing in hand Left and Right step a frame, and comma and full stop always do', async () => {
  const { el, last } = await editor(LIFT);
  // Nothing in hand: Right steps the time, Up is left alone.
  expect((await press(el, 'ArrowRight')).defaultPrevented).toBe(true);
  expect(scrub(el)).toBe('1');
  expect((await press(el, 'ArrowUp')).defaultPrevented).toBe(false);
  await press(el, ',');
  expect(scrub(el)).toBe('0');
  await tap(el, 96, 320);
  await press(el, 'ArrowRight');
  await press(el, 'ArrowRight');
  expect(scrub(el)).toBe('0');
  expect(keysTable(last())).toContain('\n1 | 0,16,0,0,1,0; 23,');
  await press(el, 'ArrowUp', { shiftKey: true });
  expect(keysTable(last())).toContain('\n1 | 0,16,-40,0,1,0; 23,');
  // Alt+arrows are the caret's (a word at a time on a Mac): not taken.
  expect((await press(el, 'ArrowLeft', { altKey: true })).defaultPrevented).toBe(false);
  // Never off the stage: the rocket's box is 64 wide at x 64, so it goes left 64 at most.
  for (let i = 0; i < 3; i++) await press(el, 'ArrowLeft', { shiftKey: true });
  expect(keysTable(last())).toContain('\n1 | 0,-64,-40,0,1,0; 23,');
  await press(el, 'ArrowUp', { ctrlKey: true });
  expect(keysTable(last())).toContain('\n1 | 0,-64,-40,0,1.1,0; 23,');
  // Full stop steps a frame with a shape in hand; the arrows then key it there.
  await press(el, '.');
  expect(scrub(el)).toBe('1');
  // One burst of nudges at a moment is one undo step, and the shape stays in hand.
  await undo(el);
  await undo(el);
  expect(keysTable(last())).toBe(keysTable(LIFT));
  expect(chosen(el)).toEqual(['1']);
});

test('undo and redo put the shapes in hand back: a deletion undone chooses the shape again, a duplicate redone chooses the copy; the stage has the focus', async () => {
  const { el, last } = await editor(LIFT);
  await tap(el, 96, 320);
  await press(el, 'Delete');
  expect(chosen(el)).toEqual([]);
  expect(last()).not.toContain('rocket');
  await undo(el);
  expect(last()).toBe(LIFT);
  expect(chosen(el)).toEqual(['1']);
  expect(document.activeElement).toBe(stage(el));
  await press(el, 'd', { ctrlKey: true });
  expect(chosen(el)).toEqual(['2']);
  await undo(el);
  expect(chosen(el)).toEqual(['1']);
  await undo(el, 'docredo');
  expect(chosen(el)).toEqual(['2']);
});

test('Mod+A takes every shape; Shift+tap adds one or takes it away; a drag moves all in hand; Delete takes them all; Escape lets go, and first stops the playing', async () => {
  const { el, last } = await editor(LIFT);
  expect((await press(el, 'a', { ctrlKey: true })).defaultPrevented).toBe(true);
  expect(chosen(el)).toEqual(['0', '1']);
  expect(await press(el, 'Escape').then((e) => e.defaultPrevented)).toBe(true);
  expect(chosen(el)).toEqual([]);
  await tap(el, 96, 320);
  await tap(el, 64, 176, { shiftKey: true });
  expect(chosen(el)).toEqual(['0', '1']);
  await tap(el, 64, 176, { shiftKey: true });
  expect(chosen(el)).toEqual(['1']);
  await tap(el, 64, 176, { shiftKey: true });
  await drag(el, 96, 320, [104, 328]);
  expect(keysTable(last())).toBe('Shape | Keys\n--- | ---\n0 | 0,8,8,0,1,0; 23,0,-80,0,1,0,i\n1 | 0,8,8,0,1,0; 23,200,-200,80,1,-30,d\n');
  await press(el, ' ');
  expect(button(el, 'Pause')).not.toBeNull();
  await press(el, 'Escape');
  expect(button(el, 'Play')).not.toBeNull();
  expect(chosen(el)).toEqual(['0', '1']);
  await press(el, 'Delete');
  expect(last()).not.toContain('Kind');
  await undo(el);
  expect(chosen(el)).toEqual(['0', '1']);
});

test('the keys are the stage\'s: K, Delete and the arrows do nothing from a bar button or the editor itself', async () => {
  const { el, changes } = await editor(LIFT);
  await tap(el, 96, 320);
  const play = button(el, 'Play');
  for (const target of [play, el as HTMLElement]) {
    for (const k of ['k', 'Delete', 'ArrowRight']) target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  }
  await el.updateComplete;
  expect(changes).toHaveLength(0);
  expect(scrub(el)).toBe('0');
});

test('a shape in hand has the contextual bar under it, in the standard\'s order, its buttons keeping the focus; the bar ends with Undo and Redo, which keep it too', async () => {
  const { el, last } = await editor(LIFT);
  const ctx = el.querySelector<HTMLElement>('to-context.anim-context')!;
  expect(ctx.querySelector('.to-context')!.matches(':popover-open')).toBe(false);
  await tap(el, 96, 320);
  await until(() => ctx.querySelector('.to-context')!.matches(':popover-open'));
  const names = [...ctx.querySelectorAll('.to-context > *')].map((b) => (b.matches('[role=separator]') ? '|' : b.getAttribute('aria-label')));
  expect(names).toEqual(['Add a key here', 'Remove this key', '|', 'Edit the words', 'Duplicate', '|', 'Copy', 'Cut', 'Paste', '|', 'Delete']);
  // Under the shape.
  const box = el.querySelector('.anim-stage .hit.sel > rect')!.getBoundingClientRect();
  expect(ctx.querySelector('.to-context')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom - 1);
  const bar = [...el.querySelectorAll<HTMLButtonElement>('to-bar.anim-bar > button, to-bar.anim-bar > to-menu > button')].map((b) => b.getAttribute('aria-label') ?? b.textContent!.trim());
  expect(bar.slice(-2)).toEqual(['Undo', 'Redo']);
  for (const b of [...el.querySelectorAll<HTMLButtonElement>('to-bar.anim-bar button.to-tool'), ...ctx.querySelectorAll<HTMLButtonElement>('button')]) {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    b.dispatchEvent(down);
    expect(down.defaultPrevented, b.getAttribute('aria-label')!).toBe(true);
  }
  // The key dots and the moments keep the focus on the stage too.
  for (const b of [el.querySelector('.anim-keys .key')!, el.querySelector('.anim-thumbs button')!]) {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    b.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  }
  ctx.querySelector<HTMLButtonElement>('button[aria-label="Delete"]')!.click();
  await el.updateComplete;
  expect(last()).not.toContain('rocket');
  await until(() => !ctx.querySelector('.to-context')!.matches(':popover-open'));
  button(el, 'Undo').click();
  await el.updateComplete;
  expect(last()).toBe(LIFT);
});

test('copy, cut and paste carry the shapes in hand with their keys, as TLO and our HTML; a paste puts them beside themselves, moving as they did; words paste as a text', async () => {
  const { el, last } = await editor(LIFT);
  await tap(el, 96, 320);
  const copy = clipboard('copy');
  expect(copy.getData('text/plain')).toBe('---\nframes: 24\nfps: 8\n---\nKind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\ni | 8 | 36 | 8 | 8 | 0b | rocket\n\nShape | Keys\n--- | ---\n0 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
  expect(copy.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(copy.getData('text/html')).toContain('<td>rocket</td>');
  clipboard('paste', { 'text/plain': copy.getData('text/plain') });
  await el.updateComplete;
  expect(last()).toContain('\ni | 9 | 37 | 8 | 8 | 0b | rocket\n');
  expect(keysTable(last())).toContain('\n2 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d\n');
  expect(chosen(el)).toEqual(['2']);
  // Our HTML alone (no text) pastes too.
  clipboard('paste', { 'text/html': copy.getData('text/html') });
  await el.updateComplete;
  expect(el.querySelectorAll('.anim-stage .hit')).toHaveLength(4);
  const cut = clipboard('cut');
  await el.updateComplete;
  expect(cut.getData('text/plain')).toContain('rocket');
  expect(el.querySelectorAll('.anim-stage .hit')).toHaveLength(3);
  clipboard('paste', { 'text/plain': 'Hello\nthere' });
  await el.updateComplete;
  expect(last()).toContain('| Hello \\| there\n');
  await undo(el);
  expect(el.querySelectorAll('.anim-stage .hit')).toHaveLength(3);
});

test('Enter, or two taps, on a shape in hand opens its words in place (Draw\'s own, on the same shape); undo with the words open takes the typing back and closes them', async () => {
  const { el, last, changes } = await editor(LIFT);
  await tap(el, 64, 176);
  await press(el, 'Enter');
  await el.updateComplete;
  const draw = el.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>('to-draw-editor')!;
  expect(draw).not.toBeNull();
  const words = draw.querySelector<HTMLElement>('.draw-words')!;
  const box = words.querySelector<HTMLElement>('.tx')!;
  expect(words.hidden).toBe(false);
  expect(document.activeElement).toBe(box);
  await tick();
  expect(box.innerText).toBe('Lift off');
  // Typing over the words chosen: one burst in Motion's log, as in Draw's own.
  for (const ch of 'Lift up') {
    box.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await el.updateComplete;
    await tick();
  }
  expect(last()).toContain('| Lift up\n');
  // (A space at the end is no change to the label until a word follows it.)
  expect(changes).toHaveLength('Lift up'.length - 1);
  // The shell's Mod+Z from the words is Motion's: the words go back, and Draw is not left with them open.
  await undo(el);
  await el.updateComplete;
  expect(last()).toBe(LIFT);
  const again = el.querySelector<HTMLElement>('to-draw-editor')!;
  await until(() => !!again.querySelector('.draw-words'));
  expect(again.querySelector<HTMLElement>('.draw-words')!.hidden).toBe(true);
  // Back in Move mode, the shape is still in hand; two taps on it open its words.
  byWords(el, 'Move').click();
  await el.updateComplete;
  expect(chosen(el)).toEqual(['0']);
  await tap(el, 64, 176);
  await tap(el, 64, 176);
  await el.updateComplete;
  expect(el.querySelector<HTMLElement>('to-draw-editor .draw-words')?.hidden).toBe(false);
});

test('Draw mode: the shapes in hand go in and come out with the mode; Draw\'s own Undo is Motion\'s; Draw offers no pixel mode, and a pixel grid from it is refused, not silently lost', async () => {
  const { el, last, changes } = await editor(LIFT);
  await tap(el, 96, 320);
  byWords(el, 'Draw').click();
  await el.updateComplete;
  type D = HTMLElement & { sel?: number; picked?: number[]; updateComplete: Promise<unknown> };
  const draw = el.querySelector<D>('to-draw-editor')!;
  await draw.updateComplete;
  await tick();
  const selOf = (d: D) => (Array.isArray(d.picked) ? d.picked : [d.sel]);
  expect(selOf(draw)).toEqual([1]);
  // Draw's mode menu (Shapes / Pixels) is not offered here.
  expect(draw.querySelector<HTMLElement>('.draw-mode')!.offsetParent).toBeNull();
  // A change Draw makes with a grid in it is put back, with a word why.
  const said: string[] = [];
  const hear = (e: Event) => said.push((e as CustomEvent<string>).detail);
  window.addEventListener('to-toast', hear);
  draw.dispatchEvent(new CustomEvent('docchange', { detail: '---\ngrid: 16\n---\n................\n', bubbles: true }));
  await el.updateComplete;
  expect(changes).toHaveLength(0);
  window.removeEventListener('to-toast', hear);
  expect(said.join()).toContain('Pixel art');
  // Draw's Undo (an event on Draw itself) undoes Motion's last change.
  const now = el.querySelector<D>('to-draw-editor')!;
  await now.updateComplete;
  now.querySelector<HTMLButtonElement>('to-insert button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Ellipse'))!.click();
  await el.updateComplete;
  await tick();
  expect(last()).toContain('\ne | ');
  const out = new CustomEvent('docundo', { cancelable: true });
  el.querySelector('to-draw-editor')!.dispatchEvent(out);
  await el.updateComplete;
  expect(out.defaultPrevented).toBe(true);
  expect(last()).toBe(LIFT);
  // Out of Draw mode, Draw's choice is Motion's.
  await tick();
  const d2 = el.querySelector<D>('to-draw-editor')!;
  if (Array.isArray(d2.picked)) d2.picked = [0];
  else d2.sel = 0;
  byWords(el, 'Move').click();
  await el.updateComplete;
  expect(chosen(el)).toEqual(['0']);
});

test('the size handle grows the shape in hand at this moment; Mod and the wheel zoom the stage', async () => {
  const { el, last } = await editor(LIFT);
  await tap(el, 96, 320);
  const handle = el.querySelector<SVGGElement>('.anim-stage .hit.sel [data-handle]')!;
  expect(handle).not.toBeNull();
  // The rocket's centre is (96, 320); its handle about (134, 358). Dragged twice as far from the centre, it is twice the size.
  const svg = stage(el);
  const b = svg.getBoundingClientRect();
  const at = (x: number, y: number) => ({ ...screen(svg, x, y), button: 0, buttons: 1, pointerId: 1, bubbles: true });
  handle.querySelector('rect')!.dispatchEvent(new PointerEvent('pointerdown', at(134, 358)));
  svg.dispatchEvent(new PointerEvent('pointermove', at(172, 396)));
  svg.dispatchEvent(new PointerEvent('pointerup', { ...at(172, 396), buttons: 0 }));
  await el.updateComplete;
  expect(keysTable(last())).toContain('\n1 | 0,0,0,0,2,0; 23,');
  const wheel = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
  svg.dispatchEvent(wheel);
  await el.updateComplete;
  expect(wheel.defaultPrevented).toBe(true);
  expect(stage(el).getBoundingClientRect().width).toBeGreaterThan(b.width * 1.2);
});

test('§1 opens with the focus on the stage, the page not scrolled', async () => {
  const { el } = await editor(LIFT);
  await el.focusFirst();
  expect(document.activeElement).toBe(stage(el));
  // A new animation opens with its drawing: Draw's canvas.
  const { el: blank } = await editor('');
  await blank.focusFirst();
  expect(document.activeElement).toBe(blank.querySelector('to-draw-editor .draw-wrap'));
  expect(document.scrollingElement!.scrollTop).toBe(0);
});

test('Draw mode has Draw\'s Align for a text in hand: a title centred there is centred in the motion, its keys kept', async () => {
  const { el, last } = await editor(LIFT);
  await tap(el, 112, 176);
  byWords(el, 'Draw').click();
  await el.updateComplete;
  const draw = el.querySelector<HTMLElement & { updateComplete: Promise<unknown> }>('to-draw-editor')!;
  await draw.updateComplete;
  const align = () => draw.querySelector<HTMLButtonElement>('.draw-context .to-context button[aria-label^="Align: "]');
  await until(() => !!align());
  expect(align()!.getAttribute('aria-label')).toBe('Align: left');
  align()!.click();
  await el.updateComplete;
  await tick();
  expect(last()).toContain('\nt | 4 | 20 | 20 | 4 | 04= | Lift off\n');
  expect(keysTable(last())).toBe(keysTable(LIFT));
});
