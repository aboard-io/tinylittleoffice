# R18-password: the app makes every password

**Paul, 2026-10-11:** *"Only you can generate passwords for users. That keeps them secure."* Today the password dialog (`src/kit/privacy-dialog.ts` renderPassword) has two typed fields, a strength line from r16-signed (`guessable` in `src/kit/passwords.ts`) and a 'Generate a strong password' button that fills both. From now on nobody types a password to set one: the app makes it, shows it once, and the person copies it and sends it another way than the link. Typing stays only where it must: entering a password to open a sealed document.

## The design

- **Setting a password.** The dialog shows one password the app made (`generatePassword()`: four groups of five, as now), large, in a read-only box with Copy beside it and 'Make another' under it; a line: 'Copy this and send it another way than the link. It cannot be shown again.' Set password seals the document with it. No typed field, no confirm field, no strength line (`guessable` and its string go, in all 19 language files; keep the generator's test). The Copy button's toast is spoken (r16-voiceover).
- **Changing a password** is the same dialog with a new one made; 'Remove the password' stays.
- **Opening a sealed document** is unchanged: a typed field (the recipient types what they were sent), the cut-short message from r16-signed stays.
- **The API and the CLI** make the password too: `link(app, text, { seal: true })` returns `{ url, password }` (the generated one), and `tinyoffice link --seal` prints the link and the password on a second line; a `password:` option from outside is refused with the sentence 'The app makes the password; ask for one with seal.' The skill and llms.txt say so. docs/crypto/password.md keeps its analysis and notes that only generated passwords exist from this date; docs/threat-model.md's password row follows; docs/editing.md's privacy section too.

## Proof

- `test/browser/privacy.test.ts` (browser-alone): the dialog has no writable password field; Set seals with the shown password and that password opens the document; Make another changes it; Copy puts it on the clipboard and the toast is said.
- `test/api.test.ts` and the CLI test: `seal` returns a password that opens the link; a supplied `password` is refused.
- `test/passwords.test.ts` keeps the generator's entropy check (at least 100 bits).

## Not this

- No change to the sealing crypto or the sealed link's format.
- No password manager integration beyond the clipboard.
