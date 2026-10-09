// Where a link fits: the costs the services charge.
import { test, expect } from 'vitest';
import { blueskyCost, roomFor, roomRows, TARGETS } from '../src/kit/limits.ts';

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
