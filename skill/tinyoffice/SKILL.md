---
name: tinyoffice
description: Make almost any small document as a shareable link by writing a TinyLittleOffice URL: spreadsheets and charts, text, slide decks, outlines, business/marketing/go-to-market plans, drawings and diagrams (org chart, mind map, swimlanes, Venn, network, floor plan, seating, family tree, timeline), calendars, to-do lists, kanban boards, Gantt charts, map routes, databases, websites of little pages, link-in-bio pages, shops, invoices, contracts, zines, booklets, brochures, comics, posters, menus, résumés, name badges, recipe cards, stock-and-flow models, a calculator (mortgage, investment, cash flow, interest, graphs), pixel art, word searches, choose-your-own-adventures, scavenger hunts, quizzes, flashcards, spinners, polls, Secret Santa draws, bill splitting, logs, QR codes and more. Use when someone asks for any of these and a link they can open, edit and share would serve them better than a file.
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
| `Price:money` in a table's header | A typed column: `text number money percent date time check url rich` |
| `~ A -> B: label` | A connection between two things (`->`, `<-`, `<->`, `--`) |
| a code fence named for an app: ```` ```sheet ```` | Another document inside this one, written in that app's TLO: a chart on a slide, a table in a text |
| `==highlight==`, `++underline++`, `:icon-name:` | A highlight, an underline, a Lucide icon in the line |

`---` between blocks starts the next slide, page or card. A Markdown table in a text or on a slide becomes a spreadsheet.

## Apps and their shapes

### sheet: a spreadsheet, and charts

One table. Its header row names the columns, each optionally typed (`Sales:money`); the rows under it are rows 1, 2, 3, so `=SUM(B1:B3)` adds the first three. Up to 6 columns. A cell starting with `=` is a formula: `+ - * / ^`, comparisons, references (`B2`), ranges (`A1:A5`), and `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN INT ABS SQRT MOD NPV IRR PMT FV PV TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY`. Dates are written `2027-03-01` in a `date` column and count in days. `chart: bar` (or `line`, `pie`) in the header draws the labels in the first column against the numbers beside them.

https://tinylittleoffice.com/sheet/#title=Sales+by+quarter&doc=---%0Achart%3A+bar%0A---%0AQuarter+%7C+Sales%3Amoney%0A---+%7C+---%0AQ1+%7C+120%0AQ2+%7C+180%0AQ3+%7C+240

https://tinylittleoffice.com/sheet/#title=Budget&doc=Item+%7C+Cost%3Amoney%0A---+%7C+---%0ARent+%7C+1200%0AFood+%7C+450%0ATotal+%7C+%3DSUM%28B1%3AB2%29

### write: a text

Markdown as it stands. `# Words {.title}` is the title, set large; `#` and `##` are headings; `{.center}`, `{.right}` or `{.justify}` at the end of a paragraph aligns it. A table is an embedded sheet; a fence named for an app embeds that document. **contract** and **resume** are written the same way.

https://tinylittleoffice.com/write/#title=Meeting+notes&doc=%23+Meeting+notes%0A%0AWe+agreed+on+%2A%2Athree+things%2A%2A.%0A%0A-+Ship+on+Friday%0A++-+Ben+owns+the+release%0A-+Review+pricing

### outline: an outliner

A nested list, two spaces a level. The same list opens as `mind`, `org` and `family`, and the outline can be seen as a `deck`. An item's tie to its parent can be an arrow, `{.to}` (towards the parent) or `{.from}`, named with `label="…"`; any two items join with `~ Pricing -> Press: informs`.

https://tinylittleoffice.com/outline/#title=Launch&doc=-+Launch%0A++-+Product%0A++++-+Pricing%0A++++-+Onboarding%0A++-+Marketing%0A++++-+Press%0A++-+Support

### deck: slides

A slide between each `---`. The headline is `## :icon-name: Headline`, with its layout as an attribute: `{.title}` (a title slide: the headline and a line under it), `{.two}` (two columns, a paragraph `|` between them) or `{.icon}` (bullets beside one big icon). The words are `- ` bullets, nested by two spaces; `> ` lines are speaker notes. A chart or another document is a fence: a sheet's table with `chart: bar` in its header becomes a chart on the slide. The header may hold `transition: cut` (or `slide`, `zoom`; a fade otherwise), `color: red` and `qr: no` (every deck otherwise ends with a QR code of itself). A model's `# Title` and `## Slide` headings without rules read as a deck too.

