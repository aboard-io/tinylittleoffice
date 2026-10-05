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
  { id: 'bluesky', name: 'Bluesky', max: 300, cost: blueskyCost, note: 'shown shortened' },
  { id: 'mastodon', name: 'Mastodon', max: 500, cost: () => 23, note: 'any link counts as 23' },
  { id: 'x', name: 'X', max: 280, cost: () => 23, note: 'any link counts as 23' },
  { id: 'sms', name: 'Text message', max: 160, cost: full, note: 'one SMS' },
  { id: 'discord', name: 'Discord', max: 2000, cost: full, note: 'one message' },
  { id: 'telegram', name: 'Telegram', max: 4096, cost: full, note: 'one message' },
  { id: 'qr', name: 'QR code', max: 2953, cost: bytes, note: 'the largest code there is' },
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
