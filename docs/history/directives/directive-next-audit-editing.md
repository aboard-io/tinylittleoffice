# Editing audit — one reviewer per app, against docs/editing.md

You are auditing ONE app of TinyLittleOffice's rebuilt tree (/home/exedev/workspace/tinyoffice-next, branch next; read-only: change nothing, commit nothing) against the written editing standard docs/editing.md. Read that standard first, whole. Then the app's folder src/apps/<id>/ (editor.ts, model.ts, def.ts, style.css, tests/), and the kit pieces it uses: src/kit/text.ts (the shared words editor, with its selection bubble), src/kit/context.ts (the contextual bar), src/kit/bar.ts, src/kit/menu.ts, src/kit/dialog.ts, src/kit/element.ts (undo), src/kit/clipboard.ts. The e2e spec for the app in e2e/ shows what the phone run already proves.

Walk every row of §1 and the section(s) of the standard that apply to the app (§2 words, §3 lists, §4 grids, §5 canvases, §6 things in rows, §7 pointer and finger), three ways each: keyboard, mouse, finger (iPhone Safari at 390px). For each path record one finding:

- `path`: the standard's row, e.g. "§1 Mod+A", "§3 Enter at start", "§7 drag handle".
- `way`: keyboard | mouse | touch | all.
- `status`: works | missing | differs | n/a (say why n/a in detail: e.g. no grid in this app).
- `detail`: what the code does, in one or two sentences, with the function name.
- `file`, `line`: where the behaviour lives (or where it should).
- `severity`: shortcut-means-else (a key from §1 does something else here: worst) | destructive-no-undo | missing-touch (no finger way to an action) | missing-key | inconsistent (differs from another app doing the same thing: name the other app) | minor.
- `fix`: one sentence on what to change, concrete (which handler, which kit piece).

Determine behaviour by reading the code and its tests. You may run at most two targeted commands to settle a doubt: `npx vitest run src/apps/<id>/tests/<file>` or `npx tsc --noEmit -p .` — never the whole suite, never Playwright (a 2-core box shared with other agents). Do not invent behaviour: if you cannot tell, say `status: unknown` with what would settle it.

Also report, outside the table: (a) the app's own shortcuts that are not in §1 (letter tools, Mod+. etc.) and whether they collide with §1; (b) every popover/dialog and whether Escape closes it and returns focus; (c) whether the contextual bar (`<to-context>`) appears when a thing is selected, and its item order compared with §5/§6; (d) the three worst findings in one line each; (e) what the app does better than the standard (a candidate for the standard).

Return structured output only: {app, findings: [...], ownShortcuts: [...], popovers: [...], contextBar: string, worst: [3 strings], better: string}.
