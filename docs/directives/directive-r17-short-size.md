# R17-short-size: the short link's limit is shown before anyone presses the button

**Paul, 2026-10-11:** *"Do we let people know if their doc is too big for a short link? Maybe we add that limit to the usage indicator."* Today the only word comes after the press: `src/kit/short.ts` throws 'This document is too long for a short link.' when the ciphertext would pass `SHORT_MAX` (16,384 base64url characters: tinier's `MAX_BYTES`), and the Share dialog shows it as a toast. The link-size table in Share (`src/kit/limits.ts` TARGETS: some browsers 2,048, a text message 160, Bluesky, Mastodon, X, Discord, Telegram) and the header's room line (`src/kit/chrome.ts` "{n} of {max} link characters left") know nothing of the short link.

## The design

- **A target for the short link** in `limits.ts`: `{ id: 'short', max: SHORT_LINK_MAX, cost: full, where: () => t('a short link') }`, where `SHORT_LINK_MAX` is the longest link whose encryption fits `SHORT_MAX` (the inverse of `shortCost`: ⌊SHORT_MAX × 3 / 4⌋ − 16 characters), held equal by a test. It appears in Share's table like the others, with '{n} over' when it does not fit.
- **The header's room line** (`chrome.ts`) names the short link when it is the first target the link no longer fits, as it names a text message or a browser today ('{n} characters over what a short link holds').
- **The button says it before the press.** In Share's short-link section, when the link is over, the Make-a-short-link button is disabled and a hint under it says 'This document is {n} characters; a short link holds {max}. Shorten it by {over} and it will fit.' (the QR section's pattern at share-dialog.ts:431). The toast path stays for the race where the document grew after the dialog opened.
- **The API and the CLI**: `measure` reports `short: { fits, over }` so an agent knows before it asks; the skill's short-links paragraph says the limit in characters.
- All new strings in 19 languages.

## Where

`src/kit/limits.ts`, `src/kit/short.ts` (export the constant and the inverse), `src/kit/chrome.ts`, `src/kit/share-dialog.ts`, `src/api.ts`, `packages/doc/tinyoffice.ts`, `src/i18n/*.ts`, `skill/tinyoffice/SKILL.tpl.md` and `npm run skill`.

## Proof

- `test/limits.test.ts`: the short target's max is the inverse of shortCost (a link of exactly max characters shortens; one more throws).
- `test/browser/share.test.ts`: a document over the limit shows the disabled button and the hint with the right numbers; one under it shows neither.
- `test/api.test.ts` or the CLI test: `measure` reports `short`.

## Not this

- No change to the limit itself (16 KB of ciphertext) or to tinier.
