// The way home (round nine): the header's app icon goes to the home page, New is the drawer's first document row,
// and a document that lives nowhere but its link (Private, changed) asks once before it is left; closing the tab then
// gets the browser's own warning.
import { test, expect, afterEach } from 'vitest';
import { mount, until, openDrawerDoc } from './helpers.ts';
import { keeping } from '../../src/kit/store.ts';
import { setPrivate } from '../../src/kit/privacy.ts';
import { library } from '../../src/kit/library.ts';
import { go } from '../../src/kit/route.ts';
import { openFile } from '../../src/kit/open.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToText } from '../../src/kit/text.ts';

afterEach(async () => {
  if (keeping()) await setPrivate(true);
  document.body.innerHTML = '';
  history.replaceState(null, '', location.pathname);
});

/** Words typed into Write's editor, as a person types them, and into the link. */
async function type(shell: ToShell, words: string) {
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  const text = shell.querySelector<ToText>('to-text')!;
  await text.updateComplete;
  text.focus();
  text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
  for (const ch of words) {
    text.tx.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true }));
    await text.updateComplete;
  }
  shell.flushLink();
  await shell.updateComplete;
}
/** A cancelable beforeunload, as the browser sends one when the tab is closed: whether the page asked to stay. */
const unloadAsks = () => {
  const e = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(e);
  return e.defaultPrevented;
};
const icon = (shell: ToShell) => shell.querySelector<HTMLAnchorElement>('.to-header a.to-here')!;
const asked = (shell: ToShell) => shell.querySelector<HTMLDialogElement>('to-dialog.to-leave-dialog dialog');

test('the icon goes home, its name Home, in Write and in Draw', async () => {
  for (const app of ['write', 'draw']) {
    const shell = await mount(`#/v1/${app}`);
    await until(() => !!icon(shell));
    expect(icon(shell).getAttribute('href')).toBe('#/');
    expect(icon(shell).getAttribute('aria-label')).toBe('Home');
    expect(icon(shell).getAttribute('title')).toBe('Home');
  }
});

test('New is the drawer’s first document row and opens a blank document', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Words');
  await setPrivate(false);
  const section = await openDrawerDoc(shell);
  const rows = [...section.querySelectorAll<HTMLElement>(':scope > .to-btn, :scope > to-menu')];
  expect(rows[0].matches('a.to-drawer-new')).toBe(true);
  expect(rows[0].textContent!.trim()).toBe('New document');
  expect(rows[1].matches('.to-drawer-share')).toBe(true);
  rows[0].click();
  await until(() => location.hash === '#/v1/write');
  await until(() => shell.querySelector<HTMLInputElement>('.to-title')?.value.startsWith('New Document') ?? false);
});

test('Private and changed: the icon asks first, and the hash stays; Escape stays', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Only here');
  const was = location.hash;
  icon(shell).click();
  await until(() => !!asked(shell)?.open);
  expect(location.hash).toBe(was);
  const d = shell.querySelector('to-dialog.to-leave-dialog')!;
  expect(d.querySelector('h2')!.textContent).toBe('This document lives in its link');
  expect([...d.querySelectorAll('.to-dialog-body button')].map((b) => b.textContent!.trim())).toEqual(['Copy the link and go', 'Turn on Saved and keep it here', 'Go without']);
  asked(shell)!.close();
  await until(() => !asked(shell)!.open);
  expect(location.hash).toBe(was);
});

test('Copy the link and go: the link on the clipboard, then home', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Copy me');
  const link = location.href;
  let copied = '';
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  try {
    icon(shell).click();
    await until(() => !!asked(shell)?.open);
    shell.querySelector<HTMLButtonElement>('.to-leave-copy')!.click();
    await until(() => location.hash === '#/');
    expect(copied).toBe(link);
  } finally {
    navigator.clipboard.writeText = clip;
  }
});

