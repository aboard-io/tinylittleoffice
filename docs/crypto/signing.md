# Signing a document

`src/kit/sign.ts` (the keys, signing, verifying), `src/kit/envelope.ts` (what is signed) and
`src/kit/privacy.ts` (where the key is kept, and the checks the shell shows). WebCrypto alone: no crypto
library. Test vectors: `test/vectors/signing.json`, checked by `test/crypto-vectors.test.ts`.

## The algorithms

**Ed25519** (RFC 8032), through `crypto.subtle`, is the default: a 32-byte public key, a 64-byte
signature, and the same signature every time for the same key and message. The vectors use RFC 8032's own
test key, so the kit is checked against the RFC as well as against itself.

**ECDSA on P-256 with SHA-256** is the fallback, used only where the browser's WebCrypto has no Ed25519
(`generateKey` throws). Its public key is 65 bytes (`04 | x | y`, uncompressed) and its signature 64 bytes
(`r | s`, WebCrypto's form, not DER), different every time it signs.

A public key travels as base64url (no padding, `~` for 62 where RFC 4648 has `-`, and `-` read too; see
password.md) of its raw form, 43 or 87 characters. The verifier tells the
two apart by the raw key's length (32 or 65 bytes) and nothing else. A browser without Ed25519 cannot check
an Ed25519 signature, and says so: the state reads "Cannot check here", grey, with the reason ("This browser
cannot check this kind of signature"), never "does not match". Whether the browser has Ed25519 is asked of
WebCrypto by importing RFC 8032's test key (`canCheck` in sign.ts).

## What is signed

A document's head may carry five keys that belong to the document rather than its app:

```
---
title: Q3 budget
by: Paul
created: 2026-10-05T14:32Z
key: <public key, base64url>
sig: <signature, base64url>
---
```

The signature is over the UTF-8 bytes of this message (`signingMessage` in envelope.ts):

```
"tinyoffice" LF app LF created LF body NUL title NUL by
```

- `app` is the app's id (`text`, `sheet`, `deck`…).
- `created` is the creation time in whole minutes since 2020-01-01T00:00Z, written in base 36
  (`2026-10-05T14:32Z` is `24808`); empty when the document has none. Signing gives a document without one
  the current minute.
- `body` is the document's text with those five keys taken out of its head: the app's own settings in the
  head stay and are signed, and so is every word of the document. The text is what is signed, not the
  link, so how the link compresses it does not matter.
- `title` and `by` are the title and the name, empty strings when absent. The name is what the person typed
  in the signing dialog, its runs of white space made one space.
- LF is byte 0x0A and NUL byte 0x00. The two NULs mark where the body ends and the title begins, and where
  the title ends and the name begins. A NUL never enters a document: the reader (`parse`, `takeHead` and
  `splitHead` in src/doc/tlo.ts) drops any it is given, so the body, the title and the name the message is
  built from hold none, and the message reads only one way.

To check, a reader takes the document's text, removes `key` and `sig` (and reads `title`, `by` and
`created`) from the head, rebuilds the message, and verifies. The vectors give the message as text and as
hex, a whole document carrying the Ed25519 signature, and both signatures.

## The key

- **Made** in this browser the first time something is signed (or the key is exported), with
  `crypto.subtle.generateKey`, extractable.
- **Kept** as JSON text, `{"alg":"ed"|"ec","priv":<JWK>,"pub":<JWK>}`, under the storage key
  `tinyoffice.key` (`src/kit/store.ts`). Under Saved that is the browser's `localStorage` for the site, not
  encrypted by Tiny Little Office; under Private it lives in memory and goes when the tab closes. Turning
  Saved off removes it.
- **Exported** from Privacy and keys as that same JSON text, private half included, to be kept somewhere
  safe or taken to another device; **imported** there from such text (checked to be a key that signs);
  **forgotten** there.
- **Shown** as a fingerprint: the first 5 bytes of SHA-256 of the raw public key, in hex, a hyphen after the
  fifth character (`21fe3-1dfa1`).

The key is extractable because it has to be: it is kept as JWK so it survives a reload, and exporting it is
how it moves to another device. Anything that can run script on the site's origin (an extension allowed to,
or the site's own code if it were changed) can read it.

## What a signature proves, and what it does not

It proves that whoever held this private key signed exactly this app, creation time, text, title and name.
Change any of them, a character of the words, the title, the name, the date, a setting in the head, and the
signature no longer matches.

It does not prove:

- **Who signed.** The name is the signer's own word. A key is not tied to a person, an email address or an
  account. The reader learns which key signed; whether that key is the person's is something they must
  find out another way, by comparing the fingerprint (or, against a determined forger, the whole key: the
  fingerprint is 40 bits) with one the person gave them.
- **When.** The creation time is the signer's own clock and word; there is no timestamping authority.
- **That it was not signed before**, by someone else, or that the signer meant it for you. A signed document
  can be copied unchanged and still checks.
- **That the key is still the signer's.** There is no revocation. A lost or copied key keeps making
  signatures that check.
- Anything about the link: a signature covers the document's text, not whether it has a password or which
  short link led to it.

A signature someone removes leaves a document with no signature, which the shell shows as unsigned, not as
tampered with. A forger can also sign an altered document with their own key; it checks, under a different
fingerprint.

## What the shell shows

`checkSignature` in privacy.ts: **none** (no key and signature); **valid**; **stale** (this browser's key
signed it and the text has changed since: sign again); **invalid** (it was checked and does not match,
whoever signed it); **unchecked** (this browser has no Ed25519, so it cannot check an Ed25519 signature).
With a signature it shows the name it was signed under and the key's fingerprint, and whether the key is
this browser's.
