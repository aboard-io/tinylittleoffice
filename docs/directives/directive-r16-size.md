# R16-size: the size of everything is kept and easy to reach

**The review of 2026-10-11.** The low-vision reader at 200% on an iPhone: *"Every new link or reload goes back to 100%, because Private keeps the size only in memory, and the control to set it again is about 1,900px down a long menu and is not a command … While I type, the menu button fades to 55% opacity and has no visible edge."* The Apple product person: *"Nothing reads the iOS Dynamic Type setting."*

## What is wrong today

1. `src/kit/zoom.ts` keeps `tinyoffice.size` through `store`, which under Private is an in-memory Map, so every link opened from Messages or a QR code starts at 100%. `to-theme` behaves the same. The language is already exempt (`i18n.ts` writes `tinyoffice.lang` straight to localStorage).
2. The 'Size of everything' stepper is the last thing in the drawer (`drawer.ts:276-279`), starting at 1,891 px at 100%. `stepSize` is called only from the drawer: no palette command, no Ctrl+= / Ctrl+- / Ctrl+0.
3. `src/styles/kit.css:25`: `html { font-size: calc(16px * var(--to-doc)) }` ignores the browser's default size and iOS Larger Text.
4. `src/styles/responsive.css:195-199`: `.to-burger` is at opacity 0.55 while editing, which measures 1.35:1 over a line of words, with no edge. It is the only way to the menu.

## The design

- **Size and theme are preferences that leave no trace of a document**, like the language. zoom.ts reads and writes `tinyoffice.size` straight to localStorage in both states, wrapped in try/catch as i18n.ts does. The theme does the same with `to-theme`. Both are added to `store.ts`'s `ours` exemption beside KEEP and lang. Forget everything (r16-honest) still clears them. If Paul answers otherwise, this is a one-line change back.
- **Commands.** Register 'Everything larger', 'Everything smaller' and 'Normal size' in kit/commands.ts, each calling stepSize, with NO key chords: Ctrl+=, Ctrl+- and Ctrl+0 are the browser's own zoom keys and a keyboard user keeps them (the synthesis proposed Mod+= and was overruled). The palette then finds 'larger' and 'size', and commands-graph covers them. Add the strings to en.ts.
- **The stepper moves up**, into the drawer's head row beside Language and Theme, or as the first item after it.
- **The person's own size is the 100%.** `html { font-size: calc(100% * var(--to-doc)) }`, with `--to-nav-font` following it. On iOS, when nothing is stored, zoom.ts reads a probe with `font: -apple-system-body` once and uses its size ÷ 17 as the starting size. BASE still multiplies it.
- **The menu button stays opaque when the person asked for more.** applySize puts `data-large` on the root when size() > 1. Under `[data-large]` and under `@media (prefers-contrast: more)`, the editing burger has opacity 1. Everywhere else it gets a 1px `var(--to-border-strong)` edge.
- **Toasts stay long enough to read**: max(4000, 1500 + 60 × characters) ms, paused while a pointer is on them.

## Where

`src/kit/zoom.ts`, `src/kit/store.ts`, `public/theme.js` and `src/kit/theme.ts`, `src/kit/commands.ts`, `src/kit/keys.ts`, `src/kit/drawer.ts`, `src/styles/kit.css`, `src/styles/responsive.css`, `src/styles/a11y.css`, `src/kit/toast.ts`, `src/i18n/en.ts`, and one line in `docs/threat-model.md` naming the two extra keys.

## Proof

- `test/zoom.test.ts`: with Private on, after keepSize(2) and a fresh module load, size() === 2.
- `test/commands.test.ts` and the commands graph cover the three commands, and none of them has a key.
- Browser test files share one origin's localStorage and run at once. Now that size and theme are written there, every test that counts preferences (`test/browser/privacy.test.ts`'s 'What this device holds' row, which the Korean merge loosened to `/^[12] set$/`) must first remove every key of `PREFS` and then assert the exact count of the keys it set itself; put the loosened regex back to an exact string. Each test file that sets a size or theme removes it in afterEach.
- A browser test: with the root's default font at 20px, size 1 draws a rem of 20 × BASE.
- `e2e/focus-phone.spec.ts`: at SIZE_MAX, the editing `.to-burger` has a computed opacity of 1.
- `test/browser/toast.test.ts`: a 100-character message is still shown at 5 s.

## Not this

- No change to NAV_MAX or SIZE_MAX, and browser pinch stays off. Those are questions for Paul.
- Documents are not kept: only the two preferences.