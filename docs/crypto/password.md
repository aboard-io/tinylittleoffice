# A password on a document

`src/kit/share/crypt.ts`, about a hundred lines. WebCrypto (`crypto.subtle`) and nothing else: no crypto library.
Test vectors: `test/vectors/password.json`, made from their inputs and checked by `test/crypto-vectors.test.ts`
against the kit and against WebCrypto called by hand.

## The password is made by the app

Since 2026-10-11 nobody types a password to set one (Paul: "Only you can generate passwords for users. That
keeps them secure"). The Password dialog shows one the app made, with Copy and Make another, and seals the
document with it; the API's `link(app, text, { seal: true })` and `tinyoffice link --seal` return one beside the
link and refuse a password handed in ("The app makes the password; ask for one with seal."). Typing is left
only where it must be: the person a sealed link was sent to types the password they were sent, to open it.

A password is `generatePassword()` in `src/kit/share/passwords.ts`: twenty characters drawn from an alphabet of 56
(letters and digits, with the look-alikes `l`, `I`, `1`, `o`, `O` and `0` left out), each chosen by
`crypto.getRandomValues` with rejection so every character is equally likely, written in four groups of five
with dashes (the dashes are part of it). That is 20 × log2(56), about **116 bits** of entropy, the same for every password.

## The parameters

| | |
|---|---|
| Key derivation | HKDF with SHA-256 (RFC 5869), one pass |
| Input keying material | the password normalized to Unicode NFKC, then UTF-8 |
| Salt | 16 bytes from `crypto.getRandomValues`, made when the password is set |
| Info | the UTF-8 bytes of `tinylittleoffice sealed v1` |
| Derived key | 32 bytes, imported as a non-extractable AES-GCM key |
| Cipher | AES-256-GCM |
| IV | 12 bytes from `crypto.getRandomValues`, fresh for every seal |
| Tag | 16 bytes (WebCrypto's default), at the end of the ciphertext |
| Additional data | none |

NFKC is for the person typing to open: a password typed with a full-width letter, or pasted from somewhere that
changed a character's form, gives the same key. The second vector shows it.

## Why one HKDF pass is sound

A key derivation function does one of two jobs. A password hash (scrypt, Argon2) makes each guess
expensive, because a password a person chose has little entropy and an attacker holding the ciphertext can
try the likely ones offline: stretching buys back some of what the person did not choose. HKDF does the other
job: it turns keying material that already has enough entropy, but may not be uniform or the right length, into
a key. It is an extract step (HMAC-SHA-256 keyed by the salt over the input) and an expand step (HMAC-SHA-256
keyed by that over the info), and its security rests on the input being hard to guess, not on being slow.

Every password here is 116 random bits, so the password is the entropy and there is nothing to buy back.
Guessing it offline means searching 2^116 passwords; at a trillion trillion (10^24) guesses a second, half of
them takes over a thousand years, and no stretching would change the answer in a way that matters, while it would cost
every reader a second or more on a phone at every open.

The salt still matters: two documents sealed under the same password get different keys, and nothing computed
for one link helps with another. The info string names the format, so a key made here is for this and nothing
else.

## The sealed payload

The plaintext is one byte, the codec's flag (`r` raw UTF-8, `z` deflated, `y` deflated with the shared
dictionary; `src/kit/core/codec.ts`), followed by the document's bytes in that form. The flag is inside the
encryption, so the tag authenticates it too.

The bytes of a sealed payload, in order:

```
salt (16) | iv (12) | AES-256-GCM(key, iv, flag | bytes) with the 16-byte tag last
```

and its text form, which is what the link carries as `#/v1/<app>/<payload>`:

```
"E" + base64url(those bytes), no padding
```

Base64url throughout Tiny Little Office is RFC 4648's URL alphabet with `~` for 62 where the RFC has `-`
(`src/kit/core/codec.ts`): a hyphen is a place a line may break, so a long link full of them was cut when pasted.
Reading takes `-` as 62 too; a link made before is the same bytes.

The link writes a `+` after every 300 characters of any payload, sealed or not (`withBreaks` in codec.ts, written by
`routeHash`): iMessage and Signal do not make a link of a run of more than 301 letters and digits. The breaks are
outside the payload: reading takes them out before anything else, and a link without them is read the same.

So a sealed payload is `E` and at least 60 characters (16 + 12 + 1 + 16 = 45 bytes for an empty document).
Anything shorter, or not base64url, is not a sealed payload.

**There is no separate version byte.** `E` says "sealed this way"; the `v1` in the route is the link format's
version, outside the encryption. The plain (unsealed) payloads start with their flag letter, which is never
`E`.

## What happens when

- **A password is set.** The app makes it; a new salt is drawn and the key derived. The document is sealed
  under a fresh IV. The password is shown in the dialog until it closes and never again.
- **Each edit.** The same key and salt, a fresh IV, a new payload in the address bar. Random 12-byte IVs are
  safe for about 2^32 seals under one key, far beyond any document's edits.
- **Opening.** The salt is read from the payload, the key derived from the password typed, and AES-GCM
  decrypts. A wrong password and a damaged link look the same (the tag does not match), so the person is told
  both: that password does not open this link, and if they are sure of it, the link may have been cut short
  when it was copied (a chat that trims a long line), to ask for it again or for a short link.
- **The rest of the visit.** The key is kept in memory, as a non-extractable `CryptoKey`, so the document
  (and another link with the same salt) opens again without asking. The password itself is never kept, Save in
  browser on or off, and the key is never written anywhere.
- **The library.** With Save in browser on, a sealed document is kept as its payload with no title and no first words.

## What someone with the link can do

They have the salt, the IV and the ciphertext, which is everything needed to test a guess, offline, with no
limit and no lockout. A right guess is certain (the tag matches). But there is no likely guess to start from:
the password is 116 random bits, and each guess is an HKDF and an AES-GCM decryption. The way in is not the
link but the password's own path: the dialog says to copy it and send it another way than the link. Sent in the
same message as the link, it protects nothing.

What it does not hide: the document's length (the payload is the compressed document plus 45 bytes), the app
it opens in (in the route, outside the tag), and that it has a password.

## Checking it yourself

`test/vectors/password.json` gives, for two fixed passwords, salts and IVs: the NFKC bytes, the derived key,
the plaintext, the ciphertext with its tag, and the sealed text. With any HKDF and AES-GCM:

```
key    = HKDF-SHA-256(ikm = passwordNfkcHex, salt = saltHex, info = "tinylittleoffice sealed v1", 32)  == keyHex
out    = AES-256-GCM-encrypt(key, ivHex, plaintextHex, no AAD)                                        == ciphertextAndTagHex
sealed = "E" + base64url(salt | iv | out)                                                              == sealed
```

The file is written by the test's own helper from the inputs it names (`TLO_WRITE_VECTORS=1 npx vitest run
test/crypto-vectors.test.ts`), and the test fails when the file and the inputs disagree. The fixed salts and IVs
exist only in the vectors; `sealAt` in crypt.ts, which takes an IV, is marked for tests, and a test fails if
anything in the site calls it.
