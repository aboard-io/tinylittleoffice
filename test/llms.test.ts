// An agent told "go to tinylittleoffice.com and do something" is working in one fetch (Paul, 2026-10-11: "Speed is so important"):
// /llms.txt is short, with the link's shape, the API line and one example per app above the long part; the whole
// guide is /llms-full.txt; a page per app and the examples as JSON are small fetches of their own. All are written
// by scripts/make-skill.ts (npm run skill), and test/lints.test.ts holds them current.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lint, read, parse, write, example, shapes, tryDraft } from '../src/api.ts';
import { apps } from '../src/kit/core/apps.ts';
import { makeLlms, makeShort, makeSkill } from '../scripts/make-skill.ts';
import { SHAPES } from '../scripts/shapes.ts';
import { slidesOf } from '../src/apps/deck/model.ts';
import { subPage } from '../src/apps/deck/view.ts';

const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const file = (p: string) => readFileSync(at(p), 'utf8');
const API = "import { link, read, lint } from 'https://tinylittleoffice.com/api.js'";

test('/llms.txt is short: under 6.5 KB (6 KB until the Pinboard, an eleventh app, added its example), its first screen under 1,500 tokens, with the link, the API line and the three commands', () => {
  const short = file('public/llms.txt');
  expect(new TextEncoder().encode(short).length).toBeLessThan(6.5 * 1024);
  const first = short.slice(0, short.indexOf('\n## '));
  expect(Math.ceil(first.length / 4)).toBeLessThan(1500);
  expect(first).toContain('https://tinylittleoffice.com/<app>/#doc=<percent-encoded TLO>');
  expect(first).toContain(API);
  for (const cmd of ['shapes', 'example', 'try']) expect(first).toContain(`npx tinylittleoffice ${cmd}`);
  expect(first).toContain('/llms/<app>.txt');
  expect(first).toContain('/examples/<app>.json');
  // The skill, named in the runtime line's clause, with the line that installs it (Paul, 2026-10-12).
  expect(first).toContain('`npx tinylittleoffice` in Node, where `skill --into ~/.claude/skills` installs this guide for Claude Code.');
  expect(short).toContain('The whole description: https://tinylittleoffice.com/llms-full.txt');
  // The plain form first, the API second.
  expect(short.indexOf('#doc=')).toBeLessThan(short.indexOf(API));
  // The packed form the site and the API's link write is named beside the plain one, so an agent knows both open.
  expect(short).toContain('`#/v1/<app>/<payload>`; both open');
});

test('/llms.txt has one example per app, a plain link each, and each lints clean', async () => {
  const short = file('public/llms.txt');
  for (const a of apps()) {
    const line = short.split('\n').find((l) => l.startsWith(`- \`${a.id}\``));
    expect(line, a.id).toBeDefined();
    const url = /<(https:\/\/tinylittleoffice\.com\/[^>]+)>/.exec(line!)![1];
    const r = read(url);
    expect(r.app).toBe(a.id);
    expect(await lint(r.app, r.text)).toStrictEqual([]);
  }
});

// The skill is made three times over here, from every template: a slow runner takes longer than vitest's five seconds.
test('the three rules agents break first are in both files, from the one template', { timeout: 60_000 }, async () => {
  const skill = await makeSkill();
  const rules = /## Three rules agents break first\n\n([\s\S]*?)\n## /.exec(skill)![1];
  expect(rules).toContain('two spaces');
  expect(file('public/llms.txt')).toContain(rules.trim());
  expect(file('public/llms-full.txt')).toBe(makeLlms(skill));
  expect(file('public/llms.txt')).toBe(await makeShort(skill));
});

test('a page per app, under 4 KB: its shapes, an example and its rules', async () => {
  for (const a of apps()) {
    const page = file(`public/llms/${a.id}.txt`);
    expect(new TextEncoder().encode(page).length, a.id).toBeLessThan(4 * 1024);
    for (const s of SHAPES[a.id]) expect(page, `${a.id} ${s.id}`).toContain(`\`${s.id}\``);
    expect(page).toContain(`https://tinylittleoffice.com/examples/${a.id}.json`);
  }
  // The pages' address, once, above the examples.
  expect(file('public/llms.txt')).toContain('https://tinylittleoffice.com/llms/<app>.txt is a page on one app');
});

