/**
 * The owner links kept on this device: the one copy of "…/<id>#<key>.<o>" that lets a short link be updated
 * later, offered when a short link is made. Kept through kit/store.ts, so under Private they live for the
 * visit alone and under Saved they stay; turned Private again, they go with everything else. Expired ones
 * drop out as the list is read.
 */
import { store } from './store.ts';

const KEY = 'tinyoffice.links';

export interface KeptLink {
  /** The owner's link. */
  owner: string;
  title: string;
  /** When it was made, ms since the epoch. */
  made: number;
  /** When it expires, ms since the epoch. */
  expires: number;
}

/** The links kept here that have not yet expired, newest first. */
export function keptLinks(now = Date.now()): KeptLink[] {
  try {
    const all = JSON.parse(store.get(KEY) ?? '[]') as KeptLink[];
    return all.filter((l) => l && typeof l.owner === 'string' && l.expires > now).sort((a, b) => b.made - a.made);
  } catch {
    return [];
  }
}

/** Keep one (or the newer record of one already kept). */
export function keepLink(link: KeptLink) {
  const rest = keptLinks().filter((l) => l.owner !== link.owner);
  store.set(KEY, JSON.stringify([link, ...rest]));
}

/** Drop one from the list (the short link itself is untouched). */
export function dropKept(owner: string) {
  const rest = keptLinks().filter((l) => l.owner !== owner);
  if (rest.length) store.set(KEY, JSON.stringify(rest));
  else store.remove(KEY);
}

/** Whether this owner link is kept here. */
export const isKept = (owner: string) => keptLinks().some((l) => l.owner === owner);
