# Dependencies

Every package Tiny Little Office depends on, at the exact version the lockfile holds, with its license, the
native web API it beat and why, and what it adds to the site. The standing rule (Paul, 2026-10-09): the
browser first; a dependency names what it beat. This page is written by `npm run docs:deps`
(`scripts/dependencies.ts`) from package.json, package-lock.json and the reasons in
`scripts/dependencies.json`; a test fails when it is out of date, and the script fails for a dependency
with no reason.

"Adds" is the minified JavaScript the build carries for that package and what it brings, in all its chunks
(its own share in brackets where the two differ); all of it is in the one app file a visit fetches once (the map
runs only in the Trip Planner, mathjs only in the Calculator). It is measured by
`npm run docs:deps -- --sizes`, which builds the site, and moves a little with every build. Nothing is
vendored: every byte of code comes from npm through the committed lockfile; the type's files are IBM's, below.

## Built into the site

| Package | Version | License | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
| `@fluent/bundle` | 0.19.1 | Apache-2.0 | Every string a person sees (src/kit/core/i18n.ts reads src/i18n/<code>.ftl; Paul, 2026-10-15: "Use Fluent"). Intl picks a plural form (PluralRules), writes a number (NumberFormat) and names a language (DisplayNames), and Fluent uses each of them for that; what the browser does not have is a message format: stable ids, a translator's file with comments, and a plural or any other choice written by the translator in the language's own categories, which a hand-rolled syntax had done until then. Part of the one app file. | none (its own: not measured) |
| `d3-sankey` | 0.12.3 | BSD-3-Clause | Sankey charts (src/kit/draw/chart.ts). SVG draws the picture, but no browser API lays out a flow: placing the nodes in columns and relaxing the links so they cross least is the library's whole job. | 10.8 KB (its own: 6.8 KB) |
| `fflate` | 0.8.3 | MIT | The link codec and every zip (src/kit/core/codec.ts, src/kit/file/zip.ts). CompressionStream has no preset dictionary, which makes short documents 20 to 35 percent smaller, is asynchronous, and writes a gzip stream, not a zip archive (.docx, .xlsx, .pptx). | 16.1 KB |
| `lit` | 3.3.3 | BSD-3-Clause | Every element's drawing (the kit and the editors). Custom elements are native; lit adds the drawing of a template again with only its changed parts, which the browser does not do, and reactive properties that ask for it. | 18.1 KB (its own: none) |
| `lucide` | 1.54.0 | ISC | The icons (src/kit/draw/icons.ts). The browser has no icon set and emoji draw differently on every system; Lucide is SVG paths, each a module, and the whole set is in the app file, so a document may name any icon, online or off. | 461.5 KB |
| `maplibre-gl` | 6.14.0 | BSD-3-Clause | The Trip Planner's map (src/apps/trip/editor.ts), drawn from OpenFreeMap's vector tiles. The browser has no map: laying out and drawing vector tiles in WebGL, panning and pinch-zooming them, with markers and a route, is the library's whole job. A file of its own in the build, with its worker and its stylesheet, fetched with the first map and never part of the app file (Paul, 2026-10-15: "hot-load it for that path"). | 900.3 KB |
| `mathjs` | 15.2.0 | Apache-2.0 | The Calculator's units, big numbers and algebra (src/apps/calc/math.ts). The browser's only expression reader is eval, which the page's policy forbids, and Intl formats units without converting them. A custom build, run only by the Calculator. | 469.0 KB (its own: 381.9 KB) |

## What those bring with them

