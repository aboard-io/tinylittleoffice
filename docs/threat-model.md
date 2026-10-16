# Threat model

What Tiny Little Office protects against, what it does not, and which part of the design answers which
threat. Written for someone deciding whether to trust it with something. Where a protection depends on a
condition, the condition is stated. The crypto is described byte by byte in `docs/crypto/`; every request
the site can make is listed in `docs/network.md`.

## The shape of it

A document is its link. The whole of it, compressed, sits after the `#` of
`https://tinylittleoffice.com/<app>/#/v1/<app>/<payload>`, and a browser never sends the part after `#` to
any server. The site is static files on Cloudflare; there is no account, no database of documents in the
clear and no server code that receives one. One service exists besides the files: the short-link service
(`tinier/`), and nothing else of ours; it holds a document only when someone makes a short link, encrypted
under a key it never receives, until the link expires. The site's own small Worker (`site/`) keeps one thing more,
only when a person asks: a preview card, below. Everything else the site can reach belongs to someone else and is reached only
while a person uses it or after they ask (the map, a share), as `docs/network.md` lists.

Two consequences follow, and the rest of this page is mostly their detail:

- **Whoever has the link has the document.** That is the design, not a flaw in it. Everything that holds
  the link (a chat, an email, a browser's history, a person) holds the document, unless it has a password.
  A link made after a language was chosen in the menu also carries that language (`?lang=ht`), so it says
  which language its maker chose; one made by someone who never chose carries none.
- **Whoever serves the code can read the document.** The page that reads the fragment is code the site
  sends. The host cannot see a document while it serves the code in this repository; a host that served
  other code (compromised, coerced, or simply changed) could send the fragment anywhere. The answer to that
  is being able to check that the live site is this repository's build: a build is reproducible, the site
  names the commit it was built from in `/version.json`, and `npm run verify-deploy` builds that commit and
  compares every file (Checking it yourself, below). Short of someone checking, this is trust in the operator.

What is kept, and where: Save in browser is off by default, and then nothing is kept on the device (but two preferences that say
nothing of a document, below) and nothing on any server; the link is the document. Turning it on is a choice, and keeps documents and short links on the device, in the browser's own
storage, never on a server. It also keeps the site itself for offline: a service worker (`src/sw.ts`, registered by
`src/kit/share/offline.ts`) keeps the site's own files in the browser's cache (the pages, the app file and its
stylesheet, the Latin faces, and each templates file, language or face a page fetches afterwards), never a document,
which is after the "#" and never reaches it, and never a shared link's `/c/<id>` page with its card's words. Turning Save in
browser off unregisters the worker and deletes its caches; while it is off none is registered. A short link is the one thing a server holds of a document: the document, encrypted with a key the
server never sees, until it expires.

**A preview card is readable on the server, by the person's choice.** Sharing with a network from Share (Bluesky,
Mastodon, X, LinkedIn or the device's share sheet) with "Show a preview of the first page" on, which it is unless
turned off, sends a picture of the document's first page, its title and its first 200 characters to the site's
`/card`, and the link shared carries the card's id in its path (`/c/<id>`, before the `#`): the one page the site's
Worker serves, the app's page with the card's tags, which the shell moves to the app's own address as it opens. The
card is not encrypted, because the network must read it: it is kept readable for a month, to anyone with its id,
then deleted. (Until 2026-10-15 the id rode as `?c=` on the app's page and the Worker ran for every page, past the
free plan's requests a day on launch day; such a link still opens, the shell reading the hash, and previews as the
app's card.) The document itself and its link are never sent. Edit link, Present link and Email make no card, nor does a
document with a password. A link with no card previews as its app's generic card, whose page is gray shapes.

There is no shared document: every link is a copy. Whoever opens one has their own, and what they change is in
their link, never in the sender's; Share says so under the link, in every language.

## What it protects against

**The host learning a document.** The document is in the fragment, which the browser keeps to itself; the
host gets requests for the same static files every visitor gets. The site sends `Referrer-Policy:
no-referrer`, so a link followed out of a document does not carry the document's address with it. Conditions:
the code is this repository's (above), and the person did not choose a feature that sends something (a
short link sends ciphertext; see below).

**The short-link service reading a document.** A short link is the long link encrypted in the browser with
AES-256-GCM under a random key that travels only in the short link's own fragment
(`…/<id>#<key>`). The service stores the ciphertext, an IV and an expiry, and cannot decrypt any of it. It
can see that a link was made, when, from which address, and how long the ciphertext is. Details:
`docs/crypto/short-links.md`. The same condition applies: the page at `tinier.tinylittleoffice.com/<id>` that
decrypts is served by the service.

**Someone changing or recalling a short link.** Nobody can, its maker included: a short link cannot be
changed or recalled once made, and expires on its own (Paul, 2026-10-11). There is no update and no delete,
and so no secret beside the document in anyone's address bar to give that power away.

**A shared link altered on the way.** A document with a password is authenticated by AES-GCM's tag: a
changed byte, a cut-short link or a forged payload does not open, and says nothing about why. Someone who knows
the password can of course write a new sealed document. A document without a password has no protection
against alteration: anyone who passes it on can change it.

**A scam link inside a document.** Words in a document can say one address and link to another. No link that
leaves the site opens without first showing, large, the site it goes to and the whole address, with Cancel
as the default (`src/kit/ui/link-guard.ts`); a link to anything but a web page, an email address or a phone
number never opens. A document never runs code, and nothing in one is drawn as a
page of its own. The address is drawn left to
right, set apart from the words around it, in every language, and an email address or a phone number that hides
reversing or invisible characters is refused rather than drawn. This shows where a link goes; it does not judge
whether the place is honest.

**A tracking picture inside a document.** A document fetches nothing from any other site but a trip's map tiles
(by the Map switch; The map's provider, below): there are no pictures from the web and no embeds, so it cannot hold a tracking pixel. Markdown's picture line reads as a
link, which asks before it opens (above).

**A lost phone with Save in browser on.** Off is the default and writes nothing to the device but two preferences
that say nothing of a document: the size of everything (`tinyoffice.size`) and the theme (`to-theme`), both
cleared by Delete everything. Nothing is written to the device for the language, in either state: the link
carries it. With Save in browser on, the
device keeps the preferences, the documents opened there (`src/kit/share/library.ts`),
the short links made there, and the site's own files for offline (which say nothing of any document). A document under a password is kept as its
ciphertext with no title and no first words, so the library does not give away even its name. Nothing else
is encrypted by Tiny Little Office: the rest is as safe as the phone's lock and the operating system's own
storage encryption. See the next section for what that leaves open.

**Telemetry.** There is none: no analytics, no error reporting, no fonts or scripts from another site. The
Content-Security-Policy's `connect-src` and `img-src` name the only places the browser will let the site
reach, and it has no `frame-src` or `media-src` of another site's (`public/_headers`, held by
`test/csp.test.ts`), and the pages are served `no-transform` so Cloudflare does not add its analytics beacon
(which the policy would block anyway): the site's pages, its `/c/` card pages, and the short link's landing page on
tinier. Two of Cloudflare's zone settings write scripts into pages no header stops, and both are kept off in the
dashboard: Web Analytics, and Bot Fight Mode's JavaScript detections (Security → Bots), whose
`/cdn-cgi/challenge-platform/` script was found on the short link's landing page on 2026-10-16.

## What it does not protect against

**Someone you gave the link to passing it on.** A link is a copy of the document. It cannot be recalled. A
short link cannot be recalled either: it expires on its own, and whoever opened it has the long link in their
address bar.

**Everything the link passes through.** A chat service, an email provider, a link-preview robot, a
clipboard manager, a note-taking app: each holds the document if it holds the link. A password is the
answer, and only if the password is not sent the same way.

**The browser's own history and sync.** The address bar holds the document, so the browser's history does,
and so does its sync service if that is on. Save in browser, on or off, does not change what the browser itself records.
The address is written when typing stops for fifteen seconds and whenever the page is hidden or the link is read, so a
browser that records each address holds a state of the document per pause and not per keystroke; a password is still
the only thing that keeps the content from history.

**A compromised device, browser or extension.** An extension allowed to read the site's pages reads the
document as it is shown, and the password as it is typed. So does malware on
the device. Nothing in a web page can defend against the browser it runs in.

**A password sent with the link.** The link carries everything needed to try passwords offline, at the
attacker's own speed, with no limit and no lockout, but there is nothing likely to try: since 2026-10-11 every
password is made by the app (about 116 random bits; nobody can set a weak one), so the key is one HKDF pass
and not a slow hash (`docs/crypto/password.md` says why that is sound). What remains is the person: a password
sent in the same message as its link protects nothing, which the Password dialog says.

**A screenshot**, a photograph of the screen, a printout, an export. Once shown, it is shown.

**The size of a document.** Encryption hides the words, not their number: a password's ciphertext and a short
link's are as long as the compressed document plus a fixed overhead.

**Which app a document is.** The app's name is in the path (`/text/`), which the host sees, and in the
route (`#/v1/text/…`). A password's tag does not cover it: someone who changes a sealed
link's app name changes what opens it, not what it says.

**The shortener, to a stranger.** It is a store of up to 16 KB of opaque bytes per link, a hundred links a
day per address, kept up to a month, readable by whoever has the id, and never opened anywhere but the site:
its page decrypts only a link to Tiny Little Office and goes nowhere else. It cannot tell a document from any
other ciphertext, so someone could keep other bytes there; the limits are what bound it, and many addresses
make many hundreds.

**A lost phone, in full.** With Save in browser on, a person holding the unlocked phone can read every document in the
library that has no password, and open the short links made there while they last. There is no remote wipe.
Turning Save in browser off (from the phone) removes all of it.

**The map's provider.** The Trip Planner's map is OpenFreeMap's (its style, vector tiles, sprites and fonts, drawn
here by MapLibre, which is fetched with the first map and is never part of the app file; since 2026-10-15, on issue
#4), asked directly while the map is shown, with no referrer; place search goes to OpenStreetMap's Nominatim when a
search is tapped, and a trip drawn anywhere else (a slide, a page, a card, an export) is drawn on OpenStreetMap's
tiles, each naming the site as its referrer, the origin alone, as OpenStreetMap's usage policies ask (never the page's
path or anything of the document; `docs/network.md` says why), all by the Trip Planner's Map switch. Those requests
carry the reader's address to OpenFreeMap or OpenStreetMap, and which squares of the world the map shows.

