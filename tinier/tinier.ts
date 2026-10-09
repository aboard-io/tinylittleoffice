/**
 * tinier: a link shortener that never sees a link. The site encrypts the long link with a key it keeps in
 * the short link's fragment (which browsers never send); this stores only the ciphertext, for as long as it
 * was told to, and hands it back. Opening a short link fetches the ciphertext, decrypts it in the browser,
 * and goes there.
 *
 * A short link is living: whoever holds its owner key may put a new ciphertext under the same id, so the
 * public link always opens the latest version. The owner key `o` is 32 random bytes made beside the AES key;
 * the server keeps only sha256(o) and is shown `o` itself only in the PUT or DELETE that proves it.
 *
 *   POST   /api        {c, iv, ttl, owner?}      -> 201 {id, exp}            owner = base64url(sha256(o))
 *   GET    /api/<id>                             -> {c, iv, exp, ver, updated}   (404 once gone)
 *   PUT    /api/<id>   {c, iv, o, ttl?}          -> {id, exp, ver, updated}  a new version; ttl extends exp
 *   DELETE /api/<id>   {o}                       -> 204                      forgotten
 *   GET    /<id>       the page that decrypts and redirects
 *   GET    /           what this is
 *
 * What the server knows: ciphertext, an IV, a hash of the owner key, timestamps, and that a request came. It
 * cannot read a link, cannot tell one version from another, and cannot forge an update without `o`. Ids are
 * random; a PUT or DELETE for an unknown id (404) and one with the wrong `o` (403) carry the same body and
 * take the same time (the hash is computed and compared either way), so neither tells an outsider which ids
 * exist. The brake covers POST, PUT and DELETE alike.
 *
 * This file is the whole of it apart from where the rows live (a Store): worker.ts gives it D1 and runs it on
 * Cloudflare; the tests give it a Map.
 */

export interface Link {
  c: string;
  iv: string;
  /** When to forget it, ms since the epoch. */
  exp: number;
  /** base64url(sha256(o)), or null for a row made without one: such a row can never be updated. */
  owner: string | null;
  /** 1 when made; one more with every PUT. */
  ver: number;
  /** When it was last PUT, ms since the epoch; null until then. */
  updated: number | null;
}

/** What a PUT changes. */
export type Revision = Pick<Link, 'c' | 'iv' | 'exp' | 'updated'>;

export interface Store {
  get(id: string): Promise<Link | null>;
  /** Keep a link under a new id; false if the id is taken. */
  put(id: string, link: Link): Promise<boolean>;
  /** A new version of a link that is there: c, iv, exp and updated replaced, ver one more. */
  revise(id: string, rev: Revision): Promise<void>;
  drop(id: string): Promise<void>;
  /** Forget every link past its time; how many went. */
  sweep(now: number): Promise<number>;
}

/** May this address make (or change) another link right now? */
export type Limiter = (key: string, now?: number) => Promise<boolean>;

/**
 * A brake on one address making many links: `limit` an hour, counted in memory and never written down. Each
 * instance of the Worker counts for itself, so this is a floor under the platform's own limiter, not a wall.
 */
export function brake(limit = 60, hour = 3600_000): Limiter {
  const made = new Map<string, number[]>();
  return async (key, now = Date.now()) => {
    const recent = (made.get(key) ?? []).filter((t) => now - t < hour);
    recent.push(now);
    made.set(key, recent);
    if (made.size > 10_000) for (const [k, ts] of made) if (now - ts[ts.length - 1] >= hour) made.delete(k);
    return recent.length <= limit;
  };
}

/** The site that may call the API, and the only place a short link may lead (a local copy of the site, under `wrangler dev`, names itself). */
export const SITE = 'https://tinylittleoffice.com';
/** The most ciphertext a link may hold, in base64url characters. src/kit/short.ts carries the same number; a test holds them together. */
export const MAX_BYTES = 16 * 1024;
/** The lifetimes on the menu, in seconds: an hour, a day, a week, a month, a year. */
export const TTLS = new Set([3600, 86400, 7 * 86400, 30 * 86400, 365 * 86400]);
/** 32 letters and digits that are hard to misread: no l, 1, o or 0. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const B64 = /^[A-Za-z0-9_-]+$/;
/** sha256 in base64url is always 43 characters; so is a 32-byte owner key. */
const HASH_LENGTH = 43;

export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % 32]).join('');
const valid = (s: string) => /^[a-z0-9]{7}$/.test(s);

const json = (body: unknown, site: string, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'access-control-allow-origin': site, 'content-type': 'application/json', 'cache-control': 'no-store' } });
const bad = (site: string) => json({ error: 'Bad request' }, site, 400);
const gone = (site: string, status: 404 | 403) => json({ error: 'No such link, or it has expired, or the key does not fit.' }, site, status);
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

