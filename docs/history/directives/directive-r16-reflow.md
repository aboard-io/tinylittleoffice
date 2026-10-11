# R16-reflow: nothing splits or leaves the screen at 200%

**The review of 2026-10-11.** The low-vision reader: *"At 200% on a 390px phone, words split letter by letter: the To-do List's task text, the Kanban Board's column names and the home page's app names ('Wor / d / Proc / ess / or'). The calendar's weekday names run into each other, and the presentation's Previous button is pushed off the screen."* The Apple product person: *"In light mode the presenting controls are white on white."* The teacher: *"On a phone, a worksheet's question column shrinks to 'First…' and headers break mid-word."*

## What is wrong today

1. Inside the document, hit areas are `--to-touch: 2.75rem`, which is 114 px at 200%. A to-do row's grip, tick, star and menu take the whole 390 px and leave the words about 25 px. `overflow-wrap: anywhere` (kit.css `.to-app-name`, the board head's text) then breaks inside words.
2. `src/apps/cal/editor.ts:940` uses `weekday: 'short'` in a grid whose columns are about 55 px, so the names overlap. The agenda already uses 'narrow'.
3. `src/apps/deck/style.css:501`: `.deck-show .ctl .to-btn { color: #fafafa }` on a white button, about 1.04:1 in light. `.deck-show .ctl` is not in kit.css's nav `:is(…)` list, so at 200% its buttons are 114 px and Previous starts at x<0. `onShowClick` has no swipe. The Trip Planner's present button has the same colour rule (trip/editor.ts:428).
4. The drawer's Theme select runs to 392 px at 200%. The skip link is 517 px wide.
5. The Word Processor's table at 390 px ellipsises cells ('First…') and breaks 'Drawin / g'.

## The design

- **Rows wrap before words break.** `.todo-row`, `.board-head` and `.to-app-head` get `flex-wrap: wrap`, and the words' box gets `flex: 1 1 8em`, so the trailing controls drop below when there is no room. Names and labels use `overflow-wrap: break-word`, never `anywhere`.
- **A document's hit areas stay at the nav's scale**: `min(2.75rem, calc(2.75 * var(--to-nav-font)))`, so they grow to 120% and no further.
- **Weekdays fit.** Each `.cal-wd` renders both forms, `<abbr title=long><span class=short>…</span><span class=narrow>…</span></abbr>`. A container query on `.cal-grid` (`max-width: 34rem`) shows the narrow form. `.cal-wd` gets `overflow: hidden` as a backstop.
- **The show's controls.** Add `.deck-show .ctl` to the nav list. Give it `max-width: calc(100vw - 1.5rem)` and `flex-wrap`. Its buttons are transparent on the pill's dark backing (`background: transparent; border-color: transparent`), and the Trip Planner's present button is the same. A horizontal swipe (|dx| > 40 px and |dx| > |dy|) turns the slide back or forward, mirrored in RTL, and is skipped right after a pinch.
- **Drawer selects** go under their label when the two don't fit (flex-wrap, `flex: 1 1 100%`). `.to-skip` gets `max-width: 100%` and wrapped text.
- **The Word Processor's table** wraps cell words at narrow widths (`white-space: normal; overflow-wrap: break-word`), and headers break only between words. The Spreadsheet's grid keeps one line per cell.

## Where

`src/apps/todo/style.css`, `src/apps/board/style.css`, `src/styles/kit.css` (.to-app-name, the nav list, drawer rows, .to-skip), `src/styles/tokens.css`, `src/apps/cal/editor.ts` and `style.css`, `src/apps/deck/style.css`, `src/apps/deck/editor.ts` (onShowClick and the swipe), `src/apps/trip/editor.ts` and its style, `src/apps/write/style.css` or `src/styles/text.css` (table cells).

## Proof

- An e2e at SIZE_MAX (WebKit, 390 px) for home and each app's first template. For every text node in main, each word's Range gives a single client rect, which means no word is split across lines.
- `e2e/cal.spec.ts`: at SIZE_MAX, no two `.cal-wd` rects overlap.
- `e2e/deck-phone.spec.ts`: at SIZE_MAX, every `.ctl` button lies within 0..390. In light, the button's icon contrast against its backing is ≥ 3:1. A swipe left advances one slide.
- `test/browser/languages.test.ts`: the drawer laid out at 390 px runs once more at SIZE_MAX with nothing past the edge.
- `e2e/write-phone.spec.ts`: the first table cell has scrollWidth ≤ clientWidth.

## Not this

- No change to NAV_MAX, and no new size switch.
- No change to the Spreadsheet's grid.