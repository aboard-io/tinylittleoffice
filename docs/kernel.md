# The document kernel, the one editor, and the shell

The document kernel (`src/doc/`), the one editor (`<to-text>`, `src/kit/text/text.ts`) and the shell around them, as they
are. The code is the last word: each file of `src/doc/` and `src/kit/` begins by saying what it does. The apps are
named here by their ids (write, sheet, deck, …); docs/tlo.md is each one's document as a person or a model writes it.

---

## 1. The kernel model (`src/doc/`)

### Files

| file | holds |
|---|---|
| `src/doc/model.ts` | the types below; `plainText`, `hasClass`, `attr`, `pages`, `sections`, `isInnerDoc` |
| `src/doc/tlo.ts` | `parse`, `write`, `writeBlock`, `takeHead`, `withHead`; the inline codec `parseInline`, `writeInline`, `escapeInline`, `balanceNote`, `sayableRuns`; `refFence`, `fenceRef`; `column`, `columnText`, `columnsOf` |
| `src/doc/ops.ts` | `Op`, `apply`, `invert`, and the composed edits (`splitBlock`, `joinBlocks`, `family`, `shiftFamily`, `moveFamily`, `placeFamily`, `removeItem`) |
| `src/doc/notes.ts` | `foldNotes`, `notesOf`, `noteRuns`, `noteNumbers`, `markNotes`, `referenceNotes`, `listNumbers`, `linkify`, `runLinks`, `linkTarget`, `linkable` |
| `src/doc/table.ts` | `Table`, `tableAt`, `withTable`, A1 addressing, locks, formula reference remaps, `copyCells`/`pasteCells`/`fillCells`/`seriesOf`/`sortRows`/`clearCells` |
| `src/doc/formula.ts` | the evaluator: `evaluate(doc, at)`, `evaluateTable`, `FUNCTIONS`, `parseLiteral`, `formatCell`, `formatValue` |
| `src/doc/text.ts` | the text layer (§10): `textOf`, `textMarkdown`, `textCounts`, `textWords` |
| `src/doc/json.ts` | the document as JSON (docs/tlo.md): `docJson`, `jsonDoc`, checked against the schema |
| `src/doc/sync.ts` | shared editing (§12): `transform`, `rebase`, `applyEdits`, `Conflict`, and the envelope `Edit`, `Ordered` |
| `src/doc/index.ts` | the kernel's public surface: an app imports from here and nowhere deeper |

### Types

```ts
// src/doc/model.ts
export type Head = Record<string, string>;            // the header: lowercase keys, string values (the shell's own: title, by, created; app in a .tlo file)

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
  | { k: 'quote'; runs: Run[]; a?: Attrs }                               // a note: speaker's note, a page's aside
  | { k: 'hr'; a?: Attrs }                                               // a break: the next slide, page or card
  | { k: 'table'; cols: Column[]; rows: string[][]; a?: Attrs }          // cells are raw strings: formulas, numbers, words
  | { k: 'fence'; lang: string; body: string; a?: Attrs }                // lang names an app: another document; else text kept as written
  | { k: 'edge'; from: string; to: string; dir: Dir; label?: string; a?: Attrs };

export type TextBlock = Extract<Block, { runs: Run[] }>;                 // h, p, li, quote

export interface Run {
  t: string;                 // the words; '' for an atomic run (ic, fn); may hold '\n' for a line inside a paragraph or item
  b?: true; i?: true; u?: true; s?: true; h?: true;
  href?: string;             // where these words link
  ic?: string;               // an icon in the line, by name
  fn?: string;               // a footnote: the note's words as inline Markdown
}

export type ColType = 'text' | 'number' | 'money' | 'percent' | 'date' | 'time' | 'check' | 'url' | 'rich' | 'long' | 'icon' | 'name' | 'option';
export interface Column { name: string; type: ColType; currency?: string }   // a money column's symbol or ISO 4217 code

export const plainText = (runs: Run[]) => runs.map((r) => r.t).join('');
// src/doc/tlo.ts
export const text = (s: string): Run[] => parseInline(s);                 // the one way a string becomes runs
```

**The envelope** (`src/kit/core/envelope.ts`). Three head keys belong to the document rather than its app: `title` (the
editor's), and `by` and `created`, which the shell holds and puts into every change the editor makes, so an edit never
drops them. `created` is stamped at the first change, to the minute, as `2026-10-05T14:32Z`; `by` is who made it, in
the maker's own word. A document under a password is not a head field: its whole payload is sealed (`E…`,
`src/kit/share/crypt.ts`), so nothing of it, the title included, is readable without the password.

Eight block kinds. An embedded document is a `fence` whose `lang` is an app id (`refFence`/`fenceRef`), and `isInnerDoc(b)` in model.ts names that rule once. There is no picture kind and nothing from the web (Paul, 2026-10-11): a web address alone is a `p` of words, a link alone on a line is a `p` with a link, and `![alt](address)` reads as the words `!` and a link whose words are the alt. A lock and a chart are not fields of the table block: they ride on the head for a sheet document and on the table's attrs anywhere else (see `tableAt` in §5), as the format writes them, so every sheet example is byte-identical.

Why runs in the model rather than text with runs derived: every view would otherwise parse inline on each draw; the editor's selection must be a run position; and footnotes/icons are run-level things the kernel must know. Why cells stay strings: the one inline construct that a canonical writer would alter (`*` and `_` in `=passers_by*buy_rate/100`) lives in cells, and the formula engine needs the raw formula. A `rich` column is parsed by its view.

---

## 2. Serialization: TLO, one parser

### The reader and the writer

