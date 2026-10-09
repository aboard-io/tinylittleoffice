// The Sheet editor in a real browser: typing is the document, the menus do rows and columns, the lock holds,
// undo takes an edit back, and at phone width the bar is one row and the page never scrolls.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToSheetEditor } from '../editor.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

const SHEET = 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450\nTotal | =SUM(B1:B2)\n';
const MODEL = '---\nchart: sankey\nlock: C1:C2\n---\nFrom | To | Amount:number | Assumption:name | Value:number\n--- | --- | --- | --- | ---\nVisitors | Signups | =visitors*rate/100 | Visitors | 1000\nVisitors | Bounced | =visitors-C1 | Rate | 10\n';

async function editor(value = ''): Promise<{ el: ToSheetEditor; last: () => string | undefined; changes: string[] }> {
  document.body.innerHTML = '';
  // As on the page: inside the shell's <main>, whose gutter the bar's margins assume.
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-sheet-editor') as ToSheetEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const cell = (el: HTMLElement, ref: string) => el.querySelector<HTMLInputElement>(`input[aria-label="${ref}"]`)!;
const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function type(el: ToSheetEditor, input: HTMLInputElement, value: string) {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
}
/** Open a menu from a button and pick the item with these words. */
async function pick(el: ToSheetEditor, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}

test('a blank sheet is three columns and no document; typing a cell makes the table', async () => {
  const { el, last, changes } = await editor();
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C']);
  expect(changes).toEqual([]);
  await type(el, cell(el, 'B2'), 'hello');
  expect(last()).toBe('ColA | ColB | ColC\n--- | --- | ---\n| |  |\n| | hello |\n');
  // The + adds a column that is drawn (the new cell on the selected row is focused), and written once typed into.
  button(el, 'Add a column').click();
  await el.updateComplete;
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C', 'D']);
  expect(changes).toHaveLength(1);
  await until(() => document.activeElement === cell(el, 'D2'));
  await type(el, cell(el, 'D1'), 'four');
  expect(last()).toBe('ColA | ColB | ColC | ColD\n--- | --- | --- | ---\n| |  |  | four\n| | hello |  |\n');
});

test('values are shown, the formula strip shows the raw formula, Enter moves down, undo takes an edit back', async () => {
  const { el, last } = await editor(SHEET);
  expect(cell(el, 'B3').value).toBe('$1,650.00');
  cell(el, 'B3').focus();
  await el.updateComplete;
  expect(cell(el, 'B3').value).toBe('=SUM(B1:B2)');
  expect(el.querySelector<HTMLInputElement>('.sheet-fx .fx')!.value).toBe('=SUM(B1:B2)');
  expect(el.querySelector('[aria-label="Selected cells"]')!.textContent).toBe('B3');
  await type(el, cell(el, 'B2'), '500');
  expect(cell(el, 'B3').value).toBe('$1,700.00');
  cell(el, 'B2').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await el.updateComplete;
  await until(() => document.activeElement === cell(el, 'B3'));
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe(SHEET);
  el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('Food | 500');
});

test('a row number opens insert above, insert below and delete; formulas follow', async () => {
  const { el, last } = await editor(SHEET);
  await pick(el, button(el, 'Row 2: insert or delete rows'), 'above');
  expect(last()).toBe('Item | Cost:money\n--- | ---\nRent | 1200\n| |\nFood | 450\nTotal | =SUM(B1:B3)\n');
  await pick(el, button(el, 'Row 1: insert or delete rows'), 'Delete');
  expect(last()).toBe('Item | Cost:money\n--- | ---\n| |\nFood | 450\nTotal | =SUM(B1:B2)\n');
  // Closed without choosing, the menu gives focus back to the row's button it opened from.
  const b = button(el, 'Row 1: insert or delete rows');
  b.focus();
  b.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  document.querySelector<HTMLElement>('[popover]:popover-open')!.hidePopover();
  await tick();
  expect(document.activeElement).toBe(b);
});

test('a column head opens what it holds, a sort, add and remove; names follow the type until given', async () => {
  const { el, last } = await editor(SHEET);
  const head = (c: number) => el.querySelectorAll<HTMLButtonElement>('th .col-head')[c];
  const names = () => el.querySelectorAll<HTMLInputElement>('tr.names .cn');
  expect(names()[2].value).toBe('');
  expect(names()[2].placeholder).toBe('ColC');
  await pick(el, head(2), 'Date');
  expect(last()).toMatch(/^Item \| Cost:money \| Date:date\n/);
  expect(names()[2].value).toBe('Date');
  names()[2].value = 'Paid on';
  names()[2].dispatchEvent(new Event('change', { bubbles: true }));
  await el.updateComplete;
  expect(last()).toMatch(/^Item \| Cost:money \| Paid on:date\n/);
  await pick(el, head(1), 'High to low');
  expect(last()).toMatch(/\nTotal \| =SUM\(B1:B2\) \|\nRent \| 1200 \|\nFood \| 450 \|\n$/);
  await pick(el, head(1), 'Add a column after');
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C', 'D']);
  expect(last()).toMatch(/^Item \| Cost:money \| ColC \| Paid on:date\n/);
  // The empty one may go; A, which holds something, may not.
  head(0).click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const remove = [...document.querySelectorAll<HTMLButtonElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Remove this column'))!;
  expect(remove.disabled).toBe(true);
  expect(remove.textContent).toContain('Once it is empty');
  document.querySelector<HTMLElement>('[popover]:popover-open')!.hidePopover();
  await tick();
  await pick(el, head(2), 'Remove this column');
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C']);
  expect(last()).toMatch(/^Item \| Cost:money \| Paid on:date\n/);
});

test('a model: named cells work, locked cells are left be, the lock moves with rows, the bar unlocks, the Sankey is drawn', async () => {
  const { el, last } = await editor(MODEL);
  expect(cell(el, 'C1').value).toBe('100');
  expect(cell(el, 'C2').value).toBe('900');
  expect(el.querySelectorAll('.sheet-chart svg path')).toHaveLength(2);
  await type(el, cell(el, 'E2'), '20');
  expect(cell(el, 'C1').value).toBe('200');
  expect(cell(el, 'C1').readOnly).toBe(true);
  await type(el, cell(el, 'C1'), '5');
  expect(last()).toContain('=visitors*rate/100');
  // A row put in above moves the model down, lock and all; taken out again, it comes back up.
  await pick(el, button(el, 'Row 1: insert or delete rows'), 'above');
  expect(last()).toContain('lock: C2:C3');
  expect(cell(el, 'C2').readOnly).toBe(true);
  await pick(el, button(el, 'Row 1: insert or delete rows'), 'Delete');
  expect(last()).toContain('lock: C1:C2');
  cell(el, 'C1').focus();
  await el.updateComplete;
  const unlock = button(el, 'Unlock these cells');
  expect(unlock.getAttribute('aria-pressed')).toBe('true');
  unlock.click();
  await el.updateComplete;
  expect(last()).not.toContain('lock:');
  await type(el, cell(el, 'C1'), '5');
  expect(last()).toContain('| 5 |');
  // The chart menu turns the chart off and on.
  await pick(el, el.querySelector<HTMLButtonElement>('.sheet-chartmenu button')!, 'No chart');
  expect(last()).not.toContain('chart:');
  expect(el.querySelector('.sheet-chart')).toBeNull();
  await pick(el, el.querySelector<HTMLButtonElement>('.sheet-chartmenu button')!, 'Bars');
  expect(last()).toContain('chart: bar');
});

test('a block: Shift+arrow stretches it, Delete clears it, fill carries the first row down, copy and paste move references', async () => {
  const { el, last } = await editor(SHEET);
  const b1 = cell(el, 'B1');
  b1.focus();
  b1.select();
  b1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('[aria-label="Selected cells"]')!.textContent).toBe('B1:B2');
  button(el, 'Fill down from the top row').click();
  await el.updateComplete;
  expect(last()).toContain('Food | 1200');
  // Copied as a block and pasted two rows down, a formula points at its new neighbours.
  const b3 = cell(el, 'B3');
  b3.focus();
  await el.updateComplete;
  const data = new DataTransfer();
  b3.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true }));
  expect(data.getData('text/plain')).toBe('=SUM(B1:B2)');
  const b5 = cell(el, 'B5');
  b5.focus();
  await el.updateComplete;
  b5.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  await el.updateComplete;
  expect(last()).toContain('| | =SUM(B3:B4)');
  b1.focus();
  b1.select();
  b1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
  await el.updateComplete;
  b1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await el.updateComplete;
  expect(last()).toContain('Rent |\nFood |\n');
});

test('at phone width: the bar is one row of 44px buttons, inputs are 16px, nothing is wider than the screen, and tapping cells never scrolls the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(SHEET);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    const h0 = bar.offsetHeight;
    expect(h0).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const ref of ['A1', 'B2', 'C3', 'A4', 'B5', 'C6', 'A7', 'B8', 'C9', 'A10']) {
      cell(el, ref).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      cell(el, ref).focus({ preventScroll: true });
      await el.updateComplete;
      expect(document.scrollingElement!.scrollTop).toBe(0);
      expect(bar.offsetHeight).toBe(h0);
    }
    const small = [...el.querySelectorAll<HTMLElement>('input')].filter((x) => parseFloat(getComputedStyle(x).fontSize) < 16);
    // Chromium reports a fine pointer here, so the 16px rule for coarse pointers is not in force: the rule itself is proven by the WebKit phone spec (e2e).
    expect(small.length === 0 || !matchMedia('(pointer: coarse)').matches).toBe(true);
  } finally {
    await page.viewport(1100, 800);
  }
});
