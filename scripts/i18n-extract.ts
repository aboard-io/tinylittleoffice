/**
 * The strings, checked against the code. Every string a person sees is t('…') in src/; src/i18n/en.ts lists
 * every key by hand, in sections. This script scans the code for t() calls and:
 *   - appends any key missing from en.ts at its end, under "// New — sort me into a section" (never reordering);
 *   - reports keys in en.ts that no code uses;
 *   - reports placeholder mismatches in every language file ({name} in the key but not in the translation).
 *
 *   node scripts/i18n-extract.ts            write the missing keys into en.ts, report the rest
 *   node scripts/i18n-extract.ts --check    write nothing; fail if a key is missing or a placeholder is wrong
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARK = '// New — sort me into a section';

const unquote = (s: string) => s.replace(/\\(['"`\\])/g, '$1');

/** Every t('…') key in a source text (single, double or backtick quotes; no interpolation in a key). */
export function usedKeys(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) out.push(unquote(m[2]));
  return out;
}

/** Every "'key': 'value'," line of a language file, in order. */
export function definedKeys(source: string): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const m of source.matchAll(/^\s*'((?:\\.|[^'\\])*)'\s*:\s*'((?:\\.|[^'\\])*)'\s*,?\s*$/gm)) out.push({ key: unquote(m[1]), value: unquote(m[2]) });
  return out;
}

/** The placeholder names in a string: {name}, {n|one|# many}. */
export const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)(?:\|[^}]*)?\}/g)].map((m) => m[1]).sort();

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

export function main(root: string, check: boolean): number {
  const used = new Set<string>();
  for (const f of sources(join(root, 'src'))) for (const k of usedKeys(readFileSync(f, 'utf8'))) used.add(k);
  const enPath = join(root, 'src', 'i18n', 'en.ts');
  const en = readFileSync(enPath, 'utf8');
  const defined = definedKeys(en);
  const definedSet = new Set(defined.map((d) => d.key));
  const missing = [...used].filter((k) => !definedSet.has(k)).sort();
  const unused = defined.filter((d) => !used.has(d.key)).map((d) => d.key);
  const wrong: string[] = [];
  for (const f of readdirSync(join(root, 'src', 'i18n'))) {
    if (!/\.ts$/.test(f)) continue;
    for (const { key, value } of definedKeys(readFileSync(join(root, 'src', 'i18n', f), 'utf8'))) {
      if (placeholders(key).join() !== placeholders(value).join()) wrong.push(`${f}: ${key} → ${value}`);
    }
  }
  let code = 0;
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
  if (wrong.length) {
    console.error(`placeholders that do not match:\n  ${wrong.join('\n  ')}`);
    code = 1;
  }
  if (!code && !missing.length) console.log(`${used.size} strings, all in en.ts.`);
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(resolve(import.meta.dirname, '..'), process.argv.includes('--check')));
}
