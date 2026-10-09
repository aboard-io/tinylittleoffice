// The site's Content-Security-Policy: pictures from the site, the picture proxy and the map's tiles, and nowhere else.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fillHeaders, mediaSource } from '../scripts/headers.ts';

const raw = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const policy = (text: string) => /Content-Security-Policy: (.+)/.exec(text)![1];
const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === name)!.slice(1);

test('img-src: the site, data:, blob:, the proxy and the map’s tiles; no https: at large', () => {
  const csp = policy(fillHeaders(raw, { scripts: ["'sha256-x'"], media: mediaSource(undefined) }));
  expect(directive(csp, 'img-src')).toEqual(["'self'", 'data:', 'blob:', 'https://media.tinylittleoffice.com', 'https://tile.openstreetmap.org']);
  // An export fetches a picture's bytes from the proxy.
  expect(directive(csp, 'connect-src')).toContain('https://media.tinylittleoffice.com');
  expect(directive(csp, 'script-src')).toContain("'sha256-x'");
  expect(fillHeaders(raw, { scripts: [], media: 'x' })).not.toMatch(/\{\{\w+\}\}/);
});

test('the proxy from VITE_MEDIA_URL: its origin; none, any https: (pictures load from their sites)', () => {
  expect(mediaSource('https://pics.self.host/base/')).toBe('https://pics.self.host');
  expect(mediaSource('')).toBe('https:');
  expect(mediaSource('/media')).toBe("'self'");
});
