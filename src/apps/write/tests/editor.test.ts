// The Write editor in a real Chromium: typing is the document, the bar makes a title and marks the words, a footnote
// opens its box and is listed under the text, a table from Insert ▾ is a grid whose cells are the document and whose
// formulas work out in place, the invoice's Enter puts a line in inside the sum's reach, a web address alone is a
// click-to-load card, a task is ticked by a tap, the paper is a head field, and at phone width the bar is one row and
// the page never scrolls.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToWriteEditor } from '../editor.ts';
import { templates } from '../templates.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

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
  expect(el.querySelector('.write-page .tx h1.title')!.textContent).toBe('Hello there');
  await until(() => button(el, 'Title').getAttribute('aria-pressed') === 'true');
  el.text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 5 } };
  await tick();
  button(el, 'Bold').click();
  await until(() => last() === '# **Hello** there {.title}\n');
  expect(el.querySelector('.write-foot')!.textContent).toContain('2 words');
  // The title the shell sets is a head op in the history, undone like any other.
  el.value = '---\ntitle: Named\n---\n# **Hello** there {.title}\n';
  await el.updateComplete;
  expect(el.history.canUndo).toBe(true);
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
  const notes = el.querySelector('section[role="doc-endnotes"]')!;
  expect(notes.querySelectorAll('li')).toHaveLength(1);
  expect(notes.querySelector('li')!.textContent).toContain('Said in passing');
  expect(el.querySelector('.write-foot')!.textContent).toContain('5 words');
  // The way back from the note goes to its mark.
  button(notes, 'Back to footnote 1 in the text').click();
  expect(document.activeElement).toBe(el.querySelector('.write-page .tx .fn'));
});

test('Insert ▾ puts in a table: a grid whose cells are the document, a formula worked out in place', async () => {
  const { el, last } = await editor('Before\n');
  el.text.focus();
  el.text.sel = { anchor: { block: 0, offset: 6 }, focus: { block: 0, offset: 6 } };
  await tick();
  await pick(el, el.querySelector<HTMLElement>('to-insert button')!, 'Table');
  await until(() => !!el.querySelector('to-write-table'));
  expect(last()).toBe('Before\n\nColA | ColB | ColC\n--- | --- | ---\n\n<br>\n');
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

test('the invoice: money in the head\'s currency, Amount locked, a quantity changed changes the amount, Enter puts a line in inside the sum', async () => {
  const { el, last } = await editor(invoice().replace('currency: $', 'currency: €'));
  await until(() => !!cell(el, 'E7'));
  expect(cell(el, 'E7').value).toBe('€5,486.40');
  expect(cell(el, 'E1').readOnly).toBe(true);
  expect(el.querySelector<HTMLTextAreaElement>('#write-field-from')!.value).toBe('Harbor Studio\n14 Quay Street\nPortland, ME 04101');
  await typeCell(el, cell(el, 'B1'), '20');
  await until(() => cell(el, 'E7').value === '€6,782.40');
  cell(el, 'B1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await until(() => (last() ?? '').includes('=SUM(E1:E5)'));
  await until(() => document.activeElement === cell(el, 'B2'));
  expect(cell(el, 'B2').value).toBe('');
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
