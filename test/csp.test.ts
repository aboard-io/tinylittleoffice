// The site's Content-Security-Policy: the site itself and the hosts src/kit/network.ts allows by each directive,
// and nowhere else. A document fetches nothing from any other site: no frame-src or media-src of the list's.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fillHeaders, sources } from '../scripts/headers.ts';
import { reaches, type Directive } from '../src/kit/network.ts';

const raw = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const filled = fillHeaders(raw, { scripts: ["'sha256-x'"] });
const policies = [...filled.matchAll(/Content-Security-Policy: (.+)/g)].map((m) => m[1]);
const csp = policies[0];
const directive = (csp: string, name: string) =>
  csp
    .split(';')
    .map((d) => d.trim().split(/\s+/))
    .find((d) => d[0] === name)
    ?.slice(1);

test('img-src: the site, data:, blob: and the map’s tiles; no https: at large', () => {
  // data: for the pages drawn here (a QR code, an icon, a page drawn to a picture); blob: for a file made here and shown.
  expect(directive(csp, 'img-src')).toEqual(["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org']);
  expect(directive(csp, 'script-src')).toContain("'sha256-x'");
  expect(fillHeaders(raw, { scripts: [] })).not.toMatch(/\{\{[\w-]+\}\}/);
});

test('no frame-src and no media-src in either policy: frames, films and sounds are the site’s own (default-src)', () => {
  expect(policies).toHaveLength(2);
  for (const p of policies) {
    expect(directive(p, 'frame-src')).toBeUndefined();
    expect(directive(p, 'media-src')).toBeUndefined();
    expect(directive(p, 'default-src')).toEqual(["'self'"]);
    expect(directive(p, 'img-src')).not.toContain('https:');
  }
});

test('every directive that reaches the web is the site and the registry’s hosts for it, and nothing else', () => {
  const own: Record<Directive, string[]> = { img: ["'self'", 'data:', 'blob:'], connect: ["'self'", 'data:'] };
  for (const d of Object.keys(own) as Directive[]) {
    const want = [...own[d], ...reaches().flatMap((r) => (r.csp?.includes(d) ? [`https://${r.host}`] : []))];
    expect(directive(csp, `${d}-src`)!.sort(), d).toEqual([...new Set(want)].sort());
  }
  // Each host the registry allows by a directive is in that one, and in no directive none of its entries names.
  for (const r of reaches()) {
    if (r.host === '*') continue;
    const named = reaches().filter((o) => o.host === r.host);
    for (const d of ['img', 'connect'] as Directive[]) expect(sources(d).includes(`https://${r.host}`), `${r.host} ${d}`).toBe(named.some((o) => o.csp?.includes(d)));
  }
  expect(directive(csp, 'connect-src')).toEqual(["'self'", 'data:', 'https://nominatim.openstreetmap.org', 'https://tinier.tinylittleoffice.com']);
});

test('font-src: the site and nothing else; the type is IBM Plex, served by the site (public/fonts/)', () => {
  expect(directive(csp, 'font-src')).toEqual(["'self'"]);
});
