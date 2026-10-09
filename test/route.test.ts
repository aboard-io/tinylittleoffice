// The link's shape: "#/v1/<app>[.<view>][/<payload>]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash } from '../src/kit/route.ts';

test('a document link is read and written the same way', () => {
  expect(LINK).toBe('#/v1/');
  expect(parseHash('#/v1/text/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null });
  expect(parseHash('#/v1/text.png/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'png', owned: null });
  expect(parseHash('#/v1/text')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null });
  expect(parseHash('#/v1/text/')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null });
  expect(parseHash('#/v2/text/x').version).toBe(2);
  expect(parseHash('').app).toBeNull();
  expect(parseHash('#/').app).toBeNull();
  expect(parseHash('#/v1/Text/x').app).toBeNull();
  expect(routeHash('text')).toBe('#/v1/text');
  expect(routeHash('text', 'yABC')).toBe('#/v1/text/yABC');
  expect(routeHash('text', 'yABC', 'pdf')).toBe('#/v1/text.pdf/yABC');
  expect(parseHash(routeHash('text', 'yABC', 'pdf'))).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'pdf', owned: null });
});

test('the owner of a short link arrives with ?s=&k=&o= after the payload, and the link is written back with it', () => {
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const hash = routeHash('text', 'yABC', '', owned);
  expect(hash).toBe(`#/v1/text/yABC?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  expect(parseHash(hash)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned });
  expect(parseHash(routeHash('text', '', '', owned))).toEqual({ app: 'text', payload: '', version: 1, view: '', owned });
  // Half a query is no ownership, and the payload is still read.
  expect(parseHash('#/v1/text/yABC?s=abcdefg')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null });
  expect(parseHash('#/v1/text/yABC?s=../etc&k=K&o=O').owned).toBeNull();
  expect(parseHash('#/v1/text/yABC?s=abcdefg&k=K&o=O').owned).toEqual({ id: 'abcdefg', key: 'K', o: 'O' });
});
