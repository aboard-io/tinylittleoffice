// The drawer: opens as a modal dialog, finds apps, closes on Escape with focus back on the menu button.
import { test, expect } from 'vitest';
import { cdp } from 'vitest/browser';
import { mount, openDrawerDoc, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { apps } from '../../src/kit/apps.ts';
import { running } from '../../src/kit/version.ts';
import { siteRoot } from '../../src/kit/apps.ts';

test("the hamburger opens the drawer, the home page's drawer has no app rows, Find narrows what there is, Escape closes it", async () => {
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
  // On the home page the apps are the page, so the drawer has no rows of them (Paul, 2026-10-10); Find still finds.
  expect(shell.querySelectorAll('.to-drawer-apps .to-app-head').length).toBe(0);
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
  expect(shell.querySelectorAll('.to-drawer input[role=switch]').length).toBe(1);
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
    // The document opened, and drawn: the shell is done with the address before the next test takes it.
    await until(() => !!shell.querySelector('to-write-editor'));
  } finally {
    await setPrivate(true);
    history.replaceState(null, '', location.pathname);
  }
});

test("a template from inside an app: each of the drawer's rows has its templates button, which closes the drawer and opens the templates listbox; choosing one opens it", async () => {
  const shell = await mount('#/v1/sheet');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  // In a document the apps are rows, each with its templates button.
  const rows = [...shell.querySelectorAll('.to-drawer-apps .to-app-head')];
  expect(rows.map((r) => r.querySelector('.to-app-open span')!.textContent)).toEqual(apps().map((a) => a.name));
  for (const r of rows) expect(r.querySelector('to-templates .to-templates-btn')).not.toBeNull();
  const row = rows[0];
  row.querySelector<HTMLButtonElement>('.to-templates-btn')!.click();
  // The drawer hands over: closed, and the templates open alone (one modal at a time).
  await until(() => !!shell.querySelector('to-templates.to-drawer-templates dialog[open]'));
  const list = shell.querySelector('to-templates.to-drawer-templates')!;
  await until(() => !dialog.open && !!list.querySelector('dialog[open] [role=option] svg'));
  const options = [...list.querySelectorAll<HTMLElement>('[role=option]')];
  options[1].click();
  await until(() => location.hash.startsWith('#/v1/write/'));
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

test('About says what it does not protect against in its own section, in the language of the page, and its link goes there', async () => {
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  shell.querySelector<HTMLButtonElement>('.to-drawer-about')!.click();
  await until(() => !!shell.querySelector('.to-about-dialog .to-about-threats'));
  const go = shell.querySelector<HTMLButtonElement>('.to-about-dialog .to-about-threats')!;
  expect(go.textContent).toBe('What this protects against, and what it does not');
  // Not a link off the site (the threat model on GitHub, private and in English): a section of About itself.
  expect(go.tagName).toBe('BUTTON');
  const limits = shell.querySelector<HTMLElement>('.to-about-dialog .to-about-limits')!;
  expect(limits.querySelector('h3')!.textContent).toBe('What it does not protect against');
  const said = limits.textContent!;
  for (const w of ['history', 'screenshot', 'weak password', 'serves the code']) expect(said).toContain(w);
  // Under the list, the whole document in the public repository, said to be in English, in a new tab.
  const whole = limits.querySelector<HTMLAnchorElement>('a.to-about-threat-model')!;
  expect([whole.textContent, whole.href, whole.target, whole.rel]).toEqual([
    'The whole threat model, in English',
    'https://github.com/aboard-io/tinylittleoffice/blob/main/docs/threat-model.md',
    '_blank',
    'noopener',
  ]);
  go.click();
  await until(() => document.activeElement === limits.querySelector('h3'));
  // About's words are true: the browser's history is named, nothing promises "no trace".
  const about = shell.querySelector('.to-about-dialog')!.textContent!;
  expect(about).toContain('Your browser’s history still holds every link opened here');
  expect(about).not.toMatch(/nothing is kept|no trace/i);
  // There is no shared document: every link is a copy (r17-copies).
  expect(shell.querySelector('.to-about-dialog .to-about-copies')!.textContent).toBe('There is no shared document: every link is a copy, and what is changed in one never reaches another.');
});

test("the Private switch says what is true: this site keeps nothing, the browser's history holds every link", async () => {
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-switch small'));
  expect(shell.querySelector('.to-switch small')!.textContent).toBe(
    'This site keeps nothing on this device. Your browser’s history still holds every link opened here, and a link is the document: use a private window, or give it a password.',
  );
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
    expect(a.href).toBe(`https://github.com/aboard-io/tinylittleoffice/commit/${commit}`);
    expect(a.target).toBe('_blank');
    expect(a.closest('p')!.textContent).toBe('Running commit 0123456 (v1.0.0)');
    expect(asked.length).toBe(1);
    expect(new URL(asked[0]).origin).toBe(location.origin);
  } finally {
    window.fetch = real;
  }
});

test('a device with no pointer at all (neither fine nor coarse: keys alone) has the search focused; a finger has the dialog hold it', async () => {
  const real = window.matchMedia;
  let pointer: 'none' | 'coarse' = 'none';
  // The pointer media as such a device answers them; every other query as the browser does.
  window.matchMedia = (q: string) => {
    const m = /^\(pointer: (fine|coarse)\)$/.exec(q.trim());
    return m ? ({ matches: m[1] === pointer, media: q, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList) : real.call(window, q);
  };
  try {
    const shell = await mount('');
    const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    await until(() => dialog.open);
    expect(document.activeElement).toBe(shell.querySelector('.to-find'));
    dialog.close();
    await until(() => !dialog.open);
    pointer = 'coarse';
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    await until(() => dialog.open);
    expect(document.activeElement).toBe(dialog);
    dialog.close();
  } finally {
    window.matchMedia = real;
  }
});

// The review of 2026-10-11: "The drawer's buttons are named 'Share… Ctrl+Shift+S' … which VoiceOver speaks in full on a
// phone with no keyboard", and Find in this document was reached on a phone only through a ⌘. Under a finger, until a
// key with Ctrl, ⌘ or Alt is typed, no keys are written in the drawer, its menus or the palette; the keys are each
// control's aria-keyshortcuts, never its name; Find in this document is a row of This document.
test('under a finger with no keyboard the drawer, its menus and the palette write no keys and name none; Find is a row', async () => {
  const { keyboard } = await import('../../src/kit/commands.ts');
  const named = (el: Element): string =>
    el.getAttribute('aria-label') ??
    [...el.childNodes]
      .map((n) => (n instanceof Element ? (n.getAttribute('aria-hidden') === 'true' ? '' : named(n)) : n instanceof Text ? n.data : ''))
      .join('')
      .trim();
  await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  keyboard.seen = false;
  try {
    const shell = await mount(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
    await until(() => !!shell.querySelector('to-write-editor to-bar button'));
    const doc = await openDrawerDoc(shell);
    const drawer = shell.querySelector('dialog.to-drawer')!;
    expect(drawer.querySelectorAll('kbd').length).toBe(0);
    const controls = [...drawer.querySelectorAll('button, a, [role=menuitem], [role=menuitemcheckbox]')];
    for (const c of controls) expect(named(c)).not.toMatch(/Ctrl|⌘/);
    // The keys are said as keys, apart from the name.
    const share = doc.querySelector('.to-drawer-share')!;
    expect(named(share)).toBe('Share…');
    expect(share.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+Shift\+S$/);
    // Find in this document, under This document.
    const find = [...doc.querySelectorAll<HTMLButtonElement>('button')].find((b) => named(b) === 'Find in this document')!;
    expect(find).toBeTruthy();
    expect(find.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+F$/);
    find.click();
    await until(() => !(drawer as HTMLDialogElement).open && !!shell.querySelector('to-find input:focus, to-find :focus'));
    // The palette: its options are named by their words alone, no keys written.
    await shell.showPalette();
    const pal = shell.querySelector('to-palette')!;
    await until(() => pal.querySelectorAll('.to-palette-item').length > 0);
    expect(pal.querySelectorAll('kbd').length).toBe(0);
    for (const o of pal.querySelectorAll('[role=option]')) expect(named(o)).not.toMatch(/Ctrl|⌘/);
    expect([...pal.querySelectorAll('[role=option]')].find((o) => named(o) === 'Share…')!.getAttribute('aria-keyshortcuts')).toMatch(/Shift\+S$/);
    (pal.querySelector('dialog') as HTMLDialogElement).close();
    // A key with Ctrl is a keyboard: from then on the keys are written again (and still not part of a name).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
    expect(keyboard.seen).toBe(true);
    const again = await openDrawerDoc(shell);
    expect(again.querySelector('.to-drawer-share kbd')).not.toBeNull();
    expect(named(again.querySelector('.to-drawer-share')!)).toBe('Share…');
  } finally {
    keyboard.seen = false;
    await cdp().send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }
});
