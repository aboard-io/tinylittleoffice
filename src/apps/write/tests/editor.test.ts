// The Write editor in a real Chromium: typing is the document, the bar makes a title and marks the words, a footnote's
// words are typed where they are listed, under the text (its mark tapped goes there; Escape comes back; emptied, it goes), a table from Insert ▾ is a grid whose cells are the document and whose
// formulas work out in place, the invoice's Enter puts a line in inside the sum's reach, a web address alone is a
// click-to-load card, a task is ticked by a tap, the paper is a head field, and at phone width the bar is one row and
// the page never scrolls.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The page's styles first, as the app has them: they name the layers' order (an app's own rules over the kit's).
import '../../../styles.css';
import { parse } from '../../../doc/index.ts';
import '../editor.ts';
import type { ToWriteEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import { isWords } from '../../../kit/textops.ts';
import { mount, tick, until } from '../../../../test/browser/helpers.ts';
import { remScale } from '../../../kit/zoom.ts';

async function editor(value = ''): Promise<{ el: ToWriteEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  // In a column as the shell's (kit/chrome.ts): the page never scrolls, the column does.
  const main = document.createElement('main');
  main.className = 'to-main';
  main.style.cssText = 'height: 100%; overflow-y: auto;';
  document.body.append(main);
  const el = document.createElement('to-write-editor') as ToWriteEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  await el.text.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const input = (tx: HTMLElement, inputType: string, data: string | null = null) => tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function type(el: ToWriteEditor, s: string, tx: HTMLElement = el.text.tx) {
  for (const ch of s) {
    input(tx, 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
}
const button = (root: ParentNode, label: string) => root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const cell = (el: HTMLElement, ref: string) => el.querySelector<HTMLInputElement>(`to-write-table :is(input, textarea)[aria-label="${ref}"]`)!;
async function typeCell(el: ToWriteEditor, inp: HTMLInputElement, value: string) {
  inp.focus();
  inp.value = value;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  await tick();
}
/** Open a menu from a button and pick the item with these words. */
async function pick(el: ToWriteEditor, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}
const invoice = () => templates().find((t) => t.id === 'invoice')!.doc;

test('typing is the document; the bar makes the block a title and marks the words; the word count keeps up', async () => {
  const { el, last } = await editor();
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await type(el, 'Hello there');
  expect(last()).toBe('Hello there\n');
  button(el, 'Title').click();
  await until(() => last() === '# Hello there {.title}\n');
  await until(() => el.querySelector('.write-page .tx h1.title')?.textContent === 'Hello there');
  await until(() => button(el, 'Title').getAttribute('aria-pressed') === 'true');
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 5 } };
  await tick();
  button(el, 'Bold').click();
  await until(() => last() === '# **Hello** there {.title}\n');
  expect(el.querySelector('.write-foot')!.textContent).toContain('2 words');
  // The title the shell sets is a head op in the history, undone like any other.
  el.value = '---\ntitle: Named\n---\n# **Hello** there {.title}\n';
  await el.updateComplete;
  expect(el.canUndo).toBe(true);
  expect(el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }))).toBe(false);
  await until(() => last() === '# **Hello** there {.title}\n');
});

const press = (target: EventTarget, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
const notes = (el: ToWriteEditor) => [...el.querySelectorAll<HTMLElement>('.write-notes to-text.to-note-words .tx')];

test('a footnote from the bar: its mark in the words and the caret in its note at the end of the page, typed there; listed and counted', async () => {
  const { el, last } = await editor('Some words\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 10 }, focus: { block: 0, offset: 10 } };
  await tick();
  button(el, 'Footnote').click();
  await until(() => !!el.querySelector('.write-page .write-text .tx .fn'));
  expect(document.querySelector('to-note-pop, .to-note-pop')).toBeNull();
  // The new note is at the foot, empty, with the caret in it.
  await until(() => notes(el).length === 1 && document.activeElement === notes(el)[0]);
  await type(el, 'Said in passing', notes(el)[0]);
  await until(() => last() === 'Some words^[Said in passing]\n');
  const words = notes(el)[0];
  // The note keeps the foot's look: one line, never under 16px (an iPhone zooms on less), not the page's 50vh.
  expect(words.getBoundingClientRect().height).toBeLessThan(60);
  expect(parseFloat(getComputedStyle(words).fontSize)).toBeGreaterThanOrEqual(16);
  const list = el.querySelector('section[role="doc-endnotes"]')!;
  expect(list.querySelectorAll('li')).toHaveLength(1);
  expect(list.querySelector('li')!.textContent).toContain('Said in passing');
  expect(el.querySelector('.write-foot')!.textContent).toContain('5 words');
  // A typing burst in the note is one step: undone, the words go and the caret is back in the note.
  expect(el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }))).toBe(false);
  await until(() => last() === 'Some words^[]\n');
  await until(() => document.activeElement === notes(el)[0]);
  expect(el.dispatchEvent(new CustomEvent('docredo', { cancelable: true, bubbles: true }))).toBe(false);
  await until(() => last() === 'Some words^[Said in passing]\n');
  await until(() => notes(el)[0].textContent === 'Said in passing');
  // Escape in the note goes back to the words, the caret after the mark.
  el.querySelector<HTMLElement>('.write-notes .tx')!.focus();
  press(notes(el)[0], 'Escape');
  await until(() => el.text.hasFocus());
  await until(() => el.text.sel?.focus.offset === 11);
  // The way back from the note's ↩ goes to its mark too.
  notes(el)[0].focus();
  button(list, 'Back to footnote 1 in the text').click();
  await until(() => el.text.hasFocus());
  expect(last()).toBe('Some words^[Said in passing]\n');
});

