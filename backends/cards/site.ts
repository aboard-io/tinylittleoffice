/**
 * The site's Worker, as a function of a request: the built site is static assets (dist/), and this answers only what
 * a static file cannot. wrangler.jsonc runs it first for the preview cards' paths alone (`run_worker_first`: "/c/*",
 * "/card" and "/card/*"); everything else, the pages among them, is the assets alone, served without counting (since
 * 2026-10-15, when the Worker in front of every page passed the free plan's requests a day and the pages answered 429).
 *
 *   POST /card            a preview card kept for a month (backends/cards/cards.ts)
 *   GET  /card/<id>.png   its picture
 *   GET  /c/<id>          the page a link shared with a network opens (kit/share/card.ts withCardId): the card's app's
 *                         page with its tags saying the card; the document is the hash's, and the shell moves the
 *                         address to the app's page. An unknown or expired card goes to "/", where the hash still opens it
 *   GET  /, /<app>/       with ?c=<id>, the same tags on the page, where the Worker is run for the pages (it is not, in
 *                         production; the links made before 2026-10-15 open as built, the shell reading the hash)
 *
 * No logic of its own beyond the routing: the cards are backends/cards/cards.ts, the brake backends/tinier/brake.ts, the rows
 * backends/tinier/d1.ts, so the tests run all of it under node with a store in Maps (test/cards.test.ts).
 */
import { cardId, cardPage, cardPng, postCard, withCard, type CardStore, type Edge } from './cards.ts';

export interface Site {
  /** The built files (the ASSETS binding). */
  assets: { fetch(req: Request): Promise<Response> };
  store: CardStore;
  /** The brake's secret (the site Worker's own BRAKE_KEY). */
  key: string;
  edge: Edge;
  now: number;
}

const none = () => new Response('No such card, or it has expired.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export async function handleSite(req: Request, { assets, store, key, edge, now }: Site): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === '/card') return req.method === 'POST' ? postCard(req, store, key, now) : none();
  if (url.pathname.startsWith('/card/')) {
    const id = /^\/card\/([a-z0-9]{7})\.png$/.exec(url.pathname)?.[1];
    return id && req.method === 'GET' ? cardPng(req, id, store, edge, now) : none();
  }
  const shared = /^\/c\/([a-z0-9]{7})$/.exec(url.pathname)?.[1];
  if (shared && req.method === 'GET')
    return cardPage(req, shared, store, edge, now, `${url.origin}/card/${shared}.png`, (app) => assets.fetch(new Request(`${url.origin}/${app}/`, req)), `${url.origin}/`);
  const card = req.method === 'GET' ? cardId(url.searchParams.get('c')) : null;
  return card ? withCard(req, card, store, edge, now, `${url.origin}/card/${card}.png`, () => assets.fetch(req)) : assets.fetch(req);
}
