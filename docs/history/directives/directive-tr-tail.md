# TR-5: three findings from the transparency pass

Read first: directive-r4-common.md, docs/crypto/signing.md (the finding: a browser without Ed25519 shows an Ed25519 signature as invalid; the NUL separator of the signed message), src/kit/sign.ts, src/kit/envelope.ts, src/kit/shell.ts renderTrust (the trust state beside the title), src/doc/tlo.ts (the parser), src/kit/keys.ts and the Keyboard shortcuts dialog (AppDef.keys), src/apps/write/def.ts and draw/def.ts, docs/editing.md.

Build:
1. A browser that cannot do Ed25519 (no WebCrypto support for it) shows a signed-with-Ed25519 document's state as "cannot check here" (grey, with a hint naming the reason: "This browser cannot check this kind of signature"), never as invalid; red stays for a signature that was checked and does not match. The P-256 fallback is unchanged. Test with the algorithm support stubbed.
2. The kernel never lets a NUL (U+0000) into a document: the parser drops it (as it does for other control characters, or add it to that rule), so the signed message's NUL separator can never be ambiguous; docs/crypto/signing.md says so instead of describing the finding as open; a parser test.
3. The Keyboard shortcuts dialog lists the alignment keys: the Word Processor's Mod+Shift+L/E/R/J and the Drawing Tool's Align (the same keys, cycling), through AppDef.keys with t() strings; the dialog test covers both.

Tests as above; the suite green. PW_PORT=4442.
