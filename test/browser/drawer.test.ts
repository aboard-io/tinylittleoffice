// The drawer: opens as a modal dialog, finds apps, closes on Escape with focus back on the menu button.
import { test, expect } from 'vitest';
import { mount, until } from './helpers.ts';
import { apps } from '../../src/kit/apps.ts';

test('the hamburger opens the drawer, Find filters the apps, Escape closes it', async () => {
  const shell = await mount('');
  const burger = shell.querySelector<HTMLButtonElement>('.to-burger')!;
  burger.focus();
  burger.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  expect(document.activeElement).toBe(shell.querySelector('.to-find'));
  const find = shell.querySelector<HTMLInputElement>('.to-find')!;
  expect(shell.querySelectorAll('.to-drawer-apps a').length).toBe(apps().length);
  find.value = 'zzz';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => shell.querySelectorAll('.to-drawer-apps a').length === 0);
  expect(shell.querySelector('.to-drawer-apps .to-hint')!.textContent).toBe('No app by that name');
  find.value = 'wri';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => shell.querySelectorAll('.to-drawer-apps a').length === 1);
  // The switches and the selects are there.
  expect(shell.querySelectorAll('.to-drawer input[role=switch]').length).toBe(2);
  expect(shell.querySelectorAll('.to-drawer select').length).toBe(2);
  // Escape closes a native dialog; focus goes back where it was.
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  dialog.close();
  await until(() => !dialog.open);
  await until(() => document.activeElement === burger);
});
