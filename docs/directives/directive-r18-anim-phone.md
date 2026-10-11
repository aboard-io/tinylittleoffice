# R18-anim-phone: the Animator on a small screen

**Paul, 2026-10-11:** *"Look carefully at the Animator on a small screen: the interface is all over the place with lots of white space. We should clean that up and make it more intuitive."* Looked at on 2026-10-11 (WebKit, iPhone 14, the Lift off template): under the header, a hint line cut with an ellipsis ('Tap a shape, then drag it to where it…'); the stage inside a grey box with wide padding; then a stack of controls each on its own line with big gaps: Draw and Move as two large buttons with '0.0 s of 2.9' beside them cut at the edge, 'Frames [24] 3.0 s', 'Frames a second [8]', 'Loop for ever ▾', a scrubber alone on a line, then the filmstrip of frames, then the bar with Play, Effect…, Undo, Redo. Two screens tall for a three-second animation, and the frames, which are the point, are at the bottom.

## The design

- **The stage first, the frames right under it.** The filmstrip sits directly beneath the stage, full width, scrolling sideways, each frame a thumbnail with its number; the current frame outlined; a tap selects, a long press (or the frame's menu) duplicates, deletes, moves. Below the filmstrip the scrubber, tight, with the time ('0.4 s of 3.0') at its right end, not beside the mode buttons.
- **Draw and Move are one control.** A segmented control (two halves, one pressed) in the context row the kit already has (`<to-context>`), above the bar, so it is near the thumb and off the page. The hint for the mode ('Tap a shape, then drag it to where it goes') is the context row's own words, in full, wrapping to two lines if it must, never cut.
- **Settings go behind one button.** Frames, frames a second, and the loop are rarely changed: one 'Settings' item in the bar (or the Effect menu's neighbour) opens a small sheet with the three fields on one line each, the duration computed under them. On a wide screen they may stay inline in one row, if they fit in one.
- **The stage's box** loses its outer grey padding on a phone: the stage is the column's width minus the gutter, its own border enough.
- **The bar**: Play, Effect…, Settings, Undo, Redo (pinned under a finger, r16-undo), the palette. 'Effect' is not cut: the bar scrolls or the label shortens in the languages where it must (label-widths).
- The same layout serves a desktop at narrow widths; at wide widths the settings may be inline. docs/editing.md's Animator section says the layout.

## Proof

- `e2e/anim-phone.spec.ts` (WebKit, 390 by 844): the stage, the filmstrip and the scrubber are all inside the first screen without scrolling; no text is cut (`scrollWidth <= clientWidth` on every label); Draw/Move toggles from the context row; the settings sheet opens, changes frames a second, closes.
- Screenshots of the result at phone width in the report (the chrome may be looked at by eye).

## Not this

- No change to what an animation is or how it is written.
