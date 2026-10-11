/**
 * media: the picture proxy. A picture a document holds by its address on another site would be fetched from
 * that site by whoever reads the document, and so tell it who read it, from where, and when. The site asks
 * this instead: `GET /img?u=<https address>` fetches the picture once, keeps it at the edge for a week, and
 * hands it back, so the picture's site sees only Cloudflare. It is a proxy and a cache, not a store: nothing
 * is uploaded, and a picture is only ever what its own address gives.
 *
 *   GET     /img?u=<url>   -> the picture (200), or a line of text: 400 not an address it fetches, 404 not
 *                             there, 413 more than 5 MB, 415 not a picture, 429 too many just now, 502 the
 *                             site did not answer well or in time
 *   OPTIONS /img           -> CORS, for the site's own origin only (an export fetches the bytes)
 *
 * The rules: the address is https on the default port, a name and not a number or a name of this network;
 * redirects are followed by hand, at most three, each under the same rules; no referrer and no cookies go,
 * nothing of the reader's request is passed on; ten seconds in all. The answer must say it is `image/*`;
 * SVG only as `image/svg+xml`, served under a policy that lets it run nothing. Five megabytes at most,
 * counted as it streams and cut off past that. Of the origin's headers only the type is kept; the answer
 * carries this proxy's own: a week's immutable cache, `default-src 'none'`, nosniff, and
 * Cross-Origin-Resource-Policy cross-origin, so the site's pages may show it.
 *
 * This logs nothing: no address, no client, no count is written anywhere (observability is off in
 * wrangler.jsonc, and there is no console call in this folder). The rate limiter counts per client in memory.
 *
 * This file is the whole of it apart from the platform: worker.ts gives it fetch, caches.default and the
 * limiter; the tests give it stubs. (A whitelist of hosts is the site's business, in src/kit/media.ts: every
 * https picture is proxied, the whitelist only decides which show without asking.)
 */

/** The site that may fetch a picture's bytes (an export does). */
export const SITE = 'https://tinylittleoffice.com';
/** The most a picture may weigh. */
export const MAX_BYTES = 5 * 1024 * 1024;
/** A week, in seconds: how long the edge and the browser keep a picture. */
export const WEEK = 7 * 24 * 3600;
/** Redirects followed, at most. */
export const HOPS = 3;
/** All of it, redirects included, in milliseconds. */
export const TIMEOUT = 10_000;

export interface CacheLike {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
}

export interface Deps {
  fetch: (input: Request | string, init?: RequestInit) => Promise<Response>;
  cache?: CacheLike;
  /** May this client ask for another picture now? */
  allowed: (key: string) => Promise<boolean>;
  /** Work to finish after the answer has gone (the cache's write). */
  later?: (p: Promise<unknown>) => void;
  site?: string;
  /** For the tests: a shorter wait than TIMEOUT. */
  timeout?: number;
}

const SVG = 'image/svg+xml';

/** A line of text with its status. */
function say(status: number, words: string, site: string): Response {
  return new Response(words + '\n', {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'cross-origin',
      'access-control-allow-origin': site,
    },
  });
}

/** A name on the open web: not an IP literal, not localhost, not a name only this network knows. */
function publicName(host: string): boolean {
  if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host)) return false;
  return !/(?:^|\.)(?:localhost|local|internal|lan|home|arpa|test|invalid|example)$/.test(host);
}

/** An address this proxy will fetch, or null. */
export function fetchable(raw: string | null, base?: string): URL | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.port !== '' || u.username || u.password || !publicName(u.hostname)) return null;
  u.hash = '';
  return u;
}

/** The media type an answer says it is, lower case and without its parameters. */
const typeOf = (res: Response) => (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
/** A picture's type this proxy hands on: image/*, and SVG only by its own name. */
const picture = (type: string) => /^image\/[a-z0-9.+-]+$/.test(type) && (type === SVG || !type.includes('svg'));

/** Fetch an address, following at most HOPS redirects by hand, each under the same rules. */
/** Who is asking: the proxy names itself and the page that says what it does. */
export const UA = 'TinyLittleOffice/1 (+https://tinylittleoffice.com/network; the picture proxy)';

async function follow(deps: Deps, start: URL, signal: AbortSignal): Promise<Response | number> {
  let at = start;
  for (let hop = 0; ; hop++) {
    // Named, as Wikimedia and others require of a fetcher (an unnamed one gets 403, and the picture a broken glyph: 2026-10-11).
    const res = await deps.fetch(at.href, { method: 'GET', redirect: 'manual', signal, headers: { accept: 'image/avif,image/webp,image/*;q=0.9', 'user-agent': UA } });
    if (res.status < 300 || res.status >= 400 || res.status === 304) return res;
    await res.body?.cancel();
    const next = fetchable(res.headers.get('location'), at.href);
    if (!next || hop >= HOPS) return 502;
    at = next;
  }
}

/** The body, read as it streams, or null once it passes the cap (and the rest is not read). */
async function capped(res: Response): Promise<Uint8Array | null> {
  const length = Number(res.headers.get('content-length'));
  if (length > MAX_BYTES) {
    await res.body?.cancel();
    return null;
  }
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let i = 0;
  for (const p of parts) out.set(p, (i += p.byteLength) - p.byteLength);
  return out;
}

/** Answer one request. */
export async function handle(req: Request, deps: Deps): Promise<Response> {
  const site = deps.site ?? SITE;
  const url = new URL(req.url);
  if (url.pathname !== '/img') return say(404, 'Nothing here. This is the picture proxy of Tiny Little Office.', site);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': site, 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } });
  if (req.method !== 'GET') return say(405, 'Only GET.', site);

  const target = fetchable(url.searchParams.get('u'));
  if (!target) return say(400, 'Not an address this fetches: https, a public name, the default port.', site);

  // Keyed by the picture's address alone; nothing of the reader's request.
  const key = new Request(`${url.origin}/img?u=${encodeURIComponent(target.href)}`);
  const kept = await deps.cache?.match(key);
  if (kept) return kept;

  if (!(await deps.allowed(req.headers.get('cf-connecting-ip') ?? ''))) return say(429, 'Too many pictures from here just now.', site);

  const signal = AbortSignal.timeout(deps.timeout ?? TIMEOUT);
  let got: Response | number;
  let bytes: Uint8Array | null;
  try {
    got = await follow(deps, target, signal);
    if (typeof got === 'number') return say(got, 'Too many redirects, or one to an address this does not fetch.', site);
    if (got.status === 404 || got.status === 410) {
      await got.body?.cancel();
      return say(404, 'The picture is not there.', site);
    }
    if (!got.ok) {
      await got.body?.cancel();
      return say(502, 'The picture’s site did not answer well.', site);
    }
    if (!picture(typeOf(got))) {
      await got.body?.cancel();
      return say(415, 'That address is not a picture.', site);
    }
    bytes = await capped(got);
  } catch {
    return say(502, 'The picture’s site did not answer in time.', site);
  }
  if (!bytes) return say(413, 'The picture is more than 5 MB.', site);

  const type = typeOf(got);
  const res = new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'content-type': type,
      'content-length': String(bytes.byteLength),
      'cache-control': `public, max-age=${WEEK}, immutable`,
      'content-security-policy': type === SVG ? "default-src 'none'; style-src 'unsafe-inline'" : "default-src 'none'",
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'cross-origin',
      'access-control-allow-origin': site,
      'referrer-policy': 'no-referrer',
    },
  });
  if (deps.cache) {
    const put = deps.cache.put(key, res.clone());
    if (deps.later) deps.later(put);
    else await put;
  }
  return res;
}