**The operator and the platform themselves.** See "What the host can see"; and above, the code.

## Each design choice, and the threat it answers

| Choice | Threat |
|---|---|
| The document in the fragment, not the path or a query | The host, its logs and every proxy on the way learning the document |
| No accounts, no server storage of documents, except a short link's encrypted document, which the server cannot read and forgets when the link expires | A breach, a subpoena or a leak of stored documents: there are none to give but the ciphertext of short links not yet expired, without their keys |
| Save in browser off by default; on only when switched on, and switched off erases | A shared or lost device holding what was done on it |
| Password: made by the app (about 116 random bits; none typed to set one), its key one HKDF-SHA-256 pass with a random salt; AES-256-GCM with a fresh IV per edit | The link's holders, and anything it passes through, reading a document they were not told the password of; alteration of a sealed document; a weak password chosen by a person |
| A password never stored; the key held in memory for the visit, non-extractable | A device or a backup giving the password away |
| A sealed document kept in the library with no title or first words | The library telling what a sealed document is |
| A locked document's title reaches nothing but its own page: not the tab title or history, the library, a kept short link, a post, the embed, the QR file, or the share sheet (which gets no picture either) | History, tab sync and the apps a link is shared to telling what a sealed document is |
| Short link: AES-256-GCM, the key only in the fragment | The short-link service reading documents |
| Short links cannot be changed or recalled: no update, no delete, no key that could do either | A short link replaced under the people it was sent to; a key to replace it copied out of an address bar |
| Short links expire (an hour to a month) and are swept hourly | Ciphertext kept indefinitely by a service |
| A hundred links a day per address, counted under a keyed hash kept two days | The shortener used as free storage by a stranger; a record of who made links |
| No logs in the site or the shortener (observability off, no console calls, tests hold both) | A record of who asked for what |
| The link guard before every link that leaves | A scam link disguised by its words |
| No app draws a document as a web page of its own: a document never runs code | A phishing page served from our own domain |
| A document fetches nothing from any other site but a trip's map tiles (by the Map switch): no pictures from the web, no embeds | Tracking pixels; a picture's or an embed's site learning who reads |
| Content-Security-Policy listing every host; no third-party scripts or fonts | Telemetry, and code injected through a document running at all |
| WebCrypto, no crypto library | A dependency's bug or compromise in the part that matters most; and code a reader can check in an hour |

