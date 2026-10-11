# Contributing

Thank you for wanting to make Tiny Little Office better. It is small on purpose, and it keeps a few
standards strictly so it stays that way: please read this page before you start, and say what you mean to
do in an issue or a discussion before a large change, so nobody's afternoon is wasted.

A security problem is not an issue: see [SECURITY.md](SECURITY.md). Everyone here keeps the
[code of conduct](CODE_OF_CONDUCT.md).

## Running it

Node 24 or later.

```sh
npm ci                # the lockfile, exactly
npm run dev           # the site at http://localhost:4178, every app
npm run lint          # the type check and the lints of the code (test/lints.test.ts, the stylesheets, the window's scroll)
npm run i18n:check    # every string a person sees is in src/i18n/en.ts
npm run test:unit     # the pure code, under node
npm run test:browser  # the kit and every editor, in a real Chromium (npx playwright install chromium first)
npm run build         # the lint, then dist/ as the site ships, then the chunks held to budgets.json
npm run test:e2e      # the built site, desktop Chromium and an iPhone-sized WebKit
```

The shortener and the picture proxy run on your machine too: `npm run tinier:dev` and `npm run media:dev`
(the README says how the dev server reaches them).

## How it is built

Read these before changing what they cover; a change that breaks one is a bug, however well it works.

- **docs/editing.md, the editing standard.** Every app edits the way a person already knows from the
  editors they use every day, by keyboard, pointer and finger alike; a deviation is a bug unless that page
  lists it. Above all: **words are edited where they are drawn**, never in a box beside them, and a form
  only for what is not words (a date, an address, an icon).
- **docs/kernel.md, the kernel and the kit.** One document model (`src/doc/`) with TLO as its one parser and
  writer; every app is a view over it and every edit an operation, undone from one op log. One rich-text
  editor, `<to-text>`, and no contenteditable anywhere else. Apps are definitions on one kit (`src/kit/`):
  one mechanism per idea, direct manipulation and Insert ▾, never an Add button at the foot.
- **docs/tlo.md, the format.** A document's text survives a parse and a write byte for byte. A person never
  types the format's syntax: every label, link and field is a form or direct manipulation, and the code
  writes the text.
- **Phone first.** Every editor works at 390 pixels wide in WebKit (an iPhone's Safari), then widens.
  Dark mode through the tokens; accessible by keyboard and screen reader.
- **Strings through `t()`.** Every word a person reads is `t('English words')`, listed in `src/i18n/en.ts`
  (`npm run i18n:extract`, then sort by hand). The product is written "Tiny Little Office".
- **Native web APIs first.** No new dependency without the native API it beat and why, written as its line
  in `scripts/dependencies.json` (`npm run docs:deps` fails without one; docs/dependencies.md is the list).
- **Nothing leaves the browser** that docs/network.md does not list. No analytics, no error reporting, no
  fonts or scripts from another site.

## Tests, by layer

A change in behaviour comes with its test, in the layer where it lives:

- **Unit** (`test/*.test.ts`, `src/apps/<id>/tests/*.unit.test.ts`, node): pure code: the kernel, the
  codec, a view's model, a format.
- **Browser** (`test/browser/`, `src/apps/<id>/tests/*.test.ts`, Vitest in Chromium): anything that touches
  the DOM, driven with real events.
- **End to end** (`e2e/`, Playwright on the built site): the smoke, the keyboard alone, axe in light and
  dark; a line on the phone for anything done by touch.

A generated page (docs/exports.md, docs/dependencies.md, docs/network.md, docs/editing.md's tables, the skill) is
never edited by hand: `npm run lint` runs each script with `--check` and fails on a stale one; run its script and
commit the result.

The lints (test/lints.test.ts) hold the code's rules: every word in an html`` or svg`` template goes through t();
the import graph of src/ has no cycle, an app imports no other app, the kit imports the apps only in kit/apps.ts,
the kernel (src/doc) imports nothing of the kit or the apps and names no window, document, navigator or
localStorage; a language is loaded only by kit/i18n.ts. A failure names the file, the line and the rule.

The build ends by weighing its chunks against budgets.json (scripts/budgets.ts; `npm run budgets` prints them).
The budget is a tripwire against growth nobody meant, not a ceiling on clarity: growth that buys simplicity is
raised into budgets.json in a commit of its own whose message says why.

## Commits and pull requests

One change per pull request, with its tests and every check green (CI runs them). Commit messages are
sentences in plain words: what changed, and why, as a person would say it ("The Outliner keeps the
page's measure on a wide screen: a list of words, not a spreadsheet"), not a type prefix and a fragment. Keep
the lockfile committed and never commit a secret, a `.env` file or `dist/`.

By contributing you agree that your work is released under the [MIT licence](LICENSE).
