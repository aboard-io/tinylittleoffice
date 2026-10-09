// The link's shape: "#/v1/<app>[.<view>][/<payload>][?d][&s=&k=&o=]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash } from '../src/kit/route.ts';

test('a document link is read and written the same way', () => {
  expect(LINK).toBe('#/v1/');
  expect(parseHash('#/v1/text/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: false });
  expect(parseHash('#/v1/text.png/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'png', owned: null, display: false });
  expect(parseHash('#/v1/text')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null, display: false });
  expect(parseHash('#/v1/text/')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null, display: false });
  expect(parseHash('#/v2/text/x').version).toBe(2);
  expect(parseHash('').app).toBeNull();
  expect(parseHash('#/').app).toBeNull();
  expect(parseHash('#/v1/Text/x').app).toBeNull();
  expect(routeHash('text')).toBe('#/v1/text');
  expect(routeHash('text', 'yABC')).toBe('#/v1/text/yABC');
  expect(routeHash('text', 'yABC', 'pdf')).toBe('#/v1/text.pdf/yABC');
  expect(parseHash(routeHash('text', 'yABC', 'pdf'))).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'pdf', owned: null, display: false });
});

test('the owner of a short link arrives with ?s=&k=&o= after the payload, and the link is written back with it', () => {
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const hash = routeHash('text', 'yABC', '', owned);
  expect(hash).toBe(`#/v1/text/yABC?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  expect(parseHash(hash)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned, display: false });
  expect(parseHash(routeHash('text', '', '', owned))).toEqual({ app: 'text', payload: '', version: 1, view: '', owned, display: false });
  // Half a query is no ownership, and the payload is still read.
  expect(parseHash('#/v1/text/yABC?s=abcdefg')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: false });
  expect(parseHash('#/v1/text/yABC?s=../etc&k=K&o=O').owned).toBeNull();
  expect(parseHash('#/v1/text/yABC?s=abcdefg&k=K&o=O').owned).toEqual({ id: 'abcdefg', key: 'K', o: 'O' });
});

test('the Display Link is "?d" after the payload, outside it; with an owner, and as tinier hands an owner on', () => {
  expect(routeHash('text', 'yABC', '', null, true)).toBe('#/v1/text/yABC?d');
  expect(parseHash('#/v1/text/yABC?d')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: true });
  expect(parseHash(routeHash('text', 'yABC'))!.display).toBe(false);
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const both = routeHash('text', 'yABC', '', owned, true);
  expect(both).toBe(`#/v1/text/yABC?d&s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  expect(parseHash(both)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned, display: true });
  // tinier adds "?s=…" to the link it held, which may already end in "?d".
  expect(parseHash(`#/v1/text/yABC?d?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned, display: true });
});
