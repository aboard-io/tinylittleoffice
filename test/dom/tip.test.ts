// The one tooltip (src/kit/tip.ts): hover and keyboard focus on a desktop, a long press on a phone (ported from e2e/tip.spec.ts).
import { test, expect } from 'vitest';
import { button, press, setSl, settle } from './helpers.ts';
import { shell, editorOf, settleAll, until } from './helpers-apps.ts';
import { parseTodos } from '../../src/lib/todomodel.ts';

const tip = () => document.getElementById('to-tip');
const isOpen = () => !!tip()?.classList.contains('open');
const shellEl = () => document.querySelector('to-app')!;
const pointer = (el: Element, type: string, pointerType: string, extra: PointerEventInit = {}) =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerType, isPrimary: true, pointerId: 1, clientX: 10, clientY: 10, ...extra }));

test('a tip on hover and on focus, and none when the pointer leaves', async () => {
  await shell('#/v0/todo');
  const undo = button(shellEl(), 'Undo');
  pointer(undo, 'pointerover', 'mouse');
  await until(() => expect(isOpen()).toBe(true));
  expect(tip()!.textContent).toMatch(/^Undo \(/);
  pointer(undo, 'pointerout', 'mouse', { relatedTarget: document.body });
  expect(isOpen()).toBe(false);
  // A keyboard focus shows it too, Escape puts it away.
  press(document.body, 'Tab');
  button(shellEl(), 'Share').dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }));
  expect(isOpen()).toBe(true);
  expect(tip()!.textContent).toBe('Share');
  press(document.body, 'Escape');
  expect(isOpen()).toBe(false);
});

test('a long press shows the tip and is not a tap', async () => {
  await shell('#/v0/todo');
  const todo = editorOf('todo');
  const add = todo.querySelector('sl-input.todo-new')!;
  setSl(add, 'Milk', 'sl-input');
  press(add, 'Enter');
  await settle(todo);
  await settleAll();
  expect(parseTodos(todo.value).map((t) => t.text)).toEqual(['Milk']);
  const del = button(todo, 'Delete task');
  pointer(del, 'pointerdown', 'touch');
  await until(() => expect(isOpen()).toBe(true));
  expect(tip()!.textContent).toBe('Delete task');
  pointer(del, 'pointerup', 'touch');
  del.click();
  await settle(todo);
  // The press was for the tip: the task is still there.
  expect(todo.querySelectorAll('.todo-list li')).toHaveLength(1);
  // A tap, though, deletes it.
  pointer(del, 'pointerdown', 'touch');
  pointer(del, 'pointerup', 'touch');
  del.click();
  await settle(todo);
  expect(todo.querySelectorAll('.todo-list li')).toHaveLength(0);
  expect(isOpen()).toBe(false);
});
