/** Sheet: what the shell knows about spreadsheets. Format and engine: lib/formula.ts. */
import { defineApp, csv, utf8, xml, clip, rect, text, textWidth, LINE, SHADE, MUTED, type DownloadContext, type Page } from '../kit/core.ts';
import { zip, XML_HEAD } from '../kit/zip.ts';
import { COLS, ROWS, chartOf, evaluateGrid, formatCell, formatValue, parseGrid, rcToRef, typesOf } from '../lib/formula.ts';
import { chartData, chartPage, type ChartKind } from '../lib/chart.ts';

const x = xml;

/** The used part of the grid: raw text and computed values, trailing blanks dropped. */
function usedGrid(body: string) {
  const grid = parseGrid(body);
  const types = typesOf(body);
  const values = evaluateGrid(grid, types);
  let rows = 0;
  let cols = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] !== '') {
        rows = Math.max(rows, r + 1);
        cols = Math.max(cols, c + 1);
      }
  return { grid, values, rows, cols, types };
}

/** The used cells as shown: computed values. */
export function shown(body: string): string[][] {
  const { values, rows, cols, types } = usedGrid(body);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => formatCell(values[r][c], types[c])));
}

export const sheetToCsv = (body: string) => csv(shown(body));

/** Our formula dialect in Excel's: the only difference is the name of AVG. */
export function toExcelFormula(raw: string): string {
  return raw.slice(1).toUpperCase().replace(/\bAVG\s*\(/g, 'AVERAGE(');
}

export function sheetToXlsx(body: string, ctx: DownloadContext): Uint8Array {
  const { grid, values, rows, cols, types } = usedGrid(body);
  // Number formats for typed columns: 1 date, 2 money, 3 percent (see styles.xml below).
  const styleOf = (c: number) => ({ d: ' s="1"', $: ' s="2"', '%': ' s="3"' })[types[c]] ?? '';
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
        cells += typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${styleOf(c)}>${f}<v>${v}</v></c>` : `<c r="${ref}" t="str">${f}<v>${x(formatValue(v))}</v></c>`;
      } else if (typeof v === 'number' && isFinite(v) && types[c] !== 'c') {
        cells += `<c r="${ref}"${styleOf(c)}><v>${v}</v></c>`;
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
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Sheet" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': `${XML_HEAD}<styleSheet xmlns="${ns}"><numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="1"><font><sz val="11"/><name val="IBM Plex Sans"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
      'xl/worksheets/sheet1.xml': `${XML_HEAD}<worksheet xmlns="${ns}"><sheetData>${data}</sheetData></worksheet>`,
    },
    ctx.created,
  );
}


/**
 * The table as a picture. While it builds, the grid is there from the start
 * and `upTo` of its filled cells have their contents, in reading order:
 * across each row, rows top to bottom.
 */
function tablePage(body: string, upTo = Infinity): Page {
  const { values, rows, cols } = usedGrid(body);
  const cells = shown(body);
  if (!rows) return { w: 480, h: 120, svg: text(240, 66, 'Empty sheet', { px: 16, fill: MUTED, anchor: 'middle' }) };
  const PX = 15;
  const H = 30;
  const widths = Array.from({ length: cols }, (_, c) => Math.min(240, Math.max(64, ...cells.map((row) => textWidth(row[c], PX) + 24))));
  const w = widths.reduce((a, b) => a + b, 0);
  let svg = '';
  let filled = 0;
  cells.forEach((row, r) => {
    let at = 24;
    const head = r === 0 && rows > 1 && row.every((_, c) => typeof values[0][c] !== 'number');
    row.forEach((cell, c) => {
      const num = typeof values[r][c] === 'number';
      svg += rect(at, 24 + r * H, widths[c], H, head ? SHADE : 'none', `stroke="${LINE}"`);
      if (cell !== '' && filled++ < upTo) svg += text(num ? at + widths[c] - 12 : at + 12, 24 + r * H + 20, clip(cell, widths[c] - 20, PX, head), { px: PX, bold: head, anchor: num ? 'end' : 'start' });
      at += widths[c];
    });
  });
  return { w: w + 48, h: rows * H + 48, svg };
}

