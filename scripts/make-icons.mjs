// Draws the PNG icons and the link-preview card in public/ from SVG, using the
// Chromium that Playwright installs. Run: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const mark = (pad = 0) => {
  const s = 32 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${s} ${s}"><rect x="${-pad}" y="${-pad}" width="${s}" height="${s}" rx="${pad ? 0 : 8}" fill="#4f46e5"/><path d="M9 11h14M9 16h14M9 21h8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
};
const apps = ['Sheet', 'Write', 'Deck', 'Draw', 'Calendar', 'Todo', 'Board', 'Gantt', 'Trip', 'Tune', 'Motion'];
const card = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif">
<rect width="1200" height="630" fill="#fff"/><rect width="1200" height="14" fill="#4f46e5"/>
<rect x="72" y="96" width="112" height="112" rx="28" fill="#4f46e5"/><path d="M103 134h50M103 152h50M103 170h29" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
<text x="216" y="182" font-size="96" font-weight="700" fill="#18181b" letter-spacing="-3">TinyOffice</text>
<text x="72" y="304" font-size="46" fill="#3f3f46">A tiny office suite that lives entirely in the URL.</text>
<text x="72" y="368" font-size="34" fill="#71717a">No server, no accounts, no saving: the link is the document.</text>
${apps.map((a, i) => `<g transform="translate(${72 + (i % 6) * 178} ${430 + Math.floor(i / 6) * 76})"><rect width="162" height="56" rx="28" fill="#eef2ff"/><text x="81" y="37" text-anchor="middle" font-size="26" font-weight="600" fill="#4338ca">${a}</text></g>`).join('')}
</svg>`;

const jobs = [
  ['favicon-32.png', mark(), 32, 32],
  ['apple-touch-icon.png', mark(4), 180, 180],
  ['icon-192.png', mark(), 192, 192],
  ['icon-512.png', mark(), 512, 512],
  ['icon-maskable-512.png', mark(6), 512, 512],
  ['og.png', card, 1200, 630],
];

const browser = await chromium.launch();
for (const [name, svg, width, height] of jobs) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`);
  writeFileSync(new URL(`../public/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();
