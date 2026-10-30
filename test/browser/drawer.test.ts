// The drawer: opens as a modal dialog, finds apps, closes on Escape with focus back on the menu button.
import { test, expect } from 'vitest';
import { cdp } from 'vitest/browser';
import { mount, openDrawerDoc, said, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { apps } from '../../src/kit/core/apps.ts';
import { templatesOf } from '../../src/kit/ui/home.ts';
import { running } from '../../src/kit/core/version.ts';
import { siteRoot } from '../../src/kit/core/apps.ts';
import { page } from 'vitest/browser';
import { keepSize, SIZE_MAX } from '../../src/kit/ui/zoom.ts';
import { firstLines } from './firstline.ts';
import { manualHash } from '../../src/kit/ui/manual.ts';
import { parseHash } from '../../src/kit/core/route.ts';

/** The drawer, opened by the menu button, drawn whole. */
const openDrawer = async (shell: HTMLElement) => {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open && !!dialog.querySelector('.to-drawer-prefs'));
  return dialog;
};
const type = async (dialog: HTMLElement, words: string) => {
  const find = dialog.querySelector<HTMLInputElement>('.to-find')!;
  find.value = words;
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await tick(30);
};
const headings = (dialog: HTMLElement) => [...dialog.querySelectorAll('.to-drawer-apps h3')].map((h) => h.textContent);

