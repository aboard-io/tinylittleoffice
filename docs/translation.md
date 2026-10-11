# Translation: the plan

Ten languages at launch: English, Mandarin Chinese, Hindi, Spanish, French, Arabic, Bengali, Portuguese,
Russian and Urdu. Two of them, Arabic and Urdu, run right to left. The aim is not a translated English
site but a site that feels native in each: its words, its numbers and dates, its direction, its type, its
keyboard, and its screen reader. This is the plan; nothing here is built yet.

## 1. What is already in place

- Every string a person sees goes through `t()` (src/kit/i18n.ts). English is the key; `src/i18n/en.ts`
  is the list of every key, by section, hand-edited; `npm run i18n:check` fails on a key that is missing or
  unused. About 1,100 keys today, with placeholders (`{name}`) and plurals (`{n|one slide|# slides}`).
- A language is one file, `src/i18n/<code>.ts`, loaded lazily when chosen; the browser's language picks the
  nearest at first visit, the hamburger's Language menu overrides, and the choice is kept under Saved.
- `Intl` does the rest: `PluralRules` chooses the plural form, `NumberFormat` writes numbers,
  `DateTimeFormat`/`RelativeTimeFormat` dates, `DisplayNames` names the languages in themselves, `Locale`
  says the direction, and `document.documentElement` gets `lang` and `dir`.
- Templates and sample data are English prose inside `templates.ts` files, not under `t()`.

## 2. The strings: one structured file per language, made by an LLM, checked by people

1. **One source of truth.** `src/i18n/en.ts` stays the list of keys. Each section's heading comment names
   the app or the kit piece, and a short comment above any key whose meaning is not plain ("Keep: a verb on
   a button", "Short link: a noun"). The i18n extractor already keeps sections; add the comments where a
   translator would wonder.
2. **A translation file is generated, not hand-written.** `scripts/i18n-translate.ts` takes `en.ts`, splits
   it by section, and asks the model (Claude, through the API, one section per call, in a fixed prompt with
   the product's voice, the section's comments and a glossary) for that section in the target language,
   with the rules: keep every `{placeholder}` exactly; keep the plural form syntax and give the language's
   own forms in its own order (Arabic has six, Russian four, Chinese one); keep marks like `…` and `▾`; never
   translate app ids, file extensions or keys of the form `{app}`; shorten to fit a bar where the English
   is short. The output is `src/i18n/<code>.ts`, the same shape as `en.ts`, with a header saying it was
   generated on a date from `en.ts` at a commit hash.
3. **Incremental.** The script keeps a `src/i18n/<code>.lock.json` of the English text each key was
   translated from, so a later run translates only new or changed keys and leaves reviewed ones alone.
4. **Glossary first.** `src/i18n/glossary.md`: the product's terms (Tiny Little Office, the app names, the
   nouns, Saved and Private, link, short link, Display Link, template, undo, stage, slide, stop, tape,
   zine…) with the chosen translation in each language and a note on tone (formal/informal address:
   Spanish `tú`, French `vous`, Russian `вы`, Hindi `आप`, Portuguese `você`, Arabic second person
   masculine singular as interfaces do, Urdu `آپ`). The model is given the glossary; a reviewer checks it
   first, since every other string follows it.
5. **Review by people who speak the language.** Each file gets a reviewer pass in a shared sheet made from
   it (a Spreadsheet document, naturally: key, English, translation, note): they correct in the sheet, and a
   script writes the sheet back into the file and marks those keys reviewed in the lock file. Until a
   language has been reviewed, the Language menu shows it with "(machine translated)" after its name.
