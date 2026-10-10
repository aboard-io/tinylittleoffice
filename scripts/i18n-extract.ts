/**
 * The strings, checked against the code. Every string a person sees is t('…') in src/; src/i18n/en.ts lists
 * every key by hand, in sections. This script scans the code for t() calls and:
 *   - appends any key missing from en.ts at its end, under "// New — sort me into a section" (never reordering);
 *   - reports keys in en.ts that no code uses;
 *   - checks every language file against en.ts (checkLanguage): the same keys (a missing one fails, since the
 *     English would show through; an extra one is a warning), each placeholder of the key once in the value,
 *     each plural with as many forms as the language has plural categories and "#" in one of them, no
 *     "sort me" heading left in; a value the same as its English is a warning unless SAME allows it.
 *
 *   node scripts/i18n-extract.ts             write the missing keys into en.ts, report the rest
 *   node scripts/i18n-extract.ts --check     write nothing; fail if a key is missing or a language file is wrong
 *   node scripts/i18n-extract.ts --gaps fr   print the en.ts lines fr.ts lacks, ready to translate and paste in
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Strings = Record<string, string>;

export const MARK = '// New — sort me into a section';

const unquote = (s: string) => s.replace(/\\(['"`\\])/g, '$1');

/** Every t('…') key in a source text (single, double or backtick quotes; no interpolation in a key). */
export function usedKeys(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push(unquote(m[2]));
  return out;
}

/**
 * The keys a command file (kit/commands.ts's declarations: an app's commands.ts, the kit's keys.ts) gives as words
 * without t(), which the registry puts through t() when it draws them: a `label`, `hint`, `heading` or `letter` given
 * as a string, and, of the other quoted strings there (a maker's argument, a table's name), those en.ts has.
 */
export function commandKeys(source: string, defined: Set<string>): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/\b(?:label|hint|heading|letter): (['"])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push(unquote(m[2]));
  for (const m of source.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) if (defined.has(unquote(m[2]))) out.push(unquote(m[2]));
  return out;
}
const commandFile = (f: string) => /commands\.ts$|kit[\\/]keys\.ts$/.test(f);

/** Every "'key': 'value'," line of a language file, in order. */
export function definedKeys(source: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const m of source.matchAll(/^\s*'((?:\\.|[^'\\])*)'\s*:\s*'((?:\\.|[^'\\])*)'\s*,?\s*$/gm)) out.push({ key: unquote(m[1]), value: unquote(m[2]) });
  return out;
}

/** The placeholder names in a string: {name}, {n|one|# many}. */
export const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].map((m) => m[1]).sort();

/**
 * Words a translation may keep exactly as the English, unwarned: names, units and words most languages share.
 * A key with no letters outside its placeholders ("{n}", "·", "{a} → {b}") is allowed without being listed.
 */
export const SAME = new Set(['OK', 'CSV', 'GeoJSON', 'Markdown', 'Emoji', 'Tiny Little Office', 'OpenStreetMap', 'L', 'M', 'S', 'XL', '3D', 'Menu', 'Design', 'Zoom', 'Neon', 'Zine', 'Web', 'Alt']);

/** The plural categories a language has, in Intl's order: fr has one, many, other; ja other; ar six. */
export const pluralCount = (code: string): number => new Intl.PluralRules(code).resolvedOptions().pluralCategories.length;

const count = (s: string, name: string) => [...s.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].filter((m) => m[1] === name).length;

/**
 * A language file, against en.ts: errors make it unsafe to merge (English would show through, or a value
 * cannot be filled); warnings are for a reader to look at (a value left in English, a key en.ts has dropped).
 */
export function checkLanguage(code: string, en: Strings, strings: Strings, source = ''): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let forms = 0;
  try {
    if (Intl.getCanonicalLocales(code)[0].toLowerCase() !== code) errors.push(`"${code}" is not a lowercase BCP 47 tag`);
    forms = pluralCount(code);
  } catch {
    errors.push(`"${code}" is not a BCP 47 tag`);
  }
  const missing = Object.keys(en).filter((k) => !(k in strings));
  const extra = Object.keys(strings).filter((k) => !(k in en));
  if (missing.length) errors.push(`${missing.length} missing (English would show):\n    ${missing.join('\n    ')}`);
  if (extra.length) warnings.push(`${extra.length} not in en.ts (remove them):\n    ${extra.join('\n    ')}`);
  if (source.includes('// New — sort me')) errors.push('a "// New — sort me" heading is left in: take the heading out, keep its lines');
  const same: string[] = [];
  for (const [key, value] of Object.entries(strings)) {
    if (!(key in en)) continue;
    for (const name of new Set(placeholders(key))) {
      const n = count(value, name);
      if (n !== count(key, name)) errors.push(`{${name}} ${n ? `${n} times` : 'missing'} in: ${key} → ${value}`);
    }
    for (const name of new Set(placeholders(value))) if (!placeholders(key).includes(name)) errors.push(`{${name}} is not in the English: ${key} → ${value}`);
    for (const m of value.matchAll(/\{(\w+)\|([^}]*)\}/g)) {
      const f = m[2].split('|');
      if (forms && f.length !== forms) errors.push(`{${m[1]}|…} has ${f.length} forms, ${code} has ${forms}: ${key} → ${value}`);
      if (!f.some((x) => x.includes('#'))) errors.push(`{${m[1]}|…} has no "#" in any form: ${key} → ${value}`);
    }
    if (code !== 'en' && value === key && /\p{L}/u.test(key.replace(/\{[^}]*\}/g, '')) && !SAME.has(key)) same.push(key);
  }
  if (same.length) warnings.push(`${same.length} the same as the English:\n    ${same.join('\n    ')}`);
  return { errors, warnings };
}