/**
 * The table as a spreadsheet looks: a strip of column letters along the
 * top, row numbers down the side, grey grid lines, words at an ordinary
 * size, numbers to the right. What a table in a text being written is.
 */
function gridPage(body: string): Page {
  const { values, rows, cols } = usedGrid(body);
  const cells = shown(body);
  const PX = 13;
  const H = 24;
  const HEAD = 22;
  const NUM = 34;
  const n = Math.max(1, rows);
  const across = Math.max(1, cols);
  const widths = Array.from({ length: across }, (_, c) => Math.min(200, Math.max(72, ...cells.map((row) => textWidth(row[c] ?? '', PX) + 18))));
  const w = NUM + widths.reduce((a, b) => a + b, 0);
  const h = HEAD + n * H;
  let svg = rect(0, 0, w, h, '#fff');
  // The strips: letters along the top, numbers down the side.
  svg += rect(0, 0, w, HEAD, SHADE) + rect(0, 0, NUM, h, SHADE);
  let x = NUM;
  widths.forEach((cw, c) => {
    svg += text(x + cw / 2, 15, String.fromCharCode(65 + c), { px: 11, fill: MUTED, anchor: 'middle' });
    x += cw;
  });
  for (let r = 0; r < n; r++) svg += text(NUM / 2, HEAD + r * H + 16, String(r + 1), { px: 11, fill: MUTED, anchor: 'middle' });
  // The cells.
  cells.slice(0, n).forEach((row, r) => {
    let at = NUM;
    const head = r === 0 && rows > 1 && row.every((_, c) => typeof values[0][c] !== 'number');
    widths.forEach((cw, c) => {
      const cell = row[c] ?? '';
      const num = typeof values[r]?.[c] === 'number';
      if (cell !== '') svg += text(num ? at + cw - 8 : at + 8, HEAD + r * H + 16.5, clip(cell, cw - 14, PX, head), { px: PX, bold: head, anchor: num ? 'end' : 'start' });
      at += cw;
    });
  });
  // Grid lines over it all.
  let lines = '';
  for (let r = 0; r <= n; r++) lines += `M0 ${HEAD + r * H}H${w}`;
  x = NUM;
  lines += `M${NUM} 0V${h}`;
  for (const cw of widths) lines += `M${(x += cw)} 0V${h}`;
  svg += `<path d="${lines}" stroke="${LINE}" stroke-width="1" fill="none"/><rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="none" stroke="${LINE}"/>`;
  return { w, h, svg };
}

/** The table as a chart reads it: numbers where a column holds numbers, words (dates, links, ticks) elsewhere. */
export function chartOfSheet(body: string) {
  const { values, rows, types } = usedGrid(body);
  return chartData(values.slice(0, rows).map((row) => row.map((v, c) => ('n$%t'.includes(types[c]) || typeof v !== 'number' ? v : formatCell(v, types[c])))));
}

export default defineApp({
  id: 'sheet',
  group: '',
  name: 'Sheet',
  icon: 'sheet',
  blurb: `A ${ROWS}-row, ${COLS}-column spreadsheet with formulas and charts.`,
  title: () => '',
  outline: (body) => shown(body).map((row) => row.filter(Boolean).join('  ·  ')).filter(Boolean),
  view(body, opts = {}) {
    const kind = chartOf(body) as ChartKind | '';
    const chart = kind ? chartPage(chartOfSheet(body), kind, '', 720, 440, opts.step) : null;
    // Inside another document a charted sheet is its chart; on its own it is both.
    if (opts.embed) return [chart ?? (opts.preview ? gridPage(body) : tablePage(body, opts.step))];
    return chart ? [tablePage(body), chart] : [tablePage(body)];
  },
  // A table on a slide fills in a cell per click.
  // (A chart builds too: a bar, a point or a slice per click.)
  steps: (body) => (chartOf(body) ? chartOfSheet(body).labels.length : shown(body).flat().filter(Boolean).length),
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
    { keys: 'Space', does: 'Tick or untick, in a checkbox column' },
    { keys: 'Enter', does: 'Next row' },
    { keys: 'Shift+Enter', does: 'Previous row' },
    { keys: 'Escape', does: 'Leave the cell' },
  ],
});
