# Documents for small groups

A document a few people share for real, rather than a link each of them copies. Paul, in issue #21 (2026-10-16):
"A document a small group can read, edit and talk about, where anyone removed loses access to everything after their
removal, as in a Signal group", "exactly like a Signal chat": people can talk about a document, edit it and access it,
and lose access when removed. Identity comes from atproto (a Bluesky handle); the words never touch a public repository.

Small groups only, tens of people, so no MLS: WebCrypto (`crypto.subtle`) and nothing else, no new dependency. This
is the first milestone, the core, tested locally with mock accounts: no page uses it yet, it makes no atproto call,
and the relay has no HTTP. The code is five files in `src/kit/share/`, each beginning with what it does; the tests are
`test/groups.test.ts`.

| file | what it holds |
|---|---|
| `group-keys.ts` | a device's two key pairs, the record it publishes, the Directory it is found in, signing |
| `group.ts` | members and roles, an epoch's content key, wrapping a key for a device, the signed changes |
| `group-envelope.ts` | an edit, a comment or a snapshot sealed and signed, and opened with a reason when it is refused |
| `group-store.ts` | the relay's rows: a GroupStore, and SqlGroupStore over D1's calls (node:sqlite in the self-hosted process) |
| `group-client.ts` | one device's view: open, sync, edit, comment, invite, remove |

## Device keys

Every device a person uses has two P-256 key pairs: ECDH, for receiving content keys, and ECDSA, for signing what it
writes. Both are made by WebCrypto as non-extractable, so the private halves never leave it, not even to this page's
own code. The public halves are a record, `{ did, device, ecdh, ecdsa, created }` with each key a JWK of four fields,
which is what the owner publishes in their atproto repository as `com.tinylittleoffice.deviceKey`, one record a
device. A client finds a person's devices through a `Directory` (`keysOf(did)`); the tests give it a Map, and the real
one, reading a PDS, comes later.

## A group per document

A group has an id (16 random bytes), an epoch number, its members (`{ did, role: 'editor' | 'viewer' }`), and for each
epoch a content key: 32 random bytes, used as an AES-256-GCM key.

The key is wrapped for each member device on its own: an ECDH agreement between a one-time key pair and the device's
published key, HKDF-SHA-256 over the shared secret to a wrapping key (a zero salt; the info is
`tinylittleoffice group key v1` with the group id, the epoch, the DID and the device id, separated by zero bytes),
and AES-GCM over the raw content key, the same info as additional data. The relay keeps the wrapped key with the
one-time public key and the IV; only the device it was made for can open it.

- **Adding someone** wraps the current epoch's key for each of their devices. With `past`, the inviter wraps every
  earlier epoch's key it holds too, and the newcomer reads the whole history; without it they read from the start of
  the current epoch.
- **Removing someone** starts a new epoch with a new key, wrapped for every device of everyone who remains, and the
  remover posts the document as it stands as the new epoch's first snapshot.

Each change to the group is a signed record: its number (from 0), the epoch, the members from then on, who made it
and from which device. A client takes the changes in order and stops at the first that fails: one out of order or
skipping an epoch, one from a device its maker has not published, one whose signature does not verify, one made by
someone who was not an editor of the group as it stood (for change 0, of the group it makes), and one that drops a
member without a new epoch, so that nobody removed keeps the key. The relay keeps one change under each number, so
two editors cannot both make the next one; the second is told to sync and try again.

## Messages

Every edit, comment and snapshot is an envelope:

    { group, epoch, author, device, seq?, iv, ciphertext, signature }

The plaintext is JSON, one of

    { kind: 'ops', ops: Op[] }  { kind: 'comment', block?: number, text }  { kind: 'snapshot', text }

where `ops` are the kernel's operations (`src/doc/ops.ts`) and a snapshot's text is the whole document as TLO. It is
encrypted with the epoch's key by AES-GCM under a fresh 12-byte IV, the header (group, epoch, author, device) as
additional data, and the author's device signs (ECDSA with SHA-256) the header, the IV and the ciphertext. What is
signed is canonical JSON, every object's keys in order. `seq` is the relay's number for it, outside the signature.

A receiver checks, in order, and refuses with the first reason that applies:

| reason | what failed |
|---|---|
| `wrong-group` | the envelope is another group's |
| `stale-epoch` | it was written in an epoch older than one already taken: whoever was removed cannot write into the past |
| `unknown-device` | the author has published no such device |
| `bad-signature` | the signature is not that device's over this header and ciphertext |
| `not-a-member` | the author was not in the group in that epoch |
| `no-key` | this device holds no key for that epoch |
| `bad-ciphertext` | the key does not open it |
| `bad-message` | it opens, but is not one of the three kinds |
| `not-an-editor` | an edit or a snapshot from a viewer (a viewer may comment) |
| `replayed` | the same envelope, by its IV, was taken before |
| `bad-ops` | the edits do not apply to the document |

## The relay

A `GroupStore` has tinier's shape: append an envelope and get its number; read the envelopes after a number; put and
get the keys wrapped for a device; put and get the changes. The tests keep it in Maps (`test/memstore.ts`), and
`SqlGroupStore` keeps it in three tables over the few calls of D1's that `tinier/d1.ts` uses (`all` added for reading
rows), so a Worker's D1 and the self-hosted process's node:sqlite would run the same statements. Its tables are made
when the store is opened, not by tinier's migrations, until the relay has a home. The relay numbers envelopes in one
statement, so two at once cannot get the same number, and that order is the document's.

