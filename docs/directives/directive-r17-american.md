# R17-american: the product's English is American

**Paul, 2026-10-11:** *"American English."* The review found en.ts saying Colour, postcode and programme while the paper default is Letter; the templates use 07700 phone numbers, postcodes, nappies, the Co-op and `zone: Europe/London` in eight of nine calendar templates, so a Bronx rota shows the 5:30 pm shift at 12:30.

## The design

- **en.ts in American English.** Every string: color, center, organize, favorite, gray, license (noun), program, ZIP code, cell phone, parentheses, period (not full stop), and the rest; a careful read of all 1,700, not a search for -our. The keys are the English strings, so each changed key is changed in all 19 language files (the translations themselves do not change); `npm run i18n:check` holds.
- **Templates for New York.** Every template's sample content is American and New York where it is placed: US phone numbers in the 555 range, ZIP codes, dollars where a currency shows, nappies become diapers, the Co-op a bodega or a supermarket, the lollipop lady a crossing guard, and so on through every app's `templates.ts`; docs/templates.md follows. The Trivia template's prize and the Trip Planner's pub crawl: a classroom will see these, so the prize is a gift card and the crawl is a food crawl (Paul did not rule on these; this is the least change that fits a classroom).
- **Time is the reader's.** No calendar template carries `zone:`; a document with no zone is read in the reader's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and says so where the calendar shows its zone. A document that names a zone keeps it. The Trip Planner's templates the same.
- **Paper** stays Letter by default; the A4 option stays.
- **The English voice document** (`docs/translation.md` §2 or wherever the glossary's English is described) says American.

## Where

`src/i18n/en.ts` and the 18 siblings (keys), every `src/apps/*/templates.ts`, `src/apps/cal/model.ts` (the reader's zone), `src/apps/trip/model.ts`, docs/templates.md, docs/translation.md, the skill via `npm run skill`.

## Proof

- A node test that greps en.ts and the templates for a list of British spellings and British sample words (colour, centre, organise, postcode, programme, nappies, 07700, Europe/London) and finds none.
- `test/i18n.test.ts`: every language file has every key (the check), and no English string is British.
- `src/apps/cal/tests`: a template with no zone opened in America/New_York shows its 17:30 event at 5:30 PM; a document with `zone: Europe/London` still shows its own.

## Not this

- No change to the translations' meaning, and no US-only assumptions in the kit (dates stay by Intl and the reader's locale).
