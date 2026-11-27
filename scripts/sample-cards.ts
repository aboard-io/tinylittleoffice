/**
 * The sample documents' share cards (Paul, 2026-10-13: "make a lot of sample documents and then make a lot of
 * previews of them for social"): for each .tlo in samples/, the picture a network would show its link with, drawn as
 * the Share dialog draws it (src/kit/share/card.ts: the page its app puts on a card, across the card on its ground,
 * 1200 by 630), and the title and first words it posts beside it, with the document's link. A trip's map is the plain
 * ground here: its picture is drawn by MapLibre in the site's own page (apps/trip/picture.ts), which this is not, and
 * nothing from the web is let through. Chromium draws them, in the site's own faces (scripts/plex.ts).
 *
 *   npm run samples            samples/cards/<name>.png, and manifest.json: name, app, title, text, link; kept in the tree, as public/og is
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../src/doc/index.ts';
import { appOf } from '../src/kit/core/apps.ts';
import { CARD_H, CARD_W, cardSvg, GROUND } from '../src/kit/draw/card.ts';
import { cardWords } from '../src/kit/share/card.ts';
import { link } from '../src/api.ts';
import { plexFaces, shoot } from './plex.ts';

const root = resolve(fileURLToPath(import.meta.url), '../..');
const dir = join(root, 'samples');
const out = join(dir, 'cards');
mkdirSync(out, { recursive: true });

const faces = plexFaces();
const pages: [string, string][] = [];
const manifest: { name: string; app: string; title: string; text: string; link: string }[] = [];
for (const f of readdirSync(dir)
  .filter((f) => f.endsWith('.tlo'))
  .sort()) {
  const text = readFileSync(join(dir, f), 'utf8');
  const app = String((parse(text).head as Record<string, unknown> | undefined)?.app ?? '');
  const def = appOf(app);
  if (!def) throw new Error(`${f}: no app "${app}"`);
  const page = def.view(text, { still: true, card: true })[0];
  if (!page) throw new Error(`${f}: no page`);
  const name = basename(f, '.tlo');
  pages.push([
    `<!doctype html><html><head><meta charset="utf-8"><style>${faces}html,body{margin:0;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;background:${GROUND}}svg{display:block}</style></head><body>${cardSvg(page)}</body></html>`,
    join(out, `${name}.png`),
  ]);
  const title = def.title(text);
  manifest.push({ name, app, ...cardWords(def, text, title), link: link(app, text, { title }) });
}
await shoot(pages);
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${pages.length} cards in samples/cards`);
