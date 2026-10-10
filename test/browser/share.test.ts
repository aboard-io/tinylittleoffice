// The Share dialog, section by section, and the banner a short link's visitor arrives under (Paul, 2026-10-09:
// "The short link function modal needs to be redesigned … point out how many days are left before they expire.
// Make this big and colorful at the top. Give people a copy button to copy into a new document.")
import { test, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { decodeDoc } from '../../src/kit/codec.ts';
import { keepLink } from '../../src/kit/links.ts';
import { setKeeping, store } from '../../src/kit/store.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToShare } from '../../src/kit/share-dialog.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

const DAY = 86_400_000;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setKeeping(false);
  store.remove('tinyoffice.shortTtl');
  history.replaceState(null, '', location.pathname);
});

const dialogOf = (shell: HTMLElement) => shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
async function open(shell: ToShell) {
  shell.querySelector<HTMLButtonElement>('.to-header .to-share')!.click();
  await until(() => dialogOf(shell).dialog.open && !!dialogOf(shell).querySelector('.to-share-links'));
  return dialogOf(shell);
}
async function written(shell: ToShell, doc = 'Hello\n') {
  const s = await mount(`#/v1/write/${encodeDoc(doc)}`);
  await until(() => !!s.querySelector('to-write-editor'));
  return s ?? shell;
}
/** What copyText hands the clipboard, while `body` runs. */
async function clipboard(body: (copied: () => string) => Promise<void>) {
  let copied = '';
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  try {
    await body(() => copied);
  } finally {
    navigator.clipboard.writeText = clip;
  }
}

test('the head: the title, and where the link fits in one line', async () => {
  const shell = await written(null!, '---\ntitle: Notes\n---\nFirst words.\n');
  const d = await open(shell);
  expect(d.querySelector('.to-dialog-head h2')!.textContent).toBe('Notes');
  expect(d.querySelector('.to-share-fit .to-fit-words')!.textContent!.trim()).toMatch(/^This link: [\d,]+ characters, (fits in a text message|too long for .+)$/);
  // The rooms are a table in a popover off the head line, never in the dialog itself.
  expect([...d.querySelectorAll('table, dl')].every((x) => x.closest('.to-rooms'))).toBe(true);
  // The meter in the header opens the same dialog.
  d.close();
  await until(() => !shell.querySelector<ToShare>('to-share')!.sharing);
  shell.querySelector<HTMLButtonElement>('.to-meter')!.click();
  await until(() => d.dialog.open);
});

test('Copy link and Copy display link copy the two links; each says where it opens', async () => {
  const shell = await written(null!);
  const d = await open(shell);
  const [link, display] = [d.querySelector<HTMLButtonElement>('.to-copy-link')!, d.querySelector<HTMLButtonElement>('.to-copy-display')!];
  expect(link.textContent).toContain('Copy link');
  expect(link.querySelector('small')!.textContent).toBe('Opens in the editor');
  expect(display.querySelector('small')!.textContent).toBe('Opens as pages to read');
  // Equal, side by side.
  const [a, b] = [link.getBoundingClientRect(), display.getBoundingClientRect()];
  expect(Math.round(a.width)).toBe(Math.round(b.width));
  expect(Math.round(a.top)).toBe(Math.round(b.top));
  await clipboard(async (copied) => {
    display.click();
    await until(() => copied() === shell.displayLink);
    expect(copied().endsWith('?d')).toBe(true);
    link.click();
    await until(() => copied() === shell.link);
  });
  await until(() => document.querySelector('[role=status]')!.textContent === 'Link copied');
});

test('the lifetimes: one row of segments, a week by default, the choice written to shortTtl and remembered', async () => {
  let shell = await written(null!);
  let d = await open(shell);
  const radios = () => [...d.querySelectorAll<HTMLInputElement>('.to-share-short .to-ttl input[type=radio]')];
  expect(radios().map((r) => r.parentElement!.textContent)).toEqual(['An hour', 'A day', 'A week', 'A month', 'A year']);
  expect(radios().find((r) => r.checked)!.value).toBe(String(7 * 86400));
  expect(shell.querySelector<ToShare>('to-share')!.shortTtl).toBe(7 * 86400);
  // One row.
  expect(new Set(radios().map((r) => Math.round(r.parentElement!.getBoundingClientRect().top))).size).toBe(1);
  radios()[3].click();
  await shell.updateComplete;
  expect(shell.querySelector<ToShare>('to-share')!.shortTtl).toBe(30 * 86400);
  expect(store.get('tinyoffice.shortTtl')).toBe(String(30 * 86400));
  // A new shell (the next document) starts at the choice.
  shell = await written(null!);
  expect(shell.querySelector<ToShare>('to-share')!.shortTtl).toBe(30 * 86400);
  d = await open(shell);
  expect(radios().find((r) => r.checked)!.value).toBe(String(30 * 86400));
});

