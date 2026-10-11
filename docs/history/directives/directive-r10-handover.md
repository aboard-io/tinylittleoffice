# R10-handover — one modal at a time

The walks' first finding, test/walks-known.ts `dialog-from-dialog`: a modal `<dialog>` opened from a button inside another modal stacks on it. The cases:

1. An app's templates from its row in the drawer (`src/kit/drawer.ts` "This document" / the app's row → `src/kit/home.ts` `ToTemplates.show()`, the full-screen dialog of 2026-10-09).
2. Privacy and keys from the drawer (`src/kit/drawer.ts` → `<to-privacy>` `show()`, `src/kit/privacy-dialog.ts`).
3. About from the drawer (`src/kit/drawer.ts` `.to-about-dialog`).
4. Password… from Share (`src/kit/share-dialog.ts`, the part drawn by `<to-privacy>`).

**Paul, 2026-10-10:** the outer one hands over.

## The design

- **The drawer hands over and does not come back.** The drawer is a menu: a row in it that opens a dialog closes the drawer first (as `shell.ask` already does for the leave dialog, round nine), then opens the dialog. When the dialog closes (Escape, its Close, its backdrop, or the thing done), the focus goes to the hamburger button, where the drawer was opened from: the person is where they were before they opened the menu. One mechanism for the three rows: a `handOver(open)` on the drawer (or on `<to-dialog>`'s `focusBack`, round nine's one way back) that closes the drawer, opens, and names the hamburger as the way back.
- **Share hands over and comes back.** Share is a task with a form in it; Password… is a step of that task. Share closes, the password dialog opens; when the password dialog closes, Share reopens with its state as it was (the format chosen, the switches), and the focus on the Password… button it left from. Cancel and done both come back. If `<to-share>`'s state is lost when it closes today, keep it on the element, not rebuilt from the document.
- **No dialog opens another while it is open**, as a rule: a node or browser test over the registry's commands and the chrome's buttons that reach a dialog asserts that no `showModal()` runs while another modal is open (a lint in the spirit of round nine's: the walks' `modal` rule, which now has no excuse).

## Where

- `src/kit/drawer.ts`, `src/kit/home.ts` (`ToTemplates` opened from the drawer; opened from the home page it is as it was), `src/kit/privacy-dialog.ts`, `src/kit/share-dialog.ts`, `src/kit/dialog.ts` (`focusBack` learns a named way back if that is the one mechanism).
- Tests: a browser test per case (the drawer's three rows, Share's Password…), each asserting one modal open at a time, the focus after close, and, for Share, its state kept across the hand-over; `test/walks-known.ts` loses the `dialog-from-dialog` entry; test/browser/walks.test.ts green from both replay seeds (VITE_WALK_SEED=1438393384, text at a phone; VITE_WALK_SEED=-445799283, canvas at a phone); `npm run walks` green.
- docs/editing.md's dialogs paragraph (or the kernel doc's chrome section, whichever names the dialogs): one sentence, one modal at a time, the drawer hands over, Share comes back.

## Not this

- No Back button drawn in a dialog: the way back is where the focus goes, not a control.
- No change to the dialogs' contents or looks.
