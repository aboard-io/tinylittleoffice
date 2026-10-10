# R5-I: two small follow-ups: alignment keys in the Word Processor; the Presentation Builder's notes follow the slide

Read first: directive-r4-common.md, docs/editing.md (§1 keys, §8), src/apps/draw/editor.ts (the Align item and its Mod+Shift+L/E/R keys, merged 2026-10-10), src/apps/write/editor.ts (the alignment menu: left/centre/right/justify as `{.center}` etc.), src/apps/deck/editor.ts and style.css (the slide's width cap from the window fix; the Speaker notes heading, the notes and the thumbnail rail).

Build:
1. The Word Processor takes Mod+Shift+L, Mod+Shift+E, Mod+Shift+R and Mod+Shift+J for left, centre, right and justify on the block in hand (the Docs/Word convention the Drawing Tool now uses), shown as the keys on its alignment menu items; docs/editing.md §1 gets the row and §8 the note that the Drawing Tool cycles with one item and the same keys. preventDefault on all four (Mod+Shift+R is the browser's hard reload; it is taken only while the editor's words have the focus).
2. The Presentation Builder at a wide window: the Speaker notes heading and notes take the slide's width and sit under it, centred with it; the thumbnail rail stays at the window's right edge but its top aligns with the slide. Phone unchanged.

Tests: a Write DOM test for the four keys; a deck DOM test at 1920 that the notes' left edge equals the slide's. PW_PORT=4441.
