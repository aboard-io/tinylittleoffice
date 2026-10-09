// The diagram apps in happy-dom: an outline typed, the picture it makes, examples, a slide that builds (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, press, setSl } from './helpers.ts';
import { open, reopen, go, prefs, asText, box, typeIn, keyIn, settleAll, until, pickIcon } from './helpers-more.ts';

beforeEach(() => {
  prefs();
  asText();
});

test('diagram apps: write an outline, get a picture, use it anywhere', async () => {
  await open('#/v0/org');
  const text = () => box<HTMLTextAreaElement>(document, 'Org chart, as text');
  expect(document.querySelector('to-org .to-empty')).toBeTruthy();
  typeIn(text(), '- Ada | CEO');
  keyIn(text(), 'Enter');
  typeIn(text(), '- Ben | Engineering');
  // Tab puts Ben under Ada.
  keyIn(text(), 'Tab');
  await settleAll();
  // Enter keeps the indent of the line before.
  keyIn(text(), 'Enter');
  await settleAll();
  typeIn(text(), '- Eve | Design');
  await settleAll();
  expect(text().value).toBe('- Ada | CEO\n  - Ben | Engineering\n  - Eve | Design');
  const pic = () => document.querySelector('to-org .pic svg')!;
  expect(pic().querySelectorAll('rect')).toHaveLength(3);
  expect(pic().querySelectorAll('line')).toHaveLength(2);
  expect(pic().textContent).toContain('Engineering');
  await until(() => expect(location.hash).toMatch(/#\/v0\/org\/[yzr]/));
  const org = location.hash;
  await reopen();
  expect(pic().querySelectorAll('rect')).toHaveLength(3);
  // It opens in Draw, where the shapes can be moved by hand.
  button(document, 'Open in Draw').click();
  await go(location.hash);
  expect(document.querySelectorAll('to-draw g.shape')).toHaveLength(5);
  await go(org);
  expect(pic().querySelectorAll('rect')).toHaveLength(3);
});

test('diagram apps: the example button fills an empty one in; each app draws its own', async () => {
  for (const [app, sel, n] of [['mind', 'rect', 9], ['lanes', 'polygon', 1], ['venn', 'ellipse', 3], ['net', 'line', 5]] as const) {
    const { el } = await mount(app);
    button(el, 'Start from an example').click();
    await settle(el);
    // (A line has a wide transparent twin, to be tapped: only the drawn ones are counted.)
    expect(el.querySelectorAll(`.pic svg ${sel}:not([stroke="transparent"])`), app).toHaveLength(n);
  }
});

test('a diagram on a slide: chosen from Add a slide, it builds a shape per click', async () => {
  const { el, last } = await mount('deck');
  const add = box(el, 'Add a slide');
  add.value = 'mind';
  add.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  press(add, 'Enter');
  await settleAll();
  const sub = document.querySelector('sl-dialog.to-sub')!;
  expect(sub).toBeTruthy();
  const area = box<HTMLTextAreaElement>(sub, 'Mind map, as text');
  area.value = '- Launch\n  - Product\n  - Marketing';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  await settleAll();
  button(sub, 'Done').click();
  await until(() => expect(last()).toMatch(/```mind\n\S/));
  await settleAll();
  expect(el.querySelectorAll('.deck-slide to-embed')).toHaveLength(1);
  await until(() => expect(el.querySelector('.deck-slide to-embed')!.shadowRoot!.querySelectorAll('svg[role="img"] rect')).toHaveLength(3));
  button(el, /Present/).click();
  await settle(el);
  const slide = () => el.querySelector('.deck-show .frame > svg')!;
  const key = async (k: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await settle(el);
  };
  expect(slide().querySelectorAll('rect')).toHaveLength(0);
  // A thing, the next thing, then the line between them.
  await key('ArrowRight');
  expect(slide().textContent).toContain('Launch');
  expect(slide().textContent).not.toContain('Product');
  await key('ArrowRight');
  expect(slide().textContent).toContain('Product');
  expect(slide().querySelectorAll('line')).toHaveLength(0);
  await key('ArrowRight');
  expect(slide().querySelectorAll('line')).toHaveLength(1);
  expect(slide().textContent).not.toContain('Marketing');
  await key('End');
  expect(slide().textContent).toContain('Marketing');
});

/** Draw's canvas, and a pointer on one of its shapes (what is under the pointer is the shape itself; places on the canvas are e2e's). */
function canvasOf(el: HTMLElement) {
  const canvas = () => el.querySelector('svg[aria-label="Drawing canvas"]')!;
  const shapes = () => [...canvas().querySelectorAll('g.shape')];
  const on = (type: string, target: Element) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, button: 0, pointerId: 1 }));
  return { canvas, shapes, on };
}

test('draw: shapes can be joined, and the join follows them', async () => {
  const { el, last } = await mount('draw', 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Web\nc | 40 | 20 | 14 | 10 | 0 | Data');
  const { canvas, shapes, on } = canvasOf(el);
  expect(shapes()).toHaveLength(2);
  // The join tool: press on one shape, let go on the other.
  button(el, 'Join two shapes').click();
  await settle(el);
  on('pointerdown', shapes()[0].firstElementChild!);
  const over = shapes()[1].firstElementChild!;
  document.elementFromPoint = () => over;
  on('pointerup', canvas());
  await settle(el);
  expect(shapes()).toHaveLength(3);
  const line = () => shapes()[2].querySelector('line[marker-end]')!;
  expect(line()).toBeTruthy();
  const before = line().getAttribute('x2');
  setSl(el.querySelector('sl-input.draw-label'), 'reads', 'sl-input');
  await settle(el);
  expect(canvas().textContent).toContain('reads');
  // Move the cylinder (here with the arrow keys): the join goes with it.
  button(el, 'Select').click();
  on('pointerdown', shapes()[1].firstElementChild!);
  on('pointerup', canvas());
  await settle(el);
  press(el.querySelector('.draw-wrap'), 'ArrowRight');
  press(el.querySelector('.draw-wrap'), 'ArrowUp');
  await settle(el);
  expect(line().getAttribute('x2')).not.toBe(before);
  // Opened again from what it saved.
  const again = await mount('draw', last()!);
  const d = canvasOf(again.el);
  expect(d.shapes()).toHaveLength(3);
  expect(d.canvas().textContent).toContain('reads');
  // Delete a joined shape and its join goes too.
  d.on('pointerdown', d.shapes()[0].firstElementChild!);
  d.on('pointerup', d.canvas());
  await settle(again.el);
  press(again.el.querySelector('.draw-wrap'), 'Delete');
  await settle(again.el);
  expect(d.shapes()).toHaveLength(1);
  expect(d.canvas().querySelectorAll('line[marker-end]')).toHaveLength(0);
});

test('draw: an icon on a shape; and the diagram apps take icons too', async () => {
  const { el, last } = await mount('draw', 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\no | 4 | 6 | 16 | 8 | 1b | Web');
  const { canvas, shapes, on } = canvasOf(el);
  // An icon in front of the selected shape's label.
  on('pointerdown', shapes()[0].firstElementChild!);
  on('pointerup', canvas());
  await settle(el);
  expect((el.querySelector('sl-input.draw-label') as unknown as { value: string }).value).toBe('Web');
  button(el, 'Icon').click();
  await pickIcon('globe', 'globe');
  await settle(el);
  expect(shapes()[0].querySelectorAll('g[stroke-linecap="round"]')).toHaveLength(1);
  expect(canvas().textContent).toContain('Web');
  expect(last()).toMatch(/:globe Web/);
  // The diagram apps: one click puts ":name" on the line.
  const org = await mount('org');
  const text = box<HTMLTextAreaElement>(org.el, 'Org chart, as text');
  typeIn(text, 'Ada | CEO');
  await settle(org.el);
  button(org.el, 'Icon').click();
  await pickIcon('crown', 'crown');
  await settle(org.el);
  expect(box<HTMLTextAreaElement>(org.el, 'Org chart, as text').value).toBe(':crown Ada | CEO');
  expect(org.el.querySelectorAll('.pic svg g[stroke-linecap="round"]')).toHaveLength(1);
});
