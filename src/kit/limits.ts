/**
 * How much room a link takes, and leaves, in the places links get pasted. Some services count every
 * character of a link, some charge a flat rate however long it is, and Bluesky's app shortens what it
 * shows. `cost` is what the link uses of `max`; the rest is room for your own words.
 * (Ported from the old tree's src/lib/limits.ts.)
 */
import { t } from './i18n.ts';
import { SHORT_MAX, shortCost, TINIER } from './short.ts';

export interface Target {
  id: string;
  name: () => string;
  /** The size of one message, post or code. */
  max: number;
  /** What a link costs against `max`. */
  cost(url: string): number;
  note: () => string;
  /** The service charges the same for any link, however long: the document can grow freely. */
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
  { id: 'link', name: () => t('Any browser'), max: 2048, cost: full, note: () => t('the classic safe length for a link') },
  { id: 'bluesky', name: () => 'Bluesky', max: 300, cost: blueskyCost, note: () => t('shows a short form of any link'), flat: true },
  { id: 'mastodon', name: () => 'Mastodon', max: 500, cost: () => 23, note: () => t('any link counts as 23'), flat: true },
  { id: 'x', name: () => 'X', max: 280, cost: () => 23, note: () => t('any link counts as 23'), flat: true },
  { id: 'sms', name: () => t('Text message'), max: 160, cost: full, note: () => t('one SMS') },
  { id: 'discord', name: () => 'Discord', max: 2000, cost: full, note: () => t('one message') },
  { id: 'telegram', name: () => 'Telegram', max: 4096, cost: full, note: () => t('one message') },
  { id: 'qr', name: () => t('QR code'), max: 2953, cost: bytes, note: () => t('the largest code there is (version 40)') },
  // NFC tags hold a link as an NDEF record: 7 bytes of framing, and "https://" packed into one.
  { id: 'ntag215', name: () => t('NTAG215 tag'), max: 504, cost: (u) => bytes(u) - 7 + 7, note: () => t('an NFC sticker (504 bytes)') },
  { id: 'ntag216', name: () => t('NTAG216 tag'), max: 888, cost: (u) => bytes(u) - 7 + 7, note: () => t('a bigger NFC sticker (888 bytes)') },
  // The shortener keeps the link encrypted; what it holds is the ciphertext, and it holds 16 KiB of it.
  { id: 'short', name: () => t('Short link'), max: SHORT_MAX, cost: shortCost, note: () => t('what the shortener holds, encrypted') },
];

/** How long a short link itself is: the service, seven letters of id, "#" and a 43-character key; the owner's has ".<o>" after that. */
export const shortLinkLength = (owner = false): number => TINIER.length + 7 + 1 + 43 + (owner ? 44 : 0);

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

/** The rooms as one table: where, its limit, what this link takes there, and what is left. */
export function roomRows(rooms: Room[], locale?: string): { name: string; max: string; used: string; left: string; note: string; over: boolean }[] {
  const n = (x: number) => x.toLocaleString(locale);
  return rooms.map((r) => ({
    name: r.target.name(),
    max: n(r.target.max),
    used: r.target.flat ? t('{n} (any length)', { n: n(r.used) }) : n(r.used),
    left: r.left < 0 ? t('{n} over', { n: n(-r.left) }) : n(r.left),
    note: r.target.note(),
    over: r.left < 0,
  }));
}
