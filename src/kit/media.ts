/**
 * Web pictures through the proxy, and the hosts whose pictures show without asking. Every picture the site
 * draws from an https address is asked of media.tinylittleoffice.com (media/ in this repository), never of
 * the picture's own site, so that site never learns who read the document: pictureSrc() is that address.
 * Whether a picture shows at once or waits for "Show pictures from the web" is kit/pictures.ts; a picture
 * from a host on TRUSTED shows at once, because the proxy fetches it and the host holds public, static,
 * licensed pictures (docs/network.md gives the reason for each).
 *
 * VITE_MEDIA_URL sets the proxy (a self-hoster's own copy of media/); set empty, pictures load directly
 * from their sites and every host waits to be asked for. Pure: no DOM, tested under node.
 */

import { origin, trustedHost } from './network.ts';

export { TRUSTED, trustedHost } from './network.ts';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
/** The proxy this site uses unless VITE_MEDIA_URL says otherwise. */
export const MEDIA_DEFAULT = origin('media');
/** The proxy's address, without a trailing slash; '' when pictures load directly. */
let base = (env?.VITE_MEDIA_URL ?? MEDIA_DEFAULT).replace(/\/+$/, '');

/** The proxy this copy of the site uses ('' for none). */
export const mediaBase = () => base;
/** For the tests: another proxy, or none. */
export function useMedia(next: string) {
  base = next.replace(/\/+$/, '');
}

const here = () => (typeof location === 'undefined' ? 'http://localhost/' : location.href);

/** Whether an address is a picture from another site (http or https, another origin). */
export function webPicture(url: string, at = here()): boolean {
  try {
    const u = new URL(url, at);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin !== new URL(at).origin;
  } catch {
    return false;
  }
}

/** A web picture's site, as a card names it. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Whether an address is already the proxy's. */
const proxied = (url: string) => !!base && url.startsWith(base + '/');

/** Whether this picture shows without asking: https, from a host on TRUSTED, and a proxy to fetch it. */
export function trusted(url: string): boolean {
  if (!base) return false;
  if (proxied(url)) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && trustedHost(u.hostname);
  } catch {
    return false;
  }
}

/**
 * The address to draw a picture from: an https picture from another site through the proxy; data:, blob:,
 * this site's own, and an address already the proxy's as they are. (An http picture is left as it is: the
 * proxy fetches https only, and the site's policy loads no http.) A picture shown as trusted carries "&t=1",
 * and the proxy then follows its redirects only to a trusted host: trusted means the same on both sides.
 */
export function pictureSrc(url: string, at = here()): string {
  if (!base || proxied(url) || !webPicture(url, at)) return url;
  if (!url.startsWith('https:')) return url;
  return `${base}/img?u=${encodeURIComponent(url)}${trusted(url) ? '&t=1' : ''}`;
}

/** The picture an address of the proxy's stands for (what pictureSrc was given); the address itself otherwise. */
export function pictureOf(src: string): string {
  if (!proxied(src)) return src;
  try {
    return new URL(src, 'http://localhost/').searchParams.get('u') ?? src;
  } catch {
    return src;
  }
}

/* ---------- exports: the pictures' bytes, inside the file ---------- */

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** A picture's bytes as a data: address, fetched through the proxy; null when it could not be had. */
export async function pictureData(url: string, get: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await get(pictureSrc(url), { referrerPolicy: 'no-referrer', credentials: 'omit' });
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!res.ok || !type.startsWith('image/')) return null;
    return `data:${type};base64,${b64(new Uint8Array(await res.arrayBuffer()))}`;
  } catch {
    return null;
  }
}

const unxml = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Markup (drawn pages, a web page) with every web picture's bytes inside it: the src or href of each <img>
 * and <image> from the web, fetched through the proxy once each, becomes a data: address. So a PDF, a
 * picture or a web page made from a document never asks a picture's site anything when it is read. A
 * picture that could not be had keeps the proxy's address.
 */
export async function embedPictures(markup: string, get: typeof fetch = fetch): Promise<string> {
  const ref = /(<(?:img|image)\b[^>]*?\s(?:src|href|xlink:href)=")([^"]*)(")/g;
  const urls = new Set<string>();
  for (const m of markup.matchAll(ref)) {
    const url = pictureOf(unxml(m[2]));
    if (webPicture(url)) urls.add(url);
  }
  if (!urls.size) return markup;
  const data = new Map<string, string>();
  await Promise.all([...urls].map(async (u) => data.set(u, (await pictureData(u, get)) ?? pictureSrc(u))));
  return markup.replace(ref, (all, head: string, src: string, tail: string) => {
    const got = data.get(pictureOf(unxml(src)));
    return got ? head + got.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + tail : all;
  });
}
