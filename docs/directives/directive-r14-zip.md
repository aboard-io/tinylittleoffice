# R14-zip — everything kept here, out as one zip and back in

**Paul, 2026-10-11:** *"Let me download all my docs as a single zip file and upload them too."*

Out exists: Privacy and keys, Download everything (`src/kit/privacy-dialog.ts` `download()`, `src/kit/privacy.ts` `everything()`, `src/kit/zip.ts` `zip()`): every document kept on the device as its `.tlo` text, and the signing key if asked, in `tiny-little-office.zip`. Back in does not.

## The design

- **The drawer's Open a file… takes a zip too** (`src/kit/open.ts` `OPENS` gains `.zip,application/zip`; `openFile` reads one with an `unzip` added to `src/kit/zip.ts`, fflate's `unzipSync`, which the tree already has for `zip`). A `.tlo` or `.md` inside is a document; anything else in the zip (the key file, a README) is left alone. Also a drop of a zip onto the page, where a file drop already opens a document.
- **What happens to the documents**: with Saved on, each is kept on this device (`src/kit/library.ts` `keep`, its app from the `.tlo` head's `app:`, its title from the head or the file's name, a document already kept with the same text left as it is), and a toast says `{n} documents kept`. With Private on, a dialog (`<to-dialog>`) lists them by app and name and offers *Keep them on this device* (which turns Saved on, saying so, then keeps them) and *Open the first* (or a tap on any name opens that one), and Cancel. A zip holding one document opens it, as a dropped file would, and offers nothing else.
- **The same zip goes round**: Download everything, then upload the zip on an empty device, gives the same library (titles, apps, texts, order by kept time) — the round-trip test. The key file in the zip is not imported by this path (Import key stays where it is in Privacy).
- **Words**: the new strings through t(), in the nine languages (the extractor's gaps; the translators' glossary: Keep, Kept, Saved, Private).

## Where

`src/kit/zip.ts` (unzip), `src/kit/open.ts`, `src/kit/drawer.ts` (accept), `src/kit/shell.ts` or wherever a dropped file is opened, a `<to-dialog>` for the Private case; tests: node for `unzip` (round-trip with `zip`) and for reading a zip of documents into kept entries; browser for the drawer's Open with a zip in Saved and in Private, and the round trip through Download everything; `docs/editing.md`'s drawer section (or the privacy doc) says a zip goes in too; the skill's "Every app's files" paragraph gains the sentence.

## Not this

- No new export format; no change to what Download everything writes.
- No importing of the key through the zip.
