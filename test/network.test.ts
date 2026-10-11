// What leaves the browser (docs/transparency.md §1 items 1 and 7): every host the source names is on the
// one list (src/kit/network.ts), src/ names a host only through that list, no analytics, error-reporting,
// font-CDN or tag-manager host appears anywhere, and docs/network.md and /network are what the list says.
// Builds are not run in tests, so this reads the source the build is made from.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { hostMatches, listed, reaches } from '../src/kit/network.ts';
import { networkDoc, networkPage } from '../scripts/network-doc.ts';

const root = join(import.meta.dirname, '..');
const TEXT = /\.(?:ts|js|mjs|html|css|json|svg|txt|webmanifest)$/;
const files = (dir: string): string[] =>
  (readdirSync(join(root, dir), { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
    .filter((f) => f.isFile() && TEXT.test(f.name) && !f.name.endsWith('.d.ts'))
    .map((f) => relative(root, join(f.parentPath, f.name)).replaceAll('\\', '/'));

/** Tests hold made-up addresses (example.com, x.y) and are never shipped. */
const isTest = (path: string) => /(^|\/)tests\/|\.test\.ts$/.test(path);
/**
 * Templates are sample documents: the addresses in them are a document's own content (a band's Bandcamp, a
 * café's Instagram), shown as links, which ask first. They are not requests the site makes.
 */
const TEMPLATES = ['src/apps/site/templates.ts'];
/** XML namespaces: names in an SVG, a .docx, a .pptx, an .xlsx or a .gpx file, never fetched. */
const NAMESPACES = ['www.w3.org', 'schemas.openxmlformats.org', 'purl.org', 'www.topografix.com'];
const LOCAL = ['localhost', '127.0.0.1'];

/** The source without its comments: a line that is a comment, a block comment, an HTML comment, and a trailing " // …". */
const code = (text: string) =>
  text
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
    .map((line) => line.replace(/\s\/\/\s.*$/, ''))
    .join('\n');
const hosts = (text: string) => [...text.matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+|localhost)/gi)].map((m) => m[1].toLowerCase());

const source = [...files('src'), ...files('tinier')];

test('every host the source reaches is on the list, or localhost, or a namespace', () => {
  const stray: string[] = [];
  for (const path of source) {
    if (isTest(path) || TEMPLATES.includes(path)) continue;
    for (const host of hosts(code(readFileSync(join(root, path), 'utf8')))) if (!listed(host) && !LOCAL.includes(host) && !NAMESPACES.includes(host)) stray.push(`${path}: ${host}`);
  }
  expect(stray).toEqual([]);
});

test('src/ names a host only through src/kit/network.ts', () => {
  const named: string[] = [];
  for (const path of files('src')) {
    if (isTest(path) || TEMPLATES.includes(path) || path === 'src/kit/network.ts') continue;
    for (const host of hosts(code(readFileSync(join(root, path), 'utf8')))) if (!LOCAL.includes(host) && !NAMESPACES.includes(host)) named.push(`${path}: ${host}`);
  }
  expect(named).toEqual([]);
});

test('the exemptions are still needed: each template holds an address, each namespace is still used', () => {
  for (const path of TEMPLATES) expect(hosts(readFileSync(join(root, path), 'utf8')).length, path).toBeGreaterThan(0);
  const all = source.filter((p) => !isTest(p)).flatMap((p) => hosts(readFileSync(join(root, p), 'utf8')));
  for (const ns of NAMESPACES) expect(all, ns).toContain(ns);
});

/** Analytics, error reporting, fonts from a CDN, tag managers, session recording: none of it, anywhere. */
const DENY = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'sentry.io',
  'sentry-cdn.com',
  'segment.com',
  'segment.io',
  'plausible.io',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'use.typekit.net',
  'hotjar.com',
  'mixpanel.com',
  'amplitude.com',
  'posthog.com',
  'fullstory.com',
  'clarity.ms',
  'bugsnag.com',
  'logrocket.com',
  'nr-data.net',
  'datadoghq.com',
  'cloudflareinsights.com',
];

test('no telemetry: no analytics, error-reporting, font-CDN or tag-manager host anywhere in the site', () => {
  const everywhere = [...source, ...files('public'), 'index.html', 'vite.config.ts', 'wrangler.jsonc'];
  const found: string[] = [];
  for (const path of everywhere) {
    const text = readFileSync(join(root, path), 'utf8').toLowerCase();
    for (const host of DENY) if (text.includes(host)) found.push(`${path}: ${host}`);
  }
  expect(found).toEqual([]);
  for (const r of reaches())
    expect(
      DENY.some((d) => r.host.endsWith(d)),
      r.host,
    ).toBe(false);
});

test('the list: every entry says what, when, what it carries, what stops it and who asks; none is a picture, a frame or a film', () => {
  for (const r of reaches()) for (const k of ['host', 'what', 'carries', 'stops', 'by'] as const) expect(r[k], `${r.host} ${k}`).toMatch(/\S/);
  for (const r of reaches()) for (const d of r.csp ?? []) expect(['img', 'connect'], r.host).toContain(d);
  // The one picture host is the map's: no host on the list serves a document's pictures.
  expect(
    reaches()
      .filter((r) => r.csp?.includes('img'))
      .map((r) => r.host),
  ).toEqual(['tile.openstreetmap.org']);
});

test('hostMatches: a "*." name, "*" and an exact name', () => {
  // A "*." name: every host under it, not the name itself; uppercase as lowercase.
  expect(hostMatches('*.example.org', 'a.example.org')).toBe(true);
  expect(hostMatches('*.example.org', 'A.B.EXAMPLE.ORG')).toBe(true);
  expect(hostMatches('*.example.org', 'example.org')).toBe(false);
  expect(hostMatches('*.example.org', 'badexample.org')).toBe(false);
  // "*" names no host, and an exact name only itself.
  for (const h of ['*', 'example.org', '']) expect(hostMatches('*', h), h).toBe(false);
  expect(hostMatches('tile.openstreetmap.org', 'TILE.openstreetmap.org')).toBe(true);
  expect(hostMatches('tile.openstreetmap.org', 'x.tile.openstreetmap.org')).toBe(false);
  expect(listed('tile.openstreetmap.org')).toBe(true);
  expect(listed('upload.wikimedia.org')).toBe(false);
});

// That docs/network.md and public/network.html are current is test/lints.test.ts's (npm run docs:network writes them).
test('docs/network.md and public/network.html name every host, and the page runs nothing', () => {
  // The page runs nothing: no script, no request but the site's own icon.
  expect(networkPage()).not.toMatch(/<script/i);
  for (const r of reaches()) if (r.host !== '*') expect(networkDoc(), r.host).toContain(r.host);
});
