# R12-agents — a document checked by the API, never by eye

**Paul, 2026-10-11:** *"Doc that. Also never look at it. Why are you looking? You've got a parsing API and can measure and set parameters."* The "that" is what cost an agent forty tool calls for one deck (the internals deck, 2026-10-10), listed under What cost time below.

## What cost time

1. No way to see a document without a browser: the reader's pages (`.to-display-page` in `.to-display`), presenting that builds bullets and a sub-document's items one step at a time, the show flag.
2. Diagram rules learned by breaking them: in a `net`, a `- Name: description` line is one thing named with the whole line; an edge naming a thing not in the list is dropped without a word (an org chart's dotted lines went); a `venn` or `seating` item splits on commas, so "2,000" is two things; edge labels over a few words pile on each other.
3. A slide holding a fence shows the fence alone: its bullets are not drawn.
4. The short-link docs describe this tree; production's shortener (the old tree) allows thirty days and redirects only to the production site.

## The design

### 1. The lint says what the eye would have seen

`lint` in `src/api.ts` (and `packages/doc/tinyoffice.ts lint <link|file>`), the one the skill names, gains findings, each with the block, the words and what to do:

- **Diagram:** an edge (`~ A -> B`) whose end names no thing in the list ("A dotted line from Diagram to Drawing Tool: no thing is called Diagram; the things are …"); a `venn`/`seating` item with a comma inside a number or a phrase that is not a list ("2,000 cases reads as two things: 2 and 000 cases; write two thousand or avoid the comma"); a `net`/`mind`/`org` label over N words where the layout would wrap or overlap (N from the layout's own measure: `src/apps/diagram` lays out with text widths; the lint calls the same measure, in node with the fallback metrics the exports use); a `- Name: description` line in a `net`, where the whole line is the name ("the thing is named 'Header: the paper logo…'; a thing is a name alone, its words in an edge's label").
- **Deck:** a slide with a fence and bullets ("the slide shows the chart alone; the three bullets under it are not drawn: put them in the notes or on a slide of their own"); a title or a bullet the layout had to shrink to its smallest size or cut (`fitTitle`/`fitBody` in `src/apps/deck/view.ts` know: expose what they chose); a slide whose words run over its body box.
- **Everything:** the existing length warning stays; the lint's output is one line per finding, `app · slide or block · the finding · what to do`, and `--json` gives `{findings: [{block, kind, words, fix}]}`.

The measures come from the layout code itself (`view()` of each app returns pages; the lint reads the pages' SVG or, better, the layout's intermediate numbers), never from a browser. Where a layout needs a font, the node exports' fallback metrics (what `file()` uses to make a PDF without a browser) are the measure, and a test holds that they are within 10% of Chromium's for the slot's font.

### 2. The skill tells the rules before they are broken

In `scripts/make-skill.ts`'s sources (so `npm run skill` regenerates it), one paragraph each:

- **Diagrams:** a thing is a name, short; its words go in an edge's label or a child; an edge's ends must be names in the list, exactly; commas separate things in `venn` and `seating`; labels of a few words; the kinds and what each is good for, in one line each.
- **Slides:** a slide with a fence is the fence's; bullets become notes; presenting reveals one bullet or one sub-document item per step; notes show by N or the Notes button and start hidden under a finger; `{.icon}`, `{.two}`, `{.title}` in one line each.
- **Check it, do not look at it:** `tinyoffice lint <file>` before sharing, what its findings mean, and that `read` round-trips the text; a sentence that a browser screenshot is never needed, with what the lint measures. (The reader and show flags stay documented under The URL.)
- **Short links, where:** the API is this tree's; which service a link should be made at (the site's own shortener, `tinier.<site>`); a line that an agent on a dev box with its own site uses that site's `/tinier/` with `SITE` set, and that production's shortener accepts only links to production.

### 3. The CLI measures

`packages/doc/tinyoffice.ts` gains `lint` if it has it not (the skill says it does: make it true), printing the findings above and exiting 1 on one, and `measure <link|file>`: per page, the title's chosen size, each body box's chosen size, lines wrapped, words cut, things and edges drawn and dropped, as JSON. An agent sets its parameters from these numbers and never opens a page.

## Proof

- Node tests for every finding above, each with a document that trips it and one that does not; the internals deck's own mistakes (an org chart's edge to "Diagram", a Venn with "2,000", a net of `Name: description` lines, bullets under a chart) are the fixtures, written in `test/fixtures/lint/`.
- The fallback-metrics test against Chromium (one browser test).
- The skill regenerated and its staleness test green; `test/doc/corpus` and every template lint clean (a template that trips a new finding is fixed, or the finding is wrong).
- The report lists each finding kind with its one-line message.

## Not this

- No screenshot tooling, no headless browser command: the round is the opposite.
- No change to what the layouts draw; the lint reads them.
