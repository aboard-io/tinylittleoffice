/**
 * What the eye would see in a table's cells, said in words (src/lint.ts runs it over every table block of any
 * document, a sheet's, a text's, one fenced on a slide): a formula that works out to an error (#CIRC, #REF,
 * #DIV/0, #NAME, #VALUE, #NUM, #ERR, the engine's own, src/doc/formula.ts), at the cell the error starts in,
 * not at the cells that read it, with the fix. Nothing here draws, and nothing needs a browser.
 *
 *   formula-error  a formula whose value is an error: the table, the cell, the formula, the error, what to do
 */
import { parse, plainText, type Doc } from '../../doc/index.ts';
import { evaluateTable, formulaReads, type CellValue } from '../../doc/formula.ts';
import { rcToRef, refToRC, tableAt } from '../../doc/table.ts';
import type { Found } from '../../lint.ts';

/** One formula that fails: its cell, as written, and its error. */
export interface FormulaError {
  cell: string;
  formula: string;
  error: string;
}

/** A table as the lint finds it: where it is, its formulas, the ones that fail (each where its error starts) and why. */
interface Checked {
  block: number;
  formulas: number;
  errors: (FormulaError & { fix: string })[];
}

const isError = (v: CellValue): v is string => typeof v === 'string' && v.startsWith('#');
const key = (r: number, c: number) => `${r},${c}`;

/** The table as a person finds it: the heading over it, else the document's title, else its columns. */
function tableName(doc: Doc, at: number): string {
  for (let i = at - 1; i >= 0; i--) {
    const b = doc.blocks[i];
    if (b.k === 'h') return `the table "${plainText(b.runs).trim()}"`;
    if (b.k === 'table' || b.k === 'hr') break;
  }
  const b = doc.blocks[at];
  return doc.head.title ? `the table "${doc.head.title}"` : `the table (${b.k === 'table' ? b.cols.map((c) => c.name).join(' | ') : ''})`;
}

/** A range of `raw` that holds cell (r, c), moved off it: a range ending on the cell's row counted one row too low (the header counted), else stopped short of the cell. */
function rangeOff(raw: string, r: number, c: number): string | null {
  let done = false;
  const out = raw
    .split(/("[^"]*")/)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/\b([A-Z]{1,2}\d+):([A-Z]{1,2}\d+)\b/gi, (whole, a: string, b: string) => {
            const p = refToRC(a.toUpperCase());
            const q = refToRC(b.toUpperCase());
            if (done || !p || !q) return whole;
            let [r0, r1, c0, c1] = [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])];
            if (r < r0 || r > r1 || c < c0 || c > c1) return whole;
            if (r1 === r && r0 >= 1) [r0, r1] = [r0 - 1, r1 - 1];
            else if (r1 === r && r0 < r) r1 = r - 1;
            else if (r0 === r && r1 > r) r0 = r + 1;
            else if (c1 === c && c0 < c) c1 = c - 1;
            else if (c0 === c && c1 > c) c0 = c + 1;
            else return whole;
            done = true;
            return `${rcToRef(r0, c0)}:${rcToRef(r1, c1)}`;
          }),
    )
    .join('');
  return done ? out : null;
}

/** Every table of a document checked: its formulas worked out, and each error said where it starts. */
function check(doc: Doc): Checked[] {
  const out: Checked[] = [];
  doc.blocks.forEach((_, at) => {
    const t = tableAt(doc, at);
    if (!t) return;
    const { values, named } = evaluateTable(t);
    const reads = new Map<string, ReturnType<typeof formulaReads>>();
    t.rows.forEach((row, r) => row.forEach((raw, c) => raw.startsWith('=') && reads.set(key(r, c), formulaReads(raw, named))));
    /** The cells from (r, c)'s reads back to it, or null when its reads never come back. */
    const loop = (r: number, c: number): string[] | null => {
      const from = new Map<string, string>();
      const queue = [key(r, c)];
      while (queue.length) {
        const at = queue.shift()!;
        for (const [rr, cc] of reads.get(at)?.cells ?? []) {
          const k = key(rr, cc);
          if (k === key(r, c)) {
            const path: string[] = [];
            for (let p = at; p !== key(r, c); p = from.get(p)!) path.unshift(p);
            return path.map((p) => rcToRef(...(p.split(',').map(Number) as [number, number])));
          }
          if (!from.has(k) && reads.has(k)) (from.set(k, at), queue.push(k));
        }
      }
      return null;
    };
    const checked: Checked = { block: at, formulas: reads.size, errors: [] };
    t.rows.forEach((row, r) =>
      row.forEach((raw, c) => {
        const error = values[r][c];
        const read = reads.get(key(r, c));
        if (!read || !isError(error)) return;
        const through = error === '#CIRC' ? loop(r, c) : null;
        // An error read from another cell is said there, where it starts.
        if (error === '#CIRC' ? !through : read.cells.some(([rr, cc]) => isError(values[rr]?.[cc] ?? null))) return;
        const fix = fixFor(error, raw, r, c, through ?? [], read, (rr, cc) => values[rr]?.[cc] ?? null);
        checked.errors.push({ cell: rcToRef(r, c), formula: raw, error, fix });
      }),
    );
    out.push(checked);
  });
  return out;
}

function fixFor(error: string, raw: string, r: number, c: number, through: string[], read: ReturnType<typeof formulaReads>, value: (r: number, c: number) => CellValue): string {
  switch (error) {
    case '#CIRC': {
      if (through.length) return `the formula comes back to its own cell through ${through.join(', ')}: point one of them at another cell`;
      const off = rangeOff(raw, r, c);
      return off ? `the range includes the cell itself; rows count from the first data row: ${off}` : 'the formula reads its own cell: point it at another';
    }
    case '#NAME':
      return `no function or named cell is called ${read.unknown.join(', ') || 'that'}: use a function of the engine's (SUM, AVG, IF…), or a name from a Name column with its spaces written _`;
    case '#VALUE': {
      const words = read.cells.filter(([rr, cc]) => typeof value(rr, cc) === 'string').map(([rr, cc]) => rcToRef(rr, cc));
      return `${words.length ? `${words.slice(0, 3).join(', ')} ${words.length === 1 ? 'holds' : 'hold'} words` : 'it is given words'} where a number is wanted: point it at numbers, or give the column a number type`;
    }
    case '#DIV/0':
      return 'it divides by zero (or averages no numbers): divide by a cell with a number in it, or guard it, as in =IF(B1=0, 0, A1/B1)';
    case '#REF':
      return 'it names a cell past the table’s reach (columns A to Z, rows 1 to 1000): point it at a cell of the table';
    case '#NUM':
      return 'no number answers it (a square root of a negative, a rate of return whose flows never change sign): check the numbers it is given';
    default:
      return 'the formula cannot be read: check its brackets, quotes and operators, as in =SUM(B1:B7)';
  }
}

export function lintSheet(text: string): Found[] {
  const doc = parse(text);
  return check(doc).flatMap((t) =>
    t.errors.map(({ cell, formula, error, fix }) => ({ block: t.block, kind: 'formula-error', words: `${tableName(doc, t.block)}: ${cell}, ${formula}, is ${error}`, fix })),
  );
}

/** Every table of a document, by its block: how many formulas it has, and the ones that fail. */
export function measureSheet(text: string): { block: number; formulas: number; errors: FormulaError[] }[] {
  return check(parse(text)).map(({ block, formulas, errors }) => ({ block, formulas, errors: errors.map(({ cell, formula, error }) => ({ cell, formula, error })) }));
}
