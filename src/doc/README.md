# The document kernel

One model of a document, one way to read and write it, one set of edits. Everything an app shows is a view of a
`Doc`; everything an app changes is an `Op`. Import from `src/doc/index.ts` and nowhere deeper.

## The model (`model.ts`)

```ts
Doc = { head: Record<string, string>; blocks: Block[] }
```

Eight block kinds: `h` (level 1–6), `p`, `li` (depth, `ord`, `done`), `quote`, `hr`, `table` (typed `cols`, raw
`rows`), `fence` (`lang` names an app: another document; else text kept as written), `edge` (`~ A -> B: label`). Any
block may carry `a: { id, cls, kv }`; the class tells blocks of a kind apart (`isRule`: an `hr` with the class
`rule` is a horizontal rule, where a plain one is a break). The four text kinds hold **runs**: `{ t, b, i, u, s, h, href, ic, fn }`, words
with their marks; an icon (`ic`) or a footnote (`fn`, the note's words as inline Markdown) is a run of its own with
no words, and counts as one character. A line break inside a paragraph or an item is `'\n'` among the words; marks
never cross it. Table cells stay strings (formulas, numbers, words); a `rich` column's cells are the inline form,
parsed by its view and written by the code (`writeInline`), never typed; an `option` column's are words, one of
those the column already holds or a new one.

There is no embed kind: another document is a `fence` named for its app (`isInnerDoc`). There is no picture kind
and no thing from the web: a web address, or a link, alone on a line is a `p` of words, and `![alt](address)` reads
as the words `!` and a link. A table's lock and chart are not fields of the block: they
ride on the head for a sheet document (its first table) and on the table's attributes anywhere else (`tableAt`,
`withTable`), and `chart-at: top` beside the chart draws it above the table (a chart put in goes there; one without
it stays below).

## The format (`tlo.ts`)

TLO is Markdown with a few additions (docs/tlo.md). `parse(text)` reads leniently; `write(doc)` writes canonically.
Markdown's reference footnotes (`[^id]` with `[^id]: note`) are folded into the inline form `^[note]` on read, for
every app. An empty paragraph is written `<br>` and read back as a paragraph with no runs (a blank line alone would
not survive the read), so a blank line typed between two others keeps its place in the link. Column headings `Price:money` carry the type; `Price: money` reads too and is written `Price:money`.

**The invariants.** For every canonical text `x`, `write(parse(x)) === x` byte for byte — the gate is
`test/doc/corpus.test.ts` over the corpus in test/doc/corpus (every template, the guide's and the skill's examples, and
the examples of the apps at the tag `v0-before-rebuild`). For any runs,
`parseInline(writeInline(runs))` keeps every letter and every mark on it, and `writeInline` is idempotent on its own
output. The inline writer keeps canonical text stable by escaping as little as reads back right: it writes the words
with only a backslash escaped, reads them back, and falls to full escaping only when they would read as other runs
(so `5 * 3` and `snake_case` stay as written, and `a *b* c` as plain words becomes `a \*b\* c`).

## As JSON (`json.ts`)

`docJson(doc)` and `jsonDoc(json)`: the same document as JSON, its keys in the order the types name them, checked
against `packages/doc/schema/tlo.schema.json` (written from `model.ts` by `scripts/schema.ts`) by a validator of its
own; a document that does not fit throws with its path. It holds the schema, so it is imported on its own (and
lazily by the kit), not through `index.ts`.

## Edits as operations (`ops.ts`)

Eight primitives: `head`, `splice`, `move`, `text`, `cells`, `rows`, `cols`, `col`. `apply(doc, op)` is pure and
**shares every block it did not touch** (the editor redraws only blocks whose identity changed). `invert(doc, op)`
gives the ops that take it back, exactly: `applyAll(apply(d, op), invert(d, op))` deep-equals `d` for any op on any
document (property-tested over random documents and ops). Undo is an op log of `{ ops, inverse }`; `invertAll` inverts
a list.

Rows, columns and cells are table-aware: formulas and the lock follow rows and columns that move (`remapRefs`,
`remapLock`), and a locked cell is left as it is unless the op says `force`. Rows or columns taken out are undone by
putting the old block back (a formula that lost its reference cannot be remapped home), and the head's lock with it.
An op that cannot apply (a `text` op on a table, a column past Z, a table left with no column) throws; a `cells`
rectangle is clipped to the table — `putCells` gives the table the rows it needs first.

Composed edits return `Op[]`, so undo and tests see primitives only: `splitBlock` (Enter), `joinBlocks` (Backspace
at a start), `replaceSpan`, and the family helpers for lists — `family`, `shiftFamily`, `moveFamily`, `placeFamily`,
`removeItem`. An item's family is the list items deeper than it (and a fence that says `{depth=N}`); a lines app that
counts heading levels passes its own `depths`.

## Shared editing (`sync.ts`)

Several people edit one document through a server that puts their ops in one order. `transform(a, b, side)` is op `a`
as it applies once `b` has (`side`: `a`'s place in the order; null when `b` took away what `a` acts on);
`rebase(pending, over)` is a client's pending ops over the server's; `applyEdits` applies the ordered edits (`Edit`,
`Ordered`) to a snapshot. Where index transformation cannot reach (spans that cross, a table's last column, the head's
lock) the server refuses the op, and `transform` throws `Conflict`. The cases and the rules are the file's header;
docs/kernel.md §12 says why.

## An app is a view

```ts
read(doc: Doc): View            // a pure function from the document to what the app draws
edit(ops: Op[]): void           // this.doc = applyAll(this.doc, ops); this.view = read(this.doc); emit write(this.doc)
```

Nothing is stored for a view; nothing is edited but the document. A sheet is `tableAt(doc, firstTable(doc))` plus
the view's padding, and `evaluate(doc, at)` (`formula.ts`) works out any table block in place — on a slide or in a
text as much as in a sheet. Footnotes, numbered lists and links in plain words are drawn with `notes.ts`
(`notesOf`, `markNotes`, `noteNumbers`, `listNumbers`, `runLinks`), the same way everywhere.

Tests: `test/doc/*.test.ts`, node only (`npm run test:unit`); `test/doc/sync.test.ts` holds TP1 for every pair of ops.
The corpus is fixed: a document is added to it by hand, and never rewritten to match the code.
