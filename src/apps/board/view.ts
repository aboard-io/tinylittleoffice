/**
 * A board drawn, with no DOM: its lanes as columns side by side, each with its name and how many cards it holds, its
 * cards under it, each card its title and its fields as the Spreadsheet shows its cells (money in its currency, a date
 * as a date, a formula's value, "'007" as 007), as the model reads them (model.ts `boardOf`, the one place that rule is
 * kept, so the editor's cards and these say the same words). A print, a PDF, a PNG and the Display Link get landscape
 * Letter pages, four lanes to a page and the lanes after them on further pages, each page as tall as its longest lane
 * needs, and every card whole: its title and each of its fields wrapped to the card's width, none cut, since a page is
 * what a board is read from away from the screen. Drawn small (on a slide, in a text) or as a thumbnail, it is the
 * gist: one landscape page of the first four lanes, each card its title's first line, as many as fit. And the board as
 * words, for a screen reader and the API: lane by lane, card by card. The drawing is the kit's (`rect`, `text`,
 * `wrapText`, its colors), as every app's in the suite is, so a board's page looks like theirs.
 */
import { textOf, type Doc, type TextNode } from '../../doc/index.ts';
import { LINE, MUTED, PAPER, SHADE, clip, rect, text, wrapText } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';
import type { Page } from '../../kit/core/app.ts';
import { boardOf, type Card, type Field, type Lane } from './model.ts';

/** A card's fields as drawn: those that show something (a formula that works out to nothing shows nothing). */
export const shownFields = (c: Card): Field[] => c.fields.filter((f) => f.shown);

/** A landscape Letter page, at 96 to the inch. */
const PAGE = { w: 1056, h: 816 };
const M = 24;
const GAP = 12;
const LANE = 240;
/** The lanes a landscape page holds side by side. */
const ACROSS = Math.floor((PAGE.w - 2 * M + GAP) / (LANE + GAP));
const TITLE_PX = 14;
const FIELD_PX = 12;
const HEAD = 48;

/** A lane's name as drawn: the nameless lane a dash. */
const laneName = (l: Lane) => l.name || '–';

/** A card at (x, y), and how tall it is: its title wrapped, then each field wrapped, all of them. Small, the title's first line alone. */
function cardSvg(c: Card, x: number, y: number, small: boolean): { svg: string; h: number } {
  const w = LANE - 16;
  const lines = small ? [clip(c.title || '–', w - 24, TITLE_PX)] : wrapText(c.title || '–', w - 24, TITLE_PX, true);
  const fields = small ? [] : shownFields(c).flatMap((f) => wrapText(`${f.name}: ${f.shown}`, w - 24, FIELD_PX));
  const h = 14 + lines.length * 19 + fields.length * 17 + 6;
  let svg = rect(x, y, w, h, PAPER, `rx="6" stroke="${LINE}"`);
  lines.forEach((l, k) => (svg += text(x + 12, y + 26 + k * 19, l, { px: TITLE_PX, bold: !small })));
  fields.forEach((l, k) => (svg += text(x + 12, y + 20 + lines.length * 19 + k * 17, l, { px: FIELD_PX, fill: MUTED })));
  return { svg, h };
}

/** Lanes side by side from the left of a page: their backs, names, counts and the cards that fit above `room` (Infinity: every card). */
function lanesSvg(lanes: Lane[], room: number, small: boolean): { svg: string; tall: number } {
  let back = '';
  let svg = '';
  let tall = 0;
  lanes.forEach((l, i) => {
    const x = M + i * (LANE + GAP);
    svg += text(x + 12, M + 26, clip(laneName(l), LANE - 64, 15, true), { px: 15, bold: true }) + text(x + LANE - 12, M + 26, String(l.cards.length), { px: 13, fill: MUTED, anchor: 'end' });
    let y = M + HEAD;
    for (const c of l.cards) {
      const made = cardSvg(c, x + 8, y, small);
      if (y + made.h > room) break;
      svg += made.svg;
      y += made.h + 8;
    }
    tall = Math.max(tall, y);
    back += `<rect x="${x}" y="${M}" width="${LANE}" height="__H__" rx="10" fill="${SHADE}"/>`;
  });
  return { svg: back + svg, tall };
}

/** What a page shows, in words: each lane's name and count, and its cards' titles. */
const altOf = (lanes: Lane[]) => lanes.map((l) => `${laneName(l)} (${l.cards.length}): ${l.cards.map((c) => c.title || '–').join(', ')}`).join('. ');

/**
 * The board's pages: four lanes to a landscape Letter page, the rest on further pages, each page as tall as its longest
 * lane; small (or a thumbnail), one landscape page of four by three holding the first lanes and the titles that fit.
 * A board with no lanes is one page saying it has no cards.
 */
export function boardPages(doc: Doc, small = false): Page[] {
  const v = boardOf(doc);
  if (!v.lanes.length) return [{ w: 480, h: 120, svg: text(240, 66, t('board-no-cards'), { px: 16, fill: MUTED, anchor: 'middle' }), alt: t('board-no-cards') }];
  if (small) {
    const lanes = v.lanes.slice(0, ACROSS);
    const w = 2 * M + Math.max(3, lanes.length) * (LANE + GAP) - GAP;
    const h = Math.round((w * 3) / 4);
    const made = lanesSvg(lanes, h - M, true);
    return [{ w, h, svg: rect(0, 0, w, h, PAPER) + made.svg.replaceAll('__H__', String(h - 2 * M)), alt: altOf(lanes) }];
  }
  const pages: Page[] = [];
  for (let i = 0; i < v.lanes.length; i += ACROSS) {
    const lanes = v.lanes.slice(i, i + ACROSS);
    const made = lanesSvg(lanes, Infinity, false);
    const h = Math.max(PAGE.h, made.tall + 2 * M);
    pages.push({ w: PAGE.w, h, svg: rect(0, 0, PAGE.w, h, PAPER) + made.svg.replaceAll('__H__', String(h - 2 * M)), alt: altOf(lanes) });
  }
  return pages;
}

/** The board as words, lane by lane: each lane's name, then its cards, each its title and its fields. A document with no board is its own words. */
export function boardText(doc: Doc): TextNode[] {
  const v = boardOf(doc);
  if (v.at < 0 && !v.lanes.length) return textOf(doc);
  return v.lanes.flatMap((l): TextNode[] => [
    { k: 'h', level: 2, runs: [{ t: laneName(l) }] },
    ...(l.cards.length
      ? [
          {
            k: 'list' as const,
            ord: false,
            items: l.cards.map((c) => {
              const fields = shownFields(c)
                .map((f) => `${f.name}: ${f.shown}`)
                .join(', ');
              return { runs: [{ t: c.title || '–', b: true as const }, ...(fields ? [{ t: ` · ${fields}` }] : [])] };
            }),
          },
        ]
      : [{ k: 'p' as const, runs: [{ t: t('board-no-cards') }] }]),
  ]);
}
