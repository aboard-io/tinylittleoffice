# The backends

Where a document is kept, and everything of Tiny Little Office that runs on a server, in one folder. A document is
its link: that is the first backend, and the one the site is built on. The others keep a document somewhere a link
alone cannot: on a server, under a key the server never has.

The folder holds a folder a service (pure: a request in, a response out, and an interface for where its rows live)
and a folder a platform (which wires the services to a runtime and a database). The platforms are Cloudflare and one
Node process; a service never names its platform.

| folder | what |
|---|---|
| [tinier/](tinier/) | the short-link service: the long link encrypted in the browser under a key kept in the short link's fragment, stored as ciphertext until it expires (docs/crypto/short-links.md); the daily brake every service keeps (brake.ts); the rows in SQL (d1.ts: D1's few calls, which node's SQLite runs too); the database's tables (migrations/); the landing page that decrypts (page.html) |
| [cards/](cards/) | the preview cards a person sends with a link to a network: the model and the store (cards.ts), and the site's own paths, `/card` and `/c/<id>` (site.ts) |
| [journal/](journal/) | the journal service (below): sealed entries in one order under an id, for a document several people edit at once and for a person's own store of documents, kept in sync across their devices |
| [cloudflare/](cloudflare/) | the services on Cloudflare: a Worker each (`tinier/`, `site/`, `journal/`), with its `wrangler.jsonc`, its types and its secret beside it; the rows in D1, and a journal in a Durable Object of its own, in the object's SQLite (docs/self-host.md) |
| [node/](node/) | the services on one machine: one Node process over one SQLite file, `node:http` and `node:sqlite` and nothing else (docs/self-host.md, "Without Cloudflare"; the Dockerfile) |

The threat model (docs/threat-model.md) says what each service can see; docs/network.md says every request the site
makes to them; test/tinier.test.ts holds that no file here logs anything.

## Five backends, one shape

A page that holds an editor (the site's shell, or a page built on `tinylittleoffice/editors`) asks a backend for
three things: the document an address names, what to do with each change, and the address others open the document
at. That is the whole contract (src/kit/share/backends.ts `Backend`, `Opened`): `open(address, ask)` gives the app,
the text and an `Opened`, whose `changed(ops, text)` keeps the change and answers with the address that holds the
document now, and whose `remote(fn)` tells a page another's changes where there can be any; `place(opened, into)` puts
it in an editor on the page, wired both ways. Each backend is the
kernel's functions behind that shape; the shell keeps doing what it does, and `backends.open(address)` finds the
backend by the address's form.

| backend | the document lives | a server | an address |
|---|---|---|---|
| **link** | in its address: `#/v1/<app>/<payload>`, the text packed by kit/core/codec.ts | none | the link |
| **sealed** | in its address, under a password: `#/v1/<app>/E…` (docs/crypto/password.md) | none | the link; the password travels another way |
| **short** | at tinier for a while: the long link encrypted under a key in the short link's fragment (docs/crypto/short-links.md); the document is still a link, which the short link opens | tinier | `https://tinier.…/<id>#<key>` |
| **multiparty** | in a journal: a snapshot and every change since, each sealed, in one order, so several people edit one document at once (docs/kernel.md §12) | journal | `https://journal.…/j/<id>#w<secret>` to write, `#r<key>` to read |
| **sync** | in a person's own store: a journal that is the index of their documents (each a multiparty journal, theirs or shared with them), opened on each of their devices by one secret, so the documents follow them, versioned, and nothing of them readable on the server | journal | the store's `…/j/<id>#w<secret>`, shown once and scanned or typed on the next device |

The first three are the site's own, factored behind the shape; the last two are new, and share one service.

## The journal

A journal is an append-only list of sealed entries under an id, with one order the server keeps and nothing the
server can read. It is the one thing the multiparty and sync backends ask of a server, and it is small: four
requests, no accounts, no notion of a document, a person or a device.

**Keys.** A journal is made from a secret of 32 random bytes (`crypto.getRandomValues`). From it, by HKDF-SHA-256
with the format's name as the info, come the read key (what seals and opens entries), the write token (what the
server asks for before it appends) and, from the read key, the id (`base64url(SHA-256("tinylittleoffice journal id v1"
‖ readKey))`, 22 characters). The server is given the id and `SHA-256(writeToken)` when the journal is made, and
compares what a writer sends against that whole, whatever the first differing character; it never has the secret,
the read key or the token itself. A writer's address carries the secret (`#w…`); a reader's carries the read key (`#r…`), from which the
token cannot be derived. Whoever has an address has that much of the document, as with any link; there is no account
and nothing to take away but the journal itself.