// Paul, 2026-10-12: an agent wrote that decks are text-only and the Animator's format unpublished, and shipped four
// companion links. /llms.txt says early, with a link that shows it, that a document goes inside another.
test('/llms.txt says a document goes inside another, before the three rules, with a deck whose second slide moves', () => {
  const short = file('public/llms.txt');
  const at = short.indexOf('\n## A document inside a document\n');
  expect(at).toBeGreaterThan(short.indexOf('\n## One example per app\n'));
  expect(at).toBeLessThan(short.indexOf('\n## Three rules agents break first\n'));
  const section = short.slice(at, short.indexOf('\n## Three rules'));
  for (const words of ['a fence named by any of the eleven app ids', '```` ```anim ````', 'an animation moves on its slide', 'edited in place']) expect(section).toContain(words);
  const url = /<(https:\/\/tinylittleoffice\.com\/deck\/#doc=[^>]+)>/.exec(section)![1];
  const r = read(url);
  expect(r.app).toBe('deck');
  expect(r.text.length).toBeLessThan(600);
  const doc = parse(r.text);
  const slides = slidesOf(doc);
  expect(slides).toHaveLength(2);
  const fence = doc.blocks[slides[1].sub];
  expect(fence).toMatchObject({ k: 'fence', lang: 'anim' });
  expect(Number(parse((fence as { body: string }).body).head.frames)).toBeGreaterThan(1);
  // Drawn by the Animator, and moving: the page's shapes are tweened.
  const page = subPage(doc, slides[1])!;
  expect(page.svg).toContain('<animateTransform');
  expect(page.alt).toBe('The Moon goes around the Earth, lit from the left by the Sun.');
  // And the skill says the same, in its own section.
  expect(file('skill/tinyoffice/SKILL.md')).toContain(section.trim());
});

test('the deck’s, the Word Processor’s and the Outliner’s pages each say a fence named by any app puts that document there', () => {
  for (const id of ['deck', 'write', 'outline']) {
    const page = file(`public/llms/${id}.txt`);
    expect(page, id).toContain('```` ```anim ````');
    expect(page, id).toContain('A fence named by any app');
  }
});

test('every example of every shape lints clean, comes back from the kernel as written, and its JSON is the kernel’s document', async () => {
  for (const a of apps()) {
    const kept = JSON.parse(file(`packages/doc/examples/${a.id}.json`));
    expect(kept.app).toBe(a.id);
    expect((await shapes(a.id)).map((s) => s.id)).toStrictEqual(SHAPES[a.id].map((s) => s.id));
    for (const ex of await example(a.id)) {
      expect(write(parse(ex.text)), `${a.id} ${ex.id}`).toBe(ex.text);
      expect(write(ex.json)).toBe(ex.text);
      expect(ex.json).toStrictEqual(parse(ex.text));
      expect(ex.lint, `${a.id} ${ex.id}`).toStrictEqual([]);
      expect(read(ex.link)).toMatchObject({ app: a.id });
      expect(SHAPES[a.id].find((s) => s.id === ex.id)!.has(parse(ex.text))).toBe(true);
    }
  }
});

test('example names a shape it does not know, with the ones it does; tryDraft gives the lint, the measures and the JSON of a draft', async () => {
  await expect(example('sheet', 'nope')).rejects.toThrow(/no shape "nope".*money/);
  const t = await tryDraft('diagram', '---\nkind: venn\n---\n- Cats: 2,000 cases\n- Dogs: walks\n');
  expect(t.lint.map((f) => f.kind)).toContain('comma-number');
  expect(t.measure.app).toBe('diagram');
  expect(t.json.head.kind).toBe('venn');
});

test('the home page points a fetcher to /llms.txt, and the site serves it as text', () => {
  const html = file('index.html');
  expect(html).toContain('<link rel="alternate" type="text/plain" href="/llms.txt" title="For agents" />');
  expect(html).toMatch(/<noscript>[\s\S]*Agents: %VITE_SITE_URL%llms\.txt says how to make a document as a link; a document goes inside another as a fence named by its app\.[\s\S]*<\/noscript>/);
  const headers = file('public/_headers');
  expect(headers).toMatch(/\/llms\.txt\n(?: {2}.*\n)*? {2}Content-Type: text\/plain; charset=utf-8\n/);
  expect(headers).toMatch(/\/llms\.txt\n(?: {2}.*\n)*? {2}Cache-Control: public, max-age=300\n/);
});

test('/api.js stays small: the apps, the lint and the examples are imported lazily, never by the entry; budgets.json holds the one file an import fetches to 32,000 bytes, its line since the kernel checks every op', () => {
  const api = file('src/api.ts');
  const statics = [...api.matchAll(/^import (?!type)[^;]*? from '([^']+)'/gm)].map((m) => m[1]);
  for (const lazy of ['./kit/core/apps.ts', './lint.ts', './kit/text/text-layer.ts', './kit/file/exports.ts']) expect(statics).not.toContain(lazy);
  expect(statics.some((s) => s.startsWith('./apps/') || s.includes('examples'))).toBe(false);
  expect(JSON.parse(file('budgets.json')).api).toBeLessThanOrEqual(32000);
});
