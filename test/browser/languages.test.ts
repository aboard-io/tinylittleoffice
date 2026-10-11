// Each language, chosen from the drawer at 390px: <html lang> and dir follow it (ar runs right to left), the home
// page, the drawer, the Word Processor's bar and the Share dialog draw with no English showing through, the bar
// stays one row and nothing in the drawer is wider than its place. A string that does not fit is named by its key,
// so the translator can shorten it. Until the translations land, two pseudo-languages from en.ts (test/pseudo.ts,
// every string a third longer) stand in; a language file in src/i18n/ is tested as it arrives, through its lazy chunk.
import { test, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until, openShare } from './helpers.ts';
import { parseHash } from '../../src/kit/route.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { chosenLanguage, directionOf, language, languagePending, languages, missed, register, setLanguage, type Strings } from '../../src/kit/i18n.ts';
import { takeHomeLink } from '../../src/apps/deck/view.ts';
import { parse } from '../../src/doc/index.ts';
import { pseudo } from '../pseudo.ts';
import en from '../../src/i18n/en.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToShare } from '../../src/kit/share-dialog.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';
import { keepSize, SIZE_MAX } from '../../src/kit/zoom.ts';

const files = import.meta.glob<{ default: Strings }>(['../../src/i18n/*.ts', '!../../src/i18n/en.ts']);
const fileCode = (path: string) => path.replace(/^.*\/([^/]+)\.ts$/, '$1');
const PSEUDO = ['en-xa', 'ar-xb'];
for (const code of PSEUDO) register(code, pseudo(code, en));

afterEach(async () => {
  keepSize(1);
  await setLanguage(null);
  await page.viewport(1100, 800);
  history.replaceState(null, '', location.pathname);
});

/** The key a drawn string came from, in this language: its words, back to en.ts. */
function keyOf(strings: Strings, text: string): string {
  const words = text.replace(/\s+/g, ' ').trim();
  const hit = Object.entries(strings).find(([, v]) => v.trim() === words);
  return hit ? hit[0] : words;
}

/** The translated words in the row an element sits in, by key: what to shorten when the row does not fit. */
function named(strings: Strings, el: HTMLElement): string[] {
  const row = el.closest<HTMLElement>('.to-field, .to-switch, .to-app-head, .to-btn, a') ?? el;
  const words = new Set(Object.values(strings).map((v) => v.trim()));
  const out: string[] = [];
  const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.textContent!.replace(/\s+/g, ' ').trim();
    if (text && words.has(text)) out.push(keyOf(strings, text));
  }
  return out.length ? out : [keyOf(strings, el.textContent!)];
}

async function choose(shell: ToShell, code: string) {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => shell.querySelector<HTMLDialogElement>('dialog.to-drawer')!.open);
  const select = [...shell.querySelectorAll<HTMLSelectElement>('.to-drawer select')].find((s) => [...s.options].some((o) => o.value === code))!;
  expect(select, `${code} in the drawer`).toBeTruthy();
  select.value = code;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => document.documentElement.lang === code, 10_000);
}

/** Where a language falls short at 390px, each problem naming the key. */
async function check(strings: Strings): Promise<string[]> {
  const problems: string[] = [];
  const english = () => {
    for (const k of missed) problems.push(`English shows: "${k}"`);
    missed.clear();
  };
  // The home page.
  missed.clear();
  const home = await mount('');
  await tick(100);
  english();
  // The drawer: drawn in the language, every line inside its place.
  home.querySelector<HTMLButtonElement>('.to-burger')!.click();
  const drawer = home.querySelector<HTMLDialogElement>('dialog.to-drawer')!;
  await until(() => drawer.open && !!drawer.querySelector('.to-drawer-prefs'));
  await tick(50);
  english();
  // The skip link, shown as the keys find it: inside the screen, its words wrapped.
  const skip = home.querySelector<HTMLElement>('.to-skip');
  if (skip) {
    skip.style.transform = 'none';
    const r = skip.getBoundingClientRect();
    if (r.left < -0.5 || r.right > innerWidth + 0.5) problems.push(`the skip link does not fit: "${keyOf(strings, skip.textContent!)}"`);
    skip.style.transform = '';
  }
  const edge = drawer.getBoundingClientRect();
  for (const el of drawer.querySelectorAll<HTMLElement>('a, button, label, b, small, span, h2, h3, p, select')) {
    if (!el.getClientRects().length || el.closest('details:not([open])') || !(el.textContent!.trim() || el instanceof HTMLSelectElement)) continue;
    const r = el.getBoundingClientRect();
    const wide = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible';
    if (wide || r.left < edge.left - 0.5 || r.right > edge.right + 0.5) for (const k of named(strings, el)) problems.push(`drawer, does not fit: "${k}"`);
  }
  // The Word Processor's bar: one row, each label one line.
  const shell = await mount(`#/v1/write/${encodeDoc('Hello\n')}`);
  await until(() => !!shell.querySelector('to-write-editor') && !!shell.querySelector('.to-editor to-bar button'));
  await tick(100);
  english();
  const bar = shell.querySelector<HTMLElement>('.to-editor to-bar')!;
  const buttons = [...bar.querySelectorAll<HTMLElement>(':scope > .to-btn, :scope > * > .to-btn')].filter((b) => b.getClientRects().length);
  expect(buttons.length).toBeGreaterThan(3);
  const tallest = Math.max(...buttons.map((b) => b.getBoundingClientRect().height));
  if (bar.getBoundingClientRect().height > tallest * 1.5) problems.push(`the bar wraps to a second row`);
  for (const b of buttons) {
    const span = b.querySelector<HTMLElement>('span');
    if (span && span.textContent!.trim() && span.getBoundingClientRect().height >= parseFloat(getComputedStyle(span).fontSize) * 2) problems.push(`bar, wraps: "${keyOf(strings, span.textContent!)}"`);
  }
  // The Share dialog.
  await openShare(shell);
  const share = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => share.dialog.open && !!share.querySelector('.to-share-links'));
  await tick(100);
  english();
  share.close();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
  return [...new Set(problems)];
}

