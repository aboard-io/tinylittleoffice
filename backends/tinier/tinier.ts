/**
 * tinier: a link shortener that never sees a link. The site encrypts the long link with a key it keeps in
 * the short link's fragment (which browsers never send); this stores only the ciphertext, for as long as it
 * was told to, and hands it back. Opening a short link fetches the ciphertext, decrypts it in the browser,
 * and goes there.
 *
 * A short link cannot be changed or recalled once made: there is no update, no delete and no owner. It
 * expires on its own (Paul, 2026-10-11: "Let's just make the short link immutable for now").
 *
 *   POST   /api        {c, iv, ttl}   -> 201 {id, exp}
 *   GET    /api/<id>                  -> {c, iv, exp}   (404 once gone)
 *   GET    /<id>       the page that decrypts and redirects
 *   GET    /           what this is
 *   GET    /robots.txt every fetcher let in
 *
 * Nothing it answers is indexed: every response says `X-Robots-Tag: noindex` (the landing page says it in its
 * <meta> too). Its robots.txt allows everything, and never disallows: the link-card fetchers of X and Facebook
 * honor robots.txt and must still read a shared link's preview (Paul, 2026-10-11).
 *
 * Every other method or path answers 404, as an unknown link does. The API's only answers are 201, 200, 400,
 * 404, 429 and 503. A link is made by a page of the site alone, as JSON: a page of another site, or a form, is refused
 * before its body is read, so no request a stranger's page can send without asking is counted against the reader.
 *
 * What the server knows: ciphertext, an IV, an expiry, and that a request came. It cannot read a link. One
 * address may make a hundred links a UTC day (DAILY), counted under a keyed hash that says nothing of the address
 * (brake.ts, the site's Worker counting preview cards the same way). A preview card (cards.ts) is not a link: it
 * is a picture and a few words the person chose to make readable, kept in the same database for a month, and the
 * hourly sweep forgets it with the links.
 *
 * This file is the whole of it apart from the brake, the cards and where the rows live (a Store): d1.ts keeps them
 * in D1, worker.ts runs it on Cloudflare; the tests give it Maps, and d1.ts node's SQLite.
 */
import { bodyText, braked, type Counter } from './brake.ts';
import { newId, type CardStore } from '../cards/cards.ts';

export interface Link {
  c: string;
  iv: string;
  /** When to forget it, ms since the epoch. */
  exp: number;
}

export interface Store extends Counter, CardStore {
  get(id: string): Promise<Link | null>;
  /** Keep a link under a new id; false if the id is taken. */
  put(id: string, link: Link): Promise<boolean>;
  drop(id: string): Promise<void>;
  /** Forget every link and card past its time, and the counts of every day but `now`'s and the one before. */
  sweep(now: number): Promise<void>;
}

/**
 * The site that may call the API, and the only place a short link may lead (a local copy of the site, under `wrangler dev`,
 * names itself). The Worker's var SITE may name more than one, comma-separated, the first the site's own: each an
 * origin, or an origin and a path for a copy that is not at its host's root, as the mirror on GitHub Pages
 * ("https://tinylittleoffice.com,https://aboard-io.github.io/tinylittleoffice": docs/mirror.md). Each may call the API,
 * and a short link may lead only under one of them.
 */
export const SITE = 'https://tinylittleoffice.com';

/** The sites a SITE names, each without a trailing "/". */
export const sitesOf = (site: string): string[] =>
  site
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
/** The most ciphertext a link may hold, in base64url characters. src/kit/share/short.ts carries the same number; a test holds them together. */
export const MAX_BYTES = 16 * 1024;
/** The lifetimes on the menu, in seconds: an hour, a day, a week, a month (Paul, 2026-10-11: "Make the max expire a month"). */
export const TTLS = new Set([3600, 86400, 7 * 86400, 30 * 86400]);
const B64 = /^[A-Za-z0-9_~-]+$/;

const valid = (s: string) => /^[a-z0-9]{7}$/.test(s);

const HSTS = 'max-age=31536000; includeSubDomains';
const json = (body: unknown, site: string, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'access-control-allow-origin': site, 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'strict-transport-security': HSTS },
  });
const bad = (site: string) => json({ error: 'Bad request' }, site, 400);
const gone = (site: string) => json({ error: 'No such link, or it has expired.' }, site, 404);
const html = (page: string, status = 200) =>
  new Response(page, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // no-transform: without it Cloudflare writes its analytics beacon into the page, which the policy below then blocks (seen on the mirror's short links, 2026-10-16), as the site's /c/ pages found before.
      'cache-control': 'no-store, no-transform',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': HSTS,
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    },
  });

