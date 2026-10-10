/**
 * The Emoji set of the icon picker: src/kit/emoji-data.ts, a compact table of [character, name, keywords,
 * group] for every base emoji, made from two pieces of Unicode's own data (there is no browser API that
 * lists emoji by name):
 *
 *   - Unicode's emoji-test.txt (Emoji 17.0): which sequences are fully-qualified emoji, and their groups
 *     (Smileys & Emotion … Flags) in Unicode's order. Skin-tone and hair variants and the Component group
 *     are left out (the system keyboard does those); so is anything newer than Emoji 15.0, which too many
 *     systems still draw as an empty box.
 *   - CLDR's English annotations (the npm packages cldr-annotations-full and cldr-annotations-derived-full,
 *     annotations/en and annotationsDerived/en): each emoji's `tts` name and its `default` keywords.
 *
 * Both are under the Unicode licence (Unicode-3.0). Neither is a dependency: the files are fetched at the
 * pinned versions below when this runs, and the table is checked in. Run it again only to move to a newer
 * Unicode:
 *
 *   npm run emoji                         fetch, and write src/kit/emoji-data.ts
 *   node scripts/emoji.ts <test.txt> <annotations.json> <derived.json>    from files already here
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCES = {
  test: 'https://unicode.org/Public/17.0.0/emoji/emoji-test.txt',
  annotations: 'https://cdn.jsdelivr.net/npm/cldr-annotations-full@48.2.0/annotations/en/annotations.json',
  derived: 'https://cdn.jsdelivr.net/npm/cldr-annotations-derived-full@48.2.0/annotationsDerived/en/annotations.json',
};
/** The newest Emoji version kept: what the systems people use draw. */
const NEWEST = 15.0;

const root = resolve(fileURLToPath(import.meta.url), '../..');

type Annotations = Record<string, { default?: string[]; tts?: string[] }>;

/** One table row: the character, its name, its other keywords (space-separated), its group's index. */
export type Row = [string, string, string, number];

const SKIN = /[\u{1F3FB}-\u{1F3FF}]/u;
const HAIR = /[\u{1F9B0}-\u{1F9B3}]/u;

export function build(test: string, ann: Annotations, derived: Annotations): { groups: string[]; rows: Row[] } {
  const groups: string[] = [];
  const rows: Row[] = [];
  let group = '';
  for (const line of test.split('\n')) {
    const g = /^# group: (.+)$/.exec(line);
    if (g) {
      group = g[1].trim();
      if (group !== 'Component') groups.push(group);
      continue;
    }
    const m = /^([0-9A-F ]+?)\s*; fully-qualified\s*# (\S+) E(\d+\.\d+) (.+)$/.exec(line);
    if (!m || group === 'Component') continue;
    const char = String.fromCodePoint(
      ...m[1]
        .trim()
        .split(/\s+/)
        .map((h) => parseInt(h, 16)),
    );
    if (SKIN.test(char) || HAIR.test(char) || parseFloat(m[3]) > NEWEST) continue;
    const key = char.replace(/️/g, '');
    const a = ann[key] ?? derived[key] ?? ann[char] ?? derived[char];
    const name = a?.tts?.[0] ?? m[4].trim();
    const own = new Set(name.toLowerCase().split(/[^\p{L}\p{N}]+/u));
    const keywords = (a?.default ?? []).filter((k) => !own.has(k.toLowerCase())).join(' ');
    rows.push([char, name, keywords, groups.length - 1]);
  }
  return { groups, rows };
}

export function source({ groups, rows }: { groups: string[]; rows: Row[] }): string {
  return `/** Every base emoji (no skin-tone or hair variants), in Unicode's groups and order, with its CLDR name and keywords: written by scripts/emoji.ts from Unicode's emoji-test.txt and CLDR's English annotations (Unicode-3.0). Loaded with the icon picker, never before. */
/** The groups, in English (the picker names them through t()). */
export const EMOJI_GROUPS: readonly string[] = ${JSON.stringify(groups)};
/** [character, name, keywords, group] */
export const EMOJI: readonly [string, string, string, number][] = [
${rows.map((r) => JSON.stringify(r)).join(',\n')},
];
`;
}

async function main() {
  const [testFile, annFile, derivedFile] = process.argv.slice(2);
  const get = async (file: string | undefined, url: string) => (file ? readFileSync(file, 'utf8') : await (await fetch(url)).text());
  const test = await get(testFile, SOURCES.test);
  const ann = JSON.parse(await get(annFile, SOURCES.annotations)).annotations.annotations as Annotations;
  const derived = JSON.parse(await get(derivedFile, SOURCES.derived)).annotationsDerived.annotations as Annotations;
  const table = build(test, ann, derived);
  writeFileSync(join(root, 'src/kit/emoji-data.ts'), source(table));
  console.log(`emoji: ${table.rows.length} in ${table.groups.length} groups`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
