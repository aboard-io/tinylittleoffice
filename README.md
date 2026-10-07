# TinyLittleOffice

A tiny office suite that lives entirely in the URL.

Sixteen small apps, no server, no accounts, nothing to save. Every document is
encoded into the address bar, kept under 2,048 characters. Copy the link and
you have copied the file.

| App   | What it does                                                          |
| ----- | --------------------------------------------------------------------- |
| Drive | The documents saved on this device, in folders (nested with a slash): search inside them, move, rename, download the lot as a zip, or blow it all away. Private by default; the switch in the header turns it on. |
| Sheet | A 1,000-row, 6-column spreadsheet: formulas, business functions, charts. |
| Outline | An outliner: items under items, folded and unfolded, dragged about, zoomed in on; the same text a mind map or an org chart reads. OPML out. |
| Write | A one-page rich text editor: headings, bold, italic, lists.           |
| Deck  | Up to ten slides with a headline, bullets and an icon. Press Present. |
| Draw  | Boxes, ellipses, diamonds, lines, arrows and text labels on a grid.   |
| Calendar | Labelled spans of time on a month grid, shown in any time zone.    |
| Todo  | Tasks to tick off, with stars and due dates.                          |
| Board | A kanban board: the stages of a workflow, cards, and limits per stage. |
| Gantt | Tasks as bars on a calendar; drag to move, drag the edge to resize.   |
| Trip  | A route on an OpenStreetMap map: stops in order, each with a note.    |
| Motion | A drawing that moves: any shape from Draw, given moments at which it is somewhere else, nearer, bigger or turned, with effects for memes. |
| Org chart, Mind map, Swimlanes, Venn, Network | Diagrams drawn from a few lines of text. |
| Database | A tiny relational database: tables, rows, SQL queries, schema drawn. |
| Website | A one-page site from a few lines; downloads as one HTML file. |
| Store | A shop page with a working cart; orders go by email. |
| Invoice | Who, what, how much; sums done, PDF to send. |
| Contract | A plain-words agreement each party signs with a key held in their browser. Proves the words have not changed since; does not prove who holds a key. |
| Zine | Eight pages on one letter sheet, one- or two-sided, imposed for folding; also a tap-to-read web page. |
| Booklet, Brochure | The zine's kit with other folds: half-letter pages nested (8 to 20), a trifold. |
| Comic | Text in, a folded mini comic out. |
| Poster, Name badges, Recipe cards | Pages typed into directly, laid out by the deck's engine (a page type is a template), tiled on letter sheets. |
| Menu, Résumé | A few lines in, one letter sheet out, fitted to the page. |
| Stock and flow | A model as a Sankey diagram with a slider for every assumption. |
| Pixel art | A grid of squares to colour. |
| Floor plan, Seating chart, Family tree, Timeline | More diagrams from a few lines. |
| Games | Word search, Adventure, Scavenger hunt, Trivia, Fill in the blanks, Spinner, Flashcards. |
| Together | Poll, Secret Santa (a private link per person), Split the bill. |
| Personal | Log, Chord chart. |

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
npm test           # unit tests for the codecs and the formula engine
npx playwright install chromium && npx playwright test   # browser tests, desktop and phone
```

The build is `index.html`, one stylesheet and two scripts (the map library
for Trip loads only when Trip is opened), plus icons. Host it on any static
file server. `VITE_SITE_URL` in `.env` is the address it will be published
at; the link-preview tags need it. `node scripts/make-icons.mjs` redraws the
PNG icons and the preview card in `public/`.

Trip is the one app that uses the network while you work: map tiles come
from openstreetmap.org and place searches go to its Nominatim service. The
route itself stays in the URL like every other document.

## How a document fits in a URL

The URL looks like `https://host/#/v2/sheet/YXQAA...`. `v2` is the version of
the URL format. Version 2 added dictionary compression; it reads everything
version 1 wrote, and links from before versions existed (`#/sheet/...`) are
read as version 1. Older links are rewritten on the next edit. The part after
the app name is the document:

1. Each app serialises its content to a compact text format (below), and the
   shell wraps it in the envelope described under "Creation time and
   signatures".
