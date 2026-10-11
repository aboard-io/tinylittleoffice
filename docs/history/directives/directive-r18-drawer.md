# R18-drawer: the hamburger, in Paul's order

**Paul, 2026-10-11**, on the menu behind the hamburger (`src/kit/drawer.ts`, `<to-drawer>`), verbatim:

> Make dropdowns the same height as buttons. They look odd. Don't say "Match the Device" for language. Say "Default: [Language Name]" in the right language. Put the private/saved toggle right below that. For Private vs Saved on this device change to "Save in browser" default off. When untoggled, the text reads "Turn on to save files in your browser." When toggled, the text reads "Turn off to remove all files and settings." THEN the zoom. But cut the text that says "Size of everything." No text. Get rid of the privacy section entirely from the hamburger. Get rid of keyboard shortcuts button. Move the command search palette from the nav to here. THEN list the apps when not on the home page. Theme: "Match device". Cut the text from About to nothing, we'll write a few lines later.

## The order, top to bottom

1. **Language.** The select, with its first option `Default: {name}` where `{name}` is the device's language named in itself (`languageName` in `src/kit/i18n.ts`, the language `navigator.languages` resolves to among ours, the way the site picks it with no choice made): "Default: English", "Default: Français", "Default: اردو". The word Default is the site's string, translated in every language; the name is never translated. "Match the device" goes from the language select everywhere.
2. **Save in browser.** The switch that was Private / Saved on this device, now labelled 'Save in browser', off by default (the stored default is already private; check it, a test). Under it one line: off, 'Turn on to save files in your browser.'; on, 'Turn off to remove all files and settings.' Turning it off does what Private did (the confirm and the forgetting of `keeping()` stay, with the confirm's words brought to these: 'Remove all files and settings from this browser?'). The toasts 'Saved on this device from now on' and 'Private: nothing saved' become 'Saving in this browser' and 'Nothing saved in this browser'. Every other place that says Private or Saved on this device for this setting (the home page's rows heading, the privacy page, the About copy, the skill, llms.txt, docs) says Save in browser, on or off.
3. **The size stepper**, with no words beside it: the icon and the stepper, `aria-label` 'Size of everything' kept for the screen reader only. The string 'Size of everything' stays as that label.
4. **Find a command.** The command palette's button leaves the bar's end (`src/kit/bar.ts` and wherever `showPalette` is offered in the chrome; Mod+K keeps working) and sits here as a drawer button 'Find a command…' with its keys written at the row's end, opening the palette as the bar's button did.
5. **The apps**, as the drawer lists them today, only when the page is not the home page.
6. **This document** (Share, Download, the app's commands) when a document is open, then Open and Compare: unchanged, below the apps. (Paul's note orders items 1 to 5 and names nothing else; the rest keeps its order after them. Say so in the report so he can move them.)
7. **Theme**, its first option 'Match device'. **Add to home screen** as now. **About**, whose dialog body is empty but for the running commit line, which is data, not copy (Paul: "we'll write a few lines later"); the three paragraphs and their strings go.

Gone: the Privacy button and its section (the Privacy dialog's list of what can leak, `src/kit/drawer.ts` lines 70–74 and the `to-drawer-privacy` button). The dialog itself (`src/kit/privacy-dialog.ts`) stays where the lock beside the title and Share open it; if the drawer was the only way to the Password dialog for a document, a 'Password…' button joins This document. Gone: the Keyboard shortcuts button (`to-drawer-keys`); Mod+/ still opens the shortcuts dialog and the palette lists it.

**Dropdowns the height of buttons.** The language and theme selects (`.to-field select`) take the same height, padding, border radius and font as `.to-btn` in the drawer, in `src/styles/` where the drawer's rules are; measured in a test (`getBoundingClientRect().height` of a select equals a button's, at the default size and at 200%). Native `<select>` stays (no custom dropdown).

## Strings

Every new or changed string in `src/i18n/en.ts` and the eighteen other languages, in each language's own voice, by `npm run i18n:extract` and translation; the removed strings deleted from every language file. `npm run skill` for the generated files; `docs/` sentences that describe the menu follow.

## Proof

- `test/browser/drawer.test.ts`: the order of the sections by their DOM order; the language select's first option text under a stubbed `navigator.languages` of `['fr-CA', 'en']` is 'Default: Français' with the UI in English, and 'Par défaut : Français' with the UI in French; the save switch off shows the first sentence and on the second, and turning it off from on forgets as Private did; no privacy button, no keyboard button; the palette button opens the palette; no palette button in the bar; the About dialog's body has only the version line; select height equals button height.
- The existing drawer, home, privacy and bar tests brought to the new words and places.

## Not this

- No new copy for About. No change to what the save setting stores or forgets beyond the words.
