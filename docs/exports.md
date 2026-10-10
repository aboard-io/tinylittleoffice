# What each app exports

Every document is a link; these are the files it becomes, from the Download menu, and from a link with the
extension after the app's name (`#/v1/sheet.xlsx/<payload>` downloads on arrival; `#/v1/write.print/…`
prints). Every file is built in the browser, from the document, by the app's definition
(`src/apps/<id>/def.ts`, `exports`) and the kit (`src/kit/exports.ts`); nothing is sent anywhere. Mod+S
keeps the document on the device (under Saved), it does not download. This page is written from the
definitions by `node scripts/exports-doc.ts`; a test fails when it is out of date.

## Every app

| Format | What the file holds |
| --- | --- |
| Print, or save as PDF | The browser's own print dialog, which saves a PDF: a page per page the app draws, at its own size, the words in the SVG still text. Mod+P. |
| `.png` | Picture (PNG): the whole document as one picture, its pages stacked. |
| `.html` | Web page (HTML): a web page of its pages as pictures (an app with its own web page lists it below, and that one is used). |
| `.tlo` | Text (TLO): the document exactly as its link holds it (docs/tlo.md). |

Text files are UTF-8; only CSV carries a byte order mark, which Excel needs. A file is named from the
document's title, or from what one of the app's documents is called.

## Each app's own

| App | Format | Menu item |
| --- | --- | --- |
| Word Processor | `.docx` | Word (DOCX) |
| Word Processor | `.md` | Markdown |
| Word Processor | `.rtf` | Rich Text (RTF) |
| Word Processor | `.html` | Web page (HTML) |
| Outliner | `.opml` | OPML (for outliners) |
| Outliner | `.md` | Markdown |
| Outliner | `.txt` | Plain text |
| Presentation Builder | `.pptx` | PowerPoint (PPTX) |
| Presentation Builder | `.html` | Web page (HTML) |
| Presentation Builder | `.zip` | A picture of every slide (ZIP of PNGs) |
| Presentation Builder | `.gif` | A film of the deck (GIF) |
| Spreadsheet | `.xlsx` | Excel (XLSX) |
| Spreadsheet | `.csv` | CSV |
| Spreadsheet | `.chart.svg` | Chart (SVG) |
| Spreadsheet | `.chart.png` | Chart (PNG) |
| Calculator | `.txt` | The tape (text) |
| Drawing Tool | `.svg` | Picture (SVG) |
| Drawing Tool | `.tile.svg` | Background tile (SVG) |
| Drawing Tool | `.tile.png` | Background tile (PNG) |
| Diagram Maker | `.svg` | Picture (SVG) |
| Animator | `.gif` | Animated GIF |
| Animator | `.svg` | Animated SVG |
| Kanban Board | `.csv` | CSV |
| To-Do List | `.md` | Markdown |
| To-Do List | `.ics` | Calendar to-dos (ICS) |
| Calendar | `.ics` | iCalendar (ICS) |
| Calendar | `.csv` | CSV |
| Trip Planner | `.gpx` | GPX route |
| Trip Planner | `.geojson` | GeoJSON |
| Website Builder | `.html` | The website (HTML) |

A seating chart (Diagram Maker, `kind: seating`) prints its place cards from its bar: a card a guest, eight to a
letter sheet, with lines to cut along.

## Open in another app

Under Download, "Open in": the document as another app reads it, converted by a pure function of its text
(`src/apps/<id>/convert.ts`), opened in this tab.

| From | Opens in | Menu item |
| --- | --- | --- |
| Word Processor | Presentation Builder | Show as slides |
| Word Processor | Outliner | Open as an outline |
| Word Processor | Website Builder | Make it a website |
| Outliner | Presentation Builder | Show as slides |
| Outliner | Diagram Maker | Draw as a mind map |
| Outliner | Diagram Maker | Draw as an org chart |
| Outliner | Diagram Maker | Draw as a network |
| Spreadsheet | Calendar | Put the dated rows on a calendar |
| Drawing Tool | Animator | Animate this drawing |
| Diagram Maker | Drawing Tool | Open in Drawing Tool |
| Kanban Board | To-Do List | Make a to-do list of the cards |
| To-Do List | Kanban Board | Show on a board |
| To-Do List | Calendar | Put the dated tasks on a calendar |
| Calendar | To-Do List | Make a to-do list of it |
| Trip Planner | Calendar | Put the stops on a calendar, a day each |
