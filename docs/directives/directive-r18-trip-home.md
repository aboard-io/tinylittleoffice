# R18-trip-home: the map opens where the person is likely to be

**Paul, 2026-10-11:** *"Always open the map on the country for the language or New York City if you don't know where."* An empty Trip Planner opens on the whole world today (`src/apps/trip/editor.ts`: `setView([25, 0], 2)`), and a person's first act is to pinch their way home. A trip with stops still fits its stops, as now; this is about the view before the first stop, and the view the locate button leaves when the device refuses.

## The design

- **The country comes from the language.** The site's language is known (`src/kit/i18n.ts`, the language in the link or the browser's). The browser's full locale carries a region when the person has one set (`navigator.languages`: `es-MX`, `fr-CA`, `en-GB`, `pt-BR`): where the first locale whose language matches the site's language names a region, that region is the country. Where it does not, the language's home: `ar` Egypt, `bn` Bangladesh, `de` Germany, `es` Mexico, `fr` France, `hi` India, `ht` Haiti, `it` Italy, `ja` Japan, `ko` South Korea, `nl` the Netherlands, `pl` Poland, `pt-br` Brazil, `ru` Russia, `uk` Ukraine, `ur` Pakistan, `zh-hans` China, `zh-hant` Taiwan. Where the country is not known, or the language is English with no region or with the region US, the map opens on New York City at the city zoom the locate button uses (`CITY`). Paul chose the homes above for the most speakers rather than the name; a reviewer who would argue says so in the report and leaves them.
- **A country is a center and a zoom.** `src/apps/trip/countries.ts`: one compact table, every ISO 3166-1 country code to a center and a zoom that shows the country whole on a phone (a bounding box fitted at 390 by 500), generated once by `scripts/countries.ts` from a public-domain source (Natural Earth's admin-0 bounding boxes, public domain; the script says where it read them and is committed; the data file is committed and the script is not run by the build). Under 8 KB in the trip chunk, which is lazy. The table says the country by code only; names never appear (no strings to translate).
- **One rule for the first view.** `homeView(language, locales): { lat, lon, zoom }` in `src/apps/trip/model.ts` or beside it, pure, tested; the editor calls it when the trip has no stops at open, and when the locate button's geolocation is refused or fails (today the map stays where it was). A trip opened from a link with stops never calls it.
- **The hint under the map** (`trip-privacy`) is unchanged; the map's tiles still come from OpenStreetMap only while the map is shown.

## The two walk failures (found on main by r17-plex's long walks)

- A Leaflet pin slid out of view (the stop list's hidden row) is not inert: it is still reachable by keyboard and by the walk. Make the hidden state `inert` or remove the marker's tab stop, whichever the pin's own code reaches for; a test walks the list.
- Focus is left on `.to-keyboard-hold` after an action; the walk finds a focused element that is not visible. Find the action, return focus where the editing standard (`docs/editing.md`) says, and a test holds it.

## Proof

- `test/trip-home.test.ts` (unit): the rule for every language with no region; regions override (`es-AR` Argentina, `fr-CA` Canada, `en-GB` the United Kingdom, `de-AT` Austria); English with no region, `en-US`, and an unknown code give New York City; every language's home exists in the table; the table has every ISO code and each zoom shows its box inside 390 by 500 at that zoom (the Web Mercator arithmetic in the test).
- `test/browser/trip.test.ts`: a blank trip in a page with language `ja` and no region opens on Japan (the map's center within a degree of the table's); with stops, on the stops; the locate button refused leaves the home view.
- The walks test green for the trip.

## Not this

- No geolocation without the button; no IP lookup; no stored "last place".
