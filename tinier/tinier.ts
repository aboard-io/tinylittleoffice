/**
 * tinier: a link shortener that never sees a link. The page encrypts the
 * long link with a key it keeps in the short link's fragment (which browsers
 * never send); this stores only the ciphertext, for as long as it was told
 * to, and hands it back. Opening a short link fetches the ciphertext,
 * decrypts it in the browser, and goes there.
 *
 *   POST /api            {c: <base64url ciphertext>, iv: <base64url>, ttl: <seconds>}  -> {id, exp}
 *   GET  /api/<id>       -> {c, iv, exp}   (404 once gone)
 *   GET  /<id>           the page that decrypts and redirects
 *   GET  /               what this is
 *
 * This file is the whole of it apart from where the rows live (a Store):
 * worker.ts gives it D1 and runs it on Cloudflare; the test gives it a Map.
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
  /** Forget every link past its time; how many went. */
  sweep(now: number): Promise<number>;
}

/** May this address make another link right now? */
export type Limiter = (key: string, now?: number) => Promise<boolean>;

/**
 * A brake on one address making many links: `limit` an hour, counted in
 * memory and never written down. Each instance of the Worker counts for
 * itself, so this is a floor under the platform's own limiter, not a wall.
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
const MAX_BYTES = 8 * 1024;
const TTLS = new Set([3600, 86400, 7 * 86400, 30 * 86400]);
/** 32 letters and digits that are hard to misread: no l, 1, o or 0. */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const B64 = /^[A-Za-z0-9_-]+$/;

export const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ALPHABET[b % 32]).join('');
const valid = (s: string) => /^[a-z0-9]{7}$/.test(s);

const json = (body: unknown, site: string, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'access-control-allow-origin': site, 'content-type': 'application/json', 'cache-control': 'no-store' } });
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

/** Answer one request. `page` is the landing page with "{{id}}" where the id goes and "{{site}}" where the site does. */
export async function handle(req: Request, store: Store, allowed: Limiter, page: string, now = Date.now(), site = SITE): Promise<Response> {
  const url = new URL(req.url);
  page = page.replaceAll('{{site}}', site);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': site, 'access-control-allow-methods': 'POST, GET', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });

  if (req.method === 'POST' && url.pathname === '/api') {
    if (!(await allowed(req.headers.get('cf-connecting-ip') ?? ''))) return json({ error: 'Too many links from here just now.' }, site, 429);
    const text = await req.text();
    if (text.length > MAX_BYTES * 2) return json({ error: 'Bad request' }, site, 400);
    let c: unknown, iv: unknown, ttl: unknown;
    try {
      ({ c, iv, ttl } = JSON.parse(text));
    } catch {
      return json({ error: 'Bad request' }, site, 400);
    }
    if (typeof c !== 'string' || typeof iv !== 'string' || typeof ttl !== 'number' || !B64.test(c) || !B64.test(iv) || c.length > MAX_BYTES || iv.length > 32 || !TTLS.has(ttl)) return json({ error: 'Bad request' }, site, 400);
    const exp = now + ttl * 1000;
    // Seven letters from thirty-two is 34 billion ids; a clash is for form's sake.
    for (let tries = 0; tries < 5; tries++) {
      const id = newId();
      if (await store.put(id, { c, iv, exp })) return json({ id, exp }, site, 201);
    }
    return json({ error: 'Could not make a link; try again.' }, site, 503);
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/')) {
    const id = url.pathname.slice(5);
    const link = valid(id) ? await read(store, id, now) : null;
    return link ? json(link, site) : json({ error: 'No such link, or it has expired.' }, site, 404);
  }

  if (req.method === 'GET' && url.pathname === '/') return html(page.replace('{{id}}', ''));
  if (req.method === 'GET' && valid(url.pathname.slice(1))) {
    const id = url.pathname.slice(1);
    const link = await read(store, id, now);
    return html(page.replace('{{id}}', link ? id : ''), link ? 200 : 404);
  }
  return html(page.replace('{{id}}', ''), 404);
}

/** The rows in Cloudflare D1 (tinier/schema.sql). */
export class D1Store implements Store {
  private db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }
  async get(id: string) {
    return (await this.db.prepare('SELECT c, iv, exp FROM links WHERE id = ?').bind(id).first<Link>()) ?? null;
  }
  async put(id: string, { c, iv, exp }: Link) {
    const r = await this.db.prepare('INSERT OR IGNORE INTO links (id, c, iv, exp) VALUES (?, ?, ?, ?)').bind(id, c, iv, exp).run();
    return r.meta.changes === 1;
  }
  async drop(id: string) {
    await this.db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  }
  async sweep(now: number) {
    return (await this.db.prepare('DELETE FROM links WHERE exp < ?').bind(now).run()).meta.changes;
  }
}
