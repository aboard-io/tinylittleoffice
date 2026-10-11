# R18-sheet-phone: the Spreadsheet with the keyboard up, and numbers by default

**Paul, 2026-10-11:** *"The fixed header title on spreadsheets means that when the keyboard is up there's no room to navigate on a phone."* and *"If I am entering a numeric field default to numbers. Let me switch to text if needed."*

## What is wrong today

On a phone with the keyboard up the visual viewport is about 508px. The Spreadsheet keeps the page header (the title row) and its own column heads fixed, so with the bar and the cell editor the grid has a few rows of room; the words editor's header steps aside while editing (b59dcaa) but the Spreadsheet's does not. A cell in a number, money or percent column opens the letters keyboard.

## The design

- **The header steps aside while a cell is edited**, as it does for the words editor: `kit/chrome.ts` indoc applies to the Spreadsheet's cell editor too (the hamburger slides into the corner, the title row goes). The column heads stay (they are navigation) but take one line; the active cell is kept visible above the keyboard (the same `keepCaretVisible`/reveal path as r18-outline-caret, in the grid's scroller).
- **A number column asks for numbers.** The cell editor sets `inputmode="decimal"` when the column's type is number, money or percent (`ColType` in `src/doc/model.ts`), `inputmode="numeric"` for an integer-only type if one exists, `"text"` otherwise; a date column `inputmode="numeric"` with the pattern the locale uses. A formula (a cell starting with `=`) switches to `text` as soon as the `=` is typed, because operators and names need the full keyboard.
- **Switching to text.** In the context row above the keyboard, a small toggle 'ABC / 123' (an icon button with `aria-pressed`) flips the inputmode for this cell and remembers the choice for the column for the visit; the device's own keyboard switch works too (nothing blocks it).
- docs/editing.md's Spreadsheet section says both.

## Proof

- `e2e/sheet-phone.spec.ts` (WebKit, 390 by 508 and the iOS-style keyboard model): editing a cell, the header is gone, the column heads and the active cell are inside the visual viewport; a cell in a `:money` column has `inputmode="decimal"`; typing `=` makes it `text`; the toggle flips it and the next cell in that column follows.
- `test/browser/sheet*.test.ts`: the inputmode by column type.

## Not this

- No change to the grid on a desktop.
