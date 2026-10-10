// The site's side of the picture proxy: the address a picture is drawn from, the whitelist, and an export's bytes.
import { test, expect, afterEach } from 'vitest';
import { embedPictures, MEDIA_DEFAULT, pictureOf, pictureSrc, trusted, trustedHost, TRUSTED, useMedia } from '../src/kit/media.ts';

const AT = 'https://tinylittleoffice.com/write/';
const CAT = 'https://pictures.example/cat.png?size=2&x=y';

afterEach(() => useMedia(MEDIA_DEFAULT));

test('pictureSrc: every https picture through the proxy; data:, blob:, this site’s own and the proxy’s as they are', () => {
  expect(pictureSrc(CAT, AT)).toBe(`https://media.tinylittleoffice.com/img?u=${encodeURIComponent(CAT)}`);
  expect(pictureOf(pictureSrc(CAT, AT))).toBe(CAT);
  expect(pictureSrc('https://upload.wikimedia.org/a.jpg', AT)).toMatch(/^https:\/\/media\.tinylittleoffice\.com\/img\?u=https%3A%2F%2Fupload/);
  for (const same of [
    'data:image/gif;base64,R0lGOD',
    'blob:https://tinylittleoffice.com/1234',
    'https://tinylittleoffice.com/og/write.png',
    '/og/write.png',
    pictureSrc(CAT, AT),
    'http://plain.example/a.png',
  ])
    expect(pictureSrc(same, AT)).toBe(same);
});

test('the whitelist: the hosts named, and names under a "*."; nothing else', () => {
  expect(TRUSTED).toContain('upload.wikimedia.org');
  for (const h of [
    'upload.wikimedia.org',
    'commons.wikimedia.org',
    'archive.org',
    'ia800.us.archive.org',
    'images.unsplash.com',
    'images.pexels.com',
    'live.staticflickr.com',
    'raw.githubusercontent.com',
    'user-images.githubusercontent.com',
    'avatars.githubusercontent.com',
    'media.tinylittleoffice.com',
  ])
    expect(trustedHost(h), h).toBe(true);
  for (const h of ['wikimedia.org', 'evilarchive.org', 'archive.org.evil.com', 'unsplash.com', 'githubusercontent.com.evil.io', 'pictures.example', 'tinylittleoffice.com'])
    expect(trustedHost(h), h).toBe(false);
  expect(trusted('https://images.unsplash.com/photo-1')).toBe(true);
  expect(trusted('http://images.unsplash.com/photo-1')).toBe(false);
  expect(trusted(CAT)).toBe(false);
});

test('no proxy (VITE_MEDIA_URL empty): pictures load directly, and no host shows without asking', () => {
  useMedia('');
  expect(pictureSrc(CAT, AT)).toBe(CAT);
  expect(trusted('https://images.unsplash.com/photo-1')).toBe(false);
  useMedia('https://pics.self.host/');
  expect(pictureSrc(CAT, AT)).toBe(`https://pics.self.host/img?u=${encodeURIComponent(CAT)}`);
  expect(trusted(pictureSrc(CAT, AT))).toBe(true);
});

test('embedPictures: each web picture fetched once through the proxy and put inside the markup; one that fails keeps the proxy’s address', async () => {
  const asked: string[] = [];
  const get = (async (url: string) => {
    asked.push(url);
    if (url.includes('gone')) return new Response('no', { status: 404 });
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } });
  }) as typeof fetch;
  const amp = CAT.replace(/&/g, '&amp;');
  const svg = `<svg><image href="${amp}" x="0"/><image href="${amp}"/><image href="https://pictures.example/gone.png"/><image href="data:image/gif;base64,AA"/></svg><img src="${pictureSrc(CAT, AT)}" alt="">`;
  const out = await embedPictures(svg, get);
  expect(asked.sort()).toEqual([pictureSrc('https://pictures.example/gone.png', AT), pictureSrc(CAT, AT)].sort());
  expect(out.match(/data:image\/png;base64,AQID/g)).toHaveLength(3);
  expect(out).toContain(`href="${pictureSrc('https://pictures.example/gone.png', AT).replace(/&/g, '&amp;')}"`);
  expect(out).toContain('href="data:image/gif;base64,AA"');
  expect(out).not.toContain('href="https://pictures.example');
  expect(await embedPictures('<svg><rect/></svg>', get)).toBe('<svg><rect/></svg>');
});
