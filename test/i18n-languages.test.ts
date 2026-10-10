// Every language file, against en.ts: the checks that make a translation safe to merge, and every string drawn
// in it with representative numbers. Until the translations land, two pseudo-languages made from en.ts (test/pseudo.ts)
// stand in, so the checks themselves are tested.
import { test, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { t, register, setLanguage, languages, languageName, missed } from '../src/kit/i18n.ts';
import { checkLanguage, gaps, languageFiles, pluralCount, placeholders } from '../scripts/i18n-extract.ts';
import { pseudo } from './pseudo.ts';
import en from '../src/i18n/en.ts';

const root = join(import.meta.dirname, '..');
const files = languageFiles(root).filter(([code]) => code !== 'en');
afterAll(() => setLanguage(null));

/** Every key drawn in the language in use: each placeholder as its name, a number (a plural, or {n}) as 0, 1, 2, 5 and 21. */
function drawAll(code: string, strings: Record<string, string>) {
  for (const key of Object.keys(en)) {
    const names = [...new Set(placeholders(key))];
    const counted = new Set([...key.matchAll(/\{(\w+)\|/g)].map((m) => m[1]).concat(names.filter((n) => n === 'n')));
    for (const n of [0, 1, 2, 5, 21]) {
      const vars = Object.fromEntries(names.map((name) => [name, counted.has(name) ? n : name]));
      let out = '';
      expect(() => (out = t(key, vars)), `${code}: ${key}`).not.toThrow();
      expect(out, `${code}: ${key}`).not.toMatch(/\{\w+(\|[^}]*)?\}/);
      if (strings[key]) expect(out.length, `${code}: ${key}`).toBeGreaterThan(0);
      for (const name of names) if (!counted.has(name)) expect(out, `${code}: ${key}`).toContain(name);
    }
  }
}

test('the plural categories a language has: fr three, ja one, ar six, pl four', () => {
  expect([pluralCount('en'), pluralCount('fr'), pluralCount('ja'), pluralCount('ar'), pluralCount('pl'), pluralCount('de')]).toEqual([2, 3, 1, 6, 4, 2]);
});

test('the check: missing keys fail, extra keys warn, placeholders once, plural forms by the language, no sort-me heading', () => {
  const base = { Menu: 'Menu', 'Share': 'Share', '{n} more': '{n} more', '{n|one slide|# slides}': '{n|one slide|# slides}', '·': '·', 'Pixel art, {n} by {n}': 'Pixel art, {n} by {n}' };
  const good = { Menu: 'Menu', Share: 'Partager', '{n} more': '{n} de plus', '{n|one slide|# slides}': '{n|# diapositive|# de diapositives|# diapositives}', '·': '·', 'Pixel art, {n} by {n}': 'Pixel art, {n} sur {n}' };
  expect(checkLanguage('fr', base, good, "export default {\n  'Menu': 'Menu',\n}")).toEqual({ errors: [], warnings: [] });
  const { Share: _, ...lacking } = good;
  const bad = checkLanguage('fr', base, { ...lacking, Gone: 'Parti', '{n} more': '{n} de plus {n}', '{n|one slide|# slides}': '{n|une diapositive|des diapositives}', 'Pixel art, {n} by {n}': 'Pixel art, {n} sur {x}' }, '  // New — sort me into a section\n');
  expect(bad.errors.join('\n')).toContain('1 missing (English would show):\n    Share');
  expect(bad.errors.some((e) => e.startsWith('{n} 2 times in: {n} more'))).toBe(true);
  expect(bad.errors.some((e) => e.startsWith('{n|…} has 2 forms, fr has 3'))).toBe(true);
  expect(bad.errors.some((e) => e.startsWith('{n|…} has no "#"'))).toBe(true);
  expect(bad.errors).toContain('{n} 1 times in: Pixel art, {n} by {n} → Pixel art, {n} sur {x}');
  expect(bad.errors).toContain('{x} is not in the English: Pixel art, {n} by {n} → Pixel art, {n} sur {x}');
  expect(bad.errors.some((e) => e.includes('sort me'))).toBe(true);
  expect(bad.warnings.join('\n')).toContain('1 not in en.ts (remove them):\n    Gone');
  // A value left in English is a warning, unless it is a shared word or has no letters of its own.
  const same = checkLanguage('de', base, { ...base, '{n|one slide|# slides}': '{n|eine Folie|# Folien}' });
  expect(same.errors).toEqual([]);
  expect(same.warnings).toEqual(['3 the same as the English:\n    Share\n    {n} more\n    Pixel art, {n} by {n}']);
  expect(checkLanguage('ja', { '{n|one slide|# slides}': '' }, { '{n|one slide|# slides}': '{n|# 枚}' }).errors).toEqual([]);
  expect(checkLanguage('pt_BR', {}, {}).errors).toEqual(['"pt_BR" is not a BCP 47 tag']);
  expect(checkLanguage('pt-BR', {}, {}).errors).toEqual(['"pt-BR" is not a lowercase BCP 47 tag']);
  expect(gaps(base, good)).toEqual([]);
  expect(gaps(base, lacking)).toEqual(["  'Share': 'Share',"]);
});

test('en.ts passes its own check: its plurals have English’s two forms and a "#"', () => {
  expect(checkLanguage('en', en, en).errors).toEqual([]);
});

for (const code of ['en-xa', 'ar-xb']) {
  test(`the pseudo-language ${code} passes the check and draws every key`, async () => {
    const strings = pseudo(code, en);
    expect(checkLanguage(code, en, strings).errors).toEqual([]);
    register(code, strings);
    expect(languages()).toContain(code);
    await setLanguage(code);
    missed.clear();
    drawAll(code, strings);
    expect([...missed]).toEqual([]);
    expect(t('{n|one slide|# slides}', { n: 21 })).toMatch(/^21 /);
  });
}

test('in development, a key the language in use lacks is recorded, so a test can count English showing through', async () => {
  register('xx-fallback', { Menu: 'Mmm' });
  await setLanguage('xx-fallback');
  missed.clear();
  expect(t('Menu')).toBe('Mmm');
  expect(t('Share')).toBe('Share');
  expect([...missed]).toEqual(['Share']);
  await setLanguage(null);
  missed.clear();
  t('Share');
  expect(missed.size).toBe(0);
});

// Names a language file must be called by in the menu: each in itself.
const NAMES: Record<string, string> = { es: 'español', fr: 'français', de: 'Deutsch', 'pt-br': 'português (Brasil)', it: 'italiano', nl: 'Nederlands', ja: '日本語', 'zh-hans': '简体中文', ar: 'العربية' };

test('each language named in itself, not in English', () => {
  for (const [code, name] of Object.entries(NAMES)) expect(languageName(code), code).toBe(name);
});

for (const [code, path] of files) {
  test(`${code}.ts: safe to merge, listed, named in itself, every key drawn`, async () => {
    const strings = (await import(/* @vite-ignore */ path)).default as Record<string, string>;
    expect(checkLanguage(code, en, strings, readFileSync(path, 'utf8')).errors).toEqual([]);
    expect(languages()).toContain(code);
    expect(languageName(code)).not.toBe(code);
    expect(languageName(code)).not.toBe(new Intl.DisplayNames(['en'], { type: 'language' }).of(code));
    if (NAMES[code]) expect(languageName(code)).toBe(NAMES[code]);
    register(code, strings);
    await setLanguage(code);
    drawAll(code, strings);
  });
}
