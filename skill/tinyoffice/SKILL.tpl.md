---
name: tinyoffice
description: Make almost any small document as a shareable link by writing a TinyLittleOffice URL: spreadsheets and charts, text, slide decks, outlines, business/marketing/go-to-market plans, drawings and diagrams (org chart, mind map, swimlanes, Venn, network, seating, family tree, timeline), calendars, to-do lists, kanban boards, Gantt charts, map routes, websites of little pages, link-in-bio pages, shops, invoices, contracts, zines, booklets, brochures, comics, posters, name badges, models of a small business (a sheet with named cells, drawn as a Sankey), training logs, a calculator (mortgage, investment, cash flow, interest, graphs), pixel art, word searches, spinners, Secret Santa draws, bill splitting and more. Use when someone asks for any of these and a link they can open, edit and share would serve them better than a file.
---

# TinyLittleOffice links

TinyLittleOffice (https://tinylittleoffice.com) is an office suite whose documents live entirely in their links. You make a document by writing a URL. Nothing is uploaded or stored: opening the link shows the document in an editor, and whoever opens it can change it and share the new link.

Every document is written in one format, TLO: Markdown, with a few additions. If you can write Markdown, you can write any of the apps below; each section says which Markdown shapes that app reads.

## The URL

```
https://tinylittleoffice.com/<app>/#title=<title>&doc=<document>
```

- `<app>` is one of the apps below.
- `doc` is the document: TLO (Markdown), URL-encoded. A new line is `%0A`, a space is `+` or `%20`, and `& # % + =` inside the text must be percent-encoded. A CSV works too, as a table.
- `title` is optional: the document's name. `by` is optional: who made it (your name as an agent, say), shown as a claim; a signature proves it.
- `view` is optional: `show` opens a deck presenting, `embed` shows the document alone (for an iframe), and `pdf`, `png`, `html`, `md` or `tlo` download it.
- The document's own header may carry these instead, and name the app: a `doc` that starts `---%0Aapp: sheet%0Atitle: Budget%0A---` needs no other parameters (`https://tinylittleoffice.com/#doc=...`).

Put the parameters after `#`, exactly as shown, never after `?`. The part of an address after `#` stays in the browser: it is not sent to the server, so the document is never logged anywhere.

On opening, the link is rewritten into a compact form, which is what the person will share onward. Give them the link you wrote; they do not need to know its format.

Length: a QR code holds at most 2,953 characters, and some chat apps cut a link past about 2,000. Keep the whole URL under 2,000 where you can. Non-ASCII characters are fine: percent-encode them as UTF-8.

## TLO: Markdown, and what it adds

Write ordinary Markdown: `#` headings, paragraphs, `- ` and `1. ` lists nested by two spaces, `- [ ]` and `- [x]` tasks, `> ` quotes, `---` rules, tables with a `--- | ---` line under their header, and inline `**bold**`, `*italic*`, `~~strike~~`, `[words](https://…)`. TLO adds:

| Write | Means |
| --- | --- |
| `---` / `key: value` lines / `---` at the very top | The header: the document's settings (`chart: bar`, `currency: $`, `zone: Europe/London`), and its `title` and `by` |
| `{#id .class key=value}` at the end of a line | Attributes: a layout (`{.title}`, `{.two}`), a setting for that line (`{due=2027-03-01}`) |
| `Price:money` in a table's header | A typed column: `text number money percent date time check url rich name` |
| `~ A -> B: label` | A connection between two things (`->`, `<-`, `<->`, `--`) |
| a code fence named for an app: ```` ```sheet ```` | Another document inside this one, written in that app's TLO: a chart on a slide, a table in a text |
| `==highlight==`, `++underline++`, `:icon-name:` | A highlight, an underline, a Lucide icon in the line |

`---` between blocks starts the next slide, page or card. A Markdown table in a text or on a slide becomes a spreadsheet.

## Apps and their shapes

### sheet: a spreadsheet, and charts

One table. Its header row names the columns, each optionally typed (`Sales:money`); the rows under it are rows 1, 2, 3, so `=SUM(B1:B3)` adds the first three. Up to 6 columns. A cell starting with `=` is a formula: `+ - * / ^`, comparisons, references (`B2`), ranges (`A1:A5`), and `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN INT ABS SQRT MOD NPV IRR PMT FV PV TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY`. Dates are written `2027-03-01` in a `date` column and count in days. `chart: bar` (or `line`, `pie`) in the header draws the labels in the first column against the numbers beside them; `chart: sankey` draws rows of `From | To | Amount` (the columns found by those names, else the first three) as flows. A model is a sheet: a column typed `name` (`Assumption:name`) names the cell to its right, and formulas use the names (`=visitors*signup_rate/100`; a space is `_`); `SUMIF(B1:B20, "Signups", C1:C20)` totals what flows into a stock; `lock: C1:C6, E7` in the header marks the formulas as the model's own, so a reader changes the assumptions and not the model. `SUMIF` and `COUNTIF` take `"words"`, a cell, or `">6"`. The sheet templates (`templates('sheet')` in the API) include a subscription business, a café, a freelancer, a mutual aid fund and a training log, ready to fill in.

{{doc:sheet:Sales by quarter}}
---
chart: bar
---
Quarter | Sales:money
--- | ---
Q1 | 120
Q2 | 180
Q3 | 240
{{end}}

{{doc:sheet:Lemonade stand}}
---
chart: sankey
lock: C1:C3
---
From | To | Amount:number | Assumption:name | Value:number
--- | --- | --- | --- | ---
Passers-by | Buyers | =passers_by*buy_rate/100 | Passers-by | 400
Buyers | Takings | =buyers*price | Buy rate | 15
Takings | Lemons | =lemons | Price | 2
| |  |  | Lemons | 25
| |  |  | Buyers | =SUMIF(B1:B9, "Buyers", C1:C9)
{{end}}

{{doc:sheet:Budget}}
Item | Cost:money
--- | ---
Rent | 1200
Food | 450
Total | =SUM(B1:B2)
{{end}}

### write: a text

Markdown as it stands. `# Words {.title}` is the title, set large; `#` and `##` are headings; `{.center}`, `{.right}` or `{.justify}` at the end of a paragraph aligns it. A table is an embedded sheet; a fence named for an app embeds that document. A line that is only the address of a YouTube or Vimeo video, a Bluesky or X post, or a Markdown image `![what it shows](address)` is that thing, as a card that loads it only when tapped (in an outline, such an item; on a slide, the whole slide). `paper: a4` or `letter` in the header sets the PDF's paper. **contract** is written the same way, its signatures following in a `signatures` fence.

{{doc:write:Meeting notes}}
# Meeting notes

We agreed on **three things**.

- Ship on Friday
  - Ben owns the release
- Review pricing
{{end}}

### outline: an outliner

A nested list, two spaces a level. The same list opens as `mind`, `org` and `family`, and the outline can be seen as a `deck`. An item's tie to its parent can be an arrow, `{.to}` (towards the parent) or `{.from}`, named with `label="…"`; any two items join with `~ Pricing -> Press: informs`.

{{ex:outline:Launch}}

### deck: slides

A slide between each `---`. The headline is `## :icon-name: Headline`, with its layout as an attribute: `{.title}` (a title slide: the headline and a line under it), `{.two}` (two columns, a paragraph `|` between them) or `{.icon}` (bullets beside one big icon). The words are `- ` bullets, nested by two spaces; `> ` lines are speaker notes. A chart or another document is a fence: a sheet's table with `chart: bar` in its header becomes a chart on the slide. The header may hold `theme: midnight` (or boardroom, ivory, graphite; for fun confetti, sunset, ocean, bubblegum, arcade, chalkboard; plain otherwise), `transition: cut` (or `slide`, `zoom`; a fade otherwise), `color: red` and `qr: no` (every deck otherwise ends with a QR code of itself). A model's `# Title` and `## Slide` headings without rules read as a deck too.

{{doc:deck:Launch plan}}
## :rocket: Launch plan {.title}

- Spring 2027

---

## :target: Goals

- Ship the beta
- Sign ten customers

---

## Now and next {.two}

- Design
- Build

|

- Test
- Launch

---

## Sales so far

```sheet
---
chart: bar
---
Quarter | Sales
--- | ---
Q1 | 120
Q2 | 180
```
{{end}}

### org: an org chart

A nested list of `Name | Role`. A dotted line between two people is `~ Ben -- Eve: advises`.

{{ex:org:Team}}

### mind: a mind map

A nested list: the centre, then its branches.

{{ex:mind:Launch}}

### lanes: a swimlane process

`- Who: what they do`, in order. A step ending in `?` is a decision.

{{ex:lanes:Order to delivery}}

### venn: a Venn diagram

`- Set: thing, thing` for each of two or three sets, and `- A & B: thing` for what they share.

{{ex:venn:Pick two}}

### net: a network diagram

Connections: `~ A -> B: label` for an arrow, `~ A -- B` for a line. `- name` is a node on its own.

{{ex:net:System}}

### site: a website of little pages

`# Name` and a line about it; each further `# Title` starts a page, `## Section` a part of one. `- :icon: Point | detail` makes a card, `> Label | https://…` a button (`#page-or-section` links within the site), a line that is only a picture's address a picture, a line that is only `:icon:` a big icon, and a fence another document. `theme: forest` in the header sets the look: one of indigo, teal, rose, amber, ink, forest, ocean, sunset, plum, candy, olive, slate, paper, typewriter, midnight, coal (each its own colours, type and corners), with `serif`, `sans`, `rounded` or `mono` to change the type and `dark` or `light` to change the mode (`theme: teal serif dark`).

{{ex:site:Harbor Coffee}}

A table `Name | Price:money | About | Image` in a section is a shop: a grid of products with a cart. The header holds `currency: $` and `orders: someone@example.com` (where orders are emailed).

### links: a link-in-bio page

`# Name`, `![](https://… a picture)` (or `:icon:` for a big icon), a line about you; `> :icon: Label | https://…` for each button; `- :camera: Instagram | https://…` for a small icon at the foot; `theme: candy` for the look, the same themes as a website's. Icons are from the suite's own set (camera, film, music, mail, globe, phone, map-pin, calendar, cart, book…).

{{ex:links:Ada Diaz}}

### invoice: an invoice

The header holds `from`, `to`, `number`, `date`, `due`, `tax` (`8%`) and `currency`; ` | ` starts a second line of an address. The lines are a table `What | Qty:number | Units | Price:money`; paragraphs after it are notes. The totals are worked out, and the PDF download is the invoice.

{{ex:invoice:Invoice 0042}}

### gantt: a schedule

A table `Task | Start:date | Days:number | Done:percent`. A task that is part of the one above starts its name with `- `.

{{ex:gantt:Website relaunch}}

### board: a kanban board

`## Stage` headings (`## Doing {limit=2 color=g}` limits it to two cards and colours the stage: b o g p r s y), each followed by a `- card` list; a card is a line of inline Markdown, and a task list indented under it (`  - [ ] step`) is its checklist.

{{ex:board:Sprint}}

### todo: a task list

`- [ ] task` and `- [x] done`. A due date and a star are attributes: `- [ ] Renew passport {.star due=2027-03-01}`.

{{doc:todo:Trip prep}}
- [ ] Renew passport {.star due=2027-03-01}
- [ ] Book flights
- [x] Choose dates
{{end}}

### cal: a calendar

A list item per thing: `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`. Attributes give a colour and a repeat: `{color=green every=week times=6}`. The header holds the time zone, `zone: Europe/London`, and may name colours: `green: Sam`.

{{doc:cal:March}}
---
zone: Europe/London
---
- 2027-03-01 to 2027-03-03: Offsite {color=green}
- 2027-03-08: Launch day
- 2027-03-10 09:00-10:30: Retro
{{end}}

### trip: a route on a map

A table `Place | Lat:number | Lon:number | Note`, in decimal degrees. `units: km` or `units: miles` in the header (otherwise driving hours are estimated); `route: dots` for stops that stand alone, not joined in order.

{{ex:trip:Portugal}}

### draw: a free drawing

A table `Kind | X | Y | W | H | Style | Label`, a row per shape, on a grid 80 wide and 50 tall. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `l` line, `a` arrow; `v` any shape and `w` an open stroke, their corners in a last column `Points` as hundredths of the box (`0:0;50:100;100:0`). `k` joins two shapes with an arrow and `j` with a line: their X and Y are the row numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid) optionally followed by a colour letter (`r o g b p`) and a text size (`1` to `4`). `alt:` in the header describes the drawing for people who cannot see it. Prefer the diagram apps above when one fits: they lay themselves out.

