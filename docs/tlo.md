# TLO: the document format

Every TinyLittleOffice document is one text, written in TLO: Markdown, with
a few additions. The link holds this text, compressed. A `.tlo` file is
this text. A language model writes it the way it writes any Markdown.
Every app reads its document from it. The reader and writer are
`src/lib/tlo.ts`.

## The rules every app keeps

1. **The text is valid TLO, and it is stable.** Writing a document and
   reading it back gives the same document. Writing what was read gives the
   same text.
2. **Use Markdown's own forms first.** Headings, paragraphs, lists, task
   lists, tables, quotes and rules mean what Markdown means by them. Use an
   addition only where Markdown has nothing.
3. **Records go in tables.** Many things of one shape (invoice lines,
   products, stops, cards with a front and a back) are the rows of a table.
   The header row names the columns, and the type is given where it matters:
   `Price:money`. A CSV is the same table.
4. **Settings go in the header.** Anything the document has once (currency,
   tax, time zone, chart type, units, transition) is a `key: value` line in
   the header.
5. **Read leniently, write canonically.** An app's `read(text)` turns
   Markdown as a person or a model loosely writes it into the app's
   canonical TLO: other bullet marks, four-space indents, a CSV, a table
   whose columns are in another order. The editor always writes the
   canonical form.
