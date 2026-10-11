# R10-spaces — the format says every space

**Paul, 2026-10-10:** *"we cannot ever lose spaces if they're there. This is why we struggled with cut and paste before trying to copy one sentence multiple times."*

## What is wrong

`src/doc/tlo.ts` `parseLines` trims the spaces at a line's end (and, outside a quote, its start) and drops a block's empty last lines, because the written form could not say them (`trimLine`, and `end` in `parseLines`). The grammar records it as a fact of the format (test/doc/tlo-grammar.ts `sayableLine`: "a line's words never begin or end with spaces"). The editor keeps them: Enter in the middle of a paragraph leaves the words before it ending in a space; Shift+Enter at a paragraph's end leaves a line break; a sentence copied with its trailing space and pasted three times is three sentences and three spaces. So the document in hand and the document in the link differ, and a document reopened from its link has lost what was typed. Worst with attributes: "Portland,  {.right}". test/walks-known.ts `block-ends-unsayable` has the replay (VITE_WALK_SEED=1891995401, text at a desktop).

## The design

The format gains one escape, in the spirit of the ones it has (`\` before `` \`*_{}[]()#+-.!|~=:<>^ ``):

- **An escaped space, `\ ` (a backslash and a space), is a space that stays.** The writer puts it on the last trailing space of a line and the first leading space of a line (the spaces between are kept by being between), and only where a plain space would be trimmed: a line's ends in a paragraph, a heading, an item (after its marker), a quote's end, a table cell's ends. The reader trims a line's ends up to an escaped space, never past it, then reads the inline codec as before. A `\ ` in a document someone wrote by hand is a space, as `\*` is a star.
- **A line that is only `\` is an empty line of its block.** A paragraph whose runs end in '\n' (Shift+Enter at its end) writes its last line as `\`; an empty line inside a block (two Shift+Enters) writes as `\` too, so the block does not split on reading. The reader keeps every such line, including the last.
- **A mark on a space alone may still be let go** (the space stays, the mark does not: docs/kernel.md "no space just inside a mark" is unchanged). Spaces are the data; marks on nothing but spaces are not.

These are the only bytes that change: a document with no trimmed space or trailing break writes exactly as it did (every template and corpus document stays byte-stable: test/doc/properties.test.ts's `write(parse(x)) === x` over them all, and the templates' links in the skill are unchanged).

## Where

- `src/doc/tlo.ts`: `trimLine`/`parseLines` (trim up to an escape; keep `\` lines), `writeLines`/`writeBlock` (write the escapes where a plain space or an empty line would be lost), `escapeInline`/`writeInline` (the candidate-then-check rule of docs/kernel.md §2 point 2 stays: write minimal, parse back, fall back to full escaping if the runs differ, now with the ends in the check). Cells of a table (`cell`, `cells`) too.
- `test/doc/tlo-grammar.ts`: the grammar gains the escaped space and the `\` line (`escape` and `line` rules); `sayableLine` loses "a line's words never begin or end with spaces" and the generator makes lines with spaces at their ends and blocks with empty lines, biased to them (the hard cases: a space before `{.right}`, an item whose words are one space, a heading ending in spaces, a cell of spaces, a break at a paragraph's end, two breaks).
- `test/doc/properties.test.ts`: the round-trip properties now cover them (parse(write(d)) deep-equals d for every generated model including edge spaces and empty lines; write(parse(x)) === x for every generated text). `npm run fuzz` 2,000 cases green.
- `src/kit/clipboard.ts` or the paste path, only if a test shows it trims: a browser test (test/browser/paste-spaces.test.ts) copies a sentence that ends in a space from a `<to-text>`, pastes it three times, and asserts the document's words (and the flushed link, read back) hold three sentences and every space; the same with a sentence that begins with a space, and a paragraph ending in a line break.
- `test/walks-known.ts`: the `block-ends-unsayable` entry removed; test/browser/walks.test.ts's `link` rule now holds from the replay seed (a test with that seed, VITE_WALK_SEED=1891995401, text at a desktop, runs green), and `npm run walks` is green.
- `docs/kernel.md` §2: the escape and the `\` line in the inline list, with the reason in one sentence (Paul's). The lenient forms (`\ ` by hand) named.
- Apps that write TLO themselves (a `text` op over a line: Calculator's tape, Diagram's lines written with " | ") are read for a place that trims; a trim found is a bug with a test, not a rule.

## Not this

- No change to what Markdown pasted from outside means: the paste path reads Markdown as before; the escape is ours, for our own round trip.
- No trailing-space stripping "to be tidy" anywhere: a formatter that trims is the bug this directive removes.
- Nothing ships but the kernel's own code; measure the main chunk before and after.
