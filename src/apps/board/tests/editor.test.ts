// The Board on a bare page, registered and mounted through `tinylittleoffice/editors` as a page that is not the site
// mounts any app, in a real browser: found by its id, drawn by its own element; a template's lanes and cards; the lanes
// and cards from the document; a title typed into its cell (a burst one undo, the caret back with it, the change told
// as ops that reapply); Enter, Backspace and Delete in a title; a title as its column shows it and typed back as words
// ("'007" shown 007, 007 typed written "'007", =1+1 never a formula, a money title its amount); the keys (Up/Down, Left/Right at a title's ends,
// Alt+Up/Down, Mod+Alt+Left/Right, Mod+D); a lane's name kept on Enter, put back by Escape, and renamed from its menu;
// Insert ▾ and a lane's menu; cards chosen whole with the bar under them (Open, Move to…), Mod+Left/Right, the
// clipboard; a card opened, its fields typed in a dialog and kept as one step (those typed alone, an edit from elsewhere
// kept); a drag by the grip into another lane with its ghost, told as ops, and undone; a finger held on the grip; the
// hand-off to the Spreadsheet where the page's host says documents open; on a wide screen the lanes in a row that
// scrolls sideways, and at phone width one under another, a finger tall, the bars one row, the page never wider;
// every card and lane named; another's ops taken in; read-only, no bar, nothing typed or carried, a card activated
// picked; pickable, a card activated picked while it is still typed and carried, never when not asked for; and carried
// only, no bar, no lane's menu and nothing typed, pasted, cut or added, every op told a card's move (a drag, the keys,
// Move to…, the dialog's lane), an undo a move taken back or nothing, and a card picked there too. These are the
// Board's tests as they were in its package of its own, and the proof that it is the same Board in the library.
import { expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { applyAll, parse, write, type Op } from '../../../doc/index.ts';
import { appOf } from '../../../kit/core/apps.ts';
import { caret } from '../../../kit/text/textops.ts';
import { host } from '../../../kit/core/host.ts';
import type { DocPick, Picked } from '../../../kit/core/element.ts';
import type { ToDialog } from '../../../kit/ui/dialog.ts';
import type { ToText } from '../../../kit/text/text.ts';
import type { ToBoardEditor } from '../editor.ts';
import { install, registerBoard } from '../../../board.ts';
import def from '../def.ts';
import { moveCard } from '../model.ts';
import { board, settle, tick, until, type Heard } from './page.ts';

const HEAD = '---\nlanes: To do, Doing, Done\n---\nTask | Status:option | Owner\n--- | --- | ---\n';
const A = 'Write the brief | Doing | Ana\n';
const B = 'Book the room | To do | Ben\n';
const C = 'Send invites | Doing |\n';
const BOARD = HEAD + A + B + C;

const editor = (value = BOARD) => board(value);
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
/** A drag by a card's grip: pressed on it, moved to (x, y), let go there. */
function drag(g: HTMLElement, x: number, y: number, pointerId: number) {
  const h = g.getBoundingClientRect();
  for (const [type, px, py] of [
    ['pointerdown', h.left + 4, h.top + 4],
    ['pointermove', x, y],
    ['pointerup', x, y],
  ] as const)
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, isPrimary: true, button: 0, pointerType: 'mouse', clientX: px, clientY: py }));
}

test('registered, the Board is found by its id and mounted by tinylittleoffice/editors as its own element; registering again does nothing', async () => {
  expect(appOf('board')).toBe(def);
  registerBoard();
  install();
  expect(appOf('board')).toBe(def);
  const { el } = await editor();
  expect(el.tagName.toLowerCase()).toBe('to-board-editor');
  expect(el.classList.contains('to-editor')).toBe(true);
  expect(document.querySelectorAll('to-shell, to-chrome')).toHaveLength(0);
  // Its stylesheet is on the page: the lanes are panels, the board a container the lanes reflow in.
  expect(getComputedStyle(el).display).toBe('block');
  expect(getComputedStyle(el.querySelector('.board')!).display).toBe('flex');
});

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

