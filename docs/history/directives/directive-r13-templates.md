# R13-templates — the Word Processor's templates, lighter

**Paul, 2026-10-11:** *"Make the text templates much lighter: just little summaries and hints to what they might say rather than the content themselves. The numeric ones are fine."*

## What is wrong

`src/apps/write/templates.ts` holds twenty-eight templates, each a finished document with sample prose (the studio by the harbour, Mara Quill, Ms Okafor): a letter of 123 words, a thesis of 506, a syllabus of 315. A person opening one must delete someone else's sentences before writing their own. A template should be the shape of the document and a hint at each part, not the content.

## The design

Every Word Processor template becomes its shape plus hints:

- **The shape stays**: the headings, the sections in order, the address block's lines, the date line, the salutation and sign-off, the title line's attributes (`{.title}`, `{.right}`), the two-column attribute, the page breaks, a footnote where the template teaches footnotes (one, with a hint inside it), the signatures fence of the contract, the columns of the invoice and the recipe and the thesis's table.
- **Each paragraph of prose becomes one hint line, in italics**, saying what goes there and no more: `*Why you are writing, in a sentence.*`, `*What you agreed, the facts in order.*`, `*What happens next, and by when.*`. A hint is a sentence or two of at most about fifteen words, in the house voice (plain words, no "lorem", no brackets, no "insert here"). A section with several paragraphs becomes two or three hints at most.
- **Names and places**: an address block is hints too (`*Your name*`, `*Street and number*`, `*Town and postcode*`, `*you@example.com*`); a greeting is `Dear …,` with the dots; a date line is `*The date*`. The sample people and the studio go: a template no longer tells a story.
- **The numeric parts are fine as they are** (Paul): the invoice's lines table with its formulas, the recipe's scaling table, the thesis's table, the grant's budget that adds up, the newsletter's dates table, the minutes' treasurer's sums keep their numbers and formulas; the prose around them becomes hints.
- **Size**: each template under a third of its words today, and under 90 words except where a table or a fence carries the rest; say the before and after per template in the report.
- The blurbs (the one-line descriptions under each name, `blurb`) stay as they are; they already are summaries.

## Where

- `src/apps/write/templates.ts`: every `const` document rewritten; the file's header updated (it says "real sample data").
- The corpus gate (`test/doc/corpus.test.ts`): each template must still write canonically (`write(parse(x)) === x`); run the file. `test/templates.test.ts` (no attribute mark among words) and `test/browser/label-widths.test.ts` are untouched by this but run them.
- `node packages/doc/tinyoffice.ts lint write <file>` on each new template: no finding but length.
- The home page's previews are drawn from the templates (thumbnails): nothing to change, but `npm run cards` if a script derives cards from them (check `scripts/make-cards.ts`).
- Translations: the templates' words are English and not in the language files (check: `grep -c "Mara Quill" src/i18n/*.ts` should be 0; if a language file carries a template's words, the same lightening there).
- `test/doc/corpus/templates.json` is the OLD tree's templates and stays as it is (it holds the kernel's byte-stability, not these words).

## Not this

- The other apps' templates (Outliner, Presentation Builder, Kanban, To-do and the rest) stay: Paul named the text templates. Say in the report how many words each of those carries, so Paul can decide.
- No change to Blank, to the invoice's and recipe's arithmetic, or to the contract's signatures fence.