test("the hamburger opens the drawer, the home page's drawer has no app rows, Find narrows what there is, Escape closes it", async () => {
  const shell = await mount('');
  const burger = shell.querySelector<HTMLButtonElement>('.to-burger')!;
  burger.focus();
  burger.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  expect(document.activeElement).toBe(shell.querySelector('.to-find'));
  const find = shell.querySelector<HTMLInputElement>('.to-find')!;
  // Nothing kept (Save in browser off): apps, templates and commands are what there is to find.
  expect(find.placeholder).toBe('Find app, template, or command');
  // The drawer lists no apps anywhere (Paul, 2026-10-12: search finds them, and the home page is the list); Find still finds.
  expect(shell.querySelectorAll('.to-drawer-apps .to-app-head').length).toBe(0);
  // At home there is no way home in the head: the page is home.
  expect(shell.querySelector('.to-drawer-head .to-drawer-home')).toBeNull();
  find.value = 'zzz';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => shell.querySelectorAll('.to-drawer-apps a').length === 0);
  expect(shell.querySelector('.to-drawer-apps .to-hint')!.textContent).toBe('No results');
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

test('Find finds kept documents by title and templates by name or app, each under its heading; Enter opens the first', async () => {
  const { setPrivate } = await import('../../src/kit/share/privacy.ts');
  const { keep } = await import('../../src/kit/share/library.ts');
  await setPrivate(false);
  try {
    keep({ id: 'm', app: 'write', title: 'Meeting with the printers', hash: '#/v1/write/ymeet', at: Date.now() });
    const shell = await mount('#/v1/sheet');
    shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
    const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
    await until(() => dialog.open);
    const find = shell.querySelector<HTMLInputElement>('.to-find')!;
    expect(find.placeholder).toBe('Find app, doc, template, or command');
    find.value = 'meeting';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    // Find asks for every app's templates (a file an app, lazily) and the list grows as they arrive.
    await until(() => apps().every((a) => !!templatesOf(a)));
    await until(() => shell.querySelectorAll('.to-drawer-apps h3').length === 2);
    expect([...shell.querySelectorAll('.to-drawer-apps h3')].map((h) => h.textContent)).toEqual(['Documents', 'Templates']);
    const found = [...shell.querySelectorAll<HTMLAnchorElement>('.to-drawer-apps a.to-found')];
    const names = found.map((a) => a.querySelector('.to-found-words span')!.textContent);
    expect(names).toContain('Meeting notes');
    expect(found[names.indexOf('Meeting notes')].querySelector('small')!.textContent).toBe('Word Processor');
    // The documents come before the templates, under their heading, each with its app.
    expect(names[0]).toBe('Meeting with the printers');
    expect(found[0].getAttribute('href')).toBe('#/v1/write/ymeet');
    // A template by its app's name: every Word Processor template.
    find.value = 'word processor';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    const writes =
      1 +
      (
        await apps()
          .find((a) => a.id === 'write')!
          .templates()
      ).length;
    await until(() => shell.querySelectorAll('.to-drawer-apps a.to-found').length === writes);
    // Enter opens the first, and the drawer closes as the document opens.
    find.value = 'meeting notes';
    find.dispatchEvent(new Event('input', { bubbles: true }));
    await until(() => headings(dialog).join() === 'Templates');
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

test('inside an app the drawer lists no apps (Paul, 2026-10-12: search finds them, and the home page is the list); Find finds an app and its templates', async () => {
  const shell = await mount('#/v1/sheet');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open);
  expect(shell.querySelectorAll('.to-drawer-apps .to-app-head').length).toBe(0);
  expect(shell.querySelector('to-templates')).toBeNull();
  const find = shell.querySelector<HTMLInputElement>('.to-find')!;
  find.value = 'word';
  find.dispatchEvent(new Event('input', { bubbles: true }));
  await until(() => headings(dialog).includes('Templates'), 'the Word Processor’s templates never came');
  expect(headings(dialog)[0]).toBe('Apps');
  expect(shell.querySelector('.to-drawer-apps a span')!.textContent).toBe('Word Processor');
  dialog.close();
  await until(() => !dialog.open);
  history.replaceState(null, '', location.pathname);
});

test('Save in browser turned on says so; Cancel on "Remove all files and settings from this browser?" leaves things kept and puts the switch back on', async () => {
  const { setPrivate } = await import('../../src/kit/share/privacy.ts');
  const { keeping } = await import('../../src/kit/core/store.ts');
  await setPrivate(true);
  expect(keeping()).toBe(false);
  const shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector<HTMLDialogElement>('dialog.to-drawer')?.open);
  const box = shell.querySelector<HTMLInputElement>('dialog.to-drawer input[role=switch]')!;
  expect(box.checked).toBe(false);
  // Turned on: nothing asked, kept from now on, and said.
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => keeping());
  await until(() => said() === 'Saving in this browser');
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
    await until(() => said() === 'Nothing saved in this browser');
    expect(box.checked).toBe(false);
  } finally {
    window.confirm = ask;
    await setPrivate(true);
  }
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
    // A document's page: the home page asks for /version.json as it opens, for its foot's version (home.test.ts).
    const shell = await mount('#/v1/write');
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
// key with Ctrl, ⌘ or Alt is typed, no keys are written in the drawer, its menus or the commands its search finds; the
// keys are each control's aria-keyshortcuts, never its name; Find in this document is a row of This document.
test('under a finger with no keyboard the drawer, its menus and the commands it finds write no keys and name none; Find is a row', async () => {
  const { keyboard } = await import('../../src/kit/core/commands.ts');
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
    // The commands the search finds: named by their words alone, no keys written.
    await shell.findAnything();
    await type(drawer as HTMLElement, 's');
    await until(() => drawer.querySelectorAll('.to-found-cmd').length > 0);
    expect(drawer.querySelectorAll('kbd').length).toBe(0);
    for (const o of drawer.querySelectorAll('.to-found-cmd')) expect(named(o)).not.toMatch(/Ctrl|⌘/);
    expect([...drawer.querySelectorAll('.to-found-cmd')].find((o) => named(o) === 'Share…')!.getAttribute('aria-keyshortcuts')).toMatch(/Shift\+S$/);
    await type(drawer as HTMLElement, '');
    (drawer as HTMLDialogElement).close();
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

// Every row of the drawer that is an icon before its words keeps the icon beside the words' first line when they wrap
// (Paul, 2026-10-11: "Align the icons in the main menu to the top so they stay there when we zoom"): This document's
// rows, the apps', Theme, About. At the largest size the apps' names wrap on a phone.
for (const [w, h] of [
  [390, 844],
  [1100, 800],
] as const)
  test(`at the largest size at ${w}px, a drawer row whose words wrap has its icon beside their first line`, async () => {
    await page.viewport(w, h);
    keepSize(SIZE_MAX);
    try {
      const shell = await mount(`#/v1/write/${encodeDoc('# Hi\n\nThere')}`);
      await until(() => !!shell.querySelector('to-write-editor'));
      const doc = await openDrawerDoc(shell);
      const dialog = doc.closest('dialog')!;
      await until(() => !!dialog.querySelector('.to-drawer-doc .to-btn'));
      const rows = firstLines(dialog);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.filter((r) => !r.beside && !r.under)).toEqual([]);
      dialog.close();
    } finally {
      keepSize(1);
      await page.viewport(1100, 800);
      history.replaceState(null, '', location.pathname);
    }
  });

// Paul's hamburger notes of 2026-10-11: the language, Save in browser, the size with no words, one
// search over apps, documents, templates and commands, then the rest (no rows of apps anywhere: Paul, 2026-10-12); no Privacy, no
// Keyboard shortcuts, no palette of its own; Theme's first option Match device; About's body the version line alone.

test("the drawer's sections in Paul's order: the language, What is this?, Save in browser, the size, the search, This document, the rest", async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const dialog = await openDrawer(shell);
  const order = ['.to-drawer-lang', '.to-drawer-manual', '.to-drawer-save', '.to-size', '.to-drawer-apps', '.to-drawer-doc', '.to-drawer-prefs'].map((s) => dialog.querySelector(s)!);
  for (const el of order) expect(el).not.toBeNull();
  for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // No rows of apps, at home or away (Paul, 2026-10-12).
  expect(dialog.querySelectorAll('.to-drawer-apps .to-app-head').length).toBe(0);
  // The head, left to right: the language select, a little narrower than the row; the mark as the way home; Close (Paul, 2026-10-12).
  const head = dialog.querySelector<HTMLElement>('.to-drawer-head')!;
  const [lang, home, close] = [
    head.querySelector<HTMLElement>('.to-drawer-lang select')!,
    head.querySelector<HTMLElement>('a.to-drawer-home')!,
    head.querySelector<HTMLElement>('button[aria-label=Close]')!,
  ];
  expect(home.getAttribute('href')).toBe('#/');
  expect(home.getAttribute('aria-label')).toBe('Home');
  expect(home.querySelector('svg.to-mark')).not.toBeNull();
  expect(lang.getBoundingClientRect().width).toBeLessThan(head.getBoundingClientRect().width * 0.55);
  expect(lang.getBoundingClientRect().right).toBeLessThanOrEqual(home.getBoundingClientRect().left);
  expect(home.getBoundingClientRect().right).toBeLessThanOrEqual(close.getBoundingClientRect().left + 0.5);
  expect(Math.round(home.getBoundingClientRect().height)).toBe(Math.round(close.getBoundingClientRect().height));
  // The size: the eye, then the stepper, no words; its name for a screen reader alone.
  const sz = dialog.querySelector<HTMLElement>('.to-size')!;
  expect(sz.getAttribute('aria-label')).toBe('Zoom');
  expect(sz.querySelector('.to-field-words')).toBeNull();
  expect(sz.firstElementChild!.matches('svg, .to-icon')).toBe(true);
  expect([...sz.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()).length).toBe(0);
  expect(sz.querySelector('.to-size-step')!.textContent!.trim()).toBe('100%');
  // Gone: Privacy, Keyboard shortcuts, the palette.
  expect(dialog.querySelector('.to-drawer-privacy')).toBeNull();
  expect(dialog.querySelector('.to-drawer-keys')).toBeNull();
  expect(document.querySelector('to-palette')).toBeNull();
  expect(shell.querySelector('.to-palette-btn')).toBeNull();
  // Theme's first option.
  const theme = dialog.querySelector<HTMLSelectElement>('.to-drawer-prefs select')!;
  expect(theme.options[0].textContent).toBe('Match device');
  dialog.close();
  history.replaceState(null, '', location.pathname);
});

test('one search, four kinds: Apps, Documents, Templates, Commands, each heading only with rows; a command runs and the drawer closes', async () => {
  const { keep } = await import('../../src/kit/share/library.ts');
  const { setPrivate } = await import('../../src/kit/share/privacy.ts');
  await setPrivate(false);
  try {
    keep({ id: 'p', app: 'write', title: 'Processor parts', hash: '#/v1/write/yparts', at: Date.now() });
    const shell = await mount(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
    await until(() => !!shell.querySelector('to-write-editor'));
    const dialog = await openDrawer(shell);
    expect(dialog.querySelector<HTMLInputElement>('.to-find')!.placeholder).toBe('Find app, doc, template, or command');
    await type(dialog, 'processor');
    await until(() => headings(dialog).includes('Templates'));
    expect(headings(dialog)).toEqual(['Apps', 'Documents', 'Templates']);
    expect(dialog.querySelector('.to-drawer-apps .to-found .to-found-words span')!.textContent).toBe('Word Processor');
    // 'und': Undo, under Commands (the last heading), with its keys.
    await type(dialog, 'und');
    expect(headings(dialog).at(-1)).toBe('Commands');
    const undo = [...dialog.querySelectorAll<HTMLButtonElement>('.to-drawer-apps .to-found-cmd')].find((b) => b.querySelector('.to-found-words span')!.textContent === 'Undo')!;
    expect(undo).toBeTruthy();
    expect(undo.getAttribute('aria-keyshortcuts')).toMatch(/^(Control|Meta)\+Z$/);
    dialog.close();
    // Chosen, Undo is asked of the editor (the kernel's history takes it from there), the drawer closed first.
    const editor = shell.querySelector<HTMLElement>('to-write-editor')!;
    let undone = 0;
    editor.addEventListener('docundo', () => undone++);
    const again = await openDrawer(shell);
    await type(again, 'und');
    const row = [...again.querySelectorAll<HTMLButtonElement>('.to-found-cmd')].find((b) => b.querySelector('.to-found-words span')!.textContent === 'Undo')!;
    row.click();
    await until(() => !again.open && undone === 1);
    // Nothing by that name: no headings at all.
    const third = await openDrawer(shell);
    await type(third, 'zzqx');
    expect(headings(third)).toEqual([]);
    third.close();
  } finally {
    await setPrivate(true);
    history.replaceState(null, '', location.pathname);
  }
});

test('the search begins afresh each time the drawer opens: what was typed is gone, and what it found', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const dialog = await openDrawer(shell);
  await type(dialog, 'und');
  await until(() => dialog.querySelectorAll('.to-found').length > 0);
  dialog.close();
  await until(() => !dialog.open);
  const again = await openDrawer(shell);
  await tick(30);
  expect(again.querySelector<HTMLInputElement>('.to-find')!.value).toBe('');
  expect(again.querySelectorAll('.to-found').length).toBe(0);
  again.close();
  history.replaceState(null, '', location.pathname);
});

test('Mod+K opens the drawer with its search focused; the shortcuts list it by its new name', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: !mac, metaKey: mac, bubbles: true, cancelable: true }));
  const dialog = shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => dialog.open && document.activeElement === dialog.querySelector('.to-find'));
  dialog.close();
  const { shortcutGroups } = await import('../../src/kit/core/keys.ts');
  const { labelOf } = await import('../../src/kit/core/commands.ts');
  const page = shortcutGroups().find((g) => g.heading === 'This page')!;
  expect(labelOf(page.keys.find((c) => c.keys === 'Mod+K')!)).toBe('Find app, doc, template, or command');
  history.replaceState(null, '', location.pathname);
});

