// The link's shape: "#/v1/<app>[.<view>][/<payload>][?d][&s=&k=&o=]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash, withText } from '../src/kit/route.ts';

test('a document link is read and written the same way', () => {
  expect(LINK).toBe('#/v1/');
  expect(parseHash('#/v1/text/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text.png/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'png', owned: null, display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null, display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text/')).toEqual({ app: 'text', payload: '', version: 1, view: '', owned: null, display: false, arrived: null, sealed: false });
  expect(parseHash('#/v2/text/x').version).toBe(2);
  expect(parseHash('').app).toBeNull();
  expect(parseHash('#/').app).toBeNull();
  expect(parseHash('#/v1/Text/x').app).toBeNull();
  expect(routeHash('text')).toBe('#/v1/text');
  expect(routeHash('text', 'yABC')).toBe('#/v1/text/yABC');
  expect(routeHash('text', 'yABC', 'pdf')).toBe('#/v1/text.pdf/yABC');
  expect(parseHash(routeHash('text', 'yABC', 'pdf'))).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'pdf', owned: null, display: false, arrived: null, sealed: false });
});

test('the owner of a short link arrives with ?s=&k=&o= after the payload, and the link is written back with it', () => {
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const hash = routeHash('text', 'yABC', '', owned);
  expect(hash).toBe(`#/v1/text/yABC?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  expect(parseHash(hash)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned, display: false, arrived: null, sealed: false });
  expect(parseHash(routeHash('text', '', '', owned))).toEqual({ app: 'text', payload: '', version: 1, view: '', owned, display: false, arrived: null, sealed: false });
  // Half a query is no ownership, and the payload is still read.
  expect(parseHash('#/v1/text/yABC?s=abcdefg')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text/yABC?s=../etc&k=K&o=O').owned).toBeNull();
  expect(parseHash('#/v1/text/yABC?s=abcdefg&k=K&o=O').owned).toEqual({ id: 'abcdefg', key: 'K', o: 'O' });
});

test('the Display Link is "?d" after the payload, outside it; with an owner, and as tinier hands an owner on', () => {
  expect(routeHash('text', 'yABC', '', null, true)).toBe('#/v1/text/yABC?d');
  expect(parseHash('#/v1/text/yABC?d')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned: null, display: true, arrived: null, sealed: false });
  expect(parseHash(routeHash('text', 'yABC'))!.display).toBe(false);
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const both = routeHash('text', 'yABC', '', owned, true);
  expect(both).toBe(`#/v1/text/yABC?d&s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`);
  expect(parseHash(both)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', owned, display: true, arrived: null, sealed: false });
  // tinier adds "?s=…" to the link it held, which may already end in "?d".
  expect(parseHash(`#/v1/text/yABC?d?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}`)).toEqual({
    app: 'text',
    payload: 'yABC',
    version: 1,
    view: '',
    owned,
    display: true,
    arrived: null,
    sealed: false,
  });
});

test('arriving by a short link: "?s=<id>&x=<expires>", from tinier for everyone; the owner\'s x rides beside o', () => {
  expect(parseHash('#/v1/text/yABC?s=abcdefg&x=1791000000000').arrived).toEqual({ id: 'abcdefg', expires: 1791000000000 });
  expect(parseHash('#/v1/text/yABC?d?s=abcdefg&x=1791000000000')).toMatchObject({ display: true, owned: null, arrived: { id: 'abcdefg', expires: 1791000000000 } });
  expect(parseHash('#/v1/text/yABC?s=abcdefg&x=soon').arrived).toBeNull();
  expect(parseHash('#/v1/text/yABC?x=1791000000000').arrived).toBeNull();
  const owned = { id: 'abcdefg', key: 'K'.repeat(43), o: 'O'.repeat(43) };
  const hash = routeHash('text', 'yABC', '', owned, false, { id: 'abcdefg', expires: 1791000000000 });
  expect(hash).toBe(`#/v1/text/yABC?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}&x=1791000000000`);
  expect(parseHash(hash)).toMatchObject({ owned, arrived: { id: 'abcdefg', expires: 1791000000000 } });
  // Without an owner, the id and the expiry alone; they round-trip.
  const plain = routeHash('text', 'yABC', '', null, true, { id: 'abcdefg', expires: 1791000000000 });
  expect(plain).toBe('#/v1/text/yABC?d&s=abcdefg&x=1791000000000');
  expect(parseHash(plain)).toMatchObject({ owned: null, display: true, arrived: { id: 'abcdefg', expires: 1791000000000 } });
});

test('a sealed payload ("E…") is read as one, beside every other part of the link', () => {
  expect(parseHash('#/v1/write/EAbc_-12').sealed).toBe(true);
  expect(parseHash('#/v1/write/EAbc_-12?d')).toMatchObject({ app: 'write', payload: 'EAbc_-12', display: true, sealed: true });
  expect(parseHash('#/v1/write/yAbc').sealed).toBe(false);
  expect(parseHash(routeHash('write', 'EAbc')).sealed).toBe(true);
});

test('a payload and an owner\'s keys may hold "~" (what is written now) or "-" (what was written before)', () => {
  expect(parseHash('#/v1/text/yA~b_C').payload).toBe('yA~b_C');
  expect(parseHash('#/v1/text/yA-b_C').payload).toBe('yA-b_C');
  const owned = { id: 'abcdefg', key: 'K~'.repeat(21) + 'K', o: 'O_~'.repeat(14) + 'O' };
  expect(parseHash(routeHash('text', 'yA~b', '', owned)).owned).toEqual(owned);
  expect(parseHash(`#/v1/text/yA~b?s=abcdefg&k=${'K-'.repeat(21)}K&o=O`).owned).toEqual({ id: 'abcdefg', key: 'K-'.repeat(21) + 'K', o: 'O' });
});

test('a compare fragment and a link to compare take payloads with "~" or "-"', async () => {
  const { parseCompare, sideOf } = await import('../src/kit/compare.ts');
  const { toBase64Url, decodeDoc } = await import('../src/kit/codec.ts');
  expect(parseCompare('#/compare/write/yA~b/write/yA-b')).toEqual([
    { app: 'write', payload: 'yA~b' },
    { app: 'write', payload: 'yA-b' },
  ]);
  // A raw payload whose fourth character is 62.
  const payload = 'r' + toBase64Url(new TextEncoder().encode('>>>'));
  expect(payload).toBe('rPj4~');
  expect(decodeDoc(payload)).toBe('>>>');
  expect(sideOf(`https://tinylittleoffice.com/write/#/v1/write/${payload}`)).toEqual({ app: 'write', payload });
  expect(sideOf(`https://tinylittleoffice.com/write/#/v1/write/${payload.replace(/~/g, '-')}`)).toEqual({ app: 'write', payload: payload.replace(/~/g, '-') });
});

test('a Display Link read as text is "&text" beside "?d": read, and put in or taken out without touching the rest', () => {
  expect(parseHash('#/v1/write/yABC?d&text').text).toBe(true);
  expect(parseHash('#/v1/write/yABC?d')).not.toHaveProperty('text');
  expect(withText('#/v1/write/yABC?d', true)).toBe('#/v1/write/yABC?d&text');
  expect(withText('#/v1/write/yABC?d&text', false)).toBe('#/v1/write/yABC?d');
  expect(withText('#/v1/write/yABC?d&s=abcdefg&x=123', true)).toBe('#/v1/write/yABC?d&s=abcdefg&x=123&text');
  expect(withText('#/v1/write/yABC?d&text&s=abcdefg&x=123', false)).toBe('#/v1/write/yABC?d&s=abcdefg&x=123');
  expect(withText('#/v1/write/yABC?d?s=abcdefg', true)).toBe('#/v1/write/yABC?d&s=abcdefg&text');
  expect(withText('#/v1/write/yABC', false)).toBe('#/v1/write/yABC');
});