6. **Words are inline Markdown.** Use `**bold**`, `*italic*`, `++underline++`,
   `~~strike~~`, `==highlight==`, `:icon-name:`, `[words](address)` and
   `^[a footnote]`. Escape with `\`.

## The additions

| Form | Means |
| --- | --- |
| `---` / `key: value` lines / `---` at the very top | The header: the document's settings. The shell's own keys are `title`, `by`, `created`, `key` and `sig`, plus `app` in a .tlo file. |
| `{#id .class key=value}` at the end of a block | Attributes: a node's id, a kind or layout (`.title`, `.two`), or a setting for that block. |
| `Name:type` in a table's header row | A typed column. The types are `text`, `number`, `money`, `percent`, `date`, `time`, `check`, `url`, `rich`, `long`, `icon` and `name`. |
| `~ A -> B: label` | An edge between two things in the document, by their words or `#id`. The kinds are `->`, `<-`, `<->` and `--`. |
| A fenced block whose language is an app | Another document, embedded: its whole TLO text. `sheet`, `draw`, `trip` and so on. |
| `![alt](a TinyLittleOffice link)` alone on a line | Another document, by its link. |
| The address of a video (YouTube, Vimeo, PeerTube, the Internet Archive), a post (Bluesky, Mastodon, X, Reddit), a Spotify or SoundCloud player, a place on OpenStreetMap, a CodePen, a Wikipedia article, a Wayback Machine page, or a sound, a film, a PDF or a picture by its own address, alone on a line; `![what it shows](a picture's address)` | A thing from the web, shown as a card that loads it only when tapped (`src/lib/embeds.ts`). |
| `---` between blocks | A break: the next slide, page or card. |
| `> words` | A note: a speaker's note, a page's aside. |
| `^[the note's words]` in a line | A footnote, written where its mark sits (Pandoc's inline note). Numbered by order of appearance when drawn: at the end of a text, at the foot of the slide that holds it. The words are inline Markdown (no blocks). Markdown's reference form, `[^id]` with a `[^id]: the note` paragraph anywhere, is read and folded into this one; this one is what is written. |

## Each app's shape

The examples are canonical: what the editor writes.

**write**: rich text. `# Words {.title}` is the title. `#` and `##` are
headings. Lists nest by two spaces. `{.center}`, `{.right}` and
`{.justify}` set alignment. An embedded document is a fence, and a
Markdown table is an embedded sheet. Footnotes are `^[inline]`, drawn
at the end. **contract** is a write text followed
by its signatures, in a `signatures` fence.

**outline**, **mind**, **family**: a nested list. The first level is the
roots.

```
- Launch
  - Product
    - Pricing
  - Marketing
```

An outline item may say how it joins its parent: `{.to}` (an arrow to the
parent), `{.from}` or `{.both}`, with `label="reports to"`. A join between
any two items is an edge: `~ Pricing -> Press: informs`. An embedded
document under an item is a fence with `{depth=2}`.

**org**: a nested list of `Name | Role`. A dotted line is an edge:
`~ Ben -- Eve: advises`.

**deck** and the page apps (**zine**, **booklet**, **brochure**, **poster**,
**badges**, **comic**): one slide or page per `---`. The
headline is `## :icon-name: Headline`. The layout is an attribute on the
headline: `{.title}` (headline and subtitle), `{.two}` (a paragraph `|`
between the columns) or `{.icon}` (bullets beside one big icon). The words
are `- ` bullets, nested by two spaces; a print app's page with no layout is
prose, as paragraphs. Speaker notes are `> `. A chart or another document
is a fence. The deck's settings go in the header: `theme: midnight`
(plain when absent: boardroom, ivory, midnight, graphite; for fun confetti, sunset, ocean, bubblegum, arcade, chalkboard), `transition: cut` (`slide`, `zoom`; a
fade when absent), `color: red`, `qr: no`; a print
app's are `sides: 2` and `pages: 12`. **comic** panels are bullets:
`- :dog: Walk? | Monday, noon.`.

**sheet**: one table. Its header row holds the column names (shown above
the letters), each with its type. A sheet is as wide as its table: write
any number of columns up to twenty-six (A to Z); the editor draws three
at the least. Its rows are rows 1, 2, 3 and so on, so
`=SUM(B1:B3)` adds the first three. The header holds `chart: bar`
(`line`, `pie`, or `sankey` for rows of From | To | Amount), and
`lock: C1:C6, E7`, the cells a reader is to leave be. A column typed
`name` names, with each of its cells, the cell to its right, and a formula
may use the name (`=visitors*signup_rate`). A sheet is written with at
least two columns; a table of one column keeps its outer pipes.

```
---
chart: bar
---
Quarter | Sales:money
--- | ---
Q1 | 120
Q2 | 180
```

**pixel**: the rows of letters as one paragraph, one line per row.

**todo**: a task list. A due date and a star are attributes:
`- [ ] Renew passport {.star due=2027-03-01}` (classes come before values).

**board**: `## Stage {limit=2}` headings, each followed by a `- card` list.

**gantt**: a table `Task | Start:date | Days:number | Done:percent`. A
task that is part of the one above starts its name with `- `.

**trip**: a table `Place | Lat:number | Lon:number | Note`. The header
holds `units: km` or `miles`.

**cal**: one list item per span. `- 2027-03-01: Launch`,
`- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`.
A colour and a repeat are attributes, `{color=green every=week times=9}`
or `until=2027-06-01`; a timed span over midnight is
`- 2027-03-10 22:00 to 2027-03-11 01:00: Party`. The header holds
`zone: Europe/London`, and names the colours in use: `green: Sam`.

**invoice**: the header holds `from`, `to`, `number`, `date`, `due`, `tax`,
`currency` and `terms`. The lines are a table `What | Qty:number | Units |
Price:money`. Notes are paragraphs.

**site**: `# Name` and a line about it; each further `# Title` starts a
page, and `## Section` a part of one. `- :icon: Point | detail` is a card,
`> Label | https://…` a button, a line that is only a picture's address a
picture, a line that is only `:icon:` a big icon. A table `Name |
Price:money | About | Image` is a shop: a grid of products with a cart; the
header holds `currency` and `orders` (the address orders are mailed to).
The header holds `theme: teal serif dark`: a named theme, and a type and a
mode if they are not the theme's own. (A page break written `---` reads
too.)

**links**: a website of one page: `# Name`, a picture or a big icon, a line
of words, `> :icon: Label | https://…` buttons, and `- :icon: Label |
https://…` small links at the foot.

**spinner**: a `- ` list of choices. **split**: the header
`between: Ann, Bo` and a table `Who | Amount:money | What`. **santa**:
the people as a `- ` list, and each draw an edge `~ Ann -> Bo`.

**lanes**: `- Who: what they do`, in order. **venn**: `- Set: thing, thing`
and `- A & B: thing`. **net**: edges, plus `- name` for a node on its own.
**seating**: `- Table: Ann, Bob`.
**timeline**: `- When: what happened`.

**draw**: a table `Kind | X | Y | W | H | Style | Label`; a join (`k`, `j`)
holds the row numbers of the shapes it joins in X and Y, and a shape drawn
corner by corner adds a `Points` column. The header holds `alt`. **anim**
has the same table, plus a table `Shape | Keys` (a shape's row number, then
keys `frame,dx,dy,depth,size,spin[,effects]` between `; `), and the header
holds `frames` and `fps`.

**calc**: the header holds `mode` (`calc`, `graph`, `mortgage`, `invest`,
`cashflow` or `interest`). For the calculator and the grapher, the
expressions are paragraph lines, one per line. For the money modes, the
values are `- price = 400000` list items.

**qr**: the link or text as a paragraph. **wordsearch**: `# Title`, then
the words as a `- ` list.
