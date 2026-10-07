/**
 * How much room a link takes, and leaves, in the places links get pasted.
 *
 * Some services count every character of a link, some charge a flat rate
 * however long it is, and Bluesky's app shortens what it shows. `cost` is
 * what the link uses of `max`; the rest is room for your own words.
 */
export interface Target {
  id: string;
  name: string;
  /** The size of one message, post or code. */
  max: number;
  /** What a link costs against `max`. */
  cost(url: string): number;
  note: string;
  /** The service charges the same for any link, however long: the document can grow freely. */
  flat?: boolean;
}

const full = (url: string) => url.length;
const bytes = (url: string) => new TextEncoder().encode(url).length;

/**
 * The Bluesky app shows (and counts) a link as its host plus at most 16
 * characters of path; the full address still travels with the post.
 */
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
  { id: 'link', name: 'Any browser', max: 2048, cost: full, note: 'the classic safe length for a link' },
  { id: 'bluesky', name: 'Bluesky', max: 300, cost: blueskyCost, note: 'shows a short form of any link', flat: true },
  { id: 'mastodon', name: 'Mastodon', max: 500, cost: () => 23, note: 'any link counts as 23', flat: true },
  { id: 'x', name: 'X', max: 280, cost: () => 23, note: 'any link counts as 23', flat: true },
  { id: 'sms', name: 'Text message', max: 160, cost: full, note: 'one SMS' },
  { id: 'discord', name: 'Discord', max: 2000, cost: full, note: 'one message' },
  { id: 'telegram', name: 'Telegram', max: 4096, cost: full, note: 'one message' },
  { id: 'qr', name: 'QR code', max: 2953, cost: bytes, note: 'the largest code there is (version 40)' },
  // NFC tags hold a link as an NDEF record: 7 bytes of framing, and "https://" packed into one.
  { id: 'ntag215', name: 'NTAG215 tag', max: 504, cost: (u) => bytes(u) - 7 + 7, note: 'an NFC sticker (504 bytes)' },
  { id: 'ntag216', name: 'NTAG216 tag', max: 888, cost: (u) => bytes(u) - 7 + 7, note: 'a bigger NFC sticker (888 bytes)' },
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

/** The rooms as one table: where, its limit, what this link takes there, and what is left. */
export function roomRows(rooms: Room[]): { name: string; max: string; used: string; left: string; note: string; over: boolean }[] {
  const n = (x: number) => x.toLocaleString('en-US');
  return rooms.map((r) => ({
    name: r.target.name,
    max: n(r.target.max),
    used: r.target.flat ? `${n(r.used)} (any length)` : n(r.used),
    left: r.left < 0 ? `${n(-r.left)} over` : n(r.left),
    note: r.target.note,
    over: r.left < 0,
  }));
}
