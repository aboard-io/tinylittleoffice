# R17-no-media: pictures from the web and embeds are gone from main

**Paul, 2026-10-11:** *"Let's get rid of images and embeds. Save the code in a branch but remove them from main. It's too complicated, and let's see if anyone uses this."* The code as it stood is on the branch `web-pictures-and-embeds` (pushed, at the merge of r16-size); the removal's own parent on main holds it too. Nothing is shimmed: pre-launch, delete outright. This directive replaces the earlier drafts r17-embeds-tab and r17-proxy-whitelist, which are not built.

## What goes

- **Pictures from the web.** The picture proxy (`media/` whole: media.ts, worker.ts, wrangler.jsonc, its tests, `npm run media:dev`, the `media` deploy step in `scripts/deploy.mjs`, `VITE_MEDIA_URL` in `.env.example`, docs/self-host.md); `src/kit/pictures.ts` (the gate, the consent card, lazy loading, `gateSvg`, `installPictures`, `watchPictures`), `src/kit/media.ts`, the picture whitelist (TRUSTED) and every `img` entry in `src/kit/network.ts` (img-src is then `'self' data:` or whatever the drawn pages need: say which and why), the Web Picture insert dialog (`src/kit/insert-dialogs.ts` askPicture) and the Insert menu's row in every app, the picture line in the TLO format (`![alt](address)` in docs/tlo.md and the kernel: a line in that form reads as words with a link, the alt as the link's words, nothing is fetched), the picture block in every drawing (`kit/draw.ts`, the apps' views), the picture-indirect and picture lints (`src/lint.ts`, the deck's), the lazy-pictures and media browser tests, `test/link-guard.test.ts`'s picture cases, the User-Agent constant, the Commons renditions in any fixture, and every template line that carries a picture address (Unsplash and the rest; `src/apps/*/templates.ts`, templates.md).
- **Embeds.** `src/kit/embeds.ts`, `<to-embed>` (`src/kit/embed.ts` or wherever it lives), the Web Embed insert dialog and its Insert row, the titled-embed line in the format (round fifteen: `[Title](address)` alone on a line is a link line like any other: words with a link, nothing drawn but the words), `webOf`/`webSites` in `src/doc/model.ts`, the deck's live cards in the editor and the show, the SVG card with a glyph, every `frame` entry in `src/kit/network.ts` (frame-src gone from the policy), `EMBED_SOURCES`, the Bluesky handle lookup, the embed lints, `test/browser/embed*.test.ts`, `src/apps/deck/tests/web*.test.ts`, the Bronx deck fixture.
- **Kept:** the Tiny Little Office Doc insert (one of our own documents by its link; nothing of a third party), the link guard and clickable links in the reader and the show, the Drawing Tool's own drawings and the icon set (drawn, never fetched), the QR codes, `og/*.png` (the site's own files).
- **Words and docs.** Every string only pictures or embeds used, in all 19 language files; docs/threat-model.md (the proxy rows, the picture rows, the embed row: one line now, "a document fetches nothing from any other site"), docs/network.md and the /network page from the one list, docs/tlo.md, docs/kernel.md, docs/transparency.md, the review and directive documents are history and stay as they are; `skill/tinyoffice/SKILL.tpl.md` and `public/llms.txt` via `npm run skill` (the pictures and embeds paragraphs gone; the link paragraph says a link alone on a line is words); `src/api.ts` and `packages/doc/tinyoffice.ts` where they mention either; `budgets.json`.
- **The box and production.** `.env.development` on the box loses `VITE_MEDIA_URL` (say so in the report; I will do it). `media.tinylittleoffice.com` was never created in production; nothing to retire.

## Proof

- `grep -rni "picture\|embed\|media\|unsplash\|wikimedia" src/ docs/ skill/ test/ e2e/ scripts/ packages/` finds nothing of the feature (a "picture" of a document meaning its drawn page, and "embed" meaning the embed view `#/v1/<app>.embed/`, stay: name each remaining use in the report).
- `test/csp.test.ts`: no frame-src; img-src as decided; connect-src unchanged.
- A node test: `![alt](https://example.org/x.png)` and `[Title](https://youtu.be/x)` alone on a line both read as a paragraph with a link, and write back unchanged (spaces never lost).
- `npm run build`: the main and apps chunks smaller (say by how much); no media Worker in the deploy.
- The whole suite green.

## Not this

- No replacement card, no "open in a new tab" affordance beyond what a link already has.
- No change to the Drawing Tool, icons or QR codes.