test("the language select begins 'Default: ' and the device's language named in itself, Default in the page's language", async () => {
  const { setLanguage } = await import('../../src/kit/core/i18n.ts');
  const real = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages')!;
  Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['fr-CA', 'en'] });
  try {
    await setLanguage('en');
    const shell = await mount('');
    let dialog = await openDrawer(shell);
    const first = () => dialog.querySelector<HTMLSelectElement>('.to-drawer-lang select')!.options[0].textContent;
    expect(first()).toBe('Default: Français');
    dialog.close();
    await setLanguage('fr');
    await shell.updateComplete;
    dialog = await openDrawer(shell);
    await until(() => first() === 'Par défaut : Français');
    dialog.close();
  } finally {
    delete (navigator as unknown as Record<string, unknown>).languages;
    Object.defineProperty(Navigator.prototype, 'languages', real);
    await setLanguage(null);
    history.replaceState(null, '', location.pathname);
  }
});

test('Save in browser: off by default, its line says what turning it on does; on, what turning it off does; off forgets', async () => {
  const { keeping } = await import('../../src/kit/core/store.ts');
  const { setPrivate } = await import('../../src/kit/share/privacy.ts');
  const { keep, library } = await import('../../src/kit/share/library.ts');
  expect(keeping()).toBe(false);
  const shell = await mount('');
  const dialog = await openDrawer(shell);
  const save = dialog.querySelector<HTMLElement>('.to-drawer-save')!;
  const box = save.querySelector<HTMLInputElement>('input[role=switch]')!;
  expect(save.querySelector('b')!.textContent).toBe('Save in browser');
  expect(box.checked).toBe(false);
  expect(save.querySelector('small')!.textContent).toBe('Turn on to save files in your browser.');
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => keeping());
  await until(() => save.querySelector('small')!.textContent === 'Turn off to remove all files and settings.');
  keep({ id: 'q', app: 'write', title: 'Kept', hash: '#/v1/write/ykept', at: Date.now() });
  const ask = window.confirm;
  let asked = '';
  window.confirm = (q?: string) => ((asked = q ?? ''), true);
  try {
    box.checked = false;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    await until(() => !keeping());
    expect(asked).toBe('Remove all files and settings from this browser?');
    expect(library()).toEqual([]);
  } finally {
    window.confirm = ask;
    await setPrivate(true);
  }
});

