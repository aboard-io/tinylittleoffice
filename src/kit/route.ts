/**
 * The link: "#/v1/<app>/<payload>". The document lives after the "#", which a browser never sends to a
 * server. "#/v1/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it. "#/v1/<app>/<payload>?s=<id>&k=<key>&o=<o>" is how the owner of a
 * short link arrives from tinier (kit/short.ts): the query after the payload names the short link they may
 * update, and stays in the address while they edit; every link the shell shares is written without it.
 * Pure: the shell and the tests both read links through here.
 */

/** The version of the link format. 1 is the rebuilt format; nothing older is read. */
export const LINK_VERSION = 1;
/** What every document's link starts with, after the "#". */
export const LINK = `#/v${LINK_VERSION}/`;

/** A short link this document's owner may update: its id, the AES key, and the owner key o. All three base64url. */
export interface Owned {
  id: string;
  key: string;
  o: string;
}

export interface Route {
  /** The app's id, or null when the link is not a document (the home page). */
  app: string | null;
  payload: string;
  version: number;
  /** The view asked for ('' for the editor). */
  view: string;
  /** The short link this document arrived from as its owner, or null. */
  owned: Owned | null;
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/([^?]*))?(?:\?(.*))?$/;
const B64 = /^[A-Za-z0-9_-]+$/;

/** The owner's query, "s=<id>&k=<key>&o=<o>", read; null unless all three are there and well formed. */
function parseOwned(query: string | undefined): Owned | null {
  if (!query) return null;
  const q = new URLSearchParams(query);
  const id = q.get('s') ?? '', key = q.get('k') ?? '', o = q.get('o') ?? '';
  return /^[a-z0-9]{7}$/.test(id) && B64.test(key) && B64.test(o) ? { id, key, o } : null;
}

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) return { app: null, payload: '', version: LINK_VERSION, view: '', owned: null };
  return { app: m[2], payload: m[4] ?? '', version: parseInt(m[1], 10), view: m[3] ?? '', owned: parseOwned(m[5]) };
}

/** The fragment for a document, optionally as a view; with `owned`, carrying the short link its owner may update. */
export function routeHash(app: string, payload = '', view = '', owned: Owned | null = null): string {
  const query = owned ? `?s=${owned.id}&k=${owned.key}&o=${owned.o}` : '';
  return `${LINK}${app}${view ? '.' + view : ''}${payload ? '/' + payload : ''}${query}`;
}
