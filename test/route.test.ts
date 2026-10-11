// The link's shape: "#/v1/<app>[.<view>][/<payload>][?d][&s=&x=]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash } from '../src/kit/route.ts';

test('a document link is read and written the same way', () => {
  expect(LINK).toBe('#/v1/');
  expect(parseHash('#/v1/text/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text.png/yABC')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'png', display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text')).toEqual({ app: 'text', payload: '', version: 1, view: '', display: false, arrived: null, sealed: false });
  expect(parseHash('#/v1/text/')).toEqual({ app: 'text', payload: '', version: 1, view: '', display: false, arrived: null, sealed: false });
  expect(parseHash('#/v2/text/x').version).toBe(2);
  expect(parseHash('').app).toBeNull();
  expect(parseHash('#/').app).toBeNull();
  expect(parseHash('#/v1/Text/x').app).toBeNull();
  expect(routeHash('text')).toBe('#/v1/text');
  expect(routeHash('text', 'yABC')).toBe('#/v1/text/yABC');
  expect(routeHash('text', 'yABC', 'pdf')).toBe('#/v1/text.pdf/yABC');
  expect(parseHash(routeHash('text', 'yABC', 'pdf'))).toEqual({ app: 'text', payload: 'yABC', version: 1, view: 'pdf', display: false, arrived: null, sealed: false });
});

test('the Display Link is "?d" after the payload, outside it; tinier hands a visitor on after it', () => {
  expect(routeHash('text', 'yABC', '', true)).toBe('#/v1/text/yABC?d');
  expect(parseHash('#/v1/text/yABC?d')).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', display: true, arrived: null, sealed: false });
  expect(parseHash(routeHash('text', 'yABC'))!.display).toBe(false);
  // tinier adds "?s=…" to the link it held, which may already end in "?d".
  expect(parseHash('#/v1/text/yABC?d?s=abcdefg&x=1791000000000')).toEqual({
    app: 'text',
    payload: 'yABC',
    version: 1,
    view: '',
    display: true,
    arrived: { id: 'abcdefg', expires: 1791000000000 },
    sealed: false,
  });
});

test('arriving by a short link: "?s=<id>&x=<expires>", from tinier for everyone, read and written; k and o are neither', () => {
  expect(parseHash('#/v1/text/yABC?s=abcdefg&x=1791000000000').arrived).toEqual({ id: 'abcdefg', expires: 1791000000000 });
  expect(parseHash('#/v1/text/yABC?s=abcdefg&x=soon').arrived).toBeNull();
  expect(parseHash('#/v1/text/yABC?x=1791000000000').arrived).toBeNull();
  expect(parseHash('#/v1/text/yABC?s=../etc&x=1').arrived).toBeNull();
  const arrived = { id: 'abcdefg', expires: 1791000000000 };
  expect(routeHash('text', 'yABC', '', false, arrived)).toBe('#/v1/text/yABC?s=abcdefg&x=1791000000000');
  const both = routeHash('text', 'yABC', '', true, arrived);
  expect(both).toBe('#/v1/text/yABC?d&s=abcdefg&x=1791000000000');
  expect(parseHash(both)).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', display: true, arrived, sealed: false });
  // An owner's query from the living link of before is not read: no key, no o, nothing but what it always was.
  const old = parseHash(`#/v1/text/yABC?s=abcdefg&k=${'K'.repeat(43)}&o=${'O'.repeat(43)}&x=1791000000000`);
  expect(old).toEqual({ app: 'text', payload: 'yABC', version: 1, view: '', display: false, arrived, sealed: false });
  expect(Object.keys(old)).not.toContain('owned');
  expect(routeHash('text', 'yABC', '', false, arrived)).not.toMatch(/[?&][ko]=/);
});

test('a sealed payload ("E…") is read as one, beside every other part of the link', () => {
  expect(parseHash('#/v1/write/EAbc_-12').sealed).toBe(true);
  expect(parseHash('#/v1/write/EAbc_-12?d')).toMatchObject({ app: 'write', payload: 'EAbc_-12', display: true, sealed: true });
  expect(parseHash('#/v1/write/yAbc').sealed).toBe(false);
  expect(parseHash(routeHash('write', 'EAbc')).sealed).toBe(true);
});

test('a payload may hold "~" (what is written now) or "-" (what was written before)', () => {
  expect(parseHash('#/v1/text/yA~b_C').payload).toBe('yA~b_C');
  expect(parseHash('#/v1/text/yA-b_C').payload).toBe('yA-b_C');
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
