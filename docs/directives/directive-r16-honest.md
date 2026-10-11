# R16-honest: the privacy words say what is true

**The review of 2026-10-11.** The refugee: *"the app tells me 'no cookies, no trace' while my browser's history keeps every document I typed, and the page that explains this is an English GitHub page that returns 404."* The privacy expert: *"the 'no trace' wording on the Private switch should be changed before a frightened person relies on it."* The teacher: *"'no trace' isn't true on a district Chromebook whose browser history holds the whole document."*

## What is wrong today

1. `en.ts:58` 'Nothing is saved on this device: no cookies, no trace, only the language you chose.', and the same key in all 18 languages. The About text says 'Private by default: nothing is kept.' `docs/threat-model.md` says the browser's history and its sync hold every document.
2. `src/kit/store.ts` `ours()` excludes `tinyoffice.lang`, so `forgetEverything` (privacy.ts) leaves the site's name and the chosen language behind. For a refugee, Ukrainian or Urdu is itself a trace.
3. The Forget-short-link confirm, 'Forget this short link? Anyone who has it will find nothing there.', is untrue for anyone who already opened it.
4. en.ts:73, 'A trip's map is the one thing that asks the web by itself', is untrue: whitelisted pictures are fetched when a document opens. The 'Show pictures from the web' card (kit/pictures.ts) does not say that showing them tells their site the document was opened.
5. `drawer.ts:58` THREAT_MODEL links to a private GitHub file (404) in English.
6. `shell.ts` `leave('keep')` turns on Saved for every document, and the only signal is the toast 'Kept on this device'.

## The design

- **The switch's words.** 'This site keeps nothing on this device. Your browser's history still holds every link opened here, and a link is the document: use a private window, or give it a password.' Use the same sentence in About.
- **What this device holds** (`privacy-dialog.ts` renderDevice) gets one more row: 'Your browser's history: not ours to clear. Every document opened here, in full, unless it has a password.'
- **Forget everything forgets the language too.** It removes `tinyoffice.lang` after setting the visit's language in memory, so the page does not change language under the person.
- **The forget confirm:** 'Anyone who opens it from now on finds nothing. Anyone who already opened it still has the document.'
- **The picture card** adds: 'Showing them tells their site this document was opened, and when.' en.ts:73 names whitelisted pictures beside the map.
- **Keep-and-go** is labelled 'Turn on Saved and keep it here', and its toast says Saved is now on and where to turn it off.
- **The threat model in the app.** Add an About section, through t(), that gives the threat model's 'What it does not protect against' list in a few plain sentences (history and sync, screenshots, weak passwords, whoever serves the code). The About link then points at that section rather than at GitHub. Publishing the whole document at /threats is a question for Paul.
- Every changed key is retranslated in the 17 other languages (`npm run i18n:gaps` per language, as the language rounds did), and in the glossary's voice.

## Where

`src/i18n/en.ts` and the 17 siblings, `src/kit/drawer.ts` (switch subtitle, About, THREAT_MODEL), `src/kit/privacy-dialog.ts` renderDevice, `src/kit/privacy.ts` forgetEverything, `src/kit/store.ts`, `src/kit/share-dialog.ts` (the forget confirm), `src/kit/pictures.ts` (card text), `src/kit/shell.ts` leave('keep') and renderLeave.

## Proof

- A node test that greps en.ts so that 'no trace' and 'nothing is kept' cannot come back.
- `test/browser/privacy.test.ts`: after Forget everything, no `tinyoffice.*` key and no `to-theme` remains in localStorage, and the page's language is unchanged for the visit.
- `test/browser/leave.test.ts` is updated for the new button and toast.
- `npm run i18n:check` and label-widths pass in every language.

## Not this

- No change to what Private stores. This directive is about the words, plus forgetting the one key.
- No new copy on the home page.