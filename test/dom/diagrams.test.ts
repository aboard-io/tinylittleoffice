// The diagram apps in happy-dom: an outline typed, the picture it makes, examples, a slide that builds (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { mount, settle, button, press } from './helpers.ts';
import { open, reopen, go, prefs, asText, box, typeIn, keyIn, settleAll, until } from './helpers-more.ts';

beforeEach(() => {
  prefs();
  asText();
});

test('diagram apps: write an outline, get a picture, use it anywhere', async () => {
  await open('#/v0/org');
  const text = () => box<HTMLTextAreaElement>(document, 'Org chart, as text');
  expect(document.querySelector('to-org .to-empty')).toBeTruthy();
  typeIn(text(), 'Ada | CEO');
  keyIn(text(), 'Enter');
  typeIn(text(), 'Ben | Engineering');
  // Tab puts Ben under Ada.
  keyIn(text(), 'Tab');
  await settleAll();
  // Enter keeps the indent of the line before.
  keyIn(text(), 'Enter');
  await settleAll();
  typeIn(text(), 'Eve | Design');
  await settleAll();
  expect(text().value).toBe('Ada | CEO\n  Ben | Engineering\n  Eve | Design');
  const pic = () => document.querySelector('to-org .pic svg')!;
  expect(pic().querySelectorAll('rect')).toHaveLength(3);
  expect(pic().querySelectorAll('line')).toHaveLength(2);
  expect(pic().textContent).toContain('Engineering');
  await until(() => expect(location.hash).toMatch(/#\/v0\/org\/[WYZR]/));
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
  // The database answers its queries under its schema.
  const { el } = await mount('db');
  button(el, 'Start from an example').click();
  await settle(el);
  const rows = el.querySelectorAll('.diagram-aside tbody tr');
  expect(rows).toHaveLength(2);
  expect(rows[0].textContent!.replace(/\s+/g, '')).toBe('Platform2');
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
  area.value = 'Launch\n  Product\n  Marketing';
  area.dispatchEvent(new Event('input', { bubbles: true }));
  await settleAll();
  button(sub, 'Done').click();
  await until(() => expect(last()).toMatch(/@@mind\/[A-Za-z0-9]/));
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
