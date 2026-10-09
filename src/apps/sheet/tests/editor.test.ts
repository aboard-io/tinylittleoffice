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
  await until(() => !!document.querySelector('[popover]:popover-open:not(.to-context)'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open:not(.to-context) [role^=menuitem]')];
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
  await until(() => !!document.querySelector('[popover]:popover-open:not(.to-context)'));
  document.querySelector<HTMLElement>('[popover]:popover-open:not(.to-context)')!.hidePopover();
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
  await until(() => !!document.querySelector('[popover]:popover-open:not(.to-context)'));
  const remove = [...document.querySelectorAll<HTMLButtonElement>('[popover]:popover-open:not(.to-context) [role^=menuitem]')].find((x) => x.textContent!.includes('Remove this column'))!;
  expect(remove.disabled).toBe(true);
  expect(remove.textContent).toContain('Once it is empty');
  document.querySelector<HTMLElement>('[popover]:popover-open:not(.to-context)')!.hidePopover();
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

/* ---------- the editing standard (docs/editing.md §1, §4, §7) ---------- */

const key = (target: HTMLElement, k: string, o: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o });
  target.dispatchEvent(e);
  return e;
};
const selected = (el: HTMLElement) => el.querySelector('[aria-label="Selected cells"]')!.textContent;
const contextBar = () => document.querySelector<HTMLElement>('.sheet-context .to-context')!;
const contextButton = (label: string) => contextBar().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
async function block(el: ToSheetEditor, from: string, ...keys: string[]) {
  const a = cell(el, from);
  a.focus();
  a.select();
  for (const k of keys) key(a, k, { shiftKey: true });
  await el.updateComplete;
  return a;
}

test('the bar ends with Undo and Redo, which never take the focus; an undo selects again the cells it gave back', async () => {
  const { el, last } = await editor(SHEET);
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar.sheet-bar > button')];
  expect(tools.slice(-2).map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo']);
  expect(button(el, 'Undo').disabled).toBe(true);
  const b1 = await block(el, 'B1', 'ArrowDown');
  key(b1, 'Delete');
  await el.updateComplete;
  expect(last()).toContain('Rent |\nFood |\n');
  // Elsewhere, then Undo from the bar: the block is back, and selected.
  await type(el, cell(el, 'A3'), 'Sum');
  focusOn(cell(el, 'A3'));
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  button(el, 'Undo').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  button(el, 'Undo').click();
  button(el, 'Undo').click();
  await el.updateComplete;
  expect(last()).toBe(SHEET);
  await until(() => document.activeElement === cell(el, 'B1'));
  expect(selected(el)).toBe('B1:B2');
  button(el, 'Redo').click();
  await el.updateComplete;
  expect(last()).toContain('Rent |\nFood |\n');
});
function focusOn(input: HTMLInputElement) {
  input.focus();
}

test('copy writes the cells as text and as our table HTML; paste reads our tables, another app\'s table and an outline\'s items', async () => {
  const { el, last } = await editor(SHEET);
  const a1 = await block(el, 'A1', 'ArrowDown', 'ArrowRight');
  const data = new DataTransfer();
  a1.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }));
  expect(data.getData('text/plain')).toBe('Rent\t1200\nFood\t450');
  const html = data.getData('text/html');
  expect(html).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(html).toContain('<table><tr><th>Rent</th><th>$1,200.00</th></tr><tr><td>Food</td><td>$450.00</td></tr></table>');
  // A Write table (our marker, TLO text): its names the first row.
  const paste = async (at: string, d: Record<string, string>) => {
    const target = cell(el, at);
    target.focus();
    await el.updateComplete;
    const dt = new DataTransfer();
    for (const [k, v] of Object.entries(d)) dt.setData(k, v);
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    await el.updateComplete;
  };
  await paste('A5', { 'text/plain': 'Who | Paid:money\n--- | ---\nAnn | 3\n', 'text/html': '<meta name="generator" content="TinyLittleOffice"><table><tr><th>Who</th><th>Paid</th></tr><tr><td>Ann</td><td>3</td></tr></table>' });
  expect(last()).toContain('\nWho | Paid:money\nAnn | 3\n');
  // A table from anywhere else.
  await paste('A8', { 'text/plain': 'x y', 'text/html': '<table><tr><td>x</td><td>y</td></tr><tr><td>1</td><td>2</td></tr></table>' });
  expect(last()).toContain('\nx | y\n1 | 2\n');
  // An outline's items, a row each.
  await paste('C1', { 'text/plain': '- One\n  - Two\n', 'text/html': '<meta name="generator" content="TinyLittleOffice"><ul><li>One</li></ul>' });
  expect(last()).toMatch(/^Item \| Cost:money \| ColC\n--- \| --- \| ---\nRent \| 1200 \| One\nFood \| 450 \| Two\n/);
});