6. **Tests.** `test/i18n.test.ts` loads every language file and checks: same keys as `en.ts`; every
   placeholder of the English present in the translation; plural forms valid for the language's
   `Intl.PluralRules` categories; no string longer than 2.5× the English (a flag, not a failure, written to
   a report); no untranslated English left where the language differs (a heuristic list of English words,
   excluding the glossary's kept names). The i18n-switch browser test opens every language once and checks
   the page renders, the direction is right and the bar is one row.

## 3. Templates and sample data

Templates are the part that must feel native, and the part the extractor cannot see.

1. **Templates become documents per language.** Each `templates.ts` exports its list through a function
   that takes the language code; the English documents stay as they are; `src/apps/<id>/templates/<code>.ts`
   holds the same ids with the document text in that language. Names, blurbs, the words inside (a letter, a
   résumé, meeting notes, a budget's categories, a zine's pages), the sample people, places, currencies and
   dates are rewritten for the language's world, not translated word for word: a Hindi invoice is in rupees
   with GST, a French letter has its formules de politesse, a Brazilian budget has real names and R$, an
   Arabic calendar template shows the Hijri month beside the Gregorian (`Intl.DateTimeFormat` with the
   `islamic-umalqura` calendar). The model writes the first draft from the English template plus a brief for
   the language; a reviewer edits it in the app itself (it is a document) and the saved text goes back into
   the file: templates are reviewed as documents, not as strings.
2. **Byte-stable in every language.** The corpus test runs every language's templates through parse/write.
   Template bodies in RTL languages are tested for the bidi cases that bite: a Latin number or URL inside an
   Arabic line, a list marker before RTL words, a table of mixed cells.
3. **Formats inside documents follow the language.** Numbers typed into a sheet are read with the
   language's separators (the formula engine already uses `Intl` for the CSV separator; it must also read
   `1.234,56`), dates in the calendar are read and written in the language's order where the document's own
   format is loose, and the money type's symbol follows `Intl.NumberFormat` with the document's currency.

## 4. Right to left, properly

Arabic and Urdu are the two RTL languages; mirroring is not enough, and some things must not mirror.

1. **Logical CSS everywhere.** The ninety-odd physical properties in src/styles and the apps' stylesheets
   (`margin-left`, `padding-right`, `left:`, `text-align: left`) become logical ones (`margin-inline-start`,
   `padding-inline-end`, `inset-inline-start`, `text-align: start`), and a stylelint rule
   (`stylelint-use-logical`) keeps them that way. Grid and flex already flip with `dir`.
2. **`dir` on the root from the language**, and `dir="auto"` on every box that holds a person's words (the
   editor, titles, cells, labels), so a Latin name inside an Arabic document, or an Arabic sentence in an
   English one, lays out right. The `<to-text>` editor gets `dir="auto"` per block, so a document can mix
   directions line by line, and its caret movement and Home/End follow the block's direction (the browser
   does this; we only need to stop assuming "left is start" in `textops` and in selection rectangles).
3. **What mirrors and what does not.** Navigation, bars, menus, the drawer, back/forward arrows, indent and
   outdent, chevrons, list bullets, the rail of slides, the Outliner's tree and its handles, the sheet's row
   numbers (inline start) and column order (A at the start): all mirror. What does not: clocks, media controls,
   charts' axes, the calendar's week order (it follows the locale's first day but days run start to end), a
   drawing's canvas, a map, the QR code, checkmarks, the brand mark, and icons that depict a real object. Lucide
   icons that are directional get a list (`src/kit/icons.ts`: `MIRRORED`) and are drawn with `transform:
   scaleX(-1)` under `[dir=rtl]`; the rest stay.
4. **Keys.** Arrow Left/Right keep their physical meaning (as native apps do) but "forward/back" in the
   standard's words means inline start/end: Tab, Shift+Tab, Mod+Alt+Left/Right across columns, and the
   contextual bar's Move left/right act in logical terms and their labels say "earlier/later" in RTL
   languages. docs/editing.md gets a §10 on direction.
5. **Numbers and digits.** Arabic and Urdu users expect their language's digits in prose (`Intl.NumberFormat`
   gives them) but Western digits in formulas, references (`B2`), addresses, codes and dates typed into a
   sheet; the sheet shows cell values in the locale's digits and keeps the raw text Western. Bidi-safe
   rendering of mixed strings uses `Intl` formatting plus `<bdi>` around names and URLs in the page views
   and the SVG pages (`unicode-bidi: isolate`).
6. **The SVG pages and exports.** The drawn pages (`view()`) take the direction too: text anchors flip
   (`text-anchor: end` at the inline start), tables lay columns from the start, and the PDF print, PPTX
   (`<a:bodyPr rtl="1">`), DOCX (`<w:bidi/>`), HTML (`dir`), and the CSV/XLSX writers carry it.

## 5. Type and the keyboard

