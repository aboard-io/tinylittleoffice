# TLO: the document format

Every Tiny Little Office document is one text, written in TLO: Markdown, with a few additions. The link holds
this text, compressed (`#/v1/<app>/<payload>`); a `.tlo` file is this text. A language model writes it the way it
writes any Markdown, and this page is its reference. A person never types it: every label, link, card and field
is a form or direct manipulation, and the code writes the text (round four's standing rule).

There is one reader and one writer for every app, the kernel's (`src/doc/tlo.ts`, `parse` and `write`; the model
is `src/doc/model.ts`, described in `src/doc/README.md` and `docs/kernel.md`). An app is a view of the kernel's
document; it never parses text of its own.

## The rules every app keeps

1. **The text is stable.** For every canonical text `x`, `write(parse(x)) === x`, byte for byte. The gate is
   `test/doc/corpus.test.ts`, over every template.
2. **Markdown's own forms first.** Headings, paragraphs, lists, task lists, tables, quotes and rules mean what
   Markdown means by them. An addition only where Markdown has nothing.
3. **Records go in tables.** Many things of one shape (stops, shapes, invoice lines, products) are the rows of a
   table; the header row names the columns and gives the type where it matters: `Price:money`.
4. **Settings go in the head.** Anything the document has once (a title, a currency, a time zone, a chart, units,
   a theme) is a `key: value` line in the head.
