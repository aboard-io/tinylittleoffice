/**
 * The site's icons, drawn from the Office mark (src/kit/mark.ts): public/favicon.svg (the ink colour, light
 * or dark as the browser is), and, through sharp, the PNGs a browser or a phone asks for: favicon-32,
 * apple-touch-icon (180), icon-192, icon-512 and icon-maskable-512 (the accent on paper); and og.png (the
 * share card, 1200 by 630), drawn by Chromium in the site's IBM Plex (scripts/plex.ts). The PNGs are kept in
 * public/; run this again only when the mark or the card's words change.
 *
 *   npm run icons
 *   node scripts/icons.ts --preview out.png    the mark at 512 and at 16, side by side, to look at
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONT } from '../src/kit/draw.ts';
import { markPaths } from '../src/kit/mark.ts';
import { plexFaces, shoot } from './plex.ts';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const pub = (f: string) => join(root, 'public', f);

const INK = '#18181b';
const INK_DARK = '#e4e4e7';
const ACCENT = '#4f46e5';
const PAPER = '#ffffff';

/** The mark's strokes, `side` pixels square at (x, y), in `colour`. */
const marked = (colour: string, side: number, x = 0, y = 0) =>
  `<svg x="${x}" y="${y}" width="${side}" height="${side}" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;

/** An app icon: the mark in the accent on paper, `inset` of the side left round it. */
const appIcon = (side: number, inset: number, round = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}"><rect width="${side}" height="${side}" rx="${round ? side * 0.18 : 0}" fill="${PAPER}"/>${marked(ACCENT, side * (1 - 2 * inset), side * inset, side * inset)}</svg>`;

export const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><style>svg{color:${INK}}@media (prefers-color-scheme:dark){svg{color:${INK_DARK}}}</style>${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>\n`;

/** The share card, 1200 by 630, as a page for Chromium to draw in the site's own Plex (scripts/plex.ts). */
export const ogHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
${plexFaces()}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${PAPER};font-family:${FONT}}
</style></head><body><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${PAPER}"/><rect x="0" y="0" width="1200" height="12" fill="${ACCENT}"/>${marked(ACCENT, 260, 110, 185)}<text x="420" y="300" font-size="84" font-weight="600" fill="${INK}">Tiny Little Office</text><text x="424" y="380" font-size="42" fill="#52525b">The link is the document.</text></svg></body></html>`;

async function main() {
  // sharp arrives with the toolchain (wrangler's); the icons are kept in public/, so this runs only by hand.
  const { default: sharp } = (await import('sharp' as string)) as { default: (b: Buffer | object) => any };
  const png = (svg: string, file: string, flatten = true) => {
    const s = sharp(Buffer.from(svg));
    return (flatten ? s.flatten({ background: PAPER }) : s).png().toFile(file);
  };
  const preview = process.argv.indexOf('--preview');
  if (preview > 0) {
    const big = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${marked(INK, 512)}</svg>`;
    const tiny = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">${marked(INK, 16)}</svg>`))
      .flatten({ background: PAPER })
      .resize(192, 192, { kernel: 'nearest' })
      .png()
      .toBuffer();
    const bigPng = await sharp(Buffer.from(big)).flatten({ background: PAPER }).png().toBuffer();
    await sharp({ create: { width: 760, height: 520, channels: 3, background: PAPER } })
      .composite([
        { input: bigPng, left: 0, top: 0 },
        { input: tiny, left: 548, top: 160 },
      ])
      .png()
      .toFile(process.argv[preview + 1]);
    return;
  }
  writeFileSync(pub('favicon.svg'), favicon);
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">${marked(INK, 30, 1, 1)}</svg>`, pub('favicon-32.png'), false);
  await png(appIcon(180, 0.16, false), pub('apple-touch-icon.png'));
  await png(appIcon(192, 0.16), pub('icon-192.png'), false);
  await png(appIcon(512, 0.16), pub('icon-512.png'), false);
  await png(appIcon(512, 0.26, false), pub('icon-maskable-512.png'));
  await shoot([[ogHtml, pub('og.png')]]);
  console.log('icons: favicon.svg, favicon-32, apple-touch-icon, icon-192, icon-512, icon-maskable-512, og');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
