// The Board editor in a real browser: the lanes and cards from the document; a title typed into its cell (a burst one
// undo, the caret back with it); Enter, Backspace and Delete in a title; the keys (Up/Down, Alt+Up/Down,
// Mod+Alt+Left/Right, Mod+D); a lane's name kept on Enter and put back by Escape; Insert ▾ and a lane's menu; cards chosen
// whole with the bar under them (to the lane before and after), the clipboard; a drag by the grip into another lane;
// and at phone width the lanes one under another, a finger tall, the page never wider.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToBoardEditor } from '../editor.ts';
import { parse } from '../../../doc/index.ts';
import { caret } from '../../../kit/text/textops.ts';
import type { ToText } from '../../../kit/text/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';

const HEAD = '---\nlanes: To do, Doing, Done\n---\nTask | Status:option | Owner\n--- | --- | ---\n';
const A = 'Write the brief | Doing | Ana\n';
const B = 'Book the room | To do | Ben\n';
const C = 'Send invites | Doing |\n';
const BOARD = HEAD + A + B + C;

async function editor(value = BOARD): Promise<{ el: ToBoardEditor; last: () => string | undefined }> {
  document.body.innerHTML = '';
  window.scrollTo(0, 0);
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-board-editor') as ToBoardEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, last: () => changes.at(-1) };
}
const settle = async (el: ToBoardEditor) => {
  await el.updateComplete;
  await tick(30);
  await el.updateComplete;
};
const lanes = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.board-lane')];
const said = (x: ToText) => x.tx.textContent!.trim();
const laneName = (el: HTMLElement, i: number) => lanes(el)[i].querySelector<ToText>('.board-lane-name')!;
const cards = (el: HTMLElement, i: number) => [...lanes(el)[i].querySelectorAll<HTMLElement>('.board-card')];
const title = (el: HTMLElement, i: number, j: number) => cards(el, i)[j].querySelector<ToText>('.board-title')!;
/** Each lane's name and its cards' titles, as drawn. */
const drawn = (el: HTMLElement) => lanes(el).map((_, i) => [said(laneName(el, i)), cards(el, i).map((_, j) => said(title(el, i, j)))]);
const key = (on: HTMLElement, k: string, o: KeyboardEventInit = {}) => on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o }));
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function caretIn(el: ToBoardEditor, x: ToText, at = 99) {
  x.focus();
  await x.updateComplete;
  x.sel = caret(0, Math.min(at, said(x).length));
  await x.updateComplete;
  await settle(el);
}
async function type(el: ToBoardEditor, x: () => ToText, s: string) {
  for (const ch of s) {
    input(x(), 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
  await settle(el);
}
const undo = async (el: ToBoardEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};
async function pick(el: ToBoardEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.trim() === label);
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const grip = (el: HTMLElement, i: number, j: number) => cards(el, i)[j].querySelector<HTMLElement>('.board-grip')!;
async function tapGrip(el: ToBoardEditor, i: number, j: number, o: MouseEventInit = {}) {
  grip(el, i, j).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...o }));
  await settle(el);
}
const ranged = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.board-card.ranged')].map((c) => c.querySelector<ToText>('.board-title')!.tx.textContent!.trim());
const contextButton = (el: HTMLElement, label: string) => [...el.querySelectorAll<HTMLButtonElement>('.board-context button')].find((b) => b.getAttribute('aria-label') === label)!;
async function clip(el: ToBoardEditor, type: 'copy' | 'cut' | 'paste', on: HTMLElement, data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await settle(el);
  return dt;
}

test('the lanes and cards from the document: names, counts, titles, fields; the focus starts in the first card', async () => {
  const { el } = await editor();
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room']],
    ['Doing', ['Write the brief', 'Send invites']],
    ['Done', []],
  ]);
  expect(lanes(el).map((l) => l.querySelector('.board-count')!.textContent)).toEqual(['1', '2', '0']);
  expect([...cards(el, 0)[0].querySelectorAll('.board-fields dt, .board-fields dd')].map((x) => x.textContent)).toEqual(['Owner', 'Ben']);
  expect(lanes(el)[2].querySelector('.board-none')!.textContent).toBe('No cards');
  expect(el.querySelector('.board-total')!.textContent).toBe('3 cards');
  expect(title(el, 1, 1).tx.getAttribute('aria-label')).toBe('Title of card 2 in Doing');
  await el.focusFirst();
  await settle(el);
  expect(document.activeElement).toBe(title(el, 0, 0).tx);
});

test('typing a title writes its cell, a burst one undo, the caret back where the typing began', async () => {
  const { el, last } = await editor();
  await caretIn(el, title(el, 1, 0), 5);
  await type(el, () => title(el, 1, 0), 'XY');
  expect(last()).toBe(HEAD + 'WriteXY the brief | Doing | Ana\n' + B + C);
  await caretIn(el, title(el, 0, 0), 0);
  await undo(el);
  expect(last()).toBe(BOARD);
  expect(document.activeElement).toBe(title(el, 1, 0).tx);
  expect(title(el, 1, 0).sel?.focus.offset).toBe(5);
});