for (const path of Object.keys(files)) {
  const code = fileCode(path);
  test(`${code}: chosen in the drawer, loaded, and drawn at 390px with no English and nothing too long`, async () => {
    await page.viewport(390, 844);
    expect(languages()).toContain(code);
    await choose(await mount(''), code);
    expect(document.documentElement.dir).toBe(['ar', 'ur'].includes(code.split('-')[0]) ? 'rtl' : 'ltr');
    const problems = await check((await files[path]()).default);
    expect(problems, `${code}: shorten or translate these`).toEqual([]);
  });
}

test('the pseudo-languages, a third longer than English: chosen, the direction follows, no English shows; too-long strings named', async () => {
  await page.viewport(390, 844);
  const all: string[] = [];
  for (const code of PSEUDO) {
    await choose(await mount(''), code);
    expect(document.documentElement.dir).toBe(directionOf(code));
    expect(document.documentElement.dir).toBe(code === 'ar-xb' ? 'rtl' : 'ltr');
    const problems = await check(pseudo(code, en));
    expect(
      problems.filter((p) => p.startsWith('English shows')),
      code,
    ).toEqual([]);
    all.push(...problems.map((p) => `${code}: ${p}`));
  }
  expect(all).toEqual([]);
});

test('at the largest size (200%), the drawer, the bar and the skip link laid out at 390px still fit: nothing past the edge, in English and a third longer', async () => {
  await page.viewport(390, 844);
  keepSize(SIZE_MAX);
  const all: string[] = [];
  for (const code of ['en', ...PSEUDO]) {
    if (code !== 'en') await choose(await mount(''), code);
    all.push(...(await check(code === 'en' ? en : pseudo(code, en))).map((p) => `${code}: ${p}`));
  }
  expect(all).toEqual([]);
});

test('the language is in the link, not on the device: chosen in the drawer it joins the address and Share’s link, the browser’s takes it out, and a link with it opens in it', async () => {
  const stored = () => Object.keys(localStorage).filter((k) => /lang/i.test(k));
  const shell = await mount(`#/v1/write/${encodeDoc('Bonjou\n')}`);
  await until(() => !!shell.querySelector('to-write-editor'));
  await choose(shell, 'ht');
  await until(() => parseHash(location.hash).lang === 'ht');
  expect(parseHash(location.hash)).toMatchObject({ app: 'write', lang: 'ht' });
  expect(parseHash(new URL(shell.link).hash).lang).toBe('ht');
  expect(parseHash(new URL(shell.displayLink).hash)).toMatchObject({ display: true, lang: 'ht' });
  expect(stored()).toEqual([]);
  expect(document.cookie).toBe('');
  // Typing keeps it in the address.
  shell.querySelector<HTMLElement>('to-write-editor')!.dispatchEvent(new CustomEvent('docchange', { detail: 'Bonjou tout moun\n', bubbles: true }));
  shell.flushLink();
  expect(parseHash(location.hash).lang).toBe('ht');
  // Another page of the site, reached by a link without it, keeps the page's language: the home page, and a document
  // opened from the library, a template, a dropped file or a zip (each a route to a link without it).
  location.hash = '#/';
  await until(() => location.hash === '#/?lang=ht');
  expect(document.documentElement.lang).toBe('ht');
  const other = encodeDoc('Lòt dokiman\n');
  location.hash = `#/v1/write/${other}`;
  await until(() => parseHash(location.hash).lang === 'ht' && !!shell.querySelector('to-write-editor'));
  expect(parseHash(location.hash)).toMatchObject({ app: 'write', payload: other, lang: 'ht' });
  expect(document.documentElement.lang).toBe('ht');
  location.hash = '#/';
  await until(() => location.hash === '#/?lang=ht');
  // The browser's language again: out of the address and of every link made.
  const select = shell.querySelector<HTMLSelectElement>('.to-drawer-lang select')!;
  select.value = '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => location.hash === '#/' && document.documentElement.lang === 'en');
  expect(chosenLanguage()).toBeNull();
  expect(stored()).toEqual([]);
  // A reload of a link in Kreyòl (the visit's memory gone, as a new page has none) opens in Kreyòl.
  const again = await mount('#/?lang=ht');
  await until(() => document.documentElement.lang === 'ht');
  expect(again.querySelector('.to-burger')!.getAttribute('aria-label')).not.toBe('Menu');
  expect(location.hash).toBe('#/?lang=ht');
  expect(stored()).toEqual([]);
});

