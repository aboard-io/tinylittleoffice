---
name: tinyoffice
description: Make almost any small document as a shareable link by writing a Tiny Little Office URL: spreadsheets and charts, models of a small business, text, letters, résumés, contracts, invoices, slide decks, outlines, zines, booklets, brochures, comics, posters, name badges, drawings and pixel art, diagrams (mind map, org chart, family tree, swimlanes, timeline, Venn, seating chart, network), animations, kanban boards, to-do lists, calendars and Gantt schedules, trips on a map, websites of little pages and link-in-bio pages, shops, and a calculator that keeps its working. Use when someone asks for any of these and a link they can open, edit and share would serve them better than a file.
---

# Tiny Little Office links

Tiny Little Office (https://tinylittleoffice.com) is an office suite whose documents live entirely in their links. You make a document by writing a URL. Nothing is uploaded or stored: opening the link shows the document in an editor, whoever opens it can change it, and the address changes with every edit, so the new link is the new document. Nothing is sent to a server: the document sits after the `#`, which browsers never send.

Every document is one text in one format, TLO: Markdown with a few additions. If you can write Markdown you can write any app below; each section says which shapes that app reads, with one of its own templates as the example.

<!-- This file is written by scripts/make-skill.ts from SKILL.tpl.md: edit the template, then `npm run skill`. -->

## The URL

```
https://tinylittleoffice.com/<app>/#title=<title>&doc=<document>
```

- `<app>` is one of the apps below (the table's first column).
- `doc` is the document, URL-encoded: a new line is `%0A`, a space `+` or `%20`; `& # % + =` in the text must be percent-encoded. Non-ASCII is fine, percent-encoded as UTF-8.
- `title` (optional) is the document's name. `by` (optional) is who made it: your name as an agent, say. It is a claim: only a signature proves it (below).
- `view` (optional) opens the document another way: `pdf`, `png`, `html`, `md` or `tlo` download it as it opens, as do an app's own formats (listed under each app); `embed` is the pages alone, for a frame; on a deck, `show` opens it presenting.
- `md=` may stand for `doc=`: it is the same text (TLO is Markdown). With no app in the path or the head, `md=` opens a text in the Word Processor.
- The document's own head may name the app instead: a `doc` that begins `---%0Aapp: sheet%0A---` needs no app in the path (`https://tinylittleoffice.com/#doc=...`).

Put the parameters after `#`, exactly as shown, never after `?`. On opening, the link is rewritten into its packed form, `#/v1/<app>/<payload>`, which is what the person shares onward. Give them the link you wrote; they need not know its format.

Length: a QR code holds at most 2,953 characters and some chat apps cut a link past about 2,000. Keep the whole URL under 2,000 where you can; a short link (below) holds more.

The packed form: after `#/v1/<app>/` comes one letter and then base64url bytes (with `~` for 62 where RFC 4648 has `-`, so a pasted link never breaks at a hyphen; `-` is read too): the document's TLO text deflated against a dictionary of TLO's own words (`y`), deflated (`z`), or raw (`r`). `?d` after it opens the pages to read rather than the editor; `?show` opens a deck presenting; `#/v1/<app>.<ext>/…` downloads the file as it opens. You never need to make these by hand: the plain form becomes the shortest of them when opened, and the API below makes them directly.

## TLO: Markdown, and what it adds

Write ordinary Markdown: `#` headings, paragraphs, `- ` and `1. ` lists nested by two spaces, `- [ ]` and `- [x]` tasks, `> ` quotes, `---` rules, tables with a `--- | ---` line under their header row, and inline `**bold**`, `*italic*`, `~~strike~~`, `[words](https://…)`, `![what it shows](https://…picture)`. A footnote sits where it belongs: `^[the note's words]` (Markdown's `[^1]` with a `[^1]: the note` paragraph reads too). TLO adds:

| Write | Means |
| --- | --- |
| `---` / `key: value` lines / `---` at the very top | The head: the document's settings (`chart: bar`, `zone: Europe/London`, `theme: midnight`) and its `title` and `by` |
| `{#id .class key=value}` at the end of a line | Attributes: a layout (`{.title}`, `{.two}`), a setting for that line (`{due=2027-03-01}`) |
| `Price:money` in a table's header | A typed column: `text number money percent date time check url rich long icon name option` |
| `~ A -> B: label` | A connection between two things (`->`, `<-`, `<->`, `--`) |
| a code fence named for an app: ```` ```sheet ```` | Another document inside this one, written in that app's TLO: a chart on a slide, a table in a text |
| `==highlight==`, `++underline++`, `:icon-name:` | A highlight, an underline, an icon in the line (Lucide's names: `rocket`, `calendar`, `coffee`…) |
| a line that is only a web address | That thing from the web, as a card that loads it only when the reader taps it (a video, a post, a track, a map, a picture, a PDF) |
| a line that is only a link, `[The title](https://…)` | The same thing from the web, its card titled with your words: give every video and article a title, or its card says only "YouTube video" |

`---` between blocks starts the next slide, page or card. A table anywhere is a spreadsheet: its formulas work.

## The apps

{{apps}}

## Words

### write: a text

Markdown as it stands. `# Words {.title}` is the title, set large; `#` and `##` are headings; `{.center}`, `{.right}` or `{.justify}` at the end of a paragraph aligns it. A table works out its formulas; a fence named for an app holds that document. `paper: a4` or `letter` in the head sets the paper (a reader in North America gets letter otherwise). Notes are listed at the end, in the editor, on paper, in the web page and in Word. A contract is a text whose signatures follow in a `signatures` fence; an invoice is a text with its lines as a table.

{{tpl:write:meeting}}

{{templates:write}} {{exports:write}}

### outline: an outliner

A nested list, two spaces a level. An item's tie to its parent can be an arrow, `{.to}` (towards the parent) or `{.from}`, named with `label="…"`; any two items join with `~ Pricing -> Press: informs`. The same tree opens as slides, a mind map, an org chart or a network.

{{tpl:outline:launch}}

{{templates:outline}} {{exports:outline}} (the `.pdf` is the outline's words as sections and bullets, selectable and bookmarked)

## Slides and things to print

### deck: slides

A slide between each `---`. The headline is `## :icon-name: Headline`, its layout an attribute: `{.title}` (a title slide), `{.two}` (two columns, a paragraph `|` between them) or `{.icon}` (bullets beside one big icon). The words are `- ` bullets nested by two spaces; `> ` lines are speaker notes; a `^[footnote]` is shown at the foot of its slide. A sheet's table with `chart: bar` in its head, in a ```` ```sheet ```` fence, is a chart on the slide. The head may hold `theme:` (`boardroom`, `ivory`, `midnight`, `graphite`; for fun `confetti`, `sunset`, `ocean`, `bubblegum`, `arcade`, `chalkboard`; plain otherwise) and `transition:` (`cut`, `slide`, `zoom`; a fade otherwise).

The rules, before they are broken: a slide with a fence (a chart, a diagram, a table) is the fence's, drawn alone under the headline: bullets on it are not drawn, so put them in the notes (`> ` lines) or on a slide of their own. A headline is a few words; a long one is set smaller, then cut after two lines. Bullets are set as large as they fit, down to 14px; more than that runs off the slide, so split it. Presenting reveals one bullet, or one item of a fenced document, per step; the notes show with N or the Notes button, and start hidden under a finger. `{.title}` is a cover (the headline large, the bullets beneath it as its subtitle); `{.two}` two columns, `|` alone on a line between them; `{.icon}` the bullets beside the headline's icon, drawn large.

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

A table `Kind | X | Y | W | H | Style | Label`, a row per shape, on a grid of 8px squares. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `i` icon (its label is the icon's name), `l` line, `a` arrow (X, Y the start; W, H the distance to the end). `k` joins two shapes with an arrow and `j` with a line: their X and Y are the row numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid), then a colour letter (`r o g b p`) and a text size (`1` to `4`); a text (`t`) may end it with `=` to centre its words or `>` to set them right. `alt:` in the head describes the drawing for people who cannot see it. Prefer a diagram when one fits: it lays itself out.

{{tpl:draw:request}}

Pixel art: `grid: 16` (or 8, 32, 64) in the head, then a line per row and a letter per square, `.` clear and `a` to `h` the inks.

{{tpl:draw:heart}}

{{templates:draw}} {{exports:draw}}

### diagram: a diagram drawn from a few lines

`kind:` in the head says which, and each is a list:

- `mind`: a nested list, the centre then its branches.
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

### board: a kanban board

`## Stage` headings (`## Doing {limit=2 color=g}` holds two cards at most and colours the stage), each followed by a `- card` list; a task list indented under a card (`  - [ ] step`) is its checklist.

{{tpl:board:project}}

{{templates:board}} {{exports:board}}

### todo: a to-do list

`- [ ] task` and `- [x] done`. A star and a due date are attributes: `- [ ] Renew passport {.star due=2027-03-01}`.

{{tpl:todo:shopping}}

{{templates:todo}} {{exports:todo}}

### cal: a calendar, or a schedule

A list item per thing: `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`. Attributes give a colour and a repeat: `{color=green every=week times=6}` (or `until=2027-06-01`). The head holds the time zone, `zone: Europe/London`, and may say what a colour stands for: `green: Sam`. `view: gantt` in the head draws the same items as a schedule: an item nested under another is part of it, `{done=40%}` is how far along it is, `- [x]` that it is done.

{{tpl:cal:family}}

{{tpl:cal:project}}

{{templates:cal}} {{exports:cal}}

### trip: a route on a map

A table `Place | Lat:number | Lon:number | Note`, in decimal degrees. `units: km` or `units: miles` in the head (driving hours are estimated otherwise); `route: dots` for places that stand alone, not a route.

{{tpl:trip:portugal}}

{{templates:trip}} {{exports:trip}}

## The web

### site: a website of little pages, or a page of quick links

`# Name` and a line about it; each further `# Title` starts a page, `## Section` a part of one. `- :icon: Point | detail` makes a card, `> Label | https://…` a button (`#page-or-section` links within the site), a picture's address alone on a line a picture, `:icon:` alone a big icon, a fence another document. `theme:` in the head sets the look: `indigo teal rose amber ink forest ocean sunset plum candy olive slate paper typewriter midnight coal`, with `serif`, `sans`, `rounded` or `mono` to change the type and `dark` or `light` the mode (`theme: teal serif dark`). A table `Name | Price:money | About | Image` in a section is a shop with a cart; the head holds `currency: $` and `orders: someone@example.com`. `look: links` makes it a Quick Links page (a link-in-bio): one column, the buttons stacked, the list items small links at the foot.

{{tpl:site:cafe}}

{{tpl:site:links-maker}}

{{templates:site}} {{exports:site}}

## Every app's files

Every document downloads as a `.pdf` (its pages as pictures; Print in the browser saves one with the words still words), a picture (`.png`), a web page (`.html`), Markdown (`.md`, footnotes in Markdown's reference form) and its own text (`.tlo`: the TLO with `app: <id>` in its head, which opens as its own app when dropped on the site or opened from its menu). A `.zip` of `.tlo` and `.md` files, a folder per app as the site's Download everything writes it, opens the same way: every document in it is kept on the device (under Private, listed to keep or to open). A link that downloads a file as it opens is `#/v1/<app>.<ext>/<payload>`, or `view=<ext>` in the plain form.

## Short links

The API below is this site's. Make a short link at the shortener of the site the link opens on, `tinier.<the site's host>`: the shortener opens only links to its own site. An agent on a development machine running its own copy of the site uses that site's `/tinier/` (the shortener started with `SITE` set to the site's address, `npm run tinier:dev`), and the link it makes opens there; production's shortener accepts only links to production.

A long link can be shortened at tinier.tinylittleoffice.com for an hour, a day, a week, a month or a year. The link is encrypted where it is made (AES-256-GCM, a random key); only the ciphertext goes to the service, and the key travels in the short link's fragment, which browsers never send. A program can do the same:

```
POST https://tinier.tinylittleoffice.com/api   {c, iv, ttl, owner}   → 201 {id, exp}
```

`c` and `iv` are the AES-GCM ciphertext of the long link and its 12-byte IV, base64url; `ttl` is 3600, 86400, 604800, 2592000 or 31536000 seconds; `owner` is base64url(sha256(o)) for 32 random bytes `o` you keep. The short link is `https://tinier.tinylittleoffice.com/<id>#<key>` (the key as base64url); `…#<key>.<o>` is the owner's link, which can update (`PUT /api/<id> {c, iv, o, ttl?}`: a new version under the same link) or forget it (`DELETE /api/<id> {o}`). The ciphertext may be 16 KiB at most.

## Who made it: the signed head

The head may carry `created` (when the document was first written, to the minute), `by` (who made it, a claim), and, once signed in the app, `key` (the signer's public key) and `sig` (a signature over the document). The app checks the signature on opening: a document changed after it was signed shows that it no longer matches. Never write `key` or `sig` yourself; write `by` to say who you are.

## Without a browser

The site serves its own API as a module, for programs and agents; nothing to install:

```js
import { link, plain, read, compare, apps, templates } from 'https://tinylittleoffice.com/api.js';
const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget', by: 'planner-agent' });
read(url).text;                 // the document's TLO text, its title and by in the head
compare(url, revised).changes;  // what the second link changed, block by block
await templates('deck');        // what a deck can start from
```

A page of your own can import `https://tinylittleoffice.com/tinyoffice.js` instead: `link({ app, doc, title })` writes the plain link and `embed({ app, doc, title })` the `<iframe>` that shows the document's pages. In the API, `encode`/`decode` are the codec, `parse`/`write` the kernel (the document as a head and blocks, and back), `tlo`/`fromTlo` a `.tlo` file's text, `file(app, text, ext)` a file of the app's own formats that needs no browser. In a clone of github.com/ftrain/tinyoffice, `node packages/doc/tinyoffice.ts` is the same from the command line: `link`, `read`, `file`, `diff`, `lint`, `measure`, `apps`, `templates`.

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
- `picture-indirect`: a picture asked for at a page rather than the picture itself (Commons' `Special:FilePath` or a `File:` page): it redirects, the picture proxy does not follow it, and the slide shows the picture's card instead. Use the file's own `upload.wikimedia.org` address.
- `length`: a link past 2,000 characters, which some chat apps cut.

A diagram fenced on a slide is linted too, at its slide. `tinyoffice measure <link or file>` (`measure(app, text)`) gives the numbers behind them as JSON: per slide, the headline's and the words' sizes, the lines they wrapped to, what was cut and the bullets a document hides, what it shows (`shows`) and, for a thing from the web, its `embed`: kind, provider and the title its card will say; per diagram, its things, its connections drawn and dropped, and each label's size, lines and whether it was cut; per table, its formulas and the ones that fail. Set your words from these numbers. `read` gives back the text exactly as written, so what you wrote is what the link holds. You never need a browser or a screenshot to check a document: the lint and the measures come from the same layout code that draws the pages. If you do open a development copy of the site, pictures from the web show there only while its picture proxy runs (`npm run media:dev`, with `SITE` set to the site's address), as short links need its shortener (`npm run tinier:dev`); without it every web picture is its card.

## Driving the editors

For an agent working in the editors in a browser: the keys each app answers, written from the apps' command registry (`Mod` is ⌘ on a Mac and Ctrl elsewhere; `at:` places are inside the app). Every command in force is also in the command palette, Mod+K (outside words) or the button at the end of the bar.

{{commands}}

## Choosing an app

- Numbers, a table, a chart, a model: `sheet`. A quick sum or a conversion: `calc`.
- Words to read or print: `write`. Notes in a tree: `outline`. Something to present: `deck`. A poster, a zine, badges: `deck` with a `format`.
- Ideas branching from one topic: `diagram` `mind`. People and reporting lines: `org`. A process with handoffs: `lanes`. Dates along a line: `timeline`. Overlaps: `venn`. Who sits where: `seating`. What talks to what: `net`.
- A wall of work in stages: `board`. Things to tick off: `todo`. Days and times: `cal`; tasks over weeks: `cal` with `view: gantt`. Places in order: `trip`.
- Something to publish: `site`. Anything else visual: `draw`; moving: `anim`.

## Good practice

- URL-encode `doc` and `title`; check that `#`, `&`, `%`, `+` and `=` in the content are encoded.
- Give the link as a Markdown link with a plain description: `[Sales by quarter (chart)](https://...)`.
- Say that the link is the document: editing it changes the link, and anyone with the link can read it.
