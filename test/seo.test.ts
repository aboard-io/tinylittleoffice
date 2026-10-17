// What a crawler gets (Paul, 2026-10-11: "everything but the templates"): a sitemap of the home page
// and every app's page, named in robots.txt; one JSON-LD WebApplication block on each page; and in each page's
// static HTML, before any script runs, the words the rendered page shows: the apps' names on the home page, an
// app's name, its line and its templates' names on its own page. Written by scripts/seo.ts at the end of the build
// (vite.config.ts) and checked by it before a deploy (scripts/check-build.ts); here on a build made of the real
// shell, and on the build in dist/ when there is one.
import { test, expect, beforeAll, afterAll } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apps } from '../src/kit/core/apps.ts';
import { inlineScripts } from '../scripts/headers.ts';
import { checkSeo, firstHeader, ldBlocks, listed, sitemapLocs, writePages, type Listed } from '../scripts/seo.ts';
import { CARD_TAGS, tagCount } from '../backends/cards/cards.ts';

const SITE = 'https://office.example.org/';
const BUILT = '2026-10-11T12:00:00Z';
const root = join(import.meta.dirname, '..');
let list: Listed[] = [];
let dist = '';

/** A build's shell and robots.txt as the bundler leaves them, for `site`; then the pages written as the build writes them. */
function build(site: string) {
  if (dist) rmSync(dist, { recursive: true, force: true });
  dist = mkdtempSync(join(tmpdir(), 'tlo-seo-'));
  writeFileSync(join(dist, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8').replaceAll('%VITE_SITE_URL%', site));
  cpSync(join(root, 'public/robots.txt'), join(dist, 'robots.txt'));
  mkdirSync(join(dist, 'assets'));
  writePages(dist, { site, apps: list, built: BUILT });
}
const read = (p: string) => readFileSync(join(dist, p), 'utf8');

beforeAll(async () => {
  list = await listed(apps());
});
afterAll(() => rmSync(dist, { recursive: true, force: true }));

test('the theme script is in every page, byte for byte the shell’s, and is no file of its own', () => {
  build(SITE);
  const [theme, ...more] = inlineScripts(readFileSync(join(root, 'index.html'), 'utf8'));
  expect(more).toEqual([]);
  expect(theme).toContain("localStorage.getItem('to-theme')");
  for (const p of ['index.html', ...apps().map((a) => `${a.id}/index.html`), 'embed/index.html']) {
    expect(inlineScripts(read(p)), p).toEqual([theme]);
    expect(read(p), p).not.toMatch(/theme\.js|assets\/theme-/);
  }
  expect(existsSync(join(dist, 'theme.js'))).toBe(false);
  expect(readdirSync(join(dist, 'assets'))).toEqual([]);
});

test('the sitemap lists the home page and every app’s page, at the site’s address, dated by the commit; robots.txt names it', () => {
  build(SITE);
  expect(sitemapLocs(read('sitemap.xml'))).toEqual([SITE, ...apps().map((a) => `${SITE}${a.id}/`)]);
  expect(read('sitemap.xml')).toContain(`<lastmod>${BUILT}</lastmod>`);
  expect(read('sitemap.xml')).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  expect(read('robots.txt')).toMatch(/^User-agent: \*$/m);
  expect(read('robots.txt')).toMatch(new RegExp(`^Sitemap: ${SITE}sitemap.xml$`, 'm'));
  expect(checkSeo(dist, list)).toEqual([]);
});

test('every page carries one WebApplication in JSON-LD: its name, its line, its address, free, by Aboard, MIT', () => {
  build(SITE);
  const description = /<meta name="description" content="([^"]*)"/.exec(read('index.html'))![1];
  const common = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'Aboard', url: 'https://aboard.com' },
    license: 'https://opensource.org/license/mit',
    isAccessibleForFree: true,
  };
  expect(ldBlocks(read('index.html'))).toEqual([{ ...common, name: 'Tiny Little Office', description, url: SITE }]);
  for (const a of apps()) expect(ldBlocks(read(`${a.id}/index.html`)), a.id).toEqual([{ ...common, name: a.name, description: a.blurb, url: `${SITE}${a.id}/` }]);
  // The embed page is not indexed (noindex) and says nothing of the kind.
  expect(ldBlocks(read('embed/index.html'))).toEqual([]);
  expect(read('embed/index.html')).toContain('<meta name="robots" content="noindex" />');
});

