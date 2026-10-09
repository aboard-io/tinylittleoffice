/**
 * Board drawn and written out, with no DOM: the page for print, PDF, PNG and thumbnails (the stages as
 * columns, their cards in them; with `look: rows`, as bands one under another, their cards across) and the
 * CSV of Stage and Card. Each stage's colour is its edge and its cards' top edge.
 */
import type { Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { csv, csvSeparator } from '../../kit/csv.ts';
import { INK, LINE, MUTED, PAPER, SHADE, clip, rect, text, wrapText } from '../../kit/draw.ts';
import { STAGE_COLORS, progress, readBoard, type Card, type Stage } from './model.ts';

const COL = 220;
/** Cards across a band, when the stages are rows. */
const ACROSS = 4;

/** A card: its sheet, its colour's top edge, its words and its checklist's count; and how tall it is. */
function cardSvg(c: Card, x: number, y: number, hex: string): { svg: string; h: number } {
  const lines = wrapText(c.words, COL - 40, 14).slice(0, 4);
  const done = progress(c);
  const h = lines.length * 19 + 18 + (done ? 16 : 0);
  return { h, svg: rect(x, y, COL - 16, h, PAPER, `rx="6" stroke="${LINE}"`) + rect(x, y, COL - 16, 3, hex, 'rx="1.5"') + lines.map((l, k) => text(x + 12, y + 22 + k * 19, l, { px: 14 })).join('') + (done ? text(x + 12, y + h - 8, `☑ ${done}`, { px: 12, fill: MUTED }) : '') };
}

/** The board with its stages as bands, one under another, each card a sheet across it, wrapping. */
function rowsPage(stages: Stage[], max: number): Page {
  let shown = 0;
  let y = 20;
  let svg = '';
  const w = 48 + ACROSS * (COL - 8);
  for (const s of stages) {
    const top = y;
    const hex = STAGE_COLORS[s.hue].hex;
    let body = text(36, y + 26, clip(s.name, w - 140, 15, true), { px: 15, bold: true }) + text(w - 36, y + 26, `${s.cards.length}${s.limit ? ' / ' + s.limit : ''}`, { px: 13, fill: MUTED, anchor: 'end' });
    let line = 0;
    let row = y + 40;
    s.cards.forEach((c, k) => {
      if (shown++ >= max) return;
      if (k && k % ACROSS === 0) {
        row += line + 8;
        line = 0;
      }
      const made = cardSvg(c, 32 + (k % ACROSS) * (COL - 8), row, hex);
      body += made.svg;
      line = Math.max(line, made.h);
    });
    y = row + line + 16;
    svg += rect(24, top, w - 48, y - top - 4, SHADE, 'rx="10"') + rect(24, top, 5, y - top - 4, hex, 'rx="2"') + `<g data-row="${stages.indexOf(s)}">${body}</g>`;
    y += 8;
  }
  const alt = stages.map((s) => `${s.name}: ${s.cards.map((c) => c.words).join(', ') || '–'}`).join('. ');
  return { w, h: Math.max(160, y + 12), svg: svg || text(24, 60, '–', { px: 16, fill: INK }), alt: alt || undefined };
}

/** The board as a page; the first `max` cards of it (counting stage by stage). */
export function boardPage(doc: Doc, max = Infinity): Page {
  const board = readBoard(doc);
  const stages = board.stages;
  if (board.rows) return rowsPage(stages, max);
  let shown = 0;
  let tall = 0;
  let svg = '';
  stages.forEach((s, i) => {
    const left = 24 + i * (COL + 12);
    let y = 64;
    let cards = '';
    for (const c of s.cards) {
      const made = cardSvg(c, left + 8, y, STAGE_COLORS[s.hue].hex);
      if (shown++ < max) cards += made.svg;
      y += made.h + 8;
    }
    tall = Math.max(tall, y);
    svg += `<g data-col="${i}">` + text(left + 12, 46, clip(s.name, COL - 80, 15, true), { px: 15, bold: true }) + text(left + COL - 12, 46, `${s.cards.length}${s.limit ? ' / ' + s.limit : ''}`, { px: 13, fill: MUTED, anchor: 'end' }) + cards + '</g>';
  });
  const h = Math.max(160, tall + 24);
  const back = stages.map((s, i) => rect(24 + i * (COL + 12), 20, COL, h - 40, SHADE, 'rx="10"') + rect(24 + i * (COL + 12), 20, COL, 5, STAGE_COLORS[s.hue].hex, 'rx="2"')).join('');
  const alt = stages.map((s) => `${s.name}: ${s.cards.map((c) => c.words).join(', ') || '–'}`).join('. ');
  return { w: Math.max(240, 48 + stages.length * (COL + 12) - 12), h, svg: back + svg || text(24, 60, '–', { px: 16, fill: INK }), alt: alt || undefined };
}

/** The board as a CSV: a row for each card, the stage it is in beside it. */
export const boardToCsv = (doc: Doc, sep = csvSeparator()) => csv([['Stage', 'Card'], ...readBoard(doc).stages.flatMap((s) => s.cards.map((c) => [s.name, c.words]))], sep);
