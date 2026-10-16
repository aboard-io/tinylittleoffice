// The link's shape: "#/v1/<app>[.<view>][/<payload>][?d][&s=&x=]".
import { test, expect } from 'vitest';
import { LINK, parseHash, routeHash, siteOf, withText } from '../src/kit/core/route.ts';

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
  // Other keys in the query (k, o) are not read: nothing but what it always was.
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
  const { parseCompare, sideOf } = await import('../src/kit/ui/compare.ts');
  const { toBase64Url, decodeDoc } = await import('../src/kit/core/codec.ts');
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

test('the language rides in the link as "lang", beside every other parameter, and is absent when none was chosen', async () => {
  const { withLang } = await import('../src/kit/core/route.ts');
  expect(routeHash('write', 'yABC', '', false, null, 'ht')).toBe('#/v1/write/yABC?lang=ht');
  expect(parseHash('#/v1/write/yABC?lang=ht')).toEqual({ app: 'write', payload: 'yABC', version: 1, view: '', display: false, arrived: null, sealed: false, lang: 'ht' });
  expect(parseHash(routeHash('write', 'yABC'))).not.toHaveProperty('lang');
  expect(routeHash('write', 'yABC', '', false, null, null)).toBe('#/v1/write/yABC');
  // Beside the Display Link and the short link's expiry, each round-trips.
  const all = routeHash('write', 'yABC', '', true, { id: 'abcdefg', expires: 1791000000000 }, 'pt-br');
  expect(all).toBe('#/v1/write/yABC?d&s=abcdefg&x=1791000000000&lang=pt-br');
  expect(parseHash(all)).toMatchObject({ display: true, arrived: { id: 'abcdefg', expires: 1791000000000 }, lang: 'pt-br' });
  expect(parseHash('#/v1/deck/yABC?show&lang=ar')).toMatchObject({ show: true, lang: 'ar' });
  expect(parseHash(routeHash('write', 'yABC', 'embed', false, null, 'ht'))).toMatchObject({ view: 'embed', lang: 'ht' });
  // The home page carries it too; a code that is no language tag is not read.
  expect(parseHash('#/?lang=ht')).toMatchObject({ app: null, lang: 'ht' });
  expect(parseHash('#/?lang=<b>')).not.toHaveProperty('lang');
  // Any address: the language put in, changed, or taken out, the rest as it was.
  expect(withLang('#/', 'ht')).toBe('#/?lang=ht');
  expect(withLang('', 'ht')).toBe('#/?lang=ht');
  expect(withLang('', null)).toBe('');
  expect(withLang('#/?lang=ht', null)).toBe('#/');
  expect(withLang('#/v1/write/yABC?d&lang=ht', 'fr')).toBe('#/v1/write/yABC?d&lang=fr');
  expect(withLang('#/v1/write/yABC?lang=ht&d', null)).toBe('#/v1/write/yABC?d');
  expect(withLang('#/v1/write/yABC', 'ht')).toBe('#/v1/write/yABC?lang=ht');
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

test('a long payload is written with a "+" every 300 characters, for iMessage, and read without them; a link from before reads the same', () => {
  const payload = 'y' + 'AbC9'.repeat(200);
  const hash = routeHash('write', payload, '', true);
  expect(hash).toBe(`#/v1/write/${payload.slice(0, 300)}+${payload.slice(300, 600)}+${payload.slice(600)}?d`);
  expect(parseHash(hash)).toEqual({ app: 'write', payload, version: 1, view: '', display: true, arrived: null, sealed: false });
  expect(parseHash(`#/v1/write/${payload}?d`)).toEqual(parseHash(hash));
  // Written again, a link keeps one break in each place.
  expect(routeHash('write', parseHash(hash).payload, '', true)).toBe(hash);
  // A sealed payload is broken and read the same way.
  const sealed = 'E' + 'x'.repeat(400);
  expect(parseHash(routeHash('write', sealed))).toMatchObject({ payload: sealed, sealed: true });
  expect(routeHash('write', 'yABC')).toBe('#/v1/write/yABC');
});

// The document the bug was found with (Patrick Weaver, #2; Paul, 2026-10-14): the alphabet over and over, whose link
// ran 495 letters and digits without a "~" or a "_".
test('the alphabet document’s link runs no more than 300 letters and digits, and reads back whole', async () => {
  const { encodeDoc, decodeDoc } = await import('../src/kit/core/codec.ts');
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const doc = `---\ntitle: ${alphabet}\n---\n${alphabet.repeat(2000)}\n`;
  const hash = routeHash('write', encodeDoc(doc));
  expect(hash.length).toBeGreaterThan(600);
  const runs = hash.slice('#/v1/write/'.length).split('+');
  expect(Math.max(...runs.map((p) => p.length))).toBeLessThanOrEqual(300);
  expect(hash.endsWith('+')).toBe(false);
  expect(decodeDoc(parseHash(hash).payload)).toBe(doc);
});

test('the site is found from any of its addresses, at a host’s root or under a path (the mirror on GitHub Pages: docs/mirror.md)', () => {
  const isApp = (id: string) => ['write', 'outline', 'sheet'].includes(id);
  const hash = routeHash('outline', 'yABC');
  for (const site of ['https://tinylittleoffice.com/', 'https://aboard-io.github.io/tinylittleoffice/', 'http://localhost:4173/tinylittleoffice/']) {
    expect(siteOf(site, isApp), site).toBe(site);
    expect(siteOf(`${site}${hash}`, isApp), site).toBe(site);
    expect(siteOf(`${site}outline/${hash}`, isApp), site).toBe(site);
    expect(siteOf(`${site}outline/index.html${hash}`, isApp), site).toBe(site);
    expect(siteOf(`${site}embed/${hash}`, isApp), site).toBe(site);
    expect(siteOf(`${site}write/?lang=fr${hash}`, isApp), site).toBe(site);
    // A document's link made on one copy opens on another by its fragment alone: the site, then "<app>/" and the hash.
    expect(`${siteOf(`${site}outline/${hash}`, isApp)}outline/${hash}`).toBe(`${site}outline/${hash}`);
  }
  // A folder that is no app's is the site’s own: the mirror’s "/tinylittleoffice/" is never taken for an app page.
  expect(siteOf('https://aboard-io.github.io/tinylittleoffice/', isApp)).toBe('https://aboard-io.github.io/tinylittleoffice/');
  expect(siteOf('https://aboard-io.github.io/tinylittleoffice/network.html', isApp)).toBe('https://aboard-io.github.io/tinylittleoffice/');
});