1. **Runs at parse time.** Where `parse` makes a text block (a paragraph, a heading, a list item), its words become `runs`: each line through `parseInline`, joined by `{ t: '\n' }` runs. Inline marks therefore do not cross a line. `writeBlock` writes the runs back a line at a time.
2. **The writer is byte-stable on canonical text.** `writeInline` writes a candidate with *minimal* escaping (only `\`, `^[`, `:name:`, `[x](y)`, `<u>`, a backtick, and a mark at a position where `parseInline` would open or close one), parses it back, and if the runs differ falls back to full escaping. So `writeInline(parseInline(s)) === s` for every canonical `s` (`5 * 3 * 2` on the calculator's tape and `snake_case` in an outline item stay as written). The corpus test asserts `write(parse(x)) === x` over every template and example.
3. **Columns at parse time.** A table's heading row becomes `cols: Column[]` via `column(h)`; `writeBlock` writes `columnText(c.name, c.type)`. Canonical headings (`Price:money`, `Time: 10am`) are byte-stable; `Price: money` is read leniently and written canonically.
4. **Reference footnotes fold in `parse`.** `foldNotes` runs in the kernel for every app (`[^id]: note` paragraphs become inline notes). Canonical documents hold the inline form only.
5. **Spaces at a mark's edge are outside the mark (2026-10-17).** A mark never holds a space at its ends and a line
   break carries none: bold "a " before "b" is written `**a** b` and read back as bold "a" and a plain " b". A host
   whose server keeps the text while its editors keep the model found the two disagreeing on which spaces were bold,
   so an op made against an editor's runs need not apply alike to the server's parse. There were two ways to make
   them agree. The format could keep the edge space inside the mark, but no writing of it is Markdown: CommonMark
   closes no mark after a space, and our reader takes neither `**a **` nor `**a\ **` as bold (any other reader of a
   link's text, a language model among them, would meet stars). So the editor lets the space go, as the writer already did.
   `sayableRuns(runs, quote)` is what reading a block's writing gives back: no mark on a space at a run's ends, a
   line break unmarked, a link's spaces at a line's ends outside it (a quote keeps a line's start), an icon unmarked,
   a note's words balanced, and out of code what a backtick span cannot hold. The editor keeps every block it edits
   so (`settle`, §4), and a heading as the one line the format gives it, so `parse(write(model))` is the model it
   holds, an item's depth by indent aside. A space
   between two marked words may hold the mark (`**a b**`); a link keeps a space inside a line. What a person sees of a
   bold or an italic space is the same either way; an underline, a highlight or code now stops at the word, and the
   marks typed with the space stay in force (§4), so typing a bold sentence writes it whole.

### Grammar the kernel must preserve (every example in docs/tlo.md and the skill parses and writes byte-for-byte)

- Header: `---` first line, `key: value` lines (keys lowercased; a value in double quotes unquoted), closed by `---` or `...`; written only when non-empty, empty values dropped, newlines in a value become spaces.
- Attributes: `{#id .cls key=value key="a b"}` at the end of a block; on a table, alone on the line after it; on a fence, after the language; classes before values on write (`{.star due=…}`); `\{` keeps literal braces.
- Headings `#{1,6}`, optional closing `#`s; `# Words {.title}` is Write's title.
- Lists: `-`, `*`, `+`, `1.`, `1)`; nesting by any indent width (two spaces canonical); `[ ]`/`[x]` tasks; an indented non-blank line continues the item; ordered items count on at their depth across deeper ones; a bulleted item resets the count.
- Rules: three or more `-`, `*` or `_` with optional spaces → `---`; a rule ends the list nesting.
- Tables: header row, separator of `---`/`:---:` cells, optional outer pipes; `\|` and `\\` escapes; `<br>` is a newline in a cell; rows padded to the header's width; written edged (`| a |`) when one column, when the first heading would read as another block (`# of units`), or when a row's first cell is empty.
- Fences: ```` ``` ```` or `~~~`, three or more, the closer at least as long; written with one more backtick than the longest run inside the body; `lang` lowercased.
- Edges: `~ A -> B: label` with `->`, `<-`, `<->`, `--`; consecutive edges written on consecutive lines.
- Pictures: none. `![alt](url)` reads as the words `!` and a link whose words are the alt (§1).
- Quotes: `> ` lines merge into one block, written a line each.
- Paragraphs: consecutive lines merge; a blank line separates; a line that would read as another block is written with a leading `\` (`guard`); a lone `|` is written as is (the deck's column break); Write's empty paragraph is `<br>`.
- Inline: `**`, `__` (b), `*`, `_` (i; `_` not inside a word), `++` and `<u>` (u), `~~` (s), `==` (h); a single-backtick span is one run with `c` (code), its words verbatim (no mark read inside it, no escape but its closing backtick; a backtick nothing closes stays a backtick), and composes with the other marks and a link (`` **`x`** `` is bold code); no space just inside a mark; `[words](https?:|mailto:|tel:|#…)` links with spaces and parentheses percent-encoded on write; `:icon-name:`; `^[note]` with balanced brackets and `\]`; `\` before `` \`*_{}[]()#+-.!|~=:<>^ `` and before a space; a web or mail address read whole, marks inside it untouched, trailing `.,;:!?)` left out; marks close before trailing spaces.
- Spaces and breaks (2026-10-10): every space a person typed is in the link, because "we cannot ever lose spaces if they're there" (Paul). A space at a line's end is written `\ ` on the last trailing one, and at a line's start on the first leading one (not in a quote, whose starts are kept as they are), wherever a plain space would be trimmed: a paragraph's, a heading's and an item's lines, a quote's ends, a table cell's ends. A line of a block with nothing on it is a line of one `\` (Shift+Enter at a paragraph's end, two in a row; a quote's empty line between two stays `>`). The reader trims a line's ends up to an escaped space, never past it, and keeps every `\` line, the last too; before attributes, the one space before `{` is theirs (`a\  {.x}` is "a " with attributes, `\ {.x}` an empty line with them). Lenient: `\ ` written by hand is a space anywhere, as `\*` is a star. A mark or a link on spaces alone at a line's end may still be let go; the spaces stay. The writer's candidate-then-check (point 2 above) reads each line back with its ends trimmed.

---

## 3. Views and operations

### The operation set (`src/doc/ops.ts`)

```ts
export type Op =
  | { op: 'head'; key: string; value?: string }                              // set or (undefined) remove a header key
  | { op: 'splice'; at: number; n: number; blocks: Block[] }                 // insert (n = 0), remove (blocks = []), replace
  | { op: 'move'; at: number; n: number; to: number }                        // a span of blocks moved before index `to` (in the doc without the span)
  | { op: 'text'; at: number; from: number; to: number; runs: Run[] }        // in text block `at`: replace characters [from, to) with runs (atomic runs count 1)
  | { op: 'cells'; at: number; r: number; c: number; values: string[][]; force?: true } // a rectangle of a table's cells written, top-left (r, c); force writes locked cells too
  | { op: 'rows'; at: number; r: number; n: number; rows?: string[][] }      // rows put in before r (rows given) or taken out
  | { op: 'cols'; at: number; c: number; n: number; cols?: Column[] }        // columns put in before c (cols given) or taken out
  | { op: 'col'; at: number; c: number; col: Column };                       // a column renamed or retyped

export function apply(doc: Doc, op: Op): Doc;          // pure; structural sharing: untouched blocks are the same objects
export function invert(doc: Doc, op: Op): Op[];        // the ops that undo `op` applied to `doc`
export const applyAll = (doc: Doc, ops: Op[]) => ops.reduce(apply, doc);
```

`rows`/`cols`/`cells` are table-aware: `apply` remaps `=` formulas (`shiftFormula`/`remapRefs`) and the table's lock (`remapLock`) when rows or columns move, and `cells` leaves locked cells as they were unless the op carries `force: true`. These are the only places the kernel knows about A1 references; they live in `table.ts`.

Composed edits, each returning `Op[]` (so undo and tests see primitives only):

```ts
splitBlock(doc, at, offset): Op[]                 // Enter: block `at` becomes two; a li keeps depth/ord; a heading's second half is a p
joinBlocks(doc, at): Op[]                         // Backspace at the start of `at`: joined to the text block before it (a heading takes its first line: `joined`)
family(doc, i): number                            // the end of item i's family (li blocks deeper than it)
shiftFamily(doc, i, by: 1 | -1): Op[] | null      // Tab, Shift+Tab: the family a level in or out
moveFamily(doc, i, by: 1 | -1): Op[] | null       // past its neighbor: one `move`
placeFamily(doc, i, to, how: 'under' | 'after'): Op[] | null   // a drop
removeItem(doc, i): Op[]                          // the family comes out a level
replaceSpan(doc, from, to, blocks): Op[]          // one splice
```

### `focusFirst()` and the link

`focusFirst()` is the editor's half of the open: the shell calls it once a document is first drawn for editing (a new one, a template, a link, after an unlock; not in display mode, an embed, a show link presenting, a locked document, or while a dialog is open), and each editor puts the focus in its own place with its own helper (`focusCell`, `focusBox`, `focusRow`, `focusTask`, `focusCanvas`…), `preventScroll` always: the Word Processor's first words (the caret at their start), the Spreadsheet's A1 (its words selected), the first slide's headline, the Outliner's first row, the Calculator's entry line, the Drawing Tool's canvas, the Animator's stage, the Diagram Maker's picture, the Calendar's today (else the month's first; a Gantt chart's first task), the Trip Planner's first stop's name (else the map). The shell never puts the focus on the title box or leaves it on the body.

A keystroke costs only what it changed (Paul, 2026-10-10: "it's starting to feel really slow"): `docchange` still fires with the text on every edit, but the shell projects it into the link (pack, `replaceState`, the library's keep, the tab's title) only when typing stops for fifteen seconds (a pause in typing, not a gap between keys: the address is what the browser's history and sync record), and flushes that projection at once before anything reads the link as the document (the window's blur, the focus leaving the editor, the page hidden or left, Share and every copy of the link, exports, the password, the title box; `currentHash()` in kit/core/route.ts outside the shell). A host never parses its own echo: `ours(value)` says the shell handed back the text it last wrote. A host draws again for a `text-select` only when `selectionMoved(key)` says its bar would show something else.

### Each app: the view, and its commands as ops

What stays in the editor as state (not in the document) is listed last for each.

**Write** — view is the Doc itself. Commands: marks → `text` ops over the selection (per block in a multi-block selection); heading/title/paragraph → `splice` replace of the block with a new `k`/`level`/`cls`; list on/off and indent/outdent → replace with `k: 'li'` and `depth ± 1` (≤ 3); align → replace attrs; Enter → `splitBlock`; Backspace at start → `joinBlocks`, or at a li's start the unlist rule (depth−1, else to `p`); insert icon/date → `text` op inserting `{ ic }` or words (an emoji from the picker is words); footnote → `text` op inserting `{ t: '', fn }`, its words typed in the endnotes (`<to-notes>`: a `line`-shaped `<to-text>` over `noteRuns(fn)` each) and written back as `text` ops replacing that one run; insert a document → `splice` a `fence` (and an empty `p` after); edit it → replace the fence; remove it → `splice`; paper → `head`. Word count, caret, link bubble: state.

**Outline** — `readOutline(doc): { items, links, depths, loose }` (li → `{ at, depth, runs, dir, label }`, fence with `depth=` → `{ doc }`, edges → links with `live`). Loose words (headings, paragraphs) read as a tree too, and `listify(doc)` is the one splice that makes them an outline, applied as the document arrives (undoable). Commands: a row's `<to-text shape=line>` emits `text` ops, offset to the item's block, plus `splice` replaces of the edges that named the item (`renameIn`); the line's kind and name → `splice` of the li with its attrs (`setLine`); Enter → `splitBlock` on a leaf, else a `splice` of an empty li (first child of an open parent, or after the family); Backspace on an empty item → `removeItem`; Tab/Shift+Tab → `shiftFamily`; Alt+arrows → `moveFamily`; a drop → `placeFamily` (a fence with no `depth=` is given one first); a document → `splice` of a fence with `depth=` after the family; connect/unlink/setLink → `splice` of edge blocks. A Tiny Little Office link typed or pasted as an item becomes that document (a fence). `outlineToDeck`/`outlineToMind`/`outlineToOrg`/`outlineToNet` are hand-offs (to Deck and Diagram, with `kind:` in the head), `toOpml` an export. State: `folded`, `zoom`, `sel`, `menuFor`, `connecting`, `drag`; footnotes number across items (`noteStart`).

**Deck** (and its pages of another geometry: zine, booklet, brochure, comic, poster, badges) — `slidesOf(doc)` over `pages(doc.blocks)`; a slide also records its block span `[from, to)`. Commands: `patch(slide)` → `replaceSpan(from, to, slideBlocks(slide))`; `addPage` → `splice` `[hr, …blocks]`; `removePage` → `splice` of the span and its `hr`; `movePage` → `move`; sub-document → the span's fence replaced; theme/transition/color/qr/sides/pages → `head`. With `<to-text>` the slide's words are edited as blocks directly: headline = the `h` block (`line` shape), bullets = the li/p blocks of the span (`lines` shape), notes = the `quote` block (`lines`); `Slide` is a layout type for drawing (view.ts) only. `loosen` stays in `read()`. State: `cur`, `showing`, `shown`, `leaving`, `noting`, `field`.

**Sheet** — `sheet(doc): Sheet` is `tableAt(doc, firstTable)` padded to the drawn rows (`ROWS`, `MIN_COLS` are the view's), a column nobody has typed holding words in the first, numbers in the second and words after that (`defaultType`; Paul, 2026-10-12), a column put in by hand words; `evaluate(doc, at)` for values. Commands: type in a cell → `cells` 1×1; paste/fill/clear/sort → `cells` rectangles (sort writes the used rows); insert/delete rows → `rows`; add/remove column → `cols`; type or name of a column → `col`; chart → `head` (or table attr via `withTable`); lock → `head` (`withLock` result). State: `sel`, `end`, `focused`, `rowsShown`, `fillTo`, `widths`, `rowMenu`, `clip`, `picked`, `caret`, computed values.

**Trip** — `stops(doc)` from the table (`tableStops`); add/move/edit/remove stop → `rows`/`cells`/`move` of table rows (a `rows` op with `n` and `rows`); units/linked → `head`. **Draw** — `readDrawing(doc)`; a shape changed → `cells` on its row; added or taken away → `rows` (the joins renumbered by `cells`); a column wanted and missing → `cols`; alt, `grid:` and `tile:` → `head`; the pixel grid's one `p` → `splice`; the table's birth and death → `splice`. **Motion** — `readAnim(doc)`; an edit replaces the keys table (`splice`). **Calendar** — `spans(doc)` from li; edit → replace li; zone/legend → `head`. **Calc** — `readCalc(doc): { mode, lines, at, loose }`: the tape is one `p`, a line each; `mode: graph` in the head. A loose text (a list, results after the sums, `y = …` lines, a heading) is made a tape as it arrives by `tidy`, one undoable edit. Commands: a line put in → `text` at the tape's end (the first line a `splice` of the `p`); a line changed or taken away → a `text` op over that line; clear → `splice`; mode → `head` plus the clearing `splice`. State: `entry`, `recall`, the caret between key taps.

**Diagram** — one app for org, mind, family, lanes, timeline, venn, seating and net, the kind a `head` field. `linesOf(doc)` reads each `li` as a line (its key before the first ": ", its words, the comma-separated things after the key, at the line editor's offsets) and `edgesOf(doc)` the edges; each kind's layout draws them through Draw's renderer, every shape carrying the `hit` it was drawn from. Commands: a tap on a thing lays a `<to-text shape=line>` exactly over its words (Draw's `wordsOver`), holding the part of the `li` the thing draws, and each change to it is one `text` op replacing that part (its line breaks written as " | "; plus `follow`: the edges naming a renamed person, the overlaps naming a renamed set); a new thing is one `splice` at once (or, one thing more in a list, a `splice` replacing its line), its words offered and chosen; remove → `removeItem` (trees, with their dotted lines), a `text` op (one thing of a list), `splice`s (a line, a lane, a thing and its connections); a drag → `placeFamily` (trees), `move` (+ a `text` op on the key, lanes), `text` ops out of one list and into another (seating, venn); join → `splice` of an edge; a lane, an edge-only node or an edge's words → `text`/`splice` wherever the name is (`rename`); kind → `head`. State: `target`, `joining`, `zoom`, `drag`.

---

## 4. The editor: `<to-text>`

`src/kit/text/text.ts`, one element. It edits a span of text blocks, model-driven; it never reads the DOM back except at `compositionend`.

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
  exec(cmd: Command): void;      // 'b'|'i'|'u'|'s'|'h'|'link'|'unlink'|'fn'|'icon'|'date'|'title'|'h1'|'h2'|'p'|'quote'|'ul'|'ol'|'indent'|'outdent'|'left'|'center'|'right'|'justify'
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
| `deleteContentBackward` / `Forward` | one character or one atomic run; at a block's start: an empty `li` with children goes and they come out a level, any other `li` unlists (depth−1, then `p`), else a join (the block before keeps its kind; when either is empty the empty one is spliced out, so words keep their heading; a heading takes only the first line and the block keeps the rest); at the span's start (not doc): `text-exit`; beside an embed block: `splice` it out |
| `deleteWordBackward/Forward`, `deleteSoftLineBackward/Forward`, `deleteHardLineBackward/Forward`, `deleteContent`, `deleteByCut`, `deleteByDrag` | `text` delete over the target range (cut also writes the clipboard, see below) |
| `insertFromPaste`, `insertFromDrop` | the paste pipeline |
| `formatBold/Italic/Underline/StrikeThrough` (Safari's Mod+B…) | `exec('b'…)` |
| `insertCompositionText`, `deleteCompositionText`, `insertFromComposition` | not prevented; see IME |
| `historyUndo`, `historyRedo` | prevented; nothing — Mod+Z reaches the shell |
| `insertOrderedList`, `insertUnorderedList`, `formatIndent`, `formatOutdent`, `formatJustify*` | `exec` of the matching command |
| `insertHorizontalRule`, `insertLink`, `formatSetBlockTextDirection`, `formatFontColor`… | prevented, ignored |

### The words as the format keeps them

Every edit's ops go through `settle` (textops.ts) before `text-ops` is fired: each block of words they leave is
`sayableRuns` of itself (§2, point 5), so the editor holds what its text reads back as, and a server that keeps the
text and applies the same ops holds the same words. A `text` op that would leave a mark on a space at its edge reaches
over the marks let go of (its words and their places stay, so the selection after it does, and its inverse is exact);
one that then changes nothing (Bold over spaces alone) goes; a splice's blocks go in so. A space typed at the end of a
bold word is therefore plain, the caret after it, and the bold stays in force there (`Held`, which the bar shows
pressed): a bold word typed next takes the space back into the bold in the same op (`typeRuns`: `**a b**`), and so does
a word an IME composes there; with Bold turned off first it is `**a** b`. Backspace over the space returns into the
bold, and so does the caret after a word taken out behind a bold space. The caret moved away lets the held marks go,
and a link's space let go at a line's end is not held (a space ends a link, docs/editing.md). A selection's marks are
those of its words, not the spaces at its edges, so "word " made bold shows Bold pressed and Bold again unbolds it. A
paste's words are settled where they land, with the words around them (`pasteFrom(…, false)`), so an underlined
"a " pasted before an underlined word is one underline; a host that puts pasted blocks in whole gets them as the
format keeps them (`fitBlocks`, `htmlToBlocks`). A heading is one line, as setKind makes one (docs/editing.md §2): a
block of lines joined to it by Backspace or Delete gives it its first line and keeps the rest as the block it was, in
the join's one splice (ops.ts `joined`), and lines pasted or typed into it leave it its first line and a paragraph
after it, the caret with them, in the op that put them there (`oneLine`: a `text` op puts in the heading's line and a
splice the paragraph; a splice puts in the two blocks). So each op told leaves a document its text says, and a server
that applies each op to what its text reads back holds what the editor holds (found 2026-10-17: the heading held the
lines and two ops more split them off, and such a server, reading the text between ops, wrote the lines twice).
Ops someone else made are applied
as they arrive (`applyRemote`), and a transformed op can leave a mark on a space whose neighbor another took away
(here "c" taken out of a bold "a b c", there "b": a bold space after "a", a plain one after that), so the blocks such
ops make, and an undo's or a redo's, are settled as they land (kit/core/element.ts `sayableAfter`), as the text, the
server's document (§12, rule 4), says them.

### Rendering and reconciliation

Lit `repeat` keyed by block object identity (a `WeakMap<Block, number>` hands out keys). A block renders as one element: `h1.title`/`h1`/`h2`/`p`/`li` (lists are `li`s side by side, their depth in `style="--d"`; the editor draws its own bullets and numbers via `listNumbers`), `blockquote`, a card (fence, table, rule, edge). Inside, runs render to `<b>/<i>/<u>/<s>/<mark>/<a>` nesting as `markedHtml`, atomic runs to `<span class=ic data-icon contenteditable=false role=img>` (the icon's SVG inside; a name outside the starter set after the one lazy load, a name nothing has as its name in small type), `<sup class=fn data-fn tabindex=0 contenteditable=false>`, `'\n'` to `<br>`. Only blocks whose identity changed re-render (the ops say which: a `text` op touches one block), and a changed block is re-rendered whole — no run-level diffing. After render, the model `sel` is written to the DOM selection (`Pos → Range`: walk the block's text nodes, counting atomic elements as 1). `selectionchange` maps back (`Range → Pos`) and fires `text-select`, from which the host's toolbar sets its pressed states.

### IME and composition

`compositionstart` sets `composing`; `beforeinput` of composition types is let through and no rendering happens (the `blocks` property may change underneath — the host must not re-render that block: the editor holds its own copy of the composing block). `compositionend`: read that one block's DOM back (`domToRuns`, ~60 lines: text nodes and the three atomic elements, nothing else), compute the single `text` op from the model block to the read runs (common prefix/suffix), emit, re-render only if `render(runs)` differs from the live DOM (it will not). Android Chrome fires `deleteContentBackward` with `isComposing` — treated as composing. Safari's `insertReplacementText` arrives outside composition with a target range — handled as a plain replace.

### Paste, copy, cut

Copy/cut write `text/plain` = the words of the selected blocks as a person reads them (`plainOf`: no marks, an item with its marker and box, a table's cells by tabs, a fence's body; words from within one block exactly, spaces at their ends and all) and `text/html` = `docToHtml` of the same with a `<meta name="generator" content="TinyLittleOffice">` marker and a `<meta name="tlo">` carrying the exact TLO (`write` of the sliced blocks, runs cut at offsets). So a paste into a text field, a chat or a search box gets the words alone (Paul, 2026-10-13: a code-marked address came over with its backticks, a linked item as `- [\`words\`](address)`), a rich editor gets the marks, and our own paste gets the document back byte for byte: `clipText(data)` is the carried TLO, or the text when the HTML is not ours. Paste, in order: (1) our own HTML (marker present) → parse the carried TLO → blocks; (2) a Tiny Little Office link alone → `splice` a fence (`linkToRef`); (3) a web address alone, doc shape → a `p` of that address (card); (4) `text/html` → `htmlToBlocks(body)` (`src/kit/text/clipboard.ts`: tags and styles to marks, `<ul>/<ol>/<li>` to li depth, Google Docs' `<b style="font-weight:normal">`, white-space collapse) → fitted to the shape; (5) plain text with a newline, doc shape → `parse` as TLO (lenient: pasted Markdown becomes headings, lists, tables); (6) plain text → `text` op. Fitting: `lines` keeps li/p only; `line` joins runs with spaces.

### Undo/redo

Undo is an op log (kit/text/history.ts; decision 2, §6): every change is a list of ops, recorded with the document it was made on, its inverse worked out by `invertAll` and kept beside it, with the selection before and after, so an undo puts the caret back where the change was. Letters typed within 700 ms fold into one entry, and a composition lands as one op. The title and the head's other fields are `head` ops like any other.

### Atomic runs and blocks

Footnote marks, icons and cards are `contenteditable=false`; a mark is `tabindex=0` and, on click, Enter or Space, says `text-note` ({block, nth}) for the host to open its note; Backspace/Delete beside or on one removes it (one `text` or `splice` op). A note's words are typed where the host draws them, at the foot (Write's endnotes, a slide's foot, under an outline): `<to-notes>` (kit/draw/notes.ts) draws each note as a `line`-shaped `<to-text>` over `noteRuns(fn)` and tells the host `note-change` (one `text` op replacing that mark's run), `note-back` and `note-remove`; only a host with `notes` is offered the Footnote command.

### Phones (iOS Safari)

The editable's font-size is never below 16px (prevents the focus zoom); `focus({ preventScroll: true })` everywhere, and the page is the visible window with the document in a column that scrolls by itself (§7), so focusing never scrolls the page and the caret is kept inside the column through kit/ui/scroll.ts; the formatting bar and popovers are placed inside the column's box (`room()`, kit/ui/scroll.ts), which is the visual viewport's, so they sit above the keyboard; `autocapitalize="sentences"`, `enterkeyhint="enter"` (`"done"` for `line`); no `execCommand` anywhere; `-webkit-user-modify` not used; selection restore is deferred to `requestAnimationFrame` after render (Safari drops a selection set synchronously during a DOM swap); a `pointerdown` on a toolbar button `preventDefault()`s so the keyboard stays up.


### Rows chosen whole: `src/kit/text/rows.ts`

Every app with rows (Outline's items, Trip's stops, the schedule's tasks, the deck's slides on its rail, the Calculator's lines) chooses rows whole through one Lit `ReactiveController`, so the keys, the handle, the drag, the clipboard and the bar under a range are the same everywhere (docs/editing.md §3, §6). The host knows its rows and its document; the controller knows nothing of either.

```ts
const rows = new Rows<Id>(host, {
  rows(): { id: Id; el: HTMLElement; span: { from: number; to: number } }[],  // on screen, in order; span = the row's blocks with its family
  box(): HTMLElement | null,              // takes the focus while rows are chosen (tabindex=-1)
  handle: '.my-handle',                   // also given class to-rows-handle: touch-action none, 44px under a coarse pointer
  nests?: boolean, fromWords?: boolean,   // Indent/Outdent and drops "under"; Shift+Up/Down and Escape in words choose the row
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

## 5. The formula engine over a table block

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
// and over a table's cells:
refToRC, rcToRef, rangeOf, rangeRef, lockedRanges, isLocked, withLock, remapLock, shiftFormula, movedIn, movedOut,
usedSize, copyCells, pasteCells, clearCells, fillCells, seriesOf, sortRows, nameKey, namedCells, ROWS (= 1000, the most a reference may name), MAX_COLS (26)

// src/doc/formula.ts
export type CellValue = number | string | null;
export interface Evaluated { values: CellValue[][]; named: Map<string, [number, number]> }   // values for every used row, `cols.length` wide
export function evaluateTable(t: Table, today = todaySerial()): Evaluated;   // tokenize, parse, evaluate
export function evaluate(doc: Doc, at = firstTable(doc)): Evaluated | null; // evaluateTable(tableAt(doc, at))
export { FUNCTIONS, COLUMN_TYPES, parseLiteral, formatValue, formatCell, dateToSerial, serialToIso, todaySerial }
```

The sheet editor's view is `tableAt(doc, firstTable(doc))` plus its padding (`drawn` rows, `MIN_COLS` columns); `evaluateTable` returns `null` for a cell past the used rows. The Spreadsheet's exports (CSV, .xlsx with `toExcelFormula`) take `Table` + `Evaluated`.

Because `evaluate` takes any `Doc` and block index, a table block inside a Write document or on a slide is evaluated in place, and Write draws it with the sheet's own page.

**Words that look like something else** (2026-10-17). A cell is a formula when it starts with `=`, and a cell that reads as a number, a date or a percentage in its column is one; a cell meant as words whatever it starts with is written with an apostrophe before them, as Excel and Sheets write one: `'=SUM(1)` is the words =SUM(1), `'007` the words 007, `'2027-03-01` in a date column the words, never the day. `parseLiteral` reads it, and `evaluateTable` with it: the apostrophe is not among the words, and it is read only where what follows would read as something else (a formula, a number, a date, another such apostrophe), so `'Tis` is 'Tis, as written before the rule. A rich column's cell is inline Markdown, which has its own escape: a `=` at its start is written `\=`, and its words read back through `parseInline`; a rich cell that is no formula is words whatever they say, never a number or a date (`007` in a rich column is 007, as it is drawn), so the `=` alone needs the escape. `asWords(words, type)` writes a cell so (as the words are where they read as themselves), and it is the one way a program writes words into a cell (tinylittleoffice/doc, and the kit); the text layer, the workbook and the sheet show the words, and the sheet's cell, edited, shows the apostrophe, as a spreadsheet's formula bar does. The format itself needs nothing: a cell's apostrophe and backslash are kept as written (`\` written `\\`). The property in test/doc/properties.test.ts holds any words in any column to it: never a formula, kept by the format, read back as the words.

---

## 6. The decisions (2026-10-09)

- The byte-stability gate is the corpus (test/doc/corpus.test.ts): every template, every example in docs/tlo.md and the skill (skill/tinyoffice/, its references), and the apps' examples at the tag `v0-before-rebuild`: `write(parse(x)) === x`.
- The editor's tests run in **Vitest browser mode**; `Pos↔offset`, ops and paste fitting are node tests.
- There is no `execCommand` and no contenteditable outside `<to-text>`, ever.
- Invoice is a **Write template**: a table block with an `Amount:money` column of formulas, evaluated in place by `evaluate(doc, at)`, drawn as paper by Write's print view; its fields (`from`, `to`, `number`, `date`, `due`, `tax`, `currency`, `terms`) are head fields (decided with Paul, 2026-10-09).
- Money (a mortgage, savings, cash flow, interest) is Sheet templates, not modes of the calculator; the headline figure is an attribute on the table (`{big=Payment}`) the sheet view draws large above the table, so nothing is lost.

**Decision 1 — runs are the stored model.** Yes. Every app writes canonical inline Markdown for the blocks it touches; the parse-back check keeps canonical text byte-identical.

**Decision 2 — undo is an op log in the kernel**, not text snapshots. Every editor emits ops; `History` holds `{ ops, inverse, sel }` entries, coalescing typing bursts (700 ms) and composition; the title and head fields are `head` ops like any other. `invert` is therefore load-bearing and property-tested.

**Decision 3 — there are no page sections.** Paul, 2026-10-11, removed the app that drew them. It rendered arbitrary HTML, CSS and script from a link inside a page served from tinylittleoffice.com, a phishing kit with our domain on it, which no sandbox makes safe. A document never runs code; the Display Link shows every app's pages as pictures.

---

## 7. The shell, the chrome and the column (2026-10-10)

The shell is thin. `<to-shell>` (kit/core/shell.ts) keeps the route, the document, its projection to the link (`writeLink`, `flushLink`, the two-second pause), the library's keep (kit/share/library.ts `Keeper`), the title and the editor's mounting. Around it are elements that take their state as properties and speak back by events, each under 500 lines:

| element | file | what it is | says back |
|---|---|---|---|
| `<to-chrome>` | kit/ui/chrome.ts | where things sit: the header and its words, the menu button, the banners (a short link's time left, another version kept here), the column and the bar's place in it | `to-drawer-open`, `to-share-open`, `to-retitle`, `to-copy-new`, `to-arrival-close`, `to-other-close` |
| `<to-share>` | kit/ui/share-dialog.ts | the Share dialog: the link and where it fits, the short link, posting, the QR code, the embed code | `to-link-copied` |
| `<to-privacy>` | kit/ui/privacy-dialog.ts | unlock, the password, the lock beside the title (`trustButton`), the Share dialog's Password part (`renderProtect`), the Privacy dialog | `to-unlock`, `to-lock`, `to-share-open` |

and, as before, the editor, `<to-drawer>` (whose This document, with a document open, holds New, Share… and Download; docs/editing.md §1 gives its order), `<to-find>`, `<to-toast>` and the shortcuts dialog. The page's keys are kit/core/keys.ts `pageKey`.

**The page is the visible window; the column scrolls.** `html` and `body` are `height: 100%; overflow: hidden; overscroll-behavior: none` on the screen (print flows on). `<to-chrome>` is a column exactly the visual viewport's height, set from `visualViewport.height` as it resizes (the layout viewport's while a desktop pinch has zoomed in), and the window is put back at its top whenever it or the visual viewport scrolls (`pinWindow`; iOS slides the window, with no word from the visual viewport, for a caret it finds under the keyboard), the caret then brought into sight the column's way, so the layout viewport never slides. In it: the header, the banners, and `.to-column`, which holds the bar's place and `.to-main`, `overflow-y: auto; overscroll-behavior: contain`, the document. The column's height is `--to-col-h` on the chrome, for what fills it (the Drawing Tool's canvas, the Diagram Maker's picture, the Animator's stage, the Trip Planner's map, the Spreadsheet's box).

**The bar's place.** The app's bar stays the editor's first child, drawn by the app as ever; the stylesheet takes it out of the document's flow and sets it in `.to-column.barred` (absolutely, against the column, which `.to-main` does not clip): at the column's top on a wide screen, under the header as it always was, and at its bottom under a coarse pointer, so on a phone it sits above the keyboard as one scrolling row however the words are scrolled. Its height is the nav's (`--to-bar-h`), and the column keeps that much room for it.

**On a phone, editing.** Under a coarse pointer, while a box has the focus (a `<to-text>`, a field in an app), `<to-chrome>` has `editing` and the header steps aside; the menu button stays, and Share before it (every document's, Paul, 2026-10-13), floating on cards at the column's top inline end, and a short link's banner goes small. The header returns when the focus leaves the box (a tap outside, Escape, Done); a hop to the bar, a menu or a dialog and back is not leaving. The menu button is at the inline end on every screen (the right in a left-to-right language, the left in Arabic): the words begin at the inline start, so a button there would cover the first line and the caret, and on an iPhone the left edge is Safari's back swipe. The drawer slides in from the same side. Paul, 2026-10-10: "when editing, the top nav vanishes except for the hamburger. The secondary nav is now aligned bottom."

**Scrolling, in one place.** kit/ui/scroll.ts has `scrollerOf(el)` (the nearest box that scrolls, else the column), `reveal(el, opts)` (each box around it moved by what it takes, nothing behind a dialog or a popover, the window never) and `room()` (where a menu, the context bar, the link box or the completion list may sit: the column's box within the visual viewport). The caret kept in view (`revealCaret`, the one rule: after an edit or a focus moved, once the column settles from a keyboard's glide, and when the window has been put back), Find's match, a note, a completion, a card or a stop brought in, the Outliner's drag at the column's edge and a pinch keeping the words under the fingers all go through it. A node test (test/scroll.test.ts) fails on any other module that reads `window.scrollY` or scrolls the window.

**Why, and the price.** Safari on iOS does not make the page shorter for the keyboard, only the visible window; a bar stuck to the page's top had to be measured into place (`--to-vv-top`, `--to-stuck-h`, a frame-by-frame watch after every resize, focus and touch) after events that came late or never, and was found parked a third of the way down. A column the visible window's height puts the bar where it belongs with nothing measured but the window. **The price is Safari's toolbar: it no longer collapses as the words scroll**, since the page itself never scrolls, so a phone shows a little less of the document than a page that scrolled the window would.

---

## 8. The grammar, written once, and the properties fuzzed from it (2026-10-10)

TLO's grammar is written formally once, in `test/doc/tlo-grammar.ts` (`TLO_EBNF`, ISO 14977 EBNF read by a forty-line
reader, `readGrammar`): the head, the eight blocks, attributes, tables and their typed headings, fences, edges,
and the inline marks, links, icons, notes and escapes, lenient forms and all. It is dev only: nothing in it
ships, and the parser in `src/doc/tlo.ts` is not generated from it. The grammar documents the parser; where the two
disagree, a property below fails naming the text, and §2's "Grammar the kernel must preserve" decides which is wrong.

Two generators come from it, both with fast-check, both biased to the hard cases (marks at a block's edges,
attributes that look like words, `\{`, `~~` beside a link, empty cells, items nested deep, icons and emoji in names,
right-to-left words): `textOf(rule)` makes texts from the EBNF; `arbitraryDoc()` makes models of the kernel as far as
the format can say them, and `sayableLine`/`sayableDoc` list, one rule a line, what it cannot (a mark never begins or
ends with a space; an item is at most one deeper than the item before it). `arbitraryDoc(n, true)` breaks the first
rule as an editor would before the format has its say (marks and links on the spaces at a run's ends, on spaces alone,
on a line break), for the properties that the format and the editor let them go alike (§2, point 5).
`arbitraryOp(doc)` and `arbitraryEdits()` make operations that apply.

The properties, each a `fc.assert`-style check whose failure names the shrunk counterexample (200 cases each;
2,000 under `npm run fuzz`):

| property | where |
|---|---|
| any text the grammar makes is read, and its writing is canonical: `write(parse(write(parse(x)))) === write(parse(x))` | test/doc/properties.test.ts |
| a lenient text and its canonical writing read alike: `parse(write(parse(x)))` is `parse(x)` | " |
| `write(parse(x)) === x` for every canonical text, and `parse(write(d))` is `d` for every model the format can say | " |
| a model with marks at its words' edges reads back as `sayableRuns` has it, which reads back as itself | " |
| whatever the editor's edits do to such a document read in (typing with the marks held, marks and links over any range, deletes, Enter, kinds, a paste), each through `settle`, it holds what its text reads back as (an item's depth aside), and the inverse takes it back | test/textops.test.ts |
| every op applied then its inverse gives the document back (untouched blocks keep their identity); a random run of ops then `invertAll` too | " |
| `pages()` never throws, never gives no pages, and holds every block but the rules in order | " |
| formulas: `a + b = b + a`, `a * b = b * a`, `(a + b) + c = a + (b + c)` within 1e-9 of the sum's scale; `=X` is X's value; a cell that reaches a cycle is `#CIRC` and one clear of cycles its sum, never a loop | " |
| `decodeDoc(encodeDoc(x)) === x`, and the encoding chosen is never longer than the raw | " |
| a document pasted as HTML (`docToHtml` → `htmlToBlocks`) is one the writer keeps; pasting it again changes nothing; paragraphs and items come back as they were | test/browser/paste-properties.test.ts |
| words with marks at their edges pasted as HTML (another editor's `<b>a </b>b`) come as the format keeps them, and their writing reads back as them | " |

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
size on the corpus (test/doc/corpus and generated documents) and reports every template's link under the current and the
trained one. It changes only if every template is shorter or equal and the largest template's link is 5% shorter or
more; a second dictionary would be read under a new flag letter beside `y`, so links made with the first still open.

## 9. Random walks over the chrome (2026-10-10)

The bugs found by hand on a phone (the bar parked mid-screen, a dialog cut by the edge, the keyboard taking the focus)
were each an invariant broken after some sequence of actions. `test/browser/walks.test.ts` walks such sequences with
fast-check's model-based testing (`fc.commands`, `fc.asyncModelRun`): the model and its steps are `test/walks-model.ts`
(pure, read by a node test that every registry command is a step of some walk, so a command joins the walks by being
registered); each step is done to the real page (a registry command in force, through its `when`, with the focus where
a person's way to it leaves it; Escape, Tab, Shift+Tab, Enter, the arrows, Mod+A; a word typed; a tap outside what is
open, or in the document; the column scrolled; the drawer, a menu of the bar, Share, the templates, the drawer's search; a pinch;
a phone's keyboard up and down; another app and back), and after every step the rules are asserted:

| rule | what holds |
|---|---|
| focus | the focus is inside what is open, else in the document or the chrome; never under `aria-hidden` |
| back | after Escape or a dialog's backdrop, the focus is where it was when the thing opened (or on what was tapped to open it, or, for a command's dialog opened from a button, on the words it acts on) |
| modal | at most one modal `<dialog>` is open |
| window | `window.scrollY` is 0, and the chrome around the column never scrolls: the column does |
| link | the address, flushed, is the document the shell holds, written back as it is read |
| bar | the app's bar, where it is shown, is one row inside the visible window |
| overflow | no words run off the screen sideways; the page is no wider than the window |
| names | everything open has an accessible name |
| keystroke | a word typed in a box already warmed costs under perf.test.ts's 12 ms a letter |
| errors | nothing throws |

One test per app family (text: Write, Outline, Deck; grid: Sheet, Calendar, Calculator; canvas: Drawing, Diagram,
Animation; lists: Trip) at 390×844 with a coarse pointer and at 1440×900. The default suite walks 16
steps from fixed seeds (about twenty seconds); `npm run walks` walks 200 steps, twice a test, from fresh seeds (about
five minutes). A failure prints the seed, the path and the replay path, the steps in words with where the focus was
after each, shrunk to the fewest that break the rule; `VITE_WALK_SEED`, `VITE_WALK_PATH` and `VITE_WALK_REPLAY` replay it.
What the walks found and left for a decision is `test/walks-known.ts`, each with its reason and its replay; a walk
meeting one goes on.

What they found on their first runs, each fixed with a test: Escape or Enter in the title dropped the focus on the
body (it goes back where it was, or to the column); Escape in a sheet's column name kept what was typed, and dropped
the focus (it puts the name back, and either key goes to the column's first cell); the way home followed from the keys
left the focus on nothing (the home page's column has it); the palette opened by the tap that closed a menu gave the
focus back to nothing (to the menu's button);
a template chosen in the drawer asked to leave over the open drawer, two modals; printing left the focus on nothing;
a dialog closed over a frame whose page had the focus, or over a menu it had closed, gave it to nothing (kit/ui/dialog.ts
`focusBack`, the drawer's too); Find closed with nothing found gave it to nothing; and on a phone the bar's button
focused while the bar was away scrolled the whole chrome up by the header's height (the chrome now holds still).

## 10. The text layer (2026-10-11)

Paul: "Deal with the Display Link." A Display Link was pages of SVG text in `role=group` boxes, each with one
label: an outline read as its title, a deck's table as its slide's. Now every document has one text layer, what it
says in the order it says it, and the pages are a picture of it.

- **The nodes** (`src/doc/text.ts`). `textOf(doc)` gives a small tree from the blocks every text-shaped app shares:
  headings (h1 to h4; deeper is h4), paragraphs and quotes as runs with their marks and links (an icon left out, a
  footnote's mark its number carrying the note), lists nested by depth with a task's state, tables as the values a
  reader sees (formulas worked out, money and dates formatted, empty rows and nameless empty columns dropped), fences
  as written, a document held in this one
  (`inner`, given by the host: its app reads it), the footnotes at the end, and a break for each `hr`. The Word
  Processor, Outliner, Presentation Builder, Spreadsheet and Calculator (its lines) have no code of their own for it.
- **A spatial app's own** (`AppDef.text`, same nodes): Diagram (each thing a heading by its depth with its words, then
  Connections as "A → B: label"; the mind map, the org chart and the rest), Calendar (each day a heading in the reader's
  language, its events with their times in the calendar's zone and how they repeat), Trip Planner (the stops in order
  with their notes), Drawing Tool and Animator (the alt, else a description from the shapes, and each shape's label). The
  locked card says it is locked; a QR code, its address. `kit/text/text-layer.ts` `textLayer(def, doc)` picks.
- **Drawn** (`kit/text/text-view.ts`): plain HTML, tables with column heads, a task's state said before its words, a link
  through the link guard. The Display Link puts it
  first, visually hidden (shown should the keyboard reach a link in it), and the pages after it `aria-hidden`; its Text
  button shows the words in the pages' place, reflowed at the person's size in the theme's colors, the column no
  longer a picture (a pinch is the size of everything), and puts `&text` in the address (`route.ts` `withText`), so the
  link opens that way. The embed and a deck's show are unchanged.
- **Elsewhere.** The `.html` file carries it the same way before its pages; print is the pages. `textMarkdown(nodes)`
  writes it through the kernel's writer, footnotes in the reference form, stable when read and written again: the API's
  `text(link)` and `markdown(app, text)` and `tinyoffice read --text`; `measure` counts its `words` and `headings`.

---

## 11. The kit's six folders

`src/kit/` is what every app shares: the shell that holds an app, the editor, drawing, files, and sharing. It is six
folders, and nothing sits beside them. Every file begins by saying what it does; this section says where a file goes.

- [core/](../src/kit/core/): the contract between an app and the shell, and the link: the app definition and the registry, the shell, commands and keys, the strings, the store, the route, the codec, what an app asks of its page (host), an editor put on a page that is not the site (mount), the one voice (`toast()`, which the page's toast shows).
- [ui/](../src/kit/ui/): the elements round a document and the chrome: the bar, the menus and dialogs, the drawer, find, home, Insert, the toast, the size of everything and the theme.
- [text/](../src/kit/text/): the editor's model and its commands: `<to-text>`, its operations, the clipboard, history, rows and columns, the diff, who did what in a document several people write (tracked changes, and their drawing over the words), and a document's text layer.
- [draw/](../src/kit/draw/): drawing pages and what is drawn on them: the page, charts, the icons and emoji, QR codes, the mark, a preview card's picture, motion and steps.
- [file/](../src/kit/file/): a document as a file, in and out: every export, PDF, GIF, WebM, zip, XLSX, CSV, ICS, and opening a file dropped on the page.
- [share/](../src/kit/share/): sharing, sealing and keeping: short links, preview cards, passwords and sealing, privacy, the library of kept documents and its search, and the site kept for offline (the service worker under Save in browser).

A new file goes in the folder whose line fits it. A file that fits none is a sign the design wants a word first, not a
seventh folder or a file at the root.

Every import names its file (`'../../kit/draw/draw.ts'`): there is no barrel `index.ts` and no path alias, so a file
says what it reaches for and the build leaves out what nothing reaches. A document the kit carries is kept beside the
file that uses it and imported as text (`kit/ui/manual.tlo`, the manual, `'./manual.tlo?raw'` in `kit/ui/manual.ts`,
compiled into the drawer's What is this? link at build; Paul, 2026-10-14). `test/lints.test.ts` holds all of this.

---

## 12. Shared editing: operations in one order (2026-10-17)

Several people, and a host's assistant, edit one document at once (docs/library.md; a host may keep a document as a
snapshot and the operations after it). `src/doc/sync.ts` is the kernel's half: operational transformation with a
server as the one order of operations. A client sends an op with the version it was made against (`Edit`: id, author,
base, op); the server transforms it over every op appended since, appends it with the next `seq` (`Ordered`) and tells
every client; a client rebases the ops it has sent or not yet sent over each op it is told of (`rebase(pending, over)`).
Every replica applies the server's order (`applyEdits(snapshot, edits)`), so all end with one document, and the
transformation is what keeps an op meaning what its author meant once others land before it. One order asks one
property of it, TP1: for a and b made against one document, a then `transform(b, a, 'right')` is b then
`transform(a, b, 'left')`. Nothing in it names the DOM. The site's page calls none of it; its editors carry `transform`
for a page that shares a document (kit/core/element.ts `applyRemote` carries the history over another's ops, and
docs/library.md says what a page does).

**The cases** (the matrix is the file's header, one line a pair). `side` is an op's place in the order (the server
transforms what it receives as `'right'`): where two ops set one thing the later wins, where both put something in at
one place the earlier's comes first, and null means the other took away what an op acts on. Head keys are independent,
and the same key is the later's. An op on a block shifts past the blocks a splice puts in or takes out before it,
follows its block through a move, and is null inside a splice's span (its block taken out or replaced). Text ops on one
block, and splices over blocks, are ranges replaced by new content: the later op's ends are carried over the earlier's
(an end inside the earlier's range goes to its new words, an end at its edge stays outside), so the later replaces the
earlier's words when its range held the earlier's whole range and otherwise sits beside them, clipped to what is still
there, and the earlier becomes what brings the other order to the same, taking the later's words in and putting them
back where its own range lay on both sides of them. A splice follows the blocks it takes out through a move (inside the
moved span, with it; holding it, as it was; apart, as they close up), and one that only puts blocks in sits between
blocks; a move takes in what a splice put inside it and loses what one took out; of two moves, the inner goes with the
outer, and the same span goes where the later sends it. Different cells are independent; the same cell is a forced
write's (an undo's) and else the later's, the loser writing the winner's value where it cannot leave the cell out. A
rectangle of cells follows rows and columns put in or taken out, its formulas moved as the table's are. Rows and
columns shift as splices do, but rows put in strictly inside rows taken out are dropped (one op cannot take rows out
on both sides of others); rows put in carry their formulas over the other's move, and their cells over the columns. A
column renamed follows its column; `force` is kept.

**The rules.** Index transformation cannot know everything a document says, and two orders of one pair still differ in
two places no op can reach: the head writes its keys in the order they were put in (two put in at once), and `apply`'s
remapping leaves one end of a range in a formula or a table's lock apart by as many rows as were put in, when it ends
in rows one op takes out beside rows the other puts in at their edge (it grows a range over rows put in inside it and
closes it over rows taken out of its end, and the two do not commute there: one order's range takes in the rows put
in and the other's stops short of them, so over one row taken out and one put in at its place `=SUM(A1:A3)` comes out
`A1:A3` one way and `A1:A2` the other, and over two and two, `A1:A3` and `A1:A1`). The server and its clients keep
four rules:

1. **Crossing spans are refused.** A splice that takes out some of a moved span's blocks and some others, or into whose
   span a moved span lands, cannot be brought together with the move by one op on each side, which every pair of the
   kind on five blocks shows by brute force; nor can two moves whose spans overlap without one holding the other, or
   that each land inside the other, without undoing both or tearing a span apart. `transform` throws `Conflict`; the
   server refuses the later op and tells its author, whose client takes the server's document again and drops its
   pending ops. A client meets the same throw rebasing its pending ops over the earlier one, and starts again then.
2. **A table keeps its columns.** Two ops can together take out every column of a table, or put it past Z: the second
   throws where it is applied, in either order, and the server refuses it as it refuses a crossing.
3. **No lock in the head.** A sheet keeps its lock in the head for its first table; rows and columns put in or taken
   out move it there, and which table is first is the document's to say, not an op's, so a lock set at once with rows
   put in comes out different in the two orders. A shared document keeps its lock on its table's attributes
   (`{lock=…}`), and the server refuses an op on the head's `lock`; the kernel has no check of it, so the server's is
   the only one. (The Spreadsheet writes the head's lock while its first table carries none of its own; it does not
   yet write the table's in a shared sheet, so until it does, locking cells there is an op the server refuses.)
4. **The server's order is the document.** A client keeps the server's document as far as it has been told and shows
   it with its pending ops applied. An editor that instead applies the server's op, transformed over its pending ones,
   to what it shows gets the same but in the two places above, and takes the recomputed document where they differ.
   Every client ends with the server's document whatever reached it in between.

What it costs a person: words typed into a block that someone else replaced at the same moment are lost (the editors
make a paragraph a heading, split it with Enter and join it with Backspace by splicing it, and an op inside a span
taken out or replaced is null); a move across someone's deletion costs the later author the edits it had not yet had
back; an undo is the inverse rebased over what came after (`invert`), so an undo of rows or columns, which puts the old
table back, takes back another's edit to that table too.

The properties (test/doc/sync.test.ts; 200 cases each, 2,000 under `npm run fuzz`):

| property | how |
|---|---|
| TP1 for every pair of splices and moves on five blocks (13,924 pairs), of text ops on one block (2,025), and of table ops on a table of three rows and columns with formulas, without a lock and with one (6,400 each), compared by their writing, the head's keys in one order, and a range at an edge apart only as above: one end, by exactly the rows put in, the rest of the document the same | enumerated |
| TP1 for any two ops on any document the grammar makes, half of them on one text or table, or near each other | fuzzed |
| a crossing is found by both transforms or neither, and only where no op on each side does what a splice and a move did (brute force), or where two moves cross (told by moving blocks) | both |
| every transformed op fits the document it applies to, and is null only where the other took away what it acts on | both |
| two to four clients and a server, interleaved at random, undo among the steps, with ops as the grammar makes them and again with ops mostly on tables (about half of what the server appends): every client ends with the server's document; the server's transform of a client's op is the client's own rebase of it; the server's op applied to a client's view is its recomputed document but in the two places above (ranges apart only on an axis where an edge was met) | fuzzed |
| an op undone under later ops (its inverse rebased over them) applies, and gives back exactly what it changed where nothing later touched it, for every kind of op: a move's blocks go back to the place they left, a deletion's blocks come back at it; with both mixes of ops | fuzzed |

What the fuzz found on its first runs, each fixed or made a rule, with a test:
the head's keys put in by two ops at once are written in the order each replica put them in (the documents compare with
their keys in one order; replicas never differ, rule 4); a range ending in rows taken out beside rows put in at their
edge ends apart in the two orders by the rows put in, which no placement of the rows mends (rule 4, and the case shown
in a test); a move that moves nothing, transformed, kept indices past the document's end (it now moves nothing); the
brute force first counted meetings that took out a block neither op took out, or undid both moves (a meeting must do
what both did); crossing moves can sometimes meet with both spans whole (the union moved where both sent it, two spans
swapped), and are refused all the same, a rule kept simple; and two ops at random met on one text or table in about
three cases in a hundred, so the pairs are now made on one text or table, or beside the first op, and about four in ten
meet on one block; TP1 holds over 20,000 cases. Rules 2 and 3 came from reading `apply` (a table keeps a column;
`withMovedTable` moves the head's lock), each shown by a test.

**A journal needs less.** The backends (backends/README.md) keep a shared document as a journal: the server appends an
entry only at the seq its author names, the next one, and never transforms anything, so every entry was made against
the whole order before it and every replica applies one order. That is rule 4 alone: an author whose entry comes back
stale carries its pending ops over the entries it had not seen (`cross`) and sends them again, and where that crossing
throws (rule 1), or its ops would not apply (rule 2), or a snapshot is not the document as it holds it, the author takes
the journal's document again; rule 3 has nothing to guard, since nobody transforms an op but its author. An entry whose
ops do not apply to the journal's document, or leave one the text would not read back as written (`checkOp`,
`keptDoc`), every replica passes over alike, so no one entry can part them (src/kit/share/multiparty.ts; test/journal.test.ts).

What a review of the properties found, the same day: the undo was checked exactly only for ops on a block and splices
that put blocks in, never a move or a splice that only took blocks out. It now follows the place such an op left
between blocks, and calls it touched only where later ops leave no one place for it (blocks put in or a span moved
there, a block beside it moved away, the blocks on both sides taken out and others put in); over 2,000 cases of each
mix, about 460 undone moves and 170 deletions in all come back exactly, and the transform needed no change. The
exemption for a range at an edge took any two ranges in a cell as alike and left the lock out; it now allows one end
apart by exactly the rows put in, at their place, the lock compared too, and the table pairs run again on a table with
a lock. That run found a fault in `apply`, not the transform: where a lock was a table's only attribute, rows or
columns taken out that took all of it left it as it was, so the two orders kept different stale locks (and, in one
person's document, a lock on cells nobody locked). `withMovedTable` now rebuilds the table without its old attributes,
so the lock goes with the last cells it covered, and the locked table in the test has the lock as its only attribute.
And table ops were few among what the clients sent; the clients
and the undo now run again with ops mostly on tables, in which a client's view met a range apart at an edge about a
dozen times in 2,000 cases, and converge.
