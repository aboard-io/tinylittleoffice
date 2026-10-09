// The Outline editor in a real browser: typing makes items, Enter the next, Tab and the bar arrange them, Backspace on an
// empty one takes it away, the bullet turns and names the line to the parent, Connect joins two items, folds and the
// zoom hide and show families, Insert puts a document under an item, undo takes things back, and at phone width the bar
// is one row and nothing is wider than the screen.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToOutlineEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { caret } from '../../../kit/textops.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

const TREE = '- Launch\n  - Product\n    - Pricing\n  - Marketing\n';

async function editor(value = ''): Promise<{ el: ToOutlineEditor; last: () => string | undefined; changes: string[] }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-outline-editor') as ToOutlineEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  await tick();
  return { el, changes, last: () => changes.at(-1) };
}
const row = (el: HTMLElement, at: number) => el.querySelector<HTMLElement>(`.ol-row[data-at="${at}"]`)!;
const textOf = (el: HTMLElement, at: number) => row(el, at).querySelector<ToText>('to-text')!;
const button = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const byWords = (el: HTMLElement, words: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === words)!;
const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.ol-row')].map((r) => Number(r.dataset.at));
const input = (tx: ToText, inputType: string, data: string | null = null) => tx.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }));
/** The caret put in a row's words (at the end), as a tap does. */
async function choose(el: ToOutlineEditor, at: number, offset = 99) {
  const tx = textOf(el, at);
  tx.sel = caret(0, offset);
  await el.updateComplete;
  await tick();
}
async function typeIn(el: ToOutlineEditor, at: number, text: string) {
  for (const ch of text) {
    input(textOf(el, at), 'insertText', ch);
    await el.updateComplete;
  }
  await tick();
}
async function keyOn(el: ToOutlineEditor, at: number, key: string, more: KeyboardEventInit = {}) {
  textOf(el, at).tx.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...more }));
  await el.updateComplete;
  await tick();
}
async function pick(el: ToOutlineEditor, opener: HTMLElement, words: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.trim().startsWith(words));
  if (!item) throw new Error(`no item ${words} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await el.updateComplete;
  await tick();
}
const focusedRow = () => Number((document.activeElement as HTMLElement).closest<HTMLElement>('.ol-row')?.dataset.at);

test('typing makes the first item, Enter the next, Tab puts it under, Shift+Tab brings it out, Backspace on an empty item takes it away', async () => {
  const { el, last } = await editor();
  expect(rows(el)).toEqual([-1]);
  expect(textOf(el, -1).placeholder).toBe('Start with an idea; Enter for the next; Tab to put it under');
  await choose(el, -1, 0);
  // The first letter typed brings the item into the document; the row is then the document's.
  await typeIn(el, -1, 'L');
  expect(last()).toBe('- L\n');
  expect(rows(el)).toEqual([0]);
  await typeIn(el, 0, 'aunch');
  expect(last()).toBe('- Launch\n');
  expect(rows(el)).toEqual([0]);
  expect(focusedRow()).toBe(0);
  input(textOf(el, 0), 'insertParagraph');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n-\n');
  expect(focusedRow()).toBe(1);
  await typeIn(el, 1, 'Product');
  expect(last()).toBe('- Launch\n- Product\n');
  await keyOn(el, 1, 'Tab');
  expect(last()).toBe('- Launch\n  - Product\n');
  expect(focusedRow()).toBe(1);
  expect(row(el, 1).style.getPropertyValue('--d')).toBe('1');
  await keyOn(el, 1, 'Tab', { shiftKey: true });
  expect(last()).toBe('- Launch\n- Product\n');
  // Enter in the middle of a leaf splits its words.
  await choose(el, 1, 3);
  input(textOf(el, 1), 'insertParagraph');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n- Pro\n- duct\n');
  expect(focusedRow()).toBe(2);
  // Backspace at the start of words does nothing; on an empty item it takes the item away and the caret lands above.
  input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  expect(last()).toBe('- Launch\n- Pro\n- duct\n');
  await choose(el, 2);
  for (let i = 0; i < 4; i++) input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  expect(last()).toBe('- Launch\n- Pro\n-\n');
  input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n- Pro\n');
  expect(focusedRow()).toBe(1);
  // Undo brings the item back.
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe('- Launch\n- Pro\n-\n');
});

test('the bar arranges the chosen row: Indent, Move up, Bring out take the family along; a drop places it; the keys move the caret between rows', async () => {
  const { el, last } = await editor(TREE);
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  expect(button(el, 'Indent').disabled).toBe(true);
  await choose(el, 3);
  expect(button(el, 'Indent').disabled).toBe(false);
  button(el, 'Indent').click();
  await el.updateComplete;
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n    - Marketing\n');
  button(el, 'Move up').click();
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n  - Product\n    - Marketing\n    - Pricing\n');
  expect(focusedRow()).toBe(2);
  // Brought out, Marketing takes Pricing (now below it) under it.
  button(el, 'Bring out').click();
  await el.updateComplete;
  expect(last()).toBe('- Launch\n  - Product\n  - Marketing\n    - Pricing\n');
  // Alt+Down on Product puts it past Marketing's family; the caret follows.
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowDown', { altKey: true });
  expect(last()).toBe('- Launch\n  - Marketing\n    - Pricing\n  - Product\n');
  expect(focusedRow()).toBe(3);
  // A drop: Product under Pricing.
  el.dropAt(3, 2, 'under');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n  - Marketing\n    - Pricing\n      - Product\n');
  expect(focusedRow()).toBe(3);
  // The arrow keys walk the rows.
  await keyOn(el, 3, 'ArrowUp');
  expect(focusedRow()).toBe(2);
  await keyOn(el, 2, 'ArrowDown');
  expect(focusedRow()).toBe(3);
});

test('the bullet opens the kinds of line, each named for the items it joins; the name dialog writes a label the chip shows', async () => {
  const { el, last } = await editor(TREE);
  // A top item has no line to a parent: its bullet is only a dot. Every other row has one.
  expect(row(el, 0).querySelector('button.ol-kind')).toBeNull();
  const bullet = () => row(el, 2).querySelector<HTMLButtonElement>('button.ol-kind')!;
  expect(bullet().getAttribute('aria-label')).toBe('Line from Product to Pricing: a plain line. Change it');
  bullet().click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  expect(items.map((x) => x.textContent!.trim())).toEqual(['Plain line', 'Arrow from Product to Pricing', 'Arrow from Pricing to Product', 'Arrows both ways', 'Name the line…']);
  expect(document.querySelector('[popover]:popover-open [role=menuitemcheckbox][aria-checked=true]')!.textContent!.trim()).toBe('Plain line');
  items[1].click();
  await el.updateComplete;
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.from}');
  expect(bullet().getAttribute('aria-label')).toBe('Line from Product to Pricing: an arrow from the parent. Change it');
  await pick(el, bullet(), 'Arrows both');
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both}');
  // Named: the dialog, Enter saves; the chip shows the name and opens the dialog again; emptied, the chip goes.
  await pick(el, bullet(), 'Name the line');
  await until(() => !!el.querySelector('.ol-name-dialog dialog[open]'));
  const box = () => el.querySelector<HTMLInputElement>('.ol-name-dialog input')!;
  expect(parseFloat(getComputedStyle(box()).fontSize)).toBeGreaterThanOrEqual(16);
  box().value = 'sets';
  box().dispatchEvent(new Event('input', { bubbles: true }));
  box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => !el.querySelector('.ol-name-dialog dialog[open]'));
  await tick();
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both label=sets}');
  const chip = row(el, 2).querySelector<HTMLButtonElement>('.ol-label')!;
  expect(chip.textContent).toBe('sets');
  chip.click();
  await until(() => !!el.querySelector('.ol-name-dialog dialog[open]'));
  expect(box().value).toBe('sets');
  box().value = '';
  box().dispatchEvent(new Event('input', { bubbles: true }));
  el.querySelector<HTMLButtonElement>('.ol-name-done')!.click();
  await until(() => !el.querySelector('.ol-name-dialog dialog[open]'));
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both}');
  expect(row(el, 2).querySelector('.ol-label')).toBeNull();
  // A parent's bullet zooms in too.
  await pick(el, row(el, 1).querySelector<HTMLButtonElement>('button.ol-kind')!, 'Zoom in');
  expect(rows(el)).toEqual([1, 2]);
  expect([...el.querySelectorAll('.ol-crumbs button')].map((b) => b.textContent!.trim())).toEqual(['Everything', 'Launch', 'Product']);
});

test('Connect greys the outline until the other end is tapped; the join is turned, named, follows a renamed item and is taken away', async () => {
  const { el, last } = await editor(TREE);
  await choose(el, 2);
  byWords(el, 'Connect').click();
  await el.updateComplete;
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(true);
  expect(row(el, 2).classList.contains('source')).toBe(true);
  expect(row(el, 2).querySelector('.ol-pick')).toBeNull();
  expect(el.querySelector('.ol-hint')!.textContent).toBe('Tap the item to connect “Pricing” to.');
  button(row(el, 3), 'Connect “Pricing” to “Marketing”').click();
  await el.updateComplete;
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(false);
  expect(last()).toBe(TREE + '\n~ Pricing -- Marketing\n');
  const link = () => el.querySelector<HTMLElement>('.ol-links .ol-link')!;
  expect(link().querySelector('button.ol-kind')!.getAttribute('aria-label')).toBe('Connection from Pricing to Marketing: a plain line. Change it');
  await pick(el, link().querySelector<HTMLButtonElement>('button.ol-kind')!, 'Arrow from Pricing to Marketing');
  expect(last()!.split('\n').at(-2)).toBe('~ Pricing -> Marketing');
  await pick(el, link().querySelector<HTMLButtonElement>('button.ol-kind')!, 'Name the line');
  await until(() => !!el.querySelector('.ol-name-dialog dialog[open]'));
  const box = el.querySelector<HTMLInputElement>('.ol-name-dialog input')!;
  box.value = 'feeds';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  el.querySelector<HTMLButtonElement>('.ol-name-done')!.click();
  await until(() => !el.querySelector('.ol-name-dialog dialog[open]'));
  expect(last()!.split('\n').at(-2)).toBe('~ Pricing -> Marketing: feeds');
  expect(link().querySelector('.ol-label')!.textContent).toBe('feeds');
  // Renaming an item carries its joins with it.
  await choose(el, 3);
  await typeIn(el, 3, 's');
  expect(last()!.split('\n').at(-2)).toBe('~ Pricing -> Marketings: feeds');
  expect(last()!.split('\n')[3]).toBe('  - Marketings');
  // With nothing chosen, Connect asks for both ends; Escape gives up.
  el.querySelector<HTMLButtonElement>('.ol-links .to-tool')!.click();
  await el.updateComplete;
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketings\n');
  expect(el.querySelector('.ol-links')).toBeNull();
  el.sel = -1;
  await el.updateComplete;
  byWords(el, 'Connect').click();
  await el.updateComplete;
  expect(el.querySelector('.ol-hint')!.textContent).toBe('Tap the item to connect from.');
  button(row(el, 0), 'Connect from “Launch”').click();
  await el.updateComplete;
  expect(el.querySelector('.ol-hint')!.textContent).toBe('Tap the item to connect “Launch” to.');
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await el.updateComplete;
  expect(el.querySelector('.ol')!.classList.contains('connecting')).toBe(false);
});

test('folding hides the family and counts it; Fold all and Unfold all; the zoom shows one family with a trail back out', async () => {
  const { el, changes } = await editor(TREE);
  const fold = () => row(el, 0).querySelector<HTMLButtonElement>('.ol-fold')!;
  expect(fold().getAttribute('aria-label')).toBe('Fold');
  expect(row(el, 2).querySelector('.ol-fold')).toBeNull();
  fold().click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0]);
  expect(fold().getAttribute('aria-label')).toBe('Unfold, 3 inside');
  expect(row(el, 0).querySelector('.ol-count')!.textContent).toBe('3');
  fold().click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  button(el, 'Fold all').click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0]);
  button(el, 'Unfold all').click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  // Alt+Left folds the row the caret is in; Alt+Right unfolds it.
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowLeft', { altKey: true });
  expect(rows(el)).toEqual([0, 1, 3]);
  await keyOn(el, 1, 'ArrowRight', { altKey: true });
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  // Zoom: Mod+. on a row; the rows step in from it; Zoom out goes to the parent, then everything.
  await keyOn(el, 1, '.', { ctrlKey: true });
  expect(rows(el)).toEqual([1, 2]);
  expect(row(el, 2).style.getPropertyValue('--d')).toBe('1');
  expect(row(el, 1).getAttribute('aria-level')).toBe('1');
  button(el, 'Zoom out').click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  expect(el.querySelector('.ol-crumbs')!.textContent).toContain('Launch');
  button(el, 'Zoom out').click();
  await el.updateComplete;
  expect(el.querySelector('.ol-crumbs')).toBeNull();
  expect(button(el, 'Zoom out')).toBeNull();
  // None of this touched the document.
  expect(changes).toEqual([]);
});

test('Insert puts a document under the chosen item; a web address becomes a card once the caret leaves; a tap below the last row starts an item; View as shows the page', async () => {
  const { el, last, changes } = await editor(TREE);
  await choose(el, 1);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Sheet');
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n\n```sheet {depth=1}\n```\n\n  - Marketing\n');
  const card = row(el, 3).querySelector<HTMLElement>('.ol-doc')!;
  expect(card.textContent).toContain('Sheet');
  expect(card.querySelector('a')!.getAttribute('href')).toMatch(/#\/v1\/sheet$/);
  expect(document.activeElement).toBe(card);
  // Delete on the card takes it away; undo brings it back.
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe(TREE);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('```sheet {depth=1}');
  // The web dialog makes an item that is its address, shown as a card.
  await choose(el, 4);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'From the web');
  await until(() => !!el.querySelector('.ol-web-dialog dialog[open]'));
  const box = el.querySelector<HTMLInputElement>('.ol-web-dialog input')!;
  expect(el.querySelector<HTMLButtonElement>('.ol-web-done')!.disabled).toBe(true);
  box.value = 'https://example.com/watch?v=1';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await el.updateComplete;
  el.querySelector<HTMLButtonElement>('.ol-web-done')!.click();
  await until(() => !el.querySelector('.ol-web-dialog dialog[open]'));
  await tick();
  expect(last()!.split('\n')[8]).toBe('  - https://example.com/watch?v=1');
  // While the caret is in it the address can still be edited; once the caret leaves it is a card.
  expect(focusedRow()).toBe(5);
  expect(row(el, 5).querySelector('.ol-doc')).toBeNull();
  await choose(el, 0);
  await until(() => !!row(el, 5).querySelector('.ol-doc'));
  expect(row(el, 5).querySelector('.ol-doc')!.textContent).toContain('https://example.com/watch?v=1');
  // A tap under the last row starts a new item at the margin.
  const n = changes.length;
  el.querySelector<HTMLElement>('.ol-below')!.click();
  await el.updateComplete;
  await tick();
  expect(changes.length).toBe(n + 1);
  expect(last()!.endsWith('\n-\n')).toBe(true);
  expect(focusedRow()).toBe(6);
  // A second tap only puts the caret back in the empty item.
  el.querySelector<HTMLElement>('.ol-below')!.click();
  await el.updateComplete;
  expect(changes.length).toBe(n + 1);
  // View as: the page, drawn in a dialog.
  await pick(el, el.querySelector<HTMLButtonElement>('.ol-view-as button')!, 'As a page');
  await until(() => !!el.querySelector('.ol-page-dialog dialog[open]'));
  expect(el.querySelector('.ol-page svg')!.outerHTML).toContain('Pricing');
});

