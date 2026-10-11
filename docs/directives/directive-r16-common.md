# Round sixteen — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r13-common.md: one style (`npm run format` before each commit; `npm run lint` checks it), delete outright, a finding is a failing test, growth is fine where it buys simplicity, a document is checked by the API and never by eye (`node packages/doc/tinyoffice.ts lint <file>`). **The branch is `main`**: worktrees branch from main and merge into main; the checkout is `/home/exedev/workspace/tinyoffice-next` on branch main.

This round comes from the review of 2026-10-11 (`docs/reviews/2026-10-11.md`: eight reviewers, one synthesis). Each directive quotes the reviewer it answers; the quoted evidence was measured against this tree, so trust it, and reproduce it with a failing test before fixing it.

**Eighteen languages.** `npm run i18n:check` fails when any language file lacks a key, so every string you add or change in `src/i18n/en.ts` is translated into the eighteen others (ar, bn, de, es, fr, hi, ht, it, ja, ko, nl, pl, pt-br, ru, uk, ur, zh-hans, zh-hant) in the same commit: `npm run i18n:gaps <code>` prints what each lacks, ready to paste; keep each language's glossary voice (`docs/translation.md`, and the language file's own head). The label-widths test measures every language's bar words; a label that does not fit is shortened in that language, not raised, unless the list in `test/browser/label-widths.test.ts` already carries it with a reason.

**Standing decisions that bind this round.** Mod+K stays Link in the words editor (Paul). The menu button may fade while typing (Paul), so r16-size makes it opaque only when the size is above 100% or the device asks for more contrast. Browser pinch-zoom stays off on touch and the kit's size-of-everything is the zoom (Paul's pinch rule); the browser's keyboard zoom keys are never taken. NAV_MAX and SIZE_MAX do not change. No home-page copy. The Display Link's text layer is not this round's.

**Shared files.** Several branches touch `src/i18n/en.ts` (and so all 19 language files), `src/kit/store.ts`, `src/kit/shell.ts` and `src/kit/privacy-dialog.ts`. Keep your change to those files small and local, add new strings at the end of the section they belong to, and before your final commit `git fetch origin && git rebase origin/main` and run the whole suite again, so the merge is a fast-forward or near it.

**Browser tests share one origin.** Vitest's browser files run at once in one origin, so localStorage leaks between files: a test that sets a preference removes it in afterEach, and a test that counts what the device holds clears the preference keys first and asserts an exact count.

Tests: one command at a time, never in the background (a 2-core box shared with another builder); `npx vitest run` whole at the end; `npm run build` with the chunk sizes in the report.
