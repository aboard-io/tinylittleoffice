// The Board in every language Tiny Little Office speaks, on a bare page: its messages are a group of every language's
// file (src/i18n/), each saying every message English has, in the same form; and with the page's language set,
// `t()` says each of the Board's messages as that file does, the definition is named in it, a blank board is born with
// its lanes and its columns in it, and the Board mounted draws its lanes, its count and its bar's words in it, the
// suite's own words beside them in the same language. Right to left, on a screen wide enough for the lanes to sit side
// by side, the lanes run that way and the arrows with them.
import { afterAll, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { parse } from '../../../doc/index.ts';
import { languages, setLanguage, t } from '../../../kit/core/i18n.ts';
import def from '../def.ts';
import { boardOf } from '../model.ts';
import { board, until } from './page.ts';

afterAll(() => setLanguage(null));

/** Each language's file, by its code ("en", "pt-br"): the suite's, where the Board's messages are a group of their own. */
const words: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../../../i18n/*.ftl', { query: '?raw', import: 'default', eager: true })).map(([path, source]) => [path.replace(/^.*\/([^/]+)\.ftl$/, '$1'), source]),
);

/** A file's messages: each id, and its value where it is one line with no placeable (the rest are plurals and sentences with a name in them). */
function messagesOf(source: string): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const line of source.split('\n')) {
    const m = /^(board-[a-z0-9-]+) = ?(.*)$/.exec(line);
    if (m) out.set(m[1], m[2] && !m[2].includes('{') ? m[2] : null);
  }
  return out;
}
const english = messagesOf(words.en);

test('a group in every language the suite speaks; with every message English has, and no other', () => {
  expect(Object.keys(words).sort()).toStrictEqual([...languages()].sort());
  expect(english.size).toBe(34);
  for (const [code, source] of Object.entries(words)) {
    const here = messagesOf(source);
    expect([...here.keys()].sort(), code).toStrictEqual([...english.keys()].sort());
    // A message with a placeable or a plural in English has one here too, and a plain one stays plain.
    for (const [id, value] of english) expect(here.get(id) === null, `${code} ${id}`).toBe(value === null);
  }
});

test('in each language: every message said as its file says it, the Board named in it, a blank board born in it, and the Board drawn in it', async () => {
  for (const code of Object.keys(words)) {
    await setLanguage(code === 'en' ? null : code);
    const here = messagesOf(words[code]);
    for (const [id, value] of here) if (value !== null) expect(t(id), `${code} ${id}`).toBe(value);
    expect(t('board-n-cards', { n: 3 }), code).not.toBe('board-n-cards');
    expect([def.name, def.noun, def.blurb]).toStrictEqual([here.get('board-board'), here.get('board-board-lowercase'), here.get('board-cards-in-lanes-by-status')]);
    // A blank board: its lanes in this language, its title column the suite's word for a title, its status column the Board's.
    const blank = boardOf(parse(def.blank()));
    expect(
      blank.lanes.map((l) => l.name),
      code,
    ).toStrictEqual([here.get('board-to-do'), here.get('board-doing'), here.get('board-done')]);
    expect(blank.cols.map((c) => [c.name, c.type])).toStrictEqual([
      [t('common-title'), 'text'],
      [here.get('board-status'), 'option'],
    ]);
    // Mounted: its lanes, its count, its bar and its name; the suite's Insert beside them.
    const { el } = await board(def.blank());
    await until(() => el.querySelectorAll('.board-lane').length === 3, `${code}: the lanes were never drawn`);
    expect([...el.querySelectorAll('.board-lane')].map((l) => l.getAttribute('aria-label'))).toStrictEqual(blank.lanes.map((l) => l.name));
    expect(el.querySelector('.board')!.getAttribute('aria-label')).toBe(here.get('board-board'));
    expect(el.querySelector('.board-total')!.textContent).toBe(t('board-n-cards', { n: 0 }));
    expect(el.querySelector('.board-none')!.textContent).toBe(here.get('board-no-cards'));
    expect(el.querySelector('to-bar button[aria-label]:not(to-insert *)')!.getAttribute('aria-label')).toBe(here.get('board-open-cards-in-spreadsheet'));
    expect(el.querySelector('to-insert > button')!.textContent!.trim()).toBe(t('common-insert'));
  }
});

test('right to left: the lanes run from the right, and Left goes to the lane after', async () => {
  // Wide enough for the lanes to sit side by side, so their order is measured rather than skipped as it is where they
  // stack; the width put back after, Vitest's own (414 by 896), where the other tests ran.
  await page.viewport(1100, 800);
  try {
    const mounted = async () => {
      const { el } = await board(def.blank());
      const [a, b] = [...el.querySelectorAll<HTMLElement>('.board-lane')].map((l) => l.getBoundingClientRect());
      expect(Math.round(b.top), 'the lanes side by side').toBe(Math.round(a.top));
      return { el, a, b };
    };
    for (const code of ['ar', 'he', 'ur', 'yi']) {
      await setLanguage(code);
      const { el, a, b } = await mounted();
      expect(getComputedStyle(el).direction, code).toBe('rtl');
      expect(a.left, `${code}: the first lane on the right`).toBeGreaterThan(b.right);
      expect([el.sideOf('ArrowLeft'), el.sideOf('ArrowRight')]).toStrictEqual([1, -1]);
    }
    await setLanguage(null);
    const { el, a, b } = await mounted();
    expect([getComputedStyle(el).direction, el.sideOf('ArrowLeft')]).toStrictEqual(['ltr', -1]);
    expect(b.left, 'left to right: the first lane on the left').toBeGreaterThan(a.right);
  } finally {
    await page.viewport(414, 896);
  }
});
