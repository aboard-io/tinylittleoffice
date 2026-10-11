# R18-outline-caret: the caret stays above the keyboard in the Outliner

**Paul, 2026-10-11:** *"I keep losing my cursor in Outline because it's below the keyboard. I thought you were fixing that."* An earlier fix (0bac823, b0c0078) revealed a new row's block when the caret has no rect, and the chrome sizes the column from the visual viewport while the keyboard is up (b59dcaa, `gliding`). It is still wrong on his iPhone.

## Reproduce first

- WebKit, iPhone 14. With the keyboard simulated iOS-style (the layout viewport stays 844 tall; `visualViewport.height` reads 508 and fires `resize`; see the common contract) and also with a plain viewport of 390 by 508: open the Outliner blank, type 26 rows with Enter after each, then keep typing. On 2026-10-11 the plain-viewport probe showed the caret inside the window (caret 253–277, bar 435–508), so the fault is in the iOS case or in a path the probe did not take: Enter in the middle of a long outline, a row indented or outdented, a row folded, a tap into a row near the bottom edge, the Backspace join, typing fast so the keyboard's resize arrives after the caret moved, or the page scrolled (iOS scrolls the window when it focuses a field; `scrollY` must be 0 and the chrome must put it back).
- Write the failing test before the fix, in `test/browser/outline.test.ts` or `e2e/outline-phone.spec.ts`: after each of those actions, the caret's rect (or its row's) is inside the visual viewport above the bar, and `scrollY` is 0.

## The design

- One rule, in `kit/scroll.ts` `keepCaretVisible` and the Outliner's row editor: after any edit or focus move, the caret's row is revealed inside the column, whose height is the visual viewport's minus the bar, and the window itself is never scrolled (if iOS scrolled it, `scrollTo(0, 0)` in the visual viewport's `scroll` handler, as chrome.ts may already do for the words editor: make the Outliner take the same path, not its own).
- If the Outliner's rows live in a scroller of their own (not `.to-column`), `scrollerOf` must find it, or the rows move into the column: one scroller per screen.
- Reduced motion unchanged.

## Proof

- The tests above, green in WebKit under both keyboard models.
- `e2e/outline-phone.spec.ts` keeps its existing checks.

## Not this

- No change to the words editor's behaviour, which Paul did not report.