test('Enter, Backspace and Delete in a title: the next card, a split, an empty card gone, two cards joined', async () => {
  const { el, last } = await editor();
  // At the end: the next card, empty, in the same lane, the caret in it.
  await caretIn(el, title(el, 1, 0));
  key(title(el, 1, 0).tx, 'Enter');
  input(title(el, 1, 0), 'insertParagraph');
  await settle(el);
  await until(() => cards(el, 1).length === 3);
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', '', 'Send invites']]);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  // Backspace in the empty card: it goes, the caret to the end of the card before.
  input(title(el, 1, 1), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe(BOARD);
  expect(document.activeElement).toBe(title(el, 1, 0).tx);
  // In the middle: split there.
  await caretIn(el, title(el, 1, 0), 5);
  input(title(el, 1, 0), 'insertParagraph');
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Write', 'the brief', 'Send invites']]);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  // Backspace at the start of a card with no fields joins it to the card before.
  await caretIn(el, title(el, 1, 1), 0);
  input(title(el, 1, 1), 'deleteContentBackward');
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Writethe brief', 'Send invites']]);
  // Delete at the end joins the next card in (it has no fields to lose).
  await caretIn(el, title(el, 1, 0));
  input(title(el, 1, 0), 'deleteContentForward');
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Writethe briefSend invites']]);
});

test('the keys in a title: Up/Down from card to card, Alt+Up/Down along the lane, Mod+Alt+Left/Right across lanes, Mod+D again', async () => {
  const { el, last } = await editor();
  await caretIn(el, title(el, 1, 0), 3);
  key(title(el, 1, 0).tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  key(title(el, 1, 1).tx, 'ArrowUp');
  await settle(el);
  expect(document.activeElement).toBe(title(el, 1, 0).tx);
  key(title(el, 1, 0).tx, 'ArrowDown', { altKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Send invites', 'Write the brief']]);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  expect(title(el, 1, 1).sel?.focus.offset).toBe(3);
  key(title(el, 1, 1).tx, 'ArrowRight', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(drawn(el).map(([n, c]) => [n, (c as string[]).length])).toEqual([
    ['To do', 1],
    ['Doing', 1],
    ['Done', 1],
  ]);
  expect(last()).toContain('\nWrite the brief | Done | Ana\n');
  expect(document.activeElement).toBe(title(el, 2, 0).tx);
  key(title(el, 2, 0).tx, 'ArrowLeft', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Send invites', 'Write the brief']]);
  key(title(el, 1, 1).tx, 'd', { ctrlKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Send invites', 'Write the brief', 'Write the brief']]);
  expect(document.activeElement).toBe(title(el, 1, 2).tx);
});

test('a lane’s name is kept on Enter (its cards’ cells and lanes:), put back by Escape', async () => {
  const { el, last } = await editor();
  await caretIn(el, laneName(el, 1));
  await type(el, () => laneName(el, 1), ' now');
  // Typed, nothing is written yet.
  expect(el.value).toBe(BOARD);
  input(laneName(el, 1), 'insertParagraph');
  await settle(el);
  expect(last()).toBe('---\nlanes: To do, Doing now, Done\n---\nTask | Status:option | Owner\n--- | --- | ---\nWrite the brief | Doing now | Ana\n' + B + 'Send invites | Doing now |\n');
  expect(document.activeElement).toBe(title(el, 1, 0).tx);
  await caretIn(el, laneName(el, 0));
  await type(el, () => laneName(el, 0), 'xx');
  key(laneName(el, 0).tx, 'Escape');
  await settle(el);
  expect(said(laneName(el, 0))).toBe('To do');
  expect(last()).toContain('lanes: To do, Doing now, Done');
});

test('Insert ▾ a card after the one in hand and a lane after the one in hand; a lane’s menu adds, moves and deletes', async () => {
  const { el, last } = await editor();
  const insert = () => el.querySelector<HTMLButtonElement>('to-insert > button')!;
  await caretIn(el, title(el, 1, 0));
  await pick(el, insert(), 'Card');
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', '', 'Send invites']]);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  await pick(el, insert(), 'Lane');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'New lane', 'Done']);
  expect(last()).toContain('lanes: To do, Doing, New lane, Done');
  const menu = (i: number) => lanes(el)[i].querySelector<HTMLButtonElement>('.board-more')!;
  expect(menu(2).getAttribute('aria-label')).toBe('Options for New lane');
  await pick(el, menu(2), 'Move right');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'Done', 'New lane']);
  await pick(el, menu(3), 'Move left');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'New lane', 'Done']);
  await pick(el, menu(2), 'Add a card');
  expect(drawn(el)[2]).toEqual(['New lane', ['']]);
  expect(document.activeElement).toBe(title(el, 2, 0).tx);
  await pick(el, menu(2), 'Delete lane');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'Done']);
  expect(last()).toContain('lanes: To do, Doing, Done');
  await undo(el);
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'New lane', 'Done']);
});

