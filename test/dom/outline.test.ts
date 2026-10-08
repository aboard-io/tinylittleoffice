// The outliner's bar under the header, the bullets that are lines to the parent, their names, and joins between any two items.
import { test, expect } from 'vitest';
import { mount, settle, button, press, type Editor } from './helpers.ts';
import { parseLinks, parseOutline } from '../../src/lib/outlinemodel.ts';

const DOC = 'Launch\n  Product\n    Pricing\n  Marketing';
const row = (el: Editor, i: number) => el.querySelector<HTMLElement>(`.ol-row[data-i="${i}"]`)!;
const choose = async (el: Editor, i: number) => {
  row(el, i).querySelector('to-rich')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await settle(el);
};
const nav = (el: Editor) => el.querySelector<HTMLElement>('.ol-nav')!;

test('the rows carry no indent buttons; the bar does it for the chosen item', async () => {
  const { el, last } = await mount('outline', DOC);
  expect(el.querySelector('.ol-shift')).toBeNull();
  expect(nav(el).getAttribute('aria-label')).toBe('Arrange and connect');
  expect(button(nav(el), 'Indent').hasAttribute('disabled')).toBe(true);
  await choose(el, 3);
  button(nav(el), 'Indent').click();
  await settle(el);
  expect(last()).toBe('Launch\n  Product\n    Pricing\n    Marketing');
  button(nav(el), 'Move up').click();
  await settle(el);
  expect(last()).toBe('Launch\n  Product\n    Marketing\n    Pricing');
  // Brought out, Marketing takes Pricing (now below it) under it.
  button(nav(el), 'Bring out').click();
  await settle(el);
  expect(last()).toBe('Launch\n  Product\n  Marketing\n    Pricing');
});

test('a bullet turns through the four kinds of line to its parent', async () => {
  const { el, last } = await mount('outline', DOC);
  // A top item has no parent, so no line to turn.
  expect(row(el, 0).querySelector('button.ol-kind')).toBeNull();
  const kind = () => row(el, 2).querySelector<HTMLElement>('button.ol-kind')!;
  expect(kind().getAttribute('aria-label')).toBe('The line from “Product” to item 3: a plain line. Change it');
  const seen: string[] = [];
  for (let n = 0; n < 4; n++) {
    kind().click();
    await settle(el);
    seen.push(parseOutline(last()!)[2].dir ?? '-');
  }
  expect(seen).toEqual(['>', '<', '<>', '-']);
  kind().click();
  await settle(el);
  expect(last()!.split('\n')[2]).toBe('    -> Pricing');
});

test('the plus names the line; the name shows, and can be changed or cleared', async () => {
  const { el, last } = await mount('outline', DOC);
  button(row(el, 1), /^Name the line from “Launch”/).click();
  await settle(el);
  const box = row(el, 1).querySelector<HTMLInputElement>('.ol-label-input')!;
  box.value = 'makes';
  press(box, 'Enter');
  await settle(el);
  expect(parseOutline(last()!)[1]).toEqual({ depth: 1, text: 'Product', label: 'makes' });
  expect(row(el, 1).querySelector('.ol-label')!.textContent).toBe('makes');
  // Escape leaves it as it was.
  (row(el, 1).querySelector('.ol-label') as HTMLElement).click();
  await settle(el);
  const again = row(el, 1).querySelector<HTMLInputElement>('.ol-label-input')!;
  again.value = 'nope';
  press(again, 'Escape');
  await settle(el);
  expect(row(el, 1).querySelector('.ol-label')!.textContent).toBe('makes');
  (row(el, 1).querySelector('.ol-label') as HTMLElement).click();
  await settle(el);
  const clear = row(el, 1).querySelector<HTMLInputElement>('.ol-label-input')!;
  clear.value = '';
  press(clear, 'Enter');
  await settle(el);
  expect(last()!.split('\n')[1]).toBe('  Product');
});

test('Connect greys the outline until the other end is tapped, and the join can be turned, named and taken away', async () => {
  const { el, last } = await mount('outline', DOC);
  await choose(el, 2);
  button(nav(el), 'Connect').click();
  await settle(el);
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(true);
  expect(row(el, 2).classList.contains('source')).toBe(true);
  expect(row(el, 2).querySelector('.ol-pick')).toBeNull();
  button(row(el, 3), 'Connect “Pricing” to “Marketing”').click();
  await settle(el);
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(false);
  expect(parseLinks(last()!)).toEqual([{ from: 'Pricing', to: 'Marketing', dir: '-' }]);

  const link = el.querySelector<HTMLElement>('.ol-links .ol-link')!;
  button(link, /^The connection from “Pricing” to “Marketing”: a plain line/).click();
  await settle(el);
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -> Marketing');
  button(el.querySelector('.ol-link')!, /^Name the connection/).click();
  await settle(el);
  const box = el.querySelector<HTMLInputElement>('.ol-link .ol-label-input')!;
  box.value = 'feeds';
  press(box, 'Enter');
  await settle(el);
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -(feeds)-> Marketing');

  // Renaming an item carries its joins with it.
  row(el, 3).querySelector('to-rich')!.dispatchEvent(new CustomEvent('rich-change', { detail: 'Growth', bubbles: true }));
  await settle(el);
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -(feeds)-> Growth');

  button(el.querySelector('.ol-link')!, /^Take away/).click();
  await settle(el);
  expect(parseLinks(last()!)).toEqual([]);
  expect(el.querySelector('.ol-links')).toBeNull();
});

test('with nothing chosen, Connect asks for both ends; Escape gives up', async () => {
  const { el, last } = await mount('outline', DOC);
  button(nav(el), 'Connect').click();
  await settle(el);
  expect(nav(el).querySelector('.ol-nav-hint')!.textContent).toBe('Tap the item to connect from.');
  button(row(el, 0), 'Connect from “Launch”').click();
  await settle(el);
  press(el.querySelector('.ol'), 'Escape');
  await settle(el);
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(false);
  expect(last()).toBeUndefined();
});
