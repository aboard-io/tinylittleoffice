/**
 * Preview cards: the picture a link shared with a network previews with, by the person's choice (Paul, 2026-10-11:
 * "When we explicitly share with a social network from in the app, that's when we do this"). The person's browser
 * draws the document's first page as a PNG of 1200 by 630 (src/kit/share/card.ts) and posts it here with the
 * document's title and first words; the link it shares carries the card's id in its path, `/c/<id>`, before the "#",
 * where a fetcher sees it. A card is not a link: it is kept readable, for a month, so a network can fetch it. The
 * document itself never comes here.
 *
 *   POST /card            {png, title, text, app}  -> 201 {id, exp}   (the site's own page alone, as JSON; site.ts)
 *   GET  /card/<id>.png   the picture, immutable                      (404 once gone)
 *   GET  /c/<id>          the card's app's page, its head's tags saying the card (site.ts cardPage)
 *
 * The body is JSON, the PNG in base64: the shortener's API is JSON too, one bounded read and one parser before
 * anything is looked at, and the tests post it as they post a link. The picture is read as a PNG whole, chunk by
 * chunk with its checksums, before it is kept: what the site serves as a picture is at least a picture. What is read
 * from the database is kept at the edge (`Edge`, caches.default on Cloudflare): the picture for the card's life, a
 * page for an hour, so a card is read from D1 once however many fetchers come (Paul, 2026-10-11: "cache it, this is
 * Cloudflare"). A card's id is twelve letters and digits, sixty bits, since nobody types one and a card is readable to
 * whoever has its id; a short link's seven, which people type, are the shortener's own (tinier.ts).
 */
import { bodyText, braked, type Counter } from '../tinier/brake.ts';

/** A card as a page's tags say it. */
export interface Card {
  app: string;
  title: string;
  text: string;
  /** When to forget it, ms since the epoch. */
  exp: number;
}

export interface CardStore extends Counter {
  card(id: string): Promise<Card | null>;
  cardPng(id: string): Promise<{ png: Uint8Array; exp: number } | null>;
  /** Keep a card under a new id; false if the id is taken. */
  putCard(id: string, card: Card & { png: Uint8Array }): Promise<boolean>;
}

/** A cache in front of the database: caches.default on Cloudflare, nothing in a test that does not ask. */
export interface Edge {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, res: Response): Promise<void>;
}
export const noEdge: Edge = { match: async () => undefined, put: async () => {} };

/** A card lives a month, the short link's longest life (Paul, 2026-10-11: "Keep it for a month"). */
export const CARD_TTL = 30 * 86_400_000;
export const CARD_W = 1200;
export const CARD_H = 630;
export const CARD_PNG_MAX = 400 * 1024;
export const CARD_TITLE_MAX = 120;
export const CARD_TEXT_MAX = 300;
/** A card's id: twelve of the alphabet below, about sixty bits. */
export const CARD_ID = 12;

/** 32 letters and digits that are hard to misread: no l, 1, o or 0. A short link's id is seven of them; a card's, CARD_ID. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const newId = (n = 7) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % 32]).join('');

const said = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** CRC-32 as PNG uses it (ISO 3309, the table-driven form), over some bytes. */
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * The PNG's own width and height (its IHDR), or null when the bytes are not a whole PNG: the eight bytes every PNG
 * begins with, then chunks, each within the bytes with its CRC right, IHDR first and IEND last with nothing after.
 */
function pngSize(png: Uint8Array): { w: number; h: number } | null {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 8 + 25 + 12 || sig.some((b, i) => png[i] !== b)) return null;
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  let size: { w: number; h: number } | null = null;
  while (at + 12 <= png.length) {
    const len = v.getUint32(at);
    const type = String.fromCharCode(png[at + 4], png[at + 5], png[at + 6], png[at + 7]);
    if (at + 12 + len > png.length || crc32(png.subarray(at + 4, at + 8 + len)) !== v.getUint32(at + 8 + len)) return null;
    if (!size) {
      if (type !== 'IHDR' || len !== 13) return null;
      size = { w: v.getUint32(at + 8), h: v.getUint32(at + 12) };
    }
    at += 12 + len;
    if (type === 'IEND') return at === png.length ? size : null;
  }
  return null;
}

/** What a POST says, read and held to the limits: the card, or the sentence that says what is wrong. */
async function readCard(req: Request): Promise<(Card & { png: Uint8Array }) | string> {
  // The site's own page posts a card, as JSON: another site's page never does, nor a form (a request another site's
  // page can send without asking is counted against the reader's address, not the page's: a review, 2026-10-17).
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return 'Bad request';
  const origin = req.headers.get('origin');
  const from = req.headers.get('sec-fetch-site');
  if ((origin && origin !== new URL(req.url).origin) || (from && from !== 'same-origin' && from !== 'none')) return 'Bad request';
  // The PNG's base64 and the words, with room for the JSON around them.
  const text = await bodyText(req, Math.ceil(CARD_PNG_MAX / 3) * 4 + 4 * (CARD_TITLE_MAX + CARD_TEXT_MAX) + 1024);
  if (text === null) return 'The picture is over 400 KB.';
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(text);
  } catch {
    return 'Bad request';
  }
  if (!b || typeof b !== 'object') return 'Bad request';
  const { png, title, text: words, app } = b;
  if (typeof png !== 'string' || typeof title !== 'string' || typeof words !== 'string' || typeof app !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(app)) return 'Bad request';
  if ([...title].length > CARD_TITLE_MAX) return 'The title is over 120 characters.';
  if ([...words].length > CARD_TEXT_MAX) return 'The text is over 300 characters.';
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
  } catch {
    return 'Bad request';
  }
  if (bytes.length > CARD_PNG_MAX) return 'The picture is over 400 KB.';
  const size = pngSize(bytes);
  if (!size || size.w !== CARD_W || size.h !== CARD_H) return 'A card is a PNG of 1200 by 630.';
  return { app, title: title.trim(), text: words.trim(), png: bytes, exp: 0 };
}

