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
const reader = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  ...currentDocs,
  'src/i18n/en.ts',
  'public/llms.txt',
  'skill/tinyoffice/SKILL.md',
  'index.html',
  'public/manifest.webmanifest',
  'package.json',
];

/** Said as absolutes, they are false: Private is the default, Saved keeps documents on the device, a short link is on a server. */
const STRUCK = ['no saving', 'nothing is stored anywhere', 'never see what you write', 'never saved', 'nothing stored', 'lives entirely in the url'];

/** Features that are gone from the tree (round seventeen), by the names a reader would know them by. */
const GONE = [
  'Website Builder',
  'Kanban',
  'To-do List',
  'picture proxy',
  'Show pictures from the web',
  'pictures from the web are asked',
  'owner key',
  'living short link',
  'Web Embed',
  'Signed by',
  'kit/sign.ts',
  'kit/pictures.ts',
  'kit/media.ts',
  'kit/embeds.ts',
  'tinyoffice.lang',
  'tinyoffice.name',
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

test('nothing a reader meets names a feature that is gone', () => {
  expect(hits(GONE)).toEqual([]);
});

test('the README and the current docs name no path or address of this machine', () => {
  expect(hits(MACHINE, ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', ...currentDocs])).toEqual([]);
});

test('the README and the current docs are American', () => {
  expect(['README.md', 'CONTRIBUTING.md', 'SECURITY.md', ...currentDocs].flatMap((f) => british(read(f), f))).toEqual([]);
});

test('the README says the truth about saving, and the About and the page say it too', () => {
  const readme = read('README.md');
  for (const s of ['Private is the default', 'Saved is a choice', 'on your own device', 'never on a server', 'A short link is the one thing a server holds']) expect(readme, s).toContain(s);
  const tagline = 'A tiny office suite where the link is the document. No accounts. Nothing is saved anywhere unless you choose to keep it on this device.';
  expect(read('src/i18n/en.ts')).toContain(`'${tagline}': '${tagline}'`);
  expect(read('index.html')).toContain(tagline);
  const about = read('src/kit/drawer.ts');
  expect(about).toContain(`t('${tagline}')`);
  expect(about).toContain("t('A short link is the one thing a server holds: the document, encrypted with a key the server never sees, until the link expires.')");
});

test('nothing a reader meets points at the record as if it were current', () => {
  expect(hits(['docs/rebuild.md', 'docs/gap-analysis.md', 'docs/directives', 'docs/reviews'])).toEqual([]);
});

/** The Markdown links of a file that lead into the tree: not a web address, an anchor or an email. */
const localLinks = (f: string) =>
  [...read(f).matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1].replace(/#.*$/, ''))
    .filter((href) => href && !/^[a-z]+:/i.test(href))
    .map((href) => relative(root, join(root, dirname(f), href)));

test('every link in the README and the docs index leads to a file in the tree', () => {
  for (const f of ['README.md', 'docs/README.md', 'docs/history/README.md']) {
    const links = localLinks(f);
    expect(links.length, f).toBeGreaterThan(f === 'docs/history/README.md' ? 0 : 5);
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
  for (const gone of ['rebuild.md', 'gap-analysis.md', 'directives', 'reviews']) {
    expect(existsSync(join(root, 'docs', gone)), gone).toBe(false);
    expect(existsSync(join(root, 'docs', 'history', gone)), gone).toBe(true);
  }
});
