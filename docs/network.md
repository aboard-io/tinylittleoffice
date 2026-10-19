<!-- Generated from src/kit/core/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit: change the list or the script. -->

# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in `public/_headers` allows these places and no others, so a request
not on this list is refused by the browser itself.

## Every request the site can make

| Host | What | When | What it carries | What stops it | Made by | Allowed by |
| --- | --- | --- | --- | --- | --- | --- |
| `tinylittleoffice.com` | The site’s own files: the page, the app file (every app, the English words, the icons, the emoji and the math), its stylesheet, an app’s templates when its list opens, a language when a page is in it, and the type (IBM Plex, a face when a page’s words need it), each fetched once and kept a year | while shown | Which file; never the document, which is after the "#" and stays in the browser | Nothing to stop but not opening the site: these files are the app itself | the whole site | `'self'` |
| `tinylittleoffice.com` | The service worker, /sw.js, with Save in browser on: it keeps the pages, the app file, its stylesheet, the Latin faces and each file a page fetches after, so the site opens offline | after a tap | Which file, as the pages ask; never the document, which is after the "#" and never reaches the worker, and never a shared link’s "/c/<id>" page with its card | Save in browser, turned off: the worker is unregistered and everything it kept is deleted; while it is off there is none | kit/share/offline.ts, sw.ts | `'self'` |
| `tinylittleoffice.com` | A preview card, at the site’s own /card: posted when you share with a network (Bluesky, Mastodon, X, LinkedIn or the share sheet) with “Show a preview of the first page” on; fetched later by that network | on share | A picture of the first page, the title and the first words, kept readable for a month so the network can fetch them; never the document, never its link | The switch “Show a preview of the first page” in Share, turned off; Edit link, Present link and Email never make one, nor does a document with a password | kit/share/card.ts | `'self'` |
| `tiles.openfreemap.org` | The Trip Planner’s map: its style, its vector tiles, its sprites and its fonts, from OpenFreeMap (made for this; no key, no limit), drawn here by MapLibre, which is fetched with the first map and is never part of the app file | while shown | Which squares of the map are on the screen, and no referrer (the site sends none, and OpenFreeMap asks for none); nothing of the document | Map, in the Trip Planner’s bar, turned off: no map then asks for them; the home page’s pictures of the templates never do | apps/trip/editor.ts | `connect-src` |
| `tile.openstreetmap.org` | The pictures (tiles) under a trip’s map drawn anywhere but the Trip Planner itself (a slide, a page, an item, a card, an export), asked directly as OpenStreetMap’s policy asks: only the tiles its box needs; a picture made of that map (a card, a PDF, a PNG, a PowerPoint) asks them again to write them into it | while shown | Which squares of the map are on the screen or in the picture, and the site’s name as the referrer (the origin alone, as OpenStreetMap’s tile policy asks of a web page; never the page’s path or anything of the document) | Map, in the Trip Planner’s bar, turned off: no map then asks for them, anywhere a trip is drawn; the home page’s pictures of the templates never do | apps/trip/view.ts, kit/draw/raster.ts | `img-src`, `connect-src` |
| `nominatim.openstreetmap.org` | Place search in the Trip Planner | after a tap | The words searched for, and the site’s name as the referrer (the origin alone, as Nominatim’s usage policy asks of an application; never the page’s path or anything of the document) | Not searching: typing a stop’s place by hand asks no one | apps/trip/editor.ts | `connect-src` |
| `www.openstreetmap.org` | The credit to OpenStreetMap under the Trip Planner’s map (with OpenMapTiles’ and OpenFreeMap’s) and in the corner of a trip’s map drawn on its tiles, a link | after a tap | Nothing of the document: it opens OpenStreetMap’s copyright page in a new tab | Not following the link | apps/trip/editor.ts, apps/trip/view.ts | none: it opens in a new tab |
| `tinier.tinylittleoffice.com` | Short links: made or opened | after a tap | The long link encrypted here, which the service cannot read, and how long to keep it | Not making a short link: the long link needs no one | kit/share/short.ts | `connect-src` |
| `github.com` | The site’s source: the repository, “GitHub” at the home page’s foot; the commit this copy was built from, in About; links | after a tap | Which page of the source; it opens in a new tab, and nothing of the document goes with it | Not following the link: the commit’s name comes from the site’s own /version.json | kit/ui/home.ts, kit/ui/drawer.ts, kit/core/version.ts | none: it opens in a new tab |
| `aboard.com` | Aboard, who made the site, named at the home page’s foot and in About, a link | after a tap | Nothing: it opens in a new tab, and nothing of the document goes with it | Not following the link | kit/ui/home.ts, kit/ui/drawer.ts | none: it opens in a new tab |
| `bsky.app` | Bluesky’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share/share.ts | none: it opens in a new tab |
| `x.com` | X’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share/share.ts | none: it opens in a new tab |
| `www.linkedin.com` | LinkedIn’s share box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share/share.ts | none: it opens in a new tab |
| any https address | A Mastodon server’s compose box: the one you name | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share/share.ts | none: it opens in a new tab |

