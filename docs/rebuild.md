# The rebuild

Decided 2026-10-09, before launch: rebuild TinyLittleOffice to the shape below. In place, phase by phase, on
main, with the test suite as the contract and the product working at every commit. Pre-launch, so formats and
URLs may change freely; no compatibility shims. The order is the order of dependence.

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
9. **Living short links** — a short link may be updated by whoever holds its owner key (a capability in the
   fragment, never sent as plaintext); tinier stores a new ciphertext under the same id. The latest version of a
   document without the service ever reading it.
10. **The tour deck** — every feature, real sample data per insert, an architecture diagram, tested in several
    scripts and every export, as a short link.

## Apps after phase 4 (proposal)

| keep as app | why | absorbs (as templates or kinds) |
|---|---|---|
| Text | rich text | letter, résumé, contract |
| Sheet | the data model | budget, models, log, training log |
| Outline | tree of text | — |
| Slides | pages with layout | zine, booklet, brochure, comic, poster, badges (page formats) |
| Drawing | free shapes | pixel? (grid mode) |
| Motion | time | — (kept separate by earlier decision) |
| Diagram | shapes with meaning | org, mind, lanes, venn, net, timeline, seating, family (kinds) |
| Calendar | dates | gantt (a span view of the same dated items) |
| Todo | the simplest list | — |
| Board | columns of cards | — |
| Map | places | trip |
| Page | a web page | website, quick links, invoice, contract? |
| Calculator | a tape | — |
| Wordsearch, Spinner, Santa, Split | small tools people asked for | — |

Hidden: web (embeds), qr (the deck's closing slide).

## Rules while rebuilding

- Main is always green: typecheck, unit, DOM, build. A phase lands when its tests pass and the old path is gone.
- Two agents at most on the box; one test command at a time; WIP commits early; worktrees removed on merge.
- No shims, no aliases, no "legacy" folders. Delete what a phase replaces in the same commit.
- Native web APIs first. A dependency names the native API it beat and why.
