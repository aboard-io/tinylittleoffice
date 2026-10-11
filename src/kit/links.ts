/**
 * The short links made on this device, each kept as it is made: the link, what the document was called (nothing
 * for a locked one), and when it expires. Kept through kit/store.ts, so under Private they live for the visit
 * alone and under Saved they stay; turned Private again, they go with everything else. Expired ones drop out as
 * the list is read. A short link holds no secret but its key, which is the link itself: there is no owner.
 */
import { store } from './store.ts';

const KEY = 'tinyoffice.links';

export interface KeptLink {
  /** The short link. */
  link: string;
  title: string;
  /** When it was made, ms since the epoch. */
  made: number;
  /** When it expires, ms since the epoch, as the service said. */
  expires: number;
}

const read = (l: Partial<KeptLink>): KeptLink | null =>
  typeof l.link === 'string' && typeof l.expires === 'number' ? { link: l.link, title: String(l.title ?? ''), made: Number(l.made) || 0, expires: l.expires } : null;

/** The links kept here that have not yet expired, newest first. */
export function keptLinks(now = Date.now()): KeptLink[] {
  try {
    const all = JSON.parse(store.get(KEY) ?? '[]') as Partial<KeptLink>[];
    return all
      .map((l) => (l && typeof l === 'object' ? read(l) : null))
      .filter((l): l is KeptLink => !!l && l.expires > now)
      .sort((a, b) => b.made - a.made);
  } catch {
    return [];
  }
}

/** Keep one. */
export function keepLink(link: KeptLink) {
  const rest = keptLinks().filter((l) => l.link !== link.link);
  store.set(KEY, JSON.stringify([link, ...rest]));
}

/** Drop one from the list (the short link itself is untouched: it expires on its own). */
export function dropKept(link: string) {
  const rest = keptLinks().filter((l) => l.link !== link);
  if (rest.length) store.set(KEY, JSON.stringify(rest));
  else store.remove(KEY);
}
