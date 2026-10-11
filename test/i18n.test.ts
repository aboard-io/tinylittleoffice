// The strings: t() fills placeholders and plurals; every key the code uses is in en.ts, with its placeholders.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { t, register, setLanguage, browserLanguage, directionOf, languages } from '../src/kit/i18n.ts';
import { commandKeys, definedKeys, languageFiles, placeholders, usedKeys, withMissing, MARK } from '../scripts/i18n-extract.ts';
import { british } from './british.ts';
import en from '../src/i18n/en.ts';

const root = join(import.meta.dirname, '..');
function* sources(dir: string): Generator<string> {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) yield* sources(p);
    else if (/\.ts$/.test(f.name) && !/\.test\.ts$/.test(f.name) && !p.includes(join('src', 'i18n'))) yield p;
  }
}

test('placeholders and plurals, in English', () => {
  expect(t('Downloaded {name}', { name: 'a.pdf' })).toBe('Downloaded a.pdf');
  expect(t('{n|one slide|# slides}', { n: 1 })).toBe('one slide');
  expect(t('{n|one slide|# slides}', { n: 3 })).toBe('3 slides');
  expect(t('{n|one slide|# slides}', { n: 1234 })).toBe('1,234 slides');
  expect(t('{n} of {max} left', { n: 1500, max: 2000 })).toBe('1,500 of 2,000 left');
  // A placeholder with nothing to fill stays as it is, so the gap can be seen.
  expect(t('Hello {name}')).toBe('Hello {name}');
});

test('another language: its words, its plural forms, its number', async () => {
  register('pl', { '{n|one slide|# slides}': '{n|# slajd|# slajdy|# slajdów|# slajdu}', 'Find app, template': 'Znajdź aplikację' });
  await setLanguage('pl');
  expect(t('Find app, template')).toBe('Znajdź aplikację');
  expect(t('{n|one slide|# slides}', { n: 1 })).toBe('1 slajd');
  expect(t('{n|one slide|# slides}', { n: 3 })).toBe('3 slajdy');
  expect(t('{n|one slide|# slides}', { n: 5 })).toBe('5 slajdów');
  expect(t('{n|one slide|# slides}', { n: 1.5 })).toBe('1,5 slajdu');
  // A key the dictionary lacks falls back to English.
  expect(t('Menu')).toBe('Menu');
  await setLanguage(null);
  expect(t('Find app, template')).toBe('Find app, template');
});

test('the browser language is matched to what is present', () => {
  register('pt-br', {});
  expect(languages()).toContain('pt-br');
  expect(browserLanguage(['pt-BR', 'en'])).toBe('pt-br');
  expect(browserLanguage(['pt', 'en'])).toBe('en');
  expect(browserLanguage(['pt-PT'])).toBe('en');
  expect(browserLanguage(['PL-pl'])).toBe('pl');
  expect(browserLanguage(['xx'])).toBe('en');
  expect(browserLanguage([])).toBe('en');
});

test('the browser language of the second nine: each code itself, a Chinese tag by its script', () => {
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ur', 'ht', 'ko', 'zh-hant', 'zh-hans']) register(code, {});
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ur', 'ht', 'ko']) {
    expect(browserLanguage([code]), code).toBe(code);
    expect(browserLanguage([`${code}-${code === 'ur' ? 'PK' : code === 'ko' ? 'KR' : 'US'}`]), code).toBe(code);
  }
  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW', 'zh-Hant-HK', 'zh-hant']) expect(browserLanguage([tag, 'en']), tag).toBe('zh-hant');
  for (const tag of ['zh-CN', 'zh-SG', 'zh', 'zh-Hans', 'zh-Hans-CN', 'zh-Hans-SG']) expect(browserLanguage([tag, 'en']), tag).toBe('zh-hans');
  expect(browserLanguage(['xx', 'zh-TW'])).toBe('zh-hant');
  expect(browserLanguage(['sr-Latn'])).toBe('en');
});

test('which way a language runs', () => {
  expect(directionOf('en')).toBe('ltr');
  expect(directionOf('ar')).toBe('rtl');
  expect(directionOf('ur')).toBe('rtl');
  expect(directionOf('ur-PK')).toBe('rtl');
  for (const code of ['ru', 'uk', 'pl', 'bn', 'hi', 'ht', 'ko', 'zh-hant']) expect(directionOf(code), code).toBe('ltr');
  expect(directionOf('he-IL')).toBe('rtl');
  expect(directionOf('not a tag at all!!')).toBe('ltr');
});

test('every key the code uses is in en.ts, as itself, with matching placeholders', () => {
  const used = new Set<string>();
  for (const f of sources(join(root, 'src'))) for (const k of usedKeys(readFileSync(f, 'utf8'))) used.add(k);
  expect(used.size).toBeGreaterThan(20);
  const missing = [...used].filter((k) => !(k in en));
  expect(missing).toEqual([]);
  for (const [k, v] of Object.entries(en)) expect(v, k).toBe(k);
  // The file's lines read the same as the module: the extractor sees what the code sees.
  const lines = definedKeys(readFileSync(join(root, 'src/i18n/en.ts'), 'utf8'));
  expect(lines.map((l) => l.key).sort()).toEqual(Object.keys(en).sort());
});

test('a command file’s words are keys without t(): a label, hint, heading or letter given as a string always, any other string only when en.ts has it', () => {
  const src = `cmd('bold', 'Bold', { heading: "Marks", keys: 'Mod+B' }); block('title', 'title', 'Title', UI.text); cmd('x', (c) => t('Look'), {})`;
  expect(commandKeys(src, new Set(['Title', 'Bold']))).toEqual(['Marks', 'Bold', 'Title']);
});

test('the extractor reads t() calls, and appends what is new at the end under the mark', () => {
  expect(usedKeys(`t('A'); t("B {x}"); t(\`C\`); t('it\\'s'); not(t); t(name)`)).toEqual(['A', 'B {x}', 'C', "it's"]);
  expect(placeholders('{n|one|# many} of {max}')).toEqual(['max', 'n']);
  const file = "export default {\n  // ---- a ----\n  'A': 'A',\n} satisfies Strings;\n";
  const once = withMissing(file, ["it's", 'B']);
  expect(once).toContain(MARK);
  expect(once.indexOf("'A': 'A'")).toBeLessThan(once.indexOf("'it\\'s': 'it\\'s'"));
  expect(definedKeys(once).map((l) => l.key)).toEqual(['A', "it's", 'B']);
  // A second time, under the same mark, after what was there.
  const twice = withMissing(once, ['C']);
  expect(twice.split(MARK).length).toBe(2);
  expect(definedKeys(twice).map((l) => l.key)).toEqual(['A', "it's", 'B', 'C']);
  expect(withMissing(file, [])).toBe(file);
});

test('every language file has every key en.ts has, and no English string is British (Paul, 2026-10-11: "American English")', async () => {
  const keys = Object.keys(en).sort();
  for (const [code, path] of languageFiles(root)) {
    const have = new Set(Object.keys((await import(pathToFileURL(path).href)).default as Record<string, string>));
    expect(
      keys.filter((k) => !have.has(k)),
      code,
    ).toEqual([]);
  }
  expect(Object.values(en).flatMap((s, i) => british(s, `en ${i}`))).toEqual([]);
  // And the list knows a British string when it sees one.
  expect(british('Colour for new: {colour}', 'x')).toHaveLength(1);
});