test('Make calls the short service and shows the link in a read-only field with Copy', async () => {
  const shell = await written(null!);
  const calls: { url: string; body: { ttl: number } }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  const d = await open(shell);
  expect(d.querySelector('.to-share-short .to-hint')!.textContent).toMatch(/^Encrypted here/);
  d.querySelector<HTMLButtonElement>('.to-make')!.click();
  await until(() => !!d.querySelector('.to-short-field'));
  expect(calls.length).toBe(1);
  expect(calls[0].url).toMatch(/\/api$/);
  expect(calls[0].body.ttl).toBe(7 * 86400);
  const field = d.querySelector<HTMLInputElement>('.to-short-field')!;
  expect(field.readOnly).toBe(true);
  const copy = field.parentElement!.querySelector<HTMLButtonElement>('button')!;
  expect(copy.textContent!.trim()).toBe('Copy');
  // Copy sits at the field's right, on its line.
  expect(copy.getBoundingClientRect().left).toBeGreaterThanOrEqual(field.getBoundingClientRect().right);
  expect(d.querySelector('.to-short-expires')!.textContent).toMatch(/^Expires in 7 days \(/);
});

test('Saved: the owner link can be kept here, and the kept list folds under "n short links kept here"', async () => {
  setKeeping(true);
  keepLink({ owner: `https://tinier.tinylittleoffice.com/zzzzzzz#${'K'.repeat(43)}.${'O'.repeat(43)}`, title: 'Old notes', made: Date.now() - DAY, expires: Date.now() + 3 * DAY });
  const shell = await written(null!);
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } }));
  const d = await open(shell);
  let kept = d.querySelector<HTMLDetailsElement>('.to-kept-list')!;
  expect(kept.querySelector('summary')!.textContent).toBe('1 short link kept here');
  expect(kept.open).toBe(false);
  kept.querySelector('summary')!.click();
  await until(() => kept.open);
  expect(kept.querySelector('li a')!.textContent).toBe('Old notes');
  expect(kept.querySelector('li small')!.textContent).toMatch(/^Expires in 3 days/);

  d.querySelector<HTMLButtonElement>('.to-make')!.click();
  await until(() => !!d.querySelector('.to-owner'));
  const owner = d.querySelector<HTMLDetailsElement>('.to-owner')!;
  owner.querySelector('summary')!.click();
  await until(() => owner.open);
  const keep = owner.querySelector<HTMLButtonElement>('.to-keep')!;
  expect(keep.textContent!.trim()).toBe('Keep on this device');
  keep.click();
  await until(() => d.querySelector('.to-kept-list summary')?.textContent === '2 short links kept here');
  expect(owner.querySelector<HTMLButtonElement>('.to-keep')!.disabled).toBe(true);
  // Remove one.
  kept = d.querySelector<HTMLDetailsElement>('.to-kept-list')!;
  kept.open = true;
  await tick();
  [...kept.querySelectorAll<HTMLButtonElement>('li button')].at(-1)!.click();
  await until(() => d.querySelector('.to-kept-list summary')?.textContent === '1 short link kept here');
});

test('the QR code: drawn inline when the link fits, with PNG and SVG; else one sentence why', async () => {
  let shell = await written(null!);
  let d = await open(shell);
  const qr = () => d.querySelector('.to-share-qr')!;
  expect(qr().querySelector('.to-qr-code svg')).not.toBeNull();
  expect([...qr().querySelectorAll('button')].map((b) => b.textContent!.trim())).toContain('PNG');
  expect([...qr().querySelectorAll('button')].map((b) => b.textContent!.trim())).toContain('SVG');
  // Too much for any code: random words, which do not compress.
  const words = Array.from({ length: 900 }, () => Math.random().toString(36).slice(2, 8)).join(' ');
  shell = await written(null!, `${words}\n`);
  expect(decodeDoc(location.hash.split('/').pop()!)).toContain(words.slice(0, 20));
  d = await open(shell);
  expect(qr().querySelector('.to-qr-code')).toBeNull();
  expect(qr().querySelector('.to-qr-why')!.textContent).toMatch(/^This document is [\d,]+ bytes; the largest QR code holds/);
});

/* ---------- arriving by a short link ---------- */

async function arrive(days: number, extra = '', ready = 'to-write-editor', doc = '---\ntitle: Plans\n---\nWords.\n') {
  const now = new Date('2026-10-09T12:00:00Z').getTime();
  vi.useFakeTimers({ toFake: ['Date'], now });
  const shell = await mount(`#/v1/write/${encodeDoc(doc)}?s=abcdefg${extra}&x=${now + days * DAY}`);
  await until(() => !!shell.querySelector(ready));
  return shell;
}