test("About's body is Paul's three sentences, Aboard, email us and the repository's issues their links, Ionesco's quotation, then the running commit line alone", async () => {
  const shell = await mount('');
  const dialog = await openDrawer(shell);
  shell.querySelector<HTMLButtonElement>('.to-drawer-about')!.click();
  await until(() => !dialog.open);
  const body = shell.querySelector<HTMLElement>('.to-about-dialog .to-dialog-body')!;
  const [words, quote, ...rest] = body.children;
  expect(words.tagName).toBe('P');
  expect(quote.matches('blockquote.to-about-quote')).toBe(true);
  expect(quote.querySelector('p')!.textContent).toBe('All of these notes, these drawings, and these sentences written with a marker fade over time. Only the ephemeral lasts.');
  expect(quote.querySelector('footer')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Eugène Ionesco, Discoveries');
  expect(quote.querySelector('footer cite')!.textContent).toBe('Discoveries');
  expect(words.textContent!.replace(/\s+/g, ' ').trim()).toBe(
    'Tiny Little Office is an experiment by Aboard, a digital and AI strategy and software development firm in New York City. To reach out with questions, email us. If you find bugs, please file them in our GitHub repository.',
  );
  const links = [...words.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
  expect(links).toEqual([
    ['Aboard', 'https://aboard.com/?utm_source=tlo'],
    ['email us', 'mailto:hello+tlo@aboard.com'],
    ['GitHub repository', 'https://github.com/aboard-io/tinylittleoffice/issues'],
  ]);
  expect(rest.every((c) => c.matches('.to-about-version'))).toBe(true);
  expect(rest.map((c) => c.textContent!.replace(/Running commit \w+( \([^)]*\))?/, '').trim())).toEqual(rest.map(() => ''));
});

for (const scale of [1, 2])
  test(`a select in the drawer is a button's height, at ${scale * 100}%`, async () => {
    keepSize(scale);
    try {
      const shell = await mount('');
      const dialog = await openDrawer(shell);
      const btn = dialog.querySelector<HTMLElement>('.to-drawer-about')!.getBoundingClientRect().height;
      for (const s of dialog.querySelectorAll('select')) expect(s.getBoundingClientRect().height).toBe(btn);
      dialog.close();
    } finally {
      keepSize(1);
    }
  });

// Paul, 2026-10-12: "Get rid of open a file and compare and zip download." A file still opens dropped on the page
// (kit/file/open.ts); Compare is still the API's and the CLI's, and a #/compare link still opens it.
test('the drawer has no Open a file…, no Compare… and no Download everything, at home or in a document', async () => {
  for (const at of ['', `#/v1/write/${encodeDoc('# Plans\n\nWords.\n')}`]) {
    const shell = await mount(at);
    const dialog = await openDrawer(shell);
    const words = dialog.textContent!;
    for (const gone of ['Open a file', 'Compare', 'Download everything']) expect(words).not.toContain(gone);
    expect(dialog.querySelector('.to-drawer-files, .to-drawer-open, .to-drawer-compare, input[type=file], .to-download-all')).toBeNull();
    expect(document.querySelector('.to-download-all, .to-privacy-zip')).toBeNull();
    dialog.close();
  }
  history.replaceState(null, '', location.pathname);
});

test("What is this? is the drawer's first row, above Save in browser, and opens the manual: the deck kept in the tree (Paul, 2026-10-14)", async () => {
  const shell = await mount('');
  const dialog = await openDrawer(shell);
  const row = dialog.querySelector<HTMLAnchorElement>('.to-drawer-manual a.to-drawer-whatis')!;
  expect(row).not.toBeNull();
  expect(row.textContent!.trim()).toBe('What is this?');
  expect(row.querySelector('svg, .to-icon')).not.toBeNull();
  expect(row.getAttribute('href')).toBe(manualHash());
  expect(parseHash(manualHash()).app).toBe('deck');
  // Under the head's line, above the switch.
  expect(dialog.querySelector('.to-drawer-head')!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(row.compareDocumentPosition(dialog.querySelector('.to-drawer-save')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // A tap closes the drawer and opens the deck, "Introducing Tiny Little Office".
  row.click();
  await until(() => !dialog.open);
  await until(() => !!shell.querySelector('to-deck-editor'));
  expect(location.hash).toBe(manualHash());
  await until(() => shell.querySelector<HTMLInputElement>('.to-title')?.value === 'Introducing Tiny Little Office');
  history.replaceState(null, '', location.pathname);
});
