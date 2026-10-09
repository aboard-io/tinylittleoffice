// The Board editor in a real browser: stages and cards from the document; typing, Enter and Backspace per line; the
// checklist; the stage and card menus; a card carried by its grip into another stage, or by Alt+arrows; Insert and the
// marks; undo; and at phone width a stage and a bit across, controls a finger tall, the bar one row.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToBoardEditor } from '../editor.ts';
import { caret } from '../../../kit/textops.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

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

test('Backspace at the start: an empty card goes (the caret to the card above), an empty item goes, a line with words stays', async () => {
  const { el, last, changes } = await editor('## A\n\n- one\n  - [ ] a\n  - [ ]\n-\n- three\n');
  // The empty item (3): removed, the caret to the item above.
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n-\n- three\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  // The empty card (3): removed, the caret to the end of the card above.
  await focusAt(el, 3, 0);
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n- three\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  // A card with words stays, and is not brought out of the list.
  await focusAt(el, 3, 0);
  const n = changes.length;
  input(text(el, 3), 'deleteContentBackward');
  await settle(el);
  expect(changes).toHaveLength(n);
  expect(cardsOf(el, 0).map(words)).toEqual(['one', 'three']);
  await undo(el);
  await undo(el);
  expect(last()).toBe('## A\n\n- one\n  - [ ] a\n  - [ ]\n-\n- three\n');
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
  await pick(el, more(1), 'No colour');
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

test('the card menu: move to another stage, a checklist, delete', async () => {
  const { el, last } = await editor();
  await pick(el, grip(cardsOf(el, 1)[0]), 'Done');
  expect(cardsOf(el, 1).map(words)).toEqual(['Fix the footer']);
  expect(cardsOf(el, 2).map(words)).toEqual(['Ship it']);
  expect(last()).toContain('## Done\n\n- Ship it\n');
  await pick(el, grip(cardsOf(el, 0)[1]), 'A checklist');
  expect(last()).toContain('- Review the copy\n  - [ ]\n');
  expect(document.activeElement).toBe(text(el, 5).tx);
  await pick(el, grip(cardsOf(el, 0)[1]), 'Another checklist item');
  expect(last()).toContain('- Review the copy\n  - [ ]\n  - [ ]\n');
  await pick(el, grip(cardsOf(el, 0)[1]), 'Delete card');
  expect(last()).not.toContain('Review the copy');
  expect(cardsOf(el, 0).map(words)).toEqual(['Write the spec']);
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
  // A tap opens the menu and moves nothing.
  const before = last();
  g3.dispatchEvent(pointer('pointerdown', f3.x, f3.y));
  g3.dispatchEvent(pointer('pointerup', f3.x, f3.y, 0));
  g3.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  expect(last()).toBe(before);
  (document.querySelector('[popover]:popover-open') as HTMLElement).hidePopover();
});

test('the keys: Alt+Right carries the card to the end of the next stage, Alt+Up and Down along its own; the caret goes with it', async () => {
  const { el, last } = await editor();
  await focusAt(el, 4);
  text(el, 4).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toContain('## Doing {limit=1 color=g}\n\n- Ship it\n- Fix the footer\n- Review the copy\n');
  expect(document.activeElement).toBe(text(el, 7).tx);
  text(el, 7).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toContain('- Ship it\n- Review the copy\n- Fix the footer\n');
  expect(document.activeElement).toBe(text(el, 6).tx);
  text(el, 6).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toContain('- Ship it\n- Fix the footer\n- Review the copy\n');
  // At the edge nothing happens.
  const n = last();
  text(el, 7).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
  text(el, 7).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toContain('## Done\n\n- Review the copy\n');
  expect(n).not.toBe(last());
});

test('Insert: a card in the stage the caret is in, a checklist item in its card, a stage named and selected; the marks work the words', async () => {
  const { el, last } = await editor();
  const insert = el.querySelector<HTMLButtonElement>('to-insert button')!;
  await focusAt(el, 7);
  await pick(el, insert, 'Card');
  expect(last()).toContain('- Fix the footer\n-\n');
  expect(document.activeElement).toBe(text(el, 8).tx);
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
    await focusAt(el, 1);
    console.log('S1', document.scrollingElement!.scrollTop, innerHeight, visualViewport?.height, document.documentElement.scrollHeight);
    await type(el, 1, ' now');
    console.log('S2', document.scrollingElement!.scrollTop, text(el, 1).tx.getBoundingClientRect().top);
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
