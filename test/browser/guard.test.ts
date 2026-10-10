// The link guard (a link that leaves the site asks first), pictures from the web asked for first, the
// previews of kept documents, and the Office mark.
import { test, expect, afterEach, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { appOf } from '../../src/kit/apps.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { keep } from '../../src/kit/library.ts';
import { setKeeping } from '../../src/kit/store.ts';
import { alwaysPictures, forgetPictures } from '../../src/kit/pictures.ts';
import { askPicture } from '../../src/kit/insert-dialogs.ts';
import { pictureSrc } from '../../src/kit/media.ts';
import { openLink } from '../../src/kit/link-guard.ts';
import { remScale } from '../../src/kit/zoom.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDrawer } from '../../src/kit/drawer.ts';
import indexHtml from '../../index.html?raw';

const CAT = 'https://pictures.example/cat.png';
// Shown, a web picture is asked of the picture proxy, never of its own site (kit/media.ts).
const VIA = pictureSrc(CAT);

afterEach(() => {
  forgetPictures();
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

test('a web picture is a quiet card until asked for; Show shows every one of this document, and it holds for the visit', async () => {
  const text = `Before.\n\n![A cat on a mat](${CAT})\n\nAfter.\n`;
  let shell = await write(text);
  const card = shell.querySelector('to-text .tx-card[data-k="img"] .to-webpic')!;
  expect(card).not.toBeNull();
  expect(card.textContent).toContain('pictures.example');
  expect(card.textContent).toContain('A cat on a mat');
  expect(shell.querySelector(`img[src="${VIA}"]`)).toBeNull();
  card.querySelector<HTMLButtonElement>('.to-webpic-show')!.click();
  await until(() => !!shell.querySelector(`to-text img[src="${VIA}"]`));
  expect(shell.querySelector(`to-text img[src="${VIA}"]`)!.getAttribute('referrerpolicy')).toBe('no-referrer');
  // The same document again, this visit: shown. Another document: asked again.
  shell = await write(text);
  expect(shell.querySelector(`to-text img[src="${VIA}"]`)).not.toBeNull();
  shell = await write(`Other.\n\n![](${CAT})\n`);
  expect(shell.querySelector('to-text .to-webpic')).not.toBeNull();
});

test('a data: picture shows at once', async () => {
  const dot = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  const shell = await write(`![A dot](${dot})\n`);
  expect(shell.querySelector(`to-text img[src="${dot}"]`)).not.toBeNull();
  expect(shell.querySelector('.to-webpic')).toBeNull();
});

test('a picture the author put in this visit shows without asking', async () => {
  await mount('');
  const asked = askPicture();
  await until(() => !!document.querySelector('.to-ask-url'));
  const input = document.querySelector<HTMLInputElement>('.to-ask-url')!;
  input.value = CAT;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await tick(20);
  document.querySelector<HTMLFormElement>('.to-ask-picture-form')!.requestSubmit();
  expect((await asked)?.url).toBe(CAT);
  const shell = await write(`![](${CAT})\n`);
  expect(shell.querySelector(`to-text img[src="${VIA}"]`)).not.toBeNull();
});

test('the Display Link: a web picture is a card in the page, and a tap on it shows it', async () => {
  const shell = await mount(`#/v1/write/${encodeDoc(`Words.\n\n![A cat](${CAT})\n`)}?d`);
  await until(() => !!shell.querySelector('.to-display-page svg'));
  expect(shell.querySelector(`.to-display image[href="${VIA}"]`)).toBeNull();
  const card = shell.querySelector<SVGGElement>('.to-display [data-webpic]')!;
  expect(card.textContent).toContain('pictures.example');
  card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await until(() => !!shell.querySelector(`.to-display image[href="${VIA}"]`));
});

test('Saved: a switch in the menu shows pictures from the web always; Private, there is none', async () => {
  const shell = await mount('');
  const drawer = shell.querySelector<ToDrawer>('to-drawer')!;
  await drawer.show();
  expect(drawer.querySelector('.to-pictures-switch')).toBeNull();
  drawer.close();
  await tick(20);
  setKeeping(true);
  await drawer.show();
  await drawer.updateComplete;
  const box = drawer.querySelector<HTMLInputElement>('.to-pictures-switch input')!;
  expect(box.checked).toBe(false);
  expect(alwaysPictures()).toBe(false);
  box.click();
  expect(alwaysPictures()).toBe(true);
  drawer.close();
  const w = await write(`![](${CAT})\n`);
  expect(w.querySelector(`to-text img[src="${VIA}"]`)).not.toBeNull();
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

test('the menu is a hamburger without a border, 44px, at the right; the Office mark is the drawer’s heading and the favicon', async () => {
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
  await until(() => !!drawer.querySelector('dialog[open] .to-drawer-head .to-brand svg.to-mark'));
  expect(drawer.querySelector('.to-drawer-head .to-brand')!.textContent!.trim()).toBe('Tiny Little Office');
  expect(indexHtml).toMatch(/<link rel="icon" href="\.\/favicon\.svg" type="image\/svg\+xml" \/>/);
});
