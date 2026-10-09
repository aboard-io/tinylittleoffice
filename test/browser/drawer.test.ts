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
  find.value = 'processor';
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

test('Cancel on "Save nothing on this device" leaves things kept and puts the switch back on', async () => {
  const { setPrivate } = await import('../../src/kit/privacy.ts');
  const { keeping } = await import('../../src/kit/store.ts');
  await setPrivate(false);
  expect(keeping()).toBe(true);
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector<HTMLDialogElement>('dialog.to-drawer')?.open);
  const box = shell.querySelector<HTMLInputElement>('dialog.to-drawer input[role=switch]')!;
  expect(box.checked).toBe(true);
  const ask = window.confirm;
  window.confirm = () => false;
  try {
    // What the browser does on a tap: the box flips, then change fires.
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await until(() => box.checked);
    expect(keeping()).toBe(true);
    // Said yes: the device forgets, and the switch is off.
    window.confirm = () => true;
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await until(() => !keeping());
    expect(box.checked).toBe(false);
  } finally {
    window.confirm = ask;
    await setPrivate(true);
  }
});