/** A link that is still good, or null; one past its time goes as it is asked for. */
async function read(store: Store, id: string, now: number): Promise<Link | null> {
  const link = await store.get(id);
  if (!link) return null;
  if (link.exp < now) {
    await store.drop(id);
    return null;
  }
  return link;
}

/** The body of a request, as JSON, or null when it is not sent as JSON, is not JSON, or is far too big. */
async function body(req: Request): Promise<Record<string, unknown> | null> {
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return null;
  const text = await bodyText(req, MAX_BYTES * 2);
  if (text === null) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
const cipher = (c: unknown, iv: unknown): c is string => typeof c === 'string' && typeof iv === 'string' && B64.test(c) && B64.test(iv) && c.length <= MAX_BYTES && iv.length <= 32;

/** What the shortener's robots.txt says: come in, every fetcher; the pages keep themselves out of the index by their header. */
const ROBOTS = `# Every page and answer here says "X-Robots-Tag: noindex": a short link is a person's, and no search engine's.
# Nothing is disallowed, so a site that draws a shared link's preview may still read it.
User-agent: *
Allow: /
`;

/**
 * Answer one request. `key` is the brake's secret (BRAKE_KEY). `page` is the landing page with "{{id}}" where the id
 * goes, "{{site}}" where the site does and "{{sites}}" where every site `site` names does (SITE). Every answer is marked
 * noindex.
 */
export async function handle(req: Request, store: Store, key: string, page: string, now = Date.now(), site = SITE): Promise<Response> {
  const res = await answer(req, store, key, page, now, site);
  res.headers.set('x-robots-tag', 'noindex');
  return res;
}

async function answer(req: Request, store: Store, key: string, page: string, now: number, sites: string): Promise<Response> {
  const url = new URL(req.url);
  const all = sitesOf(sites);
  const site = all[0] ?? SITE;
  page = page.replaceAll('{{sites}}', all.join(',')).replaceAll('{{site}}', site);
  // The origin the API answers: the asking page's, when it is one of the sites; else the site's own. A page of any
  // other site may read a link, never make one.
  const origins = all.map((s) => new URL(s).origin);
  const asking = req.headers.get('origin');
  const allow = asking && origins.includes(asking) ? asking : new URL(site).origin;
  const res = await api(req, url, store, key, now, allow, !asking || origins.includes(asking));
  if (res) {
    if (origins.length > 1) res.headers.set('vary', 'origin');
    return res;
  }
  if (req.method === 'GET' && url.pathname === '/robots.txt') return new Response(ROBOTS, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (req.method === 'GET' && url.pathname === '/') return html(page.replace('{{id}}', ''));
  if (req.method === 'GET' && valid(url.pathname.slice(1))) {
    const id = url.pathname.slice(1);
    const link = await read(store, id, now);
    return html(page.replace('{{id}}', link ? id : ''), link ? 200 : 404);
  }
  return html(page.replace('{{id}}', ''), 404);
}

/** The API's answers (OPTIONS, and anything under /api), each letting `site` read it; null for any other request. `fromSite`: the asking page is one of the sites, or no page asked. */
async function api(req: Request, url: URL, store: Store, key: string, now: number, site: string, fromSite: boolean): Promise<Response | null> {
  if (req.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: { 'access-control-allow-origin': site, 'access-control-allow-methods': 'POST, GET', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' },
    });

  if (req.method === 'POST' && url.pathname === '/api') {
    if (!fromSite) return bad(site);
    const b = await body(req);
    if (!b) return bad(site);
    const { c, iv, ttl } = b;
    if (!cipher(c, iv) || typeof ttl !== 'number' || !TTLS.has(ttl)) return bad(site);
    // Counted only once the request would make a link.
    const wait = await braked(store, key, req, now);
    if (wait !== null) {
      const res = json({ error: 'A hundred links a day from one address; try tomorrow.' }, site, 429);
      res.headers.set('retry-after', String(wait));
      return res;
    }
    const exp = now + ttl * 1000;
    // Seven letters from thirty-two is 34 billion ids; a clash is for form's sake.
    for (let tries = 0; tries < 5; tries++) {
      const id = newId();
      if (await store.put(id, { c, iv: iv as string, exp })) return json({ id, exp }, site, 201);
    }
    return json({ error: 'Could not make a link; try again.' }, site, 503);
  }

  // Anything else under /api is a link that is not there (Paul, 2026-10-11: "There should be a 404"): a 405
  // would advertise an API that does not exist.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const id = url.pathname.slice(5);
    const link = req.method === 'GET' && valid(id) ? await read(store, id, now) : null;
    return link ? json({ c: link.c, iv: link.iv, exp: link.exp }, site) : gone(site);
  }
  return null;
}
