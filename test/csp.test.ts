// The site's Content-Security-Policy: the site itself, the picture proxy, and the hosts src/kit/network.ts
// allows by each directive, and nowhere else.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fillHeaders, mediaSource, sources } from '../scripts/headers.ts';
import { NETWORK, reaches, type Directive } from '../src/kit/network.ts';

const raw = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const policy = (text: string) => /Content-Security-Policy: (.+)/.exec(text)![1];
const directive = (csp: string, name: string) =>
  csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find((d) => d[0] === name)!
    .slice(1);
const csp = policy(fillHeaders(raw, { scripts: ["'sha256-x'"], media: mediaSource(undefined) }));
const PROXY = 'https://media.tinylittleoffice.com';

test('img-src: the site, data:, blob:, the proxy and the map’s tiles; no https: at large', () => {
  expect(directive(csp, 'img-src')).toEqual(["'self'", 'data:', 'blob:', PROXY, 'https://tile.openstreetmap.org']);
  // An export fetches a picture's bytes from the proxy.
  expect(directive(csp, 'connect-src')).toContain(PROXY);
  expect(directive(csp, 'script-src')).toContain("'sha256-x'");
  expect(fillHeaders(raw, { scripts: [], media: 'x' })).not.toMatch(/\{\{[\w-]+\}\}/);
});

test('every directive that reaches the web is the site, the proxy and the registry’s hosts for it, and nothing else', () => {
  const own: Record<Directive, string[]> = { img: ["'self'", 'data:', 'blob:', PROXY], connect: ["'self'", 'data:', PROXY], frame: ["'self'", 'about:', 'blob:'], media: [] };
  for (const d of Object.keys(own) as Directive[]) {
    const want = [
      ...own[d],
      ...reaches()
        .filter((r) => r !== NETWORK.media && r.csp?.includes(d))
        .map((r) => (r.host === '*' ? 'https:' : `https://${r.host}`)),
    ];
    expect(directive(csp, `${d}-src`).sort(), d).toEqual([...new Set(want)].sort());
  }
  // Each host the registry allows by a directive is in that one, and in no directive none of its entries names.
  for (const r of reaches()) {
    if (r === NETWORK.media || r.host === '*') continue;
    const named = reaches().filter((o) => o.host === r.host);
    for (const d of ['img', 'connect', 'frame', 'media'] as Directive[]) expect(sources(d).includes(`https://${r.host}`), `${r.host} ${d}`).toBe(named.some((o) => o.csp?.includes(d)));
  }
  expect(directive(csp, 'connect-src')).toEqual([
    "'self'",
    'data:',
    PROXY,
    'https://nominatim.openstreetmap.org',
    'https://tinier.tinylittleoffice.com',
    'https://public.api.bsky.app',
    'https://*.wikipedia.org',
  ]);
  // A thing tapped can be a post on any Mastodon server, so a frame and a sound may come from any https address.
  expect(directive(csp, 'frame-src')).toContain('https:');
  expect(directive(csp, 'media-src')).toEqual(['https:']);
  expect(directive(csp, 'default-src')).toEqual(["'self'"]);
});

test('font-src: the site and nothing else; the type is IBM Plex, served by the site (public/fonts/)', () => {
  expect(directive(csp, 'font-src')).toEqual(["'self'"]);
  expect(directive(policy(raw.split('/embed/')[1]), 'font-src')).toEqual(["'self'"]);
});

test('the proxy from VITE_MEDIA_URL: its origin; none, any https: (pictures load from their sites)', () => {
  expect(mediaSource('https://pics.self.host/base/')).toBe('https://pics.self.host');
  expect(mediaSource('')).toBe('https:');
  expect(mediaSource('/media')).toBe("'self'");
  expect(directive(policy(fillHeaders(raw, { scripts: [], media: mediaSource('') })), 'img-src')).toContain('https:');
});