test('a tap on the grip chooses the card with the bar under it; Move to the lane after and before carry the chosen; Delete takes them away', async () => {
  const { el, last } = await editor();
  await tapGrip(el, 1, 0);
  await tapGrip(el, 1, 1, { shiftKey: true });
  expect(ranged(el)).toEqual(['Write the brief', 'Send invites']);
  const labels = [...el.querySelectorAll('.board-context button')].map((b) => b.getAttribute('aria-label'));
  expect(labels).toEqual(['Edit', 'Move up', 'Move down', 'Move to To do', 'Move to Done', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  contextButton(el, 'Move to Done').click();
  await settle(el);
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room']],
    ['Doing', []],
    ['Done', ['Write the brief', 'Send invites']],
  ]);
  expect(ranged(el)).toEqual(['Write the brief', 'Send invites']);
  key(el.querySelector<HTMLElement>('.board')!, 'ArrowLeft', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', 'Send invites']]);
  contextButton(el, 'Delete').click();
  await settle(el);
  expect(last()).toBe(HEAD + B);
  expect(drawn(el)[1]).toEqual(['Doing', []]);
});

test('Mod+C/V on chosen cards: a table as TLO and our HTML out, cards back in; lines pasted in a title are cards after it', async () => {
  const { el, last } = await editor();
  await tapGrip(el, 0, 0);
  const board = el.querySelector<HTMLElement>('.board')!;
  const out = await clip(el, 'copy', board);
  expect(out.getData('text/plain')).toBe('Task | Status:option | Owner\n--- | --- | ---\nBook the room | To do | Ben\n');
  expect(out.getData('text/html')).toContain('<table');
  await tapGrip(el, 1, 1);
  await clip(el, 'paste', board, { 'text/plain': out.getData('text/plain'), 'text/html': out.getData('text/html') });
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', 'Book the room']]);
  expect(last()).toContain('\nBook the room | Doing | Ben\n');
  await caretIn(el, title(el, 0, 0));
  await clip(el, 'paste', title(el, 0, 0).tx, { 'text/plain': 'Buy pens\nBuy paper\n' });
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', 'Buy pens', 'Buy paper']]);
});

test('a drag by the grip carries a card into another lane before the card under the pointer, the place drawn', async () => {
  const { el, last } = await editor();
  const g = grip(el, 0, 0);
  const h = g.getBoundingClientRect();
  const to = cards(el, 1)[1].getBoundingClientRect();
  const at = (type: string, x: number, y: number) =>
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', to.left + 40, to.top + 4);
  await settle(el);
  expect(el.over).toEqual({ lane: 1, pos: 1 });
  expect(cards(el, 0)[0].classList.contains('dragging')).toBe(true);
  expect(cards(el, 1)[1].classList.contains('before')).toBe(true);
  at('pointerup', to.left + 40, to.top + 4);
  await settle(el);
  expect(drawn(el)).toEqual([
    ['To do', []],
    ['Doing', ['Write the brief', 'Book the room', 'Send invites']],
    ['Done', []],
  ]);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
  expect(getComputedStyle(grip(el, 1, 1)).touchAction).toBe('none');
  // Into an empty lane, past its end.
  const empty = lanes(el)[0].getBoundingClientRect();
  const g2 = grip(el, 1, 0);
  const h2 = g2.getBoundingClientRect();
  for (const [type, x, y] of [
    ['pointerdown', h2.left + 4, h2.top + 4],
    ['pointermove', empty.left + 40, empty.bottom - 6],
    ['pointerup', empty.left + 40, empty.bottom - 6],
  ] as const)
    g2.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 8, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  await settle(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Write the brief']]);
});

test('a blank board: To do, Doing and Done, no cards; Enter in a lane’s name makes its first card', async () => {
  const { el, last } = await editor('---\nlanes: To do, Doing, Done\n---\nTitle | Status:option\n--- | ---\n');
  expect(drawn(el)).toEqual([
    ['To do', []],
    ['Doing', []],
    ['Done', []],
  ]);
  await el.focusFirst();
  await settle(el);
  expect(document.activeElement).toBe(laneName(el, 0).tx);
  input(laneName(el, 0), 'insertParagraph');
  await settle(el);
  expect(parse(last()!).blocks[0]).toMatchObject({ k: 'table', rows: [['', 'To do']] });
  expect(document.activeElement).toBe(title(el, 0, 0).tx);
});

test('at phone width: a lane a row, the full width, cards a finger tall, 16px words, the page never wider', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    const [a, b] = lanes(el).map((l) => l.getBoundingClientRect());
    expect(b.top).toBeGreaterThanOrEqual(a.bottom);
    expect(a.width).toBeGreaterThan(300);
    for (const c of el.querySelectorAll<HTMLElement>('.board-card')) expect(c.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const g of el.querySelectorAll<HTMLElement>('.board-grip')) expect(Math.min(g.getBoundingClientRect().width, g.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const x of el.querySelectorAll<HTMLElement>('.board-title .tx, .board-lane-name .tx')) expect(parseFloat(getComputedStyle(x).fontSize)).toBeGreaterThanOrEqual(16);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});