/** POST /card: kept for a month under a new id; over the limits, 400 with the sentence; past the day's hundred, 429. */
export async function postCard(req: Request, store: CardStore, key: string, now: number): Promise<Response> {
  const card = await readCard(req);
  if (typeof card === 'string') return said(card, 400);
  const wait = await braked(store, key, req, now);
  if (wait !== null) {
    const res = said('A hundred previews a day from one address; try tomorrow.', 429);
    res.headers.set('retry-after', String(wait));
    return res;
  }
  const exp = now + CARD_TTL;
  for (let tries = 0; tries < 5; tries++) {
    const id = newId(CARD_ID);
    if (await store.putCard(id, { ...card, exp })) return new Response(JSON.stringify({ id, exp }), { status: 201, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  return said('Could not keep the card; try again.', 503);
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * What the edge holds under the request's address, as a Response of its own (a hit's headers cannot be changed, and
 * a Worker that tried threw, 2026-10-17), or what `fill` gives, kept there too; null when it gives none.
 */
async function fromEdge(req: Request, edge: Edge, fill: () => Promise<Response | null>): Promise<Response | null> {
  const key = new Request(req.url);
  const hit = await edge.match(key);
  if (hit) return new Response(hit.body, hit);
  const res = await fill();
  if (res) await edge.put(key, res.clone());
  return res;
}

/** GET /card/<id>.png: the picture, from the edge when it is there, else from the database and put there for the card's life; the fetcher told a year. */
export async function cardPng(req: Request, id: string, store: CardStore, edge: Edge, now: number): Promise<Response> {
  const headers = { 'content-type': 'image/png', 'x-content-type-options': 'nosniff' };
  const res = await fromEdge(req, edge, async () => {
    const row = await store.cardPng(id);
    return row && row.exp >= now ? new Response(row.png.slice(), { headers: { ...headers, 'cache-control': `public, max-age=${Math.max(0, Math.floor((row.exp - now) / 1000))}` } }) : null;
  });
  if (!res) return new Response('No such card, or it has expired.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  res.headers.set('cache-control', IMMUTABLE);
  return res;
}

/** The tags a page's head carries that a card replaces: each written once by the build (index.html, scripts/seo.ts) and by the shortener's page. */
export const CARD_TAGS = [
  'og:title',
  'og:description',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
] as const;

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tag = (name: string) => new RegExp(`(<meta (?:property|name)="${name.replace(/[.:]/g, '\\$&')}" content=")[^"]*(")`, 'g');
/** How many times a page carries a tag. */
export const tagCount = (page: string, name: string) => [...page.matchAll(tag(name))].length;

/** A page with its tags saying the card: plain string substitution over the tags the build writes, so it runs under node as it does at the edge. */
export function tagged(page: string, card: Card, image: string): string {
  const values: Record<(typeof CARD_TAGS)[number], string> = {
    'og:title': card.title,
    'og:description': card.text,
    'og:image': image,
    'og:image:width': String(CARD_W),
    'og:image:height': String(CARD_H),
    'og:image:alt': card.title,
    'twitter:card': 'summary_large_image',
    'twitter:title': card.title,
    'twitter:description': card.text,
    'twitter:image': image,
  };
  for (const name of CARD_TAGS) page = page.replace(tag(name), (_, a: string, b: string) => `${a}${attr(values[name])}${b}`);
  return page;
}

/**
 * The page a link shared with a network opens, `/c/<id>` (kit/share/card.ts withCardId): the card's app's own page
 * (`pageOf(app)`), its tags saying the card, kept at the edge for an hour. The document is the hash's, which never
 * reaches here; the shell moves the address to the app's page. An unknown or expired card, or a page that does not
 * come, is sent to `home` (a 302 keeps the hash, so the document still opens there). no-transform, as the pages' own
 * header says (public/_headers): without it Cloudflare wrote its analytics beacon into the page served at /c/<id>
 * (seen live, 2026-10-15), a third party's script the policy blocks but the site never asks for.
 */
export async function cardPage(req: Request, id: string, store: CardStore, edge: Edge, now: number, image: string, pageOf: (app: string) => Promise<Response>, home: string): Promise<Response> {
  const res = await fromEdge(req, edge, async () => {
    const card = await store.card(id);
    if (!card || card.exp < now) return null;
    const page = await pageOf(card.app);
    if (page.status !== 200 || !(page.headers.get('content-type') ?? '').startsWith('text/html')) return null;
    const headers = new Headers(page.headers);
    headers.set('cache-control', 'public, max-age=3600, no-transform');
    for (const h of ['content-length', 'etag', 'last-modified']) headers.delete(h);
    return new Response(tagged(await page.text(), card, image), { status: 200, headers });
  });
  return res ?? Response.redirect(home, 302);
}
