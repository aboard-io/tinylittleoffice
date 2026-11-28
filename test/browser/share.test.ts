// The Share dialog, section by section, and the banner a short link's visitor arrives under (Paul, 2026-10-09:
// "The short link function modal needs to be redesigned … point out how many days are left before they expire.
// Make this big and colorful at the top. Give people a copy button to copy into a new document.")
import { test, expect, afterEach, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until, openShare, said } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { SHORT_LINK_MAX } from '../../src/kit/share/short.ts';
import { CHROME_URL_MAX, FIREFOX_URL_MAX } from '../../src/kit/share/limits.ts';
import { URL_LIMIT } from '../../src/kit/core/codec.ts';
import { QR_MAX_BYTES } from '../../src/kit/draw/qr.ts';
import { decodeDoc } from '../../src/kit/core/codec.ts';
import { keepLink, keptLinks, dropKept } from '../../src/kit/share/kept-links.ts';
import { lockWith, pack } from '../../src/kit/share/privacy.ts';
import { setKeeping, store } from '../../src/kit/core/store.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import type { ToShare } from '../../src/kit/ui/share-dialog.ts';
import type { ToDialog } from '../../src/kit/ui/dialog.ts';

const DAY = 86_400_000;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setKeeping(false);
  store.remove('tinyoffice.shortTtl');
  store.remove('tinyoffice.links');
  store.remove('tinyoffice.preview');
  localStorage.removeItem('tinyoffice.shareNoticeSeen');
  history.replaceState(null, '', location.pathname);
});

const dialogOf = (shell: HTMLElement) => shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
async function open(shell: ToShell) {
  await openShare(shell);
  await until(() => dialogOf(shell).dialog.open && !!dialogOf(shell).querySelector('.to-share-go'));
  return dialogOf(shell);
}
/** The Short link switch turned on: the lifetimes show, and Copy link and the QR code give a short link. */
async function shortOn(d: ToDialog) {
  d.querySelector<HTMLInputElement>('.to-short-switch')!.click();
  await until(() => !!d.querySelector('.to-share-short .to-ttl'));
}
async function written(shell: ToShell, doc = 'Hello\n') {
  const s = await mount(`#/v1/write/${encodeDoc(doc)}`);
  await until(() => !!s.querySelector('to-write-editor'));
  return s ?? shell;
}
/** What copyText (or copyLater, a ClipboardItem) hands the clipboard, while `body` runs. */
async function clipboard(body: (copied: () => string) => Promise<void>) {
  let copied = '';
  const [clip, item] = [navigator.clipboard.writeText, navigator.clipboard.write];
  navigator.clipboard.writeText = async (s: string) => void (copied = s);
  navigator.clipboard.write = async (items: ClipboardItems) => void (copied = await (await items[0].getType('text/plain')).text());
  try {
    await body(() => copied);
  } finally {
    navigator.clipboard.writeText = clip;
    navigator.clipboard.write = item;
  }
}

test('the head: the title, and where the link fits in one line', async () => {
  const shell = await written(null!, '---\ntitle: Notes\n---\nFirst words.\n');
  const d = await open(shell);
  expect(d.querySelector('.to-dialog-head h2')!.textContent).toBe('Share Notes');
  expect(d.querySelector('.to-share-fit .to-fit-words')!.textContent!.trim()).toMatch(/^This link: [\d,]+ characters, (fits in a text message|too long for .+)$/);
  // The sizes are a dialog of their own, Max Link Sizes, never a table in Share itself.
  expect(d.querySelectorAll('table, dl').length).toBe(0);
  // The meter in the header opens Max Link Sizes alone, Share shut (Paul, 2026-10-16: "If one is invoked then hide the other one").
  d.close();
  await until(() => !shell.querySelector<ToShare>('to-share')!.sharing);
  const sizes = shell.querySelector<ToDialog>('to-dialog.to-rooms-dialog')!;
  shell.querySelector<HTMLButtonElement>('.to-meter')!.click();
  await until(() => sizes.dialog.open);
  expect(d.dialog.open).toBe(false);
  expect(sizes.querySelector('.to-dialog-head h2')!.textContent).toBe('Max Link Sizes');
  expect(sizes.querySelectorAll('.to-rooms tbody tr').length).toBe(15);
  // And Share, asked for, shuts the sizes.
  await shell.openShare();
  await until(() => d.dialog.open);
  expect(sizes.dialog.open).toBe(false);
  d.close();
});

