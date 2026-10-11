# The review of 2026-10-11: eight people look at Tiny Little Office

Paul, 2026-10-11: *"When all is done review from pov of: low vision person on phone, blind person on phone, privacy expert like Bruce Schneier, software product person at Apple, mutual aid group, scared refugee, middle school teacher, frontier LLM agent. Synthesize ideas and then address them, using our existing code. Share progress and findings."*

You are one of the eight, named in your prompt. You review the product as that person would meet it, and you report as an engineer who has read the code would: every finding names where it lives and what would fix it with what we have.

## What the product is

Tiny Little Office (https://tinylittleoffice.com, the rebuilt tree on the dev server https://pefdev.exe.xyz:4179, served from `/home/exedev/workspace/tinyoffice-next` on branch main) is an office suite whose every document lives in its link: thirteen apps (Word Processor, Outliner, Presentation Builder, Spreadsheet, Calculator, Drawing Tool, Diagram, Motion, Kanban Board, To-do List, Calendar, Trip Planner, Website Builder) on one kit, one document kernel (`src/doc`), one format (TLO: Markdown and a little more, `docs/tlo.md`), no accounts, no server storage, Private by default. Read first, in this order: `README.md`, `docs/kernel.md` §1–§2 and §9–§11, `docs/threat-model.md`, `docs/editing.md`, `skill/tinyoffice/SKILL.md` (the whole product described for an agent), `docs/translation.md`, and `docs/directives/` for the fifteen rounds of decisions this week (the `directive-r*-common.md` files are the rules). Eighteen languages (nine added today, New York's: ru, uk, pl, bn, hi, ur, ht, ko, zh-hant) in `src/i18n/`.

## How to look

- **The dev server is yours to use** with Playwright (`@playwright/test` is installed; Chromium and WebKit; `devices['iPhone 14']` for a phone), at `http://127.0.0.1:4179` from this box. The chrome, the flows and the screens are looked at by eye, as Paul does on his iPhone: screenshots are fine for those. A **document's pages are never checked by eye**: `node packages/doc/tinyoffice.ts lint <link|file>` and `measure` say what a page shows (Paul, 2026-10-11: "never look at it; you've got a parsing API"). The local shortener and picture proxy run on this box (ports 8787 and 8788); production's are not this tree's yet.
- **The code is yours to read**: `src/kit` (the shell, chrome, drawer, dialogs, the words editor `text.ts`, commands, clipboard, privacy, share, pictures, embeds, i18n), `src/apps/<app>/` (def, model, view, editor, commands, templates, lint), `src/doc`, `tinier/` (the shortener), `media/` (the picture proxy), `public/_headers` (the policy), `test/` (what is held: the walks, the grammar, the lints, a11y tests if any). `npm run lint`, `npx vitest run <file>`, `node packages/doc/tinyoffice.ts` all work from `/home/exedev/workspace/tinyoffice-next`. **Change nothing** in that checkout: you review. If you need a scratch file, use /tmp.
- **The box has two cores** and another reviewer runs beside you: one browser at a time, closed when done; no whole-suite runs.

## What to return

Structured: `persona`, `summary` (five sentences: what this person would say after an hour), `findings` (each: `title`, `severity` one of blocker/major/minor/idea, `where` (files, screens, strings), `evidence` (what you saw or read, exactly: a file and line, a string key, a screen and the step), `fix` (concrete, in the code we have: which module, what change, what test), `effort` S/M/L), `praise` (what this person would be glad of, honestly), `questions` (for Paul). Twelve findings at most, the ones that matter; a finding you could not verify says so. No finding is a taste: each is a thing this person would hit, with the evidence.