test('the static HTML says what the rendered page shows: the apps’ names on the home page; on an app’s page its name, its line and its templates’ names', () => {
  build(SITE);
  const home = firstHeader(read('index.html'));
  for (const a of apps()) expect(home).toContain(`<a href="${a.id}/">${a.name}</a>`);
  // The agents' line comes first, before the site's name and the apps', naming the guide and the fence.
  expect(home).toMatch(
    /^<header id="to-first"><p class="sr-only">Agents: https:\/\/office\.example\.org\/llms\.txt says how to make a document as a link; a document goes inside another as a fence named by its app\.<\/p><h1>/,
  );
  expect(home.indexOf('llms.txt')).toBeLessThan(home.indexOf('<a href="write/">'));
  const write = firstHeader(read('write/index.html'));
  expect(write).toContain('<h1>Word Processor</h1>');
  expect(write).toContain(`<p>${apps()[0].blurb}</p>`);
  expect(write).toContain('<li>Cover letter</li>');
  for (const a of list) {
    const page = firstHeader(read(`${a.id}/index.html`));
    for (const name of a.templates) expect(page, `${a.id}: ${name}`).toContain(`<li>${name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</li>`);
  }
  // The page as it is drawn before the app (page.css, #to-first): the words a crawler reads, where the page shows them;
  // what it does not show (the line for agents, an app's templates' names) out of sight as a screen reader's words are
  // (.sr-only), and nothing else: no other class, no style, no hidden attribute.
  expect(read('write/index.html')).toMatch(/<header id="to-first">/);
  expect(write).toMatch(/<\/p><ul class="sr-only"><li>/);
  for (const first of [home, write]) expect(first.replaceAll(' class="sr-only"', ''), first).not.toMatch(/hidden|display:\s*none|class=|style=/);
  expect(home.match(/class="sr-only"/g)).toHaveLength(1);
  expect(write.match(/class="sr-only"/g)).toHaveLength(1);
});

test('what the check finds wrong: a page left out of the sitemap, structured data that does not say the page, a template not named', () => {
  build(SITE);
  writeFileSync(join(dist, 'sitemap.xml'), read('sitemap.xml').replace(`<url><loc>${SITE}trip/</loc>`, '<url><loc>x</loc>'));
  writeFileSync(join(dist, 'cal/index.html'), read('cal/index.html').replace('"BusinessApplication"', '"GameApplication"'));
  writeFileSync(join(dist, 'deck/index.html'), read('deck/index.html').replace('<li>Zine</li>', ''));
  writeFileSync(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  expect(checkSeo(dist, list)).toEqual([
    'robots.txt does not name the sitemap (Sitemap: https://office.example.org/sitemap.xml)',
    `sitemap.xml lists x, not ${SITE}trip/`,
    'deck/index.html: the first text does not name the template "Zine"',
    'cal/index.html: the JSON-LD is not the page’s WebApplication (applicationCategory)',
  ]);
});

test('a build with no address for the site (no VITE_SITE_URL) writes no sitemap, and the check says why', () => {
  // The bundler leaves the placeholder in the shell when the variable is not set at all.
  build('%VITE_SITE_URL%');
  expect(checkSeo(dist, list)).toEqual(['the build has no address for the site (VITE_SITE_URL): no sitemap, and no address in the structured data']);
  build('');
  expect(existsSync(join(dist, 'sitemap.xml'))).toBe(false);
  expect(read('robots.txt')).not.toMatch(/Sitemap/);
  expect(checkSeo(dist, list)).toEqual(['the build has no address for the site (VITE_SITE_URL): no sitemap, and no address in the structured data']);
});

// The site's Worker writes a shared document's card into these tags by plain substitution (backends/cards/cards.ts): each must
// be there, once, on every page a link opens, or a card would be left out or said twice.
test('every page a link opens carries each tag a preview card replaces exactly once; an app page names its own card in them', () => {
  build(SITE);
  for (const p of ['index.html', ...apps().map((a) => `${a.id}/index.html`)]) for (const tag of CARD_TAGS) expect(tagCount(read(p), tag), `${p} ${tag}`).toBe(1);
  const sheet = read('sheet/index.html');
  expect(sheet).toContain('<meta name="twitter:title" content="Spreadsheet · Tiny Little Office" />');
  expect(checkSeo(dist, list)).toEqual([]);
  // A tag said twice, or not at all, is what the check finds, so a deploy refuses it (scripts/check-build.ts).
  writeFileSync(join(dist, 'sheet/index.html'), sheet.replace('</head>', '<meta name="twitter:title" content="again" />\n</head>').replace(/<meta property="og:image:alt"[^>]*>/, ''));
  expect(checkSeo(dist, list)).toEqual(['sheet/index.html: the tag og:image:alt is there 0 times, not once', 'sheet/index.html: the tag twitter:title is there 2 times, not once']);
});

// A build made for an address (VITE_SITE_URL, as a deploy's always is); one made without (the e2e run's) is the case above.
const built = join(root, 'dist');
const forSite = existsSync(join(built, 'index.html')) && /<link rel="canonical" href="https?:/.test(readFileSync(join(built, 'index.html'), 'utf8'));
test.skipIf(!forSite)('the build in dist/ is complete for a crawler', () => {
  expect(checkSeo(built, list)).toEqual([]);
  for (const p of ['index.html', ...apps().map((a) => `${a.id}/index.html`)]) for (const tag of CARD_TAGS) expect(tagCount(readFileSync(join(built, p), 'utf8'), tag), `${p} ${tag}`).toBe(1);
});
