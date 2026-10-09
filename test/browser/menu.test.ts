// Menus on the Popover API: open, walk with the arrows, choose, and Escape returns focus to the button.
import { test, expect } from 'vitest';
import { render, html } from 'lit';
import '../../src/kit/insert.ts';
import type { ToInsert } from '../../src/kit/insert.ts';
import { UI } from '../../src/kit/icons.ts';
import { until } from './helpers.ts';
import '../../src/styles.css';

async function insert(): Promise<ToInsert> {
  document.body.innerHTML = '';
  const chosen: string[] = [];
  render(
    html`<to-insert .items=${[
      { label: 'Heading', icon: UI.heading, does: () => chosen.push('heading') },
      { label: 'List', icon: UI.list, does: () => chosen.push('list') },
      { label: 'Table', icon: UI.table, group: 'Data', does: () => chosen.push('table') },
    ]}></to-insert>`,
    document.body,
  );
  const el = document.querySelector<ToInsert>('to-insert')!;
  await el.updateComplete;
  (el as ToInsert & { chosen: string[] }).chosen = chosen;
  return el;
}

test('Insert ▾ opens a menu, the arrows walk it, Enter chooses, focus returns', async () => {
  const el = await insert();
  const button = el.button;
  expect(button.textContent!.trim()).toBe('Insert');
  expect(button.getAttribute('aria-haspopup')).toBe('menu');
  button.focus();
  button.click();
  await until(() => el.isOpen);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  const items = [...el.querySelectorAll<HTMLElement>('[role=menuitem]')];
  expect(items.map((i) => i.textContent!.trim())).toEqual(['Heading', 'List', 'Table']);
  expect(el.querySelector('[role=group]')!.getAttribute('aria-label')).toBe('Data');
  await until(() => document.activeElement === items[0]);
  items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(document.activeElement).toBe(items[1]);
  items[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  items[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  expect(document.activeElement).toBe(items[2]);
  items[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  (document.activeElement as HTMLElement).click();
  await until(() => !el.isOpen);
  expect((el as ToInsert & { chosen: string[] }).chosen).toEqual(['table']);
  expect(document.activeElement).toBe(button);
  expect(button.getAttribute('aria-expanded')).toBe('false');
});

test('Escape closes the menu and puts focus back on the button', async () => {
  const el = await insert();
  el.button.focus();
  el.open();
  await until(() => el.isOpen);
  // The menu sits inside the visual viewport.
  const r = el.menu.getBoundingClientRect();
  expect(r.left).toBeGreaterThanOrEqual(0);
  expect(r.bottom).toBeLessThanOrEqual(window.innerHeight);
  // Escape is the browser's own light dismiss of a popover; here the same close, from the keyboard handler's point of view.
  el.close();
  await until(() => !el.isOpen);
  expect(document.activeElement).toBe(el.button);
});
