<!-- Generated from src/kit/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit: change the list or the script. -->

# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in `public/_headers` allows these places and no others, so a request
not on this list is refused by the browser itself.

## Every request the site can make

| Host | What | When | What it carries | What stops it | Made by | Allowed by |
| --- | --- | --- | --- | --- | --- | --- |
| `tinylittleoffice.com` | The site’s own files: the apps, the fonts, the icon set’s chunk (loaded when the icon picker opens) | while shown | Which file; never the document, which is after the "#" and stays in the browser | Nothing to stop but not opening the site: these files are the app itself | the whole site | `'self'` |
| `tile.openstreetmap.org` | The map’s pictures (tiles) in the Trip Planner, asked directly as OpenStreetMap’s policy asks | while shown | Which squares of the map are on the screen; no referrer | Map, in the Trip Planner’s bar, turned off | apps/trip/editor.ts | `img-src` |
| `nominatim.openstreetmap.org` | Place search in the Trip Planner | after a tap | The words searched for; no referrer | Not searching: typing a stop’s place by hand asks no one | apps/trip/editor.ts | `connect-src` |
| `www.openstreetmap.org` | The Trip Planner’s credit to OpenStreetMap under its map, a link | after a tap | Nothing of the document: it opens OpenStreetMap’s copyright page in a new tab | Not following the link | apps/trip/editor.ts | none: it opens in a new tab |
| `tinier.tinylittleoffice.com` | Short links: made, opened, updated or forgotten | after a tap | The long link encrypted here, which the service cannot read, and how long to keep it; the owner’s secret to update or forget it | Not making a short link: the long link needs no one | kit/short.ts | `connect-src` |
| `github.com` | The site’s source: the repository, “Open source” at the home page’s foot; the commit this copy was built from and the threat model in full, in About; links | after a tap | Which page of the source; it opens in a new tab, and nothing of the document goes with it | Not following the link: the commit’s name comes from the site’s own /version.json | kit/home.ts, kit/drawer.ts, kit/version.ts | none: it opens in a new tab |
| `aboard.com` | Aboard, who made the site, named at the home page’s foot, a link | after a tap | Nothing: it opens in a new tab, from the home page, where no document is open | Not following the link | kit/home.ts | none: it opens in a new tab |
| `bsky.app` | Bluesky’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| `x.com` | X’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| `www.linkedin.com` | LinkedIn’s share box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| any https address | A Mastodon server’s compose box: the one you name | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |

A document fetches nothing from any other site. A link in it is words that go somewhere when the reader
follows them; nothing in a document is drawn from another site's address.

## Why each of these is asked directly

- **The map.** Map tiles only while a map is on the screen; place search only when a search is tapped.
  They are asked directly: OpenStreetMap's usage policies are written for the browser that shows the map
  asking them directly, and a cache of ours in between would be the heavy, anonymous use they ask people
  not to make. The site sends no referrer.
- **Short links.** Only when a short link is made, opened, updated or forgotten; the service holds
  ciphertext it cannot read, whose key is in the short link's fragment, which browsers never send
  (tinier/tinier.ts).
- **Sharing to a service.** Share's Bluesky, Mastodon, X and LinkedIn open that service's own compose box in
  a new tab, with the title and the link in it: no script of theirs runs here. The link is the document, so
  whoever reads the post can read it. "Any https address" there is the Mastodon server the person names.
- **Fonts and icons.** Self-hosted, from the site itself; the full icon set is a chunk of the site's own,
  loaded when the icon picker opens.
- **Links.** A link in a document that leaves the site opens only after the reader is shown where it goes
  and says Go (kit/link-guard.ts), in a new tab with no referrer.

## Nothing else

No analytics, no error reporting, no fonts or scripts from a CDN, no tag manager, no fetch the person did
not cause. `test/network.test.ts` reads the source (`src/` and the shortener in `tinier/`) and fails
on any host that is not on this page, and on any analytics, error-reporting, font-CDN or tag-manager host
anywhere in the site.

## How this page is kept true

It is written from `src/kit/network.ts`, the one list of every host, by `scripts/network-doc.ts`
(`npm run docs:network`, which `npm run build` runs first); a test fails when the committed page is not
what the list says. Every module that asks the web takes its host from that list, so a new host cannot be
reached without appearing here. The policy's `connect-src` and `img-src` are written from the same list
(scripts/headers.ts), and `test/csp.test.ts` holds each host to the directive the list names and nothing
else; the policy has no `frame-src` or `media-src` of its own, so no frame, film or sound comes from
another site.
