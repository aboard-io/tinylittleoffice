// An app's templates are a chunk of their own, loaded when asked for (Paul, 2026-10-11: "Lazy templates is right"):
// the list shows Blank at once and grows when the rest arrive, with no spinner; a pointer over an app's row asks
// ahead of the tap; and a template chosen opens its own document.
import { test, expect, afterEach } from 'vitest';
import { render, html } from 'lit';
import { mount, tick, until } from './helpers.ts';
import { appOf } from '../../src/kit/apps.ts';
import { decodeDoc } from '../../src/kit/codec.ts';
import { templatesOf, type ToTemplates } from '../../src/kit/home.ts';
import type { Template } from '../../src/kit/app.ts';
import { UI } from '../../src/kit/icons.ts';
import { templates as sheetTemplates } from '../../src/apps/sheet/templates.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

const names = (root: Element) => [...root.querySelectorAll('[role=option] .to-option-words > span')].map((x) => x.textContent);

test('the list shows Blank at once and the rest when they arrive', async () => {
  document.body.innerHTML = '<div id="box"></div>';
  let arrive: (list: Template[]) => void = () => {};
  const app = {
    id: 'demo',
    name: 'Demo',
    noun: 'demo',
    group: '',
    icon: UI.plus,
    blurb: '',
    blank: () => '',
    templates: () => new Promise<Template[]>((r) => (arrive = r)),
    editor: async () => ({ tag: 'x' }),
    title: () => '',
    retitle: (d: string) => d,
    view: () => [{ w: 4, h: 3, svg: '' }],
  };
  render(html`<to-templates .app=${app}></to-templates>`, document.querySelector('#box')!);
  const el = document.querySelector<ToTemplates>('to-templates')!;
  await el.updateComplete;
  el.button.click();
  await until(() => el.dialog.open);
  await tick(20);
  expect(names(el.listbox)).toEqual(['Blank']);
  arrive(['Budget', 'Brief'].map((name) => ({ id: name.toLowerCase(), name, blurb: '', doc: name })));
  await until(() => names(el.listbox).length === 3);
  expect(names(el.listbox)).toEqual(['Blank', 'Budget', 'Brief']);
  el.hide();
});

test('the Spreadsheet’s templates: asked for as a pointer comes over its row, Blank first, and one chosen opens its document', async () => {
  const shell = await mount('');
  const sheet = appOf('sheet')!;
  const row = [...shell.querySelectorAll<HTMLElement>('.to-app')].find((x) => x.querySelector('.to-app-name')!.textContent === 'Spreadsheet')!;
  row.querySelector('.to-app-head')!.dispatchEvent(new PointerEvent('pointerenter'));
  await until(() => !!templatesOf(sheet));
  row.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  const want = sheetTemplates();
  await until(() => names(row).length === 1 + want.length);
  expect(names(row)).toEqual(['Blank', ...want.map((x) => x.name)]);
  row.querySelectorAll<HTMLElement>('[role=option]')[2].click();
  await until(() => location.hash.startsWith('#/v1/sheet/'));
  expect(decodeDoc(location.hash.slice('#/v1/sheet/'.length))).toBe(want[1].doc);
});
