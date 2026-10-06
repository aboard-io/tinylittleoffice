/**
 * Things to print: a few lines of text in, letter-size sheets out. The same
 * editor as the diagram apps shows the sheets beside the text; the PDF is
 * the sheets, at actual size.
 */
import { defineApp, place, rect, type AppDef, type Page } from '../kit/core.ts';
import { parseDeck, type Slide } from './deckmodel.ts';
import { LETTER } from './fold.ts';
import { OUTLINE_KEYS, registerSpec, type DiagramSpec } from './diagram.ts';

export { LETTER };
export const SIDEWAYS = { w: LETTER.h, h: LETTER.w };

/** The text as slides: an optional ":icon" (on a line of its own, or before the headline), a headline, lines; a blank line starts the next. */
export const slidesOf = (text: string): Slide[] => (text.trim() ? parseDeck(text.replace(/\n{3,}/g, '\n\n').trim().replace(/(^|\n\n):([a-z0-9-]+) +(?=\S)/g, '$1:$2\n')) : []);

/** Cards cut from letter sheets: as many sheets as it takes, `cols` by `rows` on each, with lines to cut along. */
export function tile(cards: Page[], cols: number, rows: number, sheet = LETTER): Page[] {
  if (!cards.length) return [{ ...sheet, svg: '' }];
  const { w, h } = cards[0];
  const [x0, y0] = [(sheet.w - cols * w) / 2, (sheet.h - rows * h) / 2];
  const sheets: Page[] = [];
  for (let i = 0; i < cards.length; i += cols * rows) {
    const svg = cards
      .slice(i, i + cols * rows)
      .map((c, n) => {
        const [x, y] = [x0 + (n % cols) * w, y0 + Math.floor(n / cols) * h];
        return place(c, x, y, w, h) + rect(x, y, w, h, 'none', 'stroke="#a1a1aa" stroke-dasharray="6 5"');
      })
      .join('');
    sheets.push({ ...sheet, svg });
  }
  return sheets;
}

/** A page of any length made to fit one letter sheet: shrunk if it must be, never stretched. */
export function onLetter(p: Page, m = 48): Page {
  const k = Math.min(1, (LETTER.w - 2 * m) / p.w, (LETTER.h - 2 * m) / p.h);
  return { ...LETTER, svg: place(p, (LETTER.w - p.w * k) / 2, m, p.w * k, p.h * k) };
}

/** Define an app that turns text into sheets to print. */
export function definePrint(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'> & Partial<AppDef>, spec: DiagramSpec & { sheets(text: string): Page[] }): AppDef {
  registerSpec(app.id, spec);
  const lines = (body: string) => body.split('\n').map((l) => l.trim().replace(/^(#+|:[a-z0-9-]+$)\s*/, '')).filter(Boolean);
  return defineApp({
    group: 'Print and fold',
    under: 'poster',
    title: (body) => lines(body)[0] ?? '',
    outline: (body) => lines(body).slice(0, 14),
    // Inside something else, the first sheet is the gist.
    view: (body, opts = {}) => (opts.embed ? spec.sheets(body).slice(0, 1) : spec.sheets(body)),
    shortcuts: OUTLINE_KEYS,
    ...app,
  });
}
