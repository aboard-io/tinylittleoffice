/**
 * The site's headers, filled at the end of the build (vite.config.ts): public/_headers holds placeholders
 * the Content-Security-Policy is written from. {{scripts}} is the hash of every script the apps' pages
 * carry (src/kit/draw/page.ts) and of every inline script of the built pages (the theme script in index.html);
 * {{img}} and {{connect}} are the hosts src/kit/core/network.ts allows by each directive, so the policy allows what
 * docs/network.md lists and nothing else.
 */
import { createHash } from 'node:crypto';
import { reaches, type Directive } from '../src/kit/core/network.ts';

/** A script's hash as the policy names it: 'sha256-…'. */
export const scriptHash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;

/**
 * The inline scripts of a page that run: every <script> without a src and not data (JSON-LD), with something in it. The
 * build hashes these into the policy (vite.config.ts) and scripts/check-build.ts holds every page to it, by this one
 * reading.
 */
export const inlineScripts = (page: string): string[] =>
  [...page.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((code) => code.trim());

/** The sources the registry allows by one directive: "https://host". */
export function sources(directive: Directive): string[] {
  return reaches()
    .filter((r) => r.csp?.includes(directive))
    .map((r) => `https://${r.host}`)
    .filter((s, i, all) => all.indexOf(s) === i);
}

/** The headers file with its placeholders filled. */
export function fillHeaders(text: string, { scripts }: { scripts: string[] }): string {
  return text.replaceAll('{{scripts}}', scripts.join(' ')).replaceAll('{{img}}', sources('img').join(' ')).replaceAll('{{connect}}', sources('connect').join(' '));
}

/**
 * The headers _headers gives a path, as Cloudflare reads the file: every rule whose pattern matches ("*" any rest of
 * the path, ":name" one segment), in order; "Name: value" sets a header (a second rule's value joins the first's
 * with ", "), and "! Name" drops what the rules before set. `npm run preview` serves the build with these, so the
 * smoke run sees what the site's cache sees (vite.config.ts).
 */
export function headersFor(text: string, path: string): Record<string, string> {
  const out: Record<string, string> = {};
  let on = false;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const pattern = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/:\w+/g, '[^/]+');
      on = new RegExp(`^${pattern}$`).test(path);
    } else if (on) {
      const drop = /^\s*!\s*(.+)$/.exec(line);
      const set = /^\s*([^:]+):\s*(.*)$/.exec(line);
      if (drop) delete out[drop[1].trim()];
      else if (set) out[set[1]] = out[set[1]] ? `${out[set[1]]}, ${set[2]}` : set[2];
    }
  }
  return out;
}

/** The directives a policy given in a page's <meta> cannot carry: the browser ignores them there (CSP Level 3, §3.3). */
export const NOT_IN_META = ['frame-ancestors', 'report-uri', 'sandbox'];

/** A policy as a <meta> may carry it: the same directives in the same order, less those (NOT_IN_META). */
export const metaPolicy = (policy: string): string =>
  policy
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d && !NOT_IN_META.includes(d.split(/\s+/)[0]))
    .join('; ');

/** The policy a page's own <meta http-equiv="Content-Security-Policy"> carries, or null when it has none. */
export const pageMetaPolicy = (page: string): string | null =>
  /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/
    .exec(page)?.[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&') ?? null;

/** The path a built page is served at, for its rules in _headers: "index.html" at "/", "write/index.html" at "/write/". */
export const pagePath = (file: string): string => `/${file.replace(/(^|\/)index\.html$/, '$1')}`;
