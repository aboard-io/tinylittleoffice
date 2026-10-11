# Dependencies

Every package Tiny Little Office depends on, at the exact version the lockfile holds, with its licence, the
native web API it beat and why, and what it adds to the site. The standing rule (docs/rebuild.md): the
browser first; a dependency names what it beat. This page is written by `npm run docs:deps`
(`scripts/dependencies.ts`) from package.json, package-lock.json and the reasons in
`scripts/dependencies.json`; a test fails when it is out of date, and the script fails for a dependency
with no reason.

"Adds" is the minified JavaScript the build carries for that package and what it brings, in all its chunks
(its own share in brackets where the two differ); most of it loads only with the app that uses it (the map with the Trip Planner, mathjs with the Calculator). It is measured by
`npm run docs:deps -- --sizes`, which builds the site, and moves a little with every build. Nothing is
vendored: every byte comes from npm through the committed lockfile.

## Built into the site

| Package | Version | Licence | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
| `d3-sankey` | 0.12.3 | BSD-3-Clause | Sankey charts (src/kit/chart.ts). SVG draws the picture, but no browser API lays out a flow: placing the nodes in columns and relaxing the links so they cross least is the library's whole job. | 9.5 KB (its own: 5.9 KB) |
| `fflate` | 0.8.3 | MIT | The link codec and every zip (src/kit/codec.ts, src/kit/zip.ts). CompressionStream has no preset dictionary, which makes short documents 20 to 35 percent smaller, is asynchronous, and writes a gzip stream, not a zip archive (.docx, .xlsx, .pptx, Download everything). | 13.1 KB |
| `leaflet` | 1.9.4 | BSD-2-Clause | The Trip Planner's map (src/apps/trip/editor.ts). The browser has no map: panning and pinch-zooming a grid of OpenStreetMap tiles, with markers and a route, would be a library written here instead. Loaded only with the Trip Planner. | 145.1 KB |
| `lit` | 3.3.3 | BSD-3-Clause | Every element's drawing (the kit and the editors). Custom elements are native; lit adds the drawing of a template again with only its changed parts, which the browser does not do, and reactive properties that ask for it. | 16.8 KB (its own: none) |
| `lucide` | 1.54.0 | ISC | The icons (src/kit/icons.ts). The browser has no icon set and emoji draw differently on every system; Lucide is SVG paths, each a module, so only the icons used are built in and the rest come as a lazy chunk with the picker. | 445.1 KB |
| `mathjs` | 15.2.0 | Apache-2.0 | The Calculator's units, big numbers and algebra (src/apps/calc/math.ts). The browser's only expression reader is eval, which the page's policy forbids, and Intl formats units without converting them. A custom build, in the Calculator's chunk alone. | 359.7 KB (its own: 293.3 KB) |

## What those bring with them

| Package | Version | Licence | Comes with | Adds |
| --- | --- | --- | --- | --- |
| `@babel/runtime` | 7.29.10 | MIT | `mathjs` | 933 B |
| `@lit-labs/ssr-dom-shim` | 1.6.0 | BSD-3-Clause | `lit` | none |
| `@lit/reactive-element` | 2.1.2 | BSD-3-Clause | `lit` | 5.8 KB |
| `@types/trusted-types` | 2.0.7 | MIT | `lit` | none |
| `complex.js` | 2.4.3 | MIT | `mathjs` | 8.5 KB |
| `d3-array` | 2.12.1 | BSD-3-Clause | `d3-sankey` | 755 B |
| `d3-path` | 1.0.9 | BSD-3-Clause | `d3-sankey` | 1.8 KB |
| `d3-shape` | 1.3.7 | BSD-3-Clause | `d3-sankey` | 1.1 KB |
| `decimal.js` | 10.6.0 | MIT | `mathjs` | 28.7 KB |
| `escape-latex` | 1.2.0 | MIT | `mathjs` | 1.1 KB |
| `fraction.js` | 5.3.4 | MIT | `mathjs` | 7.2 KB |
| `internmap` | 1.0.1 | ISC | `d3-sankey` | none |
| `javascript-natural-sort` | 0.7.1 | MIT | `mathjs` | none |
| `lit-element` | 4.2.2 | BSD-3-Clause | `lit` | 623 B |
| `lit-html` | 3.3.3 | BSD-3-Clause | `lit` | 10.4 KB |
| `seedrandom` | 3.0.5 | MIT | `mathjs` | none |
| `tiny-emitter` | 2.1.0 | MIT | `mathjs` | 678 B |
| `typed-function` | 4.2.2 | MIT | `mathjs` | 19.3 KB |