test('loose words arriving are made an outline with one undoable splice; a pasted TinyLittleOffice link becomes that document', async () => {
  const { el, last } = await editor('# Plan\n\nFirst\nSecond\n');
  expect(last()).toBe('- Plan\n  - First\n  - Second\n');
  expect(rows(el)).toEqual([0, 1, 2]);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe('# Plan\n\nFirst\nSecond\n');
  el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
  await el.updateComplete;
  await choose(el, 2);
  input(textOf(el, 2), 'insertParagraph');
  await el.updateComplete;
  await tick();
  const dt = new DataTransfer();
  dt.setData('text/plain', 'https://tinylittleoffice.com/#/v1/draw');
  textOf(el, 3).tx.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Plan\n  - First\n  - Second\n\n```draw {depth=1}\n```\n');
  expect(row(el, 3).querySelector('.ol-doc')!.textContent).toContain('Draw');
});

test('at phone width: the bar is one row of 44px buttons, type is 16px, nothing is wider than the screen, focusing a row does not scroll the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(TREE);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await choose(el, 2);
    expect(bar.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.scrollingElement!.scrollTop).toBe(0);
    for (const tx of el.querySelectorAll<HTMLElement>('to-text .tx')) expect(parseFloat(getComputedStyle(tx).fontSize)).toBeGreaterThanOrEqual(16);
    expect(row(el, 2).querySelector<HTMLElement>('.ol-kind')!.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
    expect(row(el, 2).getBoundingClientRect().right).toBeLessThanOrEqual(390);
    // The line menu opens inside the screen.
    row(el, 2).querySelector<HTMLButtonElement>('button.ol-kind')!.click();
    await until(() => !!document.querySelector('[popover]:popover-open'));
    const r = document.querySelector('[popover]:popover-open')!.getBoundingClientRect();
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});
