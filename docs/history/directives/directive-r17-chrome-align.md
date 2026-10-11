# R17-chrome-align: previews at the far left and at the top; icons at the top

**Paul, 2026-10-11:** *"Align the previews to the far left. Align the icons in the main menu to the top so they stay there when we zoom."* Looked at (the chrome may be looked at by eye) on 2026-10-11 on an iPhone 14 width and at 1100px:

1. **The templates dialog** (`<to-templates>`, `src/kit/home.ts` and `src/styles/kit.css` `.to-templates-dialog`, `.to-thumb`): each preview thumbnail is vertically centered beside its name and blurb, so under a five-line blurb (Cover letter) the thumbnail sits far below the name, and on the phone the thumbnails are inset 23px from the dialog's edge with the Blank row's highlight padding a further 40px. The preview is the row's first column, flush with the dialog's content edge (the same left as the dialog's heading), and aligned to the top of its row (`align-self: start`), so it sits beside the template's name whatever the blurb's length. The Blank row's highlight keeps its padding but its thumbnail lines up with the others (the highlight extends into the gutter, or the row's padding is the gutter: one rule for all rows). Both columns on a wide screen, one on a phone; RTL mirrors (the far right).
2. **The drawer's rows** (`src/kit/drawer.ts`, `.to-drawer` rows in kit.css and responsive.css): the icon before a label is vertically centered on the label's box, so when the label wraps at a larger size ('Size of everything' at 1100px, and every row on a phone at 150% and more) the icon floats between the lines. The icon aligns with the first line (`align-items: start`, the icon's box the line-height of the first line, with the same `margin-block-start` trick the kit uses for list markers if one exists), in every row of the drawer: This document's rows, the apps' rows, Open a file, Compare, the Private switch (already beside the first line: keep), Theme, Privacy, the size stepper. The same rule for the home page's app rows (`.to-app-open` icon and `.to-app-name`), which wrap at 200% (r16-reflow made them wrap between words).

## Proof

- `test/browser/home.test.ts` (or templates): in the open dialog, every `.to-thumb`'s left edge equals the dialog heading's left edge, and its top equals its row's name's top within 2px; a row with a long blurb keeps that.
- `test/browser/drawer.test.ts`: at SIZE_MAX on a 390px viewport, for every row whose label wraps, the icon's top is within the first line's box (its center above the first line's bottom).
- The walks and label-widths unchanged.

## Not this

- No change to sizes, spacing or order of rows beyond the alignment.
