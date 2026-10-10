# Round six — the common contract

Everything in directive-r4-common.md holds (read it first: the tree, the standing rules, pacing on a 2-core box, the report, the node_modules rule). This round is Paul's list of 2026-10-10: eight things seen in the Word Processor and around it. Each directive names its files; read every one of them in full before changing anything, and reproduce the fault with a test that fails before you fix it.

Two more rules for this round:
1. **Fix the mechanism, not the symptom.** Paul's words are the symptom ("Mod+A does not select all", "it keeps pushing me back down"); your directive names the likely mechanism. Confirm it with a failing test first; if the cause is elsewhere, fix the real one and say so in `done`.
2. **Every `<to-text>` gets it.** Whatever is fixed in the editor is fixed for every host (the Word Processor, the Presentation Builder's words, the Outliner's nodes, the Website Builder's things, the Diagram Maker's labels): say in the report which hosts you tried.

Tests live beside what they test: node tests for pure code (test/*.test.ts, src/**/tests), browser tests for the editor (test/browser, real events, PW_PORT=4444). `npx vitest run` whole once at the end.
