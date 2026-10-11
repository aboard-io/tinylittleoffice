# R17-no-board-todo: the Kanban Board and the To-do List are gone

**Paul, 2026-10-11:** *"Get rid of Kanban and To-do List. The implied state change is too confusing when it doesn't actually save to a server."* A card moved to Done or a task ticked looks like a thing that happened somewhere; here it only changes a link on one device. Pre-launch there is no compatibility to keep (prelaunch-no-compat): delete, do not shim.

## What goes

- `src/apps/board/` and `src/apps/todo/` whole (def, editor, model, view, style, templates, templates.md, tests, commands), their registration in `src/kit/apps.ts` and the registry, their icons, their routes (`#/v1/board/…`, `#/v1/todo/…` become unknown apps: the shell's existing path), their exports, their chunks and budgets (`budgets.json`), their strings in all 19 language files (every key only they used: `npm run i18n:check` and the unused-strings lint say which), the walks' model entries, their e2e specs (`board-todo-phone.spec.ts` and any other), the hand-offs into or out of them in other apps' defs (an Outliner's 'Show as a to-do list', a Spreadsheet's or Calendar's board hand-off, whatever exists: `grep -rn "'board'\|'todo'" src/`), the Insert dialogs or menus that offered them, the home page's rows (ten apps now), docs (README, docs/kernel.md, docs/editing.md, docs/templates.md, docs/transparency.md, the generated docs by their scripts), `skill/tinyoffice/SKILL.tpl.md` and `public/llms.txt` via `npm run skill`, `src/api.ts` and `packages/doc/tinyoffice.ts` where they name apps, the review document's examples are history and stay.
- **Kept:** task lines in the Word Processor and the Outliner (`- [ ]` in the format: a tick in a document is a word in the text, not a state), the one-line row editor the Trip Planner and the Calendar share (`kit/rows`, if only the To-do List used it, it goes too: say which in the report).

## Proof

- `grep -rn "board\|todo\|kanban" src/ docs/ skill/ e2e/ test/ -i` finds no reference to either app (a "board" in the Diagram's whiteboard words or "to do" in a sentence stay: name each remaining use in the report).
- `npm run build`: no board or todo chunk; the home page lists ten apps; the walks run over ten.
- The whole suite green.

## Not this

- No replacement, no note that they were here.
