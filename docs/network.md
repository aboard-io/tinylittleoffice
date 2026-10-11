<!-- Generated from src/kit/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit: change the list or the script. -->

# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in `public/_headers` allows these places and no others, so a request
not on this list is refused by the browser itself.

## Every request the site can make

| Host | What | When | What it carries | What stops it | Made by | Allowed by |
| --- | --- | --- | --- | --- | --- | --- |
| `tinylittleoffice.com` | The site’s own files: the apps, the type (IBM Plex, a face when a page’s words need it), the icon set’s chunk (loaded when the icon picker opens) | while shown | Which file; never the document, which is after the "#" and stays in the browser | Nothing to stop but not opening the site: these files are the app itself | the whole site | `'self'` |
| `media.tinylittleoffice.com` | The picture proxy: every picture from the web, so its site never learns who is reading | while shown | The picture’s address, in ?u=; no cookie, no referrer, nothing of the document | A picture from a host not on the list waits for “Show pictures from the web”; a preview never asks | kit/media.ts pictureSrc | `img-src`, `connect-src` |
| any https address | A picture from a site not on the list, asked of the proxy (above), so the site sees the proxy | never until a switch | The picture’s address, to the proxy | “Show pictures from the web” (this document, this visit) or, under Saved, “Always show pictures from the web” in the menu: off by default | kit/pictures.ts | none: the proxy asks |
| `tile.openstreetmap.org` | The map’s pictures (tiles) in the Trip Planner, asked directly as OpenStreetMap’s policy asks | while shown | Which squares of the map are on the screen; no referrer | Map, in the Trip Planner’s bar, turned off | apps/trip/editor.ts | `img-src` |
| `nominatim.openstreetmap.org` | Place search in the Trip Planner | after a tap | The words searched for; no referrer | Not searching: typing a stop’s place by hand asks no one | apps/trip/editor.ts | `connect-src` |
| `tinier.tinylittleoffice.com` | Short links: made, opened, updated or forgotten | after a tap | The long link encrypted here, which the service cannot read, and how long to keep it; the owner’s secret to update or forget it | Not making a short link: the long link needs no one | kit/short.ts | `connect-src` |
| `public.api.bsky.app` | Who a Bluesky handle is, for a post’s frame | after a tap | The handle; no referrer | Not tapping the post’s card | kit/embeds.ts | `connect-src` |
| `*.wikipedia.org` | An article’s summary, for its card | after a tap | The article’s title; no referrer | Not tapping the article’s card | kit/embeds.ts | `connect-src` |
| `www.youtube-nocookie.com` | A YouTube video, from its privacy endpoint | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `player.vimeo.com` | A Vimeo video, with do-not-track set | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `embed.bsky.app` | A Bluesky post | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `platform.twitter.com` | A post on X, with do-not-track set | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `embed.reddit.com` | A Reddit post | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `archive.org` | A film or a recording on the Internet Archive | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `open.spotify.com` | A Spotify track, album, playlist or episode | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `w.soundcloud.com` | A SoundCloud track | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| `www.openstreetmap.org` | A place on OpenStreetMap; and the Trip Planner’s credit to it, a link | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts, apps/trip/editor.ts | `frame-src` |
| `codepen.io` | A CodePen | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| any https address | A thing on any server, by its address: a Mastodon post, a PeerTube video, a Wayback Machine page, a PDF | after a tap | What the address names (the video, the post, the song); no referrer, in a sandboxed frame | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `frame-src` |
| any https address | A sound or a film that is a file, played by the browser’s own player | after a tap | The file’s address; no referrer | Not tapping the card: until then it is the provider’s name and nothing is asked | kit/embeds.ts | `media-src` |
| `github.com` | The site’s source: the repository, “Open source” at the home page’s foot; the commit this copy was built from and the threat model in full, in About; links | after a tap | Which page of the source; it opens in a new tab, and nothing of the document goes with it | Not following the link: the commit’s name comes from the site’s own /version.json | kit/home.ts, kit/drawer.ts, kit/version.ts | none: it opens in a new tab |
| `aboard.com` | Aboard, who made the site, named at the home page’s foot, a link | after a tap | Nothing: it opens in a new tab, from the home page, where no document is open | Not following the link | kit/home.ts | none: it opens in a new tab |
| `bsky.app` | Bluesky’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| `x.com` | X’s compose box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| `www.linkedin.com` | LinkedIn’s share box | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |
| any https address | A Mastodon server’s compose box: the one you name | on share | The document’s title and its link, which is the whole document (it is in the link) | Not choosing that service in Share; it opens in a new tab, which you then post from or close | kit/share.ts | none: it opens in a new tab |