https://tinylittleoffice.com/deck/#title=Launch+plan&doc=%23%23+%3Arocket%3A+Launch+plan+%7B.title%7D%0A%0A-+Spring+2027%0A%0A---%0A%0A%23%23+%3Atarget%3A+Goals%0A%0A-+Ship+the+beta%0A-+Sign+ten+customers%0A%0A---%0A%0A%23%23+Now+and+next+%7B.two%7D%0A%0A-+Design%0A-+Build%0A%0A%7C%0A%0A-+Test%0A-+Launch%0A%0A---%0A%0A%23%23+Sales+so+far%0A%0A%60%60%60sheet%0A---%0Achart%3A+bar%0A---%0AQuarter+%7C+Sales%0A---+%7C+---%0AQ1+%7C+120%0AQ2+%7C+180%0A%60%60%60

### org: an org chart

A nested list of `Name | Role`. A dotted line between two people is `~ Ben -- Eve: advises`.

https://tinylittleoffice.com/org/#title=Team&doc=-+Ada+Diaz+%7C+Chief+executive%0A++-+Ben+Okoro+%7C+Engineering%0A++++-+Cy+Lund+%7C+Platform%0A++++-+Di+Shah+%7C+Apps%0A++-+Eve+Marsh+%7C+Design%0A++-+Flo+Reyes+%7C+Sales%0A%0A~+Cy+Lund+--+Eve+Marsh%3A+design+partner

### mind: a mind map

A nested list: the centre, then its branches.

https://tinylittleoffice.com/mind/#title=Launch&doc=-+Launch%0A++-+Product%0A++++-+Pricing%0A++++-+Onboarding%0A++-+Marketing%0A++++-+Press%0A++++-+Social%0A++-+Support%0A++++-+Help+pages

### lanes: a swimlane process

`- Who: what they do`, in order. A step ending in `?` is a decision.

https://tinylittleoffice.com/lanes/#title=Order+to+delivery&doc=-+Customer%3A+Places+order%0A-+Sales%3A+Checks+stock%0A-+Sales%3A+In+stock%3F%0A-+Warehouse%3A+Packs+it%0A-+Courier%3A+Delivers%0A-+Customer%3A+Signs+for+it

### venn: a Venn diagram

`- Set: thing, thing` for each of two or three sets, and `- A & B: thing` for what they share.

https://tinylittleoffice.com/venn/#title=Pick+two&doc=-+Fast%3A+sprinting%2C+espresso%0A-+Cheap%3A+instant+noodles%2C+walking%0A-+Good%3A+slow+cooking%0A-+Fast+%26+Cheap%3A+fast+food%0A-+Cheap+%26+Good%3A+home+cooking%0A-+Fast+%26+Good%3A+a+great+takeaway%0A-+Fast+%26+Cheap+%26+Good%3A+toast

### net: a network diagram

Connections: `~ A -> B: label` for an arrow, `~ A -- B` for a line. `- name` is a node on its own.

https://tinylittleoffice.com/net/#title=System&doc=~+Web+-%3E+API%3A+requests%0A~+API+-%3E+Database%3A+queries%0A~+API+-%3E+Cache%0A~+Worker+-%3E+Database%0A~+API+--+Worker%3A+queue%0A%0A-+Monitoring

### db: a small database

Each table is a `## name` heading and a Markdown table; a column that points at another table is headed `team_id>teams`. Queries go in a `sql` fence, one per line ending `;`: `SELECT` columns (or `*`, `count(*)`, `sum/avg/min/max(col)`, `AS`), `FROM`, `JOIN ... ON a = b`, `WHERE` with `= <> < > <= >= LIKE` joined by `AND`/`OR`, `GROUP BY`, `ORDER BY ... DESC`, `LIMIT`.

