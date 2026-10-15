# Checking a release on a phone

Ten minutes on an iPhone before a tag, in this order. Each check says what right looks like; anything else
is a bug to report with the app, the step and a screenshot. The dev server at port 4179 serves `main`, so a
check can run before the tag as well as after. (Paul, 2026-10-15: "Please document the phone checks and what
to look for.")

## Before you start

- Safari on an iPhone, portrait. One pass in landscape at the end (step 9).
- Dark mode on for step 7 (Settings → Display & Brightness), then off again.
- A right-to-left language for step 8: Settings → General → Language & Region, add Arabic or Hebrew and put
  it first, or set the site's language in the menu (☰ → the language).

## 1. The home page

- The app tiles fit the width with no sideways scroll, and each opens its app on a tap.
- Save in browser: the switch reads its state; with it on and a document saved, the saved documents are
  listed right under it (issue #6) and open on a tap.
- The search box over saved documents finds by a word in the text.

## 2. Each app at phone width

Open every app from the home page and look before typing:

- The bar is one row. What does not fit is behind Insert ▾ or the ⋯ menu, never cut off.
- Insert ▾ and every menu open fully on screen, not clipped at the bottom edge (iOS clips popups that
  overflow the page; the kit opens them as drawers on a phone). Each row is tall enough to tap.
- The document's width is the screen's: no sideways scroll in the Word Processor, Outliner, Spreadsheet (its
  own sheet scrolls, the chrome does not), Calendar or Presentation Builder.

## 3. The keyboard and the caret

In the Word Processor and the Outliner:

- Tap a word: the caret lands where you tapped, not at the start or end of the line.
- Type a word with the keyboard, then swipe-type a word, then type again: the caret stays at the end of
  the last word. (Reported on Hacker News, 2026-10-15: "when switching between touch typing and swiping the
  cursor ends up in the middle of words.")
- Tapping into a field does not zoom the page (every input is 16 px or larger).
- Return makes a new item or paragraph as [editing.md](editing.md) says; in a link, one space ends the
  link and the next word is plain.
- The bar stays reachable above the keyboard; menus open above it.

## 4. Pinch

- Word Processor, Outliner, Spreadsheet, Presentation Builder, Calendar: a pinch changes the size of
  everything and the text reflows. The browser never zooms the page.
- Drawing Tool, Diagram Maker, Animator, the Trip Planner's map: a pinch zooms the canvas in place, under
  your fingers; the chrome stays put.

## 5. Share

- Share opens the dialog; the size line names the link's size and where it fits (issue #8 adds the limits
  themselves).
- Copy link works (paste it somewhere); the short link is made and opens; the QR code shows; the phone's
  share sheet opens from the share button.

## 6. The Outliner's compound bullet

- A status chip, a task box and a due day sit on the words' first line; on a narrow row the chips are a
  second line under the words, the day at its end.
- Tapping the status goes to the next one; the box checks; the day opens the date picker.
- Agenda and By status open as drawers and their rows act (box, status, day); tapping the words closes the
  view and lands the caret on the item.

## 7. Dark mode

Every app once, and:

- The Presentation Builder's preview strip: slide text is light on the dark slide, not black on dark.
  (Reported on Hacker News, 2026-10-15.)
- The Outliner's status chips read in their colors; yellow is yellow.
- Dialogs, menus and the drawer are dark, with no white patches at their edges.

## 8. Right to left

In Arabic, Hebrew, Urdu or Yiddish:

- The bar, the menus and the drawer are mirrored: the first button at the right.
- The Outliner's bullets, boxes and chips sit at the right of the words; indent goes leftward.
- Typing in a field runs right to left; a Latin word or a number inside it reads correctly.
- The Share dialog's table and the size line read right to left with their numbers intact.

## 9. Presenting, and landscape

- Present a deck and an outline as slides: full screen, swipe to the next slide, tap to end.
- Turn the phone sideways: the bar is still one row; the Spreadsheet and the Calendar use the width.

## 10. Install and offline

- Share → Add to Home Screen; the icon and name are ours; opening it has no browser chrome.
- With Wi-Fi and data off, the installed app opens and a saved document loads; the home page says what is
  not there offline.

## Reporting

Say the app, the step, the language and the mode (dark, landscape), and what you saw instead of what the
step says. A screenshot of a layout bug is worth the words; measurements are better where they can be had
(the browser tests measure every label's width in every language already, so a label that does not fit on
the phone but passes the test is a difference between Safari and the test's browser, and worth saying so).
