/**
 * docs/network.md and public/network.html (the site's /network), written from src/kit/core/network.ts: every
 * request the site can make, when, what it carries and what stops it. The words around the list are
 * here, as prose the script carries; the list is the registry's, so the page cannot drift from the code.
 * The page is plain HTML: no script, the site's colors inline, dark when the device is.
 *
 *   node scripts/network-doc.ts           write both
 *   node scripts/network-doc.ts --check   write nothing; fail if either is not what the registry says
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NETWORK, reaches, type Reach } from '../src/kit/core/network.ts';
import { generate } from './generated.ts';

const CSP: Record<string, string> = { connect: 'connect-src', img: 'img-src' };

const hostWords = (r: Reach) => (r.host === '*' ? 'any https address' : `\`${r.host}\``);
const allowedBy = (r: Reach) => (r.csp ? r.csp.map((d) => `\`${CSP[d]}\``).join(', ') : r.host === NETWORK.site.host ? "`'self'`" : 'none: it opens in a new tab');

const PROSE = `# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in \`public/_headers\` allows these places and no others, so a request
not on this list is refused by the browser itself.

## Every request the site can make

{{requests}}

A document fetches nothing from any other site but a trip's map (OpenFreeMap's in the Trip Planner, OpenStreetMap's
tiles under a trip drawn anywhere else), by the Map switch. A link in it is
words that go somewhere when the reader follows them; nothing else in a document is drawn from another site's
address. A picture a host keeps (an \`image\` fence naming the host's reference, src/doc/image.ts) is drawn on the site
as a card with its words, since the site keeps no bytes and its host has no pictures: nothing is fetched for it. A
page of a host that keeps pictures fetches them from that host's own address, which that page's own
Content-Security-Policy allows; the site's policy stays as it is.

## Why each of these is asked directly

- **The map.** The Trip Planner's map comes from OpenFreeMap only while it is on the screen (its style, its vector
  tiles, its sprites and its fonts; MapLibre draws them here, fetched with the first map, never part of the app
  file; OpenFreeMap is made for this, with no key and no limit, and asks for no referrer); place search only when a
  search is tapped. A trip drawn on a slide, a page, an outline's item, a card or in an export is drawn on OpenStreetMap's tiles,
  at the zoom that fits its places: only the tiles its box needs (a handful, never a whole zoom level),
  nothing fetched ahead. A picture made of it (a card, a PDF, a PNG, a PowerPoint) fetches those tiles
  again to write them into the picture. The home page's pictures of the templates are drawn without them,
  so a visitor who has not opened a trip tells OpenStreetMap nothing, and Map in the Trip Planner's bar,
  turned off, turns them off everywhere. They are asked directly, by the browser with its own name:
  OpenStreetMap's usage policies are written for the browser that shows the map asking them directly, and
  a cache of ours in between would be the heavy, anonymous use they ask people not to make; nothing keeps
  them but the browser's own cache. The site sends no referrer.
- **Short links.** Only when a short link is made or opened; the service holds
  ciphertext it cannot read, whose key is in the short link's fragment, which browsers never send
  (backends/tinier/tinier.ts).
- **A preview.** Only when a person shares with a network from Share with "Show a preview of the first page" on:
  a picture of the first page, the title and the first words go to the site's own \`/card\`, and the link
  shared carries the card's id in its path (\`/c/<id>\`, before the "#"): the one page the site's Worker serves, the
  app's page with the card's tags, which the shell moves to the app's own address as it opens. The card is kept
  readable for a month, then forgotten (backends/cards/cards.ts); the document and its link are never sent.
- **Sharing to a service.** Share's Bluesky, Mastodon, X and LinkedIn open that service's own compose box in
  a new tab, with the title and the link in it: no script of theirs runs here. The link is the document, so
  whoever reads the post can read it. "Any https address" there is the Mastodon server the person names.
- **Fonts and icons.** Self-hosted, from the site itself: the type is IBM Plex (\`public/fonts/\`), each face
  fetched when a page's words need it, and the policy's \`font-src\` is \`'self'\` alone; the icons and the emoji
  are in the site's own app file.
- **Offline.** With Save in browser on, the site's service worker (\`/sw.js\`, from \`src/sw.ts\`) keeps the
  site's own files on the device: the home page and one for each app, the app file, its stylesheet, the manifest
  and icons and the Latin faces when it is installed, and each file a page fetches afterwards (an app's templates,
  a language, a face). It asks only the site, and only for its files; a page is asked of the network first, so a
  visit online is never stale. It never keeps a document (the document is after the "#", which never reaches it)
  nor a shared link's \`/c/<id>\` page. Turning Save in browser off unregisters it and deletes everything it kept; while
  it is off nothing registers.
- **Links.** A link in a document that leaves the site opens only after the reader is shown where it goes
  and says Go (kit/ui/link-guard.ts), in a new tab with no referrer.

## Nothing else

No analytics, no error reporting, no fonts or scripts from a CDN, no tag manager, no fetch the person did
not cause. \`test/network.test.ts\` reads the source (\`src/\` and the services in \`backends/\`) and fails
on any host that is not on this page, and on any analytics, error-reporting, font-CDN or tag-manager host
anywhere in the site.

## How this page is kept true

It is written from \`src/kit/core/network.ts\`, the one list of every host, by \`scripts/network-doc.ts\`
(\`npm run docs:network\`, which \`npm run build\` runs first); a test fails when the committed page is not
what the list says. Every module that asks the web takes its host from that list, so a new host cannot be
reached without appearing here. The policy's \`connect-src\` and \`img-src\` are written from the same list
(scripts/headers.ts), and \`test/csp.test.ts\` holds each host to the directive the list names and nothing
else; the policy has no \`frame-src\` or \`media-src\` of its own, so no frame, film or sound comes from
another site.
`;

/* ---------- Markdown ---------- */

