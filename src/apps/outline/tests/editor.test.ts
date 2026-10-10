// The Outline editor in a real browser: typing makes items, Enter the next, Tab and the bar arrange them, Backspace on an
// empty one takes it away, the bullet turns and names the line to the parent, Connect joins two items, folds and the
// zoom hide and show families, Insert puts a document under an item, undo takes things back, and at phone width the bar
// is one row and nothing is wider than the screen.
import { test, expect } from 'vitest';
import { page } from 'vitest/browser';
// The page's styles first, as the app has them: they name the layers' order (an app's own rules over the kit's).
import '../../../styles.css';
import '../editor.ts';
import type { ToOutlineEditor } from '../editor.ts';
import type { ToText } from '../../../kit/text.ts';
import { caret } from '../../../kit/textops.ts';
import { until, tick } from '../../../../test/browser/helpers.ts';
import { encodeDoc } from '../../../kit/codec.ts';
import { remScale } from '../../../kit/zoom.ts';

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
  expect(textOf(el, -1).placeholder).toBe('');
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
  // Backspace at the start of words joins them to the row above (the next test says more); undone, they are apart again.
  input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  expect(last()).toBe('- Launch\n- Product\n');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n- Pro\n- duct\n');
  // On an empty item Backspace takes the item away and the caret lands above.
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
  expect(items.map((x) => x.textContent!.trim())).toEqual(['Plain line', 'Arrow from Product to Pricing', 'Arrow from Pricing to Product', 'Arrows both ways', 'Name the line']);
  expect(document.querySelector('[popover]:popover-open [role=menuitemcheckbox][aria-checked=true]')!.textContent!.trim()).toBe('Plain line');
  items[1].click();
  await el.updateComplete;
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.from}');
  expect(bullet().getAttribute('aria-label')).toBe('Line from Product to Pricing: an arrow from the parent. Change it');
  await pick(el, bullet(), 'Arrows both');
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both}');
  // Named: typed where the name is shown, no dialog; Enter keeps it; the chip shows the name and, tapped, is typed on again; emptied, the chip goes.
  await pick(el, bullet(), 'Name the line');
  const box = () => row(el, 2).querySelector<HTMLInputElement>('input.ol-label-in')!;
  expect(document.activeElement).toBe(box());
  expect(el.querySelector('dialog[open]')).toBeNull();
  expect(parseFloat(getComputedStyle(box()).fontSize)).toBeGreaterThanOrEqual(16);
  box().value = 'sets';
  box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both label=sets}');
  const chip = row(el, 2).querySelector<HTMLButtonElement>('.ol-label')!;
  expect(chip.textContent).toBe('sets');
  chip.click();
  expect(document.activeElement).toBe(box());
  expect(box().value).toBe('sets');
  // Escape leaves it be.
  box().value = 'gone';
  box().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()!.split('\n')[2]).toBe('    - Pricing {.both label=sets}');
  // Emptied, and the focus gone elsewhere: kept, so the name goes.
  row(el, 2).querySelector<HTMLButtonElement>('.ol-label')!.click();
  box().value = '';
  box().blur();
  await el.updateComplete;
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
  const box = link().querySelector<HTMLInputElement>('input.ol-label-in')!;
  expect(document.activeElement).toBe(box);
  box.value = 'feeds';
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await el.updateComplete;
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
  // Mod+Alt+Up folds the row the caret is in; Mod+Alt+Down unfolds it. Alt+Left/Right are the Mac's word jumps: left alone.
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowUp', { ctrlKey: true, altKey: true });
  expect(rows(el)).toEqual([0, 1, 3]);
  await keyOn(el, 1, 'ArrowDown', { ctrlKey: true, altKey: true });
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  const word = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true });
  textOf(el, 1).tx.dispatchEvent(word);
  expect(word.defaultPrevented).toBe(false);
  expect(rows(el)).toEqual([0, 1, 2, 3]);
  // Zoom: Mod+Shift+. on a row (Mod+, is a Mac's Settings); the rows step in from it; Zoom out goes to the parent, then everything.
  expect(button(el, 'Zoom in').title).toContain('.');
  await keyOn(el, 1, '>', { ctrlKey: true, shiftKey: true, code: 'Period' });
  expect(rows(el)).toEqual([1, 2]);
  expect(row(el, 2).style.getPropertyValue('--d')).toBe('1');
  expect(row(el, 1).getAttribute('aria-level')).toBe('1');
  // Mod+Shift+, zooms out a step, the same as the bar's Zoom out.
  await keyOn(el, 2, '<', { ctrlKey: true, shiftKey: true, code: 'Comma' });
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
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Spreadsheet');
  // The new spreadsheet is made in its own editor, in the dialog; Done puts it under the item.
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-sheet-editor'));
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => (last() ?? '').includes('```sheet'));
  await until(() => !!row(el, 3)?.querySelector('.ol-doc') && document.activeElement === row(el, 3).querySelector('.ol-doc'));
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n\n```sheet {depth=1}\n```\n\n  - Marketing\n');
  const card = row(el, 3).querySelector<HTMLElement>('.ol-doc')!;
  expect(card.textContent).toContain('Spreadsheet');
  expect(card.querySelector('a')!.getAttribute('href')).toMatch(/#\/v1\/sheet$/);
  expect(document.activeElement).toBe(card);
  // Delete on the card takes it away; undo brings it back.
  card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(last()).toBe(TREE);
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  expect(last()).toContain('```sheet {depth=1}');
  // Web Embed (the kit's dialog) makes an item that is its address, shown as a card.
  await choose(el, 4);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Web Embed');
  await until(() => !!document.querySelector('.to-ask-embed dialog[open]'));
  const box = document.querySelector<HTMLInputElement>('.to-ask-embed .to-ask-url')!;
  expect(document.querySelector<HTMLButtonElement>('.to-ask-embed .to-ask-ok')!.disabled).toBe(true);
  box.value = 'https://example.com/watch?v=1';
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await tick();
  document.querySelector<HTMLButtonElement>('.to-ask-embed .to-ask-ok')!.click();
  await until(() => !document.querySelector('.to-ask-embed'));
  await until(() => (last() ?? '').includes('https://example.com/watch?v=1'));
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

test('loose words arriving are made an outline with one undoable splice; a pasted Tiny Little Office link becomes that document', async () => {
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
  expect(row(el, 3).querySelector('.ol-doc')!.textContent).toContain('Drawing Tool');
});

/* ---------- bullet-list semantics, rows chosen whole, numbered lists ---------- */

const tree = (el: HTMLElement) => el.querySelector<HTMLElement>('.ol')!;
/** A key pressed while rows are chosen: the tree has the focus. */
async function treeKey(el: ToOutlineEditor, key: string, more: KeyboardEventInit = {}) {
  tree(el).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...more }));
  await el.updateComplete;
  await tick();
}
const ranged = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.ol-row.ranged')].map((r) => Number(r.dataset.at));
const offsetIn = (el: HTMLElement, at: number) => textOf(el, at).sel?.focus.offset;
const contextOpen = (el: HTMLElement) => !!el.querySelector('.ol-context .to-context')?.matches(':popover-open');
const contextButton = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.ol-context button[aria-label="${label}"]`)!;
async function clip(el: ToOutlineEditor, type: 'copy' | 'cut' | 'paste', on: HTMLElement, data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await el.updateComplete;
  await tick();
  return dt;
}
const undo = async (el: ToOutlineEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await el.updateComplete;
  await tick();
};

test('Enter at the start pushes the row down with the caret; Backspace at the start joins the row to the one above; Delete at the end joins the next one in', async () => {
  const { el, last } = await editor(TREE);
  await choose(el, 1, 0);
  input(textOf(el, 1), 'insertParagraph');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n  -\n  - Product\n    - Pricing\n  - Marketing\n');
  expect(focusedRow()).toBe(2);
  expect(offsetIn(el, 2)).toBe(0);
  // The caret stayed with the words: what is typed goes in before them.
  await typeIn(el, 2, 'X');
  expect(last()!.split('\n')[2]).toBe('  - XProduct');
  await undo(el);
  await undo(el);
  expect(last()).toBe(TREE);
  // Backspace at the start of Pricing: its words join Product's, the caret at the join.
  await choose(el, 2, 0);
  input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- Launch\n  - ProductPricing\n  - Marketing\n');
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(7);
  await typeIn(el, 1, '|');
  expect(last()!.split('\n')[1]).toBe('  - Product|Pricing');
  // Delete at the end of Launch: the next row's words come in, the caret stays.
  await choose(el, 0);
  input(textOf(el, 0), 'deleteContentForward');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- LaunchProduct|Pricing\n  - Marketing\n');
  expect(focusedRow()).toBe(0);
  expect(offsetIn(el, 0)).toBe(6);
  // The first row has nothing before it: Backspace at its start does nothing.
  await choose(el, 0, 0);
  input(textOf(el, 0), 'deleteContentBackward');
  await el.updateComplete;
  expect(last()).toBe('- LaunchProduct|Pricing\n  - Marketing\n');
});

test('Backspace at the start joins into a row hidden under a fold, which opens; Delete on an empty row with children brings them out', async () => {
  const { el, last } = await editor('- A\n  - a1\n- B\n');
  row(el, 0).querySelector<HTMLButtonElement>('.ol-fold')!.click();
  await el.updateComplete;
  expect(rows(el)).toEqual([0, 2]);
  await choose(el, 2, 0);
  input(textOf(el, 2), 'deleteContentBackward');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- A\n  - a1B\n');
  expect(rows(el)).toEqual([0, 1]);
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(2);
  const e = await editor('-\n  - a\n  - b\n');
  await choose(e.el, 0);
  input(textOf(e.el, 0), 'deleteContentForward');
  await e.el.updateComplete;
  await tick();
  expect(e.last()).toBe('- a\n- b\n');
  expect(focusedRow()).toBe(0);
});

test('Shift+Down chooses rows whole, a folded family with them; Backspace takes them away and undo brings them back; Escape and the arrows let go', async () => {
  const { el, last } = await editor('- A\n- B\n  - b1\n- C\n- D\n');
  row(el, 1).querySelector<HTMLButtonElement>('.ol-fold')!.click();
  await el.updateComplete;
  expect(contextOpen(el)).toBe(false);
  // Closed, the bar is not drawn at all.
  expect(getComputedStyle(el.querySelector('.ol-context .to-context')!).display).toBe('none');
  await choose(el, 0);
  await keyOn(el, 0, 'ArrowDown', { shiftKey: true });
  expect(ranged(el)).toEqual([0]);
  expect(document.activeElement).toBe(tree(el));
  expect(document.getSelection()!.rangeCount).toBe(0);
  expect(contextOpen(el)).toBe(true);
  await treeKey(el, 'ArrowDown', { shiftKey: true });
  // B is folded: its child is chosen with it, though not shown.
  expect(ranged(el)).toEqual([0, 1]);
  expect(row(el, 1).getAttribute('aria-selected')).toBe('true');
  // Typing does nothing to chosen rows.
  await treeKey(el, 'x');
  expect(last()).toBeUndefined();
  await treeKey(el, 'Backspace');
  expect(last()).toBe('- C\n- D\n');
  expect(focusedRow()).toBe(0);
  expect(contextOpen(el)).toBe(false);
  await undo(el);
  expect(last()).toBe('- A\n- B\n  - b1\n- C\n- D\n');
  // (A fold is the view's: B came back open.) Up past the anchor, the range turns.
  expect(rows(el)).toEqual([0, 1, 2, 3, 4]);
  await choose(el, 3);
  await keyOn(el, 3, 'ArrowDown', { shiftKey: true });
  for (let i = 0; i < 3; i++) await treeKey(el, 'ArrowUp', { shiftKey: true });
  expect(ranged(el)).toEqual([0, 1, 2, 3]);
  await treeKey(el, 'ArrowDown', { shiftKey: true });
  expect(ranged(el)).toEqual([1, 2, 3]);
  // Escape: the caret into the focus row; a plain arrow: the row past the range.
  await treeKey(el, 'Escape');
  expect(ranged(el)).toEqual([]);
  expect(focusedRow()).toBe(1);
  await keyOn(el, 1, 'ArrowDown', { shiftKey: true });
  await treeKey(el, 'ArrowDown');
  expect(focusedRow()).toBe(3);
  expect(contextOpen(el)).toBe(false);
});

test('chosen rows: Tab and Shift+Tab shift them all, Alt+arrows move them, the context bar does the same; a tap on a handle chooses, Shift extends', async () => {
  const { el, last } = await editor('- A\n- B\n- C\n');
  row(el, 1).querySelector<HTMLButtonElement>('.ol-handle')!.click();
  await el.updateComplete;
  await tick();
  expect(ranged(el)).toEqual([1]);
  row(el, 2).querySelector<HTMLButtonElement>('.ol-handle')!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await el.updateComplete;
  await tick();
  expect(ranged(el)).toEqual([1, 2]);
  await treeKey(el, 'Tab');
  expect(last()).toBe('- A\n  - B\n  - C\n');
  expect(ranged(el)).toEqual([1, 2]);
  // In again is refused (no sibling before B now); out, and out again is refused at the margin.
  expect(contextButton(el, 'Indent').disabled).toBe(true);
  await treeKey(el, 'Tab', { shiftKey: true });
  expect(last()).toBe('- A\n- B\n- C\n');
  expect(contextButton(el, 'Bring out').disabled).toBe(true);
  contextButton(el, 'Indent').click();
  await el.updateComplete;
  expect(last()).toBe('- A\n  - B\n  - C\n');
  contextButton(el, 'Bring out').click();
  await el.updateComplete;
  // B alone, moved down past C, and back up with the bar.
  row(el, 1).querySelector<HTMLButtonElement>('.ol-handle')!.click();
  await el.updateComplete;
  await treeKey(el, 'ArrowDown', { altKey: true });
  expect(last()).toBe('- A\n- C\n- B\n');
  expect(ranged(el)).toEqual([2]);
  contextButton(el, 'Move up').click();
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- A\n- B\n- C\n');
  expect(ranged(el)).toEqual([1]);
  // The bar's Delete.
  contextButton(el, 'Delete').click();
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- A\n- C\n');
  expect(contextOpen(el)).toBe(false);
  // A Shift+click on a bullet extends from the chosen row.
  await choose(el, 0);
  row(el, 1).querySelector<HTMLButtonElement>('button.ol-kind')?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  row(el, 1).querySelector<HTMLElement>('.ol-bullet')!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
  await el.updateComplete;
  await tick();
  expect(ranged(el)).toEqual([0, 1]);
  // Words tapped let the range go.
  textOf(el, 0).tx.focus();
  await el.updateComplete;
  expect(ranged(el)).toEqual([]);
});

test('copy gives the chosen rows as TLO from the margin and as our HTML; cut takes them; paste puts lines in as items after the row’s family, or in place of chosen rows', async () => {
  const { el, last } = await editor(TREE);
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowDown', { shiftKey: true });
  const dt = await clip(el, 'copy', tree(el));
  expect(dt.getData('text/plain')).toBe('- Product\n  - Pricing\n');
  expect(dt.getData('text/html')).toContain('<meta name="generator" content="TinyLittleOffice">');
  expect(dt.getData('text/html')).toContain('<li>Pricing</li>');
  expect(last()).toBeUndefined();
  // Pasted after Marketing's family: the copy, rebased to Marketing's depth, as items.
  await choose(el, 3);
  await clip(el, 'paste', textOf(el, 3).tx, { 'text/plain': dt.getData('text/plain'), 'text/html': dt.getData('text/html') });
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Product\n    - Pricing\n');
  expect(focusedRow()).toBe(5);
  await undo(el);
  // Three lines of plain text: three items after the caret row's family, the caret at the end of the last.
  await choose(el, 1);
  await clip(el, 'paste', textOf(el, 1).tx, { 'text/plain': 'one\ntwo\nthree' });
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n  - one\n  - two\n  - three\n  - Marketing\n');
  expect(focusedRow()).toBe(5);
  expect(offsetIn(el, 5)).toBe(5);
  await undo(el);
  // One line of words is the row's: it goes in as words.
  await choose(el, 3);
  await clip(el, 'paste', textOf(el, 3).tx, { 'text/plain': ' plan' });
  expect(last()!.split('\n')[3]).toBe('  - Marketing plan');
  await undo(el);
  // Cut: the rows go; pasted over another chosen row, they take its place.
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowDown', { shiftKey: true });
  const cut = await clip(el, 'cut', tree(el));
  expect(cut.getData('text/plain')).toBe('- Product\n  - Pricing\n');
  expect(last()).toBe('- Launch\n  - Marketing\n');
  await choose(el, 1);
  await keyOn(el, 1, 'ArrowDown', { shiftKey: true });
  await clip(el, 'paste', tree(el), { 'text/plain': cut.getData('text/plain') });
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n');
  expect(ranged(el)).toEqual([]);
});

test('the context bar copies and pastes: the system clipboard where the page may use it, else what was copied here', async () => {
  const { el, last } = await editor('- A\n- B\n- C\n');
  row(el, 0).querySelector<HTMLButtonElement>('.ol-handle')!.click();
  await el.updateComplete;
  contextButton(el, 'Copy').click();
  row(el, 2).querySelector<HTMLButtonElement>('.ol-handle')!.click();
  await el.updateComplete;
  contextButton(el, 'Paste').click();
  await until(() => last() !== undefined);
  expect(last()).toBe('- A\n- B\n- A\n');
  expect(focusedRow()).toBe(2);
});

test('Select All twice chooses every row; Delete empties the outline, joins and all; undo brings it back', async () => {
  const text = '- A\n  - a1\n- B\n\n~ A -> B\n';
  const { el, last } = await editor(text);
  await choose(el, 1);
  // The first press is the browser's (it selects the line); with the line whole, the second asks for everything.
  textOf(el, 1).sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 2 } };
  await keyOn(el, 1, 'a', { ctrlKey: true });
  expect(ranged(el)).toEqual([0, 1, 2]);
  expect(contextOpen(el)).toBe(true);
  await treeKey(el, 'Delete');
  expect(last()).toBe('');
  expect(rows(el)).toEqual([-1]);
  expect(focusedRow()).toBe(-1);
  await undo(el);
  expect(last()).toBe(text);
  // Mod+A with some rows chosen chooses them all.
  await choose(el, 2);
  await keyOn(el, 2, 'ArrowUp', { shiftKey: true });
  await treeKey(el, 'a', { metaKey: true });
  expect(ranged(el)).toEqual([0, 1, 2]);
});

test('Numbered toggles the list the row belongs to; the bullets show 1. 2.; on chosen rows it numbers their top rows', async () => {
  const { el, last } = await editor('- A\n  - a1\n    - x\n  - a2\n- B\n');
  expect(button(el, 'Numbered').disabled).toBe(true);
  await choose(el, 1);
  expect(button(el, 'Numbered').getAttribute('aria-pressed')).toBe('false');
  button(el, 'Numbered').click();
  await el.updateComplete;
  expect(last()).toBe('- A\n  1. a1\n    - x\n  2. a2\n- B\n');
  expect(row(el, 1).querySelector('.ol-n')!.textContent).toBe('1.');
  expect(row(el, 3).querySelector('.ol-n')!.textContent).toBe('2.');
  expect(row(el, 2).querySelector('.ol-n')).toBeNull();
  expect(button(el, 'Numbered').getAttribute('aria-pressed')).toBe('true');
  // Enter after a numbered row makes the next number.
  await choose(el, 3);
  input(textOf(el, 3), 'insertParagraph');
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- A\n  1. a1\n    - x\n  2. a2\n  3.\n- B\n');
  expect(row(el, 4).querySelector('.ol-n')!.textContent).toBe('3.');
  await undo(el);
  // The number still opens the line's menu.
  row(el, 1).querySelector<HTMLButtonElement>('button.ol-kind')!.click();
  await until(() => !!document.querySelector('.ol-line-menu [popover]:popover-open'));
  document.querySelector<HTMLElement>('.ol-line-menu [popover]:popover-open')!.hidePopover();
  await choose(el, 1);
  button(el, 'Numbered').click();
  await el.updateComplete;
  expect(last()).toBe('- A\n  - a1\n    - x\n  - a2\n- B\n');
  // Rows chosen: their top rows (A and B, not what is under them).
  await choose(el, 0);
  await keyOn(el, 0, 'ArrowDown', { shiftKey: true });
  await treeKey(el, 'ArrowDown', { shiftKey: true });
  expect(ranged(el)).toEqual([0, 1, 2, 3, 4]);
  expect(contextButton(el, 'Numbered').getAttribute('aria-pressed')).toBe('false');
  contextButton(el, 'Numbered').click();
  await el.updateComplete;
  expect(last()).toBe('1. A\n  - a1\n    - x\n  - a2\n2. B\n');
  expect(row(el, 0).querySelector('.ol-n')!.textContent).toBe('1.');
  expect(contextButton(el, 'Numbered').getAttribute('aria-pressed')).toBe('true');
});

test('at phone width: the bar is one row of 44px buttons, type is 16px, nothing is wider than the screen, focusing a row does not scroll the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(TREE);
    const bar = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(Math.round(bar.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await choose(el, 2);
    expect(Math.round(bar.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
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

/* ---------- after the editing audit (docs/editing.md) ---------- */

test('Enter on chosen rows edits the focus row; Escape in a row chooses it (selected words collapse first); a tap outside lets go', async () => {
  const { el } = await editor('- A\n- B\n- C\n');
  await choose(el, 1);
  await keyOn(el, 1, 'Escape');
  expect(ranged(el)).toEqual([1]);
  expect(document.activeElement).toBe(tree(el));
  await treeKey(el, 'Enter');
  expect(ranged(el)).toEqual([]);
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(1);
  // Words selected: the first Escape collapses them, the second chooses the row.
  textOf(el, 2).sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 1 } };
  await el.updateComplete;
  await tick();
  await keyOn(el, 2, 'Escape');
  expect(ranged(el)).toEqual([]);
  expect(textOf(el, 2).sel).toEqual({ anchor: { block: 0, offset: 1 }, focus: { block: 0, offset: 1 } });
  await keyOn(el, 2, 'Escape');
  expect(ranged(el)).toEqual([2]);
  expect(contextOpen(el)).toBe(true);
  // A tap on the page outside the outline lets the rows go and takes the bar away.
  const outside = document.createElement('p');
  outside.textContent = 'elsewhere';
  document.body.append(outside);
  outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await el.updateComplete;
  await tick();
  expect(ranged(el)).toEqual([]);
  expect(contextOpen(el)).toBe(false);
});

test('Mod+D duplicates: a row with its family after it (the caret in the copy), chosen rows (the copy chosen), and the bar’s Duplicate; undo puts the selection back', async () => {
  const { el, last } = await editor(TREE);
  await choose(el, 1, 3);
  await keyOn(el, 1, 'd', { ctrlKey: true });
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n  - Product\n    - Pricing\n  - Marketing\n');
  expect(focusedRow()).toBe(3);
  expect(offsetIn(el, 3)).toBe(3);
  await undo(el);
  expect(last()).toBe(TREE);
  // The caret is back in the row it was in, where it was.
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(3);
  // Chosen rows: the copy follows them and is chosen.
  await keyOn(el, 1, 'ArrowDown', { shiftKey: true });
  await treeKey(el, 'd', { metaKey: true });
  expect(last()).toBe('- Launch\n  - Product\n    - Pricing\n  - Product\n    - Pricing\n  - Marketing\n');
  expect(ranged(el)).toEqual([3, 4]);
  contextButton(el, 'Duplicate').click();
  await el.updateComplete;
  await tick();
  expect(last()!.split('\n').filter((l) => l.trim() === '- Product')).toHaveLength(3);
  expect(ranged(el)).toEqual([5, 6]);
  // Undo: the rows chosen before the duplicate are chosen again.
  await undo(el);
  expect(ranged(el)).toEqual([3, 4]);
  expect(contextOpen(el)).toBe(true);
});

test('undo brings back what was chosen: rows deleted, cut, moved or shifted are chosen again; typing puts the caret back where it began', async () => {
  const { el, last } = await editor('- A\n- B\n- C\n');
  row(el, 1).querySelector<HTMLButtonElement>('.ol-handle')!.click();
  await el.updateComplete;
  await treeKey(el, 'ArrowDown', { shiftKey: true });
  await treeKey(el, 'Delete');
  expect(last()).toBe('- A\n');
  await undo(el);
  expect(last()).toBe('- A\n- B\n- C\n');
  expect(ranged(el)).toEqual([1, 2]);
  expect(document.activeElement).toBe(tree(el));
  await treeKey(el, 'ArrowUp', { altKey: true });
  expect(last()).toBe('- B\n- C\n- A\n');
  expect(ranged(el)).toEqual([0, 1]);
  await undo(el);
  expect(ranged(el)).toEqual([1, 2]);
  await treeKey(el, 'Tab');
  expect(last()).toBe('- A\n  - B\n  - C\n');
  await undo(el);
  expect(last()).toBe('- A\n- B\n- C\n');
  expect(ranged(el)).toEqual([1, 2]);
  // Typing, undone: the caret where the typing began.
  await treeKey(el, 'Escape');
  await choose(el, 0, 1);
  await typeIn(el, 0, 'xyz');
  expect(last()!.split('\n')[0]).toBe('- Axyz');
  await undo(el);
  expect(last()).toBe('- A\n- B\n- C\n');
  expect(focusedRow()).toBe(0);
  expect(offsetIn(el, 0)).toBe(1);
});

test('plain Up/Down keep the caret’s column and walk a long item’s lines; Left at the start and Right at the end cross into the next row', async () => {
  const { el } = await editor('- abcdefgh\n- abcdefgh\n- abcdefgh\n');
  await choose(el, 0, 4);
  await tick(40);
  await keyOn(el, 0, 'ArrowDown');
  expect(focusedRow()).toBe(1);
  await tick(40);
  expect(offsetIn(el, 1)).toBe(4);
  await keyOn(el, 1, 'ArrowUp');
  expect(focusedRow()).toBe(0);
  await tick(40);
  expect(offsetIn(el, 0)).toBe(4);
  // Right at the end of a row: the start of the next; Left at the start: the end of the one before.
  await choose(el, 1, 8);
  await keyOn(el, 1, 'ArrowRight');
  expect(focusedRow()).toBe(2);
  expect(offsetIn(el, 2)).toBe(0);
  await keyOn(el, 2, 'ArrowLeft');
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(8);
  // In the middle of the words they are the caret's own.
  await choose(el, 1, 3);
  const mid = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
  textOf(el, 1).tx.dispatchEvent(mid);
  expect(mid.defaultPrevented).toBe(false);
  // A long item that wraps: Up from its last line stays in it (the browser walks the lines).
  const long = await editor(`- short\n- ${'many words that wrap '.repeat(12)}\n`);
  await choose(long.el, 1);
  await tick(40);
  const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
  textOf(long.el, 1).tx.dispatchEvent(up);
  expect(up.defaultPrevented).toBe(false);
  await choose(long.el, 1, 0);
  await tick(40);
  await keyOn(long.el, 1, 'ArrowUp');
  expect(focusedRow()).toBe(0);
});

test('“1. ” typed at the start of a row numbers its list, and an undo gives the marker back', async () => {
  const { el, last } = await editor('- A\n  - a1\n  - a2\n');
  await choose(el, 1, 0);
  await typeIn(el, 1, '1. ');
  expect(last()).toBe('- A\n  1. a1\n  2. a2\n');
  expect(row(el, 1).querySelector('.ol-n')!.textContent).toBe('1.');
  expect(focusedRow()).toBe(1);
  expect(offsetIn(el, 1)).toBe(0);
  await undo(el);
  expect(last()).toBe('- A\n  - 1. a1\n  - a2\n');
  // Not at the start, it is words.
  await choose(el, 2);
  await typeIn(el, 2, ' 1. ');
  expect(last()!.split('\n')[2]).toBe('  - a2 1.\\ ');
});

test('the bar: Indent before Bring out as under chosen rows; Connect, Zoom out and the fold arrow keep the focus; the rows never zoom the page on a double tap', async () => {
  const { el } = await editor(TREE);
  const tools = [...el.querySelectorAll<HTMLButtonElement>('.ol-bar button[aria-label]')].map((b) => b.getAttribute('aria-label'));
  expect(tools.indexOf('Indent')).toBeLessThan(tools.indexOf('Bring out'));
  // Undo and Redo end the bar, off until there is something to do.
  expect(tools.slice(-2)).toEqual(['Undo', 'Redo']);
  expect(button(el, 'Undo').disabled).toBe(true);
  await choose(el, 1);
  await keyOn(el, 1, '>', { ctrlKey: true, shiftKey: true, code: 'Period' });
  const keeps = (b: HTMLElement) => {
    const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    b.dispatchEvent(e);
    return e.defaultPrevented;
  };
  expect(keeps(byWords(el, 'Connect'))).toBe(true);
  expect(keeps(button(el, 'Zoom out'))).toBe(true);
  expect(keeps(row(el, 1).querySelector<HTMLElement>('.ol-fold')!)).toBe(true);
  expect(getComputedStyle(tree(el)).touchAction).toBe('manipulation');
  // Escape while connecting cancels connecting, and does not choose the row.
  byWords(el, 'Connect').click();
  await el.updateComplete;
  await keyOn(el, 1, 'Escape');
  expect(el.querySelector('.ol.connecting')).toBeNull();
  expect(ranged(el)).toEqual([]);
  await typeIn(el, 1, 'X');
  expect(button(el, 'Undo').disabled).toBe(false);
  button(el, 'Undo').click();
  await el.updateComplete;
  expect(el.value).toBe(TREE);
  expect(getComputedStyle(row(el, 1).querySelector('.ol-handle')!).touchAction).toBe('none');
  // The handle is the kit's: no HTML5 drag.
  expect(row(el, 1).querySelector('.ol-handle')!.getAttribute('draggable')).toBeNull();
});

test('a drag by a row’s handle (pointer events) moves its family under or after another row, with the target drawn; a still tap chooses', async () => {
  const { el, last } = await editor('- A\n- B\n  - b1\n- C\n');
  const handle = row(el, 1).querySelector<HTMLElement>('.ol-handle')!;
  const h = handle.getBoundingClientRect();
  const c = row(el, 3).getBoundingClientRect();
  const at = (type: string, x: number, y: number) => handle.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', h.left + 5, h.top + 5);
  expect(el.rows.drag).toBeNull();
  // Onto C's right half: under C.
  at('pointermove', c.right - 10, c.top + c.height / 2);
  await el.updateComplete;
  expect(el.rows.drag).toMatchObject({ id: 1, over: 3, how: 'under' });
  expect(row(el, 1).classList.contains('dragging')).toBe(true);
  const line = document.querySelector<HTMLElement>('.to-rows-target')!;
  expect(line.hidden).toBe(false);
  expect(line.dataset.how).toBe('under');
  expect(Math.abs(line.getBoundingClientRect().top - c.bottom)).toBeLessThan(3);
  at('pointerup', c.right - 10, c.top + c.height / 2);
  await el.updateComplete;
  await tick();
  expect(last()).toBe('- A\n- C\n  - B\n    - b1\n');
  expect(document.querySelector('.to-rows-target')).toBeNull();
  expect(ranged(el)).toEqual([]);
  // A press that does not move is a tap: the row chosen.
  const h2 = row(el, 0).querySelector<HTMLElement>('.ol-handle')!;
  const r = h2.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup']) h2.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 8, isPrimary: true, button: 0, pointerType: 'mouse', clientX: r.left + 3, clientY: r.top + 3 }));
  h2.click();
  await el.updateComplete;
  expect(ranged(el)).toEqual([0]);
});

/* ---------- documents edited in place; the footnotes ---------- */

test('a document under an item: Edit opens its own editor in the dialog; Done writes it back, one undo takes it back; Cancel changes nothing', async () => {
  const FENCE = '- Map\n\n```draw {depth=1}\nrect 10 10 100 60\n```\n';
  const { el, last } = await editor(FENCE);
  await until(() => !!el.querySelector('.ol-doc-edit'));
  el.querySelector<HTMLButtonElement>('.ol-doc-edit')!.click();
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  expect(document.querySelector<HTMLElement & { value: string }>('to-doc-dialog to-draw-editor')!.value).toBe('rect 10 10 100 60\n');
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-cancel')!.click();
  await until(() => !document.querySelector('to-doc-dialog'));
  expect(last()).toBeUndefined();
  el.querySelector<HTMLButtonElement>('.ol-doc-edit')!.click();
  await until(() => !!document.querySelector('to-doc-dialog dialog[open] to-draw-editor'));
  document.querySelector('to-doc-dialog to-draw-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'rect 10 10 300 60\n', bubbles: true }));
  document.querySelector<HTMLButtonElement>('.to-doc-dialog-done')!.click();
  await until(() => last() === '- Map\n\n```draw {depth=1}\nrect 10 10 300 60\n```\n');
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await until(() => last() === FENCE);
});

test('Insert ▾ lists Web Embed, Tiny Little Office Doc and every other app; a Tiny Little Office link goes in after the chosen item as its document', async () => {
  const { el, last } = await editor('- One\n');
  await choose(el, 0);
  const opener = el.querySelector<HTMLButtonElement>('to-insert button')!;
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open [role^=menuitem]'));
  const labels = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')].map((x) => x.textContent!.trim());
  expect(labels).toEqual(expect.arrayContaining(['Item', 'Web Embed…', 'Tiny Little Office Doc…', 'Drawing Tool', 'Kanban Board']));
  expect(labels).not.toContain('Outliner');
  opener.click();
  await tick();
  await choose(el, 0);
  await pick(el, opener, 'Tiny Little Office Doc');
  await until(() => !!document.querySelector('.to-ask-doc .to-ask-url'));
  const box = document.querySelector<HTMLInputElement>('.to-ask-doc .to-ask-url')!;
  box.value = 'https://tinylittleoffice.com/#/v1/draw/' + encodeDoc('rect 1 1 5 5\n');
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => !document.querySelector<HTMLButtonElement>('.to-ask-doc .to-ask-ok')!.disabled);
  document.querySelector<HTMLButtonElement>('.to-ask-doc .to-ask-ok')!.click();
  await until(() => (last() ?? '').includes('```draw'));
  expect(last()).toBe('- One\n\n```draw {depth=0}\nrect 1 1 5 5\n```\n');
});

