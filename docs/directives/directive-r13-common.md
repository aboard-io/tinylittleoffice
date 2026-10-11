# Round thirteen — the common contract

Everything in directive-r4-common.md holds (read it first), with the rules of directive-r9-common.md through directive-r12-common.md: one style (`npm run format` before each commit, `npm run lint` checks it), delete outright, a finding is a failing test, growth is fine where it buys simplicity, and a document is checked by the API, never by eye (`node packages/doc/tinyoffice.ts lint <file>`; never a screenshot). **The branch is `main`** since 2026-10-11: worktrees branch from main and merge into main; the checkout is `/home/exedev/workspace/tinyoffice-next` on branch main (the directory's name is historical).

Tests: one command at a time; `npx vitest run` whole at the end; `npm run build` with the chunk sizes in the report.
