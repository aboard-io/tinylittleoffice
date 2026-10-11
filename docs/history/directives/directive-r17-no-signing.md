# R17-no-signing: signatures are gone, everywhere

**Paul, 2026-10-11:** *"Get rid of signatures everywhere, including templates."* The review found that a signature says more than it proves (any key under any name gets the shield). Rather than ship the shield, the feature goes. Passwords stay: the sealed document, the password dialog, and r16-signed's password-cost line and cut-short words stay; only the signing half of that branch is removed here.

## What goes

- `src/kit/sign.ts`; in `src/kit/privacy.ts` the key (myKey, myFingerprint, exportKey, forgetKey, signWords, signerName, the name you sign with and its `tinyoffice.name` store key) and the zip's `signing-key.json`; in `src/kit/privacy-dialog.ts` the signing section, 'Signed by', the trust pill's signed state and tone, the known-keys map (r16-signed), the 'I know this key' button, the key row of 'What this device holds'; `src/kit/sign*.ts` tests, `test/vectors/signing.json`, `test/crypto-vectors.test.ts`'s signing cases, `docs/crypto/signing.md`; the `signatures` fence in the TLO format (`docs/tlo.md`, the kernel's parser and writer, the lint), the Word Processor contract template's signatures fence and its 'Signatures' section and the words about Sign in `src/apps/write/templates.ts` and templates.md; every string only signing used, in all 19 language files; the threat model's forger paragraph and signing rows; the skill's and llms.txt's signing paragraphs via `npm run skill`; `src/api.ts` and the CLI where they expose signing; the privacy outline in the scratchpad is not the tree's (ignore it).
- The Preferences row of 'What this device holds' reads 'Theme, the lifetime of short links.' after r17-lang-link; coordinate by rebasing.

## Proof

- `grep -rni "sign" src/ docs/ skill/ test/ e2e/` finds no signing (design, assign, signal and the Neon sign template remain; name each remaining use in the report).
- `npm run build`: the main chunk smaller by the signing code (say by how much).
- The whole suite green; `test/browser/privacy.test.ts` (browser-alone) covers the dialog without the signing section; the contract template lints clean and has no fence.

## Not this

- No change to passwords or the sealed link.
