// The outliner's bar under the header, the bullets that are lines to the parent ({.from}, {.to}, {.both}), their names, and joins (edges) between any two items.
import { test, expect } from 'vitest';
import { mount, settle, button, press, type Editor } from './helpers.ts';
import { parseLinks, parseOutline } from '../../src/lib/outlinemodel.ts';

const DOC = '- Launch\n  - Product\n    - Pricing\n  - Marketing';
const row = (el: Editor, i: number) => el.querySelector<HTMLElement>(`.ol-row[data-i="${i}"]`)!;
const choose = async (el: Editor, i: number) => {
  row(el, i).querySelector('to-rich')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await settle(el);
};
const nav = (el: Editor) => el.querySelector<HTMLElement>('.to-toolbar')!;

test('the rows carry no indent buttons; the bar does it for the chosen item', async () => {
  const { el, last } = await mount('outline', DOC);
  expect(el.querySelector('.ol-shift')).toBeNull();
  expect(nav(el).getAttribute('aria-label')).toBe('Outline');
  expect(button(nav(el), 'Indent').hasAttribute('disabled')).toBe(true);
  await choose(el, 3);
  button(nav(el), 'Indent').click();
  await settle(el);
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n    - Marketing');
  button(nav(el), 'Move up').click();
  await settle(el);
  expect(last()).toBe('- Launch\n  - Product\n    - Marketing\n    - Pricing');
  // Brought out, Marketing takes Pricing (now below it) under it.
  button(nav(el), 'Bring out').click();
  await settle(el);
  expect(last()).toBe('- Launch\n  - Product\n  - Marketing\n    - Pricing');
});

/** A bullet's menu, opened by tapping the bullet; then a kind chosen, or a name typed. */
const menuOf = async (el: Editor, bulletIn: Element) => {
  (bulletIn.querySelector('button.ol-kind') as HTMLElement).click();
  await settle(el);
  return el.querySelector<HTMLElement>('.ol-menu')!;
};
const pickKind = async (el: Editor, menu: HTMLElement, dir: string) => {
  const item = menu.querySelector(`sl-menu-item[value="${dir}"]`)!;
  menu.dispatchEvent(new CustomEvent('sl-select', { detail: { item }, bubbles: true }));
  await settle(el);
};
const nameIn = async (el: Editor, menu: HTMLElement, name: string) => {
  const box = menu.querySelector('.ol-menu-name sl-input') as HTMLElement & { value: string };
  box.value = name;
  box.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));
  await settle(el);
};

test('a row is its bullet and its words: the fold arrow and the handle sit in the gutter, and only a parent has an arrow', async () => {
  const { el } = await mount('outline', DOC);
  expect(row(el, 0).querySelector('.ol-gutter .ol-fold')).toBeTruthy();
  expect(row(el, 2).querySelector('.ol-fold')).toBeNull();
  // Every row has one bullet, and nothing else before its words.
  for (const i of [0, 1, 2, 3]) expect([...row(el, i).children].map((c) => c.className.split(' ')[0]).slice(0, 2)).toEqual(['ol-gutter', 'ol-bullet']);
  // A top item has no line to a parent: its bullet is only a dot.
  expect(row(el, 0).querySelector('button.ol-kind')).toBeNull();
});

test('the bullet opens the kinds of line, each named for the items it joins; the choice is saved', async () => {
  const { el, last } = await mount('outline', DOC);
  const bullet = () => row(el, 2).querySelector<HTMLElement>('button.ol-kind')!;
  expect(bullet().getAttribute('aria-label')).toBe('Line from Product to Pricing: a plain line. Change it');
  const menu = await menuOf(el, row(el, 2));
  expect([...menu.querySelectorAll('sl-menu-item')].map((m) => m.textContent!.trim())).toEqual(['Plain line', 'Arrow from Product to Pricing', 'Arrow from Pricing to Product', 'Arrows both ways']);
  await pickKind(el, menu, '->');
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.from}');
  await pickKind(el, await menuOf(el, row(el, 2)), '<->');
  expect(parseOutline(last()!)[2].dir).toBe('<->');
  await pickKind(el, await menuOf(el, row(el, 2)), '--');
  expect(last()!.split('\n')[2]).toBe('    - Pricing');
  // A parent's bullet zooms in too.
  expect((await menuOf(el, row(el, 1))).querySelector('sl-menu-item[value="zoom"]')).toBeTruthy();
});

test('the line is named in the bullet’s menu; the name shows as a chip, which opens the menu again; clearing it takes it off', async () => {
  const { el, last } = await mount('outline', DOC);
  await nameIn(el, await menuOf(el, row(el, 1)), 'makes');
  expect(parseOutline(last()!)[1]).toEqual({ depth: 1, text: 'Product', label: 'makes' });
  const chip = row(el, 1).querySelector<HTMLElement>('.ol-label')!;
  expect(chip.textContent).toBe('makes');
  chip.click();
  await settle(el);
  const menu = el.querySelector<HTMLElement>('.ol-menu')!;
  expect((menu.querySelector('.ol-menu-name sl-input') as HTMLElement & { value: string }).value).toBe('makes');
  // Typing in the name box is not taken as choosing from the menu.
  expect(() => press(menu.querySelector('.ol-menu-name sl-input'), 'p')).not.toThrow();
  await nameIn(el, menu, '');
  expect(last()!.split('\n')[1]).toBe('  - Product');
  expect(row(el, 1).querySelector('.ol-label')).toBeNull();
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
  expect(parseLinks(last()!)).toEqual([{ from: 'Pricing', to: 'Marketing', dir: '--' }]);

  const link = () => el.querySelector<HTMLElement>('.ol-links .ol-link')!;
  expect(link().querySelector('button.ol-kind')!.getAttribute('aria-label')).toBe('Connection from Pricing to Marketing: a plain line. Change it');
  await pickKind(el, await menuOf(el, link()), '->');
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -> Marketing');
  await nameIn(el, await menuOf(el, link()), 'feeds');
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -> Marketing: feeds');

  // Renaming an item carries its joins with it.
  row(el, 3).querySelector('to-rich')!.dispatchEvent(new CustomEvent('rich-change', { detail: 'Growth', bubbles: true }));
  await settle(el);
  expect(last()!.split('\n').at(-1)).toBe('~ Pricing -> Growth: feeds');

  // Taken away from its menu, or its own button.
  await pickKind(el, await menuOf(el, link()), 'remove');
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
