/**
 * How much room a link takes, and leaves, in the places links get pasted. Some services count every
 * character of a link, some charge a flat rate however long it is, and Bluesky's app shortens what it
 * shows. `cost` is what the link uses of `max`; the rest is room for your own words. The Share dialog says it
 * in one line (fitLine): the tightest place the link fits, or the first, from the roomiest down, it does not.
 * (Ported from the old tree's src/lib/limits.ts.)
 */
import { t } from './i18n.ts';
import { SHORT_LINK_MAX } from './short.ts';

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
}

const full = (url: string) => url.length;
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

export const TARGETS: Target[] = [
  { id: 'link', max: 2048, cost: full, where: () => t('some browsers') },
  { id: 'bluesky', max: 300, cost: blueskyCost, where: () => 'Bluesky', flat: true },
  { id: 'mastodon', max: 500, cost: () => 23, where: () => 'Mastodon', flat: true },
  { id: 'x', max: 280, cost: () => 23, where: () => 'X', flat: true },
  { id: 'sms', max: 160, cost: full, where: () => t('a text message') },
  { id: 'discord', max: 2000, cost: full, where: () => t('a Discord message') },
  { id: 'telegram', max: 4096, cost: full, where: () => t('a Telegram message') },
  { id: 'qr', max: 2953, cost: bytes, where: () => t('a QR code') },
  // NFC tags hold a link as an NDEF record: 7 bytes of framing, and "https://" packed into one.
  { id: 'ntag215', max: 504, cost: (u) => bytes(u) - 7 + 7, where: () => t('a small NFC sticker') },
  { id: 'ntag216', max: 888, cost: (u) => bytes(u) - 7 + 7, where: () => t('an NFC sticker') },
  // The shortener keeps the link encrypted and holds 16 KiB of ciphertext: said as the longest link that encrypts to that.
  { id: 'short', max: SHORT_LINK_MAX, cost: bytes, where: () => t('a short link') },
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
  return over ? t('This link: {n} characters, too long for {where}', { n, where: over.target.where() }) : t('This link: {n} characters, fits in a text message', { n });
}
