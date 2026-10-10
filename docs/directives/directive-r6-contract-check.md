# R6-contract: a signature this browser cannot check is said so, not shown as wrong

Read first: directive-r6-common.md, src/kit/sign.ts (canCheck, checkSignature and its 'unchecked' answer, from 74cc8ed), src/kit/privacy-dialog.ts (the tone and icon helpers for a trust state: unchecked is grey, "Cannot check here", with "This browser cannot check this kind of signature"), src/apps/write/contract.ts (the signatures fence: each row's state, checked on open and after every change; valid / changed since / not signed yet), its tests.

Decided 2026-10-10, not yet built: the contract's rows should treat an Ed25519 signature a browser cannot check the way the document's own trust state does.

Build: a row whose signature checkSignature reads as unchecked shows "Cannot check here" in the grey tone with the same icon and the same explanation as the Privacy dialog (use privacy-dialog.ts's helpers; do not copy the strings), never red; the P-256 fallback and the other states are unchanged; the row still shows who signed and when. One browser or DOM test with a signature whose kind canCheck refuses (stub canCheck or pass an Ed25519 signature to a happy-dom without it).
