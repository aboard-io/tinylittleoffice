# Porting an app onto the new tree — the common contract

Binding: docs/rebuild.md, docs/kernel.md (§1 model, §3 views and ops for your app, §5 tables, §8 decisions), src/doc/README.md, src/kit/app.ts (AppDef), the kit's README. Old tree at /home/exedev/workspace/tinyoffice is read-only reference; the file sizes there tell you what a port is: the pure parts (models, SVG views, exports) are ported; everything that touched the DOM is rewritten on the kernel and `<to-text>`.

Every app lives in `src/apps/<id>/`: `def.ts` (AppDef: name/group/blurb through `t()`, icon, `blank()`, `templates`, lazy `editor()`, `view(doc, opts)` → SVG pages, `exports`), `editor.ts` (`<to-<id>>` extending the kit's DocElement: `read(doc)` → view model, edits as `Op[]` through `edit()`; the one bar `<to-bar>` with `tool()`/`btn()`, `<to-insert>` where things are inserted, dateNav where dates are), `style.css` (wrapped in `@layer apps`), `templates.ts` (Blank first; each template a real, useful document in the house voice with real sample data — no lorem), `tests/` (Vitest browser mode for the editor, node for the model/view). Register in `src/kit/apps.ts`. Strings in `src/i18n/en.ts` in a section headed by the app's name; `npm run i18n:check` clean.

Rules: native web APIs first; ponytail minimalism (one mechanism per idea; no Add buttons at the foot; direct manipulation plus Insert ▾); phone first — design at 390px in WebKit, inputs ≥16px, bar one row scrolling sideways, no page scroll on focus, popovers above the keyboard; dark mode through tokens only (the contrast test guards them); accessible (names on icon buttons, aria-pressed, keyboard reachable, Esc returns focus); no compatibility shims; no contenteditable outside `<to-text>`; every document the app writes must round-trip byte-for-byte (`write(parse(x)) === x`) — add your templates and example to the corpus test; exports via the kit's one mechanism (Print/PDF, PNG, HTML, text; your own formats as `Export` entries). Delete nothing from and write nothing to another app's folder; kit changes small and surgical, listed in your report.

Tests: node for the model (`read`, each command as ops, round trips), browser for the editor (mount through the shell's helpers, real events, phone viewport once), a smoke line in e2e if the app has one in the old tree. Pacing: one test command at a time, WIP commits, another agent shares the 2-core box.

Report: what was ported from where, what was rewritten and why, the ops your commands produce, template list, test counts, commit hash, kit files touched, anything left.

---

## Write (src/apps/write)
Port: old write.def.ts (view pages, docToHtml/markedHtml, docToDocx, RTF, paper sizes, print), the Write templates (letter, résumé, meeting notes, contract — contract's signatures fence becomes a Write template whose trailing fence is a table of Name|Key|Signature; signing itself is phase-later, keep the table), **invoice as a Write template**: head fields from/to/number/date/due/tax/currency/terms, a table block What|Qty:number|Units|Price:money|Amount:money with `=Bn*Dn` formulas and locked Amount, evaluated in place via `evaluate(doc, at)`, subtotal/tax/total as a second small table or as formulas in a totals row (your call, say which), printed as paper by `view()`. Editor: `<to-text shape=doc>` plus the bar (title/h1/h2/p, B/I/U/S/highlight, link, icon, footnote, align, lists, indent, embed, paper, word count at the foot), endnotes section, link bubble, note popover (from the kit). A `table` block inside Write is drawn by the sheet's renderer (import from src/apps/sheet if it exists on your branch, else a minimal table view and say so) and evaluated in place; typing in its cells emits `cells` ops. Exports: .docx, .md, .rtf, .html, print.

## Sheet (src/apps/sheet)
Port: old sheet.def.ts (measured renderer, chart via chart.ts — port chart.ts with d3-sankey pinned, xlsx/csv writers with locale separator, Excel formula refs for names), old sheet.ts editor rewritten: grid of `<input>`s over `tableAt`, `evaluate`; 3 columns minimum, `+` column cell, column menu (type, name, sort, add after, remove when empty), row menu, fill handle, copy/paste with reference moving, lock/unlock, chart picker, the fixed 44px formula strip (ref pill + raw formula input), sticky headers inside the table's own scroll box, phone rules proven in a WebKit test (bar height constant across ten taps, page scroll 0). Templates: Blank, budget, expense log, training log, project tracker, loan, the four models (subscription, café, freelancer, mutual-aid fund) with `{big=…}` headline attr drawn large, months. Exports: .xlsx, .csv, chart .svg/.png, print.

## Outline (src/apps/outline)
Port outlinemodel's read (listify) and views (outlinePage, OPML, toDeck/toNet/toOrg), the Outline templates. Editor: rows each a `<to-text shape=line>` over its li block; Tab/Shift+Tab → shiftFamily; Alt+arrows → moveFamily; drag → placeFamily; Enter → new item; Backspace on empty → removeItem; fold/zoom as state; edges (connect/label/direction) as ops; Insert ▾: a document (fence with depth), from the web; View as menu. Exports: .opml, .md, .txt, print.

## Deck (src/apps/deck) — and the print formats
Port deckmodel (slidesOf with spans, loosen), slide.ts layout, decktheme (11 themes, hex, guarded by the contrast test), fold.ts (zine, booklet, brochure, comic, poster, badges become **page formats** of Deck: a `format:` head field; templates offer them), pptx export, deck HTML with transitions, presenting mode, the closing QR slide (port kit/qr). Editor: current slide fills the editor; headline `<to-text shape=line>`, words `<to-text shape=lines>`, notes `<to-text shape=lines>`; a slide whose only words are a web address is that embed full-slide; Insert ▾: layouts, a document, from the web; theme menu with swatches; rail of thumbnails (drawn by view(small)); footnotes at the slide's foot. Exports: .pptx, .html, print, PNG per slide, .gif of the deck.

## Board, Todo (src/apps/board, src/apps/todo)
Board: stages from h2 with limit/color attrs (color-mix shades), cards as li with rich text `<to-text shape=line>`, checklist as depth-1 li with checkboxes, drag between stages → move ops; Todo: li with done/star/due; dateNav where due dates are; a 44px tap target per row. Exports: .csv (board), .md and .ics (todo).

## Calendar with the Gantt view (src/apps/cal)
Port calmodel (spans, repeats `*w`, zones, legend colours), the year view, dateNav; Gantt becomes a view mode (`view: gantt` head or a bar toggle) over dated items with spans: a chart that scrolls a week at a time, tasks with start/days/done (ganttmodel ported as the span reading). Editor: month/year/gantt modes; tap a day → dialog (native) to add/edit; drag to move/resize spans in gantt. Exports: .ics (RFC 5545 via ported ics.ts), .csv, print.

## Draw with pixel mode (src/apps/draw)
Port drawmodel (shapes, pen `v`, freehand `w`, RDP), the SVG view, the icon library (iconsearch, library) for icon shapes, animation handoff to Motion. Pixel art becomes a **grid mode**: `grid: 8|16|32|64` head field, a palette, pencil/fill/eraser, and "Use as background" which writes the grid as a repeating tile (an SVG pattern / data-URL the page apps can use via a `tile:` ref; and a PNG export of one tile). Editor: tools row in the bar, select/move/resize handles, colour/style popovers, a one-line hint while drawing. Exports: .svg, .png, print.

## Diagram with eight kinds (src/apps/diagram)
One app, `kind:` head field: org, mind, lanes, venn, net, timeline, seating, family. Port each kind's pure view from the old def files and diagram.ts's shared editing-on-the-picture (tap to add, drag to reorder, edit in place via `<to-text shape=line>` in a popover), lines-app rows via ops `rowsOf/blocksOf`. Templates per kind (Blank first per kind: the dropdown lists kinds' templates). Exports: .svg, .png, print.

## Motion (src/apps/anim)
Port animmodel, the GIF encoder (gif.ts; consider WebCodecs/`ImageEncoder`? — no; GIF stays hand-rolled or `gifenc` if clearly better, say which), the timeline editor; keeps the handoff from Draw. Exports: .gif, animated .svg.

## Trip (src/apps/trip)
Port tripmodel (stops table, units, `route: dots|joined`), the Leaflet editor (Leaflet pinned, lazy chunk; tiles from OSM only when the map is shown — it is the one network use besides embeds; say so in the privacy text), the drawn page view, gpx/geojson exports.

## Website with Quick Links (src/apps/site)
Port sitemodel (pages, sections, cards, buttons, products with the CSP-hashed cart script, 16 themes in oklch via CSS), the generated page with its hashed scripts (page.ts), the preview frame with the "+" chooser and part handles sending messages; sections are edited beside the frame in `<to-text shape=doc>` (kernel §8 decision 3). Quick Links is a template set of Website (one page, links look). Exports: .html page, print.

## Calculator (src/apps/calc)
Port calc.ts tape (names, `ans`), the mathjs engine as a lazy chunk (units, big numbers, derivative/simplify; no eval — keep the grep test), the keypad; modes calc/graph only; the money modes are Sheet templates (already in Sheet's list). Exports: .txt tape, print.

## Kit pieces apps need (whoever gets there first adds them to src/kit and reports)
embeds.ts (providers table + `<to-embed>` click-to-load card, CSP lines), icons picker (sections to scroll), date dialog, link dialog, chart.ts, ics.ts, docx/xlsx/pptx writers (zip via fflate), markdown.ts (import), envelope/sign/crypt (document signing: `by`, `created`, `key`, `sig` head fields; the Privacy button red/green), the Drive (saved documents on the device), search, compare (diff).