https://tinylittleoffice.com/db/#title=Team+directory&doc=%23%23+teams%0A%0Aid+%7C+name%0A---+%7C+---%0A1+%7C+Platform%0A2+%7C+Design%0A%0A%23%23+people%0A%0Aid+%7C+name+%7C+team_id%3Eteams%0A---+%7C+---+%7C+---%0A1+%7C+Ann+%7C+1%0A2+%7C+Bo+%7C+2%0A%0A%60%60%60sql%0Aselect+teams.name%2C+count%28%2A%29+as+people+from+people+join+teams+on+team_id+%3D+teams.id+group+by+teams.name%3B%0A%60%60%60

### site: a website of little pages

`# Name` and a line about it; each further `# Title` starts a page, `## Section` a part of one. `- :icon: Point | detail` makes a card, `> Label | https://…` a button (`#page-or-section` links within the site), a line that is only a picture's address a picture, and a fence another document. `theme: teal serif dark` in the header sets the look.

https://tinylittleoffice.com/site/#title=Harbor+Coffee&doc=---%0Atheme%3A+amber+serif%0A---%0A%23+Harbor+Coffee%0A%0ASmall-batch+coffee%2C+roasted+on+the+quay+every+morning.%0A%0A%3E+See+the+menu+%7C+%23menu%0A%3E+Find+us+%7C+%23find-us%0A%0A-+%3Acoffee%3A+Roasted+daily+%7C+Never+more+than+a+week+old%0A-+%3Aleaf%3A+Fair+trade+%7C+Bought+direct+from+six+farms%0A-+%3Abike%3A+Delivered+%7C+By+bike%2C+across+the+old+town%0A%0A%23+Menu%0A%0AEspresso%2C+filter%2C+and+a+pastry+case+that+empties+by+ten.%0A%0A%23%23+Coffee%0A%0A-+Espresso+%7C+3.00%0A-+Flat+white+%7C+4.20%0A%0A%23%23+Pastry%0A%0A-+Cardamom+bun+%7C+3.50%0A%0A%23+Find+us%0A%0A14+Quay+Street%2C+open+7+to+3%2C+every+day+but+Monday.%0A%0A%3E+Email+us+%7C+mailto%3Ahello%40example.com

### store: a shop page with a cart

`# Name` and a line about it; products in a table `Name | Price:money | About | Image`. The header holds `currency: $` and `orders: someone@example.com` (where orders are emailed).

https://tinylittleoffice.com/store/#title=Shop&doc=---%0Acurrency%3A+%24%0Aorders%3A+orders%40example.com%0A---%0A%23+Harbor+Coffee+Shop%0A%0ABeans+and+things%2C+posted+on+Fridays.%0A%0AName+%7C+Price%3Amoney+%7C+About+%7C+Image%0A---+%7C+---+%7C+---+%7C+---%0AHouse+blend%2C+250g+%7C+12.50+%7C+Chocolate+and+orange.+Good+for+anything.+%7C%0AQuay+espresso%2C+250g+%7C+14.00+%7C+Dark%2C+syrupy%2C+made+for+milk.+%7C%0AFilter+papers+%7C+4.00+%7C+A+hundred%2C+unbleached.+%7C%0ATin+mug+%7C+9.00+%7C+Enamel.+Survives+the+boat.+%7C

### invoice: an invoice

The header holds `from`, `to`, `number`, `date`, `due`, `tax` (`8%`) and `currency`; ` | ` starts a second line of an address. The lines are a table `What | Qty:number | Units | Price:money`; paragraphs after it are notes. The totals are worked out, and the PDF download is the invoice.

https://tinylittleoffice.com/invoice/#title=Invoice+0042&doc=---%0Afrom%3A+Harbor+Studio+%7C+14+Quay+Street%0Ato%3A+Acme+Ltd+%7C+Accounts+payable%0Anumber%3A+0042%0Adate%3A+2027-03-01%0Adue%3A+2027-03-31%0Atax%3A+8%25%0A---%0AWhat+%7C+Qty%3Anumber+%7C+Units+%7C+Price%3Amoney%0A---+%7C+---+%7C+---+%7C+---%0ADesign+%7C+12+%7C+hours+%7C+150%0ABuild+%7C+20+%7C+hours+%7C+140%0AHosting+for+a+year+%7C+1+%7C++%7C+480%0A%0AThank+you.+Payment+by+bank+transfer.

### gantt: a schedule