test('the banner: how long the link has left, coloured by how soon', async () => {
  for (const [days, words, urgency] of [
    [12, 'This link expires in 12 days', 'ok'],
    [3, 'This link expires in 3 days', 'soon'],
    [3 / 24, 'This link expires in 3 hours', 'last'],
  ] as const) {
    const shell = await arrive(days);
    const banner = shell.querySelector<HTMLElement>('.to-arrival')!;
    expect(banner.querySelector('.to-arrival-words')!.textContent).toBe(words);
    expect(banner.classList.contains(urgency)).toBe(true);
    // Big, above the bar, below the header.
    expect(parseFloat(getComputedStyle(banner.querySelector('.to-arrival-words')!).fontSize)).toBeGreaterThanOrEqual(20);
    expect(banner.compareDocumentPosition(shell.querySelector('to-bar')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const header = shell.querySelector('.to-header')!.getBoundingClientRect();
    expect(Math.round(banner.getBoundingClientRect().top)).toBe(Math.round(header.bottom));
    // Not the owner: no Extend.
    expect(banner.querySelector('.to-arrival-extend')).toBeNull();
  }
  // Each colour differs from the next, and the words read on it.
  const colours: string[] = [];
  for (const days of [12, 3, 0.1]) {
    const b = (await arrive(days)).querySelector<HTMLElement>('.to-arrival')!;
    colours.push(getComputedStyle(b).backgroundColor);
  }
  expect(new Set(colours).size).toBe(3);
});

test('the banner: a plain document has none; Close puts it away for the visit', async () => {
  const plain = await written(null!);
  expect(plain.querySelector('.to-arrival')).toBeNull();
  const shell = await arrive(12);
  shell.querySelector<HTMLButtonElement>('.to-arrival-close')!.click();
  await until(() => !shell.querySelector('.to-arrival'));
});

test('Copy into a new document opens the same document as a fresh plain link, "Copy of …", in a new tab', async () => {
  const shell = await arrive(12, `&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  const opened: string[] = [];
  vi.spyOn(window, 'open').mockImplementation((url?: string | URL) => (opened.push(String(url)), null));
  shell.querySelector<HTMLButtonElement>('.to-arrival-copy')!.click();
  expect(opened.length).toBe(1);
  const u = new URL(opened[0]);
  expect(u.hash).not.toContain('?');
  const doc = decodeDoc(u.hash.replace('#/v1/write/', ''));
  expect(doc).toContain('title: Copy of Plans');
  expect(doc).toContain('Words.');
  await until(() => document.querySelector('[role=status]')!.textContent === 'A copy opened in a new tab');
  // The owner's banner has Extend, which opens the Share dialog at the short link's section.
  shell.querySelector<HTMLButtonElement>('.to-arrival-extend')!.click();
  await until(() => dialogOf(shell).dialog.open && !!dialogOf(shell).querySelector('.to-share-extend'));
  expect(dialogOf(shell).querySelector('.to-share-short')!.textContent).toContain('You own this short link');
  expect(dialogOf(shell).querySelector('.to-short-expires')!.textContent).toMatch(/^Expires in 12 days \(/);
  expect(document.activeElement?.matches('.to-ttl input[type=radio]:checked')).toBe(true);
});

test('the banner on the Display Link too, at the top', async () => {
  // "?s=…&d&x=…" still reads as the Display Link.
  const shell = await arrive(5, '&d', '.to-display');
  const banner = shell.querySelector<HTMLElement>('.to-arrival')!;
  expect(banner.classList.contains('soon')).toBe(true);
  expect(banner.querySelector('.to-arrival-copy')).not.toBeNull();
});

/* ---------- phones ---------- */

test('at 390px: the Share dialog is one full-screen sheet, nothing wider, every button inside the screen; the banner too', async () => {
  await page.viewport(390, 844);
  try {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const shell = await arrive(12, `&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
    vi.useRealTimers();
    await tick(50);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
    for (const b of shell.querySelectorAll<HTMLElement>('.to-arrival .to-btn')) expect(b.getBoundingClientRect().right).toBeLessThanOrEqual(390);
    const d = await open(shell);
    await tick(50);
    const box = d.querySelector('dialog')!.getBoundingClientRect();
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.top)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.height)).toBe(844);
    const body = d.querySelector<HTMLElement>('.to-dialog-body')!;
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    for (const el of d.querySelectorAll<HTMLElement>('button, input, .to-ttl label')) {
      if (!el.getClientRects().length || el.closest('details:not([open])')) continue;
      const r = el.getBoundingClientRect();
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(390);
    }
  } finally {
    await page.viewport(1100, 800);
  }
});
