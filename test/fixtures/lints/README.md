Tiny bad files, one for each lint of test/lints.test.ts: each lint must find what is wrong here, so a lint that
stops catching is seen. Nothing here is imported by the site.

- `bare-words.ts`: words in a template that are not through t()
- `graph/src/`: an app importing another, the kit importing an app, the kernel importing the kit and naming the
  window, a language imported outside kit/i18n.ts, and an import cycle
- `built/`: a build whose entry chunk is over the budget the test gives it
- `stale.md`: a generated file that is not what its script writes