A document fetches nothing from any other site but a trip's map (OpenFreeMap's in the Trip Planner, OpenStreetMap's
tiles under a trip drawn anywhere else), by the Map switch. A link in it is
words that go somewhere when the reader follows them; nothing else in a document is drawn from another site's
address. A picture a host keeps (an `image` fence naming the host's reference, src/doc/image.ts) is drawn on the site
as a card with its words, since the site keeps no bytes and its host has no pictures: nothing is fetched for it. A
page of a host that keeps pictures fetches them from that host's own address, which that page's own
Content-Security-Policy allows; the site's policy stays as it is.

## Why each of these is asked directly

- **The map.** The Trip Planner's map comes from OpenFreeMap only while it is on the screen (its style, its vector
  tiles, its sprites and its fonts; MapLibre draws them here, fetched with the first map, never part of the app
  file; OpenFreeMap is made for this, with no key and no limit, and asks for no referrer); place search only when a
  search is tapped. A trip drawn on a slide, a page, an outline's item, a card or in an export is drawn on OpenStreetMap's tiles,
  at the zoom that fits its places: only the tiles its box needs (a handful, never a whole zoom level),
  nothing fetched ahead. A picture made of it (a card, a PDF, a PNG, a PowerPoint) fetches those tiles
  again to write them into the picture. The home page's pictures of the templates are drawn without them,
  so a visitor who has not opened a trip tells OpenStreetMap nothing, and Map in the Trip Planner's bar,
  turned off, turns them off everywhere. They are asked directly, by the browser with its own name:
  OpenStreetMap's usage policies are written for the browser that shows the map asking them directly, and
  a cache of ours in between would be the heavy, anonymous use they ask people not to make; nothing keeps
  them but the browser's own cache. The site sends no referrer.
- **Short links.** Only when a short link is made or opened; the service holds
  ciphertext it cannot read, whose key is in the short link's fragment, which browsers never send
  (backends/tinier/tinier.ts).
- **A preview.** Only when a person shares with a network from Share with "Show a preview of the first page" on:
  a picture of the first page, the title and the first words go to the site's own `/card`, and the link
  shared carries the card's id in its path (`/c/<id>`, before the "#"): the one page the site's Worker serves, the
  app's page with the card's tags, which the shell moves to the app's own address as it opens. The card is kept
  readable for a month, then forgotten (backends/cards/cards.ts); the document and its link are never sent.
- **Sharing to a service.** Share's Bluesky, Mastodon, X and LinkedIn open that service's own compose box in
  a new tab, with the title and the link in it: no script of theirs runs here. The link is the document, so
  whoever reads the post can read it. "Any https address" there is the Mastodon server the person names.
- **Fonts and icons.** Self-hosted, from the site itself: the type is IBM Plex (`public/fonts/`), each face
  fetched when a page's words need it, and the policy's `font-src` is `'self'` alone; the icons and the emoji
  are in the site's own app file.
- **Offline.** With Save in browser on, the site's service worker (`/sw.js`, from `src/sw.ts`) keeps the
  site's own files on the device: the home page and one for each app, the app file, its stylesheet, the manifest
  and icons and the Latin faces when it is installed, and each file a page fetches afterwards (an app's templates,
  a language, a face). It asks only the site, and only for its files; a page is asked of the network first, so a
  visit online is never stale. It never keeps a document (the document is after the "#", which never reaches it)
  nor a shared link's `/c/<id>` page. Turning Save in browser off unregisters it and deletes everything it kept; while
  it is off nothing registers.
- **Links.** A link in a document that leaves the site opens only after the reader is shown where it goes
  and says Go (kit/ui/link-guard.ts), in a new tab with no referrer.

## Nothing else

No analytics, no error reporting, no fonts or scripts from a CDN, no tag manager, no fetch the person did
not cause. `test/network.test.ts` reads the source (`src/` and the services in `backends/`) and fails
on any host that is not on this page, and on any analytics, error-reporting, font-CDN or tag-manager host
anywhere in the site.

## How this page is kept true

It is written from `src/kit/core/network.ts`, the one list of every host, by `scripts/network-doc.ts`
(`npm run docs:network`, which `npm run build` runs first); a test fails when the committed page is not
what the list says. Every module that asks the web takes its host from that list, so a new host cannot be
reached without appearing here. The policy's `connect-src` and `img-src` are written from the same list
(scripts/headers.ts), and `test/csp.test.ts` holds each host to the directive the list names and nothing
else; the policy has no `frame-src` or `media-src` of its own, so no frame, film or sound comes from
another site.
