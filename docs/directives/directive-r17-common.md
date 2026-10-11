# Round seventeen — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r16-common.md: one style (`npm run format` before each commit; `npm run lint` checks it), delete outright, a finding is a failing test, growth is fine where it buys simplicity, a document is checked by the API and never by eye, every string in en.ts translated into the eighteen other language files in the same commit (`npm run i18n:gaps <code>`), browser test files share one origin (a test that sets a preference removes it in afterEach), e2e specs run with `PW_PORT=<your port>` (4179 is the dev server's). **The branch is `main`**: worktrees branch from main and merge into main; the checkout is `/home/exedev/workspace/tinyoffice-next` on branch main.

This round is Paul's answers of 2026-10-11 to the review's questions (`docs/reviews/2026-10-11.md`), verbatim where a directive quotes him. Each directive is one answer. Where a directive and an older document disagree, the directive wins and the document is corrected in the same branch (docs/threat-model.md, docs/editing.md, docs/translation.md, docs/tlo.md, the skill via `npm run skill`).

**American English.** From this round the product's English is American (r17-american). A new string you write is American: color, center, organize, ZIP code, cell phone, the Letter paper that is already the default.

**Shared files.** `src/i18n/en.ts` (and so all 19 language files), `src/kit/shell.ts`, `src/kit/i18n.ts` and `src/kit/apps.ts` are touched by more than one branch. Keep changes small and local; before your final commit `git fetch origin && git rebase origin/main` and run the whole suite again.

Tests: one command at a time, never in the background (a 2-core box shared with another builder); `npx vitest run` whole at the end; `npm run build` with the chunk sizes in the report.
