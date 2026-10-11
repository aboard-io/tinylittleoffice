# Contributing

Issues and pull requests are welcome. Tiny Little Office is small on purpose, so for anything large, open an
issue first and say what you mean to do. A security problem is not an issue: see [SECURITY.md](SECURITY.md).
Everyone here keeps the [code of conduct](CODE_OF_CONDUCT.md).

## Running it

Node 24 or later.

```sh
npm ci                                   # the lockfile, exactly
npx playwright install chromium webkit   # the browsers the tests run in
npm run dev                              # the site at http://localhost:4178
```

## Before a pull request

The whole suite passes, as CI runs it (`.github/workflows/ci.yml`, the same checks a deploy runs):

```sh
npm test         # every test: the pure code under node, the kit and every editor in Chromium
npm run lint     # the types, Prettier, and the lints of the code (test/lints.test.ts)
npm run build    # the site as it ships, its chunks held to budgets.json
```

CI also runs `npm run i18n:check` and the smoke run on the built site (`e2e/smoke.spec.ts`, `keyboard`, `a11y`).

## The house rules

- **Every word through `t()`, in 19 languages.** A string a person reads is `t('English words')`, listed in
  `src/i18n/en.ts` (`npm run i18n:extract`) and translated into every other file in `src/i18n/` in the same
  pull request (`npm run i18n:gaps -- <code>` prints what a language lacks). The English is American.
- **A finding is a failing test.** A bug comes with the test that fails without its fix, in the layer it lives
  in: `test/` under node for pure code, `test/browser/` in Chromium for anything on the page, `e2e/` for the
  built site and the phone.
- **Native web APIs first.** Use the browser before a library.
- **No dependency without a reason.** A new one needs its line in `scripts/dependencies.json`: the native API
  it beat, and why (`npm run docs:deps` writes docs/dependencies.md and refuses without it).
- **Prettier** formats everything (`npm run format`); `npm run lint` checks it.
- **Nothing leaves the browser** that `src/kit/network.ts` does not list (docs/network.md).
- Words are edited where they are drawn, by keyboard, pointer and finger alike (docs/editing.md); one document
  model and one editor (docs/kernel.md); a document's text survives a parse and a write byte for byte
  (docs/tlo.md). Phone first, at 390 pixels wide in WebKit.

Commit messages are sentences: what changed, and why. By contributing you agree that your work is released
under the [MIT License](LICENSE).
