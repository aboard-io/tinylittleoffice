# TinyLittleOffice

A tiny office suite that lives entirely in the URL.

Three dozen small apps, no server, no accounts, nothing to save. Every
document is encoded into the address bar, kept under 2,048 characters. Copy
the link and you have copied the file.

| App   | What it does                                                          |
| ----- | --------------------------------------------------------------------- |
| Sheet | A 1,000-row spreadsheet, three columns to start and as wide as its table (up to Z; a + at the end of the header adds one): formulas, business functions, named and locked cells, charts (a Sankey among them). Templates: a budget, an expense log, an invoice, a project tracker, a comparison with a chart, loans compared with PMT, models of a subscription business, a café, a freelancer and a mutual aid fund (each its flows as a Sankey over named assumptions), and a training log. |
| Write | A rich text editor: headings, bold, italic, lists, footnotes, other documents and things from the web in the text; printed (or saved as a PDF by the browser) on letter or A4 paper, or handed on as Word, RTF or Markdown. Templates: meeting notes, a letter, a memo, a bio, a weekly plan, and the business, marketing and go-to-market plans (the sections, with the questions each answers). |
| Outline | An outliner: items under items, folded and unfolded, dragged about, zoomed in on; the same text a mind map or an org chart reads. OPML out. |
| Deck  | Slides with a headline, bullets and an icon, or another document filling the slide; themes; Present. Templates: a talk, a status update, a pitch, a lesson, a kickoff. |
| Draw  | Boxes, ellipses, diamonds, lines, arrows and text labels on a grid; a pen for any shape, corner by corner, and a freehand stroke; joins that follow their shapes. |
| Calendar | Labelled spans of time on a month grid, or the year at a glance, shown in any time zone. |
| Todo  | Tasks to tick off, with stars and due dates.                          |
| Board | A kanban board: the stages of a workflow, each in a colour if it likes; cards of rich text with checklists; limits per stage. |
| Gantt | Tasks as bars on a calendar, nested under the ones they are part of; drag to move, drag the edge to resize. |
| Trip  | A route on an OpenStreetMap map: stops in order, each with a note; or just dots on the map. |
| Motion | A drawing that moves: any shape from Draw, given moments at which it is somewhere else, nearer, bigger, turned, or (a pen shape) a different shape, morphing between; effects for memes. |
| Org chart | Who reports to whom, drawn from an indented list. |
| Mind map | An idea and everything that branches from it. |
| Swimlanes | A process, step by step, with a lane for each person or team that acts. |
| Venn | Two or three sets as overlapping circles, with what belongs where. |
| Network | Things and the connections between them, drawn round a circle. |
| Website | A site of little pages from a few lines, edited on the page itself (a "+" where anything can go); sixteen themes, each an accent its shades are derived from; a shop (a table of products, a cart, orders by email) if it lists what it sells; downloads as one HTML file with the pages switched by hash. |
| Quick Links | A link-in-bio page: a picture, a line about you, a stack of buttons, the places you are at the foot. |
| Invoice | A form laid out like the paper: who, what, how much; the sums done as you type, a PDF to send. |
| Contract | A plain-words agreement each party signs with a key held in their browser. Proves the words have not changed since; does not prove who holds a key. |
| Zine | Eight pages on one letter sheet, one- or two-sided, imposed for folding; edited as a deck is; also a tap-to-read web page. |
| Booklet | Half-letter pages nested, 8 to 20. |
| Brochure | A trifold: six panels on two sides of a sheet, each where the fold needs it. |
| Comic | A zine whose pages are panels, each typed into on the page; a folded mini comic out. |
| Poster | A headline and a few lines, as big as one page allows. |
| Name badges | A page per person, six to a sheet, ready to cut. |
| Calculator | Plain (a line to type any expression into, and the tape beneath as a little program: `a = 12`, then `a * 3`, `ans`; units and conversions too: `3 inch to cm`, `60 mph in km/h`, `2 cups + 3 tbsp`), scientific with a graph of y = f(x), mortgage, investment, cash flow (NPV, IRR, payback), interest; the working is the document, drawn as a page. |
| Pixel art | A 16 by 16 grid of squares to colour. |
| Seating chart | Tables, with their people round them. |
| Family tree | People and couples, with their children beneath them. |
| Timeline | Events along a line, spaced as they fell; a span of years a band at its foot. |
| Word search | A puzzle from your own words, ready to print. |
| Spinner | A wheel to spin: names or choices in, one picked at random. |
| Secret Santa | Names in; a private link out for each person, showing only who they give to. |
| Split the bill | Who paid what, what each owes, and the fewest payments to settle up. |