A table `Task | Start:date | Days:number | Done:percent`. A task that is part of the one above starts its name with `- `.

https://tinylittleoffice.com/gantt/#title=Website+relaunch&doc=Task+%7C+Start%3Adate+%7C+Days%3Anumber+%7C+Done%3Apercent%0A---+%7C+---+%7C+---+%7C+---%0ADesign+%7C+2027-03-01+%7C+10+%7C+50%25%0A-+Wireframes+%7C+2027-03-01+%7C+4+%7C+100%25%0A-+Visual+design+%7C+2027-03-05+%7C+6+%7C+50%25%0ABuild+%7C+2027-03-11+%7C+15+%7C+0%25

### board: a kanban board

`## Stage` headings (`## Doing {limit=2}` limits it to two cards), each followed by a `- card` list.

https://tinylittleoffice.com/board/#title=Sprint&doc=%23%23+To+do+%7Blimit%3D2%7D%0A%0A-+Write+the+brief%0A-+Design+the+page%0A%0A%23%23+Doing%0A%0A-+Build+the+form%0A%0A%23%23+Done%0A%0A-+Choose+a+name

### todo: a task list

`- [ ] task` and `- [x] done`. A due date and a star are attributes: `- [ ] Renew passport {.star due=2027-03-01}`.

https://tinylittleoffice.com/todo/#title=Trip+prep&doc=-+%5B+%5D+Renew+passport+%7B.star+due%3D2027-03-01%7D%0A-+%5B+%5D+Book+flights%0A-+%5Bx%5D+Choose+dates

### cal: a calendar

A list item per thing: `- 2027-03-01: Launch`, `- 2027-03-01 to 2027-03-03: Offsite`, `- 2027-03-10 09:00-10:30: Retro`. Attributes give a colour and a repeat: `{color=green every=week times=6}`. The header holds the time zone, `zone: Europe/London`, and may name colours: `green: Sam`.

https://tinylittleoffice.com/cal/#title=March&doc=---%0Azone%3A+Europe%2FLondon%0A---%0A-+2027-03-01+to+2027-03-03%3A+Offsite+%7Bcolor%3Dgreen%7D%0A-+2027-03-08%3A+Launch+day%0A-+2027-03-10+09%3A00-10%3A30%3A+Retro

### trip: a route on a map

A table `Place | Lat:number | Lon:number | Note`, in decimal degrees. `units: km` or `units: miles` in the header (otherwise driving hours are estimated).

https://tinylittleoffice.com/trip/#title=Portugal&doc=---%0Aunits%3A+km%0A---%0APlace+%7C+Lat%3Anumber+%7C+Lon%3Anumber+%7C+Note%0A---+%7C+---+%7C+---+%7C+---%0ALisbon+%7C+38.7223+%7C+-9.1393+%7C+Pastel+de+nata+first%0ACoimbra+%7C+40.2033+%7C+-8.4103+%7C%0APorto+%7C+41.1579+%7C+-8.6291+%7C+Port+cellars

### draw: a free drawing

A table `Kind | X | Y | W | H | Style | Label`, a row per shape, on a grid 80 wide and 50 tall. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `l` line, `a` arrow. `k` joins two shapes with an arrow and `j` with a line: their X and Y are the row numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid) optionally followed by a colour letter (`r o g b p`) and a text size (`1` to `4`). `alt:` in the header describes the drawing for people who cannot see it. Prefer the diagram apps above when one fits: they lay themselves out.

https://tinylittleoffice.com/draw/#title=Request+flow&doc=---%0Aalt%3A+A+browser+asks+a+server%2C+which+reads+the+data%0A---%0AKind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Style+%7C+Label%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0Ao+%7C+4+%7C+6+%7C+16+%7C+8+%7C+1b+%7C+Browser%0Ao+%7C+32+%7C+6+%7C+16+%7C+8+%7C+1b+%7C+Server%0Ac+%7C+60+%7C+5+%7C+14+%7C+10+%7C+1g+%7C+Data%0Ak+%7C+0+%7C+1+%7C+0+%7C+0+%7C+0+%7C+asks%0Ak+%7C+1+%7C+2+%7C+0+%7C+0+%7C+0+%7C+reads

### anim: a drawing that moves

