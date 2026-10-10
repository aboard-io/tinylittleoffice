// The Sheet editor in a real browser: typing is the document, the menus do rows and columns, the lock holds,
// undo takes an edit back, and at phone width the bar is one row and the page never scrolls.
import { test, expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';
// The cascade's order first (tokens, kit, apps), as on the page: the editor's sheet is in the apps layer.
import '../../../styles.css';
import '../editor.ts';
import type { ToSheetEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import { BASE, remScale } from '../../../kit/zoom.ts';
/** A length on the screen in the stylesheet's own pixels (the normal size draws at kit/zoom.ts BASE). */
const css = (px: number) => px / remScale();

const SHEET = 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450\nTotal | =SUM(B1:B2)\n';
const MODEL =
  '---\nchart: sankey\nlock: C1:C2\n---\nFrom | To | Amount:number | Assumption:name | Value:number\n--- | --- | --- | --- | ---\nVisitors | Signups | =visitors*rate/100 | Visitors | 1000\nVisitors | Bounced | =visitors-C1 | Rate | 10\n';

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
  await pick(el, head(2), 'Remove this column');
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C']);
  expect(last()).toMatch(/^Item \| Cost:money \| Paid on:date\n/);
});

test('a column’s name: Enter keeps it and Escape puts back what it was, and either takes the focus to the column’s first cell, never to nothing (walks: grid at a phone, seed 934178414)', async () => {
  const { el, last } = await editor(SHEET);
  const name = () => el.querySelectorAll<HTMLInputElement>('tr.names .cn')[1];
  const before = name().value;
  name().focus();
  await userEvent.keyboard('{Control>}a{/Control}Price{Escape}');
  await el.updateComplete;
  expect(name().value).toBe(before);
  expect(last()).toBeUndefined();
  expect(document.activeElement).toBe(cell(el, 'B1'));
  name().focus();
  await userEvent.keyboard('{Control>}a{/Control}Price{Enter}');
  await el.updateComplete;
  expect(last()).toMatch(/^Item \| Price:money\n/);
  expect(document.activeElement).toBe(cell(el, 'B1'));
});

test("Money asks its currency: a code typed is written in the head and the cells show it; picked again, emptied, the document's", async () => {
  const { el, last } = await editor(SHEET);
  const head = (c: number) => el.querySelectorAll<HTMLButtonElement>('th .col-head')[c];
  const field = () => document.querySelector<HTMLInputElement>('.to-currency-field');
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  // What the column names already is in the field (none), the common ones offered as it is typed in.
  expect(field()!.value).toBe('');
  expect(field()!.placeholder).toBe('$');
  expect([...document.querySelectorAll(`#${field()!.getAttribute('list')} option`)].map((o) => (o as HTMLOptionElement).value)).toContain('GBP');
  field()!.value = 'pounds';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  expect(document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.disabled).toBe(true);
  field()!.value = 'gbp';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.click();
  await until(() => (last() ?? '').startsWith('Item | Cost:money(GBP)\n'));
  await until(() => !field());
  await el.updateComplete;
  expect(cell(el, 'B2').value).toBe(new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(450));
  // Picked again: the field holds GBP; a symbol replaces it.
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  expect(field()!.value).toBe('GBP');
  field()!.value = '£';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.click();
  await until(() => (last() ?? '').startsWith('Item | Cost:money(£)\n'));
  await el.updateComplete;
  expect(cell(el, 'B2').value).toBe('£450.00');
  // Emptied, the column names none.
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  field()!.value = '';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.click();
  await until(() => (last() ?? '').startsWith('Item | Cost:money\n'));
  await el.updateComplete;
  expect(cell(el, 'B2').value).toBe('$450.00');
  // Another type leaves the currency behind; closed without OK, Money is money as it was.
  await pick(el, head(1), 'Number');
  expect(last()).toMatch(/^Item \| Cost:number\n/);
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  document.querySelector<HTMLButtonElement>('.to-currency-dialog .to-dialog-head button')!.click();
  await until(() => (last() ?? '').startsWith('Item | Cost:money\n'));
});

