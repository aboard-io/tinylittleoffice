# R17-shortener: an immutable short link, a hundred a day, counted without a log

**Paul, 2026-10-11:** *"Fix up the shortener. Make it 100 links a day."* and *"Let's just make the short link immutable for now."* The living short link (round nine: PUT a new version, DELETE, an owner secret `o` whose hash the server keeps, `ver` and `updated`) made the owner-key problem the privacy expert found: under Private the secret lives in the address bar beside the document, and copying the address hands out the power to replace the short link. With no update there is no owner, no secret, and nothing in the address bar but the document. The teacher found the platform limiter allows 10 creates a minute per address and a whole school leaves through one address.

## What goes

- `tinier/tinier.ts`: PUT and DELETE, `owner`, `Revision`, `revise`, `drop`, `ver`, `updated`, the `o` and `key` handling; the API is `POST /api {c, iv, ttl} → 201 {id, exp}` and `GET /api/<id> → {c, iv, exp}` (404 once gone), plus the opener page. The `Link` type is `{c, iv, exp}`. `tinier/schema.sql` is the four columns production already has (id, c, iv, exp) and the index: no migration for the links table.
- `src/kit/short.ts`: the owner secret and the `k`/`o` query parameters; `src/kit/route.ts` keeps `s=<id>&x=<expires>` for everyone arriving by a short link and loses `k` and `o`; `src/kit/links.ts` keeps the list of short links made on this device (under Saved) without owners; `src/kit/share-dialog.ts` loses Update, "Updated · version n" and Forget (a short link cannot be recalled: it expires), and says so in one line where the lifetime is chosen: 'A short link cannot be changed or recalled once made; it expires on its own.'
- Every string that only the living link used, in all 19 language files; `docs/crypto/short-links.md` rewritten for the immutable link (short, in the house voice; the living link's design kept in git history only); docs/threat-model.md's short-link rows; `test/tinier*.test.ts`, `test/short*.test.ts`, `test/browser/short.test.ts` and the e2e that touches it.

## The brake: 100 links a day per address

- **Counted under a keyed hash, kept for a day.** D1 gains `brakes (h TEXT PRIMARY KEY, n INTEGER NOT NULL, day INTEGER NOT NULL)` where `h = base64url(sha256(secret ‖ day ‖ address))`, `day` the UTC day number and `secret` a Worker secret `BRAKE_KEY` (never in the repo; `wrangler secret put BRAKE_KEY` in production, `.dev.vars` locally, gitignored; absent, the Worker refuses to start with a clear error). Without the secret the hash says nothing about the address; with it, only that a given address was counted that day. One statement per request: `INSERT … ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n`. The 101st answers 429 with `{ error: 'A hundred links a day from one address; try tomorrow.' }` and `Retry-After` to the next UTC day. The hourly sweep (`scheduled`) deletes rows of any day but today and yesterday, beside the expired links.
- **Gone:** `brake()`, `Limiter`, the `LIMITER` binding and its line in `tinier/wrangler.jsonc`, the "two brakes" comment.
- **The migration** `tinier/migrations/0001-brakes.sql` creates the table (idempotent); docs/self-host.md says to apply it with `wrangler d1 execute tinier --remote --file`.
- **The words:** `tinier/page.html`, the Share dialog's short-link section ('up to a hundred links a day from one address') and the 429's text through t().
- **Docs:** docs/threat-model.md and docs/crypto/short-links.md: what the shortener keeps (rows until they expire; for two days, a keyed hash of each address that made a link, with a count), and that the key is a secret of the deployment. One honest paragraph on what the service is to a stranger: a store of up to 16 KB of opaque bytes per link, a hundred links a day per address, kept up to a month, readable by whoever has the id, never opened anywhere but the site; the limits are what bound it.

## The longest life is a month

**Paul, 2026-10-11:** *"Make the max expire a month."* `TTLS` in tinier.ts loses the year (`365 * 86400`): an hour, a day, a week, a month (30 days). The server refuses any other ttl as it does now. The Share dialog's lifetime choice (`src/kit/share-dialog.ts`, `src/kit/short.ts` TTL list) loses the year too, in all 19 language files; `kit/links.ts` and the privacy dialog's words about the lifetime of short links follow; a kept short link with a longer life from before is shown with its real expiry (the server decides). docs/crypto/short-links.md and the skill say a month.

## Where

`tinier/tinier.ts`, `tinier/worker.ts`, `tinier/wrangler.jsonc`, `tinier/schema.sql`, `tinier/migrations/`, `tinier/page.html`, `src/kit/short.ts`, `src/kit/route.ts`, `src/kit/links.ts`, `src/kit/share-dialog.ts`, `src/kit/shell.ts` (the owner's arrival), `src/i18n/*.ts`, `docs/crypto/short-links.md`, `docs/threat-model.md`, `docs/self-host.md`, `skill/tinyoffice/SKILL.tpl.md` (the short-links paragraph) and `npm run skill`, tests as named.

## Proof

- The tinier node tests: POST and GET only (PUT and DELETE answer 405); the 100th allowed, the 101st refused with Retry-After, a new day counts afresh, the sweep drops old days and expired links, the hash differs by day and by key, no address appears in the store in the clear, and the store's schema has no owner column.
- `test/route.test.ts`: `k` and `o` are not parsed or written; `s` and `x` are.
- `test/browser/short.test.ts`: a short link made, opened, its lifetime shown; no Update and no Forget in the dialog.
- `npm run tinier:dev` with `.dev.vars` holding a BRAKE_KEY: the 101st POST from one address is 429.

## Not this

- No per-minute limit of any kind, and no counting by anything but the address.
- No change to the link's encryption.
