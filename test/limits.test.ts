// Where a link fits: the costs the services charge, and the one line the Share dialog says it in.
import { test, expect } from 'vitest';
import { blueskyCost, CHROME_URL_MAX, FIREFOX_URL_MAX, fitLine, fitWords, limitWords, roomFor, shown, TARGETS } from '../src/kit/share/limits.ts';
import { URL_LIMIT } from '../src/kit/core/codec.ts';
import { QR_MAX_BYTES } from '../src/kit/draw/qr.ts';
import { SHORT_LINK_MAX, SHORT_MAX, sealShortAt } from '../src/kit/share/short.ts';

/** What a link costs at the shortener: its ciphertext, in base64url characters (AES-GCM adds a 16-byte tag). */
const shortCost = (link: string): number => Math.ceil(((new TextEncoder().encode(link).length + 16) * 4) / 3);

test('Bluesky counts the host and sixteen characters of the rest', () => {
  expect(blueskyCost('https://tinylittleoffice.com/')).toBe('tinylittleoffice.com'.length);
  expect(blueskyCost('https://tinylittleoffice.com/text/#/v1/text/yAbCdEfGhIjKlMnOpQrStUv')).toBe('tinylittleoffice.com'.length + 16);
  expect(blueskyCost('not a url')).toBe(9);
});

test('every target reports what is used and what is left', () => {
  const url = 'https://tinylittleoffice.com/#/v1/text/' + 'y'.repeat(200);
  const rooms = roomFor(url);
  expect(rooms.length).toBe(TARGETS.length);
  const sms = rooms.find((r) => r.target.id === 'sms')!;
  expect(sms.used).toBe(url.length);
  expect(sms.left).toBeLessThan(0);
  expect(rooms.find((r) => r.target.id === 'mastodon')!.used).toBe(23);
  expect(rooms.find((r) => r.target.id === 'link')!.left).toBe(2048 - url.length);
});

test('the short link is one of the rooms: the longest link whose ciphertext the shortener holds', async () => {
  const url = 'https://tinylittleoffice.com/#/v1/text/' + 'y'.repeat(200);
  const short = roomFor(url).find((r) => r.target.id === 'short')!;
  expect(short.target.max).toBe(SHORT_LINK_MAX);
  expect(SHORT_LINK_MAX).toBe(Math.floor((SHORT_MAX * 3) / 4) - 16);
  expect(short.used).toBe(url.length);
  expect(short.left).toBe(SHORT_LINK_MAX - url.length);
  // The inverse of shortCost: a link of exactly SHORT_LINK_MAX characters is sealed; one more is too long.
  const at = (n: number) => 'https://tinylittleoffice.com/#/v1/text/'.padEnd(n, 'y');
  expect(shortCost(at(SHORT_LINK_MAX))).toBeLessThanOrEqual(SHORT_MAX);
  expect(shortCost(at(SHORT_LINK_MAX + 1))).toBeGreaterThan(SHORT_MAX);
  const key = new Uint8Array(32) as Uint8Array<ArrayBuffer>;
  const iv = new Uint8Array(12) as Uint8Array<ArrayBuffer>;
  expect((await sealShortAt(at(SHORT_LINK_MAX), key, iv)).c.length).toBeLessThanOrEqual(SHORT_MAX);
  await expect(sealShortAt(at(SHORT_LINK_MAX + 1), key, iv)).rejects.toThrow('too long for a short link');
});

test('one line: fits in a text message, or too long for the first place, from the roomiest down, it does not fit', () => {
  const at = (n: number) => 'https://tinylittleoffice.com/#/v1/text/'.padEnd(n, 'y');
  expect(fitLine(at(120))).toBe('This link: 120 characters, fits in a text message');
  expect(fitLine(at(400))).toBe('This link: 400 characters, too long for a text message');
  expect(fitLine(at(700))).toBe('This link: 700 characters, too long for a small NFC sticker');
  expect(fitLine(at(1240))).toBe('This link: 1,240 characters, too long for an NFC sticker');
  expect(fitLine(at(2010))).toBe('This link: 2,010 characters, too long for a Discord message');
  expect(fitLine(at(2500))).toBe('This link: 2,500 characters, too long for older browsers');
  expect(fitLine(at(3500))).toBe('This link: 3,500 characters, too long for a QR code');
  expect(fitLine(at(5000))).toBe('This link: 5,000 characters, too long for a link in Google Docs');
  // What the shortener holds is the ciphertext, a third longer than the link: 12,273 characters is past it.
  expect(SHORT_LINK_MAX).toBe(12_272);
  expect(fitLine(at(12_272))).toMatch(/too long for a link in Google Docs$/);
  // Telegram's 4,096 is the same room; Google Docs, the one that cut Paul's link, is the one named.
  expect(
    roomFor(at(5000))
      .filter((r) => r.left === 4096 - 5000)
      .map((r) => r.target.id),
  ).toEqual(['gdocs', 'telegram', 'x']);
  expect(fitLine(at(12_273))).toBe('This link: 12,273 characters, too long for a short link');
});

