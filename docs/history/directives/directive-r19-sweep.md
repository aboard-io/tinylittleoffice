# R19-sweep: nothing left that nothing uses, and no sentence that is no longer true

**Paul, 2026-10-11:** *"Do a dead code sweep. Lots of stuff has been removed. Signing, apps, and so forth. My guess is a lot of your docs and comments are out of date after this level of change and we have unused functions. Maybe a fast classifier in Sonnet followed by a removal pass in Opus."*

Two passes. **Classifiers** (Sonnet, read-only, one per area, in parallel) list candidates with evidence. **The remover** (Opus, one worktree) checks each candidate itself, removes or rewrites, and leaves a lint behind so the tree stays clean. The lists live outside the repo at `/home/exedev/.claude/projects/-home-exedev-workspace-tinyoffice/sweep/<area>.md`.

## What counts

1. **Dead code.** A file nothing imports; an exported function, constant, type or class no file outside its own imports (a use only from a test is dead, and the test goes with it); a branch no caller can reach (an option no caller passes, a format no app declares, a command no bar or menu names, a kind of block no app makes); a parameter every caller leaves at its default; an i18n key no `t()` call uses in any language file (`npm run i18n:extract` lists them); a stylesheet rule for a class no element has; a public file, icon or card nothing links to; a script in `scripts/` or an npm script nothing runs; a `network.ts` entry for a host nothing reaches; a test of behaviour that no longer exists; a fixture nothing reads; a dependency nothing imports (`docs/dependencies.md`).
2. **Stale words.** A comment, header, doc paragraph, README line, help text, skill or llms.txt sentence, or error message that describes something removed (signing and signatures, the website builder, Kanban and the to-do list, web pictures and embeds and the proxy and its whitelist, the owner key, the living short link and PUT and DELETE, the password strength line, PBKDF2, the media Worker, any app or route that no longer exists) or that explains code by reference to a round, a directive, "the old tree" or a port rather than by what the code does. House style keeps the "(Paul, date: quote)" attributions: those are why, not history. A sentence that is wrong is rewritten to be right, in the house voice; a sentence about nothing is deleted.
3. **Names that lie.** A file, function or variable named for a feature that is gone (`links.ts` holding owner links, `revise`, `Revision`, `media`), where what remains is renamed for what it is now, with every reference.

Not dead: an export of `src/api.ts` or the CLI (the public surface, listed in docs/api.md), an app definition, a custom element's class, a `scripts/` entry named in package.json, a type used only in a signature, the test helpers.

## The classifiers (Sonnet, read-only)

Each gets one area and writes `sweep/<area>.md`: a table with one row per candidate: path, line, symbol or the first words, kind (dead-file, unused-export, unreachable, dead-test, dead-string, stale-comment, stale-doc, misnamed), the evidence (the grep that found no user, with the command; the sentence and what is wrong with it), and a confidence (sure, likely, check). Classifiers do not change files. Areas: `src/kit` a–l; `src/kit` m–z; `src/apps`, `src/doc`, `src/api.ts`, `src/i18n`, `src/styles`; `docs/` (not `directives/`, not `history/`), `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `public/`, `skill/`; `test/`, `e2e/`, `scripts/`, `packages/`, `tinier/`, `.github/`, `package.json`. A classifier counts references with grep across the whole repo (`src test e2e scripts packages tinier public docs skill`), not within its area alone, and names the command it ran.

## The remover (Opus, worktree main-r19-sweep)

- Read every list. Check each candidate before acting (a classifier's "sure" is a claim): a symbol referenced by a string (a command id, a custom element name, a route, an i18n key) is alive. Remove the dead, rewrite the stale, rename the misnamed, each in a WIP commit per area so the review can read it.
- **A lint that keeps it.** `scripts/dead.ts`, run by `npm run lint`: every `export` in `src/` (and `tinier/`, `packages/`) is referenced by name in some other file of `src test e2e scripts packages tinier`, else the script prints the file, the line and the name and exits 1; an export used only from `test/` is printed as "test-only". Exempt by one list in the script with a reason each: the API's public exports, app definitions, element classes, the CLI's commands. A plain word-count by regex over the files, no type-checker (tsc cannot say an export is unused across files; `knip` could, but it is a dependency for one check a hundred lines does). And `test/lints.test.ts` gains the stale words: no file outside `docs/directives`, `docs/history` and `CHANGELOG.md` contains "signature", "signing", "Kanban", "to-do list", "website builder", "owner key", "living link", "picture proxy", "whitelist", "PBKDF2", "the old tree" (case-insensitive; the list in the test with a line for each saying what it was).
- `npm run i18n:extract` after the strings go; `npm run skill`, `npm run network-doc` and the other generators after their sources change; `docs/dependencies.md` regenerated if a dependency goes.
- The report lists what went by area with line counts, what was rewritten, what a classifier claimed that was alive, and the lint's exemptions.

## Proof

- `npm run lint` green with `scripts/dead.ts` in it; the stale-words lint in `test/lints.test.ts`; `npx tsc --noEmit`; `npx vitest run`; `npm run build` with every chunk at or under its previous size.
- A test for `scripts/dead.ts` itself: a fixture tree with one used and one unused export; the script names the unused one.

## Not this

- No behaviour changes, no refactors for taste, no renames beyond the lying names. Moving files is round nineteen's second task.
- No edits in `docs/directives/`, `docs/history/` or `CHANGELOG.md`.
