// A language, chosen in the drawer: the shell draws again in it, and <html lang> follows.
import { test, expect } from 'vitest';
import { register, setLanguage } from '../../src/kit/i18n.ts';
import { mount, until } from './helpers.ts';

test('an in-memory Spanish dictionary takes over the shell when chosen', async () => {
  register('es', { 'Tiny Little Office': 'Oficinita Diminuta', 'Find app, template': 'Buscar app, plantilla', Menu: 'Menú', 'Word Processor': 'Procesador de textos', 'Templates for {app}': 'Plantillas de {app}', Language: 'Idioma', 'Match the device': 'Como el dispositivo' });
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
  await until(() => shell.querySelector<HTMLInputElement>('.to-find')!.placeholder === 'Buscar app, plantilla');
  expect(shell.querySelector('.to-burger')!.getAttribute('aria-label')).toBe('Menú');
  // The name itself is said in the language (Paul, 2026-10-10).
  await until(() => shell.querySelector('.to-header .to-brand')!.textContent!.trim() === 'Oficinita Diminuta');
  await until(() => document.title === 'Oficinita Diminuta');
  expect(shell.querySelector('.to-app-name')!.textContent).toBe('Procesador de textos');
  expect(shell.querySelector('.to-templates-btn')!.getAttribute('aria-label')).toBe('Plantillas de Procesador de textos');
  await setLanguage(null);
  await until(() => document.documentElement.lang === 'en');
  expect(shell.querySelector('.to-app-name')!.textContent).toBe('Word Processor');
});

test('the language chosen is kept on the device through Private and Saved alike, and is no cookie', async () => {
  const { chosenLanguage, LANG_KEY } = await import('../../src/kit/i18n.ts');
  const { keeping, setKeeping } = await import('../../src/kit/store.ts');
  expect(keeping()).toBe(false);
  await setLanguage('es');
  expect(localStorage.getItem(LANG_KEY)).toBe('es');
  expect(chosenLanguage()).toBe('es');
  expect(document.cookie).toBe('');
  // Saved, then Private again: Private forgets every key of ours but this one.
  setKeeping(true);
  setKeeping(false);
  expect(localStorage.getItem(LANG_KEY)).toBe('es');
  expect(localStorage.getItem('tinyoffice.keep')).toBeNull();
  await setLanguage(null);
  expect(localStorage.getItem(LANG_KEY)).toBeNull();
});
