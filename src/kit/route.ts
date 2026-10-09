/**
 * The link: "#/v1/<app>/<payload>". The document lives after the "#", which a browser never sends to a
 * server. "#/v1/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it. Pure: the shell and the tests both read links through here.
 */

/** The version of the link format. 1 is the rebuilt format; nothing older is read. */
export const LINK_VERSION = 1;
/** What every document's link starts with, after the "#". */
export const LINK = `#/v${LINK_VERSION}/`;

export interface Route {
  /** The app's id, or null when the link is not a document (the home page). */
  app: string | null;
  payload: string;
  version: number;
  /** The view asked for ('' for the editor). */
  view: string;
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/(.*))?$/;

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) return { app: null, payload: '', version: LINK_VERSION, view: '' };
  return { app: m[2], payload: m[4] ?? '', version: parseInt(m[1], 10), view: m[3] ?? '' };
}

/** The fragment for a document, optionally as a view. */
export function routeHash(app: string, payload = '', view = ''): string {
  return `${LINK}${app}${view ? '.' + view : ''}${payload ? '/' + payload : ''}`;
}
