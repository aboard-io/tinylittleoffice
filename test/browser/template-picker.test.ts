// pickTemplate and <to-template-picker> on a bare page (kit/ui/template-picker.ts; docs/library.md, A template
// picker): an app's templates, Blank first, each drawn small, resolving with the one chosen as { app, id, title, text }
// and opening nothing; every app's, under their names; and null when the dialog is let go.
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import '../../src/editors.css';
import { appOf } from '../../src/kit/core/apps.ts';
import { pickTemplate } from '../../src/kit/ui/template-picker.ts';
import { until } from './wait.ts';

const options = () => [...document.querySelectorAll<HTMLElement>('to-template-picker [role=option]')];

test('an app’s templates, Blank first: the one chosen comes back with its text, and nothing is opened', async () => {
  const before = location.href;
  const tpls = await appOf('write')!.templates();
  const picked = pickTemplate('write');
  await until(() => options().length === tpls.length + 1, 'the templates never arrived');
  expect(document.querySelector('to-template-picker dialog')!.getAttribute('aria-labelledby')).toBeTruthy();
  expect(options()[0].textContent).toContain('Blank');
  expect(options()[1].querySelector('to-preview')!.getAttribute('hash')).toMatch(/^#\/v1\/write\//);
  options()[2].click();
  expect(await picked).toStrictEqual({ app: 'write', id: tpls[1].id, title: tpls[1].name, text: tpls[1].doc });
  expect(document.querySelector('to-template-picker')).toBeNull();
  expect(location.href).toBe(before);
});

test('by the keys: the first has the focus, Down and Enter choose; Blank is a new document of the app', async () => {
  const picked = pickTemplate('sheet');
  await until(() => options().length > 1 && document.activeElement === options()[0], 'the first template never had the focus');
  await userEvent.keyboard('{Enter}');
  const blank = await picked;
  expect(blank).toStrictEqual({ app: 'sheet', id: 'blank', title: 'Untitled spreadsheet', text: appOf('sheet')!.blank() });
});

test('every app’s templates under its name; Escape lets it go, and it resolves null', async () => {
  const picked = pickTemplate();
  await until(() => document.querySelectorAll('to-template-picker .to-tp-group').length === 10, 'not every app');
  expect(document.querySelector('to-template-picker .to-tp-group h3')!.textContent).toBe('Word Processor');
  await userEvent.keyboard('{Escape}');
  expect(await picked).toBeNull();
  expect(document.querySelector('to-template-picker')).toBeNull();
});
