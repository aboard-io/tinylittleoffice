# TinyLittleOffice

A tiny office suite that lives entirely in the URL.

Sixteen small apps, no server, no accounts, nothing to save. Every document is
encoded into the address bar, kept under 2,048 characters. Copy the link and
you have copied the file.

| App   | What it does                                                          |
| ----- | --------------------------------------------------------------------- |
| Drive | The documents saved on this device, in folders (nested with a slash): search inside them, move, rename, download the lot as a zip, or blow it all away. Private by default; the switch in the header turns it on. |
| Sheet | A 1,000-row, 6-column spreadsheet: formulas, business functions, charts. Templates: a budget, an expense log, an invoice, a project tracker, a comparison with a chart, loans compared with PMT. |
| Outline | An outliner: items under items, folded and unfolded, dragged about, zoomed in on; the same text a mind map or an org chart reads. OPML out. |
| Write | A one-page rich text editor: headings, bold, italic, lists. Templates: meeting notes, a letter, a memo, a bio, a weekly plan, and the business, marketing and go-to-market plans (the sections, with the questions each answers). |
| Deck  | Slides with a headline, bullets and an icon. Press Present. Templates: a talk, a status update, a pitch, a lesson, a kickoff. |
| Draw  | Boxes, ellipses, diamonds, lines, arrows and text labels on a grid.   |
| Calculator | Plain, scientific with a graph of y = f(x), mortgage, investment, cash flow (NPV, IRR, payback), interest; the working is the document, drawn as a page. |
| Calendar | Labelled spans of time on a month grid, shown in any time zone.    |
| Todo  | Tasks to tick off, with stars and due dates.                          |
| Board | A kanban board: the stages of a workflow, cards, and limits per stage. |
| Gantt | Tasks as bars on a calendar; drag to move, drag the edge to resize.   |
| Trip  | A route on an OpenStreetMap map: stops in order, each with a note.    |
| Motion | A drawing that moves: any shape from Draw, given moments at which it is somewhere else, nearer, bigger, turned, or (a pen shape) a different shape, morphing between; effects for memes. |
| Org chart, Mind map, Swimlanes, Venn, Network | Diagrams drawn from a few lines of text. |
| Database | A tiny relational database: tables, rows, SQL queries, schema drawn. |
| Website | A site of little pages from a few lines, a link-in-bio page included; downloads as one HTML file with the pages switched by hash. |
| Store | A shop page with a working cart; orders go by email. |
| Invoice | Who, what, how much; sums done, PDF to send. |
| Contract | A plain-words agreement each party signs with a key held in their browser. Proves the words have not changed since; does not prove who holds a key. |
| Zine | A tiny deck, edited as Deck is: eight pages on one letter sheet, one- or two-sided, imposed for folding; also a tap-to-read web page. |
| Booklet, Brochure | The zine's kit with other folds: half-letter pages nested (8 to 20), a trifold. |
| Comic | A zine whose pages are panels, each typed into on the page; a folded mini comic out. |
| Poster, Name badges, Recipe cards | Pages typed into directly, laid out by the deck's engine (a page type is a template), tiled on letter sheets. |
| Menu, Résumé | A few lines in, one letter sheet out, fitted to the page. |
| Stock and flow | A model as a Sankey diagram with a slider for every assumption. |
| Pixel art | A grid of squares to colour. |
| Floor plan, Seating chart, Family tree, Timeline | More diagrams from a few lines. |
| Games | Word search, Adventure, Scavenger hunt, Trivia, Fill in the blanks, Spinner, Flashcards. |
| Together | Poll, Secret Santa (a private link per person), Split the bill. |
| Personal | Log. |

An empty Write, Sheet or Deck offers "Start from a template…" (a button in
the toolbar, a line on the blank page): a dialog of templates, each drawn
small by the app itself, and one undo brings the blank page back. The
templates are plain text in each app's format, in `src/lib/templates.ts`.
A business plan, a marketing plan and a go-to-market plan are among
Write's.