test('a mark tapped puts the caret at the end of its note; a note emptied and left takes its mark; Backspace in an empty note takes it and comes back', async () => {
  const { el, last } = await editor('One^[first] two^[second]\n\nThree^[third]\n');
  const chips = () => [...el.querySelectorAll<HTMLElement>('.write-text .tx .fn')];
  expect(notes(el).map((n) => n.textContent)).toEqual(['first', 'second', 'third']);
  chips()[1].click();
  await until(() => document.activeElement === notes(el)[1]);
  expect(el.querySelector<import('../../../kit/text.ts').ToText>('.write-notes li:nth-child(2) to-text')!.sel?.focus.offset).toBe(6);
  // Enter on a mark does the same.
  press(chips()[2], 'Enter');
  await until(() => document.activeElement === notes(el)[2]);
  // Emptied and left: the note and its mark go.
  for (let i = 0; i < 5; i++) {
    input(notes(el)[2], 'deleteContentBackward');
    await el.updateComplete;
    await tick();
  }
  await until(() => last() === 'One^[first] two^[second]\n\nThree^[]\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await until(() => last() === 'One^[first] two^[second]\n\nThree\n');
  await until(() => notes(el).length === 2);
  // Backspace at the start of an empty note takes it, and the caret goes where its mark was.
  chips()[0].click();
  await until(() => document.activeElement === notes(el)[0]);
  for (let i = 0; i < 5; i++) {
    input(notes(el)[0], 'deleteContentBackward');
    await el.updateComplete;
    await tick();
  }
  await until(() => last() === 'One^[] two^[second]\n\nThree\n');
  input(notes(el)[0], 'deleteContentBackward');
  await until(() => last() === 'One two^[second]\n\nThree\n');
  await until(() => el.text.hasFocus() && el.text.sel?.focus.offset === 3);
});

test('Insert ▾ puts in a table: three by three, opened in the Spreadsheet first; then a grid whose cells are the document, a formula worked out in place', async () => {
  const { el, last } = await editor('Before\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 6 } };
  await tick();
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Table');
  // The table is made in the Spreadsheet, in the dialog; nothing is in the document until Done.
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-sheet-editor'));
  expect(last()).toBeUndefined();
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => !!el.querySelector('to-write-table'));
  expect(last()).toBe('Before\n\nColA | ColB | ColC\n--- | --- | ---\n| |  |\n| |  |\n| |  |\n\n<br>\n');
  // The blank row to type into is there; a letter typed in it makes the row.
  await typeCell(el, cell(el, 'A1'), 'Rent');
  await until(() => last() === 'Before\n\nColA | ColB | ColC\n--- | --- | ---\nRent |  |\n\n<br>\n');
  await typeCell(el, cell(el, 'B1'), '=600*2');
  await until(() => (last() ?? '').includes('Rent | =600*2 |'));
  // The cell being typed in shows its formula; left, it shows its value, to the right as a number.
  expect(cell(el, 'B1').value).toBe('=600*2');
  cell(el, 'B1').blur();
  await el.updateComplete;
  expect(cell(el, 'B1').value).toBe('1200');
  expect(cell(el, 'B1').classList.contains('num')).toBe(true);
  // The grid kept its element through the edits: the same input is still the one on the page.
  const b1 = cell(el, 'B1');
  await typeCell(el, b1, '=600*3');
  expect(cell(el, 'B1')).toBe(b1);
  expect(document.activeElement).toBe(b1);
});

test("the invoice: money in the head's currency, Amount locked, a quantity changed changes the amount; Enter goes down, a row comes from its menu inside the sum", async () => {
  const { el, last } = await editor(invoice().replace('currency: $', 'currency: €'));
  await until(() => !!cell(el, 'E7'));
  expect(cell(el, 'E7').value).toBe('€5,486.40');
  expect(cell(el, 'E1').readOnly).toBe(true);
  expect(el.querySelector<HTMLTextAreaElement>('#write-field-from')!.value).toBe('Your name\nStreet and number\nCity, state and ZIP code');
  await typeCell(el, cell(el, 'B1'), '20');
  await until(() => cell(el, 'E7').value === '€6,782.40');
  const before = last();
  cell(el, 'B1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => document.activeElement === cell(el, 'B2'));
  expect(last()).toBe(before);
  // A row is put in by its number's menu, never by a key: under the last line, inside the subtotal's reach.
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-num')[2], 'Insert a row below');
  await until(() => (last() ?? '').includes('=SUM(E1:E5)'));
  await until(() => document.activeElement === cell(el, 'A4'));
  expect(cell(el, 'A4').value).toBe('');
  // The head's fields are inputs over the text; a change is a head op.
  const number = el.querySelector<HTMLInputElement>('#write-field-number')!;
  number.value = '0043';
  number.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => (last() ?? '').includes('number: 0043'));
});

test("a table's money: a column that names its currency beats the head's; one that names none takes the head's", async () => {
  const { el } = await editor('---\ncurrency: €\n---\nItem | Here:money(£) | There:money\n--- | --- | ---\nTea | 3 | 4\n');
  await until(() => !!cell(el, 'A1'));
  expect(cell(el, 'B1').value).toBe('£3.00');
  expect(cell(el, 'C1').value).toBe('€4.00');
});

test("a table column's menu says what it holds, the Spreadsheet's types: Money asks its currency, GBP shown through Intl; an Option column offers its words", async () => {
  const { el, last } = await editor('---\ncurrency: €\n---\nItem | Cost | Kind\n--- | --- | ---\nTea | 3 | hot\nIce | 1200 | cold\nSoup | 4 | hot\n');
  await until(() => !!cell(el, 'A1'));
  const head = (c: number) => el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[c];
  const field = () => document.querySelector<HTMLInputElement>('.to-currency-field');
  // The types under the column's own group, the one it holds checked.
  head(1).click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role=menuitemcheckbox]')].map((x) => [
    x.querySelector('.to-menu-words > span')!.textContent,
    x.getAttribute('aria-checked'),
  ]);
  expect(items.map((x) => x[0])).toEqual(['Text', 'Number', 'Money', 'Percent', 'Date', 'Link', 'Checkbox', 'Option', 'Rich text', 'Name']);
  expect(items.filter((x) => x[1] === 'true').map((x) => x[0])).toEqual(['Text']);
  document.querySelector<HTMLElement>('[popover]:popover-open')!.hidePopover();
  await tick();
  // Money: the currency asked for, the head's € the placeholder's job, not the field's; GBP typed and kept.
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  expect(field()!.value).toBe('');
  field()!.value = 'gbp';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.click();
  await until(() => (last() ?? '').includes('Item | Cost:money(GBP) | Kind\n'));
  await until(() => !field());
  await el.updateComplete;
  const pounds = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' });
  await until(() => cell(el, 'B2').value === pounds.format(1200));
  expect(cell(el, 'B3').value).toBe(pounds.format(4));
  // The column stays in hand, its first cell typed in showing what it holds.
  expect(document.activeElement).toBe(cell(el, 'B1'));
  expect(cell(el, 'B1').value).toBe('3');
  // Picked again, the field holds GBP; emptied, the column names none and takes the head's €.
  await pick(el, head(1), 'Money');
  await until(() => !!field());
  expect(field()!.value).toBe('GBP');
  field()!.value = '';
  field()!.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-currency .to-ask-ok')!.click();
  await until(() => (last() ?? '').includes('Item | Cost:money | Kind\n'));
  await el.updateComplete;
  await until(() => cell(el, 'B2').value === '€1,200.00');
  // Option: the column's cells offer the words it holds, each once.
  await pick(el, head(2), 'Option');
  await until(() => (last() ?? '').includes('Item | Cost:money | Kind:option\n'));
  await el.updateComplete;
  const list = cell(el, 'C1').getAttribute('list')!;
  expect([...el.querySelectorAll(`datalist[id="${list}"] option`)].map((o) => (o as HTMLOptionElement).value)).toEqual(['hot', 'cold']);
  expect(cell(el, 'A1').getAttribute('list')).toBeNull();
});

