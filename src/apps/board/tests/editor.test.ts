// The Board editor in a real browser: a template's lanes and cards; the lanes and cards from the document; a title typed
// into its cell (a burst one undo, the caret back with it); Enter, Backspace and Delete in a title; the keys (Up/Down,
// Left/Right at a title's ends, Alt+Up/Down, Mod+Alt+Left/Right, Mod+D); a lane's name kept on Enter, put back by Escape,
// and renamed from its menu; Insert ▾ and a lane's menu; cards chosen whole with the bar under them (Open, Move to…),
// Mod+Left/Right, the clipboard; a card opened, its fields typed in a dialog and kept as one step; a drag by the grip
// into another lane with its ghost, and undone; a finger held on the grip; the hand-off to the Spreadsheet; on a wide
// screen the lanes in a row that scrolls sideways, and at phone width one under another, a finger tall, the page never
// wider; and every card and lane named.
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToBoardEditor } from '../editor.ts';
import { parse } from '../../../doc/index.ts';
import def from '../def.ts';
import type { ToDialog } from '../../../kit/ui/dialog.ts';
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
  key(title(el, 1, 1).tx, 'ArrowUp', { altKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', 'Send invites']]);
  key(title(el, 1, 0).tx, 'ArrowDown', { altKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Send invites', 'Write the brief']]);
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
  // A new card is a row of the table, in its lane, after the card in hand (just before the lane's next card).
  expect((parse(last()!).blocks[0] as { rows: string[][] }).rows).toEqual([
    ['Write the brief', 'Doing', 'Ana'],
    ['Book the room', 'To do', 'Ben'],
    ['', 'Doing', ''],
    ['Send invites', 'Doing', ''],
  ]);
  await pick(el, insert(), 'Lane');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'New lane', 'Done']);
  expect(last()).toContain('lanes: To do, Doing, New lane, Done');
  const menu = (i: number) => lanes(el)[i].querySelector<HTMLButtonElement>('.board-more')!;
  expect(menu(2).getAttribute('aria-label')).toBe('Options for New lane');
  await pick(el, menu(2), 'Move right');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'Done', 'New lane']);
  await pick(el, menu(3), 'Move left');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'New lane', 'Done']);
  // Rename lane: the name where it is drawn, chosen whole, so typing replaces it; kept on Enter.
  await pick(el, menu(2), 'Rename lane');
  expect(document.activeElement).toBe(laneName(el, 2).tx);
  expect(laneName(el, 2).sel).toMatchObject({ anchor: { offset: 0 }, focus: { offset: 8 } });
  input(laneName(el, 2), 'insertText', 'Review');
  await settle(el);
  input(laneName(el, 2), 'insertParagraph');
  await settle(el);
  expect(last()).toContain('lanes: To do, Doing, Review, Done');
  // Enter went on into the lane's first card, made for it.
  expect(drawn(el)[2]).toEqual(['Review', ['']]);
  await pick(el, menu(2), 'Add a card');
  expect(drawn(el)[2]).toEqual(['Review', ['', '']]);
  expect(document.activeElement).toBe(title(el, 2, 1).tx);
  await pick(el, menu(2), 'Delete lane');
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'Done']);
  expect(last()).toContain('lanes: To do, Doing, Done');
  await undo(el);
  expect(drawn(el).map(([n]) => n)).toEqual(['To do', 'Doing', 'Review', 'Done']);
});

