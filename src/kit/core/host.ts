/**
 * What an app asks of the page it is drawn in, rather than of the browser's address: where a document opens on its
 * own, and which document a pasted link names. The site is one host (its documents live in their links, on the site
 * the page is on); a page that holds an editor of its own is another, and sets these to its own (docs/library.md).
 * An app never reads `location` or `history` itself (test/lints.test.ts).
 *
 * The site's answers are the defaults here. Without a page (the API, the command line, a node test) a link is the
 * fragment alone, which the site's pages open.
 */
import { lookup } from './app.ts';
import { decodeDoc, encodeDoc, isSealed } from './codec.ts';
import { parseHash, routeHash, siteOf } from './route.ts';
import { LOCKED_LANG, lockedFence, placedLink } from '../share/locked.ts';

/** A document as a fence holds it: its app (or "locked", for a sealed one held by its link) and its text. */
export interface Placed {
  lang: string;
  body: string;
}

export interface Host {
  /**
   * The address a document opens at on its own, in its app: a placed document's Open in new tab, a slide's See
   * more, a hand-off. `display`: its pages to read (a deck's take-home link), in `lang` when one is given.
   */
  link(lang: string, body: string, opts?: { display?: boolean; lang?: string | null }): string;
  /** The document a link names, when the words are one: its app and text, a sealed one as its locked fence. */
  read(words: string): Placed | null;
}

/** The site this page is on ("https://tinylittleoffice.com/"), or '' where there is no page. */
const siteHere = (): string => (typeof location !== 'undefined' && location.origin !== 'null' ? siteOf(location.href, (id) => !!lookup.appOf(id)) : '');

/**
 * The site's answers, for the site at `site()`: a document opens at its own link there, and a link of any site names
 * its document. A page that shows the editors on an address of its own (the Storybook) gives the site's address here.
 */
export const siteHost = (site: () => string): Host => ({
  link: (lang, body, opts = {}) => (opts.display && lang !== LOCKED_LANG ? site() + routeHash(lang, encodeDoc(body), '', true, null, opts.lang ?? null) : placedLink(lang, body, encodeDoc, site())),
  read(words) {
    const s = words.trim();
    if (!/^https?:\/\/\S+#\/v\d+\//.test(s)) return null;
    const { app, payload } = parseHash(s.slice(s.indexOf('#')));
    if (!app || !lookup.appOf(app)) return null;
    // A link locked with a password goes in as itself (kit/share/locked.ts).
    if (isSealed(payload)) {
      const { lang, body } = lockedFence(app, payload) as Placed;
      return { lang, body };
    }
    const text = decodeDoc(payload);
    return payload && !text ? null : { lang: app, body: text };
  },
});

/** The host every app asks: the site's, until a page that holds an editor puts its own in (`Object.assign(host, …)`). */
export const host: Host = siteHost(siteHere);
