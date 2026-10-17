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

Any app's document goes inside a Word Processor page, a slide or an outline item: a fence named by any of the eleven app ids (```` ```sheet ````, ```` ```calc ````, ```` ```anim ````…) holding that document's own TLO. Its own app draws it there, and it is edited in place. A slide with one shows it alone under the headline; an animation moves on its slide and plays when presented. A page's or a deck's PDF, and a deck's PowerPoint, carry it drawn. Put a document inside rather than link to it.

Two slides, a cover and then the Moon going around the Earth, an animation on its slide: {{embed}}

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

{{apps}}

## Choosing an app

- Numbers, a table, a chart, a model: `sheet`. A quick sum or a conversion: `calc`.
- Words to read or print: `write`. Notes in a tree: `outline`. Something to present: `deck`. A poster, a zine, badges: `deck` with a `format`.
- Ideas branching from one topic: `diagram` `mind`. People and reporting lines: `org`. A process with handoffs: `lanes`. Dates along a line: `timeline`. Overlaps: `venn`. Who sits where: `seating`. What talks to what: `net`.
- Days and times: `cal`; tasks over weeks: `cal` with `view: gantt`. Places in order: `trip`. Things to tick off: `- [ ]` tasks in `write` or `outline`. Work moving through stages (a pipeline, a project, hiring): `board`.
- Anything else visual: `draw`; moving: `anim`.

## Words

### write: a text

Markdown as it stands. `# Words {.title}` is the title, set large; `#` and `##` are headings; `{.center}`, `{.right}` or `{.justify}` at the end of a paragraph aligns it. A table works out its formulas. A fence named by any app's id (```` ```anim ````, `draw`, `diagram`, `sheet`, `trip`, `cal`, the lot) puts that document in the page as a figure, drawn by its app. `paper: a4` or `letter` in the head sets the paper (a reader in North America gets letter otherwise). Notes are listed at the end, in the editor, on paper, in the web page and in Word. an invoice is a text with its lines as a table.

{{tpl:write:meeting}}

{{templates:write}} {{exports:write}}

### outline: an outliner

