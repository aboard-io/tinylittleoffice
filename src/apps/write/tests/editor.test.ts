// The Write editor in a real Chromium: typing is the document, the bar makes a title and marks the words, a footnote
// opens its box and is listed under the text, a table from Insert ▾ is a grid whose cells are the document and whose
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
import { mount, tick, until } from '../../../../test/browser/helpers.ts';

async function editor(value = ''): Promise<{ el: ToWriteEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
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
const cell = (el: HTMLElement, ref: string) => el.querySelector<HTMLInputElement>(`to-write-table input[aria-label="${ref}"]`)!;
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

test('a footnote from the bar opens its box; its words are listed under the text and counted', async () => {
  const { el, last } = await editor('Some words\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 10 }, focus: { block: 0, offset: 10 } };
  await tick();
  button(el, 'Footnote').click();
  await until(() => !!el.querySelector('.write-page .tx .fn'));
  const pop = el.querySelector<HTMLElement>('to-note-pop')!;
  await until(() => !!pop.querySelector('to-text .tx'));
  await type(el, 'Said in passing', pop.querySelector<HTMLElement>('to-text .tx')!);
  await until(() => last() === 'Some words^[Said in passing]\n');
  // The note's box is the same one line everywhere: the page's own rules for its words (its height, its size) stay out of it.
  const words = pop.querySelector<HTMLElement>('to-text .tx')!;
  expect(words.getBoundingClientRect().height).toBeLessThan(60);
  expect(getComputedStyle(words).fontSize).toBe('16px');
  const notes = el.querySelector('section[role="doc-endnotes"]')!;
  expect(notes.querySelectorAll('li')).toHaveLength(1);
  expect(notes.querySelector('li')!.textContent).toContain('Said in passing');
  expect(el.querySelector('.write-foot')!.textContent).toContain('5 words');
  // The way back from the note goes to its mark.
  button(notes, 'Back to footnote 1 in the text').click();
  expect(document.activeElement).toBe(el.querySelector('.write-page .tx .fn'));
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

test('the invoice: money in the head\'s currency, Amount locked, a quantity changed changes the amount; Enter goes down, a row comes from its menu inside the sum', async () => {
  const { el, last } = await editor(invoice().replace('currency: $', 'currency: €'));
  await until(() => !!cell(el, 'E7'));
  expect(cell(el, 'E7').value).toBe('€5,486.40');
  expect(cell(el, 'E1').readOnly).toBe(true);
  expect(el.querySelector<HTMLTextAreaElement>('#write-field-from')!.value).toBe('Harbor Studio\n14 Quay Street\nPortland, ME 04101');
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

test('a web address alone is a card that loads nothing until tapped; a tap on a task\'s box ticks it; the paper is a head field', async () => {
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

test('at phone width: the bar is one row, nothing is wider than the screen, and focusing the text or a cell never scrolls the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(invoice());
    await until(() => !!cell(el, 'A1'));
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    el.text.focus();
    el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
    await tick();
    expect(document.scrollingElement!.scrollTop).toBe(0);
    for (const ref of ['A1', 'B2', 'C3']) {
      cell(el, ref).focus({ preventScroll: true });
      await el.updateComplete;
      expect(bar.offsetHeight).toBeLessThanOrEqual(56);
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

test('§1 Mod+Z in the Ask dialog is the field\'s own: the document behind it is left alone', async () => {
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

test('§1/§6 a card in hand: a tap takes it, the bar under it is in the standard\'s order, and Enter edits it', async () => {
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
  const rows = () => { const b = parse(last()!).blocks[0]; return b.k === 'table' ? b.rows : []; };
  expect(rows()).toEqual([['1', '2', ''], ['3', 'x', 'y'], ['', 'z', 'w']]);
  // Our HTML alone (no text) is read too.
  await until(() => !!cell(el, 'C1'));
  const c1 = cell(el, 'C1');
  c1.focus();
  await el.updateComplete;
  clip(c1, 'paste', { 'text/html': '<table><tr><td>p</td></tr><tr><td>q</td></tr></table>' });
  await until(() => rows()[0][2] === 'p');
  expect(rows().map((r) => r[2])).toEqual(['p', 'q', 'w']);
});

test('§4 a column\'s head and a row\'s number open their menus; the + adds a column; never a key', async () => {
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
  // A column named from its menu (the dialog asks).
  await pick(el, el.querySelectorAll<HTMLElement>('to-write-table .wt-col')[2], 'Name this column');
  await until(() => !!el.querySelector<HTMLInputElement>('.write-ask-form input'));
  const field = el.querySelector<HTMLInputElement>('.write-ask-form input')!;
  field.value = 'Notes';
  el.querySelector<HTMLFormElement>('.write-ask-form')!.requestSubmit();
  await until(() => last() === 'A | B | Notes\n--- | --- | ---\n3 | 4 |\n');
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
  const centre = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Centre'))!;
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
  await until(() => last() === 'One\n\n---\n\n two\n');
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
  await until(() => last() === 'One\n\n---\n\n two\n\n---\n\n<br>\n');
  // A tap takes it in hand (the bar under it), Delete takes it out.
  brk.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await until(() => document.activeElement === card(el, 1));
  await until(() => barItems().length > 0);
  expect(barItems()).toEqual(['Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  key(card(el, 1), 'Delete');
  await until(() => last() === 'One\n\n two\n\n---\n\n<br>\n');
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
  docDialog()!.querySelector('to-draw-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 100 60\n', bubbles: true }));
  docDialog()!.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => (last() ?? '').includes('```draw'));
  expect(last()).toBe(`Before\n\n${FENCE}\n\n<br>\n`);
  // The drawing is drawn as a picture of its page, and one undo takes it all back.
  await until(() => !!el.querySelector('.write-doc svg'));
  undo(el);
  await until(() => last() === 'Before\n');
});

test('Insert ▾ Web Picture: the kit\'s dialog; OK puts the picture in, with its words, where the caret was', async () => {
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
  docDialog()!.querySelector('to-draw-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 0 0 5 5\n', bubbles: true }));
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
