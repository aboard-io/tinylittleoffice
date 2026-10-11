# R18-seo: what a crawler gets is right and complete

**Paul, 2026-10-11:** asked how Google sees the site; the answer was eleven labeled pages with almost no text, no sitemap, no structured data. He chose *"everything but the templates"*: no template pages, no copy on the home page (home-page-drive), nothing hidden in the page. Just the proper, cheap things.

## The design

- **A sitemap.** `scripts/check-build.ts` or the build's afterBuild (`vite.config.ts`, where each app's page gets its canonical) writes `dist/sitemap.xml` listing the home page and each app's page with its canonical address (VITE_SITE_URL), `lastmod` the build's commit date; `public/robots.txt` gains `Sitemap: https://tinylittleoffice.com/sitemap.xml` (through the same address variable, so a self-host gets its own).
- **Structured data.** The home page carries one JSON-LD block: `@type: WebApplication`, name, description (the truthful one from r17-docs), url, `applicationCategory: BusinessApplication`, `operatingSystem: Any`, `offers` free, `publisher` an `Organization` named Aboard with its url, `license` the MIT link, `isAccessibleForFree: true`. Each app page carries the same with its own name and description. Held by a test that parses the block from the built pages and checks the fields; the CSP keeps `script-src` as it is (a JSON-LD block is `type="application/ld+json"` and runs nothing; confirm the policy allows it or the test fails).
- **Real text in each app page's first pass.** The static HTML of `/<app>/` (the noscript block and a visually plain `<header>`/`<p>` the app replaces when it mounts, not hidden text) carries the app's name and its description sentence and the names of its templates as a plain list, the same words the rendered page shows after JavaScript. The home page's static HTML carries the app names as a list (the rendered page shows them too). Nothing is written that the rendered page does not also show.
- **The short-link opener** (`tinier/page.html`) already says `noindex`; add the `X-Robots-Tag: noindex` header in `tinier/tinier.ts`'s responses for the page and the API, and a `robots.txt` on the shortener's host that says `User-agent: *` and `Allow: /` with a comment that the pages are noindex by header: never a disallow, because X's and Facebook's link-card fetchers honor robots.txt and must still read a shared link's preview tags (round nineteen's social cards; Paul, 2026-10-11). Held by the tinier tests.
- **The descriptions** in `index.html` and the og tags take the truthful sentence of r17-docs if that round did not reach them; the test of r17-docs's struck phrases covers the built pages too.
- `docs/transparency.md` or the README's developer section: one line that the sitemap and the structured data are generated at build.

## Proof

- A node test over `dist/`: `sitemap.xml` lists exactly the home page and every registered app; each page's JSON-LD parses with the fields; each app page's static text contains its name, description and template names; `robots.txt` names the sitemap.
- Tinier tests: `X-Robots-Tag` on the page and the API; `/robots.txt` served.
- `npm run build` and `scripts/check-build.ts` green; the CSP test green.

## Not this

- No template pages, no copy on the home page, no hidden text, no hreflang (the language is not in the URL by design).
