/**
 * A shorter link, from tinier.tinylittleoffice.com, that expires, and that its owner can update. The long
 * link is encrypted here with a key kept in the short link's fragment, which browsers never send; the server
 * holds only the ciphertext, and only until the time chosen. The one thing it learns is that a link was made.
 *
 * Two links come out of shorten(). The public one, …/<id>#<key>, always opens the latest version, because the
 * AES key never changes across updates (only the IV and the ciphertext do). The owner's, …/<id>#<key>.<o>, is
 * what the author keeps: o is 32 random bytes made beside the key, the server stores only sha256(o), and a
 * PUT or DELETE proves ownership by sending o itself (over TLS, in the one request that needs it). o is never
 * in a public link, a log, or any other request. (Ported from the old tree's src/lib/short.ts, with ownership.)
 */
import { toBase64Url, fromBase64Url } from './codec.ts';
import { t } from './i18n.ts';
import type { Owned } from './route.ts';
import { origin } from './network.ts';

// The dev server sets VITE_TINIER (.env.development) to its own /tinier/, which it hands on to the shortener on this machine.
const local = import.meta.env?.VITE_TINIER as string | undefined;
export const TINIER = local && typeof location !== 'undefined' ? new URL(local, location.href).href : `${origin('tinier')}/`;
/** The most ciphertext a short link may hold, in base64url characters: tinier's MAX_BYTES (tinier/tinier.ts), which a test holds equal to this. */
export const SHORT_MAX = 16 * 1024;
export const EXPIRIES: { seconds: number; name: () => string }[] = [
  { seconds: 3600, name: () => t('An hour') },
  { seconds: 86400, name: () => t('A day') },
  { seconds: 7 * 86400, name: () => t('A week') },
  { seconds: 30 * 86400, name: () => t('A month') },
  { seconds: 365 * 86400, name: () => t('A year') },
];

/** What a short link lives for unless the person chose otherwise (and Saved remembers): a week. */
export const DEFAULT_TTL = 7 * 86400;

const HOUR = 3600_000, DAY = 24 * HOUR;
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
  return unit === 'day' ? t('This link expires in {n|# day|# days}', { n }) : unit === 'hour' ? t('This link expires in {n|# hour|# hours}', { n }) : t('This link expires in {n|# minute|# minutes}', { n });
}
/** "Expires in 7 days (16 October)": the Share dialog's words under a short link. */
export function expiresLine(expires: number, now = Date.now(), lang?: string): string {
  const { n, unit } = timeLeft(expires, now);
  const date = new Date(expires).toLocaleDateString(lang || undefined, { day: 'numeric', month: 'long' });
  return unit === 'day' ? t('Expires in {n|# day|# days} ({date})', { n, date }) : unit === 'hour' ? t('Expires in {n|# hour|# hours} ({date})', { n, date }) : t('Expires in {n|# minute|# minutes} ({date})', { n, date });
}

export interface Shortened {
  /** The public link: opens the latest version. */
  short: string;
  /** The owner's link: the public one with ".<o>" after the key. Whoever has it can update or forget the short link. */
  owner: string;
  id: string;
  /** When it expires, ms since the epoch. */
  expires: number;
  /** What the shell carries in the document's hash while the owner is editing. */
  owned: Owned;
}

const buf = (s: string) => Uint8Array.from(fromBase64Url(s)) as Uint8Array<ArrayBuffer>;
const utf8 = (s: string) => new TextEncoder().encode(s);

/** What a link costs at the shortener: its ciphertext, in base64url characters (AES-GCM adds a 16-byte tag). */
export const shortCost = (link: string): number => Math.ceil(((utf8(link).length + 16) * 4) / 3);
/** The public short link: the owner's link, or any short link, without its ".<o>" (a key alone is left as it is). */
export const publicLink = (link: string): string => link.replace(/(#[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+$/, '$1');
/** The owner's link from what the shell carries. */
export const ownerLink = ({ id, key, o }: Owned, at = TINIER) => `${at}${id}#${key}.${o}`;
/** The public link from what the shell carries. */
export const shortLink = ({ id, key }: Owned, at = TINIER) => `${at}${id}#${key}`;

const seal = (link: string, rawKey: Uint8Array<ArrayBuffer>) => sealShortAt(link, rawKey, crypto.getRandomValues(new Uint8Array(12)));

/**
 * For the test vectors alone (test/crypto-vectors.test.ts, docs/crypto/short-links.md): a short link's
 * ciphertext with the IV given rather than drawn. Every version of a short link shares its key, so an IV
 * used twice would give both versions away; nothing in the site calls this, and a test holds it to that.
 * @internal
 */
export async function sealShortAt(link: string, rawKey: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>): Promise<{ c: string; iv: string }> {
  if (iv.length !== 12) throw new Error('an IV is 12 bytes');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(link)));
  const out = { c: toBase64Url(c), iv: toBase64Url(iv) };
  if (out.c.length > SHORT_MAX) throw new Error(t('This document is too long for a short link.'));
  return out;
}
/** The owner key's proof, as the server keeps it: base64url(sha256(o)). */
export const ownerHash = async (o: string) => toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', buf(o))));

function failed(res: Response): Error {
  if (res.status === 429) return new Error(t('Too many short links from here this hour.'));
  if (res.status === 404 || res.status === 403) return new Error(t('This short link is gone, or the key does not fit.'));
  return new Error(t('Could not shorten the link.'));
}
const send = async (url: string, method: string, body: unknown) => {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw failed(res);
  return res;
};

/** A new short link for `link`, good for `seconds`: the public link and the owner's. */
export async function shorten(link: string, seconds: number, at = TINIER): Promise<Shortened> {
  const raw = crypto.getRandomValues(new Uint8Array(32)); // AES-256
  const o = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const { c, iv } = await seal(link, raw);
  const res = await send(at + 'api', 'POST', { c, iv, ttl: seconds, owner: await ownerHash(o) });
  const { id, exp } = (await res.json()) as { id: string; exp: number };
  const owned = { id, key: toBase64Url(raw), o };
  return { short: shortLink(owned, at), owner: ownerLink(owned, at), id, expires: exp, owned };
}

/** A new version under the same id: `link` encrypted with the same key, proved with o; `seconds` extends the expiry from now (it never cuts one short). */
export async function update(owned: Owned, link: string, seconds?: number, at = TINIER): Promise<{ ver: number; expires: number }> {
  const { c, iv } = await seal(link, buf(owned.key));
  const res = await send(`${at}api/${owned.id}`, 'PUT', { c, iv, o: owned.o, ...(seconds ? { ttl: seconds } : {}) });
  const { ver, exp } = (await res.json()) as { ver: number; exp: number };
  return { ver, expires: exp };
}

/** The short link forgotten, proved with o. */
export async function forget(owned: Owned, at = TINIER): Promise<void> {
  await send(`${at}api/${owned.id}`, 'DELETE', { o: owned.o });
}

/** For tests and the page: open a short link's ciphertext with its key. */
export async function unshorten(c: string, iv: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', buf(key), 'AES-GCM', false, ['decrypt']);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf(iv) }, k, buf(c)));
}