test('the table of where the link fits states every limit, what it counts, and whether this link fits (Paul, 2026-10-15, issue #8)', async () => {
  const shell = await written(null!, '---\ntitle: Notes\n---\nFirst words.\n');
  const d = await open(shell);
  const fmt = (x: number) => x.toLocaleString('en');
  const link = shell.link;
  // The table lives in Max Link Sizes, a dialog of its own, drawn when it opens.
  const sizes = shell.querySelector<ToDialog>('to-dialog.to-rooms-dialog')!;
  await shell.querySelector<ToShare>('to-share')!.showRooms();
  await until(() => !!shell.querySelector('.to-rooms table'));
  const table = shell.querySelector('.to-rooms table')!;
  expect(table.querySelector('caption')!.textContent).toBe(`This link: ${fmt(link.length)} characters, ${fmt(new TextEncoder().encode(link).length)} bytes`);
  expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Where', 'Limit', 'Fits?']);
  const rows = Object.fromEntries([...table.querySelectorAll('tbody tr')].map((tr) => [tr.getAttribute('data-target'), [...tr.children].map((c) => c.textContent)]));
  const left = (max: number) => `Yes, ${fmt(max - link.length)} left`;
  expect(rows.chrome).toEqual(['Chrome and Edge', `${fmt(CHROME_URL_MAX)} characters`, left(CHROME_URL_MAX)]);
  expect(rows.firefox).toEqual(['Firefox', `${fmt(FIREFOX_URL_MAX)} characters`, left(FIREFOX_URL_MAX)]);
  expect(rows.safari).toEqual(['Safari', 'None published', 'Yes']);
  expect(rows.short).toEqual(['a short link', `${fmt(SHORT_LINK_MAX)} bytes`, left(SHORT_LINK_MAX)]);
  expect(rows.qr).toEqual(['a QR code', `${fmt(QR_MAX_BYTES)} bytes`, left(QR_MAX_BYTES)]);
  expect(rows.link).toEqual(['older browsers', `${fmt(URL_LIMIT)} characters`, left(URL_LIMIT)]);
  expect(rows.mastodon).toEqual(['Mastodon', 'None published', 'Yes, counts as 23 of 500']);
  // Tightest first, the posts with no published limit after, the browsers last.
  const order = [...table.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('data-target'));
  expect(order.slice(0, 3)).toEqual(['sms', 'ntag215', 'ntag216']);
  expect(order.slice(-3)).toEqual(['firefox', 'chrome', 'safari']);
  expect(rows.sms).toEqual(['a text message', '160 characters', left(160)]);
  expect(table.querySelector('tr.over')).toBeNull();
  // At this phone's width each place is a line, its limit and the answer under it: nothing scrolls sideways.
  const pop = shell.querySelector<HTMLElement>('.to-rooms')!;
  expect(pop.scrollWidth).toBeLessThanOrEqual(pop.clientWidth);
  sizes.close();
  // Random words, which do not compress, past the 2,048 the header's meter counts to: that row says by how much, in red, and the browsers' still fit.
  d.close();
  // (Waited for longer than the helpers do: a document this size takes a while to open on a box busy with the other files.)
  const long = await mount(`#/v1/write/${encodeDoc(`${Array.from({ length: 900 }, () => Math.random().toString(36).slice(2, 8)).join(' ')}\n`)}`);
  await until(() => !!long.querySelector('to-write-editor'), 10_000);
  await long.querySelector<ToShare>('to-share')!.showRooms();
  await until(() => !!long.querySelector('.to-rooms tr[data-target="link"]'), 10_000);
  const big = long.link.length;
  expect(big).toBeGreaterThan(URL_LIMIT);
  const row = (id: string) => long.querySelector(`.to-rooms tr[data-target="${id}"]`)!;
  expect(row('link').classList.contains('over')).toBe(true);
  expect(row('link').querySelector('td:last-child')!.textContent).toBe(`No, ${fmt(big - URL_LIMIT)} over`);
  expect(row('chrome').classList.contains('over')).toBe(false);
  expect(row('chrome').querySelector('td:last-child')!.textContent).toBe(`Yes, ${fmt(CHROME_URL_MAX - big)} left`);
  expect(Object.keys(rows)).toHaveLength(15);
});

test('Copy Link, big, copies the link; with Preview Mode on, the Display Link; the toast is seen over the dialog (issue #61)', async () => {
  // No share sheet (Firefox, and this browser): Copy Link first, and the QR code.
  const shell = await written(null!);
  const d = await open(shell);
  const copy = d.querySelector<HTMLButtonElement>('.to-copy-link')!;
  const qr = d.querySelector<HTMLButtonElement>('.to-qr-open')!;
  expect(d.querySelector('.to-share-via')).toBeNull();
  expect(copy.textContent!.trim()).toBe('Copy Link');
  expect(copy.classList.contains('primary')).toBe(true);
  expect(qr.getAttribute('aria-label')).toBe('QR code');
  expect(qr.textContent!.trim()).toBe('');
  // Two buttons on one line, apart, the row's width: Copy Link first, then the QR code.
  const [c, q, row] = [copy, qr, d.querySelector('.to-share-go')!].map((e) => e.getBoundingClientRect());
  expect(Math.round(c.left)).toBe(Math.round(row.left));
  expect(Math.round(q.right)).toBe(Math.round(row.right));
  expect(c.right).toBeLessThan(q.left);
  expect(Math.round(c.top)).toBe(Math.round(q.top));
  // The surface behind the icons, the accent behind Copy Link.
  expect(getComputedStyle(qr).backgroundColor).not.toBe(getComputedStyle(copy).backgroundColor);
  const present = d.querySelector<HTMLInputElement>('.to-present-switch')!;
  expect(present.checked).toBe(false);
  expect(present.closest('label')!.textContent!.trim()).toBe('Preview Mode');
  // What it does, behind the info button right after its name.
  const tip = present.closest('.to-share-option-head')!.querySelector<HTMLButtonElement>('.to-tip-btn')!;
  expect(tip.getAttribute('aria-label')).toBe('About Preview Mode');
  expect(document.getElementById(tip.getAttribute('aria-describedby')!)!.textContent).toBe('Open as a read-only preview.');
  await clipboard(async (copied) => {
    copy.click();
    await until(() => copied() === shell.link);
    present.click();
    await shell.updateComplete;
    copy.click();
    await until(() => copied() === shell.displayLink);
    expect(copied().endsWith('?d')).toBe(true);
  });
  await until(() => said() === 'Link copied');
  // In the top layer, shown after the modal and so drawn over it. (Not found by elementFromPoint: the modal makes
  // everything outside it inert, and an inert element is never hit, though it is drawn.)
  expect(shell.querySelector<HTMLElement>('.to-toast')!.matches(':popover-open')).toBe(true);
});

