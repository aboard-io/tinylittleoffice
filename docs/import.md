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

## Order of work

1. **The door** (one PR): Open… in the menu, the file picker, `file_handlers` and `share_target`, the
   drop path unchanged. Tests: a picked file opens as a dropped one does; the manifest lists the types.
2. **CSV** (one PR): the parser as a lazy chunk, the sniff, the encodings, the corpus test, the Spreadsheet
   landing with the size line in the open dialog; paste of tab-separated text into the sheet.
3. **ICS and OPML** (one PR each, small): the Calendar and the Outliner.
4. **Office files**: after the above has shipped and been used; DOCX first, on its own branch, with pandoc
   as the test oracle (the earlier discussion of 2026-10-15), never as a dependency.

Each PR carries its strings in all twenty-one languages through the translation loop
(`docs/translation.md`), a line in `docs/exports.md`'s mirror for imports, and a note in the skill.