test("a web address alone is a card that loads nothing until tapped; a tap on a task's box ticks it; the paper is a head field", async () => {
  const { el, last } = await editor('https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n- [ ] walk the dog\n');
  await until(() => !!el.querySelector('to-embed'));
  const embed = el.querySelector<HTMLElement>('to-embed')!;
  expect(embed.querySelector('iframe')).toBeNull();
  expect(embed.textContent).toContain('YouTube');
  embed.querySelector<HTMLButtonElement>('.to-embed-load')!.click();
  await until(() => !!embed.querySelector('iframe'));
  expect(embed.querySelector('iframe')!.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  expect(embed.querySelector('iframe')!.getAttribute('sandbox')).toContain('allow-scripts');
  const li = el.querySelector<HTMLElement>('.write-page .tx li[data-done]')!;
  const r = li.getBoundingClientRect();
  li.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + 4, clientY: r.top + 8 }));
  await until(() => last() === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ\n\n- [x] walk the dog\n');
  await pick(el, el.querySelector<HTMLElement>('to-menu.write-paper button')!, 'A4');
  await until(() => (last() ?? '').startsWith('---\npaper: a4\n---\n'));
  expect(el.querySelector('.write-page')!.getAttribute('data-paper')).toBe('a4');
});

test('at phone width: the bar is one row, nothing is wider than the screen, and focusing the text or a cell never scrolls the column', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(invoice());
    await until(() => !!cell(el, 'A1'));
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(Math.round(bar.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // At the normal size the invoice's head fills the first screen, so the page cannot start at its top with the words
    // in sight: the words' first line, where the caret goes, is scrolled to the top of the screen, and focusing them
    // must leave scrollTop exactly where it was just set (neither back to 0 nor on to the caret).
    const column = el.closest('main')!;
    column.scrollTop = el.text.tx.getBoundingClientRect().top - column.getBoundingClientRect().top;
    const y = column.scrollTop;
    expect(y).toBeGreaterThan(0);
    el.text.focus();
    el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
    await tick();
    expect(column.scrollTop).toBe(y);
    expect(window.scrollY).toBe(0);
    for (const ref of ['A1', 'B2', 'C3']) {
      cell(el, ref).focus({ preventScroll: true });
      await el.updateComplete;
      expect(Math.round(bar.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    }
    expect(parseFloat(getComputedStyle(cell(el, 'A1')).fontSize)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(getComputedStyle(el.text.tx).fontSize)).toBeGreaterThanOrEqual(16);
  } finally {
    await page.viewport(1100, 800);
  }
});

/* ---------- the editing standard (docs/editing.md), path by path ---------- */

const key = (target: EventTarget, k: string, init: KeyboardEventInit = {}) => {
  const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...init });
  target.dispatchEvent(ev);
  return ev;
};
const clip = (target: EventTarget, type: 'copy' | 'cut' | 'paste', data: Record<string, string> = {}) => {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  const ev = new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return { ev, dt };
};
const undo = (el: ToWriteEditor) => el.dispatchEvent(new CustomEvent('docundo', { cancelable: true, bubbles: true }));
const redo = (el: ToWriteEditor) => el.dispatchEvent(new CustomEvent('docredo', { cancelable: true, bubbles: true }));
const card = (el: ToWriteEditor, at: number) => el.text.tx.children[at] as HTMLElement;
const barItems = () => [...document.querySelectorAll<HTMLButtonElement>('to-context.write-cardbar .to-context:popover-open button')].map((b) => b.getAttribute('aria-label'));
const PIC = '![a picture](https://example.com/a.png)';