// A link is a copy (Paul, 2026-10-11: "docs are not collaborative like Google Docs: that's fine. Communicate it in all the
// languages"): said in the card at the top, until put away (issue #61).
// A link is a copy (Paul, 2026-10-11: "docs are not collaborative like Google Docs: that's fine. Communicate it in all the
// languages"): said in the card at the top, under a warning, until put away for good (issue #61).
test('Share warns that the URL is the document, in a card at the top, until Don’t show again, which outlasts the visit', async () => {
  let shell = await written(null!);
  let d = await open(shell);
  const card = d.querySelector<HTMLElement>('.to-share-notice')!;
  expect(card.querySelector('h3')!.textContent).toBe('The link is the document!');
  expect(card.querySelector('h3 em')!.textContent).toBe('is');
  expect([...card.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
    'Tiny Little Office is not an online collaboration tool. Your files are not stored in the cloud, and there is no syncing between users or devices.',
    'Each link converts an entire document into one long URL, creating a snapshot of its contents as they are right now. Any changes you make will not be visible to anyone else until you create and share a new link, and vice versa.',
  ]);
  expect([...card.querySelectorAll('p strong')].map((b) => b.textContent)).toEqual(['not', 'no syncing between users or devices']);
  expect(card.nextElementSibling!.matches('.to-share-go')).toBe(true);
  card.querySelector<HTMLButtonElement>('.to-notice-hide')!.click();
  await until(() => !d.querySelector('.to-share-notice'));
  // On the device even while nothing else is kept (Private): it says nothing of a document.
  expect(localStorage.getItem('tinyoffice.shareNoticeSeen')).toBe('1');
  d.close();
  shell = await written(null!);
  d = await open(shell);
  expect(d.querySelector('.to-share-notice')).toBeNull();
});

test('the lifetimes: one row of segments, a week by default, the choice written to shortTtl and remembered', async () => {
  let shell = await written(null!);
  let d = await open(shell);
  expect(d.querySelector('.to-ttl')).toBeNull();
  await shortOn(d);
  const radios = () => [...d.querySelectorAll<HTMLInputElement>('.to-share-short .to-ttl input[type=radio]')];
  expect(radios().map((r) => r.parentElement!.textContent)).toEqual(['an hour', 'a day', 'a week', 'a month']);
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
  await shortOn(d);
  expect(radios().find((r) => r.checked)!.value).toBe(String(30 * 86400));
});

test('Copy link with Short link on makes one short link, copies it and shows it with Copy; a second press makes no other', async () => {
  const shell = await written(null!);
  const calls: { url: string; body: { ttl: number } }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  const d = await open(shell);
  // What a short link is, in the tooltip of the info button right after its name: said to a screen reader as its
  // description, shown on a press, put away by Escape.
  const about = d.querySelector<HTMLButtonElement>('.to-share-short .to-tip-btn')!;
  expect(about.getAttribute('aria-label')).toBe('About Short Link');
  const tip = document.getElementById(about.getAttribute('aria-describedby')!)!;
  expect(tip.getAttribute('role')).toBe('tooltip');
  expect([...tip.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
    'To create a short link, we must store an encrypted copy of your document on our servers. The encryption key becomes part of the URL and never leaves your browser; without it, there is no way for us to read your data.',
    'Short links cannot be manually edited or deleted before their expiration date.',
  ]);
  expect(tip.matches(':popover-open')).toBe(false);
  about.click();
  await until(() => tip.matches(':popover-open'));
  tip.hidePopover();
  await shortOn(d);
  // "Expire after" names the lifetimes.
  expect(d.querySelector('#to-ttl-label')!.textContent).toBe('Expire after');
  expect(d.querySelector('.to-ttl')!.getAttribute('aria-labelledby')).toBe('to-ttl-label');
  expect(calls).toHaveLength(0);
  await clipboard(async (copied) => {
    d.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
    await until(() => copied().includes('/abcdefg#'));
    await until(() => !!d.querySelector('.to-short-field'));
    d.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
    await until(() => said() === 'Link copied');
  });
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

test('a short link says its limit before the press: over it, Make is disabled with the numbers, and the header says it too (Paul, 2026-10-11)', async () => {
  // Under it: Make is pressable and there is no hint.
  let shell = await written(null!);
  let d = await open(shell);
  await shortOn(d);
  expect(d.querySelector<HTMLButtonElement>('.to-copy-link')!.disabled).toBe(false);
  expect(d.querySelector('.to-short-why')).toBeNull();
  expect(shell.querySelector('.to-meter')!.getAttribute('aria-label')).toMatch(/^[\d,]+ of [\d,]+ link characters left$/);
  // Past some browsers' limit but not a short link's: the header says how much a short link holds.
  shell = await written(null!, `${Array.from({ length: 900 }, () => Math.random().toString(36).slice(2, 8)).join(' ')}\n`);
  expect(shell.querySelector('.to-meter')!.getAttribute('aria-label')).toMatch(/^[\d,]+ characters over the link limit; a short link holds 12,272$/);
  d = await open(shell);
  await shortOn(d);
  expect(d.querySelector<HTMLButtonElement>('.to-copy-link')!.disabled).toBe(false);
  expect(d.querySelector('.to-short-why')).toBeNull();
  // Over it: random words, which do not compress, past what a short link holds.
  const words = Array.from({ length: 4000 }, () => Math.random().toString(36).slice(2, 8)).join(' ');
  shell = await written(null!, `${words}\n`);
  d = await open(shell);
  const n = new TextEncoder().encode(shell.link).length;
  expect(n).toBeGreaterThan(SHORT_LINK_MAX);
  const fmt = (x: number) => x.toLocaleString('en');
  // Copy link and the QR code wait while Short link is on, and are back with it off.
  expect(d.querySelector<HTMLButtonElement>('.to-copy-link')!.disabled).toBe(false);
  await shortOn(d);
  expect(d.querySelector<HTMLButtonElement>('.to-copy-link')!.disabled).toBe(true);
  expect(d.querySelector<HTMLButtonElement>('.to-qr-open')!.disabled).toBe(true);
  expect(d.querySelector('.to-short-why')!.textContent).toBe(
    `This document is ${fmt(n)} characters; a short link holds ${fmt(SHORT_LINK_MAX)}. Shorten it by ${fmt(n - SHORT_LINK_MAX)} and it will fit.`,
  );
  // Max Link Sizes has the short link, over (opened from the head line, in Share's place).
  d.querySelector<HTMLButtonElement>('.to-fit-words')!.click();
  await until(() => !!shell.querySelector('.to-rooms tr'));
  const row = [...shell.querySelectorAll('.to-rooms tr')].find((r) => r.querySelector('th')?.textContent === 'a short link')!;
  expect(row.classList.contains('over')).toBe(true);
  expect(row.querySelector('td:last-child')!.textContent).toBe(`No, ${fmt(n - SHORT_LINK_MAX)} over`);
  // The header's meter names the short link, the first place the link no longer fits from the roomiest down.
  expect(shell.querySelector('.to-meter')!.getAttribute('aria-label')).toMatch(/^[\d,]+ characters over what a short link holds$/);
});

test('every short link made is kept in the list folded under "n short links kept here", with Remove', async () => {
  setKeeping(true);
  keepLink({ link: `https://tinier.tinylittleoffice.com/zzzzzzz#${'K'.repeat(43)}`, title: 'Old notes', made: Date.now() - DAY, expires: Date.now() + 3 * DAY });
  const shell = await written(null!, '---\ntitle: New notes\n---\nWords.\n');
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } }));
  const d = await open(shell);
  let kept = d.querySelector<HTMLDetailsElement>('.to-kept-list')!;
  expect(kept.querySelector('summary')!.textContent).toBe('1 short link kept here');
  expect(kept.open).toBe(false);
  kept.querySelector('summary')!.click();
  await until(() => kept.open);
  expect(kept.querySelector('li a')!.textContent).toBe('Old notes');
  expect(kept.querySelector('li small')!.textContent).toMatch(/^Expires in 3 days/);

  await shortOn(d);
  await clipboard(async () => {
    d.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
    await until(() => d.querySelector('.to-kept-list summary')?.textContent === '2 short links kept here');
  });
  const made = keptLinks().find((l) => l.link.includes('/abcdefg#'))!;
  expect(made).toMatchObject({ title: 'New notes', link: d.querySelector<HTMLInputElement>('.to-short-field')!.value });
  // Nothing about owning it: the link is all there is.
  expect(d.querySelector('.to-owner, .to-keep, .to-update, .to-forget, .to-extend')).toBeNull();
  expect(Object.keys(made).sort()).toEqual(['expires', 'link', 'made', 'title']);
  // Remove one.
  kept = d.querySelector<HTMLDetailsElement>('.to-kept-list')!;
  kept.open = true;
  await tick();
  [...kept.querySelectorAll<HTMLButtonElement>('li button')].at(-1)!.click();
  await until(() => d.querySelector('.to-kept-list summary')?.textContent === '1 short link kept here');
  dropKept(made.link);
});

