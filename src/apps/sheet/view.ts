/**
 * A sheet drawn, with no DOM: the table as a picture (the names over the columns shaded, numbers to the
 * right), the grid as a spreadsheet looks (letters, row numbers, grey lines: the thumbnail, and a table
 * inside a text), the chart it asks for, and the CSV. What `def.ts` builds its pages and files on, and
 * what Write may draw a table block with.
 */
import { chartData, chartPage, type ChartData } from '../../kit/chart.ts';
import { csv, csvSeparator } from '../../kit/csv.ts';
import { INK, LINE, MUTED, SHADE, clip, r as px2, rect, text, textWidth, xml } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { sheetHeadings } from '../../kit/xlsx.ts';
import { formatCell, parse, parseInline, plainText, type CellValue, type Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { currencyAt, readSheet, type SheetView } from './model.ts';

/** The names over the used columns, or null when every column goes by its letter alone. */
export const headings = (v: SheetView): string[] | null => sheetHeadings(v.table, v.used.cols);

/** A value as its column shows it, in words: a rich cell's words without their marks, money in its currency. */
export const cellText = (v: CellValue, type?: string, currency?: string): string => (type === 'rich' && typeof v === 'string' ? plainText(parseInline(v)) : formatCell(v, type, currency));

/** The used cells as shown: computed values. */
export function shown(v: SheetView): string[][] {
  return Array.from({ length: v.used.rows }, (_, r) => Array.from({ length: v.used.cols }, (_, c) => cellText(v.values[r]?.[c] ?? null, v.cols[c]?.type, currencyAt(v, c))));
}

/** A rich cell drawn as one line with its marks (bold, italic, underline, strike), or its words alone, cut, when they do not fit. */
function richText(x: number, y: number, raw: string, max: number, size: number): string {
  const runs = parseInline(raw);
  const words = plainText(runs);
  if (textWidth(words, size) > max) return text(x, y, clip(words, max, size), { px: size });
  const spans = runs.map((run) => {
    const deco = [run.u || run.href ? 'underline' : '', run.s ? 'line-through' : ''].filter(Boolean).join(' ');
    const attrs = `${run.b ? ' font-weight="700"' : ''}${run.i ? ' font-style="italic"' : ''}${deco ? ` text-decoration="${deco}"` : ''}`;
    return attrs ? `<tspan${attrs}>${xml(run.t)}</tspan>` : xml(run.t);
  });
  return `<text x="${px2(x)}" y="${px2(y)}" font-size="${size}" fill="${INK}" xml:space="preserve">${spans.join('')}</text>`;
}

/** The names over the columns, if any, then the used cells as shown. */
export function lines(v: SheetView): string[][] {
  const head = headings(v);
  return [...(head ? [head] : []), ...shown(v)];
}

/** The table as a CSV: the names over the columns, if any, then the computed values. */
export const sheetToCsv = (doc: Doc, sep = csvSeparator()): string => csv(lines(readSheet(doc)), sep);

/** The table as a chart reads it: numbers where a column holds numbers, words (dates, links, ticks) elsewhere; each series named by its column. */
export function chartOfSheet(v: SheetView): ChartData {
  const counts = ['text', 'name', 'number', 'money', 'percent'];
  return chartData(
    v.values.slice(0, v.used.rows).map((row) => row.map((x, c) => (v.cols[c]?.type === 'rich' ? cellText(x, 'rich') : counts.includes(v.cols[c]?.type) || typeof x !== 'number' ? x : formatCell(x, v.cols[c]?.type, currencyAt(v, c))))),
    v.cols.map((c) => c.name),
  );
}

/** The chart the sheet asks for, drawn; null when it asks for none. */
export const chartOf = (v: SheetView, w = 720, h = 440): Page | null => (v.table.chart ? chartPage(chartOfSheet(v), v.table.chart, '', w, h) : null);

/**
 * The table as a picture: the headline large above it if there is one, the names over the columns, if
 * any, shaded, then the rows. `upTo` of its filled cells have their contents, in reading order.
 */
export function tablePage(v: SheetView, upTo = Infinity): Page {
  const head = headings(v);
  const rows = lines(v);
  const big = v.big;
  const top = big ? 96 : 24;
  if (!rows.length) return { w: 480, h: 120, svg: text(240, 66, t('Empty sheet'), { px: 16, fill: MUTED, anchor: 'middle' }), alt: t('Empty sheet') };
  const PX = 15;
  const H = 30;
  const widths = Array.from({ length: rows[0].length }, (_, c) => Math.min(240, Math.max(64, ...rows.map((row) => textWidth(row[c], PX) + 24))));
  const w = Math.max(widths.reduce((a, b) => a + b, 0), big ? textWidth(big.value, 40, true) + 24 : 0);
  let svg = '';
  if (big) svg += text(24, 52, clip(big.value, w, 40, true), { px: 40, bold: true }) + text(24, 76, clip(big.label, w, 14), { px: 14, fill: MUTED });
  let filled = 0;
  rows.forEach((row, i) => {
    let at = 24;
    const names = !!head && i === 0;
    const r = i - (head ? 1 : 0);
    row.forEach((cell, c) => {
      const num = !names && typeof v.values[r]?.[c] === 'number';
      svg += rect(at, top + i * H, widths[c], H, names ? SHADE : 'none', `stroke="${LINE}"`);
      const raw = names ? '' : (v.table.rows[r]?.[c] ?? '');
      const rich = v.cols[c]?.type === 'rich' && raw !== '' && !raw.startsWith('=');
      if (cell !== '' && (names || filled++ < upTo))
        svg += rich ? richText(at + 12, top + i * H + 20, raw, widths[c] - 20, PX) : text(num ? at + widths[c] - 12 : at + 12, top + i * H + 20, clip(cell, widths[c] - 20, PX, names), { px: PX, bold: names, anchor: num ? 'end' : 'start' });
      at += widths[c];
    });
  });
  const alt = (big ? `${big.label}: ${big.value}. ` : '') + rows.map((row) => row.filter(Boolean).join(', ')).join('; ');
  return { w: w + 48, h: rows.length * H + top + 24, svg, alt };
}

/**
 * The table as a spreadsheet looks: a strip of column letters along the top, the names under them in
 * bold, row numbers down the side, grey grid lines, words at an ordinary size, numbers to the right. The
 * thumbnail, and what a table in a text being written is.
 */
export function gridPage(v: SheetView): Page {
  const head = headings(v);
  const rowsShown = lines(v);
  const PX = 13;
  const H = 24;
  const HEAD = 22;
  const NUM = 34;
  const n = Math.max(5, v.used.rows);
  const across = Math.max(3, v.used.cols);
  const top = head ? 1 : 0;
  const widths = Array.from({ length: across }, (_, c) => Math.min(200, Math.max(72, ...rowsShown.map((row) => textWidth(row[c] ?? '', PX) + 18))));
  const w = NUM + widths.reduce((a, b) => a + b, 0);
  const h = HEAD + (n + top) * H;
  let svg = rect(0, 0, w, h, '#fff');
  // The strips: letters along the top, numbers down the side.
  svg += rect(0, 0, w, HEAD, SHADE) + rect(0, 0, NUM, h, SHADE);
  let x = NUM;
  widths.forEach((cw, c) => {
    svg += text(x + cw / 2, 15, String.fromCharCode(65 + c), { px: 11, fill: MUTED, anchor: 'middle' });
    x += cw;
  });
  for (let r = 0; r < n; r++) svg += text(NUM / 2, HEAD + (r + top) * H + 16, String(r + 1), { px: 11, fill: MUTED, anchor: 'middle' });
  // The names, then the cells.
  rowsShown.forEach((row, i) => {
    let at = NUM;
    const names = !!head && i === 0;
    widths.forEach((cw, c) => {
      const cell = row[c] ?? '';
      const num = !names && typeof v.values[i - top]?.[c] === 'number';
      if (cell !== '') svg += text(num ? at + cw - 8 : at + 8, HEAD + i * H + 16.5, clip(cell, cw - 14, PX, names), { px: PX, bold: names, anchor: num ? 'end' : 'start', fill: INK });
      at += cw;
    });
  });
  // Grid lines over it all.
  let grid = '';
  for (let r = 0; r <= n + top; r++) grid += `M0 ${HEAD + r * H}H${w}`;
  x = NUM;
  grid += `M${NUM} 0V${h}`;
  for (const cw of widths) grid += `M${(x += cw)} 0V${h}`;
  svg += `<path d="${grid}" stroke="${LINE}" stroke-width="1" fill="none"/><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${LINE}"/>`;
  return { w, h, svg, alt: rowsShown.length ? rowsShown.map((row) => row.filter(Boolean).join(', ')).join('; ') : t('Empty sheet') };
}

/** A sheet document's pages: the table (its headline above it) and its chart, the chart first when it is drawn above the table; drawn small, the grid alone (or the chart). */
export function sheetPages(text: string, small = false): Page[] {
  const v = readSheet(parse(text));
  const chart = chartOf(v);
  if (small) return [chart ?? gridPage(v)];
  if (!chart) return [tablePage(v)];
  return v.table.above ? [chart, tablePage(v)] : [tablePage(v), chart];
}
