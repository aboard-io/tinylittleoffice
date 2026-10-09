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
| Mod+C, Mod+X, Mod+V | Copy, cut, paste *what is selected*: words when words are selected, else the thing in hand (a shape, a node, a cell range, a card). Our own clipboard carries TLO text plus HTML with the generator marker, so a thing pastes into any app that can hold it (a drawing's shapes into a sheet as a table, an outline's nodes into the Word Processor as a list) | the contextual bar's Copy/Cut/Paste on a phone |
| Mod+A | Select all: the words of the box first; pressed again with the box whole, everything in the document (the outline's nodes, the sheet, the canvas) | — |
| Delete, Backspace | Remove what is selected (a thing or a selection of words); with a caret, one character back/forward; at a boundary, join with the neighbour (words) or ask the host (a row) | the contextual bar's Delete |
| Escape | Step out, one step per press: close the popover or dialog in hand (and stop there), else collapse a range of selected words, else drop the selected thing or leave edit-in-place (the host hears `text-escape`), else return the tool to Select; the focus goes back to where it came from, never to the body | a tap outside |
| Enter | Confirm or edit: on a selected thing, edit its words in place; in a dialog, the primary button; in words, a new block | double tap / double click |
| Tab, Shift+Tab | In a list or an outline: indent/outdent the item (its family). In a grid: next/previous cell. Elsewhere: move focus (never trapped) | the bar's Indent/Bring out |
| Arrows | Move the caret; move between cells; nudge a selected shape by one grid step; move between rows (outline) | drag |
| Shift+Arrows | Extend the selection: characters, cells, rows (whole nodes in an outline) | Shift+tap, drag |
| Alt+Arrow Up/Down | Move the selected item(s) up or down past a neighbour (lists, outlines, slides, cards, rows) | drag by the handle, the bar's Move up/down |
| Mod+D | Duplicate the selected thing (shape, slide, card, row) | the contextual bar |
| Mod+B / I / U, Mod+K | Bold, italic, underline, link on selected words (or the marks for what is typed next) | the bar; the selection bubble |
| Mod+Enter | On a task item (the To-Do List, a Kanban Board checklist, a task list in the Word Processor): tick or untick it. In a one-line box: done (Enter's meaning). Never anything else | the 44px box on the row |
| Mod+Alt+Arrow Left/Right | Move the selected thing across stages or columns (the Kanban Board); fold/unfold is Mod+Alt+Up/Down (the Outliner). Alt+Left/Right alone are never taken: they move the caret by a word on a Mac | drag; the bar |
| Space on a focused toggle | Tick/untick | tap |
| Undo, Redo | The last two tools of every app's bar (`undoTools()` from DocElement), disabled when there is nothing to undo; the shell forwards the keys only when the focus is in the app's editor, never from a dialog, a popover, the header or a field of the kit's own | — |

Rules:
- **Mod** is ⌘ on Apple devices and Ctrl elsewhere; tooltips write it the way the device does (`tip()` in bar.ts).
- A shortcut means the same in every app. Nothing takes a shortcut from this table for another purpose.
- An app's single-letter tool keys (the Drawing Tool's V R E D L A T K P F) work only when the canvas has the focus and no words are being edited; they never fire inside a text box, an input or a popover.
- Typing with a thing selected (not words) does nothing destructive: it does not replace the thing. (The exception is a grid cell, which behaves as a spreadsheet does: typing replaces the cell's content.)
- Every destructive key path has an undo, and the undo puts the selection back where it was.

## 2. Words (`<to-text>`, everywhere words are typed)

- Enter splits the block (a new paragraph/item); Shift+Enter is a line break inside a paragraph, an item or a quote (in `doc` and `lines` alike; a heading splits); in a one-line box (`shape=line`) Enter is "done" (the host decides: an outline makes the next item) and Shift+Enter says so in the event's detail.
- Backspace at the start of a block joins it to the one before; on an item in a document (the Word Processor, the Presentation Builder, the Website Builder) it first makes the item a paragraph (unlists), then joins, as Docs does; an empty item with children is removed and its children come out a level; at the very start of a one-line box the host decides (an outliner joins: §3).
- Delete at the end joins the next block in; in a one-line box the host decides.
- Markdown shortcuts on Space: `- `, `* `, `1. `, `# `, `## `, `> ` turn the block (undo gives the typed marker back); straight quotes curl. Alt+Up/Down moves an item past its neighbour.
- Tab/Shift+Tab on an item indents/outdents it; elsewhere Tab moves focus.
- Mod+B/I/U/K; Mod+Shift+X strikethrough and Mod+Shift+H highlight are optional; the bar has them all.
- Selecting words shows the **selection bubble** (B, I, U, S, highlight | link, footnote | list) centred under the selection; it hides when the selection collapses or leaves. Hosts may turn it off (`no-bubble`).
- The caret in a link shows the link bubble (open, edit, remove). A footnote chip opens its note on tap or Enter.
- Cards (tables, pictures, documents, web things) are one character to the caret: skipped by arrows, removed by one Backspace/Delete, tapped to open.
- Paste: our HTML → blocks; other HTML → blocks (`htmlToBlocks`); Markdown/TLO text → blocks; a lone address → a card; words → words. A paste never brings styles the document cannot keep.
- IME: a composition is left to the browser and read back at `compositionend` as one op; no selection is written during a composition.
- On a phone: focusing never scrolls the page; the box, the bubble and the popovers stay inside the visual viewport (above the keyboard); inputs are ≥16px so Safari does not zoom.

## 3. Lists and outlines (the Outliner, the lists in the Word Processor and the Presentation Builder, Kanban Board checklists, the To-Do List)

- Enter at the end → next item (first child when children are showing); Enter at the start → a new empty item above (the node is pushed down); Enter in the middle → split.
- Backspace at the start of a non-empty item joins it to the item before; on an empty item, removes it (its children come out a level).
- Delete at the end joins the next item in.
- Shift+Up/Down selects whole nodes (with their children); a tap on the handle selects the node; Shift+tap extends. With nodes selected: Delete/Backspace remove, Tab/Shift+Tab shift, Alt+Up/Down move, Mod+C/X/V act on nodes, Mod+A takes everything, Escape or a plain arrow returns to a caret.
- Drag by the handle moves the node (right half of a row = inside it, left = after it); the drop target is drawn.
- Numbered/bulleted is a toggle on the list the item belongs to.
- Export writes markers: `- ` and `1.`, two spaces per depth.

## 4. Grids (the Spreadsheet, the Calculator's table, any table block drawn as a grid)

- Arrows move between cells; Shift+Arrows extend the range; Tab/Shift+Tab next/previous cell; Enter commits and moves down (Shift+Enter up); Escape cancels the edit and restores the cell.
- Typing on a selected cell replaces it; F2 or a double tap edits in place (the caret at the end); the formula strip edits the same cell.
- Delete/Backspace clears the selected cells (not the row). Rows and columns are added and removed by their own menus and the `+` cells, never by a key alone.
- Mod+C/X/V on a range: TSV text plus our table HTML; pasted references move with the paste (relative), a pasted block wider than the sheet widens it.
- Fill handle drags a cell's content/series; a column header tap selects the column, a row number the row.
- Formulas: `=` starts one; a reference is typed or tapped.

## 5. Canvases (the Drawing Tool, the Animator, the Diagram Maker's kinds)

- A tap selects a shape (the selection drawn with a handle); a tap on nothing deselects; a drag moves; the handle resizes; Shift while drawing constrains (a line to an axis; a box to a square).
- Double tap or Enter on a selected shape edits its words **in place**, on the shape, with a contextual bar (size, colour) right under the words; Enter or a tap outside commits; Escape restores.
- With a shape selected, the **contextual bar** sits under it: inks, style, text sizes, edit words, duplicate, front/back, copy, cut, paste, delete. The same bar order everywhere a thing is selected.
- Arrows nudge the selected shape by one grid step, Shift+Arrows by five, Mod+Arrows resize by one (never off the canvas); Delete/Backspace removes; Mod+D duplicates; Mod+C/X/V on shapes; Shift+tap adds to the selection; Mod+A selects every shape.
- Tool keys pick tools (letters, no modifier) only when the canvas itself has the focus (never from a bar button, a field or a popover); Escape returns to Select.
- A handle (resize, a pen corner, a key on a scrubber) has a 44px hit area under a finger, whatever it draws. The canvas keeps `touch-action: none` only while a tool or a drag is in hand, so a finger can pan a zoomed canvas.
- Wheel with Mod (or a pinch) zooms; the wheel alone scrolls.
- Everything drawn is undoable in one step per gesture (a drag is one step, not one per pixel).

## 6. Things in rows and columns (Kanban Board cards, To-Do List items, Calendar entries, Trip Planner stops, Website Builder sections, Presentation Builder slides, Diagram Maker nodes)

- A tap on a thing's handle (its grip, bullet or thumbnail) selects it; Shift+arrows extend; a second handle tap extends on a touch screen. A selected thing has the contextual bar in this order: Edit, Move up, Move down (Move to a stage where there are stages), Indent/Bring out where things nest, Duplicate | Copy, Cut, Paste | Delete. Delete/Backspace, Mod+D, Mod+C/X/V, Alt+Up/Down and Mod+A act on the selection. Enter, a double tap, or a tap on its words edits them in place. The kit's `rows.ts` is the one implementation of this (the Outliner's), used by every app with rows.
- Alt+Up/Down moves the thing among its siblings, keeping the caret in the same field; Mod+Alt+Left/Right moves it across stages/columns where there are any; drag by the handle does the same with a drawn target, by pointer events (never HTML5 drag-and-drop, which iOS starts only from a long press).
- A thing's words follow §3 where they are one line each (a to-do, a checklist, a stop, a task): Enter at the start pushes it down, at the end makes the next, in the middle splits; Backspace at the start joins, on an empty thing removes it; Delete at the end joins. A multi-line paste makes several things. A new thing is made where the finger or the caret is (direct manipulation and Insert ▾ after the thing in hand), never from an Add button at the foot.
- Undo brings back the selection or caret of the thing that changed: every app restores it in `undone()` from the entry's first op.
- Done/star/due toggles are 44px tap targets on the row itself.

## 7. Pointer and finger

- Every button is a real `<button>` with a name; icon buttons are 44px to the finger; a button that acts on an editor's selection never takes the focus (`keep: true`), so the phone keyboard stays up.
- Popovers and dialogs are native (`popover`, `<dialog>`), placed inside the visual viewport, closed by Escape and by a tap outside (menus) or the Close button (dialogs), returning the focus to their opener.
- A long press is not used for anything a tap cannot do (iOS owns it for the selection callout).
- Drag works with a mouse and a finger alike (pointer events, `touch-action: none` on the thing dragged only); the page never pans while a drag is on; a drag has a 44px handle where a tap would otherwise edit.
- Double tap edits; the page never zooms on it (`touch-action: manipulation` on editing surfaces).
- No custom right-click menus: the browser's stays.

## 8. Deliberate differences

- A grid cell replaces its content when typed on (spreadsheet convention); a selected shape, card or node does not. The Spreadsheet's Mod+D is fill down (every spreadsheet's), and Mod+Alt+= / Mod+Alt+- insert and delete the selected rows (Google Sheets' chords); Escape in a cell restores what was there and keeps the focus on the cell.
- Backspace at the start of an item: in a document (the Word Processor, the Presentation Builder, the Website Builder) it unlists first (§2); in an outliner and in rows (the Outliner, the To-Do List, checklists, stops, tasks) it joins (§3).
- The Drawing Tool's single-letter tool keys exist only on the canvas. A shape's label is plain text (no marks, no bubble); Shift+Enter in it is a line break kept as " | ".
- The Presentation Builder's Enter in the headline moves to the words of the slide (a headline is one line), not to a new slide; Delete at its end moves on too. A new slide is Mod+Shift+Enter (in every format) or Insert ▾; Present is Mod+Alt+Enter; PageUp/PageDown change slides only when the focus is on the rail, not in a box.
- The Diagram Maker: a single tap on a thing opens its words at once (there is no selected-but-idle state) and a tap on empty space starts a thing there, held as a draft until its first letter. Its words are plain (`no-bubble`).
- Calendar: a tap on a month entry opens its dialog (dates need fields); the schedule's tasks are rows (§6). The dialog's draft is written as one operation on Done and nothing on Escape.
- Calculator: Up/Down in the entry line recall tape lines (with no modifier only); Escape clears the entry, and an entry is not in the undo log; the tape grows at its end.
- The Animator: `,` and `.` step a frame; arrows nudge the selected shape (with nothing selected they step a frame); K keys the shape; Space plays. The Animator's Draw mode has no pixel mode.
- The Trip Planner: the map keeps its own wheel and pinch (Leaflet's), and a double tap on it zooms (never adds two stops).
- The Website Builder: words are edited in the panel, not in the frame; a picked section's bar is Edit, Move up, Move down, Duplicate, Delete.
- The Outliner: Mod+Alt+Up/Down fold and unfold; Mod+Shift+. and Mod+Shift+, zoom in and out; Select All inside a zoom takes the zoomed family. A document or a web thing under an item is a whole row, not a one-character card.
- Lists inside a document (the Word Processor, the Presentation Builder, the Website Builder): items are words in one box, so Shift+arrows extend the selection by characters as Docs does, and there are no handles; Alt+Up/Down, Tab, cut and paste move items. The §3 node selection belongs to the Outliner and to rows.
- The Drawing Tool: Alt+Up/Down move the chosen shapes one place in the stack (there is no "past a neighbour" on a canvas). The Diagram Maker drags the thing itself (a 6px threshold, `touch-action: none` on the thing alone) since a tap on it edits; it has no grip.
- The Calendar's month: entries are drawn small (about 16px) so a cell can hold several; the finger's way to every entry is the month's list below, whose rows are 44px.
- The Kanban Board: a card whose words are one web address shows that thing's preview under the line.

## 9. The audit

For each app, walk every path above with the keyboard, then the mouse, then WebKit at 390px, and record: *works as written* / *missing* / *does something else* (what). Missing items with a bar or context-bar equivalent are gaps on the keyboard only; a shortcut that means something else is the worst kind of deviation and is fixed first. The audit's findings are fixed app by app and proven by a DOM test per path.
