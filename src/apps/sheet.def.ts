/** Sheet: what the shell knows about spreadsheets. Format and engine: lib/formula.ts. */
import { defineApp, csv, utf8, xml, clip, rect, text, textWidth, LINE, SHADE, MUTED, type DownloadContext, type Page } from '../kit/core.ts';
import { zip, XML_HEAD } from '../kit/zip.ts';
import { COLS, ROWS, chartOf, evaluateGrid, formatValue, parseGrid, rcToRef } from '../lib/formula.ts';
import { chartData, chartPage, type ChartKind } from '../lib/chart.ts';

const x = xml;

/** The used part of the grid: raw text and computed values, trailing blanks dropped. */
function usedGrid(body: string) {
  const grid = parseGrid(body);
  const values = evaluateGrid(grid);
  let rows = 0;
  let cols = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== '') {
        rows = Math.max(rows, r + 1);
        cols = Math.max(cols, c + 1);
      }
  return { grid, values, rows, cols };
}

/** The used cells as shown: computed values. */
export function shown(body: string): string[][] {
  const { values, rows, cols } = usedGrid(body);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => formatValue(values[r][c])));
}

export const sheetToCsv = (body: string) => csv(shown(body));

/** Our formula dialect in Excel's: the only difference is the name of AVG. */
export function toExcelFormula(raw: string): string {
  return raw.slice(1).toUpperCase().replace(/\bAVG\s*\(/g, 'AVERAGE(');
}

export function sheetToXlsx(body: string, ctx: DownloadContext): Uint8Array {
  const { grid, values, rows, cols } = usedGrid(body);
  let data = '';
  for (let r = 0; r < rows; r++) {
    let cells = '';
    for (let c = 0; c < cols; c++) {
      const raw = grid[r][c];
      if (raw === '') continue;
      const ref = rcToRef(r, c);
      const v = values[r][c];
      if (raw.startsWith('=')) {
        // Excel recalculates on open; the cached value is for everything else.
        const f = `<f>${x(toExcelFormula(raw))}</f>`;
        cells += typeof v === 'number' && isFinite(v) ? `<c r="${ref}">${f}<v>${v}</v></c>` : `<c r="${ref}" t="str">${f}<v>${x(formatValue(v))}</v></c>`;
      } else if (typeof v === 'number' && isFinite(v)) {
        cells += `<c r="${ref}"><v>${v}</v></c>`;
      } else {
        cells += `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${x(raw)}</t></is></c>`;
      }
    }
    data += `<row r="${r + 1}">${cells}</row>`;
  }
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip(
    {
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Sheet" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      'xl/worksheets/sheet1.xml': `${XML_HEAD}<worksheet xmlns="${ns}"><sheetData>${data}</sheetData></worksheet>`,
    },
    ctx.created,
  );
}


/** The table as a picture; `upTo` rows of it while it builds. */
function tablePage(body: string, upTo = Infinity): Page {
  const { values, rows, cols } = usedGrid(body);
  const cells = shown(body);
  if (!rows) return { w: 480, h: 120, svg: text(240, 66, 'Empty sheet', { px: 16, fill: MUTED, anchor: 'middle' }) };
  const PX = 15;
  const H = 30;
  const widths = Array.from({ length: cols }, (_, c) => Math.min(240, Math.max(64, ...cells.map((row) => textWidth(row[c], PX) + 24))));
  const w = widths.reduce((a, b) => a + b, 0);
  let svg = '';
  cells.forEach((row, r) => {
    if (r >= upTo) return;
    let at = 24;
    const head = r === 0 && rows > 1 && row.every((_, c) => typeof values[0][c] !== 'number');
    row.forEach((cell, c) => {
      const num = typeof values[r][c] === 'number';
      svg += rect(at, 24 + r * H, widths[c], H, head ? SHADE : 'none', `stroke="${LINE}"`);
      svg += text(num ? at + widths[c] - 12 : at + 12, 24 + r * H + 20, clip(cell, widths[c] - 20, PX, head), { px: PX, bold: head, anchor: num ? 'end' : 'start' });
      at += widths[c];
    });
  });
  return { w: w + 48, h: rows * H + 48, svg };
}

export const chartOfSheet = (body: string) => chartData(usedGrid(body).values.slice(0, usedGrid(body).rows));

export default defineApp({
  id: 'sheet',
  name: 'Sheet',
  icon: 'sheet',
  blurb: `A ${ROWS}-row, ${COLS}-column spreadsheet with formulas and charts.`,
  title: () => '',
  outline: (body) => shown(body).map((row) => row.filter(Boolean).join('  ·  ')).filter(Boolean),
  view(body, opts = {}) {
    const kind = chartOf(body) as ChartKind | '';
    const chart = kind ? chartPage(chartOfSheet(body), kind) : null;
    // Inside another document a charted sheet is its chart; on its own it is both.
    if (opts.embed) return [chart ?? tablePage(body, opts.step)];
    return chart ? [tablePage(body), chart] : [tablePage(body)];
  },
  // A table on a slide fills in row by row, by itself.
  steps: (body) => (chartOf(body) ? 0 : usedGrid(body).rows),
  build: 'auto',
  html(body) {
    const { values, rows } = usedGrid(body);
    const kind = chartOf(body) as ChartKind | '';
    const table = shown(body)
      .map((row, r) => `<tr>${row.map((cell, c) => (typeof values[r][c] === 'number' ? `<td class="n">${x(cell)}</td>` : `<td>${x(cell)}</td>`)).join('')}</tr>`)
      .join('\n');
    const chart = kind ? chartPage(chartOfSheet(body), kind) : null;
    return `<h1>Sheet</h1>\n${rows ? `<table>\n${table}\n</table>` : '<p>Empty sheet</p>'}${chart ? `\n<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chart.w} ${chart.h}" role="img" aria-label="Chart">${chart.svg}</svg></figure>` : ''}`;
  },
  downloads: [
    { ext: 'xlsx', label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', build: sheetToXlsx },
    // The byte order mark is how Excel knows a CSV is UTF-8.
    { ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => utf8('\ufeff' + sheetToCsv(b)) },
  ],
  shortcuts: [
    { keys: 'Arrows', does: 'Move between cells; while a formula wants a value, point at a cell to insert it' },
    { keys: 'Shift+Arrows / Shift+Click / Drag', does: 'Select a block of cells' },
    { keys: 'Mod+C / Mod+X / Mod+V', does: 'Copy, cut and paste cells; copied formulas point at their new neighbours' },
    { keys: 'Delete', does: 'Clear the selected block' },
    { keys: 'Enter', does: 'Next row' },
    { keys: 'Shift+Enter', does: 'Previous row' },
    { keys: 'Escape', does: 'Leave the cell' },
  ],
});