{{doc:draw:Request flow}}
---
alt: A browser asks a server, which reads the data
---
Kind | X | Y | W | H | Style | Label
--- | --- | --- | --- | --- | --- | ---
o | 4 | 6 | 16 | 8 | 1b | Browser
o | 32 | 6 | 16 | 8 | 1b | Server
c | 60 | 5 | 14 | 10 | 1g | Data
k | 0 | 1 | 0 | 0 | 0 | asks
k | 1 | 2 | 0 | 0 | 0 | reads
{{end}}

### anim: a drawing that moves

A drawing's table, then a table `Shape | Keys`: for each moving shape (its row number), keys separated by `; `, each `frame,dx,dy,depth,size,spin[,effects]`: where it is at that frame, as an offset in pixels from where it was drawn, its size as a scale (1 is as drawn), its spin in degrees, and effect letters (`i` impact meme, `3` 3D, `d` shadow, `n` neon, `o` outline, `g` rainbow, `m` mirror, `w` wobble, `b` blur). Between keys it moves in straight lines. The header holds `frames` (up to 120) and `fps` (4, 8 or 12).

{{ex:anim:Lift off}}

## Calculator

`calc`: the header names the mode, `mode: graph` (or `mortgage`, `invest`, `cashflow`, `interest`; the calculator itself needs none). For the calculator and the grapher, an expression per line (`2+3*4`, `sqrt(16)`, `sin(x)`); a line `name = expression` keeps its answer under that name for the lines after it, and `ans` is the line before; for the money modes, `- name = value` items: mortgage `price deposit rate years`, invest `start monthly return years`, cashflow `rate` and `year 0 = -100000`, interest `principal rate years times`.