test('the embed code, the deck’s show link and its take-home QR carry the language chosen', async () => {
  const deck = '## Lansman {.title}\n\n---\n\n## Objektif\n\n- Voye l\n';
  const shell = await mount(`#/v1/deck/${encodeDoc(deck)}`);
  await until(() => !!shell.querySelector('to-deck-editor'));
  await choose(shell, 'ht');
  await until(() => parseHash(location.hash).lang === 'ht');
  await openShare(shell);
  const d = shell.querySelector<ToDialog>('to-dialog.to-share-dialog')!;
  await until(() => d.dialog.open && !!d.querySelector('.to-copy-embed') && !!d.querySelector('.to-copy-show'));
  const copied: string[] = [];
  const clip = navigator.clipboard.writeText;
  navigator.clipboard.writeText = async (s: string) => void copied.push(s);
  try {
    d.querySelector<HTMLButtonElement>('.to-copy-embed')!.click();
    d.querySelector<HTMLButtonElement>('.to-copy-show')!.click();
    await until(() => copied.length === 2);
  } finally {
    navigator.clipboard.writeText = clip;
  }
  const code = copied.find((c) => c.startsWith('<iframe'))!;
  const show = copied.find((c) => !c.startsWith('<iframe'))!;
  const src = /src="([^"]+)"/.exec(code)![1].replace(/&amp;/g, '&');
  expect(parseHash(new URL(src).hash)).toMatchObject({ app: 'deck', view: 'embed', lang: 'ht' });
  expect(parseHash(new URL(show).hash)).toMatchObject({ app: 'deck', show: true, lang: 'ht' });
  expect(parseHash(new URL(shell.querySelector<ToShare>('to-share')!.showLink).hash).lang).toBe('ht');
  d.close();
  // The take-home QR's link, in the language the deck is shown in.
  expect(parseHash(new URL(takeHomeLink(parse(deck))).hash)).toMatchObject({ app: 'deck', display: true, lang: 'ht' });
});

test('a link in a language whose dictionary is on its way draws nothing until it is here, so no English flashes; a slower dictionary arriving after a newer choice is dropped', async () => {
  let arrive!: (m: { default: Strings }) => void;
  register('xx', () => new Promise((r) => (arrive = r)));
  const shell = await mount('#/?lang=xx');
  expect(languagePending()).not.toBeNull();
  await tick(100);
  expect(shell.textContent!.trim()).toBe('');
  expect(shell.querySelector('.to-burger')).toBeNull();
  expect(language()).toBe('en');
  arrive({ default: pseudo('xx', en) });
  await until(() => document.documentElement.lang === 'xx' && !!shell.querySelector('.to-burger'));
  expect(shell.querySelector('.to-burger')!.getAttribute('aria-label')).not.toBe('Menu');
  expect(location.hash).toBe('#/?lang=xx');
  // A slow choice overtaken by a quick one: the slow dictionary, when it comes, is not put in force.
  let late!: (m: { default: Strings }) => void;
  register('xy', () => new Promise((r) => (late = r)));
  register('xz', pseudo('xz', en));
  const slow = setLanguage('xy');
  await setLanguage('xz');
  expect(language()).toBe('xz');
  late({ default: pseudo('xy', en) });
  await slow;
  await tick(50);
  expect(language()).toBe('xz');
  expect(document.documentElement.lang).toBe('xz');
  expect(location.hash).toBe('#/?lang=xz');
});

test('a page of an app with an empty address ("/sheet/"): the language chosen joins a link to that app, not the home page', async () => {
  const home = location.pathname;
  const page = home.replace(/[^/]*$/, '') + 'sheet/';
  try {
    history.replaceState(null, '', page);
    const shell = await mount('');
    await until(() => !!shell.querySelector('to-sheet-editor'));
    expect(location.hash).toBe('');
    await choose(shell, 'ht');
    await until(() => parseHash(location.hash).lang === 'ht');
    expect(parseHash(location.hash)).toMatchObject({ app: 'sheet', payload: '', lang: 'ht' });
    expect(location.pathname).toBe(page);
    expect(shell.querySelector('to-sheet-editor')).not.toBeNull();
  } finally {
    history.replaceState(null, '', home);
  }
});
