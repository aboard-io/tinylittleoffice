// The Todo editor in a real browser: rows from the document; typing, Enter and Backspace per row; a tap ticks, the
// star toggles, the menu sets a date, moves and deletes; Alt+arrows and Mod+Enter on the keys; the filter, clear
// done, Insert, undo; and at phone width a row is a finger tall, the bar one row, the page never wider.
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import '../editor.ts';
import type { ToTodoEditor } from '../editor.ts';
import { caret } from '../../../kit/textops.ts';
import type { ToText } from '../../../kit/text.ts';
import { tick, until } from '../../../../test/browser/helpers.ts';
import '../../../styles.css';

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
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    await focusEnd(el, 1);
    await type(el, 1, ' now');
    expect(document.scrollingElement!.scrollTop).toBe(0);
    expect(parseFloat(getComputedStyle(text(el, 1).tx).fontSize)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(getComputedStyle(rows(el)[1].querySelector('input[type=date]')!).fontSize)).toBeGreaterThanOrEqual(16);
    expect(barEl.offsetHeight).toBeLessThanOrEqual(56);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  } finally {
    await page.viewport(1100, 800);
  }
});