**Entries.** Each entry is `{ seq, kind, iv, c }`: its place in the order from 1, `ops` or `snapshot` in the clear
(so a reader can start from the latest snapshot), a fresh 12-byte IV, and AES-256-GCM under the read key of the
entry's JSON, padded to 256 bytes so an entry's length says little of its words, with the format's name, the id,
the seq and the kind as additional data: an entry moved to another place or another journal does not open. An
`ops` entry holds who (`by`, the writer's own word for themself), when, a client's mark and the kernel's operations;
a `snapshot` holds the app and the whole text. The server appends an entry only at the seq the writer names, the next
one: a writer whose seq is stale is answered with the entries it has not seen, carries its pending ops over them
(the kernel's `cross`) and tries again. So every entry was made against the whole order before it, no entry is
ever transformed by anyone but its author, and every replica applying the order gets one document. docs/kernel.md
§12's four rules are the author's own here: a crossing (`Conflict`) or ops that would not apply throw on the author's
side, who starts again from the server's document; there is no server transformation, so no rule about the head's
lock. An entry whose ops do not apply to the journal's document, or leave one the text would not read back as written,
every replica passes over alike (the kernel is the same everywhere), so no one entry can part them.

**Requests.**

```
PUT  /j/<id>                     {verifier, entry}       201 {seq: 1}   the first entry a snapshot; braked, a hundred a day per address
POST /j/<id>    Authorization: Bearer <token>; {seq, kind, iv, c}
                                                        201 {seq} | 409 {entries}: the ones past the writer's seq
GET  /j/<id>[?from=<seq>]                               200 {last, snapshot, entries}: from the latest snapshot unless from is given
GET  /j/<id>?after=<seq>&wait=1                         the same, held up to 25 seconds until there is an entry past after
```

Anything else answers 404 as an unknown journal does; a page of a site other than the ones the service is told of
(its `SITE`) may read, never write. An entry is at most 256 KB, a journal 32 MB; a journal is forgotten a year after
it was last written or read, by an hourly sweep (an alarm, on Cloudflare), and nothing is logged. A reader who sees the order shorter than it last did has found the server, or whoever holds its storage,
taking entries away: a journal can be withheld or cut, never forged, reordered or read.

## Multiparty, over the journal

src/kit/share/multiparty.ts opens a journal as a document: the latest snapshot and the entries after it, opened and
applied, are the text; each change the editor tells (`mount`'s `onOps`) is appended as it comes (the pending ops of a
moment in one entry); the entries others append arrive by the held `GET`, are carried over the pending ops (`cross`)
and handed to the editor (`applyRemote`), which draws them with the history kept to what was done here. Every 500
entries a writer appends a snapshot, so a reader joining pays for the recent changes alone. The page sees `Opened`:
the same address before and after a change, `remote` for the others' ops, `reset` for the document taken whole again,
and who did what, since every entry names its author: `versions(address)` is the history and `textAt(address, seq)`
the document at any point of it. `newShared(service, app, text, by)` makes one, and answers with the writer's address
and the reader's.

## Sync, over the journal

A person's store (src/kit/share/sync.ts) is a journal of its own whose entries are snapshots of an index: the
documents the person has (each a journal, with the address they hold it by, its app, its name, when it last changed)
and nothing else. Its secret is the store's: made by the app, shown once, and given to each other device by typing or
scanning it, as a password is given to a reader. Every device holds the same index, hears the others' changes to it
by the same held `GET`, and opens each document as multiparty does, so a document edited on a phone is the same
journal the laptop has open. To work on a document with someone, give them its address: they add it to their own
store, under their own secret, and both edit one journal. The server sees ids, sizes and times, never a name, a
document or who has what.

## The platforms, and the questions

**Cloudflare.** The two Workers of before keep their rows in D1 (the links, the cards, the daily counts): rows anyone
may read by id, with no order to keep between requests. A journal is different: its one job is an order, which
means one writer at a time, and a reader that waits for the next entry, which means a place that remembers who is
waiting. That is what a Durable Object is: one object per journal (`idFromName(id)`), on one thread, with a SQLite
database of its own (`ctx.storage.sql`; the entries and the journal's row are two tables in it, made by the object as
it wakes) and an alarm (`ctx.storage.setAlarm`) set to the journal's expiry that is its sweep. The Worker in front
(`cloudflare/journal/worker.ts`) routes `/j/<id>` to the object, and the object counts a journal's making against the
brake in D1, which stays the one shared table. The held `GET` is a promise the object resolves when an entry lands, so
nothing polls; when many hold at once the object's WebSocket hibernation is the next step, and the entries' form does
not change for it. SQLite-backed objects are on every plan. `npm run journal:dev` runs it on this machine.

**Node.** The same service over the same SQL interface the shortener uses (tinier/d1.ts), on node's SQLite, in the
one process (`node/server.ts`): the journals' row moved to the next seq in one statement is the compare-and-append,
and the waiters are a map in memory. A third port, beside the site's and the short links'.

**SQLite** is in both, then: Cloudflare's objects and Node run the statements of one file, `journal/journal.ts`
(`SCHEMA`), and test/journal.test.ts runs them on node's SQLite, as test/tinier.test.ts does the shortener's.

## What is where

1. **A folder a service, a folder a platform.** This folder, and the site's `wrangler.jsonc` with it.
2. **The kernel refuses what it cannot keep.** `checkOp` (src/doc/ops.ts, json.ts), which `apply` and `invert` ask
   first, so an op from a journal does what it says or nothing; `keptDoc`; `cross` served by `tinylittleoffice/doc`.
3. **The journal service.** journal/journal.ts, its store over SQL; test/journal.test.ts on Maps and on SQLite.
4. **The journal on both platforms.** cloudflare/journal/ (the Durable Object and its Worker); the third port in
   node/server.ts; scripts/deploy.mjs ships it with the others, after checking its `BRAKE_KEY`.
5. **The five backends behind one shape.** src/kit/share/backends.ts: link, sealed and short over the kit's own
   modules; multiparty (src/kit/share/multiparty.ts) and sync (src/kit/share/sync.ts) over the journal's client
   (src/kit/share/journal.ts); served by `tinylittleoffice/editors` and `/kit` (docs/library.md, "Where a document
   lives"), and mounted on a bare page in test/browser/journal.test.ts, two editors and a reader over one journal.
6. **Said.** docs/crypto/journal.md byte by byte with vectors (test/vectors/journal.json); the threat model's
   rows and section; the self-host page's third Worker and third port.

What is not built: the site's own Share for a journal (no page of the site makes one yet, and kit/core/network.ts
lists no journal host, so the site's policy lets no page reach one), and WebSocket hibernation for the held reads.