test('typing a title writes its cell, told as ops that reapply; a burst one undo, the caret back where the typing began', async () => {
  const { el, last, heard } = await editor();
  await caretIn(el, title(el, 1, 0), 5);
  await type(el, () => title(el, 1, 0), 'XY');
  expect(last()).toBe(HEAD + 'WriteXY the brief | Doing | Ana\n' + B + C);
  // Every change is told first as its ops, which applied to the text before give the text after.
  const told = heard.filter((h): h is { ops: Op[]; base: number } => typeof h !== 'string');
  expect(told.length).toBeGreaterThan(0);
  expect(
    write(
      applyAll(
        parse(BOARD),
        told.flatMap((t) => t.ops),
      ),
    ),
  ).toBe(last());
  await caretIn(el, title(el, 0, 0), 0);
  await undo(el);
  expect(last()).toBe(BOARD);
  expect(document.activeElement).toBe(title(el, 1, 0).tx);
  expect(title(el, 1, 0).sel?.focus.offset).toBe(5);
});

test('Mod+Z inside the board undoes, as mount answers the page’s keys', async () => {
  const { el, last } = await editor();
  await caretIn(el, title(el, 0, 0));
  await type(el, () => title(el, 0, 0), '!');
  expect(last()).toBe(HEAD + A + 'Book the room! | To do | Ben\n' + C);
  key(title(el, 0, 0).tx, 'z', { ctrlKey: true });
  await settle(el);
  await until(() => last() === BOARD, 'Mod+Z never took the typing back');
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

test('a title is its cell as the Spreadsheet shows it, typed back as words: 007 shown and written "\'007", =1+1 never a formula, split and joined as typed', async () => {
  const { el, last } = await editor();
  const made = async (i: number, j: number) => {
    await caretIn(el, title(el, i, j));
    const n = cards(el, i).length;
    input(title(el, i, j), 'insertParagraph');
    await settle(el);
    await until(() => cards(el, i).length === n + 1, 'Enter never made a card');
  };
  // A new card after Book the room, 007 typed into it a key at a time: the card shows 007 (the words typed kept as
  // the editor's draft, never the cell's "'007" put back under the caret), and the table's cell is "'007".
  await made(0, 0);
  await type(el, () => title(el, 0, 1), '007');
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', '007']]);
  expect(title(el, 0, 1).sel?.focus.offset).toBe(3);
  expect(last()).toBe(HEAD + A + B + "'007 | To do |\n" + C);
  expect(cards(el, 0)[1].getAttribute('aria-label')).toBe('007');
  // Undone, the typing goes (the row as it was, its title empty), then the card.
  await undo(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', '']]);
  expect((parse(last()!).blocks[0] as { rows: string[][] }).rows[2]).toEqual(['', 'To do', '']);
  await undo(el);
  expect(last()).toBe(BOARD);
  // =1+1 typed is words, shown as typed, never worked out; more typed after a space, then split where Enter is pressed:
  // each half shows the words it was given, and joined again by Backspace at the second's start, the words run together.
  await made(0, 0);
  await type(el, () => title(el, 0, 1), '=1+1 008');
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', '=1+1 008']]);
  expect(last()).toContain("\n'=1+1 008 | To do |\n");
  await caretIn(el, title(el, 0, 1), 4);
  input(title(el, 0, 1), 'insertParagraph');
  await settle(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', '=1+1', '008']]);
  expect(last()).toContain("\n'=1+1 | To do |\n'008 | To do |\n");
  await caretIn(el, title(el, 0, 2), 0);
  input(title(el, 0, 2), 'deleteContentBackward');
  await settle(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', '=1+1008']]);
  expect(last()).toContain("\n'=1+1008 | To do |\n");
  expect(title(el, 0, 1).sel?.focus.offset).toBe(4);
});

test('a card over a cell written "\'007" shows 007: in the document, and from a table pasted; its fields as their columns show them', async () => {
  const { el, last } = await board(HEAD + "'007 | To do | '1200\n" + A);
  expect(drawn(el)).toEqual([
    ['To do', ['007']],
    ['Doing', ['Write the brief']],
    ['Done', []],
  ]);
  expect([...cards(el, 0)[0].querySelectorAll('.board-fields dd')].map((x) => x.textContent)).toEqual(['1200']);
  await caretIn(el, title(el, 1, 0));
  await clip(el, 'paste', title(el, 1, 0).tx, { 'text/plain': "Task | Status:option | Owner\n--- | --- | ---\n'008 | Doing | Ana\n'=SUM(1) | Doing |\n" });
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', '008', '=SUM(1)']]);
  expect(last()).toBe(HEAD + "'007 | To do | '1200\n" + A + "'008 | Doing | Ana\n'=SUM(1) | Doing |\n");
});

test('a title column of money (a table with no column of words): its amount shown as the Spreadsheet shows it; words typed written as words, shown as typed', async () => {
  const text = '---\nlanes: To do\n---\nCost:money | Status:option\n--- | ---\n120 | To do\n';
  const { el, last } = await board(text);
  expect(drawn(el)).toEqual([['To do', ['$120.00']]]);
  const x = () => title(el, 0, 0);
  await caretIn(el, x());
  x().sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 7 } };
  await settle(el);
  await type(el, x, '130');
  expect(said(x())).toBe('130');
  expect(last()).toBe(text.replace('\n120 |', "\n'130 |"));
  await undo(el);
  expect(last()).toBe(text);
  expect(said(x())).toBe('$120.00');
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

test('a card moved along its lane and across lanes is told as ops (docops) that reapply to the same board', async () => {
  const { el, last } = await editor();
  const told: { ops: Op[]; base: number }[] = [];
  el.addEventListener('docops', (e) => told.push((e as CustomEvent<{ ops: Op[]; base: number }>).detail));
  await caretIn(el, title(el, 1, 0), 3);
  key(title(el, 1, 0).tx, 'ArrowDown', { altKey: true });
  await settle(el);
  key(title(el, 1, 1).tx, 'ArrowRight', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(last()).toContain('\nWrite the brief | Done | Ana\n');
  expect(told.map((t) => t.base)).toStrictEqual([0, told[0].ops.length]);
  expect(
    write(
      applyAll(
        parse(BOARD),
        told.flatMap((t) => t.ops),
      ),
    ),
  ).toBe(last());
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

test('a drag by the grip carries a card into another lane before the card under the pointer, the place drawn, told as ops', async () => {
  const { el, last, heard } = await editor();
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
  // The page heard the move as ops before its text, ops that make the same board from the one before.
  const [ops, text] = heard.slice(-2) as [{ ops: Op[]; base: number }, string];
  expect(text).toBe(last());
  expect(write(applyAll(parse(BOARD), ops.ops))).toBe(text);
  expect(getComputedStyle(grip(el, 1, 1)).touchAction).toBe('none');
  // One undo brings it back.
  await undo(el);
  expect(last()).toBe(BOARD);
  el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
  await settle(el);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
  // Into an empty lane, past its end.
  const empty = lanes(el)[0].getBoundingClientRect();
  drag(grip(el, 1, 0), empty.left + 40, empty.bottom - 6, 8);
  await settle(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Write the brief']]);
});

test('a blank board: To do, Doing and Done, no cards; Enter in a lane’s name makes its first card', async () => {
  const { el, last } = await editor(def.blank());
  expect(def.blank()).toBe('---\nlanes: To do, Doing, Done\n---\nTitle | Status:option\n--- | ---\n');
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
    // The bar, and the bar under chosen cards, each one row inside the screen.
    const oneRow = (bar: HTMLElement) => {
      const kids = [...bar.children].filter((x) => (x as HTMLElement).offsetWidth > 0);
      expect(kids.length).toBeGreaterThan(0);
      // One row: every button and separator centered on the same line (a separator is shorter than a button).
      const mid = (x: Element) => Math.round((x.getBoundingClientRect().top + x.getBoundingClientRect().bottom) / 2);
      expect(new Set(kids.map(mid)).size).toBe(1);
      expect(bar.getBoundingClientRect().right).toBeLessThanOrEqual(390.5);
    };
    oneRow(el.querySelector<HTMLElement>('to-bar.board-bar')!);
    await tapGrip(el, 1, 0);
    oneRow(contextButton(el, 'Open').closest<HTMLElement>('.to-context')!);
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

test('Done writes the fields typed alone: what an edit from elsewhere changed while the dialog was open stays', async () => {
  const head = '---\nlanes: To do, Doing, Done\n---\nTask | Status:option | Owner | Due:date\n--- | --- | --- | ---\n';
  const rest = 'Book the room | To do | Ben | 2026-11-02\n';
  const { el, last } = await editor(head + 'Write the brief | Doing | Ana | 2026-11-01\n' + rest);
  await caretIn(el, title(el, 1, 0));
  key(title(el, 1, 0).tx, 'Enter', { altKey: true });
  const dialog = () => el.querySelector<ToDialog>('to-dialog.board-dialog')!;
  await until(() => !!dialog().dialog?.open);
  await settle(el);
  const inputs = () => dialog().querySelectorAll<HTMLInputElement>('.board-field input');
  // A date asks for the order it is typed in, in the page's language.
  expect(inputs()[2].placeholder).toBe('YYYY-MM-DD');
  inputs()[1].value = 'Ana Lee';
  inputs()[1].dispatchEvent(new Event('input', { bubbles: true }));
  await settle(el);
  // Someone else renames the card, moves it to Done and changes its date; then Done here.
  el.value = head + 'Write the whole brief | Done | Ana | 2026-11-09\n' + rest;
  await settle(el);
  inputs()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => !dialog().dialog?.open);
  await settle(el);
  expect(last()).toBe(head + 'Write the whole brief | Done | Ana Lee | 2026-11-09\n' + rest);
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

test('the bar hands the cards to the Spreadsheet: the same table, opened where the page’s host says documents open', async () => {
  const { el } = await editor();
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  const link = host.link;
  const asked: [string, string][] = [];
  host.link = (app: string, text: string) => (asked.push([app, text]), `https://host.test/open/${app}`);
  try {
    el.querySelector<HTMLButtonElement>('to-bar button[aria-label="Open the cards in a spreadsheet"]')!.click();
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toBe('https://host.test/open/sheet');
    expect(asked).toStrictEqual([['sheet', BOARD]]);
  } finally {
    host.link = link;
    open.mockRestore();
  }
});

test('another’s ops taken in (applyRemote): the board drawn again, nothing told back, and an undo takes back only what was done here', async () => {
  const { el, last, heard, applyRemote } = await editor();
  await caretIn(el, title(el, 0, 0));
  await type(el, () => title(el, 0, 0), '!');
  const mine = last()!;
  const told = heard.length;
  // Someone else carries Send invites (row 2) to Done.
  applyRemote(moveCard(parse(mine), 2, 'Done', 0));
  await settle(el);
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room!']],
    ['Doing', ['Write the brief']],
    ['Done', ['Send invites']],
  ]);
  expect(heard.length).toBe(told);
  await undo(el);
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room']],
    ['Doing', ['Write the brief']],
    ['Done', ['Send invites']],
  ]);
});

test('read-only: no bar and no lane menus, nothing typed or carried, and a card activated is picked with its table and its row', async () => {
  const { el, heard } = await board(BOARD, { readOnly: true });
  const picks: Picked[] = [];
  el.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  expect(el.readOnly).toBe(true);
  expect(el.querySelector('to-bar')).toBeNull();
  expect(el.querySelector('.board-more')).toBeNull();
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room']],
    ['Doing', ['Write the brief', 'Send invites']],
    ['Done', []],
  ]);
  const typed = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true, composed: true });
  title(el, 1, 0).tx.dispatchEvent(typed);
  expect(typed.defaultPrevented).toBe(true);
  // A card activated: a click on its title, Enter on it; the page is told which (the table's block, the card's row).
  title(el, 1, 1).tx.click();
  expect(picks).toStrictEqual([{ at: 0, row: 2 }]);
  key(title(el, 0, 0).tx, 'Enter');
  expect(picks.at(-1)).toStrictEqual({ at: 0, row: 1 });
  // A drag by the grip carries nothing.
  const to = cards(el, 1)[0].getBoundingClientRect();
  drag(grip(el, 0, 0), to.left + 40, to.top + 4, 11);
  await settle(el);
  expect(document.querySelector('.board-ghost')).toBeNull();
  expect(heard).toStrictEqual([]);
  expect(el.value).toBe(BOARD);
});

test('pickable, a card activated while the board can be changed is picked with its table and its row; a drag by the grip still carries it', async () => {
  const { el, last, heard } = await editor();
  const picks: Picked[] = [];
  el.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  el.pickable = true;
  await settle(el);
  expect(el.hasAttribute('pickable')).toBe(true);
  // A click on a card's fields, or on the card around them: picked, and not chosen.
  cards(el, 1)[0].querySelector<HTMLElement>('.board-fields')!.click();
  cards(el, 0)[0].click();
  await settle(el);
  expect(picks).toStrictEqual([
    { at: 0, row: 0 },
    { at: 0, row: 1 },
  ]);
  expect(ranged(el)).toEqual([]);
  // A double click on a card opens nothing: the pick was the page's.
  cards(el, 1)[0]
    .querySelector('.board-fields')!
    .dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  await settle(el);
  expect(el.querySelector<ToDialog>('to-dialog.board-dialog')!.dialog?.open).toBeFalsy();
  // A title is still typed in: a click there is the caret's, Enter makes a card.
  await caretIn(el, title(el, 1, 1));
  title(el, 1, 1).tx.click();
  key(title(el, 1, 1).tx, 'Enter');
  input(title(el, 1, 1), 'insertParagraph');
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Write the brief', 'Send invites', '']]);
  await undo(el);
  expect(last()).toBe(BOARD);
  // From the keys: Escape in a title chooses its card, and Enter on it picks it; it stays chosen, nothing changed.
  const board = el.querySelector<HTMLElement>('.board')!;
  await caretIn(el, title(el, 1, 1));
  key(title(el, 1, 1).tx, 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual(['Send invites']);
  expect(document.activeElement).toBe(board);
  key(board, 'Enter');
  await settle(el);
  expect(picks.at(-1)).toStrictEqual({ at: 0, row: 2 });
  expect(ranged(el)).toEqual(['Send invites']);
  expect(last()).toBe(BOARD);
  // A tap on the grip chooses the card, and Enter picks it.
  await tapGrip(el, 0, 0);
  expect(ranged(el)).toEqual(['Book the room']);
  key(board, 'Enter');
  expect(picks.at(-1)).toStrictEqual({ at: 0, row: 1 });
  // A drag by the grip carries it, told as ops.
  const told = heard.length;
  const to = cards(el, 1)[1].getBoundingClientRect();
  drag(grip(el, 0, 0), to.left + 40, to.top + 4, 12);
  await settle(el);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
  expect(heard.slice(told).filter((h) => typeof h !== 'string')).toHaveLength(1);
  expect(picks).toHaveLength(4);
});

test('not pickable, as a board is unless the page asks: a tap on a card chooses it and nothing is picked', async () => {
  const { el } = await editor();
  const picks: Picked[] = [];
  el.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  expect(el.pickable).toBe(false);
  expect(el.hasAttribute('pickable')).toBe(false);
  cards(el, 1)[0].querySelector<HTMLElement>('.board-fields')!.click();
  await settle(el);
  expect(ranged(el)).toEqual(['Write the brief']);
  await caretIn(el, title(el, 0, 0));
  title(el, 0, 0).tx.click();
  key(title(el, 0, 0).tx, 'Enter');
  await settle(el);
  // Enter on a card chosen whole is Edit, as ever: the caret back in its title.
  await tapGrip(el, 1, 1);
  key(el.querySelector<HTMLElement>('.board')!, 'Enter');
  await settle(el);
  expect(ranged(el)).toEqual([]);
  expect(picks).toStrictEqual([]);
});

/** Every op the page was told, in order. */
const opsOf = (heard: Heard[]) => heard.flatMap((h) => (typeof h === 'string' ? [] : h.ops));
/** An op a card's move makes (model.ts moveCard): its status cell (the second column, never forced), or its row taken out and put in again. */
const aMove = (op: Op) => (op.op === 'cells' && op.at === 0 && op.c === 1 && op.values.length === 1 && op.values[0].length === 1 && !op.force) || (op.op === 'rows' && op.at === 0 && op.n === 1);
/** Ops told one after another on `text`, read as a host that takes only moves reads them: each a move's, and every row put in one taken out as it was. */
function movesOnly(text: string, ops: Op[]): boolean {
  let doc = parse(text);
  const out: string[] = [];
  for (const op of ops) {
    if (!aMove(op)) return false;
    if (op.op === 'rows' && !op.rows) out.push(JSON.stringify((doc.blocks[0] as { rows: string[][] }).rows[op.r]));
    if (op.op === 'rows' && op.rows) {
      const i = out.indexOf(JSON.stringify(op.rows[0]));
      if (i < 0) return false;
      out.splice(i, 1);
    }
    doc = applyAll(doc, [op]);
  }
  return !out.length;
}

test('carried only: no bar and no lane menus, the words shown and not typed; typing, Enter, a paste, a cut, Delete and Mod+D change nothing', async () => {
  const { el, heard } = await editor();
  el.carryOnly = true;
  await settle(el);
  expect(el.hasAttribute('carry-only')).toBe(true);
  expect(el.querySelector('to-bar')).toBeNull();
  expect(el.querySelector('.board-more')).toBeNull();
  expect(el.querySelector('to-menu.board-menu')).toBeNull();
  for (const x of el.querySelectorAll<ToText>('to-text')) expect(x.tx.getAttribute('contenteditable')).toBe('false');
  // Typed into a title or a lane's name: refused before it hears it.
  for (const x of [title(el, 1, 0), laneName(el, 0)]) {
    const typed = new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true, composed: true });
    x.tx.dispatchEvent(typed);
    expect(typed.defaultPrevented).toBe(true);
  }
  // Enter in a title or in an empty lane's name adds no card; Backspace, Delete and Mod+D in a title change nothing.
  await caretIn(el, title(el, 1, 0));
  key(title(el, 1, 0).tx, 'Enter');
  input(title(el, 1, 0), 'insertParagraph');
  input(title(el, 1, 0), 'deleteContentBackward');
  input(title(el, 1, 0), 'deleteContentForward');
  key(title(el, 1, 0).tx, 'd', { ctrlKey: true });
  input(laneName(el, 2), 'insertParagraph');
  // Lines pasted into a title; cards pasted, cut, deleted and duplicated where they are chosen.
  await clip(el, 'paste', title(el, 0, 0).tx, { 'text/plain': 'Buy pens\nBuy paper\n' });
  const board = el.querySelector<HTMLElement>('.board')!;
  await tapGrip(el, 1, 0);
  // The bar under them holds what carries them, and Copy.
  expect([...el.querySelectorAll('.board-context button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Move up', 'Move down', 'Open', 'Move to…', 'Copy']);
  await clip(el, 'paste', board, { 'text/plain': 'Task | Status:option | Owner\n--- | --- | ---\nBuy pens | To do | Ana\n' });
  const cut = await clip(el, 'cut', board);
  expect(cut.getData('text/plain')).toBe('');
  // Delete and Backspace take nothing away, and the card stays chosen, the bar under it up.
  key(board, 'Delete');
  key(board, 'Backspace');
  await settle(el);
  expect(ranged(el)).toEqual(['Write the brief']);
  expect(el.querySelector('.board-context button')).not.toBeNull();
  key(board, 'd', { ctrlKey: true });
  await settle(el);
  // A copy still copies: it changes nothing.
  await tapGrip(el, 0, 0);
  expect((await clip(el, 'copy', board)).getData('text/plain')).toContain('Book the room | To do | Ben');
  expect(heard).toStrictEqual([]);
  expect(el.value).toBe(BOARD);
  expect(drawn(el)).toEqual([
    ['To do', ['Book the room']],
    ['Doing', ['Write the brief', 'Send invites']],
    ['Done', []],
  ]);
  // Not carried only again: the bar, the menus and the words typed come back.
  el.carryOnly = false;
  await settle(el);
  expect(el.querySelector('to-bar.board-bar')).not.toBeNull();
  expect(el.querySelectorAll('.board-more')).toHaveLength(3);
  for (const x of el.querySelectorAll<ToText>('to-text')) expect(x.tx.getAttribute('contenteditable')).toBe('true');
});

test('carried only, a title focused has no field’s ground; a read-only board’s keeps the look it had', async () => {
  const ground = async (el: ToBoardEditor) => {
    title(el, 0, 0).tx.focus();
    await settle(el);
    return getComputedStyle(title(el, 0, 0).tx).backgroundColor;
  };
  const { el: shown } = await board(BOARD, { readOnly: true });
  const before = await ground(shown);
  expect(before).not.toBe('rgba(0, 0, 0, 0)');
  const { el } = await editor();
  expect(await ground(el)).toBe(before);
  el.carryOnly = true;
  await settle(el);
  expect(await ground(el)).toBe('rgba(0, 0, 0, 0)');
});

test('carried only, a card is carried by a drag, the keys, Move to… and its dialog’s lane, and every op told is its move; an undo takes one back', async () => {
  const { el, last, heard } = await editor();
  el.carryOnly = true;
  await settle(el);
  // Mod+Alt+Right in a title: the card to the lane after.
  await el.focusTitle(0);
  await settle(el);
  key(title(el, 1, 0).tx, 'ArrowRight', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(drawn(el)[2]).toEqual(['Done', ['Write the brief']]);
  // Mod+Left on a chosen card: to the lane before.
  await tapGrip(el, 2, 0);
  key(el.querySelector<HTMLElement>('.board')!, 'ArrowLeft', { ctrlKey: true });
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Send invites', 'Write the brief']]);
  // Move to… To do.
  await tapGrip(el, 1, 1);
  contextButton(el, 'Move to…').click();
  await until(() => !!el.querySelector('to-menu.board-moveto [popover]:popover-open'));
  el.querySelectorAll<HTMLButtonElement>('to-menu.board-moveto [role^=menuitem]')[0].click();
  await settle(el);
  expect(drawn(el)[0]).toEqual(['To do', ['Book the room', 'Write the brief']]);
  // A drag by the grip, into Doing before Send invites.
  const to = cards(el, 1)[0].getBoundingClientRect();
  drag(grip(el, 0, 0), to.left + 40, to.top + 4, 13);
  await settle(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Book the room', 'Send invites']]);
  // The dialog: every field shown, the lane alone changed; a field's words are never written, and there is no Delete.
  await el.focusTitle(Number(cards(el, 1)[1].dataset.row));
  await settle(el);
  key(title(el, 1, 1).tx, 'Enter', { altKey: true });
  const dialog = () => el.querySelector<ToDialog>('to-dialog.board-dialog')!;
  await until(() => !!dialog().dialog?.open);
  await settle(el);
  const inputs = [...dialog().querySelectorAll<HTMLInputElement>('.board-field input')];
  expect(inputs.map((x) => x.readOnly)).toEqual([true, true]);
  expect(document.activeElement).toBe(dialog().querySelector('select'));
  expect(dialog().querySelector('.board-delete')).toBeNull();
  inputs[0].value = 'Renamed';
  inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
  const select = dialog().querySelector<HTMLSelectElement>('select')!;
  select.value = 'Done';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  inputs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await until(() => !dialog().dialog?.open);
  await settle(el);
  expect(drawn(el)).toEqual([
    ['To do', ['Write the brief']],
    ['Doing', ['Book the room']],
    ['Done', ['Send invites']],
  ]);
  expect(last()).toContain('\nSend invites | Done |\n');
  // Every op told is a move's, and the ops make the board the page was told.
  const ops = opsOf(heard);
  expect(ops.length).toBeGreaterThan(0);
  expect(ops.filter((op) => !aMove(op))).toStrictEqual([]);
  expect(write(applyAll(parse(BOARD), ops))).toBe(last());
  // An undo takes the last move back, as a move.
  const told = heard.length;
  await undo(el);
  expect(drawn(el)[1]).toEqual(['Doing', ['Book the room', 'Send invites']]);
  expect(opsOf(heard.slice(told)).filter((op) => !aMove(op))).toStrictEqual([]);
});

test('carried only, Mod+Z takes each move back as a move, the card and its row where they were; a redo makes it again; another’s ops are carried', async () => {
  const FOUR = HEAD + 'A | To do | Ana\nB | Doing | Ben\nC | Doing |\nD | Done |\n';
  const { el, last, heard, applyRemote } = await editor(FOUR);
  el.carryOnly = true;
  await settle(el);
  // B across with Mod+Alt+Right (its cell and its row), then along Done with Alt+Up (its row).
  await el.focusTitle(1);
  await settle(el);
  key(title(el, 1, 0).tx, 'ArrowRight', { altKey: true, ctrlKey: true });
  await settle(el);
  expect(opsOf(heard).map((o) => o.op)).toEqual(['cells', 'rows', 'rows']);
  key(title(el, 2, 1).tx, 'ArrowUp', { altKey: true });
  await settle(el);
  const moved = last()!;
  expect(drawn(el).slice(1)).toEqual([
    ['Doing', ['C']],
    ['Done', ['B', 'D']],
  ]);
  // Mod+Z twice, as the page's keys: each move taken back as a move, the document as it was.
  const told = heard.length;
  key(title(el, 2, 0).tx, 'z', { ctrlKey: true });
  await settle(el);
  expect(drawn(el)[2]).toEqual(['Done', ['D', 'B']]);
  key(title(el, 2, 1).tx, 'z', { ctrlKey: true });
  await settle(el);
  expect(last()).toBe(FOUR);
  expect(opsOf(heard.slice(told)).map((o) => o.op)).toEqual(['rows', 'rows', 'rows', 'rows', 'cells']);
  expect(movesOnly(moved, opsOf(heard.slice(told)))).toBe(true);
  // Nothing more to take back: what the board was given is out of reach.
  const none = heard.length;
  await undo(el);
  expect(heard.length).toBe(none);
  // A redo makes each move again, as a move.
  for (let i = 0; i < 2; i++) {
    el.dispatchEvent(new CustomEvent('docredo', { cancelable: true }));
    await settle(el);
  }
  expect(last()).toBe(moved);
  expect(movesOnly(FOUR, opsOf(heard.slice(none)))).toBe(true);
  // Someone else carries C to To do; an undo here takes back B's last move alone, still as a move.
  const remote = moveCard(parse(moved), 1, 'To do', 0);
  applyRemote(remote);
  await settle(el);
  const theirs = write(applyAll(parse(moved), remote));
  const mine = heard.length;
  await undo(el);
  expect(drawn(el)).toEqual([
    ['To do', ['C', 'A']],
    ['Doing', []],
    ['Done', ['D', 'B']],
  ]);
  expect(movesOnly(theirs, opsOf(heard.slice(mine)))).toBe(true);
  expect(write(applyAll(parse(theirs), opsOf(heard.slice(mine))))).toBe(last());
});

test('carried only, an undo of an edit made before is refused; a new document’s history starts over', async () => {
  const { el, last, heard } = await editor();
  await caretIn(el, title(el, 0, 0));
  await type(el, () => title(el, 0, 0), '!');
  const typed = HEAD + A + 'Book the room! | To do | Ben\n' + C;
  expect(last()).toBe(typed);
  el.carryOnly = true;
  await settle(el);
  const told = heard.length;
  await undo(el);
  expect(last()).toBe(typed);
  expect(heard.length).toBe(told);
  // Given a new document, the board's moves are undone again.
  el.value = BOARD;
  await settle(el);
  const to = lanes(el)[2].getBoundingClientRect();
  drag(grip(el, 0, 0), to.left + 40, to.bottom - 6, 14);
  await settle(el);
  expect(drawn(el)[2]).toEqual(['Done', ['Book the room']]);
  await undo(el);
  expect(last()).toBe(BOARD);
  expect(opsOf(heard.slice(told)).filter((op) => !aMove(op))).toStrictEqual([]);
});

test('carried only and pickable: a click on a card, its title too, and Enter on its title pick it; its grip still chooses and carries it', async () => {
  const { el, last } = await editor();
  const picks: Picked[] = [];
  el.addEventListener('docpick', (e) => picks.push((e as DocPick).detail));
  Object.assign(el, { carryOnly: true, pickable: true });
  await settle(el);
  title(el, 1, 1).tx.click();
  cards(el, 1)[0].querySelector<HTMLElement>('.board-fields')!.click();
  title(el, 0, 0).tx.focus();
  key(title(el, 0, 0).tx, 'Enter');
  await settle(el);
  expect(picks).toStrictEqual([
    { at: 0, row: 2 },
    { at: 0, row: 0 },
    { at: 0, row: 1 },
  ]);
  await tapGrip(el, 0, 0);
  expect(ranged(el)).toEqual(['Book the room']);
  // Enter on it, chosen whole, picks it too.
  key(el.querySelector<HTMLElement>('.board')!, 'Enter');
  expect(picks.at(-1)).toStrictEqual({ at: 0, row: 1 });
  const to = cards(el, 1)[1].getBoundingClientRect();
  drag(grip(el, 0, 0), to.left + 40, to.top + 4, 15);
  await settle(el);
  expect(last()).toBe(HEAD + A + 'Book the room | Doing | Ben\n' + C);
  expect(picks).toHaveLength(4);
});
