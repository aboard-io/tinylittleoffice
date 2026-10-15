/**
 * How much room a link takes, and leaves, in the places links get pasted. Some services count every
 * character of a link, some charge a flat rate however long it is, and Bluesky's app shortens what it
 * shows. `cost` is what the link uses of `max`; the rest is room for your own words. The Share dialog says it
 * in one line (fitLine): the tightest place the link fits, or the first, from the roomiest down, it does not.
 *
 * Every limit's number lives here or is read from the file that enforces it (the link's 2,048, the QR code's and the
 * short link's), and the Share dialog's table says each beside the link's own size, in characters or in bytes as the
 * place counts it (Paul, 2026-10-15, issue #8: "State the size limits in the big dropdown that shows size. Add 'Max
 * Chrome length', max Firefox length, max shortener length, etc."; readers guessed the limit wrong by ten times).
 */
import { t } from '../core/i18n.ts';
import { URL_LIMIT } from '../core/codec.ts';
import { QR_MAX_BYTES } from '../draw/qr.ts';
import { SHORT_LINK_MAX } from './short.ts';

/**
 * Chrome's longest URL, and every Chromium's (Edge, Brave, Opera): kMaxURLChars, 2 * 1024 * 1024, in Chromium's
 * url/url_constants.h; its URL display guidelines say "Chrome limits URLs to a maximum length of 2MB".
 */
export const CHROME_URL_MAX = 2 * 1024 * 1024;
/** Firefox's longest http(s) URL: the preference network.standard-url.max-length, 1,048,576 by default (modules/libpref/init/StaticPrefList.yaml). */
export const FIREFOX_URL_MAX = 1024 * 1024;

export interface Target {
  id: string;
  /** The size of one message, post or code. */
  max: number;
  /** What a link costs against `max`. */
  cost(url: string): number;
  /** Where, as the end of "too long for …": "a text message". */
  where: () => string;
  /** The service charges the same for any link, however long: it never decides whether a link fits. */
  flat?: boolean;
  /** What `max` and the cost count: characters, or the bytes of the link's UTF-8. */
  unit: 'characters' | 'bytes';
}

const full = (url: string) => url.length;
/** A browser counts the URL as it holds it: parsed, anything past ASCII written as %XX. */
const parsed = (url: string) => {
  try {
    return new URL(url).href.length;
  } catch {
    return url.length;
  }
};
const bytes = (url: string) => new TextEncoder().encode(url).length;

/** The Bluesky app shows (and counts) a link as its host plus at most 16 characters of path; the full address still travels with the post. */
export function blueskyCost(url: string): number {
  try {
    const u = new URL(url);
    const path = (u.pathname === '/' ? '' : u.pathname) + u.search + u.hash;
    return u.host.length + Math.min(path.length, 16);
  } catch {
    return url.length;
  }
}

/** From the roomiest down; a target with no published limit has a max of Infinity. */
export const TARGETS: Target[] = [
  { id: 'chrome', max: CHROME_URL_MAX, cost: parsed, where: () => t('share-chrome-and-edge'), unit: 'characters' },
  { id: 'firefox', max: FIREFOX_URL_MAX, cost: parsed, where: () => 'Firefox', unit: 'characters' },
  // Safari: WebKit publishes no longest URL, and its URL class (Source/WTF/wtf/URL.h) sets none.
  { id: 'safari', max: Infinity, cost: parsed, where: () => 'Safari', unit: 'characters' },
  // The shortener keeps the link encrypted and holds 16 KiB of ciphertext: said as the longest link that encrypts to that.
  { id: 'short', max: SHORT_LINK_MAX, cost: bytes, where: () => t('share-a-short-link'), unit: 'bytes' },
  // Google Docs keeps the first 4,096 characters of a link put on words (Insert, Link); Paul, 2026-10-14: "Google Docs inline link cut my link."
  { id: 'gdocs', max: 4096, cost: full, where: () => t('share-link-in-google-docs'), unit: 'characters' },
  { id: 'telegram', max: 4096, cost: full, where: () => t('share-telegram-message'), unit: 'characters' },
  // A QR code of version 40 at the lowest correction holds 2,953 bytes (kit/draw/qr.ts).
  { id: 'qr', max: QR_MAX_BYTES, cost: bytes, where: () => t('share-a-qr-code'), unit: 'bytes' },
  // URL_LIMIT (kit/core/codec.ts), the header meter's: no browser in use stops at 2,048, but older ones did (Internet
  // Explorer at 2,083) and much software that passes links on still keeps that rule of thumb.
  { id: 'link', max: URL_LIMIT, cost: full, where: () => t('share-some-browsers'), unit: 'characters' },
  { id: 'discord', max: 2000, cost: full, where: () => t('share-discord-message'), unit: 'characters' },
  // NFC tags hold a link as an NDEF record: 7 bytes of framing, and "https://" packed into one.
  { id: 'ntag216', max: 888, cost: (u) => bytes(u) - 7 + 7, where: () => t('share-nfc-sticker'), unit: 'bytes' },
  { id: 'ntag215', max: 504, cost: (u) => bytes(u) - 7 + 7, where: () => t('share-small-nfc-sticker'), unit: 'bytes' },
  { id: 'sms', max: 160, cost: full, where: () => t('share-text-message'), unit: 'characters' },
  { id: 'mastodon', max: 500, cost: () => 23, where: () => 'Mastodon', flat: true, unit: 'characters' },
  { id: 'bluesky', max: 300, cost: blueskyCost, where: () => 'Bluesky', flat: true, unit: 'characters' },
  { id: 'x', max: 280, cost: () => 23, where: () => 'X', flat: true, unit: 'characters' },
];

export interface Room {
  target: Target;
  used: number;
  /** Negative when the link does not fit. */
  left: number;
}

export function roomFor(url: string): Room[] {
  return TARGETS.map((target) => {
    const used = target.cost(url);
    return { target, used, left: target.max - used };
  });
}

/** A place's limit, said with what it counts: "2,953 bytes", "4,096 characters", or that none is published. */
export function limitWords(r: Room): string {
  const max = r.target.max;
  if (!Number.isFinite(max)) return t('share-no-published-limit');
  return r.target.unit === 'bytes' ? t('share-n-bytes', { n: max }) : t('share-n-characters', { n: max });
}

/** Whether the link fits there, and by how much: "Yes, 848 left", "No, 300 over"; a flat-rate service, what a link counts as. */
export function fitWords(r: Room): string {
  if (r.target.flat) return t('share-yes-link-counts-as-n', { n: r.used });
  if (!Number.isFinite(r.left)) return t('share-yes');
  return r.left < 0 ? t('share-no-n-over', { n: -r.left }) : t('share-yes-n-left', { n: r.left });
}

/**
 * "This link: 1,240 characters, too long for an NFC sticker": walking from the roomiest place to the tightest,
 * the first the link does not fit; or, fitting them all, "fits in a text message". Flat-rate services never decide.
 */
export function fitLine(url: string): string {
  const n = url.length;
  const over = roomFor(url)
    .filter((r) => !r.target.flat)
    .sort((a, b) => b.target.max - a.target.max)
    .find((r) => r.left < 0);
  return over ? t('share-this-link-n-characters-too', { n, where: over.target.where() }) : t('share-this-link-n-characters-fits', { n });
}
