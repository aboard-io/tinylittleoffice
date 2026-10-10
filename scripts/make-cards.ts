/**
 * The share cards: public/og/<app>.png, 1200 by 630, the picture a link to an app's own page ("/sheet/")
 * previews with. Each is the app's icon, name and line beside the first page of its first template (the
 * first that is more than a blank one), drawn by the app's own view(), as the site draws it. The build names
 * each app's card in that app's page (vite.config.ts); the home page's card is the Office mark (og.png, from
 * scripts/icons.ts).
 *
 * The page is SVG, rasterised by Chromium (through Playwright, which the tests already have), as the kit's
 * raster (src/kit/raster.ts) does it in the browser: an <img> of the SVG drawn by the browser itself, so the
 * card shows the page exactly as a person sees it. Nothing is fetched: a picture a template holds by its
 * address stays a blank, as a preview leaves it. The cards are kept in public/; run this again when an app's
 * name, line or first template changes.
 *
 *   npm run cards
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { apps } from '../src/kit/apps.ts';
import type { AppDef } from '../src/kit/app.ts';
import { FONT, INK, MUTED, PAPER, pageSvg, xml } from '../src/kit/draw.ts';
import { markPaths } from '../src/kit/mark.ts';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const ACCENT = '#4f46e5';

/** An icon (Lucide's node) as an inline SVG. */
const iconSvg = (node: AppDef['icon'], size: number, colour: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${node.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${xml(String(v))}"`).join(' ')}/>`).join('')}</svg>`;
const markSvg = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;

/** The page a card shows: the first template's first page that is more than a blank one. */
function pageOf(def: AppDef) {
  const tpl = def.templates.find((t) => t.doc.length > 60) ?? def.templates[0];
  return def.view(tpl ? tpl.doc : def.blank(), { still: true })[0];
}

/** The card as a page for Chromium to draw: words at the left, the document's page at the right. */
export function cardHtml(def: AppDef): string {
  const page = pageOf(def);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${PAPER};font-family:${FONT};color:${INK}}
.bar{position:absolute;inset:0 0 auto 0;height:12px;background:${ACCENT}}
.words{position:absolute;left:80px;top:80px;bottom:60px;width:580px;display:flex;flex-direction:column;gap:18px}
h1{margin:0;font-size:64px;line-height:1.05;letter-spacing:-0.02em}
p{margin:0;font-size:28px;line-height:1.3;color:${MUTED};display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden}
.brand{margin-top:auto;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:600}
.page{position:absolute;right:64px;top:64px;width:440px;height:502px;display:flex;align-items:center;justify-content:center}
.page svg{max-width:100%;max-height:100%;width:auto;height:auto;border:1px solid #d4d4d8;border-radius:6px;box-shadow:0 12px 32px rgba(24,24,27,.18)}
</style></head><body><div class="bar"></div>
<div class="words">${iconSvg(def.icon, 80, ACCENT)}<h1>${xml(def.name)}</h1><p>${xml(def.blurb)}</p><div class="brand">${markSvg(44)}<span>Tiny Little Office</span></div></div>
<div class="page">${pageSvg(page)}</div>
</body></html>`;
}

async function main() {
  const out = join(root, 'public', 'og');
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  // Nothing from the web: a card is drawn from the template alone.
  await tab.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
  for (const def of apps()) {
    await tab.setContent(cardHtml(def), { waitUntil: 'load' });
    await tab.screenshot({ path: join(out, `${def.id}.png`), type: 'png' });
  }
  await browser.close();
  console.log(`cards: ${apps().map((a) => `og/${a.id}.png`).join(', ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
