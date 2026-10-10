// The Board editor in a real browser: stages and cards from the document; typing, Enter and Backspace per line; the
// checklist; the stage menu; cards chosen whole (the kit's rows) and what is done to them; a card carried by its grip
// into another stage, or by the keys; joins and splits; the clipboard; Insert and the marks; undo; and at phone width a
// stage and a bit across, controls a finger tall, the bar one row.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToBoardEditor } from '../editor.ts';
import { caret } from '../../../kit/textops.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const BOARD = `## To do {color=b}

- Write the **spec**
  - [x] Outline
  - [ ] Draft
- Review the copy

## Doing {limit=1 color=g}

- Ship it
- Fix the footer

## Done
`;

async function editor(value = BOARD): Promise<{ el: ToBoardEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-board-editor') as ToBoardEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const cols = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.board-col')];
const cardsOf = (el: HTMLElement, i: number) => [...cols(el)[i].querySelectorAll<HTMLElement>('.board-card')];
const words = (card: HTMLElement) => card.querySelector('.board-main .tx')!.textContent!.trim();
const names = (el: HTMLElement) => cols(el).map((c) => c.querySelector('.board-head .tx')!.textContent!.trim());
const text = (el: HTMLElement, at: number) => el.querySelector<ToText>(`to-text[data-at="${at}"]`)!;
const settle = async (el: ToBoardEditor) => {
  await el.updateComplete;
  await tick(30);
  await el.updateComplete;
};
async function focusAt(el: ToBoardEditor, at: number, offset?: number) {
  const x = text(el, at);
  await x.updateComplete;
  const b = x.blocks[0];
  x.sel = caret(0, offset ?? (b && 'runs' in b ? b.runs.reduce((n, r) => n + r.t.length, 0) : 0));
  await x.updateComplete;
  await tick();
}
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function type(el: ToBoardEditor, at: number, s: string) {
  for (const ch of s) {
    input(text(el, at), 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
}
async function pick(el: ToBoardEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.trim() === label || x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const bar = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!;
const grip = (card: HTMLElement) => card.querySelector<HTMLButtonElement>('.board-grip')!;
const undo = async (el: ToBoardEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
const centre = (e: Element) => {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const pointer = (type: string, x: number, y: number, buttons = 1) => new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons, pointerId: 7, isPrimary: true, bubbles: true });

test('stages and cards from the document: names, counts against limits, colours, checklists with their progress', async () => {
  const { el } = await editor();
  expect(names(el)).toEqual(['To do', 'Doing', 'Done']);
  expect(cols(el).map((c) => c.querySelector('.board-count')!.textContent)).toEqual(['2', '2 / 1', '0']);
  expect(cols(el)[1].classList.contains('full')).toBe(true);
  expect(cols(el)[1].querySelector('.board-count')!.getAttribute('aria-label')).toBe('2 cards, over the limit of 1');
  expect(cols(el)[0].classList.contains('full')).toBe(false);
  expect(cols(el)[0].style.getPropertyValue('--c')).toBe('#0072b2');
  expect(cols(el)[2].textContent).toContain('No cards.');
  expect(cardsOf(el, 0).map(words)).toEqual(['Write the spec', 'Review the copy']);
  expect(cardsOf(el, 0)[0].querySelectorAll('.board-item')).toHaveLength(2);
  expect(cardsOf(el, 0)[0].querySelector('.board-progress')!.textContent).toBe('☑ 1/2');
  expect(cardsOf(el, 0)[0].querySelector<HTMLInputElement>('.board-item input')!.checked).toBe(true);
  expect(cardsOf(el, 0)[0].querySelector('.board-item input')!.getAttribute('aria-label')).toBe('Done: Outline');
  expect(el.querySelector('.board-total')!.textContent).toBe('4 cards');
  // The card's words keep their marks.
  expect(cardsOf(el, 0)[0].querySelector('.board-main b')!.textContent).toBe('spec');
});

test('typing writes the card; Enter makes the next one below the checklist; a bare card at the end is enough', async () => {
  const { el, last } = await editor();
  await focusAt(el, 1);
  await type(el, 1, '!');
  expect(last()).toContain('- Write the **spec**!\n');
  input(text(el, 1), 'insertParagraph');
  await settle(el);
  // The new card is block 4, after the checklist (Draft is 3), in To do, and has the caret.
  expect(last()).toContain('  - [ ] Draft\n-\n- Review the copy\n');
  expect(document.activeElement).toBe(text(el, 4).tx);
  await type(el, 4, 'Plan');
  expect(last()).toContain('  - [ ] Draft\n- Plan\n- Review the copy\n');
  await undo(el);
  expect(last()).toContain('  - [ ] Draft\n-\n- Review');
  const stage = await editor('## A\n\n- one\n-\n');
  await focusAt(stage.el, 2);
  const n = stage.changes.length;
  input(text(stage.el, 2), 'insertParagraph');
  await settle(stage.el);
  expect(stage.changes).toHaveLength(n);
});

test('Backspace at the start: an empty item or card goes (the caret to the line above), a line with words joins the line before', async () => {
  const { el, last, changes } = await editor('## A\n\n- one\n  - [ ] a\n  - [ ]\n-\n- three\n');
  // The empty item (3): removed, the caret to the item above.
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n-\n- three\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  // The empty card (3): removed, the caret to the end of the line above.
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n- three\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  // A card with words joins the line before (here the last item of the card above), the caret at the seam.
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] athree\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  expect(text(el, 2).sel!.focus.offset).toBe(1);
  // The first card with words, after the stage's name: nothing.
  await focusAt(el, 1, 0);
  const n = changes.length;
  input(text(el, 1), 'deleteContentBackward');
  await settle(el);
  expect(changes).toHaveLength(n);
  await undo(el);
  // The undo puts the caret back where it was before the join.
  expect(document.activeElement).toBe(text(el, 3).tx);
  expect(text(el, 3).sel!.focus.offset).toBe(0);
  await undo(el);
  await undo(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n  - [ ]\n-\n- three\n');
});

test('Backspace at the start of an item with words joins it to the item before (the first to the card); Delete at the end joins the next line in', async () => {
  const { el, last } = await editor();
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toContain('- Write the **spec**\n  - [x] OutlineDraft\n- Review');
  expect(document.activeElement).toBe(text(el, 2).tx);
  expect(text(el, 2).sel!.focus.offset).toBe(7);
  await focusAt(el, 2, 0);
  input(text(el, 2), 'deleteContentBackward');
  await settle(el);
  expect(last()).toContain('- Write the **spec**OutlineDraft\n- Review the copy\n');
  // Delete at the end of a card: the next card comes in, the caret stays at the seam.
  const b = await editor('## A\n\n- one\n- two\n  - [ ] x\n\n## B\n\n- three\n');
  await focusAt(b.el, 1);
  input(text(b.el, 1), 'deleteContentForward');
  await settle(b.el);
  expect(b.last()).toBe('## A\n\n- onetwo\n  - [ ] x\n\n## B\n\n- three\n');
  expect(document.activeElement).toBe(text(b.el, 1).tx);
  expect(text(b.el, 1).sel!.focus.offset).toBe(3);
  // At the end of a card's checklist, the end of the stage: nothing (never the next stage's name).
  await focusAt(b.el, 2);
  const n = b.changes.length;
  input(text(b.el, 2), 'deleteContentForward');
  await settle(b.el);
  expect(b.changes).toHaveLength(n);
});

test('Enter at the start of a card pushes it down, in the middle splits it (the checklist stays with the first half); in an item the same', async () => {
  const { el, last } = await editor();
  await focusAt(el, 4, 0);
  input(text(el, 4), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('  - [ ] Draft\n-\n- Review the copy\n');
  expect(document.activeElement).toBe(text(el, 5).tx);
  expect(text(el, 5).sel!.focus.offset).toBe(0);
  await focusAt(el, 1, 6);
  input(text(el, 1), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('- Write\n  - [x] Outline\n  - [ ] Draft\n- the **spec**\n-\n- Review');
  expect(document.activeElement).toBe(text(el, 4).tx);
  await focusAt(el, 3, 2);
  input(text(el, 3), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('  - [x] Outline\n  - [ ] Dr\n  - [ ] aft\n');
  expect(document.activeElement).toBe(text(el, 4).tx);
  await focusAt(el, 2, 0);
  input(text(el, 2), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('- Write\n  - [ ]\n  - [x] Outline\n');
  expect(document.activeElement).toBe(text(el, 3).tx);
});

test('the checklist: Enter in an item starts the next, a tap ticks, the progress follows', async () => {
  const { el, last } = await editor();
  await focusAt(el, 2);
  input(text(el, 2), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('  - [x] Outline\n  - [ ]\n  - [ ] Draft\n');
  expect(document.activeElement).toBe(text(el, 3).tx);
  const items = cardsOf(el, 0)[0].querySelectorAll<HTMLInputElement>('.board-item input');
  items[2].click();
  await settle(el);
  expect(last()).toContain('  - [x] Draft\n');
  expect(cardsOf(el, 0)[0].querySelector('.board-progress')!.textContent).toBe('☑ 2/3');
});

test('the stage menu: add a card, limit, colour, move, delete; the name is typed in place and Enter goes to the first card', async () => {
  const { el, last } = await editor();
  const more = (i: number) => cols(el)[i].querySelector<HTMLButtonElement>('.board-more')!;
  expect(more(1).getAttribute('aria-label')).toBe('Stage options: Doing');
  await focusAt(el, 5);
  await type(el, 5, ' now');
  expect(last()).toContain('## Doing now {limit=1 color=g}');
  input(text(el, 5), 'insertParagraph');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 6).tx);
  await pick(el, more(1), '3');
  expect(last()).toContain('## Doing now {limit=3 color=g}');
  await pick(el, more(1), 'Orange');
  expect(last()).toContain('## Doing now {limit=3 color=o}');
  await pick(el, more(1), 'No limit');
  await pick(el, more(1), 'Automatic');
  expect(last()).toContain('## Doing now\n');
  await pick(el, more(2), 'Add a card');
  expect(last()!.endsWith('## Done\n\n-\n')).toBe(true);
  await pick(el, more(0), 'Move right');
  expect(names(el)).toEqual(['Doing now', 'To do', 'Done']);
  expect(last()!.startsWith('## Doing now\n\n- Ship it\n- Fix the footer\n\n## To do {color=b}\n\n- Write the **spec**')).toBe(true);
  await pick(el, more(1), 'Delete stage');
  expect(last()).toBe('## Doing now\n\n- Ship it\n- Fix the footer\n\n## Done\n\n-\n');
  await undo(el);
  expect(last()).toContain('## To do {color=b}');
});

const key = (on: Element, k: string, o: KeyboardEventInit = {}) => on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o }));
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.board')!;
const chosen = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.board-card.ranged')].map(words);
const contextLabels = () => [...document.querySelectorAll<HTMLElement>('to-context.to-rows-context button')].map((b) => b.getAttribute('aria-label'));
const contextButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('to-context.to-rows-context button')].find((b) => b.getAttribute('aria-label') === label)!;
async function tapGrip(el: ToBoardEditor, card: HTMLElement, o: MouseEventInit = {}) {
  grip(card).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...o }));
  await settle(el);
}

test('a tap on the grip chooses the card: the bar under it in the standard order; Delete, Mod+D, Alt+arrows, Mod+Alt+arrows act on it; Escape and Enter let go', async () => {
  const { el, last } = await editor();
  await tapGrip(el, cardsOf(el, 0)[1]);
  expect(chosen(el)).toEqual(['Review the copy']);
  expect(document.activeElement).toBe(box(el));
  expect(cardsOf(el, 0)[1].querySelector('.board-grip')!.getAttribute('aria-pressed')).toBe('true');
  expect(contextLabels()).toEqual(['Edit', 'Move up', 'Move down', 'Move to the stage before', 'Move to Doing', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  // Typing with a card chosen does nothing to it.
  const n = last();
  key(box(el), 'x');
  await settle(el);
  expect(last()).toBe(n);
  // Alt+Up moves it past the card above, still chosen.
  key(box(el), 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toContain('## To do {color=b}\n\n- Review the copy\n- Write the **spec**\n');
  expect(chosen(el)).toEqual(['Review the copy']);
  // Mod+D: a copy after it, the copy chosen.
  key(box(el), 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toContain('- Review the copy\n- Review the copy\n- Write the **spec**\n');
  expect(el.querySelector<HTMLElement>('.board-card.ranged')!.dataset.at).toBe('2');
  // Mod+Alt+Right: to the end of Doing, still chosen; Alt+Right alone is never taken.
  key(box(el), 'ArrowRight', { altKey: true });
  await settle(el);
  expect(last()).toContain('- Review the copy\n- Review the copy\n- Write');
  key(box(el), 'ArrowRight', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(last()).toContain('## Doing {limit=1 color=g}\n\n- Ship it\n- Fix the footer\n- Review the copy\n');
  expect(chosen(el)).toEqual(['Review the copy']);
  expect(cols(el)[1].querySelector('.board-card.ranged')).not.toBeNull();
  // Delete: gone; the caret to the card above.
  key(box(el), 'Delete');
  await settle(el);
  expect(last()).toContain('- Ship it\n- Fix the footer\n\n## Done');
  expect(chosen(el)).toEqual([]);
  expect(document.activeElement).toBe(text(el, 7).tx);
  // The undo brings it back chosen.
  await undo(el);
  expect(chosen(el)).toEqual(['Review the copy']);
  expect(document.activeElement).toBe(box(el));
  // Escape lets go, the caret into its words; a second tap and Enter edits it.
  key(box(el), 'Escape');
  await settle(el);
  expect(chosen(el)).toEqual([]);
  expect(document.activeElement).toBe(text(el, 8).tx);
  await tapGrip(el, cardsOf(el, 0)[0]);
  key(box(el), 'Enter');
  await settle(el);
  expect(chosen(el)).toEqual([]);
  expect(document.activeElement).toBe(text(el, 1).tx);
});

test('the bar under a chosen card: Move down, Move to a stage, Duplicate, Delete; Insert puts a checklist item in the chosen card', async () => {
  const { el, last } = await editor();
  await tapGrip(el, cardsOf(el, 0)[0]);
  contextButton('Move down').click();
  await settle(el);
  expect(last()).toContain('## To do {color=b}\n\n- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing');
  expect(chosen(el)).toEqual(['Write the spec']);
  expect(contextButton('Move down').disabled).toBe(true);
  contextButton('Move to Doing').click();
  await settle(el);
  expect(last()).toContain('- Fix the footer\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Done');
  contextButton('Move to Done').click();
  await settle(el);
  expect(cardsOf(el, 2).map(words)).toEqual(['Write the spec']);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Checklist item');
  expect(last()!.endsWith('## Done\n\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n  - [ ]\n')).toBe(true);
  expect(document.activeElement).toBe(text(el, 9).tx);
  await tapGrip(el, cardsOf(el, 2)[0]);
  contextButton('Duplicate').click();
  await settle(el);
  expect(cardsOf(el, 2).map(words)).toEqual(['Write the spec', 'Write the spec']);
  contextButton('Delete').click();
  await settle(el);
  expect(cardsOf(el, 2).map(words)).toEqual(['Write the spec']);
});

test('Shift+tap and Shift+arrows extend the chosen cards; Escape and Shift+Down in words choose the card; Mod+A twice takes every card', async () => {
  const { el } = await editor();
  await focusAt(el, 1);
  key(text(el, 1).tx, 'Escape');
  await settle(el);
  expect(chosen(el)).toEqual(['Write the spec']);
  key(box(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(chosen(el)).toEqual(['Write the spec', 'Review the copy']);
  key(box(el), 'Escape');
  await settle(el);
  await focusAt(el, 6);
  key(text(el, 6).tx, 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(chosen(el)).toEqual(['Ship it']);
  await tapGrip(el, cardsOf(el, 1)[1], { shiftKey: true });
  expect(chosen(el)).toEqual(['Ship it', 'Fix the footer']);
  // Mod+A in a card's words: the words first (the browser's own), then with the words whole, every card.
  await focusAt(el, 4);
  const x = text(el, 4);
  x.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 15 } };
  await x.updateComplete;
  key(x.tx, 'a', { ctrlKey: true });
  await settle(el);
  expect(chosen(el)).toEqual(['Write the spec', 'Review the copy', 'Ship it', 'Fix the footer']);
});

test('copy, cut and paste of chosen cards: TLO with their checklists and our HTML; a paste of several lines into a card makes cards', async () => {
  const { el, last } = await editor();
  await tapGrip(el, cardsOf(el, 0)[0]);
  const clip = (type: string, on: Element, dt = new DataTransfer()) => {
    on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
    return dt;
  };
  const dt = clip('copy', box(el));
  expect(dt.getData('text/plain')).toBe('- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n');
  expect(dt.getData('text/html')).toContain('content="TinyLittleOffice"');
  // Cut the card in Doing, then paste after the chosen card: it comes back with its checklist.
  await tapGrip(el, cardsOf(el, 1)[0]);
  const cut = clip('cut', box(el));
  await settle(el);
  expect(cut.getData('text/plain')).toBe('- Ship it\n');
  expect(cardsOf(el, 1).map(words)).toEqual(['Fix the footer']);
  await tapGrip(el, cardsOf(el, 0)[1]);
  clip('paste', box(el), dt);
  await settle(el);
  expect(last()).toContain('- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Doing');
  // Several lines pasted into a card's words: a card a line, after it; into an empty card, in its place.
  const lines = new DataTransfer();
  lines.setData('text/plain', 'Book the room\nOrder lunch');
  await focusAt(el, 9);
  clip('paste', text(el, 9).tx, lines);
  await settle(el);
  expect(last()).toContain('- Fix the footer\n- Book the room\n- Order lunch\n\n## Done');
  expect(document.activeElement).toBe(text(el, 11).tx);
  // Into a checklist item: items.
  await focusAt(el, 2);
  clip('paste', text(el, 2).tx, lines);
  await settle(el);
  expect(last()).toContain('  - [x] Outline\n  - [ ] Book the room\n  - [ ] Order lunch\n  - [ ] Draft\n');
  // Words alone are the words'.
  const one = new DataTransfer();
  one.setData('text/plain', 'soon');
  const n = el.querySelectorAll('.board-card').length;
  await focusAt(el, 1);
  clip('paste', text(el, 1).tx, one);
  await settle(el);
  expect(el.querySelectorAll('.board-card')).toHaveLength(n);
  expect(last()).toContain('- Write the **spec**soon\n');
});

test('a card carried by its grip into another stage lands before the card the pointer is above; a tap is not a drag', async () => {
  await page.viewport(1100, 800);
  const { el, last } = await editor();
  const g = grip(cardsOf(el, 0)[0]);
  const target = cardsOf(el, 1)[1];
  const r = target.getBoundingClientRect();
  const from = centre(g);
  g.dispatchEvent(pointer('pointerdown', from.x, from.y));
  g.dispatchEvent(pointer('pointermove', from.x + 3, from.y + 3));
  expect(el.querySelector('.board-card.dragging')).toBeNull();
  g.dispatchEvent(pointer('pointermove', r.left + 20, r.top + 4));
  await el.updateComplete;
  expect(el.querySelector('.board-card.dragging')).not.toBeNull();
  expect(cols(el)[1].classList.contains('over')).toBe(true);
  expect(cardsOf(el, 1)[1].classList.contains('before')).toBe(true);
  g.dispatchEvent(pointer('pointerup', r.left + 20, r.top + 4, 0));
  await settle(el);
  expect(last()).toBe('## To do {color=b}\n\n- Review the copy\n\n## Doing {limit=1 color=g}\n\n- Ship it\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n- Fix the footer\n\n## Done\n');
  expect(el.querySelector('.board-card.dragging, .board-card.before')).toBeNull();
  expect(document.querySelector('[popover]:popover-open')).toBeNull();
  // Onto the empty stage: the end of it, marked while the pointer is there.
  const g2 = grip(cardsOf(el, 0)[0]);
  const done = cols(el)[2].getBoundingClientRect();
  const f2 = centre(g2);
  g2.dispatchEvent(pointer('pointerdown', f2.x, f2.y));
  g2.dispatchEvent(pointer('pointermove', done.left + 30, done.top + 30));
  await el.updateComplete;
  expect(el.querySelector('.board-cards.end')).not.toBeNull();
  g2.dispatchEvent(pointer('pointerup', done.left + 30, done.top + 30, 0));
  await settle(el);
  expect(last()!.endsWith('## Done\n\n- Review the copy\n')).toBe(true);
  // Let go outside every stage: nothing moves.
  const g3 = grip(cardsOf(el, 1)[0]);
  const f3 = centre(g3);
  const n = el.querySelectorAll('.board-card').length;
  g3.dispatchEvent(pointer('pointerdown', f3.x, f3.y));
  g3.dispatchEvent(pointer('pointermove', 2, 2));
  g3.dispatchEvent(pointer('pointerup', 2, 2, 0));
  await settle(el);
  expect(last()!.endsWith('## Done\n\n- Review the copy\n')).toBe(true);
  expect(el.querySelectorAll('.board-card')).toHaveLength(n);
  // A tap chooses the card and moves nothing.
  const before = last();
  g3.dispatchEvent(pointer('pointerdown', f3.x, f3.y));
  g3.dispatchEvent(pointer('pointerup', f3.x, f3.y, 0));
  g3.click();
  await settle(el);
  expect(last()).toBe(before);
  expect(el.querySelectorAll('.board-card.ranged')).toHaveLength(1);
  // Escape during a drag lets it go: nothing moves.
  const g4 = grip(cardsOf(el, 1)[0]);
  const f4 = centre(g4);
  g4.dispatchEvent(pointer('pointerdown', f4.x, f4.y));
  g4.dispatchEvent(pointer('pointermove', done.left + 30, done.top + 30));
  await el.updateComplete;
  expect(el.querySelector('.board-card.dragging')).not.toBeNull();
  g4.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await el.updateComplete;
  expect(el.querySelector('.board-card.dragging')).toBeNull();
  g4.dispatchEvent(pointer('pointerup', done.left + 30, done.top + 30, 0));
  await settle(el);
  expect(last()).toBe(before);
});

test('the keys: Mod+Alt+Right carries the card to the end of the next stage, Alt+Up and Down along its own; the caret goes with it', async () => {
  const { el, last } = await editor();
  await focusAt(el, 4, 3);
  // Alt+Right alone is the Mac's word jump: never taken.
  const n = last();
  text(el, 4).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toBe(n);
  text(el, 4).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, ctrlKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toContain('## Doing {limit=1 color=g}\n\n- Ship it\n- Fix the footer\n- Review the copy\n');
  expect(document.activeElement).toBe(text(el, 7).tx);
  expect(text(el, 7).sel!.focus.offset).toBe(3);
  text(el, 7).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toContain('- Ship it\n- Review the copy\n- Fix the footer\n');
  expect(document.activeElement).toBe(text(el, 6).tx);
  text(el, 6).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toContain('- Ship it\n- Fix the footer\n- Review the copy\n');
  // At the edge nothing happens.
  const m = last();
  text(el, 7).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toBe(m);
  // The undo puts the caret back in the card where it was.
  await undo(el);
  expect(document.activeElement).toBe(text(el, 6).tx);
});

test('more keys in the words: Up/Down go line to line in a stage; Alt+Up/Down move a checklist item; Mod+Enter ticks it; Mod+D duplicates the card; Mod+Alt+arrows in a name move the stage', async () => {
  const { el, last } = await editor();
  await focusAt(el, 0);
  key(text(el, 0).tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 1).tx);
  key(text(el, 1).tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 2).tx);
  key(text(el, 2).tx, 'ArrowUp');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 1).tx);
  // The last line of a stage goes nowhere.
  await focusAt(el, 4);
  key(text(el, 4).tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 4).tx);
  // Option+Shift+arrows select words on a Mac: never taken.
  await focusAt(el, 3, 2);
  const wordKey = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, shiftKey: true, bubbles: true, cancelable: true });
  text(el, 3).tx.dispatchEvent(wordKey);
  expect(wordKey.defaultPrevented).toBe(false);
  // A checklist item moves, the caret with it.
  await focusAt(el, 3, 2);
  key(text(el, 3).tx, 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toContain('- Write the **spec**\n  - [ ] Draft\n  - [x] Outline\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  expect(text(el, 2).sel!.focus.offset).toBe(2);
  key(text(el, 2).tx, 'Enter', { ctrlKey: true });
  await settle(el);
  expect(last()).toContain('  - [x] Draft\n  - [x] Outline\n');
  // Mod+D in a card: the card and its checklist again, the caret in the copy.
  await focusAt(el, 1, 2);
  key(text(el, 1).tx, 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toContain('  - [x] Outline\n- Write the **spec**\n  - [x] Draft\n  - [x] Outline\n- Review');
  expect(document.activeElement).toBe(text(el, 4).tx);
  // A stage's name: Mod+Alt+Right moves the stage, the caret in its name.
  await focusAt(el, 8);
  key(text(el, 8).tx, 'ArrowRight', { ctrlKey: true, altKey: true });
  await settle(el);
  expect(names(el)).toEqual(['To do', 'Done', 'Doing']);
  expect(document.activeElement).toBe(text(el, 9).tx);
  // Keys from the bar's buttons are never the words'.
  const n = last();
  key(bar(el, 'Bold'), 'd', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe(n);
});

test('undo brings back the caret where the change was; the bar ends with Undo and Redo; the board never zooms on a double tap', async () => {
  const { el } = await editor();
  await focusAt(el, 6, 2);
  await type(el, 6, 'ip');
  await focusAt(el, 1, 0);
  await undo(el);
  expect(document.activeElement).toBe(text(el, 6).tx);
  expect(words(cardsOf(el, 1)[0])).toBe('Ship it');
  const tools = [...el.querySelectorAll('to-bar button')].map((b) => b.getAttribute('aria-label'));
  expect(tools.slice(-2)).toEqual(['Undo', 'Redo']);
  expect(getComputedStyle(box(el)).touchAction).toBe('manipulation');
});

test('Insert: a card in the stage the caret is in, a checklist item in its card, a stage named and selected; the marks work the words', async () => {
  const { el, last } = await editor();
  const insert = el.querySelector<HTMLButtonElement>('to-insert button')!;
  await focusAt(el, 6);
  await pick(el, insert, 'Card');
  expect(last()).toContain('- Ship it\n-\n- Fix the footer\n');
  expect(document.activeElement).toBe(text(el, 7).tx);
  await focusAt(el, 1);
  await pick(el, insert, 'Checklist item');
  expect(last()).toContain('  - [ ] Draft\n  - [ ]\n- Review the copy');
  expect(document.activeElement).toBe(text(el, 4).tx);
  await pick(el, insert, 'Stage');
  expect(last()!.endsWith('## New stage\n')).toBe(true);
  const sel = el.querySelectorAll<ToText>('.board-head to-text')[3].sel!;
  expect([sel.anchor.offset, sel.focus.offset]).toEqual([0, 9]);
  // Bold on the words of a card: select them, then the bar.
  expect(bar(el, 'Bold').disabled).toBe(false);
  const c = text(el, 5);
  expect(words(c.closest('.board-card') as HTMLElement)).toBe('Review the copy');
  c.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 6 } };
  await c.updateComplete;
  await tick(50);
  await el.updateComplete;
  bar(el, 'Bold').click();
  await settle(el);
  expect(last()).toContain('- **Review** the copy\n');
  expect(bar(el, 'Bold').getAttribute('aria-pressed')).toBe('true');
});

test('at phone width: a stage and a bit across, controls a finger tall, the bar one row, and the page itself never scrolls sideways', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    const board = el.querySelector<HTMLElement>('.board')!;
    expect(board.scrollWidth).toBeGreaterThan(board.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const first = cols(el)[0].getBoundingClientRect();
    expect(first.width).toBeLessThanOrEqual(390 - 56 + 1);
    // The next stage shows at the edge, so it is plain there is more.
    expect(cols(el)[1].getBoundingClientRect().left).toBeLessThan(390);
    for (const b of el.querySelectorAll<HTMLElement>('.board-more, .board-grip, .board-tick')) {
      const r = b.getBoundingClientRect();
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
    }
    const barEl = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...barEl.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    // A card's words are one line tall, the row a finger: nothing of the editor's own adds lines.
    expect(text(el, 1).tx.getBoundingClientRect().height).toBeLessThanOrEqual(30);
    expect(el.querySelector<HTMLElement>('.board-main')!.getBoundingClientRect().height).toBe(44);
    // The page starts at its top (a test before may have left it scrolled); focusing and typing keep it there.
    window.scrollTo(0, 0);
    await focusAt(el, 1);
    await type(el, 1, ' now');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(parseFloat(getComputedStyle(text(el, 1).tx).fontSize)).toBeGreaterThanOrEqual(16);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    // The menu opens inside the screen.
    await pick(el, cols(el)[0].querySelector<HTMLButtonElement>('.board-more')!, 'Move right');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

test('every stage has its colour: the one chosen, else the palette by its place; the heading tinted, each card a thin top edge of it', async () => {
  const { el, last } = await editor();
  // To do is blue and Doing green, as written; Done, third, takes the palette's third (green's place is taken by its own: it is the same green).
  expect(cols(el).map((c) => c.dataset.hue)).toEqual(['b', 'g', 'g']);
  expect(cols(el).map((c) => c.style.getPropertyValue('--c'))).toEqual(['#0072b2', '#009e73', '#009e73']);
  const edge = (card: HTMLElement) => getComputedStyle(card).borderTopColor;
  const card = cardsOf(el, 0)[0];
  expect(parseFloat(getComputedStyle(card).borderTopWidth)).toBe(3);
  const blue = edge(card);
  expect(blue).not.toBe(edge(cardsOf(el, 1)[0]));
  expect(blue).not.toBe(getComputedStyle(card).borderLeftColor);
  // The heading is tinted with it, not the plain grey of the stage.
  const head = cols(el)[0].querySelector<HTMLElement>('.board-head')!;
  expect(getComputedStyle(head).backgroundColor).not.toBe(getComputedStyle(cols(el)[0]).backgroundColor);
  // Chosen in the menu, it overrides; Automatic gives the place's colour back and writes nothing.
  const more = (i: number) => cols(el)[i].querySelector<HTMLButtonElement>('.board-more')!;
  await pick(el, more(2), 'Purple');
  expect(last()!.endsWith('## Done {color=p}\n')).toBe(true);
  expect(cols(el)[2].dataset.hue).toBe('p');
  await pick(el, more(0), 'Automatic');
  expect(last()!.startsWith('## To do\n')).toBe(true);
  // The first place's colour is blue too: the colour stays, the document says nothing of it.
  expect(cols(el)[0].dataset.hue).toBe('b');
  // A board of plain headings: each its own colour.
  const plain = await editor('## A\n\n- a\n\n## B\n\n- b\n\n## C\n\n- c\n\n## D\n');
  expect(cols(plain.el).map((c) => c.dataset.hue)).toEqual(['b', 'o', 'g', 'p']);
  expect(new Set(cardsOf(plain.el, 0).concat(cardsOf(plain.el, 1), cardsOf(plain.el, 2)).map(edge)).size).toBe(3);
});

test('stages as rows: the bar’s toggle writes `look: rows`; bands one under another, cards across; drag, keys and the bar under a card carry it up and down', async () => {
  await page.viewport(1100, 800);
  const { el, last } = await editor();
  const toggle = bar(el, 'Stages as rows');
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  toggle.click();
  await settle(el);
  expect(last()!.startsWith('---\nlook: rows\n---\n## To do {color=b}')).toBe(true);
  expect(bar(el, 'Stages as rows').getAttribute('aria-pressed')).toBe('true');
  expect(box(el).classList.contains('rows')).toBe(true);
  // The stages one under another, each the board's width; the cards of a stage side by side.
  const [a, b, c] = cols(el).map((x) => x.getBoundingClientRect());
  expect(b.top).toBeGreaterThanOrEqual(a.bottom);
  expect(c.top).toBeGreaterThanOrEqual(b.bottom);
  expect(Math.round(a.width)).toBe(Math.round(b.width));
  const [c0, c1] = cardsOf(el, 0).map((x) => x.getBoundingClientRect());
  expect(Math.round(c1.top)).toBe(Math.round(c0.top));
  expect(c1.left).toBeGreaterThan(c0.right - 1);
  // The stage menu moves a stage up and down.
  await pick(el, cols(el)[1].querySelector<HTMLButtonElement>('.board-more')!, 'Move up');
  expect(names(el)).toEqual(['Doing', 'To do', 'Done']);
  await undo(el);
  expect(names(el)).toEqual(['To do', 'Doing', 'Done']);
  // A card dragged by its grip onto the left half of another lands before it; onto its right half, after it.
  const g = grip(cardsOf(el, 0)[1]);
  const target = cardsOf(el, 1)[1].getBoundingClientRect();
  const from = centre(g);
  g.dispatchEvent(pointer('pointerdown', from.x, from.y));
  g.dispatchEvent(pointer('pointermove', target.left + 10, target.top + 10));
  await el.updateComplete;
  expect(cardsOf(el, 1)[1].classList.contains('before')).toBe(true);
  g.dispatchEvent(pointer('pointerup', target.left + 10, target.top + 10, 0));
  // The click a drag ends with is not a tap.
  g.click();
  await settle(el);
  expect(last()).toContain('## Doing {limit=1 color=g}\n\n- Ship it\n- Review the copy\n- Fix the footer\n');
  const g2 = grip(cardsOf(el, 1)[1]);
  const t2 = cardsOf(el, 1)[2].getBoundingClientRect();
  const f2 = centre(g2);
  g2.dispatchEvent(pointer('pointerdown', f2.x, f2.y));
  g2.dispatchEvent(pointer('pointermove', t2.right - 10, t2.top + 10));
  await el.updateComplete;
  g2.dispatchEvent(pointer('pointerup', t2.right - 10, t2.top + 10, 0));
  g2.click();
  await settle(el);
  expect(last()).toContain('- Ship it\n- Fix the footer\n- Review the copy\n');
  // Mod+Alt+Right carries a card to the stage below, keys unchanged.
  await focusAt(el, 1, 2);
  text(el, 1).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, ctrlKey: true, bubbles: true, cancelable: true }));
  await settle(el);
  expect(last()).toContain('- Review the copy\n- Write the **spec**\n  - [x] Outline\n  - [ ] Draft\n\n## Done');
  expect(cardsOf(el, 1).map(words)).toContain('Write the spec');
  // The bar under a chosen card names the stage above and below, with arrows up and down.
  await tapGrip(el, cardsOf(el, 1)[0]);
  expect(contextLabels()).toContain('Move to To do');
  expect(contextLabels()).toContain('Move to Done');
  contextButton('Move to Done').click();
  await settle(el);
  expect(cardsOf(el, 2).map(words)).toEqual(['Ship it']);
  // Back to columns: the head field goes.
  bar(el, 'Stages as rows').click();
  await settle(el);
  expect(last()!.startsWith('## To do {color=b}')).toBe(true);
  expect(box(el).classList.contains('rows')).toBe(false);
});

test('stages as rows at phone width: the stages one under another, the cards top to bottom, nothing sideways', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor('---\nlook: rows\n---\n' + BOARD);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    const board = box(el);
    expect(board.scrollWidth).toBeLessThanOrEqual(board.clientWidth + 1);
    const [c0, c1] = cardsOf(el, 0).map((x) => x.getBoundingClientRect());
    expect(c1.top).toBeGreaterThanOrEqual(c0.bottom);
    expect(cols(el)[1].getBoundingClientRect().top).toBeGreaterThanOrEqual(cols(el)[0].getBoundingClientRect().bottom);
    for (const g of el.querySelectorAll<HTMLElement>('.board-grip, .board-more')) expect(g.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  } finally {
    await page.viewport(1100, 800);
  }
});
