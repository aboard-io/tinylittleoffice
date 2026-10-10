# Short links

`src/kit/short.ts` (the browser's side), `tinier/` (the service: `tinier.ts` is the whole of its logic,
`worker.ts` puts it on Cloudflare with D1, `schema.sql` is its one table, `page.html` the page that opens a
short link). WebCrypto alone: no crypto library. Test vectors: `test/vectors/short-links.json`, checked by
`test/crypto-vectors.test.ts`.

## The cipher

| | |
|---|---|
| Cipher | AES-256-GCM |
| Key | 32 bytes from `crypto.getRandomValues`, made with the short link, never changed |
| IV | 12 bytes from `crypto.getRandomValues`, fresh for every version |
| Tag | 16 bytes, at the end of the ciphertext |
| Additional data | none |
| Plaintext | the UTF-8 of the long link (`https://tinylittleoffice.com/<app>/#/v1/…`) |

`c`, `iv`, the key and the owner key all travel as base64url without padding. The ciphertext is the long
link's length plus 16 bytes, so the service knows roughly how long the document is. It may be at most 16,384
base64url characters (`SHORT_MAX` in short.ts, `MAX_BYTES` in tinier.ts; a test holds them equal).

## The key in the fragment

Two links come out of making a short link:

```
public:  https://tinier.tinylittleoffice.com/<id>#<key>
owner:   https://tinier.tinylittleoffice.com/<id>#<key>.<o>
```

Both carry the key after `#`, which a browser never sends. Opening either loads the service's page, which
asks `GET /api/<id>` for `c` and `iv`, decrypts in the browser with the key from its own fragment, checks
that the result is a link to the site (it refuses anything else), and goes there. The service never has the
key, so it never has the long link, so it never has the document.

The key is the same for every version, which is why the public link always opens the latest one; only the IV
and the ciphertext change. Random 12-byte IVs under one key are safe for about 2^32 versions.

## The owner capability

`o` is 32 random bytes made beside the key. The service is given `owner = base64url(SHA-256(o))` when the
link is made, and keeps only that. To put a new version (`PUT /api/<id>` with `c`, `iv`, `o`, and optionally
a new lifetime) or to delete the link (`DELETE /api/<id>` with `o`), the owner sends `o` itself, in the body,
over TLS: the one request that needs it. The service hashes what it is sent and compares it with the stored
hash in constant time.

- A wrong `o` (403) and an id that is not there (404) carry the same body, and the hash is computed and
  compared either way, so neither tells an outsider which ids exist or which have owners.
- `o` is never in the public link, never in a log, never in any other request.
- The site keeps the owner link only on the device that made it: in memory for the visit under Private,
  under Saved in the list of short links kept here (`src/kit/links.ts`), which Privacy and keys shows and can
  empty. Arriving by the owner link, the service's page hands the key and `o` to the site in the fragment's
  query (`?s=<id>&k=<key>&o=<o>`), never to a server; the site strips that query from every link it shares.
  It does stay in the browser's history.
- Whoever has the owner link can change or delete the short link. There is no other proof of ownership and
  no account to recover one with.

## What tinier stores

One row per short link, in Cloudflare D1 (`tinier/schema.sql`):

| Column | What | Size |
|---|---|---|
| `id` | the short link's name: 7 characters from `abcdefghijkmnpqrstuvwxyz23456789` (no `l`, `1`, `o`, `0`), random | 7 characters, about 35 bits |
| `c` | the ciphertext, base64url, as the site sent it | at most 16,384 characters |
| `iv` | its IV, base64url | 16 characters (at most 32 accepted) |
| `exp` | when to forget it, milliseconds since 1970 | an integer |
| `owner` | base64url of SHA-256 of `o`; null for a row made without one, which can never be updated | 43 characters |
| `ver` | 1 when made, one more with each update | an integer |
| `updated` | when it was last updated, milliseconds since 1970; null until then | an integer |

Nothing else: no IP address, no user agent, no count of opens, no record of who made it. Anyone may ask
`GET /api/<id>` for any id and get back `c`, `iv`, `exp`, `ver` and `updated` (or a 404), so whether an id
exists, how many times it was updated and when, is public to anyone who guesses or is given the id. Without
the key, none of it opens.

## For how long

- **Lifetimes.** An hour, a day, a week, a month or a year, chosen in Share (a week unless the person chose
  otherwise, and Saved remembers the choice). The service accepts those five and no other.
- **Extending.** An update may carry a lifetime, and the expiry becomes the later of the current one and now
  plus that lifetime: an update never cuts a link short. The owner sees Extend in Share, and on the banner.
- **Forgetting.** A row past its expiry is deleted the moment it is asked for, and every hour (a cron at
  minute 17) deletes every row past its time. Delete, by the owner, removes the row at once.
- **D1's own history.** Cloudflare D1 keeps a point-in-time history of each database (Time Travel) for a
  limited window, as a platform feature that cannot be turned off. A deleted row is gone from the table but
  could be restored from that history by the account's operator until the window passes. It is still
  ciphertext.

## The expiry banner

Everyone who arrives by a short link is told how long it has left: the service's page adds
`?s=<id>&x=<expires>` to the fragment it hands on, and the site shows "This link expires in 12 days" under
the header (`timeLeft` and `expiresSentence` in short.ts), coloured by how soon: a week or more, within a
week, and the last day. It offers "Copy into a new document", which opens a copy (unsigned, under a long link of its own, which
no service holds and so nothing expires); the owner also gets Extend.

## What its logs hold

Nothing. That is enforced in three places, each held by a test (`test/tinier.test.ts`):

- `tinier/wrangler.jsonc` sets `"observability": { "enabled": false }`, so Cloudflare writes no Worker logs or
  traces for it;
- no file in `tinier/` makes a console call, so there is nothing to log even if logging were on;
- the site's own `wrangler.jsonc` sets the same.

The rate limit (60 writes an hour per address in each instance's memory, and the platform's limiter of 10 a
minute per address) counts addresses in memory and writes nothing down. Cloudflare, which terminates TLS,
sees each request's address and path as it does for any site it serves, and keeps its own aggregate counts
for the account. The threat model (`docs/threat-model.md`) says what that leaves.

## Checking it yourself

`test/vectors/short-links.json` gives a fixed key, IV, long link and owner key, with the ciphertext, the
owner hash and the two links. With any AES-GCM and SHA-256:

```
c     = base64url(AES-256-GCM-encrypt(keyHex, ivHex, UTF-8(link), no AAD))   == c
owner = base64url(SHA-256(oHex))                                              == ownerHash
```

The fixed key and IV exist only in the vectors; `sealShortAt` in short.ts, which takes an IV, is marked for
tests, and a test fails if anything in the site calls it.
