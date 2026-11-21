# Importing files: the plan

Issue #3, and the Hacker News thread of 2026-10-15, where the first thing three readers tried was opening a
file they already had: a .csv, a .txt, an .ics. Paul: "How can we do csv, markdown, txt as lightly as
possible? I don't want to add huge dependencies. CSV isn't trivial. So we need to use libraries but not
bloat the app." This page is the plan; the work follows in its own pull requests.

## What exists, and why nobody found it

The kit already opens files: a `.tlo`, `.md`, `.txt`, `.json` or a `.zip` of them, dropped anywhere on the
page (`src/kit/file/open.ts`, `src/kit/core/plain.ts` `readFile`). A `.md` or `.txt` opens in the app in
use, else the Word Processor, called by its file name. The menu's "Open a file…" was taken out on
2026-10-12, so the only way in is drag and drop, which a phone does not have and a desktop reader does
not guess. CSV is not read at all.

So the first gap is not parsing. It is a door.

## The door

1. **Open… in the menu** (☰), again: a file picker (`<input type="file">`, accepting what we read), the
   same path as a drop. On a phone this is the only way in.
2. **The app's own Insert ▾** gets "From a file…" where it means something: a CSV into the Spreadsheet, a
   text or Markdown file into the Word Processor and the Outliner.
3. **The installed app opens files**: `file_handlers` in the web manifest for `.tlo`, `.md`, `.txt`, `.csv`
   (Chrome and Edge on a desktop; Safari ignores it harmlessly), and `share_target` so a phone's share
   sheet can send a file to us. Both native; no code beyond reading the launch queue.
4. **Paste.** A CSV pasted into the Spreadsheet (a table copied from Excel or Numbers arrives as
   tab-separated text) goes through the same parser. Today paste is the cell's own.

## The formats, lightest first

| Format | Reader | Weight | Where it lands |
| --- | --- | --- | --- |
| `.txt` | ours, already (`readFile`) | 0 | Word Processor, or the app in use: a paragraph a blank line |
| `.md` | ours, already: TLO is Markdown with a head | 0 | Word Processor, or the Outliner when it is a list; a table becomes a Spreadsheet block |
| `.csv`, `.tsv` | a small parser, lazily loaded (below) | under 1 KB gzipped | Spreadsheet, `putRect` from row 1, column types guessed by the sheet's own rules |
| `.ics` | ours, a small reader (VEVENT lines: DTSTART, DTEND, SUMMARY, RRULE's common forms) | about 2 KB | Calendar |
| `.opml` | ours, the browser's `DOMParser` | about 1 KB | Outliner |
| `.docx`, `.xlsx`, `.pptx` | later, each its own branch: a zip of XML, read with the kit's unzip and `DOMParser` | per format | the matching app |

Everything above `.csv` is a native API and a few dozen lines. The decision is the CSV parser.

## CSV: the parser

A correct CSV reader handles quoted fields, doubled quotes inside them, line breaks inside quotes, CRLF
and bare CR, a byte order mark, a trailing newline or none, ragged rows, Excel's `sep=;` first line, and a
delimiter that is a comma, a semicolon (Europe, where the comma is the decimal point), a tab or a pipe.
Encodings are the browser's job: `TextDecoder` reads UTF-8 and UTF-16 by their marks, and `windows-1252`
when the bytes are not UTF-8 (the `fatal` flag says so). None of that is hard, but every CSV reader ever
written has gotten one of them wrong, so we take one that has been through the corpus.

Measured on 2026-10-15 (the file we would ship, gzipped):

| Package | gzipped | License | Notes |
| --- | --- | --- | --- |
| `@vanillaes/csv` | 763 B | MIT | RFC 4180 and the quoting edge cases; a plain function; no delimiter sniffing (we add thirty lines) |
| `csv-simple-parser` | 2.0 KB | MIT | the same scope, typed |
| `udsv` | 2.7 KB | MIT | fast on big files, sniffs the delimiter and the header, types columns |
| `papaparse` | 6.9 KB | MIT | the usual choice; streaming and workers we do not need |

**Choice: `@vanillaes/csv`,** with our own delimiter sniff (count each candidate on the first twenty lines,
take the one that gives the most even row lengths) and the `sep=` line. It is one function, under a
kilobyte, loaded only when a CSV arrives (a dynamic import, its own chunk, as the map is). The native API
considered and rejected: none reads CSV; `String.split` fails at the first quoted comma.

**The oracle:** `csv-spectrum`, the public corpus of CSV edge cases (comma in quotes, newlines in quotes,
empty fields, UTF-8, CRLF, escaped quotes), as a unit test against whichever parser is in, plus our own
cases for `sep=`, semicolons, tabs, BOMs and the three encodings. If the parser ever changes, the corpus
decides.

**Size is the limit, not the parser.** A document is its link; a CSV of a few thousand rows is far past
it. The Spreadsheet gets the rows that fit (the sheet's own limits, and the link's: `kit/share/limits.ts`),
and the open dialog says how many were taken and how many were not, before anything is written. A reader
who wants the rest can split the file; we never truncate silently.

## Markdown and text: what changes

Both open today. What is missing is small:

- A Markdown table becomes a Spreadsheet block inside the document, or the whole document opens in the
  Spreadsheet when the file is one table.
- Front matter names the app where it has `app:`; otherwise a file that is all list items opens in the
  Outliner.
- A `.txt` with lines that are all `- ` or `1. ` is a list, so it is an outline too.
- The file's name is the title only when the text has none (already so).

## Testing the importer

Paul (2026-10-16): "We need an intense testing strategy for the importer." An importer is where other
people's files meet our format, and other people's files are wrong in every way a file can be wrong. The
tests are layered so each layer catches what the one before cannot, and all of them run in CI on every
push, with the long forms under `npm run fuzz`.

1. **Golden files.** `test/fixtures/import/<format>/<name>.<ext>` beside `<name>.tlo`, the document it
   must become, byte for byte. The fixtures are real exports, one from each program that writes the
   format: for CSV, Excel for Windows and for Mac, Numbers, Google Sheets, LibreOffice, a bank's statement,
   a Shopify order export, a Stripe payout, Google Contacts, Strava; for ICS, Google Calendar, Apple
   Calendar, Outlook, Fastmail; for OPML, Workflowy, OmniOutliner, Dynalist; for Markdown, Obsidian, Bear,
   iA Writer, GitHub, pandoc. A fixture is never edited; a wrong golden is fixed by fixing the reader.
2. **The public corpus.** `csv-spectrum`'s cases (comma in quotes, newlines in quotes, empty fields, UTF-8,
   CRLF, escaped quotes, a trailing newline or none) as a unit test, each case's JSON the expected rows.
   For Markdown, the CommonMark spec examples that TLO cares about (headings, lists, nesting, code fences,
   tables, links, emphasis), as the reader's regression set.
