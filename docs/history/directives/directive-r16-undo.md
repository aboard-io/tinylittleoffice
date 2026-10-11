# R16-undo: Undo is always on a phone's screen

**The review of 2026-10-11.** The Apple product person: *"Undo is never on screen in any app's bar … While editing, the header steps aside and only the menu button stays, so a phone has no Undo you can see."* They also found *"keyboard shortcuts are printed where there is no keyboard"*, and that Find in this document is reachable on a phone only through a ⌘ glyph. The blind reader: *"The drawer's buttons are named 'Share… Ctrl+Shift+S' … which VoiceOver speaks in full on a phone with no keyboard."*

## What is wrong today

1. `src/kit/element.ts` `undoTools()` puts Undo and Redo last in every app's bar, which scrolls sideways under a coarse pointer. Measured at 390×844 with the bar shown, Undo's left edge is at 1,411 px (write, deck), 1,366 (draw), 787 (board), 660 (sheet) and 435 (todo). `docs/editing.md` §1 still names 'the header's Undo/Redo'.
2. `drawer.ts` and `<to-menu>` render `<kbd>` key chords under coarse(), and the chords are part of the buttons' names. The palette's options carry `<kbd>` inside role=option.
3. `kit.find` has `where: ['keys-only']`, so a phone reaches Find only through the palette.

## The design

- **Undo is pinned.** `bar.ts` already keeps the palette button outside the scroll. UNDO and REDO in kit/keys.ts get a `pinned` flag, and under coarse() bar.ts renders them in that fixed slot at the bar's inline end, beside the palette button. On a bar narrower than 360 px only Undo is pinned. On a fine pointer the bar is as it is.
- **No chords without a keyboard.** Under coarse(), the drawer, the menu and the palette leave out `<kbd>` unless a hardware keyboard has been seen (a keydown with a modifier sets a flag). The chord moves out of the name everywhere into `aria-keyshortcuts`.
- **Find in the drawer.** `kit.find` gets `where: ['drawer']`, so it appears under This document as 'Find in document'.
- editing.md §1 is corrected to name the pinned Undo.

## Where

`src/kit/keys.ts`, `src/kit/bar.ts`, `src/kit/element.ts`, `src/styles/responsive.css` (the pinned slot), `src/kit/drawer.ts`, `src/kit/menu.ts`, `src/kit/palette.ts`, `src/kit/commands.ts` (keysText), `docs/editing.md`.

## Proof

- A walks rule in `test/walks-model.ts` / `test/browser/walks.test.ts`: whenever the bar is shown at 390×844, Undo's rect is inside the visible window, for all 13 apps.
- `test/browser/bar.test.ts`: under coarse, Undo is outside the scroller. Under fine, the bar is unchanged.
- `test/browser/drawer.test.ts`: under coarse with no keyboard seen, no `<kbd>` is in the drawer, and the button names contain no 'Ctrl' or '⌘'. Find is listed.

## Not this

- No change to which key opens the palette (the Mod+K clash with Link is a question for Paul).
- No new gesture for undo.