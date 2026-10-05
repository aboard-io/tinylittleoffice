---
name: tinyoffice
description: Make a document, chart, diagram, slide deck, schedule, map route or small database as a shareable link, by writing a TinyOffice URL. Use when someone asks for a quick spreadsheet, chart, org chart, mind map, flow or swimlane diagram, Venn diagram, network diagram, Gantt chart, kanban board, to-do list, calendar, slides, a short document, or a queryable table, and a link they can open, edit and share would serve them better than a file.
---

# TinyOffice links

TinyOffice (https://tinyoffice.exe.xyz) is an office suite whose documents live entirely in their links. You make a document by writing a URL. Nothing is uploaded or stored: opening the link shows the document in an editor, and whoever opens it can change it and share the new link.

## The URL

```
https://tinyoffice.exe.xyz/<app>/#title=<title>&doc=<document>
```

- `<app>` is one of the apps below.
- `title` is optional: the document's name.
- `doc` is the document as plain text, in the app's format, URL-encoded: a new line is `%0A`, a tab is `%09`, a space is `+` or `%20`, and `& # % + =` inside the text must be percent-encoded.
- `view` is optional: `show` opens a deck presenting, `embed` shows the document alone (for an iframe), and `pdf`, `png` or `html` download it.

Put the parameters after `#`, exactly as shown, never after `?`. The part of an address after `#` stays in the browser: it is not sent to the server, so the document is never logged anywhere. Parameters after `?` are ignored.

On opening, the link is rewritten into a compact form, which is what the person will share onward. Give them the link you wrote; they do not need to know its format.

Keep the whole URL under about 2,000 characters. Prefer a short, clear document over a long one.

## Apps and their formats

### sheet: a spreadsheet, and charts

Rows on separate lines, cells separated by tabs. Up to 6 columns (A to F) and 30 rows. A cell starting with `=` is a formula: `+ - * / ^`, comparisons, cell references (`B2`), ranges (`A1:A5`), and `SUM AVG MIN MAX COUNT MEDIAN PRODUCT IF AND OR NOT ROUND ROUNDUP ROUNDDOWN INT ABS SQRT MOD NPV IRR PMT FV PV TODAY DATE DAYS EDATE WORKDAYS YEAR MONTH DAY WEEKDAY`.

An optional first line holds settings: `!<chart>|<types>`. The chart is `bar`, `line`, `pie` or nothing. The types are one letter per column: `t` text, `n` number, `$` money, `%` percent, `d` date (written `2027-03-01`), `u` link, `c` checkbox (`x` is ticked), `r` rich text. Dates are numbers of days, so `=B2-A2` is the days between two dates and `=A2+30` is thirty days later.

For a chart, put labels in the first column, a header row on top, and numbers beside them.

A bar chart of three quarters:

https://tinyoffice.exe.xyz/sheet/#title=Sales+by+quarter&doc=!bar%0AQuarter%09Sales%0AQ1%09120%0AQ2%09180%0AQ3%09240

A small budget with a total and money formatting:

https://tinyoffice.exe.xyz/sheet/#title=Budget&doc=!%7Ct%24%0AItem%09Cost%0ARent%091200%0AFood%09450%0ATotal%09%3DSUM(B2%3AB3)

### write: a short document

One block per line. `# ` heading, `## ` subheading, `- ` bullet, `+ ` numbered item; repeat the marker to nest (`-- `). Inline: `*bold*`, `_italic_`, `^underline^`, `~strike~`. Web addresses become links.

https://tinyoffice.exe.xyz/write/#title=Meeting+notes&doc=%23+Meeting+notes%0AWe+agreed+on+*three+things*.%0A-+Ship+on+Friday%0A--+Ben+owns+the+release%0A-+Review+pricing

### deck: slides

Slides are separated by a blank line. Each slide: an optional first line `:icon-name` (a Lucide icon name such as `rocket`, `users`, `chart-column`), then the headline, then one bullet per line. A layout can follow the icon after a second colon: `:rocket:t` or `::t` is a title slide (headline plus subtitle), `::2` is two columns with a line `|` between the left and right bullets, `:star:i` is bullets beside one big icon. Add `&view=show` to open it presenting.

https://tinyoffice.exe.xyz/deck/#title=Launch+plan&doc=%3Arocket%3At%0ALaunch+plan%0ASpring+2027%0A%0A%3Atarget%0AGoals%0AShip+the+beta%0ASign+ten+customers%0A%0A%3A%3A2%0ANow+and+next%0ADesign%0ABuild%0A%7C%0ATest%0ALaunch

### org: an org chart

One person per line, `Name | Role`. Indent two spaces to put someone under the person above.

https://tinyoffice.exe.xyz/org/#title=Team&doc=Ada+Diaz+%7C+Chief+executive%0A++Ben+Okoro+%7C+Engineering%0A++++Cy+Lund+%7C+Platform%0A++Eve+Marsh+%7C+Design

### mind: a mind map

The central idea on the first line; indent two spaces per level to branch.

https://tinyoffice.exe.xyz/mind/#title=Launch&doc=Launch%0A++Product%0A++++Pricing%0A++++Onboarding%0A++Marketing%0A++++Press%0A++Support

### lanes: a swimlane process

One step per line, in order: `Who: what they do`. A step ending in `?` is drawn as a decision.

https://tinyoffice.exe.xyz/lanes/#title=Order+to+delivery&doc=Customer%3A+Places+order%0ASales%3A+Checks+stock%0ASales%3A+In+stock%3F%0AWarehouse%3A+Packs+it%0ACourier%3A+Delivers

### venn: a Venn diagram

Two or three sets, one per line: `Name: thing, thing`. What sets share: `A & B: thing`.

https://tinyoffice.exe.xyz/venn/#title=Pick+two&doc=Fast%3A+espresso%0ACheap%3A+instant+noodles%0AGood%3A+slow+cooking%0AFast+%26+Cheap%3A+fast+food%0ACheap+%26+Good%3A+home+cooking%0AFast+%26+Good%3A+a+great+takeaway

### net: a network diagram

One connection per line: `A > B` for an arrow, `A - B` for a line, and `: label` to name it. A name alone is an unconnected node.

https://tinyoffice.exe.xyz/net/#title=System&doc=Web+%3E+API%3A+requests%0AAPI+%3E+Database%3A+queries%0AAPI+%3E+Cache%0AWorker+%3E+Database

### db: a small database

A table is a heading line `name: column, column > other_table` followed by one row per line, values separated by commas. A blank line separates tables. A line starting with `?` is a SQL query, answered under the schema diagram. The SQL understood: `SELECT` columns (or `*`, `count(*)`, `sum/avg/min/max(col)`, `AS`), `FROM`, `JOIN ... ON a = b`, `WHERE` with `= <> < > <= >= LIKE` joined by `AND`/`OR`, `GROUP BY`, `ORDER BY ... DESC`, `LIMIT`.

https://tinyoffice.exe.xyz/db/#title=Team+directory&doc=teams%3A+id%2C+name%0A1%2C+Platform%0A2%2C+Design%0A%0Apeople%3A+id%2C+name%2C+team_id+%3E+teams%0A1%2C+Ann%2C+1%0A2%2C+Bo%2C+2%0A3%2C+Cy%2C+1%0A%0A%3F+select+teams.name%2C+count(*)+as+people+from+people+join+teams+on+team_id+%3D+teams.id+group+by+teams.name

### sticky: sticky notes

One note per line. Start a line with `red:`, `orange:`, `green:`, `blue:` or `purple:` to colour it.

https://tinyoffice.exe.xyz/sticky/#title=Retro&doc=green%3A+Shipping+weekly+worked%0Agreen%3A+Design+reviews%0Ared%3A+Too+many+meetings%0Ared%3A+Flaky+tests%0Ablue%3A+Try+pairing+on+Fridays

### faq: a searchable FAQ page

An optional first line `# Title`, then each question on a line with its answer indented under it.

https://tinyoffice.exe.xyz/faq/#title=Help&doc=%23+Help%0AHow+do+I+share+a+document%3F%0A++Copy+the+link.+The+link+is+the+document.%0AIs+anything+stored%3F%0A++No.+Everything+is+in+the+link.

### site: a one-page website

`# Name` and a line about it; `## Section` starts each part; `- Point | detail` makes a card (start it with `:icon-name` for an icon); `> Label | https://...` makes a button (`#section-name` links within the page). The Web page download is the finished site as one file.

https://tinyoffice.exe.xyz/site/#title=Harbor+Coffee&doc=%23+Harbor+Coffee%0ASmall-batch+coffee%2C+roasted+on+the+quay.%0A%3E+See+the+menu+%7C+%23menu%0A-+%3Acoffee+Roasted+daily+%7C+Never+more+than+a+week+old%0A-+%3Aleaf+Fair+trade+%7C+Bought+direct%0A%23%23+Menu%0AEspresso%2C+filter+and+a+pastry+case.%0A-+Espresso+%7C+3.00%0A-+Flat+white+%7C+4.20

### store: a shop page with a cart

`# Name` and a line about it; a product per line, `Name | price | about | image address` (the last two optional); `currency: $` and `orders: someone@example.com` (where orders are emailed). The page has a working cart.

https://tinyoffice.exe.xyz/store/#title=Shop&doc=%23+Harbor+Coffee+Shop%0ABeans+and+things%2C+posted+on+Fridays.%0Acurrency%3A+%24%0Aorders%3A+orders%40example.com%0AHouse+blend%2C+250g+%7C+12.50+%7C+Chocolate+and+orange%0ATin+mug+%7C+9.00+%7C+Enamel

### invoice: an invoice

Headings `From:`, `To:`, `Number:`, `Date:`, `Due:`, `Tax: 8%`, `Currency: $` (use ` | ` for a second line in an address), then one item per line: `what, quantity, price`. Other lines are notes at the foot. Totals are worked out; the PDF download is the invoice.

https://tinyoffice.exe.xyz/invoice/#doc=From%3A+Harbor+Studio+%7C+14+Quay+Street%0ATo%3A+Acme+Ltd%0ANumber%3A+0042%0ADate%3A+2027-03-01%0ADue%3A+2027-03-31%0ATax%3A+8%25%0ADesign%2C+12%2C+150%0ABuild%2C+20%2C+140%0AThank+you.&title=Invoice+0042

### gantt: a schedule

One task per line: `start date, days, name`. Add how far along it is as `50%` before the name. Start a line with `>` to make the task part of the one above.

https://tinyoffice.exe.xyz/gantt/#title=Website+relaunch&doc=2027-03-01%2C+10%2C+Design%0A%3E+2027-03-01%2C+4%2C+100%25%2C+Wireframes%0A%3E+2027-03-05%2C+6%2C+50%25%2C+Visual+design%0A2027-03-11%2C+15%2C+Build

### board: a kanban board

A line starting with `#` is a stage (`#Doing|2` limits it to two cards); the lines under it are its cards.

https://tinyoffice.exe.xyz/board/#title=Sprint&doc=%23To+do%0AWrite+the+brief%0ADesign+the+page%0A%23Doing%7C2%0ABuild+the+form%0A%23Done%0AChoose+a+name

### todo: a task list

One task per line: `- ` open, `x ` done, `-! ` starred. A due date goes first, as `@2027-03-01`.

https://tinyoffice.exe.xyz/todo/#title=Trip+prep&doc=-+%402027-03-01+Renew+passport%0A-!+Book+flights%0Ax+Choose+dates

### cal: a calendar

One span per line: a date and a label (`2027-03-01 Offsite`), a range (`2027-03-01 to 2027-03-03 Offsite`), or a time (`2027-03-01 09:00-10:30 Call`). An optional first line `@Europe/London` gives the time zone for times.

https://tinyoffice.exe.xyz/cal/#title=March&doc=2027-03-01+to+2027-03-03+Offsite%0A2027-03-08+Launch+day%0A2027-03-10+09%3A00-10%3A30+Retro

### trip: a route on a map

One stop per line: `latitude, longitude, name | note`, in decimal degrees. An optional first line `miles` or `km` sets the units (otherwise driving hours are estimated).

https://tinyoffice.exe.xyz/trip/#title=Portugal&doc=km%0A38.7223%2C+-9.1393%2C+Lisbon+%7C+Pastel+de+nata+first%0A40.2033%2C+-8.4103%2C+Coimbra%0A41.1579%2C+-8.6291%2C+Porto+%7C+Port+cellars

### draw: a free drawing

One shape per line: `kind,x,y,w,h,style,label`, on a grid 80 wide and 50 tall. Kinds: `r` rectangle, `o` rounded box, `e` ellipse, `d` diamond, `h` hexagon, `p` parallelogram, `c` cylinder, `n` note, `t` text, `l` line, `a` arrow. `k` joins two shapes with an arrow and `j` with a line; for those, `x` and `y` are the line numbers (from 0) of the shapes joined. Style is a fill (`0` none, `1` tint, `2` solid) optionally followed by a colour letter (`r o g b p`) and a text size (`1` to `4`). Prefer the diagram apps above when one fits: they lay themselves out.

https://tinyoffice.exe.xyz/draw/#title=Request+flow&doc=o%2C4%2C6%2C16%2C8%2C1b%2CBrowser%0Ao%2C32%2C6%2C16%2C8%2C1b%2CServer%0Ac%2C60%2C5%2C14%2C10%2C1g%2CData%0Ak%2C0%2C1%2C0%2C0%2C0%2Casks%0Ak%2C1%2C2%2C0%2C0%2C0%2Creads

## Icons in diagrams

In `org`, `mind`, `lanes`, `venn`, `net`, `sticky` and `draw`, a label may start with an icon: `:rocket Launch`, `:user Ada | CEO`. Any Lucide icon name works.

## Choosing an app

- Numbers, a table, or a chart: `sheet`.
- People and reporting lines: `org`. Ideas branching from one topic: `mind`.
- A process with handoffs: `lanes`. Systems and what talks to what: `net`. Overlapping categories: `venn`.
- Tables you want to query: `db`.
- Dates and durations: `gantt` for tasks, `cal` for events.
- A wall of ideas or a retro: `sticky`. Questions and answers: `faq`.
- Something to publish: `site` for a page, `store` for products, `invoice` to bill.
- Anything else visual: `draw`.

## From JavaScript

```js
import { link } from 'https://tinyoffice.exe.xyz/tinyoffice.js';
link({ app: 'sheet', title: 'Sales', doc: '!bar\nQuarter\tSales\nQ1\t120\nQ2\t180' });
```

## Good practice

- Always URL-encode `doc` and `title`. Check that `#`, `&`, `%`, `+` and `=` in the content are encoded.
- Give the link as a Markdown link with a plain description: `[Sales by quarter (chart)](https://...)`.
- Say that the link is the document: editing it changes the link, and anyone with the link can read it.
