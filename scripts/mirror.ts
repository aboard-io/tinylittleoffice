/**
 * A build for a host other than Cloudflare's: the mirror on GitHub Pages, https://aboard-io.github.io/tinylittleoffice/
 * (docs/mirror.md, .github/workflows/pages.yml), so a link keeps opening when tinylittleoffice.com is down (Paul,
 * 2026-10-15, issue #13). Two things differ from the site's build, each by a setting, and a build without them is the
 * site's, byte for byte:
 *
 *   - the path. VITE_SITE_URL names where the site is published; its path ("/tinylittleoffice/") is the site's prefix.
 *     The pages and the stylesheet name every file relatively (base './'), the worker's scope is its own folder and
 *     the shell finds the site from its address (kit/core/route.ts siteOf), so the one thing written for the path is
 *     the manifest's id, "/", which would make the installed app every page of the host: it is the path instead.
 *   - the policy. Pages sends no headers, so with VITE_CSP_META=1 each page carries the Content-Security-Policy that
 *     _headers gives its path, as a <meta> first in its head, less what a <meta> cannot carry (frame-ancestors,
 *     report-uri, sandbox: scripts/headers.ts metaPolicy).
 */
import { readFileSync, readdirSync, writeFileSync, type Dirent } from 'node:fs';
import { relative, resolve } from 'node:path';
import { headersFor, metaPolicy, pagePath } from './headers.ts';

/** The settings a build reads, from the environment (vite.config.ts): where it is published, and whether its pages carry their policy. */
export const hostOf = (env: Record<string, string | undefined>) => ({ site: env.VITE_SITE_URL ?? '', cspMeta: env.VITE_CSP_META === '1' });

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** A page with the policy as a <meta> right after its charset, before anything the policy governs. */
export function withPolicyMeta(page: string, policy: string): string {
  const charset = '<meta charset="utf-8" />';
  if (!page.includes(charset)) throw new Error('a page without <meta charset="utf-8" /> first: nowhere to put its policy');
  return page.replace(charset, `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${attr(metaPolicy(policy))}" />`);
}

/** The build in `dist` made for its host: the manifest's id under a path, and each page's policy in it when asked. Nothing changes for a site at a host's root without VITE_CSP_META. */
export function forHost(dist: string, { site, cspMeta }: { site: string; cspMeta: boolean }) {
  const path = /^https?:\/\//.test(site) ? new URL(site).pathname : '/';
  if (path !== '/') {
    const file = resolve(dist, 'manifest.webmanifest');
    writeFileSync(file, readFileSync(file, 'utf8').replace(/"id": "\/"/, `"id": ${JSON.stringify(path)}`));
  }
  if (!cspMeta) return;
  const headers = readFileSync(resolve(dist, '_headers'), 'utf8');
  const pages = (readdirSync(dist, { recursive: true, withFileTypes: true }) as Dirent[])
    .filter((f) => f.isFile() && f.name.endsWith('.html'))
    .map((f) => relative(dist, resolve(f.parentPath, f.name)).replaceAll('\\', '/'));
  for (const f of pages) {
    const policy = headersFor(headers, pagePath(f))['Content-Security-Policy'];
    if (policy) writeFileSync(resolve(dist, f), withPolicyMeta(readFileSync(resolve(dist, f), 'utf8'), policy));
  }
}
