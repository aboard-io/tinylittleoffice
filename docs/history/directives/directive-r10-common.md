# Round ten — the common contract

Everything in directive-r4-common.md holds (read it first), with directive-r9-common.md's rules (a finding is a failing test; generated is generated; nothing ships but what the person uses, and growth is fine where it buys simplicity). Round nine's tree is the base: the command registry (src/kit/commands.ts), the random walks over the chrome (test/browser/walks.test.ts, the model in test/walks-model.ts, what they found and left in test/walks-known.ts), the grammar of the format (test/doc/tlo-grammar.ts) and its properties (test/doc/properties.test.ts), and the lints under `npm run lint`.

This round answers the two findings the walks left for a decision, each decided by Paul on 2026-10-10:

- **Spaces are never lost.** On the walks' second finding (a block's words ending in a space or a line break are dropped by the link): *"we cannot ever lose spaces if they're there. This is why we struggled with cut and paste before trying to copy one sentence multiple times."* The format learns to say them; nothing trims what a person typed.
- **One modal at a time.** On the first (a dialog opened from inside another stacks two modals): the outer one hands over.

The rule of the round: **each task ends by taking its entry out of test/walks-known.ts** and proving the walk that found it now passes from its replay seed. A known finding is a debt; this round pays both.

Tests: node for the kernel, browser for the chrome; the walks file (`npx vitest run test/browser/walks.test.ts`) and `npm run walks` once at the end of each task, green; one test command at a time, `npx vitest run` whole at the end, `npm run build` with the chunk sizes in the report.
