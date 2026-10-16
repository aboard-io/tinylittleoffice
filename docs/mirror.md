# The mirror on GitHub Pages

A second copy of the site, at **https://aboard-io.github.io/tinylittleoffice/**, so a link keeps opening when
tinylittleoffice.com is down or rate-limited (Paul, 2026-10-15, issue #13). It is GitHub Pages' default address for
the repository, with no domain of its own: nothing of ours stands between it and GitHub.

## What it is

The same tag as tinylittleoffice.com, built again for its address. Once a deploy of tinylittleoffice.com succeeds
(`.github/workflows/deploy.yml`), `.github/workflows/pages.yml` checks out the tag it deployed, builds it with
`npm run build:mirror`, publishes `dist/` to Pages and checks that the mirror's `/version.json` names the tag. It can
also be run by hand for a tag already deployed (Actions, **Pages mirror**, Run workflow). Its About dialog and its
`/version.json` name the commit and the tag, as the site's do.

The build differs from the site's by four settings, all in the one npm script:

| Setting | The mirror's | What it does |
| --- | --- | --- |
| `VITE_SITE_URL` | `https://aboard-io.github.io/tinylittleoffice/` | the canonical link, the link-preview tags, the sitemap and the structured data; its path, `/tinylittleoffice/`, is where the installed app lives (the manifest's `id`) |
| `VITE_CSP_META` | `1` | each page carries its Content-Security-Policy in a `<meta>`, since Pages sends no headers of a site's choosing |
| `VITE_CARDS` | `0` | no preview cards (below) |
| `VITE_TINIER` | `https://tinier.tinylittleoffice.com/` | the production shortener |

Everything else is the site's own build: the pages and the stylesheet name every file relatively, the service worker's
scope is its folder, and the shell finds the site's address from the page's own (`siteOf` in `src/kit/core/route.ts`),
so the code does not need to know it is under a path. A build without these settings is the site's build, byte for byte.

## What it lacks

- **The headers.** The policy is in each page's `<meta>`, the same text `_headers` gives that page
  (`scripts/mirror.ts`), less what a `<meta>` cannot carry: `frame-ancestors` (so any site may put the editor in a
  frame, where tinylittleoffice.com lets only the embed page be framed), `report-uri` and `sandbox`. The other headers
  are not sent at all: no `Permissions-Policy` (camera and microphone are not refused by the page, though nothing
  asks for them), no `Referrer-Policy` header (the page's own `<meta name="referrer" content="no-referrer">` still
  holds), and Pages' cache rules instead of ours (every file ten minutes). `dist/_headers` is published too, as a
  plain file that nothing reads. `'self'` in the policy is the whole of `aboard-io.github.io`, which serves every Pages
  site of the organization.
- **Preview cards.** A card needs the site's Worker (`/card` and the `/c/<id>` pages), which a static host does not
  have, so the Share dialog on the mirror has no preview switch, and a link goes to a network as itself, previewing as
  its app's card. A card link made on tinylittleoffice.com (`…/c/<id>#…`) does not open on the mirror as it is; see
  below.
- **Short links when tinier is down.** The mirror makes and opens short links through the same shortener as
  tinylittleoffice.com, `tinier.tinylittleoffice.com`, so they stop when it does. A short link leads back to the copy
  it was made on.
- **Search engines.** `robots.txt` is not at the host's root, so crawlers do not read it; the pages' canonical
  links name the mirror.

## A document link on either host

A document is everything after the `#`, so a link opens on either copy by changing what comes before it:

```text
https://tinylittleoffice.com/outline/#/v1/outline/<payload>
https://aboard-io.github.io/tinylittleoffice/outline/#/v1/outline/<payload>
```

The site's address is `https://tinylittleoffice.com/` on one and `https://aboard-io.github.io/tinylittleoffice/` on the
other; the rest, an app's page (`outline/`) and the fragment, is the same. A card link,
`https://tinylittleoffice.com/c/<id>#/v1/…`, becomes the mirror's address followed by the fragment, the `c/<id>` left
out. A link with a password opens the same on both, and asks for the same password.

## The shortener

tinier lets the sites its `SITE` var names call it, and leads a short link only under one of them. The var may name
several, comma-separated, the site's own first; each is an origin, or an origin and a path for a copy that is not at
its host's root. `tinier/wrangler.jsonc` names both:

```jsonc
"vars": { "SITE": "https://tinylittleoffice.com,https://aboard-io.github.io/tinylittleoffice" },
```

The shortener in production has the mirror's address only once it is deployed again with this file, by the next tag;
until then the browser refuses its answers to the mirror, so Share there cannot make a short link, and everything
else on the mirror works.

## Turning it on

Pages is on for the repository with GitHub Actions as its source (Settings, Pages; or
`gh api -X POST repos/aboard-io/tinylittleoffice/pages -f build_type=workflow`). The `github-pages` environment
lets only `main` publish, which is where a run after a deploy runs; the workflow checks out the tag inside it. A fork's
copy is at `https://<owner>.github.io/<repository>/`: change `MIRROR` in the workflow and the address in
`npm run build:mirror` to it.
