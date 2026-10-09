/**
 * The link: "#/v1/<app>/<payload>". The document lives after the "#", which a browser never sends to a
 * server. "#/v1/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it. "#/v1/<app>/<payload>?s=<id>&k=<key>&o=<o>" is how the owner of a
 * short link arrives from tinier (kit/short.ts): the query after the payload names the short link they may
 * update, and stays in the address while they edit; every link the shell shares is written without it.
 * "…?d" is the Display Link: the same document shown as its pages, to read or print, with an Edit button
 * (never inside the payload, so the document is the same bytes either way). tinier hands an owner on by
 * adding "?s=…" to whatever link it held, so "?d?s=…" reads as "?d&s=…".
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
  /** Shown as its pages to read (the Display Link), not opened in the editor. */
  display: boolean;
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/([^?]*))?(?:\?(.*))?$/;
const B64 = /^[A-Za-z0-9_-]+$/;

/** The owner's query, "s=<id>&k=<key>&o=<o>", read; null unless all three are there and well formed. */
function parseOwned(q: URLSearchParams): Owned | null {
  const id = q.get('s') ?? '', key = q.get('k') ?? '', o = q.get('o') ?? '';
  return /^[a-z0-9]{7}$/.test(id) && B64.test(key) && B64.test(o) ? { id, key, o } : null;
}

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) return { app: null, payload: '', version: LINK_VERSION, view: '', owned: null, display: false };
  const q = new URLSearchParams((m[5] ?? '').replace(/\?/g, '&'));
  return { app: m[2], payload: m[4] ?? '', version: parseInt(m[1], 10), view: m[3] ?? '', owned: parseOwned(q), display: q.has('d') };
}

/** The fragment for a document, optionally as a view; with `owned`, carrying the short link its owner may update; with `display`, the Display Link. */
export function routeHash(app: string, payload = '', view = '', owned: Owned | null = null, display = false): string {
  const parts = [...(display ? ['d'] : []), ...(owned ? [`s=${owned.id}`, `k=${owned.key}`, `o=${owned.o}`] : [])];
  const query = parts.length ? `?${parts.join('&')}` : '';
  return `${LINK}${app}${view ? '.' + view : ''}${payload ? '/' + payload : ''}${query}`;
}
