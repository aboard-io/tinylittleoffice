// The app is not kept on the device (Paul, 2026-10-10): the menu has no switch for it, and nothing registers a
// service worker, not the page at load and not a switch turned, even where a device was left with the old
// setting on. The browser's worker API is faked so a registration, if one were asked for, would be counted.
import { test, expect, afterEach, vi } from 'vitest';
import { mount, until } from './helpers.ts';
import { setKeeping } from '../../src/kit/store.ts';

const real = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
afterEach(() => {
  if (real) Object.defineProperty(navigator, 'serviceWorker', real);
  else delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  localStorage.removeItem('tinyoffice.offline');
  vi.restoreAllMocks();
  setKeeping(false);
});

test('no service worker: the drawer has no switch to keep the app, and nothing registers a worker', async () => {
  const registrations: unknown[] = [];
  const register = vi.fn(async () => (registrations.push({}), {}));
  Object.defineProperty(navigator, 'serviceWorker', { value: { register, ready: new Promise(() => {}), controller: null, getRegistrations: async () => [...registrations] }, configurable: true });
  // A device left with the old switch on, and Saved.
  setKeeping(true);
  localStorage.setItem('tinyoffice.offline', '1');
  await import('../../src/main.ts');
  const shell = await mount('#/v1/outline');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  const drawer = shell.querySelector('.to-drawer')!;
  expect(drawer.textContent).not.toContain('Keep the app on this device');
  // Every switch but Saved turned on, as a person turns it: none of them asks for a worker.
  for (const box of [...drawer.querySelectorAll<HTMLInputElement>('input[role=switch]')].slice(1)) {
    box.checked = !box.checked;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await new Promise((r) => setTimeout(r, 200));
  expect(register).not.toHaveBeenCalled();
  expect(await navigator.serviceWorker.getRegistrations()).toEqual([]);
});
