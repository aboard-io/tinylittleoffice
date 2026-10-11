/**
 * The site's type for the pictures drawn by script (scripts/make-cards.ts, scripts/icons.ts' og.png): every face of
 * src/styles/fonts.css with its file from public/fonts/ inline, so a page Chromium draws is in IBM Plex as the site
 * is (Paul, 2026-10-11: "we use Plex everywhere"), nothing is fetched, and nothing depends on the fonts of the
 * machine that runs it. `shoot` draws such pages to PNGs, waiting for the faces they use.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(import.meta.url), '../..');

/** The @font-face rules of src/styles/fonts.css, each file as a data: URL. */
export function plexFaces(): string {
  const css = readFileSync(join(root, 'src/styles/fonts.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/@font-face\s*\{[^}]*\}/g)]
    .map((m) => m[0].replace(/url\('\/fonts\/([^']+)'\)/, (_, file: string) => `url('data:font/woff2;base64,${readFileSync(join(root, 'public/fonts', file)).toString('base64')}')`))
    .join('\n');
}

/** Draw each page (1200 by 630) to its file through Chromium, once its faces are in; nothing from the web. */
export async function shoot(pages: [html: string, file: string][]): Promise<void> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await tab.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
  for (const [html, file] of pages) {
    await tab.setContent(html, { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready.then(() => undefined));
    await tab.screenshot({ path: file, type: 'png' });
  }
  await browser.close();
}
