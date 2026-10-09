// The sheet's rows and columns, worked as a person would: a row's number opens insert and delete; a column's head opens its name, kind and sort.
import { test, expect } from 'vitest';
import { mount, settle, button, press, setSl } from './helpers.ts';
import { columnName, namesOf, parseGrid, typesOf } from '../../src/lib/formula.ts';

const SHEET = 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450\nTotal | =SUM(B1:B2)';
const colA = (text: string) => parseGrid(text).slice(0, 5).map((r) => r[0]);
const pick = async (el: HTMLElement, menu: Element, value: string) => {
  const item = menu.querySelector(`sl-menu-item[value="${value}"]`)!;
  item.closest('sl-dropdown')!.dispatchEvent(new CustomEvent('sl-select', { detail: { item }, bubbles: true }));
  await settle(el as never);
};

test('a row number opens insert above, insert below and delete; formulas follow', async () => {
  const { el, last } = await mount('sheet', SHEET);
  button(el, 'Row 2: insert or delete rows').click();
  await settle(el);
  const menu = el.querySelector('.row-menu')!;
  expect(menu.querySelector('sl-menu-label')!.textContent).toBe('Row 2');
  await pick(el, menu, 'above');
  expect(colA(last()!)).toEqual(['Rent', '', 'Food', 'Total', '']);
  expect(parseGrid(last()!)[3][1]).toBe('=SUM(B1:B3)');
  // The names over the columns are no row: they stay as they were.
  expect(namesOf(last()!).slice(0, 2)).toEqual(['Item', 'Cost']);
  button(el, 'Row 1: insert or delete rows').click();
  await settle(el);
  await pick(el, el.querySelector('.row-menu')!, 'delete');
  expect(colA(last()!)).toEqual(['', 'Food', 'Total', '', '']);
  expect(parseGrid(last()!)[2][1]).toBe('=SUM(B1:B2)');
});

test('Mod+Alt+= puts a row in above the cell; Mod+Alt+- takes it out', async () => {
  const { el, last } = await mount('sheet', SHEET);
  const b2 = el.querySelector<HTMLInputElement>('input[aria-label="B2"]')!;
  b2.dispatchEvent(new FocusEvent('focus'));
  await settle(el);
  b2.dispatchEvent(new KeyboardEvent('keydown', { key: '=', code: 'Equal', ctrlKey: true, altKey: true, bubbles: true }));
  await settle(el);
  expect(colA(last()!)).toEqual(['Rent', '', 'Food', 'Total', '']);
  const again = el.querySelector<HTMLInputElement>('input[aria-label="B2"]')!;
  again.dispatchEvent(new KeyboardEvent('keydown', { key: '-', code: 'Minus', ctrlKey: true, altKey: true, bubbles: true }));
  await settle(el);
  expect(colA(last()!)).toEqual(['Rent', 'Food', 'Total', '', '']);
});

test('a column head shows its letter and an arrow, its name in the row under; it goes by what it holds until renamed', async () => {
  const { el, last } = await mount('sheet', SHEET);
  // A and B are named by the table's header row; C goes by its letter.
  const heads = () => el.querySelectorAll<HTMLElement>('th .col-type');
  const names = () => el.querySelectorAll<HTMLInputElement>('tr.names .cn');
  expect([...names()].slice(0, 2).map((h) => h.value)).toEqual(['Item', 'Cost']);
  const head = () => heads()[2];
  expect(head().querySelector('.cl')!.textContent).toBe('C');
  expect(names()[2].value).toBe('ColC');
  expect(head().querySelector('svg')).toBeTruthy();
  // Holding dates, it is called Date.
  await pick(el, head().closest('sl-dropdown')!, 'date');
  expect(typesOf(last()!)[2]).toBe('date');
  expect(last()).toMatch(/^Item \| Cost:money \| Date:date\n/);
  expect(names()[2].value).toBe('Date');
  // Named by hand, where it stands, it keeps its name whatever it holds.
  names()[2].value = 'Paid on';
  names()[2].dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(namesOf(last()!)[2]).toBe('Paid on');
  await pick(el, head().closest('sl-dropdown')!, 'text');
  expect(columnName(2, typesOf(last()!), namesOf(last()!))).toBe('Paid on');
  expect(names()[2].value).toBe('Paid on');
});
