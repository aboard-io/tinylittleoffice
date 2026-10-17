/**
 * What every service shares (tinier.ts, cards/cards.ts, journal/journal.ts). The daily brake: one address may make a
 * hundred things a UTC day (DAILY), a short link at the shortener, a preview card at the site and a journal each counted
 * the same way. The count is kept under base64url(sha256(key ‖ day ‖ address)), where the key is a secret of each
 * Worker's deployment (BRAKE_KEY), so the row says nothing of the address to anyone without the key, and with it only
 * that the address made something that day. The sweep forgets the counts of every day but today and yesterday. The
 * sites whose pages may call (SITE); the one bounded read of a request's body (bodyText), which every service does
 * before it parses anything; and the JSON answer, with the headers every one carries.
 */

/** Where an address's count is kept: one more under `h` on `day`, and the count now, this one included. */
export interface Counter {
  count(h: string, day: number): Promise<number>;
}

/** The brake's secret, as the deployment gives it; without one the Worker serves nothing, and says why. `config` is the Worker's wrangler file. */
export function brakeKey(key: string | undefined, config = 'backends/cloudflare/tinier/wrangler.jsonc', dev = 'backends/cloudflare/tinier/.dev.vars', run = 'npm run tinier:dev'): string {
  if (!key) throw new Error(`BRAKE_KEY is not set. Run \`npx wrangler secret put BRAKE_KEY -c ${config}\`, or put BRAKE_KEY=… in ${dev} for \`${run}\`.`);
  return key;
}

/**
 * The site whose pages may call a service, and the only place a short link may lead (a local copy of the site, under
 * `wrangler dev`, names itself). A Worker's var SITE may name more than one, comma-separated, the first the site's own:
 * each an origin, or an origin and a path for a copy that is not at its host's root, as the mirror on GitHub Pages
 * ("https://tinylittleoffice.com,https://aboard-io.github.io/tinylittleoffice": docs/mirror.md). Each may call, and a
 * short link may lead only under one of them.
 */
export const SITE = 'https://tinylittleoffice.com';

/** The sites a SITE names, each without a trailing "/". */
export const sitesOf = (site: string): string[] =>
  site
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

export const HSTS = 'max-age=31536000; includeSubDomains';
/** A JSON answer to a page of `site`: never cached, never sniffed, over TLS from here on. */
export const json = (body: unknown, site: string, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'access-control-allow-origin': site, 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'strict-transport-security': HSTS },
  });

/** The most one address may make in a UTC day. */
export const DAILY = 100;
export const DAY_MS = 86_400_000;
/** The UTC day number of a time: days since 1970-01-01. */
export const dayOf = (now: number) => Math.floor(now / DAY_MS);

// base64url as the site writes it (src/kit/core/codec.ts): "~" for 62, never "-", where a pasted link would break a line.
export const b64 = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '~')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** What an address is counted under on a day: base64url(sha256(key ‖ day ‖ address)), which says nothing without the key. */
export async function brakeHash(key: string, day: number, address: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${key}\n${day}\n${address}`)));
}

/**
 * A request's body as text, read no further than `most` bytes: null past them (the rest is never read), or for a body
 * that is not UTF-8. The Workers would otherwise hold a body whole before looking at its size (a review, 2026-10-17).
 */
export async function bodyText(req: Request, most: number): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return '';
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > most) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(all);
  } catch {
    return null;
  }
}

/**
 * One more counted for the address that asked; past DAILY, the seconds until the next UTC day (for Retry-After), else
 * null. Counted only once a request would make something, in one statement, so two at once cannot both be the hundredth.
 */
export async function braked(counter: Counter, key: string, req: Request, now: number): Promise<number | null> {
  const day = dayOf(now);
  if ((await counter.count(await brakeHash(key, day, req.headers.get('cf-connecting-ip') ?? ''), day)) <= DAILY) return null;
  return Math.ceil(((day + 1) * DAY_MS - now) / 1000);
}
