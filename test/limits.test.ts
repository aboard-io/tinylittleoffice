// Where a link fits: the costs the services charge.
import { test, expect } from 'vitest';
import { blueskyCost, roomFor, roomRows, shortLinkLength, TARGETS } from '../src/kit/limits.ts';

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
  const rows = roomRows(rooms, 'en-US');
  expect(rows.find((r) => r.name === 'Text message')!.over).toBe(true);
  expect(rows.find((r) => r.name === 'Mastodon')!.used).toBe('23 (any length)');
  expect(rows.find((r) => r.name === 'Any browser')!.left).toBe((2048 - url.length).toLocaleString('en-US'));
});

test('the shortener is one of the rooms, and a short link has a known length of its own', () => {
  const url = 'https://tinylittleoffice.com/#/v1/text/' + 'y'.repeat(200);
  const short = roomFor(url).find((r) => r.target.id === 'short')!;
  expect(short.target.max).toBe(16 * 1024);
  expect(short.used).toBe(Math.ceil(((url.length + 16) * 4) / 3));
  expect(short.left).toBeGreaterThan(15_000);
  expect(roomRows([short], 'en-US')[0].name).toBe('Short link');
  // The service's address, seven letters, "#" and a 43-character key; the owner's adds ".<o>".
  expect(shortLinkLength()).toBe('https://tinier.tinylittleoffice.com/'.length + 7 + 1 + 43);
  expect(shortLinkLength(true)).toBe(shortLinkLength() + 44);
});