test('the QR code: beside Copy link, its own dialog of what Copy link gives, with PNG and SVG; else one sentence why', async () => {
  let shell = await written(null!);
  let d = await open(shell);
  const qr = () => shell.querySelector<ToDialog>('to-dialog.to-qr-dialog')!;
  d.querySelector<HTMLButtonElement>('.to-qr-open')!.click();
  await until(() => qr().dialog.open && !!qr().querySelector('.to-qr-code svg'));
  // Share steps aside for it, and is back when it closes.
  expect(d.dialog.open).toBe(false);
  expect([...qr().querySelectorAll('button')].map((b) => b.textContent!.trim())).toEqual(expect.arrayContaining(['PNG', 'SVG']));
  qr().close();
  await until(() => d.dialog.open);
  // Too much for any code: random words, which do not compress.
  const words = Array.from({ length: 900 }, () => Math.random().toString(36).slice(2, 8)).join(' ');
  shell = await written(null!, `${words}\n`);
  expect(decodeDoc(location.hash.split('/').pop()!)).toContain(words.slice(0, 20));
  d = await open(shell);
  d.querySelector<HTMLButtonElement>('.to-qr-open')!.click();
  await until(() => qr().dialog.open && !!qr().querySelector('.to-qr-why'));
  expect(qr().querySelector('.to-qr-code')).toBeNull();
  expect(qr().querySelector('.to-qr-why')!.textContent).toMatch(/^This document is [\d,]+ bytes; the largest QR code holds/);
  qr().close();
});

/* ---------- a preview with a link shared with a network ---------- */

