# Editing: the one standard every app keeps

Every app edits a document the same way a person already knows from the editors they use every day
(Google Docs and Word for words, Workflowy and Dynalist for outlines, Excel and Sheets for grids, Keynote
and Figma for canvases). This page is that standard, written down so each app can be
checked against it. A deviation is a bug unless it is listed under *Deliberate differences*.

Three ways in: the **keyboard**, the **pointer** (mouse or trackpad) and the **finger** (iPhone Safari
first, then Android). Every action must be reachable by all three, except shortcuts that only make sense
with a keyboard (those have a button or a bar item too).

## 1. Everywhere

| Keys | Meaning | Also by |
|---|---|---|
| Mod+Z, Mod+Shift+Z (Mod+Y on Windows) | Undo, redo: one step per change; a burst of typing in one place is one step; the caret or selection comes back with it | the bar's Undo/Redo (under a finger pinned at the bar's end) |
| Mod+C, Mod+X, Mod+V | Copy, cut, paste *what is selected*: words when words are selected, else the thing in hand (a shape, a node, a cell range, a card). Our own clipboard carries the words alone as text (no marks: what a text field, a chat or a search box gets) plus HTML with the generator marker and the exact TLO inside it, so a thing pastes into any app that can hold it (a drawing's shapes into a sheet as a table, an outline's nodes into the Word Processor as a list) | the contextual bar's Copy/Cut/Paste on a phone |
| Mod+A | Select all: the words of the box first; pressed again with the box whole, everything in the document (the outline's nodes, the sheet, the canvas). In the Word Processor the box is the document: one press takes it all, tables and pictures too | — |
| Delete, Backspace | Remove what is selected (a thing or a selection of words); with a caret, one character back/forward; at a boundary, join with the neighbor (words) or ask the host (a row) | the contextual bar's Delete |
| Escape | Step out, one step per press: close the popover or dialog in hand (and stop there), else collapse a range of selected words, else drop the selected thing or leave edit-in-place (the host hears `text-escape`), else return the tool to Select; the focus goes back to where it came from, never to the body | a tap outside |
| Enter | Confirm or edit: on a selected thing, edit its words in place; in a dialog, the primary button; in words, a new block | double tap / double click |
| Tab, Shift+Tab | In a list or an outline: indent/outdent the item (its family). In a grid: next/previous cell. Elsewhere: move focus (never trapped) | the bar's Indent/Bring out |
| Arrows | Move the caret; move between cells; nudge a selected shape by one grid step; move between rows (outline) | drag |
| Shift+Arrows | Extend the selection: characters, cells, rows (whole nodes in an outline) | Shift+tap, drag |
| Alt+Arrow Up/Down | Move the selected item(s) up or down past a neighbor (lists, outlines, slides, cards, rows) | drag by the handle, the bar's Move up/down |
| Mod+D | Duplicate the selected thing (shape, slide, card, row) | the contextual bar |
| Mod+B / I / U, Mod+K | Bold, italic, underline, link on selected words (or the marks for what is typed next) | the bar; the selection bubble |
| `:` + letters | In any rich text, at the start of a block or after a space (never "10:30"): a list of icons and emoji under the caret, best first. Up/Down move, Enter or Tab picks it in place of the `:word`, Escape closes it and leaves the words as typed, a space or moving the caret away closes it; a known `:name:` typed whole becomes the icon. Emoji alone where the words hold no icon (a drawn label, plain words) | a tap on a row; Insert ▾ Icon |
| Mod+Shift+L / E / R / J | Align the block in hand left, centered, right or justified (Google Docs' and Word's keys): the Word Processor, while its words have the focus (so Mod+Shift+R, the browser's hard reload, is taken there alone); the Drawing Tool's texts take L, E and R (§8) | the bar's Align menu, which writes the keys beside each; the Keyboard shortcuts dialog lists them under each app |
| Mod+Enter | On a task item (a task list in the Word Processor or the Outliner, a schedule's task): check or uncheck it. In a one-line box: done (Enter's meaning). Never anything else | the 44px box on the row |
| Mod+Alt+Arrow Left/Right | Move the selected thing across columns (a schedule's days); fold/unfold is Mod+Alt+Up/Down (the Outliner). Alt+Left/Right alone are never taken: they move the caret by a word on a Mac | drag; the bar |
| Space on a focused toggle | Check/uncheck | tap |
| Undo, Redo | The last two tools of every app's bar (`undoTools()` from DocElement), disabled when there is nothing to undo. Under a finger they are pinned (the registry's `pinned`): held at the bar's inline end, outside its scroll, so a phone always has Undo on screen while the bar is; on a bar under 360px Undo alone. The shell forwards the keys only when the focus is in the app's editor, never from a dialog, a popover, the header or a field of the kit's own | — |

Rules:
- **A document opens with the focus where a person starts**, without scrolling, whether it is new (from the home page, the menu, a template) or opened from a link: the Word Processor: the caret at the start of the first words block; the Spreadsheet: cell A1, its words selected as a keyboard move leaves them; the Presentation Builder: the first slide's headline; the Outliner: the first row's words; the Calculator: the entry line; the Drawing Tool: the canvas (the select tool, nothing chosen); the Animator: the stage; the Diagram Maker: the picture (nothing being edited); the Calendar: today's day (else the shown month's first; a Gantt chart's first task); the Trip Planner: the first stop's name, else the map; the Board, the library's own app (docs/library.md): the first card's title, else the first lane's name. Never the title box, never the body. Display mode and a locked document focus nothing (unlocked, the document takes the focus). On a phone the same: iOS raises no keyboard without a tap, and the caret is there when it does. The editor's `focusFirst()` (docs/kernel.md §3) does it.
- **Mod** is ⌘ on Apple devices and Ctrl elsewhere; tooltips write it the way the device does (`tip()` in bar.ts).
- A shortcut means the same in every app. Nothing takes a shortcut from this table for another purpose.
- An app's single-letter tool keys (the Drawing Tool's V R E D L A T K P F) work only when the canvas has the focus and no words are being edited; they never fire inside a text box, an input or a popover.
- Typing with a thing selected (not words) does nothing destructive: it does not replace the thing. (The exception is a grid cell, which behaves as a spreadsheet does: typing replaces the cell's content.)
- Every destructive key path has an undo, and the undo puts the selection back where it was.
- **The title is edited wide, where it is drawn:** a tap or focus on the header's title opens a second row of the header with the field across it at 20px (no dialog, no popover), a new document's automatic name chosen whole so typing replaces it; Enter keeps what was typed, Escape puts back what was there, and a tap elsewhere closes it.
- **The page is the visible window and the document scrolls in a column** (docs/kernel.md §7): the header, the menu button and the app's bar hold still while the words scroll, so the bar's tools are always a tap away however long the document. The menu button is at the top inline end on every screen (the right in a left-to-right language), where the words are not; the drawer slides in from that side. On a wide screen the bar is under the header; under a finger it is at the column's bottom, above the keyboard, as one scrolling row.
- **The header is the title** on every screen: the app's icon (the way home), the title, a password's lock, the meter, then Share and the menu button, Share one touch width before it on every document (Paul, 2026-10-13: "Put the share menu to the left of the hamburger on every document — sharing is very important"; it had lived in the drawer alone since 2026-10-10, "Now the title has room to breathe"); Download lives in the drawer, where Share… is listed too. The drawer is in Paul's order (2026-10-11): its head (the language, its first option "Default:" and the device's language named in itself; away from the home page the mark, the way home, beside Close, Paul, 2026-10-12; Close); What is this? (the manual, a deck kept in the tree as `src/kit/ui/manual.tlo` and compiled into the row's link, so each build carries it as it is; Paul, 2026-10-14); Save in browser (off by default; the line under it says what turning it over does); the size of everything (the eye and the stepper, no words); one search for an app, a document, a template or a command (Mod+K opens the drawer with it focused), each kind under its heading, and no rows of apps with nothing typed (Paul, 2026-10-12: "If people want apps they can search or go to home page"); This document: a small heading over full-width rows, New {noun} (a blank document of the app), Share… (Mod+Shift+S), Download (Mod+Shift+D, which opens the drawer with the table of formats on its first item) and Find in this document (Mod+F, a phone's way to it), the keys written at the rows' right; Theme (its first option Match device), Add to home screen and About. **Keys are written only where there is a keyboard**: under a finger the drawer, the menus and the commands its search finds write none until a key with Ctrl, ⌘ or Alt has been typed, and a key is never part of a control's name anywhere: it is the control's `aria-keyshortcuts`, its written form hidden from a screen reader (the review of 2026-10-11).
- **Home is the app's icon** at the header's inline start, in every app (Paul, 2026-10-10: "I need a way to get back to the home state. Maybe the top left icon could do that"). **A document that lives nowhere but its link is asked about once before it is left**: with Save in browser off, changed since it was opened or begun, its link not copied since, the icon home or the drawer's mark, a drawer row that opens another document, app or template, a file opened and a hand-off in the Download table each open one dialog, "This document isn’t saved", with Copy link and leave, Save in browser and leave (Save in browser turned on, the document saved, then home) and Leave without saving; Escape and the close stay. With Save in browser on the library has it and nothing is asked; an unchanged document is in the link that brought it. The browser's Back is never asked about (Back brings the document again). Closing the tab in that same state gets the browser's own leave warning, and only then. On a touch screen the drawer's dialog holds the focus without a ring (it is not a control; the search would raise the keyboard), its edge one hairline against the backdrop.
- **A file opens by a drop anywhere on the page** (kit/file/open.ts; the drawer has no Open a file…: Paul, 2026-10-12): a `.tlo` as its own app, a `.md` or `.txt` in the app at hand. **A zip goes in too** (Paul, 2026-10-11: "Let me download all my docs as a single zip file and upload them too"): its `.tlo` and `.md` files are documents, each in the app its head or its folder names, and the rest (a README, a picture) is left alone. With Save in browser on they are kept at once ("4 documents kept"), one already kept with the same text left as it is; with it off one dialog lists them by app and name, with Save them to this device (Save in browser turned on, and said so), Open the first and Cancel, and a tap on a name opens that one. A zip of one document opens it.
- **On a phone the bar comes with the focus and goes with it**: it is shown while something in the document has the focus, which a tap or a key into the document gives it and arriving from a link never does (words with the caret, a cell of the Spreadsheet, a canvas touched or focused, a chosen row) and slides away while nothing does (reading), with the chrome's glide; the Calculator's always shows, its keys being the document, and the Calendar's, its bar being the way through the months (Paul, 2026-10-12). Whatever of the bar needs nothing in hand (Look, Present, Play, the zoom, the views, the registry's `document` commands) is also a row of the drawer's This document, under the app's name, so it is a tap away while reading. On a fine pointer the bar is always shown.
- **On a phone the context bar is a row of the bottom bar**, not a bar floating by the thing in hand: iOS draws its selection callout over whatever floats near the words, and no page can stop it (Paul, 2026-10-10: "Our menu keeps getting obscured under the native copy paste menu"). While words are selected the row takes the bottom bar's place (the bar's own row slides back when the selection collapses) and begins with Cut, Copy and Paste, ours: Copy and Cut put the words and our HTML (with the TLO inside it) on the clipboard, Paste reads it where the browser allows (and, where it refuses, a line under the row says to use the keyboard's paste). On a fine pointer the context bar floats under the thing in hand, as ever.
- **On a phone, while a box has the focus** (words, a field in an app), the header steps aside and the menu button stays, Share beside it (Paul, 2026-10-10: "when editing, the top nav vanishes except for the hamburger. The secondary nav is now aligned bottom."; Share joined it on 2026-10-13), slid in a fifth of a second into the column's very top inline corner (0.25em in, within the safe area), on a card, translucent so the words under it show through, opaque under a hover, a key's focus and while the drawer is open, a 44px target as ever ("Make the hamburger translucent when I'm editing. Maybe even move it further top right"); it slides back into the header's row when the focus leaves the box (a tap outside, Escape, Done). The bar glides with the keyboard: the column's height follows the visible window through a fifth of a second, the bar fading out while it moves and back when it settles, and the caret is kept in sight once it has ("When the keyboard appears and disappears it jumps and it's overwhelming"). Under reduced motion nothing slides or glides: the height changes at once and only the bar's fade remains. The price of the column: Safari's toolbar no longer collapses as the words scroll, since the page never scrolls.
- **A read-only editor edits nothing and opens what it shows** (a page that is not the site mounts one `readOnly`; kit/core/element.ts, docs/library.md step 8; the site draws none): no bar, nothing typed, pasted, cut, dropped or dragged, no undo, no context bar, menu or dialog that edits; words a reader selects bring up the selection bubble only where the page takes comments (`data-comments`), with Comment alone, and Escape lets it go. Its items keep their places in the focus order, and one activated by Enter, a click or a tap fires `docpick` for the page to open what the item stands for. A calendar keeps back, on and Today (and a page's own commands join that bar); an outline's fold arrow folds and opens its item in the view alone, writing nothing, and its pick says it was the arrow (`part: 'fold'`).

## 2. Words (`<to-text>`, everywhere words are typed)

- Enter splits the block (a new paragraph/item); Shift+Enter is a line break inside a paragraph, an item or a quote (in `doc` and `lines` alike; a heading splits); in a one-line box (`shape=line`) Enter is "done" (the host decides: an outline makes the next item) and Shift+Enter says so in the event's detail.
- Enter at the very start of a block's words opens an empty paragraph above it and leaves the block as it was (a heading pushed down stays a heading).
- Backspace at the start of a block joins it to the one before (the block before keeps its kind; when either of the two is empty, the empty one simply goes, so words pulled up into an empty line keep their heading, as in Docs); on an item in a document (the Word Processor, the Presentation Builder) it first makes the item a paragraph (unlists), then joins, as Docs does; an empty item with children is removed and its children come out a level; at the very start of a one-line box the host decides (an outliner joins: §3).
- Delete at the end joins the next block in, by the same rule; in a one-line box the host decides.
- **A heading is one line** (2026-10-17). A block of several lines joined to a heading, by Backspace at its start or Delete at the heading's end, gives the heading its first line, the caret where the two met, and keeps the lines after it as the paragraph, item or quote it was, its alignment and all. Lines pasted or typed into a heading leave the heading the words up to the first break, and the lines after it, with the heading's words after the caret, are a paragraph after it, the caret at the pasted words' end, as Shift+Enter in a heading splits it. Why: the rule is the format's, not borrowed (what Docs and Word do on this join was not checked in either); a heading in the text is one line (`## …`, docs/kernel.md §2), and a heading the editor held with a break would be written as a heading and a paragraph, so the link would say other than what was on screen. Of the two ways to keep it one line, bringing every line up with its breaks made spaces would lose breaks a person typed and invent spaces, and a block of an address's lines would become one long heading; bringing up the line the caret meets keeps every break and word where it was (nothing typed is lost) and is what making that block a heading does (setKind: its first line the heading, the rest a paragraph). An item and a quote hold lines, so joins and pastes into them keep every line in them.
- Copy and paste keep the words exactly: the spaces at either end of words copied from within a block come back with them.
- Markdown shortcuts on Space: `- `, `* `, `1. `, `# `, `## `, `> ` turn the block, and `---` alone on a line in a document is a horizontal rule (undo gives the typed marker back); straight quotes curl. Alt+Up/Down moves an item past its neighbor.
- Tab/Shift+Tab on an item indents/outdents it; elsewhere Tab moves focus.
- Mod+B/I/U/K; Mod+Shift+X strikethrough, Mod+Shift+H highlight and Mod+E code (Plex Mono, Google Docs' and Notion's inline code key; Markdown's backticks) are optional; the bar has them all.
- **A space at a mark's edge is plain** (2026-10-17), as the text writes it (`**a** b`; docs/kernel.md §2, point 5): typed at the end of a bold, italic, underlined, struck, highlighted or code word it is plain, the caret after it and the mark still in force (the bar shows it pressed), so the next word typed carries the mark and the space between takes it back (`**a b**`); turned off first, the next word is plain. Backspace over the space returns into the mark. A selection's marks are its words': "word " made bold, its space and all, shows Bold pressed, and Bold again takes it off.
- **A space ends a link**: typing letters after a link stays in it (Mod+K or the bubble made it; the word typed next is its too); the space typed at its end is plain, so what comes next is normal text, as in Gmail, Notes and Slack (Paul, 2026-10-15: "there's no way out"; it had taken two spaces, 2026-10-11, which a phone never sends: iOS makes the second a period, and its keyboard has no Escape and no arrow). A space inside a link's words is the link's.
- Selecting words shows the **selection bubble** (B, I, U, S, highlight, code | link, footnote | list) centered under the selection; it hides when the selection collapses or leaves. Hosts may turn it off (`no-bubble`).
- The caret in a link shows the link bubble (open, edit, remove).
- **Who did what, by the keys**: where a page shows who did what among the words (docs/library.md, Tracked changes and comments for a host), each edit's lozenge is a tap, and Alt+Enter (a thing's details, as a Calendar task's dates are) opens the edit the caret is in, or else the nearest in its paragraph, before the caret first: the page hears "text-ghost" and opens its panel. In a paragraph with no edit, and on the site, which shows none, the key goes on.
- **Footnotes are typed at the foot**, where they are drawn (the Word Processor's endnotes at the end of the page, a slide's foot, the notes under an outline), never in a box beside the mark: each note is a one-line `<to-text>` (its marks and links; no blocks, no note in a note). A tap or Enter on a mark brings the foot into view with the caret at the end of that note; the Footnote command puts the mark at the caret and the caret in its new, empty note; Enter or Escape in a note returns to the words after its mark (the Word Processor's ↩ too); a note emptied and left takes its mark with it, and Backspace at the start of an empty note removes it and returns to where its mark was. The note's words are the document's like any others: Mod+Z undoes them, the caret back in the note.
- Cards (tables, documents, page breaks, horizontal rules) are one character to the caret: skipped by arrows, removed by one Backspace/Delete, tapped to open.
- Paste: our HTML → blocks; other HTML → blocks (`htmlToBlocks`); Markdown/TLO text → blocks; a lone address → a card; words → words. A paste never brings styles the document cannot keep, nor a heading of lines: into a heading, lines paste as above, and a page's heading of two lines (`<h2>a<br>b</h2>`) comes as a heading and a paragraph.
- A paste keeps lists (with their depth and numbers), headings, the six marks (code from a `<code>` in the words) and links from wherever they were copied (Google Docs, Word, Apple Notes, Notion, Slack, a web page, bullets typed as `•`, `-` or `1.`, even on one line), and is fitted to what the box can hold (a label takes words, a slide's words items and paragraphs, a table elsewhere its rows). Nothing else arrives: no HTML remnant, and no marker, since words that look like syntax are kept as the words they are.
- IME: a composition is left to the browser and read back at `compositionend` as one op; no selection is written during a composition.
- On a phone: focusing never scrolls the page (nothing does: the column scrolls, kit/ui/scroll.ts); the caret is kept inside the column, above the bar and the keyboard; the box, the bubble and the popovers stay inside the column's box, which is the visual viewport's; inputs are ≥16px so Safari does not zoom.

## 3. Lists and outlines (the Outliner, the lists in the Word Processor and the Presentation Builder)

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
- The row numbers and the column letters are the grid's controls, not cells: drawn quietly (no shading, no lines), the side as narrow as its widest number; a tap opens their menus. A column's menu removes it whatever it holds (references into it become #REF; one undo).
- What a column holds changes its cells, never what a person types: a checkbox is a 24px box the whole cell taps (Space with the keys); an option cell offers the words its column holds (the browser's list, opened by its caret) and takes new ones; a rich cell is a `<to-text shape=line>` with the selection bubble, the grid's keys caught on their way down to it (Arrows at its edges, Enter, Tab, Escape after its own steps), the formula strip showing its words plain and read-only.
- **On a phone with the keyboard up** (Paul, 2026-10-11: "no room to navigate"), the Spreadsheet's cell is a box like any other: the header steps aside while it is edited, the formula strip is the column's top with the menu button at its end, the column heads are one line (the letter and the name, the names' row away until the cell is let go), the table's box takes what is left above the bar, and the cell in hand is kept in sight as that box changes its height. The desktop's grid is as it was.
- **A sheet's columns are words, then numbers, then words** until somebody says otherwise (Paul, 2026-10-12: "column a is set to text, column b is number"): a column nobody has typed holds words in the first, numbers in the second and words after that; a column put in by hand, in a sheet or in a page's table, holds words.
- **A number column asks for numbers** (Paul: "default to numbers, let me switch to text"): a cell of a number, money or percent column opens the numbers keyboard (`inputmode="decimal"`), a date column's the digits (`numeric`, its placeholder the pattern a date is written in, YYYY-MM-DD), every other column's the letters; a formula asks for the letters from its `=` on. The bar's first button under a finger, **ABC** (Letters keyboard, drawn Aa, `aria-pressed`), asks for the letters in that column for the visit, its other cells following, and asks for the numbers again pressed a second time; the device's own keyboard switch works too.

## 5. Canvases (the Drawing Tool, the Animator, the Diagram Maker's kinds)

- A tap selects a shape (the selection drawn with a handle); a tap on nothing deselects; a drag moves; the handle resizes; Shift while drawing constrains (a line to an axis; a box to a square). With Select in hand, a drag that starts on nothing draws a dashed box (the marquee) and chooses every shape whose box lies inside it (Shift adds to the choice); the contextual bar then acts on them all.
- Double tap or Enter on a selected shape edits its words **in place**, on the shape, with a contextual bar (size, color) right under the words; Enter or a tap outside commits; Escape restores.
- **Words are edited where they are drawn. A box over the picture for words alone is never used; a form is used only where a thing has fields that are not words (a date, an address, an icon).** On a canvas the words are a `<to-text shape=line>` laid exactly over the shape's own (the same font at the size the picture shows it, set at 16px or more and scaled so iOS does not zoom; Draw's `wordsOver` places it for the Drawing Tool and the Diagram Maker alike), the shape drawn without its words meanwhile, focused in the gesture that opened it.
- With a shape selected, the **contextual bar** sits under it: inks, style, text sizes (and, for a text, its alignment), edit words, duplicate, front/back, copy, cut, paste, delete. The same bar order everywhere a thing is selected.
- Arrows nudge the selected shape by one grid step, Shift+Arrows by five, Mod+Arrows resize by one (never off the canvas); Delete/Backspace removes; Mod+D duplicates; Mod+C/X/V on shapes; Shift+tap adds to the selection; Mod+A selects every shape.
- Tool keys pick tools (letters, no modifier) only when the canvas itself has the focus (never from a bar button, a field or a popover); Escape returns to Select.
- A handle (resize, rotate, a pen corner, a key on a scrubber) has a 44px hit area under a finger, whatever it draws. The canvas keeps `touch-action: none` while a tool or a drag is in hand, and while the drawing fits its frame (a finger's drag on nothing is the marquee); zoomed in, a finger on nothing pans.
- Wheel with Mod (or a pinch) zooms; the wheel alone scrolls.
- Everything drawn is undoable in one step per gesture (a drag is one step, not one per pixel).

## 6. Things in rows and columns (Calendar entries, Trip Planner stops, Board cards, Presentation Builder slides, Diagram Maker nodes)

- A tap on a thing's handle (its grip, bullet or thumbnail) selects it; Shift+arrows extend; on a touch screen a handle pressed and held for half a second extends to its row (a second tap chooses afresh, as a mouse's does). A selected thing has the contextual bar in this order: Edit, Move up, Move down, Indent/Bring out where things nest, Duplicate | Copy, Cut, Paste | Delete. Delete/Backspace, Mod+D, Mod+C/X/V, Alt+Up/Down and Mod+A act on the selection. Enter, a double tap, or a tap on its words edits them in place. The kit's `rows.ts` is the one implementation of this (the Outliner's), used by every app with rows.
- Alt+Up/Down moves the thing among its siblings, keeping the caret in the same field; Mod+Alt+Left/Right moves it across columns where there are any; drag by the handle does the same with a drawn target, by pointer events (never HTML5 drag-and-drop, which iOS starts only from a long press).
- A thing's words follow §3 where they are one line each (an item, a stop, a task): Enter at the start pushes it down, at the end makes the next, in the middle splits; Backspace at the start joins, on an empty thing removes it; Delete at the end joins. A multi-line paste makes several things. A new thing is made where the finger or the caret is (direct manipulation and Insert ▾ after the thing in hand), never from an Add button at the foot.
- Undo brings back the selection or caret of the thing that changed: every app restores it in `undone()` from the entry's first op.
- A done toggle is a 44px tap target on the row itself.
- **Words are edited where they are drawn. A box over the picture for words alone is never used; a form is used only where a thing has fields that are not words (a date, an address, an icon).** A name shown on a thing (a line's name in the Outliner, a column's head in a table) becomes a field where it is shown, focused in the gesture that asked for it; Enter or a tap elsewhere keeps it, Escape leaves it be.

## 7. Pointer and finger

- Every button is a real `<button>` with a name; icon buttons are 44px to the finger; a button that acts on an editor's selection never takes the focus (`keep: true`), so the phone keyboard stays up.
- **The bar is a toolbar**: Left and Right walk its buttons and menus (Home and End to its ends), wrapping at the ends; Tab goes on out of it. So every command in a bar is reachable by the keys, whether or not it has keys of its own.
- **Mod+K opens the menu's search** (kit/ui/drawer.ts), which finds an app, a document, a template or a command in force, each kind under its heading and each command with its keys beside it; Enter runs the first. In words Mod+K is Link (Docs' key, and every editor's); the menu button opens the same search there, with the words' commands in it.
- Every menu and list of choices (`<to-menu>`, Insert ▾, the templates) is a roving-focus menu (`menuKey` in menu.ts): Up and Down move, wrapping at the ends; Home and End; letters find an item; Enter or Space choose; Escape and Tab close to the opener; Shift, Alt, Ctrl and ⌘ change none of these. Opened by a key the first item has the focus; by a pointer the menu itself, and a mouse over an item takes the focus to it. A menu of rows (the Download menu: a row per format, its actions View, Share, Download and Copy link as icon buttons, each a menu item named for what it does to which file) is still one menu: Up and Down go between the rows, landing on a row's first action; Left and Right go between a row's actions, round its ends; Enter or Space does the action in hand; a screen reader hears the row's format, then the action.
- Popovers and dialogs are native (`popover`, `<dialog>`), placed inside the column's box, the visual viewport's (kit/ui/scroll.ts `room()`: a menu under its button, its right edge at the button's where the screen ends first; over it only where there is more room above; scrolling inside where neither side holds it, at every size), closed by Escape and by a tap outside (menus) or the Close button (dialogs), returning the focus to their opener. **One modal at a time** (Paul, 2026-10-10: "the outer one hands over"): a dialog is never opened over another; a drawer row that opens a dialog closes the drawer first and the focus comes back to the hamburger when that dialog closes, and Share closes for Password… and comes back as it was, the focus on Password… (kit/ui/dialog.ts `handBack`, `handOver`).
- **A password is made, never typed to set** (Paul, 2026-10-11: "Only you can generate passwords for users. That keeps them secure"). Password… (in Share) shows one the app made, large and read-only in Plex Mono, Copy beside it (its toast said aloud), Make another under it, and the line that says to send it another way than the link and that it cannot be shown again; Set password seals with it, and changing it is the same dialog with a new one made, Remove password beside. The one typed field left is the unlock dialog's, where the person a sealed link was sent to types what they were sent (docs/crypto/password.md).
- A long press is not used for anything a tap cannot do (iOS owns it for the selection callout).
- Drag works with a mouse and a finger alike (pointer events, `touch-action: none` on the thing dragged only); the page never pans while a drag is on; a drag has a 44px handle where a tap would otherwise edit (but the Board's cards, carried from anywhere on them after a finger's short press, which keeps the page's scroll: §8).
- Double tap edits; the page never zooms on it (`touch-action: manipulation` on editing surfaces).
- No custom right-click menus: the browser's stays.

## 7½. Pinch and size

Paul, 2026-10-10: a low-vision reader wants big, scrollable nav, a useful menu, and the document as large and legible as it can be, its words reflowed within the screen; a spatial picture grows without anything in it moving relative to anything else.

1. **A pinch on a touch screen never zooms the browser.** The root takes `touch-action: pan-x pan-y`, so the layout viewport stays the screen; nothing is ever wider than it unless it scrolls sideways on purpose (the bar, a table, a sheet). One finger pans as ever.
2. **In a non-spatial app a pinch is the size of everything** (the drawer's stepper, kit/ui/zoom.ts): the nav, the words, the cards and the dialogs grow or shrink together, live under the fingers, and the words reflow within the screen; the element under the fingers stays under them. A pill at the top says the size ("140%") while the fingers are down and half a second after. Lifted, the size is kept to the nearest 5%; the stepper goes on in tens from there. Non-spatial: the home page, the Word Processor, the Outliner's list, the Presentation Builder, the Spreadsheet, the Calendar, the Calculator, the Trip Planner's list, every dialog and the drawer.
3. **In a spatial app a pinch zooms the picture, about the fingers, and two fingers pan it**; nothing in it reflows or moves relative to anything else, and the nav keeps the size of everything. A spatial canvas's frame is marked `data-spatial`, and the size of everything leaves a pinch begun inside one alone; a pinch begun on the bar, a field or a dialog beside it is the size of everything. As built: the Drawing Tool's canvas (`.draw-wrap`: 50% to 400%), the Diagram Maker's picture (`.dg-wrap`: 25% to 300%), the Animator's stage in Move mode (`.anim-wrap`: 100% to 400%; in Draw mode it is the Drawing Tool's), each by kit/ui/pinch.ts's `pinchZoom`; the Trip Planner's map (`.trip-map`, Leaflet's own pinch); and the Outliner drawn as a mind map or a family tree, which is the Diagram Maker's picture (the Outliner's View menu draws it there), while the Outliner's list stays non-spatial. In the three pictures the zoom follows the fingers' spread continuously, the point of the picture under them when the second finger came down stays under their midpoint (the frame scrolls by what the zoom moved it, and the column around it takes what the frame cannot), so two fingers moving together pan; lifted, the zoom is rounded to the canvas's quarter step. The pinch begins with the second finger, and whatever the first began (a drag, a box, a move) is let go; a tap, a one-finger drag and the tools are as before. Under two fingers in a frame the browser neither pans nor zooms, so it moves once. Each frame holds still while its picture zooms (the Drawing Tool's and the Diagram Maker's are the column's height below the bar; the Animator's the height its stage has when it fits, so the sliders under it stay put), and a picture's hit-testing divides by its own scale alone. Mod+wheel (and the Drawing Tool's and the Diagram Maker's Zoom in and out in the bar) is the same zoom on a desktop. Every pinch is read by one module, kit/ui/pinch.ts (`onPinch`).
4. **100% is the normal size, and it is large**: Paul, 2026-10-10, on his iPhone: "Start at what we now call 130%." The stylesheet's lengths draw at `BASE` (1.3, kit/ui/zoom.ts) times the size (a rem is 16px × that), so 100%, the default and what a new visitor gets, is what the stepper called 130% before; the stepper and the pill say the size alone, so 100% reads as normal. A 390px phone is 300 of the stylesheet's pixels wide; a 1440px desktop, 1108. **The size of everything runs from 70% to 200%** in steps of 10%; a pinch sets it continuously and the stepper rounds. **The nav has a natural limit**: the bar, the menu button, the header, the drawer, the dialogs, the context bar, the menus, the link box, the completion list, the find bar and the pills grow with the size up to 120% and no further, while the words, the cards and the pictures go on to 200%. They are one list in kit.css, which an app's own nav (the Animator's sliders and transport) joins. At every size on a 390px screen the bar is one scrolling row, the menu button opens the drawer, the drawer fits, dialogs fit and nothing scrolls sideways but what is meant to. **The mechanism is two scales and nothing zoomed**: the size is `--to-doc` and `--to-nav` on the root (kit/ui/zoom.ts), the root's font size is 16px × `--to-doc` and each nav element's 16px × `--to-nav`, and every length is rem in the document, em inside a nav element and px only for hairlines and media queries (test/stylesheets.test.ts), so a length measured on the screen is the length CSS sets and nothing placed from it is divided by anything. Paper is not the screen: print, the PDF, the PNG, the thumbnails, the cards and the Display Link's pages are drawn from the document alone in their own pixels, and a page printed from the screen has both scales put back to 1.
5. **Desktop is the browser's**: Ctrl or ⌘ with the wheel, a trackpad pinch, and Mod with plus or minus are browser zoom, which reflows; the spatial canvases keep taking Mod+wheel for their own zoom. The viewport meta is not touched (no maximum-scale, no user-scalable), and the system's accessibility zoom is the system's.

## 8. Deliberate differences

- A grid cell replaces its content when typed on (spreadsheet convention); a selected shape, card or node does not. The Spreadsheet's Mod+D is fill down (every spreadsheet's), and Mod+Alt+= / Mod+Alt+- insert and delete the selected rows (Google Sheets' chords); Escape in a cell restores what was there and keeps the focus on the cell.
- Backspace at the start of an item: in a document (the Word Processor, the Presentation Builder) it unlists first (§2); in an outliner and in rows (the Outliner, stops, tasks) it joins (§3).
- The Drawing Tool's single-letter tool keys exist only on the canvas. A shape's label is rich: a one-line `<to-text>` whose bubble holds the six marks alone (`marks-only`: no link, no footnote, no list; Mod+K does nothing), written as inline Markdown in the Label column by the code, never typed; Shift+Enter in it is a line break kept as " | ". A shape (not a line, an arrow or a join) rotates: by the round handle above it (Shift holds 15° steps), by the bar's Rotate left and Rotate right, and by `[` and `]` on the canvas (15° each), all about its center (the Rot column). A text (the Text tool's shape, not a box's words, which are always centered) is left, centered or right: one Align item beside the text sizes shows the alignment it has and goes on to the next (left, center, right) on a tap, and Mod+Shift+L, Mod+Shift+E and Mod+Shift+R set each, on the canvas and while its words are typed (the Word Processor's keys, §1, which are Google Docs' and Word's; one item that cycles where the Word Processor has a menu of four, and no justify, which a line of a drawing has no use for; they are not taken elsewhere on the canvas, whose tool letters have no modifier); each is one undo step, written as a trailing "=" or ">" in its Style. The Animator's Draw mode is the same editor.
- The Presentation Builder's Enter in the headline moves to the words of the slide (a headline is one line), not to a new slide; Delete at its end moves on too. A new slide is Mod+Shift+Enter (in every format) or Insert ▾; Present is Mod+Alt+Enter; PageUp/PageDown change slides only when the focus is on the rail, not in a box. On a phone, while a box on the stage is being typed in, the rail is pinned to the column's foot right above the bar, placed as the bar is, so the whole slide stands above it with no room wasted and every other slide is a tap away: a finger's tap on a thumbnail goes to that slide with the caret in the same box, the keyboard kept up (a tap with no box focused chooses the slide, as a tap on any handle does). The editing canvas keeps the slide's shape at every width and its type is the layout's scaled to it: on a phone the words are small, never cut and never a taller page.
- The Diagram Maker: a single tap on a thing opens its words at once, typed on the thing (§5: no box beside it; there is no selected-but-idle state), and a tap on empty space makes a thing there with its words offered ("New idea", "Name", "Table 3") and chosen, so the first letter replaces them; Escape takes the new thing away again. Its words are plain (`no-bubble`); Shift+Enter is a second line where the thing draws one (an org chart's role, a family's years, a timeline's "what happened" under its date), written by the code as " | " (a timeline's as ": "). No separator of the format is ever typed: a thing's words may hold a comma, a colon, a bar, an ampersand or an arrow and they stay its words (the code escapes them, docs/tlo.md). Two keys act, and only at the end of the words: a comma ending a guest at a table or a thing of a set makes the next one, as Enter does; a "+" ending a family's name (its first line) starts the partner's, written " + ". Anywhere else in the words they are a comma and a plus; ":" and "|" are always plain characters, since a key and a second line come from the thing's own place and Shift+Enter. A lane's name, a table's, a set's and a connection's words are typed where they are drawn the same way. A new thing (a tap, Insert ▾, Enter, the Add items) has its words focused in the gesture itself, so a phone's keyboard comes up. Where things join (a network; across a tree: a mind map's cross-links, drawn as a dashed curve bowing away from the middle idea, and an org chart's or a family's dotted lines) the bar's Join arms joining from the thing in hand, or from the next thing tapped with none, and the next tap makes the connection; Escape or a second press disarms. A tap on a connection opens its words, with its kind of line (plain or an arrow) and Delete in its row. In a tree (a mind map, an org chart, a family) Tab and Shift+Tab indent a thing under the one before it and bring it out to its grandparent, its children with it, as in the Outliner, on the focused thing or in its open words (they stay open on it), and its row has Indent and Bring out; where it can go no further Tab moves the focus on.
- Calendar: a tap on a month entry opens its dialog (dates need fields); the schedule's tasks are rows (§6). The dialog's draft is written as one operation on Done and nothing on Escape.
- The Board (the library's own app, which the site does not list: docs/library.md): a card's title is its words, typed where it is drawn (§6); its other cells (a date, an amount, a choice, a box) are fields, so a card opened (Alt+Enter in its title or on the chosen card, Open in the bar under it, a double click or double tap outside its title; a single tap chooses it) is a dialog of its row, a field a cell, each asking for the keyboard the Spreadsheet's cell would and an option column offering the words it holds, its status a list of the lanes; Done writes the fields typed, and those alone, as one step, and Escape writes nothing, as the Calendar's. Across the lanes, chosen cards take Mod+Left/Right as well as the standard's Mod+Alt+Left/Right (no words are in hand, so the caret loses nothing); in a title Mod+Left/Right stay the caret's and Mod+Alt+Left/Right carry the card. Left at a title's start and Right at its end go to the card beside it in the next lane, as a grid's arrows leave a cell at its edges. A card is dragged from anywhere on it, with no grip (Paul, 2026-10-18: "draggable without having a handle"), as the Diagram Maker's things are: a mouse's press once it has moved 6px (a click stays the caret's or the choice's), a finger's or a pen's once held still 200ms, so a finger that moves at once scrolls; a title being typed in keeps its press for its words. A tap on a card outside a title being typed chooses it (pickable, picks it; Shift and a click chooses it there). A lane's name is shown, and renamed where it is drawn: a double click, Enter or F2 on it, or Rename lane; Enter keeps it, Escape lets it go, and an empty name or another lane's is refused and said. A lane has no menu: a double click on its head or a tap on it puts it in hand, its handles dragged (or moved by Left and Right) to narrow or widen it, a row of color dots along its top, and Move left, Move right, Add a card and Delete lane as buttons where the menu was; Escape or a press anywhere else lets it go, every change having been made as it came (docs/library.md, A lane in hand). A drag across lanes has a way without one: Move to… in the bar under chosen cards, a menu of the lanes, which a phone reaches where the lanes are stacked and a drag would be long. The lanes scroll sideways on a wide screen and stack where the board is narrower than two lanes, so a pinch (the size of everything) reflows them. Its keys are not in §10's tables, which are the site's registry's (scripts/commands.ts); commands.ts beside its editor declares them.
- Calculator: Up/Down in the entry line recall tape lines (with no modifier only); Escape clears the entry, and an entry is not in the undo log; the tape grows at its end.
- The Animator: `,` and `.` step a frame; arrows nudge the selected shape (with nothing selected they step a frame); K keys the shape; Space plays. The Animator's Draw mode has no pixel mode. **The layout, phone first** (Paul, 2026-10-11: "all over the place with lots of white space"), the same at every width: in Move mode the stage (the column's width, its own border its edge, no gray frame), right under it the filmstrip (every frame a numbered thumbnail, the one in hand outlined, scrolling sideways; a tap goes to a frame, and the menu at its end, This frame, duplicates it, moves it a frame earlier or later, or deletes it, each frame else showing what it did), then the scrubber, tight, with the keys of the chosen shape on it and the time at its end ("0.4 s of 3.0 s"), then the chosen shape's sliders and its Effects ▾. At the column's foot, above the bar (and above the shape's own row on a phone), in either mode, the row: Draw and Move as one segmented control, and the mode's hint beside it in full, wrapping rather than cut. The bar is Play, Settings, Undo and Redo: its length (frames), speed (frames a second) and repeat (forever, once, a number of times, back and forth) are a small sheet behind Settings, a field a line and the seconds under them. Depth is which shape is in front (a far one a little dimmer), Size how large, Spin the turn in the plane, Turn the turn about the upright axis (a card turning, mirrored past 90°).
- The Trip Planner: the map keeps its own wheel and pinch (Leaflet's), and a double tap on it zooms (never adds two stops).
- The Outliner: Mod+Alt+Up/Down fold and unfold; Mod+Shift+. and Mod+Shift+, zoom in and out; Select All inside a zoom takes the zoomed family. A document under an item is a whole row, not a one-character card.
- Lists inside a document (the Word Processor, the Presentation Builder): items are words in one box, so Shift+arrows extend the selection by characters as Docs does, and there are no handles; Alt+Up/Down, Tab, cut and paste move items. The §3 node selection belongs to the Outliner and to rows.
- The Drawing Tool: Alt+Up/Down move the chosen shapes one place in the stack (there is no "past a neighbor" on a canvas). The Diagram Maker drags the thing itself (a 6px threshold, `touch-action: none` on the thing alone) since a tap on it edits; it has no grip.
- The Calendar's month: entries are drawn small (about 16px) so a cell can hold several; the finger's way to every entry is the month's list below, whose rows are 44px.
- The Word Processor: Mod+Shift+Enter (or Insert ▾ Page break) puts a page break at the caret, the kernel's rule (`---`): a card drawn as a dashed rule, the next page on paper, in print, in .docx and in .rtf. It is the one Mod+Shift+Enter outside the Presentation Builder, where the same rule is the next slide. A horizontal rule (Insert ▾ Horizontal rule, or `---` and Space alone on a line) is that rule marked `{.rule}`: a light line with a little room above and below, a card like the page break, never a new page; in slides it is dropped.

## 9. The audit

For each app, walk every path above with the keyboard, then the mouse, then WebKit at 390px, and record: *works as written* / *missing* / *does something else* (what). Missing items with a bar or context-bar equivalent are gaps on the keyboard only; a shortcut that means something else is the worst kind of deviation and is fixed first. The audit's findings are fixed app by app and proven by a DOM test per path.

## 10. The commands

Every bar, menu, context bar and key in the apps is a command of one registry (src/kit/core/commands.ts): its words, its icon,
its keys, the scope it is bound in (the page, the words, the rows, an app), where it is drawn and when it is in force,
declared once beside the editor that does it (an app's `commands.ts`, the kit's `keys.ts`, `text-commands.ts` and
`rows-commands.ts`). The bars, the menus, the context bars, the keys, the shortcuts dialog and the menu's search are
drawn from it as the page runs, and the tables below are written from it by `npm run commands`: the registry is this
standard's source, and these tables are never edited by hand (a node test fails when they are stale). Its lints are node
tests (test/commands.test.ts): no key is bound twice where the same keys reach (the page, then the app, then the
words, each at its place), and a key an inner scope takes from an outer one is listed with its reason; every command in a
bar or a menu has keys or is reached by the bar's arrows; every label is a message of en.ftl; every command is run by a
test; every key is spelled by one function, a Mac's way or Windows'; no two commands of a scope share a label unless
one of them is in force only sometimes. Keys are written `Mod+Alt+Shift+Key`; `at:` is where in the app the key is
answered (the canvas, a cell, the rail, the show). Rows of data rather than commands (a theme, an ink, a
new document of each app: `data: true`) are left out of the tables, though the menus and the menu's search show them; menus
whose rows are the document's own data (the sheet's column kinds, the formula functions) are not commands at all.

<!-- commands:begin (generated by `npm run commands` from the registry, src/kit/core/commands.ts: do not edit by hand) -->

### Everywhere (the page) (`kit`)

| Keys | Command | Where |
|---|---|---|
| `Mod+Z` | Undo | bar |
| `Mod+Shift+Z`, `Mod+Y` | Redo | bar |
| `Mod+F` | Find in this document | drawer |
| `Mod+S` | Save to this device | keys only |
| `Mod+Shift+S` | Share… | drawer |
| `Mod+Shift+D` | Download | drawer |
| `Mod+P` | Print, or save as PDF | keys only |
| `Mod+/` | Show these shortcuts | keys only |
|  | Zoom in | drawer |
|  | Zoom out | drawer |
|  | Reset zoom | drawer |
| `Mod+K` | Find app, doc, template, or command | keys only |

### Words (wherever words are typed) (`text`)

| Keys | Command | Where |
|---|---|---|
|  | Comment | context |
| `Mod+X` | Cut | context |
| `Mod+C` | Copy | context |
| `Mod+V` | Paste | context |
| `Mod+B` | Bold | bar, context |
| `Mod+I` | Italic | bar, context |
| `Mod+U` | Underline | bar, context |
| `Mod+Shift+X` | Strikethrough | bar, context |
| `Mod+Shift+H` | Highlight | bar, context |
| `Mod+E` | Code | bar, context |
| `Mod+K` | Link | bar, context |
|  | Footnote | bar, context |
|  | Bulleted list | bar, context |
|  | Numbered list | bar, context |
| `Tab` | Indent | bar |
| `Shift+Tab` | Outdent | bar |
| `Alt+ArrowUp` | Move up | keys only |
| `Alt+ArrowDown` | Move down | keys only |
| `Mod+Enter` | Check or uncheck a task | keys only |
| `Mod+A` | Select all (this field first, then the whole document) | keys only |
| `Alt+Enter` | Open this change | keys only, a host’s page alone |

### Rows chosen whole (`rows`)

| Keys | Command | Where |
|---|---|---|
| `Enter` | Edit | context |
| `Escape` | Close or deselect | keys only |
| `Alt+ArrowUp` | Move up | context |
| `Alt+ArrowDown` | Move down | context |
| `Tab` | Indent | context |
| `Shift+Tab` | Outdent | context |
| `Mod+D` | Duplicate | context |
| `Mod+C` | Copy | context |
| `Mod+X` | Cut | context |
| `Mod+V` | Paste | context |
| `Delete`, `Backspace` | Delete | context |
| `Shift+ArrowUp`, `Shift+ArrowDown` | Extend selection | keys only |
| `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` | Back to text | keys only |
| `Mod+A` | Select all (this field first, then the whole document) | keys only |

### Word Processor (`write`)

| Keys | Command | Where |
|---|---|---|
|  | Table | insert ▾ |
|  | Tiny Little Office Doc… | insert ▾ |
|  | QR code of this document | insert ▾ |
|  | Picture… | insert ▾ |
|  | Date | insert ▾ |
|  | Horizontal rule | insert ▾ |
| `Mod+Shift+Enter` | Page break | insert ▾, at: words |
|  | Title | bar |
|  | Heading | bar |
|  | Subheading | bar |
|  | Paragraph | bar |
|  | Icon | bar |
| `Mod+Shift+L` | Align left | align ▾, at: words |
| `Mod+Shift+E` | Center | align ▾, at: words |
| `Mod+Shift+R` | Align right | align ▾, at: words |
| `Mod+Shift+J` | Justify | align ▾, at: words |
|  | Letter | paper ▾ |
|  | A4 | paper ▾ |
| `Enter` | Edit | context, at: card |
|  | Align left | context, at: card |
|  | Center | context, at: card |
|  | Align right | context, at: card |
|  | Open in a new tab | context |
| `Alt+ArrowUp` | Move up | context, at: card |
| `Alt+ArrowDown` | Move down | context, at: card |
| `Mod+D` | Duplicate | context, at: card |
| `Mod+C` | Copy | context, at: card |
| `Mod+X` | Cut | context, at: card |
| `Mod+V` | Paste | context, at: card |
| `Delete`, `Backspace` | Delete | context, at: card |
| `Escape`, `ArrowDown`, `ArrowRight` | Back to text | keys only, at: card |
| `ArrowUp`, `ArrowLeft` | Back to text | keys only, at: card |

### Outliner (`outline`)

| Keys | Command | Where |
|---|---|---|
|  | Item | insert ▾ |
|  | Tiny Little Office Doc… | insert ▾ |
|  | Task | insert ▾ |
|  | Due date | insert ▾ |
|  | Statuses | insert ▾ |
|  | Icon | bar |
| `Tab` | Indent | bar, at: words |
| `Shift+Tab` | Outdent | bar, at: words |
| `Alt+ArrowUp` | Move up | bar, at: words |
| `Alt+ArrowDown` | Move down | bar, at: words |
|  | Numbered | bar |
| `Mod+Shift+,` | Zoom out | bar, at: words, drawer on a phone |
| `Mod+Shift+.` | Zoom in | bar, at: words |
|  | Collapse all | bar, drawer on a phone |
|  | Expand all | bar, drawer on a phone |
|  | Connect | bar |
|  | As a page | view ▾ |
|  | Agenda | view ▾, drawer on a phone |
|  | By status | view ▾, drawer on a phone |
|  | Show as slides | view ▾ |
|  | Draw as a mind map | view ▾ |
|  | Draw as an org chart | view ▾ |
|  | Draw as a family tree | view ▾ |
|  | Draw as a network | view ▾ |
|  | Calendar | view ▾ |
| `Mod+Enter` | Check or uncheck a task | keys only, at: words |
| `Mod+Alt+ArrowUp`, `Mod+Alt+ArrowDown` | Collapse or expand | keys only, at: words |
| `Mod+D` | Duplicate | keys only, at: words |
| `Delete`, `Backspace` | Delete | keys only, at: words |
| `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` | Next or previous | keys only, at: words |

### Presentation Builder (`deck`)

| Keys | Command | Where |
|---|---|---|
|  | Bullets slide | insert ▾ |
|  | Title slide | insert ▾ |
|  | Two-column slide | insert ▾ |
|  | Big icon slide | insert ▾ |
|  | Four more pages | insert ▾ |
|  | Table | insert ▾ |
|  | Tiny Little Office Doc… | insert ▾ |
|  | QR code of this document | insert ▾ |
|  | Picture… | insert ▾ |
| `Mod+Alt+Enter` | Present | bar, at: slide, drawer on a phone |
|  | Print layout | bar, drawer on a phone |
|  | Icon | bar |
|  | Bullets | layout ▾ |
|  | Title | layout ▾ |
|  | Two columns | layout ▾ |
|  | Big icon | layout ▾ |
|  | The theme's color | look ▾ |
|  | Fade | transition ▾ |
|  | Cut | transition ▾ |
|  | Slide | transition ▾ |
|  | Zoom | transition ▾ |
|  | Slides | format ▾ |
|  | Zine | format ▾ |
|  | Booklet | format ▾ |
|  | Brochure | format ▾ |
|  | Comic | format ▾ |
|  | Poster | format ▾ |
|  | Name badges | format ▾ |
|  | One-sided | format ▾ |
|  | Two-sided | format ▾ |
|  | End with a QR code of this deck | bar, drawer on a phone |
| `Alt+ArrowUp` | Move slide up | bar, at: words |
| `Alt+ArrowDown` | Move slide down | bar, at: words |
|  | Delete slide | bar |
| `Mod+Shift+Enter` | A new slide | keys only, at: slide |
| `Mod+Enter` | Done | keys only, at: words |
| `Mod+D` | Duplicate | keys only, at: slide |
| `PageUp`, `PageDown` | Previous or next slide | keys only, at: rail |
| `ArrowRight`, `Space`, `PageDown`, `Enter` | Next line or slide (presenting) | keys only, at: show |
| `ArrowLeft`, `PageUp`, `Backspace` | Back (presenting) | keys only, at: show |
| `End` | Whole slide (presenting) | keys only, at: show |
| `N`, `Shift+N` | Notes | keys only, at: show |
| `Escape` | Stop presenting | keys only, at: show |

### Spreadsheet (`sheet`)

| Keys | Command | Where |
|---|---|---|
|  | Letters keyboard | bar |
| `Mod+Alt+=` | Row above | insert ▾, at: cell |
|  | Row below | insert ▾ |
|  | Column after | insert ▾ |
|  | Chart | insert ▾ |
|  | No chart | chart ▾ |
|  | Bars | chart ▾ |
|  | Lines | chart ▾ |
|  | Pie | chart ▾ |
|  | Flows (Sankey) | chart ▾ |
| `Mod+D` | Fill down from the top row | bar, context, at: cell |
|  | Fill right from the first column | bar, context |
|  | Fit the columns to the page | bar, drawer on a phone |
|  | Show all the text | bar, drawer on a phone |
|  | Lock these cells so readers can’t change them | bar |
| `Mod+C` | Copy | context, at: cell |
| `Mod+X` | Cut | context, at: cell |
| `Mod+V` | Paste | context, at: cell |
| `Delete`, `Backspace` | Clear cells | context, at: cell |
|  | Insert a row above | row ▾ |
|  | Insert a row below | row ▾ |
| `Alt+ArrowUp` | Move up | row ▾, at: cell |
| `Alt+ArrowDown` | Move down | row ▾, at: cell |
| `Mod+Alt+-` | Delete  | row ▾, at: cell |
| `Mod+A` | Select all (this field first, then the whole document) | keys only, at: cell |
| `Mod+Enter` | Done | keys only, at: cell |
| `Tab`, `Shift+Tab` | Indent or outdent a list item; next cell in a table | keys only, at: cell |
| `F2` | Edit cell with cursor at end | keys only, at: cell |
| `Shift+ArrowUp`, `Shift+ArrowDown`, `Shift+ArrowLeft`, `Shift+ArrowRight` | Extend selection | keys only, at: cell |
| `Space` | Check or uncheck a task | keys only, at: cell |
| `Escape` | Close or deselect | keys only, at: cell |
| `Escape` | Restore cell value | keys only, at: cell |
| `Enter`, `Shift+Enter`, `ArrowDown`, `ArrowUp`, `ArrowLeft`, `ArrowRight` | Next or previous | keys only, at: cell |

### Calculator (`calc`)

| Keys | Command | Where |
|---|---|---|
|  | Calculator | bar, drawer on a phone |
|  | Graph | bar, drawer on a phone |
|  | Sine | insert ▾ |
|  | Cosine | insert ▾ |
|  | Tangent | insert ▾ |
|  | Natural log | insert ▾ |
|  | Log base ten | insert ▾ |
|  | Square root | insert ▾ |
|  | Absolute value | insert ▾ |
|  | Factorial | insert ▾ |
|  | e, the number | insert ▾ |
|  | x, for a graph | insert ▾ |
|  | Convert to | insert ▾ |
|  | Derivative | insert ▾ |
|  | Simplify | insert ▾ |
|  | Clear the tape | bar, drawer on a phone |
| `Enter` | Done | keys only, at: entry |
| `ArrowUp`, `ArrowDown` | Next or previous | keys only, at: entry |
| `Escape` | Clear the line | keys only, at: entry |
| `Mod+A` | Select all (this field first, then the whole document) | keys only, at: entry |
| `Enter` | Done | keys only, at: line |
| `Escape` | Close or deselect | keys only, at: line |
| `Alt+ArrowUp`, `Alt+ArrowDown` | Move the selected items up or down | keys only, at: line |
| `Shift+ArrowUp`, `Shift+ArrowDown` | Extend selection | keys only, at: line |
| `ArrowUp`, `ArrowDown` | Next or previous | keys only, at: line |
| `Mod+D` | Duplicate | keys only, at: line |
| `Mod+A` | Select all (this field first, then the whole document) | keys only, at: line |
| `Backspace` | Delete | keys only, at: line |

### Drawing Tool (`draw`)

| Keys | Command | Where |
|---|---|---|
| `V` | Select | bar, at: canvas |
| `R` | Rectangle | bar, at: canvas |
| `E` | Ellipse | bar, at: canvas |
| `D` | Diamond | bar, at: canvas |
| `L` | Line | bar, at: canvas |
| `A` | Arrow | bar, at: canvas |
| `T` | Text | bar, at: canvas |
| `K`, `Shift+K` | Join two shapes | bar, at: canvas |
| `P` | Pen | bar, at: canvas |
| `F` | Freehand | bar, at: canvas |
|  | Rectangle | insert ▾ |
|  | Rounded box | insert ▾ |
|  | Ellipse | insert ▾ |
|  | Diamond | insert ▾ |
|  | Hexagon | insert ▾ |
|  | Parallelogram | insert ▾ |
|  | Cylinder | insert ▾ |
|  | Note | insert ▾ |
|  | Text | insert ▾ |
|  | Line | insert ▾ |
|  | Arrow | insert ▾ |
|  | Join two shapes | insert ▾ |
|  | Icon… | insert ▾ |
|  | Pen | insert ▾ |
|  | Freehand | insert ▾ |
|  | Shapes | mode ▾ |
|  | Pixels 8×8 | mode ▾ |
|  | Pixels 16×16 | mode ▾ |
|  | Pixels 32×32 | mode ▾ |
|  | Pixels 64×64 | mode ▾ |
|  | Remove background | mode ▾ |
|  | Place an icon | bar |
|  | Add alt text: describe this drawing for people who cannot see it | bar, drawer on a phone |
|  | Zoom out | bar, drawer on a phone |
|  | Zoom in | bar, drawer on a phone |
|  | Solid line | context |
|  | Dashed line | context |
|  | Dotted line | context |
|  | No fill | context |
|  | Gray fill | context |
|  | Solid fill | context |
|  | Small text | context |
|  | Medium text | context |
|  | Large text | context |
|  | Extra large text | context |
|  | Align: left | context |
| `[` | Rotate left | context, at: canvas |
| `]` | Rotate right | context, at: canvas |
| `Enter` | Edit text | context, at: canvas |
|  | Join two shapes | context |
| `Mod+D` | Duplicate | context, arrange ▾, at: canvas |
|  | Bring to front | context, arrange ▾ |
|  | Send to back | context, arrange ▾ |
| `Mod+C` | Copy | context, at: canvas |
| `Mod+X` | Cut | context, at: canvas |
| `Mod+V` | Paste | context, insert ▾, at: canvas |
| `Delete`, `Backspace` | Delete | context, arrange ▾, at: canvas |
| `Enter` | Done | keys only, at: canvas |
| `Escape` | Close or deselect | keys only, at: canvas |
| `Backspace` | Delete | keys only, at: canvas |
| `Escape` | Close or deselect | keys only, at: canvas |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Enter` | Join two shapes | keys only, at: canvas |
| `Mod+A` | Select all (this field first, then the whole document) | keys only, at: canvas |
| `Mod+Shift+L` | Align: left | keys only, at: canvas |
| `Mod+Shift+E` | Align: center | keys only, at: canvas |
| `Mod+Shift+R` | Align: right | keys only, at: canvas |
| `Alt+ArrowUp`, `Alt+ArrowDown` | Move the selected items up or down | keys only, at: canvas |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Shift+ArrowLeft`, `Shift+ArrowRight`, `Shift+ArrowUp`, `Shift+ArrowDown`, `Mod+ArrowLeft`, `Mod+ArrowRight`, `Mod+ArrowUp`, `Mod+ArrowDown` | Nudge selected shapes | keys only, at: canvas |
|  | Eraser | bar |
|  | Pencil | bar |
|  | Fill | bar |
|  | Clear the grid | bar |
|  | Background | bar |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown` | Tap or drag to paint; the arrow keys move, Enter paints. | keys only, at: pixels |
| `Enter`, `Space` | Tap or drag to paint; the arrow keys move, Enter paints. | keys only, at: pixels |

### Diagram Maker (`diagram`)

| Keys | Command | Where |
|---|---|---|
|  | Mind map | kind ▾ |
|  | Org chart | kind ▾ |
|  | Family tree | kind ▾ |
|  | Swimlanes | kind ▾ |
|  | Timeline | kind ▾ |
|  | Venn | kind ▾ |
|  | Seating chart | kind ▾ |
|  | Network | kind ▾ |
|  | Idea | insert ▾ |
|  | Join | bar |
|  | Print place cards | bar, drawer on a phone |
|  | Zoom out | bar, drawer on a phone |
|  | Zoom in | bar, drawer on a phone |
| `Alt+ArrowUp` | Move up | context, at: thing |
| `Alt+ArrowDown` | Move down | context, at: thing |
|  | Add after | context |
|  | Icon | context |
|  | Add a step | context |
|  | Join | context |
|  | Arrow | context |
| `Tab` | Indent | context, at: thing |
| `Shift+Tab` | Outdent | context, at: thing |
| `Mod+D` | Duplicate | context, at: thing |
| `Mod+C` | Copy | context, at: thing |
| `Mod+X` | Cut | context, at: thing |
| `Mod+V` | Paste | context, at: thing |
| `Delete`, `Backspace` | Delete | context, at: thing |
| `Enter`, `Space` | Edit | keys only, at: thing |
| `Mod+Alt+ArrowLeft` | Move left | keys only, at: thing |
| `Mod+Alt+ArrowRight` | Move right | keys only, at: thing |
| `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` | Next or previous | keys only, at: thing |
| `ArrowDown`, `ArrowRight` | Next or previous | keys only, at: picture |
| `Escape` | Close or deselect | keys only, at: picture |
| `Mod+Enter` | Done | keys only, at: words |

### Animator (`anim`)

| Keys | Command | Where |
|---|---|---|
| `Space` | Play | bar, at: stage, drawer on a phone |
|  | Impact | fx ▾ |
|  | 3D | fx ▾ |
|  | Shadow | fx ▾ |
|  | Neon | fx ▾ |
|  | Outline | fx ▾ |
|  | Rainbow | fx ▾ |
|  | Mirror | fx ▾ |
|  | Wobble | fx ▾ |
|  | Blur | fx ▾ |
|  | Settings | bar |
|  | Duplicate this frame | frame ▾ |
|  | A frame earlier | frame ▾ |
|  | A frame later | frame ▾ |
|  | Delete this frame | frame ▾ |
|  | Draw | drawer |
|  | Move | drawer |
|  | Loop forever | loop ▾ |
|  | Play once | loop ▾ |
|  | Back and forth | loop ▾ |
|  | 2 times | loop ▾ |
|  | 3 times | loop ▾ |
|  | 5 times | loop ▾ |
|  | 10 times | loop ▾ |
|  | Loop forever | loop ▾ |
| `K` | Add keyframe | context, at: stage |
|  | Remove keyframe | context |
| `Enter` | Edit text | context, at: stage |
| `Mod+D` | Duplicate | context, at: stage |
| `Mod+C` | Copy | context, at: stage |
| `Mod+X` | Cut | context, at: stage |
| `Mod+V` | Paste | context, at: stage |
| `Delete`, `Backspace` | Delete | context, at: stage |
| `,`, `.` | Previous or next frame | keys only, at: stage |
| `Home`, `End` | First or last frame | keys only, at: stage |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Shift+ArrowLeft`, `Shift+ArrowRight`, `Shift+ArrowUp`, `Shift+ArrowDown`, `Mod+ArrowLeft`, `Mod+ArrowRight`, `Mod+ArrowUp`, `Mod+ArrowDown` | Nudge selected shapes, or step one frame | keys only, at: stage |
| `Mod+A` | Select all (this field first, then the whole document) | keys only, at: stage |
| `Escape` | Close or deselect | keys only, at: stage |

### Calendar (`cal`)

| Keys | Command | Where |
|---|---|---|
|  | Previous month | bar, drawer on a phone |
|  | Today | bar, drawer on a phone |
|  | Next month | bar, drawer on a phone |
|  | Month | view ▾ |
|  | Year | view ▾ |
|  | Schedule | view ▾ |
|  | Event | insert ▾ |
|  | Task | insert ▾ |
|  | Time zone | bar, drawer on a phone |
| `Mod+Alt+ArrowLeft` | A day earlier | context, at: rows |
| `Mod+Alt+ArrowRight` | A day later | context, at: rows |
| `Alt+Enter` | Edit dates… | context, at: rows |
| `Tab`, `Shift+Tab` | Indent or outdent a list item; next cell in a table | keys only, at: words |
| `Alt+ArrowUp`, `Alt+ArrowDown` | Move the selected items up or down | keys only, at: words |
| `ArrowUp`, `ArrowDown` | Next or previous | keys only, at: words |
| `Mod+D` | Duplicate | keys only, at: words |
| `Mod+Enter` | Check or uncheck a task | keys only, at: words |
| `Mod+Alt+ArrowLeft` | A day earlier | keys only, at: words |
| `Mod+Alt+ArrowRight` | A day later | keys only, at: words |
| `Alt+Enter` | Edit dates… | keys only, at: words |
| `Enter` | Event | keys only, at: day |
| `Escape` | Close or deselect | keys only, at: day |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Shift+ArrowLeft`, `Shift+ArrowRight`, `Shift+ArrowUp`, `Shift+ArrowDown`, `Home`, `End`, `PageUp`, `PageDown` | Next or previous | keys only, at: day |
| `Delete`, `Backspace` | Delete | keys only, at: entry |
| `Mod+D` | Duplicate | keys only, at: entry |

### Trip Planner (`trip`)

| Keys | Command | Where |
|---|---|---|
|  | A place by name… | insert ▾ |
|  | Add a stop at the map’s center | insert ▾ |
|  | Hours of driving | units ▾ |
|  | Miles | units ▾ |
|  | Kilometers | units ▾ |
|  | Connect stops in order | bar, drawer on a phone |
|  | Show the whole route | bar, drawer on a phone |
|  | Where I am | bar, drawer on a phone |
|  | Map | bar, drawer on a phone |
| `Mod+Alt+Enter` | Present | bar, drawer on a phone |
|  | Show on the map | context, at: rows |
| `Alt+ArrowUp`, `Alt+ArrowDown` | Move the selected items up or down | keys only, at: words |
| `Mod+D` | Duplicate | keys only, at: words |
| `ArrowUp`, `ArrowDown` | Next or previous | keys only, at: words |
| `ArrowRight`, `Space`, `PageDown`, `Enter` | Next stop (presenting) | keys only, at: show |
| `ArrowLeft`, `PageUp`, `Backspace` | Previous stop (presenting) | keys only, at: show |
| `Home`, `End` | First or last | keys only, at: show |
| `Escape` | Stop presenting | keys only, at: show |
| `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Shift+ArrowLeft`, `Shift+ArrowRight`, `Shift+ArrowUp`, `Shift+ArrowDown` | Nudge selected shapes | keys only, at: pin |
| `Delete`, `Backspace` | Delete | keys only, at: pin |
| `Escape` | Close or deselect | keys only, at: pin |

<!-- commands:end -->
