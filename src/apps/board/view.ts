/**
 * Board drawn and written out, with no DOM: the page for print, PDF, PNG and thumbnails (the stages as
 * columns, their cards in them) and the CSV of Stage and Card.
 */
import type { Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { csv, csvSeparator } from '../../kit/csv.ts';
import { INK, LINE, MUTED, PAPER, SHADE, clip, rect, text, wrapText } from '../../kit/draw.ts';
import { STAGE_COLORS, progress, readBoard } from './model.ts';

const COL = 220;

/** The board as a page; the first `max` cards of it (counting stage by stage). */
export function boardPage(doc: Doc, max = Infinity): Page {
  const stages = readBoard(doc).stages;
  let shown = 0;
  let tall = 0;
  let svg = '';
  stages.forEach((s, i) => {
    const left = 24 + i * (COL + 12);
    let y = 64;
    let cards = '';
    for (const c of s.cards) {
      const lines = wrapText(c.words, COL - 40, 14).slice(0, 4);
      const done = progress(c);
      const h = lines.length * 19 + 18 + (done ? 16 : 0);
      if (shown++ < max) cards += rect(left + 8, y, COL - 16, h, PAPER, `rx="6" stroke="${LINE}"`) + lines.map((l, k) => text(left + 20, y + 22 + k * 19, l, { px: 14 })).join('') + (done ? text(left + 20, y + h - 8, `☑ ${done}`, { px: 12, fill: MUTED }) : '');
      y += h + 8;
    }
    tall = Math.max(tall, y);
    svg += `<g data-col="${i}">` + text(left + 12, 46, clip(s.name, COL - 80, 15, true), { px: 15, bold: true }) + text(left + COL - 12, 46, `${s.cards.length}${s.limit ? ' / ' + s.limit : ''}`, { px: 13, fill: MUTED, anchor: 'end' }) + cards + '</g>';
  });
  const h = Math.max(160, tall + 24);
  const back = stages.map((s, i) => rect(24 + i * (COL + 12), 20, COL, h - 40, SHADE, 'rx="10"') + (s.color ? rect(24 + i * (COL + 12), 20, COL, 5, STAGE_COLORS[s.color].hex, 'rx="2"') : '')).join('');
  const alt = stages.map((s) => `${s.name}: ${s.cards.map((c) => c.words).join(', ') || '–'}`).join('. ');
  return { w: Math.max(240, 48 + stages.length * (COL + 12) - 12), h, svg: back + svg || text(24, 60, '–', { px: 16, fill: INK }), alt: alt || undefined };
}

/** The board as a CSV: a row for each card, the stage it is in beside it. */
export const boardToCsv = (doc: Doc, sep = csvSeparator()) => csv([['Stage', 'Card'], ...readBoard(doc).stages.flatMap((s) => s.cards.map((c) => [s.name, c.words]))], sep);
