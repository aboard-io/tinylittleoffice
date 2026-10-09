// The menu's switch that keeps the app on the device: it writes its state, registers the worker and unregisters it (a faked browser).
import { test, expect, vi } from 'vitest';
import { open, idle, until, $, text, button } from './helpers-shell.ts';
import type { SlSwitch } from '../../src/lib/shoelace.ts';

/** A browser's service-worker and storage APIs, as far as the switch uses them. */
function fakeBrowser() {
  let installing: { state: string; addEventListener(t: string, fn: () => void): void } | null = null;
  const reg = { installing, unregister: vi.fn(async () => true), addEventListener: vi.fn() };
  const register = vi.fn(async () => reg);
  const registrations: (typeof reg)[] = [];
  const sw = { register, ready: Promise.resolve(reg), controller: null, getRegistrations: vi.fn(async () => registrations) };
  register.mockImplementation(async () => (registrations.push(reg), reg));
  const persist = vi.fn(async () => true);
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
  Object.defineProperty(navigator, 'storage', { value: { persist, estimate: async () => ({ usage: 4_200_000, quota: 1e10 }) }, configurable: true });
  return { reg, register, persist };
}

const theSwitch = () => $<SlSwitch>('#nav-drawer sl-switch.to-offline');
const line = () => text(theSwitch().shadowRoot?.querySelector('[part~="form-control-help-text"]') ?? theSwitch().querySelector('[slot="help-text"]'));
async function flip() {
  const s = theSwitch();
  s.checked = !s.checked;
  s.dispatchEvent(new Event('sl-change', { bubbles: true }));
  await idle();
}

test('offline: the switch in the menu keeps the app on the device, and lets it go', async () => {
  const { reg, register, persist } = fakeBrowser();
  localStorage.setItem('tinyoffice.keep', '1');
  localStorage.removeItem('tinyoffice.offline');
  await open('#/v0/todo');
  button('Menu').click();
  await idle();
  expect(theSwitch().checked).toBe(false);
  expect(line()).toBe('Not kept');

  await flip();
  await until(() => line().startsWith('Ready'), 'the worker ready');
  expect(localStorage.getItem('tinyoffice.offline')).toBe('1');
  expect(register).toHaveBeenCalledWith(`${location.origin}/sw.js`, { scope: `${location.origin}/` });
  expect(persist).toHaveBeenCalled();
  expect(line()).toBe('Ready to work offline · 4.2 MB');
  expect(theSwitch().checked).toBe(true);

  await flip();
  await until(() => line() === 'Not kept', 'the copy gone');
  expect(reg.unregister).toHaveBeenCalled();
  expect(localStorage.getItem('tinyoffice.offline')).toBeNull();
});

test('offline: on a private visit, keeping the app turns the header to Saved; Private again lets the copy go', async () => {
  const { reg, register } = fakeBrowser();
  localStorage.removeItem('tinyoffice.keep');
  await open('#/v0/todo');
  expect(text(button(/Private/))).toContain('Private');
  button('Menu').click();
  await idle();
  await flip();
  await until(() => line().startsWith('Ready'), 'the worker ready');
  expect(localStorage.getItem('tinyoffice.keep')).toBe('1');
  expect(localStorage.getItem('tinyoffice.offline')).toBe('1');
  expect(register).toHaveBeenCalledTimes(1);
  // Private: nothing stays on the device, the app's copy among it.
  const confirm = window.confirm;
  window.confirm = () => true;
  button(/Saved on this device/).click();
  await until(() => localStorage.getItem('tinyoffice.keep') === null, 'private again');
  await until(() => reg.unregister.mock.calls.length > 0, 'the worker unregistered');
  expect(localStorage.getItem('tinyoffice.offline')).toBeNull();
  button('Menu').click();
  await idle();
  expect(theSwitch().checked).toBe(false);
  expect(line()).toBe('Not kept');
  window.confirm = confirm;
  localStorage.setItem('tinyoffice.keep', '1');
});
