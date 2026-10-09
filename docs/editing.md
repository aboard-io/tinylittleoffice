# Editing: the one standard every app keeps

Every app edits a document the same way a person already knows from the editors they use every day
(Google Docs and Word for words, Workflowy and Dynalist for outlines, Excel and Sheets for grids, Keynote
and Figma for canvases, Trello for cards). This page is that standard, written down so each app can be
checked against it. A deviation is a bug unless it is listed under *Deliberate differences*.

Three ways in: the **keyboard**, the **pointer** (mouse or trackpad) and the **finger** (iPhone Safari
first, then Android). Every action must be reachable by all three, except shortcuts that only make sense
with a keyboard (those have a button or a bar item too).

## 1. Everywhere

| Keys | Meaning | Also by |
|---|---|---|
| Mod+Z, Mod+Shift+Z (Mod+Y on Windows) | Undo, redo: one step per change; a burst of typing in one place is one step; the caret or selection comes back with it | the header's Undo/Redo |
| Mod+C, Mod+X, Mod+V | Copy, cut, paste *what is selected*: words when words are selected, else the thing in hand (a shape, a node, a cell range, a card). Our own clipboard carries TLO text plus HTML with the generator marker, so a thing pastes into any app that can hold it (a drawing's shapes into a sheet as a table, an outline's nodes into Write as a list) | the contextual bar's Copy/Cut/Paste on a phone |
| Mod+A | Select all: the words of the box first; pressed again with the box whole, everything in the document (the outline's nodes, the sheet, the canvas) | — |
| Delete, Backspace | Remove what is selected (a thing or a selection of words); with a caret, one character back/forward; at a boundary, join with the neighbour (words) or ask the host (a row) | the contextual bar's Delete |
| Escape | Step out: close the popover or dialog in hand first, else drop the selection, else leave edit-in-place; the focus goes back to where it came from | a tap outside |
| Enter | Confirm or edit: on a selected thing, edit its words in place; in a dialog, the primary button; in words, a new block | double tap / double click |
| Tab, Shift+Tab | In a list or an outline: indent/outdent the item (its family). In a grid: next/previous cell. Elsewhere: move focus (never trapped) | the bar's Indent/Bring out |
| Arrows | Move the caret; move between cells; nudge a selected shape by one grid step; move between rows (outline) | drag |
| Shift+Arrows | Extend the selection: characters, cells, rows (whole nodes in an outline) | Shift+tap, drag |
| Alt+Arrow Up/Down | Move the selected item(s) up or down past a neighbour (lists, outlines, slides, cards, rows) | drag by the handle, the bar's Move up/down |
| Mod+D | Duplicate the selected thing (shape, slide, card, row) | the contextual bar |
| Mod+B / I / U, Mod+K | Bold, italic, underline, link on selected words (or the marks for what is typed next) | the bar; the selection bubble |
| Mod+Enter | Finish and leave edit-in-place (a shape's words, a cell's formula) keeping the change | — |
| Space on a focused toggle | Tick/untick | tap |

Rules:
- **Mod** is ⌘ on Apple devices and Ctrl elsewhere; tooltips write it the way the device does (`tip()` in bar.ts).
- A shortcut means the same in every app. Nothing takes a shortcut from this table for another purpose.
- An app's single-letter tool keys (Draw's V R E D L A T K P F) work only when the canvas has the focus and no words are being edited; they never fire inside a text box, an input or a popover.
- Typing with a thing selected (not words) does nothing destructive: it does not replace the thing. (The exception is a grid cell, which behaves as a spreadsheet does: typing replaces the cell's content.)
- Every destructive key path has an undo, and the undo puts the selection back where it was.

## 2. Words (`<to-text>`, everywhere words are typed)

- Enter splits the block (a new paragraph/item); Shift+Enter is a line break inside a paragraph; in a one-line box (`shape=line`) Enter is "done" (the host decides: an outline makes the next item).
- Backspace at the start of a block joins it to the one before; on an item, it first makes the item a paragraph (unlists), then joins; at the very start of a one-line box the host decides.
- Delete at the end joins the next block in; in a one-line box the host decides.
- Markdown shortcuts on Space: `- `, `* `, `1. `, `# `, `## `, `> ` turn the block; straight quotes curl.
- Tab/Shift+Tab on an item indents/outdents it; elsewhere Tab moves focus.
- Mod+B/I/U/K; Mod+Shift+X strikethrough and Mod+Shift+H highlight are optional; the bar has them all.
- Selecting words shows the **selection bubble** (B, I, U, S, highlight | link, footnote | list) centred under the selection; it hides when the selection collapses or leaves. Hosts may turn it off (`no-bubble`).
- The caret in a link shows the link bubble (open, edit, remove). A footnote chip opens its note on tap or Enter.
- Cards (tables, pictures, documents, web things) are one character to the caret: skipped by arrows, removed by one Backspace/Delete, tapped to open.
- Paste: our HTML → blocks; other HTML → blocks (`htmlToBlocks`); Markdown/TLO text → blocks; a lone address → a card; words → words. A paste never brings styles the document cannot keep.
- IME: a composition is left to the browser and read back at `compositionend` as one op; no selection is written during a composition.
- On a phone: focusing never scrolls the page; the box, the bubble and the popovers stay inside the visual viewport (above the keyboard); inputs are ≥16px so Safari does not zoom.

## 3. Lists and outlines (Outline, the lists in Write and Deck, Board checklists, Todo)

- Enter at the end → next item (first child when children are showing); Enter at the start → a new empty item above (the node is pushed down); Enter in the middle → split.
- Backspace at the start of a non-empty item joins it to the item before; on an empty item, removes it (its children come out a level).
- Delete at the end joins the next item in.
- Shift+Up/Down selects whole nodes (with their children); a tap on the handle selects the node; Shift+tap extends. With nodes selected: Delete/Backspace remove, Tab/Shift+Tab shift, Alt+Up/Down move, Mod+C/X/V act on nodes, Mod+A takes everything, Escape or a plain arrow returns to a caret.
- Drag by the handle moves the node (right half of a row = inside it, left = after it); the drop target is drawn.
- Numbered/bulleted is a toggle on the list the item belongs to.
- Export writes markers: `- ` and `1.`, two spaces per depth.

## 4. Grids (Sheet, Calculator's table, any table block drawn as a grid)

- Arrows move between cells; Shift+Arrows extend the range; Tab/Shift+Tab next/previous cell; Enter commits and moves down (Shift+Enter up); Escape cancels the edit and restores the cell.
- Typing on a selected cell replaces it; F2 or a double tap edits in place (the caret at the end); the formula strip edits the same cell.
- Delete/Backspace clears the selected cells (not the row). Rows and columns are added and removed by their own menus and the `+` cells, never by a key alone.
- Mod+C/X/V on a range: TSV text plus our table HTML; pasted references move with the paste (relative), a pasted block wider than the sheet widens it.
- Fill handle drags a cell's content/series; a column header tap selects the column, a row number the row.
- Formulas: `=` starts one; a reference is typed or tapped.

## 5. Canvases (Draw, Motion, Diagram's kinds)

- A tap selects a shape (the selection drawn with a handle); a tap on nothing deselects; a drag moves; the handle resizes; Shift while drawing constrains (a line to an axis; a box to a square).
- Double tap or Enter on a selected shape edits its words **in place**, on the shape, with a contextual bar (size, colour) right under the words; Enter or a tap outside commits; Escape restores.
- With a shape selected, the **contextual bar** sits under it: inks, style, text sizes, edit words, duplicate, front/back, copy, cut, paste, delete. The same bar order everywhere a thing is selected.
- Arrows nudge by one grid step (Shift+Arrows by five, where it exists); Delete/Backspace removes; Mod+D duplicates; Mod+C/X/V on shapes.
- Tool keys pick tools (letters, no modifier) only when the canvas has the focus; Escape returns to Select.
- Wheel with Mod (or a pinch) zooms; the wheel alone scrolls.
- Everything drawn is undoable in one step per gesture (a drag is one step, not one per pixel).

## 6. Things in rows and columns (Board cards, Todo items, Calendar entries, Trip stops, Website sections, Deck slides, Diagram nodes)

- A tap selects (a selected thing has the contextual bar: edit, move up/down or to the next stage, duplicate, delete); a double tap or Enter edits its words in place.
- Alt+Up/Down moves the thing among its siblings; Alt+Left/Right moves it across stages/columns where there are any; drag does the same with a drawn target.
- Enter at the end of a thing's words makes the next thing; Backspace on an empty thing removes it; a new thing is made where the finger or the caret is (direct manipulation and Insert ▾), never from an Add button at the foot.
- Done/star/due toggles are 44px tap targets on the row itself.

## 7. Pointer and finger

- Every button is a real `<button>` with a name; icon buttons are 44px to the finger; a button that acts on an editor's selection never takes the focus (`keep: true`), so the phone keyboard stays up.
- Popovers and dialogs are native (`popover`, `<dialog>`), placed inside the visual viewport, closed by Escape and by a tap outside (menus) or the Close button (dialogs), returning the focus to their opener.
- A long press is not used for anything a tap cannot do (iOS owns it for the selection callout).
- Drag works with a mouse and a finger alike (pointer events, `touch-action: none` on the thing dragged only); the page never pans while a drag is on; a drag has a 44px handle where a tap would otherwise edit.
- Double tap edits; the page never zooms on it (`touch-action: manipulation` on editing surfaces).
- No custom right-click menus: the browser's stays.

## 8. Deliberate differences

- A grid cell replaces its content when typed on (spreadsheet convention); a selected shape, card or node does not.
- Draw's single-letter tool keys exist only on the canvas.
- Deck's Enter in the headline moves to the words of the slide (a headline is one line), not to a new slide; a new slide is Mod+Shift+Enter or Insert ▾.

## 9. The audit

For each app, walk every path above with the keyboard, then the mouse, then WebKit at 390px, and record: *works as written* / *missing* / *does something else* (what). Missing items with a bar or context-bar equivalent are gaps on the keyboard only; a shortcut that means something else is the worst kind of deviation and is fixed first. The audit's findings are fixed app by app and proven by a DOM test per path.