Built with TypeScript, [Lit](https://lit.dev) web components,
[Shoelace](https://shoelace.style) for the UI controls and
[Lucide](https://lucide.dev) icons. It is responsive down to phone widths,
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
it, so opening an app fetches nothing; only Trip's map library and the full
icon set (for the icon picker) are fetched when first wanted. Cloudflare
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
   dictionaries (`src/lib/codec.ts`, `src/lib/dicts.ts`) are frozen once v0
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
| `#/v0/write.rtf/<payload>`   | Rich Text                                         |
| `#/v0/write.html/<payload>`  | A standalone web page                             |
| `#/v0/deck.pptx/<payload>`   | PowerPoint, icons included (`.ppt` also works)    |
| `#/v0/draw.svg/<payload>`    | SVG image                                         |
| `#/v0/cal.ics/<payload>`     | iCalendar (`.ical` also works)                    |
| `#/v0/<app>.md/<payload>`    | Markdown (every app; checkboxes, tables, headings) |
| `#/v0/board.csv/<payload>`   | CSV of stage and card                             |
| `#/v0/gantt.csv/<payload>`   | CSV of tasks with start and end dates             |
| `#/v0/trip.gpx/<payload>`, `.geojson` | GPX route, or GeoJSON                    |
| `#/v0/anim.svg/<payload>`    | Animated SVG                                      |
| `#/v0/<app>.pdf/<payload>`   | PDF of any document, a page per page or slide     |
| `#/v0/<app>.png/<payload>`   | The whole of any document as one picture          |
| `#/v0/<app>.html/<payload>`  | Any document as a plain web page with preview tags |

One view is not a file: `#/v0/deck.show/<payload>` opens a deck presenting.
That is the link Copy and Share hand out for a deck, so whoever you send it to
lands in the show; "Edit this deck" (or Escape) takes them to the editor, and
the Share menu also has the plain editing link.

The same files are under the Download button on every document, and the
Document dialog has a copy button for each download link. A password-locked
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

Every format is plain text, chosen so deflate has something to chew on.

- **Sheet**: one Markdown table. Its header row names the columns, each
  with its type after a colon (`Price:money`; `text`, `number`, `money`,
  `percent`, `date`, `url`, `check`, `rich`), and its rows are rows 1, 2, 3,
  so `A1` is the first row under the names. `chart: bar` (`line`, `pie`) in
  the header asks for a chart: the first column is its labels, each other
  column of numbers a series named by its column.
  Formulas start with `=` and support `+ - * / ^ %`, parentheses, cell
  references (`B7`), ranges (`A1:C3`), comparisons (`= <> < > <= >=`) and
  `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN
  INT ABS SQRT MOD NPV IRR PMT FV PV`. Errors show as `#DIV/0`, `#REF`,
  `#NAME`, `#CIRC`, `#VALUE`, `#NUM`, `#ERR`. Dates are day counts, so they
  add and subtract; `TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY`
  work on them. A CSV, or a table without types, reads as a sheet too.
- **Pixel art**: one paragraph, a line per row, a letter per square (`.`
  empty, `a` to `h` the colours).
- **Write**: one block per line. Prefixes `# ` and `## ` for headings, `- ` and
  `+ ` for bulleted and numbered items; repeat the marker to nest (`-- `,
  `--- `). Inline toggles `*bold*`, `_italic_`, `^underline^`, `~strike~`,
  with `\` as the escape character. `@@<app>/<payload>` is an embedded
  document.
- **Deck**: TLO (`docs/tlo.md`), a slide between each `---`. The headline is
  `## :icon-name: Headline`, its layout an attribute: `{.title}`, `{.two}`
  (a paragraph `|` starts the right column) or `{.icon}`. The words are `- `
  bullets, nested by two spaces; `> ` lines are speaker notes; a fence named
  for an app (```` ```sheet ````) shows that document on the slide. The
  header holds `transition: cut` (`slide`, `zoom`; a fade unless said),
  `color: red` and `qr: no`. The print apps (zine, booklet, comic and the
  rest) write their pages the same way, prose as paragraphs, with
  `sides: 2` and `pages: 12` in the header.
- **Draw**: a table, a row per shape, `Kind | X | Y | W | H | Style |
  Label`, and the alt text in the header (`alt: ...`). Kinds are `r`
  rectangle, `e` ellipse, `d` diamond, `l` line, `a` arrow, `t` text and
  more (`src/lib/drawmodel.ts`); a join (`k`, `j`) names the rows of the two
  shapes it joins, counting from 0, in X and Y. `Style` is the fill, and may
  carry a colour letter and a text size digit after it (`1b3`). Coordinates
  are in 8-pixel grid units on a 640 by 400 canvas. **Motion** is the same
  table, a table `Shape | Keys` of what moves when, and `frames` and `fps`
  in the header.
- **Website**: `# Name` and a line about it, `=== Title` for each further
  page, `## Section` within a page, `- Point | detail` cards, `> Label | url`
  buttons, `@@app/payload` for another document on the page, `theme: amber
  serif dark` for the look. A line that is only a picture's address is a
  picture. The home page is what comes before the first `===`; a site with
  no `===` is one page navigated by its sections. `docs/website.md` is the
  design.
- **Calendar**: an optional `@Zone/Name` line (the zone the document was last
  edited in), then one span per line. `d<start>,<days>,<label>` is an all-day
  span whose start is a day count from 2020-01-01: a floating civil date, the
  same in every country. `t<start>,<minutes>,<label>` is a timed span whose
  start is a minute count from 2020-01-01T00:00Z: one absolute instant, shown
  in whichever zone the viewer picks. Numbers are base 36. A star and a
  letter after the length make a span repeat: `*d` daily, `*w` weekly, `*m`
  monthly, `*y` yearly, for ever; `*w9` nine times; `*w<2pi` until that day
  (counted like a start). It goes before the colour (`d1,2*w.g,Offsite`), so
  a reader without repeats still sees the first time, in colour. A timed span
  repeats at the same time of day in the document's zone. Time zone maths
  comes from the browser's `Intl` support, so no zone database is bundled.

## Styling: one stylesheet

Every TinyLittleOffice component renders into light DOM, so there is no CSS hidden
in shadow roots. The look lives in `src/styles.css` (three apps keep a
sheet of their own beside their editor: `anim.css`, `calc.css`, `outline.css`):

1. **Tokens.** Shoelace's design tokens are overridden at the top of the file
   (accent ramp, fonts, radii) and a small set of `--to-*` variables is built
   on them: surfaces and inks, accent, danger, success and warning, paper
   (white in both themes), three radii, two shadows. Change these and both
   our markup and the Shoelace controls follow.
2. **Shared pieces.** The classes an app reaches for before writing a rule
   of its own: `.to-toolbar`, `.to-hint`, `.to-empty`, `.to-icon-btn` (what
   `btn()` makes), `.to-add` (a dashed pill that adds something),
   `.to-count` (a number in a pill), `.to-eyebrow` (small capitals over a
   group), `.to-swatches` (what `swatches()` makes), `.to-tip` (the tooltip).
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

`templates('write')` (or `'sheet'`, `'deck'`) is the list a person is offered
on an empty document: each a name, a line on what it is for, and its body in
the app's format, ready for `link()` or to be filled in by a program.

`src/api.ts` is the source, built to `dist/api.js` (and `api.d.ts`) with the site. The same build feeds the `tinyoffice` command line in `packages/doc` (`npm run build:api`; it also renders a link to PDF/PNG/PPTX/XLSX headlessly). It is not published to a registry: the site is where the code lives, and `/llms.txt` is where programs learn the formats.

Plain links also take `&md=` (Markdown or CSV, shaped on opening) and `&by=` (who made it), and every envelope carries `by`, which a signature then proves. Two links compare at `#/compare/<app>/<payload>/<app>/<payload>` (or Share → Compare with another link…), with the lines the second changed.

## Shorter links that expire

Share → "Shorter link that expires…" asks tinier.tinylittleoffice.com
for a short link (an hour, a day, a week or a month). The long link is
encrypted in the browser with a random key; only the ciphertext is
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

Three things do leave the browser, each only when asked to: Trip fetches map
tiles and place searches from openstreetmap.org; the Share menu hands the
link to the service chosen; and an embedded page's host sees that its page
was loaded, not what the frame shows.

## Embedding

Share has "Copy embed code": an `<iframe>` on the document's `embed` view,
which is the document alone with a link back to the editor. The snippet has
a title, loads lazily, keeps its shape at any width and sends no referrer.

## Diagrams, and the tiny database

Org chart, Mind map, Swimlanes, Venn and Network are each a few dozen lines
(`src/apps/<id>.def.ts`): a function from an outline to Draw's shapes and
joins. `defineDiagram` (in `src/lib/diagram.ts`) turns that into an app, and
`src/apps/diagram.ts` is the one editor they share, drawing in one of three views (`diagram-shapes.ts`, `diagram-sheets.ts`, `diagram-page.ts`). Because the output is a
drawing, each is a picture, a PDF, a slide that builds shape by shape, and
opens in Draw to be rearranged by hand. Draw itself has joins that follow
their shapes, and more shapes (rounded box, hexagon, parallelogram,
cylinder, note).

Database is the same idea over `src/lib/reldb.ts`, a small relational
engine: tables written as Markdown tables under `## name` headings, joined
and queried, in a `sql` block, with a subset of SQL
(`SELECT`, `JOIN ... ON`, `WHERE`, `GROUP BY`, aggregates, `ORDER BY`,
`LIMIT`). Its picture is the schema; its queries are answered beneath.

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

A text or a slide can hold another document. It is stored as
`@@<app>/<payload>` (the part of a link that is the document) and drawn by
that app's `view`. In Write, paste a TinyLittleOffice link or use Insert; on a
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
respects the reduced-motion setting, and `e2e/apps.spec.ts` runs the axe
accessibility checker over every app in light and dark. One rule is switched
off there, with the reason beside it: compact toolbar pickers are named for
assistive technology but do not show a visible text label.

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
src/lib/<id>model.ts  document formats (formula.ts, richtext.ts for sheet and write)
src/lib/chart.ts      charts from a table
src/lib/templates.ts  what Write, Sheet and Deck can start from (widgets/template-picker.ts offers them)
src/lib/codec.ts      text <-> URL payload (deflate + dictionary + base64url)
src/lib/envelope.ts   creation time + signature wrapper around a body
src/lib/sign.ts       WebCrypto keys, signing, verification
src/lib/crypt.ts      password encryption of the packed envelope
src/lib/limits.ts     how much room a link leaves, service by service
src/lib/icons.ts      Lucide icons; iconsearch.ts finds and suggests them
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
put it under or after it, into a lane or a set to move it there; a floor
plan's rooms keep a place and move there). A line between two things is
tapped for its words; a guest at a table is a thing of their own. The
same document is always the text itself (Mod+Shift+T), and, for the
apps that are rows at heart (a page, a printed sheet), a list to fill
in (the List button). All of it comes from one description
(`src/lib/lines.ts`): the app lists its kinds of line as patterns,

```ts
form: [
  { name: 'Name', is: '# {Name}', once: true },
  { name: 'Section', is: '## {Section}' },
  { name: 'Dish', is: '{Dish} | {Price}[ | {What it is}]' },
]
```

and the shared form (`src/widgets/line-form.ts`) gives each line a row and
each `{field}` a box. `[..]` may be left out; `{Text:long}`, `{Day:date}`,
`{Picture:icon}` and `{Colour:choice=red,green}` pick the kind of box;
`indent: true` lets rows nest. What is saved, shared and written by
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
pages apps make (a store's cart, a game, the in-place editing of a page
preview) are fixed texts registered with `pageScript()` and hashed into
the policy at build time; a page's data travels beside its script as JSON
(`pageData()`), never inside it. A test checks that every page keeps to
that, so a document can never bring a script of its own, not even inside
the frame that shows it.
Once, on a new account: `npx wrangler login`, `npx wrangler d1 create tinier`
(its id goes in `tinier/wrangler.jsonc`), `npm run tinier:schema`.
