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

The packed form: after `#/v1/<app>/` comes one letter and then base64url bytes: the document's TLO text deflated against a dictionary of TLO's own words (`y`), deflated (`z`), or raw (`r`). `?d` after it opens the pages to read rather than the editor; `?show` opens a deck presenting; `#/v1/<app>.<ext>/…` downloads the file as it opens. You never need to make these by hand: the plain form becomes the shortest of them when opened, and the API below makes them directly.

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

`---` between blocks starts the next slide, page or card. A table anywhere is a spreadsheet: its formulas work.

## The apps

| App | Name | For |
| --- | --- | --- |
| `write` | Word Processor | Words on a page: headings, lists, links and notes, a table that adds up, printed on letter or A4. |
| `outline` | Outliner | An outliner: ideas under ideas, folded and unfolded, moved about and joined; the same tree a deck or a mind map reads. |
| `deck` | Presentation Builder | Slides: titles, bullets, two columns, big icons, other documents on a slide; or a zine, booklet, brochure, comic, poster or name badges to print and fold. |
| `sheet` | Spreadsheet | A spreadsheet with formulas, named cells and charts; three columns to start, more as you need them. |
| `calc` | Calculator | A calculator that keeps its working: names, units and conversions, and graphs of y = f(x). |
| `draw` | Drawing Tool | Boxes, arrows, icons and labels on a grid; or pixel art, which can become a background tile. |
| `diagram` | Diagram Maker | Mind maps, org charts, family trees, swimlanes, timelines, Venns, seating charts and networks, drawn from a few lines. |
| `anim` | Animator | Anything from the Drawing Tool, moving: position, depth, size, spin and turn over time, with effects for memes. |
| `board` | Kanban Board | A kanban board: the stages of a workflow, cards, and limits per stage. |
| `todo` | To-Do List | Tasks to tick off, with stars and due dates. |
| `cal` | Calendar | Days and times on a month, a year or a schedule, in any time zone. |
| `trip` | Trip Planner | A route on a map: stops in order, each with a note, and how far between them. |
| `site` | Website Builder | A website of little pages, or a page of quick links, downloaded as a single HTML file; a shop with a cart if you list what you sell. |

## Words

### write: a text

Markdown as it stands. `# Words {.title}` is the title, set large; `#` and `##` are headings; `{.center}`, `{.right}` or `{.justify}` at the end of a paragraph aligns it. A table works out its formulas; a fence named for an app holds that document. `paper: a4` or `letter` in the head sets the paper (a reader in North America gets letter otherwise). Notes are listed at the end, in the editor, on paper, in the web page and in Word. A contract is a text whose signatures follow in a `signatures` fence; an invoice is a text with its lines as a table.

Meeting notes:

```
# Launch meeting {.title}

*Monday 5 October 2026 · The studio · Mara, Sam, Dee*

## Agenda

1. Where the site stands
2. The words for the pages
3. Launch day

## Notes

The build is on time: four of the six pages are done. Sam has the words for the home page; the other five are still with Acme.

## Decisions

- We launch on Friday 4 December at ten in the morning.
- Dee owns the launch checklist.

## Actions

- [ ] Sam: chase Acme for the five pages by 16 October
- [ ] Mara: send the invoice for the first half
- [x] Dee: book the launch call
```

As a link: <https://tinylittleoffice.com/write/#doc=%23+Launch+meeting+%7B.title%7D%0A%0A%2AMonday+5+October+2026+%C2%B7+The+studio+%C2%B7+Mara%2C+Sam%2C+Dee%2A%0A%0A%23%23+Agenda%0A%0A1.+Where+the+site+stands%0A2.+The+words+for+the+pages%0A3.+Launch+day%0A%0A%23%23+Notes%0A%0AThe+build+is+on+time%3A+four+of+the+six+pages+are+done.+Sam+has+the+words+for+the+home+page%3B+the+other+five+are+still+with+Acme.%0A%0A%23%23+Decisions%0A%0A-+We+launch+on+Friday+4+December+at+ten+in+the+morning.%0A-+Dee+owns+the+launch+checklist.%0A%0A%23%23+Actions%0A%0A-+%5B+%5D+Sam%3A+chase+Acme+for+the+five+pages+by+16+October%0A-+%5B+%5D+Mara%3A+send+the+invoice+for+the+first+half%0A-+%5Bx%5D+Dee%3A+book+the+launch+call>

Templates: A letter, Cover letter, Memo, Meeting notes, Minutes, Résumé, One-page CV, Invoice, Contract, Newsletter, Recipe, Questions and answers, Press release, News article, Interview, Book review, Music review, Thesis, Grant proposal, Syllabus, Formal complaint, Letter to a politician, Love letter, Wedding speech, Eulogy, Zine essay, Petition, Terms of service. Its own files: `.docx`, `.md`, `.rtf`, `.html`.

### outline: an outliner

A nested list, two spaces a level. An item's tie to its parent can be an arrow, `{.to}` (towards the parent) or `{.from}`, named with `label="…"`; any two items join with `~ Pricing -> Press: informs`. The same tree opens as slides, a mind map, an org chart or a network.

Launch plan:

```
---
title: Fieldnote 2.0 launch
---
- Fieldnote 2.0, out on Thursday 12 November
  - Product
    - Pricing {.from label=sets}
      - £4 a month or £36 a year; free for students^[Three rivals checked in September: £3 to £6 a month.]
    - Onboarding
      - Three screens, then straight to the first note
    - Freeze the build on Monday 2 November
  - Marketing
    - Press
      - Review copies to six writers on 5 November, embargoed to the 12th
    - Newsletter
      - To 4,200 readers at 8 am on launch day
    - A ninety-second film of a note being made
  - Support
    - Help pages
      - Twelve of them, the five most asked about first
    - A reply within a day, Priya and Tom taking turns

~ Pricing -> Press: informs
~ Help pages -> Newsletter: linked from
```

As a link: <https://tinylittleoffice.com/outline/#doc=---%0Atitle%3A+Fieldnote+2.0+launch%0A---%0A-+Fieldnote+2.0%2C+out+on+Thursday+12+November%0A++-+Product%0A++++-+Pricing+%7B.from+label%3Dsets%7D%0A++++++-+%C2%A34+a+month+or+%C2%A336+a+year%3B+free+for+students%5E%5BThree+rivals+checked+in+September%3A+%C2%A33+to+%C2%A36+a+month.%5D%0A++++-+Onboarding%0A++++++-+Three+screens%2C+then+straight+to+the+first+note%0A++++-+Freeze+the+build+on+Monday+2+November%0A++-+Marketing%0A++++-+Press%0A++++++-+Review+copies+to+six+writers+on+5+November%2C+embargoed+to+the+12th%0A++++-+Newsletter%0A++++++-+To+4%2C200+readers+at+8+am+on+launch+day%0A++++-+A+ninety-second+film+of+a+note+being+made%0A++-+Support%0A++++-+Help+pages%0A++++++-+Twelve+of+them%2C+the+five+most+asked+about+first%0A++++-+A+reply+within+a+day%2C+Priya+and+Tom+taking+turns%0A%0A~+Pricing+-%3E+Press%3A+informs%0A~+Help+pages+-%3E+Newsletter%3A+linked+from>