That is `apps()` in `src/apps/index.ts`, in menu order; the diagrams sit
under Draw in the menu, the folds under Zine, the badges under Poster. Two
more are not in the menu, because they live inside other documents: Web
embed (a video, a post, a song, a place or a picture from the web, as a
card loaded only when tapped) and QR code (the one a deck ends with). Drive, at `#/drive`,
is the documents saved on this device, in folders nested with a slash:
search inside them, move, rename, download the lot as a zip, or blow it all
away. It is private by default; the switch in the header turns it on.

An empty Write, Sheet, Deck or Quick Links opens with its templates over it, Blank the
first card, and offers them again from "Start from a template…" in the
toolbar while it stays empty: a dialog of templates, each drawn
small by the app itself, and one undo brings the blank page back. The
templates are plain text in each app's format, in `src/lib/templates.ts`.
A business plan, a marketing plan and a go-to-market plan are among
Write's.

Built with TypeScript, [Lit](https://lit.dev) web components,
[Shoelace](https://shoelace.style) for the UI controls and
[Lucide](https://lucide.dev) icons; [d3-sankey](https://github.com/d3/d3-sankey)
lays out the Sankeys and [mathjs](https://mathjs.org) does the calculator's
units. It is responsive down to phone widths,
follows the system light or dark theme, and every document carries its
creation time and can be cryptographically signed.

## Running it

```sh
npm install
npm run dev        # local dev server
npm run build      # static site in dist/
npm test           # unit tests (node) and the editors and shell in an emulated browser (Vitest, happy-dom): about a minute
npm run test:e2e   # what needs a real browser, desktop and phone (Playwright; about seven minutes)
```

Tests come in three layers, fastest first. `test/*.test.ts` are the
formats, the formulas, the codec and the API, under node. `test/dom/` puts
each real editor on a page emulated by happy-dom (through Vite, so it is
the same code the site builds) and works it as a person would: typing,
pressing, choosing, then checking the text it saves. `e2e/` is a real
browser at desktop and phone size, for what needs one: layout, overflow,
pointers, canvas drawing (PNG, PDF, GIF), page scripts in frames, the
editing commands, the service worker; each test there says in a comment
why it needs one. `e2e/smoke.spec.ts` is its quick
part: every app opened at both sizes, drawn, quiet, and no wider than the
screen.

The build is `index.html`, one stylesheet and one script with every app in
it, so opening an app fetches nothing; only Trip's map library, the
calculator's units engine (mathjs) and the full icon set (for the icon
picker) are fetched when first wanted. Cloudflare
compresses what it serves. Host it on any static file server. `VITE_SITE_URL` in `.env` is the address it will be published
at; the link-preview tags need it. `node scripts/make-icons.mjs` redraws the
PNG icons and the preview card in `public/`.

Trip is the one app that uses the network while you work: map tiles come
from openstreetmap.org and place searches go to its Nominatim service. The
route itself stays in the URL like every other document.

## How a document fits in a URL

The URL looks like `https://host/#/v0/sheet/WXQAA...`. `v0` is the version of
the link format, the one that launches; until then the format changes freely
and nothing older is read. A link from a newer version says so. The part after
the app name is the document:

1. Each app serialises its content to a compact text format (below), and the
   shell wraps it in the envelope described under "Creation time and
   signatures".
2. That text is deflated with [fflate](https://github.com/101arrowz/fflate)
   and base64url-encoded, whichever way comes out shortest: against the
   shared dictionary and the app's own (`W`: common English words, the apps'
   markup, icon names, and the words that app uses most), against the shared
   one alone (`Y`), plain deflate (`Z`), or for very short documents the raw
   UTF-8 (`R`); the flag is lowercase when the document has nothing to put
   in its envelope (no time, title, author or signature) and goes without
   one. Because both ends already know the dictionaries, short
   documents come out 20 to 35 percent smaller than plain deflate. The
   dictionaries (`src/lib/codec.ts`) are frozen once v0
   launches: changing a byte would then break every link made with them.
3. The shell writes the result into the fragment with `history.replaceState` on
   every edit, so the address bar is always current and nothing is ever sent to
   a server (fragments never leave the browser).

The status bar shows how much of the budget a document uses. The budget is
2,048 minus the length of the page's own address, so a short hostname buys you
a little more room. Plain English prose fits roughly 500 words; a deck of ten
slides with a few bullets each fits easily; a sheet full of numbers and
formulas fits with room to spare. Going over the limit turns the meter red but
never loses your work.

### Download views

Put a file extension after the app name and the link downloads the document
as that file the moment it is opened, then shows the editor as usual:

| Link                         | File                                              |
| ---------------------------- | ------------------------------------------------- |
| `#/v0/sheet.xlsx/<payload>`  | Excel workbook, formulas intact (`.xls` also works) |
| `#/v0/sheet.csv/<payload>`   | CSV of the computed values                        |
| `#/v0/write.docx/<payload>`  | Word (`.doc` also works)                          |
| `#/v0/write.rtf/<payload>`   | Rich Text                                         |
| `#/v0/write.html/<payload>`  | A standalone web page                             |
| `#/v0/deck.pptx/<payload>`   | PowerPoint, icons included (`.ppt` also works)    |
| `#/v0/draw.svg/<payload>`    | SVG image                                         |
| `#/v0/cal.ics/<payload>`     | iCalendar (`.ical` also works); `gantt.ics` and `todo.ics` too |
| `#/v0/<app>.md/<payload>`    | Markdown (every app; checkboxes, tables, headings) |
| `#/v0/board.csv/<payload>`   | CSV of stage and card                             |
| `#/v0/gantt.csv/<payload>`   | CSV of tasks with start and end dates             |
| `#/v0/trip.gpx/<payload>`, `.geojson` | GPX route, or GeoJSON                    |
| `#/v0/anim.svg/<payload>`    | Animated SVG                                      |
| `#/v0/<app>.pdf/<payload>`   | PDF of any document, a page per page or slide     |
| `#/v0/<app>.print/<payload>` | Opens the browser's print dialog, which saves a PDF too |
| `#/v0/<app>.png/<payload>`   | The whole of any document as one picture          |
| `#/v0/<app>.html/<payload>`  | Any document as a plain web page with preview tags |

One view is not a file: `#/v0/deck.show/<payload>` opens a deck presenting.
That is the link Copy and Share hand out for a deck, so whoever you send it to
lands in the show; "Edit this deck" (or Escape) takes them to the editor, and
the Share menu also has the plain editing link.

The same files are under the Download button on every document, and the
Document dialog has a copy button for each download link. `docs/exports.md`
lists every app's files and what each holds. Print (Mod+P, or the last item
of the Download menu) is the browser's own: a text prints as text on its
paper in any script the device has fonts for, and its dialog saves a PDF;
anything drawn prints a page per picture at the page's own size. A password-locked
link downloads once the password is entered. The file is named after the
document's title when it has one. All of it is built in the browser by
the app's definition (see "Adding an app"); nothing is sent anywhere.

### Sharing, and what a link preview can show

A document lives in the fragment (the part after `#`), which browsers never
send to a server. That is the privacy promise, and it is also why every
TinyLittleOffice link previews as the same card on social sites: their crawlers
fetch the page without the fragment and do not run JavaScript, so the only
tags they see are the static ones in `index.html`. Without a server that is
handed the document, nothing can change that.

What works without one, from the Share menu: the device's share sheet gets
the link plus a picture of the document; Bluesky, Mastodon, X, LinkedIn and
email open their compose box with the link in it; and the `.png` view saves
the picture to attach by hand. Hovering the meter (or opening the Document
dialog) shows how much room the link leaves in a Bluesky post, a text
message, a QR code and so on; the numbers are in `src/lib/limits.ts`.

### Formats

Every document is one plain text in TLO: Markdown with a few additions.
`docs/tlo.md` is the reference, with each app's shape; the reader and
writer are `src/lib/tlo.ts`. Plain text gives deflate something to chew
on, and a language model writes it the way it writes any Markdown. What
the reference leaves to the apps:

- **Sheet** formulas (`src/lib/formula.ts`) start with `=` and support
  `+ - * / ^ %`, parentheses, cell references (`B7`), ranges (`A1:C3`),
  `"words"`, comparisons (`= <> < > <= >=`), the names a `name` column gives
  the cells beside it, and `SUM AVG MIN MAX COUNT SUMIF COUNTIF MEDIAN
  PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN INT ABS SQRT MOD NPV IRR PMT
  FV PV`. Errors show as `#DIV/0`, `#REF`, `#NAME`, `#CIRC`, `#VALUE`,
  `#NUM`, `#ERR`. Dates are day counts, so they add and subtract; `TODAY
  DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY` work on them. A CSV, or a
  table without types, reads as a sheet too.
- **Write** (`src/lib/richtext.ts`) shows a thing from the web as a card
  that loads it only when tapped (`src/lib/embeds.ts`): a line that is
  only an address. What embeds, by the address as people paste it: a
  YouTube, Vimeo, PeerTube or Internet Archive video; a Bluesky, Mastodon,
  X or Reddit post; a Spotify or SoundCloud player; a place on
  OpenStreetMap (a `#map=` or `?mlat=` link); a CodePen; a Wikipedia
  article (its summary, with a thumbnail); a Wayback Machine page; and a
  picture, a sound (`.mp3 .ogg .wav .m4a .flac .aac .opus`), a film (`.mp4
  .webm .mov .m4v .ogv`) or a PDF by its own address, which the browser's
  own `<img>`, `<audio>`, `<video>` or PDF viewer shows (an SVG only ever
  as a picture, where it can run nothing). Instagram, TikTok, Threads,
  Facebook, LinkedIn, GitHub gists and Bandcamp embed nothing without their
  own script, so those are a card that opens the page there. Any other
  address is a link. The same line does the same in an outline's item, on
  a slide (the whole slide), in a section of a website or a Quick Links
  page, and on a board's card. `paper: a4` or
  `letter` in the header is the paper it prints on; without it, the
  reader's own. The pages have inch (or 25 mm) margins, a heading never sits
  alone at the foot of one, and more than one page are numbered.
- **Footnotes** (`src/lib/richtext.ts`) are written where their mark
  sits, `^[the note's words]`, and numbered by order of appearance when
  drawn; the note is rich text itself (marks and links, no blocks).
  Markdown's reference form, `[^id]` with a `[^id]: the note` paragraph
  anywhere, reads too and is folded into the inline form. Write draws the
  notes at the end of the document (a `<section role="doc-endnotes">`, in
  the editor, on paper and in the web page), a slide at its own foot
  (numbered from 1 on each slide, the headline's first), the outline under
  its items; Word and RTF get the marks raised and the notes as small
  paragraphs at the end; the Markdown export writes the reference form.
  In the editor the mark is a chip the caret steps over; the bar's
  Footnote tool puts one in and opens its words in a small popover (the
  Popover API, a dialog where there is none) beside it; Backspace over
  the chip takes the note away.
- **Draw** (`src/lib/drawmodel.ts`) counts in 8-pixel grid units on a 640
  by 400 canvas. **Motion** (`src/lib/animmodel.ts`) is the same table with
  a table of keys per shape.
- **Website** and **Quick Links** (`src/lib/sitemodel.ts`) share sixteen
  themes, each an accent, a type and a corner, with the type and the mode
  changeable on their own. Every shade (the tint, the deep shade words take
  on it, the accent lifted for a dark page) is the browser's own work:
  `oklch(from <accent> …)` in the page's CSS holds the accent's hue at a
  lightness fixed for the role, and a test checks every pair at WCAG AA;
  the page edits itself (`src/lib/pageedit.ts`).
- **Calendar** (`src/lib/calmodel.ts`) keeps an all-day span as a floating
  civil date, the same in every country, and a timed span as one absolute
  instant, shown in whichever zone the viewer picks. Time zone maths comes
  from the browser's `Intl` support (`src/lib/tz.ts`), so no zone database
  is bundled.

## Styling: one stylesheet

Every TinyLittleOffice component renders into light DOM, so there is no CSS hidden
in shadow roots. The look lives in `src/styles.css`, and six apps keep a
sheet of their own beside their editor, imported by it: `anim.css`,
`calc.css`, `invoice.css`, `outline.css`, `site.css`, `web.css`. In
`styles.css`:

1. **Tokens.** Shoelace's design tokens are overridden at the top of the file
   (accent ramp, fonts, radii) and a small set of `--to-*` variables is built
   on them: surfaces and inks, accent, danger, success and warning, paper
   (white in both themes), three radii, two shadows. Change these and both
   our markup and the Shoelace controls follow.
2. **Shared pieces.** The classes an app reaches for before writing a rule
   of its own: `.to-toolbar`, `.to-hint`, `.to-empty`, `.to-icon-btn` (what
   `btn()` makes), `.to-add` (a dashed pill that adds something),
   `.to-count` (a number in a pill), `.to-swatches` (what `swatches()` makes), `.to-tip` (the tooltip).
3. **Base, shell, apps, responsive.** Plain class names, prefixed by app
   (`.sheet-`, `.write-`, `.deck-`, `.draw-`, `.cal-`) and `.to-` for the
   shell. The responsive section at the end collapses the navigation into a
   drawer and tightens spacing under 760px; `@media (pointer: coarse)` is
   where phones get 16px inputs and finger-sized buttons.

Shoelace components (buttons, inputs, selects, dialogs, the drawer, the
progress ring, the copy button) are styled through their tokens and
`::part()` selectors from the same file.

## Titles

Every document can be given a name (the field beside its icon). It travels in
the envelope with the creation time, names downloads and the browser tab, and
is what an embedded document is called. Without one, a document goes by a
title read from its content, or "Untitled Sheet".

## Creation time and signatures

Every document is wrapped in a small envelope before compression: its creation
time (set on the first edit, minute precision, five characters) and optionally
a public key and signature. The meter widget in the header shows how much of
the link is left and copies the link; clicking the ring opens the document
dialog with the creation time, size, and signing controls.

Signing uses WebCrypto Ed25519 (ECDSA P-256 where Ed25519 is unavailable).
A key pair is generated in the browser on first use and kept in localStorage;
it can be exported and imported to sign as the same key on another device.
The signature covers the app, the creation time and the body, and costs about
130 characters of link. Readers see the signer's fingerprint (ten hex chars of
the key's SHA-256) and whether the signature matches the current content. A
mismatch means the content was edited after signing or the link was altered;
the two are indistinguishable by design. The creation time is asserted by the
signer, not by an outside clock.

## Passwords

A document can be locked with a password from the document dialog. The packed
envelope is encrypted with AES-256-GCM under a key derived from the password
by PBKDF2-SHA-256 (600,000 iterations) with a random 16-byte salt; the link
carries `E` + base64url(salt, 12-byte IV, ciphertext), about 60 characters
more than the plain link. Content is compressed before encryption, so the
link stays small, and the GCM tag means a wrong password or a damaged link is
detected rather than producing garbage. The key is derived once per session;
each edit re-encrypts with a fresh IV. Signing works inside the encrypted
envelope.

What this protects: the link's contents from anyone who sees the link but
does not know the password, including browser history, chat logs and
bookmarks. What it does not: anyone holding the link can try passwords
offline at full speed, so a short or guessable password gives little. Nothing
about the password ever leaves the browser.

## Making documents by URL

A document can be written as ordinary parameters, by hand or by a program:

```
https://tinylittleoffice.com/sheet/#title=Sales&doc=---%0Achart:%20bar%0A---%0AQuarter%20%7C%20Sales%0A---%20%7C%20---%0AQ1%20%7C%20120%0AQ2%20%7C%20180
```

`doc` is the document as plain text in the app's format, `title` its name,
and `view` optionally `show`, `embed`, `pdf`, `png` or `html`. On arrival the
link is rewritten into the compact form. Where an app's own format is too
terse to write by hand (dates counted in days, packed coordinates), the app
reads a friendlier one: `2027-03-01 to 2027-03-03 Offsite` for a calendar,
`38.72, -9.14, Lisbon` for a trip. The full guide, with an example for every
app, is `skill/tinyoffice/SKILL.md`: a skill for Claude, also served as
`/llms.txt`. `/tinyoffice.js` exports `link()` and `embed()` for JavaScript.
A test opens every example in the guide.

The parameters go after `#`, never `?`: see the next section.

## For programs and agents

A document is a link, so a program makes one by making a string. The site serves its own API for that, no install:

```js
import { link, parse, lint, compare, evaluateSheet, runModel, templates } from 'https://tinylittleoffice.com/api.js';
```

`runModel(body, { signup_rate: 10 })` runs a sheet that is a model with
some of its named cells changed, and gives back its flows and every named
cell's value.

`templates('write')` (or `'sheet'`, `'deck'`, `'links'`) is the list a person is offered
on an empty document: each a name, a line on what it is for, and its body in
the app's format, ready for `link()` or to be filled in by a program.

`src/api.ts` is the source, built to `dist/api.js` (and `api.d.ts`) with the site. The same build feeds the `tinyoffice` command line in `packages/doc` (`npm run build:api`; it also renders a link to PDF/PNG/PPTX/XLSX headlessly). It is not published to a registry: the site is where the code lives, and `/llms.txt` is where programs learn the formats.

Plain links also take `&md=` (Markdown or CSV, shaped on opening) and `&by=` (who made it), and every envelope carries `by`, which a signature then proves. Two links compare at `#/compare/<app>/<payload>/<app>/<payload>` (or Share → Compare with another link…), with the lines the second changed.

## Shorter links that expire

Share → "Shorter link that expires…" asks tinier.tinylittleoffice.com
for a short link (an hour, a day, a week or a month). The long link is
encrypted in the browser with a random AES-256-GCM key; only the ciphertext is
sent, and the key travels in the short link's fragment (`#…`), which
browsers never send to any server. Opening a short link fetches the
ciphertext, decrypts it on the page, and goes to the document. The
server learns that a link was made, and when it should forget it;
nothing else. It is `tinier/`: one file of logic (`tinier.ts`, tested
with node against a Map) run as a Cloudflare Worker (`worker.ts`) with
its rows in a D1 table (`schema.sql`), a rate-limit binding as the brake
on one address, and an hourly cron that forgets expired links (a read of
one forgets it sooner).

To run it on this machine, beside `npm run dev`:

```
SITE=http://localhost:5173 npm run tinier:dev
```

It keeps its rows in a local D1 (`.wrangler/`) and listens on 8787; the dev
server hands it everything under `/tinier/` (`.env.development` points the
Share menu there), so short links come out as the dev server's own address.
`SITE` is that address as the browser sees it: the only place a local short
link may lead.

## What the server sees

Nothing of any document. A document is the part of the address after `#`,
which a browser keeps to itself: it is not in the request, so it cannot be
in a log. That is why plain-parameter links use `#` and the same thing after
`?` is deliberately not understood. The server is static files, and the site
keeps no log of its own: the Workers have logging switched off
(`wrangler.jsonc`). Cloudflare,
which serves the files, keeps its own record of requests (an address, a
path such as `/deck/`, a browser) under its own policy; a path says which
app was opened, never which document.

Four things do leave the browser, each only when asked to: Trip fetches map
tiles and place searches from openstreetmap.org; the Share menu hands the
link to the service chosen; an embedded page's host sees that its page
was loaded, not what the frame shows; and a thing from the web (a video,
a post, a song, a place, a picture, a file) is a card naming its provider
until the reader taps it, and only then is it fetched, from the provider's
privacy endpoint where there is one (youtube-nocookie, Vimeo with `dnt=1`,
Bluesky's embed, X's embed with `dnt=true`, Mastodon's and PeerTube's own
embed pages, Spotify's and SoundCloud's players, Reddit's embed,
OpenStreetMap's export frame, CodePen's embed, archive.org's player, the
Wayback Machine's copy) in a sandboxed frame that cannot reach the page,
navigate it or submit a form, with no referrer. A sound, a film, a PDF or
a picture by its own address goes through the browser's own element, the
same way. Two cards ask before they show: Bluesky's embed wants the
author's id rather than their handle, so that tap first asks
public.api.bsky.app who the handle is; a Wikipedia card asks the article's
summary of `<lang>.wikipedia.org` and shows that. If the provider does not
answer, the card offers the thing there instead; where a provider embeds
nothing without its own script (Instagram, TikTok, Threads, Facebook,
LinkedIn, GitHub gists, Bandcamp) the card is only that offer. The site's
Content-Security-Policy (`public/_headers`) allows any `https:` frame and
sound rather than a list of providers, because a Mastodon post or a
PeerTube video comes from its own instance, which is any host; the list
of what embeds, and from where, is `embedOf` in `src/lib/embeds.ts`,
which `test/embeds.test.ts` holds to the policy.

## Working offline

The whole site is static and a document lives in its link, so nothing needs
a server once the shell is loaded. The menu's switch, "Keep the app on this
device", registers a service worker (`src/sw.ts`, built by Vite as `sw.js`)
that fetches every file of the build, the lazily loaded ones too (the map
library, the icon set, the fonts), and from then on serves the site's own
files from the device first, the network second: a cold start with no
connection opens the home page or any app's page, and a link opens there.
The list it fetches is `files.json`, written by the build
(`scripts/offline-files.ts`); the worker carries the build's version, so a
new build is a new worker, which fetches the new files and drops the old
cache (the line under the switch says "Updated, reload"). Switched off, the
worker is unregistered and its cache deleted; turning the header's switch to
Private does the same. Map tiles, embedded pages and the short-link service
are never kept. The line under the switch says how much the browser holds
for the site (`navigator.storage.estimate()`), and the browser is asked to
keep it (`navigator.storage.persist()`). The site is installable as an app
(`public/manifest.webmanifest`); the menu offers "Add to home screen" where
the browser has a prompt, and says how on iPhone Safari, which has none.

## Embedding

Share has "Copy embed code": an `<iframe>` on the document's `embed` view,
which is the document alone with a link back to the editor. The snippet has
a title, loads lazily, keeps its shape at any width and sends no referrer.

## Diagrams

Org chart, Mind map, Swimlanes, Venn and Network are each a few dozen lines
(`src/apps/<id>.def.ts`): a function from an outline to Draw's shapes and
joins. `defineDiagram` (in `src/lib/diagram.ts`) turns that into an app, and
`src/apps/diagram.ts` is the one editor they share, drawing in one of three views (`diagram-shapes.ts`, `diagram-sheets.ts`, `diagram-page.ts`). Because the output is a
drawing, each is a picture, a PDF, a slide that builds shape by shape, and
opens in Draw to be rearranged by hand. Draw itself has joins that follow
their shapes, and more shapes (rounded box, hexagon, parallelogram,
cylinder, note).

## Adding an app

```sh
npm run new-app notes "Notes"
```

writes a working app (a list you can add lines to), its test, and adds it to
the menu (`src/apps/index.ts`) and to the one script (`src/apps/editors.ts`).
An app is two files:

- `src/apps/<id>.def.ts`: the **definition**. Its name, how to read a title
  out of a document, how to draw it (`view`, pages of SVG), and any formats
  of its own. It never touches the DOM, so it is tested with plain node.
- `src/apps/<id>.ts`: the **editor**, a `DocElement`. It is handed the
  document as text, and calls `commit()` when it changes.

Everything else is driven by the definition, for every app at once: the menu
and routes, the link, password and signature, `.pdf` / `.png` / `.html`
downloads, the share menu and card, the list of keyboard shortcuts, and
being embedded in a text or shown (and built, step by step) on a slide.

An app that is "a few lines of text" (a diagram, a page, a print, a fold)
needs no editor file at all: `editors.ts` gives it the shared one its
definition asks for.

One import has everything an editor needs:

```ts
import { DocElement, defineElement, html, state, tool, btn, icon, UI, isKey } from '../kit.ts';
```

The controls come from the kit, so they look and behave the same in every
app: `tool()` is a toolbar button (an icon, with its name and shortcut as
its tip), `btn()` the small plain button in a row or a card, `stepper()`
a less/value/more group, `swatches()` a row of colours as a radio group,
`toast()` a word to the person from anywhere. Anything with a `data-tip`
has a tooltip (`src/kit/tip.ts`): on hover and keyboard focus, and on a
phone on a long press, which is then not a tap. There is one tooltip
element for the whole page, so a tip costs nothing per button.

`src/kit/core.ts` is the pure half (registry, text layout, SVG helpers,
documents as web pages); `src/kit/browser.ts` the half that needs a browser
(measuring text, pictures, PDFs, `<to-embed>`, editing a document inside
another). `npm run icons` redraws the share cards in `public/og/`; give a new
app a sketch in `scripts/make-icons.mjs`.

## Documents inside documents

A text or a slide can hold another document. It is stored as a fenced block
named for its app, holding that document's whole text (` ```sheet `), and
drawn by that app's `view`. In Write, paste a TinyLittleOffice link or use Insert; on a
slide, use Insert. Either way it is one thing: Edit opens its own editor in a
dialog, Remove (or Backspace) takes it away. A sheet that asks for a chart is
shown as the chart.

A document shown on a slide has the whole slide: no headline, no bullets.
When a deck is presented, a slide reveals one thing per click: a bullet, or a
piece of its document (a shape of a drawing, a cell of a table, a stop on a
map). A fast double click shows the whole slide at once.

## Keyboard and accessibility

Undo and redo (Ctrl+Z, Ctrl+Shift+Z, or the buttons beside a document's name)
work in every app, because the shell keeps the history: a document is text,
and undoing hands the editor the text it was. A new app gets it for free.

Ctrl+/ (or the menu) lists every shortcut: the ones that work everywhere and
the current app's. Every control has a name, focus is always visible, motion
respects the reduced-motion setting and edges and quiet text darken under
the more-contrast setting (`prefers-contrast`), a skip link leads to the
document, and the one toast is a live region that is always on the page.
`e2e/apps.spec.ts` runs the axe accessibility checker over every app's
editor and bar, the menu, Insert, the templates and the icon library, in
light and dark; `e2e/keyboard.spec.ts` works the shell by keyboard alone
(Tab to the bar, Esc giving the focus back, arrows through Insert). Rules
switched off there carry their reason beside them: compact toolbar pickers
are named for assistive technology but show an icon rather than a label,
and a Shoelace dialog's own title bar is a `<header>` inside its shadow
root, which axe counts as a second banner. The colour tokens are checked
against each other by `test/contrast.test.ts`, which reads the stylesheet
and Shoelace's two themes as they are: text at 4.5:1 on every surface it
sits on in both themes, edges and rings at 3:1 in the dark, where the page
sits darker behind its panels and text, edges and the accent are each a
step lighter than Shoelace's own.

## Link previews

Each app has a page of its own (`/deck/`, `/sheet/`, ...) made at build time,
with that app's name, description and card (`public/og/<id>.png`) in its
tags; copied and shared links go through it, so a shared deck previews as a
deck. The card is a sketch in grey boxes, not the document: a document lives
after the `#`, which no server or crawler sees. Downloaded `.html` files carry
the same tags plus the document's own title and outline.

## Project layout

```
src/app.ts            the shell: header, menu, routing, document dialog, shortcuts
src/kit.ts            everything an editor imports: the base class and the shared controls
src/kit/              registry, drawing, PDF, zip, embeds, browser helpers, the tooltip
src/apps/index.ts     the list of apps
src/apps/editors.ts   the editors, in one script; shared editors for the apps without one
src/apps/<id>.def.ts  each app's definition: title, picture, downloads
src/apps/<id>.ts      each app's editor
src/lib/tlo.ts        the TLO reader and writer (docs/tlo.md)
src/lib/<id>model.ts  each app's model over it (formula.ts, richtext.ts for sheet and write)
src/lib/lines.ts      an app's lines as a form: what the picture's editing boxes come from
src/lib/chart.ts      charts from a table
src/lib/templates.ts  what Write, Sheet, Deck and Quick Links can start from (widgets/template-picker.ts offers them)
src/lib/codec.ts      text <-> URL payload (deflate + dictionary + base64url)
src/lib/envelope.ts   creation time + signature wrapper around a body
src/lib/sign.ts       WebCrypto keys, signing, verification
src/lib/crypt.ts      password encryption of the packed envelope
src/lib/limits.ts     how much room a link leaves, service by service
src/lib/icons.ts      Lucide icons; iconsearch.ts finds and suggests them
src/lib/offline.ts    the switch that keeps the app on the device; src/sw.ts the service worker it registers
src/widgets/meter.ts  <to-meter>: URL space ring + copy button
src/styles.css        the stylesheet: tokens, the shell, shared pieces (.to-*), then the apps
scripts/              new-app, share cards and icons
tinier/               the link shortener: a Worker, its D1 schema, its page
wrangler.jsonc        the site as a Cloudflare Worker of static assets; public/_headers its headers
test/                 unit tests (node --test)
e2e/                  Playwright browser tests
```

## One toolkit for text apps

Every app that is "a few lines of text" is edited on its picture: tap
empty space to add a thing, tap a thing for its buttons (add one like
it, give it an icon, join it to another, edit its words, take it away),
tap twice to type on it, drag it where it goes (onto another thing to
put it under or after it, into a lane or a set to move it there). A line between two things is
tapped for its words; a guest at a table is a thing of their own. The
same document is always the text itself (Mod+Shift+T). All of it comes from one description
(`src/lib/lines.ts`): the app lists its kinds of line as patterns,

```ts
form: [
  { name: 'Title', is: '# {Title}', once: true },
  { name: 'Heading', is: '## {Heading}', head: true },
  { name: 'Point', is: '- {Point}', indent: true },
  { name: 'Paragraph', is: '{Text:long}' },
]
```

and the picture's editing box gives each `{field}` a box. `[..]` may be
left out; `{Text:long}`, `{Day:date}`, `{Picture:icon}` and
`{Colour:choice=red,green}` pick the kind of box; `indent: true` lets
rows nest. What is saved, shared and written by
programs is always the plain text, and a test checks that every app's
example survives the trip through its form unchanged.

## Deploying

The site is static: `npm run build` and serve `dist/` from anywhere.

It lives on Cloudflare: `dist/` as the static assets of a Worker with no
script (`wrangler.jsonc`), its headers from `public/_headers`, on
tinylittleoffice.com and www; and the shortener as a second Worker
(`tinier/wrangler.jsonc`). `npm run deploy` checks and ships both, checking
what the change can have broken (`scripts/deploy.mjs`): always the types,
the unit tests, the editors and shell in the emulated browser and the
build (about a minute and a half); when something on screen changed since the last deploy (an
editor, a style, the shell, a widget, a page the site serves), the smoke
check in a real browser too (about half a minute more). `-- --full` runs
every browser test first; `-- --dry-run` checks without shipping.

The Content-Security-Policy allows no inline script. The scripts of the
pages apps make (a shop's cart, a game, the in-place editing of a page
preview) are fixed texts registered with `pageScript()` and hashed into
the policy at build time; a page's data travels beside its script as JSON
(`pageData()`), never inside it. A test checks that every page keeps to
that, so a document can never bring a script of its own, not even inside
the frame that shows it.
Once, on a new account: `npx wrangler login`, `npx wrangler d1 create tinier`
(its id goes in `tinier/wrangler.jsonc`), `npm run tinier:schema`.
