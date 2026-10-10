// The Todo editor in a real browser: rows from the document; typing, Enter and Backspace per row; a tap ticks, the
// star toggles, the menu sets a date, moves and deletes; Alt+arrows and Mod+Enter on the keys; the filter, clear
// done, Insert, undo; and at phone width a row is a finger tall, the bar one row, the page never wider.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
// The cascade's order is declared by the stylesheet, so it comes before the app's own (as in main.ts).
import '../../../styles.css';
import '../editor.ts';
import type { ToTodoEditor } from '../editor.ts';
import { caret } from '../../../kit/textops.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import { remScale } from '../../../kit/zoom.ts';

const LIST = '- [x] Buy milk\n- [ ] Call the printer {.star due=2020-02-01}\n- [ ] Pay rent {due=2999-03-01}\n';

async function editor(value = LIST): Promise<{ el: ToTodoEditor; changes: string[]; last: () => string | undefined }> {
  document.body.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'to-main';
  document.body.append(main);
  const el = document.createElement('to-todo-editor') as ToTodoEditor;
  el.value = value;
  const changes: string[] = [];
  el.addEventListener('docchange', (e) => changes.push((e as CustomEvent<string>).detail));
  main.append(el);
  await el.updateComplete;
  return { el, changes, last: () => changes.at(-1) };
}
const rows = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.todo-row')];
const words = (el: HTMLElement) => rows(el).map((r) => r.querySelector('.tx')!.textContent!.trim());
const text = (el: HTMLElement, at: number) => el.querySelector<ToText>(`to-text[data-at="${at}"]`)!;
const settle = async (el: ToTodoEditor) => {
  await el.updateComplete;
  await tick(20);
  await el.updateComplete;
};
async function focusEnd(el: ToTodoEditor, at: number, end = 99) {
  const x = text(el, at);
  await x.updateComplete;
  x.sel = caret(0, Math.min(end, x.blocks[0] && 'runs' in x.blocks[0] ? x.blocks[0].runs.reduce((n, r) => n + r.t.length, 0) : 0));
  await x.updateComplete;
  await tick();
}
const input = (x: ToText, inputType: string, data: string | null = null) => x.tx.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true, composed: true }));
async function type(el: ToTodoEditor, at: number, s: string) {
  for (const ch of s) {
    input(text(el, at), 'insertText', ch);
    await el.updateComplete;
    await tick();
  }
}
async function pick(el: ToTodoEditor, opener: HTMLElement, label: string) {
  opener.click();
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const items = [...document.querySelectorAll<HTMLElement>('[popover]:popover-open [role^=menuitem]')];
  const item = items.find((x) => x.textContent!.includes(label));
  if (!item) throw new Error(`no item ${label} among ${items.map((x) => x.textContent!.trim()).join(' | ')}`);
  item.click();
  await settle(el);
}
const bar = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`to-bar button[aria-label="${label}"]`)!;
const undo = async (el: ToTodoEditor) => {
  el.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
  await settle(el);
};

test('rows from the document: the box, the words, the star, the date; an overdue open task is marked', async () => {
  const { el } = await editor();
  expect(words(el)).toEqual(['Buy milk', 'Call the printer', 'Pay rent']);
  const [a, b, c] = rows(el);
  expect(a.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);
  expect(a.classList.contains('done')).toBe(true);
  expect(b.querySelector('.todo-star')!.getAttribute('aria-pressed')).toBe('true');
  expect(c.querySelector('.todo-star')!.getAttribute('aria-pressed')).toBe('false');
  expect(b.querySelector<HTMLInputElement>('input[type=date]')!.value).toBe('2020-02-01');
  expect(b.classList.contains('late')).toBe(true);
  expect(c.classList.contains('late')).toBe(false);
  expect(a.querySelector('input[type=date]')).toBeNull();
  expect(el.querySelector('.todo-count')!.textContent).toBe('1 of 3 done');
  // The box has a name that says whose it is.
  expect(a.querySelector('input[type=checkbox]')!.getAttribute('aria-label')).toBe('Done: Buy milk');
});

