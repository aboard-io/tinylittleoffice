// The mirror on GitHub Pages (docs/mirror.md, scripts/mirror.ts): a build for https://aboard-io.github.io/tinylittleoffice/
// carries each page's policy in a <meta>, the one _headers gives its path less what a <meta> cannot carry, and names
// its installed app by its path; a build for the site, at its host's root, is as it was. Here on a build made of the real
// shell, _headers and manifest, as the build makes them (vite.config.ts), and checked as a deploy checks it.
import { test, expect, afterAll } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apps } from '../src/kit/core/apps.ts';
import { pageScripts } from '../src/kit/draw/page.ts';
import { checkBuild } from '../scripts/check-build.ts';
import { fillHeaders, headersFor, inlineScripts, metaPolicy, NOT_IN_META, pageMetaPolicy, scriptHash } from '../scripts/headers.ts';
import { forHost, hostOf, withPolicyMeta } from '../scripts/mirror.ts';
import { listed, writePages } from '../scripts/seo.ts';

const MIRROR = 'https://aboard-io.github.io/tinylittleoffice/';
const SITE = 'https://tinylittleoffice.com/';
const root = join(import.meta.dirname, '..');
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** A build's pages, _headers and manifest as the build leaves them for `env`'s settings. */
async function build(env: Record<string, string>) {
  const dist = mkdtempSync(join(tmpdir(), 'tlo-mirror-'));
  made.push(dist);
  const host = hostOf(env);
  writeFileSync(join(dist, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8').replaceAll('%VITE_SITE_URL%', host.site));
  for (const f of ['robots.txt', 'manifest.webmanifest', 'network.html', '_headers']) cpSync(join(root, 'public', f), join(dist, f));
  mkdirSync(join(dist, 'assets'));
  writePages(dist, { site: host.site, apps: await listed(apps()), built: '2026-10-15T12:00:00Z' });
  const hashes = [...new Set([...pageScripts(), ...inlineScripts(readFileSync(join(dist, 'index.html'), 'utf8'))].map(scriptHash))];
  writeFileSync(join(dist, '_headers'), fillHeaders(readFileSync(join(dist, '_headers'), 'utf8'), { scripts: hashes }));
  forHost(dist, host);
  return { dist, hashes, read: (p: string) => readFileSync(join(dist, p), 'utf8') };
}
const pages = (dist: string) => (readdirSync(dist, { recursive: true }) as string[]).filter((f) => f.endsWith('.html')).sort();

test('the mirror’s build: every page carries its path’s policy from _headers in a <meta>, less frame-ancestors, report-uri and sandbox', async () => {
  const { dist, read } = await build({ VITE_SITE_URL: MIRROR, VITE_CSP_META: '1' });
  const headers = read('_headers');
  const home = headersFor(headers, '/')['Content-Security-Policy'];
  expect(home).toContain("frame-ancestors 'none'");
  const meta = pageMetaPolicy(read('index.html'))!;
  expect(meta).toBe(home.replace(/; frame-ancestors 'none'$/, ''));
  for (const d of NOT_IN_META) expect(meta).not.toMatch(new RegExp(`(^|; )${d}\\b`));
  // Before the theme script, the first script there is, so it governs every one.
  const index = read('index.html');
  expect(index.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(index.indexOf('<script'));
  expect(index.indexOf('<meta charset="utf-8" />')).toBeLessThan(index.indexOf('http-equiv="Content-Security-Policy"'));
  // Every page, the app pages and the network page the site's, the embed page its own (which lets any page frame it there).
  expect(pages(dist)).toContain('embed/index.html');
  for (const f of pages(dist)) {
    const path = f === 'index.html' ? '/' : f.endsWith('/index.html') ? `/${f.slice(0, -'index.html'.length)}` : `/${f}`;
    expect(pageMetaPolicy(read(f)), f).toBe(metaPolicy(headersFor(headers, path)['Content-Security-Policy']));
  }
  expect(pageMetaPolicy(read('embed/index.html'))).not.toContain('frame-ancestors');
  expect(pageMetaPolicy(read('embed/index.html'))).not.toBe(meta);
  // The installed app is the mirror's folder, not every page of aboard-io.github.io.
  expect(JSON.parse(read('manifest.webmanifest')).id).toBe('/tinylittleoffice/');
  // The addresses the pages name are the mirror's.
  expect(read('index.html')).toContain(`<link rel="canonical" href="${MIRROR}" />`);
  expect(read('sitemap.xml')).toContain(`<loc>${MIRROR}outline/</loc>`);
  // What a deploy checks of the policy finds nothing wrong (the guides and the rest are not in this small build).
  expect(checkBuild(dist).filter((p) => /policy|<meta>/.test(p))).toEqual([]);
});

test('the site’s build, at its host’s root: no page carries a policy of its own, and the manifest is as written', async () => {
  for (const env of [{ VITE_SITE_URL: SITE }, {}] as Record<string, string>[]) {
    const { dist, read } = await build(env);
    for (const f of pages(dist)) expect(read(f), f).not.toContain('http-equiv="Content-Security-Policy"');
    expect(read('manifest.webmanifest')).toBe(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8'));
  }
  // A path alone, without VITE_CSP_META, moves the manifest's id and nothing else.
  const { dist, read } = await build({ VITE_SITE_URL: MIRROR });
  for (const f of pages(dist)) expect(read(f), f).not.toContain('http-equiv="Content-Security-Policy"');
  expect(JSON.parse(read('manifest.webmanifest')).id).toBe('/tinylittleoffice/');
});

test('a page’s policy goes right after its charset, its quotes written as the attribute needs, and is read back the same', () => {
  const policy = `default-src 'self'; script-src 'self' 'sha256-a+b/c='; frame-ancestors 'none'; report-uri https://r.example/?a=1&b="2"`;
  const page = withPolicyMeta('<head>\n    <meta charset="utf-8" />\n    <title>x</title>', policy);
  expect(page).toMatch(/^<head>\n {4}<meta charset="utf-8" \/>\n {4}<meta http-equiv="Content-Security-Policy" content="[^"]*" \/>\n {4}<title>/);
  expect(pageMetaPolicy(page)).toBe(`default-src 'self'; script-src 'self' 'sha256-a+b/c='`);
  expect(() => withPolicyMeta('<head><title>x</title>', policy)).toThrow(/charset/);
});