/** The keys a language lacks, as en.ts lines: the English on both sides, for a translator to fill in. */
export const gaps = (en: Strings, strings: Strings): string[] => Object.keys(en).filter((k) => !(k in strings)).map((k) => `  ${quote(k)}: ${quote(en[k])},`);

/** The language files present: code → path. */
export const languageFiles = (root: string): [string, string][] =>
  readdirSync(join(root, 'src', 'i18n'))
    .filter((f) => /\.ts$/.test(f))
    .map((f) => [f.replace(/\.ts$/, ''), join(root, 'src', 'i18n', f)]);

const load = async (path: string): Promise<Strings> => (await import(pathToFileURL(path).href)).default;

const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** en.ts with the missing keys appended at the end, under the mark (added once). */
export function withMissing(enSource: string, missing: string[]): string {
  if (!missing.length) return enSource;
  const lines = missing.map((k) => `  ${quote(k)}: ${quote(k)},`).join('\n');
  const close = enSource.lastIndexOf('}');
  const before = enSource.slice(0, close).trimEnd();
  const marked = before.includes(MARK) ? `${before}\n${lines}\n` : `${before}\n\n  ${MARK}\n${lines}\n`;
  return marked + enSource.slice(close);
}

function* sources(dir: string): Generator<string> {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) yield* sources(p);
    else if (/\.ts$/.test(f.name) && !/\.test\.ts$/.test(f.name) && !p.includes(`${join('src', 'i18n')}`)) yield p;
  }
}

export async function main(root: string, check: boolean): Promise<number> {
  const enPath = join(root, 'src', 'i18n', 'en.ts');
  const en = readFileSync(enPath, 'utf8');
  const defined = definedKeys(en);
  const definedSet = new Set(defined.map((d) => d.key));
  const used = new Set<string>();
  for (const f of sources(join(root, 'src'))) {
    const text = readFileSync(f, 'utf8');
    for (const k of [...usedKeys(text), ...(commandFile(f) ? commandKeys(text, definedSet) : [])]) used.add(k);
  }
  const missing = [...used].filter((k) => !definedSet.has(k)).sort();
  const unused = defined.filter((d) => !used.has(d.key)).map((d) => d.key);
  // Against the module, not the lines: what t() will see. en.ts against itself checks its own plurals.
  const enStrings = await load(enPath);
  let code = 0;
  for (const [lang, path] of languageFiles(root)) {
    const { errors, warnings } = checkLanguage(lang, enStrings, await load(path), lang === 'en' ? '' : readFileSync(path, 'utf8'));
    if (warnings.length) console.warn(`${lang}.ts, to look at:\n  ${warnings.join('\n  ')}`);
    if (errors.length) {
      console.error(`${lang}.ts is not safe to merge:\n  ${errors.join('\n  ')}`);
      code = 1;
    }
  }
  if (missing.length) {
    if (check) {
      console.error(`${missing.length} missing from en.ts:\n  ${missing.join('\n  ')}`);
      code = 1;
    } else {
      writeFileSync(enPath, withMissing(en, missing));
      console.log(`${missing.length} added to en.ts under "${MARK}":\n  ${missing.join('\n  ')}`);
    }
  }
  if (unused.length) console.warn(`${unused.length} in en.ts that no code uses:\n  ${unused.join('\n  ')}`);
  if (!code && !missing.length) console.log(`${used.size} strings, all in en.ts.`);
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(import.meta.dirname, '..');
  const at = process.argv.indexOf('--gaps');
  if (at >= 0) {
    const lang = process.argv[at + 1];
    const file = languageFiles(root).find(([c]) => c === lang);
    if (!file) {
      console.error(`No language file src/i18n/${lang ?? '<code>'}.ts. Usage: npm run i18n:gaps -- <code>`);
      process.exit(1);
    }
    const lines = gaps(await load(join(root, 'src', 'i18n', 'en.ts')), await load(file[1]));
    if (lines.length) console.log(lines.join('\n'));
    process.exit(0);
  }
  process.exit(await main(root, process.argv.includes('--check')));
}
