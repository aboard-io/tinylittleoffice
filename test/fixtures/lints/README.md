Tiny bad files, one for each lint of test/lints.test.ts: each lint must find what is wrong here, so a lint that
stops catching is seen. Nothing here is imported by the site.

- `bare-words.ts`: words in a template that are not through t()
- `graph/src/`: an app importing another, the kit importing an app, the kernel importing the kit and naming the
  window, a language imported outside kit/core/i18n.ts, and an import cycle
- `built/`: a build whose entry chunk is over the budget the test gives it
- `stale.md`: a generated file that is not what its script writes
- `timed-waits.ts`: a test that waits a time (tick, setTimeout, waitForTimeout) over 50ms, where a condition belongs
- `dead/`: a tree with an export another file uses, one nothing uses, one only a test uses, one a test and its own
  file use, and a number its own file alone uses (scripts/dead.ts)
- `stale-words.md`: words for what is gone, and words that only hold one ("Designing")
- `stories/`: three custom elements, one with no story (a meta's `component` or a story's `covers`)