test('every limit is stated with its number and what it counts, beside whether the link fits (Paul, 2026-10-15, issue #8)', () => {
  // The browsers' documented maximums: Chromium's kMaxURLChars and Firefox's network.standard-url.max-length.
  expect(CHROME_URL_MAX).toBe(2_097_152);
  expect(FIREFOX_URL_MAX).toBe(1_048_576);
  const max = Object.fromEntries(TARGETS.map((x) => [x.id, x.max]));
  // One source of truth: each number the file that enforces it holds.
  expect(max).toMatchObject({ chrome: CHROME_URL_MAX, firefox: FIREFOX_URL_MAX, safari: Infinity, link: URL_LIMIT, qr: QR_MAX_BYTES, short: SHORT_LINK_MAX });
  const url = 'https://tinylittleoffice.com/#/v1/text/'.padEnd(2500, 'y');
  const words = Object.fromEntries(roomFor(url).map((r) => [r.target.id, [limitWords(r), fitWords(r)]]));
  expect(words).toEqual({
    chrome: ['2,097,152 characters', `Yes, ${(2_097_152 - 2500).toLocaleString('en')} left`],
    firefox: ['1,048,576 characters', `Yes, ${(1_048_576 - 2500).toLocaleString('en')} left`],
    safari: ['None published', 'Yes'],
    short: ['12,272 bytes', 'Yes, 9,772 left'],
    gdocs: ['4,096 characters', 'Yes, 1,596 left'],
    telegram: ['4,096 characters', 'Yes, 1,596 left'],
    qr: ['2,953 bytes', 'Yes, 453 left'],
    link: ['2,048 characters', 'No, 452 over'],
    discord: ['2,000 characters', 'No, 500 over'],
    ntag216: ['888 bytes', 'No, 1,612 over'],
    ntag215: ['504 bytes', 'No, 1,996 over'],
    sms: ['160 characters', 'No, 2,340 over'],
    // A post counts any link as a few characters, so the link's length is its own matter: Mastodon and Bluesky publish no
    // longest link, X's t.co takes 4,096 (Paul, 2026-10-16: "Bluesky isn't 300 limit, because a URL counts as 23").
    mastodon: ['None published', 'Yes, counts as 23 of 500'],
    bluesky: ['None published', 'Yes, counts as 36 of 300'],
    x: ['4,096 characters', 'Yes, counts as 23 of 280'],
  });
  // A link past t.co's ceiling does not fit X, whatever it counts.
  expect(fitWords(roomFor('https://tinylittleoffice.com/#/v1/text/'.padEnd(5000, 'y')).find((r) => r.target.id === 'x')!)).toBe('No, 904 over');
  // A browser counts the link as it holds it: a letter past ASCII is three characters, %XX.
  const accented = 'https://tinylittleoffice.com/#/v1/text/é';
  expect(roomFor(accented).find((r) => r.target.id === 'chrome')!.used).toBe(accented.length + 5);
});

test('the table runs from the tightest place up, the places with no published limit after them, the browsers last (Paul, 2026-10-16)', () => {
  const url = 'https://tinylittleoffice.com/#/v1/text/'.padEnd(2500, 'y');
  expect(shown(roomFor(url)).map((r) => r.target.id)).toEqual([
    'sms',
    'ntag215',
    'ntag216',
    'discord',
    'link',
    'qr',
    'gdocs',
    'telegram',
    'x',
    'short',
    'mastodon',
    'bluesky',
    'firefox',
    'chrome',
    'safari',
  ]);
});
