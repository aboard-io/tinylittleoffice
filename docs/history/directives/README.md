# Directives

The briefs given to the agents that build Tiny Little Office, one file per task, and the
workflow scripts that run them (Opus builds two at a time in worktrees off `next`, Sonnet merges
one at a time once `tsc`, `i18n:check`, `vitest` and `build` are green, then pushes).

They are kept here so the reasoning behind a change is in the repository with the change: each
directive names what was seen, the mechanism behind it, what to build, and the tests that prove
it. `directive-r4-common.md` is the contract every builder reads first; `directive-r6-common.md`
and the like add a round's rules. `paul-round-four-verbatim.md` is the product notes a round
came from, as written.

The scripts refer to a working copy of this folder outside the repository (the `S` constant); the
copy here is the record, synced at the end of each round.
