# R17-lang-link: the language is in the link, not on the device

**Paul, 2026-10-11:** *"Why are we writing language at all instead of encoding the parameter in the link?"* The review asked whether Forget everything should also forget the language (a phone set to Ukrainian or Urdu is itself a trace) and whether a document could open in Kreyòl on a phone set to French. Paul's answer makes both moot: the site writes no language to the device at all. A link may carry the language; otherwise the browser's language decides.

## What is wrong today

`src/kit/i18n.ts` keeps the chosen language in localStorage as `tinyoffice.lang` (`LANG_KEY`), exempt from `store.ts`'s `ours()`, with `forgetLanguage` and a `visit` fallback from r16-honest. The drawer's select calls `setLanguage(code)`, which writes it. The privacy dialog counts it among the preferences. docs/threat-model.md and the Private switch's words name it as the one thing kept.

## The design

- **One parameter, `lang`.** The route (`src/kit/route.ts`) learns `lang=<code>` in the query after the payload, beside `d`, `show`, `s`, `k`, `o`, `x`: `#/v1/write/<payload>?lang=ht`, and on the home page `#/?lang=ht`. `parseHash` returns it; `routeHash` writes it back when set, so every link the shell builds (the address bar, Share's link, the Display Link, the short link's long form, the embed, the deck's show link, the QR) carries the language the page is in **when one was chosen**; a page following the browser's language writes nothing, so a link made by someone who never touched the menu carries no `lang`.
- **The menu's choice rewrites the link.** The drawer's select calls `setLanguage(code)`, which now only switches the dictionary and tells the shell, which puts `lang` into the address with `replaceState` (as it does for the payload) and into everything it builds from then on. Choosing the browser's language removes it. Nothing is written to localStorage, sessionStorage or a cookie: delete `LANG_KEY`, `forgetLanguage`, `visit`, the `ours()` exemption, the preference row's language count, and the words about "only the language you chose" in all 19 language files (r16-honest's switch words lose that clause).
- **Arriving.** A link with `lang` opens in that language (the loader `use(code)` before first paint where the chunk is already in the page's preload list, or after the dictionary loads, with no flash of English: the shell waits for the dictionary as it waits for the app's chunk). A link without it follows `browserLanguage()` as now. Opening a document from the library, a dropped file or a zip keeps the page's current `lang`.
- **The agent's API and the CLI** (`src/api.ts` `link()`, `packages/doc/tinyoffice.ts link`) take an optional `lang` so an agent can make a link that opens in Kreyòl; the skill says so in one line.
- **Docs.** docs/threat-model.md: nothing is written to the device for the language; the link carries it, which means a link says which language its maker chose (one sentence, under what a link reveals). docs/translation.md §1: the parameter. The privacy dialog's row 'Theme, language, …' becomes 'Theme, the name you sign with, the lifetime of short links.' (r16-size keeps size and theme on the device; Paul: "Leave the zoom").

## Where

`src/kit/route.ts`, `src/kit/i18n.ts`, `src/kit/shell.ts`, `src/kit/drawer.ts`, `src/kit/store.ts`, `src/kit/privacy.ts` and `privacy-dialog.ts`, `src/kit/share-dialog.ts` (links built), `src/api.ts`, `packages/doc/tinyoffice.ts`, `src/i18n/*.ts`, `public/llms.txt` and the skill via `npm run skill`, docs as named.

## Proof

- `test/route.test.ts`: `parseHash`/`routeHash` round-trip `lang` with and beside the other parameters; absent when unset.
- `test/browser/languages.test.ts`: choosing Kreyòl in the drawer puts `lang=ht` in the address and in Share's link; choosing the browser's language removes it; `localStorage` has no `tinyoffice.lang` after either; a reload of `#/?lang=ht` is in Kreyòl.
- `test/browser/privacy.test.ts` (browser-alone): the preference count ignores language; after Forget everything no key remains.
- A node test that greps `src/` for `tinyoffice.lang` and finds nothing.

## Not this

- No remembering of the language anywhere on the device, under Saved either.
- No `lang:` in the TLO head: the document is not the one who chose.
