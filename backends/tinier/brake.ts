/**
 * The daily brake both Workers keep: one address may make a hundred things a UTC day (DAILY), a short link at the
 * shortener (tinier.ts) and a preview card at the site (cards.ts) each counted the same way. The count is kept under
 * base64url(sha256(key ‖ day ‖ address)), where the key is a secret of each Worker's deployment (BRAKE_KEY), so the
 * row says nothing of the address to anyone without the key, and with it only that the address made something that
 * day. The sweep forgets the counts of every day but today and yesterday.
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
 * One more counted for the address that asked; past DAILY, the seconds until the next UTC day (for Retry-After), else
 * null. Counted only once a request would make something, in one statement, so two at once cannot both be the hundredth.
 */
export async function braked(counter: Counter, key: string, req: Request, now: number): Promise<number | null> {
  const day = dayOf(now);
  if ((await counter.count(await brakeHash(key, day, req.headers.get('cf-connecting-ip') ?? ''), day)) <= DAILY) return null;
  return Math.ceil(((day + 1) * DAY_MS - now) / 1000);
}
