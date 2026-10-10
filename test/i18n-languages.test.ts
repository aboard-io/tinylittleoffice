// Every language file, against en.ts: the checks that make a translation safe to merge, and every string drawn
// in it with representative numbers. Until the translations land, two pseudo-languages made from en.ts (test/pseudo.ts)
// stand in, so the checks themselves are tested.
import { test, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { t, register, setLanguage, languages, languageName, missed } from '../src/kit/i18n.ts';
import { checkLanguage, gaps, languageFiles, likeness, nearest, pluralCount, placeholders, tokens } from '../scripts/i18n-extract.ts';
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
  const base = { Menu: 'Menu', Share: 'Share', '{n} more': '{n} more', '{n|one slide|# slides}': '{n|one slide|# slides}', '·': '·', 'Pixel art, {n} by {n}': 'Pixel art, {n} by {n}' };
  const good = {
    Menu: 'Menu',
    Share: 'Partager',
    '{n} more': '{n} de plus',
    '{n|one slide|# slides}': '{n|# diapositive|# de diapositives|# diapositives}',
    '·': '·',
    'Pixel art, {n} by {n}': 'Pixel art, {n} sur {n}',
  };
  expect(checkLanguage('fr', base, good, "export default {\n  'Menu': 'Menu', // same\n}")).toEqual({ errors: [], warnings: [] });
  const { Share: _, ...lacking } = good;
  const bad = checkLanguage(
    'fr',
    base,
    { ...lacking, Gone: 'Parti', '{n} more': '{n} de plus {n}', '{n|one slide|# slides}': '{n|une diapositive|des diapositives}', 'Pixel art, {n} by {n}': 'Pixel art, {n} sur {x}' },
    '  // New — sort me into a section\n',
  );
  expect(bad.errors.join('\n')).toContain('1 missing (English would show):\n    Share');
  expect(bad.errors.some((e) => e.startsWith('{n} 2 times in: {n} more'))).toBe(true);
  expect(bad.errors.some((e) => e.startsWith('{n|…} has 2 forms, fr has 3'))).toBe(true);
  expect(bad.errors.some((e) => e.startsWith('{n|…} has no "#"'))).toBe(true);
  expect(bad.errors).toContain('{n} 1 times in: Pixel art, {n} by {n} → Pixel art, {n} sur {x}');
  expect(bad.errors).toContain('{x} is not in the English: Pixel art, {n} by {n} → Pixel art, {n} sur {x}');
  expect(bad.errors.some((e) => e.includes('sort me'))).toBe(true);
  expect(bad.warnings.join('\n')).toContain('1 not in en.ts (remove them):\n    Gone');
  // A value left in English fails, unless its line says it is meant ("// same") or it has no letters of its own.
  const same = checkLanguage('de', base, { ...base, '{n|one slide|# slides}': '{n|eine Folie|# Folien}' });
  expect(same.errors).toEqual([
    '4 the same as the English, not decided (translate it, or end its line with "// same" where the English is the word):\n    Menu\n    Share\n    {n} more\n    Pixel art, {n} by {n}',
  ]);
  const decided = "  'Menu': 'Menu', // same\n  'Share': 'Share', // same\n  '{n} more': '{n} more', // same\n  'Pixel art, {n} by {n}': 'Pixel art, {n} by {n}',  // same\n";
  expect(checkLanguage('de', base, { ...base, '{n|one slide|# slides}': '{n|eine Folie|# Folien}' }, decided).errors).toEqual([]);
  // A mark on a line translated since is stale; a draft the memory offered and nobody read fails.
  const stale = checkLanguage(
    'de',
    base,
    { ...base, Share: 'Teilen', '{n} more': '{n} mehr', 'Pixel art, {n} by {n}': 'Pixelkunst, {n} mal {n}', '{n|one slide|# slides}': '{n|eine Folie|# Folien}' },
    decided,
  );
  expect(stale.errors).toEqual(['3 marked "// same" but translated (take the mark off):\n    Share → Teilen\n    {n} more → {n} mehr\n    Pixel art, {n} by {n} → Pixelkunst, {n} mal {n}']);
  const draft = checkLanguage('de', { Menu: 'Menu' }, { Menu: 'Menü' }, `  'Menu': 'Menü', // draft from "Menus"\n`);
  expect(draft.errors).toEqual(["1 // draft from left in (read each, make it right for its new key, take the comment off):\n    'Menu': 'Menü', // draft from \"Menus\""]);
  expect(checkLanguage('ja', { '{n|one slide|# slides}': '' }, { '{n|one slide|# slides}': '{n|# 枚}' }).errors).toEqual([]);
  expect(checkLanguage('pt_BR', {}, {}).errors).toEqual(['"pt_BR" is not a BCP 47 tag']);
  expect(checkLanguage('pt-BR', {}, {}).errors).toEqual(['"pt-BR" is not a lowercase BCP 47 tag']);
  expect(gaps(base, good)).toEqual([]);
  expect(gaps(base, lacking)).toEqual(["  'Share': 'Share',"]);
});

test('the translation memory: a key changed by a few words is offered its old translation as a draft, marked', () => {
  // Alike by the words that carry the meaning; the little words and a placeholder's forms aside.
  expect(tokens('Copy the {n|link|# links} to {name}')).toEqual(['copy', 'n', 'name']);
  expect(tokens('Share the links')).toEqual(['share', 'link']);
  expect(likeness('Copy the link', 'Copy this link')).toBe(1);
  expect(likeness('Download everything', 'Download everything (.zip)')).toBe(0.8);
  expect(likeness('Make a short link', 'Make a short link, kept for a year')).toBe(0.75);
  expect(likeness('Add a column', 'Add a row')).toBe(0.5);
  expect(likeness('Undo', 'Redo')).toBe(0);
  expect(likeness('·', 'Share')).toBe(0);
  expect(nearest('Copy this link', ['Copy link', 'Copy the display link', 'Paste'])).toBe('Copy link');
  expect(nearest('Add a row', ['Add a column'])).toBeUndefined();
  expect(nearest('Share the link', ['Share the links', 'Share a link'])).toBe('Share the links');
  // gaps: the draft under the new key, the old key named; a key with nothing alike in English.
  const en = { 'Copy this link': 'Copy this link', Undo: 'Undo' };
  const fr = { 'Copy the link': 'Copier le lien', Redo: 'Rétablir' };
  expect(gaps(en, fr)).toEqual(["  'Copy this link': 'Copier le lien', // draft from \"Copy the link\"", "  'Undo': 'Undo',"]);
  expect(gaps({ 'Say "hi"': '' }, { 'Say "hi" now': 'Dis « salut »' })).toEqual(['  \'Say "hi"\': \'Dis « salut »\', // draft from "Say \\"hi\\" now"']);
  // The draft, pasted in, is what i18n:check stops on.
  expect(checkLanguage('fr', en, { ...fr, 'Copy this link': 'Copier le lien', Undo: 'Annuler' }, gaps(en, fr)[0]).errors.some((e) => e.includes('// draft from'))).toBe(true);
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
const NAMES: Record<string, string> = {
  es: 'español',
  fr: 'français',
  de: 'Deutsch',
  'pt-br': 'português (Brasil)',
  it: 'italiano',
  nl: 'Nederlands',
  ja: '日本語',
  'zh-hans': '简体中文',
  ar: 'العربية',
};

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
