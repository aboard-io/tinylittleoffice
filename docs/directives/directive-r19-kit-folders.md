# R19-kit-folders: the kit in six folders

**Paul, 2026-10-11:** *"The kit/ folder needs to be organized into subfolders, it's just too big."* `src/kit/` is 89 files in one directory, 18,000 lines. Every file keeps its name and its contents; only its place and the import paths change. Runs after r19-sweep merged, alone on main.

## The folders

| folder | what it holds | files (as of 2026-10-11; move what is there when you start) |
|---|---|---|
| `kit/core/` | the contract between an app and the shell, and the link | app, apps, element, shell, commands, keys, i18n, store, version, network, route, envelope, codec, plain, install |
| `kit/ui/` | the elements round a document and the chrome | bar, chrome, context, dialog, doc-dialog, drawer, find, home, insert, insert-dialogs, link-pop, link-guard, menu, palette, toast, complete, compare, preview, share-dialog, privacy-dialog, locked-doc, icons-picker, zoom, pinch, scroll, theme |
| `kit/text/` | the editor's model and its commands | text, textops, text-commands, clipboard, history, rows, rows-commands, columns, diff |
| `kit/draw/` | drawing pages and what is drawn on them | draw, motion, steps, tile, chart, raster, mark, icons, icons-full, icons-meta, icons-search, emoji, emoji-data, qr, qr-picture, page, notes |
| `kit/file/` | a document as a file, in and out | exports, pdf, textpdf, gif, webm, zip, xlsx, csv, ics, open |
| `kit/share/` | sharing, sealing and keeping | share, short, limits, crypt, passwords, locked, privacy, library, search, and `links` if the sweep left it |

A file the table does not name (added since, or kept under another name) goes where its header's first sentence says it belongs; say so in the report. A file whose place you would argue with moves where the table says and the argument goes in the report, one line: this round is a move, not a redesign. Nothing stays at `src/kit/` root.

## The move

- `git mv` each file so history follows it. No content change inside a file beyond its import specifiers and a path in a comment or a header that names a kit file (`kit/codec.ts` becomes `kit/core/codec.ts` wherever it is written: comments, docs, `docs/kernel.md`, `docs/editing.md`, `docs/api.md`, `AGENTS.md`, `CONTRIBUTING.md`, the skill, the tests' comments). Find them all: `grep -rn "kit/[a-z-]*\(\.ts\)\?" src test e2e scripts packages tinier docs skill README.md CONTRIBUTING.md AGENTS.md vite*.ts vitest.config.ts package.json`; the ones in `docs/directives/` and `docs/history/` stay as written.
- Imports: inside the kit, relative paths change (`'./menu'` from `kit/core/shell.ts` becomes `'../ui/menu'`); from apps, `'../../kit/draw'` becomes `'../../kit/draw/draw'`. No path alias and no barrel `index.ts` (a barrel hides what a file reaches for and costs tree-shaking); every import names its file.
- `vite.config.ts` manualChunks and `scripts/budgets.ts` where they name kit files by path; `vitest.config.ts` includes; `scripts/exports-doc.ts`, `scripts/network-doc.ts`, `scripts/commands.ts`, `scripts/i18n-extract.ts` and any generator that globs `src/kit/*.ts` now globs `src/kit/**/*.ts`; `tsconfig` paths if any.
- `docs/kit.md` (write it if there is none; one page): the six folders, one line each saying what belongs there, and the rule for a new file: it goes in the folder whose line fits, and a file that fits none is a sign the design wants a word first.

## Proof

- `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`: chunk names and sizes unchanged within 1% (the report shows before and after).
- `git log --follow` on three moved files shows their history.
- A test in `test/lints.test.ts`: no `.ts` file directly in `src/kit/`; every kit import names a file in one of the six folders; no `index.ts` in the kit.
- `grep -rn "kit/[a-z-]*\.ts" src test docs` (outside directives and history) finds no path that does not exist.

## Not this

- No renaming of files, no splitting or merging of files, no change to any function. No barrel files, no path aliases.