test('any column may go, whatever it holds: in one step undone, references into it #REF; the table keeps one, the sheet draws three', async () => {
  const { el, last } = await editor('Item | Cost:money | Twice:money\n--- | --- | ---\nRent | 1200 | =B1*2\nFood | 450 | =SUM(B1:B2)\n');
  const head = (c: number) => el.querySelectorAll<HTMLButtonElement>('th .col-head')[c];
  await pick(el, head(1), 'Remove this column');
  expect(last()).toBe('Item | Twice:money\n--- | ---\nRent | =#REF*2\nFood | =SUM(#REF)\n');
  // Still three across: the third drawn by its letter, nothing written for it.
  expect([...el.querySelectorAll('th .cl')].map((x) => x.textContent)).toEqual(['A', 'B', 'C']);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe('Item | Cost:money | Twice:money\n--- | --- | ---\nRent | 1200 | =B1*2\nFood | 450 | =SUM(B1:B2)\n');
  expect(cell(el, 'C1').value).toBe('$2,400.00');
  // Down to one column; that one stays, and says why.
  await pick(el, head(0), 'Remove this column');
  await pick(el, head(0), 'Remove this column');
  expect(last()).toBe('| Twice:money |\n| --- |\n| =#REF*2 |\n| =SUM(#REF) |\n');
  head(0).click();
  await until(() => !!document.querySelector('[popover]:popover-open:not(.to-context)'));
  const remove = [...document.querySelectorAll<HTMLButtonElement>('[popover]:popover-open:not(.to-context) [role^=menuitem]')].find((x) => x.textContent!.includes('Remove this column'))!;
  expect(remove.disabled).toBe(true);
  expect(remove.textContent).toContain('A sheet keeps one column');
  document.querySelector<HTMLElement>('[popover]:popover-open:not(.to-context)')!.hidePopover();
  await tick();
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
    expect(Math.round(bar.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // The grid at the default size (a phone is 300 of the stylesheet's pixels wide): its box inside the screen, the
    // columns side by side in it, what is wider scrolling there and not the page.
    const table = el.querySelector<HTMLElement>('table.sheet')!;
    const scroller = (() => {
      for (let x = table.parentElement; x && x !== el; x = x.parentElement) if (/auto|scroll/.test(getComputedStyle(x).overflowX)) return x;
      return null;
    })();
    expect(scroller).not.toBeNull();
    expect(scroller!.getBoundingClientRect().right).toBeLessThanOrEqual(390);
    for (const tr of el.querySelectorAll<HTMLElement>('table.sheet thead tr')) {
      const heads = [...tr.querySelectorAll<HTMLElement>('th[scope=col]')].map((x) => x.getBoundingClientRect());
      expect(new Set(heads.map((h) => Math.round(h.top))).size).toBeLessThanOrEqual(1);
      for (let i = 1; i < heads.length; i++) expect(heads[i].left).toBeGreaterThanOrEqual(heads[i - 1].right - 1);
    }
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

test("copy writes the cells as text and as our table HTML; paste reads our tables, another app's table and an outline's items", async () => {
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
  await paste('A5', {
    'text/plain': 'Who | Paid:money\n--- | ---\nAnn | 3\n',
    'text/html': '<meta name="generator" content="TinyLittleOffice"><table><tr><th>Who</th><th>Paid</th></tr><tr><td>Ann</td><td>3</td></tr></table>',
  });
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
  expect([...contextBar().querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual([
    'Fill down from the top row',
    'Fill right from the first column',
    'Copy',
    'Cut',
    'Paste',
    'Clear these cells',
  ]);
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

const bubble = (el: HTMLElement) => el.querySelector<HTMLElement>('.tx-bubble > .to-context');
test('a rich cell is edited in its words, never in Markdown: the bubble marks them, the code writes the inline form, the grid keys go on round it', async () => {
  const { el, last } = await editor('Note:rich | B\n--- | ---\n**big** news | x\n');
  const a1 = el.querySelector<ToText>('to-text#c0_0')!;
  expect(a1).not.toBeNull();
  // Drawn rich, no marker in sight.
  expect(a1.tx.textContent).toBe('big news');
  expect(a1.tx.querySelector('strong, b')!.textContent).toBe('big');
  // One line, however narrow the column: the cell is as tall as its neighbours.
  expect(getComputedStyle(a1.tx.firstElementChild!).whiteSpace).toBe('pre');
  expect(a1.closest('td')!.clientHeight).toBe(cell(el, 'B1').closest('td')!.clientHeight);
  // Reached, its words are selected whole; the strip shows them plain, read-only.
  cell(el, 'B1').focus();
  cell(el, 'B1').setSelectionRange(0, 0);
  key(cell(el, 'B1'), 'ArrowLeft');
  await until(() => a1.hasFocus());
  await el.updateComplete;
  expect(a1.sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 8 } });
  const fx = el.querySelector<HTMLInputElement>('.sheet-fx .fx')!;
  expect(fx.value).toBe('big news');
  expect(fx.readOnly).toBe(true);
  // Words picked out: the bubble comes up, and Italic from it marks them; the cell is written in the kernel's form.
  a1.sel = { anchor: { block: 0, offset: 4 }, focus: { block: 0, offset: 8 } };
  await until(() => !!bubble(el)?.matches(':popover-open'));
  bubble(el)!.querySelector<HTMLButtonElement>('[aria-label="Italic"]')!.click();
  await el.updateComplete;
  expect(last()).toBe('Note:rich | B\n--- | ---\n**big** *news* | x\n');
  // Mod+U from the keyboard, too.
  a1.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 3 } };
  await el.updateComplete;
  key(a1.tx, 'u', { ctrlKey: true });
  await el.updateComplete;
  expect(last()).toContain('**++big++** *news*');
  // Typing is a burst: one undo takes back the letters typed in this cell.
  // (The caret put where a click would put it: the letters take the marks of the words before them.)
  const words = [...a1.tx.querySelector('i')!.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text;
  document.getSelection()!.setBaseAndExtent(words, 4, words, 4);
  await until(() => a1.sel?.focus.offset === 8 && a1.sel.anchor.offset === 8);
  for (const ch of '!!') a1.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('*news!!* | x');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('*news* | x');
  // The grid's keys: Right at the end goes on to B1, Down to the next row, Escape puts back what the cell held.
  await until(() => a1.hasFocus());
  a1.sel = { anchor: { block: 0, offset: 8 }, focus: { block: 0, offset: 8 } };
  await el.updateComplete;
  expect(key(a1.tx, 'ArrowRight').defaultPrevented).toBe(true);
  await until(() => document.activeElement === cell(el, 'B1'));
  cell(el, 'B1').setSelectionRange(0, 0);
  key(cell(el, 'B1'), 'ArrowLeft');
  await until(() => a1.hasFocus());
  expect(key(a1.tx, 'ArrowDown').defaultPrevented).toBe(true);
  const a2 = el.querySelector<ToText>('to-text#c1_0')!;
  await until(() => a2.hasFocus());
  a2.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'z', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('\nz |');
  key(a2.tx, 'Escape');
  await el.updateComplete;
  expect(last()).not.toContain('\nz |');
  expect(a2.hasFocus()).toBe(true);
  // Enter goes down, Tab across.
  expect(key(a2.tx, 'Tab').defaultPrevented).toBe(true);
  await until(() => document.activeElement === cell(el, 'B2'));
  // Elsewhere the mark keys never reach the browser.
  expect(key(cell(el, 'B2'), 'i', { ctrlKey: true }).defaultPrevented).toBe(true);
});

test('a checkbox is a 24px box with a 2px ink border, empty or holding a thick accent check; a tap or Space ticks it, the keyboard never comes up', async () => {
  const { el, last } = await editor('Task | Done:check\n--- | ---\nWrite | \nRead | x\n');
  const tickB1 = button(el, 'Tick B1');
  expect(tickB1.getAttribute('aria-pressed')).toBe('false');
  const box = tickB1.querySelector<HTMLElement>('.box')!;
  const look = getComputedStyle(box);
  expect([css(box.getBoundingClientRect().width), css(box.getBoundingClientRect().height)].map(Math.round)).toEqual([24, 24]);
  // 2px, or the whole device pixels the browser snaps it to under the size of everything.
  expect(parseFloat(look.borderTopWidth)).toBeGreaterThan(1.5);
  expect(parseFloat(look.borderTopWidth)).toBeLessThanOrEqual(2);
  const ink = getComputedStyle(el).getPropertyValue('--to-ink').trim();
  const probe = document.createElement('i');
  probe.style.color = ink;
  el.append(probe);
  expect(look.borderTopColor).toBe(getComputedStyle(probe).color);
  probe.remove();
  expect(box.querySelector('svg')).toBeNull();
  // The ticked one holds the check, thick, in the accent.
  const check = button(el, 'Tick B2').querySelector<SVGElement>('.box svg')!;
  expect(getComputedStyle(check).strokeWidth).toBe('4px');
  // The whole cell is the button; nothing of the value shows through.
  expect(tickB1.getBoundingClientRect().height).toBeCloseTo(tickB1.closest('td')!.clientHeight, 0);
  expect(getComputedStyle(cell(el, 'B1')).color).toBe('rgba(0, 0, 0, 0)');
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  tickB1.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  tickB1.click();
  await el.updateComplete;
  expect(last()).toContain('Write | x');
  expect(button(el, 'Tick B1').getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).not.toBe(cell(el, 'B1'));
  // Space on the cell ticks and unticks; what is written stays as it was ("x", or nothing).
  cell(el, 'B2').focus();
  expect(key(cell(el, 'B2'), ' ').defaultPrevented).toBe(true);
  await el.updateComplete;
  expect(last()).toBe('Task | Done:check\n--- | ---\nWrite | x\nRead |\n');
});

test('the row numbers are as narrow as their widest number and the heads are quiet: no shading, no lines, 32px on a mouse', async () => {
  const { el } = await editor(SHEET);
  const side = () => el.querySelector<HTMLElement>('th.row')!.getBoundingClientRect().width;
  // Thirty rows drawn: two digits, 12px type, and 8px (the type measured on the screen, as the side is).
  const digit = (() => {
    const c = document.createElement('canvas').getContext('2d')!;
    const cs = getComputedStyle(el.querySelector('.row-num')!);
    c.font = `${cs.fontSize} ${cs.fontFamily}`;
    return c.measureText('0').width;
  })();
  expect(Math.abs(side() - (2 * digit + 8 * remScale()))).toBeLessThan(2);
  const th = el.querySelector<HTMLElement>('th.row')!;
  const head = el.querySelector<HTMLElement>('thead tr:first-child th')!;
  const surface = getComputedStyle(el.querySelector('.sheet-scroll')!).backgroundColor;
  for (const x of [th, head, el.querySelector<HTMLElement>('td.corner')!]) {
    expect(getComputedStyle(x).backgroundColor).toBe(surface);
    expect(getComputedStyle(x).borderRightWidth).toBe('0px');
    expect(getComputedStyle(x).borderBottomWidth).toBe('0px');
  }
  expect(getComputedStyle(el.querySelector('.row-num')!).justifyContent).toBe('flex-end');
  expect(css(el.querySelector<HTMLElement>('.col-head')!.getBoundingClientRect().height)).toBeCloseTo(32, 0);
  // A hundred rows and more: three digits, one digit wider.
  const narrow = side();
  el.querySelector<HTMLButtonElement>('.sheet-more')!.click();
  await el.updateComplete;
  el.querySelector<HTMLButtonElement>('.sheet-more')!.click();
  await el.updateComplete;
  expect(Math.abs(side() - narrow - digit)).toBeLessThan(2);
});

test('an option column offers the words it holds as the cell is typed in, takes new ones, and its caret opens the list', async () => {
  const { el, last } = await editor('Task | Status\n--- | ---\nBrief | BAD\nDesign | OKAY\nBuild | GOOD\nShip | OKAY\n');
  const head = (c: number) => el.querySelectorAll<HTMLButtonElement>('th .col-head')[c];
  await pick(el, head(1), 'Option');
  expect(last()).toMatch(/^Task \| Status:option\n/);
  const b5 = cell(el, 'B5');
  const list = document.getElementById(b5.getAttribute('list')!) as HTMLDataListElement;
  expect(list.localName).toBe('datalist');
  expect([...list.options].map((o) => o.value)).toEqual(['BAD', 'OKAY', 'GOOD']);
  // A word not in the list is taken as it is, and offered from then on.
  await type(el, b5, 'GREAT');
  expect(last()).toContain('| GREAT\n');
  expect([...list.options].map((o) => o.value)).toEqual(['BAD', 'OKAY', 'GOOD', 'GREAT']);
  // The caret selects the cell and opens its list, without taking the focus on the way.
  const caret = button(el, 'Choices for B2');
  const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  caret.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  const shown: HTMLInputElement[] = [];
  const picker = HTMLInputElement.prototype.showPicker;
  HTMLInputElement.prototype.showPicker = function (this: HTMLInputElement) {
    shown.push(this);
  };
  try {
    caret.click();
    await until(() => shown.length === 1);
  } finally {
    HTMLInputElement.prototype.showPicker = picker;
  }
  expect(shown[0]).toBe(cell(el, 'B2'));
  expect(document.activeElement).toBe(cell(el, 'B2'));
  // A text column has no list.
  expect(cell(el, 'A1').hasAttribute('list')).toBe(false);
});

test('a chart put in from Insert goes above the table; one already under it stays there when its kind changes', async () => {
  const { el, last } = await editor('Month | Sales:money\n--- | ---\nJan | 10\nFeb | 20\n');
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert > button')!, 'Chart');
  expect(last()).toMatch(/^---\nchart: \w+\nchart-at: top\n---\nMonth/);
  const figure = el.querySelector('.sheet-chart')!;
  expect(figure.compareDocumentPosition(el.querySelector('.sheet-scroll')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // No chart takes the place away with it.
  await pick(el, el.querySelector<HTMLButtonElement>('.sheet-chartmenu button')!, 'No chart');
  expect(last()).toBe('Month | Sales:money\n--- | ---\nJan | 10\nFeb | 20\n');
  // A document whose chart is below keeps it below.
  const below = await editor('---\nchart: line\n---\nMonth | Sales:money\n--- | ---\nJan | 10\nFeb | 20\n');
  await pick(below.el, below.el.querySelector<HTMLButtonElement>('.sheet-chartmenu button')!, 'Bars');
  expect(below.last()).toBe('---\nchart: bar\n---\nMonth | Sales:money\n--- | ---\nJan | 10\nFeb | 20\n');
  const fig = below.el.querySelector('.sheet-chart')!;
  expect(fig.compareDocumentPosition(below.el.querySelector('.sheet-scroll')!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
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
  // Ten of the sheet's own pixels wider, from where it was: on the screen, ten times the size of everything.
  expect(Number(grip.getAttribute('aria-valuenow'))).toBe(Math.round(css(w0) + 10));
  expect(Math.abs(grip.closest('th')!.getBoundingClientRect().width - (w0 + 10 * remScale()))).toBeLessThan(3);
  await pick(el, head, 'Fit this column to its text');
  expect(el.querySelector('table.sheet')!.classList.contains('sized')).toBe(true);
});

test("a column dragged by its grip grows by the drag in the sheet's own pixels: N on the screen is N / the zoom, not N", async () => {
  const { el } = await editor(SHEET);
  // The normal size draws a rem at BASE × 16px (kit/zoom.ts): a drag kept in screen pixels would widen the column 30% too much.
  expect(remScale()).toBe(BASE);
  const grip = el.querySelectorAll<HTMLElement>('th .grip')[0];
  const th = grip.closest('th')!;
  const w0 = css(th.getBoundingClientRect().width);
  const g = grip.getBoundingClientRect();
  const at = (x: number) => ({ clientX: x, clientY: g.top + g.height / 2, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, bubbles: true, cancelable: true });
  const x0 = g.left + g.width / 2;
  const N = 65;
  grip.dispatchEvent(new PointerEvent('pointerdown', at(x0)));
  grip.dispatchEvent(new PointerEvent('pointermove', at(x0 + N)));
  grip.dispatchEvent(new PointerEvent('pointerup', { ...at(x0 + N), buttons: 0 }));
  await el.updateComplete;
  expect(Number(grip.getAttribute('aria-valuenow'))).toBe(Math.round(w0 + N / remScale()));
  // On the screen the column is N wider, the pointer still on its edge.
  expect(Math.abs(th.getBoundingClientRect().width - (w0 * remScale() + N))).toBeLessThan(3);
});

test("the bar's tools keep the focus in the cell", async () => {
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

test('§1 opens with the focus in A1, its words selected, the page not scrolled', async () => {
  const { el } = await editor(SHEET);
  el.focusFirst();
  await until(() => document.activeElement === cell(el, 'A1'));
  const a1 = cell(el, 'A1');
  expect([a1.selectionStart, a1.selectionEnd]).toEqual([0, 'Rent'.length]);
  expect(document.scrollingElement!.scrollTop).toBe(0);
  const { el: blank } = await editor('');
  blank.focusFirst();
  await until(() => document.activeElement === cell(blank, 'A1'));
});