/** The site's /card, stubbed: what was posted to it, and the id it hands back (or a failure). */
function cards(answer: 'ok' | 'offline' | 429 = 'ok') {
  const posted: { url: string; body: { png: string; title: string; text: string; app: string } }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    if (!String(url).endsWith('/card')) throw new Error(`unexpected fetch ${url}`);
    posted.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    if (answer === 'offline') throw new TypeError('Failed to fetch');
    if (answer === 429) return new Response(JSON.stringify({ error: 'A hundred previews a day from one address; try tomorrow.' }), { status: 429 });
    return new Response(JSON.stringify({ id: 'k8hwicw', exp: Date.now() + 30 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  return posted;
}
/** Press a network's button, say Go to the link guard, and return the address the compose box opened at. */
async function press(d: ToDialog, service: string, opened: { mock: { calls: unknown[][] } }) {
  const before = opened.mock.calls.length;
  d.querySelector<HTMLButtonElement>(`.to-post-${service}`)!.click();
  // The card is drawn and posted first, which GitHub's runner under load takes seconds over (as test/browser/agents.test.ts found).
  await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-go'), 20_000, 'the link guard never asked: the card is drawn and posted first');
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-go')!.click();
  await until(() => opened.mock.calls.length > before);
  await until(() => !document.querySelector('to-dialog.to-link-guard dialog[open]'));
  return String(opened.mock.calls.at(-1)![0]);
}
/** The link inside a compose box's address. */
const linkIn = (compose: string) => /https?:\/\/\S+/.exec(new URL(compose).searchParams.get('text') ?? new URL(compose).searchParams.get('url') ?? '')![0];

/** The link a network gets: the card's id in the path, /c/<id>, before the hash (kit/share/card.ts withCardId). */
const cardLink = (link: string, id: string) => {
  const u = new URL(link);
  return `${u.origin}${u.pathname.replace(/[^/]*$/, '')}c/${id}${u.hash}`;
};

test('with the switch on (it is, unless turned off), Bluesky uploads one card of the first page and posts the link with /c/<id> before the #; X then uploads nothing more', async () => {
  const shell = await written(null!, '---\ntitle: Garden plan\n---\n# Garden plan\n\nTomatoes by the fence, beans on the trellis.\n');
  const posted = cards();
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const d = await open(shell);
  // On a computer the networks' alone, under their buttons.
  const toggle = d.querySelector<HTMLInputElement>('.to-share-post .to-share-preview input[role=switch]')!;
  expect(toggle.checked).toBe(true);
  expect(d.querySelector('.to-share-preview')!.textContent).toContain('Share as Preview Card');
  const tip = d.querySelector('.to-share-preview .to-tip-btn')!;
  expect([...document.getElementById(tip.getAttribute('aria-describedby')!)!.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
    'In apps and social networks, show the title and a screenshot of your document along with the link.',
    'This data will be stored on our servers, visible to anyone, for up to a month.',
  ]);
  expect(d.querySelector('.to-post')!.compareDocumentPosition(d.querySelector('.to-share-preview')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const bluesky = await press(d, 'bluesky', opened);
  expect(new URL(bluesky).host).toBe('bsky.app');
  expect(posted).toHaveLength(1);
  expect(posted[0].url).toBe(`${location.origin}${location.pathname.replace(/[^/]*$/, '')}card`);
  expect(posted[0].body).toMatchObject({ title: 'Garden plan', text: 'Tomatoes by the fence, beans on the trellis.', app: 'write' });
  // A PNG of 1200 by 630, as the server will take it.
  const png = Uint8Array.from(atob(posted[0].body.png), (c) => c.charCodeAt(0));
  expect([...png.slice(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
  const bitmap = await createImageBitmap(new Blob([png], { type: 'image/png' }));
  expect([bitmap.width, bitmap.height]).toEqual([1200, 630]);
  expect(png.length).toBeLessThanOrEqual(400 * 1024);
  const link = linkIn(bluesky);
  expect(link).toBe(cardLink(shell.link, 'k8hwicw'));
  // The same document to another network: the same card, nothing uploaded again.
  const x = await press(d, 'x', opened);
  expect(posted).toHaveLength(1);
  expect(new URL(x).searchParams.get('url')).toBe(link);
});

test('at 1100 wide Copy Link and the QR code are one line, apart, each switch’s words beside it', async () => {
  await page.viewport(1100, 800);
  try {
    const shell = await written(null!);
    const d = await open(shell);
    const [copy, qr] = [d.querySelector<HTMLButtonElement>('.to-copy-link')!, d.querySelector<HTMLButtonElement>('.to-qr-open')!];
    const [a, b] = [copy.getBoundingClientRect(), qr.getBoundingClientRect()];
    expect(Math.round(a.top)).toBe(Math.round(b.top));
    expect(a.right).toBeLessThan(b.left);
    for (const sw of d.querySelectorAll<HTMLInputElement>('.to-share-options input[role=switch]')) {
      const words = sw.closest('label')!.querySelector('b')!.getBoundingClientRect();
      expect(words.left).toBeGreaterThan(sw.getBoundingClientRect().right);
    }
  } finally {
    await page.viewport(414, 896);
  }
});

test('with the switch off, nothing is uploaded and the link has no card; the choice is kept; Copy link and Email never upload', async () => {
  const shell = await written(null!, '---\ntitle: Quiet\n---\nNot for a feed.\n');
  const posted = cards();
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  let d = await open(shell);
  await clipboard(async (copied) => {
    d.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
    await until(() => copied() === shell.link);
  });
  const mail = await press(d, 'email', opened);
  expect(mail).not.toContain('c%3D');
  expect(posted).toHaveLength(0);
  const toggle = d.querySelector<HTMLInputElement>('.to-share-preview input')!;
  toggle.click();
  await shell.updateComplete;
  expect(store.get('tinyoffice.preview')).toBe('0');
  const bluesky = await press(d, 'bluesky', opened);
  expect(posted).toHaveLength(0);
  expect(linkIn(bluesky)).toBe(shell.link);
  // The next Share opens with it off.
  d.close();
  const again = await written(null!, '---\ntitle: Quieter\n---\nStill not.\n');
  d = await open(again);
  expect(d.querySelector<HTMLInputElement>('.to-share-preview input')!.checked).toBe(false);
  store.remove('tinyoffice.preview');
});

test('an upload that fails shares without a preview and says why: offline, or the day’s hundred', async () => {
  for (const [answer, why] of [
    ['offline', 'the server could not be reached'],
    [429, 'a hundred previews a day from one address'],
  ] as const) {
    const shell = await written(null!, `---\ntitle: Failing ${answer}\n---\nWords.\n`);
    const posted = cards(answer);
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    const d = await open(shell);
    const bluesky = await press(d, 'bluesky', opened);
    expect(posted).toHaveLength(1);
    expect(linkIn(bluesky)).toBe(shell.link);
    await until(() => said() === `Shared without a preview: ${why}`);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

/* ---------- a network's button while its card is drawn and posted ---------- */

/** The site's /card, stubbed and held open until `release`: what was posted, and whether it then answers or fails. */
function heldCards(answer: 'ok' | 'offline' = 'ok') {
  const posted: string[] = [];
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  vi.stubGlobal('fetch', async (url: string) => {
    posted.push(String(url));
    await held;
    if (answer === 'offline') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify({ id: 'k8hwicw', exp: Date.now() + 30 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } });
  });
  return { posted, release: () => release() };
}
/** Every change a button's words or aria-busy go through, from now on. */
function watch(btn: HTMLElement) {
  const seen: string[] = [];
  const o = new MutationObserver(() => seen.push(`${btn.textContent!.trim()}|${btn.getAttribute('aria-busy')}`));
  o.observe(btn, { subtree: true, characterData: true, childList: true, attributes: true, attributeFilter: ['aria-busy'] });
  onTestFinished(() => o.disconnect());
  return seen;
}
const guardOpen = () => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-go');
const postButton = (d: ToDialog, s: string) => d.querySelector<HTMLButtonElement>(`.to-post-${s}`)!;

test('Paul, 2026-10-12: "Make it look like the button is working": Bluesky says Making the preview… while its card is posted, a second press does nothing, and the guard returns the focus to it', async () => {
  const shell = await written(null!, '---\ntitle: Slow card\n---\nOn a slow line.\n');
  const { posted, release } = heldCards();
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const d = await open(shell);
  const bluesky = postButton(d, 'bluesky');
  const x = postButton(d, 'x');
  bluesky.focus();
  bluesky.click();
  await until(() => posted.length === 1 && bluesky.getAttribute('aria-busy') === 'true', 20_000, 'the card was never posted: it is drawn first, slowly under load');
  expect(bluesky.textContent!.trim()).toBe('Making the preview…');
  expect(bluesky.getAttribute('aria-label')).toBe('Making the preview…');
  // The disabled look, but not disabled: it keeps the focus.
  expect(bluesky.disabled).toBe(false);
  expect(getComputedStyle(bluesky).opacity).toBe('0.5');
  expect(document.activeElement).toBe(bluesky);
  expect(x.getAttribute('aria-label')).toBe('X');
  expect(x.hasAttribute('aria-busy')).toBe(false);
  // A second press, on another network or on Email, opens nothing and posts nothing.
  x.click();
  postButton(d, 'email').click();
  bluesky.click();
  await tick(50);
  expect(posted).toHaveLength(1);
  expect(guardOpen()).toBe(false);
  release();
  await until(guardOpen, 20_000, 'the link guard never asked after the upload was released');
  expect(document.querySelector('to-dialog.to-link-guard .lg-host')!.textContent).toBe('bsky.app');
  expect(document.querySelectorAll('to-dialog.to-link-guard dialog[open]')).toHaveLength(1);
  expect(bluesky.getAttribute('aria-label')).toBe('Bluesky');
  expect(bluesky.textContent!.trim()).toBe('');
  expect(bluesky.hasAttribute('aria-busy')).toBe(false);
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-cancel')!.click();
  await until(() => !guardOpen());
  await until(() => document.activeElement === bluesky, 3000, 'the focus did not come back to Bluesky');
  expect(opened).not.toHaveBeenCalled();
  expect(posted).toHaveLength(1);
});

test('Email, and a network with the switch off, open the guard at once and never change their words', async () => {
  const shell = await written(null!, '---\ntitle: No card\n---\nPlain.\n');
  const { posted } = heldCards();
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const d = await open(shell);
  const email = watch(postButton(d, 'email'));
  await press(d, 'email', opened);
  expect(email).toEqual([]);
  d.querySelector<HTMLInputElement>('.to-share-preview input')!.click();
  await shell.updateComplete;
  const bluesky = watch(postButton(d, 'bluesky'));
  const compose = await press(d, 'bluesky', opened);
  expect(linkIn(compose)).toBe(shell.link);
  expect(bluesky).toEqual([]);
  expect(posted).toHaveLength(0);
});

test('an upload that fails while the button is busy: the toast says so, the words come back, and the guard opens with the plain link', async () => {
  const shell = await written(null!, '---\ntitle: Offline card\n---\nNo line.\n');
  const { posted, release } = heldCards('offline');
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const d = await open(shell);
  const bluesky = postButton(d, 'bluesky');
  bluesky.click();
  await until(() => posted.length === 1 && bluesky.getAttribute('aria-busy') === 'true', 20_000, 'the card was never posted: it is drawn first, slowly under load');
  expect(bluesky.textContent!.trim()).toBe('Making the preview…');
  release();
  await until(guardOpen, 20_000, 'the link guard never asked after the upload was released');
  await until(() => said() === 'Shared without a preview: the server could not be reached');
  expect(bluesky.getAttribute('aria-label')).toBe('Bluesky');
  expect(bluesky.hasAttribute('aria-busy')).toBe(false);
  document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-go')!.click();
  await until(() => opened.mock.calls.length === 1);
  expect(linkIn(String(opened.mock.calls[0][0]))).toBe(shell.link);
});

test('the share sheet carries the card too; a document with a password greys the switch out and makes no card', async () => {
  const shell = await written(null!, '---\ntitle: Sheet share\n---\nTo the phone.\n');
  const posted = cards();
  const sent: ShareData[] = [];
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => void sent.push(data) });
  onTestFinished(() => void delete (navigator as { share?: unknown }).share);
  const d = await open(shell);
  d.querySelector<HTMLButtonElement>('.to-share-via')!.click();
  await until(() => sent.length === 1, 20_000, 'the share sheet never got the link: the card is drawn and posted first, slowly under load');
  expect(posted).toHaveLength(1);
  expect(sent[0].url).toBe(cardLink(shell.link, 'k8hwicw'));
  d.close();
  const locked = await sealedSheet('Private sums');
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const l = await open(locked);
  const off = l.querySelector<HTMLInputElement>('.to-share-preview input')!;
  expect([off.disabled, off.checked]).toEqual([true, false]);
  const bluesky = await press(l, 'bluesky', opened);
  expect(posted).toHaveLength(1);
  expect(linkIn(bluesky)).toBe(locked.link);
});

test('with a share sheet, Share… is the first button, then Copy Link and the QR code as icons, and Share as Preview Card among the switches', async () => {
  const sent: ShareData[] = [];
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => void sent.push(data) });
  onTestFinished(() => void delete (navigator as { share?: unknown }).share);
  store.set('tinyoffice.preview', '0');
  const shell = await written(null!);
  const d = await open(shell);
  const go = [...d.querySelectorAll<HTMLButtonElement>('.to-share-go > .to-btn')];
  expect(go.map((b) => b.className.match(/to-(share-via|qr-open|copy-link)/)![1])).toEqual(['share-via', 'copy-link', 'qr-open']);
  expect(go[0].classList.contains('primary')).toBe(true);
  expect(go[0].textContent!.trim()).toBe('Share…');
  for (const b of go.slice(1)) expect([b.classList.contains('primary'), b.textContent!.trim()]).toEqual([false, '']);
  expect(go[1].getAttribute('aria-label')).toBe('Copy Link');
  expect(go[1].querySelector('svg')).not.toBeNull();
  // On a phone or a tablet (a finger, no hover) the sheet copies: no Copy Link beside it.
  const media = window.matchMedia;
  window.matchMedia = (q: string) =>
    q.includes('hover: none')
      ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as MediaQueryList)
      : media.call(window, q);
  onTestFinished(() => void (window.matchMedia = media));
  shell.querySelector<ToShare>('to-share')!.requestUpdate();
  await until(() => !d.querySelector('.to-copy-link'));
  expect([...d.querySelectorAll('.to-share-go > .to-btn')].map((b) => b.className.match(/to-(share-via|qr-open|copy-link)/)![1])).toEqual(['share-via', 'qr-open']);
  // Share as Preview Card is one of the switches here: the sheet sends the card too.
  expect(d.querySelector('.to-share-options .to-share-preview')).not.toBeNull();
  expect(d.querySelector('.to-share-post .to-share-preview')).toBeNull();
  // It gives what the switches say: Preview Mode's Display Link here.
  d.querySelector<HTMLInputElement>('.to-present-switch')!.click();
  await shell.updateComplete;
  go[0].click();
  await until(() => sent.length === 1, 20_000);
  expect(sent[0].url).toBe(shell.displayLink);
});

test('every way out gives what the switches say: a network posts the Display Link and the short link too', async () => {
  // (Set before the shell: the dialog reads the choice as it is made.)
  store.set('tinyoffice.preview', '0');
  const shell = await written(null!, '---\ntitle: Switched\n---\nWords.\n');
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  const d = await open(shell);
  d.querySelector<HTMLInputElement>('.to-present-switch')!.click();
  await shell.updateComplete;
  expect(linkIn(await press(d, 'bluesky', opened))).toBe(shell.displayLink);
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } }));
  await shortOn(d);
  expect(linkIn(await press(d, 'bluesky', opened))).toMatch(/\/abcdefg#/);
});

/** The browser as another system says itself (navigator.userAgentData): Chromium on macOS, or elsewhere. */
function claim(platform: string) {
  Object.defineProperty(navigator, 'userAgentData', { configurable: true, value: { platform, brands: [{ brand: 'Chromium', version: '158' }], mobile: false } });
  onTestFinished(() => void delete (navigator as { userAgentData?: unknown }).userAgentData);
}

test('an open share sheet holds nothing: the button is ready again, and the picture goes as a file named for the document', async () => {
  claim('Windows');
  const sent: ShareData[] = [];
  // A sheet whose promise never settles (some browsers leave it so).
  Object.defineProperty(navigator, 'share', { configurable: true, value: (data: ShareData) => (sent.push(data), new Promise(() => {})) });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  onTestFinished(() => void (delete (navigator as { share?: unknown }).share, delete (navigator as { canShare?: unknown }).canShare));
  store.set('tinyoffice.preview', '0');
  const shell = await written(null!, '---\ntitle: Garden plan #2\n---\nTomatoes.\n');
  const d = await open(shell);
  const via = d.querySelector<HTMLButtonElement>('.to-share-via')!;
  via.click();
  await until(() => sent.length === 1, 20_000);
  await shell.updateComplete;
  expect(via.disabled).toBe(false);
  expect(sent[0].files!.map((f) => f.name)).toEqual(['garden-plan-2.png']);
});

test('Chromium on macOS gets the link alone: its sheet never opens for a share holding a file', async () => {
  claim('macOS');
  const sent: ShareData[] = [];
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => void sent.push(data) });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  onTestFinished(() => void (delete (navigator as { share?: unknown }).share, delete (navigator as { canShare?: unknown }).canShare));
  store.set('tinyoffice.preview', '0');
  const shell = await written(null!, '---\ntitle: On a Mac\n---\nWords.\n');
  const d = await open(shell);
  d.querySelector<HTMLButtonElement>('.to-share-via')!.click();
  await until(() => sent.length === 1, 20_000);
  expect(sent[0].files).toBeUndefined();
  expect(sent[0].url).toBe(shell.link);
});