test('Copy the link and go: when the clipboard refuses, the dialog stays open and so does the document', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Not copied');
  const was = location.hash;
  const clip = navigator.clipboard.writeText;
  let tried = false;
  navigator.clipboard.writeText = async () => {
    tried = true;
    throw new DOMException('Denied', 'NotAllowedError');
  };
  try {
    icon(shell).click();
    await until(() => !!asked(shell)?.open);
    shell.querySelector<HTMLButtonElement>('.to-leave-copy')!.click();
    await until(() => tried);
    await new Promise((r) => setTimeout(r, 50));
    expect(asked(shell)!.open).toBe(true);
    expect(location.hash).toBe(was);
  } finally {
    navigator.clipboard.writeText = clip;
  }
});

test('after Share’s Copy link the icon goes home at once; changed again, it asks again', async () => {
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async () => {};
  try {
    const { openShare } = await import('./helpers.ts');
    let shell = await mount('#/v1/write');
    await type(shell, 'Shared');
    await openShare(shell);
    await until(() => !!shell.querySelector('to-share .to-copy-link'));
    shell.querySelector<HTMLButtonElement>('to-share .to-copy-link')!.click();
    await until(() => !unloadAsks());
    shell.querySelector<HTMLDialogElement>('to-share dialog')?.close();
    icon(shell).click();
    await until(() => location.hash === '#/');
    expect(asked(shell)?.open ?? false).toBe(false);
    history.replaceState(null, '', location.pathname);
    shell = await mount('#/v1/write');
    await type(shell, 'Shared');
    await openShare(shell);
    await until(() => !!shell.querySelector('to-share .to-copy-link'));
    shell.querySelector<HTMLButtonElement>('to-share .to-copy-link')!.click();
    await until(() => !unloadAsks());
    shell.querySelector<HTMLDialogElement>('to-share dialog')?.close();
    await type(shell, 'More ');
    const was = location.hash;
    icon(shell).click();
    await until(() => !!asked(shell)?.open);
    expect(location.hash).toBe(was);
  } finally {
    navigator.clipboard.writeText = clip;
  }
});

test('a Download hand-off and a file opened ask the same way, and the hash holds', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Hand me off');
  const was = location.hash;
  await openDrawerDoc(shell);
  shell.querySelector<HTMLButtonElement>('.to-drawer-download > button')!.click();
  const menu = () => shell.querySelector<HTMLElement>('.to-drawer-download [popover]')!;
  await until(() => menu().matches(':popover-open'));
  const off = [...menu().querySelectorAll<HTMLElement>('[role=group][aria-label="Open in"] [role^=menuitem]')].find((el) => el.textContent!.includes('Show as slides'))!;
  off.click();
  await until(() => !!asked(shell)?.open);
  expect(location.hash).toBe(was);
  asked(shell)!.close();
  await until(() => !asked(shell)!.open);
  expect(await openFile(new File(['# Opened\n\nWords.\n'], 'opened.md', { type: 'text/markdown' }), 'write')).toBe(true);
  await until(() => !!asked(shell)?.open);
  expect(location.hash).toBe(was);
  shell.querySelector<HTMLButtonElement>('.to-leave-go')!.click();
  await until(() => location.hash !== was && location.hash.startsWith('#/v1/write/'));
});

test('Turn on Saved and keep it here: Saved turned on, the document kept, then home, and the toast says Saved is on and where it is turned off', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Keep me');
  const hash = location.hash;
  icon(shell).click();
  await until(() => !!asked(shell)?.open);
  const keepIt = shell.querySelector<HTMLButtonElement>('.to-leave-keep')!;
  expect(keepIt.textContent!.trim()).toBe('Turn on Saved and keep it here');
  keepIt.click();
  await until(() => location.hash === '#/');
  expect(keeping()).toBe(true);
  expect(library().map((k) => k.hash)).toContain(hash);
  await until(() => !!shell.querySelector('.to-toast.shown'));
  expect(shell.querySelector('to-toast [role=status]')!.textContent).toBe('Saved is on: this device keeps the documents you open. Turn it off in the menu.');
});

