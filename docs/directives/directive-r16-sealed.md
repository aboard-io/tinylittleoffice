# R16-sealed: a locked document says nothing of itself

**The review of 2026-10-11.** The mutual aid group: *"when we put a password on the contact list and pressed Share…, the app also attached a picture of the unlocked list to the WhatsApp message."* The refugee: *"When I sealed my letter and pressed the phone's own Share button, it sent a picture of the first page and the title along with the link, so the password protected nothing. The title of a sealed letter also shows up in the tab title, in the list of my documents after Mod+S."* The privacy expert: *"the URL stays ciphertext while the history entry next to it says 'Asylum interview notes'."* The teacher: *"The deck's closing QR slide gives every student who scans it the editable deck with my speaker notes."*

## What is wrong today

1. `src/kit/share-dialog.ts:249`: Share… calls `shareNative(this.heading, this.link, await picture(...def.view(this.doc)))` whether or not the document has a password. It sends a PNG of the unlocked document and its title next to a link that is only ciphertext. `post()` puts `this.heading` in the Bluesky, X and Mastodon text and in the email subject. The QR file and the embed code are named after it too.
2. `src/kit/shell.ts` `docTitle` returns 'Locked document' only while `this.sealed` is pending. Once the document is unlocked, `document.title` carries the real title into the browser's history, tab sync and tab switcher.
3. `keepNow()` (shell.ts:525) stores `def.title(this.doc) || this.fresh || firstWords(this.doc)` with no check of `this.locker`. `keepSoon` does check it. Share's `keepLink({ title: this.heading })` (share-dialog.ts:207, :221) stores the title too. The threat model promises 'a sealed document kept in the library with no title or first words'.
4. `src/apps/deck/view.ts` `closingPage` encodes `deckLink(text)`: the whole deck, speaker notes included, as an editing link.

## The design

- **One fact, passed down.** The shell knows when a document has a password (`!!this.locker`). Pass it to `<to-share>` as `locked`, beside `.heading`. While it is set, `shareNative(t('Locked document'), this.link)` sends no picture and no title. `post()`, `embedCode()` and the QR file name use `t('Locked document')` and `document-qr`. `keepLink` stores an empty title.
- **One helper for the title others see.** Add `private get outerTitle()` in shell.ts that returns `t('Locked document')` whenever `this.locker` or `this.sealed` is set, and use it in `setTitle` (document.title), in `keepNow`, in `keepSoon` and in `.heading` for `<to-share>`. The page's own title box still shows the real title to the person who unlocked it.
- **The deck's take-home QR is the slides.** `closingPage` encodes the deck with every slide's notes removed (cut each `s.notes` range that `slidesOf` gives, then `write()`) as a Display Link (`?d`). When the result is longer than `QR_MAX_BYTES`, the editor's end card says so ('Too long for a QR code: make a short link') rather than silently dropping the code. Move the answers in the Lesson and Trivia templates out of the notes and onto a final 'Answers' slide.

## Where

`src/kit/share-dialog.ts` (renderShare's share(), post(), renderQr's file name, embed, keepLink), `src/kit/share.ts` (no change beyond what is passed), `src/kit/shell.ts` (outerTitle, setTitle, keepNow, keepSoon, the `<to-share>` binding at :729), `src/apps/deck/view.ts` (closingPage), `src/apps/deck/templates.ts` (LESSON, TRIVIA). One line in `docs/threat-model.md`: a locked document's title reaches nothing but its own page.

## Proof

- `test/browser/share.test.ts`: stub `navigator.share` and `navigator.canShare`, seal a sheet, press `.to-share-native`, and assert `data.files` is undefined and `data.title` does not contain the heading. Assert that the Post URLs and the QR download name do not contain it either.
- `test/browser/locked.test.ts`: seal a document with a heading, then unlock it. `document.title` does not contain the heading. Under Saved, Mod+S leaves `tinyoffice.library[0].title === ''`.
- A deck view unit test: decode `closingPage`'s link and check that it has `?d` and no quote blocks. The Lesson template's notes do not contain 'Answers'.

## Not this

- No change to how a password seals the link, or to the crypto.
- No hiding of the title inside the unlocked page itself.
- No new setting for the deck QR: it always gives the slides.