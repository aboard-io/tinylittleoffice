// Draws the PNG icons and the link-preview cards in public/ from SVG, using
// the Chromium that Playwright installs. One card for the site and one per
// app (public/og/<id>.png): the app's name over a grey sketch of what its
// documents look like. Run: npm run icons
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import '../src/apps/index.ts';
import { apps } from '../src/kit/core.ts';

const mark = (pad = 0) => {
  const s = 32 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${s} ${s}"><rect x="${-pad}" y="${-pad}" width="${s}" height="${s}" rx="${pad ? 0 : 8}" fill="#4f46e5"/><path d="M9 11h14M9 16h14M9 21h8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
};
const FONT = `font-family="'IBM Plex Sans', system-ui, sans-serif"`;
// The cards are set in IBM Plex, from the same files the site serves.
const face = (weight) => `@font-face{font-family:'IBM Plex Sans';font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(new URL(`../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${weight}-normal.woff2`, import.meta.url)).toString('base64')}) format('woff2')}`;
const FACES = [400, 600, 700].map(face).join('');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const box = (x, y, w, h, fill = '#e4e4e7', rx = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const range = (n) => Array.from({ length: n }, (_, i) => i);

// Grey boxes in a 480 by 360 frame: a sketch of each kind of document.
const SKETCH = {
  sheet: () => range(6).flatMap((r) => range(4).map((c) => box(8 + c * 118, 8 + r * 58, 110, 50, r === 0 ? '#d4d4d8' : '#e4e4e7'))).join(''),
  write: () => box(8, 8, 300, 34, '#d4d4d8') + [460, 430, 464, 380, 0, 448, 400, 456, 250].map((w, i) => (w ? box(8, 70 + i * 32, w, 16) : '')).join(''),
  deck: () => box(8, 8, 464, 344, '#ececef', 12) + box(40, 44, 56, 56, '#c7d2fe', 12) + box(116, 54, 250, 36, '#d4d4d8') + range(4).map((i) => `<circle cx="52" cy="${154 + i * 44}" r="7" fill="#a5b4fc"/>` + box(74, 144 + i * 44, [330, 280, 350, 220][i], 20)).join(''),
  draw: () => box(20, 30, 170, 100, '#d4d4d8') + `<ellipse cx="370" cy="270" rx="90" ry="56" fill="#e4e4e7"/><path d="M196 110L296 228" stroke="#a1a1aa" stroke-width="6" stroke-linecap="round"/><path d="M300 234l-26-6 16-14z" fill="#a1a1aa"/><path d="M110 210l64 46-64 46-64-46z" fill="#e4e4e7"/>`,
  cal: () => range(5).flatMap((r) => range(7).map((c) => box(8 + c * 67, 8 + r * 70, 60, 62, (r * 7 + c) % 9 === 3 ? '#c7d2fe' : '#e4e4e7'))).join(''),
  todo: () => range(6).map((i) => box(8, 14 + i * 56, 32, 32, i < 2 ? '#a5b4fc' : '#d4d4d8') + box(60, 20 + i * 56, [300, 360, 240, 330, 280, 200][i], 20)).join(''),
  board: () => range(3).map((c) => box(8 + c * 158, 8, 148, 344, '#ececef', 10) + box(20 + c * 158, 22, 80, 16, '#d4d4d8') + range([3, 2, 4][c]).map((i) => box(20 + c * 158, 54 + i * 70, 124, 58, '#d4d4d8')).join('')).join(''),
  gantt: () => range(6).map((i) => box(8, 20 + i * 56, 110, 18) + box(140 + [0, 30, 90, 90, 170, 230][i], 14 + i * 56, [120, 150, 110, 200, 130, 90][i], 30, i % 3 === 0 ? '#a5b4fc' : '#d4d4d8')).join(''),
  trip: () => box(8, 8, 464, 344, '#ececef', 12) + `<path d="M70 280L170 120 300 220 410 80" fill="none" stroke="#a5b4fc" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` + [[70, 280], [170, 120], [300, 220], [410, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" fill="#a1a1aa" stroke="#fff" stroke-width="4"/>`).join(''),
  org: () => box(180, 20, 120, 50, '#a5b4fc') + [40, 180, 320].map((x) => box(x, 150, 120, 50) + `<path d="M240 70L${x + 60} 150" stroke="#a1a1aa" stroke-width="4"/>`).join('') + [0, 80].map((x) => box(x + 10, 280, 70, 40) + `<path d="M100 200L${x + 45} 280" stroke="#a1a1aa" stroke-width="4"/>`).join(''),
  mind: () => box(20, 150, 130, 54, '#a5b4fc', 27) + [30, 150, 270].map((y, i) => `<path d="M150 177L250 ${y + 20}" stroke="#a1a1aa" stroke-width="4"/>` + box(250, y, 110, 40, '#d4d4d8', 20) + (i !== 1 ? `<path d="M360 ${y + 20}L400 ${y + 20}" stroke="#a1a1aa" stroke-width="4"/>` + box(400, y, 70, 40, '#e4e4e7', 20) : '')).join(''),
  lanes: () => range(3).map((r) => box(8, 8 + r * 118, 464, 106, '#ececef', 8) + box(20, 46 + r * 118, 60, 16, '#d4d4d8')).join('') + [[110, 0], [230, 1], [350, 1], [350, 2]].map(([x, r]) => box(x, 36 + r * 118, 96, 48, r === 1 ? '#a5b4fc' : '#d4d4d8', 24)).join(''),
  venn: () => [[170, 150, '#a5b4fc'], [310, 150, '#d4d4d8'], [240, 250, '#c7d2fe']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="118" fill="${c}" opacity="0.55"/>`).join(''),
  net: () => [[240, 50], [400, 170], [330, 320], [150, 320], [80, 170]].map(([x, y], i, all) => `<path d="M${x} ${y}L${all[(i + 1) % 5][0]} ${all[(i + 1) % 5][1]}M${x} ${y}L${all[(i + 2) % 5][0]} ${all[(i + 2) % 5][1]}" stroke="#d4d4d8" stroke-width="4"/>`).join('') + [[240, 50], [400, 170], [330, 320], [150, 320], [80, 170]].map(([x, y], i) => `<rect x="${x - 56}" y="${y - 22}" width="112" height="44" rx="22" fill="${i ? '#d4d4d8' : '#a5b4fc'}"/>`).join(''),
  db: () => [[20, 30], [280, 30], [150, 210]].map(([x, y], i) => box(x, y, 180, 34, '#a5b4fc', 6) + box(x, y + 34, 180, 96, '#ececef', 6) + range(3).map((k) => box(x + 12, y + 48 + k * 26, [110, 80, 130][(k + i) % 3], 12, '#d4d4d8')).join('')).join('') + `<path d="M200 96L280 96M240 210L240 160" stroke="#a1a1aa" stroke-width="4"/>`,
  anim: () => box(8, 8, 464, 344, '#ececef', 12) + range(4).map((i) => `<circle cx="${90 + i * 100}" cy="${270 - i * 62}" r="${22 + i * 8}" fill="#a5b4fc" opacity="${0.25 + i * 0.25}"/>`).join('') + box(60, 60, 150, 26, '#d4d4d8'),
};

const frame = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" ${FONT}><rect width="1200" height="630" fill="#fff"/><rect width="1200" height="14" fill="#4f46e5"/>${inner}<text x="72" y="578" font-size="26" fill="#71717a">TinyOffice  ·  the link is the document</text></svg>`;
const logo = `<rect x="72" y="80" width="64" height="64" rx="16" fill="#4f46e5"/><path d="M90 102h28M90 112h28M90 122h17" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
/** Break a line of words to fit a column, roughly: enough for a card. */
const lines = (s, max) => s.split(' ').reduce((out, w) => ((out[out.length - 1] + ' ' + w).trim().length > max ? out.push(w) : (out[out.length - 1] = (out[out.length - 1] + ' ' + w).trim()), out), ['']);

const siteCard = frame(
  `<rect x="72" y="96" width="112" height="112" rx="28" fill="#4f46e5"/><path d="M103 134h50M103 152h50M103 170h29" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
<text x="216" y="182" font-size="96" font-weight="700" fill="#18181b" letter-spacing="-3">TinyOffice</text>
<text x="72" y="304" font-size="46" fill="#3f3f46">A tiny office suite that lives entirely in the URL.</text>
<text x="72" y="368" font-size="34" fill="#71717a">No server, no accounts, no saving.</text>
${apps().map((a, i) => `<g transform="translate(${72 + (i % 6) * 178} ${420 + Math.floor(i / 6) * 68})"><rect width="162" height="52" rx="26" fill="#eef2ff"/><text x="81" y="35" text-anchor="middle" font-size="25" font-weight="600" fill="#4338ca">${esc(a.name)}</text></g>`).join('')}`,
).replace(/<text x="72" y="578"[^>]*>[^<]*<\/text>/, '');

const appCard = (a) =>
  frame(`${logo}<text x="156" y="124" font-size="30" font-weight="600" fill="#52525b">TinyOffice</text>
<text x="72" y="268" font-size="104" font-weight="700" fill="#18181b" letter-spacing="-3">${esc(a.name)}</text>
${lines(a.blurb, 30).slice(0, 4).map((l, i) => `<text x="72" y="${336 + i * 44}" font-size="32" fill="#3f3f46">${esc(l)}</text>`).join('')}
<g transform="translate(648 120)">${(SKETCH[a.id] ?? SKETCH.write)()}</g>`);

const jobs = [
  ['favicon-32.png', mark(), 32, 32],
  ['apple-touch-icon.png', mark(4), 180, 180],
  ['icon-192.png', mark(), 192, 192],
  ['icon-512.png', mark(), 512, 512],
  ['icon-maskable-512.png', mark(6), 512, 512],
  ['og.png', siteCard, 1200, 630],
  ...apps().map((a) => [`og/${a.id}.png`, appCard(a), 1200, 630]),
];

mkdirSync(new URL('../public/og/', import.meta.url), { recursive: true });
const browser = await chromium.launch();
for (const [name, svg, width, height] of jobs) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<style>${FACES}html,body{margin:0}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(new URL(`../public/${name}`, import.meta.url), await page.screenshot({ omitBackground: true }));
  await page.close();
}
await browser.close();
console.log(`Drew ${jobs.length} pictures into public/`);
