// The drawer: opens as a modal dialog, finds apps, closes on Escape with focus back on the menu button.
import { test, expect } from 'vitest';
import { mount, until } from './helpers.ts';
import { apps } from '../../src/kit/apps.ts';
import { running } from '../../src/kit/version.ts';
import { siteRoot } from '../../src/kit/offline.ts';

test('the hamburger opens the drawer, the apps are rows with their templates, Find narrows them, Escape closes it', async () => {
  const shell = await mount('');
  const burger = shell.querySelector<HTMLButtonElement>('.to-burger')!;
  burger.focus();
  burger.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  expect(document.activeElement).toBe(shell.querySelector('.to-find'));
  const find = shell.querySelector<HTMLInputElement>('.to-find')!;
  // Nothing kept (Private): apps and templates are what there is to find.
  expect(find.placeholder).toBe('Find app, template');
  const rows = [...shell.querySelectorAll('.to-drawer-apps .to-app-head')];
  expect(rows.map((r) => r.querySelector('.to-app-open span')!.textContent)).toEqual(apps().map((a) => a.name));
  for (const r of rows) expect(r.querySelector('to-templates .to-templates-btn')).not.toBeNull();
  find.value = 'zzz';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => shell.querySelectorAll('.to-drawer-apps a').length === 0);
  expect(shell.querySelector('.to-drawer-apps .to-hint')!.textContent).toBe('Nothing by that name');
  find.value = 'processor';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => shell.querySelectorAll('.to-drawer-apps h3').length > 0);
  expect(shell.querySelectorAll('.to-drawer-apps h3')[0].textContent).toBe('Apps');
  expect(shell.querySelector('.to-drawer-apps a span')!.textContent).toBe('Word Processor');
  // The switches and the selects are there.
  expect(shell.querySelectorAll('.to-drawer input[role=switch]').length).toBe(2);
  expect(shell.querySelectorAll('.to-drawer select').length).toBe(2);
  // Escape closes a native dialog; focus goes back where it was.
  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  dialog.close();
  await until(() => !dialog.open);
  await until(() => document.activeElement === burger);
});

test('Find finds apps, templates by name or app, and kept documents by title, each under its heading; Enter opens the first', async () => {
  const { setPrivate } = await import('../../src/kit/privacy.ts');
  const { keep } = await import('../../src/kit/library.ts');
  await setPrivate(false);
  try {
    keep({ id: 'm', app: 'write', title: 'Meeting with the printers', hash: '#/v1/write/ymeet', at: Date.now() });
    const shell = await mount('#/v1/sheet');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
    await until(() => dialog.open);
    const find = shell.querySelector<HTMLInputElement>('.to-find')!;
    expect(find.placeholder).toBe('Find app, template, or doc');
    find.value = 'meeting';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => shell.querySelectorAll('.to-drawer-apps h3').length === 2);
    expect([...shell.querySelectorAll('.to-drawer-apps h3')].map((h) => h.textContent)).toEqual(['Templates', 'Documents']);
    const found = [...shell.querySelectorAll<HTMLAnchorElement>('.to-drawer-apps a.to-found')];
    const names = found.map((a) => a.querySelector('.to-found-words span')!.textContent);
    expect(names).toContain('Meeting notes');
    expect(found[names.indexOf('Meeting notes')].querySelector('small')!.textContent).toBe('Word Processor');
    // The documents come last, under their heading, each with its app.
    expect(names.at(-1)).toBe('Meeting with the printers');
    expect(found.at(-1)!.getAttribute('href')).toBe('#/v1/write/ymeet');
    // A template by its app's name: every Word Processor template.
    find.value = 'word processor';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => shell.querySelectorAll('.to-drawer-apps a.to-found').length > 2);
    expect(shell.querySelectorAll('.to-drawer-apps a.to-found').length).toBe(1 + apps().find((a) => a.id === 'write')!.templates.length);
    // Enter opens the first, and the drawer closes as the document opens.
    find.value = 'meeting';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => shell.querySelectorAll('.to-drawer-apps a.to-found').length === found.length);
    const first = shell.querySelector<HTMLAnchorElement>('.to-drawer-apps a.to-found')!.getAttribute('href')!;
    find.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await until(() => location.hash === first);
    await until(() => !dialog.open);
  } finally {
    await setPrivate(true);
    history.replaceState(null, '', location.pathname);
  }
});

