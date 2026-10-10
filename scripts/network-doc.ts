/**
 * docs/network.md and public/network.html (the site's /network), written from src/kit/network.ts: every
 * request the site can make, when, what it carries and what stops it, and the picture whitelist with the
 * reason for each host. The words around the lists are here, as prose the script carries; the lists are
 * the registry's, so the page cannot drift from the code. The proxy's host is the one the policy allows
 * (scripts/headers.ts mediaSource). The page is plain HTML: no script, the site's colours inline, dark when
 * the device is.
 *
 *   node scripts/network-doc.ts           write both
 *   node scripts/network-doc.ts --check   write nothing; fail if either is not what the registry says
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NETWORK, reaches, type Reach } from '../src/kit/network.ts';
import { mediaSource } from './headers.ts';

const PROXY = new URL(mediaSource(undefined)).host;
const CSP: Record<string, string> = { connect: 'connect-src', img: 'img-src', frame: 'frame-src', media: 'media-src' };

/** The requests a browser makes (the whitelist's hosts are asked by the proxy, and listed apart). */
const requests = () => reaches().filter((r) => !r.picture || r.csp);
const pictures = () => reaches().filter((r) => r.picture);
const hostWords = (r: Reach) => (r.host === '*' ? 'any https address' : `\`${r.host}\``);
const allowedBy = (r: Reach) =>
  r.csp ? r.csp.map((d) => `\`${CSP[d]}\``).join(', ') : r === NETWORK.site ? "`'self'`" : r.when === 'on share' ? 'none: it opens in a new tab' : 'none: the proxy asks';

const PROSE = `# What leaves your browser

Tiny Little Office keeps a document in its link. Opening one asks the site for its own files and nothing
else. This page lists every other request the site can make: when it happens, what it carries, and what
stops it. The Content-Security-Policy in \`public/_headers\` allows these places and no others, so a request
not on this list is refused by the browser itself.

## Every request the site can make

{{requests}}

"Any https address" is a thing the person chose by its address: a post on their own Mastodon server, a
PeerTube video, a page in the Wayback Machine, a PDF or a sound file. It is asked only after a tap, in a
sandboxed frame that sends no referrer, or by the browser's own player.

## Pictures from the web: the proxy at ${PROXY}

A document can hold a picture by its address on another site. If the reader's browser fetched it from that
site, the site would learn who read the document, from where and when: a tracking pixel. So the site never
fetches a web picture from its own site. Every picture from an https address is asked of
**${PROXY}** (\`media/\` in this repository, a Cloudflare Worker), which fetches it once,
keeps it at the edge for a week, and hands it back. The picture's site sees Cloudflare, not the reader.

- **When:** a picture from a host on the list below shows at once. A picture from any other host waits for
  "Show pictures from the web", which names the host (kit/pictures.ts); a picture the author put in during
  this visit shows at once; under Saved, a switch in the menu shows them always. A preview or a thumbnail
  never fetches one.
- **What it carries:** the picture's address, in \`?u=\`. No cookie, no referrer, nothing of the document.
  The proxy passes nothing of the reader's request on, and keeps no log (observability is off; the Worker
  has no console call; a test holds it to that). Its rate limiter counts per address, in memory.
- **What it refuses:** an address that is not https on the default port with a public name (400); more
  than three redirects, or a redirect somewhere it would not go (502); anything that does not say it is a
  picture (415; SVG only as \`image/svg+xml\`, served under a policy that lets it run nothing); more than
  5 MB (413, cut off as it streams); a site that does not answer within ten seconds (502).
- **Exports:** a PDF, a picture or a web page made from a document holds each picture's bytes, fetched
  through the proxy when the file is made, so reading the file asks no one anything.
- **Self-hosting:** \`VITE_MEDIA_URL\` at build time names your own copy of the proxy (\`npm run deploy\`
  deploys \`media/\` beside the site). Set it empty and there is no proxy: pictures load from their own sites,
  every host waits to be asked for, and the policy's \`img-src\` becomes \`https:\`.

### The hosts whose pictures show at once

\`src/kit/media.ts\` \`TRUSTED\`, the entries of \`src/kit/network.ts\` with a reason. Each is a place that
serves public, static pictures under an open or stated licence, at addresses that do not change per reader.
Since the proxy fetches them, even such a host learns nothing of who reads the document; the list only
spares the reader a question for pictures that are this safe and this common.

{{pictures}}

A host is added when it serves public pictures at stable addresses with a stated licence and nothing on
the page it is part of. A host that serves pictures made for one reader (an email's images, an ad network,
a tracker) never is.

## Why each of the rest is asked directly

- **Things from the web (embeds).** A video, a post, a song, a map, a page by its address is a card until
  tapped (kit/embeds.ts). Tapped, it loads from the provider's privacy endpoint where there is one
  (youtube-nocookie.com), in a sandboxed frame that sends no referrer, or, for a sound or a film that is a
  file, through the browser's own element. A picture embedded this way comes through the proxy. Bluesky is
  asked who a handle is, and Wikipedia for an article's summary, only on that tap.
- **The map.** Map tiles only while a map is on the screen; place search only when a search is tapped.
  They are not proxied: OpenStreetMap's usage policies are written for the browser that shows the map
  asking them directly, and a cache of ours in between would be the heavy, anonymous use they ask people
  not to make. The site sends no referrer.
- **Short links.** Only when a short link is made, opened, updated or forgotten; the service holds
  ciphertext it cannot read, whose key is in the short link's fragment, which browsers never send
  (tinier/tinier.ts).
- **Sharing to a service.** Share's Bluesky, Mastodon, X and LinkedIn open that service's own compose box in
  a new tab, with the title and the link in it: no script of theirs runs here. The link is the document, so
  whoever reads the post can read it.
- **Fonts and icons.** Self-hosted, from the site itself; the full icon set is a chunk of the site's own,
  loaded when the icon picker opens.
- **Links.** A link in a document that leaves the site opens only after the reader is shown where it goes
  and says Go (kit/link-guard.ts), in a new tab with no referrer.

## Nothing else

No analytics, no error reporting, no fonts or scripts from a CDN, no tag manager, no fetch the person did
not cause. \`test/network.test.ts\` reads the source (\`src/\`, the shortener in \`tinier/\` and the proxy in
\`media/\`) and fails on any host that is not on this page, and on any analytics, error-reporting,
font-CDN or tag-manager host anywhere in the site.

## How this page is kept true

It is written from \`src/kit/network.ts\`, the one list of every host, by \`scripts/network-doc.ts\`
(\`npm run docs:network\`, which \`npm run build\` runs first); a test fails when the committed page is not
what the list says. Every module that asks the web takes its host from that list, so a new host cannot be
reached without appearing here. The policy's \`connect-src\`, \`img-src\`, \`frame-src\` and \`media-src\` are
written from the same list (scripts/headers.ts), and \`test/csp.test.ts\` holds each host to the directive the
list names and nothing else.
`;

