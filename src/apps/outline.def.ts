/** Outline: what the shell knows about outlines. Format: lib/outlinemodel.ts. */
import { defineApp, utf8, wrap, text, ACCENT, type Page } from '../kit/core.ts';
import { parseInline, plainInline } from '../lib/richtext.ts';
import { parseOutline, toOpml, hasChildren, embedOf, outlineToDeck, type Item } from '../lib/outlinemodel.ts';
import { makeRef, refPage } from '../kit/embed.ts';
import { place } from '../kit/core.ts';

/** The outline drawn: a dot per item, deeper ones stepped in, the words wrapped. Fits a letter page's width; as tall as it needs. */
export function outlinePage(body: string, w = 720): Page {
  const items = parseOutline(body);
  const px = 17;
  const step = 28;
  let y = 44;
  let svg = '';
  items.forEach((it, i) => {
    if (!it.text.trim() && !hasChildren(items, i)) return;
    const x = 48 + it.depth * step;
    const sub = embedOf(it.text);
    if (sub) {
      // Another document, drawn small where its item would be.
      const p = refPage(sub, { w: 340 });
      const pw = Math.min(w - x - 48, 340);
      const ph = (p.h / p.w) * pw;
      svg += place(p, x, y + 8, pw, ph);
      y += ph + 16;
      return;
    }
    const lines = wrap(parseInline(it.text), w - x - 48, px, it.depth === 0);
    const top = y;
    svg += `<circle cx="${x - 12}" cy="${top + px * 0.65}" r="${it.depth ? 3 : 4}" fill="${it.depth ? 'none' : ACCENT}" stroke="${ACCENT}" stroke-width="1.5"/>`;
    for (const line of lines) svg += text(x, (y += px * 1.45) - px * 0.45, line, { px, bold: it.depth === 0 });
    y += px * 0.45;
  });
  return { w, h: Math.max(200, y + 40), svg };
}

const items = (body: string) => parseOutline(body).filter((it) => it.text.trim());
const title = (body: string) => plainInline(items(body).find((it) => !embedOf(it.text))?.text ?? '');

export default defineApp({
  id: 'outline',
  group: '',
  name: 'Outline',
  icon: 'outline',
  blurb: 'An outliner: ideas under ideas, folded and unfolded, moved about; the same text a mind map or an org chart reads.',
  title,
  outline: (body) => items(body).filter((it) => !embedOf(it.text)).map((it) => '  '.repeat(it.depth) + plainInline(it.text)),
  view: (body) => [outlinePage(body)],
  steps: (body) => items(body).length,
  downloads: [
    { ext: 'opml', label: 'OPML (for outliners)', mime: 'text/x-opml;charset=utf-8', build: (b) => utf8(toOpml(parseOutline(b), title(b) || 'Outline')) },
    { ext: 'txt', label: 'Plain text', mime: 'text/plain;charset=utf-8', build: (b) => utf8(items(b).map((it) => '  '.repeat(it.depth) + plainInline(it.text)).join('\n') + '\n') },
  ],
  shortcuts: [
    { keys: 'Enter', does: 'A new item below' },
    { keys: 'Tab / Shift+Tab', does: 'Indent, or bring out, with everything under it' },
    { keys: 'Alt+↑ / Alt+↓', does: 'Move the item (and its family) up or down' },
    { keys: 'Alt+← / Alt+→', does: 'Fold or unfold' },
    { keys: 'Backspace (in an empty item)', does: 'Take it away' },
    { keys: 'Mod+.', does: 'Zoom in on the item; Mod+, zooms out' },
  ],
});

/** The outline as another document: a mind map, an org chart, a family tree take this very text. */
export const outlineAs = (app: string, body: string) => makeRef(app, body);
export const outlineDeck = (body: string) => outlineToDeck(parseOutline(body));
export type { Item };
