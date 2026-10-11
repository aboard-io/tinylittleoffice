# R17-display-text: a Display Link can be read, by a screen reader and as text

**Paul, 2026-10-11:** *"Deal with the Display Link."* The blind reviewer called this the biggest gap: a Display Link is `role=group` pages of flat SVG text, or a single label that hides the content; an outline reads as "Plan", a deck table as its slide title. The low-vision reviewer asked for the same thing visibly: 'Read as text', reflowed at the person's size in the theme's colors rather than white paper.

## What is wrong today

`src/kit/shell.ts` (around :685) draws the Display Link as `.to-display-page` groups of `pageSvg(p)`; the pages carry one `aria-label` each. `src/kit/exports.ts` `htmlOf` and `printHtml` are the same pages in a file. No app has a writer from its document to structured text; the kernel (`src/doc`) has the blocks every text app shares, and the spatial apps have their own models.

## The design

- **One text layer per document, from the kernel.** `src/doc` gains `textOf(doc): Node[]`, a small tree of headings, paragraphs (runs with links and emphasis), lists (nested, with task state), tables (rows and cells), fences, pictures (their alt and address), embeds (title and address), footnotes, and page/slide breaks, built from the document's blocks. Every app that is text-shaped (Word Processor, Outliner, Presentation Builder, To-do List, Website Builder, Spreadsheet as a table, Calculator as its lines) gets its layer from this with no code of its own; an app whose model is spatial supplies `def.text(doc)` in the same node shape: Diagram (each thing as a heading with its words, then 'Connections' as a list of "A → B: label"), Kanban Board (columns as headings, cards as list items), Calendar (days as headings, events as items with times), Trip Planner (stops in order with times and notes), Drawing Tool and Motion (the title and each layer's or frame's label, nothing more), Mind map and org chart through Diagram's.
- **Drawn as HTML.** `src/kit/text-view.ts` renders Node[] as plain HTML: `h1`–`h4`, `p`, `ul`/`ol` with `aria-checked` tasks, `table` with `th`, `pre`, `img alt` (the picture through the same gate as the pages: shown only when pictures are allowed), `a` through the link guard, `hr` between pages, with `lang` and `dir` from the page. No styling beyond the kit's tokens: the person's size, the theme's colors, reflow.
- **In the Display Link.** The display view puts the text layer first in the DOM as `.to-display-text` and the pages after it with `aria-hidden="true"`; a screen reader reads the document, a sighted person sees the pages. A 'Text' button in the display header (beside Edit and Present) switches the two visibly: pages hidden, the text layer shown, reflowed; `?d&text` in the link opens that way, and the button toggles the parameter (route.ts). The embed view and the deck's show are unchanged.
- **In the exports.** `htmlOf` writes the text layer before the pages, the same way, so an .html file reads; `printHtml` keeps the pages only (print is the pages).
- **The API.** `tinyoffice read --text <link>` and `api.text(link)` return the text layer as Markdown (the same nodes written out), so an agent reads a document as what it says; `measure` gains `words` and `headings` counts from it.

## Where

`src/doc/text.ts` (new), `src/kit/text-view.ts` (new), `src/kit/apps.ts` (AppDef.text optional), each spatial app's `def.ts`/`model.ts`, `src/kit/shell.ts` (display view, the Text button), `src/kit/route.ts` (`text`), `src/kit/exports.ts`, `src/api.ts`, `packages/doc/tinyoffice.ts`, `src/i18n/*.ts` ('Text', 'Pages'), `skill/tinyoffice/SKILL.tpl.md` and `npm run skill`, docs/kernel.md (one section: the text layer).

## Proof

- Node tests in `test/doc/text.test.ts`: `textOf` over the fixtures of every text app (headings, nested lists with tasks, a table, a fence, a picture, a footnote, slide breaks) gives the expected nodes; writing them as Markdown is stable.
- A unit test per spatial app's `def.text`.
- A browser test: a Display Link of the Word Processor's first template has `.to-display-text` with h1, p, ul and table before `.to-display-page[aria-hidden=true]`; the Text button shows it and hides the pages and puts `text` in the address; Playwright `toMatchAriaSnapshot` in `e2e/a11y.spec.ts` for one Display Link in WebKit.
- `test/formats.test.ts`: `htmlOf` begins with the text layer.
- The CLI: `node packages/doc/tinyoffice.ts read --text <file>` prints Markdown.

## Not this

- No new editor: the text layer is read-only.
- No change to what the pages draw.
