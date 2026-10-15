/**
 * The site's headers, filled at the end of the build (vite.config.ts): public/_headers holds placeholders
 * the Content-Security-Policy is written from. {{scripts}} is the hash of every script the apps' pages
 * carry (src/kit/draw/page.ts) and of every inline script of the built pages (the theme script in index.html);
 * {{img}} and {{connect}} are the hosts src/kit/core/network.ts allows by each directive, so the policy allows what
 * docs/network.md lists and nothing else.
 */
import { createHash } from 'node:crypto';
import { origin, reaches, type Directive } from '../src/kit/core/network.ts';

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

/**
 * The headers file with its placeholders filled. `tinier` is the build's own short-link service (VITE_TINIER), when it
 * is an address of its own: the policy lets the pages reach it in place of tinier.tinylittleoffice.com, so a copy that
 * runs its own shortener (docs/self-host.md) needs no change to the list.
 */
export function fillHeaders(text: string, { scripts, tinier }: { scripts: string[]; tinier?: string }): string {
  const own = tinier && /^https?:\/\//.test(tinier) ? new URL(tinier).origin : '';
  const connect = sources('connect').map((s) => (own && s === origin('tinier') ? own : s));
  return text.replaceAll('{{scripts}}', scripts.join(' ')).replaceAll('{{img}}', sources('img').join(' ')).replaceAll('{{connect}}', connect.join(' '));
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