- **Fonts.** The site's one font stack gains a per-script stack chosen by `lang`: Noto Sans (Devanagari,
  Bengali, Arabic, Urdu's Nastaliq is a choice: Noto Nastaliq Urdu is the native expectation but heavy;
  Noto Naskh Arabic as the fallback), Noto Sans SC for Chinese, system fonts first on every platform
  (`-apple-system`, `Segoe UI`, `Noto Sans …`) with the Noto subsets as self-hosted woff2 under
  `public/fonts/` only for scripts the device lacks. Line height and the 16px
  rule are revisited per script (Devanagari and Nastaliq need more leading; Chinese needs none of the
  letter-spacing).
- **The SVG pages** embed the same fonts' metrics for wrapping: `kit/draw.ts`'s `textWidth` needs
  per-script width tables (measured once from the fonts, generated by a script) so a Hindi line wraps where
  the browser wraps it.
- **Input.** IME composition is already handled once in `<to-text>` (Chinese, and the predictive keyboards
  of every language); the sheet's cells and the Draw labels get the same read-at-compositionend rule (noted
  in the audit). Spell-check and autocapitalise attributes follow `lang`.
- **Sorting and search.** `Intl.Collator` for every sort (the sheet's column sort, the hamburger's find,
  the library), with `sensitivity: 'base'` and numeric collation.

## 6. Accessible in each language

- `lang` on the root and on any element whose language differs from the page (a quoted English product
  name inside Hindi UI gets `lang="en"`), so screen readers switch voices.
- Every `aria-label` and every `title` goes through `t()` already; the audit of names continues per language
  with the i18n test flagging a label that still equals its English.
- Screen-reader order in RTL follows DOM order, which stays logical, so nothing changes; the focus ring and
  the skip link are checked in the RTL e2e run.
- The e2e smoke runs axe in each language once (the browser test already does for English); contrast does
  not change, but text overflow does: the phone run checks no bar wraps and no label is clipped in the two
  longest languages (Russian and Portuguese) and the two RTL ones.
- Pluralisation and gendered words: the plural syntax covers forms; where a language genders a noun by the
  app ("Untitled document" vs "Untitled presentation"), the string is per noun already (`Untitled {noun}` is
  rewritten as separate keys for the languages that need agreement: the script asks the model to flag such
  keys and the key is split).

## 7. Order of work, and what to decide

1. Logical CSS and `dir` plumbing (one agent, kit-wide, stylelint rule): no visible change in English.
2. The glossary, the comments on ambiguous keys, the translation script and its tests; Spanish first as the
   proof (closest to English, easy to review), then Arabic (the RTL proof), then the other eight.
3. Mirrored icons list, the keys' logical meaning, the SVG pages' direction, the exports.
4. Fonts per script, measured width tables.
5. Templates per language, reviewed as documents.
6. The Language menu loses "(machine translated)" per language as reviews land.

Decisions for Paul: formal or informal address per language (the plan proposes the common interface
choice above); Nastaliq or Naskh for Urdu; whether a language goes live machine-translated with the label
or waits for its review; and who reviews (the sheet-based review needs one speaker per language for about
a day each).

## 8. The second nine: New York's languages (2026-10-11)