"Any https address" is a thing the person chose by its address: a post on their own Mastodon server, a
PeerTube video, a page in the Wayback Machine, a PDF or a sound file. It is asked only after a tap, in a
sandboxed frame that sends no referrer, or by the browser's own player.

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

`TRUSTED` in `src/kit/network.ts`, the entries with a reason. Each is a place that
serves public, static pictures under an open or stated licence, at addresses that do not change per reader.
Since the proxy fetches them, even such a host learns nothing of who reads the document; the list only
spares the reader a question for pictures that are this safe and this common. The proxy holds the same
list: a picture shown without asking is followed through its redirects only to hosts on it, so an open
redirect on one of them leads nowhere else.

| Host | Why |
| --- | --- |
| `media.tinylittleoffice.com` | The proxy itself: an address already its own |
| `upload.wikimedia.org` | Wikimedia Commons’ files: freely licensed, static, the most-used source of public pictures |
| `commons.wikimedia.org` | Commons’ own pages’ pictures (the same files, by another address) |
| `archive.org` | The Internet Archive’s files: public-domain and archived pictures |
| `ia*.us.archive.org` | The Internet Archive’s storage hosts (ia800….us.archive.org), where its download addresses lead |
| `images.unsplash.com` | Unsplash’s image CDN: pictures under the Unsplash licence |
| `images.pexels.com` | Pexels’ image CDN: pictures under the Pexels licence |
| `live.staticflickr.com` | Flickr’s static files: pictures with their licence stated, many Creative Commons |
| `raw.githubusercontent.com` | Files in public GitHub repositories: static, the address names the file |
| `user-images.githubusercontent.com` | Pictures in GitHub issues and READMEs |
| `*.githubusercontent.com` | GitHub’s other file hosts, the same kind of file |

A host is added when it serves public pictures at stable addresses with a stated licence and nothing on
the page it is part of. A host that serves pictures made for one reader (an email's images, an ad network,
a tracker) never is.

## Why each of the rest is asked directly

- **Things from the web (embeds).** A video, a post, a song, a map, a page by its address is a card until
  tapped (kit/embeds.ts). Tapped, it loads from the provider's privacy endpoint where there is one
  (youtube-nocookie.com), in a sandboxed frame that sends no referrer, or, for a sound or a film that is a
  file, through the browser's own element. A picture embedded this way comes through the proxy. Bluesky is
  asked who a handle is, and Wikipedia for an article's summary, only on that tap.
- **The map.** Map tiles only while a map is on the screen; place search only when a search is tapped.
  They are not proxied: OpenStreetMap's usage policies are written for the browser that shows the map
  asking them directly, and a cache of ours in between would be the heavy, anonymous use they ask people
  not to make. The site sends no referrer.
- **Short links.** Only when a short link is made, opened, updated or forgotten; the service holds
  ciphertext it cannot read, whose key is in the short link's fragment, which browsers never send
  (tinier/tinier.ts).
- **Sharing to a service.** Share's Bluesky, Mastodon, X and LinkedIn open that service's own compose box in
  a new tab, with the title and the link in it: no script of theirs runs here. The link is the document, so
  whoever reads the post can read it.
- **Fonts and icons.** Self-hosted, from the site itself: the type is IBM Plex (`public/fonts/`), each face
  fetched when a page's words need it, and the policy's `font-src` is `'self'` alone; the full icon set is a
  chunk of the site's own, loaded when the icon picker opens.
- **Links.** A link in a document that leaves the site opens only after the reader is shown where it goes
  and says Go (kit/link-guard.ts), in a new tab with no referrer.

## Nothing else

No analytics, no error reporting, no fonts or scripts from a CDN, no tag manager, no fetch the person did
not cause. `test/network.test.ts` reads the source (`src/`, the shortener in `tinier/` and the proxy in
`media/`) and fails on any host that is not on this page, and on any analytics, error-reporting,
font-CDN or tag-manager host anywhere in the site.

## How this page is kept true

It is written from `src/kit/network.ts`, the one list of every host, by `scripts/network-doc.ts`
(`npm run docs:network`, which `npm run build` runs first); a test fails when the committed page is not
what the list says. Every module that asks the web takes its host from that list, so a new host cannot be
reached without appearing here. The policy's `connect-src`, `img-src`, `frame-src` and `media-src` are
written from the same list (scripts/headers.ts), and `test/csp.test.ts` holds each host to the directive the
list names and nothing else.
