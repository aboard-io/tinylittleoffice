# Round nineteen — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r17-common.md and directive-r18-common.md: one style (`npm run format`; `npm run lint` checks it), delete outright, a finding is a failing test, a document is checked by the API and never by eye, strings through t(), native APIs first, one mechanism per idea.

This round is housekeeping after the removals of round seventeen (the website builder, signing, Kanban and the to-do list, web pictures and embeds and the picture proxy, the owner key and the living short link) and the changes of round eighteen (passwords, JSON, the agent files, the deploy). **Paul, 2026-10-11:** *"Do a dead code sweep. Lots of stuff has been removed. Signing, apps, and so forth. My guess is a lot of your docs and comments are out of date after this level of change and we have unused functions."* and *"The kit/ folder needs to be organized into subfolders, it's just too big."*

The two tasks run one after the other, each alone on main: the sweep first, then the folders, so the move carries less and nothing else is in flight while import paths change. Mergers squash-merge: one commit per task on main.

`docs/directives/` and `docs/history/` are records and are never edited by a sweep: what they describe was true when written. `CHANGELOG.md` likewise.

Tests: one command at a time, never in the background; `npx vitest run` whole at the end; `npm run build` with the chunk sizes in the report.
