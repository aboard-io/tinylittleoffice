<!-- Designed 2026-10-09 against the old tree at commit 15f0acb, before the greenfield decision. Read with
docs/rebuild.md. Greenfield adjustments and the three decisions are at the end (§8). The apps are named here by
their working names (Write, Sheet, Deck, …); the names people read are listed by id at the end of the plan's
app table in docs/rebuild.md. -->

# The document kernel, the one editor, and sheets as the data model

Phases 1, 2 and 3 of docs/rebuild.md, designed against the code as it stands at commit 15f0acb. Phase 0 (per-app folders, `src/kit/`) has not landed yet; paths below assume it has for new files (`src/doc/`, `src/kit/`) and name today's paths for what is deleted.

The short version. Today `src/lib/tlo.ts` already holds the kernel in embryo: `Tlo = { head, blocks }` with nine block kinds, a lenient reader and a canonical writer that every app reads its document through. What is missing is (a) runs: text sits in blocks as raw inline Markdown strings and is parsed again by every drawing (`parseInline` is called in outline rows, slide layout, board cards, write's `parseDoc`), and `src/lib/richtext.ts` keeps a second `Block` type for Write alone; (b) an operation set: every app edits its own model type and re-serialises the whole text; (c) the table block is strings with no notion of columns, so `formula.ts` builds its own padded `Grid` and `Sheet`. The kernel is those three things added to what tlo.ts already is, moved to `src/doc/`, with nothing left behind in `src/lib/`.

---

## 1. The kernel model (`src/doc/`)

### Files

| file | holds |
|---|---|
| `src/doc/model.ts` | the types below; `plainText`, `hasClass`, `attr`, `pages`, `sections`, `isEmbed`, `blankDoc` |
| `src/doc/tlo.ts` | `parse`, `write`, `writeBlock`, `splitHead`, `takeHead`, `withHead`; the inline codec `parseInline`, `writeInline`, `escapeInline`, `balanceNote`; `refFence`, `fenceRef`; `column`, `columnText`, `columnsOf`, `amountOf` |
| `src/doc/ops.ts` | `Op`, `apply`, `invert`, and the composed edits (`splitBlock`, `joinBlocks`, `family`, `shiftFamily`, `moveFamily`, `placeFamily`, `removeItem`) |
| `src/doc/notes.ts` | `foldNotes`, `notesOf`, `noteRuns`, `noteNumbers`, `markNotes`, `referenceNotes`, `listNumbers`, `linkify`, `runLinks`, `linkTarget`, `linkable` |
| `src/doc/table.ts` | `Table`, `tableAt`, `withTable`, A1 addressing, locks, formula reference remaps, `copyCells`/`pasteCells`/`fillCells`/`seriesOf`/`sortRows`/`clearCells` (phase 3, from formula.ts) |
| `src/doc/formula.ts` | the evaluator: `evaluate(doc, at)`, `evaluateTable`, `FUNCTIONS`, `parseLiteral`, `formatCell`, `formatValue` (phase 3) |

### Types

```ts
// src/doc/model.ts
export type Head = Record<string, string>;            // the header: lowercase keys, string values (the shell's own: title, by, created, key, sig; app in a .tlo file)

export interface Doc {
  head: Head;
  blocks: Block[];
}

export interface Attrs {
  id?: string;
  cls?: string[];
  kv?: Record<string, string>;
}

export type Dir = '->' | '<-' | '<->' | '--';

export type Block =
  | { k: 'h'; level: 1 | 2 | 3 | 4 | 5 | 6; runs: Run[]; a?: Attrs }
  | { k: 'p'; runs: Run[]; a?: Attrs }                                   // its lines stay lines: '\n' inside a run's t
  | { k: 'li'; depth: number; ord?: true; done?: boolean; runs: Run[]; a?: Attrs }
  | { k: 'quote'; runs: Run[]; a?: Attrs }                               // a note: speaker's note, a page's aside, a site's button
  | { k: 'hr'; a?: Attrs }                                               // a break: the next slide, page or card
  | { k: 'table'; cols: Column[]; rows: string[][]; a?: Attrs }          // cells are raw strings: formulas, numbers, words
  | { k: 'fence'; lang: string; body: string; a?: Attrs }                // lang names an app: another document; else text kept as written
  | { k: 'edge'; from: string; to: string; dir: Dir; label?: string; a?: Attrs }
  | { k: 'img'; alt: string; url: string; a?: Attrs };

export type TextBlock = Extract<Block, { runs: Run[] }>;                 // h, p, li, quote

export interface Run {
  t: string;                 // the words; '' for an atomic run (ic, fn); may hold '\n' for a line inside a paragraph or item
  b?: true; i?: true; u?: true; s?: true; h?: true;
  href?: string;             // where these words link
  ic?: string;               // an icon in the line, by name
  fn?: string;               // a footnote: the note's words as inline Markdown
}

export type ColType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'time' | 'check' | 'url' | 'rich' | 'long' | 'icon' | 'name';
export interface Column { name: string; type: ColType }

export const plainText = (runs: Run[]) => runs.map((r) => r.t).join('');
export const text = (s: string): Run[] => parseInline(s);                 // the one way a string becomes runs
```

**The envelope** (`src/kit/envelope.ts`). Five head keys belong to the document rather than its app: `title` (the
editor's), and `by`, `created`, `key`, `sig`, which the shell holds and puts into every change the editor makes, so
an edit never drops them. `created` is stamped at the first change, to the minute, as `2026-10-05T14:32Z`; `by` is
the name a signer gave; `key` and `sig` are base64url (an Ed25519 key is 43 characters, a P-256 one 87), written, as every payload in a link is (`src/kit/codec.ts`), with `~` for 62 where RFC 4648 has `-`, because a hyphen is where a pasted link breaks a line; `-` is still read as 62. A signature
covers exactly the old tree's message, so its signed documents verify:

```
tinyoffice\n<app>\n<created as base-36 minutes since 2020-01-01, or empty>\n<the text without the five keys>\0<title>\0<by>
```

The text without the five keys is `takeHead(text, SHELL_KEYS)[1]`: the app's own head keys stay, in their order. A key
without a signature is no signature. Checked against the text as it is, a signature is valid, stale (this device's
key signed it and the text has changed since) or invalid. A document under a password is not a head field: its whole
payload is sealed (`E…`, `src/kit/crypt.ts`), so nothing of it, the title included, is readable without the password.

Nine block kinds, as today; the two changes are `runs` in place of `text` on the four text kinds and `cols: Column[]` in place of `head: string[]` on tables. There is no `embed` kind: an embedded document is a `fence` whose `lang` is an app id (as now, `refFence`/`fenceRef`); a thing from the web is a `p` whose only run is its address, or an `img` (as `richtext.parseDoc` and `deckmodel.slideOf` already decide with `embedOf`). `isEmbed(b)` in model.ts names that rule once. A lock and a chart are not fields of the table block: they ride on the head for a sheet document and on the table's attrs anywhere else (see `tableAt` in §5), which is exactly what the format does today and keeps every sheet example byte-identical.

Why runs in the model rather than text with runs derived: every view already parses inline on each draw; the editor's selection must be a run position; and footnotes/icons are run-level things the kernel must know. Why cells stay strings: the one inline construct that a canonical writer would alter (`*` and `_` in `=passers_by*buy_rate/100`) lives in cells, and the formula engine needs the raw formula. A `rich` column is parsed by its view.

### Each app's document, in these blocks

| app | blocks | head | cannot be expressed today (decide: drop, or add) |
|---|---|---|---|
| write | `h` (level 1 `.title`; 1, 2), `p` (`<br>` for an empty one; a lone web address is a web embed; `.center/.right/.justify`), `li` (ul/ol, depth ≤ 3), `fence` (another document), `table` (an embedded sheet), `img` (web picture) | `paper` | `li.done` is folded into the words as a `☐`/`☑` glyph by `richtext.parseDoc` (lossy: `- [x] a` is written back as `- ☑ a`); `quote` and `edge` are flattened to `p`; `h3+` becomes `h2`; a fence with no app (` ```js `) becomes an embed of an unknown app. The kernel keeps all four; Write's view decides what to draw. |
| contract | write's blocks + a trailing `fence` `signatures` holding a `table` Name\|Key\|Signature | — | — |
| outline, mind, family, org | `li` (depth; `.to/.from/.both`, `label=`), `fence` (`{depth=N}`), `edge` | — | an item is one line (`\n` → space); a fence under an item needs `depth=` because a list restarts after it (no nesting of blocks); org's `Name \| Role` is a convention in the run text |
| deck, zine, booklet, brochure, poster, badges, comic | `hr` between pages; `h` level 2 (`.title/.two/.icon`; the icon a leading `ic` run), `li` (bullets, `ord` steps), `p` (prose on print pages; `\|` alone is the column break; a web address alone is the slide's sub-document), `quote` (speaker notes), `fence`/`table`(+`{chart=}`)/`img`(TLO link) as the sub-document | `theme transition color qr`; `sides pages` | words and a sub-document cannot show together (the sub takes the slide); comic panel `said \| caption` is a convention |
| sheet | one `table` | `chart lock` | rows past 1000 and columns past Z are dropped (a limit, not a format) |
| draw, pixel mode | one `p`, a line a row | `grid` (8, 16, 32, 64); `tile` (kit/tile.ts) on any page | — |
| todo | `li` with `done`, `.star`, `due=` | — | — |
| board | `h` level 2 (`limit= color=`), `li` depth 0 (card), `li` depth 1 `done` (checklist) | — | a card is one line of rich text |
| gantt | `table` Task\|Start:date\|Days:number\|Done:percent | — | nesting is `- ` prefixes inside the Task cell: a tree in a table by convention |
| trip | `table` Place\|Lat:number\|Lon:number\|Note | `units route` | — |
| cal | `li` `when: label` with `color= every= times= until=` | `zone`, colour names | *when* is text inside the run, not a field |
| invoice | `table` What\|Qty:number\|Units\|Price:money, `p` notes | `from to number date due tax currency terms` | the sums are not in the document (see §5) |
| site, links | `h` 1 (pages), `h` 2 (sections), `li` (`:icon: Head \| detail` cards; links' small links), `quote` (`Label \| url` buttons), `img`/`p`-address (pictures), `p` `:icon:` (big icon), `table` Name\|Price:money\|About\|Image (shop), `fence` | `theme currency orders` | card and button fields are `\|` conventions in a run |
| lanes, timeline, seating, venn, net, spinner, santa, wordsearch, split | `h` 1 title, `li` `Key: words` (or `Set: a, b`), `edge`, `table` (split's payments) | `between` | the `Key:` and comma-list conventions are text, read by `lines.ts` patterns |
| draw, anim | `table` Kind\|X\|Y\|W\|H\|Style\|Label[\|Points]; anim adds `table` Shape\|Keys | `alt`; `frames fps` | — |
| calc | `p` (tape, a line each) or `li` (`- key = value`) | `mode` | money modes are a sheet in disguise (§5) |
| qr, web | one `p` | `alt` (web) | — |

Everything in the table is representable without loss in the nine kinds; the right-hand column is what the *format* cannot say, not what the kernel loses. None of it needs a new block kind now; the two worth deciding later are block nesting (an item holding a paragraph or a table) and a cell-level `when`/record type for cal and the `Key: words` apps.

---

## 2. Serialisation: TLO, one parser

### Moves to `src/doc/tlo.ts` unchanged

From `src/lib/tlo.ts`: `ATTRS`, `splitAttrs`, `unescapeTail`, `attrsText`, `hasClass`, `attr`; `FENCE`, `HEADING`, `ITEM`, `RULE`, `SEP`, `EDGE`, `IMAGE`; `cells`, `readHead`, `unblock`; the block loop of `parse` (list-indent stack, paragraph/quote flush, li continuation lines, table attrs on the line after); `splitHead`, `takeHead`, `withHead`; `guard`, `guardEnd`, `writeHead`, `cell`, `writeBlock`, `write` (tight li–li and edge–edge, ordered numbering across deeper items); the whole inline codec (`MARKS`, `LINK`, `ICON`, `URL`, `parseInline`, `noteEnd`, `balanceNote`, `escapeInline`, `escapePlain`, `FLAGS`, `writeInline`, `marked`); `refFence`, `fenceRef`; `COL_TYPES`, `column`, `columnsOf`, `columnText`, `amountOf`; `pages`, `sections` (to model.ts).

From `src/lib/richtext.ts` to `src/doc/notes.ts` unchanged: `Run`, `foldNotes`, `notesOf`, `notesIn` (becomes `notesOf` over runs), `noteRuns`, `noteNumbers`, `markNotes`, `referenceNotes`, `listNumbers`, `runLinks`, `linkify`, `linkTarget`, `linkable`, `ALIGN_NAMES`/`ALIGN_OF`.

### Changes

1. **Runs at parse time.** In `parse`, where a text block is pushed (`flush`, the heading, the list item), `text` becomes `runs: lines(text)` where `lines(s) = s.split('\n').map(parseInline)` joined by `{ t: '\n' }` runs (merged into a neighbour when the marks agree). Inline marks therefore do not cross a line, exactly as today, where every consumer splits lines before `parseInline`. `writeBlock` writes `writeLines(runs)`: split at `\n`, `writeInline` each line.
2. **The writer is byte-stable on canonical text.** `writeInline` writes a candidate with *minimal* escaping (only `\`, `^[`, `:name:`, `[x](y)`, `<u>`, a backtick, and a mark at a position where `parseInline` would open or close one), parses it back, and if the runs differ falls back to today's full `escapePlain`. This makes `writeInline(parseInline(s)) === s` for every canonical `s` the examples hold (today `5 * 3 * 2` on the calculator's tape or `snake_case` in an outline item would come back `5 \* 3 \* 2`, `snake\_case` once a block passes through runs — a change in bytes the kernel must not make). A property test over every template body and every skill example asserts `write(parse(x)) === x`.
3. **Columns at parse time.** `head: string[]` becomes `cols: Column[]` via `column(h)`; `writeBlock` writes `columnText(c.name, c.type)`. Canonical headings (`Price:money`, `Time: 10am`) are byte-stable; `Price: money` is read leniently and written canonically.
4. **Reference footnotes fold in `parse`.** `foldNotes` runs in the kernel for every app (today only Write and Deck fold `[^id]: note` paragraphs). Canonical documents hold the inline form only, so no example changes.
5. **Deleted:** `richtext.ts`'s `Block`/`BlockKind`, `parseDoc`, `serializeDoc`, `docText`, `serializeInline`, `plainInline`, `MAX_DEPTH`; `tlo.ts`'s `plain(s)` (becomes `plainText(runs)`); `Tlo` is renamed `Doc`.

### Grammar the kernel must preserve (every example in docs/tlo.md and the skill parses and writes byte-for-byte)

- Header: `---` first line, `key: value` lines (keys lowercased; a value in double quotes unquoted), closed by `---` or `...`; written only when non-empty, empty values dropped, newlines in a value become spaces.
- Attributes: `{#id .cls key=value key="a b"}` at the end of a block; on a table, alone on the line after it; on a fence, after the language; classes before values on write (`{.star due=…}`); `\{` keeps literal braces.
- Headings `#{1,6}`, optional closing `#`s; `# Words {.title}` is Write's title.
- Lists: `-`, `*`, `+`, `1.`, `1)`; nesting by any indent width (two spaces canonical); `[ ]`/`[x]` tasks; an indented non-blank line continues the item; ordered items count on at their depth across deeper ones; a bulleted item resets the count.
- Rules: three or more `-`, `*` or `_` with optional spaces → `---`; a rule ends the list nesting.
- Tables: header row, separator of `---`/`:---:` cells, optional outer pipes; `\|` and `\\` escapes; `<br>` is a newline in a cell; rows padded to the header's width; written edged (`| a |`) when one column, when the first heading would read as another block (`# of units`), or when a row's first cell is empty.
- Fences: ```` ``` ```` or `~~~`, three or more, the closer at least as long; written with one more backtick than the longest run inside the body; `lang` lowercased.
- Edges: `~ A -> B: label` with `->`, `<-`, `<->`, `--`; consecutive edges written on consecutive lines.
- Images: `![alt](url)` alone on a line, `<url>` accepted, `\]` in alt.
- Quotes: `> ` lines merge into one block, written a line each.
- Paragraphs: consecutive lines merge; a blank line separates; a line that would read as another block is written with a leading `\` (`guard`); a lone `|` is written as is (the deck's column break); Write's empty paragraph is `<br>`.
- Inline: `**`, `__` (b), `*`, `_` (i; `_` not inside a word), `++` and `<u>` (u), `~~` (s), `==` (h); no space just inside a mark; backtick spans read as plain words; `[words](https?:|mailto:|tel:|#…)` links with spaces and parentheses percent-encoded on write; `:icon-name:`; `^[note]` with balanced brackets and `\]`; `\` before `` \`*_{}[]()#+-.!|~=:<>^ `` and before a space; a web or mail address read whole, marks inside it untouched, trailing `.,;:!?)` left out; marks close before trailing spaces.
- Spaces and breaks (round ten, 2026-10-10): every space a person typed is in the link, because "we cannot ever lose spaces if they're there" (Paul). A space at a line's end is written `\ ` on the last trailing one, and at a line's start on the first leading one (not in a quote, whose starts are kept as they are), wherever a plain space would be trimmed: a paragraph's, a heading's and an item's lines, a quote's ends, a table cell's ends. A line of a block with nothing on it is a line of one `\` (Shift+Enter at a paragraph's end, two in a row; a quote's empty line between two stays `>`). The reader trims a line's ends up to an escaped space, never past it, and keeps every `\` line, the last too; before attributes, the one space before `{` is theirs (`a\  {.x}` is "a " with attributes, `\ {.x}` an empty line with them). Lenient: `\ ` written by hand is a space anywhere, as `\*` is a star. A mark or a link on spaces alone at a line's end may still be let go; the spaces stay. The writer's candidate-then-check (point 2 above) reads each line back with its ends trimmed.

---

## 3. Views and operations

### The operation set (`src/doc/ops.ts`)

```ts
export type Op =
  | { op: 'head'; key: string; value?: string }                              // set or (undefined) remove a header key
  | { op: 'splice'; at: number; n: number; blocks: Block[] }                 // insert (n = 0), remove (blocks = []), replace
  | { op: 'move'; at: number; n: number; to: number }                        // a span of blocks moved before index `to` (in the doc without the span)
  | { op: 'text'; at: number; from: number; to: number; runs: Run[] }        // in text block `at`: replace characters [from, to) with runs (atomic runs count 1)
  | { op: 'cells'; at: number; r: number; c: number; values: string[][] }    // a rectangle of a table's cells written, top-left (r, c)
  | { op: 'rows'; at: number; r: number; n: number; rows?: string[][] }      // rows put in before r (rows given) or taken out
  | { op: 'cols'; at: number; c: number; n: number; cols?: Column[] }        // columns put in before c (cols given) or taken out
  | { op: 'col'; at: number; c: number; col: Column };                       // a column renamed or retyped

export function apply(doc: Doc, op: Op): Doc;          // pure; structural sharing: untouched blocks are the same objects
export function invert(doc: Doc, op: Op): Op;          // the op that undoes `op` applied to `doc`
export const applyAll = (doc: Doc, ops: Op[]) => ops.reduce(apply, doc);
```

`rows`/`cols`/`cells` are table-aware: `apply` remaps `=` formulas (`shiftFormula`/`remapRefs`, today in formula.ts) and the table's lock (`remapLock`) when rows or columns move, and `cells` leaves locked cells as they were unless the op carries `force: true` (today's `save(change, moved)` in sheet.ts). These are the only places the kernel knows about A1 references; they live in `table.ts`.

Composed edits, each returning `Op[]` (so undo and tests see primitives only):

```ts
splitBlock(doc, at, offset): Op[]                 // Enter: block `at` becomes two; a li keeps depth/ord; a heading's second half is a p
joinBlocks(doc, at): Op[]                         // Backspace at the start of `at`: joined to the text block before it
family(doc, i): number                            // the end of item i's family (li blocks deeper than it) — outlinemodel.blockEnd, lines.blockEnd
shiftFamily(doc, i, by: 1 | -1): Op[] | null      // outlinemodel.shift, lines.shiftBlock
moveFamily(doc, i, by: 1 | -1): Op[] | null       // outlinemodel.move, lines.moveBlock → one `move`
placeFamily(doc, i, to, how: 'under' | 'after'): Op[] | null   // outlinemodel.place, lines.placeBlock
removeItem(doc, i): Op[]                          // outlinemodel.remove, lines.removeRow: the family comes out a level
replaceSpan(doc, from, to, blocks): Op[]          // one splice
```

### `DocElement` after the kernel

```ts
abstract class DocElement<V> extends LitElement {
  declare value: string;                 // set by the shell, as now
  protected doc!: Doc;                   // parse(value), kept
  protected view!: V;                    // this.read(this.doc), recomputed when doc changes
  protected abstract read(doc: Doc): V;  // the pure function from Doc to what the app draws
  protected edit(ops: Op[]): void {      // apply, re-read, emit 'docchange' with write(doc)
    this.doc = applyAll(this.doc, ops); this.view = this.read(this.doc); this.emit(write(this.doc));
  }
  protected load(doc: Doc): void { this.edit([{ op: 'splice', at: 0, n: this.doc.blocks.length, blocks: doc.blocks }, ...headOps(doc.head)]); }  // templates
  focusFirst(): void | Promise<void> {}  // where a person starts (docs/editing.md §1); each app overrides it
}
```

`focusFirst()` is the editor's half of the open: the shell calls it once a document is first drawn for editing (a new one, a template, a link, after an unlock; not in display mode, an embed, a show link presenting, a locked document, or while a dialog is open), and each editor puts the focus in its own place with its own helper (`focusCell`, `focusBox`, `focusRow`, `focusTask`, `focusCanvas`…), `preventScroll` always: the Word Processor's first words (the caret at their start), the Spreadsheet's A1 (its words selected), the first slide's headline, the first row, the first task, the first card (else the stage's name), the Calculator's entry line, the Drawing Tool's canvas, the Animator's stage, the Diagram Maker's picture, the Calendar's today (else the month's first; a Gantt chart's first task), the Trip Planner's first stop's name (else the map), the Website Builder's site's name, open in the page. The shell never puts the focus on the title box or leaves it on the body.

`commit(T)`/`serialize` go. The `docchange` contract with the shell (text in `value`, text out in the event; the shell's `History` of texts) is unchanged, so `test/dom/helpers.ts#mount` and every shell test keep passing.

A keystroke costs only what it changed (round six): `docchange` still fires with the text on every edit, but the shell projects it into the link (pack, `replaceState`, the library's keep, the tab's title, the signature) only when typing pauses (150 ms), and flushes that projection at once before anything reads the link as the document (the window's blur, the focus leaving the editor, leaving the page, Share and every copy of the link, exports, the password, the title box; `currentHash()` in kit/route.ts outside the shell). A host never parses its own echo: `ours(value)` says the shell handed back the text it last wrote. A host draws again for a `text-select` only when `selectionMoved(key)` says its bar would show something else.

### Each app: the view, and its commands as ops

What stays in the editor as state (not in the document) is listed last for each.

**Write** — view is the Doc itself (`read = (d) => d`; no model type; `richtext.Block` gone). Commands: marks → `text` ops over the selection (per block in a multi-block selection); heading/title/paragraph → `splice` replace of the block with a new `k`/`level`/`cls`; list on/off and indent/outdent → replace with `k: 'li'` and `depth ± 1` (≤ 3); align → replace attrs; Enter → `splitBlock`; Backspace at start → `joinBlocks`, or at a li's start the unlist rule (depth−1, else to `p`); insert icon/date → `text` op inserting `{ ic }` or words (an emoji from the picker is words); footnote → `text` op inserting `{ t: '', fn }`, its words typed in the endnotes (`<to-notes>`: a `line`-shaped `<to-text>` over `noteRuns(fn)` each) and written back as `text` ops replacing that one run; insert embed → `splice` a `fence` (and an empty `p` after); edit embed → replace the fence; remove embed → `splice`; paper → `head`. Word count, caret, link bubble: state.

**Outline** (src/apps/outline; built 2026-10-09) — `readOutline(doc): { items, links, depths, loose }` (li → `{ at, depth, runs, dir, label }`, fence with `depth=` → `{ doc }`, an item that is one web address → `{ doc: 'web\n<url>' }`, edges → links with `live`). Loose words (headings, paragraphs) read as a tree too, and `listify(doc)` is the one splice that makes them an outline, applied as the document arrives (undoable). Commands: a row's `<to-text shape=line>` emits `text` ops, offset to the item's block, plus `splice` replaces of the edges that named the item (`renameIn`); the line's kind and name → `splice` of the li with its attrs (`setLine`); Enter → `splitBlock` on a leaf, else a `splice` of an empty li (first child of an open parent, or after the family); Backspace on an empty item → `removeItem`; Tab/Shift+Tab → `shiftFamily`; Alt+arrows → `moveFamily`; a drop → `placeFamily` (a fence with no `depth=` is given one first); a document → `splice` of a fence with `depth=` after the family; a web address → `splice` of a li that is the address; connect/unlink/setLink → `splice` of edge blocks. A Tiny Little Office link typed or pasted as an item becomes that document (a fence). `outlineToDeck`/`outlineToMind`/`outlineToOrg`/`outlineToNet` are hand-offs (to Deck and Diagram, with `kind:` in the head), `toOpml` an export. State: `folded`, `zoom`, `sel`, `menuFor`, `connecting`, `drag`; footnotes number across items (`noteStart`).

**Deck and the fold apps** — `slides(doc): Slide[]` is `deckmodel.slidesOf` over `pages(doc.blocks)`; a slide also records its block span `[from, to)`. Commands: `patch(slide)` → `replaceSpan(from, to, slideBlocks(slide))`; `addPage` → `splice` `[hr, …blocks]`; `removePage` → `splice` of the span and its `hr`; `movePage` → `move`; sub-document → the span's fence replaced; theme/transition/color/qr/sides/pages → `head`. With `<to-text>` (phase 2) the slide's words are edited as blocks directly: headline = the `h` block (`line` shape), bullets = the li/p blocks of the span (`lines` shape), notes = the `quote` block (`lines`); `Slide` then is a layout type for drawing (`slide.ts`) only. `loosen` stays in `read()`. State: `cur`, `showing`, `shown`, `leaving`, `noting`, `field`.

**Board** — `stages(doc): Stage[]` (h2 → stage with `limit`/`color` attrs; li d0 → card; li d1 `done` → checklist item), each with its span. Commands: rename/limit/colour → replace the `h`; add stage → `splice` at end; move stage → `move` of the span; delete stage → `splice`; add card → `splice` li at the stage's end; move card → `move` of the card and its items; card text → `text`; checklist item → replace/`splice`; tick → replace `done`. State: `drag`, `over`, `field`.

**Sheet** — `sheet(doc): Sheet` is `tableAt(doc, firstTable)` padded to the drawn rows (`ROWS`, `MIN_COLS` are the view's); `evaluate(doc, at)` (phase 3) for values. Commands: type in a cell → `cells` 1×1; paste/fill/clear/sort → `cells` rectangles (sort writes the used rows); insert/delete rows → `rows`; add/remove column → `cols`; type or name of a column → `col`; chart → `head` (or table attr via `withTable`); lock → `head` (`withLock` result). State: `sel`, `end`, `focused`, `rowsShown`, `fillTo`, `widths`, `rowMenu`, `clip`, `picked`, `caret`, computed values.

**Trip** — `stops(doc)` from the table (`tableStops`); add/move/edit/remove stop → `rows`/`cells`/`move` of table rows (a `rows` op with `n` and `rows`); units/linked → `head`. **Gantt** — `tasks(doc)`; edit → `cells`; add/remove → `rows`; indent → `cells` on the Task cell. **Draw** — `readDrawing(doc)`; a shape changed → `cells` on its row; added or taken away → `rows` (the joins renumbered by `cells`); a column wanted and missing → `cols`; alt, `grid:` and `tile:` → `head`; the pixel grid's one `p` → `splice`; the table's birth and death → `splice`. **Motion** — `anim(doc)`; an edit replaces the table block (`splice`), the granularity it has today. **Todo** — `tasks(doc)` from li; edit → replace li (`done`, `.star`, `due=`, runs); add/remove → `splice`; move → `move`. **Calendar** — `spans(doc)` from li; edit → replace li; zone/legend → `head`. **Calc** (src/apps/calc; built 2026-10-09) — `readCalc(doc): { mode, lines, at, loose }`: the tape is one `p`, a line each; `mode: graph` in the head. A loose text (a list, results after the sums, `y = …` lines, an old money mode's inputs, a heading) is made a tape as it arrives by `tidy`, one undoable edit. Commands: a line put in → `text` at the tape's end (the first line a `splice` of the `p`); a line changed or taken away → a `text` op over that line; clear → `splice`; mode → `head` plus the clearing `splice`. State: `entry`, `recall`, the caret between key taps. **Pixel** — the one `p` replaced. **Web, QR** — one `p` replaced; alt → `head`. **Contract** — Write's ops over `blocks[0 .. signatures)`; signatures → the trailing fence replaced. **Invoice** — fields → `head`; items → `cells`/`rows`; notes → `p` blocks spliced.

**The `lines` apps (site, links, lanes, timeline, seating, venn, net, spinner, santa, split, wordsearch, qr) and the diagram editor** — `rowsOf(doc, form): Row[]` is `lines.readLines` with `seen()` walking `doc.blocks` instead of re-parsing text; `blocksOf(rows, form): Block[]` is `writeLines` returning blocks. `DiagramElement.putRows(rows)` becomes `edit(replaceSpan(0, n, blocksOf(rows)))` — the same whole-document granularity as today's `type(text)`; `moveBlock`/`shiftBlock`/`placeBlock`/`removeRow`/`moveItem` in lines.ts become the `family` helpers of ops.ts where they coincide (they do: `depths` adds heading levels, which `family` takes as an option). `pageedit.ts`'s messages map to the same ops (`set` → `text` or `cells`; `add` → `splice`; `remove` → `splice`; `part` → `move`). State: `editing`, `draft`, `joining`, `mode`, `held`, `focusRow`.

**Diagram** (src/apps/diagram; built 2026-10-09) — one app for org, mind, family, lanes, timeline, venn, seating and net, the kind a `head` field. There is no `rowsOf`/`blocksOf` form layer: `linesOf(doc)` reads each `li` as a line (its key before the first ": ", its words, the comma-separated things after the key, at the line editor's offsets) and `edgesOf(doc)` the edges; each kind's layout draws them through Draw's renderer, every shape carrying the `hit` it was drawn from. Commands: a tap on a thing lays a `<to-text shape=line>` exactly over its words (Draw's `wordsOver`), holding the part of the `li` the thing draws, and each change to it is one `text` op replacing that part (its line breaks written as " | "; plus `follow`: the edges naming a renamed person, the overlaps naming a renamed set); a new thing is one `splice` at once (or, one thing more in a list, a `splice` replacing its line), its words offered and chosen; remove → `removeItem` (trees, with their dotted lines), a `text` op (one thing of a list), `splice`s (a line, a lane, a thing and its connections); a drag → `placeFamily` (trees), `move` (+ a `text` op on the key, lanes), `text` ops out of one list and into another (seating, venn); join → `splice` of an edge; a lane, an edge-only node or an edge's words → `text`/`splice` wherever the name is (`rename`); kind → `head`. State: `target`, `joining`, `zoom`, `drag`.

---

## 4. The editor: `<to-text>` (phase 2)

`src/kit/text.ts` (one element, one file ~900 lines, replacing the 1,096 of `src/apps/write.ts` plus the `to-rich` hosts' glue). It edits a span of text blocks, model-driven; it never reads the DOM back except at `compositionend`.

```ts
export class ToText extends LitElement {
  @property({ attribute: false }) blocks: Block[] = [];        // the blocks it owns (indices relative to this span)
  @property() shape: 'doc' | 'lines' | 'line' = 'doc';         // doc: any text block + fences; lines: li/p only (a slide's words); line: exactly one block, Enter is for the host
  @property({ type: Number }) noteStart = 0;                   // footnotes before this span, for numbering
  @property() label = ''; @property() placeholder = '';
  /** Fired with the ops to apply to `blocks` (the host offsets `at` by its span's start), and the selection after. */
  // 'text-ops'  CustomEvent<{ ops: Op[]; sel: Sel }>
  // 'text-enter' CustomEvent<{ shift: boolean }> (shape line; shift for Shift+Enter), 'text-exit' CustomEvent<{ dir: 'back' | 'forward' }>
  // (Backspace at the very start when shape !== 'doc'; Delete at a line's end), 'text-select' CustomEvent<Sel | null>,
  // 'text-selectall' (Mod+A with a line or lines box already whole), 'text-escape' (cancelable: Escape with no box open and no range: the host steps out)
  exec(cmd: Command): void;      // 'b'|'i'|'u'|'s'|'h'|'link'|'unlink'|'fn'|'icon'|'date'|'title'|'h1'|'h2'|'p'|'quote'|'ul'|'ol'|'indent'|'outdent'|'left'|'center'|'right'|'justify'|'embed'
  get sel(): Sel | null; set sel(s: Sel | null);
}
export interface Pos { block: number; offset: number }   // offset in plain characters of the block; an icon, a footnote mark or a '\n' counts 1
export interface Sel { anchor: Pos; focus: Pos }
```

The host (Write, an outline row, a slide, a card) applies the ops with `edit()`, and the editor receives the new `blocks` through its property; the editor's reconciliation (below) never redraws a block whose object identity is unchanged, which `apply`'s structural sharing guarantees.

### `beforeinput` → ops

Every `beforeinput` is `preventDefault()`ed and turned into ops, except while composing. `getTargetRanges()` gives the range for deletes; the model selection is the fallback.

| inputType | op(s) |
|---|---|
| `insertText`, `insertReplacementText` (autocorrect) | delete the selection, `text` insert `data` with the marks in force (`fmt`); `' '` after `-`/`*`/`1.` at a `p`'s start → `li`, after `#`… → `h`, after `>` → `quote` (doc shape), as two steps (the space typed, then the kind) so an undo gives the marker back; `"`/`'` → curly |
| `insertParagraph` | doc/lines: `splitBlock` (at the end of an item whose children follow, the new item is their first child; at the very start of words that are not an item, an empty `p` is spliced in above and the block is left as it is); line: `text-enter` |
| `insertLineBreak` | doc/lines, in a `p`, `li` or `quote`: insert `'\n'`; a heading splits; line: `text-enter` with `shift: true` |
| `deleteContentBackward` / `Forward` | one character or one atomic run; at a block's start: an empty `li` with children goes and they come out a level, any other `li` unlists (depth−1, then `p`), else a join (the block before keeps its kind; when either is empty the empty one is spliced out, so words keep their heading); at the span's start (not doc): `text-exit`; beside an embed block: `splice` it out |
| `deleteWordBackward/Forward`, `deleteSoftLineBackward/Forward`, `deleteHardLineBackward/Forward`, `deleteContent`, `deleteByCut`, `deleteByDrag` | `text` delete over the target range (cut also writes the clipboard, see below) |
| `insertFromPaste`, `insertFromDrop` | the paste pipeline |
| `formatBold/Italic/Underline/StrikeThrough` (Safari's Mod+B…) | `exec('b'…)` |
| `insertCompositionText`, `deleteCompositionText`, `insertFromComposition` | not prevented; see IME |
| `historyUndo`, `historyRedo` | prevented; nothing — Mod+Z reaches the shell as today |
| `insertOrderedList`, `insertUnorderedList`, `formatIndent`, `formatOutdent`, `formatJustify*` | `exec` of the matching command |
| `insertHorizontalRule`, `insertLink`, `formatSetBlockTextDirection`, `formatFontColor`… | prevented, ignored |

### Rendering and reconciliation

Lit `repeat` keyed by block object identity (a `WeakMap<Block, number>` hands out keys). A block renders as one element: `h1.title`/`h1`/`h2`/`p`/`li` (lists are flat `li`s with `style="--d"`; the `ul`/`ol` wrappers of today's `blocksHtml` are not needed in the editor, which draws its own bullets and numbers via `listNumbers`), `blockquote`, `to-embed` (fence), `figure` (img). Inside, runs render to `<b>/<i>/<u>/<s>/<mark>/<a>` nesting as `markedHtml`, atomic runs to `<span class=ic data-icon contenteditable=false role=img>` (the icon's SVG inside; a name outside the starter set after the one lazy load, a name nothing has as its name in small type), `<sup class=fn data-fn tabindex=0 contenteditable=false>`, `'\n'` to `<br>`. Only blocks whose identity changed re-render (the ops say which: a `text` op touches one block), and a changed block is re-rendered whole — no run-level diffing. After render, the model `sel` is written to the DOM selection (`Pos → Range`: walk the block's text nodes, counting atomic elements as 1). `selectionchange` maps back (`Range → Pos`) and fires `text-select`, from which the host's toolbar sets its pressed states (today's `queryCommandState` goes).

### IME and composition

`compositionstart` sets `composing`; `beforeinput` of composition types is let through and no rendering happens (the `blocks` property may change underneath — the host must not re-render that block: the editor holds its own copy of the composing block). `compositionend`: read that one block's DOM back (`domToRuns`, ~60 lines: text nodes and the three atomic elements, nothing else), compute the single `text` op from the model block to the read runs (common prefix/suffix), emit, re-render only if `render(runs)` differs from the live DOM (it will not). Android Chrome fires `deleteContentBackward` with `isComposing` — treated as composing. Safari's `insertReplacementText` arrives outside composition with a target range — handled as a plain replace.

### Paste, copy, cut

Copy/cut write `text/plain` = TLO of the selected blocks (`write` of the sliced blocks, runs cut at offsets) and `text/html` = `docToHtml` of the same with a `<meta name="generator" content="TinyLittleOffice">` marker. Paste, in order: (1) our own HTML (marker present) → parse the `text/plain` TLO → blocks; (2) a Tiny Little Office link alone → `splice` a fence (`linkToRef`); (3) a web address alone, doc shape → a `p` of that address (card); (4) `text/html` → `htmlToBlocks(body)` (`src/kit/clipboard.ts`, the surviving part of today's `domToBlocks`: tags and styles to marks, `<ul>/<ol>/<li>` to li depth, Google Docs' `<b style="font-weight:normal">`, white-space collapse) → fitted to the shape; (5) plain text with a newline, doc shape → `parse` as TLO (lenient: pasted Markdown becomes headings, lists, tables); (6) plain text → `text` op. Fitting: `lines` keeps li/p only; `line` joins runs with spaces.

### Undo/redo

The kernel supplies `invert`. The shell's `History` keeps the document as text (it works for every app and is tested in `apps.test` and `shell-undo`); it gains the selection: `record(before: string, sel?: Sel)` and `undo()` returns `{ text, sel }`, which the shell passes to the editor (`to-text`'s `sel` setter) so the caret lands where the change was. Typing bursts coalesce as now (700 ms). `invert` is used by the editor to roll back a composition the browser abandoned and by tests (`apply(apply(d, op), invert(d, op)) deepEquals d` over random ops). See decision 2.

### Atomic runs and blocks

Footnote marks, icons and embeds are `contenteditable=false`; a mark is `tabindex=0` and, on click, Enter or Space, says `text-note` ({block, nth}) for the host to open its note; Backspace/Delete beside or on one removes it (one `text` or `splice` op). A note's words are typed where the host draws them, at the foot (Write's endnotes, a slide's foot, under an outline): `<to-notes>` (kit/notes.ts) draws each note as a `line`-shaped `<to-text>` over `noteRuns(fn)` and tells the host `note-change` (one `text` op replacing that mark's run), `note-back` and `note-remove`; only a host with `notes` is offered the Footnote command. (2026-10-10: the note popover is gone, docs/editing.md §2.)

### Phones (iOS Safari)

The editable's font-size is never below 16px (prevents the focus zoom); `focus({ preventScroll: true })` everywhere, and the page is the visible window with the document in a column that scrolls by itself (§9), so focusing never scrolls the page and the caret is kept inside the column through kit/scroll.ts; the formatting bar and popovers are placed inside the column's box (`room()`, kit/scroll.ts), which is the visual viewport's, so they sit above the keyboard; `autocapitalize="sentences"`, `enterkeyhint="enter"` (`"done"` for `line`); no `execCommand` anywhere; `-webkit-user-modify` not used; selection restore is deferred to `requestAnimationFrame` after render (Safari drops a selection set synchronously during a DOM swap); a `pointerdown` on a toolbar button `preventDefault()`s so the keyboard stays up (today's `keepFocus`).

### Adoption order and what each deletes

1. **Write** (`src/apps/write.ts` → `src/apps/write/editor.ts`, ~350 lines of toolbar, notes list, bubble and popover around one `<to-text shape=doc>`). Deleted: `domToBlocks`, `embedBeside`, `noteBeside`, `blockOf`, `isBlockTag`, `caretAfter`, `renumber`, `chips`, `insertAsked`, `insertHtmlByHand`, the DOM-surgery `link()`, `makeTitle`, `exec` with `execCommand`/`styleWithCSS`, `onPaste`, `insertEmbed`, `removeEmbed`, `onBlur` re-linkify, `itemAtStart`, `unlist`, `onBeforeInput` (its two rules move into the editor), `onKey`'s Tab/Backspace handling, `onSelection` with `queryCommandState`, `loadHtml`/`blocksToHtml`/`runsToHtml` (the editor renders), `shift()`, `mode`, the `to-rich` element. Kept: `blocksHtml`/`markedHtml`/`docToHtml` in write.def.ts (exports), `footnotes.css`.
2. **Outline** — each row's `<to-rich mode=line>` becomes `<to-text shape=line .blocks=${[item block]}>`; `rich-change` → `text-ops` offset by the row's block index; `rich-enter` → `text-enter`; the toolbar's `this.field?.exec` stays (same name). Deleted: `focusItem`'s range dance (set `sel`), `notesIn` counting (the editor numbers from `noteStart`).
3. **Deck, zine, booklet, brochure, poster, badges, comic** (`pages.ts`, `deck.ts`, `fold.ts`): headline `<to-text shape=line>` over the `h`; bullets `<to-text shape=lines>` over the span's li/p blocks (Tab = indent op, so `shift()` by two spaces goes); notes `<to-text shape=lines>` over the `quote` (replacing the `<textarea>`). Deleted: `headline()`/`words()`/`textTools()`'s to-rich glue, `patch({ bullets })` string lists, `depthOf` on leading spaces.
4. **Board**: card text `<to-text shape=line>`; checklist items `<to-text shape=lines>` over the depth-1 li blocks (a tick is still an `<input type=checkbox>` beside each line). Deleted: the `<input type=text>` per item and `patchItem`'s string juggling.
5. **Page sections** (site, links; `diagram-page.ts`, `pageedit.ts`): see decision 3 as it now stands: things tapped in the frame, each edited in its own form; `EDIT_SCRIPT`'s contenteditable spans, `data-lf*` markup and the `editData` plumbing are deleted.

Tests: `test/dom/text.test.ts`, `deck-write.test.ts`, `footnotes.test.ts`, `lists.test.ts` (the board card case), `outline.test.ts` type by setting `innerHTML` and firing `input` — that is the contentEditable contract and it goes. They are rewritten against a helper `typeIn(el, text)` that dispatches `beforeinput` (`inputType: 'insertText'`, `data`) and `key(el, 'Enter')` that dispatches `beforeinput insertParagraph`; selection is set through the element's `sel` setter. Whether happy-dom's `InputEvent`/`Selection` suffice is the first risk below; if not, the editor's tests land in Vitest browser mode (phase 6 pulled forward for this one file).

### Rows chosen whole: `src/kit/rows.ts`

Every app with rows (Outline's items now; Todo, Board's cards, Trip's stops and the schedule's tasks as they adopt it) chooses rows whole through one Lit `ReactiveController`, so the keys, the handle, the drag, the clipboard and the bar under a range are the same everywhere (docs/editing.md §3, §6). The host knows its rows and its document; the controller knows nothing of either.

```ts
const rows = new Rows<Id>(host, {
  rows(): { id: Id; el: HTMLElement; span: { from: number; to: number } }[],  // on screen, in order; span = the row's blocks with its family
  box(): HTMLElement | null,              // takes the focus while rows are chosen (tabindex=-1)
  handle: '.my-handle',                   // also given class to-rows-handle: touch-action none, 44px under a coarse pointer
  nests?: boolean, fromWords?: boolean,   // Indent/Bring out and drops "under"; Shift+Up/Down and Escape in words choose the row
  current?(): Id | null, span?(rows): RowSpan | null,
  edit(id, offset: number | 'end'),       // the caret into a row's words
  remove(span, ids), move(span, by), canMove(span, by), shift?(span, by), canShift?(span, by), duplicate(span),
  copy(span): { text, html }, paste(data, span | null), drop?(id, to, 'under' | 'after'), extra?(span): ContextEntry[],
});
rows.range; rows.drag; rows.has(id); rows.span(); rows.choose(id, extend?); rows.extend(±1); rows.selectAll();
rows.release(id?, offset?); rows.select(range); rows.renderContext(); lastCopied();
```

`move`, `shift` and `duplicate` return the range to keep chosen (ids after the edit), or null to let go. The controller listens on the host for keys, focus and the handle's pointer events, and on the document (capturing) for copy, cut and paste while a range is chosen and the focus is in the host or nowhere, and for a pointerdown outside the host, which lets the range go. The bar sits under the range, above it under a coarse pointer (`ToContext.show(anchor, 'above')`) so the rows below stay free for the tap that extends. A drag is pointer events with `setPointerCapture`, a 6px threshold, `elementFromPoint`, the insertion line drawn as `.to-rows-target` in the body, and auto-scroll within 48px of the scroller's edges; a still press is the tap that chooses (on a touch screen, a second tap on another handle extends). Undo is the host's: Outline passes the range or the caret from before each edit as the entry's `mark` and puts it back in `undone()` (`firstAt(entry)` when there is none); Escape in a row's words reaches the controller as `<to-text>`'s `text-escape`, after the boxes have closed and the words collapsed.

---

## 5. The formula engine over a table block (phase 3)

```ts
// src/doc/table.ts
export interface Table {
  cols: Column[];
  rows: string[][];           // the used rows only, each `cols.length` wide
  lock: Range[];              // from `lock:` (head or attr)
  chart: '' | 'bar' | 'line' | 'pie' | 'sankey';
}
export interface Range { r0: number; c0: number; r1: number; c1: number }
/** Block `at` as a table; its lock and chart from the block's attrs, else, when it is the document's first table, from the head. */
export function tableAt(doc: Doc, at: number): Table | null;
/** The doc with block `at` written from `t`: cells and columns into the block; lock and chart where they were read from. */
export function withTable(doc: Doc, at: number, t: Table): Op[];
export const firstTable = (doc: Doc) => doc.blocks.findIndex((b) => b.k === 'table');
// moved from formula.ts, now over Table/rows instead of a 1,000-row Grid:
refToRC, rcToRef, rangeOf, rangeRef, lockedRanges, isLocked, withLock, remapLock, shiftFormula, remapRefs, movedIn, movedOut,
usedSize, copyCells, pasteCells, clearCells, fillCells, seriesOf, sortRows, nameKey, namedCells, ROWS (= 1000, the most a reference may name), MAX_COLS (26)

// src/doc/formula.ts
export type CellValue = number | string | null;
export interface Evaluated { values: CellValue[][]; named: Map<string, [number, number]> }   // values for every used row, `cols.length` wide
export function evaluateTable(t: Table, today = todaySerial()): Evaluated;   // tokenize/parse/evalNode, FUNCTIONS, parseLiteral, unchanged
export function evaluate(doc: Doc, at = firstTable(doc)): Evaluated | null; // evaluateTable(tableAt(doc, at))
export { FUNCTIONS, COLUMN_TYPES, parseLiteral, formatValue, formatCell, dateToSerial, serialToIso, todaySerial }
```

`Grid` (1,000 padded rows) and `Sheet { grid, types, names, chart, lock }` are deleted; the sheet editor's `read(doc)` is `tableAt(doc, firstTable(doc))` plus the view's padding (`drawn` rows, `MIN_COLS` columns) — `grid[r]?.[c] ?? ''` already tolerates a short table, and `evaluateTable` returns `null` for a cell past the used rows. `columnName`/`defaultColumnName` stay (view). `sheet.def.ts`'s `measured`, `chartOfSheet`, `sheetToCsv`, `sheetToXlsx`, `toExcelFormula` take `Table` + `Evaluated`. `insertRows/deleteRows/insertColumns/deleteColumns` become the `rows`/`cols` ops' `apply`.

Because `evaluate` takes any `Doc` and block index, a table block inside a Write document or on a slide is evaluated in place: Write's view draws a `table` block through the sheet's `measured` renderer rather than wrapping it as a `sheet` fence (the text is unchanged: it was a table before and after; `richtext.serializeDoc`'s "a sheet that is a table and nothing more is written as that table" rule is simply the kernel keeping the block).

### Costumes become templates or views

- **Budget, expense log, invoice table, project tracker, loans, models (subscription, café, freelancer, fund), training log, months**: already Sheet templates in `src/lib/templates.ts` (`SHEET`), built with `write()` of table blocks with `chart`/`lock` heads; they move to `src/apps/sheet/templates.ts` unchanged.
- **Invoice** (kept as an app under Page in the phase-4 table): its lines table gains an `Amount:money` column of formulas (`=B1*D1`, written by the template and by the editor when a line is added) and the page view (`invoice.def.ts`) calls `evaluate(doc, firstTable(doc))` for the amounts and sums the column for subtotal; tax and currency stay in the head. `parseInvoice`'s own arithmetic (`amountOf`-based) is deleted. The invoice editor's `patchItem` becomes `cells` ops.
- **Calculator money modes** (`mode: mortgage | invest | cashflow | interest`): each is a Sheet template with an `Assumption:name | Value:number` pair of columns and a results column of formulas (`=PMT(rate/12, years*12, -price*(1-down/100))`, `=FV(...)`, `=NPV(rate/100, B1:B10)`, `=IRR(...)`, `=principal*(1+rate/100/times)^(times*years)`), the year-by-year tables as filled-down rows, `chart: line` where the calc drew one, `lock` on the formulas. `calc.ts`/`calc.def.ts` keep `calc` and `graph` (a tape is not a table); the money branches of `calc.def.ts` (the card/table/chart page), `FIELDS`, `withDefaults`, `mortgage`, `invest`, `cashflow`, `interest`, `inputs`, and `readCalc`'s money detection are deleted; `readCalc` of a money-shaped text hands over to the matching sheet template. What is lost is the four-figure headline card; the sheet shows the table and the chart. Flagged in §7.

---

## 6. Migration order and cut lines

Each step is one merge; main stays green (typecheck, unit, DOM, build); the path it replaces goes in the same change. Sizes are files touched.

| # | merge | content | deletes | tests | size |
|---|---|---|---|---|---|
| 1 | **`src/doc/` with today's semantics** | `lib/tlo.ts` → `doc/tlo.ts` + `doc/model.ts` (`Tlo`→`Doc`); `lib/richtext.ts` minus `parseDoc`/`serializeDoc` → `doc/notes.ts`; `richtext.parseDoc`/`serializeDoc`/`Block` stay in `apps/write.def.ts` for now (they are Write's view). Import paths updated everywhere. | `src/lib/tlo.ts`, `src/lib/richtext.ts` | `tlo.test`, `richtext.test`, `footnotes.test`: import paths only | ~75 (mechanical) |
| 2 | **Runs and columns in blocks; the byte-stable writer; `foldNotes` in `parse`** | `runs: Run[]` on h/p/li/quote; `cols: Column[]`; `writeInline` with the parse-back check; `plainText`; the property test over templates and skill examples | `tlo.plain`, `richtext.plainInline/serializeInline`; every `b.text.split('\n')` and `parseInline(b.text)` in the models and drawings | `tlo.test` block literals rewritten to runs (same cases); `richtext.test` folded into `doc.test`; `footnotes.test` adapted; `skill.test` must pass unchanged | ~40: `deckmodel`, `outlinemodel`, `boardmodel`, `todomodel`, `calmodel`, `sitemodel`, `lines`, `diagram` (`wordsOf`, `asItems`), `drawmodel` (`looseDrawing`), `animmodel`, `calc`, `pixel.def`, `contract.def`, `markdown`, `write.def`, `outline.def`, `slide`, `deck.def`, `api`, `templates`, tests |
| 3a | **`ops.ts`; `DocElement.read/edit`; the tree apps** | `Op`/`apply`/`invert` + `family` helpers (from `outlinemodel` and `lines`); Outline, Board, Todo on `read(doc)` + ops | `outlinemodel.shift/move/place/remove/blockEnd`, `lines.moveBlock/shiftBlock/placeBlock/removeRow/blockEnd`; `commit`/`serialize` in those editors | `outline-lines.test` → ops tests; `apps.test` round trips keep (strings in, strings out); `dom/outline`, `dom/lists` keep | ~14 |
| 3b | **Deck and fold on spans** | `slidesOf` returns spans; `PagesElement.patch` → `replaceSpan`; settings → `head` ops | `PagesElement.savePages`, `serializeDeck`/`writeSlides` as editor paths (kept for `read()` and `outlineToDeck`) | `dom/deck-write`, `footnotes` keep; `apps.test` deck keep | ~8 |
| 3c | **Tables: `table.ts`; Sheet, Trip, Gantt, Draw, Motion, Invoice, Split on ops** | `tableAt`/`withTable`; `rows`/`cols`/`cells` apply with remaps; `Grid` gone | `formula.Sheet/Grid/readSheet/serializeGrid/parseGrid/typesOf/namesOf/chartOf/tableSheet/insertRows/deleteRows/insertColumns/deleteColumns` (become ops), `sheet.ts#save` locked-cell loop | `formula.test`, `sheet-rows.test`, `dom/sheet-rows`, `dom/sheet-cal`: Table API in place of Grid; same assertions | ~16 |
| 3d | **Lines apps and pages on `rowsOf(doc)`/`blocksOf(rows)`** | `lines.seen` over blocks; `DiagramElement.putRows` → ops; `pageedit` messages → ops | `readLines(text)`/`writeLines(rows): string` signatures | `site.test`, `pages.test`, `apps.test` lines cases: signature change | ~30 (every `*.def.ts` with a form) |
| 3e | **The rest**: Cal, Calc, Pixel, Contract, Web, QR, Anim keys | `read(doc)` + replace ops | their `parse`/`serialize` pairs as editor paths | `calendar.test`, `calc.test` keep | ~10 |
| 4 | **`<to-text>` and every rich-text host** | `src/kit/text.ts`, `src/kit/clipboard.ts`; Write, Outline, Deck/fold, Board adopt; `History` records selection | `apps/write.ts` contentEditable code (listed in §4), `to-rich`, `pageedit`-free; `richtext.parseDoc/serializeDoc` (Write's view is the Doc) | `dom/text`, `deck-write`, `footnotes`, `lists`(board), `outline`: rewritten on `beforeinput`; new `text.test` for Pos↔Range, inputType table, paste pipeline, `invert` property | ~20 |
| 5 | **Page sections on `<to-text>`** | site/links/invoice sections edited beside the frame | `pageedit.ts` `EDIT_SCRIPT`, `editData`, `diagram-page.ts` held/born/stamp logic, `data-lf*` in page HTML | `site.test` pageedit cases, `dom/pages`, `dom/page-frames` rewritten | ~12 |
| 6 | **Formula engine over the table block** | `doc/formula.ts` `evaluate(doc, at)`; Sheet view evaluates; Write and slides draw table blocks evaluated in place | `formula.ts` under `src/lib`; the "a table in a text is a sheet fence" rewrite in Write's read | `formula.test` (evaluate over Table), `exports.test` (xlsx/csv), `apps.test` embed cases | ~10 |
| 7 | **Costumes** | invoice `Amount` column + `evaluate`; four money templates; calc money modes removed; sheet templates to `apps/sheet/templates.ts` | `calc.ts` money functions, `calc.def.ts` money page, `invoice.def.ts` arithmetic | `calc.test`, `apps.test` calc/invoice cases, `templates.test`, `skill.test` (the calc example is `mode: mortgage`? — regenerate the skill) | ~10 |

Steps 1–2 are the kernel (phase 1 lands at 3e); 4–5 are phase 2; 6–7 phase 3. 3a–3e can be merged in any order after 2; 4 needs 3a–3b; 6 needs 3c. If phase 0's folder move is in flight on the same box, do step 1 after it lands (both move files).

Tests that must be rewritten: `tlo.test` (literals), `richtext.test` (folded), the five DOM editor tests named in step 4, `site.test`/`dom/pages` for pageedit, `formula.test`/`sheet-rows` for the Table API. Tests that keep passing with import changes only: `apps.test` (string round trips through `read`), `outline-lines`, `calendar`, `calc` (until 7), `exports`, `markdown-agents`, `templates`, `embeds`, `envelope`, `codec`, `sign`, `tinier`, every shell DOM test, `skill.test` (the hard gate for byte-stability).

---

## 7. Risks, and three decisions

### Risks

1. **Byte-stability of the inline writer.** Making runs the model means every block the kernel writes passes through `writeInline`. The parse-back check keeps canonical text identical; the gate is `skill.test` plus the new property test over all templates. Non-canonical inputs (`__bold__`, `<u>`, backtick spans, `[^1]` notes) will be rewritten canonically in any app, where today only Write and Deck did so — intended ("read leniently, write canonically"), but it will surface in `apps.test` cases that compare strings after a model round trip.
2. **happy-dom and `beforeinput`.** The editor's tests need `InputEvent` with `inputType`/`data`/`getTargetRanges` and a faithful `Selection`. happy-dom has `Selection` but `getTargetRanges` is uncertain; if it fails, `test/dom/text.test.ts` becomes the first Vitest-browser-mode file (phase 6 brought forward for one file), and the unit-level `Pos↔offset`, ops and paste-fitting logic are tested in node without a DOM.
3. **IME.** Compositions interleaved with `deleteContentBackward` (Android), `insertReplacementText` (iOS autocorrect) and dead keys; the design reads the composing block back once at `compositionend`, which is the pattern that works, but it needs a device pass at 390px before step 4 merges.
4. **Churn against the other agent.** Steps 1 and 3d touch ~75 and ~30 files; coordinate with the phase-0 folder move so the two do not both rename the same files in one week.
5. **Undo granularity.** Snapshot history coalesces by time (700 ms); a `cells` paste or a `rows` op is one step as today. Fine, but if decision 2 goes to an op log, every editor must emit ops for every change (3a–3e make that true).
6. **The calculator's money modes** lose their headline card when they become sheet templates (§5); `readCalc`'s loose reading ("Price: $350,000 is a mortgage") must redirect to a template or be dropped.
7. **In-frame page editing** is a feature the README leads with; step 5 changes how it feels (decision 3).
8. **`evaluate` on every render** of a Write document with tables — small documents, but cache by block identity (the `Evaluated` for an unchanged table block object is reused).

### Three decisions for a human

1. **Runs are the stored model (recommended), or text is stored and runs are a derived view.** Runs-in-model is what rebuild.md names and what the editor and views need; its cost is the byte-stable writer (the parse-back check, ~30 lines) and the acceptance that *any* app now writes canonical inline Markdown for blocks it touches. The alternative keeps `text: string` in blocks and parses to runs on demand; smaller step 2, but rich text then lives in two forms and the editor converts at every edge.
2. **Undo stays the shell's text-snapshot `History` with the selection added (recommended), or becomes an op log in the kernel using `invert`.** Snapshots work for every app today and across the title; `invert` exists either way (tests, IME rollback). An op log would give per-op granularity and selection by construction, but every app's change must then be ops (true after 3e) and the shell's `state()`/`step()` and `shell-undo` tests are rewritten.
3. **Page sections: edited beside the frame in `<to-text>` (recommended), or in the frame as now with `pageedit.ts`'s script kept.** Beside the frame deletes the in-frame contenteditable spans (the last `contenteditable` outside the editor, as the phase requires) and gives sections rich text; in-frame editing is what the README promises ("edited on the page itself, a '+' where anything can go"), and keeping it means the page's script stays a second editor with no model.

### Critical files for implementation

- `/home/exedev/workspace/tinyoffice/src/lib/tlo.ts` — becomes `src/doc/tlo.ts` + `src/doc/model.ts`; the parser and writer, and where runs and columns are added
- `/home/exedev/workspace/tinyoffice/src/lib/richtext.ts` — its helpers become `src/doc/notes.ts`; its `Block`/`parseDoc`/`serializeDoc` are what the kernel replaces
- `/home/exedev/workspace/tinyoffice/src/lib/formula.ts` — `Grid`/`Sheet`, remaps and locks become `src/doc/table.ts`; the evaluator becomes `src/doc/formula.ts#evaluate(doc, at)`
- `/home/exedev/workspace/tinyoffice/src/apps/write.ts` — the contentEditable editor `<to-text>` replaces, and the one `to-rich` element its hosts (`outline.ts`, `board.ts`, `pages.ts`) depend on
- `/home/exedev/workspace/tinyoffice/src/lib/lines.ts` — `readLines`/`writeLines` and the family-moving helpers that become `rowsOf(doc)`/`blocksOf(rows)` and `src/doc/ops.ts`


---

## 8. Greenfield adjustments and the decisions (2026-10-09)

The rebuild is greenfield on the branch `next` (docs/rebuild.md). So:

- §6 is not a migration; it is the **order of building** `src/doc/` and the apps on it: model + tlo + notes (steps 1–2 as one: port `src/lib/tlo.ts` and the helpers of `richtext.ts` from the old tree with runs and columns in the blocks from the start, byte-stable writer, `foldNotes` in parse), then `ops.ts`, `table.ts`, `formula.ts`; then `<to-text>`; then the apps in the order of docs/rebuild.md.
- The byte-stability gate is a property test over every template and every example in the old tree's docs/tlo.md and skill/tinyoffice/SKILL.md: `write(parse(x)) === x`.
- The editor's tests run in **Vitest browser mode** from the first commit (risk 2 is gone); `Pos↔offset`, ops, paste fitting are node tests.
- There is no `to-rich`, no `pageedit.ts`, no `execCommand`, no contenteditable outside `<to-text>`, ever.
- Invoice is a **Write template**: a table block with an `Amount:money` column of formulas, evaluated in place by `evaluate(doc, at)`, drawn as paper by Write's print view; its fields (`from`, `to`, `number`, `date`, `due`, `tax`, `currency`, `terms`) are head fields (decided with Paul, 2026-10-09).
- The calculator's money modes are Sheet templates (§5); the headline figure is an attribute on the table (`{big=Payment}`) the sheet view draws large above the table, so nothing is lost.

**Decision 1 — runs are the stored model.** Yes. Every app writes canonical inline Markdown for the blocks it touches; the parse-back check keeps canonical text byte-identical.

**Decision 2 — undo is an op log in the kernel**, not text snapshots. Greenfield removes the reason for snapshots (the old shell tests). Every editor emits ops; `History` holds `{ ops, inverse, sel }` entries, coalescing typing bursts (700 ms) and composition; the title and head fields are `head` ops like any other. `invert` is therefore load-bearing and property-tested.

**Decision 3 — the page is edited in the page** (Paul, round four, 2026-10-09, overriding "sections edited beside the frame"). The site fills the editor in its sandboxed frame; every thing on it (a page's or a section's heading, a heading, a paragraph, a button, a big link, a small link, a picture, a big icon, a thing from the web, another document, a table, the shop's products) is marked with its id, and the frame's one hashed script (`EDIT`) only says what was tapped and where it is. A tap takes a thing in hand (its `<to-context>`: Edit, Move up/down, Move left/right in a row, Duplicate, Delete); a tap on it again opens its mini form, a kit `<to-dialog>` with exactly its fields (rich words in a one-line `<to-text>`, plain words, where it goes, its icon; a picture, a web thing, a document and a table use the kit's own dialogs), and Done writes one op. Insert ▾ at the top left makes a thing after the one in hand through the same form. Nothing typed is a marker or a separator; no script in the page edits text, and there is no panel beside it. Preview draws the page as a visitor has it. *(2026-10-10, Paul: "Website builder—do it.")* The words are now typed in the page: the frame's script is `src/apps/site/frame.ts`, built as one classic script served from the site (`/site-frame.js`, scripts/site-frame.ts; allowed by `'self'` in the policy the sandboxed frame inherits, since an external script is not matched by a hash without CORS, which an opaque origin cannot have), carrying the kit's `<to-text>`; a tap on a thing's words puts it there, focused in the tap, and each change comes to the editor as the thing's runs (`wordsOps`: one `text` op), Enter in a heading or a paragraph a new paragraph (`splitOps`), the page drawn again when the words are done. The forms are left for what is not words (where a link goes and its icon, by the URL chip; the shop's settings).

---

## 9. The shell, the chrome and the column (round eight, 2026-10-10)

The shell is thin. `<to-shell>` (kit/shell.ts) keeps the route, the document, its projection to the link (`writeLink`, `flushLink`, the 150 ms pause), the library's keep (kit/library.ts `Keeper`), the title and the editor's mounting. Round it are elements that take their state as properties and speak back by events, each under 500 lines:

| element | file | what it is | says back |
|---|---|---|---|
| `<to-chrome>` | kit/chrome.ts | where things sit: the header and its words, the menu button, the banners (a short link's time left, another version kept here), the column and the bar's place in it | `to-drawer-open`, `to-share-open`, `to-retitle`, `to-copy-new`, `to-arrival-close`, `to-other-close` |
| `<to-share>` | kit/share-dialog.ts | the Share dialog: the link and where it fits, the short link, posting, the QR code, the embed code | `to-owned` |
| `<to-privacy>` | kit/privacy-dialog.ts | unlock, the password, signing, the signed state beside the title (`trustButton`), the Share dialog's Password and signature part (`renderProtect`), the Privacy dialog | `to-unlock`, `to-lock`, `to-signed`, `to-share-open` |

and, as before, the editor, `<to-drawer>` (which, with a document open, begins with This document: Share… and Download), `<to-find>`, `<to-toast>` and the shortcuts dialog. The page's keys are kit/keys.ts `pageKey`.

**The page is the visible window; the column scrolls.** `html` and `body` are `height: 100%; overflow: hidden; overscroll-behavior: none` on the screen (print flows on). `<to-chrome>` is a column exactly the visual viewport's height, set from `visualViewport.height` as it resizes (the layout viewport's while a desktop pinch has zoomed in), and the window is put back at its top whenever the visual viewport scrolls (`pinWindow`), so the layout viewport never slides. In it: the header, the banners, and `.to-column`, which holds the bar's place and `.to-main`, `overflow-y: auto; overscroll-behavior: contain`, the document. The column's height is `--to-col-h` on the chrome, for what fills it (the Drawing Tool's canvas, the Diagram Maker's picture, the Animator's stage, the Website Builder's frame, the Trip Planner's map, the Spreadsheet's box).

**The bar's place.** The app's bar stays the editor's first child, drawn by the app as ever; the stylesheet takes it out of the document's flow and sets it in `.to-column.barred` (absolutely, against the column, which `.to-main` does not clip): at the column's top on a wide screen, under the header as it always was, and at its bottom under a coarse pointer, so on a phone it sits above the keyboard as one scrolling row however the words are scrolled. Its height is the nav's (`--to-bar-h`), and the column keeps that much room for it.

**On a phone, editing.** Under a coarse pointer, while a box has the focus (a `<to-text>`, a field in an app, a page in a frame), `<to-chrome>` has `editing` and the header steps aside; the menu button alone stays, floating on a card at the column's top inline end, and a short link's banner goes small. The header returns when the focus leaves the box (a tap outside, Escape, Done); a hop to the bar, a menu or a dialog and back is not leaving. The menu button is at the inline end on every screen (the right in a left-to-right language, the left in Arabic): the words begin at the inline start, so a button there would cover the first line and the caret, and on an iPhone the left edge is Safari's back swipe. The drawer slides in from the same side. Paul, 2026-10-10: "when editing, the top nav vanishes except for the hamburger. The secondary nav is now aligned bottom."

**Scrolling, in one place.** kit/scroll.ts has `scrollerOf(el)` (the nearest box that scrolls, else the column), `reveal(el, opts)` (each box round it moved by what it takes, nothing behind a dialog or a popover, the window never) and `room()` (where a menu, the context bar, the link box or the completion list may sit: the column's box within the visual viewport). The caret kept in view (`keepCaretVisible`), Find's match, a note, a completion, a card or a stop brought in, the Outliner's drag at the column's edge and a pinch keeping the words under the fingers all go through it. A node test (test/scroll.test.ts) fails on any other module that reads `window.scrollY` or scrolls the window; the Website Builder's frame and a site's own page script scroll windows of their own.

**Why, and the price.** Safari on iOS does not make the page shorter for the keyboard, only the visible window; a bar stuck to the page's top had to be measured into place (`--to-vv-top`, `--to-stuck-h`, a frame-by-frame watch after every resize, focus and touch) after events that came late or never, and was found parked a third of the way down. A column the visible window's height puts the bar where it belongs with nothing measured but the window. **The price is Safari's toolbar: it no longer collapses as the words scroll**, since the page itself never scrolls, so a phone shows a little less of the document than a page that scrolled the window would.


---

## 10. The grammar, written once, and the properties fuzzed from it (round nine, 2026-10-10)

TLO's grammar is written formally once, in `test/doc/tlo-grammar.ts` (`TLO_EBNF`, ISO 14977 EBNF read by a forty-line
reader, `readGrammar`): the head, the nine blocks, attributes, tables and their typed headings, fences, edges,
images, and the inline marks, links, icons, notes and escapes, lenient forms and all. It is dev only: nothing in it
ships, and the parser in `src/doc/tlo.ts` is not generated from it. The grammar documents the parser; where the two
disagree, a property below fails naming the text, and §2's "Grammar the kernel must preserve" decides which is wrong.

Two generators come from it, both with fast-check, both biased to the hard cases (marks at a block's edges,
attributes that look like words, `\{`, `~~` beside a link, empty cells, items nested deep, icons and emoji in names,
right-to-left words): `textOf(rule)` makes texts from the EBNF; `arbitraryDoc()` makes models of the kernel as far as
the format can say them, and `sayableLine`/`sayableDoc` list, one rule a line, what it cannot (a mark never begins or
ends with a space; an item is at most one deeper than the item before it; "a line's words never begin or end with
spaces" was taken out in round ten, when the format learned to say them).
`arbitraryOp(doc)` and `arbitraryEdits()` make operations that apply.

The properties, each a `fc.assert`-style check whose failure names the shrunk counterexample (200 cases each;
2,000 under `npm run fuzz`):

| property | where |
|---|---|
| any text the grammar makes is read, and its writing is canonical: `write(parse(write(parse(x)))) === write(parse(x))` | test/doc/properties.test.ts |
| a lenient text and its canonical writing read alike: `parse(write(parse(x)))` is `parse(x)` | " |
| `write(parse(x)) === x` for every canonical text, and `parse(write(d))` is `d` for every model the format can say | " |
| every op applied then its inverse gives the document back (untouched blocks keep their identity); a random run of ops then `invertAll` too | " |
| `pages()` never throws, never gives no pages, and holds every block but the rules in order | " |
| formulas: `a + b = b + a`, `a * b = b * a`, `(a + b) + c = a + (b + c)` within 1e-9 of the sum's scale; `=X` is X's value; a cell that reaches a cycle is `#CIRC` and one clear of cycles its sum, never a loop | " |
| `decodeDoc(encodeDoc(x)) === x`, and the encoding chosen is never longer than the raw | " |
| a document pasted as HTML (`docToHtml` → `htmlToBlocks`) is one the writer keeps; pasting it again changes nothing; paragraphs and items come back as they were | test/browser/paste-properties.test.ts |

What the fuzz found on its first runs, each fixed with a test in test/doc/grammar.test.ts or test/browser/paste.test.ts:
a rule's attributes (`--- {.big}`) read as words; an item's attributes, written after its last line, were read only
from its first; an edge's attributes with no label were read into the thing it goes to; a table whose last heading is
empty lost that column (`Name |` read as an edge); a line with a pipe over a lone `-` or `- |` item read as a table, and
so did an item's own next line; words written `a | b` over `--- | ---` in one paragraph read as a table; spaces at a
line's end (a code span's, a link of a space), and inside a mark's ends, came back moved; an empty line of a paragraph
(`<u>` alone) or the last of a quote ended the block or was swallowed by its attributes; an icon kept marks the writer
cannot say; words ending `:x` before an icon read as the icon `:x:` (the writer now checks its full escaping reads back
and escapes every mark where it does not); our HTML put an ordered item after a bulleted one in the same list; a pasted
list could start deeper than the text can say.

**The dictionary, measured.** `npm run dictionary` (scripts/dictionary.ts) trains a deflate dictionary of the same
size on the corpus (test/doc/corpus and generated documents) and reports every template's link under today's and the
trained one. It changes only if every template is shorter or equal and the largest template's link is 5% shorter or
more; a second dictionary would be read under a new flag letter beside `y`, so links made with the first still open.

## 11. Random walks over the chrome (round nine, 2026-10-10)

The bugs found by hand on a phone (the bar parked mid-screen, a dialog cut by the edge, the keyboard taking the focus)
were each an invariant broken after some sequence of actions. `test/browser/walks.test.ts` walks such sequences with
fast-check's model-based testing (`fc.commands`, `fc.asyncModelRun`): the model and its steps are `test/walks-model.ts`
(pure, read by a node test that every registry command is a step of some walk, so a command joins the walks by being
registered); each step is done to the real page (a registry command in force, through its `when`, with the focus where
a person's way to it leaves it; Escape, Tab, Shift+Tab, Enter, the arrows, Mod+A; a word typed; a tap outside what is
open, or in the document; the column scrolled; the drawer, a menu of the bar, Share, the templates, the palette; a pinch;
a phone's keyboard up and down; another app and back), and after every step the rules are asserted:

| rule | what holds |
|---|---|
| focus | the focus is inside what is open, else in the document or the chrome; never under `aria-hidden` |
| back | after Escape or a dialog's backdrop, the focus is where it was when the thing opened (or on what was tapped to open it, or, for a command's dialog opened from a button, on the words it acts on) |
| modal | at most one modal `<dialog>` is open |
| window | `window.scrollY` is 0, and the chrome round the column never scrolls: the column does |
| link | the address, flushed, is the document the shell holds, written back as it is read |
| bar | the app's bar, where it is shown, is one row inside the visible window |
| overflow | no words run off the screen sideways; the page is no wider than the window |
| names | everything open has an accessible name |
| keystroke | a word typed in a box already warmed costs under perf.test.ts's 12 ms a letter |
| errors | nothing throws |

One test per app family (text: Write, Outline, Deck; grid: Sheet, Calendar, Calculator; canvas: Drawing, Diagram,
Animation; lists: Board, To-do, Trip; Site) at 390×844 with a coarse pointer and at 1440×900. The default suite walks 16
steps from fixed seeds (about twenty seconds); `npm run walks` walks 200 steps, twice a test, from fresh seeds (about
five minutes). A failure prints the seed, the path and the replay path, the steps in words with where the focus was
after each, shrunk to the fewest that break the rule; `VITE_WALK_SEED`, `VITE_WALK_PATH` and `VITE_WALK_REPLAY` replay it.
What the walks found and left for a decision is `test/walks-known.ts`, each with its reason and its replay; a walk
meeting one goes on.

What they found on their first runs, each fixed with a test: Escape or Enter in the title dropped the focus on the
body (it goes back where it was, or to the column); Escape in a sheet's column name kept what was typed, and dropped
the focus (it puts the name back, and either key goes to the column's first cell); the way home followed from the keys
left the focus on nothing (the home page's column has it); the palette opened by the tap that closed a menu gave the
focus back to nothing (to the menu's button); the site's page, ready late, took the focus from a menu opened meanwhile;
a template chosen in the drawer asked to leave over the open drawer, two modals; printing left the focus on nothing;
a dialog closed over a frame whose page had the focus, or over a menu it had closed, gave it to nothing (kit/dialog.ts
`focusBack`, the palette's too); Find closed with nothing found gave it to nothing; and on a phone the bar's button
focused while the bar was away scrolled the whole chrome up by the header's height (the chrome now holds still).