A drawing's table, then a table `Shape | Keys`: for each moving shape (its row number), keys separated by `; `, each `frame,dx,dy,depth,size,spin[,effects]`: where it is at that frame, as an offset in pixels from where it was drawn, its size as a scale (1 is as drawn), its spin in degrees, and effect letters (`i` impact meme, `3` 3D, `d` shadow, `n` neon, `o` outline, `g` rainbow, `m` mirror, `w` wobble, `b` blur). Between keys it moves in straight lines. The header holds `frames` (up to 120) and `fps` (4, 8 or 12).

https://tinylittleoffice.com/anim/#title=Lift+off&doc=---%0Aframes%3A+24%0Afps%3A+8%0A---%0AKind+%7C+X+%7C+Y+%7C+W+%7C+H+%7C+Style+%7C+Label%0A---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---+%7C+---%0At+%7C+4+%7C+20+%7C+20+%7C+4+%7C+04+%7C+Lift+off%0Ai+%7C+8+%7C+36+%7C+8+%7C+8+%7C+0b+%7C+rocket%0A%0AShape+%7C+Keys%0A---+%7C+---%0A0+%7C+0%2C0%2C0%2C0%2C1%2C0%3B+23%2C0%2C-80%2C0%2C1%2C0%2Ci%0A1+%7C+0%2C0%2C0%2C0%2C1%2C0%3B+23%2C200%2C-200%2C80%2C1%2C-30%2Cd

## Calculator

`calc`: the header names the mode, `mode: graph` (or `mortgage`, `invest`, `cashflow`, `interest`; the calculator itself needs none). For the calculator and the grapher, an expression per line (`2+3*4`, `sqrt(16)`, `sin(x)`); for the money modes, `- name = value` items: mortgage `price deposit rate years`, invest `start monthly return years`, cashflow `rate` and `year 0 = -100000`, interest `principal rate years times`.

https://tinylittleoffice.com/calc/#title=Our+mortgage&doc=---%0Amode%3A+mortgage%0A---%0A-+price+%3D+400000%0A-+deposit+%3D+80000%0A-+rate+%3D+6.5%0A-+years+%3D+30

## Plans, and templates

Business, marketing and go-to-market plans are `write` texts: open an empty Write document and "Start from a template" gives the sections and the questions each should answer. The API's `templates(app)` lists them.

## Things to print

Each of these lays a few lines out on letter-size sheets; the PDF download prints at actual size. They are written like a deck: a page between each `---`, a `## Headline` (with an `:icon:` if you like), then paragraphs or `- ` bullets.

- `poster`: one page, as big as the page allows.
- `zine` (8 pages), `booklet` (8 to 20) and `brochure` (6 panels).
- `badges`: a page per person, the name as the headline. `recipes`: a page per dish.
- `comic`: a panel per bullet, `- :icon-name: What is said | caption`.
- `menu`: `# Name`, a line about it, then each `## Section` followed by a table `Dish | Price:money | About`.
- `resume`: a `write` text, fitted to one page.
- `wordsearch`: `# Title` and the words as a `- ` list.

https://tinylittleoffice.com/poster/#title=Open+mic&doc=%23%23+%3Amusic%3A+Open+mic+night%0A%0AFriday+12+March%2C+8pm%0A%0AThe+Anchor%2C+14+Quay+Street%0A%0AFree.+Bring+a+song.

https://tinylittleoffice.com/zine/#title=Small+Joys&doc=%23%23+%3Acoffee%3A+Small+Joys%0A%0AIssue+one%0A%0A---%0A%0A%23%23+Coffee%0A%0AThe+first+cup.

https://tinylittleoffice.com/comic/#title=Biscuit&doc=%23%23+Biscuit%0A%0A---%0A%0A-+%3Adog%3A+Walk%3F+%7C+Monday

