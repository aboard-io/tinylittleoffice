# What each app exports

Every document is a link; these are the files it becomes, from the Download
menu, from `Ctrl+S` (the first of the app's own) and from a link with the
extension after the app name (`#/v0/sheet.xlsx/<payload>`). Every file is
built in the browser by the app's definition (`src/apps/<id>.def.ts`,
`downloads`), the shell adding what every app has (`src/kit/core.ts`
`COMMON`, `src/kit/browser.ts` `download`). Nothing is sent anywhere.

## Every app

| Format | What the file holds |
| --- | --- |
| Print, or save as PDF | The browser's own print dialog, which saves a PDF: prose (Write) as text on its `paper:` with an inch or 25 mm margin, headings kept with the line after them; anything else a page per picture at its own size, the words in the SVG still text. The browser's fonts do the work, so every script a device can show comes out. `Mod+P`; a link `<app>.print/…` prints on arrival. |
| `.pdf` | The document's pages, each drawn by the browser as a picture (JPEG) on a page of its own size; numbered when there are several. Any script, not selectable. |
| `.png` | The whole document as one picture, pages stacked. |
| `.html` | The document as a web page: real HTML where the app has it (a text, a table, a list, a board), pictures otherwise, with the tags link previews read and the fonts inside. Apps whose document *is* a page (a site, a zine to read) give that page, whole. |
| `.md` | Markdown: the document's own text with its TLO header (`docs/tlo.md`); headings, lists, tables, checkboxes as they are. |
| `.tlo` | The document exactly as its link holds it, the app named in the header: what another TinyLittleOffice opens as the same document. |
| `.gif` | Only for a document that moves (Motion, a Deck's slides): each frame drawn, cross-faded when asked, at most 640 wide. |

Text files are UTF-8. Only CSV carries a byte order mark, because Excel
needs one to read UTF-8; nothing else does. File names come from the
document's title, lowercased, letters and digits of any script kept
(`привет-κόσμε.docx`), Latin accents dropped, everything else a hyphen.

## Each app's own

| App | Format | What the file holds |
| --- | --- | --- |
| Sheet | `.xlsx` (`.xls`) | An Excel workbook: values, the formulas in Excel's dialect (`AVG` as `AVERAGE`, named cells as their references), dates as Excel serials in a date format, money and percent formats; Excel recalculates on opening. |
| Sheet | `.csv` | The names over the columns, then the computed values as shown. A semicolon between the cells, and a decimal comma in plain numbers, where the device's locale writes decimals with a comma (Excel there reads nothing else); a comma elsewhere. |
| Write | `.docx` (`.doc`) | A Word document: paragraphs, the title and headings as styles, bold, italic, underline, strike, highlight, bulleted and numbered lists to three levels (each numbered list starting at 1), links, alignment, the `paper:` as the page size and margin; an embedded document a link to it; a picture from the web left out. |
| Write | `.rtf` | Rich Text, the same marks and lists, for anything that reads RTF. |
| Outline | `.opml` | OPML, for outliners. |
| Outline | `.pdf` | Sections and bullets as a text PDF: selectable, bookmarked, the links live. Set in Helvetica, so only Western Latin letters; for any other script, Print. |
| Outline | `.txt` | The items as indented plain text. |
| Deck | `.pptx` (`.ppt`) | PowerPoint: a slide per slide, the theme's colours, the icons as pictures, embedded documents drawn in. |
| Draw, the diagrams, Seating, Family tree, Timeline | `.svg` | The picture as SVG, the words still text. |
| Seating | `.cards.pdf` | Place cards, tiled on letter sheets to cut. |
| Calendar | `.ics` (`.ical`) | iCalendar: all-day spans as floating dates, timed spans as UTC instants, repeats as RRULE. |
| Gantt | `.ics` | iCalendar: a task an all-day event over its days, how far along it is in the description. |
| Gantt | `.csv` | Task, level, start, end, days, done %. |
| Todo | `.ics` | iCalendar to-dos (VTODO): done or not, due on its day, a star the first priority. |
| Todo | `.md` | The list as Markdown checkboxes (what `Ctrl+S` saves). |
| Board | `.csv` | Stage and card, a row a card. |
| Trip | `.gpx` | The route as a GPX track with its stops as waypoints. |
| Trip | `.geojson` (`.json`) | The stops and the route as GeoJSON. |
| Motion | `.svg` | Animated SVG: the drawing moving, as a picture any browser plays. |
| Website, Quick Links | `.html` | The site as one file, its pages switched by hash, the shop's cart in it; the fonts inside. |
| Zine, Booklet, Brochure, Comic, Poster, Badges | `.html` | The pages as a web page to read, tapped through. The `.pdf` is the sheets imposed for folding and cutting, at actual size. |
| Invoice, Contract, Spinner, Secret Santa, Split the bill | `.html` | The document as its own page (the invoice as the paper, the spinner spinning, each Santa's private page). |

All of it is the browser's: a PDF is the browser printing or drawing,
PNG and JPEG are a canvas, a zip (`.xlsx`, `.docx`, `.pptx`) is fflate,
the date and number conventions are `Intl`. Where the browser has the
File System Access API (desktop Chrome and Edge), a download asks where to
save; elsewhere it is a download, and on a phone the file opens in a tab of
its own or goes through the share sheet.