| Package | Version | License | Comes with | Adds |
| --- | --- | --- | --- | --- |
| `@babel/runtime` | 7.29.10 | MIT | `mathjs` | 1.1 KB |
| `@lit-labs/ssr-dom-shim` | 1.6.0 | BSD-3-Clause | `lit` | none |
| `@lit/reactive-element` | 2.1.2 | BSD-3-Clause | `lit` | 6.2 KB |
| `@mapbox/jsonlint-lines-primitives` | 2.0.3 | MIT | `maplibre-gl` | none |
| `@mapbox/point-geometry` | 1.1.0 | ISC | `maplibre-gl` | none |
| `@mapbox/tiny-sdf` | 2.3.0 | BSD-2-Clause | `maplibre-gl` | none |
| `@mapbox/unitbezier` | 1.0.0 | BSD-2-Clause | `maplibre-gl` | none |
| `@mapbox/vector-tile` | 3.0.0 | BSD-3-Clause | `maplibre-gl` | none |
| `@maplibre/geojson-vt` | 6.2.0 | ISC | `maplibre-gl` | none |
| `@maplibre/maplibre-gl-style-spec` | 26.4.4 | ISC | `maplibre-gl` | none |
| `@maplibre/mlt` | 1.3.0 | (MIT OR Apache-2.0) | `maplibre-gl` | none |
| `@maplibre/vt-pbf` | 4.3.2 | MIT | `maplibre-gl` | none |
| `@types/geojson` | 7946.0.16 | MIT | `maplibre-gl` | none |
| `@types/trusted-types` | 2.0.7 | MIT | `lit` | none |
| `bidi-js` | 1.1.0 | MIT | `maplibre-gl` | none |
| `complex.js` | 2.4.3 | MIT | `mathjs` | 11.2 KB |
| `d3-array` | 2.12.1 | BSD-3-Clause | `d3-sankey` | 838 B |
| `d3-path` | 1.0.9 | BSD-3-Clause | `d3-sankey` | 2.0 KB |
| `d3-shape` | 1.3.7 | BSD-3-Clause | `d3-sankey` | 1.2 KB |
| `decimal.js` | 10.6.0 | MIT | `mathjs` | 37.7 KB |
| `earcut` | 3.2.4 | ISC | `maplibre-gl` | none |
| `escape-latex` | 1.2.0 | MIT | `mathjs` | 1.4 KB |
| `fraction.js` | 5.3.4 | MIT | `mathjs` | 9.4 KB |
| `gl-matrix` | 3.4.4 | MIT | `maplibre-gl` | none |
| `internmap` | 1.0.1 | ISC | `d3-sankey` | none |
| `javascript-natural-sort` | 0.7.1 | MIT | `mathjs` | none |
| `json-stringify-pretty-compact` | 4.0.0 | MIT | `maplibre-gl` | none |
| `kdbush` | 4.1.0 | ISC | `maplibre-gl` | none |
| `lit-element` | 4.2.2 | BSD-3-Clause | `lit` | 665 B |
| `lit-html` | 3.3.3 | BSD-3-Clause | `lit` | 11.3 KB |
| `minimist` | 1.2.8 | MIT | `maplibre-gl` | none |
| `murmurhash-js` | 1.0.0 | MIT | `maplibre-gl` | none |
| `pbf` | 5.1.2 | BSD-3-Clause | `maplibre-gl` | none |
| `potpack` | 2.1.0 | ISC | `maplibre-gl` | none |
| `protocol-buffers-schema` | 3.6.1 | MIT | `maplibre-gl` | none |
| `quickselect` | 3.0.0 | ISC | `maplibre-gl` | none |
| `require-from-string` | 2.0.2 | MIT | `maplibre-gl` | none |
| `resolve-protobuf-schema` | 2.1.0 | MIT | `maplibre-gl` | none |
| `seedrandom` | 3.0.5 | MIT | `mathjs` | none |
| `tiny-emitter` | 2.1.0 | MIT | `mathjs` | 877 B |
| `tinyqueue` | 3.0.0 | ISC | `maplibre-gl` | none |
| `typed-function` | 4.2.2 | MIT | `mathjs` | 25.4 KB |

## Type

