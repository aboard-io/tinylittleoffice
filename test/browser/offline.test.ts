// The menu's switch that keeps the app on the device (src/kit/offline.ts), through the drawer, on a faked
// browser: it writes its state, registers the worker at the site's root and asks for the storage to persist,
// says how much is kept, and lets it all go; on a private visit it turns the device to Saved first, and Private
// again takes the copy away. (Ported from the old tree's test/dom/shell-offline.ts; the real worker, cold and
// offline, is e2e/offline.spec.ts.)
import { test, expect, afterEach, vi } from 'vitest';
import { mount, until } from './helpers.ts';
import { keeping, setKeeping, store } from '../../src/kit/store.ts';
import { dropOffline, offlineOn } from '../../src/kit/offline.ts';
import type { ToShell } from '../../src/kit/shell.ts';

const real = { sw: Object.getOwnPropertyDescriptor(navigator, 'serviceWorker'), storage: Object.getOwnPropertyDescriptor(navigator, 'storage') };
afterEach(async () => {
  store.remove('tinyoffice.offline');
  for (const [k, d] of Object.entries(real)) {
    if (d) Object.defineProperty(navigator, k === 'sw' ? 'serviceWorker' : 'storage', d);
    else delete (navigator as unknown as Record<string, unknown>)[k === 'sw' ? 'serviceWorker' : 'storage'];
  }
  vi.restoreAllMocks();
  await dropOffline();
  setKeeping(false);
  history.replaceState(null, '', location.pathname);
});

/** A browser's service-worker and storage APIs, as far as the switch uses them. */
function fakeBrowser() {
  const registrations: unknown[] = [];
  const reg = { installing: null, addEventListener: vi.fn(), unregister: vi.fn(async () => (registrations.splice(registrations.indexOf(reg), 1), true)) };
  const register = vi.fn(async () => (registrations.push(reg), reg));
  const sw = { register, ready: Promise.resolve(reg), controller: null, getRegistrations: vi.fn(async () => [...registrations]) };
  const persist = vi.fn(async () => true);
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
  Object.defineProperty(navigator, 'storage', { value: { persist, estimate: async () => ({ usage: 4_200_000, quota: 1e10 }) }, configurable: true });
  return { reg, register, persist };
}

async function menu(shell: ToShell) {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  return dialog;
}
const switches = (shell: ToShell) => [...shell.querySelectorAll<HTMLInputElement>('.to-drawer input[role=switch]')];
const theSwitch = (shell: ToShell) => switches(shell).find((s) => s.closest('label')!.textContent!.includes('Keep the app on this device'))!;
const line = (shell: ToShell) => theSwitch(shell).closest('label')!.querySelector('small')!.textContent!.trim();
/** A switch turned as a person turns it: the browser flips it, then says so. */
function flip(box: HTMLInputElement) {
  box.checked = !box.checked;
  box.dispatchEvent(new Event('change', { bubbles: true }));
}

test('offline: the switch keeps the app on the device, says how much, and lets it go', async () => {
  const { reg, register, persist } = fakeBrowser();
  setKeeping(true);
  const shell = await mount('#/v1/todo');
  await menu(shell);
  expect(theSwitch(shell).checked).toBe(false);
  expect(line(shell)).toBe('Not kept');

  flip(theSwitch(shell));
  await until(() => line(shell).startsWith('Ready'));
  expect(offlineOn()).toBe(true);
  expect(localStorage.getItem('tinyoffice.offline')).toBe('1');
  // The worker is the site's, at its root, whatever page it was turned on from.
  const root = new URL('.', location.origin + location.pathname).href;
  expect(register).toHaveBeenCalledWith(`${root}sw.js`, { scope: root });
  expect(persist).toHaveBeenCalled();
  expect(line(shell)).toBe('Ready to work offline · 4.2 MB');
  expect(theSwitch(shell).checked).toBe(true);

  flip(theSwitch(shell));
  await until(() => line(shell) === 'Not kept');
  expect(reg.unregister).toHaveBeenCalled();
  expect(offlineOn()).toBe(false);
  expect(localStorage.getItem('tinyoffice.offline')).toBeNull();
});

test('offline: on a private visit, keeping the app turns the device to Saved; Private again lets the copy go', async () => {
  const { reg, register } = fakeBrowser();
  const shell = await mount('#/v1/todo');
  await menu(shell);
  expect(keeping()).toBe(false);
  flip(theSwitch(shell));
  await until(() => line(shell).startsWith('Ready'));
  // Keeping the app is keeping something: the device is Saved now, and says so.
  expect(keeping()).toBe(true);
  expect(localStorage.getItem('tinyoffice.offline')).toBe('1');
  expect(register).toHaveBeenCalledTimes(1);
  await until(() => switches(shell)[0].closest('label')!.textContent!.includes('Saved on this device'));
  expect(switches(shell)[0].checked).toBe(true);

  // Private: nothing stays on the device, the app's copy among it (after the question, answered yes).
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  flip(switches(shell)[0]);
  await until(() => !keeping());
  await until(() => reg.unregister.mock.calls.length > 0);
  expect(localStorage.getItem('tinyoffice.offline')).toBeNull();
  expect(store.get('tinyoffice.offline')).toBeNull();
  await until(() => line(shell) === 'Not kept');
  expect(theSwitch(shell).checked).toBe(false);
});

test('offline: a worker that cannot be registered says so, and the switch can be tried again', async () => {
  const { register } = fakeBrowser();
  register.mockRejectedValueOnce(new Error('no'));
  setKeeping(true);
  const shell = await mount('#/v1/todo');
  await menu(shell);
  flip(theSwitch(shell));
  await until(() => line(shell) === 'Could not save');
  expect(theSwitch(shell).disabled).toBe(false);
});