3. **Our own edge list,** one test each: `sep=;`, a semicolon file with decimal commas, a tab file, a pipe
   file, a BOM, UTF-16 LE and BE with their marks, windows-1252 with accents, bare CR line endings, mixed
   endings, a quote inside an unquoted field, a header row only, an empty file, a single cell, ragged rows,
   a 10,000-character field, a field of only quotes, a null byte, invalid UTF-8, a file of 200,000 rows.
4. **Properties** (fast-check, as `test/doc/properties.test.ts` does for the kernel): any grid of strings
   written by our CSV exporter reads back as the same grid (the round trip); any grid written by each of
   four delimiter and quoting styles reads back the same; any bytes read without throwing, in bounded time,
   to a result whose row count is at most the line count plus one; a parse followed by `putRect` and the
   sheet's own export is stable (read, write, read: equal).
5. **Differential testing.** In CI only, never shipped: `papaparse` as a second opinion. Every fixture, every
   corpus case and 2,000 fuzzed inputs go through both parsers; a disagreement fails the test and names the
   input, shrunk. When the parsers disagree and ours is right, the case joins the edge list with a comment.
6. **The limits.** A file over the link's size opens the dialog with the exact counts (rows that fit, rows
   left out, the bytes either way), nothing written until Open is pressed, and a document that opens is
   exactly the rows the dialog promised. The numbers come from `kit/share/limits.ts`, not from the test.
7. **Formulas and injection.** A cell beginning with `=`, `+`, `-` or `@` is text when imported, never a
   formula (our sheet has a formula engine, and a CSV from a stranger must not run in it); the test imports
   `=1+1` and reads `=1+1`. A zip is read with the existing bomb limits; a file over the byte cap is refused
   before it is decoded; a null byte is refused as it is today.
8. **End to end** (Playwright, in `e2e/`): a file chosen through the picker (`setInputFiles`), a file
   dropped (a `DataTransfer`), and tab-separated text pasted into the sheet, each opening the golden
   document; the installed app's `file_handlers` entry present in the served manifest; on WebKit as well as
   Chromium, since the picker is where the browsers differ.
9. **Performance.** A one-megabyte CSV parses in the test browser under a budget (250 ms on the CI runner),
   measured, so a regression in the parser or the sheet's `putRect` is a failing test, not a complaint.
10. **The oracle for office formats, later.** `pandoc` in CI converts each DOCX fixture to Markdown, and our
    reader's result is compared to it structurally (headings, paragraphs, lists, tables), never by exact
    text, so pandoc judges without becoming a dependency.

What is not tested: the file picker's native dialog itself (the browser's), and the share sheet on a phone
(`share_target`), which have no automation; `docs/phone-checks.md` gets a step for each.

## Order of work

1. **The door** (one PR): Open… in the menu, the file picker, `file_handlers` and `share_target`, the
   drop path unchanged. Tests: a picked file opens as a dropped one does; the manifest lists the types.
2. **CSV** (one PR): the parser as a lazy chunk, the sniff, the encodings, the Spreadsheet landing with the
   size line in the open dialog, paste of tab-separated text into the sheet; and the tests above, layers 1
   to 7 and 9, in the same PR, since a reader without its fixtures is not done.
3. **ICS and OPML** (one PR each, small): the Calendar and the Outliner.
4. **Office files**: after the above has shipped and been used; DOCX first, on its own branch, with pandoc
   as the test oracle (the earlier discussion of 2026-10-15), never as a dependency.

Each PR carries its strings in all twenty-one languages through the translation loop
(`docs/translation.md`), a line in `docs/exports.md`'s mirror for imports, and a note in the skill.
