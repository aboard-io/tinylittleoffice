# R16-signed: a signature says what it proves, and a password says what it costs

**The review of 2026-10-11.** The privacy expert: *"A forger who … re-signs it with their own key and keeps `by: Paul` gets … green tone and the words 'Signed by Paul'. The only thing that differs is a 10-hex-character fingerprint shown on hover … one rented GPU finds a match in roughly 20 minutes to 3 hours."* The refugee: *"any stranger can show a green shield 'Signed by UNHCR' … I typed '1' twice, Set password was enabled … A cut sealed link … says 'Wrong password'."*

## What is wrong today

1. `src/kit/privacy-dialog.ts` signatureWords and trustButton show a green shield and 'Signed by {name}' for any valid signature, whatever the key. The fingerprint is shown only in title and aria-label. Nothing remembers a name's key. en.ts:74 says signing proves 'under what name'.
2. `src/kit/sign.ts:61-64` `fingerprintOf` is 5 bytes of SHA-256 (40 bits).
3. `renderPassword` enables Set password for any matching pair, '1' included. Nothing says that a short password falls to offline guessing.
4. `src/kit/locked-doc.ts:34` says 'Wrong password' when the payload was cut short in a chat.

## The design

- **Words for what is proven.** A valid signature by a key that is neither mine nor known on this device reads `t('Signed as “{name}” · key {fp}')` in a neutral tone, not green. renderDoc adds: 'Anyone can sign under any name. Check this key with the person, another way.' Green stays for my own key and for keys this device knows.
- **Known keys (TOFU), under Saved only.** store.ts keeps a small name→fingerprint map, written when the reader taps 'I know this key' in the privacy dialog. A known name with a different key reads 'A different key from the one {name} used before' in amber. Under Private nothing is remembered and every key is unknown.
- **A 100-bit fingerprint**: four groups of five base32 characters (`abcde-fghij-klmno-pqrst`), with the hyphenated look kept. Update `test/vectors`' fingerprint field, `docs/crypto/signing.md` and the threat model's forger paragraph.
- **The password's cost.** Under the fields, a role=status line from a strength estimate (length × character set, plus a short list of the commonest passwords, no library). Below about 50 bits it says: 'Someone with the link can guess this offline. Use Generate, or four or more random words.' Set password then asks once. One line under Set: 'Send the password another way than the link.'
- **Cut short is not wrong.** The message becomes: 'That password does not open this link. If you are sure of it, the link may have been cut short when it was copied: ask for it again, or for a short link.'
- Retranslate the changed keys in all 18 languages.

## Where

`src/kit/sign.ts`, `src/kit/privacy-dialog.ts`, `src/kit/privacy.ts`, `src/kit/store.ts`, `src/kit/passwords.ts` (the estimate), `src/kit/locked-doc.ts`, `src/i18n/*.ts`, `docs/crypto/signing.md`, `docs/threat-model.md`, `test/vectors`.

## Proof

- `test/sign.test.ts`: fingerprintOf returns 4 × 5 base32 characters. `test/crypto-vectors.test.ts` passes with the new vectors.
- `test/browser/privacy.test.ts`: an unknown valid key gives the neutral 'Signed as' state. A known name with a new key gives amber. Under Private there is no known-keys write.
- `test/passwords.test.ts`: the estimate puts '1', 'password' and 'abcdef' below the line and a generated password above it.
- `test/locked.test.ts`: a payload trimmed by 10 characters shows the cut-short words.

## Not this

- No change to the signature algorithm or the envelope's format beyond the fingerprint's length.
- No key server and no network.