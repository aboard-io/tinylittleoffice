# R16-e2e: the end-to-end specs say what the tree does

**Found while finishing round sixteen (2026-10-11).** The deploy runs the e2e smoke set (`e2e/smoke.spec.ts`, `e2e/keyboard.spec.ts`, `e2e/a11y.spec.ts`) on the built site, desktop Chromium and phone WebKit, and refuses to ship on a failure. Two of its checks had gone stale since the rebuild and are fixed on main (a key-closed menu gives the focus to its button; the phone's bar comes with the focus, so a spec taps the words before Insert). The reflow builder ran the whole e2e suite and counted 28 failures on main across anim, board-todo-phone, diagram, draw, sheet-phone, shell-phone, thumbs and others; the voiceover builder found `e2e/outline-phone.spec.ts:120` expecting a 44px handle where the base size of 130% (kit/zoom.ts BASE) draws 57.2px. Nobody has run the whole e2e suite since the mergers started running only Vitest.

## What to do

1. Run the whole suite on main's build: `PW_PORT=4286 npx playwright test --reporter=line` (the port is yours; 4179 is the dev server's; a run takes a few minutes and builds the site first). Keep the list of failures.
2. For each failure decide, from the tree and docs/editing.md, which it is:
   - **A stale expectation** (the base size of 130%, Share and Download moved into the drawer, the bar that comes with the focus on a phone, a renamed app, a control that moved into a menu, a string that changed): bring the spec up to what the tree does now, keeping what the spec was proving. Say in the commit what each was.
   - **A real defect** (the tree does not do what docs/editing.md or the directive that made the feature says): fix it with the smallest change, with a Vitest test that fails without it where one fits; if it is bigger than an hour, leave the spec failing and name it in `left` with the evidence.
   - **A spec that cannot be run here** (a device or a network it needs): mark it `test.skip` with the reason in one line.
3. Finish with the whole suite green or every red named in `left` with its cause, and the usual checks (`npx tsc --noEmit -p .`, `npm run lint`, `npx vitest run`, `npm run build`).

## Where

`e2e/*.spec.ts`; the kit or an app only where a defect is real.

## Not this

- No weakening of a check to make it pass: a check that fails because the tree regressed is a defect, not a stale expectation. Any check whose intent you drop is named in the commit.
- No change to the smoke set's scope, and no new specs beyond what a real defect needs.
