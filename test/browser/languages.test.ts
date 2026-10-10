// Each language, chosen from the drawer at 390px: <html lang> and dir follow it (ar runs right to left), the home
// page, the drawer, the Word Processor's bar and the Share dialog draw with no English showing through, the bar
// stays one row and nothing in the drawer is wider than its place. A string that does not fit is named by its key,
// so the translator can shorten it. Until the translations land, two pseudo-languages from en.ts (test/pseudo.ts,
// every string a third longer) stand in; a language file in src/i18n/ is tested as it arrives, through its lazy chunk.
import { test, expect, afterEach } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { directionOf, languages, missed, register, setLanguage, type Strings } from '../../src/kit/i18n.ts';
import { pseudo } from '../pseudo.ts';
import en from '../../src/i18n/en.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

const files = import.meta.glob<{ default: Strings }>(['../../src/i18n/*.ts', '!../../src/i18n/en.ts']);
const fileCode = (path: string) => path.replace(/^.*\/([^/]+)\.ts$/, '$1');
const PSEUDO = ['en-xa', 'ar-xb'];
for (const code of PSEUDO) register(code, pseudo(code, en));

afterEach(async () => {
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
  const edge = drawer.getBoundingClientRect();
  for (const el of drawer.querySelectorAll<HTMLElement>('a, button, label, b, small, span, h2, h3, p')) {
    if (!el.getClientRects().length || el.closest('details:not([open])') || !el.textContent!.trim()) continue;
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
  shell.querySelector<HTMLButtonElement>('.to-header .to-share')!.click();
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
    expect(document.documentElement.dir).toBe(code === 'ar' || code.startsWith('ar-') ? 'rtl' : 'ltr');
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
    expect(problems.filter((p) => p.startsWith('English shows')), code).toEqual([]);
    all.push(...problems.map((p) => `${code}: ${p}`));
  }
  expect(all).toEqual([]);
});