test('§1 the bar ends with Undo and Redo, off with nothing to do', async () => {
  const { el } = await editor('Words\n');
  const tools = [...el.querySelectorAll<HTMLButtonElement>('to-bar.write-bar > *')];
  expect(tools.slice(-2).map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo']);
  expect(button(el, 'Undo').disabled).toBe(true);
});

test('§1 Mod+Z: a burst of typing is one step only in one place; typing here and then at once there is two, each with its caret', async () => {
  const { el, last } = await editor('One\n\nTwo\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 3 }, focus: { block: 0, offset: 3 } };
  await tick();
  await type(el, 'ab');
  el.text.sel = { anchor: { block: 1, offset: 3 }, focus: { block: 1, offset: 3 } };
  await tick();
  await type(el, 'cd');
  expect(last()).toBe('Oneab\n\nTwocd\n');
  undo(el);
  await until(() => last() === 'Oneab\n\nTwo\n');
  await until(() => el.text.sel?.focus.block === 1 && el.text.sel.focus.offset === 3);
  undo(el);
  await until(() => last() === 'One\n\nTwo\n');
  await until(() => el.text.sel?.focus.block === 0 && el.text.sel.focus.offset === 3);
  redo(el);
  await until(() => last() === 'Oneab\n\nTwo\n');
  await until(() => el.text.sel?.focus.block === 0 && el.text.sel.focus.offset === 5);
});

test('§1 Mod+Z after a cell edit puts the focus back in that cell', async () => {
  const { el, last } = await editor('Words\n\nA | B\n--- | ---\n1 | 2\n\nAfter\n');
  await until(() => !!cell(el, 'B1'));
  await typeCell(el, cell(el, 'B1'), '22');
  await until(() => (last() ?? '').includes('1 | 22'));
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await tick();
  undo(el);
  await until(() => (last() ?? '').includes('1 | 2\n'));
  await until(() => document.activeElement === cell(el, 'B1'));
});

test("§1 Mod+Z in the Ask dialog is the field's own: the document behind it is left alone", async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const el = shell.querySelector<ToWriteEditor>('to-write-editor')!;
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  await type(el, 'abc');
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Web Picture');
  await until(() => !!document.querySelector('.to-ask-picture .to-ask-url'));
  const field = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!;
  field.focus();
  expect(key(field, 'z', { ctrlKey: true }).defaultPrevented).toBe(false);
  await tick(50);
  expect(el.value).toBe('abc\n');
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
});

test("§1/§6 a card in hand: a tap takes it, the bar under it is in the standard's order, and Enter edits it", async () => {
  const { el } = await editor(`One\n\n${PIC}\n\nTwo\n`);
  await until(() => !!card(el, 1)?.classList.contains('tx-card'));
  card(el, 1).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await until(() => document.activeElement === card(el, 1));
  await until(() => barItems().length > 0);
  expect(barItems()).toEqual(['Change the address…', 'Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  // The bar's buttons never take the focus from the card.
  const del = document.querySelector<HTMLButtonElement>('to-context.write-cardbar button[aria-label="Delete"]')!;
  expect(del.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
  expect(key(card(el, 1), 'Enter').defaultPrevented).toBe(true);
  await until(() => !!document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url'));
  expect(document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!.value).toBe('https://example.com/a.png');
  document.querySelector<HTMLDialogElement>('.to-ask-picture dialog')!.close();
});

test('§6 a new address for a thing from the web keeps the title its author gave the old one; a bare address stays bare', async () => {
  const OLD = 'https://www.youtube.com/watch?v=eRVYwDtI2E8';
  const NEW = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const readdress = async (value: string) => {
    const { el, last } = await editor(value);
    await until(() => !!card(el, 1)?.classList.contains('tx-card'));
    card(el, 1).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await until(() => document.activeElement === card(el, 1));
    expect(key(card(el, 1), 'Enter').defaultPrevented).toBe(true);
    await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
    const box = document.querySelector<HTMLInputElement>('.to-ask-embed .to-ask-url')!;
    expect(box.value).toBe(OLD);
    box.value = NEW;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    document.querySelector<HTMLButtonElement>('.to-ask-embed .to-ask-ok')!.click();
    await until(() => (last() ?? '').includes(NEW));
    return parse(last()!).blocks[1];
  };
  expect(await readdress(`One\n\n[The neighbourhood the road replaced](${OLD})\n\nTwo\n`)).toEqual({ k: 'p', runs: [{ t: 'The neighbourhood the road replaced', href: NEW }] });
  expect(await readdress(`One\n\n${OLD}\n\nTwo\n`)).toEqual({ k: 'p', runs: [{ t: NEW }] });
});

test('§1 Mod+C, Mod+X, Mod+V on a card in hand: TLO and our HTML; a cut takes it out, a paste puts it in after the card in hand', async () => {
  const { el, last } = await editor(`One\n\n${PIC}\n\nTwo\n`);
  await until(() => !!card(el, 1));
  card(el, 1).focus();
  await until(() => el.cardAt === 1);
  const { ev, dt } = clip(card(el, 1), 'copy');
  expect(ev.defaultPrevented).toBe(true);
  expect(dt.getData('text/plain')).toBe(`${PIC}\n`);
  expect(dt.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(dt.getData('text/html')).toContain('<img src="https://example.com/a.png"');
  const cut = clip(card(el, 1), 'cut');
  expect(cut.dt.getData('text/plain')).toBe(`${PIC}\n`);
  await until(() => last() === 'One\n\nTwo\n');
  // Into the words, an ordinary paste; onto a card in hand, after it.
  const { el: el2, last: last2 } = await editor(`One\n\n${PIC}\n\nTwo\n`);
  await until(() => !!card(el2, 1));
  card(el2, 1).focus();
  await until(() => el2.cardAt === 1);
  clip(card(el2, 1), 'paste', { 'text/plain': `${PIC}\n`, 'text/html': dt.getData('text/html') });
  await until(() => last2() === `One\n\n${PIC}\n\n${PIC}\n\nTwo\n`);
  await until(() => document.activeElement === card(el2, 2));
});

test('§1 Mod+D, Alt+Up/Down, Delete on a card in hand; each undone with the card back in hand', async () => {
  const { el, last } = await editor(`One\n\n${PIC}\n\nTwo\n`);
  await until(() => !!card(el, 1));
  card(el, 1).focus();
  await until(() => el.cardAt === 1);
  expect(key(card(el, 1), 'd', { ctrlKey: true }).defaultPrevented).toBe(true);
  await until(() => last() === `One\n\n${PIC}\n\n${PIC}\n\nTwo\n`);
  await until(() => document.activeElement === card(el, 2));
  undo(el);
  await until(() => last() === `One\n\n${PIC}\n\nTwo\n`);
  await until(() => document.activeElement === card(el, 1));
  key(card(el, 1), 'ArrowUp', { altKey: true });
  await until(() => last() === `${PIC}\n\nOne\n\nTwo\n`);
  await until(() => document.activeElement === card(el, 0));
  key(card(el, 0), 'ArrowDown', { altKey: true });
  await until(() => last() === `One\n\n${PIC}\n\nTwo\n`);
  await until(() => document.activeElement === card(el, 1));
  key(card(el, 1), 'Delete');
  await until(() => last() === 'One\n\nTwo\n');
  await until(() => el.text.hasFocus() && el.text.sel?.focus.block === 1);
  undo(el);
  await until(() => last() === `One\n\n${PIC}\n\nTwo\n`);
  await until(() => document.activeElement === card(el, 1));
});

test('§1 Escape or an arrow on a card in hand goes back to the words, never to the body', async () => {
  const { el } = await editor(`One\n\n${PIC}\n\nTwo\n`);
  await until(() => !!card(el, 1));
  card(el, 1).focus();
  key(card(el, 1), 'Escape');
  await until(() => el.text.hasFocus() && el.text.sel?.focus.block === 2 && el.text.sel.focus.offset === 0);
  card(el, 1).focus();
  key(card(el, 1), 'ArrowUp');
  await until(() => el.text.hasFocus() && el.text.sel?.focus.block === 0 && el.text.sel.focus.offset === 3);
  // Typing on a card in hand does nothing to it.
  card(el, 1).focus();
  key(card(el, 1), 'x');
  expect(el.value).toBe(`One\n\n${PIC}\n\nTwo\n`);
});

test('§1 a table is taken in hand by its corner handle (or Escape from a cell) and taken out from its bar', async () => {
  const { el, last } = await editor('Words\n\nA | B\n--- | ---\n1 | 2\n\nAfter\n');
  await until(() => !!cell(el, 'A1'));
  el.querySelector<HTMLButtonElement>('to-write-table .wt-hand')!.click();
  await until(() => document.activeElement === card(el, 1));
  await until(() => barItems().length > 0);
  expect(barItems()).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  // Enter on it edits: the table in the Spreadsheet, in the dialog; Cancel leaves it as it was, in hand.
  key(card(el, 1), 'Enter');
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-sheet-editor'));
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  await until(() => document.activeElement === card(el, 1));
  expect(last()).toBeUndefined();
  // Typing in place is the grid's: Escape from a cell left as it was puts the table in hand.
  cell(el, 'A1').focus();
  key(cell(el, 'A1'), 'Escape');
  await until(() => document.activeElement === card(el, 1));
  await until(() => barItems().length > 0);
  document.querySelector<HTMLButtonElement>('to-context.write-cardbar button[aria-label="Delete"]')!.click();
  await until(() => last() === 'Words\n\nAfter\n');
});

test('§4 Enter commits and goes down, Shift+Enter up, no row put in; Mod+Enter goes back to the words after the table', async () => {
  const { el, last } = await editor('A | B\n--- | ---\n1 | 2\n3 | 4\n\nAfter\n');
  await until(() => !!cell(el, 'A1'));
  cell(el, 'A1').focus();
  key(cell(el, 'A1'), 'Enter');
  await until(() => document.activeElement === cell(el, 'A2'));
  key(cell(el, 'A2'), 'Enter', { shiftKey: true });
  await until(() => document.activeElement === cell(el, 'A1'));
  key(cell(el, 'A1'), 'Enter', { ctrlKey: true });
  await until(() => el.text.hasFocus() && el.text.sel?.focus.block === 1);
  expect(last()).toBeUndefined();
});

test('§4 the arrows cross cells sideways from either end of the words', async () => {
  const { el } = await editor('A | B\n--- | ---\nab | cd\n');
  await until(() => !!cell(el, 'A1'));
  const a1 = cell(el, 'A1');
  a1.focus();
  a1.setSelectionRange(1, 1);
  expect(key(a1, 'ArrowRight').defaultPrevented).toBe(false);
  a1.setSelectionRange(2, 2);
  expect(key(a1, 'ArrowRight').defaultPrevented).toBe(true);
  await until(() => document.activeElement === cell(el, 'B1'));
  const b1 = cell(el, 'B1');
  b1.setSelectionRange(0, 0);
  key(b1, 'ArrowLeft');
  await until(() => document.activeElement === cell(el, 'A1'));
});

test('§4 Escape puts back what the cell held and keeps the focus there', async () => {
  const { el, last } = await editor('A | B\n--- | ---\n1 | 2\n');
  await until(() => !!cell(el, 'B1'));
  await typeCell(el, cell(el, 'B1'), '99');
  await until(() => last() === 'A | B\n--- | ---\n1 | 99\n');
  key(cell(el, 'B1'), 'Escape');
  await until(() => last() === 'A | B\n--- | ---\n1 | 2\n');
  expect(document.activeElement).toBe(cell(el, 'B1'));
  expect(cell(el, 'B1').value).toBe('2');
});

test('§4 Shift+arrows stretch a range, Delete clears it (undone at once), and a first tap chooses the cell so typing replaces it', async () => {
  const { el, last } = await editor('A | B\n--- | ---\n1 | 2\n3 | 4\n\nAfter\n');
  await until(() => !!cell(el, 'A1'));
  const a1 = cell(el, 'A1');
  a1.focus();
  a1.select();
  key(a1, 'ArrowDown', { shiftKey: true });
  key(a1, 'ArrowRight', { shiftKey: true });
  await el.updateComplete;
  await until(() => el.querySelectorAll('to-write-table td.in').length === 4);
  key(a1, 'Delete');
  await until(() => last() === 'A | B\n--- | ---\n\nAfter\n');
  undo(el);
  await until(() => last() === 'A | B\n--- | ---\n1 | 2\n3 | 4\n\nAfter\n');
  // A tap on a cell not being typed in chooses its words; F2 puts the caret at the end.
  await until(() => !!cell(el, 'B2'));
  const b2 = cell(el, 'B2');
  el.text.focus();
  b2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
  b2.focus();
  b2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect([b2.selectionStart, b2.selectionEnd]).toEqual([0, b2.value.length]);
  key(b2, 'F2');
  expect([b2.selectionStart, b2.selectionEnd]).toEqual([b2.value.length, b2.value.length]);
});

test('§4 Mod+C/X/V on a range: tab-separated text with our table HTML; a block pasted spreads over the cells and widens the table', async () => {
  const { el, last } = await editor('A | B\n--- | ---\n1 | 2\n3 | 4\n');
  await until(() => !!cell(el, 'A1'));
  const a1 = cell(el, 'A1');
  a1.focus();
  a1.select();
  key(a1, 'ArrowDown', { shiftKey: true });
  key(a1, 'ArrowRight', { shiftKey: true });
  await el.updateComplete;
  const { ev, dt } = clip(a1, 'copy');
  expect(ev.defaultPrevented).toBe(true);
  expect(dt.getData('text/plain')).toBe('1\t2\n3\t4');
  expect(dt.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(dt.getData('text/html')).toContain('<td>4</td>');
  // Pasted into B2: the block goes right and down from there, the table given a third column.
  const b2 = cell(el, 'B2');
  b2.focus();
  await el.updateComplete;
  clip(b2, 'paste', { 'text/plain': 'x\ty\nz\tw' });
  await until(() => (last() ?? '').includes('ColC'));
  const rows = () => {
    const b = parse(last()!).blocks[0];
    return b.k === 'table' ? b.rows : [];
  };
  expect(rows()).toEqual([
    ['1', '2', ''],
    ['3', 'x', 'y'],
    ['', 'z', 'w'],
  ]);
  // Our HTML alone (no text) is read too.
  await until(() => !!cell(el, 'C1'));
  const c1 = cell(el, 'C1');
  c1.focus();
  await el.updateComplete;
  clip(c1, 'paste', { 'text/html': '<table><tr><td>p</td></tr><tr><td>q</td></tr></table>' });
  await until(() => rows()[0][2] === 'p');
  expect(rows().map((r) => r[2])).toEqual(['p', 'q', 'w']);
});

test("§4 a column's head and a row's number open their menus; the + adds a column; never a key", async () => {
  const { el, last } = await editor('A | B\n--- | ---\n1 | 2\n3 | 4\n');
  await until(() => !!cell(el, 'A1'));
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[0], 'Add a column after');
  await until(() => last() === 'A | ColB | B\n--- | --- | ---\n1 |  | 2\n3 |  | 4\n');
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[1], 'Remove this column');
  await until(() => last() === 'A | B\n--- | ---\n1 | 2\n3 | 4\n');
  el.querySelector<HTMLButtonElement>('to-write-table .wt-add-col')!.click();
  await until(() => last() === 'A | B | ColC\n--- | --- | ---\n1 | 2 |\n3 | 4 |\n');
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-num')[0], 'Delete row 1');
  await until(() => last() === 'A | B | ColC\n--- | --- | ---\n3 | 4 |\n');
  // A column named from its menu: typed in its head, where the name is shown, focused at once; no dialog.
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[2], 'Name this column');
  const field = el.querySelector<HTMLInputElement>('to-write-table th input.wt-cn')!;
  expect(document.activeElement).toBe(field);
  expect(el.querySelector('to-dialog.write-ask dialog[open]')).toBeNull();
  field.value = 'Notes';
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => last() === 'A | B | Notes\n--- | --- | ---\n3 | 4 |\n');
  await until(() => !el.querySelector('input.wt-cn'));
  // Escape leaves the name be.
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[0], 'Name this column');
  const again = el.querySelector<HTMLInputElement>('input.wt-cn')!;
  again.value = 'Gone';
  again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await until(() => !el.querySelector('input.wt-cn'));
  expect(last()).toBe('A | B | Notes\n--- | --- | ---\n3 | 4 |\n');
});

test('§4 the fill handle carries a cell down; a tap on a cell while a formula waits puts in its reference', async () => {
  const { el, last } = await editor('A | B\n--- | ---\n5 | 1\nx | 2\ny | 3\n');
  await until(() => !!cell(el, 'A1'));
  cell(el, 'A1').focus();
  await el.updateComplete;
  const handle = el.querySelector<HTMLElement>('to-write-table .wt-fill')!;
  const at = (ref: string) => {
    const r = cell(el, ref).getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  };
  const h = handle.getBoundingClientRect();
  handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: h.left + 2, clientY: h.top + 2 }));
  handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', ...at('A3') }));
  await el.updateComplete;
  handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse', ...at('A3') }));
  await until(() => last() === 'A | B\n--- | ---\n5 | 1\n5 | 2\n5 | 3\n');
  // The cells filled are the range now.
  await until(() => document.activeElement === cell(el, 'A1') && el.querySelectorAll('to-write-table td.in').length === 3);
  // A formula waiting for a value: a tap on B3 puts "B3" in.
  const b1 = cell(el, 'B1');
  await typeCell(el, b1, '=1+');
  b1.setSelectionRange(3, 3);
  const b3 = cell(el, 'B3');
  const td = b3.closest('td')!;
  const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' });
  td.dispatchEvent(down);
  expect(down.defaultPrevented).toBe(true);
  await until(() => (last() ?? '').includes('5 | =1+B3'));
});

