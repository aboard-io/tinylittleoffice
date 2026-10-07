---
name: tinyoffice
description: Make almost any small document as a shareable link by writing a TinyLittleOffice URL: spreadsheets and charts, text, slide decks, outlines, drawings and diagrams (org chart, mind map, swimlanes, Venn, network, floor plan, seating, family tree, timeline), calendars, to-do lists, kanban boards, Gantt charts, map routes, databases, one-page websites, shops, invoices, contracts, zines, booklets, brochures, comics, posters, menus, résumés, name badges, recipe cards, stock-and-flow models, pixel art, word searches, choose-your-own-adventures, scavenger hunts, quizzes, flashcards, spinners, polls, Secret Santa draws, bill splitting, logs, chord charts, QR codes and more. Use when someone asks for any of these and a link they can open, edit and share would serve them better than a file.
---

# TinyLittleOffice links

TinyLittleOffice (https://tinylittleoffice.com) is an office suite whose documents live entirely in their links. You make a document by writing a URL. Nothing is uploaded or stored: opening the link shows the document in an editor, and whoever opens it can change it and share the new link.

## The URL

```
https://tinylittleoffice.com/<app>/#title=<title>&doc=<document>
```

- `<app>` is one of the apps below.
- `title` is optional: the document's name.
- `by` is optional: who made it (your name as an agent, say). It shows in the document's About panel as a claim; a signature proves it.
- `md` can stand in for `doc`: Markdown or CSV, shaped into the app's format when the page opens (a table becomes a sheet or the rows of a menu or invoice; headings become slides; `- [ ]` become tasks). Use `doc` when you know the app's format; `md` when you have Markdown already.
- `doc` is the document as plain text, in the app's format, URL-encoded: a new line is `%0A`, a tab is `%09`, a space is `+` or `%20`, and `& # % + =` inside the text must be percent-encoded.
- `view` is optional: `show` opens a deck presenting, `embed` shows the document alone (for an iframe), and `pdf`, `png`, `html` or `md` download it. Every app downloads as Markdown (headings, lists, checkboxes and tables as a reader would expect), and the Download menu's "Import Markdown or CSV…" reads Markdown (or a CSV, as a table) back into any app.

Put the parameters after `#`, exactly as shown, never after `?`. The part of an address after `#` stays in the browser: it is not sent to the server, so the document is never logged anywhere. Parameters after `?` are ignored.

On opening, the link is rewritten into a compact form, which is what the person will share onward. Give them the link you wrote; they do not need to know its format.

Length: browsers open links of many thousands of characters, but a QR code holds at most 2,953, and some chat apps cut a link past about 2,000. Keep the whole URL under 2,000 where you can, under 2,953 always; nothing degrades before that except how the link travels. A document shown on a slide (below) costs far less than a full link pasted in.

Non-ASCII characters (`·`, `–`, `→`, accents, emoji) are fine: percent-encode them as UTF-8.

## Apps and their formats

### sheet: a spreadsheet, and charts

Rows on separate lines, cells separated by tabs. Up to 6 columns (A to F) and 1,000 rows. A cell starting with `=` is a formula: `+ - * / ^`, comparisons, cell references (`B2`), ranges (`A1:A5`), and `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN INT ABS SQRT MOD NPV IRR PMT FV PV TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY`.

An optional first line holds settings: `!<chart>|<types>`. The chart is `bar`, `line`, `pie` or nothing. The types are one letter per column: `t` text, `n` number, `$` money, `%` percent, `d` date (written `2027-03-01`), `u` link, `c` checkbox (`x` is ticked), `r` rich text. Dates are numbers of days, so `=B2-A2` is the days between two dates and `=A2+30` is thirty days later.

For a chart, put labels in the first column, a header row on top, and numbers beside them.

A bar chart of three quarters:

https://tinylittleoffice.com/sheet/#title=Sales+by+quarter&doc=!bar%0AQuarter%09Sales%0AQ1%09120%0AQ2%09180%0AQ3%09240

A small budget with a total and money formatting:

https://tinylittleoffice.com/sheet/#title=Budget&doc=!%7Ct%24%0AItem%09Cost%0ARent%091200%0AFood%09450%0ATotal%09%3DSUM(B2%3AB3)

### write: a short document

One block per line. `# ` heading, `## ` subheading, `- ` bullet, `+ ` numbered item; repeat the marker to nest (`-- `). Inline: `*bold*`, `_italic_`, `^underline^`, `~strike~`, `=highlight=`, and an icon in the line as its name between colons, `:rocket:`. A line may start `>c `, `>r ` or `>j ` to be centred, right-aligned or justified. Web addresses become links.

https://tinylittleoffice.com/write/#title=Meeting+notes&doc=%23+Meeting+notes%0AWe+agreed+on+*three+things*.%0A-+Ship+on+Friday%0A--+Ben+owns+the+release%0A-+Review+pricing

### outline: an outliner

One item per line; indent two spaces to put an item under the one above. The same text `mind`, `org` and `family` read, so an outline opens as any of them in a tap. Items take `write`'s inline marks. Downloads as OPML, Markdown (a nested list), text.

https://tinylittleoffice.com/outline/#title=Launch&doc=Launch%0A++Product%0A++++Pricing%0A++++Onboarding%0A++Marketing%0A++++Press

### deck: slides

Slides are separated by a blank line. Each slide: an optional first line `:icon-name` (a Lucide icon name such as `rocket`, `users`, `chart-column`), then the headline, then one bullet per line. A layout can follow the icon after a second colon: `:rocket:t` or `::t` is a title slide (headline plus subtitle), `::2` is two columns with a line `|` between the left and right bullets, `:star:i` is bullets beside one big icon. Add `&view=show` to open it presenting. Headlines and bullets take the same inline marks as `write` (`*bold*`, `=highlight=`, `:icon:`); a bullet indented two spaces (up to three times) nests under the one above. Every deck ends with an extra slide made for you: a QR code of the whole deck, its title beneath, so the room can take it home.

A slide can show a chart or a table instead of bullets: after the headline, write the sheet's own rows (a `!bar`, `!line` or `!pie` settings line, then tab-separated rows, as in `sheet` above). The slide becomes that chart, full size. The compact link keeps it as `@@sheet/…`; a slide may likewise show any other document as `@@<app>/<payload>` (a map, a drawing, a timeline), which a program gets from the package's `link()` or by opening the document and copying the part after `#/v2/`.

Things to know when writing decks:
- Layouts and nesting combine: `:star:t` is a title slide with an icon; nested bullets work in both columns of a `::2` slide.
- A web address in a bullet is shown as written, and the marks inside it (`=`, `_`) are left alone; in `write` and the web-page download it is also a link.
- An icon name that is not in the library is left out: the slide is drawn without it, nothing breaks. Any Lucide name works (`chart-column`, `building-2`, `heart-handshake`); the package's `searchIcons('brain')` and `lint()` check names.
- A bar or line chart with several number columns draws one series per column (`!bar|tnn` with three columns is two series).
- A line starting `> ` on a slide is a speaker note: not drawn, shown to the presenter under the slide.

https://tinylittleoffice.com/deck/#title=Launch+plan&doc=%3Arocket%3At%0ALaunch+plan%0ASpring+2027%0A%0A%3Atarget%0AGoals%0AShip+the+beta%0ASign+ten+customers%0A%0A%3A%3A2%0ANow+and+next%0ADesign%0ABuild%0A%7C%0ATest%0ALaunch

### org: an org chart

One person per line, `Name | Role`. Indent two spaces to put someone under the person above.

A line `Ben .. Eve: advises` draws a dotted line between two people already in the chart (the label is optional).

https://tinylittleoffice.com/org/#title=Team&doc=Ada+Diaz+%7C+Chief+executive%0A++Ben+Okoro+%7C+Engineering%0A++++Cy+Lund+%7C+Platform%0A++Eve+Marsh+%7C+Design

### mind: a mind map

The central idea on the first line; indent two spaces per level to branch.

https://tinylittleoffice.com/mind/#title=Launch&doc=Launch%0A++Product%0A++++Pricing%0A++++Onboarding%0A++Marketing%0A++++Press%0A++Support

### lanes: a swimlane process

One step per line, in order: `Who: what they do`. A step ending in `?` is drawn as a decision.

https://tinylittleoffice.com/lanes/#title=Order+to+delivery&doc=Customer%3A+Places+order%0ASales%3A+Checks+stock%0ASales%3A+In+stock%3F%0AWarehouse%3A+Packs+it%0ACourier%3A+Delivers

### venn: a Venn diagram

Two or three sets, one per line: `Name: thing, thing`. What sets share: `A & B: thing`.

https://tinylittleoffice.com/venn/#title=Pick+two&doc=Fast%3A+espresso%0ACheap%3A+instant+noodles%0AGood%3A+slow+cooking%0AFast+%26+Cheap%3A+fast+food%0ACheap+%26+Good%3A+home+cooking%0AFast+%26+Good%3A+a+great+takeaway

### net: a network diagram

One connection per line: `A > B` for an arrow, `A - B` for a line, and `: label` to name it. A name alone is an unconnected node.

https://tinylittleoffice.com/net/#title=System&doc=Web+%3E+API%3A+requests%0AAPI+%3E+Database%3A+queries%0AAPI+%3E+Cache%0AWorker+%3E+Database

### db: a small database

A table is a heading line `name: column, column > other_table` followed by one row per line, values separated by commas. A blank line separates tables. A line starting with `?` is a SQL query, answered under the schema diagram. The SQL understood: `SELECT` columns (or `*`, `count(*)`, `sum/avg/min/max(col)`, `AS`), `FROM`, `JOIN ... ON a = b`, `WHERE` with `= <> < > <= >= LIKE` joined by `AND`/`OR`, `GROUP BY`, `ORDER BY ... DESC`, `LIMIT`.

https://tinylittleoffice.com/db/#title=Team+directory&doc=teams%3A+id%2C+name%0A1%2C+Platform%0A2%2C+Design%0A%0Apeople%3A+id%2C+name%2C+team_id+%3E+teams%0A1%2C+Ann%2C+1%0A2%2C+Bo%2C+2%0A3%2C+Cy%2C+1%0A%0A%3F+select+teams.name%2C+count(*)+as+people+from+people+join+teams+on+team_id+%3D+teams.id+group+by+teams.name

### site: a one-page website

`# Name` and a line about it; `## Section` starts each part; `- Point | detail` makes a card (start it with `:icon-name` for an icon); `> Label | https://...` makes a button (`#section-name` links within the page). The Web page download is the finished site as one file.

https://tinylittleoffice.com/site/#title=Harbor+Coffee&doc=%23+Harbor+Coffee%0ASmall-batch+coffee%2C+roasted+on+the+quay.%0A%3E+See+the+menu+%7C+%23menu%0A-+%3Acoffee+Roasted+daily+%7C+Never+more+than+a+week+old%0A-+%3Aleaf+Fair+trade+%7C+Bought+direct%0A%23%23+Menu%0AEspresso%2C+filter+and+a+pastry+case.%0A-+Espresso+%7C+3.00%0A-+Flat+white+%7C+4.20

### store: a shop page with a cart

`# Name` and a line about it; a product per line, `Name | price | about | image address` (the last two optional); `currency: $` and `orders: someone@example.com` (where orders are emailed). The page has a working cart.

https://tinylittleoffice.com/store/#title=Shop&doc=%23+Harbor+Coffee+Shop%0ABeans+and+things%2C+posted+on+Fridays.%0Acurrency%3A+%24%0Aorders%3A+orders%40example.com%0AHouse+blend%2C+250g+%7C+12.50+%7C+Chocolate+and+orange%0ATin+mug+%7C+9.00+%7C+Enamel

### invoice: an invoice

Headings `From:`, `To:`, `Number:`, `Date:`, `Due:`, `Tax: 8%`, `Currency: $` (use ` | ` for a second line in an address), then one item per line: `what, quantity, price`. Other lines are notes at the foot. Totals are worked out; the PDF download is the invoice.

https://tinylittleoffice.com/invoice/#doc=From%3A+Harbor+Studio+%7C+14+Quay+Street%0ATo%3A+Acme+Ltd%0ANumber%3A+0042%0ADate%3A+2027-03-01%0ADue%3A+2027-03-31%0ATax%3A+8%25%0ADesign%2C+12%2C+150%0ABuild%2C+20%2C+140%0AThank+you.&title=Invoice+0042

### gantt: a schedule

One task per line: `start date, days, name`. Add how far along it is as `50%` before the name. Start a line with `>` to make the task part of the one above.

https://tinylittleoffice.com/gantt/#title=Website+relaunch&doc=2027-03-01%2C+10%2C+Design%0A%3E+2027-03-01%2C+4%2C+100%25%2C+Wireframes%0A%3E+2027-03-05%2C+6%2C+50%25%2C+Visual+design%0A2027-03-11%2C+15%2C+Build

### board: a kanban board

A line starting with `#` is a stage (`#Doing|2` limits it to two cards); the lines under it are its cards.

https://tinylittleoffice.com/board/#title=Sprint&doc=%23To+do%0AWrite+the+brief%0ADesign+the+page%0A%23Doing%7C2%0ABuild+the+form%0A%23Done%0AChoose+a+name

### todo: a task list

One task per line: `- ` open, `x ` done, `-! ` starred. A due date goes first, as `@2027-03-01`.

https://tinylittleoffice.com/todo/#title=Trip+prep&doc=-+%402027-03-01+Renew+passport%0A-!+Book+flights%0Ax+Choose+dates

### cal: a calendar

One span per line: a date and a label (`2027-03-01 Offsite`), a range (`2027-03-01 to 2027-03-03 Offsite`), or a time (`2027-03-01 09:00-10:30 Call`). An optional first line `@Europe/London` gives the time zone for times.

https://tinylittleoffice.com/cal/#title=March&doc=2027-03-01+to+2027-03-03+Offsite%0A2027-03-08+Launch+day%0A2027-03-10+09%3A00-10%3A30+Retro

### trip: a route on a map

One stop per line: `latitude, longitude, name | note`, in decimal degrees. An optional first line `miles` or `km` sets the units (otherwise driving hours are estimated).

https://tinylittleoffice.com/trip/#title=Portugal&doc=km%0A38.7223%2C+-9.1393%2C+Lisbon+%7C+Pastel+de+nata+first%0A40.2033%2C+-8.4103%2C+Coimbra%0A41.1579%2C+-8.6291%2C+Porto+%7C+Port+cellars

### draw: a free drawing

One shape per line: `kind,x,y,w,h,style,label`, on a grid 80 wide and 50 tall. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `l` line, `a` arrow. `k` joins two shapes with an arrow and `j` with a line; for those, `x` and `y` are the line numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid) optionally followed by a colour letter (`r o g b p`) and a text size (`1` to `4`). Prefer the diagram apps above when one fits: they lay themselves out.

