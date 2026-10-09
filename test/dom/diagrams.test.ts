// The diagram apps in happy-dom: an outline typed, the picture it makes, examples, a slide that builds (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, press, setSl } from './helpers.ts';
import { open, reopen, go, prefs, asText, box, typeIn, keyIn, settleAll, until, pickIcon, insert } from './helpers-more.ts';

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
  await insert(el, 'Insert', 'mind');
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

test('venn: a third set is added on the picture and typed into, its things one under another and none wrapped', async () => {
  prefs();
  localStorage.removeItem('tinyoffice.edit');
  const { el, last } = await mount('venn', '- Fast: sprinting, espresso\n- Cheap: instant noodles, walking');
  const texts = () => [...el.querySelectorAll('.pic > svg text')].map((t) => t.textContent);
  // Each thing is one line of text: "instant noodles" is not broken over two.
  expect(texts()).toContain('instant noodles');
  expect(el.querySelectorAll('.pic > svg ellipse')).toHaveLength(2);
  // A tap on empty space, well away from the circles: a third set, named where it stands.
  const svg = el.querySelector<SVGSVGElement>('.pic > svg')!;
  Object.assign(svg, { createSVGPoint: () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 700, y: 700 }) }), getScreenCTM: () => ({ inverse: () => ({}) }) });
  el.querySelector('.pic')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await settle(el);
  expect(el.querySelectorAll('.pic > svg ellipse')).toHaveLength(3);
  const box = () => el.querySelector<HTMLInputElement>('.pic-edit input')!;
  box().value = 'Good';
  box().dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('- Fast: sprinting, espresso\n- Cheap: instant noodles, walking\n- Good:');
  expect(el.querySelectorAll('.pic > svg ellipse')).toHaveLength(3);
  // Enter: the first thing in it, drawn with its field's name until typed into (the set stays on the picture throughout).
  press(box(), 'Enter');
  await settle(el);
  expect(el.querySelectorAll('.pic > svg ellipse')).toHaveLength(3);
  expect(texts()).toContain('What is in it');
  box().value = 'slow cooking';
  box().dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('- Fast: sprinting, espresso\n- Cheap: instant noodles, walking\n- Good: slow cooking');
  expect(texts().filter((t) => t === 'slow cooking')).toHaveLength(1);
});

test('draw: a stroke by hand is a line of its own shape, closed into a shape when it ends where it began', async () => {
  const { el, last } = await mount('draw');
  const { canvas, shapes } = canvasOf(el);
  // The canvas as laid out: 640 by 400 at the top left, so pointer places are the drawing's own.
  canvas().getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 400, right: 640, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
  const at = (type: string, x: number, y: number) => canvas().dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
  button(el, /^Freehand/).click();
  await settle(el);
  expect(el.querySelector('.draw-hint')?.textContent).toContain('Drag to draw');
  // A wobbly line from left to right, then down: a stroke, its wobble smoothed to a few corners.
  at('pointerdown', 40, 100);
  for (let x = 44; x <= 200; x += 4) at('pointermove', x, 100 + (x % 8 === 0 ? 1 : 0));
  at('pointermove', 200, 160);
  at('pointerup', 200, 160);
  await settle(el);
  expect(shapes()).toHaveLength(1);
  expect(shapes()[0].querySelector('polyline[fill="none"]')).toBeTruthy();
  const stroke = last()!.split('\n').at(-1)!;
  expect(stroke.startsWith('w | ')).toBe(true);
  expect(stroke.split(' | ').at(-1)!.split(';').length).toBeLessThan(6);
  // Drawn round and back to its start: a shape, filled.
  button(el, /^Freehand/).click();
  await settle(el);
  at('pointerdown', 300, 100);
  at('pointermove', 400, 100);
  at('pointermove', 400, 200);
  at('pointermove', 300, 200);
  at('pointermove', 302, 104);
  at('pointerup', 302, 104);
  await settle(el);
  expect(shapes()).toHaveLength(2);
  expect(shapes()[1].querySelector('polygon')).toBeTruthy();
  expect(last()!.split('\n').at(-1)!.startsWith('v | ')).toBe(true);
});

test('timeline: one line that grows wider, an event added on the picture, an era as a band', async () => {
  prefs();
  localStorage.removeItem('tinyoffice.edit');
  const { el, last } = await mount('timeline', '- 1900: Then\n- 1950: Between\n- 2000: Now\n- 1950–2000: The later half');
  const svg = () => el.querySelector<SVGSVGElement>('.pic > svg')!;
  // Drawn at its own width (the page scrolls sideways), the dots on one line, boxes above and below it in turn.
  expect(svg().getAttribute('style')).toMatch(/--w:[\d.]+px/);
  const dots = () => [...el.querySelectorAll<SVGEllipseElement>('.pic > svg ellipse')];
  expect(dots()).toHaveLength(3);
  expect(new Set(dots().map((d) => d.getAttribute('cy'))).size).toBe(1);
  const boxY = (words: string) => +[...el.querySelectorAll('.pic > svg g.pick')].find((g) => g.textContent!.includes(words))!.querySelector('rect')!.getAttribute('y')!;
  expect(boxY('Then')).toBeLessThan(150);
  expect(boxY('Between')).toBeGreaterThan(150);
  // The era is a band, below the boxes.
  expect(boxY('The later half')).toBeGreaterThan(boxY('Between'));
  // A tap on empty space, far to the right: a new event, drawn where the line ends, its When ready to type.
  Object.assign(svg(), { createSVGPoint: () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 2000, y: 20 }) }), getScreenCTM: () => ({ inverse: () => ({}) }) });
  el.querySelector('.pic')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  await settle(el);
  expect(dots()).toHaveLength(4);
  // Its box has a field for the When and one for what happened.
  const field = (n: number) => el.querySelectorAll<HTMLInputElement>('.pic-edit input')[n];
  field(0).value = '2020';
  field(0).dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  field(1).value = 'Soon';
  field(1).dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('- 1900: Then\n- 1950: Between\n- 2000: Now\n- 1950–2000: The later half\n- 2020: Soon');
  expect(dots()).toHaveLength(4);
});
