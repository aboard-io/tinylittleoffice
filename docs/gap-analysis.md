# Gap analysis: old tree (main, v0-before-rebuild) vs rebuilt tree (next)

Old = `~/workspace/tinyoffice`, new = `~/workspace/tinyoffice-next`. Read-only survey, 2026-10-09.
"Decision" cites `docs/rebuild.md`. The copy on **main** is the newer one. The copy on `next` lags it: its table
still lists Wordsearch, Spinner, Santa and Split, and it has no "Home and templates" section.

Status key: **present**; **partial** (some of it is there); **missing**; **dropped** (dropped by decision).

## 1. Privacy, trust, signing (the gaps Paul named)

| Feature | Old file(s) | What it did | Status | What porting it means |
|---|---|---|---|---|
| Password protection (sealed links) | src/lib/crypt.ts, lib/privacy.ts, widgets/privacy.ts (password prompt), app.ts (sealed state) | AES-256-GCM over the packed document, with the key derived from a password by PBKDF2-SHA-256 (600k iterations). The link carries `E<salt\|iv\|ct>`. Opening it asks for the password, the key is derived once per session and each edit gets a fresh IV. A sealed link downloads its files once unlocked, and an embed of one says it is locked. | **missing** (no PBKDF2 or `E` payload anywhere in next) | Port the pure code: crypt.ts (87 lines, WebCrypto only) into `src/kit/crypt.ts`. Teach `kit/codec.ts` and `route.ts` the sealed payload. In the kit, rebuild the unlock prompt (a `<to-dialog>`), a "Password" item, the locked state in the header and the re-seal on every change in `shell.change()`. It belongs to every app (shell level). Bring over test/crypt.test.ts. |
| Envelope: created time, by, key, sig | src/lib/envelope.ts | Head fields title/by/created/key/sig, with created stamped to the minute on the first edit. The signature covers app + created + body + title + by. | **partial**: `src/doc/model.ts` names the keys and `write/model.ts` SHELL_KEYS reserves them, but nothing sets `created` or `by`, and nothing signs or reads `key`/`sig` | Port the pure code: the signing message (`signingMessage`) and the created-time quantising, over the kernel's head. In the kit: stamp `created` on the first change in `shell.change()` (a `head` op). |
| Document signing (Ed25519, P-256 fallback) | src/lib/sign.ts, lib/privacy.ts | Each browser gets a key pair, kept through store.ts. The document is signed, the signature verified against the current content, and the fingerprint shown (10 hex characters of the key's SHA-256). | **missing** | Port the pure code: sign.ts (128 lines, WebCrypto) to `src/kit/sign.ts`, and the key kept through `kit/store.ts` (privacy.ts already says "later, a signing key"). In the kit: Sign / Unsign and the check run on every change. |
| Signed-state display: the Privacy/trust button | app.ts `renderTrust()`, header tags in `renderTitleLine()` | A header button: red and unlocked when unsigned, green shield when the signature holds, red shield-off on a mismatch, accent lock when sealed. Pills beside the title read "locked", "signed" and "signature mismatch". | **missing** | Rebuild in the kit: a trust button in `<to-shell>`'s header with the four states, plus the pills. It depends on the sign and crypt ports above. |
| Signing key management | widgets/privacy.ts, lib/privacy.ts | Export the key, import it (to sign as the same key on another device), forget it, and see its fingerprint. | **missing** | Rebuild in the kit: a section in the document dialog or the drawer. `forgetKey` goes into `kit/privacy.ts` `setPrivate()`. |
| Contract: each party signs | src/apps/contract.def.ts, contract.ts | Each person types a name and signs with their browser key. Name, public key and signature go into the ```` ```signatures ```` fence. Each signature covers the text plus the signer's own name, so a second signer does not break the first. Every signature is re-checked as the text changes. | **restored** (RS-2): src/apps/write/contract.ts (the old message exactly, so old contracts verify; the fence is Name \| Key \| Signature \| Signed), the card's states and **Sign this contract** in write/editor.ts, the signature block in print, PDF, HTML, DOCX and RTF (write/view.ts) | Port the pure code: contract.def.ts's `parseContract`/`serializeContract`/`signedMessage`/`keyMark` over the kernel's fence block. In the Write app: a "Sign" action on the signatures card (name field, then sign with kit/sign), each row marked valid or mismatched by `verify`, and a printed signature block in view.ts. Depends on sign.ts. |
| "By" (who made it) | app.ts doc dialog, envelope `by`, `&by=` link param | A field in the document dialog. It shows "signed" when a valid signature covers it, otherwise "unsigned: a claim, not proof". | **missing** | In the kit: a field in the `to-doc` dialog writing the `by` head field. Read `&by=` with the plain-parameter links (below). |
| Created time in the header | app.ts `renderTitleLine` (`.when`), doc dialog "Made" | Clock icon and date beside the title. The dialog shows local time and UTC. | **missing** | In the kit: set `created` (see envelope) and show it in the header and the `to-doc` dialog. |
| Saved/Private state in the header | app.ts `.to-keep` button | A header toggle: shield "Private" or folder "Saved", with a tip explaining each. | **partial**: the switch works, but it lives in the drawer (`kit/drawer.ts`) and the header shows no state | In the kit: a small state indicator in `<to-shell>`'s header that opens the drawer or toggles. |
| "What this device holds" panel | widgets/privacy.ts | Lists the documents, key, preferences and app copy, each with Forget/Remove, plus "the app and every document in one file". | **partial**: drawer switch and confirm. No per-item list, no export of everything. | In the kit: an inventory in the drawer. The zip export uses `kit/zip.ts`. |
| Download everything (zip) | app.ts `downloadAll`, widgets/drive.ts | The offline app and every kept document, each as a page, in one zip. | **missing** | In the kit: library.ts entries to an HTML index plus pages, zipped with kit/zip.ts. |

## 2. Agents, programs, sharing surfaces

| Feature | Old file(s) | What it did | Status | What porting it means |
|---|---|---|---|---|
| Agent skill | skill/tinyoffice/SKILL.md, SKILL.tpl.md, scripts/make-skill.ts, test/skill.test.ts | The guide to writing every app's documents as links, built from a template whose examples must round-trip through their apps. | **restored** (RS-3): skill/tinyoffice, scripts/make-skill.ts, test/skill.test.ts | Port make-skill.ts against the new apps' `templates` and kernel `parse`/`write`. Rewrite the template for v1 links and the 13 apps (diagram kinds, deck formats, sheet templates). Add skill.test. |
| llms.txt | vite.config.ts (copied the skill to dist/llms.txt), public/_headers CORS | The skill served at /llms.txt for programs. | **restored** (RS-3): public/llms.txt, generated with the skill; CORS in _headers | In the build: `afterBuild()` in next's vite.config.ts writes llms.txt from the skill. Add a CORS header in public/_headers. |
| Plain-parameter links `#title=&doc=&view=&md=&by=` | app.ts (lines ~236-256), lib/markdown.ts | A program or person writes a document as `/<app>/#title=…&doc=…`. It is rewritten to the packed link on arrival. | **restored** (RS-3): src/kit/plain.ts, read by the shell and replaced on arrival | Pure code: a `route.ts` branch that reads the params and returns text. In the kit: the shell encodes and replaceStates. It is the basis of the skill. |
| /api.js programmatic API | src/api.ts, vite.api.config.ts | `link`, `parse`, `templates`, `example`, `evaluateSheet`, `runModel`, `lint`, `compare`, `signed`/`verified`, `sealed`/`open` as ESM served by the site. | **restored** (RS-3) without sign/seal: src/api.ts, vite.api.config.ts, /api.js | Rebuild `src/api.ts` over src/doc (parse/write), kit/codec, route, the app defs' templates, doc/formula. Sign and seal depend on the ports above. Plus a vite library build. |
| packages/doc CLI (`tinyoffice`) | packages/doc/ | Command line: apps, example, link, read, eval, diff, lint, sign, verify, seal, open, render (headless). | **restored** (RS-3): apps, templates, link, read, file, diff (packages/doc/tinyoffice.ts) | Rebuild on the new api.ts. |
| /tinyoffice.js link()/embed() helper | public/tinyoffice.js | A tiny script for pages to make links and iframes. | **restored** (RS-3): public/tinyoffice.js | Port and update to v1 links. |
| Compare / diff two links | src/lib/diff.ts, widgets/compare.ts, `#/compare/...`, Share → "Compare with another link…" | Two documents side by side, with the lines the second changed (LCS diff). | **restored** (RS-3): block by block, src/kit/{diff,compare}.ts, Compare… in the menu | Port the pure code: diff.ts (20 lines). In the kit: a compare page routed at `#/compare/…` and a Share item. |
| Open a .tlo / import Markdown or CSV | app.ts `renderImport`, lib/markdown.ts `fromMarkdown` | Paste or pick .md/.csv/.tlo. A .tlo opens as its own app and title. Markdown is shaped by the app's reader. | **dropped** for lenient importers (memory notes-round-two and the brief; no line found in rebuild.md). Opening a .tlo file is **restored** (RS-3): drop it on the page, or Open a file… in the menu. | In the kit: a file picker that reads a `.tlo` head `app:` and routes. TLO is parsed by the kernel, so no lenient reader is needed. |
| Markdown export for every app | kit/core.ts `COMMON` (.md) | `.md` under Download in every app. | **restored** (RS-3): `md` in `KIT_FORMATS`; the `.tlo` carries `app:` | In the kit: add `md` to `KIT_FORMATS` (the TLO text, with `referenceNotes` for footnotes). |
| Social share targets | app.ts `SERVICES` | Bluesky, Mastodon, X, LinkedIn and email compose boxes with the link. | **restored** (RS-3): Post the link in Share, through the link guard | In the kit: menu items in `shell.shareItems()`, intent URLs only. |
| Save a picture (Share) | app.ts share 'png' | A PNG of the document from the Share menu. | **present** (Download → Picture (PNG)) | — |
| Embed view and "Copy embed code" | app.ts `renderEmbedded`, `.embed` view, Share item | `#/v0/<app>.embed/…` shows the document alone with page arrows and "Open in TinyLittleOffice", for an `<iframe>`. Share copies a lazy-loading, no-referrer iframe snippet. | **restored** (RS-3): the `.embed` view at /embed/, the only framable address; Copy embed code | In the kit: an embed render in the shell (pages from `def.view`) and a Share item. Add a CSP `frame-ancestors` exception for the embed route only. |
| Deck "show" link | app.ts `presents`, `copy-show`, `deck.show/` view | The link that opens a deck already presenting. It was what Copy handed out for decks. | **restored** (RS-3): `?show`; Copy show link in a deck's Share | In the kit: `view === 'show'` sets a property the deck editor reads. In the Deck app: start presenting on load, with "Edit this deck" to leave. |
| Copy a link that downloads .ext | app.ts doc dialog "Download" row | Per format, a button that copies `#/v0/<app>.<ext>/…`. | **restored** (RS-3): Download's "Copy a link that downloads" group | In the kit: rows in the `to-doc` dialog. |
| Per-app OG share cards | public/og/*.png (33), scripts/make-icons.mjs, vite.config og:image per app | Each app page previews with its own sketch card. | **restored** (RS-3): scripts/make-cards.ts, public/og/<app>.png, og:image per app page | Port make-icons.mjs's card sketches for the 13 apps. Set og:image per app in `afterBuild()`. |
| Shortener: TTL choices | lib/short.ts, tinier/ | An hour, a day, a week or a month. | **present** (plus a year) | — |
| Shortener: owner links, update, extend, delete, kept owner links | — (new) | — | **present** (new in next: tinier PUT/DELETE, kit/short.ts, kit/links.ts) | — |
| Shortener worker, D1, rate limit, cron, no logs | tinier/* | — | **present** (superset) | — |

## 3. Shell and kit

| Feature | Old file(s) | What it did | Status | What porting it means |
|---|---|---|---|---|
| Search inside documents | src/lib/search.ts, widgets/drive.ts | All words, any order, quoted phrases, case/accent-insensitive. Ranked title > app/folder > text, with matches marked and lines excerpted. | **missing** (home lists kept docs per app only) | Port the pure code: search.ts (122 lines, no DOM). In the kit: a search box on `<to-home>` over `library()` that decodes each hash for its text. Bring test/search.test.ts. |
| Drive page, folders, move/rename | widgets/drive.ts, `#/drive` | Folders nested with "/", move, rename, make and drop folders. | **dropped** (rebuild.md phase 8: "Drive is just documents under the icons") | — |
| Library of kept documents | lib/library.ts | Kept while Saved. | **present** (kit/library.ts, under each app on home) | — |
| Link guard | widgets/link-guard.ts | No link in a document opens without showing the full address and asking (red Cancel, green Go). Non-web schemes never open. `goLinks()` puts open buttons beside plain-text addresses. | **missing** (`link-pop` "Open" and deck/site "Open in a new tab" open directly) | Port the pure part (the scheme allow-list). In the kit: one capture-phase click guard in the shell plus a confirm `<to-dialog>`. Bring test/dom/link-guard.test.ts. |
| Keyboard shortcuts dialog (Mod+/) | app.ts `GLOBAL_KEYS`, `keys-dialog`, AppDef.shortcuts | Lists the shortcuts that work everywhere and the app's own. | **missing** | In the kit: an `AppDef.shortcuts` field (or derived from bar tools' `keys`) and a `<to-dialog>` on Mod+/. Put it in the drawer too. |
| Mod+S downloads the first format | app.ts GLOBAL_KEYS | — | **missing** | In the kit: one key in `shell.onKey`. |
| Undo/redo buttons | app.ts header `renderDocHead` | — | **present** (moved to each app's bar, `undoTools()`) | — |
| "New <app>" in a new tab | app.ts header | — | **present** (`.to-here` link, same tab) | — |
| Skip link | app.ts `.to-skip` | "Skip to the document". | **missing** | In the kit: one button in `<to-shell>`. |
| Size of everything (zoom stepper) | app.ts drawer `.to-size` | 80–200% UI scale, remembered. | **missing** | In the kit: a drawer control and a pref in `kit/privacy.ts` PREFS. |
| Tooltips (hover, focus, phone long-press) | src/kit/tip.ts | One tooltip for the page, including a long press on phones. | **partial**: native `title` attributes only, nothing on phones | In the kit: port tip.ts (163 lines) or decide `title` is enough. |
| Drawer groups with folding clusters | app.ts drawer | Apps grouped, with folding sections. | **partial**: flat find-an-app list (13 apps; grouping matters less) | Optional. |
| Newer-link-version warning | app.ts `version > LINK_VERSION` pill | "made by a newer TinyLittleOffice (vN)". | **missing** (`route.ts` parses version, `shell.ts` ignores it) | In the kit: one line in `onHash` and the header. |
| Unreadable-link page | app.ts `renderUnreadable` | — | **present** | — |
| URL meter / limits | widgets/meter.ts, lib/limits.ts | Ring, count, copy button, rooms on hover, doc dialog table. | **partial**: ring, warn/over colours and dialog rooms table are present. The meter's copy button and hover rooms are gone, and there is no "over limit" pill. | In the kit: small additions to the shell header. |
| Document dialog | app.ts `renderDialog` | Made, By, Link size and version, Download links, rooms, privacy. | **partial**: Title, link length, short link length and rooms only | See the created, by, download-link and privacy rows. |
| "Open as another app…" | app.ts `renderOpenAs`, `convert()` | Any app's reading of this document, opened in a new tab (a list as a board, an outline as slides…). | **partial**: hand-offs only for outline → deck/diagram (mind, org, net), draw → anim, diagram → draw | In the kit: `Handoff`s per app (todo ↔ board, board → todo, cal ↔ todo, outline → todo/board…). The converters are pure functions over the kernel. |
| Insert: a new blank document of any app inline | kit/browser.ts `insertOptions`/`insertedRef`, `editRef` | Insert a new Drawing, Table, Chart, Map, Calendar, Board… into a text, slide or outline item, then edit it in a dialog. | **partial**: Insert has Table (Write and Deck), Web Picture, Web Embed, and "Tiny Little Office Doc…", which takes an existing link only. There is no blank Drawing, Chart, Map etc. | In the kit: Insert items that splice a fence with `appOf(id).blank()` and open `editDoc()` (kit/doc-dialog.ts exists). Shared by Write, Deck, Outline and Site. |
| "From a template" in Insert / in an open document | widgets/template-picker.ts ("Start from a template…" button, gallery on empty docs) | Templates offered inside an empty document. | **dropped** (rebuild.md "Home and templates": "No template dialog anywhere"). Templates are on home only. Insert never offered "from a template" in the old tree either. | If wanted: Insert items "<App> from a template ▸" reusing `<to-templates>` from kit/home.ts to make the fence. |
| Insert: QR code of this document | kit/browser.ts `qr-self`, apps/qr.def.ts | A QR of the document's own link, inside a text or an outline. | **partial**: only the deck's closing slide (`qr:` head) and Share → QR code | In Write/Outline Insert: a `qr` fence drawn by kit/qr.ts from the shell's link (`setLink`-style context). |
| QR code dialog (PNG/SVG) | widgets/qr-dialog.ts | — | **present** (shell `to-qr` dialog) | — |
| Insert type-to-filter | widgets/insert-box.ts | Typing narrows the Insert list. | **partial**: kit/menu.ts has arrows, no filtering | Minor: a filter in `<to-menu>`. |
| Date dialog | widgets/date-dialog.ts | Native picker, several written forms. | **present** (`text.exec('date')`; check formats) | — |
| Link dialog | widgets/link-dialog.ts | — | **present** (kit/link-pop.ts) | — |
| Icon picker and search | widgets/icon-picker.ts, lib/iconsearch.ts | — | **present** (kit/icons-picker.ts, icons-search.ts) | — |
| Offline copy (service worker) | lib/offline.ts, sw.ts, scripts/offline-files.ts | — | **removed** (Paul, 2026-10-10: the switch, the worker and its build plumbing deleted) | — |
| Install prompt ("Add to home screen") | lib/offline.ts, app.ts drawer | `beforeinstallprompt`, with iPhone instructions. | **missing** (manifest present, no prompt or hint) | In the kit: port the install half of lib/offline.ts into kit/install.ts and the drawer. |
| Print / PDF for every app | kit/core.ts printHtml, kit/browser.ts, kit/pdf.ts | Print dialog, plus a `.pdf` file (JPEG pages) and a `.print` view. | **partial**: Print (Mod+P, `.print`/`.pdf` views) through the browser. There is no direct `.pdf` file download and kit/pdf.ts is not ported. | Port kit/pdf.ts if a real file is wanted (e.g. for the `.pdf` view and agents). |
| Text PDF (selectable, bookmarked) | kit/textpdf.ts | Outline → Helvetica PDF with bookmarks and live links. | **missing** | Port the pure code: textpdf.ts (198 lines, no DOM). Outline app export `pdf`. |
| Language / i18n, theme | — | — | **present** (new: i18n) | — |
| Shoelace UI | lib/shoelace.ts | — | **dropped** (rebuild.md phase 5) | — |
| List mode (form editors) | lib/lines.ts, widgets/line-form | — | **dropped** (memory notes-round-two) | — |
| tidy (loose text into small page apps) | lib/tidy.ts | Read loosely written text into the form of the small apps. | **dropped** (went with the small tools and the lenient importers) | — |

## 4. Apps: features

| Feature | Old file(s) | What it did | Status | What porting it means |
|---|---|---|---|---|
| Presenting: slides build one reveal per click | apps/deck.ts, lib/slide.ts | — | **present** (deck/editor.ts, `slideSteps`, double click shows all) | — |
| Presenting: an embedded document builds piece by piece | AppDef.steps in cal, board, draw, gantt, todo, trip, outline, sheet, site, links, invoice, diagram, fold | A slide holding a drawing reveals a shape a click, a table a row, a map a stop… | **missing** (`slideSteps` returns 0 when the slide shows a sub-document) | In the kit: `AppDef.steps?(doc)` and `view(doc, { upTo })`. Per app: count and draw `upTo` items. Deck: use them in `slideSteps`/`slidePage`. |
| Trip presenting (fly to each stop) | apps/trip.ts `present`, `goTo(step)` | On a slide, the map flies to each stop in turn and names it. | **missing** | Trip app: a `present`/`step` mode in trip/editor.ts. It depends on the embedded-steps row. |
| Seating place cards | apps/seating.def.ts `placeCards`, lib/print.ts `tile` | `.cards.pdf`: a 4×2.5 in card per guest, name large, table small, eight to a letter sheet with cut lines. | **missing** | Port the pure code: `placeCards` plus print.ts `tile` into diagram/view.ts. Diagram app: an export `cards` (print of the pages) shown when `kind: seating`. |
| Invoice | apps/invoice.def.ts, invoice.ts | A form like paper, sums as typed, PDF. | **present** (Write template with head fields as inputs and a formula table; rebuild.md on main) | — |
| Calculator money modes (mortgage, investment, cash flow NPV/IRR/payback, interest) | lib/calc.ts, calc.def.ts | Boxes in, plus a headline card, table and chart. | **partial**: dropped from the calculator by decision (docs/kernel.md §5 and risk 6: "the money modes are Sheet templates now"), but only "Loans compared" exists among the sheet templates. There is no mortgage, investment, cash flow or interest template. | Sheet templates: mortgage (PMT plus an amortisation table and chart), investment (FV), cash flow (NPV/IRR/payback), interest (compound vs simple), using doc/formula.ts functions. |
| Calculator: units, algebra, graph, named tape | calc.ts, calc-math.ts | — | **present** (calc/math.ts, `mode: graph`) | — |
| Calendar: zones, repeats, year view, Gantt | calmodel.ts, gantt.* | — | **present** (cal: zone globe, `every`, year mode, `view: gantt`) | — |
| Calendar: flip to the author's zone | apps/cal.ts | One click shows the document's own zone. | **unverified / partial** (zone picker present; no "author" control found) | Cal app: a bar item to set the view zone to `head.zone`. |
| Draw: pen, freehand, joins, extra shapes | draw.ts, drawmodel.ts | — | **present** (kinds r o e d h p c n, Points, k/j joins, freehand 'f') | — |
| Pixel art | pixel.* | — | **present** as Draw's pixel mode plus background tile (decision) | — |
| Motion: keys, effects, morph, GIF/SVG | anim.* | — | **present** | — |
| Folds: zine, booklet, brochure, comic, poster, badges | lib/fold.ts, *.def.ts | — | **present** as Deck `format:` (sides, `how()`, sheets on print) | — |
| Diagrams: org, mind, lanes, venn, net, seating, family, timeline | *.def.ts, lib/diagram.ts | — | **present** (Diagram kinds) | — |
| Small tools: wordsearch, spinner, Secret Santa, split | *.def.ts | — | **dropped** (rebuild.md on main: "The small tools … are dropped (Paul, 2026-10-09)") | — |
| Web embed, alt text for pictures | web.def.ts, web.ts | — | **present** (kit/embeds.ts, insert-dialogs `askPicture` alt) | — |
| Footnotes, icons, links in rich text | lib/richtext.ts | — | **present** (src/doc/notes.ts, `<to-text>`) | — |

## 5. Exports per app

Kit-wide (old `COMMON`: pdf, png, html, md, tlo, plus gif for moving things). New `KIT_FORMATS` (kit/exports.ts): print/pdf (browser), png, html, tlo. `.md` for every app and the `.pdf` file (JPEG pages) **restored** (RS-3). File-extension aliases (`.xls`, `.doc`, `.ppt`, `.ical`, `.json`) are dropped (no aliases rule).

| App | Old exports | New exports | Status |
|---|---|---|---|
| Sheet | xlsx, csv | xlsx, csv, chart.svg, chart.png | present (+) |
| Write | docx, rtf, html (own), md | docx, md, rtf, html | present |
| Outline | opml, **pdf (text PDF)**, txt | opml, md, txt | present: the text PDF **restored** (RS-3) |
| Deck | pptx, gif, show link, html | pptx, html (plays), slide PNGs zip, gif | present; the show link **restored** (RS-3) |
| Draw | svg | svg, tile.svg, tile.png | present (+) |
| Diagrams (all kinds) | svg; seating **cards.pdf** | svg | **partial**: seating place cards missing |
| Calendar | ics | ics, csv | present (+) |
| Gantt | csv, ics | (cal with `view: gantt`) ics, csv | present (merged); check the csv has level and done % columns |
| Todo | md, ics | md, ics | present |
| Board | csv | csv | present |
| Trip | gpx, geojson | gpx, geojson | present |
| Motion | svg, gif | gif, svg | present |
| Calculator | (common only) | txt (tape) | present (+) |
| Folds (zine…badges) | html (tap-through), pdf (imposed sheets) | deck html, print of the sheets | present (the PDF goes through the print dialog) |
| Invoice, Contract | html as paper | Write html/docx/print | present, with the contract's signature block (RS-2). |
| Spinner, Santa, Split, Wordsearch | html pages, print | — | dropped |

## 6. Templates per app (old count → new count)

| App | Old | New | Missing from old |
|---|---|---|---|
| Write | 9 (+ the Invoice and Contract apps) | 5 (letter, meeting notes, résumé, contract, invoice) | **One-page memo, A short bio, Weekly plan, Business plan, Marketing plan, Go-to-market plan** (the three plans were a headline feature in the README) |
| Sheet | 12 | 10 | **Comparison, with a chart**. Invoice table moved to Write. Money-mode templates are needed (see calculator). |
| Deck | 12 | 9 (talk, status update, proposal, plus 6 fold formats) | **A pitch (now "A proposal"?), A lesson, Project kickoff, Quarterly review, Product launch, Party invitation, Team offsite, Workshop, Research findings, Trip recap** |
| Outline, Draw, Diagram, Cal, Todo, Board, Trip, Calc, Motion | 0 templates (one `example` each, for the skill and tests) | 4, 6, 12, 3, 3, 3, 4, 5, 4 | — (gains) |

## 7. Docs, scripts, tests

| Feature | Old file(s) | What it did | Status | What porting it means |
|---|---|---|---|---|
| TLO format reference | docs/tlo.md | The format, as a person or model learns it. | **partial**: next's README points to the old tree's copy | Move and update for v1 (kernel table, fences, head keys). |
| Exports reference | docs/exports.md | Every app's files. | **missing** in next | Regenerate from the defs. |
| README sections on signatures, passwords, making docs by URL, programs, embedding | README.md | — | **missing** (go with their features) | — |
| Tour deck | — (rebuild.md phase 10, never built) | — | not in old either; **planned** | Phase 10. |
| Deploy script with change-aware checks | scripts/deploy.mjs, `npm run deploy` | Types, unit, DOM and build; smoke when the UI changed; ships site and tinier. | **restored** (RS-5): scripts/deploy.mjs as `npm run deploy` (`--dry-run`, `--visual`, `--full`); types, strings, unit, browser, then the smoke specs or the build, then scripts/check-build.ts (the policy's script hashes and version.json), then wrangler for the site and tinier | Port deploy.mjs to next's commands (vitest projects, playwright smoke). |
| New-app scaffolder | scripts/new-app.mjs | — | **missing** (fewer apps by decision; low value) | Optional. |
| Icon/OG card generator | scripts/make-icons.mjs | PNG icons and per-app share cards. | **restored** (RS-3): scripts/make-cards.ts | See OG cards. |
| Skill generator | scripts/make-skill.ts | — | **restored** (RS-3) | See Agent skill. |
| Icon meta generator | scripts/icon-meta.mjs | — | **present in effect** (icons-meta.ts committed and credited) | — |
| Unit tests for the lost features | test/crypt, sign, envelope, search, markdown-agents, skill, api, exports, alt, pages, tinier… | — | **missing** for crypt/sign/envelope/search/skill/api/exports. tinier, codec, qr, gif, embeds, limits, contrast, templates (corpus) and per-app model tests are present. | Come with each port. |
| e2e: a11y (axe) | e2e/apps.spec.ts | Axe over every app, the menu, Insert, templates and icons, light and dark. | **restored** (RS-5): e2e/a11y.spec.ts, the home and every app of the registry on its first template, at phone size in light and dark, soft assertions in one test; what it found was fixed (list items in `<to-text>`, rows' aria-selected on list items, the sheet's grips, the outline's heading order, the calendar's chips, the shell's landmarks beside a site's frame) | Extend smoke's axe to every app, light and dark. |
| e2e: keyboard-only shell | e2e/keyboard.spec.ts | Tab to the bar, Esc returns focus, arrows through Insert. | **restored** (RS-5): e2e/keyboard.spec.ts, Tab through the home to an app, type, the Download menu by arrows, undo and redo, Share, the drawer, a visible focus at every stop and the focus back on what opened each | — |
| e2e: offline / service worker | e2e/offline.spec.ts, test/dom/shell-offline.ts | Cold start with no network. | **removed** with the offline copy (Paul, 2026-10-10); test/browser/no-service-worker.test.ts holds that nothing registers one | — |
| e2e: api, header, forms, suite | e2e/api, header, forms, suite, more | — | **missing**. Header (privacy states) and api go with their features. Forms and suite are mostly replaced by per-app specs. | — |
| e2e: per app, phone | — | — | **present** (13 specs, many at phone size) | — |
| DOM tests: link-guard, print, privacy, share, undo | test/dom/* | — | **restored**: privacy (RS-1, test/browser/privacy.test.ts), print (RS-5: test/browser/print.test.ts, every app's first template printed a page per page, a rule a page). Link-guard is test/link-guard.test.ts and test/browser/guard.test.ts. Undo and share are partly covered by test/history and test/short. | Come with each port. |
