---
name: tinyoffice
description: Make almost any small document as a shareable link by writing a Tiny Little Office URL: spreadsheets and charts, models of a small business, text, letters, résumés, contracts, invoices, slide decks, outlines, zines, booklets, brochures, comics, posters, name badges, drawings and pixel art, diagrams (mind map, org chart, family tree, swimlanes, timeline, Venn, seating chart, network), animations, calendars and Gantt schedules, trips on a map, and a calculator that keeps its working. Use when someone asks for any of these and a link they can open, edit and share would serve them better than a file.
license: MIT
---

# Tiny Little Office links

Tiny Little Office (https://tinylittleoffice.com) is an office suite whose documents live entirely in their links. You make a document by writing a URL. Nothing is uploaded: opening the link shows the document in an editor, whoever opens it can change it, and the address follows every edit once the typing stops, so the new link is the new document. The document sits after the `#`, which browsers never send to a server. Save in browser is off by default, and then nothing is kept on the device; a person may turn it on, which keeps their documents in their own browser and never on a server; a short link (below) is the one thing a server holds, encrypted with a key the server never sees, until it expires.

Every document is one text in one format, TLO: Markdown with a few additions. If you can write Markdown you can write any app below; each app's section says which shapes it reads, with one of its own templates as the example.

<!-- This file is written by scripts/make-skill.ts from SKILL.tpl.md: edit the template, then `npm run skill`. -->

## The URL

```
https://tinylittleoffice.com/<app>/#title=<title>&doc=<document>
```

- `<app>` is one of the apps below (the table's first column).
- `doc` is the document, URL-encoded: a new line is `%0A`, a space `+` or `%20`; `& # % + =` in the text must be percent-encoded. Non-ASCII is fine, percent-encoded as UTF-8.
- `title` (optional) is the document's name. `by` (optional) is who made it: your name as an agent, say. It is a claim, in your own word (below).
- `view` (optional) opens the document another way: `pdf`, `png`, `html`, `md` or `tlo` download it as it opens, as do an app's own formats (listed under each app); `embed` is the pages alone, for a frame; on a deck, `show` opens it presenting.
- `md=` may stand for `doc=`: it is the same text (TLO is Markdown). With no app in the path or the head, `md=` opens a text in the Word Processor.
- The document's own head may name the app instead: a `doc` that begins `---%0Aapp: sheet%0A---` needs no app in the path (`https://tinylittleoffice.com/#doc=...`).

Put the parameters after `#`, exactly as shown, never after `?`. On opening, the link is rewritten into its packed form, `#/v1/<app>/<payload>`, which is what the person shares onward. Give them the link you wrote; they need not know its format.

Length: a QR code holds at most 2,953 characters and some chat apps cut a link past about 2,000. Keep the whole URL under 2,000 where you can; a short link (below) holds up to 12,272.

The packed form: after `#/v1/<app>/` comes one letter and then base64url bytes (with `~` for 62 where RFC 4648 has `-`, so a pasted link never breaks at a hyphen; `-` is read too; and a `+` after every 300 characters, which reading ignores, so Messages and Signal, which break a link at a run of more than 301 letters and digits, deliver it whole): the document's TLO text deflated against a dictionary of TLO's own words (`y`), deflated (`z`), or raw (`r`). `?d` after it opens the pages to read rather than the editor; `?show` opens a deck presenting; `#/v1/<app>.<ext>/…` downloads the file as it opens. You never need to make these by hand: the plain form becomes the shortest of them when opened, and the API below makes them directly.

## Sharing: a link is a copy

There is no shared document. Whoever opens a link gets their own copy: what they change is in their link, not in the one they were sent, and nobody else sees it unless they send their new link back. Never promise collaboration, live editing or one copy that everyone fills in. For a sign-up sheet, a form to fill in or work to hand in, tell the person that each one who opens it makes their own copy and should send their link back. A short link (below) cannot be changed once made and never gathers anyone's changes: a new version is a new link.

## A document inside a document

Any app's document goes inside a Word Processor page, a slide or an outline item: a fence named by any of the ten app ids (```` ```sheet ````, ```` ```calc ````, ```` ```anim ````…) holding that document's own TLO. Its own app draws it there, and it is edited in place. A slide with one shows it alone under the headline; an animation moves on its slide and plays when presented. A page's or a deck's PDF, and a deck's PowerPoint, carry it drawn. Put a document inside rather than link to it.

Two slides, a cover and then the Moon going around the Earth, an animation on its slide: <https://tinylittleoffice.com/deck/#doc=%23%23+%3Amoon%3A+Why+the+Moon+has+phases+%7B.title%7D%0A%0A---%0A%0A%23%23+%3Amoon%3A+The+model%2C+moving%0A%0A%60%60%60anim%0A---%0Aframes%3A+16%0Afps%3A+4%0Aalt%3A+The+Moon+goes+around+the+Earth%2C+lit+from+the+left+by+the+Sun.%0A---%0AKind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Style+%7C+Label%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0Ai+%7C+2+%7C+21+%7C+8+%7C+8+%7C+0o+%7C+sun%0Ae+%7C+37+%7C+22+%7C+6+%7C+6+%7C+2b+%7C%0Ae+%7C+57+%7C+24+%7C+2+%7C+2+%7C+2+%7C%0A%0AShape+%7C+Keys%0A---+%7C+---%0A2+%7C+0%2C0%2C0%2C0%2C1%2C0%3B+4%2C-144%2C-144%2C0%2C1%2C0%3B+8%2C-288%2C0%2C0%2C1%2C0%3B+12%2C-144%2C144%2C0%2C1%2C0%3B+15%2C-36%2C36%2C0%2C1%2C0%0A%60%60%60>

## Three rules agents break first

1. **Every space and line break is kept.** A list nests by two spaces a level, and in a link each space is written (`%20%20` or `++`, a new line `%0A`): a dropped space flattens the tree. A line break inside a paragraph stays a line break, so never wrap a paragraph's lines.
2. **A slide shows one thing.** A slide with a chart, a table or a diagram shows it alone under the headline: bullets on it are not drawn, so put them in the notes (`> ` lines) or on a slide of their own. A `{.title}` slide is a cover, with a line or two under it, not a list.
3. **A comma in a list splits it.** In a Venn's or a seating chart's list a comma separates things, a comma in a number too: "2,000 cases" is two things, so write 2000.

## TLO: Markdown, and what it adds

Write ordinary Markdown: `#` headings, paragraphs, `- ` and `1. ` lists nested by two spaces, `- [ ]` and `- [x]` tasks, `> ` quotes, `---` rules, tables with a `--- | ---` line under their header row, and inline `**bold**`, `*italic*`, `~~strike~~`, `` `code` `` (set in a monospace face), `[words](https://…)`. A footnote sits where it belongs: `^[the note's words]` (Markdown's `[^1]` with a `[^1]: the note` paragraph reads too). TLO adds:

| Write | Means |
| --- | --- |
| `---` / `key: value` lines / `---` at the very top | The head: the document's settings (`chart: bar`, `zone: America/New_York`, `theme: midnight`) and its `title` and `by` |
| `{#id .class key=value}` at the end of a line | Attributes: a layout (`{.title}`, `{.two}`), a setting for that line (`{due=2027-03-01}`) |
| `Price:money` in a table's header | A typed column: `text number money percent date time check url rich long icon name option` |
| `~ A -> B: label` | A connection between two things (`->`, `<-`, `<->`, `--`) |
| a code fence named for an app: ```` ```sheet ```` | Another document inside this one, written in that app's TLO: a chart on a slide, an animation, a diagram in a text |
| `==highlight==`, `++underline++`, `:icon-name:` | A highlight, an underline, an icon in the line (Lucide's names: `rocket`, `calendar`, `coffee`…). An emoji is a character in the words, anywhere; it is not an icon's name |

`---` between blocks starts the next slide, page or card. A table anywhere is a spreadsheet: its formulas work. A link is words: `[words](https://…)` or a web address, alone on a line or among other words, is words that go there when the reader follows them. Nothing in a document is fetched from another site: there are no pictures from the web and no embedded videos or posts, and Markdown's picture line, `![words](https://…)`, reads as a link.

## The apps

| App | Name | For |
| --- | --- | --- |
| `write` | Word Processor | Words on a page: headings, lists, links and notes, a table that adds up, printed on letter or A4. |
| `outline` | Outliner | An outliner: ideas under ideas, folded and unfolded, moved around and joined; the same tree a deck or a mind map reads. |
| `deck` | Presentation Builder | Slides: titles, bullets, two columns, big icons, other documents on a slide; or a zine, booklet, brochure, comic, poster or name badges to print and fold. |
| `sheet` | Spreadsheet | A spreadsheet with formulas, named cells and charts; three columns to start, more as you need them. |
| `calc` | Calculator | A calculator that shows its work: names, units and conversions, and graphs of y = f(x). |
| `draw` | Drawing Tool | Boxes, arrows, icons and labels on a grid; or pixel art, which can become a background tile. |
| `diagram` | Diagram Maker | Mind maps, org charts, family trees, swimlanes, timelines, Venns, seating charts and networks, drawn from a few lines. |
| `anim` | Animator | Anything from the Drawing Tool, moving: position, depth, size, spin and turn over time, with effects for memes. |
| `cal` | Calendar | Days and times on a month, a year or a schedule, in any time zone. |
| `trip` | Trip Planner | A route on a map: stops in order, each with a note, and how far between them. |

Before writing for an app, read its reference, which says what it reads and gives one of its own templates as the example: [write](references/write.md), [outline](references/outline.md), [deck](references/deck.md), [sheet](references/sheet.md), [calc](references/calc.md), [draw](references/draw.md), [diagram](references/diagram.md), [anim](references/anim.md), [cal](references/cal.md), [trip](references/trip.md). The files every document downloads, short links, the API and the command line are in [references/api.md](references/api.md); the keys that drive the editors in a browser are in [references/editors.md](references/editors.md).

## Choosing an app

- Numbers, a table, a chart, a model: `sheet`. A quick sum or a conversion: `calc`.
- Words to read or print: `write`. Notes in a tree: `outline`. Something to present: `deck`. A poster, a zine, badges: `deck` with a `format`.
- Ideas branching from one topic: `diagram` `mind`. People and reporting lines: `org`. A process with handoffs: `lanes`. Dates along a line: `timeline`. Overlaps: `venn`. Who sits where: `seating`. What talks to what: `net`.
- Days and times: `cal`; tasks over weeks: `cal` with `view: gantt`. Places in order: `trip`. Things to tick off: `- [ ]` tasks in `write` or `outline`.
- Anything else visual: `draw`; moving: `anim`.

## The skill

This guide is also a skill for Claude Code: the same words, under front matter that says when to use them, as a folder, `tinyoffice/`: `SKILL.md` holds the sections every document needs, and `references/` the rest, a file an app (`references/deck.md`), one for the files and the API (`references/api.md`) and one for the editors' keys (`references/editors.md`), each read when the task needs it. The npm package carries it: `npx tinylittleoffice skill` prints `SKILL.md`, and `npx tinylittleoffice skill --into ~/.claude/skills` installs the folder for every project (`--into .claude/skills` for one); one already there is left as it is unless `--force`. Its source is https://github.com/aboard-io/tinylittleoffice/tree/main/skill/tinyoffice.

## Check it, do not look at it

Before you share a link, lint it: `tinyoffice lint <link or file.tlo>` (or `await lint(app, text)` in the API). It says what a reader's eye would have seen, a line a finding, `app · slide or block · the finding · what to do`, and exits 1 when there is one; `--json` gives `{findings: [{app, at, block, kind, words, fix}]}`. The findings:

- `edge-end`: a connection names a thing that is not in the list (a tree draws it not at all).
- `edge-unused`: a connection in a kind that draws none.
- `net-colon`: a network's `- Name: description` line, named by the whole line.
- `comma-number`: a comma inside a number in a Venn's or a table's list, cutting it in two.
- `label-long`: a thing's words too long for its box: set at the smallest size, or cut with "…".
- `label-over`: a connection's label lying over another label or a thing's words.
- `fence-bullets`: bullets on a slide that shows a document, not drawn.
- `title-cut`, `title-small`: a headline cut after two lines, or set at its smallest size.
- `body-over`, `body-small`: a slide's words running off its foot, or set at their smallest size.
- `formula-error`: a table's formula that works out to an error (`#CIRC`, `#REF`, `#DIV/0`, `#NAME`, `#VALUE`, `#NUM`, `#ERR`), in any table, a fenced one too: the cell, the formula, the error and the fix. A total over its own column takes in its own cell when the rows are counted from the header: rows count from the first data row, so the eighth row's total of the seven above is `=SUM(B1:B7)`.
- `doc-link`: a link to a Tiny Little Office document in the words, where the document could be inside this one as a fence.
- `length`: a link past 2,000 characters, which some chat apps cut.

A diagram fenced on a slide is linted too, at its slide. `tinyoffice measure <link or file>` (`measure(app, text)`) gives the numbers behind them as JSON: per slide, the headline's and the words' sizes, the lines they wrapped to, what was cut and the bullets a document hides, what it shows (`shows`); per diagram, its things, its connections drawn and dropped, and each label's size, lines and whether it was cut; per table, its formulas and the ones that fail; `short`, whether the link fits in a short link; and for every document `words` and `headings`, what a reader meets. Set your words from these numbers. `read` gives back the text exactly as written, so what you wrote is what the link holds; `read --text` (`text(url)`) gives what it says, as a screen reader is given it on the Display Link (a diagram's things and connections, a calendar's days), to check that it reads. You never need a browser or a screenshot to check a document: the lint and the measures come from the same layout code that draws the pages. If you do open a development copy of the site, short links need its shortener (`npm run tinier:dev`).

## Good practice

- URL-encode `doc` and `title`; check that `#`, `&`, `%`, `+` and `=` in the content are encoded.
- Give the link as a Markdown link with a plain description: `[Sales by quarter (chart)](https://...)`.
- Say that the link is the document: editing it changes the link, and anyone with the link can read it.
