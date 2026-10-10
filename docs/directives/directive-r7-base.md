# R7-base: the normal size is what was 130%

Read first: directive-r7-common.md, src/kit/zoom.ts as R7-pinch merged it (BASE does not exist yet; size(), applySize(), stepSize(), navSize(), zoomed(), SIZE_MIN/MAX, NAV_MAX), src/kit/drawer.ts's size row, src/styles/kit.css's root rules, test/browser/languages.test.ts and every browser test that asserts a fit at 390×844 (grep `viewport(390`), src/kit/exports.ts's printPages and the export frame (~line 140), scripts/make-cards.ts (the og cards are drawn outside the page: untouched).

Paul, 2026-10-10, on his iPhone: "What we call '100%' zoom is too small as a starting point. Start at what we now call 130%."

Build:
1. **zoom.ts gains `BASE = 1.3`**: the root's `zoom` is BASE × size, so size 1 (the stepper's "100%", the default, what a new visitor gets) draws everything as today's 130% did. The stepper and the pill keep showing size × 100: "100%" is normal, as a person expects. `zoomed()` returns the root's actual zoom (BASE × size), so everything placed from page coordinates stays right without a change. The ranges in the new terms: SIZE_MIN 0.7, SIZE_MAX 2 (today's 260%), NAV_MAX 1.2 (today's 156%: the bar at the default is already the size a hand needs). A stored size from before (kept under the same key) is read as it is: 1 is still normal.
2. **Everything fits at the new normal.** At 390×844 the page is now 300 CSS pixels wide to the layout: run every fit test (the bar one scrolling row, the drawer, the Share and templates dialogs, the home page's rows, the Word Processor's words with no sideways scroll, the Spreadsheet, the Kanban's columns, the Calendar's month, the Calculator's keys) and fix in the kit's CSS or the app's what no longer fits; the fit tests from R7-pinch (at size 2 now, with the nav at 1.2) must pass as well. Desktop at 1440×900 is 1108 wide to the layout: the home page's rows, the Word Processor's paper and the Presentation Builder's rail still fit side by side where they did; say in `done` what moved.
3. **Nothing drawn outside the page changes**: print (its own frame), the PDF, the PNG, the thumbnails, the og cards and the Display Link's pages are the same bytes as before (a node test on the pages and a browser test on the print frame's `zoom` being unset prove it).
4. docs/editing.md's "Pinch and size" says what 100% is.

Tests (failing before): a node test that applySize at size 1 sets the root's zoom to 1.3 and at 2 to 2.6, and that navSize caps at 1.2; the browser fit tests of point 2 at the default (no size stored) on 390×844; the print frame's zoom unset.
