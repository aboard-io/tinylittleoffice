// The short-link client against the shortener itself, in one process: fetch is the Worker's handle().
import { test, expect, vi, afterEach } from 'vitest';
import { handle } from '../backends/tinier/tinier.ts';
import { expiresLine, expiresSentence, shorten, shortLink, timeLeft, unshorten } from '../src/kit/share/short.ts';
import { MemStore } from './memstore.ts';

/** What a link costs at the shortener: its ciphertext, in base64url characters (AES-GCM adds a 16-byte tag). */
const shortCost = (link: string): number => Math.ceil(((new TextEncoder().encode(link).length + 16) * 4) / 3);

const AT = 'https://tinier.test/';
const PAGE = '<p>{{id}}</p>';
afterEach(() => vi.unstubAllGlobals());

/** fetch, answered by the shortener with its rows in `store`; every request it saw is in `seen`. */
function serve(store: MemStore, ip = '1.2.3.4') {
  const seen: { method: string; body: string }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    seen.push({ method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : '' });
    const req = new Request(url, init);
    req.headers.set('cf-connecting-ip', ip);
    return handle(req, store, 'a-key', PAGE);
  });
  return seen;
}
const LONG = 'https://tinylittleoffice.com/text/#/v1/text/yAbCdEfGhIjKlMnOpQrStUv';

test('shorten: one link, the key in its fragment; the service is sent ciphertext, a lifetime and nothing else', async () => {
  const store = new MemStore();
  const seen = serve(store);
  const made = await shorten(LONG, 86400, AT);
  const m = /^https:\/\/tinier\.test\/([a-z0-9]{7})#([A-Za-z0-9_~]{43})$/.exec(made.short)!;
  expect(m).not.toBeNull();
  expect(m[1]).toBe(made.id);
  expect(shortLink(made.id, m[2], AT)).toBe(made.short);
  expect(made.expires).toBeGreaterThan(Date.now());
  expect(seen.map((r) => r.method)).toEqual(['POST']);
  expect(Object.keys(JSON.parse(seen[0].body)).sort()).toEqual(['c', 'iv', 'ttl']);
  expect(seen[0].body).not.toContain(m[2]);
  expect(seen[0].body).not.toContain('tinylittleoffice');
  // The link opens the document.
  const got = (await (await fetch(`${AT}api/${made.id}`)).json()) as { c: string; iv: string };
  expect(Object.keys(got).sort()).toEqual(['c', 'exp', 'iv']);
  expect(await unshorten(got.c, got.iv, m[2])).toBe(LONG);
  // Two links of the same document are two keys and two IVs.
  const again = await shorten(LONG, 86400, AT);
  expect(again.short.split('#')[1]).not.toBe(m[2]);
  expect(store.rows.get(again.id)!.iv).not.toBe(store.rows.get(made.id)!.iv);
});

test('the daily brake and the size cap are said in words', async () => {
  const store = new MemStore();
  serve(store);
  // Too long for the service: refused here, before anything is sent.
  const huge = LONG + 'x'.repeat(13 * 1024);
  await expect(shorten(huge, 3600, AT)).rejects.toThrow('This document is too long for a short link.');
  expect(shortCost(huge)).toBeGreaterThan(16 * 1024);
  expect(shortCost(LONG)).toBeLessThan(200);
  // The 101st of a day.
  for (let i = 0; i < 100; i++) await shorten(LONG, 3600, AT);
  await expect(shorten(LONG, 3600, AT)).rejects.toThrow('Limit reached: 100 short links a day per address. Try again tomorrow.');
});

test('how long a short link has left: days over a week are green, within a week amber, the last day red', () => {
  const now = Date.UTC(2026, 9, 9, 12);
  const day = 86_400_000,
    hour = 3_600_000;
  expect(timeLeft(now + 12 * day, now)).toEqual({ n: 12, unit: 'day', urgency: 'ok' });
  expect(timeLeft(now + 7 * day - 1000, now)).toEqual({ n: 7, unit: 'day', urgency: 'ok' });
  expect(timeLeft(now + 3 * day, now)).toEqual({ n: 3, unit: 'day', urgency: 'soon' });
  expect(timeLeft(now + day, now)).toEqual({ n: 1, unit: 'day', urgency: 'soon' });
  expect(timeLeft(now + day - 2000, now)).toEqual({ n: 1, unit: 'day', urgency: 'last' });
  expect(timeLeft(now + 3 * hour, now)).toEqual({ n: 3, unit: 'hour', urgency: 'last' });
  expect(timeLeft(now + 20 * 60_000, now)).toEqual({ n: 20, unit: 'minute', urgency: 'last' });
  expect(timeLeft(now - 1, now)).toEqual({ n: 1, unit: 'minute', urgency: 'last' });
  expect(expiresSentence(now + 12 * day, now)).toBe('This link expires in 12 days');
  expect(expiresSentence(now + day, now)).toBe('This link expires in 1 day');
  expect(expiresSentence(now + 3 * hour, now)).toBe('This link expires in 3 hours');
  expect(expiresLine(now + 7 * day, now, 'en-GB')).toBe('Expires in 7 days (16 October)');
  expect(expiresLine(now + hour, now, 'en-GB')).toBe('Expires in 1 hour (9 October)');
});
