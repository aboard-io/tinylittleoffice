# R17-zip-titles: Download everything names the files and writes the title into each

**Paul, 2026-10-11:** *"Name the docs and put the title into the header for the tool. Do both."* The zip builder (round fourteen) asked whether a document whose title was never in its text (an automatic "New Word Processor 2026-10-11 #1", or a first-words title) should come back from the zip as the file's slug only. Both: the file is named by its title, and the title is written into the document's head.

## What is wrong today

`src/kit/privacy.ts` `everything()` names each file `<app>/<slug(title)>.tlo` and writes the document's text as it is. A document whose title lives only in the library (`k.title`, the automatic name or the first words) loses it on the way out: opened again from the zip, it is "untitled" or takes new first words. A sealed document is written as its link in a `.txt`, named by its slug.

## The design

- **The file is named by the title**, as now (`slug(k.title)`, 'untitled' or 'locked' when there is none, `-2` on a clash).
- **The title is in the head.** When the document's text has no `title:` in its head (docs/tlo.md: the `---` head with `title:`), `everything()` writes one with the library's title (`k.title`) before the body, through the kernel's own head writer (`src/doc`, the same path `read`/`write` use, never string concatenation), so the text stays canonical TLO. A text that already carries `title:` is written unchanged. A sealed document's `.txt` keeps its link and gains a first line `title: <the library's title>` only when the title is not the sealed document's secret: the library holds '' for a sealed document after r16-sealed, so nothing is written for it.
- **The way back.** `src/kit/open.ts` `openZip` already reads a `.tlo`'s head for its title; confirm with a test that a document that went out with a written title comes back with the same title and the same text byte for byte after the head (spaces never lost: `\ ` and `\` lines must survive the round trip).
- **The .md and .txt files in a zip** (opened, never written by us) are unchanged.

## Where

`src/kit/privacy.ts` (everything), `src/doc` (only if the head writer lacks a way to set `title:` on a text without one; add it there, not in privacy.ts), `src/kit/open.ts` (no change expected), `docs/tlo.md` one line under the head: Download everything writes the title here.

## Proof

- `test/browser/privacy.test.ts` (project browser-alone): a kept document with no `title:` in its text comes out of the zip with `title: <library title>` in its head and its body unchanged; a document whose text has a head keeps it unchanged; a sealed one is the link only.
- A node test: `write(read(text with written title))` is the text, and the title read back equals the library's.

## Not this

- No renaming of files on the way in, and no new metadata beyond `title:`.