/* ---------- Markdown ---------- */

const cell = (s: string) => s.replace(/\|/g, '\\|');

function requestsMd(): string {
  const rows = requests().map((r) => `| ${hostWords(r)} | ${cell(r.what)} | ${r.when} | ${cell(r.carries)} | ${cell(r.stops)} | ${cell(r.by)} | ${allowedBy(r)} |`);
  return ['| Host | What | When | What it carries | What stops it | Made by | Allowed by |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

function picturesMd(): string {
  return ['| Host | Why |', '| --- | --- |', ...pictures().map((r) => `| \`${r.host}\` | ${cell(r.picture!)} |`)].join('\n');
}

export function networkDoc(): string {
  const head = '<!-- Generated from src/kit/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit: change the list or the script. -->\n\n';
  return head + PROSE.replace('{{requests}}', requestsMd()).replace('{{pictures}}', picturesMd());
}

/* ---------- The page ---------- */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** The prose's inline marks: `code` and **bold**. */
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

function requestsHtml(): string {
  return requests()
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

function picturesHtml(): string {
  return `<ul class="hosts">\n${pictures()
    .map((r) => `<li><code>${esc(r.host)}</code> ${esc(r.picture!)}</li>`)
    .join('\n')}\n</ul>`;
}

/** The prose as HTML: headings, paragraphs, lists of "- " items, and the two generated lists. */
function proseHtml(): string {
  return PROSE.trim()
    .split(/\n{2,}/)
    .map((block) => {
      if (block === '{{requests}}') return requestsHtml();
      if (block === '{{pictures}}') return picturesHtml();
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

const STYLE = `:root{--bg:hsl(0 0% 97.5%);--surface:hsl(0 0% 100%);--border:hsl(240 4.9% 83.9%);--ink:hsl(240 5.9% 10%);--ink-2:hsl(240 5.3% 26.1%);--ink-3:hsl(240 5.2% 33.9%);--accent:hsl(243.4 75.4% 58.6%);--code:hsl(240 4.8% 95.9%);color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:hsl(240 6% 8%);--surface:hsl(240 5.1% 15%);--border:hsl(240 5.3% 58%);--ink:hsl(240 9.1% 91.8%);--ink-2:hsl(240 7.3% 84%);--ink-3:hsl(240 5.6% 73%);--accent:hsl(229.4 100% 78.3%);--code:hsl(240 5.7% 18.2%)}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:1.75rem;line-height:1.2;margin:.5rem 0 1rem}
h2{font-size:1.25rem;margin:2.25rem 0 .75rem}
h3{font-size:1rem;margin:0 0 .25rem;overflow-wrap:anywhere}
a{color:var(--accent)}
code{font:.9em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--code);padding:.05em .3em;border-radius:4px;overflow-wrap:anywhere}
ul{padding-left:1.25rem}
li{margin:.4rem 0}
.home{font-size:.95rem}
.reach{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin:12px 0}
.reach p{margin:0 0 .5rem;color:var(--ink-2)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:0;font-size:.95rem}
dt{color:var(--ink-3)}
dd{margin:0}
@media (max-width:480px){dl{grid-template-columns:1fr}dd{margin-bottom:6px}}
.hosts li code{margin-right:.35em}
.note{color:var(--ink-3);font-size:.9rem}`;

export function networkPage(): string {
  return `<!doctype html>
<!-- Generated from src/kit/network.ts by scripts/network-doc.ts (npm run docs:network). Do not edit. -->
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
<p class="note">Written from <code>src/kit/network.ts</code>; the same page is <code>docs/network.md</code> in the repository.</p>
</main>
</body>
</html>
`;
}

const root = resolve(fileURLToPath(import.meta.url), '../..');
const files = { 'docs/network.md': networkDoc, 'public/network.html': networkPage };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [path, make] of Object.entries(files)) {
    const want = make();
    const at = resolve(root, path);
    if (!check) writeFileSync(at, want);
    else if (readFileSync(at, 'utf8') !== want) {
      console.error(`${path} is out of date: run npm run docs:network`);
      stale = true;
    }
  }
  if (stale) process.exit(1);
}
