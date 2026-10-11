# R17-shortener: a hundred links a day, counted without a log

**Paul, 2026-10-11:** *"Fix up the shortener. Make it 100 links a day."* The teacher found that the platform limiter allows 10 creates a minute per address and a whole school leaves through one address. The brake is now two things: `tinier/tinier.ts` `brake()` (60 an hour, in one instance's memory) and the `LIMITER` rate-limit binding (`tinier/wrangler.jsonc`, 10 per 60 s), which Cloudflare offers only with periods of 10 or 60 seconds.

## The design

- **One brake: 100 links a day per address**, covering POST, PUT and DELETE as the brake does now. A day is the UTC day.
- **Counted under a keyed hash, kept for a day.** D1 gains a table `brakes (h TEXT PRIMARY KEY, n INTEGER NOT NULL, day INTEGER NOT NULL)` where `h = base64url(sha256(secret ‖ day ‖ address))` and `secret` is a Worker secret `BRAKE_KEY` (never in the repo; set with `wrangler secret put BRAKE_KEY` in production and `.dev.vars` locally, gitignored). Without the secret the hash tells nothing about the address, and with it only that a given address was counted today; the hourly sweep (`scheduled`) deletes rows of any day but today and yesterday. The count is one `INSERT … ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n` per request. The 101st answers 429 with `{ error: 'A hundred links a day from one address; try tomorrow' }` and `Retry-After` to the next UTC day.
- **Gone:** `brake()`, `Limiter`, the `LIMITER` binding and its line in wrangler.jsonc, the "two brakes" comment in worker.ts.
- **Schema and migration.** `tinier/schema.sql` creates `brakes`; `tinier/migrations/` gains `0001-living-links.sql` (the three ALTERs the living links need on a table from before them: `owner TEXT`, `ver INTEGER NOT NULL DEFAULT 1`, `updated INTEGER`) and `0002-brakes.sql` (the table), each idempotent where SQLite allows and documented in docs/self-host.md as the order to apply with `wrangler d1 execute`. Production's table is from before the living links, so the deploy applies both.
- **The words.** `tinier/page.html` and the site's Share dialog say "up to a hundred links a day" where the limit is mentioned; the 429's text is shown by the dialog through t().
- **Docs.** docs/threat-model.md and docs/crypto/short-links.md: what the shortener keeps (the rows, and for two days a keyed hash of each address that made a link with a count), and that the key is a secret of the deployment. `test/tinier` tests cover: the 100th allowed, the 101st refused, a new day counts afresh, the sweep drops old days, the hash differs by day and by key, and no address appears in the store in the clear.

## Where

`tinier/tinier.ts`, `tinier/worker.ts`, `tinier/wrangler.jsonc`, `tinier/schema.sql`, `tinier/migrations/`, `tinier/page.html`, `src/kit/share-dialog.ts` (the words), `src/i18n/*.ts`, docs as named, `test/tinier*.test.ts`.

## Proof

- The tinier node tests above, with an in-memory Store that implements the brakes.
- `npm run tinier:dev` with `.dev.vars` holding a BRAKE_KEY: 100 POSTs succeed and the 101st is 429 with Retry-After.

## Not this

- No per-minute limit of any kind, and no counting by anything but the address.
- No change to the link format, the crypto or the owner capability.