https://tinylittleoffice.com/draw/#title=Request+flow&doc=o%2C4%2C6%2C16%2C8%2C1b%2CBrowser%0Ao%2C32%2C6%2C16%2C8%2C1b%2CServer%0Ac%2C60%2C5%2C14%2C10%2C1g%2CData%0Ak%2C0%2C1%2C0%2C0%2C0%2Casks%0Ak%2C1%2C2%2C0%2C0%2C0%2Creads

### anim: a drawing that moves

A Draw document, with a first line `!<frames>[,<fps>]` (frames in base 36, up to 120; 4, 8 or 12 a second) and, after the shapes, a key line per moving shape: `@<shape number>` (base 36, counting from 0), a tab, then keys separated by `;`, each `t,dx,dy,z,s,r[,fx]` in base 36: the frame, the offset in px from where the shape was drawn, its depth in px (nearer when positive), its size in tenths (`a` is 1), its spin in degrees, and effect letters (`i` impact meme, `3` 3D, `d` shadow, `n` neon, `o` outline, `g` rainbow, `m` mirror, `w` wobble, `b` blur). Between keys it moves in straight lines; a shape with no keys stays put. Plain `doc=` text is taken as is.

https://tinylittleoffice.com/anim/#title=Lift+off&doc=%21o%0At%2C4%2C20%2C20%2C4%2C04%2CLift+off%0Ai%2C8%2C36%2C8%2C8%2C0b%2Crocket%0A%400%090%2C0%2C0%2C0%2Ca%2C0%3Bn%2C0%2C-2s%2C0%2Ca%2C0%2Ci%0A%401%090%2C0%2C0%2C0%2Ca%2C0%3Bn%2C5k%2C-5k%2C2s%2Ca%2C-u%2Cd

