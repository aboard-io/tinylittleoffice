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
 *
 * Every other method or path answers 404, as an unknown link does. The API's only answers are 201, 200, 400,
 * 404, 429 and 503.
 *
 * What the server knows: ciphertext, an IV, an expiry, and that a request came. It cannot read a link. One
 * address may make a hundred links a UTC day (DAILY): the count is kept under base64url(sha256(key ‖ day ‖
 * address)), where the key is a secret of the deployment (BRAKE_KEY), so the row says nothing of the address
 * to anyone without the key, and with it only that the address made a link that day. The sweep forgets the
 * counts of every day but today and yesterday.
 *
 * This file is the whole of it apart from where the rows live (a Store): d1.ts keeps them in D1, worker.ts runs
 * it on Cloudflare; the tests give it Maps, and d1.ts node's SQLite.
 */

export interface Link {
  c: string;
  iv: string;
  /** When to forget it, ms since the epoch. */
  exp: number;
}

export interface Store {
  get(id: string): Promise<Link | null>;
  /** Keep a link under a new id; false if the id is taken. */
  put(id: string, link: Link): Promise<boolean>;
  drop(id: string): Promise<void>;
  /** One more link counted under `h` on `day`; the count now, this one included. */
  count(h: string, day: number): Promise<number>;
  /** Forget every link past its time, and the counts of every day but `now`'s and the one before. */
  sweep(now: number): Promise<void>;
}

/** The brake's secret, as the deployment gives it; without one the Worker serves nothing, and says why. */
export function brakeKey(key: string | undefined): string {
  if (!key) throw new Error('tinier: BRAKE_KEY is not set. Run `npx wrangler secret put BRAKE_KEY -c tinier/wrangler.jsonc`, or put BRAKE_KEY=… in tinier/.dev.vars for `npm run tinier:dev`.');
  return key;
}

/** The most links one address may make in a UTC day. */
export const DAILY = 100;
const DAY_MS = 86_400_000;
/** The UTC day number of a time: days since 1970-01-01. */
export const dayOf = (now: number) => Math.floor(now / DAY_MS);
/** What an address is counted under on a day: base64url(sha256(key ‖ day ‖ address)), which says nothing without the key. */
export async function brakeHash(key: string, day: number, address: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}\n${day}\n${address}`)));
}

/** The site that may call the API, and the only place a short link may lead (a local copy of the site, under `wrangler dev`, names itself). */
export const SITE = 'https://tinylittleoffice.com';
/** The most ciphertext a link may hold, in base64url characters. src/kit/short.ts carries the same number; a test holds them together. */
export const MAX_BYTES = 16 * 1024;
/** The lifetimes on the menu, in seconds: an hour, a day, a week, a month (Paul, 2026-10-11: "Make the max expire a month"). */
export const TTLS = new Set([3600, 86400, 7 * 86400, 30 * 86400]);
/** 32 letters and digits that are hard to misread: no l, 1, o or 0. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const B64 = /^[A-Za-z0-9_~-]+$/;

export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % 32]).join('');
const valid = (s: string) => /^[a-z0-9]{7}$/.test(s);

const json = (body: unknown, site: string, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'access-control-allow-origin': site, 'content-type': 'application/json', 'cache-control': 'no-store' } });
const bad = (site: string) => json({ error: 'Bad request' }, site, 400);
const gone = (site: string) => json({ error: 'No such link, or it has expired.' }, site, 404);
const html = (page: string, status = 200) =>
  new Response(page, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });

// base64url as the site writes it (src/kit/codec.ts): "~" for 62, never "-", where a pasted link would break a line.
const b64 = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '~')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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

/** The body of a request, as JSON, or null when it is not JSON or is far too big. */
async function body(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > MAX_BYTES * 2) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
const cipher = (c: unknown, iv: unknown): c is string => typeof c === 'string' && typeof iv === 'string' && B64.test(c) && B64.test(iv) && c.length <= MAX_BYTES && iv.length <= 32;

/** Answer one request. `key` is the brake's secret (BRAKE_KEY). `page` is the landing page with "{{id}}" where the id goes and "{{site}}" where the site does. */
export async function handle(req: Request, store: Store, key: string, page: string, now = Date.now(), site = SITE): Promise<Response> {
  const url = new URL(req.url);
  page = page.replaceAll('{{site}}', site);
  if (req.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: { 'access-control-allow-origin': site, 'access-control-allow-methods': 'POST, GET', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' },
    });

  if (req.method === 'POST' && url.pathname === '/api') {
    const b = await body(req);
    if (!b) return bad(site);
    const { c, iv, ttl } = b;
    if (!cipher(c, iv) || typeof ttl !== 'number' || !TTLS.has(ttl)) return bad(site);
    // Counted only once the request would make a link; one statement, so two at once cannot both be the hundredth.
    const day = dayOf(now);
    if ((await store.count(await brakeHash(key, day, req.headers.get('cf-connecting-ip') ?? ''), day)) > DAILY) {
      const res = json({ error: 'A hundred links a day from one address; try tomorrow.' }, site, 429);
      res.headers.set('retry-after', String(Math.ceil(((day + 1) * DAY_MS - now) / 1000)));
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
  if (url.pathname.startsWith('/api')) {
    const id = url.pathname.slice(5);
    const link = req.method === 'GET' && valid(id) ? await read(store, id, now) : null;
    return link ? json({ c: link.c, iv: link.iv, exp: link.exp }, site) : gone(site);
  }

  if (req.method === 'GET' && url.pathname === '/') return html(page.replace('{{id}}', ''));
  if (req.method === 'GET' && valid(url.pathname.slice(1))) {
    const id = url.pathname.slice(1);
    const link = await read(store, id, now);
    return html(page.replace('{{id}}', link ? id : ''), link ? 200 : 404);
  }
  return html(page.replace('{{id}}', ''), 404);
}
