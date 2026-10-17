# A journal

`src/kit/share/journal.ts` (the browser's side), `backends/journal/journal.ts` (the service: the whole of its logic;
`backends/cloudflare/journal/` puts it on Cloudflare, a Durable Object a journal; `backends/node/server.ts` on one
machine), [backends/README.md](../../backends/README.md) for what it is for. WebCrypto alone: no crypto library. Test
vectors: `test/vectors/journal.json`, checked by `test/crypto-vectors.test.ts`.

A journal is sealed entries in one order under an id, for a document several people edit at once and for a
person's own store of documents. The server holds the ciphertext and the order; it has no key, and nothing it
holds appends an entry.

## The keys

| | |
|---|---|
| The secret | 32 bytes from `crypto.getRandomValues`, made with the journal; base64url, 43 characters |
| The read key | HKDF-SHA-256 of the secret, no salt, info `tinylittleoffice journal read v1`, 32 bytes; imported as a non-extractable AES-GCM key |
| The write token | HKDF-SHA-256 of the secret, no salt, info `tinylittleoffice journal write v1`, 32 bytes; sent as `Authorization: Bearer <base64url>` |
| The id | base64url(SHA-256(`tinylittleoffice journal id v1` ‖ the read key's bytes)), the first 22 characters (132 bits) |
| The verifier | base64url(SHA-256(the token's base64url text)), 43 characters: what the server keeps, and compares with every character whatever the first differing one |

A writer's address carries the secret, `…/j/<id>#w<secret>`; a reader's the read key, `…/j/<id>#r<read key>`. From the
read key come the id and every entry's words, and no token: a reader follows, a writer writes. The server is given the
id and the verifier when the journal is made, never the secret, the read key or the token. Whoever has an address has
that much of the document, as with any link; the server learns ids, sizes and times.

## An entry

| | |
|---|---|
| Cipher | AES-256-GCM under the read key |
| IV | 12 bytes from `crypto.getRandomValues`, fresh for every entry |
| Tag | 16 bytes, at the end of the ciphertext |
| Additional data | the UTF-8 of `tinylittleoffice journal v1\n<id>\n<seq>\n<kind>` |
| Plaintext | the length of the content's JSON as 4 bytes big-endian, the JSON's UTF-8, then zeros to a multiple of 256 bytes |

The additional data names the format, the journal, the entry's place and its kind, so an entry moved to another
place, another journal or another kind does not open; the padding makes an entry's length a multiple of 256, so a
keystroke and a word look much the same from outside. `kind` is `ops` or `snapshot`, in the clear, so a reader may
start from the latest snapshot without opening what came before it. An ops entry's content is `{by, at, client, ops}`:
who, in their own word; when; a mark of the client that wrote it, so a writer knows its own entries as they come back;
and the kernel's operations (docs/kernel.md §3). A snapshot's is `{by, at, app, text}`, the whole document.

## The order

The server appends an entry only at the seq its writer names, which must be the next; a writer whose seq is stale is
answered with the entries past the one it named, carries its pending ops over them (`cross`, in
`tinylittleoffice/doc`) and tries again. So every entry was made against the whole order before it, no entry is ever
transformed by anyone but its author, and every replica applying the order holds one document (docs/kernel.md §12).
An entry whose operations do not apply to that document, or leave one the text would not read back as written, is
passed over by every replica alike (the kernel is the same everywhere), so no one entry can part them.

## What the service stores

One row per journal: the id, the verifier, when to forget it (a year past its last writing or reading), the last
seq, the latest snapshot's seq and its size in characters of ciphertext. One row per entry: the journal's id, the seq,
the kind, the IV and the ciphertext. On Cloudflare the rows are a Durable Object's own SQLite database, one object a
journal, and the daily counts of journals made (a hundred a day per address, under the keyed hash of
docs/crypto/short-links.md) are in the shortener's D1 database; on one machine every row is in the process's one
SQLite file. An entry is at most 256 KB of bytes; a journal at most 32 MB.

## What someone with the id can do

Read the ciphertext: the order, the kinds, the sizes and the times. Not a word, not an author, not the app. With a
reader's address, every word, and no way to write. With a writer's, everything. The server, or whoever holds its
storage, can withhold a journal or cut it short, never forge an entry, move one or read one: a reader that has seen
the order longer than it is now has found that.

## Checking it yourself

`test/vectors/journal.json` gives, for a fixed secret, the read key, the token, the id and the verifier, and for a
fixed IV and content the entry's ciphertext. With any HKDF, SHA-256 and AES-GCM:

```
read     = HKDF-SHA-256(ikm = secret, salt = "", info = "tinylittleoffice journal read v1", 32)    == readHex
token    = HKDF-SHA-256(ikm = secret, salt = "", info = "tinylittleoffice journal write v1", 32)   == tokenHex
id       = base64url(SHA-256("tinylittleoffice journal id v1" ‖ read))[0..22]                      == id
verifier = base64url(SHA-256(base64url(token)))                                                    == verifier
c        = AES-256-GCM(read, iv, pad(len(json) as u32be ‖ json), aad = "tinylittleoffice journal v1\n" ‖ id ‖ "\n" ‖ seq ‖ "\n" ‖ kind)  == c
```

The fixed IV exists only in the vectors; `sealEntryAt` in journal.ts, which takes an IV, is marked for tests, and a
test fails if anything in the site calls it.