Nine languages join the first nine (es, fr, de, pt-br, it, nl, ja, zh-hans, ar): **Russian (`ru`), Ukrainian
(`uk`), Polish (`pl`), Bengali (`bn`), Hindi (`hi`), Urdu (`ur`), Haitian Creole (`ht`), Korean (`ko`) and
Traditional Chinese (`zh-hant`)**. They are New York City's designated citywide languages (Local Law 30) with
Hindi and Traditional Chinese added, and Ukrainian (Paul: "make sure the major languages of NYC are addressed and
colloquially appropriate for the communities here", "Ukrainian too please"). Each is written for the people of
that community in the city, in the words they use on their phones, not for a textbook.

What the tree does for them before a word is translated:

- **Listed and named in itself.** A file `src/i18n/<code>.ts` is enough to be listed. The drawer's picker
  names each language in itself, its first letter capitalised as a menu begins it (Русский, Українська, Polski,
  বাংলা, हिन्दी, اردو, Kreyòl ayisyen, 한국어, 繁體中文), and orders them by those names under the root collation:
  English first, then the Latin names A to Z, then Cyrillic, Arabic, Devanagari, Bengali, Hangul and Han, so a
  reader finds theirs among their own script. Intl has no name for Haitian Creole in itself yet; `NATIVE` in
  kit/i18n.ts gives it.
- **Found from the browser.** Each code is matched as itself (`ru-RU` finds `ru`); a Chinese tag finds its script
  through `Intl.Locale(...).maximize()`: `zh-TW`, `zh-HK`, `zh-MO` and `zh-Hant-*` are `zh-hant`; `zh-CN`, `zh-SG`,
  `zh-Hans-*` and `zh` alone are `zh-hans`.
- **Plurals.** Russian, Ukrainian and Polish have four forms (one, few, many, other: Polish 21 is *many*, Russian
  and Ukrainian 21 is *one*); Bengali, Hindi, Urdu and Haitian Creole two; Korean and Chinese one.
  `npm run i18n:gaps -- <code>` writes every plural with the forms the language needs and a comment naming them,
  and works before the file exists (every key, the start of the file); a line pasted in untranslated is still
  English to `i18n:check`.
- **The glossary lint by script** (test/glossary.ts): Cyrillic and Latin by stem; Hindi and Bengali by stem in
  letters as a reader counts them (a vowel sign or a virama stays on its consonant); Korean by its first
  syllable block or two (the particle comes off: 링크를 is 링크); Traditional Chinese by character pair; Urdu by
  Arabic root or by stem (its Persian, Hindustani and English words are not Arabic roots).
- **Type for the measuring tests.** The box has `fonts-noto-core`, `fonts-noto-cjk` and `fonts-noto-extra`;
  test/browser/fonts.ts names the Noto of each script, the label-width test measures each language's words in
  it, and `kit/draw.ts`'s `textWidth` has a width per script (Cyrillic, Arabic, Devanagari, Bengali, Hangul,
  Han and kana; a combining mark adds nothing), held within a tenth of Chromium by test/browser/metrics.test.ts
  on words Intl writes in each language. `/etc/fonts/local.conf` keeps DejaVu Sans the box's Latin sans-serif,
  as it was before Noto Sans arrived with the rest.

What is particular to each, for the translator:

- **Russian.** The formal `вы` as interfaces use it; the infinitive on buttons and menus (Копировать,
  Поделиться), throughout. Long:
  check the bar and the menus at 390px.
- **Ukrainian.** Its own translation from the English, never a transliteration or an adaptation of the Russian
  file: its own words (посилання, never a calque of the Russian ссылка), the 2019 orthography, `ви`.
- **Polish.** Four forms with *many* for 5 to 21 and 25 to 31 alike; the infinitive or the imperative on
  buttons as Polish office suites do (Kopiuj, Udostępnij), consistently.
- **Bengali.** As the city's Bangladeshi community writes it (standard Bangla, Bangladesh usage). Intl writes
  Bengali digits (১২৩) in counts; that is right in prose.
- **Hindi.** Everyday Hindi of the interfaces people use (लिंक, फ़ाइल, टेम्पलेट where those are the words), not a
  Sanskritised register; `आप`. Western digits, as Intl gives by default.
- **Urdu.** Right to left, like Arabic (`dir` follows from `directionOf`, and everything the Arabic round made
  logical holds); written in Nastaliq where the device has it (iOS draws Urdu in Noto Nastaliq Urdu, and the
  label-width test measures in it; Android draws Naskh), which is taller and wider than Naskh: keep labels short.
  `آپ`; Western digits. Whether the stylesheet asks for Nastaliq itself is Paul's decision (§7).
- **Haitian Creole.** The official orthography of 1979: every sound written one way (Kreyòl, not *Créole*;
  *-syon*, not *-tion*; *k*, not *qu*; `ou`, `yo`), no French spellings, as the city's Haitian community reads it
  on its signs and forms. Intl has no Kreyòl months or names, so dates fall back to
  English month names inside the language's own words; say a date with numbers where it matters.
- **Korean.** `합니다`-style polite forms on buttons and messages as Korean apps do; one plural form, the counter
  where Korean uses one (파일 3개).
- **Traditional Chinese.** Its own translation for the Hong Kong and Taiwan usage of the city's Cantonese- and
  Taiwanese-speaking communities, never a character conversion of the Simplified file: the words differ
  (檔案 not 文件 for a file, 連結, 範本, 投影片, 試算表), and the punctuation is full-width with 「」 for quotes.
