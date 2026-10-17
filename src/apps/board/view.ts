/**
 * A board drawn, with no DOM: its lanes as columns side by side, each with its name and how many cards it holds, its
 * cards under it, each card its title and its fields as the Spreadsheet shows its cells (money in its currency, a date
 * as a date, a formula's value: sheet/view.ts `cellText`). A print, a PDF, a PNG and the Display Link get landscape
 * Letter pages, four lanes to a page and the lanes after them on further pages, each page as tall as its longest lane
 * needs; drawn small (on a slide, in a text) or as a thumbnail, one landscape page of the first lanes with the titles
 * that fit. And the board as words, for a screen reader and the API: lane by lane, card by card.
 */
import { evaluateTable, tableAt, textOf, type CellValue, type Doc, type TextNode } from '../../doc/index.ts';
import type { Page } from '../../kit/core/app.ts';
import { LINE, MUTED, PAPER, SHADE, clip, rect, text, wrapText } from '../../kit/draw/draw.ts';
import { t } from '../../kit/core/i18n.ts';
import { cellText } from '../sheet/view.ts';
import { boardOf, type BoardView, type Lane } from './model.ts';

/** A card as it is drawn: its title, and its fields as their columns show them. */
export interface Shown {
  title: string;
  fields: { name: string; value: string }[];
}

/** Each card's words as drawn, by its row: the cells worked out (a formula's value), each in its column's way. */
export function shownCards(doc: Doc, v: BoardView = boardOf(doc)): Map<number, Shown> {
  const out = new Map<number, Shown>();
  const table = v.at >= 0 ? tableAt(doc, v.at) : null;
  if (!table) return out;
  const values: CellValue[][] = evaluateTable(table).values;
  const show = (r: number, c: number) =>
    cellText(values[r]?.[c] ?? null, v.cols[c]?.type, v.cols[c]?.currency || doc.head.currency || undefined)
      .replace(/\s+/g, ' ')
      .trim();
  for (const card of v.cards)
    out.set(card.row, {
      title: v.titleCol >= 0 ? show(card.row, v.titleCol) : '',
      fields: card.fields.map((f) => ({ name: f.name, value: show(card.row, f.col) })).filter((f) => f.value),
    });
  return out;
}

/** A landscape Letter page, at 96 to the inch. */
const PAGE = { w: 1056, h: 816 };
const M = 24;
const GAP = 12;
const LANE = 240;
/** The lanes a landscape page holds side by side. */
const ACROSS = Math.floor((PAGE.w - 2 * M + GAP) / (LANE + GAP));
const TITLE_PX = 14;
const FIELD_PX = 12;
/** A card's title wraps to at most this many lines, and shows at most this many of its fields. */
const TITLE_LINES = 3;
const FIELDS = 4;
const HEAD = 48;

/** A lane's name as drawn: the nameless lane a dash. */
const laneName = (l: Lane) => l.name || '–';

/** A card at (x, y), and how tall it is: its title wrapped, then a line a field. Small, the title's first line alone. */
function cardSvg(s: Shown, x: number, y: number, small: boolean): { svg: string; h: number } {
  const w = LANE - 16;
  const lines = small ? [clip(s.title || '–', w - 24, TITLE_PX)] : wrapText(s.title || '–', w - 24, TITLE_PX, true).slice(0, TITLE_LINES);
  const fields = small ? [] : s.fields.slice(0, FIELDS);
  const h = 14 + lines.length * 19 + fields.length * 17 + 6;
  let svg = rect(x, y, w, h, PAPER, `rx="6" stroke="${LINE}"`);
  lines.forEach((l, k) => (svg += text(x + 12, y + 26 + k * 19, l, { px: TITLE_PX, bold: !small })));
  fields.forEach((f, k) => (svg += text(x + 12, y + 20 + lines.length * 19 + k * 17, clip(`${f.name}: ${f.value}`, w - 24, FIELD_PX), { px: FIELD_PX, fill: MUTED })));
  return { svg, h };
}

/** Lanes side by side from the left of a page: their backs, names, counts and the cards that fit above `room` (Infinity: every card). */
function lanesSvg(lanes: Lane[], shown: Map<number, Shown>, room: number, small: boolean): { svg: string; tall: number } {
  let back = '';
  let svg = '';
  let tall = 0;
  lanes.forEach((l, i) => {
    const x = M + i * (LANE + GAP);
    svg += text(x + 12, M + 26, clip(laneName(l), LANE - 64, 15, true), { px: 15, bold: true }) + text(x + LANE - 12, M + 26, String(l.cards.length), { px: 13, fill: MUTED, anchor: 'end' });
    let y = M + HEAD;
    for (const c of l.cards) {
      const made = cardSvg(shown.get(c.row) ?? { title: c.title, fields: [] }, x + 8, y, small);
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
const altOf = (lanes: Lane[], shown: Map<number, Shown>) =>
  lanes.map((l) => `${laneName(l)} (${l.cards.length}): ${l.cards.map((c) => shown.get(c.row)?.title || c.title || '–').join(', ')}`).join('. ');

/**
 * The board's pages: four lanes to a landscape Letter page, the rest on further pages, each page as tall as its longest
 * lane; small (or a thumbnail), one landscape page of four by three holding the first lanes and the titles that fit.
 * A board with no lanes is one page saying it has no cards.
 */
export function boardPages(doc: Doc, small = false): Page[] {
  const v = boardOf(doc);
  if (!v.lanes.length) return [{ w: 480, h: 120, svg: text(240, 66, t('board-no-cards'), { px: 16, fill: MUTED, anchor: 'middle' }), alt: t('board-no-cards') }];
  const shown = shownCards(doc, v);
  if (small) {
    const lanes = v.lanes.slice(0, ACROSS);
    const w = 2 * M + Math.max(3, lanes.length) * (LANE + GAP) - GAP;
    const h = Math.round((w * 3) / 4);
    const made = lanesSvg(lanes, shown, h - M, true);
    return [{ w, h, svg: rect(0, 0, w, h, PAPER) + made.svg.replaceAll('__H__', String(h - 2 * M)), alt: altOf(lanes, shown) }];
  }
  const pages: Page[] = [];
  for (let i = 0; i < v.lanes.length; i += ACROSS) {
    const lanes = v.lanes.slice(i, i + ACROSS);
    const made = lanesSvg(lanes, shown, Infinity, false);
    const h = Math.max(PAGE.h, made.tall + 2 * M);
    pages.push({ w: PAGE.w, h, svg: rect(0, 0, PAGE.w, h, PAPER) + made.svg.replaceAll('__H__', String(h - 2 * M)), alt: altOf(lanes, shown) });
  }
  return pages;
}

/** The board as words, lane by lane: each lane's name, then its cards, each its title and its fields. A document with no board is its own words. */
export function boardText(doc: Doc): TextNode[] {
  const v = boardOf(doc);
  if (v.at < 0 && !v.lanes.length) return textOf(doc);
  const shown = shownCards(doc, v);
  return v.lanes.flatMap((l): TextNode[] => [
    { k: 'h', level: 2, runs: [{ t: laneName(l) }] },
    ...(l.cards.length
      ? [
          {
            k: 'list' as const,
            ord: false,
            items: l.cards.map((c) => {
              const s = shown.get(c.row);
              const fields = (s?.fields ?? []).map((f) => `${f.name}: ${f.value}`).join(', ');
              return { runs: [{ t: s?.title || c.title || '–', b: true as const }, ...(fields ? [{ t: ` · ${fields}` }] : [])] };
            }),
          },
        ]
      : [{ k: 'p' as const, runs: [{ t: t('board-no-cards') }] }]),
  ]);
}