https://tinylittleoffice.com/menu/#title=Harbor+Coffee&doc=%23+Harbor+Coffee%0A%0ASmall-batch+coffee%2C+roasted+on+the+quay.%0A%0A%23%23+Coffee%0A%0ADish+%7C+Price%3Amoney+%7C+About%0A---+%7C+---+%7C+---%0AEspresso+%7C+3.00+%7C+Dark+and+syrupy%0AFlat+white+%7C+4.20+%7C%0AFilter+%7C+3.50+%7C+Ask+what+is+on+today%0A%0A%23%23+To+eat%0A%0ADish+%7C+Price%3Amoney+%7C+About%0A---+%7C+---+%7C+---%0ACardamom+bun+%7C+3.50+%7C+Baked+at+six%2C+gone+by+ten%0AToast+and+jam+%7C+4.00+%7C+Sourdough%2C+salted+butter

## Small apps

- `flow` (stock and flow, drawn as a Sankey diagram with sliders): `- name = 1000 (0 to 5000)` is a number with a slider; `~ From -> To: formula` is a flow, its formula using slider names and stocks.
- `pixel` (16×16): a line per row, a letter per square; `.` empty, `a` black, `b` indigo, `c` red, `d` orange, `e` yellow, `f` green, `g` sky, `h` pink.
- `floor`: `- Room: 4 x 3 at 0,0`. `seating`: `- Table: Ann, Bob, Cy`. `family`: a nested list, a person or couple per item. `timeline`: `- When: what happened`.
- Games: `adventure` (`## scene` headings, the story as paragraphs, choices as `- [Do this](#scene)`), `trivia` (`teams: A, B` in the header, `## Round` and a table `Question | Answer`), `hunt` (a table `Clue | Answer`), `flashcards` (a table `Front | Back`), `madlibs` (a story with `[blanks]`), `spinner` (a `- ` list of choices), `wordsearch`.
- Together: `poll` (`# Question`, the choices as a `- ` list, and a table `Name | Choice` of answers), `santa` (the people as a `- ` list; each gets a private link to their own draw), `split` (`between: A, B, C` in the header, and a table `Who | Amount:money | What`).
- Personal: `log` (a table of entries; each kind is totalled).

https://tinylittleoffice.com/flow/#title=Funnel&doc=%23+A+subscription+business%0A%0A-+visitors+%3D+20000+%280+to+100000%29%0A-+signup+rate+%3D+6%25+%280+to+30%29%0A-+paid+rate+%3D+25%25+%280+to+100%29%0A-+churn+%3D+8%25+%280+to+50%29%0A%0A~+Visitors+-%3E+Signups%3A+visitors+%2A+signup+rate%0A~+Visitors+-%3E+Bounced%3A+visitors+-+visitors+%2A+signup+rate%0A~+Signups+-%3E+Paying%3A+signups+%2A+paid+rate%0A~+Signups+-%3E+Free%3A+signups+-+signups+%2A+paid+rate%0A~+Paying+-%3E+Churned%3A+paying+%2A+churn%0A~+Paying+-%3E+Retained%3A+paying+-+paying+%2A+churn

https://tinylittleoffice.com/timeline/#title=Computing&doc=-+1843%3A+Lovelace+publishes+her+notes%0A-+1936%3A+Turing+describes+his+machine%0A-+1969%3A+The+first+ARPANET+message%0A-+1989%3A+The+web+is+proposed%0A-+2007%3A+The+phone+becomes+a+computer

https://tinylittleoffice.com/adventure/#title=The+Lighthouse&doc=%23+The+Lighthouse%0A%0A%23%23+start%0A%0AThe+storm+has+put+the+lamp+out.+Below%2C+a+ship+is+feeling+for+the+rocks.%0A%0A-+%5BClimb+to+the+lamp%5D%28%23lamp%29%0A-+%5BRun+to+the+village%5D%28%23village%29%0A%0A%23%23+lamp%0A%0AThe+stairs+are+slick.+The+lamp+is+cold%2C+but+there+is+oil%2C+and+matches.%0A%0A-+%5BLight+it%5D%28%23lit%29%0A-+%5BGo+back+down%5D%28%23start%29%0A%0A%23%23+lit%0A%0AThe+beam+swings+out.+The+ship+turns.+You+sit+down+on+the+top+step%2C+shaking.%0A%0A%23%23+village%0A%0ABy+the+time+you+get+back+with+help%2C+there+is+only+wreckage.

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
- Tables you want to query: `db`.
- Dates and durations: `gantt` for tasks, `cal` for events.
- A wall of ideas or a retro: `board`. Something to publish: `site`, `store`, `invoice`.
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
