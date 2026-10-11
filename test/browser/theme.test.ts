// The theme: a choice in the menu sets data-theme on <html>; "auto" follows the device. Kept on the device in Private
// too, as the language and the size are (kit/store.ts).
import { test, expect, afterEach } from 'vitest';
import { setTheme, theme, applyTheme } from '../../src/kit/theme.ts';
import { mount, until } from './helpers.ts';

// This origin's localStorage is every browser test file's: the theme chosen here goes with the test.
afterEach(() => setTheme('auto'));

test('the Theme select in the drawer switches data-theme', async () => {
  setTheme('auto');
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  const select = [...shell.querySelectorAll<HTMLSelectElement>('.to-drawer select')].find((s) => [...s.options].some((o) => o.value === 'dark'))!;
  expect([...select.options].map((o) => o.textContent)).toEqual(['Match the device', 'Light', 'Dark']);
  select.value = 'dark';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(theme()).toBe('dark');
  // Private, and still on the device: a link opened tomorrow is dark too.
  expect(localStorage.getItem('to-theme')).toBe('dark');
  select.value = 'light';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.documentElement.dataset.theme).toBe('light');
  setTheme('auto');
  applyTheme();
  expect(document.documentElement.dataset.theme).toBe(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  // Back to the device's: nothing is written.
  expect(localStorage.getItem('to-theme')).toBeNull();
});