test('a tap on the grip chooses the card with the bar under it; Move to… a lane, Mod+Left/Right carry the chosen; Delete takes them away', async () => {
  const { el, last } = await editor();
  await tapGrip(el, 1, 0);
  await tapGrip(el, 1, 1, { shiftKey: true });
  expect(ranged(el)).toEqual(['Write the brief', 'Send invites']);
  const labels = [...el.querySelectorAll('.board-context button')].map((b) => b.getAttribute('aria-label'));
  expect(labels).toEqual(['Edit', 'Move up', 'Move down', 'Open', 'Move to…', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  // Move to…: a menu of the lanes, the one they are in checked and not to be chosen.
  contextButton(el, 'Move to…').click();
  await until(() => !!el.querySelector('to-menu.board-moveto [popover]:popover-open'));
  const items = [...el.querySelectorAll<HTMLButtonElement>('to-menu.board-moveto [role^=menuitem]')];
  expect(items.map((b) => [b.textContent!.trim(), b.getAttribute('aria-checked'), b.disabled])).toEqual([
    ['To do', 'false', false],
    ['Doing', 'true', true],
    ['Done', 'false', false],
  ]);
  items[2].click();
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
  // Mod+Right: the lane after; the status cells say so.
  key(el.querySelector<HTMLElement>('.board')!, 'ArrowRight', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe(HEAD + 'Write the brief | Done | Ana\nSend invites | Done |\n' + B);
  expect(ranged(el)).toEqual(['Write the brief', 'Send invites']);
  key(el.querySelector<HTMLElement>('.board')!, 'ArrowLeft', { ctrlKey: true });
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
  const from = cards(el, 0)[0].getBoundingClientRect();
  const at = (type: string, x: number, y: number) =>
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', to.left + 40, to.top + 4);
  await settle(el);
  expect(el.over).toEqual({ lane: 1, pos: 1 });
  expect(cards(el, 0)[0].classList.contains('dragging')).toBe(true);
  expect(cards(el, 1)[1].classList.contains('before')).toBe(true);
  // A ghost of the card follows the pointer, kept from the hands of a screen reader.
  const ghost = document.querySelector<HTMLElement>('.board-ghost')!;
  expect(ghost.textContent).toBe('Book the room');
  expect(ghost.getAttribute('aria-hidden')).toBe('true');
  expect(Math.abs(ghost.getBoundingClientRect().left - (to.left + 40 - (h.left + 4 - from.left)))).toBeLessThan(2);
  at('pointerup', to.left + 40, to.top + 4);
  await settle(el);
  expect(document.querySelector('.board-ghost')).toBe(null);
  expect(drawn(el)).toEqual([
    ['To do', []],
    ['Doing', ['Write the brief', 'Book the room', 'Send invites']],
    ['Done', []],
  ]);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
  expect(getComputedStyle(grip(el, 1, 1)).touchAction).toBe('none');
  // One undo brings it back.
  await undo(el);
  expect(last()).toBe(BOARD);
  el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
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

test('on a wide screen the lanes are a row that scrolls sideways on its own, the page never wider', async () => {
  await page.viewport(1100, 800);
  const { el } = await editor((await def.templates!()).find((x) => x.id === 'pipeline')!.doc);
  const board = el.querySelector<HTMLElement>('.board')!;
  const [a, b] = lanes(el).map((l) => l.getBoundingClientRect());
  expect(Math.round(b.top)).toBe(Math.round(a.top));
  expect(b.left).toBeGreaterThan(a.right);
  expect(board.scrollWidth).toBeGreaterThan(board.clientWidth);
  expect(getComputedStyle(board).overflowX).toBe('auto');
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(innerWidth);
  // A card in a lane out of sight is brought into it when its title takes the focus.
  const far = lanes(el).length - 1;
  await el.focusTitle(Number(cards(el, far)[0].dataset.row));
  await settle(el);
  const r = cards(el, far)[0].getBoundingClientRect();
  const box = board.getBoundingClientRect();
  expect(r.right).toBeLessThanOrEqual(box.right + 1);
});

test('at phone width: the lanes stacked, the full width, cards a finger tall, 16px words, the page never wider', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor();
    const [a, b] = lanes(el).map((l) => l.getBoundingClientRect());
    expect(b.top).toBeGreaterThanOrEqual(a.bottom);
    expect(a.width).toBeGreaterThan(300);
    for (const x of el.querySelectorAll<HTMLElement>('.board-lane, .board-card')) expect(x.getBoundingClientRect().right).toBeLessThanOrEqual(390);
    for (const c of el.querySelectorAll<HTMLElement>('.board-card')) expect(c.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const g of el.querySelectorAll<HTMLElement>('.board-grip')) expect(Math.min(g.getBoundingClientRect().width, g.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for (const x of el.querySelectorAll<HTMLElement>('.board-title .tx, .board-lane-name .tx')) expect(parseFloat(getComputedStyle(x).fontSize)).toBeGreaterThanOrEqual(16);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

test('a template opened draws its lanes and its cards, each card with its fields', async () => {
  const doc = (await def.templates!()).find((x) => x.id === 'project')!.doc;
  const { el } = await editor(doc);
  expect(drawn(el)).toEqual([
    ['To do', ['Order the samples', 'Plan the launch party', 'Send the thank-you notes']],
    ['Doing', ['Draft the press release', 'Build the landing page']],
    ['Done', ['Write the launch brief', 'Book the photographer']],
  ]);
  expect([...cards(el, 1)[0].querySelectorAll('.board-fields dt')].map((x) => x.textContent)).toEqual(['Owner', 'Due']);
});

test('every lane and every card has a name: the lane’s, the card’s title; its grip and title say which card in which lane', async () => {
  const { el } = await editor();
  expect(lanes(el).map((l) => l.getAttribute('aria-label'))).toEqual(['To do', 'Doing', 'Done']);
  expect([...el.querySelectorAll('.board-card')].map((c) => c.getAttribute('aria-label'))).toEqual(['Book the room', 'Write the brief', 'Send invites']);
  for (const g of el.querySelectorAll('.board-grip, .board-more')) expect(g.getAttribute('aria-label')).toBeTruthy();
  for (const x of el.querySelectorAll<ToText>('to-text')) expect(x.tx.getAttribute('aria-label')).toBeTruthy();
  expect(el.querySelector('.board')!.getAttribute('aria-label')).toBe('Board');
});

test('Left at a title’s start and Right at its end go to the card beside it in the lane before or after; elsewhere they are the caret’s', async () => {
  const { el } = await editor();
  await caretIn(el, title(el, 1, 1), 2);
  key(title(el, 1, 1).tx, 'ArrowRight');
  await settle(el);
  expect(document.activeElement).toBe(title(el, 1, 1).tx);
  await caretIn(el, title(el, 1, 1));
  key(title(el, 1, 1).tx, 'ArrowRight');
  await settle(el);
  // Done has no card: its name.
  expect(document.activeElement).toBe(laneName(el, 2).tx);
  await caretIn(el, title(el, 1, 1), 0);
  key(title(el, 1, 1).tx, 'ArrowLeft');
  await settle(el);
  // To do holds one card: its last.
  expect(document.activeElement).toBe(title(el, 0, 0).tx);
  expect(title(el, 0, 0).sel?.focus.offset).toBe('Book the room'.length);
});

test('a card opened (Alt+Enter, Open, a double click) is its fields in a dialog; Done keeps them as one step, the lane a move; Escape keeps nothing', async () => {
  const { el, last } = await editor();
  await caretIn(el, title(el, 1, 0), 4);
  key(title(el, 1, 0).tx, 'Enter', { altKey: true });
  const dialog = () => el.querySelector<ToDialog>('to-dialog.board-dialog')!;
  await until(() => !!dialog().dialog?.open);
  await settle(el);
  expect(dialog().querySelector('h2')!.textContent).toBe('Write the brief');
  const fields = () => [...dialog().querySelectorAll<HTMLElement>('.board-field')];
  expect(fields().map((f) => f.querySelector('span')!.textContent)).toEqual(['Task', 'Status', 'Owner']);
  const inputs = () => dialog().querySelectorAll<HTMLInputElement>('.board-field input');
  expect(document.activeElement).toBe(inputs()[0]);
  // The status column is a list of the lanes, its options the column's own words.
  const select = dialog().querySelector<HTMLSelectElement>('select')!;
  expect([...select.options].map((o) => o.value)).toEqual(['To do', 'Doing', 'Done']);
  expect(select.value).toBe('Doing');
  inputs()[1].value = 'Ana Lee';
  inputs()[1].dispatchEvent(new Event('input', { bubbles: true }));
  select.value = 'Done';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(el.value).toBe(BOARD);
  inputs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await settle(el);
  await until(() => !dialog().dialog?.open);
  expect(last()).toBe(HEAD + 'Write the brief | Done | Ana Lee\n' + B + C);
  // The focus back in the card's title, where it now is, the caret where it was.
  await settle(el);
  expect(document.activeElement).toBe(title(el, 2, 0).tx);
  await undo(el);
  expect(last()).toBe(BOARD);
  // Chosen, Open in the bar under it; Escape: nothing written, the card chosen again.
  await tapGrip(el, 0, 0);
  contextButton(el, 'Open').click();
  await until(() => !!dialog().dialog?.open);
  await settle(el);
  inputs()[1].value = 'Nobody';
  inputs()[1].dispatchEvent(new Event('input', { bubbles: true }));
  dialog().close();
  await until(() => !dialog().dialog?.open);
  await settle(el);
  expect(last()).toBe(BOARD);
  expect(ranged(el)).toEqual(['Book the room']);
  // A double click on the card's fields; the dialog's Delete takes it away.
  cards(el, 0)[0]
    .querySelector('.board-fields')!
    .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  await until(() => !!dialog().dialog?.open);
  await settle(el);
  [...dialog().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === 'Delete')!.click();
  await settle(el);
  expect(last()).toBe(HEAD + A + C);
  expect(drawn(el)[0]).toEqual(['To do', []]);
});

test('a finger held on the grip chooses the card, the bar under it up; it is no drag after', async () => {
  const { el } = await editor();
  const g = grip(el, 1, 0);
  const h = g.getBoundingClientRect();
  const at = (type: string, x: number, y: number) =>
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, isPrimary: true, button: 0, pointerType: 'touch', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  // Half a second held, the card is chosen.
  await until(() => ranged(el).length === 1);
  expect(ranged(el)).toEqual(['Write the brief']);
  at('pointermove', h.left + 120, h.top + 60);
  at('pointerup', h.left + 120, h.top + 60);
  g.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await settle(el);
  expect(el.value).toBe(BOARD);
  expect(ranged(el)).toEqual(['Write the brief']);
});

test('the bar hands the cards to the Spreadsheet: the same table, opened where the page says documents open', async () => {
  const { el } = await editor();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  try {
    el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Open the cards in a spreadsheet"]')!.click();
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(/#\/v\d+\/sheet\//);
  } finally {
    open.mockRestore();
  }
});
