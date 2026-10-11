// The link guard (a link that leaves the site asks first), a picture's line as words with a link (nothing
// fetched), the previews of kept documents, and the Office mark.
import { test, expect, afterEach, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { appOf } from '../../src/kit/apps.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { keep } from '../../src/kit/library.ts';
import { setKeeping } from '../../src/kit/store.ts';
import { openLink } from '../../src/kit/link-guard.ts';
import { remScale } from '../../src/kit/zoom.ts';
import { setLanguage, t } from '../../src/kit/i18n.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDrawer } from '../../src/kit/drawer.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import indexHtml from '../../index.html?raw';

const CAT = 'https://pictures.example/cat.png';

afterEach(() => {
  setKeeping(false);
  document.querySelectorAll('dialog[open]').forEach((d) => (d as HTMLDialogElement).close());
  history.replaceState(null, '', location.pathname);
});

/** The guard's dialog, once it is open. */
async function guardOpen(): Promise<HTMLElement> {
  await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-host'));
  return document.querySelector<HTMLElement>('to-dialog.to-link-guard')!;
}
const guardShut = () => !document.querySelector('to-dialog.to-link-guard dialog[open]');

/** A Write document with these words, open in the editor. */
async function write(text: string): Promise<ToShell> {
  const shell = await mount(`#/v1/write/${encodeDoc(text)}`);
  await until(() => !!shell.querySelector('to-write-editor to-text .tx'));
  return shell;
}

test('a link in Write’s words asks first: the site large, the whole address; Cancel stays, Go opens a new tab', async () => {
  const shell = await write('Read [the report](https://reports.example/2026/q3?ref=a) today.\n');
  const a = shell.querySelector<HTMLAnchorElement>('to-text .tx a')!;
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  try {
    // A plain click in words being written puts the caret there; Mod+click follows the link, through the question.
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await tick(30);
    expect(guardShut()).toBe(true);
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    let g = await guardOpen();
    expect(g.querySelector('.lg-what')!.textContent).toContain('You are leaving Tiny Little Office');
    expect(g.querySelector('.lg-host')!.textContent).toBe('reports.example');
    expect(g.querySelector('.lg-url')!.textContent).toBe('https://reports.example/2026/q3?ref=a');
    expect(parseFloat(getComputedStyle(g.querySelector('.lg-host')!).fontSize)).toBeGreaterThanOrEqual(26);
    // Cancel is the default: it has the focus, and it is red; Go is green.
    const cancel = g.querySelector<HTMLButtonElement>('.lg-cancel')!;
    expect(document.activeElement).toBe(cancel);
    expect(getComputedStyle(cancel).backgroundColor).not.toBe(getComputedStyle(g.querySelector('.lg-go')!).backgroundColor);
    cancel.click();
    await until(guardShut);
    expect(open).not.toHaveBeenCalled();
    // A middle click is caught too; Go opens the address in a new tab with no opener and no referrer.
    a.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
    g = await guardOpen();
    g.querySelector<HTMLButtonElement>('.lg-go')!.click();
    await until(guardShut);
    expect(open).toHaveBeenCalledWith('https://reports.example/2026/q3?ref=a', '_blank', 'noopener,noreferrer');
  } finally {
    open.mockRestore();
  }
});

test('Enter on a link goes through the same question; a link on this site, or a download, passes', async () => {
  const shell = await mount('');
  const out = document.createElement('a');
  out.href = 'https://elsewhere.example/';
  out.textContent = 'Elsewhere';
  const here = document.createElement('a');
  here.href = '#/v1/sheet';
  here.textContent = 'A sheet';
  shell.append(out, here);
  out.focus();
  await userEvent.keyboard('{Enter}');
  const g = await guardOpen();
  expect(g.querySelector('.lg-host')!.textContent).toBe('elsewhere.example');
  g.querySelector<HTMLButtonElement>('.lg-cancel')!.click();
  await until(guardShut);
  expect(location.hash).toBe('');
  here.click();
  await until(() => location.hash === '#/v1/sheet');
  expect(guardShut()).toBe(true);
});

test('a javascript: link never opens: a toast says so', async () => {
  const shell = await mount('');
  const bad = document.createElement('a');
  bad.setAttribute('href', 'javascript:document.title="pwned"');
  bad.textContent = 'Free money';
  shell.append(bad);
  bad.click();
  await until(() => !!shell.querySelector('.to-toast.shown'));
  expect(shell.querySelector('.to-toast')!.textContent).toBe('Links of this kind do not open here.');
  expect(document.title).not.toBe('pwned');
  expect(guardShut()).toBe(true);
});

test('the link bubble’s Open, and any link followed from code, ask first', async () => {
  await mount('');
  openLink('mailto:hello@example.com');
  const g = await guardOpen();
  expect(g.querySelector('.lg-what')!.textContent).toBe('This link writes an email to');
  expect(g.querySelector('.lg-host')!.textContent).toBe('hello@example.com');
});

test('in Arabic the address is drawn left to right, set apart; a mailbox that hides a reversal is refused, never drawn', async () => {
  // Arabic in this page alone: the choice never touches the origin's storage, which other test files share as they run.
  const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  await setLanguage('ar');
  try {
    const shell = await mount('');
    expect(document.documentElement.dir).toBe('rtl');
    openLink('https://reports.example/2026/q3?ref=a');
    const g = await guardOpen();
    const host = g.querySelector<HTMLElement>('.lg-host')!;
    const url = g.querySelector<HTMLElement>('.lg-url')!;
    expect(host.textContent).toBe('reports.example');
    expect(url.textContent).toBe('https://reports.example/2026/q3?ref=a');
    for (const el of [host, url]) {
      expect(getComputedStyle(el).direction).toBe('ltr');
      expect(getComputedStyle(el).unicodeBidi).toBe('isolate');
    }
    g.querySelector<HTMLButtonElement>('.lg-cancel')!.click();
    await until(guardShut);
    // Drawn, this read 'nhcr.info@speak-mail.ru' (the review of 2026-10-11).
    openLink('mailto:%E2%80%AEur.liam-kaeps@ofni.rchnu');
    await until(() => !!shell.querySelector('.to-toast.shown'));
    expect(shell.querySelector('.to-toast')!.textContent).toBe(t('This link hides characters in its address.'));
    await tick(50);
    expect(guardShut()).toBe(true);
  } finally {
    await setLanguage(null);
    set.mockRestore();
    remove.mockRestore();
  }
});

test("a picture's line is words with a link, in the editor and the Display Link: nothing is fetched, nothing waits to be asked", async () => {
  const text = `Before.\n\n![A cat on a mat](${CAT})\n\nAfter.\n`;
  const shell = await write(text);
  const link = shell.querySelector<HTMLAnchorElement>(`to-text a[href="${CAT}"]`)!;
  expect(link.textContent).toBe('A cat on a mat');
  expect(shell.querySelector('to-text img, to-text .tx-card, .to-webpic')).toBeNull();
  const shown = await mount(`#/v1/write/${encodeDoc(text)}?d`);
  await until(() => !!shown.querySelector('.to-display-page svg'));
  expect(shown.querySelector('.to-display-page svg')!.textContent).toContain('A cat on a mat');
  expect(shown.querySelector('.to-display image, .to-display img, [data-webpic]')).toBeNull();
  // (The reader drawn again as it settles is this test's, not the next one's.)
  await mount('');
  await tick(100);
});

test('the menu has no switch for pictures from the web, Private or Saved', async () => {
  const shell = await mount('');
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  setKeeping(true);
  await drawer.show();
  await drawer.updateComplete;
  expect(drawer.querySelector('.to-pictures-switch')).toBeNull();
  expect(drawer.textContent).not.toMatch(/pictures from the web/i);
  drawer.close();
});

test('a kept document’s row holds its first page, small, once it is in sight; drawn once', async () => {
  setKeeping(true);
  const hash = `#/v1/write/${encodeDoc('# A preview\n\nWords to see.\n')}`;
  keep({ id: 'p1', app: 'write', title: 'A preview', hash, at: Date.now() });
  keep({ id: 'p2', app: 'write', title: 'Unreadable', hash: '#/v1/write/!!!', at: Date.now() - 1000 });
  const write = appOf('write')!;
  const view = vi.spyOn(write, 'view');
  try {
    const shell = await mount('');
    const rows = [...shell.querySelectorAll('.to-drive li')];
    await until(() => rows.every((r) => !!r.querySelector('to-preview svg')));
    const svg = rows[0].querySelector('to-preview svg')!;
    expect(svg.textContent).toContain('A preview');
    expect(Math.round(svg.getBoundingClientRect().height / remScale())).toBe(52);
    // The unreadable one is a blank page.
    expect(rows[1].querySelector('to-preview svg text')).toBeNull();
    const drawn = view.mock.calls.length;
    expect(drawn).toBe(1);
    // Drawn again (the home page again): from the cache.
    const again = await mount('');
    await until(() => !!again.querySelector('.to-drive li to-preview svg'));
    expect(view.mock.calls.length).toBe(drawn);
  } finally {
    view.mockRestore();
  }
});

test('the menu is a hamburger without a border, 44px, at the right; the Office mark is the favicon alone, the drawer’s head being the language picker', async () => {
  const shell = await mount('#/v1/write');
  const burger = shell.querySelector<HTMLButtonElement>('.to-burger')!;
  // A hamburger, not the mark (Paul, 2026-10-10: "Make the hamburger a hamburger").
  expect(burger.querySelector('svg.to-mark')).toBeNull();
  expect(burger.querySelector('svg')).not.toBeNull();
  expect(burger.getAttribute('aria-label')).toBe('Menu');
  expect(burger.getAttribute('title')).toBe('Tiny Little Office menu');
  const box = burger.getBoundingClientRect();
  // 44 of the stylesheet's pixels, drawn at the size of everything, at the right edge ("let's move it to the right").
  expect(Math.round(box.width / remScale())).toBe(44);
  expect(Math.round(box.height / remScale())).toBe(44);
  expect(box.right).toBeGreaterThan(window.innerWidth - 40 * remScale());
  // No border ("Don't put a border around it").
  expect(getComputedStyle(burger).borderTopColor).toBe('rgba(0, 0, 0, 0)');
  burger.click();
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  // The drawer's head is the language picker and Close, the search under it; the name is not said again there (Paul, 2026-10-10).
  await until(() => !!drawer.querySelector('dialog[open] .to-drawer-head select'));
  const head = drawer.querySelector('.to-drawer-head')!.getBoundingClientRect();
  expect(drawer.querySelector('.to-find')!.getBoundingClientRect().top).toBeGreaterThanOrEqual(head.bottom - 0.5);
  expect(drawer.querySelector('.to-drawer .to-brand')).toBeNull();
  expect(drawer.querySelector('.to-drawer svg.to-mark')).toBeNull();
  expect(indexHtml).toMatch(/<link rel="icon" href="\.\/favicon\.svg" type="image\/svg\+xml" \/>/);
});

test('the guard describes itself: its dialog’s description is what the link does and the host, said as it opens', async () => {
  await mount('');
  openLink('http://plain.example/page');
  const g = await guardOpen();
  const dialog = g.querySelector('dialog')!;
  const ids = (dialog.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  expect(ids.length).toBeGreaterThan(0);
  const said = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
  expect(said).toContain('You are leaving Tiny Little Office for');
  expect(said).toContain('plain.example');
  expect(said).toContain('Not a secure address');
  // A dialog that names no description has none.
  const other = document.createElement('to-dialog') as ToDialog;
  document.body.append(other);
  await other.updateComplete;
  expect(other.querySelector('dialog')!.hasAttribute('aria-describedby')).toBe(false);
  other.remove();
});
