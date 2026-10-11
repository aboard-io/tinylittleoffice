# R17-finish: three small things the round left

Runs after every other round-seventeen branch is merged, on a worktree from the current main. Three items, each its own commit.

1. **The shortener answers 404, never 405.** `tinier/tinier.ts` on main answers a PUT or DELETE to `/api/<id>`, a POST anywhere but `/api`, and any other method with 405, an `allow` header and a sentence about what the service used to do. Paul, 2026-10-11: *"There should be a 404."* A 405 advertises an API that no longer exists; a 404 with the same body an unknown link gets (`{error: 'No such link, or it has expired.'}`) says nothing. Change it as the amended directive-r17-shortener.md says: the API's only answers are 201, 200, 400, 404, 429 and 503; `test/tinier.test.ts`'s "answer 405" test becomes "answer 404, the same as an unknown link, and the row is as it was"; the header comment's method list and `tinier/README.md` or wherever the API is described follow. OPTIONS keeps its preflight answer.

2. **The codec's dictionary is American too.** `src/kit/codec.ts`'s compression dictionary primes `zone: Europe/London`; r17-american moved every template to New York and dropped `zone:` from them, so the entry primes nothing and the one left is wrong for the product's home. Make it `zone: America/New_York`. Links change shape (pre-launch, no compatibility): regenerate what the byte-stability tests hold (`test/doc/corpus`, by its `make.ts`, or whatever the test names), and say in the report which fixtures moved and that no document's text changed.

3. **The cards are in Plex.** r17-plex put IBM Plex on the site and on the box, but `scripts/icons.ts` (og.png) and `scripts/make-cards.ts` (public/og/<app>.png) still draw in system-ui. Paul: *"we use Plex everywhere."* Draw them in the site's own stacks (the script renders through Chromium under Playwright: load `src/styles/fonts.css`'s faces from `public/fonts/` by file path, or install them for the run; the box has `~/.fonts/plex` too) and regenerate every card and the og.png. A test asserts the script's page names the Plex stack. The .docx and .rtf exports keep naming Calibri and Georgia: a Word file names fonts the reader's machine has, and Plex is not one.

## Proof

- Tinier tests green with the 404 cases; `npx vitest run`; `npm run build`; the regenerated cards committed with the commit saying why they changed.