The type is IBM Plex, and the site serves it itself: no font comes from another host (the policy's `font-src` is
`'self'`). The files are IBM's own release, copied as released into `public/fonts/` with the license beside them
(`public/fonts/LICENSE.txt`, the SIL Open Font License 1.1, OFL-1.1), listed in `scripts/dependencies.ts`
(`FONTS`) and declared in `src/styles/fonts.css`, each face behind its `unicode-range` so a page loads only the
faces its words need. The browser has fonts of its own, but each system's differs in width, so the same words would
fit a slot on one and not on another; Plex is one type everywhere, and the type the box measures in. Hebrew and
Yiddish are drawn in Plex Sans Hebrew; the Serif and Mono looks have no Hebrew face from IBM, so their Hebrew is the
device's, as their Arabic is. Bengali, Korean, Japanese and Chinese are drawn in the device's own type, and Urdu in
its Nastaliq.

| Family | From | Version | License | For | Files |
| --- | --- | --- | --- | --- | --- |
| IBM Plex Sans | `@ibm/plex-sans` | 1.1.0 | OFL-1.1 | The interface and the Sans look | `IBMPlexSans-Regular.woff2`, `IBMPlexSans-Italic.woff2`, `IBMPlexSans-SemiBold.woff2`, `IBMPlexSans-SemiBoldItalic.woff2` (261.7 KB) |
| IBM Plex Serif | `@ibm/plex-serif` | 2.0.0 | OFL-1.1 | The Serif look, and the name on the home page | `IBMPlexSerif-Regular.woff2`, `IBMPlexSerif-Italic.woff2`, `IBMPlexSerif-SemiBold.woff2`, `IBMPlexSerif-SemiBoldItalic.woff2` (288.7 KB) |
| IBM Plex Mono | `@ibm/plex-mono` | 2.5.0 | OFL-1.1 | Code, keys and the Typewriter look | `IBMPlexMono-Regular.woff2`, `IBMPlexMono-SemiBold.woff2` (97.5 KB) |
| IBM Plex Sans Arabic | `@ibm/plex-sans-arabic` | 1.1.0 | OFL-1.1 | Arabic | `IBMPlexSansArabic-Regular.woff2`, `IBMPlexSansArabic-SemiBold.woff2` (144.8 KB) |
| IBM Plex Sans Hebrew | `@ibm/plex-sans-hebrew` | 1.1.0 | OFL-1.1 | Hebrew and Yiddish | `IBMPlexSansHebrew-Regular.woff2`, `IBMPlexSansHebrew-SemiBold.woff2` (66.8 KB) |
| IBM Plex Sans Devanagari | `@ibm/plex-sans-devanagari` | 1.1.0 | OFL-1.1 | Hindi | `IBMPlexSansDevanagari-Regular.woff2`, `IBMPlexSansDevanagari-SemiBold.woff2` (206.3 KB) |

## Data, not packages