test('typing writes the task; a burst is one undo; Enter starts the next task and the caret goes to it', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two\n');
  await focusEnd(el, 0);
  await type(el, 0, ' more');
  expect(last()).toBe('- [ ] one more\n- [ ] two\n');
  input(text(el, 0), 'insertParagraph');
  await settle(el);
  expect(last()).toBe('- [ ] one more\n- [ ]\n- [ ] two\n');
  expect(words(el)).toEqual(['one more', '', 'two']);
  expect(document.activeElement).toBe(text(el, 1).tx);
  await type(el, 1, 'new');
  expect(last()).toBe('- [ ] one more\n- [ ] new\n- [ ] two\n');
  await undo(el);
  expect(last()).toBe('- [ ] one more\n- [ ]\n- [ ] two\n');
  await undo(el);
  await undo(el);
  expect(last()).toBe('- [ ] one\n- [ ] two\n');
});

test('Enter in an empty last task adds no more; Backspace in an empty task takes it away and the caret goes up', async () => {
  const { el, last, changes } = await editor('- [ ] one\n- [ ]\n');
  await focusEnd(el, 1);
  const n = changes.length;
  input(text(el, 1), 'insertParagraph');
  await settle(el);
  expect(changes).toHaveLength(n);
  input(text(el, 1), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('- [ ] one\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  // A task with words stays at its start, and the only task is never taken away.
  await focusEnd(el, 0, 0);
  const m = changes.length;
  input(text(el, 0), 'deleteContentBackward');
  await settle(el);
  expect(changes).toHaveLength(m);
  expect(words(el)).toEqual(['one']);
});

test('a tap on the box ticks, the star toggles; both undo', async () => {
  const { el, last } = await editor();
  rows(el)[2].querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
  await settle(el);
  expect(last()).toBe('- [x] Buy milk\n- [ ] Call the printer {.star due=2020-02-01}\n- [x] Pay rent {due=2999-03-01}\n');
  expect(el.querySelector('.todo-count')!.textContent).toBe('2 of 3 done');
  rows(el)[2].querySelector<HTMLButtonElement>('.todo-star')!.click();
  await settle(el);
  expect(last()).toContain('- [x] Pay rent {.star due=2999-03-01}');
  expect(rows(el)[2].querySelector('.todo-star')!.getAttribute('aria-pressed')).toBe('true');
  await undo(el);
  await undo(el);
  expect(last()).toBe(LIST);
  expect(rows(el)[2].querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false);
});

test('the row menu: a due date is asked for, then written; it can be taken away; move and delete', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two\n- [ ] three\n');
  const more = (i: number) => rows(el)[i].querySelector<HTMLButtonElement>('.todo-more')!;
  await pick(el, more(0), 'Due date');
  const date = rows(el)[0].querySelector<HTMLInputElement>('input[type=date]')!;
  expect(date).not.toBeNull();
  date.value = '2999-12-24';
  date.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
  expect(last()).toBe('- [ ] one {due=2999-12-24}\n- [ ] two\n- [ ] three\n');
  await pick(el, more(0), 'No due date');
  expect(last()).toBe('- [ ] one\n- [ ] two\n- [ ] three\n');
  expect(rows(el)[0].querySelector('input[type=date]')).toBeNull();
  await pick(el, more(0), 'Move down');
  expect(last()).toBe('- [ ] two\n- [ ] one\n- [ ] three\n');
  // The first task cannot go up, the last cannot go down.
  opener(more(0));
  await until(() => !!document.querySelector('[popover]:popover-open'));
  const up = [...document.querySelectorAll<HTMLButtonElement>('[popover]:popover-open [role^=menuitem]')].find((x) => x.textContent!.includes('Move up'))!;
  expect(up.disabled).toBe(true);
  (document.querySelector('[popover]:popover-open') as HTMLElement).hidePopover();
  await pick(el, more(1), 'Delete task');
  expect(last()).toBe('- [ ] two\n- [ ] three\n');
});
function opener(b: HTMLElement) {
  b.click();
}

test('the keys: Alt+Down moves the task and keeps the caret in it; Mod+Enter ticks', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two\n- [ ] three\n');
  await focusEnd(el, 0);
  text(el, 0).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toBe('- [ ] two\n- [ ] one\n- [ ] three\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(words(el)[1]).toBe('one');
  text(el, 1).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toBe('- [ ] one\n- [ ] two\n- [ ] three\n');
  text(el, 2).tx.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
  await settle(el);
  expect(last()).toBe('- [ ] one\n- [ ] two\n- [x] three\n');
});

test('the bar: Show keeps the open or the done; Clear done takes the ticked away; Insert adds a task after the caret', async () => {
  const { el, last } = await editor('- [x] a\n- [ ] b\n- [x] c\n- [ ] d\n');
  await pick(el, el.querySelector<HTMLButtonElement>('to-menu.todo-show button')!, 'Open');
  expect(words(el)).toEqual(['b', 'd']);
  await pick(el, el.querySelector<HTMLButtonElement>('to-menu.todo-show button')!, 'Done');
  expect(words(el)).toEqual(['a', 'c']);
  await pick(el, el.querySelector<HTMLButtonElement>('to-menu.todo-show button')!, 'All');
  await focusEnd(el, 1);
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Task');
  expect(last()).toBe('- [x] a\n- [ ] b\n- [ ]\n- [x] c\n- [ ] d\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  bar(el, 'Clear done').click();
  await settle(el);
  expect(last()).toBe('- [ ] b\n- [ ]\n- [ ] d\n');
  expect(bar(el, 'Clear done').disabled).toBe(true);
  expect(bar(el, 'Undo').disabled).toBe(false);
  bar(el, 'Undo').click();
  await settle(el);
  expect(last()).toBe('- [x] a\n- [ ] b\n- [ ]\n- [x] c\n- [ ] d\n');
});

test('an empty list says so, and Insert makes the first task', async () => {
  const { el, last } = await editor('');
  expect(el.querySelector('.todo-empty')!.textContent).toContain('Nothing to do yet');
  await pick(el, el.querySelector<HTMLButtonElement>('to-insert button')!, 'Task');
  expect(last()).toBe('- [ ]\n');
  expect(rows(el)).toHaveLength(1);
});

test('at phone width: a row is a finger tall, the bar is one row, nothing is wider than the screen, and typing does not scroll the page', async () => {
  await page.viewport(390, 844);
  try {
    const { el } = await editor(LIST);
    for (const r of rows(el)) expect(r.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    for (const b of el.querySelectorAll<HTMLElement>('.todo-row input[type=checkbox], .todo-star, .todo-more')) {
      const box = (b.closest('label') ?? b).getBoundingClientRect();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const barEl = el.querySelector<HTMLElement>('to-bar')!;
    const tops = new Set([...barEl.children].filter((x) => (x as HTMLElement).offsetWidth > 0).map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(tops.size).toBe(1);
    expect(Math.round(barEl.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await focusEnd(el, 1);
    await type(el, 1, ' now');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(parseFloat(getComputedStyle(text(el, 1).tx).fontSize)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(getComputedStyle(rows(el)[1].querySelector('input[type=date]')!).fontSize)).toBeGreaterThanOrEqual(16);
    expect(Math.round(barEl.getBoundingClientRect().height / remScale())).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});

/* ---------- the editing standard (docs/editing.md §1, §3, §6, §7) ---------- */

const key = (on: HTMLElement, k: string, o: KeyboardEventInit = {}) => on.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, composed: true, ...o }));
const offsetIn = (el: HTMLElement, at: number) => text(el, at).sel?.focus.offset;
const ranged = (el: HTMLElement) =>
  rows(el)
    .filter((r) => r.classList.contains('ranged'))
    .map((r) => Number(r.dataset.at));
const box = (el: HTMLElement) => el.querySelector<HTMLElement>('.todo-list')!;
const contextButton = (el: HTMLElement, label: string) => el.querySelector<HTMLButtonElement>(`.todo-context button[aria-label="${label}"]`)!;
const grip = (el: HTMLElement, i: number) => rows(el)[i].querySelector<HTMLElement>('.todo-grip')!;
async function tapGrip(el: ToTodoEditor, i: number, o: PointerEventInit = {}) {
  const g = grip(el, i);
  const r = g.getBoundingClientRect();
  for (const type of ['pointerdown', 'pointerup'])
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 3, isPrimary: true, button: 0, pointerType: 'mouse', clientX: r.left + 3, clientY: r.top + 3, ...o }));
  g.click();
  await settle(el);
}
async function clip(el: ToTodoEditor, type: 'copy' | 'cut' | 'paste', on: HTMLElement, data: Record<string, string> = {}) {
  const dt = new DataTransfer();
  for (const [k, v] of Object.entries(data)) dt.setData(k, v);
  on.dispatchEvent(new ClipboardEvent(type, { clipboardData: dt, bubbles: true, cancelable: true }));
  await settle(el);
  return dt;
}

test('Enter at the start of words pushes the task down, in the middle splits it; the caret goes with the words', async () => {
  const { el, last } = await editor('- [x] Buy milk {.star}\n- [ ] two\n');
  await focusEnd(el, 0, 0);
  input(text(el, 0), 'insertParagraph');
  await settle(el);
  expect(last()).toBe('- [ ]\n- [x] Buy milk {.star}\n- [ ] two\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(0);
  await focusEnd(el, 1, 4);
  input(text(el, 1), 'insertParagraph');
  await settle(el);
  expect(last()).toBe('- [ ]\n- [x] Buy {.star}\n- [ ] milk\n- [ ] two\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  expect(offsetIn(el, 2)).toBe(0);
});

test('Backspace at the start joins the task to the one before; Delete at the end joins the next in; Delete in an empty task goes down', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two\n- [ ]\n- [ ] four\n');
  await focusEnd(el, 1, 0);
  input(text(el, 1), 'deleteContentBackward');
  await settle(el);
  expect(last()).toBe('- [ ] onetwo\n- [ ]\n- [ ] four\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  expect(offsetIn(el, 0)).toBe(3);
  // Delete in the empty task takes it away; the caret goes to the start of the task below.
  await focusEnd(el, 1, 0);
  input(text(el, 1), 'deleteContentForward');
  await settle(el);
  expect(last()).toBe('- [ ] onetwo\n- [ ] four\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(0);
  await focusEnd(el, 0);
  input(text(el, 0), 'deleteContentForward');
  await settle(el);
  expect(last()).toBe('- [ ] onetwofour\n');
  expect(offsetIn(el, 0)).toBe(6);
  // Undo puts the caret back where it was.
  await undo(el);
  expect(last()).toBe('- [ ] onetwo\n- [ ] four\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  expect(offsetIn(el, 0)).toBe(6);
});

test('Up and Down go from task to task; Left at the start and Right at the end too', async () => {
  const { el } = await editor('- [ ] one\n- [ ] two\n');
  await focusEnd(el, 0, 2);
  key(text(el, 0).tx, 'ArrowDown');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(2);
  key(text(el, 1).tx, 'ArrowUp');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 0).tx);
  await focusEnd(el, 0);
  key(text(el, 0).tx, 'ArrowRight');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(0);
  key(text(el, 1).tx, 'ArrowLeft');
  await settle(el);
  expect(document.activeElement).toBe(text(el, 0).tx);
  expect(offsetIn(el, 0)).toBe(3);
});

test('Alt+Up/Down keep the caret where it was in the words; Mod+D duplicates the task with the caret in the copy', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two {.star}\n');
  await focusEnd(el, 1, 1);
  key(text(el, 1).tx, 'ArrowUp', { altKey: true });
  await settle(el);
  expect(last()).toBe('- [ ] two {.star}\n- [ ] one\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  expect(offsetIn(el, 0)).toBe(1);
  const d = key(text(el, 0).tx, 'd', { ctrlKey: true });
  expect(d).toBe(false);
  await settle(el);
  expect(last()).toBe('- [ ] two {.star}\n- [ ] two {.star}\n- [ ] one\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(1);
  await undo(el);
  expect(last()).toBe('- [ ] two {.star}\n- [ ] one\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  expect(offsetIn(el, 0)).toBe(1);
});

test('Escape in the words chooses the task; Shift+Down extends; Delete takes them away and undo chooses them again', async () => {
  const { el, last } = await editor('- [ ] a\n- [ ] b\n- [ ] c\n- [ ] d\n');
  await focusEnd(el, 1);
  key(text(el, 1).tx, 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual([1]);
  expect(document.activeElement).toBe(box(el));
  // Typing a letter with a task chosen does nothing to it.
  key(box(el), 'x');
  key(box(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([1, 2]);
  expect(rows(el)[1].querySelector('.todo-grip')!.getAttribute('aria-pressed')).toBe('true');
  key(box(el), 'Delete');
  await settle(el);
  expect(last()).toBe('- [ ] a\n- [ ] d\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  await undo(el);
  expect(last()).toBe('- [ ] a\n- [ ] b\n- [ ] c\n- [ ] d\n');
  expect(ranged(el)).toEqual([1, 2]);
  expect(document.activeElement).toBe(box(el));
  // Escape again: the caret back in the words.
  key(box(el), 'Escape');
  await settle(el);
  expect(ranged(el)).toEqual([]);
  expect(document.activeElement).toBe(text(el, 2).tx);
});

test('Shift+Up from the words chooses; Alt+Down moves the chosen tasks and Mod+D duplicates them, the range kept', async () => {
  const { el, last } = await editor('- [ ] a\n- [ ] b\n- [ ] c\n');
  await focusEnd(el, 0);
  key(text(el, 0).tx, 'ArrowDown', { shiftKey: true });
  await settle(el);
  key(box(el), 'ArrowDown', { shiftKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1]);
  key(box(el), 'ArrowDown', { altKey: true });
  await settle(el);
  expect(last()).toBe('- [ ] c\n- [ ] a\n- [ ] b\n');
  expect(ranged(el)).toEqual([1, 2]);
  key(box(el), 'd', { metaKey: true });
  await settle(el);
  expect(last()).toBe('- [ ] c\n- [ ] a\n- [ ] b\n- [ ] a\n- [ ] b\n');
  expect(ranged(el)).toEqual([3, 4]);
});

test('Select All in the words twice takes every task', async () => {
  const { el } = await editor('- [ ] one\n- [ ] two\n');
  const x = text(el, 0);
  x.focus();
  x.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 3 } };
  await settle(el);
  key(x.tx, 'a', { ctrlKey: true });
  await settle(el);
  expect(ranged(el)).toEqual([0, 1]);
});

test('a tap on the grip chooses the task with the bar under it in the standard order; Shift+tap extends; the bar duplicates and deletes', async () => {
  const { el, last } = await editor('- [ ] a\n- [ ] b\n- [ ] c\n');
  await tapGrip(el, 0);
  expect(ranged(el)).toEqual([0]);
  const bar = el.querySelector('.todo-context .to-context')!;
  expect(bar.matches(':popover-open')).toBe(true);
  expect([...bar.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Copy', 'Cut', 'Paste', 'Delete']);
  await tapGrip(el, 1, { shiftKey: true });
  expect(ranged(el)).toEqual([0, 1]);
  contextButton(el, 'Duplicate').click();
  await settle(el);
  expect(last()).toBe('- [ ] a\n- [ ] b\n- [ ] a\n- [ ] b\n- [ ] c\n');
  contextButton(el, 'Delete').click();
  await settle(el);
  expect(last()).toBe('- [ ] a\n- [ ] b\n- [ ] c\n');
  await tapGrip(el, 2);
  contextButton(el, 'Edit').click();
  await settle(el);
  expect(document.activeElement).toBe(text(el, 2).tx);
});

test('Mod+C/X/V on chosen tasks: TLO and our HTML out, tasks back in place of the chosen; a paste of lines in words makes tasks', async () => {
  const { el, last } = await editor('- [x] a {.star}\n- [ ] b\n- [ ] c\n');
  await tapGrip(el, 0);
  const out = await clip(el, 'copy', box(el));
  expect(out.getData('text/plain')).toBe('- [x] a {.star}\n');
  expect(out.getData('text/html')).toContain('content="TinyLittleOffice"');
  await tapGrip(el, 1);
  const cut = await clip(el, 'cut', box(el));
  expect(cut.getData('text/plain')).toBe('- [ ] b\n');
  expect(last()).toBe('- [x] a {.star}\n- [ ] c\n');
  await tapGrip(el, 1);
  await clip(el, 'paste', box(el), { 'text/plain': out.getData('text/plain'), 'text/html': out.getData('text/html') });
  expect(last()).toBe('- [x] a {.star}\n- [x] a {.star}\n');
  // Lines pasted into a task's words are tasks after it, the caret at the end of the last.
  await focusEnd(el, 1);
  await clip(el, 'paste', text(el, 1).tx, { 'text/plain': 'Eggs\nFlour\n' });
  expect(last()).toBe('- [x] a {.star}\n- [x] a {.star}\n- [ ] Eggs\n- [ ] Flour\n');
  expect(document.activeElement).toBe(text(el, 3).tx);
  // A list from elsewhere as HTML too.
  await clip(el, 'paste', text(el, 3).tx, { 'text/plain': 'x\ny', 'text/html': '<ul><li>Milk</li><li><b>Jam</b></li></ul>' });
  expect(last()).toBe('- [x] a {.star}\n- [x] a {.star}\n- [ ] Eggs\n- [ ] Flour\n- [ ] Milk\n- [ ] **Jam**\n');
  // Words alone are the task's own.
  await focusEnd(el, 5);
  await clip(el, 'paste', text(el, 5).tx, { 'text/plain': ' too' });
  expect(last()).toContain('- [ ] **Jam** too\n');
});

test('a drag by the grip (pointer events) moves the task after another, with the target drawn', async () => {
  const { el, last } = await editor('- [ ] a\n- [ ] b\n- [ ] c\n');
  const g = grip(el, 0);
  const h = g.getBoundingClientRect();
  const c = rows(el)[2].getBoundingClientRect();
  const at = (type: string, x: number, y: number) =>
    g.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, pointerType: 'mouse', clientX: x, clientY: y }));
  at('pointerdown', h.left + 4, h.top + 4);
  at('pointermove', c.left + 100, c.top + c.height / 2);
  await el.updateComplete;
  expect(el.rows.drag).toMatchObject({ id: 0, over: 2, how: 'after' });
  expect(rows(el)[0].classList.contains('dragging')).toBe(true);
  expect(document.querySelector<HTMLElement>('.to-rows-target')!.hidden).toBe(false);
  at('pointerup', c.left + 100, c.top + c.height / 2);
  await settle(el);
  expect(last()).toBe('- [ ] b\n- [ ] c\n- [ ] a\n');
  expect(document.activeElement).toBe(text(el, 2).tx);
  expect(getComputedStyle(grip(el, 0)).touchAction).toBe('none');
  expect(grip(el, 0).getAttribute('draggable')).toBeNull();
});

test('undo puts the caret back where the typing began; Delete task in the menu leaves the caret in the task before', async () => {
  const { el, last } = await editor('- [ ] one\n- [ ] two\n- [ ] three\n');
  await focusEnd(el, 1, 1);
  await type(el, 1, 'XY');
  expect(last()).toBe('- [ ] one\n- [ ] tXYwo\n- [ ] three\n');
  await focusEnd(el, 0);
  await undo(el);
  expect(last()).toBe('- [ ] one\n- [ ] two\n- [ ] three\n');
  expect(document.activeElement).toBe(text(el, 1).tx);
  expect(offsetIn(el, 1)).toBe(1);
  await pick(el, rows(el)[1].querySelector<HTMLButtonElement>('.todo-more')!, 'Delete task');
  expect(last()).toBe('- [ ] one\n- [ ] three\n');
  expect(document.activeElement).toBe(text(el, 0).tx);
  await pick(el, rows(el)[1].querySelector<HTMLButtonElement>('.todo-more')!, 'Duplicate');
  expect(last()).toBe('- [ ] one\n- [ ] three\n- [ ] three\n');
});

test('the bar ends with Undo and Redo; the star keeps the focus in the words; the list never zooms on a double tap', async () => {
  const { el } = await editor();
  const tools = [...el.querySelectorAll<HTMLElement>('to-bar > *')].filter((x) => x.offsetWidth > 0);
  expect(tools.slice(-2).map((b) => b.getAttribute('aria-label'))).toEqual(['Undo', 'Redo']);
  await focusEnd(el, 1);
  const star = rows(el)[1].querySelector<HTMLButtonElement>('.todo-star')!;
  expect(star.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
  expect(getComputedStyle(box(el)).touchAction).toBe('manipulation');
  // Keys from a field of the row are not the words': Alt+Down on the date input moves nothing.
  const n = el.value;
  key(rows(el)[1].querySelector<HTMLElement>('input[type=date]')!, 'ArrowDown', { altKey: true });
  await settle(el);
  expect(el.value).toBe(n);
});

test("§1 opens with the focus in the first task's words, the caret at their end, the page not scrolled", async () => {
  const { el } = await editor();
  await el.focusFirst();
  expect(text(el, 0).hasFocus()).toBe(true);
  expect(text(el, 0).sel?.focus).toEqual({ block: 0, offset: 'Buy milk'.length });
  const { el: blank } = await editor('- [ ]\n');
  await blank.focusFirst();
  expect(text(blank, 0).hasFocus()).toBe(true);
  expect(document.scrollingElement!.scrollTop).toBe(0);
});
