# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in `public/_headers` allows these places and no others, so a request
not on this list is refused by the browser itself.

(This page is written by hand for now. docs/transparency.md §1 item 1 asks that it be generated from the
code, with `test/network.test.ts` checking the built site against it. When that is built, the picture proxy
below is one of its hosts: `img-src` and `connect-src` already take it from `scripts/headers.ts`.)

## Pictures from the web: the proxy at media.tinylittleoffice.com

A document can hold a picture by its address on another site. If the reader's browser fetched it from that
site, the site would learn who read the document, from where and when: a tracking pixel. So the site never
fetches a web picture from its own site. Every picture from an https address is asked of
**media.tinylittleoffice.com** (`media/` in this repository, a Cloudflare Worker), which fetches it once,
keeps it at the edge for a week, and hands it back. The picture's site sees Cloudflare, not the reader.

- **When:** a picture from a host on the list below shows at once. A picture from any other host waits for
  "Show pictures from the web", which names the host (kit/pictures.ts); a picture the author put in during
  this visit shows at once; under Saved, a switch in the menu shows them always. A preview or a thumbnail
  never fetches one.
- **What it carries:** the picture's address, in `?u=`. No cookie, no referrer, nothing of the document.
  The proxy passes nothing of the reader's request on, and keeps no log (observability is off; the Worker
  has no console call; a test holds it to that). Its rate limiter counts per address, in memory.
- **What it refuses:** an address that is not https on the default port with a public name (400); more
  than three redirects, or a redirect somewhere it would not go (502); anything that does not say it is a
  picture (415; SVG only as `image/svg+xml`, served under a policy that lets it run nothing); more than
  5 MB (413, cut off as it streams); a site that does not answer within ten seconds (502).
- **Exports:** a PDF, a picture or a web page made from a document holds each picture's bytes, fetched
  through the proxy when the file is made, so reading the file asks no one anything.
- **Self-hosting:** `VITE_MEDIA_URL` at build time names your own copy of the proxy (`npm run deploy`
  deploys `media/` beside the site). Set it empty and there is no proxy: pictures load from their own sites,
  every host waits to be asked for, and the policy's `img-src` becomes `https:`.

### The hosts whose pictures show at once

`src/kit/media.ts` `TRUSTED`. Each is a place that serves public, static pictures under an open or stated
licence, at addresses that do not change per reader. Since the proxy fetches them, even such a host learns
nothing of who reads the document; the list only spares the reader a question for pictures that are this
safe and this common.

| Host | Why |
|---|---|
| `upload.wikimedia.org` | Wikimedia Commons' files: freely licensed, static, the most-used source of public pictures |
| `commons.wikimedia.org` | Commons' own pages' pictures (the same files, by another address) |
| `archive.org`, `*.archive.org` | The Internet Archive's files and its storage hosts (`ia800…us.archive.org`): public-domain and archived pictures |
| `images.unsplash.com` | Unsplash's image CDN: pictures under the Unsplash licence; the Website Builder's templates use it |
| `images.pexels.com` | Pexels' image CDN: pictures under the Pexels licence |
| `live.staticflickr.com` | Flickr's static files: pictures with their licence stated, many Creative Commons |
| `raw.githubusercontent.com`, `user-images.githubusercontent.com`, `*.githubusercontent.com` | Files in public GitHub repositories and pictures in issues and READMEs: static, the address names the file |
| `media.tinylittleoffice.com` | The proxy itself: an address already its own |

A host is added when it serves public pictures at stable addresses with a stated licence and nothing on
the page it is part of. A host that serves pictures made for one reader (an email's images, an ad network,
a tracker) never is.

## Everything else

- **Things from the web (embeds).** A video, a post, a song, a map, a page by its address is a card until
  tapped (kit/embeds.ts). Tapped, it loads from the provider's privacy endpoint where there is one
  (youtube-nocookie.com), in a sandboxed frame that sends no referrer, or, for a sound or a film that is a
  file, through the browser's own element. A picture embedded this way comes through the proxy. Bluesky is
  asked who a handle is, and Wikipedia for an article's summary, only on that tap.
- **The map.** Map tiles from `tile.openstreetmap.org`, only while a map is on the screen; place search
  from `nominatim.openstreetmap.org`, only when a search is tapped. They are not proxied: OpenStreetMap's
  usage policies are written for the browser that shows the map asking them directly, and a cache of ours
  in between would be the heavy, anonymous use they ask people not to make. The site sends no referrer.
- **Short links.** `tinier.tinylittleoffice.com`, only when a short link is made, opened, updated or
  forgotten; it holds ciphertext it cannot read (tinier/tinier.ts).
- **Fonts and icons.** Self-hosted, from the site itself; the full icon set is a chunk of the site's own,
  loaded when the icon picker opens.
- **Nothing else.** No analytics, no error reporting, no fonts or scripts from a CDN.