## What the host can see

The site and the shortener run on Cloudflare, on one account. Cloudflare terminates TLS, so
whatever reaches any of them, Cloudflare and the account's operator could see.

- **The site.** Requests for the static files: the reader's IP address, the time, the user agent, the
  path (which names the app: `/sheet/`), and the files the page then loads. Not the fragment, so never the document, its title or its password.
  Cloudflare keeps its own aggregate traffic counts for the account, as for any site it serves; per-request
  Worker logs are off (`wrangler.jsonc`, held by `test/tinier.test.ts`).
- **The cards.** For each preview a person chose to send: the picture, the title, the first words and the app, in
  the shortener's D1 database for a month, readable at `/card/<id>.png` and in the tags of the shared link's page,
  `/c/<id>`; counted against the same hundred a day from one address, under the site Worker's own `BRAKE_KEY`.
- **The shortener.** For each short link: the ciphertext, its IV and its expiry, kept in Cloudflare D1
  until it expires. For two days, for each address that made a link: a count, under
  `sha256(BRAKE_KEY ‖ day ‖ address)`, where `BRAKE_KEY` is a secret of the deployment (a Worker secret,
  never in the repository). Without the key the row says nothing of the address; with it, only that the
  address made links that day, and how many. The IP address of each request is seen for the length of the
  request and not written down. Never the key, so never the long link. D1 keeps its own point-in-time
  history of the database for a limited window (Cloudflare's Time Travel); a row deleted from the table can
  be restored from that history by the account's operator until the window passes. Details:
  `docs/crypto/short-links.md`.

What none of them can see: a document's words, a password, who a link was sent to, or that a
given person opened a given document, beyond the timing and address of requests that a person could try to
match up.

## Checking it yourself

None of this is meant to be taken on trust. The strongest fact is architectural: no server holds documents, so
there is nothing to breach, subpoena or leak but the ciphertext of short links not yet expired. Everything here
makes the rest checkable by a stranger, and a test holds each.

- **What leaves your browser.** A page, `docs/network.md` and `/network` on the site (plain HTML, no script),
  generated from the code: every request the site can make, when it happens, what it carries, and what stops it.
  `src/kit/core/network.ts` is the one list of every host the site can reach (what, when, what it carries, what
  stops it, the module, the CSP directive); every module that asks the web takes its host from it.
  `scripts/network-doc.ts` (`npm run docs:network`, run first by `npm run build`) writes the two pages, and
  `scripts/headers.ts` writes `connect-src` and `img-src` from the list (`test/csp.test.ts`: every host in its
  directive and nothing else). Builds are not run in tests, so `test/network.test.ts` reads the source (`src/`,
  `tinier/`) instead of the built site: every host must be on the list (or localhost, or an XML namespace), `src/`
  names hosts only through the list, and the committed page must be what the list says.
- **No telemetry, asserted.** No analytics, no error reporting, no fonts from a CDN, no fetch the person did not
  cause: `test/network.test.ts` fails on any analytics, error-reporting, font-CDN, tag-manager or
  session-recording host (a deny-list of 22) anywhere in `src/`, `tinier/`, `public/`, `index.html`,
  `vite.config.ts` and `wrangler.jsonc`.
- **Reproducible, attested builds.** Two builds of one commit are the same bytes: `scripts/reproducible.ts`
  (`npm run build:verify`) builds it twice in fresh checkouts at different paths and depths (`scripts/builds.ts`),
  hashes every file and prints the first difference, and compares this checkout's `dist/` too when it is that
  commit's build; CI runs it after its build. The build writes `dist/version.json` (`scripts/version.ts`: the
  commit, its tag or "", the commit's own date in UTC, the policy's script hashes; the shape is
  `src/kit/core/version.ts`), checked by `scripts/check-build.ts`; About reads it when it opens and says "Running
  commit abc1234", a link to the commit on GitHub, and the home page's foot ends with the tag or the commit.
  `scripts/verify-deploy.ts` (`npm run verify-deploy -- <url> [commit]`) reads the site's `/version.json`, builds
  that commit in a fresh checkout (or uses `dist/` when it is that build), fetches every file but `_headers`, and
  prints a table; exit 1 on any difference. A deploy is a tag `v*`, run on a public GitHub runner with a public
  log, which checks the live site against the build, builds the tag again, attests `dist/**` and a byte-stable
  archive of it (`actions/attest-build-provenance`), and makes the release with notes naming the commit and the
  policy's script hashes (`scripts/release-notes.ts`). Every action is pinned by its commit hash, never a tag
  (`test/deploy.test.ts`). `docs/self-host.md`, "How tinylittleoffice.com is deployed", is how to check one yourself.