The icon picker's Emoji set (`src/kit/draw/emoji-data.ts`: every base emoji's character, name, keywords and
group) is data, not code: the browser lists no emoji by name, and the characters themselves are drawn by the
system's own font. It is written by `npm run emoji` (`scripts/emoji.ts`) from Unicode's
[emoji-test.txt](https://unicode.org/Public/17.0.0/emoji/emoji-test.txt) (which emoji are fully qualified, and their groups) and CLDR's English
[annotations](https://cdn.jsdelivr.net/npm/cldr-annotations-full@48.2.0/annotations/en/annotations.json) and [derived annotations](https://cdn.jsdelivr.net/npm/cldr-annotations-derived-full@48.2.0/annotationsDerived/en/annotations.json) (names and
keywords), at those pinned versions, under the Unicode license (Unicode-3.0), and checked in. It loads only with
the picker; neither source is a dependency.

## For building and testing

None of these reaches the site; they build it, check it and deploy it. With what they bring, the lockfile
holds 307 packages for development.

| Package | Version | License | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 | The accessibility checks in e2e/a11y.spec.ts. Chromium exposes its accessibility tree but no rules to judge it by; axe is the rule set. Tests only. | not shipped |
| `@fluent/syntax` | 0.19.0 | Apache-2.0 | Reads and writes the .ftl files with their comments for the checks and the scripts (scripts/ftl.ts, scripts/i18n-extract.ts): the group a message is in, `# same`, `# draft from`. @fluent/bundle's own parser drops comments, and the browser has none for Fluent. Not built into the site. | not shipped |
| `@playwright/test` | 1.64.0 | Apache-2.0 | The end-to-end runner (e2e/). node:test has no browser; WebDriver BiDi is a protocol, not a runner, and WebKit at phone size is what an iPhone gets. Tests only. | not shipped |
| `@storybook/web-components-vite` | 10.6.2 | MIT | Storybook's renderer for custom elements (the kit's are Lit's, no React) on Vite, the build the repository has: stories return a template or an element, and the elements are the kit's own. Not built into the site. | not shipped |
| `@types/d3-sankey` | 0.12.5 | MIT | Types for d3-sankey, which ships none. Not built into the site. | not shipped |
| `@types/node` | 26.6.4 | MIT | Types for the scripts and tests that run under node. Not built into the site. | not shipped |
| `@vitest/browser-playwright` | 5.0.3 | MIT | Lets Vitest run the DOM tests in a real Chromium through Playwright (test/browser/, src/apps/*/tests/). A simulated DOM would pass what a browser fails. Tests only. | not shipped |
| `fast-check` | 4.10.2 | MIT | The properties fuzzed from TLO's grammar (test/doc/tlo-grammar.ts, test/doc/properties.test.ts): generators of documents, texts and operations, and shrinking a failure to its smallest case; and the random walks over the chrome (test/browser/walks.test.ts, its model-based testing: fc.commands and asyncModelRun). The native alternative is nothing: no browser or node API generates or shrinks test cases. Tests only. | not shipped |
| `playwright` | 1.64.0 | Apache-2.0 | The browsers themselves (Chromium, WebKit) for the browser tests and e2e, pinned to @playwright/test's version. Tests only. | not shipped |
| `prettier` | 3.9.10 | MIT | The one style of the code (npm run format writes it, npm run lint checks it: .prettierrc is single quotes, lines to 200, templates left as written). Node has no formatter, and a style held by hand drifted with every builder. Not built into the site. | not shipped |
| `storybook` | 10.6.2 | MIT | The Storybook of the kit and the editors (npm run storybook, .storybook/, stories/): every element and every app's editor alone on a page, as a host holds them. The browser can show an element on a page of its own, but not a catalog of them with controls, a theme toggle and each story's events; Storybook is that catalog. Its own Vite config, never the site's. Not built into the site. | not shipped |
| `typescript` | 7.0.2 | Apache-2.0 | The type check (npm run lint), and its scanner reads the source for the lints of the code (test/lints.ts: the words in templates, the module graph). Node strips types natively and runs the scripts as written, but checks none of them, and has no tokenizer for TypeScript. Not built into the site. | not shipped |
| `vite` | 8.3.4 | MIT | The build. Browsers load ES modules unbundled, but a page per app, one app file and the templates and languages beside it under hashed names a browser may keep forever, the service worker's list, minified code and the CSP's script hashes are a build's work. The service worker itself (src/sw.ts) is the browser's own Service Worker and Cache Storage, with no library. Not built into the site. | not shipped |
| `vitest` | 5.0.3 | MIT | The unit and browser tests. node:test runs the unit tests' shape but not in a browser; one runner for both layers keeps one way to write a test. Not built into the site. | not shipped |
| `wrangler` | 4.149.0 | MIT OR Apache-2.0 | Deploys the two Workers and runs them locally (npm run deploy, tinier:dev). Cloudflare's REST API could, by hand; wrangler is Cloudflare's own tool for it. Not built into the site. | not shipped |