test('Go without goes home; so does a drawer row and a hand-off, asked the same way', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Leave me');
  icon(shell).click();
  await until(() => !!asked(shell)?.open);
  shell.querySelector<HTMLButtonElement>('.to-leave-go')!.click();
  await until(() => location.hash === '#/');
  expect(keeping()).toBe(false);
  // A drawer row that opens another app asks too.
  history.replaceState(null, '', location.pathname);
  const again = await mount('#/v1/write');
  await type(again, 'Again');
  const was = location.hash;
  (await openDrawerDoc(again)).closest('dialog')!.querySelector<HTMLAnchorElement>('.to-app-open[href="#/v1/sheet"]')!.click();
  await until(() => !!asked(again)?.open);
  expect(location.hash).toBe(was);
  // And the kit's own way of going elsewhere (a template, a file opened, a hand-off): go().
  asked(again)!.close();
  await until(() => !asked(again)!.open);
  go('#/v1/sheet');
  await until(() => !!asked(again)?.open);
  expect(location.hash).toBe(was);
  again.querySelector<HTMLButtonElement>('.to-leave-go')!.click();
  await until(() => location.hash === '#/v1/sheet');
});

test('under Saved, or with nothing changed, the icon goes home at once', async () => {
  let shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  icon(shell).click();
  await until(() => location.hash === '#/');
  expect(asked(shell)?.open ?? false).toBe(false);
  await setPrivate(false);
  shell = await mount('#/v1/write');
  await type(shell, 'Saved here');
  icon(shell).click();
  await until(() => location.hash === '#/');
  expect(asked(shell)?.open ?? false).toBe(false);
});

test('closing the tab warns exactly while the document is Private and changed', async () => {
  const shell = await mount('#/v1/write');
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  expect(unloadAsks()).toBe(false);
  await type(shell, 'Unsaved');
  expect(unloadAsks()).toBe(true);
  // Saved: the device has it.
  await setPrivate(false);
  await until(() => !unloadAsks());
  await setPrivate(true);
  await until(() => unloadAsks());
  // The link copied through Share: it is somewhere now.
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async () => {};
  try {
    const { openShare } = await import('./helpers.ts');
    await openShare(shell);
    await until(() => !!shell.querySelector('to-share .to-copy-link'));
    shell.querySelector<HTMLButtonElement>('to-share .to-copy-link')!.click();
    await until(() => !unloadAsks());
  } finally {
    navigator.clipboard.writeText = clip;
  }
  // Changed again: the warning is back; another document, unchanged: gone.
  shell.querySelector<HTMLDialogElement>('to-share dialog')?.close();
  await type(shell, 'More ');
  expect(unloadAsks()).toBe(true);
  location.hash = '#/v1/sheet';
  await until(() => !unloadAsks());
  // And with the shell gone, no listener is left behind.
  document.body.innerHTML = '';
  expect(unloadAsks()).toBe(false);
});

test('a template chosen in the drawer asks with the drawer closed: one modal at a time (walks: grid at a desktop, seed -906952911)', async () => {
  const shell = await mount('#/v1/write');
  await type(shell, 'Stay');
  const drawer = (await openDrawerDoc(shell)).closest('dialog')!;
  const head = [...drawer.querySelectorAll('.to-app-head')].find((h) => h.querySelector('a')!.getAttribute('href') === '#/v1/sheet')!;
  head.querySelector<HTMLButtonElement>('to-templates > button')!.click();
  await until(() => !!shell.querySelector('to-templates.to-drawer-templates dialog[open]'));
  const list = shell.querySelector('to-templates.to-drawer-templates')!;
  await until(() => !!list.querySelector('dialog[open] [role=option]'));
  list.querySelectorAll<HTMLElement>('[role=option]')[1].click();
  await until(() => !!asked(shell)?.open);
  expect([...document.querySelectorAll('dialog')].filter((d) => d.matches(':modal')).length).toBe(1);
  expect(drawer.open).toBe(false);
});