## A client

A `GroupClient` is one device's view. `open` reads the changes, opens the keys wrapped for the device, and takes every
envelope in the relay's order: a snapshot replaces the document, edits are applied with the kernel's `applyAll`, and a
comment is kept beside it. So the document is the latest snapshot this device can read and everything after it. What
the device writes (`edit`, `comment`) goes to the relay and is taken back from it in the same order as everyone
else's, so every member's copy comes to the same text. `invite(did, role, { past })` and `remove(did)` are an
editor's alone.

Edits are applied in the relay's order as they were written: two people editing the same place at once is not merged
(an edit that no longer applies is refused as `bad-ops`), which live edits will need to answer.

## Where it runs

Paul, 2026-10-16: "This should probably have its own mini domain like group.tinylittleoffice.com right? Maybe each
group gets its own db? Sort of multi tenant and that will map to d1 on Cloudflare."

**Its own domain: yes, `group.tinylittleoffice.com`.** A browser keeps a site's storage by origin, so a device's private
keys, held in IndexedDB, live under `group.` alone: nothing served at `tinylittleoffice.com` (a page, a preview card, a
template) can reach them. Its Content-Security-Policy can be stricter than the main site's (no map tiles, no
geocoder, `connect-src` its own relay alone), and its Worker and its data are apart from the main site's, so a fault
or a free tier's limit in one never stops the other. A plain document opened there is still a plain link; only a
group's address (`group.tinylittleoffice.com/g/<id>`) needs the relay.

**A database per group: yes, as a Durable Object rather than a D1 database.** Each group having its own store is the
right shape: one group's messages never sit beside another's, a group is deleted by deleting its store, and nothing
one group does slows another. On Cloudflare that is a Durable Object with SQLite storage, one object per group,
found by name (`idFromName(groupId)`) and made the first time it is asked for:

- it is a SQLite database of its own (the same `SQL` surface `store.ts` already uses), created on demand, with no
  binding to add or deploy to make per group;
- one object runs one request at a time, so the relay's order of messages (`seq`) is the object's, with no race;
- it holds the group's WebSockets (with hibernation, so an idle group costs nothing), which is what live edits and
  presence need;
- it lives near its first user, and moves nowhere it is not asked.

D1 databases per group would work on paper, but a Worker reaches a D1 database through a binding fixed at deploy, so a
new group's database could only be queried through Cloudflare's REST API, slowly and with an account token in the
Worker. D1 stays the right place for what is shared across groups: the directory cache of device keys, and the daily
brakes against abuse.

**Self-hosting keeps the same shape:** one SQLite file per group in a directory (`data/groups/<id>.sqlite`), opened on
first use and closed when idle, behind the same Node process as the rest (`selfhost/server.ts`), on a third port or a
path.

## The threat model, in plain words

- **What the relay sees.** Ciphertext and its size, when each thing came, which DID and device wrote it, who is in
  the group and in which epoch, and which devices hold keys. It cannot read a word, a comment or a key. It can withhold
  envelopes, show them late, or show different members different orders; it cannot forge one, alter one or slip in a
  member, because envelopes and changes are signed and a client checks them.
- **What a removed member keeps.** Everything they could read before: the keys of the epochs they were in, and any
  copy they made. Removal protects what is written afterwards, as in a Signal group; it cannot take back what was read.
- **A stolen device reads until it is removed.** Its private keys are non-extractable, but whoever holds the unlocked
  device can use them. Removing the person (and, later, replacing the device) starts a new epoch that device cannot read.
- **No healing after a compromise.** MLS refreshes keys as members write, so a key stolen today stops working soon
  without anyone noticing it was stolen. This does not: a content key lasts its whole epoch, and a new one comes only
  when someone is removed. For a group of tens of people who know each other, a removal is the moment that matters,
  and one key per epoch is something a person can reason about, in WebCrypto alone, in a few hundred lines.
- **Trust in the directory.** A device is trusted because its owner published it. A client that reads the wrong
  directory (a PDS that lies about a person's devices) would wrap keys for the wrong device; atproto's signed
  repositories are what the real directory will lean on.
- **Whoever serves the code** can read the document, as everywhere in Tiny Little Office (docs/threat-model.md).

## TODO

- [ ] atproto OAuth sign-in, and publishing device keys to a real repository (`com.tinylittleoffice.deviceKey`)
- [ ] `group.tinylittleoffice.com`: its own Worker and policy, the client's keys kept under that origin alone
- [ ] the relay as a Durable Object per group (SQLite storage, WebSockets with hibernation), and the self-host
      process with a SQLite file per group
- [ ] D1 for what crosses groups: the device-key directory's cache and the daily brakes
- [ ] the Share dialog's Invite by handle, and the member list
- [ ] live edits and presence
- [ ] comments in the editor
- [ ] replacing a lost device
- [ ] snapshots and compaction
- [ ] Publish to Bluesky, as a plain record
- [ ] a section in docs/threat-model.md