## Data, not packages

The icon picker's Emoji set (`src/kit/emoji-data.ts`: every base emoji's character, name, keywords and
group) is data, not code: the browser lists no emoji by name, and the characters themselves are drawn by the
system's own font. It is written by `npm run emoji` (`scripts/emoji.ts`) from Unicode's
[emoji-test.txt](https://unicode.org/Public/17.0.0/emoji/emoji-test.txt) (which emoji are fully qualified, and their groups) and CLDR's English
[annotations](https://cdn.jsdelivr.net/npm/cldr-annotations-full@48.2.0/annotations/en/annotations.json) and [derived annotations](https://cdn.jsdelivr.net/npm/cldr-annotations-derived-full@48.2.0/annotationsDerived/en/annotations.json) (names and
keywords), at those pinned versions, under the Unicode licence (Unicode-3.0), and checked in. It loads only with
the picker; neither source is a dependency.

## For building and testing

None of these reaches the site; they build it, check it and deploy it. With what they bring, the lockfile
holds 198 packages for development.

| Package | Version | Licence | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 | The accessibility checks in e2e/a11y.spec.ts. Chromium exposes its accessibility tree but no rules to judge it by; axe is the rule set. Tests only. | not shipped |
| `@playwright/test` | 1.64.0 | Apache-2.0 | The end-to-end runner (e2e/). node:test has no browser; WebDriver BiDi is a protocol, not a runner, and WebKit at phone size is what an iPhone gets. Tests only. | not shipped |
| `@types/d3-sankey` | 0.12.5 | MIT | Types for d3-sankey, which ships none. Not built into the site. | not shipped |
| `@types/leaflet` | 1.9.22 | MIT | Types for leaflet, which ships none. Not built into the site. | not shipped |
| `@types/node` | 26.6.4 | MIT | Types for the scripts and tests that run under node. Not built into the site. | not shipped |
| `@vitest/browser-playwright` | 5.0.3 | MIT | Lets Vitest run the DOM tests in a real Chromium through Playwright (test/browser/, src/apps/*/tests/). A simulated DOM would pass what a browser fails. Tests only. | not shipped |
| `fast-check` | 4.10.2 | MIT | The properties fuzzed from TLO's grammar (test/doc/tlo-grammar.ts, test/doc/properties.test.ts): generators of documents, texts and operations, and shrinking a failure to its smallest case; and the random walks over the chrome (test/browser/walks.test.ts, its model-based testing: fc.commands and asyncModelRun). The native alternative is nothing: no browser or node API generates or shrinks test cases. Tests only. | not shipped |
| `playwright` | 1.64.0 | Apache-2.0 | The browsers themselves (Chromium, WebKit) for the browser tests and e2e, pinned to @playwright/test's version. Tests only. | not shipped |
| `prettier` | 3.9.10 | MIT | The one style of the code (npm run format writes it, npm run lint checks it: .prettierrc is single quotes, lines to 200, templates left as written). Node has no formatter, and a style held by hand drifted with every builder. Not built into the site. | not shipped |
| `typescript` | 7.0.2 | Apache-2.0 | The type check (npm run lint), and its scanner reads the source for the lints of the code (test/lints.ts: the words in templates, the module graph). Node strips types natively and runs the scripts as written, but checks none of them, and has no tokenizer for TypeScript. Not built into the site. | not shipped |
| `vite` | 8.3.4 | MIT | The build. Browsers load ES modules unbundled, but a page per app, hashed file names a browser may keep for ever, lazy chunks per editor, minified code and the CSP's script hashes are a build's work. Not built into the site. | not shipped |
| `vitest` | 5.0.3 | MIT | The unit and browser tests. node:test runs the unit tests' shape but not in a browser; one runner for both layers keeps one way to write a test. Not built into the site. | not shipped |
| `wrangler` | 4.149.0 | MIT OR Apache-2.0 | Deploys the two Workers and runs them locally (npm run deploy, tinier:dev). Cloudflare's REST API could, by hand; wrangler is Cloudflare's own tool for it. Not built into the site. | not shipped |