{{ex:calc:Our mortgage}}

## Plans, and templates

Business, marketing and go-to-market plans are `write` texts: open an empty Write document and "Start from a template" gives the sections and the questions each should answer. The API's `templates(app)` lists them.

## Things to print

Each of these lays a few lines out on letter-size sheets; the PDF download prints at actual size. They are written like a deck: a page between each `---`, a `## Headline` (with an `:icon:` if you like), then paragraphs or `- ` bullets.

- `poster`: one page, as big as the page allows.
- `zine` (8 pages), `booklet` (8 to 20) and `brochure` (6 panels).
- `badges`: a page per person, the name as the headline.
- `comic`: a panel per bullet, `- :icon-name: What is said | caption`.
- `wordsearch`: `# Title` and the words as a `- ` list.

{{ex:poster:Open mic}}

{{ex:zine:Small Joys}}

{{ex:comic:Biscuit}}

## Small apps

- `pixel` (16×16): a line per row, a letter per square; `.` empty, `a` black, `b` indigo, `c` red, `d` orange, `e` yellow, `f` green, `g` sky, `h` pink.
- `seating`: `- Table: Ann, Bob, Cy`. `family`: a nested list, a person or couple per item. `timeline`: `- When: what happened`, in order; years or dates are spaced as they fell, and a span (`- 1990–1999: The nineties`) is a band along the foot.
- Games: `spinner` (a `- ` list of choices), `wordsearch`.
- Together: `santa` (the people as a `- ` list; each gets a private link to their own draw), `split` (`between: A, B, C` in the header, and a table `Who | Amount:money | What`).