test('a template from inside an app: the drawer\'s rows carry the templates listbox, and choosing one opens it and closes the drawer', async () => {
  const shell = await mount('#/v1/sheet');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  const row = shell.querySelectorAll('.to-drawer-apps .to-app-head')[0];
  row.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  await until(() => !!row.querySelector('[role=option] svg'));
  const options = [...row.querySelectorAll<HTMLElement>('[role=option]')];
  options[1].click();
  await until(() => location.hash.startsWith('#/v1/write/'));
  await until(() => !dialog.open);
  history.replaceState(null, '', location.pathname);
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

test('About says nothing is asked that you did not cause, and links the page of what leaves your browser', async () => {
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector<HTMLDialogElement>('dialog.to-drawer')?.open);
  shell.querySelector<HTMLButtonElement>('.to-drawer-about')!.click();
  await until(() => !!shell.querySelector('.to-about-dialog a.to-about-network'));
  const a = shell.querySelector<HTMLAnchorElement>('.to-about-dialog a.to-about-network')!;
  expect(a.textContent).toBe('What leaves your browser');
  expect(new URL(a.href).pathname).toMatch(/\/network$/);
  expect(a.closest('p')!.textContent).toContain('No analytics, no error reports');
});

test('About links the threat model, a link that leaves and so is asked about', async () => {
  const { THREAT_MODEL } = await import('../../src/kit/drawer.ts');
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  shell.querySelector<HTMLButtonElement>('.to-drawer-about')!.click();
  await until(() => !!shell.querySelector('.to-about-dialog a.to-about-threats'));
  const a = shell.querySelector<HTMLAnchorElement>('.to-about-dialog a.to-about-threats')!;
  expect(a.textContent).toBe('What this protects against, and what it does not');
  expect(a.href).toBe(THREAT_MODEL);
  expect(THREAT_MODEL).toMatch(/\/docs\/threat-model\.md$/);
});

test('About names the commit the site runs, from /version.json, asked when it opens, with a link to its source', async () => {
  // The test server has no /version.json: let an ask still on its way from the test before come back empty (and be forgotten).
  await running(siteRoot());
  const real = window.fetch;
  const asked: string[] = [];
  const commit = '0123456789abcdef0123456789abcdef01234567';
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.endsWith('/version.json')) return real(input, init);
    asked.push(url);
    return new Response(JSON.stringify({ commit, tag: 'v1.0.0', built: '2026-10-10T00:00:00Z', csp: { scripts: ['sha256-x'] } }), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    const shell = await mount('');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    await until(() => !!shell.querySelector<HTMLDialogElement>('dialog.to-drawer')?.open);
    // Nothing is asked until About opens.
    expect(asked).toEqual([]);
    shell.querySelector<HTMLButtonElement>('.to-drawer-about')!.click();
    await until(() => !!shell.querySelector('.to-about-dialog .to-about-version a'));
    const a = shell.querySelector<HTMLAnchorElement>('.to-about-dialog .to-about-version a')!;
    expect(a.textContent).toBe('Running commit 0123456');
    expect(a.href).toBe(`https://github.com/ftrain/tinyoffice/commit/${commit}`);
    expect(a.target).toBe('_blank');
    expect(a.closest('p')!.textContent).toBe('Running commit 0123456 (v1.0.0)');
    expect(asked.length).toBe(1);
    expect(new URL(asked[0]).origin).toBe(location.origin);
  } finally {
    window.fetch = real;
  }
});
