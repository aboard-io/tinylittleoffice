/**
 * A table block as an Excel workbook (.xlsx): one sheet, the names over the columns in its first row, each
 * cell a number, a string, or a formula in Excel's dialect with its worked-out value cached (Excel
 * recalculates on open; the cached value is for everything else). Typed columns get number formats: dates,
 * money, percentages. For a sheet document and for a table inside a text alike.
 */
import { formatValue, nameKey, namedCells, rcToRef, shiftFormula, usedSize, type Evaluated, type Table } from '../doc/index.ts';
import { xml } from './draw.ts';
import { XML_HEAD, zip } from './zip.ts';

/** The names over the used columns, as a reader sees them: '' over a column that goes by its letter alone ("ColA"); null when every column does. */
export function sheetHeadings(t: Table, cols: number): string[] | null {
  const h = Array.from({ length: cols }, (_, c) => (/^Col[A-Z]$/.test(t.cols[c]?.name ?? '') ? '' : (t.cols[c]?.name ?? '')));
  return h.some(Boolean) ? h : null;
}

/** Our formula dialect in Excel's: AVG is AVERAGE there, and a named cell (see namedCells) is its reference, `off` rows down for the names' row. */
export function toExcelFormula(raw: string, named?: Map<string, [number, number]>, off = 0): string {
  const ref = (word: string) => {
    const at = named?.get(nameKey(word));
    return at && !/^[A-Za-z]{1,2}\d+$/.test(word) ? rcToRef(at[0] + off, at[1]) : word;
  };
  return raw
    .slice(1)
    .split(/("[^"]*")/)
    .map((part, i) => (i % 2 ? part : part.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b(?!\s*\()/g, ref)))
    .join('')
    .toUpperCase()
    .replace(/\bAVG\s*\(/g, 'AVERAGE(');
}

/** A currency as the sign Excel writes before an amount: a symbol as it is, a code ("GBP") as the browser writes it ("£"). */
function moneySign(currency: string): string {
  if (/^[A-Z]{3}$/.test(currency))
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(1).find((p) => p.type === 'currency')?.value ?? currency;
    } catch {
      // Not one the browser knows: the code itself.
    }
  return currency.replace(/"/g, '');
}

/** The workbook; `currency` is the document's, for money columns that name none ("$" where it names none either). */
export function tableToXlsx(t: Table, ev: Evaluated, created: number | null = null, currency = '$'): Uint8Array {
  const { rows, cols } = usedSize(t);
  const types = t.cols.map((c) => c.type);
  // Each money column in its own currency: one number format a sign, the first of them style 2, the rest after 3.
  const signOf = (c: number) => moneySign(t.cols[c]?.currency || currency);
  const signs = [...new Set(t.cols.flatMap((col, c) => (col.type === 'money' ? [signOf(c)] : [])))];
  if (!signs.length) signs.push('$');
  // Number formats for typed columns: 1 date, 2 money, 3 percent (see styles.xml below), 4 on more money.
  const styles: Partial<Record<string, string>> = { date: ' s="1"', percent: ' s="3"' };
  const styleOf = (c: number) => (types[c] === 'money' ? ((i) => ` s="${i ? 3 + i : 2}"`)(signs.indexOf(signOf(c))) : (styles[types[c]] ?? ''));
  const moneyFmt = (i: number) => `<numFmt numFmtId="${165 + i}" formatCode="${xml(`"${signs[i]}"#,##0.00`)}"/>`;
  const moneyXf = (i: number) => `<xf numFmtId="${165 + i}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`;
  const str = (ref: string, s: string) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(s)}</t></is></c>`;
  // The names go in Excel's first row, so every row of ours is one further down, and so is every reference.
  const h = sheetHeadings(t, cols);
  const off = h ? 1 : 0;
  const named = namedCells(t);
  let data = h ? `<row r="1">${h.map((name, c) => (name ? str(rcToRef(0, c), name) : '')).join('')}</row>` : '';
  for (let r = 0; r < rows; r++) {
    let cells = '';
    for (let c = 0; c < cols; c++) {
      const raw = t.rows[r]?.[c] ?? '';
      if (raw === '') continue;
      const ref = rcToRef(r + off, c);
      const v = ev.values[r]?.[c] ?? null;
      if (raw.startsWith('=')) {
        const f = `<f>${xml(toExcelFormula(shiftFormula(raw, off, 0), named, off))}</f>`;
        cells += typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${styleOf(c)}>${f}<v>${v}</v></c>` : `<c r="${ref}" t="str">${f}<v>${xml(formatValue(v))}</v></c>`;
      } else if (typeof v === 'number' && isFinite(v) && types[c] !== 'check') {
        cells += `<c r="${ref}"${styleOf(c)}><v>${v}</v></c>`;
      } else {
        cells += str(ref, raw);
      }
    }
    data += `<row r="${r + 1 + off}">${cells}</row>`;
  }
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return zip(
    {
      '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `${XML_HEAD}<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="Sheet" sheetId="1" r:id="rId1"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>`,
      'xl/_rels/workbook.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': `${XML_HEAD}<styleSheet xmlns="${ns}"><numFmts count="${1 + signs.length}"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/>${signs.map((_, i) => moneyFmt(i)).join('')}</numFmts><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${3 + signs.length}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>${moneyXf(0)}<xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>${signs.slice(1).map((_, i) => moneyXf(i + 1)).join('')}</cellXfs></styleSheet>`,
      'xl/worksheets/sheet1.xml': `${XML_HEAD}<worksheet xmlns="${ns}"><sheetData>${data}</sheetData></worksheet>`,
    },
    created,
  );
}
