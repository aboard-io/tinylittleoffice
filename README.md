# TinyOffice

A tiny office suite that lives entirely in the URL.

Five small apps, no server, no accounts, nothing to save. Every document is
encoded into the address bar, kept under 2,048 characters. Copy the link and
you have copied the file.

| App   | What it does                                                          |
| ----- | --------------------------------------------------------------------- |
| Sheet | A 20-row, 3-column spreadsheet with formulas (`=SUM(A1:A5)*2`).        |
| Write | A one-page rich text editor: headings, bold, italic, lists.           |
| Deck  | Up to ten slides with a headline, bullets and an icon. Press Present. |
| Draw  | Boxes, ellipses, diamonds, lines, arrows and text labels on a grid.   |
| Calendar | Labelled spans of time on a month grid, shown in any time zone.    |

Built with TypeScript, [Lit](https://lit.dev) web components and
[Lucide](https://lucide.dev) icons. The look is deliberately classic: one
pixel borders, striped title bars, a dithered desktop.

## Running it

```sh
npm install
npm run dev        # local dev server
npm run build      # static site in dist/
npm test           # unit tests for the codecs and the formula engine
npx playwright install chromium && npx playwright test   # browser tests
```

The build is a single `index.html` plus one JavaScript file. Host it on any
static file server, or open `dist/index.html` straight from disk.

## How a document fits in a URL

The URL looks like `https://host/#/sheet/zXQAA...`. The part after the app name
is the document:

1. Each app serialises its content to a compact text format (below).
2. That text is deflated with [fflate](https://github.com/101arrowz/fflate) and
   base64url-encoded, prefixed with `z`. For very short documents, where
   compression would cost more than it saves, the raw UTF-8 is base64url-encoded
   instead and prefixed with `r`. The shorter of the two wins.
3. The shell writes the result into the fragment with `history.replaceState` on
   every edit, so the address bar is always current and nothing is ever sent to
   a server (fragments never leave the browser).

The status bar shows how much of the budget a document uses. The budget is
2,048 minus the length of the page's own address, so a short hostname buys you
a little more room. Plain English prose fits roughly 500 words; a deck of ten
slides with a few bullets each fits easily; a sheet full of numbers and
formulas fits with room to spare. Going over the limit turns the meter red but
never loses your work.

### Formats

Every format is plain text, chosen so deflate has something to chew on.

- **Sheet**: rows separated by newlines, cells by tabs, trailing blanks trimmed.
  Formulas start with `=` and support `+ - * / ^ %`, parentheses, cell
  references (`B7`), ranges (`A1:C3`) and `SUM AVG MIN MAX COUNT ABS ROUND SQRT
  INT MOD`. Errors show as `#DIV/0`, `#REF`, `#NAME`, `#CIRC`, `#VALUE`, `#ERR`.
- **Write**: one block per line. Prefixes `# ` and `## ` for headings, `- ` and
  `+ ` for bulleted and numbered items. Inline toggles `*bold*`, `_italic_`,
  `^underline^`, `~strike~`, with `\` as the escape character.
- **Deck**: slides separated by a blank line. In each slide an optional
  `:icon-name` line, then the headline, then one bullet per line.
- **Draw**: one shape per line, `kind,x,y,w,h,fill,label`. Kinds are `r`
  rectangle, `e` ellipse, `d` diamond, `l` line, `a` arrow, `t` text.
  Coordinates are in 8-pixel grid units on a 640 by 400 canvas.
- **Calendar**: an optional `@Zone/Name` line (the zone the document was last
  edited in), then one span per line. `d<start>,<days>,<label>` is an all-day
  span whose start is a day count from 2020-01-01: a floating civil date, the
  same in every country. `t<start>,<minutes>,<label>` is a timed span whose
  start is a minute count from 2020-01-01T00:00Z: one absolute instant, shown
  in whichever zone the viewer picks. Numbers are base 36. Time zone maths
  comes from the browser's `Intl` support, so no zone database is bundled.

## Project layout

```
src/app.ts            the shell: menu bar, window frame, routing, URL meter
src/apps/sheet.ts     <to-sheet>
src/apps/write.ts     <to-write>
src/apps/deck.ts      <to-deck>
src/apps/draw.ts      <to-draw>
src/apps/cal.ts       <to-cal>
src/lib/codec.ts      document <-> URL payload
src/lib/formula.ts    spreadsheet engine
src/lib/richtext.ts   rich text model and markup
src/lib/deckmodel.ts  deck model
src/lib/drawmodel.ts  drawing model
src/lib/calmodel.ts   calendar model
src/lib/tz.ts         time zone helpers on top of Intl
src/lib/icons.ts      Lucide icon helpers and the icon library
src/lib/styles.ts     shared retro styles
test/                 unit tests (node --test)
e2e/                  Playwright browser tests
```

## Deploying

The included GitHub Actions workflow runs the tests on every push and, on
`main`, publishes `dist/` to GitHub Pages. Enable Pages for the repository with
"GitHub Actions" as the source and the site will appear at
`https://<user>.github.io/tinyoffice/`.