const b64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
/** The owner hash of an owner key, as the client computes it: base64url(sha256(bytes of o)). */
export async function ownerHash(o: string): Promise<string> {
  const bytes = Uint8Array.from(atob(o.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));
  return b64(await crypto.subtle.digest('SHA-256', bytes));
}
/** Hashes compared in constant time: every character is looked at, whether or not an earlier one differed. */
const same = (a: string, b: string) => {
  let diff = a.length ^ b.length;
  for (let i = 0; i < HASH_LENGTH; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
};
/** What a row without an owner, or no row at all, is compared against: a hash nothing proves, so the time taken is the same. */
const NOBODY = 'A'.repeat(HASH_LENGTH);

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
const key = (o: unknown): o is string => typeof o === 'string' && B64.test(o) && o.length === HASH_LENGTH;

/**
 * The owner's proof, checked: the link if `o` hashes to its owner; 404 or 403 otherwise. Both answers carry the
 * same body, and the hash is computed and compared whether or not the row exists, so they take the same time.
 */
async function prove(store: Store, id: string, o: unknown, now: number, site: string): Promise<Link | Response> {
  const link = valid(id) ? await read(store, id, now) : null;
  const proof = key(o) ? await ownerHash(o) : NOBODY;
  const ok = same(proof, link?.owner ?? NOBODY) && !!link?.owner;
  if (!link) return gone(site, 404);
  return ok ? link : gone(site, 403);
}

/** Answer one request. `page` is the landing page with "{{id}}" where the id goes and "{{site}}" where the site does. */
export async function handle(req: Request, store: Store, allowed: Limiter, page: string, now = Date.now(), site = SITE): Promise<Response> {
  const url = new URL(req.url);
  page = page.replaceAll('{{site}}', site);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': site, 'access-control-allow-methods': 'POST, GET, PUT, DELETE', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });

  const writes = req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE';
  if (writes && url.pathname.startsWith('/api') && !(await allowed(req.headers.get('cf-connecting-ip') ?? ''))) return json({ error: 'Too many links from here just now.' }, site, 429);

  if (req.method === 'POST' && url.pathname === '/api') {
    const b = await body(req);
    if (!b) return bad(site);
    const { c, iv, ttl, owner } = b;
    if (!cipher(c, iv) || typeof ttl !== 'number' || !TTLS.has(ttl) || (owner !== undefined && !key(owner))) return bad(site);
    const exp = now + ttl * 1000;
    // Seven letters from thirty-two is 34 billion ids; a clash is for form's sake.
    for (let tries = 0; tries < 5; tries++) {
      const id = newId();
      if (await store.put(id, { c, iv: iv as string, exp, owner: (owner as string | undefined) ?? null, ver: 1, updated: null })) return json({ id, exp }, site, 201);
    }
    return json({ error: 'Could not make a link; try again.' }, site, 503);
  }

  if (url.pathname.startsWith('/api/')) {
    const id = url.pathname.slice(5);
    if (req.method === 'GET') {
      const link = valid(id) ? await read(store, id, now) : null;
      return link ? json({ c: link.c, iv: link.iv, exp: link.exp, ver: link.ver, updated: link.updated }, site) : gone(site, 404);
    }
    if (req.method === 'PUT') {
      const b = await body(req);
      if (!b) return bad(site);
      const { c, iv, ttl, o } = b;
      if (!cipher(c, iv) || (ttl !== undefined && (typeof ttl !== 'number' || !TTLS.has(ttl)))) return bad(site);
      const link = await prove(store, id, o, now, site);
      if (link instanceof Response) return link;
      // A lifetime given extends the link; it never cuts one short.
      const rev: Revision = { c, iv: iv as string, exp: typeof ttl === 'number' ? Math.max(link.exp, now + ttl * 1000) : link.exp, updated: now };
      await store.revise(id, rev);
      return json({ id, exp: rev.exp, ver: link.ver + 1, updated: now }, site);
    }
    if (req.method === 'DELETE') {
      const b = await body(req);
      if (!b) return bad(site);
      const link = await prove(store, id, b.o, now, site);
      if (link instanceof Response) return link;
      await store.drop(id);
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': site, 'cache-control': 'no-store' } });
    }
  }

  if (req.method === 'GET' && url.pathname === '/') return html(page.replace('{{id}}', ''));
  if (req.method === 'GET' && valid(url.pathname.slice(1))) {
    const id = url.pathname.slice(1);
    const link = await read(store, id, now);
    return html(page.replace('{{id}}', link ? id : ''), link ? 200 : 404);
  }
  return html(page.replace('{{id}}', ''), 404);
}