test('a share sheet refused because the press had passed says to press again', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: async () => Promise.reject(new DOMException('no gesture', 'NotAllowedError')) });
  onTestFinished(() => void delete (navigator as { share?: unknown }).share);
  store.set('tinyoffice.preview', '0');
  const shell = await written(null!);
  const d = await open(shell);
  d.querySelector<HTMLButtonElement>('.to-share-via')!.click();
  await until(() => said() === 'The link is ready. Press Share again.', 20_000);
});

/* ---------- a document with a password ---------- */

/** A sheet sealed with a password, opened with it: the shell's own document, its link ciphertext. */
async function sealedSheet(title: string) {
  const text = `---\ntitle: ${title}\n---\nName | Phone\n--- | ---\nAda | 555 0101\n`;
  const shell = await mount(`#/v1/sheet/${await pack(text, await lockWith('pw'))}`);
  await until(() => !!shell.querySelector('to-dialog.to-unlock-dialog dialog[open] .to-unlock-field'));
  const field = shell.querySelector<HTMLInputElement>('.to-unlock-field')!;
  field.value = 'pw';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  shell.querySelector<HTMLButtonElement>('.to-unlock-go')!.click();
  await until(() => !!shell.querySelector('to-sheet-editor'));
  return shell;
}

test('a sealed document says nothing of itself: Share… sends no picture and no title, and Post, the QR file, the embed and a kept short link carry no title', async () => {
  const shell = await sealedSheet('Mutual aid contacts');
  const sent: ShareData[] = [];
  // The device's share sheet, which takes files.
  Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => void sent.push(data) });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  onTestFinished(() => void (delete (navigator as { share?: unknown }).share, delete (navigator as { canShare?: unknown }).canShare));
  const d = await open(shell);
  // Its own title in Share's head, a password or not: drawn here, never sent.
  expect(d.querySelector('.to-dialog-head h2')!.textContent).toBe('Share Mutual aid contacts');
  d.querySelector<HTMLButtonElement>('.to-share-via')!.click();
  await until(() => sent.length === 1, 20_000, 'the share sheet never got the link: the card is drawn and posted first, slowly under load');
  expect(sent[0].files).toBeUndefined();
  expect(`${sent[0].title} ${sent[0].text}`).not.toContain('Mutual aid');
  expect(sent[0].url).toBe(shell.link);
  // Post: the compose box's words are not the title.
  const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
  for (const cls of ['x', 'email']) {
    d.querySelector<HTMLButtonElement>(`.to-post-${cls}`)!.click();
    await until(() => !!document.querySelector('to-dialog.to-link-guard dialog[open] .lg-go'));
    document.querySelector<HTMLButtonElement>('to-dialog.to-link-guard .lg-go')!.click();
    await until(() => opened.mock.calls.length > 0);
    expect(decodeURIComponent(String(opened.mock.calls.pop()![0]))).not.toContain('Mutual aid');
    await tick(30);
  }
  // The QR code's file is "document-qr".
  const names: string[] = [];
  const w = window as unknown as { showSaveFilePicker?: unknown };
  const had = w.showSaveFilePicker;
  w.showSaveFilePicker = async (o: { suggestedName: string }) => (names.push(o.suggestedName), { createWritable: async () => ({ write: async () => {}, close: async () => {} }) });
  const qr = shell.querySelector<ToDialog>('to-dialog.to-qr-dialog')!;
  try {
    d.querySelector<HTMLButtonElement>('.to-qr-open')!.click();
    await until(() => qr.dialog.open && !!qr.querySelector('.to-qr-code'));
    [...qr.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === 'SVG')!.click();
    await until(() => names.length === 1);
  } finally {
    w.showSaveFilePicker = had;
  }
  qr.close();
  await until(() => d.dialog.open);
  expect(names).toEqual(['document-qr.svg']);
  // The embed code's frame is not named after it.
  await clipboard(async (copied) => {
    d.querySelector<HTMLButtonElement>('.to-copy-embed')!.click();
    await until(() => copied().includes('<iframe'));
    expect(copied()).not.toContain('Mutual aid');
  });
  // A short link kept under Saved keeps no title.
  setKeeping(true);
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ id: 'abcdefg', exp: Date.now() + 7 * DAY }), { status: 201, headers: { 'content-type': 'application/json' } }));
  await shortOn(d);
  await clipboard(async () => {
    d.querySelector<HTMLButtonElement>('.to-copy-link')!.click();
    await until(() => keptLinks().some((l) => l.link.includes('/abcdefg#')));
  });
  const kept = keptLinks().find((l) => l.link.includes('/abcdefg#'))!;
  expect(kept.title).toBe('');
  dropKept(kept.link);
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
    // A short link cannot be extended: the banner has no Extend.
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
  const shell = await arrive(12);
  const opened: string[] = [];
  vi.spyOn(window, 'open').mockImplementation((url?: string | URL) => (opened.push(String(url)), null));
  shell.querySelector<HTMLButtonElement>('.to-arrival-copy')!.click();
  expect(opened.length).toBe(1);
  const u = new URL(opened[0]);
  expect(u.hash).not.toContain('?');
  const doc = decodeDoc(u.hash.replace('#/v1/write/', ''));
  expect(doc).toContain('title: Copy of Plans');
  expect(doc).toContain('Words.');
  await until(() => said() === 'A copy opened in a new tab');
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
    const shell = await arrive(12);
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