## Things to print

Each of these turns a few lines into letter-size sheets; the PDF download prints at actual size.

- `poster`: one page written like a slide: an optional `:icon-name` line (a page type after a second colon, as in `deck`: `:music:t` title, `::2` two columns, `::i` big icon, `::b` bullets), a headline, then a line per thing to say. Laid out by the deck's engine, as big as the page allows.
  https://tinylittleoffice.com/poster/#title=Open+mic&doc=%3Amusic%0AOpen+mic+night%0AFriday+12+March%2C+8pm%0AThe+Anchor%2C+14+Quay+Street
- `menu`: `# Name`, a line about it, `## Section`, then `Dish | price | what it is`.
  https://tinylittleoffice.com/menu/#title=Harbor+Coffee&doc=%23+Harbor+Coffee%0A%23%23+Coffee%0AEspresso+%7C+3.00+%7C+Dark+and+syrupy%0AFlat+white+%7C+4.20
- `resume`: written like `write` (`# Name`, `## Section`, `- point`), fitted to one page.
- `badges`: a page per person, separated by blank lines: the name as the headline, then role and where from on lines of their own. Six badges a sheet.
- `recipes`: a page per dish, separated by blank lines: an optional `:icon-name`, the dish, then a line per ingredient and step. Two cards a sheet.