test('§1 Escape: the link box closes and the focus is back in the words; pressed again, a selection of words collapses', async () => {
  const { el } = await editor('Some words\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 4 } };
  await tick();
  button(el, 'Link').click();
  const pop = el.querySelector<HTMLElement>('to-link-pop')!;
  await until(() => !!pop.querySelector('input') && (el.querySelector('to-link-pop') as HTMLElement & { shown: boolean }).shown);
  const input = pop.querySelector<HTMLInputElement>('input')!;
  input.focus();
  key(input, 'Escape');
  await until(() => el.text.hasFocus());
  expect(el.text.sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 4 } });
  key(el.text.tx, 'Escape');
  await until(() => el.text.sel?.anchor.offset === 4 && el.text.sel.focus.offset === 4);
});

test('§2 Shift+Enter breaks a line in an item and a quote; "> " makes a quote; Mod+Shift+X and Mod+Shift+H mark the words', async () => {
  const { el, last } = await editor('- item\n\n> said\n\nplain\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 4 }, focus: { block: 0, offset: 4 } };
  await tick();
  input(el.text.tx, 'insertLineBreak');
  await until(() => last() !== undefined);
  expect(el.text.model[0].k).toBe('li');
  expect(el.text.model).toHaveLength(3);
  el.text.sel = { anchor: { block: 1, offset: 4 }, focus: { block: 1, offset: 4 } };
  await tick();
  const was = el.value;
  input(el.text.tx, 'insertLineBreak');
  await until(() => el.value !== was);
  expect(el.text.model[1].k).toBe('quote');
  expect(el.text.model).toHaveLength(3);
  el.text.sel = { anchor: { block: 2, offset: 0 }, focus: { block: 2, offset: 0 } };
  await tick();
  await type(el, '> ');
  await until(() => el.text.model[2].k === 'quote');
  el.text.sel = { anchor: { block: 2, offset: 0 }, focus: { block: 2, offset: 5 } };
  await tick();
  key(el.text.tx, 'x', { ctrlKey: true, shiftKey: true });
  await until(() => (last() ?? '').endsWith('> ~~plain~~\n'));
  key(el.text.tx, 'h', { ctrlKey: true, shiftKey: true });
  await until(() => (last() ?? '').includes('=='));
});

test('§1 Alt+Up/Down moves a list item past its neighbour; Mod+Enter ticks a task item', async () => {
  const { el, last } = await editor('- one\n- two\n- [ ] task\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 1, offset: 1 }, focus: { block: 1, offset: 1 } };
  await tick();
  key(el.text.tx, 'ArrowUp', { altKey: true });
  await until(() => last() === '- two\n- one\n- [ ] task\n');
  el.text.sel = { anchor: { block: 2, offset: 1 }, focus: { block: 2, offset: 1 } };
  await tick();
  key(el.text.tx, 'Enter', { ctrlKey: true });
  await until(() => last() === '- two\n- one\n- [x] task\n');
});

test('§7 Align is a keep menu: chosen by a pointer, the words keep the focus; the page and the cells never zoom on a double tap', async () => {
  const { el } = await editor('Some words\n\nA | B\n--- | ---\n1 | 2\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 2 }, focus: { block: 0, offset: 2 } };
  await tick();
  const align = el.querySelector<HTMLElement>('to-menu.write-align')!;
  const btn = align.querySelector<HTMLButtonElement>(':scope > button')!;
  expect(btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
  btn.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  expect(el.text.hasFocus()).toBe(true);
  const centre = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Center'))!;
  centre.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  centre.click();
  await until(() => (el.value ?? '').startsWith('Some words {.center}'));
  expect(el.text.hasFocus()).toBe(true);
  expect(getComputedStyle(el.querySelector('.write-page')!).touchAction).toBe('manipulation');
  expect(getComputedStyle(cell(el, 'A1')).touchAction).toBe('manipulation');
});

test('a page break: from Insert ▾ or Mod+Shift+Enter at the caret, drawn as a dashed rule named in its middle; a tap takes it in hand, Delete takes it out', async () => {
  const { el, last } = await editor('One two\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 3 }, focus: { block: 0, offset: 3 } };
  await tick();
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Page break');
  await until(() => last() === 'One\n\n---\n\n\\ two\n');
  const brk = card(el, 1);
  expect(brk.classList.contains('tx-card')).toBe(true);
  expect(brk.getAttribute('contenteditable')).toBe('false');
  const drawn = brk.querySelector('.write-break')!;
  expect(drawn.getAttribute('role')).toBe('separator');
  expect(drawn.textContent).toBe('Page break');
  expect(getComputedStyle(drawn, '::before').borderTopStyle).toBe('dashed');
  // The caret went on to the words after it.
  expect(el.text.sel).toEqual({ anchor: { block: 2, offset: 0 }, focus: { block: 2, offset: 0 } });
  // Mod+Shift+Enter in the words: another, and the browser's own line break never happens.
  el.text.sel = { anchor: { block: 2, offset: 4 }, focus: { block: 2, offset: 4 } };
  await tick();
  expect(key(el.text.tx, 'Enter', { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  await until(() => last() === 'One\n\n---\n\n\\ two\n\n---\n\n<br>\n');
  // A tap takes it in hand (the bar under it), Delete takes it out.
  brk.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await until(() => document.activeElement === card(el, 1));
  await until(() => barItems().length > 0);
  expect(barItems()).toEqual(['Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  key(card(el, 1), 'Delete');
  await until(() => last() === 'One\n\n\\ two\n\n---\n\n<br>\n');
});

test('Mod+Shift+L, E, R and J align the block in hand left, centred, right and justified, each written on the menu; never taken outside the words', async () => {
  const { el, last } = await editor('One two\n\nThree\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 2 }, focus: { block: 0, offset: 2 } };
  await tick();
  for (const [k, written] of [
    ['E', 'One two {.center}\n\nThree\n'],
    ['R', 'One two {.right}\n\nThree\n'],
    ['J', 'One two {.justify}\n\nThree\n'],
    ['L', 'One two\n\nThree\n'],
  ] as const) {
    // Ctrl on Windows and Linux, ⌘ on a Mac; the browser's own (Mod+Shift+R reloads) never happens.
    expect(key(el.text.tx, k, { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
    await until(() => last() === written);
    expect(key(el.text.tx, k, { metaKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  }
  // The menu writes the keys beside each alignment.
  el.querySelector<HTMLElement>('to-menu.write-align button')!.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  expect(items.map((x) => x.querySelector('kbd')?.textContent?.replace(/^Ctrl\+|^⌘/, ''))).toEqual(
    ['Shift+L', 'Shift+E', 'Shift+R', 'Shift+J'].map((x) => (navigator.platform.startsWith('Mac') ? x.replace('Shift+', '⇧') : x)),
  );
  key(document.querySelector('[popover]:popover-open')!, 'Escape');
  await tick();
  // Outside the words (the bar), Mod+Shift+R is the browser's.
  expect(key(el.querySelector('to-bar')!, 'R', { ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(false);
});

/* ---------- Insert ▾: the kit's dialogs, and documents made and edited in place ---------- */

const FENCE = '```draw\nrect 10 10 100 60\n```';
const docDialog = () => document.querySelector('to-doc-dialog');

test('Insert ▾ lists the web things by their names and every other app; a new drawing is made in the Drawing Tool first, and Done puts it in as one step', async () => {
  const { el, last } = await editor('Before\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 6 } };
  await tick();
  const opener = el.querySelector<HTMLElement>('to-insert button')!;
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
  const labels = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].map((x) => x.textContent!.trim());
  expect(labels).toEqual(expect.arrayContaining(['Table', 'Web Picture…', 'Web Embed…', 'Tiny Little Office Doc…', 'Drawing Tool', 'Kanban Board', 'Spreadsheet']));
  expect(labels).not.toContain('Word Processor');
  opener.click();
  await tick();
  await pick(el, opener, 'Drawing Tool');
  await until(() => !!docDialog()?.querySelector('dialog[open] to-draw-editor'));
  expect(last()).toBeUndefined();
  docDialog()!
    .querySelector('to-draw-editor')!
    .dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 100 60\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => (last() ?? '').includes('```draw'));
  expect(last()).toBe(`Before\n\n${FENCE}\n\n<br>\n`);
  // The drawing is drawn as a picture of its page, and one undo takes it all back.
  await until(() => !!el.querySelector('.write-doc svg'));
  undo(el);
  await until(() => last() === 'Before\n');
});

test("Insert ▾ Web Picture: the kit's dialog; OK puts the picture in, with its words, where the caret was", async () => {
  const { el, last } = await editor('Before\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 6 } };
  await tick();
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Web Picture');
  await until(() => !!document.querySelector('.to-ask-picture .to-ask-url'));
  const url = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-url')!;
  url.value = 'https://example.com/a.png';
  url.dispatchEvent(new Event('input', { bubbles: true }));
  const alt = document.querySelector<HTMLInputElement>('.to-ask-picture .to-ask-alt input')!;
  alt.value = 'a picture';
  alt.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-ask-picture .to-ask-ok')!.click();
  await until(() => (last() ?? '').includes(PIC));
  expect(last()).toBe(`Before\n\n${PIC}\n\n<br>\n`);
});

test('a document in the text: its bar is Edit then Open in a new tab; Edit opens its own editor, Done writes it back as one undo step, Cancel changes nothing', async () => {
  const { el, last } = await editor(`One\n\n${FENCE}\n\nTwo\n`);
  await until(() => !!card(el, 1)?.classList.contains('tx-card'));
  card(el, 1).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await until(() => barItems().length > 0);
  expect(barItems()).toEqual(['Edit', 'Open in a new tab', 'Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  // Cancel: nothing changes, and the document is in hand again.
  key(card(el, 1), 'Enter');
  await until(() => !!docDialog()?.querySelector('dialog[open] to-draw-editor'));
  expect(docDialog()!.querySelector<HTMLElement & { value: string }>('to-draw-editor')!.value).toBe('rect 10 10 100 60\n');
  expect(docDialog()!.querySelector('h2')!.textContent).toBe('Drawing Tool');
  docDialog()!
    .querySelector('to-draw-editor')!
    .dispatchEvent(new CustomEvent('docchange', { detail: 'rect 0 0 5 5\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  await until(() => document.activeElement === card(el, 1));
  expect(last()).toBeUndefined();
  // Done: the new drawing, as one step.
  await until(() => barItems().length > 0);
  document.querySelector<HTMLButtonElement>('to-context.write-cardbar .to-context:popover-open button[aria-label="Edit"]')!.click();
  await until(() => !!docDialog()?.querySelector('dialog[open] to-draw-editor'));
  const ed = docDialog()!.querySelector('to-draw-editor')!;
  ed.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 120 60\n', bubbles: true }));
  ed.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 140 60\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => last() === 'One\n\n```draw\nrect 10 10 140 60\n```\n\nTwo\n');
  await until(() => document.activeElement === card(el, 1));
  undo(el);
  await until(() => last() === `One\n\n${FENCE}\n\nTwo\n`);
});

test('the Look menu: each look a sample in its own type, the chosen one checked; a pick is the head field, Sans takes it away, and the page wears it', async () => {
  const { el, last } = await editor('# A title {.title}\n\nOne.\n\nTwo.\n');
  const opener = el.querySelector<HTMLElement>('to-menu.write-look button')!;
  expect(opener.getAttribute('aria-label')).toBe('Look: Sans');
  expect(el.querySelector('.write-page')!.getAttribute('data-look')).toBe('sans');
  await pick(el, opener, 'Book');
  await until(() => last() === '---\nlook: book\n---\n# A title {.title}\n\nOne.\n\nTwo.\n');
  const page = el.querySelector<HTMLElement>('.write-page')!;
  expect(page.getAttribute('data-look')).toBe('book');
  const second = page.querySelectorAll<HTMLElement>('.tx p')[1];
  expect(getComputedStyle(second).textIndent).not.toBe('0px');
  expect(getComputedStyle(second).textAlign).toBe('justify');
  expect(getComputedStyle(page.querySelector('.tx h1')!).fontFamily).toMatch(/Charter|Georgia|serif/);
  // The menu again: the samples are drawn in their looks' type, Book is the one checked.
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role=menuitemcheckbox]')];
  expect(items.map((x) => x.querySelector('.to-menu-words > span')!.textContent)).toEqual(['Sans', 'Serif', 'Typewriter', 'Serif and sans', 'Sans and serif', 'Book', 'Newspaper']);
  expect(items.find((x) => x.getAttribute('aria-checked') === 'true')!.textContent).toContain('Book');
  expect(getComputedStyle(items[2].querySelector('.to-menu-words')!).fontFamily).toMatch(/mono|Menlo|Consolas/i);
  items[6].click();
  await until(() => (last() ?? '').startsWith('---\nlook: news\n---\n'));
  await pick(el, opener, 'Sans');
  await until(() => last() === '# A title {.title}\n\nOne.\n\nTwo.\n');
  expect(el.querySelector('.write-page')!.getAttribute('data-look')).toBe('sans');
});

test('§1 opens with the focus in the first words: the caret at their start, the page not scrolled', async () => {
  const { el } = await editor('');
  await el.focusFirst();
  expect(el.text.hasFocus()).toBe(true);
  expect(el.text.sel).toEqual({ anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } });
  const { el: opened } = await editor(templates()[3].doc);
  await opened.focusFirst();
  const first = parse(templates()[3].doc).blocks.findIndex(isWords);
  expect(opened.text.sel?.focus).toEqual({ block: first, offset: 0 });
  expect(document.scrollingElement!.scrollTop).toBe(0);
});

/** What Google Docs puts on the clipboard for a heading and a list two deep: a <p> inside every <li>, styles for marks. */
const DOCS_LIST =
  '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1"><h2 dir="ltr"><span style="font-weight:400;">Plan</span></h2><ul style="padding-inline-start:48px;"><li dir="ltr" aria-level="1"><p dir="ltr" role="presentation"><span style="font-weight:700;">Bold</span><span style="font-weight:400;"> start</span></p></li><ul><li dir="ltr" aria-level="2"><p dir="ltr" role="presentation"><span style="font-style:italic;">nested</span></p></li></ul><li dir="ltr" aria-level="1"><p dir="ltr" role="presentation"><span>**not bold**</span></p></li></ul></b>';

test('a paste from Google Docs keeps the heading, the items and their depth, the marks; words that look like syntax stay words', async () => {
  const { el, last } = await editor('');
  el.text.tx.focus();
  const dt = new DataTransfer();
  dt.setData('text/html', DOCS_LIST);
  dt.setData('text/plain', 'Plan\nBold start\nnested\n**not bold**');
  el.text.tx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await el.updateComplete;
  await tick();
  expect(last()).toBe('## Plan\n\n- **Bold** start\n  - *nested*\n- \\*\\*not bold\\*\\*\n');
  expect([...el.text.tx.querySelectorAll('li')].map((li) => [li.style.getPropertyValue('--d'), li.textContent])).toEqual([
    ['0', 'Bold start'],
    ['1', 'nested'],
    ['0', '**not bold**'],
  ]);
});
