# R17-copies: a link is a copy, and Share says so in every language

**Paul, 2026-10-11:** *"For the fact that docs are not collaborative like Google Docs: that's fine. Communicate it in all the languages."* The mutual aid group sent a sign-up sheet to twenty people and got twenty copies back; the teacher thirty hand-ins; the Apple reviewer found that nobody is told their edits make a new link the sender never sees.

## The design

- **One sentence in Share**, under the link, before the ways of sending it: 'Whoever opens this link gets their own copy. Changes they make are in their link, not in yours: ask them to send theirs back.' The same sentence in the Display Link's header when someone arrives by a link that is not their own (the shell knows: a document opened from a link rather than made here, i.e. not in the library and not just made), shown once per document as a dismissable line, not a dialog.
- **In the threat model and About**, one line each: the product has no shared document; every link is a copy.
- **In all 19 language files**, in each language's own voice (the glossary's), not a word-for-word rendering: a Haitian Creole or Bengali reader should hear how their community would say it.
- **The skill** (`skill/tinyoffice/SKILL.tpl.md`) says it in its sharing section so an agent never promises collaboration.

## Where

`src/kit/share-dialog.ts`, `src/kit/shell.ts` (the display header's line), `src/kit/drawer.ts` (About), `src/i18n/*.ts`, docs/threat-model.md, `skill/tinyoffice/SKILL.tpl.md` and `npm run skill`.

## Proof

- `test/browser/share.test.ts`: the sentence is in the dialog; `test/browser/display.test.ts` (or shell): a document arrived at by link shows the line once; one made here does not.
- `npm run i18n:check` and label-widths green; the glossary test passes for each language.

## Not this

- No merging, comparing or gathering of copies.
