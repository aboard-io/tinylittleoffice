/**
 * The site's pages as the build writes them (vite.config.ts, after the bundler), and what a crawler gets of them
 * (Paul, 2026-10-11: "everything but the templates"; no template pages, no copy, nothing hidden):
 *
 *   - a page per app, dist/<id>/index.html: the shell with that app's name and line in its tags and its own
 *     canonical address, so a shared link previews as that app; dist/embed/index.html, the shell at the one
 *     address another site may frame (noindex);
 *   - in each page's <header id="to-first">, plain text the shell takes away as it starts (kit/core/shell.ts;
 *     scripts/first.ts): on the home page the line for agents first (where /llms.txt is), then the apps' names, each a
 *     link to its page; on an app's page its name, its line and its templates' names. The words the rendered page
 *     shows, there before any script runs, drawn by the stylesheet where the rendered page shows them (page.css,
 *     #to-first): the line for agents and the templates' names, which it does not show, out of sight;
 *   - one JSON-LD block on each page, a schema.org WebApplication with that page's name, line and address
 *     (`type="application/ld+json"` runs nothing, so the Content-Security-Policy is as it was: scripts/check-build.ts);
 *   - dist/sitemap.xml, the home page and every app's page, dated by the commit; robots.txt names it (public/robots.txt
 *     says "Sitemap: {{site}}sitemap.xml", filled with the address, or the line dropped without one).
 *
 * Every address is the site's (VITE_SITE_URL), so a copy published elsewhere names its own. A build without one
 * writes no sitemap; `checkSeo` says so, and a deploy refuses (scripts/check-build.ts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppDef } from '../src/kit/core/app.ts';
import { origin } from '../src/kit/core/network.ts';
import { CARD_TAGS, tagCount } from '../backends/cards/cards.ts';
import { agents, appFirst, homeFirst, SITE_NAME, text, type Listed } from './first.ts';

export type { Listed };

/** The registry's apps as the pages name them, their templates asked for (the build runs under node, in English). */
export const listed = (apps: AppDef[]): Promise<Listed[]> => Promise.all(apps.map(async (a) => ({ id: a.id, name: a.name, blurb: a.blurb, templates: (await a.templates()).map((t) => t.name) })));

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const unattr = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&');

/** The structured data of one page: the site, or one of its apps, as a schema.org WebApplication. */
function webApplication(page: { name: string; description: string; url: string }): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.name,
    description: page.description,
    url: page.url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'Aboard', url: origin('maker') },
    license: 'https://opensource.org/license/mit',
    isAccessibleForFree: true,
  };
}
/** The block that carries it; "<" written as \u003c, so no text in it can close the element. */
const ldScript = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

/** The JSON-LD blocks of a page, parsed (a block that does not parse is null). */
export function ldBlocks(page: string): unknown[] {
  return [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      return JSON.parse(m[1]) as unknown;
    } catch {
      return null;
    }
  });
}
/** What a page's first text holds: its <header id="to-first">, or ''. */
export const firstHeader = (page: string) => /<header id="to-first">[\s\S]*?<\/header>/.exec(page)?.[0] ?? '';
const withHeader = (page: string, inner: string) => page.replace(/<header id="to-first">[\s\S]*?<\/header>/, `<header id="to-first">${inner}</header>`);

