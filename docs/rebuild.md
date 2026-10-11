# The rebuild

Decided 2026-10-09, before launch: rebuild Tiny Little Office to the shape below. Greenfield (Paul: "It's okay to
greenfield this it has no users yet"): a fresh tree on the orphan branch `next` (worktree
`~/workspace/tinyoffice-next`), which becomes `main` when it is whole; the old tree is tagged `v0-before-rebuild`
and stays readable at `~/workspace/tinyoffice` for porting. Pure modules worth keeping are ported (the TLO grammar
knowledge, the formula engine, charts, embeds, ics/docx/xlsx/pptx writers, codec, crypt, short links, icons, qr,
gif, the tinier worker, the skill); everything that touches the DOM is written anew on the kernel and the editor.
No compatibility shims. The phases below are the order of building.

## What stays

The document is the URL. One kit, apps as definitions. Text (TLO, a Markdown superset) is the format. Short links
carry only ciphertext. Privacy first: nothing leaves the browser unless tapped. Native web APIs before libraries.
One bar per app, Insert ▾, direct manipulation. Ponytail minimalism.

## Phases

0. **Per-app folders and layers** — `src/apps/<id>/` holds `def.ts`, `editor.ts`, `style.css`, `templates.ts`,
   `tests/`; `src/kit/` is the kit. CSS cascade made explicit with `@layer tokens, kit, apps, responsive, a11y`.
   Strings: every UX string through `t()`, all in one hand-edited `src/i18n/en.ts`; sibling files are languages;
   the browser chooses. (Cleanup pass two and the translations pass are this phase.)
1. **The document kernel** — `src/doc/`: one typed model of a document — head fields and blocks (heading,
   paragraph of runs, list item, table with typed/named/locked columns, embed, image, edge, fence) — with TLO as its
   one serialisation and the only parser. Every app model (sheet grid, outline, slides, site, trip, diagram
   shapes, board) becomes a *view* over this model: a pure function from Doc to what the app draws, and edits as
   operations on Doc. Rich text (runs: bold, italic, link, icon, footnote, embed) lives here once.
2. **One editor** — `<to-text>`: model-driven, `beforeinput` + selection in the model + DOM reconciliation; no
   raw contenteditable mutation anywhere. Write first, then Outline, Deck slides, Board cards, Page sections.
   Footnote chips, embeds, icons are runs the editor knows.
3. **Sheets as the data model** — the kernel's table block carries types, names and locks; the formula engine
   evaluates a table block. Apps that are sheets wearing costumes (log, models, budgets, invoice lines, the
   calculator's money modes) are templates or views of a table, not apps.
4. **Fewer apps, more templates** — target ~18 visible apps (see below); the rest are templates. An app earns its
   place only with a format the kit cannot otherwise express.
5. **Native elements, no Shoelace** — `<dialog>`, `popover`, `<select>`, `<input type=date>`, `<details>`; a
   dozen tiny Lit components for what is left (bar button, menu, switch, toast). Tokens are ours alone.
6. **Tests in a real browser** — Vitest browser mode (Playwright provider) replaces happy-dom for the DOM layer;
   unit tests stay in node; screenshots per app at 390 and 1100, light and dark, are the gate for CSS and layout.
7. **Phone first** — every editor designed at 390px in WebKit and widened; 16px inputs, one-row bars, no page
   scroll on focus, popovers above the keyboard.
8. **A chunk per app** — route-level lazy import; the home page loads the kit and nothing else.
   The home page is no copy: each app its icon and name, its templates ▾, and under it the documents kept on this
   device while Saved (Paul: "Drive is just documents under the icons"; `src/kit/library.ts`).
9. **Living short links** — a short link may be updated by whoever holds its owner key (a capability in the
   fragment, never sent as plaintext); tinier stores a new ciphertext under the same id. The latest version of a
   document without the service ever reading it. (Built ahead of its turn, on the skeleton: `tinier/`,
   `src/kit/short.ts`, `src/kit/links.ts`, the router's `?s=&k=&o=`; the README's "Living short links".)
10. **The tour deck** — every feature, real sample data per insert, an architecture diagram, tested in several
    scripts and every export, as a short link.

## Apps after phase 4 (Paul: "The template idea is right")

| keep as app | why | absorbs (as templates or kinds) |
|---|---|---|
| Text | rich text | letter, résumé, contract |
| Sheet | the data model | budget, models, log, training log |
| Outline | tree of text | — |
| Slides | pages with layout | zine, booklet, brochure, comic, poster, badges (page formats) |
| Drawing | free shapes | pixel art: a grid mode with a choice of grid sizes; a grid can be saved as a repeating background tile (Paul, 2026-10-09) |
| Motion | time | — (kept separate by earlier decision) |
| Diagram | shapes with meaning | org, mind, lanes, venn, net, timeline, seating, family (kinds) |
| Calendar | dates | gantt (a span view of the same dated items) |
| Todo | the simplest list | — |
| Board | columns of cards | — |
| Map | places | trip |
| Page | a web page | invoice and contract as Write templates; no website (Paul, 2026-10-11) |
| Calculator | a tape | — |

Hidden: web (embeds), qr (the deck's closing slide). The small tools (wordsearch, spinner, santa, split) are
dropped (Paul, 2026-10-09), as are list mode and the lenient importers of loosely written documents (pre-launch:
no compatibility code).

The names people read, by app id (Paul, 2026-10-09: "We need to rename the apps to be very generic"; the ids,
folders and routes do not change): write, the Word Processor; sheet, the Spreadsheet; calc, the Calculator; deck,
the Presentation Builder; outline, the Outliner; draw, the Drawing Tool; diagram, the Diagram Maker; anim, the
Animator; board, the Kanban Board; todo, the To-Do List; cal, the Calendar; trip, the Trip Planner. The
names in the table above and in docs/kernel.md are the working names of the plan.

Round four (Paul, 2026-10-09): every link that leaves the site asks first (src/kit/link-guard.ts: the site's name
large, the whole address, red Cancel, green Go); pictures from the web are asked for before they load (src/kit/pictures.ts:
a card until "Show pictures from the web", the author's own inserts shown, a Saved switch to show them always,
previews never fetch); kept documents show a small first page on the home page and in the menu (src/kit/preview.ts);
the Office mark (src/kit/mark.ts) is the menu button, the drawer's heading, the favicon and the app icons.

## Rules while rebuilding

- Main is always green: typecheck, unit, DOM, build. A phase lands when its tests pass and the old path is gone.
- Two agents at most on the box; one test command at a time; WIP commits early; worktrees removed on merge.
- No shims, no aliases, no "legacy" folders. Delete what a phase replaces in the same commit.
- Native web APIs first. A dependency names the native API it beat and why.
