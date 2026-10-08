// The sheet's rows and columns, worked as a person would: a row's number opens insert and delete; a column's head opens its name, kind and sort.
import { test, expect } from 'vitest';
import { mount, settle, button, press, setSl } from './helpers.ts';
import { columnName, namesOf, parseGrid, typesOf } from '../../src/lib/formula.ts';

const SHEET = 'Item\tCost\nRent\t1200\nFood\t450\nTotal\t=SUM(B2:B3)';
const colA = (text: string) => parseGrid(text).slice(0, 5).map((r) => r[0]);
const pick = async (el: HTMLElement, menu: Element, value: string) => {
  const item = menu.querySelector(`sl-menu-item[value="${value}"]`)!;
  item.closest('sl-dropdown')!.dispatchEvent(new CustomEvent('sl-select', { detail: { item }, bubbles: true }));
  await settle(el as never);
};

test('a row number opens insert above, insert below and delete; formulas follow', async () => {
  const { el, last } = await mount('sheet', SHEET);
  button(el, 'Row 3: insert or delete rows').click();
  await settle(el);
  const menu = el.querySelector('.row-menu')!;
  expect(menu.querySelector('sl-menu-label')!.textContent).toBe('Row 3');
  await pick(el, menu, 'above');
  expect(colA(last()!)).toEqual(['Item', 'Rent', '', 'Food', 'Total']);
  expect(parseGrid(last()!)[4][1]).toBe('=SUM(B2:B4)');
  button(el, 'Row 2: insert or delete rows').click();
  await settle(el);
  await pick(el, el.querySelector('.row-menu')!, 'delete');
  expect(colA(last()!)).toEqual(['Item', '', 'Food', 'Total', '']);
  expect(parseGrid(last()!)[3][1]).toBe('=SUM(B2:B3)');
});

test('Mod+Alt+= puts a row in above the cell; Mod+Alt+- takes it out', async () => {
  const { el, last } = await mount('sheet', SHEET);
  const b2 = el.querySelector<HTMLInputElement>('input[aria-label="B2"]')!;
  b2.dispatchEvent(new FocusEvent('focus'));
  await settle(el);
  b2.dispatchEvent(new KeyboardEvent('keydown', { key: '=', code: 'Equal', ctrlKey: true, altKey: true, bubbles: true }));
  await settle(el);
  expect(colA(last()!)).toEqual(['Item', '', 'Rent', 'Food', 'Total']);
  const again = el.querySelector<HTMLInputElement>('input[aria-label="B2"]')!;
  again.dispatchEvent(new KeyboardEvent('keydown', { key: '-', code: 'Minus', ctrlKey: true, altKey: true, bubbles: true }));
  await settle(el);
  expect(colA(last()!)).toEqual(['Item', 'Rent', 'Food', 'Total', '']);
});

test('a column head shows its letter, its name and an arrow; it goes by what it holds until renamed', async () => {
  const { el, last } = await mount('sheet', SHEET);
  const head = () => el.querySelectorAll<HTMLElement>('th .col-type')[0];
  expect(head().querySelector('.cl')!.textContent).toBe('A');
  expect(head().querySelector('.cn')!.textContent).toBe('ColA');
  expect(head().querySelector('svg')).toBeTruthy();
  // Holding dates, it is called Date.
  await pick(el, head().closest('sl-dropdown')!, 'd');
  expect(typesOf(last()!)[0]).toBe('d');
  expect(head().querySelector('.cn')!.textContent).toBe('Date');
  // Named by hand, it keeps its name whatever it holds.
  const name = head().closest('sl-dropdown')!.querySelector('.col-name sl-input')!;
  setSl(name, 'Paid on', 'sl-change');
  await settle(el);
  expect(namesOf(last()!)[0]).toBe('Paid on');
  await pick(el, head().closest('sl-dropdown')!, 't');
  expect(columnName(0, typesOf(last()!), namesOf(last()!))).toBe('Paid on');
  expect(head().querySelector('.cn')!.textContent).toBe('Paid on');
  // Typing in the name box is not taken as choosing from the menu.
  expect(() => press(name, 'D')).not.toThrow();
});
