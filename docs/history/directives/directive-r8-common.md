# Round eight — the common contract

Everything in directive-r4-common.md holds (read it first: the tree, the standing rules, pacing on a 2-core box, the report, the node_modules rule), with directive-r6-common.md's two rules (fix the mechanism; every host gets it) and directive-r7-common.md's "Pinch and size" rule as docs/editing.md now has it. This round rebuilds three foundations that rounds six and seven were built on top of, and gives the app its own scrolling so the bar on a phone stops being a guess. Paul, 2026-10-10: "Yes that's the right plan. Let's do it this way: when editing, the top nav vanishes except for the hamburger. The secondary nav is now aligned bottom like you said. Do that but also take your own rewrite recommendations."

The rewrites, in one sentence each:
1. **Sizing** (R8-sizing): lengths in rem and em with two scales, one for the document and one for the nav; the root's CSS `zoom`, `zoomed()` and every division by it are gone.
2. **Exports** (R8-exports): every format is one object that says what it is, whether the browser shows it and how it is built; nothing switches on an extension.
3. **The shell** (R8-shell): a thin shell that owns the route and the document, with the chrome, the share dialog and the privacy work as elements of their own; the page never taller than the visible window; the document in a column that scrolls by itself; on a phone the header hides while editing and the bar sits at the bottom of the column, above the keyboard.

Rules for a rewrite, beyond the contract:
- **Behaviour is kept, tests prove it.** Every browser and node test that passes on next today passes after, or is changed in the same commit with the reason in the commit's message (a test of the mechanism replaced, never a test of behaviour dropped). The fit tests of round seven (390×844 at every size) are the guard for sizing; the Download table's tests for exports; shell.test.ts, text.test.ts and perf.test.ts for the shell. Run the whole `npx vitest run` before the final commit, one command at a time.
- **One mechanism per idea, and the old one deleted.** No shim, no fallback to the old way, no "kept for now".
- **Nothing drawn outside the page changes**: print, the PDF, the PNG, the thumbnails, the og cards and the Display Link's pages are the same bytes before and after (a node test on the pages proves it).
- **The headers say the design.** Each rewritten module's header comment says what the mechanism is and why it replaced the last one, in the house voice; docs/kernel.md and docs/editing.md are brought up to date where they describe the old way.

Tests live beside what they test; browser tests at 390×844 and at 1440×900 (PW_PORT=4444). Two builders share the box: one test command at a time, never in the background.
