# R9-lints: the rules of the code held by code

Read first: directive-r9-common.md, test/stylesheets.test.ts (the stylesheet lint of round eight: the model for these), docs/directives/directive-r4-common.md's standing rules (a human never edits markup; strings through t(); native APIs first; one mechanism per idea), src/kit/apps.ts (the registry of apps; the one place the kit may know an app), scripts/network-doc.ts and docs/network.md (the generated network doc: the model for a generated report), vite.config.ts (chunks), package.json's scripts.

Build:
1. **Bare words lint** (node, the TypeScript compiler API, already a dev dependency): every `html\`…\`` and `svg\`…\`` tagged template in src/ is walked; a run of letters that is not inside `${…}`, not an attribute name or value that is not user-facing (class, id, role, type, href, part, slot, data-*, aria-* with a `${t(` value), and not a known non-word (an icon name, a unit, a glyph like `·`, `…`, `×`) fails with the file, line and the words. An allowlist of exact phrases with a reason, kept short. What it finds today is fixed (through t(), with the nine languages gapped) in the same task.
2. **Module graph lint** (node): the import graph of src/ has no cycle; src/apps/<a> never imports src/apps/<b>; src/kit imports src/apps only in apps.ts; src/doc imports nothing from src/kit or src/apps; src/i18n is imported only by i18n.ts (lazy). The failure prints the cycle or the edge.
3. **Chunk budget** (node, after `npm run build`): `dist/assets` chunk sizes against `budgets.json` (the main chunk, the apps chunk, each app's editor chunk, the languages, the icons); a chunk over its budget fails; raising a budget is a commit of its own with the reason in the message. Today's sizes plus 5% are the first budgets. The budget is a tripwire against growth nobody meant, never a reason to make code terse: growth that buys simplicity is raised into the budget with that reason (Paul, 2026-10-10).
4. **No DOM in the model**: src/doc never names window, document, navigator or localStorage (node grep test); **no window scrolling** anywhere (R8-shell's grep test, if it landed, else here).
5. **Generated outputs are fresh**: one test that runs each generating script (network-doc, commands, make-skill, dependencies) in check mode and fails if the committed file differs.
6. `npm run lint` runs all of these and the stylesheet lint; the build runs them first.

Tests: the lints are the tests; each has one fixture it must catch (a tiny bad file under test/fixtures/lints) so a lint that stops working is seen.
