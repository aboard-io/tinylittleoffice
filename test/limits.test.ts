// Where a link fits: the costs the services charge, and the one line the Share dialog says it in.
import { test, expect } from 'vitest';
import { blueskyCost, fitLine, roomFor, TARGETS } from '../src/kit/limits.ts';
import { SHORT_LINK_MAX, SHORT_MAX, sealShortAt, shortCost } from '../src/kit/short.ts';

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
  expect(fitLine(at(2500))).toBe('This link: 2,500 characters, too long for some browsers');
  expect(fitLine(at(3500))).toBe('This link: 3,500 characters, too long for a QR code');
  expect(fitLine(at(5000))).toBe('This link: 5,000 characters, too long for a Telegram message');
  // What the shortener holds is the ciphertext, a third longer than the link: 12,273 characters is past it.
  expect(SHORT_LINK_MAX).toBe(12_272);
  expect(fitLine(at(12_272))).toMatch(/too long for a Telegram message$/);
  expect(fitLine(at(12_273))).toBe('This link: 12,273 characters, too long for a short link');
});
