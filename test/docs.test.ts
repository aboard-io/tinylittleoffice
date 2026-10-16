// What the README and the current docs say (Paul, 2026-10-11: "Saying we never save anything is wrong; we should say
// that's the default"). Private is the default and keeps nothing; Saved is a choice, on this device; a short link is the
// one thing a server holds. No text a reader meets says "no saving" as an absolute, names a feature that is gone, says
// it in British, or points at this machine; every link in the README and the docs' index leads to a file in the tree.
// docs/history/ is the record of how the tree was built, and is not held to any of it.
import { test, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { british } from './british.ts';

const root = join(import.meta.dirname, '..');
const read = (f: string) => readFileSync(join(root, f), 'utf8');

/** Every Markdown file under docs/ that is current: all but docs/history/. */
const currentDocs = (readdirSync(join(root, 'docs'), { recursive: true }) as string[])
  .map((f) => `docs/${String(f).replaceAll('\\', '/')}`)
  .filter((f) => f.endsWith('.md') && !f.startsWith('docs/history/'))
  .sort();

/** What a reader meets: the README, the current docs, the strings, the page's head and what agents read. */
const skillFiles = ['skill/tinyoffice/SKILL.md', ...readdirSync(join(root, 'skill/tinyoffice/references')).map((f) => `skill/tinyoffice/references/${f}`)];
const reader = ['README.md', ...currentDocs, 'src/i18n/en.ftl', 'public/llms.txt', ...skillFiles, 'index.html', 'public/manifest.webmanifest', 'package.json'];

/** Said as absolutes, they are false: Private is the default, Saved keeps documents on the device, a short link is on a server. */
const STRUCK = ['no saving', 'nothing is stored anywhere', 'never see what you write', 'never saved', 'nothing stored', 'lives entirely in the url'];

/** Features that are gone from the tree, by the names a reader would know them by (and test/lints.test.ts's STALE, in every file). */
const GONE = [
  'Show pictures from the web',
  'pictures from the web are asked',
  'Web Embed',
  'Signed by',
  'kit/sign.ts',
  'kit/pictures.ts',
  'kit/media.ts',
  'kit/embeds.ts',
  'tinyoffice.lang',
  'tinyoffice.name',
  // The foot's words are Paul's of 2026-10-12 (its earlier ones, and Share's old second copy, are in STALE); the theme
  // script is in the page, not a file of its own.
  'theme.js',
  // Save in browser is the setting's name, on or off: Private and Saved were its two states' names.
  'Turn on Saved',
  'under Private',
  'under Saved',
];

/** The same, where the words alone would say too much: the drawer lists no apps (Paul, 2026-10-12: "If people want apps they can search or go to home page"). */
const GONE_SAID = [
  /\bdrawer\b[^.\n]*\blists? (the|every|all the) apps\b/i,
  /\baway from the home page, the apps\b/i,
  /\bthe apps in the drawer\b/i,
  // The old foot's last link was "Email us", capitalised; About's "email us" (Paul's words of 2026-10-13) is a sentence's.
  /\bEmail us\b/,
];

/** This machine, its addresses and the sessions that built the tree. */
const MACHINE = ['exe.xyz', 'exe.dev', 'claude.ai/code', ['', 'home', 'exedev'].join('/')];

const hits = (words: string[], files = reader) =>
  files.flatMap((f) => {
    const text = read(f).toLowerCase();
    return words.filter((w) => text.includes(w.toLowerCase())).map((w) => `${f}: ${w}`);
  });

test('nothing a reader meets says saving never happens', () => {
  expect(hits(STRUCK)).toEqual([]);
});

/** The built pages a crawler reads, with what the build wrote into them (scripts/seo.ts): there when `npm run build` has run. */
const dist = join(root, 'dist');
const builtPages = existsSync(join(dist, 'index.html'))
  ? (readdirSync(dist, { recursive: true }) as string[]).map((f) => `dist/${String(f).replaceAll('\\', '/')}`).filter((f) => /\.(html|xml|txt)$/.test(f))
  : [];
test.skipIf(!builtPages.length)('nor does any page the build writes, its first text and structured data among it', () => {
  expect(hits(STRUCK, builtPages)).toEqual([]);
});

test('nothing a reader meets names a feature that is gone', () => {
  expect(hits(GONE)).toEqual([]);
  expect(reader.flatMap((f) => GONE_SAID.filter((w) => w.test(read(f))).map((w) => `${f}: ${w.source}`))).toEqual([]);
});

test('the words for what is gone are found where they are said', () => {
  const said = 'The foot ends Email us. Away from the home page, the apps; the drawer lists the apps.';
  expect([...GONE.filter((w) => said.toLowerCase().includes(w.toLowerCase())), ...GONE_SAID.filter((w) => w.test(said)).map((w) => w.source)]).toHaveLength(3);
});

test('the README and the current docs name no path or address of this machine', () => {
  expect(hits(MACHINE, ['README.md', ...currentDocs])).toEqual([]);
});

test('the README and the current docs are American', () => {
  expect(['README.md', ...currentDocs].flatMap((f) => british(read(f), f))).toEqual([]);
});

test('the README says the truth about saving, and the page says it too', () => {
  const readme = read('README.md');
  // Paul's README of 2026-10-13: nothing kept by default, saving keeps it on the device, a short link is encrypted.
  for (const s of ['By default nothing is kept, on your device or anywhere else', 'on your own device, never on a server', 'encrypted with a key the server never sees'])
    expect(readme, s).toContain(s);
  // The page's description.
  const tagline = 'A tiny office suite where the link is the document. No accounts. Nothing is saved anywhere unless you choose to keep it on this device.';
  expect(read('index.html')).toContain(tagline);
});

test('nothing a reader meets points at the record as if it were current', () => {
  expect(hits(['docs/rebuild.md', 'docs/gap-analysis.md', 'docs/directives', 'docs/reviews'])).toEqual([]);
});

/** The Markdown links of a file that lead into the tree: not a web address, an anchor or an email, nor one shown as code. */
const localLinks = (f: string) =>
  [
    ...read(f)
      .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
      .replace(/`[^`\n]*`/g, '')
      .matchAll(/\]\(([^)\s]+)\)/g),
  ]
    .map((m) => m[1].replace(/#.*$/, ''))
    .filter((href) => href && !/^[a-z]+:/i.test(href))
    .map((href) => relative(root, join(root, dirname(f), href)));

test('every link in the README, the package’s README and every current page leads to a file in the tree', () => {
  for (const f of ['README.md', 'packages/doc/README.md', ...currentDocs, 'docs/history/README.md']) {
    const links = localLinks(f);
    if (['README.md', 'docs/README.md'].includes(f)) expect(links.length, f).toBeGreaterThan(5);
    expect(
      links.filter((l) => !existsSync(join(root, l))),
      f,
    ).toEqual([]);
  }
});

test('the docs index names every current document, and history is set apart', () => {
  const index = read('docs/README.md');
  const listed = [...index.matchAll(/^- \[([^\]]+)\]\(\1\): \S/gm)].map((m) => `docs/${m[1]}`).sort();
  expect(listed).toEqual([...currentDocs.filter((f) => f !== 'docs/README.md'), 'docs/history/README.md'].sort());
  for (const gone of ['rebuild.md', 'gap-analysis.md', 'directives', 'reviews', 'transparency.md', 'github-setup.md']) {
    expect(existsSync(join(root, 'docs', gone)), gone).toBe(false);
    expect(existsSync(join(root, 'docs', 'history', gone)), gone).toBe(true);
  }
});

/** The pages moved to the record, each with the day it went and where its live part is now. */
const MOVED: Record<string, string> = { 'transparency.md': 'docs/threat-model.md', 'github-setup.md': 'docs/self-host.md' };

test('a page moved to the record is in history’s index with its date and where its live part went', () => {
  const index = read('docs/history/README.md');
  for (const [page, now] of Object.entries(MOVED)) {
    const line = index.split('\n- ').find((l) => l.startsWith(`[${page}](${page})`));
    expect(line, page).toMatch(/moved here \d{4}-\d{2}-\d{2}/);
    expect(line, page).toContain(now);
  }
  // A page folded into another is gone, its sentences in the other.
  expect(existsSync(join(root, 'docs/kit.md'))).toBe(false);
  expect(read('docs/kernel.md')).toContain("## 11. The kit's seven folders");
});

test('the README, the package’s README and /llms-full.txt say how the skill is installed', () => {
  const install = 'npx tinylittleoffice skill --into ~/.claude/skills';
  for (const f of ['README.md', 'packages/doc/README.md', 'public/llms-full.txt', 'skill/tinyoffice/SKILL.md']) expect(read(f), f).toContain(install);
  expect(read('public/llms-full.txt')).toContain('\n## The skill\n');
  // The README's three ways in, in order: a fetch, a runtime, the skill.
  const readme = read('README.md');
  expect(readme.indexOf('/llms.txt')).toBeLessThan(readme.indexOf('`npx tinylittleoffice`'));
  expect(readme.indexOf('`npx tinylittleoffice`')).toBeLessThan(readme.indexOf(install));
});