Templates: Packing list, A decision, Launch plan, A talk, A speech, An essay plan, A research plan, A syllabus, A novel, A book, A company, A family, A decision tree, Troubleshooting. Its own files: `.opml`, `.md`, `.pdf`, `.txt`. (the `.pdf` is the outline's words as sections and bullets, selectable and bookmarked)

## Slides and things to print

### deck: slides

A slide between each `---`. The headline is `## :icon-name: Headline`, its layout an attribute: `{.title}` (a title slide), `{.two}` (two columns, a paragraph `|` between them) or `{.icon}` (bullets beside one big icon). The words are `- ` bullets nested by two spaces; `> ` lines are speaker notes; a `^[footnote]` is shown at the foot of its slide. A sheet's table with `chart: bar` in its head, in a ```` ```sheet ```` fence, is a chart on the slide. The head may hold `theme:` (`boardroom`, `ivory`, `midnight`, `graphite`; for fun `confetti`, `sunset`, `ocean`, `bubblegum`, `arcade`, `chalkboard`; plain otherwise) and `transition:` (`cut`, `slide`, `zoom`; a fade otherwise).

`format:` in the head makes the deck a thing to print and fold, a page between each `---`: `poster` (one page, as big as the page allows), `zine` (8 pages), `booklet` (8 to 20), `brochure` (6 panels), `comic` (a panel per bullet, `- :icon-name: What is said | caption`) or `badges` (a page per person, the name as the headline).

Status update:

```
---
theme: boardroom
---
## :calendar: Acme Ltd site: status {.title}

- Week of 2 November 2026 · Harbor Studio

---

## This week and next {.two}

- Done: the six pages sketched and agreed
- Done: words for home, about and contact
- Done: hosting set up, the old address kept

|

- Next: words for work, prices and news
- Next: photographs on Thursday morning, weather allowing
- Next: first build shown on Friday 13 November

> Left, what shipped; right, what is planned. Keep it to the facts.

---

## :warning: Risks

- The price list is still being decided by Acme: the prices page waits on it
- Thursday may rain: Saturday is the fallback for photographs

---

## :help: Asks

- Dee Okafor to send the final prices by Wednesday 11 November
- Someone from Acme at the Friday read-through, an hour
```

As a link: <https://tinylittleoffice.com/deck/#doc=---%0Atheme%3A+boardroom%0A---%0A%23%23+%3Acalendar%3A+Acme+Ltd+site%3A+status+%7B.title%7D%0A%0A-+Week+of+2+November+2026+%C2%B7+Harbor+Studio%0A%0A---%0A%0A%23%23+This+week+and+next+%7B.two%7D%0A%0A-+Done%3A+the+six+pages+sketched+and+agreed%0A-+Done%3A+words+for+home%2C+about+and+contact%0A-+Done%3A+hosting+set+up%2C+the+old+address+kept%0A%0A%7C%0A%0A-+Next%3A+words+for+work%2C+prices+and+news%0A-+Next%3A+photographs+on+Thursday+morning%2C+weather+allowing%0A-+Next%3A+first+build+shown+on+Friday+13+November%0A%0A%3E+Left%2C+what+shipped%3B+right%2C+what+is+planned.+Keep+it+to+the+facts.%0A%0A---%0A%0A%23%23+%3Awarning%3A+Risks%0A%0A-+The+price+list+is+still+being+decided+by+Acme%3A+the+prices+page+waits+on+it%0A-+Thursday+may+rain%3A+Saturday+is+the+fallback+for+photographs%0A%0A---%0A%0A%23%23+%3Ahelp%3A+Asks%0A%0A-+Dee+Okafor+to+send+the+final+prices+by+Wednesday+11+November%0A-+Someone+from+Acme+at+the+Friday+read-through%2C+an+hour>

Poster:

```
---
format: poster
---
## :music: Open mic night {.title}

- Friday 13 November, 8pm
- The Anchor, 14 Quay Street
- Free. Bring a song, a poem, or just your ears.
```

As a link: <https://tinylittleoffice.com/deck/#doc=---%0Aformat%3A+poster%0A---%0A%23%23+%3Amusic%3A+Open+mic+night+%7B.title%7D%0A%0A-+Friday+13+November%2C+8pm%0A-+The+Anchor%2C+14+Quay+Street%0A-+Free.+Bring+a+song%2C+a+poem%2C+or+just+your+ears.>

Templates: A talk, Status update, A proposal, A pitch, A lesson, Conference talk, Quarterly review, Workshop agenda, Product launch, Town-hall notice, Trivia night, Wedding slideshow, Photo story, Zine, Recipe zine, Booklet, Concert programme, Brochure, Farm brochure, Comic, Comic: the umbrella, Poster, Lost cat poster, Name badges, Conference badges. Its own files: `.pptx`, `.html`, `.zip`, `.gif`.

## Numbers

### sheet: a spreadsheet, a chart, a model

One table. Its header row names the columns, each optionally typed (`Sales:money`); the rows under it are rows 1, 2, 3, so `=SUM(B1:B3)` adds the first three. Up to 26 columns (A to Z). A cell starting with `=` is a formula: `+ - * / ^`, comparisons, references (`B2`), ranges (`A1:A5`), and these functions: `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `SUMIF`, `COUNTIF`, `MEDIAN`, `PRODUCT`, `IF`, `AND`, `OR`, `NOT`, `ROUND`, `ROUNDUP`, `ROUNDDOWN`, `INT`, `ABS`, `SQRT`, `MOD`, `NPV`, `IRR`, `PMT`, `FV`, `PV`, `TODAY`, `DATE`, `DAYS`, `EDATE`, `WORKDAYS`, `YEAR`, `MONTH`, `DAY`, `WEEKDAY`. Dates are written `2027-03-01` in a `date` column. `chart: bar` (or `line`, `pie`) in the head draws the first column's labels against the numbers beside them; `chart: sankey` draws rows of `From | To | Amount` as flows.

A model is a sheet: a column typed `name` names the cell to its right, and formulas use the names (`=visitors*signup_rate/100`; a space is `_`); `lock: C1:C6` in the head marks the model's own formulas, so a reader changes the assumptions and not the model.

Budget:

```
---
title: Budget, October 2026
---
Item | Planned:money | Actual:money | Difference:money
--- | --- | --- | ---
Rent | 1200 | 1200 | =C1-B1
Groceries | 500 | 540 | =C2-B2
Transport | 150 | 120 | =C3-B3
Utilities | 180 | 175 | =C4-B4
Fun | 200 | 260 | =C5-B5
Savings | 400 | 400 | =C6-B6
Total | =SUM(B1:B6) | =SUM(C1:C6) | =SUM(D1:D6)
```

As a link: <https://tinylittleoffice.com/sheet/#doc=---%0Atitle%3A+Budget%2C+October+2026%0A---%0AItem+%7C+Planned%3Amoney+%7C+Actual%3Amoney+%7C+Difference%3Amoney%0A---+%7C+---+%7C+---+%7C+---%0ARent+%7C+1200+%7C+1200+%7C+%3DC1-B1%0AGroceries+%7C+500+%7C+540+%7C+%3DC2-B2%0ATransport+%7C+150+%7C+120+%7C+%3DC3-B3%0AUtilities+%7C+180+%7C+175+%7C+%3DC4-B4%0AFun+%7C+200+%7C+260+%7C+%3DC5-B5%0ASavings+%7C+400+%7C+400+%7C+%3DC6-B6%0ATotal+%7C+%3DSUM%28B1%3AB6%29+%7C+%3DSUM%28C1%3AC6%29+%7C+%3DSUM%28D1%3AD6%29>

A subscription business:

```
---
title: A subscription business, a month
chart: sankey
lock: C1:C6, E6:E9
---
From | To | Amount:number | Assumption:name | Value:number
--- | --- | --- | --- | ---
Visitors | Signups | =visitors*signup_rate/100 | Visitors | 20000
Visitors | Bounced | =visitors-signups | Signup rate | 6
Signups | Paying | =signups*paid_rate/100 | Paid rate | 25
Signups | Free | =signups-paying | Churn | 8
Paying | Churned | =paying*churn/100 |  |
Paying | Retained | =paying-churned | Signups | =SUMIF(B1:B20, "Signups", C1:C20)
| |  |  | Paying | =SUMIF(B1:B20, "Paying", C1:C20)
| |  |  | Churned | =SUMIF(B1:B20, "Churned", C1:C20)
| |  |  | Retained | =SUMIF(B1:B20, "Retained", C1:C20)
{big=Retained}
```

As a link: <https://tinylittleoffice.com/sheet/#doc=---%0Atitle%3A+A+subscription+business%2C+a+month%0Achart%3A+sankey%0Alock%3A+C1%3AC6%2C+E6%3AE9%0A---%0AFrom+%7C+To+%7C+Amount%3Anumber+%7C+Assumption%3Aname+%7C+Value%3Anumber%0A---+%7C+---+%7C+---+%7C+---+%7C+---%0AVisitors+%7C+Signups+%7C+%3Dvisitors%2Asignup_rate%2F100+%7C+Visitors+%7C+20000%0AVisitors+%7C+Bounced+%7C+%3Dvisitors-signups+%7C+Signup+rate+%7C+6%0ASignups+%7C+Paying+%7C+%3Dsignups%2Apaid_rate%2F100+%7C+Paid+rate+%7C+25%0ASignups+%7C+Free+%7C+%3Dsignups-paying+%7C+Churn+%7C+8%0APaying+%7C+Churned+%7C+%3Dpaying%2Achurn%2F100+%7C++%7C%0APaying+%7C+Retained+%7C+%3Dpaying-churned+%7C+Signups+%7C+%3DSUMIF%28B1%3AB20%2C+%22Signups%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Paying+%7C+%3DSUMIF%28B1%3AB20%2C+%22Paying%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Churned+%7C+%3DSUMIF%28B1%3AB20%2C+%22Churned%22%2C+C1%3AC20%29%0A%7C+%7C++%7C++%7C+Retained+%7C+%3DSUMIF%28B1%3AB20%2C+%22Retained%22%2C+C1%3AC20%29%0A%7Bbig%3DRetained%7D>

Templates: Budget, Household budget by month, Expense log, Savings goal, Habit tracker, Reading list, Workout log, Training log, Time sheet, Trip costs split, Project tracker, Schedule with dates, Grade book, Membership roll, Seating count, Poll results, Fundraising thermometer, Invoice ledger, Inventory, Petty cash, Rate card, Mortgages compared, Loans compared, Unit converter, Tournament bracket, Month by month, with a chart, A subscription business, A café, A freelancer, A mutual aid fund. Its own files: `.xlsx`, `.csv`, `.chart.svg`, `.chart.png`.

### calc: a calculator that keeps its working

An expression a line (`2+3*4`, `sqrt(16)`, `20!`); `name = expression` keeps its answer under that name for the lines after it, and `ans` is the line before. Units convert (`3 inch to cm`, `60 mph in km/h`). `mode: graph` in the head draws each line as a curve y = f(x), with `x from 0 to 400` setting the range.

Splitting the bill:

```
---
title: Dinner for six
---
food = 164.50
drinks = 58
tip = (food + drinks) * 18%
total = food + drinks + tip
total / 6
```

As a link: <https://tinylittleoffice.com/calc/#doc=---%0Atitle%3A+Dinner+for+six%0A---%0Afood+%3D+164.50%0Adrinks+%3D+58%0Atip+%3D+%28food+%2B+drinks%29+%2A+18%25%0Atotal+%3D+food+%2B+drinks+%2B+tip%0Atotal+%2F+6>

Templates: Splitting the bill, A shopping total, Tax on a price, Percentage change, Kitchen conversions, Scaling a recipe, Unit conversions, Currency at a rate you type, Fuel for a trip, Paint for a room, Time zones, Running pace, Body mass index, Dose by weight, Electricity for an appliance, Loan payment, Compound interest, Break-even, A curve and its slope, Waves adding up. Its own files: `.txt`.

## Pictures

### draw: a drawing, or pixel art

A table `Kind | X | Y | W | H | Style | Label`, a row per shape, on a grid of 8px squares. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `i` icon (its label is the icon's name), `l` line, `a` arrow (X, Y the start; W, H the distance to the end). `k` joins two shapes with an arrow and `j` with a line: their X and Y are the row numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid), then a colour letter (`r o g b p`) and a text size (`1` to `4`). `alt:` in the head describes the drawing for people who cannot see it. Prefer a diagram when one fits: it lays itself out.

Request flow:

```
---
title: How a page loads
alt: A browser asks a server, which reads the data.
---
Kind | X | Y | W | H | Style | Label
--- | --- | --- | --- | --- | --- | ---
o | 4 | 6 | 16 | 8 | 1b | Browser
o | 32 | 6 | 16 | 8 | 1b | Server
c | 60 | 5 | 14 | 10 | 1g | Data
k | 0 | 1 | 0 | 0 | 0 | asks
k | 1 | 2 | 0 | 0 | 0 | reads
```

As a link: <https://tinylittleoffice.com/draw/#doc=---%0Atitle%3A+How+a+page+loads%0Aalt%3A+A+browser+asks+a+server%2C+which+reads+the+data.%0A---%0AKind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Style+%7C+Label%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0Ao+%7C+4+%7C+6+%7C+16+%7C+8+%7C+1b+%7C+Browser%0Ao+%7C+32+%7C+6+%7C+16+%7C+8+%7C+1b+%7C+Server%0Ac+%7C+60+%7C+5+%7C+14+%7C+10+%7C+1g+%7C+Data%0Ak+%7C+0+%7C+1+%7C+0+%7C+0+%7C+0+%7C+asks%0Ak+%7C+1+%7C+2+%7C+0+%7C+0+%7C+0+%7C+reads>

Pixel art: `grid: 16` (or 8, 32, 64) in the head, then a line per row and a letter per square, `.` clear and `a` to `h` the inks.

Pixel heart:

```
---
title: A heart
grid: 16
---
....cc....cc....
...cccc..cccc...
..cccccccccccc..
..chccccccccccc.
..chccccccccccc.
..cccccccccccc..
...cccccccccc...
....cccccccc....
.....cccccc.....
......cccc......
.......cc.......
```

As a link: <https://tinylittleoffice.com/draw/#doc=---%0Atitle%3A+A+heart%0Agrid%3A+16%0A---%0A....cc....cc....%0A...cccc..cccc...%0A..cccccccccccc..%0A..chccccccccccc.%0A..chccccccccccc.%0A..cccccccccccc..%0A...cccccccccc...%0A....cccccccc....%0A.....cccccc.....%0A......cccc......%0A.......cc.......>

Templates: Flowchart, Birthday card, Event map, Floor plan, Room plan, Wireframe, Logo sketch, Badge, Order to doorstep, Request flow, Three tiers, Pixel heart, Weather icons, Game sprite, Background tile. Its own files: `.svg`, `.tile.svg`, `.tile.png`.

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

A small company:

```
---
title: Who reports to whom
kind: org
---
- Ada Diaz | Chief executive
  - Ben Okoro | Engineering
    - Cy Lund | Platform
    - Di Shah | Apps
  - Eve Marsh | Design
  - Flo Reyes | Sales
    - Gus Patel | Accounts

~ Cy Lund -- Eve Marsh: design partner
```

As a link: <https://tinylittleoffice.com/diagram/#doc=---%0Atitle%3A+Who+reports+to+whom%0Akind%3A+org%0A---%0A-+Ada+Diaz+%7C+Chief+executive%0A++-+Ben+Okoro+%7C+Engineering%0A++++-+Cy+Lund+%7C+Platform%0A++++-+Di+Shah+%7C+Apps%0A++-+Eve+Marsh+%7C+Design%0A++-+Flo+Reyes+%7C+Sales%0A++++-+Gus+Patel+%7C+Accounts%0A%0A~+Cy+Lund+--+Eve+Marsh%3A+design+partner>

Cats and dogs:

```
---
title: Cats and dogs
kind: venn
---
- Cats: purr, climb curtains, use a litter tray
- Dogs: fetch, need walks, guard the house
- Cats & Dogs: shed on the sofa, love a warm spot, wake you at six
```

As a link: <https://tinylittleoffice.com/diagram/#doc=---%0Atitle%3A+Cats+and+dogs%0Akind%3A+venn%0A---%0A-+Cats%3A+purr%2C+climb+curtains%2C+use+a+litter+tray%0A-+Dogs%3A+fetch%2C+need+walks%2C+guard+the+house%0A-+Cats+%26+Dogs%3A+shed+on+the+sofa%2C+love+a+warm+spot%2C+wake+you+at+six>

Templates: Blank mind map, Launch plan, The garden this year, Moving abroad, Revising for an exam, Blank org chart, A small company, A primary school, A restaurant kitchen, Blank family tree, Three generations, The Brontës, A family with a godmother, Blank swimlanes, From order to doorstep, Hiring someone, An expenses claim, Blank timeline, Computing, briefly, A building project, Apollo 11, Blank venn, Fast, cheap, good, Cats and dogs, Who can do what, Blank seating chart, A wedding dinner, Board game night, A classroom, Blank network, How an app hangs together, The water cycle, The house network. Its own files: `.svg`.

### anim: a drawing that moves

A drawing's table, then a table `Shape | Keys`: for each moving shape (its row number from 0), keys separated by `; `, each `frame,dx,dy,depth,size,spin[,effects]`: where it is at that frame as an offset in pixels from where it was drawn, its depth (nearer when positive), its size as a scale (1 as drawn), its spin in degrees, and effect letters (`i` impact, `3` 3D, `d` shadow, `n` neon, `o` outline, `g` rainbow, `m` mirror, `w` wobble, `b` blur). Between keys it moves in straight lines. The head holds `frames` (2 to 120), `fps` (1 to 30) and `loop` (`once`, a number, or `bounce`; for ever otherwise).

Lift off:

```
---
title: Lift off
frames: 24
fps: 8
alt: A rocket lifts off and flies up and away to the right, under the words Lift off.
---
Kind | X | Y | W | H | Style | Label
--- | --- | --- | --- | --- | --- | ---
t | 4 | 20 | 20 | 4 | 04 | Lift off
i | 8 | 36 | 8 | 8 | 0b | rocket

Shape | Keys
--- | ---
0 | 0,0,0,0,1,0; 23,0,-80,0,1,0,i
1 | 0,0,0,0,1,0; 23,200,-200,80,1,-30,d
```

As a link: <https://tinylittleoffice.com/anim/#doc=---%0Atitle%3A+Lift+off%0Aframes%3A+24%0Afps%3A+8%0Aalt%3A+A+rocket+lifts+off+and+flies+up+and+away+to+the+right%2C+under+the+words+Lift+off.%0A---%0AKind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Style+%7C+Label%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0At+%7C+4+%7C+20+%7C+20+%7C+4+%7C+04+%7C+Lift+off%0Ai+%7C+8+%7C+36+%7C+8+%7C+8+%7C+0b+%7C+rocket%0A%0AShape+%7C+Keys%0A---+%7C+---%0A0+%7C+0%2C0%2C0%2C0%2C1%2C0%3B+23%2C0%2C-80%2C0%2C1%2C0%2Ci%0A1+%7C+0%2C0%2C0%2C0%2C1%2C0%3B+23%2C200%2C-200%2C80%2C1%2C-30%2Cd>

Templates: Lift off, Bouncing ball, Loading spinner, Title card, Birthday card, Quick standup, Build is green, Flash card, Weather this week, New Year countdown, Flight path, Neon sign, Sunrise. Its own files: `.gif`, `.svg`.

## Plans

### board: a kanban board

`## Stage` headings (`## Doing {limit=2 color=g}` holds two cards at most and colours the stage), each followed by a `- card` list; a task list indented under a card (`  - [ ] step`) is its checklist.

A project:

```
---
title: The Harbour Studio website
---
## To do {color=b}

- Write the words for the **About** page
  - [x] Interview Mara about the first ten years
  - [ ] First draft, about 400 words
  - [ ] Dee reads it
- Photograph the studio on a bright morning
- Set up the contact form

## Doing {limit=2 color=g}

- Build the home page
  - [x] Layout
  - [x] Header and footer
  - [ ] The gallery of twelve projects
- Choose the typeface: a serif or a grotesque

## Waiting on {color=y}

- Pellow & Sons to send the logo as a vector file

## Done {color=p}

- Pick the domain name
- Sign off the budget: £4,800, live by Monday 2 November
```

As a link: <https://tinylittleoffice.com/board/#doc=---%0Atitle%3A+The+Harbour+Studio+website%0A---%0A%23%23+To+do+%7Bcolor%3Db%7D%0A%0A-+Write+the+words+for+the+%2A%2AAbout%2A%2A+page%0A++-+%5Bx%5D+Interview+Mara+about+the+first+ten+years%0A++-+%5B+%5D+First+draft%2C+about+400+words%0A++-+%5B+%5D+Dee+reads+it%0A-+Photograph+the+studio+on+a+bright+morning%0A-+Set+up+the+contact+form%0A%0A%23%23+Doing+%7Blimit%3D2+color%3Dg%7D%0A%0A-+Build+the+home+page%0A++-+%5Bx%5D+Layout%0A++-+%5Bx%5D+Header+and+footer%0A++-+%5B+%5D+The+gallery+of+twelve+projects%0A-+Choose+the+typeface%3A+a+serif+or+a+grotesque%0A%0A%23%23+Waiting+on+%7Bcolor%3Dy%7D%0A%0A-+Pellow+%26+Sons+to+send+the+logo+as+a+vector+file%0A%0A%23%23+Done+%7Bcolor%3Dp%7D%0A%0A-+Pick+the+domain+name%0A-+Sign+off+the+budget%3A+%C2%A34%2C800%2C+live+by+Monday+2+November>

Templates: A project, A week, Moving house, Hiring, Content calendar, Editorial board, Sales pipeline, Bug triage, Class projects, Mutual aid. Its own files: `.csv`.

### todo: a to-do list

`- [ ] task` and `- [x] done`. A star and a due date are attributes: `- [ ] Renew passport {.star due=2027-03-01}`.

Shopping:

```
---
title: Shopping
---
- [x] Oat milk
- [x] Coffee beans
- [ ] Lemons
- [ ] Sourdough
- [ ] A dozen eggs
- [ ] Olive oil
- [ ] Basil, the live kind
- [ ] Candles for Mira's cake on Saturday {.star due=2026-10-17}
```

As a link: <https://tinylittleoffice.com/todo/#doc=---%0Atitle%3A+Shopping%0A---%0A-+%5Bx%5D+Oat+milk%0A-+%5Bx%5D+Coffee+beans%0A-+%5B+%5D+Lemons%0A-+%5B+%5D+Sourdough%0A-+%5B+%5D+A+dozen+eggs%0A-+%5B+%5D+Olive+oil%0A-+%5B+%5D+Basil%2C+the+live+kind%0A-+%5B+%5D+Candles+for+Mira%27s+cake+on+Saturday+%7B.star+due%3D2026-10-17%7D>

Templates: This week, Daily routine, Shopping, Groceries by aisle, Reading list, Packing for a trip, Garden by season, Project launch, Onboarding, Moving out, Wedding checklist. Its own files: `.md`, `.ics`.

### cal: a calendar, or a schedule

A list item per thing: `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`. Attributes give a colour and a repeat: `{color=green every=week times=6}` (or `until=2027-06-01`). The head holds the time zone, `zone: Europe/London`, and may say what a colour stands for: `green: Sam`. `view: gantt` in the head draws the same items as a schedule: an item nested under another is part of it, `{done=40%}` is how far along it is, `- [x]` that it is done.

Family calendar:

```
---
zone: Europe/London
green: Sam
orange: Ana
---
- 2027-03-02 16:30-17:15: Swimming lesson {color=green every=week times=10}
- 2027-03-05: Ana's birthday {color=orange every=year}
- 2027-03-09 08:40-09:20: Dentist, Dr Patel {color=green}
- 2027-03-13 10:00-12:00: Football, home game {color=green every=week until=2027-05-22}
- 2027-03-20 to 2027-03-21: Grandma visits
- 2027-03-24: Bins out, garden waste too {every=week}
- 2027-03-29 to 2027-04-09: Easter holidays {color=green}
- 2027-04-01 19:30-22:00: Book club {color=orange every=month}
```

As a link: <https://tinylittleoffice.com/cal/#doc=---%0Azone%3A+Europe%2FLondon%0Agreen%3A+Sam%0Aorange%3A+Ana%0A---%0A-+2027-03-02+16%3A30-17%3A15%3A+Swimming+lesson+%7Bcolor%3Dgreen+every%3Dweek+times%3D10%7D%0A-+2027-03-05%3A+Ana%27s+birthday+%7Bcolor%3Dorange+every%3Dyear%7D%0A-+2027-03-09+08%3A40-09%3A20%3A+Dentist%2C+Dr+Patel+%7Bcolor%3Dgreen%7D%0A-+2027-03-13+10%3A00-12%3A00%3A+Football%2C+home+game+%7Bcolor%3Dgreen+every%3Dweek+until%3D2027-05-22%7D%0A-+2027-03-20+to+2027-03-21%3A+Grandma+visits%0A-+2027-03-24%3A+Bins+out%2C+garden+waste+too+%7Bevery%3Dweek%7D%0A-+2027-03-29+to+2027-04-09%3A+Easter+holidays+%7Bcolor%3Dgreen%7D%0A-+2027-04-01+19%3A30-22%3A00%3A+Book+club+%7Bcolor%3Dorange+every%3Dmonth%7D>

Project plan:

```
---
view: gantt
---
- 2027-03-01 to 2027-03-12: Discovery
  - [x] 2027-03-01 to 2027-03-03: Stakeholder interviews
  - [x] 2027-03-04 to 2027-03-05: Analytics review
  - 2027-03-08 to 2027-03-12: Content audit {done=60%}
- 2027-03-15 to 2027-04-02: Design
  - 2027-03-15 to 2027-03-19: Wireframes {done=20%}
  - 2027-03-22 to 2027-04-02: Visual design
- 2027-04-05 to 2027-04-23: Build
  - 2027-04-05 to 2027-04-16: Templates and pages {color=blue}
  - 2027-04-19 to 2027-04-23: Testing on phones {color=blue}
- 2027-04-26: Launch {color=red}
```

As a link: <https://tinylittleoffice.com/cal/#doc=---%0Aview%3A+gantt%0A---%0A-+2027-03-01+to+2027-03-12%3A+Discovery%0A++-+%5Bx%5D+2027-03-01+to+2027-03-03%3A+Stakeholder+interviews%0A++-+%5Bx%5D+2027-03-04+to+2027-03-05%3A+Analytics+review%0A++-+2027-03-08+to+2027-03-12%3A+Content+audit+%7Bdone%3D60%25%7D%0A-+2027-03-15+to+2027-04-02%3A+Design%0A++-+2027-03-15+to+2027-03-19%3A+Wireframes+%7Bdone%3D20%25%7D%0A++-+2027-03-22+to+2027-04-02%3A+Visual+design%0A-+2027-04-05+to+2027-04-23%3A+Build%0A++-+2027-04-05+to+2027-04-16%3A+Templates+and+pages+%7Bcolor%3Dblue%7D%0A++-+2027-04-19+to+2027-04-23%3A+Testing+on+phones+%7Bcolor%3Dblue%7D%0A-+2027-04-26%3A+Launch+%7Bcolor%3Dred%7D>

Templates: Family calendar, Project plan, Festival weekend. Its own files: `.ics`, `.csv`.

### trip: a route on a map

A table `Place | Lat:number | Lon:number | Note`, in decimal degrees. `units: km` or `units: miles` in the head (driving hours are estimated otherwise); `route: dots` for places that stand alone, not a route.

A week in Portugal:

```
---
units: km
---
Place | Lat:number | Lon:number | Note
--- | --- | --- | ---
Lisbon | 38.7223 | -9.1393 | Pastéis de nata in Belém, then the 28 tram up to Graça
Sintra | 38.8029 | -9.3817 | Pena Palace first thing, before the coaches
Óbidos | 39.3606 | -9.1571 | Walk the town walls; ginjinha in a chocolate cup
Coimbra | 40.2033 | -8.4103 | The Joanina Library: book the 10:00 slot
Porto | 41.1579 | -8.6291 | Port cellars across the river in Gaia
```

As a link: <https://tinylittleoffice.com/trip/#doc=---%0Aunits%3A+km%0A---%0APlace+%7C+Lat%3Anumber+%7C+Lon%3Anumber+%7C+Note%0A---+%7C+---+%7C+---+%7C+---%0ALisbon+%7C+38.7223+%7C+-9.1393+%7C+Past%C3%A9is+de+nata+in+Bel%C3%A9m%2C+then+the+28+tram+up+to+Gra%C3%A7a%0ASintra+%7C+38.8029+%7C+-9.3817+%7C+Pena+Palace+first+thing%2C+before+the+coaches%0A%C3%93bidos+%7C+39.3606+%7C+-9.1571+%7C+Walk+the+town+walls%3B+ginjinha+in+a+chocolate+cup%0ACoimbra+%7C+40.2033+%7C+-8.4103+%7C+The+Joanina+Library%3A+book+the+10%3A00+slot%0APorto+%7C+41.1579+%7C+-8.6291+%7C+Port+cellars+across+the+river+in+Gaia>

Templates: A weekend in Copenhagen, Iceland’s Ring Road, A Dublin pub crawl, Yosemite’s Mist Trail loop, The Loire by bike, A college tour, A week in Portugal, Down the Pacific coast, The Scottish Highlands, Rome, the places to see, Japan by rail, The last 100 km of the Camino, New York in the movies, A wedding on Lake Como. Its own files: `.gpx`, `.geojson`.

## The web

### site: a website of little pages, or a page of quick links

`# Name` and a line about it; each further `# Title` starts a page, `## Section` a part of one. `- :icon: Point | detail` makes a card, `> Label | https://…` a button (`#page-or-section` links within the site), a picture's address alone on a line a picture, `:icon:` alone a big icon, a fence another document. `theme:` in the head sets the look: `indigo teal rose amber ink forest ocean sunset plum candy olive slate paper typewriter midnight coal`, with `serif`, `sans`, `rounded` or `mono` to change the type and `dark` or `light` the mode (`theme: teal serif dark`). A table `Name | Price:money | About | Image` in a section is a shop with a cart; the head holds `currency: $` and `orders: someone@example.com`. `look: links` makes it a Quick Links page (a link-in-bio): one column, the buttons stacked, the list items small links at the foot.

A café:

```
---
theme: amber
---
# Harbor Coffee

Small-batch coffee, roasted on the quay every morning.

> See the menu | #menu
> Find us | #find-us

- :coffee: Roasted daily | Never more than a week old
- :leaf: Fair trade | From farms we have visited
- :bike: Delivered | By bike, on the day

# Menu

What we pour, and what we bake.

## Coffee

- Espresso | 3.00
- Flat white | 4.20
- Filter, by the cup | 3.50

## Pastry

- Cardamom bun | 3.50
- Sourdough toast, butter and jam | 4.00

# Find us

14 Quay Street, open 7 to 3, every day but Monday.

https://www.openstreetmap.org/?mlat=43.6567&mlon=-70.2484#map=17/43.6567/-70.2484

> Email us | mailto:hello@harborcoffee.example
```

As a link: <https://tinylittleoffice.com/site/#doc=---%0Atheme%3A+amber%0A---%0A%23+Harbor+Coffee%0A%0ASmall-batch+coffee%2C+roasted+on+the+quay+every+morning.%0A%0A%3E+See+the+menu+%7C+%23menu%0A%3E+Find+us+%7C+%23find-us%0A%0A-+%3Acoffee%3A+Roasted+daily+%7C+Never+more+than+a+week+old%0A-+%3Aleaf%3A+Fair+trade+%7C+From+farms+we+have+visited%0A-+%3Abike%3A+Delivered+%7C+By+bike%2C+on+the+day%0A%0A%23+Menu%0A%0AWhat+we+pour%2C+and+what+we+bake.%0A%0A%23%23+Coffee%0A%0A-+Espresso+%7C+3.00%0A-+Flat+white+%7C+4.20%0A-+Filter%2C+by+the+cup+%7C+3.50%0A%0A%23%23+Pastry%0A%0A-+Cardamom+bun+%7C+3.50%0A-+Sourdough+toast%2C+butter+and+jam+%7C+4.00%0A%0A%23+Find+us%0A%0A14+Quay+Street%2C+open+7+to+3%2C+every+day+but+Monday.%0A%0Ahttps%3A%2F%2Fwww.openstreetmap.org%2F%3Fmlat%3D43.6567%26mlon%3D-70.2484%23map%3D17%2F43.6567%2F-70.2484%0A%0A%3E+Email+us+%7C+mailto%3Ahello%40harborcoffee.example>

Quick Links: a maker:

```
---
look: links
theme: rose
---
# Ada Diaz

![](https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400)

Potter in Lisbon. Mugs, bowls, the odd lamp.

> :cart: The shop | https://example.com/shop
> :calendar: Book a class | https://example.com/classes
> :mail: Email me | mailto:ada@example.com

- :camera: Instagram | https://instagram.com/ada
- :film: YouTube | https://youtube.com/@ada
```

As a link: <https://tinylittleoffice.com/site/#doc=---%0Alook%3A+links%0Atheme%3A+rose%0A---%0A%23+Ada+Diaz%0A%0A%21%5B%5D%28https%3A%2F%2Fimages.unsplash.com%2Fphoto-1544005313-94ddf0286df2%3Fw%3D400%29%0A%0APotter+in+Lisbon.+Mugs%2C+bowls%2C+the+odd+lamp.%0A%0A%3E+%3Acart%3A+The+shop+%7C+https%3A%2F%2Fexample.com%2Fshop%0A%3E+%3Acalendar%3A+Book+a+class+%7C+https%3A%2F%2Fexample.com%2Fclasses%0A%3E+%3Amail%3A+Email+me+%7C+mailto%3Aada%40example.com%0A%0A-+%3Acamera%3A+Instagram+%7C+https%3A%2F%2Finstagram.com%2Fada%0A-+%3Afilm%3A+YouTube+%7C+https%3A%2F%2Fyoutube.com%2F%40ada>

Templates: A café, A small shop, An event, Quick Links: a maker, Quick Links: a group, Quick Links: a band, Quick Links: a small business, Quick Links: a writer. Its own files: `.html`.

## Every app's files

Every document downloads as a `.pdf` (its pages as pictures; Print in the browser saves one with the words still words), a picture (`.png`), a web page (`.html`), Markdown (`.md`, footnotes in Markdown's reference form) and its own text (`.tlo`: the TLO with `app: <id>` in its head, which opens as its own app when dropped on the site or opened from its menu). A link that downloads a file as it opens is `#/v1/<app>.<ext>/<payload>`, or `view=<ext>` in the plain form.

## Short links

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

A page of your own can import `https://tinylittleoffice.com/tinyoffice.js` instead: `link({ app, doc, title })` writes the plain link and `embed({ app, doc, title })` the `<iframe>` that shows the document's pages. In the API, `encode`/`decode` are the codec, `parse`/`write` the kernel (the document as a head and blocks, and back), `tlo`/`fromTlo` a `.tlo` file's text, `file(app, text, ext)` a file of the app's own formats that needs no browser. In a clone of github.com/ftrain/tinyoffice, `node packages/doc/tinyoffice.ts` is the same from the command line: `link`, `read`, `file`, `diff`, `apps`, `templates`.

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