5. **Read leniently, write canonically.** Markdown as a person or a model loosely writes it is read (other bullet
   marks, a table with outer pipes, `Price: money`, Markdown's reference footnotes); the writer writes one form.
6. **Words are inline Markdown.** `**bold**`, `*italic*`, `++underline++`, `~~strike~~`, `==highlight==`,
   `:icon-name:`, `[words](address)` and `^[a footnote]`; `\` escapes. The writer escapes as little as reads back.

## The model

A document is a head and a list of blocks. Nine kinds of block:

| Kind | Written | Notes |
| --- | --- | --- |
| `h` | `# Words` … `###### Words` | Level 1 to 6. |
| `p` | a paragraph | A line break inside it is a line of its own in the text. An empty paragraph is `<br>`. |
| `li` | `- words`, `1. words`, `- [ ] words`, `- [x] words` | Nested by two spaces. |
| `quote` | `> words` | A note: a speaker's note, a page's aside, a site's button. |
| `hr` | `---` | A break: the next slide, page or card. |
| `table` | `Name | Price:money` / `--- | ---` / rows | Cells are raw strings (formulas start with `=`). Written without outer pipes. |
| `fence` | ```` ```<lang> ```` … ```` ``` ```` | `lang` names an app: another document, its whole TLO text. Else text kept as written. |
| `edge` | `~ A -> B: label` | A connection by the things' words (or `#id`): `->`, `<-`, `<->`, `--`. |
| `img` | `![alt](address)` | A picture by its address. |

Any block may end with attributes: `{#id .class key=value}` (classes before values). A web address alone on a
line is a thing from the web, shown as a card that loads only when asked (`src/kit/embeds.ts`).

### Column types

`text`, `number`, `money`, `percent`, `date`, `time`, `check`, `url`, `rich` (inline Markdown, written by the
code), `long`, `icon`, `name` (each cell names the cell to its right, for formulas), `option` (one of the words
the column holds).
A money column may name its currency in parentheses, a symbol of up to three characters or an ISO 4217 code:
`Price:money(£)`, `Price:money(GBP)` (a code is shown as the reader's browser writes it); one that names none
is in the head's `currency:` where the app has one (the Word Processor, the Website Builder), else in dollars.

### The head

```
---
title: The document's name
---
```

The shell's keys are `title`, `by`, `created`, `key` and `sig` (and `app` in a `.tlo` file). A table's `lock:` and
`chart:` ride on the head for a sheet and on the table's attributes anywhere else.

### Fences the kit knows

- ```` ```sheet ````, ```` ```draw ````, ```` ```trip ```` and every other app id: another document, drawn small
  by its app where it sits. Under an outline item it says its depth: ```` ```sheet {depth=2} ````.
- ```` ```qr ```` with nothing in it: the QR code of this document's own link, drawn afresh as the document
  changes; with an address in it, that address's code (Insert ▾ → QR code of this document).
- ```` ```signatures ````: a contract's signatures, a table `Name | Key | Signature` that signing fills.

## Each app's shape

The examples are canonical: what the code writes.

**write** (Word Processor): rich text. `# Words {.title}` is the title heading; `#`, `##`, `###` headings; lists
nest by two spaces; `{.center}`, `{.right}`, `{.justify}` align a block; `---` is a page break; `paper: a4` in the
head (letter where absent and the reader is in North America); `look: serif|mono|mixed|inverse|book|news` in the
head sets the type (sans where absent). A table is a table block worked out in place by
the formula engine. An invoice is a text whose fields are head keys (`from`, `to`, `number`, `date`, `due`,
`tax`, `currency`, `terms`) and whose lines are a table.

**outline** (Outliner): a nested list, the first level its roots.

```
- Launch
  - Product {.from label="sets"}
    - Pricing
  - Marketing

~ Pricing -> Marketing: feeds
```

An item joins its parent plainly, or `{.from}`, `{.to}`, `{.both}`, with `label="…"`. A text of headings and
paragraphs reads as a tree too.

**deck** (Presentation Builder): a slide between each `---`. `## :icon-name: Headline {.title}` (or `.two`,
`.icon`); `- ` bullets; a paragraph `|` between the columns of a `.two` slide; `> ` speaker notes; a fence, a
table, a picture or a web address alone is the slide's document. Head: `theme: midnight`, `transition: cut`
(`slide`, `zoom`), `color: red`, `qr: no` (no closing QR slide), and `format: zine` (`booklet`, `brochure`,
`comic`, `poster`, `badges`) for a printed thing, with `sides: 2` and `pages: 12`.

**sheet** (Spreadsheet): one table. Its rows are rows 1, 2, 3 (`=SUM(B1:B3)`), at most 26 columns (A to Z).

```
---
chart: bar
---
Quarter | Sales:money
--- | ---
Q1 | 120
Q2 | 180
```

`chart:` is `bar`, `line`, `pie` or `sankey` (rows of From | To | Amount); `lock: C1:C6, E7` the cells a reader is
to leave be.

**calc** (Calculator): a tape, one paragraph, an expression a line (`a = 12` names its answer); `mode: graph` in
the head draws the lines as curves y = f(x).

**draw** (Drawing Tool): a table `Kind | X | Y | W | H | Style | Label` in 8px grid units; a join (`k` arrow, `j`
line) holds the row numbers of the two shapes in X and Y; `Points` and `Rot` columns appear while needed. Kinds:
`r o e d h p c n t i l a v w k j`. Head: `alt:`. Pixel art is `grid: 16` in the head and one paragraph of letters
(a to h the inks, `.` clear), a line a row; `tile:` in the head is a background.

**anim** (Animator): a drawing, plus a table `Shape | Keys` (the shape's row number; keys
`frame,dx,dy,depth,size,spin[,effects]` between `; `). Head: `frames`, `fps`, `loop` (`once`, a number, `bounce`).

**diagram** (Diagram Maker): list items and connections, the head's `kind:` saying how they are drawn:
`mind` and `family` (a nested list), `org` (`- Name | Role`, a dotted line an edge `~ Ben -- Eve: advises`),
`lanes` (`- Who: what they do`), `timeline` (`- When: what happened`), `venn` (`- Set: thing, thing`, and
`- A & B: thing`), `seating` (`- Table: Ann, Bob`; its place cards print eight to a sheet), `net` (edges, and
`- name` for a thing on its own). A thing's own words never separate: where one of them would read as a separator the
code writes a backslash before it, `\,` a comma in a thing of a list, `\:` a colon ending a word in a key (or in a
line with none), `\|` a bar that is not a second line, `\&` an ampersand in a set's name, `\\` a backslash before
one of them; the backslash is in the item's words, so the text holds it doubled (`- Top table: Smith\\, Jones, Ann`
is two guests). An unescaped separator still separates. A connection names things by their plain words, and a name
holding an arrow or `: ` (`~ A -- B -> C`) is read against the things there are, a whole name first.

**board** (Kanban Board): `## Stage {limit=2 color=g}` headings, each with `- card` items; a card's checklist is
the task items one level under it. `look: rows` in the head draws the stages as bands.

**todo** (To-Do List): a task list; a star and a due date are attributes:
`- [ ] Renew passport {.star due=2027-03-01}`.

**cal** (Calendar): an item a span. `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`,
`- 2027-03-10 09:00-10:30: Retro {color=green every=week times=9}` (or `until=2027-06-01`),
`- 2027-03-10 22:00 to 2027-03-11 01:00: Party`. Head: `zone: Europe/London`, the colours' names
(`green: Sam`), and `view: gantt` for a schedule, where an item's depth nests it under the one above,
`{done=40%}` says how far along it is and `- [x]` that it is done.

**trip** (Trip Planner): a table `Place | Lat:number | Lon:number | Note`. Head: `units: km` or `miles` (hours of
driving where absent), `route: dots` for places that are not a route.

**site** (Website Builder): `# Name` and a line about it; each further `# Title` a page, `## Section` a part of
one. `- :icon: Point | detail` a card, `> Label | https://…` a button, a picture's address alone a picture,
`:icon:` alone a big icon, a table `Name | Price:money | About | Image` a shop with a cart (its prices, the
cart's lines and total and the order mailed in the Price column's currency, `Price:money(GBP)`, else the
head's). Head: `theme: teal serif dark`, `currency`, `orders` (where orders are mailed); `look: links` makes
it a Quick Links page (one column, the buttons stacked, `- ` items small links at the foot).

## Opening another app's reading

The Download menu's "Open in" turns a document into another app's (a list as a board, a text as slides, a trip as
a calendar): pure functions in `src/apps/<id>/convert.ts`, listed in `docs/exports.md`.