A nested list, two spaces a level. An item's tie to its parent can be an arrow, `{.to}` (towards the parent) or `{.from}`, named with `label="…"`; any two items join with `~ Pricing -> Press: informs`. An item may be a task (`- [ ]`, `- [x]`), carry a status from the document's own set (`statuses: TODO=red, DOING=yellow, DONE=green` in the head, a name and a color each: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `indigo`, `gray`; the last is the done one, and a task's box follows it), `{status=DOING}`, and a due day, `{due=2026-10-20}`; `{.shut}` folds its family away (an item is open otherwise). A fence named by any app's id (```` ```anim ````, `cal`, `diagram`, `sheet`, the lot) puts that document under an item, `{depth=2}` after its name saying how deep. The same tree opens as slides, a mind map, an org chart or a network.

{{tpl:outline:launch}}

{{templates:outline}} {{exports:outline}} (the `.pdf` is the outline's words as sections and bullets, selectable and bookmarked)

## Slides and things to print

### deck: slides

A slide between each `---`. The headline is `## :icon-name: Headline`, its layout an attribute: `{.title}` (a title slide), `{.two}` (two columns, a paragraph `|` between them) or `{.icon}` (bullets beside one big icon). The words are `- ` bullets nested by two spaces; `> ` lines are speaker notes; a `^[footnote]` is shown at the foot of its slide; `` `code` `` between backticks is set in a monospace face (a command, a file's name). A fence named by any app's id (```` ```anim ````, `diagram`, `draw`, `trip`, `cal`, `sheet`, the lot) puts that document on the slide, drawn by its app: an animation moves, a sheet with `chart: bar` in its head is a chart. The head may hold `theme:` (`boardroom`, `ivory`, `midnight`, `graphite`; for fun `confetti`, `sunset`, `ocean`, `bubblegum`, `arcade`, `chalkboard`; plain otherwise) and `transition:` (`cut`, `slide`, `zoom`; a fade otherwise).

The rules, before they are broken: a slide with a fence (a chart, a diagram, a table) is the fence's, drawn alone under the headline: bullets on it are not drawn, so put them in the notes (`> ` lines) or on a slide of their own. A headline is a few words; a long one is set smaller, then cut after two lines. Bullets are set as large as they fit, down to 14px; more than that runs off the slide, so split it. Presenting reveals one bullet, or one item of a fenced document, per step; the notes show with N or the Notes button, and start hidden under a finger.

`format:` in the head makes the deck a thing to print and fold, a page between each `---`: `poster` (one page, as big as the page allows), `zine` (8 pages), `booklet` (8 to 20), `brochure` (6 panels), `comic` (a panel per bullet, `- :icon-name: What is said | caption`) or `badges` (a page per person, the name as the headline).

{{tpl:deck:status}}

{{tpl:deck:poster}}

{{templates:deck}} {{exports:deck}}

## Numbers

### sheet: a spreadsheet, a chart, a model

One table. Its header row names the columns, each optionally typed (`Sales:money`); the rows under it are rows 1, 2, 3, so `=SUM(B1:B3)` adds the first three. Up to 26 columns (A to Z). A cell starting with `=` is a formula: `+ - * / ^`, comparisons, references (`B2`), ranges (`A1:A5`), and these functions: {{functions}}. Dates are written `2027-03-01` in a `date` column. `chart: bar` (or `line`, `pie`) in the head draws the first column's labels against the numbers beside them; `chart: sankey` draws rows of `From | To | Amount` as flows.

A model is a sheet: a column typed `name` names the cell to its right, and formulas use the names (`=visitors*signup_rate/100`; a space is `_`); `lock: C1:C6` in the head marks the model's own formulas, so a reader changes the assumptions and not the model.

{{tpl:sheet:budget}}

{{tpl:sheet:subscription}}

{{templates:sheet}} {{exports:sheet}}

### calc: a calculator that keeps its working

An expression a line (`2+3*4`, `sqrt(16)`, `20!`); `name = expression` keeps its answer under that name for the lines after it, and `ans` is the line before. Units convert (`3 inch to cm`, `60 mph in km/h`). `mode: graph` in the head draws each line as a curve y = f(x), with `x from 0 to 400` setting the range.

{{tpl:calc:bill}}

{{templates:calc}} {{exports:calc}}

## Pictures

### draw: a drawing, or pixel art

A table `Kind | X | Y | W | H | Style | Label`, a row per shape, on a grid of 8px squares. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `i` icon (its label is the icon's name), `l` line, `a` arrow (X, Y the start; W, H the distance to the end). `k` joins two shapes with an arrow and `j` with a line: their X and Y are the row numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid), then a color letter (`r o g b p`) and a text size (`1` to `4`); a text (`t`) may end it with `=` to center its words or `>` to set them right. `alt:` in the head describes the drawing for people who cannot see it. Prefer a diagram when one fits: it lays itself out.

{{tpl:draw:request}}

Pixel art: `grid: 16` (or 8, 32, 64) in the head, then a line per row and a letter per square, `.` clear and `a` to `h` the inks.

{{tpl:draw:heart}}

{{templates:draw}} {{exports:draw}}

### diagram: a diagram drawn from a few lines

`kind:` in the head says which, and each is a list:

- `mind`: a nested list, the center then its branches.
- `org`: a nested list of `Name | Role`; a dotted line between two people is `~ Ben -- Eve: advises`.
- `family`: a nested list, a person or a couple each, `Rose + Albert Hale | m. 1948`.
- `lanes`: `- Who: what they do`, in order; a step ending in `?` is a decision.
- `timeline`: `- When: what happened`; dates or years are spaced as they fell, and a span (`- 2027-02-01 – 2027-08-02: Builders on site`) is a band.
- `venn`: `- Set: thing, thing` for two or three sets, `- A & B: thing` for what they share.
- `seating`: `- Table: Ann, Bob, Cy`.
- `net`: `~ A -> B: label` connections; `- name` a thing on its own.

What each is good for: `mind` ideas branching from one, `org` who reports to whom, `family` generations, `lanes` a process passed between people, `timeline` dates spaced as they fell, `venn` what two or three sets share, `seating` who sits where, `net` what talks to what.

The rules, before they are broken: a thing is a name, short (two to four words; a box holds no more), and its other words go in a child, in a connection's label, or in the notes. A connection's ends are names in the list, written exactly as the line writes them (the words before ` | `); in a tree an end naming no thing is not drawn, and a network makes a second thing of it. In a `net` a line is one thing named by the whole line: `- Header: the logo` is a thing called "Header: the logo", so write `- Header` and put "the logo" in a label. In `venn` and `seating` a comma separates things, a comma in a number too: "2,000 cases" is two things, so write 2000 or two thousand. A label is a few words: longer ones lie over each other. `lanes`, `timeline`, `venn` and `seating` draw no connections.

{{tpl:diagram:org-company}}

{{tpl:diagram:venn-pets}}

{{templates:diagram}} {{exports:diagram}}

### anim: a drawing that moves

A drawing's table, then a table `Shape | Keys`: for each moving shape (its row number from 0), keys separated by `; `, each `frame,dx,dy,depth,size,spin[,effects]`: where it is at that frame as an offset in pixels from where it was drawn, its depth (nearer when positive), its size as a scale (1 as drawn), its spin in degrees, and effect letters (`i` impact, `3` 3D, `d` shadow, `n` neon, `o` outline, `g` rainbow, `m` mirror, `w` wobble, `b` blur). Between keys it moves in straight lines. The head holds `frames` (2 to 120), `fps` (1 to 30) and `loop` (`once`, a number, or `bounce`; for ever otherwise).

{{tpl:anim:liftoff}}

{{templates:anim}} {{exports:anim}}

## Plans

### cal: a calendar, or a schedule

A list item per thing: `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`. Attributes give a color and a repeat: `{color=green every=week times=6}` (or `until=2027-06-01`). The head may hold a time zone, `zone: America/New_York`; without one the times are read in the reader's own zone. It may say what a color stands for: `green: Sam`. `view: gantt` in the head draws the same items as a schedule: an item nested under another is part of it, `{done=40%}` is how far along it is, `- [x]` that it is done.

{{tpl:cal:family}}

{{tpl:cal:project}}

{{templates:cal}} {{exports:cal}}

### trip: a route on a map

A table `Place | Lat:number | Lon:number | Note`, in decimal degrees. `units: km` or `units: miles` in the head (driving hours are estimated otherwise); `route: dots` for places that stand alone, not a route.

{{tpl:trip:portugal}}

{{templates:trip}} {{exports:trip}}

### board: cards in lanes by their status

A table, a card a row: the first column of words is its title, the others its fields, and the column named `Status` or `Stage` (else the first `:option` column, else the last) says which lane it is in. `lanes: To do, Doing, Done` in the head puts the lanes in that order and keeps a lane with no cards; a comma in a lane's name is written `\,`. Without it the lanes come in the order the rows first name them. Type the columns as a sheet's (`Value:money`, `Due:date`): a card shows them as the Spreadsheet does, and the same text opens in the Spreadsheet.

{{tpl:board:pipeline}}

{{templates:board}} {{exports:board}}

## Every app's files

Every document downloads as a `.pdf` (its pages as pictures; Print in the browser saves one with the words still words), a picture (`.png`), a web page (`.html`), Markdown (`.md`, footnotes in Markdown's reference form) and its own text (`.tlo`: the TLO with `app: <id>` in its head, which opens as its own app when dropped on the site). A `.zip` of `.tlo` and `.md` files, a folder per app, opens the same way when dropped: every document in it is kept on the device (with Save in browser off, listed to keep or to open). A link that downloads a file as it opens is `#/v1/<app>.<ext>/<payload>`, or `view=<ext>` in the plain form.

## Short links

The API below is this site's. Make a short link at the shortener of the site the link opens on, `tinier.<the site's host>`: the shortener opens only links to its own site. An agent on a development machine running its own copy of the site uses that site's `/tinier/` (the shortener started with `SITE` set to the site's address, `npm run tinier:dev`), and the link it makes opens there; production's shortener accepts only links to production.

A long link can be shortened at tinier.tinylittleoffice.com for an hour, a day, a week or a month. The link is encrypted where it is made (AES-256-GCM, a random key); only the ciphertext goes to the service, and the key travels in the short link's fragment, which browsers never send. A program can do the same:

```
POST https://tinier.tinylittleoffice.com/api   {c, iv, ttl}   → 201 {id, exp}
```

`c` and `iv` are the AES-GCM ciphertext of the long link and its 12-byte IV, base64url; `ttl` is 3600, 86400, 604800 or 2592000 seconds (a month at most). The short link is `https://tinier.tinylittleoffice.com/<id>#<key>` (the key as base64url). A short link cannot be changed or recalled once made; it expires on its own, so make a new one for a new version. The ciphertext may be 16 KiB at most (a link of at most 12,272 characters; `measure` says whether yours fits, `short: {fits, over}`, `over` the characters to cut), and one address may make a hundred links a day (the 101st is 429, with `Retry-After`).

## Who made it

The head may carry `created` (when the document was first written, to the minute) and `by` (who made it, a claim: nothing proves it). Write `by` to say who you are.

## Without a browser

The site serves its own API as a module, for programs and agents; in a browser, Deno or Bun it imports as it is:

```js
import { link, plain, read, text, compare, apps, templates } from 'https://tinylittleoffice.com/api.js';
const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget', by: 'planner-agent' });
read(url).text;                 // the document's TLO text, its title and by in the head
await text(url);                // what the document says, as Markdown: what a screen reader reads on its Display Link
compare(url, revised).changes;  // what the second link changed, block by block
await templates('deck');        // what a deck can start from
```

A document under a password: `await link(app, text, { seal: true })` (or `tinyoffice link --seal`) returns `{ url, password }`: the link holds only ciphertext, and the password is one the app made (twenty random characters). Give the person the password apart from the link, and tell them to send it another way than the link. You cannot choose the password: one handed in (`password:`, `--password`) is refused with "The app makes the password; ask for one with seal."

An agent that would rather send structure than write TLO can send JSON: `fromJson(json)` gives the TLO text (so `link(app, fromJson(json))`, or `tinyoffice link <app> --json doc.json`), and `toJson(text)` (`read(url).json`, `tinyoffice json <link>`) gives the kernel's document as JSON, a head and a list of blocks with their runs.
It is the same document, nothing added or renamed, to the JSON Schema at https://github.com/aboard-io/tinylittleoffice/blob/main/packages/doc/schema/tlo.schema.json; one that does not fit is refused, naming where (`blocks[2].runs[0].t is missing`).

Node does not import a module from a URL: in Node, use the command line, `npx tinylittleoffice` (the npm package `tinylittleoffice`, one file and no dependencies): `link`, `read` (`read --text` for what it says, as Markdown), `file`, `diff`, `lint`, `measure`, `apps`, `templates`.

To learn a shape by example rather than from these pages: `npx tinylittleoffice shapes deck` lists what a deck reads, a line a shape; `npx tinylittleoffice example deck two` prints the smallest document that shows it, its JSON (the kernel's document), and what `lint` and `measure` say of it (with no shape, every one of the app's); `npx tinylittleoffice try deck draft.tlo` (or `-` for stdin) is the loop in one call: the lint, the measures and the JSON of a draft. The API has the same three: `await shapes(app)`, `await example(app, shape)`, `await tryDraft(app, text)`. An agent that can only fetch reads the examples as files: `https://tinylittleoffice.com/examples/<app>.json` (every shape of the app, its text, its plain link and its JSON), and `https://tinylittleoffice.com/llms/<app>.txt`, a page on one app.

The words of a document may be in any language or script, right to left too (the kit sets the direction by the words): write for the reader. A link opens in its reader's browser's language; `link(app, text, { lang: 'ht' })` (or `--lang ht`) makes one that opens in Haitian Creole, or any language the site has (`es`, `pt-br`, `zh-hant`, `he`, `yi`, …), whatever the reader's browser says.

A page of your own can import `https://tinylittleoffice.com/tinyoffice.js` instead: `link({ app, doc, title })` writes the plain link and `embed({ app, doc, title })` the `<iframe>` that shows the document's pages. In the API, `encode`/`decode` are the codec, `parse`/`write` the kernel (the document as a head and blocks, and back), `tlo`/`fromTlo` a `.tlo` file's text, `file(app, text, ext)` a file of the app's own formats that needs no browser.

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

## Driving the editors

For an agent working in the editors in a browser: the keys each app answers, written from the apps' command registry (`Mod` is ⌘ on a Mac and Ctrl elsewhere; `at:` places are inside the app). Every command in force is also found by the menu's search (the hamburger), which Mod+K opens focused outside words.

{{commands}}
