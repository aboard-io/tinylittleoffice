# R17-embeds-tab: an embed is a card that opens in a new tab

**Paul, 2026-10-11:** *"Do the new tab thing."* A live embed is a third party's iframe: its code in our page, and the viewer's address and the fact of opening told to that party. The frame list was the one hole in the content policy. From now on an embed (round fifteen's titled embed `[Title](url)` alone on a line, and a bare known-site address) is drawn as the same card, with the site's glyph and the title, and a tap opens the address in a new tab through the link guard. No iframe anywhere.

## The design

- `src/kit/embeds.ts`: `embedOf(url)` keeps its knowledge of the sites (YouTube, youtu.be, Vimeo, Spotify, SoundCloud, archive.org, Bluesky posts, and whatever else it names) for the card's glyph, title and the canonical address; it no longer builds a frame address or a frame. The tap-to-load card becomes the card (`<to-embed>` renders a button-like card, `role=link`, that calls `openLink(url)` through the guard; the guard already names the host). In the deck's show the card is the same, keyboard-reachable. In the SVG page (Display Link, exports) the card with its glyph is unchanged; its link is a real `<a>` in the page as r15 made links clickable.
- The Bluesky handle lookup (network.ts 'Who a Bluesky handle is, for a post's frame') goes: the card shows the handle as written.
- `src/kit/network.ts`: every `frame` directive entry goes; `scripts/headers.ts` writes no frame-src (so the CSP's default `'none'` applies: say so in the test); docs/network.md and the /network page follow from the one list; the threat model's line on embeds says what a card is now.
- The lint (`src/lint.ts`, the deck's) keeps its findings about embeds (a title missing, an address that is not a known site) and drops anything about a frame.
- The skill and docs/tlo.md say what an embed is now in one sentence.

## Where

`src/kit/embeds.ts`, `src/kit/embed.ts` or wherever `<to-embed>` lives, `src/apps/deck/editor.ts` and `view.ts` (show and slide cards), `src/kit/network.ts`, `scripts/headers.ts`, `test/csp.test.ts`, `test/network.test.ts`, `test/browser/embed*.test.ts`, `src/apps/deck/tests/web*.test.ts`, docs/tlo.md, docs/threat-model.md, `skill/tinyoffice/SKILL.tpl.md` and `npm run skill`, `src/i18n/*.ts` for any changed string.

## Proof

- `test/csp.test.ts`: no frame-src in the policy; `document.querySelector('iframe')` is null in every browser test that draws an embed.
- `test/browser/embed.test.ts`: a known-site line draws the card with glyph and title; a tap opens the guard naming the host; Enter on the focused card does the same; the show's card too.
- The Bronx deck (scratchpad fixture copied into the tests) lints clean and draws cards.

## Not this

- No iframe for any site, whitelisted or not, and no "play inline" option.