test('a block has the bar under it: fill, Copy, Cut, Paste, Clear, none taking the focus', async () => {
  const { el, last } = await editor(SHEET);
  const b1 = await block(el, 'B1', 'ArrowDown');
  await until(() => !!contextBar()?.matches(':popover-open'));
  expect([...contextBar().querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Fill down from the top row', 'Fill right from the first column', 'Copy', 'Cut', 'Paste', 'Clear these cells']);
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  contextButton('Copy').dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  contextButton('Cut').click();
  await el.updateComplete;
  expect(last()).toContain('Rent |\nFood |\n');
  expect(document.activeElement).toBe(b1);
  // Paste, from this page's own copy when the system's clipboard is refused, puts the cut cells back.
  contextButton('Paste').click();
  await until(() => last() === SHEET);
  contextButton('Clear these cells').click();
  await el.updateComplete;
  expect(last()).toContain('Rent |\nFood |\n');
  // One cell is not a block: the bar goes.
  key(b1, 'Escape');
  await el.updateComplete;
  await until(() => !contextBar().matches(':popover-open'));
});

test('Mod+A: the words of the cell first, then the whole sheet', async () => {
  const { el } = await editor(SHEET);
  const a1 = cell(el, 'A1');
  a1.focus();
  await el.updateComplete;
  a1.setSelectionRange(1, 2);
  expect(key(a1, 'a', { ctrlKey: true }).defaultPrevented).toBe(false);
  a1.select();
  expect(key(a1, 'a', { ctrlKey: true }).defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(selected(el)).toBe('A1:C3');
});

test('Escape in a cell puts back what was there and keeps the focus on the cell; the formula strip does the same', async () => {
  const { el, last } = await editor(SHEET);
  const b1 = cell(el, 'B1');
  await type(el, b1, '999');
  expect(last()).toContain('Rent | 999');
  expect(key(b1, 'Escape').defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(last()).toBe(SHEET);
  expect(document.activeElement).toBe(b1);
  const fx = el.querySelector<HTMLInputElement>('.sheet-fx .fx')!;
  fx.focus();
  fx.value = '7';
  fx.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  expect(last()).toContain('Rent | 7');
  key(fx, 'Escape');
  await el.updateComplete;
  expect(last()).toBe(SHEET);
  await until(() => document.activeElement === b1);
});

test('Enter and Shift+Enter in the formula strip go down and up; Mod+Enter in a cell stays on it', async () => {
  const { el } = await editor(SHEET);
  cell(el, 'B2').focus();
  await el.updateComplete;
  const fx = el.querySelector<HTMLInputElement>('.sheet-fx .fx')!;
  fx.focus();
  key(fx, 'Enter', { shiftKey: true });
  await until(() => document.activeElement === cell(el, 'B1'));
  fx.focus();
  key(fx, 'Enter');
  await until(() => document.activeElement === cell(el, 'B2'));
  const b2 = cell(el, 'B2');
  b2.setSelectionRange(1, 1);
  expect(key(b2, 'Enter', { ctrlKey: true }).defaultPrevented).toBe(true);
  await el.updateComplete;
  await tick();
  expect(document.activeElement).toBe(b2);
  expect([b2.selectionStart, b2.selectionEnd]).toEqual([0, b2.value.length]);
});

test('Tab and Shift+Tab go to the next and previous cell, row after row, the page held still', async () => {
  const { el } = await editor(SHEET);
  const b1 = cell(el, 'B1');
  b1.focus();
  expect(key(b1, 'Tab').defaultPrevented).toBe(true);
  await until(() => document.activeElement === cell(el, 'C1'));
  key(cell(el, 'C1'), 'Tab');
  await until(() => document.activeElement === cell(el, 'A2'));
  key(cell(el, 'A2'), 'Tab', { shiftKey: true });
  await until(() => document.activeElement === cell(el, 'C1'));
  // At A1, Shift+Tab lets the focus leave: it is never trapped.
  const a1 = cell(el, 'A1');
  a1.focus();
  expect(key(a1, 'Tab', { shiftKey: true }).defaultPrevented).toBe(false);
});

test('Alt+Up/Down move the row (or the selected rows) past its neighbour, formulas following; the row menu has Move up and Move down', async () => {
  const { el, last } = await editor(SHEET);
  const a2 = cell(el, 'A2');
  a2.focus();
  expect(key(a2, 'ArrowUp', { altKey: true }).defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(last()).toBe('Item | Cost:money\n--- | ---\nFood | 450\nRent | 1200\nTotal | =SUM(B1:B2)\n');
  await until(() => document.activeElement === cell(el, 'A1'));
  await pick(el, button(el, 'Row 1: insert or delete rows'), 'Move down');
  expect(last()).toBe(SHEET);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('\nFood | 450\nRent | 1200\n');
});

test('Mod+D fills down: the block from its top row, one cell from the cell above', async () => {
  const { el, last } = await editor(SHEET);
  const b2 = cell(el, 'B2');
  b2.focus();
  await el.updateComplete;
  expect(key(b2, 'd', { ctrlKey: true }).defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(last()).toContain('Food | 1200');
  expect(button(el, 'Fill down from the top row').title).toMatch(/Ctrl\+D|⌘D/);
  const a1 = await block(el, 'A1', 'ArrowDown', 'ArrowDown');
  key(a1, 'd', { ctrlKey: true });
  await el.updateComplete;
  expect(last()).toMatch(/\nRent \| 1200\nRent \| 1200\nRent \| =SUM/);
});

test('Mod+B, I, U and K mark the words selected in a rich cell, and never reach the browser elsewhere', async () => {
  const { el, last } = await editor('Note:rich | B\n--- | ---\nhello world | x\n');
  const a1 = cell(el, 'A1');
  a1.focus();
  await el.updateComplete;
  a1.setSelectionRange(0, 5);
  key(a1, 'b', { ctrlKey: true });
  await el.updateComplete;
  expect(last()).toContain('**hello** world');
  key(a1, 'k', { ctrlKey: true });
  await el.updateComplete;
  // The words stay selected inside their marks, so the link goes round them.
  expect(last()).toContain('**[hello]()** world');
  const b1 = cell(el, 'B1');
  b1.focus();
  expect(key(b1, 'i', { ctrlKey: true }).defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(last()).toContain('| x');
});

test('a tap on a checkbox cell ticks it, without the keyboard coming up', async () => {
  const { el, last } = await editor('Task | Done:check\n--- | ---\nWrite | \n');
  const tickB1 = button(el, 'Tick B1');
  expect(tickB1.getAttribute('aria-pressed')).toBe('false');
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  tickB1.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  tickB1.click();
  await el.updateComplete;
  expect(last()).toContain('Write | x');
  expect(button(el, 'Tick B1').getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).not.toBe(cell(el, 'B1'));
});

test('a cell reached by a click has its words selected, so typing replaces them; F2 puts the caret at the end', async () => {
  const { el } = await editor(SHEET);
  const a1 = cell(el, 'A1');
  a1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  a1.focus();
  await el.updateComplete;
  expect([a1.selectionStart, a1.selectionEnd]).toEqual([0, 4]);
  expect(key(a1, 'F2').defaultPrevented).toBe(true);
  expect([a1.selectionStart, a1.selectionEnd]).toEqual([4, 4]);
  // A double tap edits rather than zooms.
  expect(getComputedStyle(a1).touchAction).toBe('manipulation');
  expect(getComputedStyle(el.querySelector('.sheet-fx .fx')!).touchAction).toBe('manipulation');
});

test('a column head selects its column; the grip is resized from the keyboard, and the menu fits one column', async () => {
  const { el } = await editor(SHEET);
  const head = el.querySelectorAll<HTMLButtonElement>('th .col-head')[1];
  head.click();
  await until(() => !!document.querySelector('[popover]:popover-open:not(.to-context)'));
  expect(selected(el)).toBe('B1:B3');
  document.querySelector<HTMLElement>('[popover]:popover-open:not(.to-context)')!.hidePopover();
  const grip = el.querySelectorAll<HTMLElement>('th .grip')[0];
  expect(grip.tabIndex).toBe(0);
  const w0 = grip.closest('th')!.getBoundingClientRect().width;
  key(grip, 'ArrowRight');
  await el.updateComplete;
  expect(Number(grip.getAttribute('aria-valuenow'))).toBe(Math.round(w0 + 10));
  await pick(el, head, 'Fit this column to its text');
  expect(el.querySelector('table.sheet')!.classList.contains('sized')).toBe(true);
});

test('the bar\'s tools keep the focus in the cell', async () => {
  const { el } = await editor(SHEET);
  for (const label of ['Fill down from the top row', 'Fill right from the first column', 'Fit the columns to the page', 'Show all the text']) {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button(el, label).dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  }
});

test('a composition is left to the browser and written once, at its end', async () => {
  const { el, changes, last } = await editor(SHEET);
  const a1 = cell(el, 'A1');
  a1.focus();
  await el.updateComplete;
  const n = changes.length;
  a1.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  a1.value = 'にほ';
  a1.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
  a1.value = '日本';
  a1.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
  expect(key(a1, 'Enter', { isComposing: true }).defaultPrevented).toBe(false);
  await el.updateComplete;
  expect(changes.length).toBe(n);
  expect(a1.value).toBe('日本');
  a1.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '日本' }));
  await el.updateComplete;
  expect(changes.length).toBe(n + 1);
  expect(last()).toContain('日本 | 1200');
});
