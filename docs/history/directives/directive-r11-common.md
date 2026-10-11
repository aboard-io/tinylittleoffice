# Round eleven — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r9-common.md's and directive-r10-common.md's rules. Round ten's tree is the base, and since it the code has one style: `.prettierrc` (single quotes, lines to 200, templates left as written) with `npm run format` to write it and `npm run lint` to check it; the build runs lint. Format what you touch with `npm run format` before each commit and never by another setting.

The rule of the round, Paul's of 2026-10-09 (prelaunch-no-compat): until launch, what is taken out is deleted outright, with its tests, its words in every language, its mentions in the docs and its build plumbing. No shim, no flag, no "kept for later".

Tests: one command at a time; `npx vitest run` whole at the end; `npm run build` (which runs lint, and the chunk budgets: a chunk that shrinks lowers its budget in budgets.json to today's size plus five percent, so the tripwire follows) with the chunk sizes in the report.