- **Dependencies you can read in one sitting.** `docs/dependencies.md`, written by `npm run docs:deps`
  (`scripts/dependencies.ts`) from package.json, the lockfile and `scripts/dependencies.json`: each dependency,
  its exact version, its license, the native API it beat and why, and the size it adds; `test/dependencies.test.ts`
  and CI hold the page current. Nothing vendored minified; the lockfile committed; `npm audit` in CI with no
  ignores. The fonts are IBM's own woff2 files, copied as released into `public/fonts/` with the SIL Open Font
  License beside them, served under `font-src 'self'` and nothing else (`test/csp.test.ts`).
- **The crypto in the open.** WebCrypto with no library, one short document each with the byte layouts:
  `docs/crypto/password.md` and `docs/crypto/short-links.md`. The vectors are `test/vectors/password.json` and
  `short-links.json`, checked by `test/crypto-vectors.test.ts` against the kit and against WebCrypto called by
  hand. "Logs nothing" for tinier is held by `test/tinier.test.ts`.
- **A copy of your own.** `docs/self-host.md` deploys the same code to anyone's Cloudflare account, the shortener
  included, and About names the commit a copy runs, so a self-hoster's copy is distinguishable. Or it runs the same
  code on one machine, as one Node process over one SQLite file (`selfhost/`), where whoever runs the machine sees
  what Cloudflare would: the file holds what D1 holds, and a swept row is overwritten in it (`secure_delete`).

Later: an independent audit of the crypto and the shortener, published in full; a public test dashboard; a signed
SBOM with each release.

## How it is described

Never as an absolute (Paul, 2026-10-11: "Saying we never save anything is wrong; we should say that's the
default"). Save in browser is off by default, and then nothing is kept on the device and nothing on any server;
turning it on is a choice, and keeps documents and short links on the device, never on a server; a short link is
the one thing a server holds, the document encrypted with a key the server never sees, until it expires. No
document ever reaches us otherwise.

The words are the README's first two paragraphs, and in a sentence, for the page's description and the share
cards: *A tiny office suite where the link is the document. No accounts. Nothing is saved anywhere unless you
choose to keep it on this device.*

The metaphor still holds: the note passed in class. The note is the thing, not a reference to something kept
elsewhere. Lead with "the link is the document", not "the URL encodes the document"; the technical readers find
the second behind the first. This page and the network page use none of these words.

## If you find a hole

Report it privately, through the repository's Security tab on GitHub (private vulnerability reporting), not in a public issue.
