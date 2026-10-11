// Where a link goes: here (it opens), elsewhere (asked first), or nowhere (refused). And the pictures a page
// draws from another site: a card until asked for, a grey box in a preview.
import { describe, expect, test, beforeEach } from 'vitest';
import { leaving, where } from '../src/kit/link-guard.ts';
import { authored, BLANK, forgetPictures, gateSvg, mayShow, setPictureDoc, showPictures, webPicture } from '../src/kit/pictures.ts';
import { pictureSrc } from '../src/kit/media.ts';

const BASE = 'https://tinylittleoffice.com/write/#/v1/write/abc';

describe('leaving()', () => {
  test('a link on this site stays: the same origin, a relative address, an app route', () => {
    expect(leaving('https://tinylittleoffice.com/#/v1/sheet/xyz', BASE)).toBeNull();
    expect(leaving('/text/', BASE)).toBeNull();
    expect(leaving('#/v1/deck', BASE)).toBeNull();
    expect(leaving('../', BASE)).toBeNull();
  });
  test('a file this page made is its own', () => {
    expect(leaving('blob:https://tinylittleoffice.com/1234-5678', BASE)).toBeNull();
    expect(leaving('blob:https://elsewhere.example/1234', BASE)).toBe('refused');
  });
  test('another site, an email, a phone number are asked about', () => {
    expect((leaving('https://example.com/a?b=1', BASE) as URL).hostname).toBe('example.com');
    expect((leaving('http://tinylittleoffice.com.evil.example/', BASE) as URL).hostname).toBe('tinylittleoffice.com.evil.example');
    expect((leaving('mailto:someone@example.com', BASE) as URL).protocol).toBe('mailto:');
    expect((leaving('tel:+15551234567', BASE) as URL).protocol).toBe('tel:');
    // A look-alike letter is shown as the browser reaches it.
    expect((leaving('https://exаmple.com/', BASE) as URL).hostname).toBe('xn--exmple-4nf.com');
  });
  test('anything else never opens', () => {
    expect(leaving('javascript:alert(1)', BASE)).toBe('refused');
    expect(leaving('JavaScript:alert(1)', BASE)).toBe('refused');
    expect(leaving('data:text/html,<b>hi</b>', BASE)).toBe('refused');
    expect(leaving('file:///etc/passwd', BASE)).toBe('refused');
    expect(leaving('http://[bad', BASE)).toBe('refused');
  });
});

describe('where()', () => {
  test('a mailto: or tel: that hides bidi or invisible characters in its name is refused, never drawn', () => {
    // Drawn, this read 'nhcr.info@speak-mail.ru' in WebKit, in Arabic (the review of 2026-10-11).
    expect(where(new URL('mailto:%E2%80%AEur.liam-kaeps@ofni.rchnu'))).toBeNull();
    const tel = leaving('tel:\u2066+15551234567\u2069', BASE) as URL;
    expect(tel.protocol).toBe('tel:');
    expect(where(tel)).toBeNull();
    for (const c of ['\u061c', '\u200b', '\u200f', '\u202a', '\u2060', '\u2064', '\u2068', '\ufeff'])
      expect(where(new URL(`mailto:a${encodeURIComponent(c)}b@example.com`)), c.codePointAt(0)!.toString(16)).toBeNull();
  });
  test('a plain one is named by its mailbox or number; a web address by its host, its hidden characters spelled out', () => {
    expect(where(new URL('mailto:hello@example.com'))?.name).toBe('hello@example.com');
    expect(where(new URL('tel:+15551234567'))?.name).toBe('+15551234567');
    const web = new URL('https://example.com/a\u202eb');
    expect(where(web)?.name).toBe('example.com');
    expect(web.href).toBe('https://example.com/a%E2%80%AEb');
  });
});

describe('pictures from the web', () => {
  beforeEach(() => forgetPictures());
  test('only another site’s http(s) address is a web picture', () => {
    const base = 'https://tinylittleoffice.com/';
    expect(webPicture('https://example.com/a.png', base)).toBe(true);
    expect(webPicture('http://example.com/a.png', base)).toBe(true);
    expect(webPicture('https://tinylittleoffice.com/og.png', base)).toBe(false);
    expect(webPicture('data:image/png;base64,AAAA', base)).toBe(false);
    expect(webPicture('blob:https://tinylittleoffice.com/1', base)).toBe(false);
  });
  const page =
    '<rect width="10" height="10"/><image href="https://example.com/a.png?x=1&amp;y=2" x="40" y="50" width="400" height="200" preserveAspectRatio="xMidYMid meet"/><image href="data:image/png;base64,AAAA" width="10" height="10"/>';
  // Shown, it is drawn from the picture proxy, never from its own site (kit/media.ts), and fetched only as it nears the
  // screen: the proxy's address waits in data-src behind a blank pixel until then (watchPictures).
  const shownPage = page.replace('<image href="https://example.com/a.png?x=1&amp;y=2"', `<image data-src="${pictureSrc('https://example.com/a.png?x=1&y=2')}" href="${BLANK}"`);
  test('a drawn page shows a web picture as its card, in its box; a data: picture as it is', () => {
    const out = gateSvg(page);
    expect(out).not.toContain('https://example.com');
    expect(out).toContain('data-webpic');
    expect(out).toContain('example.com');
    expect(out).toContain('x="40" y="50" width="400" height="200"');
    expect(out).toContain('Show pictures from the web');
    expect(out).toContain('<image href="data:image/png;base64,AAAA"');
  });
  test('a preview never fetches one, even once shown: a grey box', () => {
    showPictures();
    const quiet = gateSvg(page, true);
    expect(quiet).not.toContain('https://example.com');
    expect(quiet).not.toContain('data-webpic');
    expect(quiet).toContain('fill="#e4e4e7"');
  });
  test('shown for the document asked about, for the visit; another document asks again', () => {
    setPictureDoc('#/v1/write/one');
    expect(mayShow('https://example.com/a.png')).toBe(false);
    showPictures();
    expect(gateSvg(page)).toBe(shownPage);
    setPictureDoc('#/v1/write/two');
    expect(mayShow('https://example.com/a.png')).toBe(false);
    setPictureDoc('#/v1/write/one');
    expect(mayShow('https://example.com/a.png')).toBe(true);
  });
  test('a picture put in this visit is the author’s own', () => {
    authored('https://example.com/a.png?x=1&y=2');
    expect(gateSvg(page)).toBe(shownPage);
    expect(mayShow('https://example.com/other.png')).toBe(false);
  });
});