`zine` (8 pages), `booklet` (8 to 20) and `brochure` (6 panels) are pages like a deck's slides: chunks separated by a blank line, each an optional `:icon-name` line, a headline, then lines of words.

`comic` is a zine whose pages are panels: a blank line between pages, a panel per line as `:icon-name What is said | caption`, and `# Title` alone for a title page.

https://tinylittleoffice.com/comic/#title=Biscuit&doc=%23+Biscuit+Goes+Out%0A%0A%3Adog+Walk%3F+%7C+Monday%2C+noon.%0A%3Afootprints+WALK%21+%7C+Sam+arrives.

https://tinylittleoffice.com/zine/#title=Small+Joys&doc=%3Acoffee%0ASmall+Joys%0AIssue+one%0A%0ACoffee%0AThe+first+cup+of+the+day%2C+before+anyone+else+is+up.%0A%0ABread%0AStill+warm.

## Small apps

All of these are a few lines of text; the first line is usually `# Title`.

- `flow` (stock and flow, drawn as a Sankey diagram with sliders): `name = 1000 (0 to 5000)` is a number with a slider (`6%` for a rate); `From > To = formula` is a flow. A formula uses slider names and stock names (a stock's name is what has flowed into it so far).
  https://tinylittleoffice.com/flow/#title=Funnel&doc=%23+Funnel%0Avisitors+%3D+20000+%280+to+100000%29%0Asignup+rate+%3D+6%25+%280+to+30%29%0AVisitors+%3E+Signups+%3D+visitors+%2A+signup+rate%0AVisitors+%3E+Bounced+%3D+visitors+-+visitors+%2A+signup+rate
- `pixel` (16×16): a row per line, a letter per square; `.` empty, `a` black, `b` indigo, `c` red, `d` orange, `e` yellow, `f` green, `g` sky, `h` pink.
- `floor`: `Room: width x depth at left,top`. `seating`: `Table: Ann, Bob, Cy`. `family`: a person or couple per line, children indented. `timeline`: `When: what happened`.
  https://tinylittleoffice.com/timeline/#title=Computing&doc=1843%3A+Lovelace+publishes+her+notes%0A1936%3A+Turing+describes+his+machine%0A1989%3A+The+web+is+proposed
- Games: `wordsearch` (a word per line), `adventure` (`## scene`, story lines, `> Choice | scene`), `hunt` (`Clue | answer`), `trivia` (`teams: A, B`, `## Round`, `Question | answer`), `madlibs` (a story with `[blanks]`), `spinner` (a choice per line), `flashcards` (`Front | back`).
  https://tinylittleoffice.com/adventure/#title=The+Lighthouse&doc=%23+The+Lighthouse%0A%23%23+start%0AThe+lamp+is+out.%0A%3E+Climb+to+the+lamp+%7C+lamp%0A%23%23+lamp%0AYou+light+it.+The+ship+turns.
- Together: `poll` (`- Choice` lines, then `Name: choice` from each person), `santa` (a name per line; the page gives the organiser a private link per person, each showing only that person's draw), `split` (`Name: amount, what for`; `between: A, B, C`).
- Personal: `log` (`when, what, how much`; each kind is totalled), `chords` (`[G]words with [C]chords`, `transpose: 2`).

## How a link is packed

After `#/v2/<app>/` comes one letter and then base64url bytes: `w` (deflate, primed with a shared dictionary and that app's own), `y` (deflate with the shared dictionary), `z` (plain deflate), `r` (raw); a capital letter means the bytes begin with an envelope of `c<created>`, `t<title>` and signing lines before a blank line. `E` is a password-sealed link. You never need to make these: the plain-parameter form (`#title=…&doc=…`) is turned into the shortest of them when opened.

## Icons in diagrams

In `org`, `mind`, `lanes`, `venn`, `net` and `draw`, a label may start with an icon: `:rocket Launch`, `:user Ada | CEO`. Any Lucide icon name works.

## Choosing an app

- Numbers, a table, or a chart: `sheet`.
- People and reporting lines: `org`. Ideas branching from one topic: `mind`.
- A process with handoffs: `lanes`. Systems and what talks to what: `net`. Overlapping categories: `venn`.
- Tables you want to query: `db`.
- Dates and durations: `gantt` for tasks, `cal` for events.
- A wall of ideas or a retro: `board` (one stage) or `draw`. Questions and answers: `site` (`- Question | answer` cards).
- Something to publish: `site` for a page, `store` for products, `invoice` to bill.
- Anything else visual: `draw`.

## From JavaScript

```js
import { link } from 'https://tinylittleoffice.com/tinyoffice.js';
link({ app: 'sheet', title: 'Sales', doc: '!bar\nQuarter\tSales\nQ1\t120\nQ2\t180' });
```

## Good practice

- Always URL-encode `doc` and `title`. Check that `#`, `&`, `%`, `+` and `=` in the content are encoded.
- Give the link as a Markdown link with a plain description: `[Sales by quarter (chart)](https://...)`.
- Say that the link is the document: editing it changes the link, and anyone with the link can read it.

## Without a browser

For a program or an agent, the packages make and read these links directly. Until they are on npm and PyPI, install them from the repository:

```
npm i https://gitpkg.vercel.app/ftrain/tinyoffice/packages/doc?main
pip install "git+https://github.com/ftrain/tinyoffice#subdirectory=packages/python"
```

`@tinylittleoffice/doc` has `link(app, body, {title, by})`, `linkFromMarkdown`, `parse(url)` (the document as Markdown too), `compare(a, b)` for what changed, `evaluateSheet`, `runModel`, `signed`/`verified` for provenance, and `lint(app, body)` which says what a browser would not: unknown icons, a layout that does not exist, a link too long for a QR code. The `tinyoffice` command does the same from a shell, and `tinyoffice render <link> --out x.pdf` makes the file. Two links compare on the site at `#/compare/<app>/<payload>/<app>/<payload>`.
