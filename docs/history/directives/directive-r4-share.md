# R4-I: the Share dialog, and arriving by a short link

Read first: directive-r4-common.md, src/kit/{shell,short,links,share,qr,limits,dialog,route}.ts, src/styles/kit.css (the to-doc/to-qr/to-short dialog styles), test/browser/{shell,short}.test.ts, tinier/ (the worker: what a short link carries, TTLs, owner links), and what the R4-A branch landed (Link / Display Link, the `?d` flag) — start from next as it is.

Paul: "The short link function modal needs to be redesigned. Look at it. When we look at short link docs in the browser point out how many days are left before they expire. Make this big and colorful at the top. Give people a copy button to copy into a new document."

What the Share button opens today: a menu of Copy link / QR code / "Shorter link that expires…", each a separate small dialog with facts tables and hints; the short-link flow is a wall of hints, links and buttons. Replace it with **one Share dialog**, top-aligned, a full-screen sheet on a phone:

1. **Head**: the document's title; one quiet line from `limits.ts`: "This link: 1,240 characters, fits in a text message" (or the first place it does not fit, in words, no table).
2. **Link**: two equal buttons side by side, **Copy link** (small line under it: "Opens in the editor") and **Copy display link** ("Opens as pages to read"); a third, **Share…**, where the device has the native sheet. A copy shows the kit's toast.
3. **Short link that expires**: the lifetimes (an hour, a day, a week, a month, a year) as one row of segmented buttons (radio group, the week chosen by default, remembered under Saved), the encryption note as one small line, and one primary **Make a short link**. Made: the short link big in a read-only field with **Copy** at its right; "Expires in 7 days (16 October)" under it; a disclosure "Keep the owner link, to update it later" that opens to the owner link with its Copy and **Keep on this device** (or the hint to turn on Saved).
   Opened from an owner link: the same section says "You own this short link" with the link, **Update** (enabled when changed), the lifetimes row with **Extend**, and **Forget**, in that order.
4. **QR**: the code drawn inline when it fits (with PNG and SVG), else the one-sentence why.
5. **Kept on this device**: a collapsed "n short links kept here" that opens to the list (title, expires in n days, Remove).
6. **Arriving by a short link** (`?s=` in the route): a banner above the app's bar, big and coloured by urgency (green over a week, amber within a week, red on the last day; dark-mode tokens, contrast-tested), saying "This link expires in 12 days" (or "today", "in 3 hours"), with **Copy into a new document** (opens the same document as a fresh plain link in a new tab, titled "Copy of {title}", no owner, no short-link tie; a toast confirms) and, for the owner, **Extend** opening the Share dialog's section. The banner stays small when scrolled (sticky under the header) and has a Close for the visit.
7. Strings in the kit sections; docs: README's sharing paragraph.

Tests: DOM tests for each section (the two copies call copyText with the right link, the lifetimes row writes shortTtl, Make calls the short service (stubbed) and shows the field with Copy, the disclosure, the owner state's buttons, the QR fits/not, the kept list), the banner (colour by days left with a faked clock, Copy into a new document opens the plain link and titles it, Close), and a 390px run (one sheet, nothing wider, OK buttons inside the screen). PW_PORT=4408.
