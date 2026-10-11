# Translation

Tiny Little Office speaks nineteen languages: English, Arabic, Bengali, Chinese (Simplified and Traditional),
Dutch, French, German, Haitian Creole, Hindi, Italian, Japanese, Korean, Polish, Portuguese (Brazil), Russian,
Spanish, Ukrainian and Urdu. Arabic and Urdu run right to left. The aim is not a translated English site but one
that reads as if it were written in each: its words, its numbers and dates, its direction and its type. The first
plan for this, before it was built, is [history/translation-plan.md](history/translation-plan.md).

## Strings

- Every string a person sees goes through `t()` (`src/kit/i18n.ts`). English is the key; `src/i18n/en.ts` is the
  list of every key, by section, edited by hand, with a comment above any key whose meaning is not plain ("a verb
  on a button", "a noun"). Placeholders are `{name}`; plurals are `{n|one slide|# slides}`, the forms in the
  language's own order (Arabic has six, Russian, Ukrainian and Polish four, Chinese, Japanese and Korean one).
- A language is one file, `src/i18n/<code>.ts`, the same shape as en.ts, loaded only when it is used. Its head
  says, in that language, the voice it keeps: the form of address (French `vous`, Spanish `tú`, Russian `вы`,
  Hindi `आप`, Urdu `آپ`), its quotation marks and spacing, and how buttons are worded.
- A string added or changed in en.ts is translated into all eighteen other files in the same change.
  `npm run i18n:gaps -- <code>` prints, ready to paste, every line a language lacks, with the plural forms that
  language needs, and offers an old translation as a draft where a key changed a little. `npm run i18n:check`
  fails on a key the code uses that en.ts lacks, a key en.ts has that nothing uses, a placeholder that does not
  match, or a language file missing a key.
- The English is American (Paul, 2026-10-11): color, center, organize, favorite, gray, license, ZIP code, cell
  phone, and the Letter paper that is the default. `test/american.test.ts` holds en.ts and every template to a
  list of British spellings and words (`test/british.ts`); the README and the docs are held to the same list.
- Templates and their sample content are English, written in each app's `templates.ts`, set in New York where
  they are set anywhere, and not under `t()`.

## Checks

- **The glossary** (`test/i18n-glossary.test.ts`, `test/glossary.ts`): each product term (the app names, Share,
  Saved and Private, link, short link, Display Link, template, slide…) is said one way in each language. A term
  with two words for it, or a short label that says it another way, fails, naming the term and the keys. Words
  are matched by stem in Latin and Cyrillic, Hindi and Bengali (counted in letters as a reader sees them), by the
  first syllable block or two in Korean (a particle comes off), by a pair of characters in Chinese and Japanese,
  and by root in Arabic; Urdu by root or by stem.
- **The room each label has** (`test/browser/label-widths.test.ts`): every command's words, in every language,
  measured in the font they are drawn in against the room their place gives them (a bar button, a menu row at
  390 pixels, a dialog's button). A label that does not fit is shortened in that language.
- **Every language drawn** (`test/browser/i18n-switch.test.ts`, `test/browser/languages.test.ts`): each opens,
  takes its direction, keeps the bar to one row, and lays the menu out at a phone's width.
- **Widths for the drawn pages** (`test/browser/metrics.test.ts`): `kit/draw.ts`'s `textWidth`, which wraps
  words on the SVG pages, has a width per script (Latin, Cyrillic, Arabic, Devanagari, Bengali, Hangul, Han and
  kana), held within a tenth of the browser's own.

## Choosing a language

The browser's language chooses the nearest one: each code is matched as itself (`ru-RU` finds `ru`), and a
Chinese tag finds its script through `Intl.Locale(…).maximize()` (`zh-TW`, `zh-HK`, `zh-MO` and `zh-Hant-*` are
Traditional; `zh-CN`, `zh-SG`, `zh-Hans-*` and `zh` alone are Simplified). The menu's Language list names each
language in itself (Русский, Kreyòl ayisyen, 繁體中文), English first and then by script, so a reader finds
theirs among their own.

A language chosen in the menu goes into the link, as `?lang=ht` after the document (`#/?lang=ht` on the home
page), so every link the page makes from then on opens in it: the editing link, the Display Link, a deck's show
link, the QR code. Choosing the browser's language takes it out. Nothing is written to the device for the
language, under Private or Saved (Paul, 2026-10-11: "Why are we writing language at all instead of encoding the
parameter in the link?"). The API's `link(app, text, { lang })` and the command line's `--lang` make a link that
opens in a language.

`Intl` does the rest: `PluralRules` chooses the plural form, `NumberFormat` writes numbers, `DateTimeFormat`
and `RelativeTimeFormat` write dates, `DisplayNames` names the languages, and `Locale` says the direction, which
goes on the page's root as `dir` with `lang`.

## Type

The type is IBM Plex, served by the site (`public/fonts/`, `src/styles/fonts.css`): Plex Sans for Latin, Greek
and Cyrillic, Plex Sans Arabic for Arabic and Plex Sans Devanagari for Hindi, each face loaded only when a page's
words need it. Bengali, Korean, Japanese and Chinese are drawn in the device's own type. Urdu is set in Nastaliq,
the device's own (Noto Nastaliq Urdu on iPhone and Android, Urdu Typesetting on Windows), with Naskh after it,
since Urdu's readers read Nastaliq and Naskh reads to them as a foreign typesetting; Nastaliq is taller, so Urdu's
lines are given more leading.

## For a translator

Each language is written for the people who use it, in the words they use on their phones, not for a textbook.
Most of the second nine (Russian, Ukrainian, Polish, Bengali, Hindi, Urdu, Haitian Creole, Korean and Traditional
Chinese) are New York City's designated citywide languages, written for those communities in the city.

- **Russian:** `вы`; the infinitive on buttons and menus (Копировать, Поделиться). Long: check the bar and the
  menus at 390 pixels.
- **Ukrainian:** its own translation from the English, never an adaptation of the Russian file: its own words
  (посилання), the 2019 orthography, `ви`.
- **Polish:** four plural forms, *many* for 5 to 21 and 25 to 31 alike; the infinitive or the imperative on
  buttons as Polish office suites do (Kopiuj, Udostępnij), consistently.
- **Bengali:** standard Bangla as the city's Bangladeshi community writes it; Bengali digits in counts, as Intl
  writes them.
- **Hindi:** the everyday Hindi of the interfaces people use (लिंक, फ़ाइल, टेम्पलेट where those are the words),
  not a Sanskritized register; `आप`; Western digits.
- **Urdu:** right to left; `آپ`; Western digits; set in Nastaliq (above).
- **Haitian Creole:** the official orthography of 1979 (Kreyòl, *-syon*, *k*, `ou`, `yo`), no French spellings.
  Intl has no Kreyòl months, so dates fall back to English month names; say a date with numbers where it matters.
- **Korean:** `합니다`-style polite forms on buttons and messages; a counter where Korean uses one (파일 3개).
- **Traditional Chinese:** its own translation for the Hong Kong and Taiwan usage of the city's communities,
  never a character conversion of the Simplified file (檔案, 連結, 範本, 投影片, 試算表), with full-width
  punctuation and 「」 for quotes.