2. That text is deflated with [fflate](https://github.com/101arrowz/fflate)
   against a small shared dictionary (common English words, the apps' own
   markup, icon names) and base64url-encoded, prefixed with `y`. Because both
   ends already know the dictionary, short documents come out 20 to 35 percent
   smaller than plain deflate, which is still read under the prefix `z`. The
   dictionary in `src/lib/codec.ts` is frozen: changing a byte of it would
   break every `y` link. For very short documents, where
   compression would cost more than it saves, the raw UTF-8 is base64url-encoded
   instead and prefixed with `r`. The shorter of the two wins. Uppercase `Z`
   and `R` mark payloads that carry an envelope; lowercase ones from older
   links decode as a bare body.
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
| `#/v2/sheet.xlsx/<payload>`  | Excel workbook, formulas intact (`.xls` also works) |
| `#/v2/sheet.csv/<payload>`   | CSV of the computed values                        |
| `#/v2/write.rtf/<payload>`   | Rich Text                                         |
| `#/v2/write.html/<payload>`  | A standalone web page                             |
| `#/v2/deck.pptx/<payload>`   | PowerPoint, icons included (`.ppt` also works)    |
| `#/v2/draw.svg/<payload>`    | SVG image                                         |
| `#/v2/cal.ics/<payload>`     | iCalendar (`.ical` also works)                    |
| `#/v2/<app>.md/<payload>`    | Markdown (every app; checkboxes, tables, headings) |
| `#/v2/board.csv/<payload>`   | CSV of stage and card                             |
| `#/v2/gantt.csv/<payload>`   | CSV of tasks with start and end dates             |
| `#/v2/trip.gpx/<payload>`, `.geojson` | GPX route, or GeoJSON                    |
| `#/v2/anim.svg/<payload>`    | Animated SVG                                      |
| `#/v2/<app>.pdf/<payload>`   | PDF of any document, a page per page or slide     |
| `#/v2/<app>.png/<payload>`   | The whole of any document as one picture          |
| `#/v2/<app>.html/<payload>`  | Any document as a plain web page with preview tags |

One view is not a file: `#/v2/deck.show/<payload>` opens a deck presenting.
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

- **Sheet**: rows separated by newlines, cells by tabs, trailing blanks trimmed.
  Formulas start with `=` and support `+ - * / ^ %`, parentheses, cell
  references (`B7`), ranges (`A1:C3`), comparisons (`= <> < > <= >=`) and
  `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN
  INT ABS SQRT MOD NPV IRR PMT FV PV`. Errors show as `#DIV/0`, `#REF`,
  `#NAME`, `#CIRC`, `#VALUE`, `#NUM`, `#ERR`. A first line `!bar`, `!line` or
  `!pie` asks for a chart of the table, and after a `|` come the columns'
  types, a letter each (`!bar|td$`): text, number, money `$`, percent `%`,
  date, link `u`, checkbox, rich text. Dates are day counts, so they add and
  subtract; `TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY` work on
  them.
- **Write**: one block per line. Prefixes `# ` and `## ` for headings, `- ` and
  `+ ` for bulleted and numbered items; repeat the marker to nest (`-- `,
  `--- `). Inline toggles `*bold*`, `_italic_`, `^underline^`, `~strike~`,
  with `\` as the escape character. `@@<app>/<payload>` is an embedded
  document.
- **Deck**: slides separated by a blank line. In each slide an optional
  `:icon-name` line, then the headline, then one bullet per line. A layout
  may follow the icon name: `:rocket:t` title slide, `::2` two columns (a
  line `|` starts the right one), `:star:i` bullets beside a big icon. A line
  `@@<app>/<payload>` shows another document on the slide. A first chunk
  `!fade`, `!slide` or `!zoom` sets the deck's transition.
- **Draw**: one shape per line, `kind,x,y,w,h,fill,label`. Kinds are `r`
  rectangle, `e` ellipse, `d` diamond, `l` line, `a` arrow, `t` text. `fill`
  may carry a colour letter and a text size digit after it (`1b3`).
  Coordinates are in 8-pixel grid units on a 640 by 400 canvas.
- **Calendar**: an optional `@Zone/Name` line (the zone the document was last
  edited in), then one span per line. `d<start>,<days>,<label>` is an all-day
  span whose start is a day count from 2020-01-01: a floating civil date, the
  same in every country. `t<start>,<minutes>,<label>` is a timed span whose
  start is a minute count from 2020-01-01T00:00Z: one absolute instant, shown
  in whichever zone the viewer picks. Numbers are base 36. Time zone maths
  comes from the browser's `Intl` support, so no zone database is bundled.

## Styling: one stylesheet

Every TinyLittleOffice component renders into light DOM, so there is no CSS hidden
in shadow roots. The whole look lives in `src/styles.css`:

1. **Tokens.** Shoelace's design tokens are overridden at the top of the file
   (accent ramp, fonts, radii) and a small set of `--to-*` variables is built
   on them. Change these and both our markup and the Shoelace controls follow.
2. **Base, shell, shared pieces, apps, responsive.** Plain class names,
   prefixed by app (`.sheet-`, `.write-`, `.deck-`, `.draw-`, `.cal-`) and
   `.to-` for the shell. The responsive section at the end collapses the
   navigation into a drawer and tightens spacing under 760px.

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
https://tinylittleoffice.com/sheet/#title=Sales&doc=!bar%0AQuarter%09Sales%0AQ1%09120%0AQ2%09180
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

A document is a link, so a program makes one by making a string. Two packages do the packing, byte for byte as the site does:

- **JavaScript** `@tinylittleoffice/doc` (`packages/doc`): `link`, `linkFromMarkdown`, `parse`, `compare`, `evaluateSheet`, `runModel`, `signed`/`verified`, `sealed`/`open`, and a `tinyoffice` CLI that also renders a link to PDF/PNG/PPTX/XLSX headlessly. Built from `src/api.ts` with `npm run build:api`.
- **Python** `tinylittleoffice` (`packages/python`): `link`, `link_from_markdown`, `parse`. Its dictionaries are generated from the TypeScript (`npm run py-dicts`), and a unit test checks both sides produce the same bytes.

Plain links also take `&md=` (Markdown or CSV, shaped on opening) and `&by=` (who made it), and every envelope carries `by`, which a signature then proves. Two links compare at `#/compare/<app>/<payload>/<app>/<payload>` (or Share → Compare with another link…), with the lines the second changed.

This is the office suite for agents chatting: an agent writes a link, hands it over in whatever channel it already has, the next agent reads it and emits a new one. Documents are values; the history is the sequence of links; nothing needs a server.

## What the server sees

Nothing of any document. A document is the part of the address after `#`,
which a browser keeps to itself: it is not in the request, so it cannot be
in a log. That is why plain-parameter links use `#` and the same thing after
`?` is deliberately not understood. The server is static files; its request
log is switched off as well (`deploy/nginx.conf`), though a proxy in front
of it may keep its own record of which files were asked for.

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
engine: tables written as text, joined and queried with a subset of SQL
(`SELECT`, `JOIN ... ON`, `WHERE`, `GROUP BY`, aggregates, `ORDER BY`,
`LIMIT`). Its picture is the schema; its queries are answered beneath.

## Adding an app

```sh
npm run new-app notes "Notes"
```

writes a working app (a list you can add lines to), its test, and adds it to
the menu. An app is two files:

- `src/apps/<id>.def.ts`: the **definition**. Its name, how to read a title
  out of a document, how to draw it (`view`, pages of SVG), and any formats
  of its own. It never touches the DOM, so it is tested with plain node.
- `src/apps/<id>.ts`: the **editor**, a `DocElement`. It is handed the
  document as text, and calls `commit()` when it changes.

Everything else is driven by the definition, for every app at once: the menu
and routes, the link, password and signature, `.pdf` / `.png` / `.html`
downloads, the share menu and card, the list of keyboard shortcuts, and
being embedded in a text or shown (and built, step by step) on a slide.

One import has everything an editor needs:

```ts
import { DocElement, defineElement, html, state, tool, icon, UI, isKey } from '../kit.ts';
```

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
src/kit.ts            everything an editor imports
src/kit/              registry, drawing, PDF, zip, embeds, browser helpers
src/apps/index.ts     the list of apps
src/apps/<id>.def.ts  each app's definition: title, picture, downloads
src/apps/<id>.ts      each app's editor
src/lib/<id>model.ts  document formats (formula.ts, richtext.ts for sheet and write)
src/lib/chart.ts      charts from a table
src/lib/codec.ts      text <-> URL payload (deflate + dictionary + base64url)
src/lib/envelope.ts   creation time + signature wrapper around a body
src/lib/sign.ts       WebCrypto keys, signing, verification
src/lib/crypt.ts      password encryption of the packed envelope
src/lib/limits.ts     how much room a link leaves, service by service
src/lib/icons.ts      Lucide icons; iconsearch.ts finds and suggests them
src/widgets/meter.ts  <to-meter>: URL space ring + copy button
src/styles.css        the only stylesheet
scripts/              new-app, share cards and icons
test/                 unit tests (node --test)
e2e/                  Playwright browser tests
```

## One toolkit for text apps

Every app that is "a few lines of text" is edited on its picture: tap
empty space to add a thing, tap a thing for its buttons (add one like
it, give it an icon, edit its words, take it away), tap twice to type
on it, drag it where it goes (onto another thing to put it under or
after it; a floor plan's rooms keep a place and move there). The same
document is a list to fill in (the List button) or the text itself
(Mod+Shift+T). All three come from one description
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

The included GitHub Actions workflow runs the tests on every push. The site
is static: `npm run build` and serve `dist/` from anywhere (`deploy/deploy.sh`
puts it on an exe.dev VM).
