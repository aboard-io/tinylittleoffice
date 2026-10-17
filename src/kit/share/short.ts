/**
 * A shorter link, from tinier.tinylittleoffice.com, that expires. The long link is encrypted here with a key kept
 * in the short link's fragment, which browsers never send; the server holds only the ciphertext, and only until
 * the time chosen. The one thing it learns is that a link was made. A short link cannot be changed or recalled
 * once made (Paul, 2026-10-11): it expires on its own, an hour to a month after it was made, and one address may
 * make a hundred a day.
 */
import { toBase64Url, fromBase64Url } from '../core/codec.ts';
import { language, t } from '../core/i18n.ts';
import { dateString } from '../core/dates.ts';
import { origin } from '../core/network.ts';

// The dev server sets VITE_TINIER (.env.development) to its own /tinier/, which it hands on to the shortener on this machine.
const local = import.meta.env?.VITE_TINIER as string | undefined;
export const TINIER = local && typeof location !== 'undefined' ? new URL(local, location.href).href : `${origin('tinier')}/`;
/** The most ciphertext a short link may hold, in base64url characters: tinier's MAX_BYTES (backends/tinier/tinier.ts), which a test holds equal to this. */
export const SHORT_MAX = 16 * 1024;
export const EXPIRIES: { seconds: number; name: () => string }[] = [
  { seconds: 3600, name: () => t('share-hour') },
  { seconds: 86400, name: () => t('share-day') },
  { seconds: 7 * 86400, name: () => t('share-week') },
  { seconds: 30 * 86400, name: () => t('share-month') },
];

/** What a short link lives for unless the person chose otherwise (and Saved remembers): a week. */
export const DEFAULT_TTL = 7 * 86400;

const HOUR = 3600_000,
  DAY = 24 * HOUR;
/** How long a short link has left, in the largest unit that says it, and how urgently: over a week, within one, the last day. */
export interface Left {
  n: number;
  unit: 'day' | 'hour' | 'minute';
  urgency: 'ok' | 'soon' | 'last';
}
export function timeLeft(expires: number, now = Date.now()): Left {
  const ms = Math.max(0, expires - now);
  // A day link just made has a breath under 24 hours: said as "1 day", and red, its last day.
  if (Math.round(ms / HOUR) >= 24) {
    const n = Math.round(ms / DAY);
    return { n, unit: 'day', urgency: n >= 7 ? 'ok' : ms < DAY ? 'last' : 'soon' };
  }
  if (ms >= HOUR) return { n: Math.round(ms / HOUR), unit: 'hour', urgency: 'last' };
  return { n: Math.max(1, Math.round(ms / 60_000)), unit: 'minute', urgency: 'last' };
}
/** "This link expires in 12 days": the arrival banner's words. */
export function expiresSentence(expires: number, now = Date.now()): string {
  const { n, unit } = timeLeft(expires, now);
  return unit === 'day' ? t('share-this-link-expires-in-n', { n }) : unit === 'hour' ? t('share-this-link-expires-in-n-hours', { n }) : t('share-this-link-expires-in-n-minutes', { n });
}
/** "Expires in 7 days (16 October)": the Share dialog's words under a short link. */
export function expiresLine(expires: number, now = Date.now(), lang?: string): string {
  const { n, unit } = timeLeft(expires, now);
  const date = dateString(expires, { day: 'numeric', month: 'long' }, lang || language());
  return unit === 'day' ? t('share-expires-in-n-days-date', { n, date }) : unit === 'hour' ? t('share-expires-in-n-hours-date', { n, date }) : t('share-expires-in-n-minutes-date', { n, date });
}

export interface Shortened {
  /** The link to share: …/<id>#<key>. */
  short: string;
  id: string;
  /** When it expires, ms since the epoch. */
  expires: number;
}

const buf = (s: string) => Uint8Array.from(fromBase64Url(s)) as Uint8Array<ArrayBuffer>;
const utf8 = (s: string) => new TextEncoder().encode(s);

/** A short link: the service, its id, and the key after "#". */
export const shortLink = (id: string, key: string, at = TINIER) => `${at}${id}#${key}`;
/** The longest link a short link holds, in characters (bytes, past ASCII): what fits in SHORT_MAX base64url characters of ciphertext, less AES-GCM's 16-byte tag. */
export const SHORT_LINK_MAX = Math.floor((SHORT_MAX * 3) / 4) - 16;

const seal = (link: string, rawKey: Uint8Array<ArrayBuffer>) => sealShortAt(link, rawKey, crypto.getRandomValues(new Uint8Array(12)));

/**
 * For the test vectors alone (test/crypto-vectors.test.ts, docs/crypto/short-links.md): a short link's
 * ciphertext with the IV given rather than drawn. An IV is drawn fresh for every link; nothing in the site
 * calls this, and a test holds it to that.
 * @internal
 */
export async function sealShortAt(link: string, rawKey: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>): Promise<{ c: string; iv: string }> {
  if (iv.length !== 12) throw new Error('an IV is 12 bytes');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(link)));
  const out = { c: toBase64Url(c), iv: toBase64Url(iv) };
  if (out.c.length > SHORT_MAX) throw new Error(t('share-this-document-is-too-long'));
  return out;
}
function failed(res: Response): Error {
  if (res.status === 429) return new Error(t('share-hundred-links-day-from-one'));
  return new Error(t('share-could-not-shorten-link'));
}

/** A new short link for `link`, good for `seconds`. */
export async function shorten(link: string, seconds: number, at = TINIER): Promise<Shortened> {
  const raw = crypto.getRandomValues(new Uint8Array(32)); // AES-256
  const { c, iv } = await seal(link, raw);
  const res = await fetch(at + 'api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c, iv, ttl: seconds }) });
  if (!res.ok) throw failed(res);
  const { id, exp } = (await res.json()) as { id: string; exp: number };
  return { short: shortLink(id, toBase64Url(raw), at), id, expires: exp };
}

/** For tests and the page: open a short link's ciphertext with its key. */
export async function unshorten(c: string, iv: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', buf(key), 'AES-GCM', false, ['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, k, buf(c)));
}