{{ex:timeline:Computing}}

## A document's own QR code

In `write`, `deck` and the print apps, a fence ```` ```qr ```` holding `@self` is a QR code of the very document it sits in, drawn from the live link. Readers scan it and have their own copy. The editors offer it as "QR code of this document" in Insert.

## Shorter links

A long link can be shortened at tinier.tinylittleoffice.com (Share → "Shorter link that expires…"), for an hour to a month. The document is encrypted in the browser; the key is in the short link after `#`, so the server holds only ciphertext. Programs can do the same: `POST https://tinier.tinylittleoffice.com/api` with `{c, iv, ttl}` (AES-GCM ciphertext and IV, base64url; ttl 3600, 86400, 604800 or 2592000) returns `{id, exp}`; the short link is `https://tinier.tinylittleoffice.com/<id>#<key base64url>`.

## How a link is packed

After `#/v0/<app>/` comes one letter and then base64url bytes: the document's TLO text, header and all, deflated against a dictionary of TLO's own words (`y`), deflated (`z`) or raw (`r`). `E` is a password-sealed link. You never need to make these: the plain form (`#title=…&doc=…`) is turned into the shortest of them when opened. A `.tlo` file is the same text, with `app:` in its header.

## Choosing an app

- Numbers, a table, or a chart: `sheet`.
- People and reporting lines: `org`. Ideas branching from one topic: `mind`. Notes in a tree: `outline`.
- A process with handoffs: `lanes`. Systems and what talks to what: `net`. Overlapping categories: `venn`.
- Dates and durations: `gantt` for tasks, `cal` for events.
- A wall of ideas or a retro: `board`. Something to publish: `site`, `links`, `invoice`.
- Anything else visual: `draw`.

## Without a browser

The site serves its own API as a module, for programs and agents; nothing to install:

```js
import { link, parse, lint, compare, evaluateSheet, runModel, searchIcons, templates } from 'https://tinylittleoffice.com/api.js';
const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200', { title: 'Budget', by: 'planner-agent' });
parse(url).markdown;                 // the document's TLO text, its name in the header
await lint('deck', body);            // unknown icons, a layout that does not exist, a link too long for a QR code
templates('deck');                   // what an empty deck can start from
```

It runs in Node 22+, Deno, Bun and a browser. Types are at `/api.d.ts`. `signed`/`verified` sign and check a link; `sealed`/`open` lock one under a password. The source is github.com/ftrain/tinyoffice.

## Good practice

- Always URL-encode `doc` and `title`. Check that `#`, `&`, `%`, `+` and `=` in the content are encoded.
- Give the link as a Markdown link with a plain description: `[Sales by quarter (chart)](https://...)`.
- Say that the link is the document: editing it changes the link, and anyone with the link can read it.
