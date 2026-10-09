// A language, chosen in the drawer: the shell draws again in it, and <html lang> follows.
import { test, expect } from 'vitest';
import { register, setLanguage } from '../../src/kit/i18n.ts';
import { mount, until } from './helpers.ts';

test('an in-memory Spanish dictionary takes over the shell when chosen', async () => {
  register('es', { 'Find an app': 'Buscar una app', Menu: 'Menú', Text: 'Texto', Blank: 'En blanco', Language: 'Idioma', 'Match the device': 'Como el dispositivo' });
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  const select = [...shell.querySelectorAll<HTMLSelectElement>('.to-drawer select')].find((s) => [...s.options].some((o) => o.value === 'es'))!;
  const es = [...select.options].find((o) => o.value === 'es')!;
  expect(es.textContent).toBe('español');
  select.value = 'es';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => document.documentElement.lang === 'es');
  expect(document.documentElement.dir).toBe('ltr');
  await until(() => shell.querySelector<HTMLInputElement>('.to-find')!.placeholder === 'Buscar una app');
  expect(shell.querySelector('.to-burger')!.getAttribute('aria-label')).toBe('Menú');
  expect(shell.querySelector('.to-tile b')!.textContent).toBe('Texto');
  expect(shell.querySelector('.to-templates-btn span')!.textContent).toBe('En blanco');
  await setLanguage(null);
  await until(() => document.documentElement.lang === 'en');
  expect(shell.querySelector('.to-tile b')!.textContent).toBe('Text');
});