/** The sitemap of the home page and each app's page. */
export function sitemap(site: string, ids: string[], lastmod: string): string {
  const url = (loc: string) => `  <url><loc>${text(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>\n`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[site, ...ids.map((id) => `${site}${id}/`)].map(url).join('')}</urlset>\n`;
}
/** The addresses a sitemap lists, in order. */
export const sitemapLocs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

/**
 * Every page of the build from the shell in dist/index.html (the theme script in it as written, so its hash in the
 * policy is of every page's: vite.config.ts): the home page's first text and structured data, a page per app, the
 * embed page, the sitemap and robots.txt's line naming it. `site` is the address the site is
 * published at, with its trailing slash ('' when the build was given none); `built` the commit's date.
 */
export function writePages(dist: string, { site, apps, built }: { site: string; apps: Listed[]; built: string }) {
  const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');
  const description = unattr(/<meta name="description" content="([^"]*)"/.exec(shell)?.[1] ?? '');
  const ld = (page: string, data: Parameters<typeof webApplication>[0]) => page.replace('</head>', `  ${ldScript(webApplication(data))}\n  </head>`);

  mkdirSync(resolve(dist, 'embed'), { recursive: true });
  writeFileSync(resolve(dist, 'embed', 'index.html'), shell.replace(/(src|href)="\.\//g, '$1="../').replace('</title>', '</title>\n    <meta name="robots" content="noindex" />'));

  writeFileSync(resolve(dist, 'index.html'), ld(withHeader(shell, homeFirst(site, apps)), { name: SITE_NAME, description, url: site }));

  for (const app of apps) {
    const title = `${app.name} · ${SITE_NAME}`;
    const card = existsSync(resolve(dist, 'og', `${app.id}.png`));
    const page = shell
      .replace(/(src|href)="\.\//g, '$1="../')
      .replace(/<title>[^<]*<\/title>/, `<title>${text(title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*"/, `$1${attr(app.blurb)}"`)
      .replace(/(<meta (?:property="og|name="twitter):title" content=")[^"]*"/g, `$1${attr(title)}"`)
      .replace(/(<meta (?:property="og|name="twitter):description" content=")[^"]*"/g, `$1${attr(app.blurb)}"`)
      .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${site}${app.id}/"`)
      .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${site}${app.id}/"`)
      .replace(/(<meta (?:property="og|name="twitter):image" content=")[^"]*"/g, (m, a) => (card ? `${a}${site}og/${app.id}.png"` : m))
      .replace(/(<meta property="og:image:alt" content=")[^"]*"/, (m, a) => (card ? `${a}${attr(`${app.name}: ${app.blurb}`)}"` : m));
    mkdirSync(resolve(dist, app.id), { recursive: true });
    writeFileSync(resolve(dist, app.id, 'index.html'), ld(withHeader(page, appFirst(app)), { name: app.name, description: app.blurb, url: `${site}${app.id}/` }));
  }

  const robots = resolve(dist, 'robots.txt');
  if (existsSync(robots)) writeFileSync(robots, readFileSync(robots, 'utf8').replace(/^Sitemap: \{\{site\}\}(.*)\n?/m, site ? `Sitemap: ${site}$1\n` : ''));
  if (site)
    writeFileSync(
      resolve(dist, 'sitemap.xml'),
      sitemap(
        site,
        apps.map((a) => a.id),
        built,
      ),
    );
}

/** What a crawler would find wrong with the build in `dist`, in words; none when it is right and complete. */
export function checkSeo(dist: string, apps: Listed[]): string[] {
  const at = (p: string) => resolve(dist, p);
  const read = (p: string) => (existsSync(at(p)) ? readFileSync(at(p), 'utf8') : '');
  const home = read('index.html');
  const site = unattr(/<link rel="canonical" href="([^"]*)"/.exec(home)?.[1] ?? '');
  // Built without one, the shell's canonical is empty, or still the bundler's placeholder (%VITE_SITE_URL%).
  if (!/^https?:\/\//.test(site)) return ['the build has no address for the site (VITE_SITE_URL): no sitemap, and no address in the structured data'];
  const problems: string[] = [];

  if (!new RegExp(`^Sitemap: ${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}sitemap\\.xml$`, 'm').test(read('robots.txt')))
    problems.push(`robots.txt does not name the sitemap (Sitemap: ${site}sitemap.xml)`);
  const xml = read('sitemap.xml');
  if (!xml) problems.push('sitemap.xml is missing');
  else {
    const want = [site, ...apps.map((a) => `${site}${a.id}/`)];
    const locs = sitemapLocs(xml);
    want.forEach((w, i) => locs[i] !== w && problems.push(`sitemap.xml lists ${locs[i] ?? 'nothing'}, not ${w}`));
    for (const extra of locs.slice(want.length)) problems.push(`sitemap.xml lists ${extra}, which is no page of the site`);
  }

  const pages = [
    {
      file: 'index.html',
      name: SITE_NAME,
      description: unattr(/<meta name="description" content="([^"]*)"/.exec(home)?.[1] ?? ''),
      url: site,
      words: [agents(site), ...apps.map((a) => a.name)],
      app: null as Listed | null,
    },
    ...apps.map((a) => ({ file: `${a.id}/index.html`, name: a.name, description: a.blurb, url: `${site}${a.id}/`, words: [a.name, a.blurb], app: a })),
  ];
  for (const p of pages) {
    const page = read(p.file);
    if (!page) {
      problems.push(`${p.file} is missing`);
      continue;
    }
    const blocks = ldBlocks(page);
    const want = webApplication(p);
    if (blocks.length !== 1) problems.push(`${p.file}: ${blocks.length} JSON-LD blocks, not one`);
    else if (!blocks[0] || typeof blocks[0] !== 'object') problems.push(`${p.file}: the JSON-LD does not parse`);
    else {
      const got = blocks[0] as Record<string, unknown>;
      const wrong = Object.keys(want).filter((k) => JSON.stringify(got[k]) !== JSON.stringify(want[k]));
      if (wrong.length) problems.push(`${p.file}: the JSON-LD is not the page’s WebApplication (${wrong.join(', ')})`);
    }
    // A link shared with a network writes its preview card into these tags (backends/cards/cards.ts), by substitution: each once.
    for (const tag of CARD_TAGS) if (tagCount(page, tag) !== 1) problems.push(`${p.file}: the tag ${tag} is there ${tagCount(page, tag)} times, not once`);
    const first = firstHeader(page);
    for (const w of p.words) if (!first.includes(text(w))) problems.push(`${p.file}: the first text does not say "${w}"`);
    for (const n of p.app?.templates ?? []) if (!first.includes(`<li>${text(n)}</li>`)) problems.push(`${p.file}: the first text does not name the template "${n}"`);
  }
  return problems;
}
