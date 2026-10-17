/**
 * Preview cards: the picture a link shared with a network previews with, by the person's choice (Paul, 2026-10-11:
 * "When we explicitly share with a social network from in the app, that's when we do this"). The person's browser
 * draws the document's first page as a PNG of 1200 by 630 (src/kit/share/card.ts) and posts it here with the
 * document's title and first words; the link it shares carries the card's id as `?c=<id>`, before the "#", where a
 * fetcher sees it. A card is not a link: it is kept readable, for a month, so a network can fetch it. The document
 * itself never comes here.
 *
 *   POST /card            {png, title, text, app}  -> 201 {id, exp}   (the site's Worker, backends/cards/site.ts)
 *   GET  /card/<id>.png   the picture, immutable                      (404 once gone)
 *   GET  <a page>?c=<id>  the page, its head's tags saying the card    (the site's app pages and /, the shortener's landing page)
 *
 * The body is JSON, the PNG in base64: the shortener's API is JSON too, one parser and one size check before it is
 * read, and the tests post it as they post a link. One module for both Workers: the site's (backends/cards/site.ts) and the
 * shortener's (tinier.ts), whose landing page previews the same way. What either reads from the database it keeps at
 * the edge (`Edge`, caches.default on Cloudflare): the picture for the card's life, a page for an hour, so a card is
 * read from D1 once however many fetchers come (Paul, 2026-10-11: "cache it, this is Cloudflare").
 */
import { braked, type Counter } from '../tinier/brake.ts';

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

/** 32 letters and digits that are hard to misread: no l, 1, o or 0. A short link's id has the same shape. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % 32]).join('');
/** A card's id from `?c=`, or null when it is not one. */
export const cardId = (s: string | null | undefined): string | null => (s && /^[a-z0-9]{7}$/.test(s) ? s : null);

const said = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** The PNG's own width and height (its IHDR), or null when the bytes are not a PNG. */
function pngSize(png: Uint8Array): { w: number; h: number } | null {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.length < 24 || sig.some((b, i) => png[i] !== b)) return null;
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

/** What a POST says, read and held to the limits: the card, or the sentence that says what is wrong. */
async function readCard(req: Request): Promise<(Card & { png: Uint8Array }) | string> {
  const text = await req.text();
  // The PNG's base64 and the words, with room for the JSON around them.
  if (text.length > Math.ceil(CARD_PNG_MAX / 3) * 4 + 4 * (CARD_TITLE_MAX + CARD_TEXT_MAX) + 1024) return 'The picture is over 400 KB.';
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
    const id = newId();
    if (await store.putCard(id, { ...card, exp })) return new Response(JSON.stringify({ id, exp }), { status: 201, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
  return said('Could not keep the card; try again.', 503);
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

/** GET /card/<id>.png: the picture, from the edge when it is there, else from the database and put there for the card's life. */
export async function cardPng(req: Request, id: string, store: CardStore, edge: Edge, now: number): Promise<Response> {
  const key = new Request(req.url);
  const hit = await edge.match(key);
  if (hit) {
    const res = new Response(hit.body, hit);
    res.headers.set('cache-control', IMMUTABLE);
    return res;
  }
  const row = await store.cardPng(id);
  if (!row || row.exp < now) return new Response('No such card, or it has expired.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  const headers = { 'content-type': 'image/png', 'x-content-type-options': 'nosniff' };
  await edge.put(key, new Response(row.png.slice(), { headers: { ...headers, 'cache-control': `public, max-age=${Math.max(0, Math.floor((row.exp - now) / 1000))}` } }));
  return new Response(row.png.slice(), { headers: { ...headers, 'cache-control': IMMUTABLE } });
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
 * A page asked for with `?c=<id>`: from the edge when it is there; else the page `page()` gives, its tags saying the
 * card, kept at the edge for an hour. An unknown or expired id is the page unchanged.
 */
export async function withCard(req: Request, id: string, store: CardStore, edge: Edge, now: number, image: string, page: () => Promise<Response>): Promise<Response> {
  const key = new Request(req.url);
  const hit = await edge.match(key);
  if (hit) return hit;
  const card = await store.card(id);
  if (!card || card.exp < now) return page();
  const res = await page();
  if (res.status !== 200 || !(res.headers.get('content-type') ?? '').startsWith('text/html')) return res;
  return taggedPage(key, res, card, image, edge);
}

/**
 * The page a link shared with a network opens, `/c/<id>` (kit/share/card.ts withCardId): the card's app's own page
 * (`pageOf(app)`), its tags saying the card, kept at the edge for an hour. The document is the hash's, which never
 * reaches here; the shell moves the address to the app's page. An unknown or expired card, or a page that does not
 * come, is sent to `home` (a 302 keeps the hash, so the document still opens there).
 */
export async function cardPage(req: Request, id: string, store: CardStore, edge: Edge, now: number, image: string, pageOf: (app: string) => Promise<Response>, home: string): Promise<Response> {
  const key = new Request(req.url);
  const hit = await edge.match(key);
  if (hit) return hit;
  const card = await store.card(id);
  if (!card || card.exp < now) return Response.redirect(home, 302);
  const res = await pageOf(card.app);
  if (res.status !== 200 || !(res.headers.get('content-type') ?? '').startsWith('text/html')) return Response.redirect(home, 302);
  return taggedPage(key, res, card, image, edge);
}

/**
 * A page's HTML with the card's tags, kept at the edge under `key` for an hour. no-transform, as the pages' own header
 * says (public/_headers): without it Cloudflare wrote its analytics beacon into the page served at /c/<id> (seen live,
 * 2026-10-15), a third party's script the policy blocks but the site never asks for.
 */
async function taggedPage(key: Request, res: Response, card: Card, image: string, edge: Edge): Promise<Response> {
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'public, max-age=3600, no-transform');
  for (const h of ['content-length', 'etag', 'last-modified']) headers.delete(h);
  const out = new Response(tagged(await res.text(), card, image), { status: 200, headers });
  await edge.put(key, out.clone());
  return out;
}
