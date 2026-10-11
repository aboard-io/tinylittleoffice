# A password on a document

`src/kit/crypt.ts`, about a hundred lines. WebCrypto (`crypto.subtle`) and nothing else: no crypto library.
Test vectors: `test/vectors/password.json`, checked by `test/crypto-vectors.test.ts` against the kit and
against WebCrypto called by hand.

## The parameters

| | |
|---|---|
| Key derivation | PBKDF2 with HMAC-SHA-256 |
| Iterations | 600,000 (`PBKDF2_ITERATIONS`) |
| Salt | 16 bytes from `crypto.getRandomValues`, made when the password is set |
| Password bytes | the password normalized to Unicode NFKC, then UTF-8 |
| Derived key | 32 bytes, imported as a non-extractable AES-GCM key |
| Cipher | AES-256-GCM |
| IV | 12 bytes from `crypto.getRandomValues`, fresh for every seal |
| Tag | 16 bytes (WebCrypto's default), at the end of the ciphertext |
| Additional data | none |

NFKC means the same password typed another way (a no-break space for a space, the ligature `ﬁ` for `fi`, a
full-width letter) gives the same key. The second vector shows it.

## The sealed payload

The plaintext is one byte, the codec's flag (`r` raw UTF-8, `z` deflated, `y` deflated with the shared
dictionary; `src/kit/codec.ts`), followed by the document's bytes in that form. The flag is inside the
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
(`src/kit/codec.ts`): a hyphen is a place a line may break, so a long link full of them was cut when pasted.
Reading takes `-` as 62 too; a link made before is the same bytes.

So a sealed payload is `E` and at least 60 characters (16 + 12 + 1 + 16 = 45 bytes for an empty document).
Anything shorter, or not base64url, is not a sealed payload.

**There is no separate version byte.** `E` says "sealed with these parameters"; the `v1` in the route is the
link format's version, outside the encryption. Different parameters would take a new first letter, and `E`
would go on meaning exactly this. The plain (unsealed) payloads start with their flag letter, which is never
`E`.

## What happens when

- **A password is set.** A new salt is drawn and the key derived (the slow step), once. The document is
  sealed under a fresh IV.
- **Each edit.** The same key and salt, a fresh IV, a new payload in the address bar. Random 12-byte IVs are
  safe for about 2^32 seals under one key, far beyond any document's edits.
- **Opening.** The salt is read from the payload, the key derived from the password typed, and AES-GCM
  decrypts. A wrong password and a damaged link look the same (the tag does not match), so the person is told
  both: that password does not open this link, and if they are sure of it, the link may have been cut short
  when it was copied (a chat that trims a long line), to ask for it again or for a short link.
- **The rest of the visit.** The key is kept in memory, as a non-extractable `CryptoKey`, so the document
  (and another link with the same salt) opens again without asking. The password itself is never kept, under
  Saved or not, and the key is never written anywhere.
- **The library.** Under Saved, a sealed document is kept as its payload with no title and no first words.

## What someone with the link can do

They have the salt, the IV and the ciphertext, which is everything needed to test a guess. They can guess
offline, as fast as their hardware goes, with no limit, no lockout and no one to notice. A right guess is
certain (the tag matches); a wrong one is certain too.

The cost of one guess is 600,000 rounds of HMAC-SHA-256, about 1.2 million SHA-256 compressions. A current
high-end graphics card computes around 2×10^10 SHA-256 compressions a second, so roughly **20,000 guesses a
second per card**. Rough times on one such card:

| Password | Guesses | Time |
|---|---|---|
| any of the ten million most common passwords | 10^7 | under 10 minutes |
| six lowercase letters | 3×10^8 | about 4 hours |
| eight lowercase letters | 2×10^11 | about 4 months (a day on a hundred cards) |
| four random words from a 7,776-word list | 4×10^15 | thousands of years |
| five random words from that list | 3×10^19 | tens of millions of years |

Cards get faster and attackers rent many. The protection is exactly as strong as the password, so the Password
dialog says what one costs: under the fields, an estimate (`strength` in `src/kit/passwords.ts`: the length times
log2 of the character sets used, and next to nothing for one of the commonest passwords or a run of one character;
no library). Below 50 bits it says that someone with the link can guess it offline, and to use Generate or four or
more random words; Set password then asks once. Under Set: send the password another way than the link. The site
cannot slow an attacker who has the link; the iterations are the one lever, and they also cost the reader:
deriving the key takes a moment on a laptop, longer on a phone, once a visit.

What it does not hide: the document's length (the payload is the compressed document plus 45 bytes), the app
it opens in (in the route, outside the tag), and that it has a password.

## Checking it yourself

`test/vectors/password.json` gives, for two fixed passwords, salts and IVs: the NFKC bytes, the derived key,
the plaintext, the ciphertext with its tag, and the sealed text. With any PBKDF2 and AES-GCM:

```
key   = PBKDF2-HMAC-SHA-256(passwordNfkcHex, saltHex, 600000, 32)   == keyHex
out   = AES-256-GCM-encrypt(key, ivHex, plaintextHex, no AAD)        == ciphertextAndTagHex
sealed = "E" + base64url(salt | iv | out)                             == sealed
```

The fixed salts and IVs exist only in the vectors; `sealAt` in crypt.ts, which takes an IV, is marked for
tests, and a test fails if anything in the site calls it.
