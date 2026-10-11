# Round eighteen — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r17-common.md: one style (`npm run format`; `npm run lint` checks it), delete outright, a finding is a failing test, growth is fine where it buys simplicity, a document is checked by the API and never by eye (the chrome may be looked at by eye, at a phone's width in WebKit), every string in en.ts translated into the eighteen other language files in the same commit (`npm run i18n:gaps <code>`), American English, browser test files share one origin, e2e specs run with `PW_PORT=<your port>` (4179 is the dev server's). **The checkout is `/home/exedev/workspace/tinylittleoffice` on branch main**; worktrees branch from main and merge into main. The repository is public: https://github.com/aboard-io/tinylittleoffice.

This round is Paul's notes of 2026-10-11, from his iPhone. Round seventeen (removals, the shortener, Plex, the language in the link, the readable Display Link, American English, the docs) merged before this round started: read `docs/history/` or `docs/directives/` for what changed, and build on the tree as it is, never on a memory of it.

**A phone is the first screen.** Each directive here names a thing that is wrong on an iPhone 14's screen (390 by 844, and 390 by about 508 with the keyboard up). Reproduce it in WebKit first; where the keyboard matters, use the init script in `test/browser/helpers.ts` (or write it: a patched `visualViewport.height` with a `resize` event, so the layout viewport stays and the visual one shrinks, as iOS does) and keep that as the test.

Tests: one command at a time, never in the background; `npx vitest run` whole at the end; `npm run build` with the chunk sizes in the report.
