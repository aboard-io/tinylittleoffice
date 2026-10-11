# Short links

`src/kit/short.ts` (the browser's side), `tinier/` (the service: `tinier.ts` is the whole of its logic,
`d1.ts` its rows in Cloudflare D1, `worker.ts` puts it on Cloudflare, `schema.sql` and `migrations/` its two
tables, `page.html` the page that opens a short link). WebCrypto alone: no crypto library. Test vectors:
`test/vectors/short-links.json`, checked by `test/crypto-vectors.test.ts`.

A short link cannot be changed or recalled once made; it expires on its own (Paul, 2026-10-11: "Let's just
make the short link immutable for now"). There is no update, no delete and no owner. (Round nine's short links,
which their maker could change, are in git history.)

## The cipher

| | |
|---|---|
| Cipher | AES-256-GCM |
| Key | 32 bytes from `crypto.getRandomValues`, made with the short link |
| IV | 12 bytes from `crypto.getRandomValues`, made with the short link |
| Tag | 16 bytes, at the end of the ciphertext |
| Additional data | none |
| Plaintext | the UTF-8 of the long link (`https://tinylittleoffice.com/<app>/#/v1/…`) |

Each short link has its own key and IV, used once. `c`, `iv` and the key travel as base64url without padding,
written with `~` for 62 where RFC 4648 has `-` (a hyphen is where a pasted link breaks a line); `-` is read as
62 too. The ciphertext is the long link's length plus 16 bytes, so the service knows roughly how long the
document is. It may be at most 16,384 base64url characters (`SHORT_MAX` in short.ts, `MAX_BYTES` in
tinier.ts; a test holds them equal).

## The key in the fragment

```
https://tinier.tinylittleoffice.com/<id>#<key>
```

The key is after `#`, which a browser never sends. Opening the link loads the service's page, which asks
`GET /api/<id>` for `c`, `iv` and `exp`, decrypts in the browser with the key from its own fragment, checks that
the result is a link to the site (it refuses anything else), and goes there with `?s=<id>&x=<expires>` after
it. The service never has the key, so it never has the long link, so it never has the document.

## The API

```
POST /api        {c, iv, ttl}   → 201 {id, exp}
GET  /api/<id>                  → {c, iv, exp}      (404 once gone)
```

Anything else under `/api` answers 404 with the body an unknown link gets, as if there were nothing there; the API's only answers are 201, 200, 400, 404, 429 and 503. `ttl` is 3600, 86400, 604800 or 2592000 seconds; any other is refused.

## What tinier stores

One row per short link (`tinier/schema.sql`):

| Column | What | Size |
|---|---|---|
| `id` | 7 characters from `abcdefghijkmnpqrstuvwxyz23456789` (no `l`, `1`, `o`, `0`), random | about 35 bits |
| `c` | the ciphertext, base64url, as the site sent it | at most 16,384 characters |
| `iv` | its IV, base64url | 16 characters (at most 32 accepted) |
| `exp` | when to forget it, milliseconds since 1970 | an integer |

And one row per address per UTC day that made a link (`tinier/migrations/0001-brakes.sql`):

| Column | What |
|---|---|
| `h` | base64url(SHA-256(`BRAKE_KEY` ‖ `\n` ‖ day ‖ `\n` ‖ address)) |
| `n` | how many links that address made that day |
| `day` | the UTC day number, days since 1970 |

`BRAKE_KEY` is a secret of the deployment (`wrangler secret put BRAKE_KEY`; `tinier/.dev.vars` on a
development machine, never in the repository; without it the Worker serves nothing and says why). Without the
key a row says nothing of the address; with it, only that the address made links that day, and how many. The
count is one statement (`INSERT … ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n`), and the 101st request of a
day is refused with 429 and `Retry-After` to the next UTC day. A refused request is not a link; a malformed one
is not counted.

Nothing else: no address in the clear, no user agent, no count of opens. Anyone may ask `GET /api/<id>` for any
id; without the key, what comes back does not open.

## For how long

- **Links.** An hour, a day, a week or a month (Paul, 2026-10-11: "Make the max expire a month"), chosen in
  Share; a week unless the person chose otherwise. A row past its time is deleted the moment it is asked for,
  and every hour (a cron at minute 17) deletes every row past its time.
- **Counts.** The same hourly sweep deletes the counts of every day but today and yesterday: a count lives at
  most two days.
- **D1's own history.** Cloudflare D1 keeps a point-in-time history of each database (Time Travel) for a
  limited window, which cannot be turned off. A deleted row could be restored from it by the account's
  operator until the window passes. The links are still ciphertext; the counts are still hashes.

## What the service is to a stranger

A store of up to 16 KB of opaque bytes per link, a hundred links a day per address, kept up to a month,
readable by whoever has the id, and never opened anywhere but the site: its page decrypts only a link to Tiny
Little Office and goes nowhere else. It cannot tell a document from any other ciphertext, so someone could
keep other bytes there. The limits are what bound it.

## The expiry banner

Everyone who arrives by a short link is told how long it has left: the site shows "This link expires in 12
days" under the header (`timeLeft` and `expiresSentence` in short.ts), colored by how soon, with "Copy into a
new document", which opens a copy under a long link of its own that nothing expires.

## What its logs hold

Nothing, held by `test/tinier.test.ts`: `tinier/wrangler.jsonc` sets `"observability": { "enabled": false }`,
no file in `tinier/` makes a console call, and the site's own `wrangler.jsonc` sets the same. Cloudflare, which
terminates TLS, sees each request's address and path as it does for any site it serves. The threat model
(`docs/threat-model.md`) says what that leaves.

## Checking it yourself

`test/vectors/short-links.json` gives a fixed key, IV and long link, with the ciphertext and the link. With
any AES-GCM:

```
c = base64url(AES-256-GCM-encrypt(keyHex, ivHex, UTF-8(link), no AAD))   == c
```

The fixed key and IV exist only in the vectors; `sealShortAt` in short.ts, which takes an IV, is marked for
tests, and a test fails if anything in the site calls it.
