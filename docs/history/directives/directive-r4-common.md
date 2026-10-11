# Round four — the common contract

Tree: /home/exedev/workspace/tinyoffice-next, branch next (your worktree branches off it; see your prompt). Binding: docs/editing.md (the editing standard), docs/kernel.md, the kit's README and src/kit/*.ts headers, and the standing rules: native web APIs first; ponytail minimalism (one mechanism per idea, direct manipulation plus Insert ▾, no Add buttons at the foot); phone first at 390px in WebKit; dark mode through tokens; accessible; no compat shims (pre-launch); every document byte-stable through parse/write; strings through t() in src/i18n/en.ts (your section; `npm run i18n:extract` then `i18n:check`); tests with every behaviour (DOM tests with real events, node tests for pure code, a phone e2e line for touch); no contenteditable outside `<to-text>`.

Two new standing rules from Paul (2026-10-09):
1. **A human never edits Markdown or TLO syntax.** Nothing a person types is a marker or a separator (`Label | url`, `**bold**`, `:icon:`, `- `, `~ A -> B`); every label, link, button, card and field is a form or direct manipulation with a `<to-text>` where words are rich. The text format stays the document's, written by the code.
2. **The product is written "Tiny Little Office"** (three words) wherever people read it. Code identifiers, the domain and the `tinyoffice.` storage keys stay.

Pacing: a 2-core box shared with another agent: one test command at a time, never in the background; `npx vitest run` whole once at the end (rerun a timed-out file alone before calling it a failure); `npx tsc --noEmit -p .`; `npm run build` once. WIP-commit early; final commit(s) in the house voice (sentences: what changed and why). Do not merge or push. Touch other folders only as your directive says; kit changes minimal, tested in test/browser, named in the report.

Report (structured): branch, commit, worktree, done (one line per item), tests (exact counts), kitFiles, left (what is not done and why, questions for Paul), ok (true only when every check is green).

- The node_modules symlink in your worktree is NEVER committed: before every commit, `git status --short` must not list node_modules; if it does, `git rm --cached node_modules`. A committed link has already replaced the main checkout's real node_modules once (2026-10-10).
