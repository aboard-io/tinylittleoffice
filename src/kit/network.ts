/**
 * Every place on the web the site can reach, in one list: what each request is for, when it happens, what
 * it carries, and what stops it. Every module that asks the web takes its host from here (`origin`), so a
 * host named anywhere else in src/ fails test/network.test.ts; the Content-Security-Policy's connect-src
 * and img-src are written from the `csp` field (scripts/headers.ts), and docs/network.md and /network
 * (public/network.html) are written from the whole list by scripts/network-doc.ts. A document fetches
 * nothing from any other site: every request here is the site's own, the map's, or one the person asks for.
 *
 * A host is a name, a "*." name (every host under it), or "*": any https address, for a place the person
 * names (their own Mastodon server). Pure data: no DOM.
 */

/** When the request is made: only after the person taps something, while a thing is on the screen, or when they share. */
export type When = 'after a tap' | 'while shown' | 'on share';
/** The CSP directive a host is allowed by (connect-src, img-src); none: the browser never asks it from a page (a new tab). */
export type Directive = 'connect' | 'img';

export interface Reach {
  host: string;
  /** What the request is for, in one line. */
  what: string;
  when: When;
  /** What the request holds. */
  carries: string;
  /** The switch or the action that prevents it. */
  stops: string;
  /** The module that makes it. */
  by: string;
  csp?: readonly Directive[];
}

const compose = (host: string, what: string): Reach => ({
  host,
  what,
  when: 'on share',
  carries: 'The document’s title and its link, which is the whole document (it is in the link)',
  stops: 'Not choosing that service in Share; it opens in a new tab, which you then post from or close',
  by: 'kit/share.ts',
});

export const NETWORK = {
  site: {
    host: 'tinylittleoffice.com',
    what: 'The site’s own files: the apps, the fonts, the icon set’s chunk (loaded when the icon picker opens)',
    when: 'while shown',
    carries: 'Which file; never the document, which is after the "#" and stays in the browser',
    stops: 'Nothing to stop but not opening the site: these files are the app itself',
    by: 'the whole site',
  },
  tiles: {
    host: 'tile.openstreetmap.org',
    what: 'The map’s pictures (tiles) in the Trip Planner, asked directly as OpenStreetMap’s policy asks',
    when: 'while shown',
    carries: 'Which squares of the map are on the screen; no referrer',
    stops: 'Map, in the Trip Planner’s bar, turned off',
    by: 'apps/trip/editor.ts',
    csp: ['img'],
  },
  placeSearch: {
    host: 'nominatim.openstreetmap.org',
    what: 'Place search in the Trip Planner',
    when: 'after a tap',
    carries: 'The words searched for; no referrer',
    stops: 'Not searching: typing a stop’s place by hand asks no one',
    by: 'apps/trip/editor.ts',
    csp: ['connect'],
  },
  osm: {
    host: 'www.openstreetmap.org',
    what: 'The Trip Planner’s credit to OpenStreetMap under its map, a link',
    when: 'after a tap',
    carries: 'Nothing of the document: it opens OpenStreetMap’s copyright page in a new tab',
    stops: 'Not following the link',
    by: 'apps/trip/editor.ts',
  },
  tinier: {
    host: 'tinier.tinylittleoffice.com',
    what: 'Short links: made, opened, updated or forgotten',
    when: 'after a tap',
    carries: 'The long link encrypted here, which the service cannot read, and how long to keep it; the owner’s secret to update or forget it',
    stops: 'Not making a short link: the long link needs no one',
    by: 'kit/short.ts',
    csp: ['connect'],
  },
  source: {
    host: 'github.com',
    what: 'The site’s source: the repository, “Open source” at the home page’s foot; the commit this copy was built from and the threat model in full, in About; links',
    when: 'after a tap',
    carries: 'Which page of the source; it opens in a new tab, and nothing of the document goes with it',
    stops: 'Not following the link: the commit’s name comes from the site’s own /version.json',
    by: 'kit/home.ts, kit/drawer.ts, kit/version.ts',
  },
  maker: {
    host: 'aboard.com',
    what: 'Aboard, who made the site, named at the home page’s foot, a link',
    when: 'after a tap',
    carries: 'Nothing: it opens in a new tab, from the home page, where no document is open',
    stops: 'Not following the link',
    by: 'kit/home.ts',
  },
  bskyShare: compose('bsky.app', 'Bluesky’s compose box'),
  xShare: compose('x.com', 'X’s compose box'),
  linkedin: compose('www.linkedin.com', 'LinkedIn’s share box'),
  mastodon: compose('*', 'A Mastodon server’s compose box: the one you name'),
} as const satisfies Record<string, Reach>;

export type Place = keyof typeof NETWORK;

/** Every entry, in the order above. */
export const reaches = (): Reach[] => Object.values(NETWORK);

/** An entry's https origin, without a trailing slash. */
export const origin = (place: Place): string => `https://${NETWORK[place].host}`;

/** Whether `host` is one `pattern` names: the name itself, or any host under a "*." name. "*" names no host. */
export function hostMatches(pattern: string, host: string): boolean {
  host = host.toLowerCase();
  if (pattern === '*') return false;
  if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1));
  return host === pattern;
}

/** Whether a host is one the list names. */
export function listed(host: string): boolean {
  return reaches().some((r) => hostMatches(r.host, host));
}