const cell = (s: string) => s.replace(/\|/g, '\\|');

function requestsMd(): string {
  const rows = reaches().map((r) => `| ${hostWords(r)} | ${cell(r.what)} | ${r.when} | ${cell(r.carries)} | ${cell(r.stops)} | ${cell(r.by)} | ${allowedBy(r)} |`);
  return ['| Host | What | When | What it carries | What stops it | Made by | Allowed by |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

export function networkDoc(): string {
  const head = '<!-- Generated from src/kit/core/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit: change the list or the script. -->\n\n';
  return head + PROSE.replace('{{requests}}', requestsMd());
}

/* ---------- The page ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The prose's inline marks: `code` and **bold**. */
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function requestsHtml(): string {
  return reaches()
    .map(
      (r) => `<section class="reach">
<h3>${r.host === '*' ? 'Any https address' : `<code>${esc(r.host)}</code>`}</h3>
<p>${esc(r.what)}.</p>
<dl>
<dt>When</dt><dd>${esc(r.when)}</dd>
<dt>Carries</dt><dd>${esc(r.carries)}</dd>
<dt>Stopped by</dt><dd>${esc(r.stops)}</dd>
<dt>Made by</dt><dd><code>${esc(r.by)}</code></dd>
<dt>Allowed by</dt><dd>${inline(allowedBy(r))}</dd>
</dl>
</section>`,
    )
    .join('\n');
}

/** The prose as HTML: headings, paragraphs, lists of "- " items, and the generated list. */
function proseHtml(): string {
  return PROSE.trim()
    .split(/\n{2,}/)
    .map((block) => {
      if (block === '{{requests}}') return requestsHtml();
      const h = /^(#{1,3}) (.+)$/.exec(block);
      if (h) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      if (block.startsWith('- '))
        return `<ul>\n${block
          .split(/\n(?=- )/)
          .map((li) => `<li>${inline(li.slice(2).replace(/\s*\n\s*/g, ' '))}</li>`)
          .join('\n')}\n</ul>`;
      return `<p>${inline(block.replace(/\s*\n\s*/g, ' '))}</p>`;
    })
    .join('\n');
}

/** The site's type, IBM Plex, from its own files (src/styles/fonts.css has every face; this page needs three). */
const FACES = [
  ['IBM Plex Sans', 'IBMPlexSans-Regular', 400],
  ['IBM Plex Sans', 'IBMPlexSans-SemiBold', 600],
  ['IBM Plex Mono', 'IBMPlexMono-Regular', 400],
]
  .map(([family, file, weight]) => `@font-face{font-family:'${family}';src:url(./fonts/${file}.woff2) format('woff2');font-weight:${weight};font-display:swap}`)
  .join('\n');

const STYLE = `${FACES}
:root{--bg:hsl(0 0% 97.5%);--surface:hsl(0 0% 100%);--border:hsl(240 4.9% 83.9%);--ink:hsl(240 5.9% 10%);--ink-2:hsl(240 5.3% 26.1%);--ink-3:hsl(240 5.2% 33.9%);--accent:hsl(243.4 75.4% 58.6%);--code:hsl(240 4.8% 95.9%);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:hsl(240 6% 8%);--surface:hsl(240 5.1% 15%);--border:hsl(240 5.3% 58%);--ink:hsl(240 9.1% 91.8%);--ink-2:hsl(240 7.3% 84%);--ink-3:hsl(240 5.6% 73%);--accent:hsl(229.4 100% 78.3%);--code:hsl(240 5.7% 18.2%)}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.75rem;line-height:1.2;margin:.5rem 0 1rem}
h2{font-size:1.25rem;margin:2.25rem 0 .75rem}
h3{font-size:1rem;margin:0 0 .25rem;overflow-wrap:anywhere}
a{color:var(--accent)}
code{font:.9em 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--code);padding:.05em .3em;border-radius:4px;overflow-wrap:anywhere}
ul{padding-left:1.25rem}
li{margin:.4rem 0}
.home{font-size:.95rem}
.reach{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin:12px 0}
.reach p{margin:0 0 .5rem;color:var(--ink-2)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:0;font-size:.95rem}
dt{color:var(--ink-3)}
dd{margin:0}
@media (max-width:480px){dl{grid-template-columns:1fr}dd{margin-bottom:6px}}
.note{color:var(--ink-3);font-size:.9rem}`;

export function networkPage(): string {
  return `<!doctype html>
<!-- Generated from src/kit/core/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>What leaves your browser · Tiny Little Office</title>
<meta name="description" content="Every request Tiny Little Office can make: when, what it carries, and what stops it." />
<link rel="icon" href="favicon.svg" type="image/svg+xml" />
<style>
${STYLE}
</style>
</head>
<body>
<main>
<p class="home"><a href="./">Tiny Little Office</a></p>
${proseHtml()}
<p class="note">Written from <code>src/kit/core/network.ts</code>; the same page is <code>docs/network.md</code> in the repository.</p>
</main>
</body>
</html>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generate({ 'docs/network.md': networkDoc(), 'public/network.html': networkPage() }, 'npm run docs:network');