test('footnotes are listed under the outline, numbered as their marks are, and typed there: a mark tapped goes to its note, Enter comes back', async () => {
  const { el, last } = await editor('- One^[The first note]\n  - Two^[The **second** note]\n');
  await until(() => !!el.querySelector('.ol-fn'));
  const notes = () => [...el.querySelectorAll<ToText>('.ol-fn to-text')];
  expect(notes().map((n) => n.tx.textContent)).toEqual(['The first note', 'The second note']);
  expect(notes()[1].tx.querySelector('b')!.textContent).toBe('second');
  expect(el.querySelector('.ol-fn')!.getAttribute('aria-label')).toBe('Footnotes');
  expect(textOf(el, 1).tx.querySelector('.fn')!.textContent).toBe('2');
  // The second mark tapped: the caret at the end of its note; the words typed are the note's.
  textOf(el, 1).tx.querySelector<HTMLElement>('.fn')!.click();
  await until(() => notes()[1].hasFocus());
  expect(notes()[1].sel?.focus.offset).toBe('The second note'.length);
  input(notes()[1], 'insertText', '!');
  await until(() => last() === '- One^[The first note]\n  - Two^[The **second** note!]\n');
  // Enter comes back to the row, after the mark.
  input(notes()[1], 'insertParagraph');
  await until(() => textOf(el, 1).hasFocus());
  expect(textOf(el, 1).sel?.focus.offset).toBe(4);
  // The Footnote button puts a mark at the caret and the caret in its new note, in its place among the others.
  textOf(el, 0).sel = { anchor: { block: 0, offset: 3 }, focus: { block: 0, offset: 3 } };
  await tick();
  button(el, 'Footnote').click();
  await until(() => notes().length === 3 && notes()[0].hasFocus());
  input(notes()[0], 'insertText', 'x');
  await until(() => last() === '- One^[x]^[The first note]\n  - Two^[The **second** note!]\n');
});

test('§1 opens with the focus in the first row\'s words, the caret at their end, the page not scrolled', async () => {
  const { el } = await editor(TREE);
  await el.focusFirst();
  await until(() => textOf(el, 0).hasFocus());
  expect(textOf(el, 0).sel?.focus).toEqual({ block: 0, offset: 'Launch'.length });
  const { el: blank } = await editor('');
  await blank.focusFirst();
  await until(() => !!blank.querySelector<ToText>('.ol-row to-text')?.hasFocus());
  expect(document.scrollingElement!.scrollTop).toBe(0);
});
