// The links in the wild: every link a release of the site made (test/links/corpus.json, made by scripts/link-corpus.sh
// from the releases' own code and never rewritten) opens on this tree as the document it was made from, byte for
// byte, in an app that still is; sealed ones open with their passwords. And the ways a link is carried and changed on
// its way (a "+" escaped, the hash alone, the site's root for the app's page, a short link's arrival, a Display Link,
// a preview card's id in the path or the query) leave the document as it was. A failure here is a link somebody has
// that would stop opening: fix the code, never the corpus.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { read } from '../src/api.ts';
import { appOf } from '../src/kit/core/apps.ts';
import { unpackDoc } from '../src/kit/core/codec.ts';
import { parseHash, withoutCard } from '../src/kit/core/route.ts';
import { unseal } from '../src/kit/share/crypt.ts';

type Entry = { name: string; kind: string; app: string; link: string; sha256: string; bytes: number; password?: string; made: string[] };
const { entries } = JSON.parse(readFileSync(new URL('links/corpus.json', import.meta.url), 'utf8')) as { entries: Entry[] };
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const label = (e: Entry) => `${e.name} (${e.made[0]}${e.made.length > 1 ? ` +${e.made.length - 1}` : ''})`;

test('the corpus is there: every release whose link changed, every app, every kind of link', () => {
  expect(entries.length).toBeGreaterThanOrEqual(400);
  const made = new Set(entries.flatMap((e) => e.made));
  for (const tag of ['v1.0.0', 'v1.1.0', 'v1.2.0', 'v1.2.32', 'v1.2.36', 'v1.2.37', 'v1.2.38']) expect(made, tag).toContain(tag);
  expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(['packed', 'display', 'plain', 'titled', 'sealed']));
  expect(new Set(entries.map((e) => e.app)).size).toBeGreaterThanOrEqual(10);
  expect(new Set(entries.map((e) => e.link)).size).toBe(entries.length);
});

const opened = (e: Entry) => {
  const r = read(e.link);
  return { app: r.app, sha256: sha(r.text), display: r.display };
};

for (const e of entries.filter((e) => e.kind !== 'sealed'))
  test(`opens: ${label(e)}`, () => {
    expect(appOf(e.app), e.app).toBeTruthy();
    expect(opened(e)).toEqual({ app: e.app, sha256: e.sha256, display: e.kind === 'display' });
  });

/**
 * The links known not to open, each with why; a decision, never a test made to pass. v1.0.0 (2026-10-11 21:20) sealed
 * with a password the person chose and a slow key derivation (600,000 rounds); f228ad07 (22:58, v1.1.0) made the app choose every
 * password and the key one HKDF pass, and reads only that. A link v1.0.0 sealed in those 98 minutes asks for its
 * password and opens nothing. Open question for Paul (2026-11-27): read them again, or say so where they land.
 */
const UNOPENED = (e: Entry) => e.kind === 'sealed' && e.made.length === 1 && e.made[0] === 'v1.0.0';

for (const e of entries.filter((e) => e.kind === 'sealed'))
  test(`opens with its password: ${label(e)}`, { timeout: 30_000 }, async () => {
    const route = parseHash(e.link.slice(e.link.indexOf('#')));
    expect(route).toMatchObject({ app: e.app, sealed: true });
    const u = await unseal(e.password!, route.payload);
    if (UNOPENED(e)) return void expect(u, 'known not to open (UNOPENED); if it opens now, take it out of UNOPENED').toBeNull();
    expect(u, 'the password opens it').not.toBeNull();
    expect(sha(unpackDoc(u!.flag, u!.bytes))).toBe(e.sha256);
    expect(await unseal(`${e.password}x`, route.payload), 'and no other password').toBeNull();
  });

/** How a link is changed on its way, each of which still opens it as it was. */
const CARRIED: [string, (link: string) => string][] = [
  ['its "+" escaped', (l) => l.replaceAll('+', '%2B')],
  ['the hash alone', (l) => l.slice(l.indexOf('#'))],
  ['on the site’s root', (l) => `https://tinylittleoffice.com/${l.slice(l.indexOf('#'))}`],
  ['by http', (l) => l.replace(/^https:/, 'http:')],
  ['arrived by a short link', (l) => `${l}${l.includes('?') ? '&' : '?'}s=abcdefg&x=1791000000000`],
];
const packed = entries.filter((e) => e.kind === 'packed' || e.kind === 'titled');

for (const [how, change] of CARRIED)
  test(`opens, ${how}: all ${packed.length} packed links`, () => {
    const wrong = packed.filter((e) => {
      const r = read(change(e.link));
      return r.app !== e.app || sha(r.text) !== e.sha256;
    });
    expect(wrong.map(label)).toEqual([]);
  });

test('a preview card’s id, in the path or the query, leaves the app’s page and the document as they were', () => {
  const isApp = (id: string) => !!appOf(id);
  for (const e of packed.slice(0, 40)) {
    const hash = e.link.slice(e.link.indexOf('#'));
    const page = `https://tinylittleoffice.com/${e.app}/${hash}`;
    expect(withoutCard(`https://tinylittleoffice.com/c/abc1234${hash}`, isApp), e.name).toBe(page);
    expect(withoutCard(`https://tinylittleoffice.com/${e.app}/?c=abc1234${hash}`, isApp), e.name).toBe(page);
    expect(withoutCard(e.link, isApp), e.name).toBe(e.link);
    expect(sha(read(withoutCard(`https://tinylittleoffice.com/c/abc1234${hash}`, isApp)).text)).toBe(e.sha256);
  }
  // A card's page with no document is the site's root; a site not at a host's root keeps its folder.
  expect(withoutCard('https://tinylittleoffice.com/c/abc1234', isApp)).toBe('https://tinylittleoffice.com/');
  expect(withoutCard('https://aboard-io.github.io/tinylittleoffice/c/abc1234#/v1/write/yABC', isApp)).toBe('https://aboard-io.github.io/tinylittleoffice/write/#/v1/write/yABC');
});

test('a link cut short says so, rather than opening as an empty document', () => {
  const long = packed.find((e) => e.link.length > 600)!;
  expect(() => read(long.link.slice(0, long.link.length - 40))).toThrow(/cannot be read/);
});
