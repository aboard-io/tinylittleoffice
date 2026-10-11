# LO-1: a locked document placed inside another says so

Read first: directive-r4-common.md, src/kit/doc-dialog.ts and insert-dialogs.ts ("Tiny Little Office Doc": a document placed in another by its link), src/kit/embeds.ts (<to-embed> and embedOf), src/kit/shell.ts (renderEmbed; `sealed`; askPassword), src/kit/crypt.ts and envelope.ts (a sealed payload begins with `E`), the apps that draw a placed document (the Word Processor's card, a slide, a site page: grep for how a placed document's pages are drawn small), src/kit/privacy-dialog.ts.

The leftover (2026-10-09): a document locked with a password, placed inside another document, draws as blank, in the editor, on the drawn pages and in exports.

Build: wherever a placed document is drawn (the editor's card, `view()` pages, the display page, exports, the /embed/ page), a sealed one draws a locked card: the lock icon, "Locked with a password", the document's app icon and the title if the envelope carries one in the clear (check what it carries; never guess), in the card's normal size; a tap on it in the editor asks for the password (the kit's unlock dialog) and, unlocked, the card draws the document and keeps the unlocked copy for this visit only (never written into the outer document's link); on the drawn pages and exports the locked card is drawn as is. A document that cannot be read at all (not sealed, just broken) draws the existing "cannot be read" state, not blank. The `/embed/` route for a sealed document shows the same locked card with an Unlock button.

Tests: a DOM test placing a sealed document and seeing the locked card, unlocking and seeing the pages; a view test that the locked card is on the page SVG; an embed-route test. PW_PORT=4443.
