/**
 * The formula engine, over a table block. A cell starting with "=" is a
 * formula: + - * / ^ %, comparisons (= <> < > <= >=, giving 1 or 0),
 * parentheses, unary minus, cell references (A1), ranges (A1:A5), "words"
 * and the functions in FUNCTIONS: enough for a small business model. A
 * cell can have a name: a column typed `name` names, with each of its
 * cells, the cell to its right, and a formula may say `=visitors *
 * signup_rate` (a space in a name is written "_"; case does not matter).
 *
 * Dates are numbers: days counted the way spreadsheets count them (1900
 * system), so a date minus a date is a number of days and a date plus 30 is
 * the date a month on. A date column shows such numbers as dates.
 *
 * Because `evaluate` takes any document and block index, a table inside a
 * text or on a slide is worked out in place, as a sheet's is.
 */
import type { ColType, Doc } from './model.ts';
import { dayToYmd, firstTable, namedCells, refToRC, tableAt, ymdString, ymdToDay, type Table } from './table.ts';

/** Every function the engine knows: name, example arguments, what it does. */
export const FUNCTIONS: [string, string, string][] = [
  ['SUM', 'A1:A5', 'Add up'],
  ['AVG', 'A1:A5', 'Average'],
  ['MIN', 'A1:A5', 'Smallest'],
  ['MAX', 'A1:A5', 'Largest'],
  ['COUNT', 'A1:A5', 'How many numbers'],
  ['SUMIF', 'B1:B9, "Run", C1:C9', 'Add up where the words match'],
  ['COUNTIF', 'B1:B9, "Run"', 'How many match'],
  ['MEDIAN', 'A1:A5', 'Middle value'],
  ['PRODUCT', 'A1:A5', 'Multiply together'],
  ['IF', 'A1>0, B1, C1', 'One thing or another'],
  ['AND', 'A1>0, B1>0', 'All true'],
  ['OR', 'A1>0, B1>0', 'Any true'],
  ['NOT', 'A1>0', 'Opposite'],
  ['ROUND', 'A1, 2', 'Round to places'],
  ['ROUNDUP', 'A1, 0', 'Round away from zero'],
  ['ROUNDDOWN', 'A1, 0', 'Round toward zero'],
  ['INT', 'A1', 'Whole part'],
  ['ABS', 'A1', 'Drop the sign'],
  ['SQRT', 'A1', 'Square root'],
  ['MOD', 'A1, 3', 'Remainder'],
  ['NPV', '0.08, B1:B5', 'Value today of future cash'],
  ['IRR', 'A1:A5', 'Rate of return of cash flows'],
  ['PMT', '0.05/12, 60, 20000', 'Loan payment per period'],
  ['FV', '0.05, 10, -100', 'Future value of saving'],
  ['PV', '0.05, 10, -100', 'Present value of payments'],
  ['TODAY', '', "Today's date"],
  ['DATE', '2027, 3, 1', 'A date from year, month, day'],
  ['DAYS', 'B1, A1', 'Days from one date to another'],
  ['EDATE', 'A1, 3', 'The date some months later'],
  ['WORKDAYS', 'A1, B1', 'Weekdays from one date to another'],
  ['YEAR', 'A1', 'Year of a date'],
  ['MONTH', 'A1', 'Month of a date'],
  ['DAY', 'A1', 'Day of the month'],
  ['WEEKDAY', 'A1', 'Day of the week, 1 = Sunday'],
];

/** What a column of a sheet may hold: how its cells are read when typed, and shown. */
export const COLUMN_TYPES: { id: ColType; name: string; hint: string }[] = [
  { id: 'text', name: 'Text', hint: 'Shown as typed' },
  { id: 'number', name: 'Number', hint: '1,234.5' },
  { id: 'money', name: 'Money', hint: '$1,234.50' },
  { id: 'percent', name: 'Percent', hint: '12.5%' },
  { id: 'date', name: 'Date', hint: '2027-03-01' },
  { id: 'url', name: 'Link', hint: 'Opens when clicked' },
  { id: 'check', name: 'Checkbox', hint: '☑ or ☐' },
  { id: 'rich', name: 'Rich text', hint: 'Bold, italic and links' },
  { id: 'option', name: 'Option', hint: 'One of the words the column already holds, or a new one' },
  { id: 'name', name: 'Name', hint: 'Names the cell to its right' },
];

/** Days from the spreadsheet epoch (30 December 1899) to 1 January 1970. */
const EPOCH_SERIAL = 25569;
/** A civil date as a spreadsheet's day number. */
export const dateToSerial = (y: number, m: number, d: number): number => ymdToDay(y, m, d) + EPOCH_SERIAL;
const serialToDate = (serial: number) => dayToYmd(Math.floor(serial) - EPOCH_SERIAL);
/** Today as a spreadsheet's day number. */
export const todaySerial = (): number => {
  const n = new Date();
  return dateToSerial(n.getFullYear(), n.getMonth() + 1, n.getDate());
};
/** A day number as "2027-03-01". */
export const serialToIso = (serial: number): string => {
  const { y, m, d } = serialToDate(serial);
  return ymdString(y, m, d);
};

/** What a cell works out to: a number, words (or an error code starting with #), or nothing. */
export type CellValue = number | string | null;
/** A table worked out: a value for every cell of every row, and where each name points. */
export interface Evaluated {
  values: CellValue[][];
  named: Map<string, [number, number]>;
}

type Tok = { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 'name'; v: string } | { t: 'ref'; v: string } | { t: 'range'; v: [string, string] } | { t: 'fn'; v: string } | { t: 'op'; v: string };

type Node = { k: 'num'; v: number } | { k: 'str'; v: string } | { k: 'name'; v: string } | { k: 'ref'; v: string } | { k: 'range'; v: [string, string] } | { k: 'neg'; a: Node } | { k: 'bin'; op: string; a: Node; b: Node } | { k: 'call'; fn: string; args: Node[] };

class FormulaError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/** What each operator does to two numbers. Comparisons give 1 or 0. */
const BINARY: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '^': (a, b) => Math.pow(a, b),
  '=': (a, b) => +(a === b),
  '<>': (a, b) => +(a !== b),
  '<': (a, b) => +(a < b),
  '>': (a, b) => +(a > b),
  '<=': (a, b) => +(a <= b),
  '>=': (a, b) => +(a >= b),
};

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/i.exec(src.slice(i));
      if (!m) throw new FormulaError('#ERR');
      toks.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (c === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw new FormulaError('#ERR');
      toks.push({ t: 'str', v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[a-z_]/i.test(c)) {
      const m = /^[a-z_][a-z0-9_]*/i.exec(src.slice(i))!;
      const word = m[0].toUpperCase();
      i += m[0].length;
      if (/^[A-Z]{1,2}\d+$/.test(word)) {
        const r = /^:([a-z]{1,2}\d+)/i.exec(src.slice(i));
        if (r) {
          i += r[0].length;
          toks.push({ t: 'range', v: [word, r[1].toUpperCase()] });
        } else toks.push({ t: 'ref', v: word });
      } else if (/^\s*\(/.test(src.slice(i))) toks.push({ t: 'fn', v: word });
      // A word that is no cell and calls nothing is a name: a cell named by the one to its left.
      else toks.push({ t: 'name', v: word });
      continue;
    }
    if (c === '<' || c === '>' || c === '=') {
      const two = src.slice(i, i + 2);
      const op = two === '<=' || two === '>=' || two === '<>' ? two : c;
      toks.push({ t: 'op', v: op });
      i += op.length;
      continue;
    }
    if ('+-*/^%(),'.includes(c)) {
      toks.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new FormulaError('#ERR');
  }
  return toks;
}

function parseFormula(toks: Tok[]): Node {
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v;

  function primary(): Node {
    const t = next();
    if (!t) throw new FormulaError('#ERR');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'str') return { k: 'str', v: t.v };
    if (t.t === 'name') return { k: 'name', v: t.v };
    if (t.t === 'ref') return { k: 'ref', v: t.v };
    if (t.t === 'range') return { k: 'range', v: t.v };
    if (t.t === 'fn') {
      if (!isOp('(')) throw new FormulaError('#NAME');
      next();
      const args: Node[] = [];
      if (!isOp(')')) {
        args.push(compare());
        while (isOp(',')) {
          next();
          args.push(compare());
        }
      }
      if (!isOp(')')) throw new FormulaError('#ERR');
      next();
      return { k: 'call', fn: t.v, args };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = compare();
      if (!isOp(')')) throw new FormulaError('#ERR');
      next();
      return e;
    }
    if (t.t === 'op' && t.v === '-') return { k: 'neg', a: unary() };
    if (t.t === 'op' && t.v === '+') return unary();
    throw new FormulaError('#ERR');
  }
  function unary(): Node {
    let n = primary();
    while (isOp('%')) {
      next();
      n = { k: 'bin', op: '/', a: n, b: { k: 'num', v: 100 } };
    }
    return n;
  }
  function power(): Node {
    const a = unary();
    if (isOp('^')) {
      next();
      return { k: 'bin', op: '^', a, b: power() };
    }
    return a;
  }
  /** Operands of `operand` joined by any of `ops`, taken left to right. */
  function leftToRight(operand: () => Node, ops: string[]): Node {
    let a = operand();
    while (ops.some(isOp)) {
      const op = (next() as { v: string }).v;
      a = { k: 'bin', op, a, b: operand() };
    }
    return a;
  }
  const term = () => leftToRight(power, ['*', '/']);
  const expr = () => leftToRight(term, ['+', '-']);
  function compare(): Node {
    const a = expr();
    const t = peek();
    if (t?.t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t.v)) {
      next();
      return { k: 'bin', op: t.v, a, b: expr() };
    }
    return a;
  }
  const n = compare();
  if (p !== toks.length) throw new FormulaError('#ERR');
  return n;
}

function rangeCells(a: string, b: string): [number, number][] {
  const p = refToRC(a);
  const q = refToRC(b);
  if (!p || !q) throw new FormulaError('#REF');
  const out: [number, number][] = [];
  for (let r = Math.min(p[0], q[0]); r <= Math.max(p[0], q[0]); r++) for (let c = Math.min(p[1], q[1]); c <= Math.max(p[1], q[1]); c++) out.push([r, c]);
  return out;
}

/** A cell as typed, read as its column's type: a number, a date's day number, a check's 1 or 0, or the words themselves. Empty is null. */
export function parseLiteral(raw: string, type: string = 'text', today = todaySerial): CellValue {
  const s = raw.trim();
  if (s === '') return null;
  if (type === 'check') return /^(x|y|yes|true|1|done|☑|✓|✔)$/i.test(s) ? 1 : 0;
  if (type === 'date') {
    // A date as written: 2027-03-01, or 3/1/2027, or "today".
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) return dateToSerial(+iso[1], +iso[2], +iso[3]);
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (us) return dateToSerial(+us[3], +us[1], +us[2]);
    if (/^today$/i.test(s)) return today();
  }
  // Money and percentages may be typed with their signs and commas.
  const plain = s.replace(/^([+-]?)\$/, '$1').replace(/(\d),(?=\d{3})/g, '$1');
  const pct = /^([+-]?(?:\d+\.?\d*|\.\d+))%$/.exec(plain);
  if (pct && type !== 'text') return parseFloat(pct[1]) / 100;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(plain) && (plain === s || type === 'money' || type === 'number' || type === 'percent')) return type === 'percent' ? parseFloat(plain) / 100 : parseFloat(plain);
  return raw;
}

/** Every cell of a table worked out, as `today`'s date has it. A cell past the rows is null. */
export function evaluateTable(t: Table, today = todaySerial()): Evaluated {
  const cache = new Map<string, CellValue>();
  const visiting = new Set<string>();
  const named = namedCells(t);
  const types = t.cols.map((c) => c.type);
  const todayIs = () => today;

  function cell(r: number, c: number): CellValue {
    const key = `${r},${c}`;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) throw new FormulaError('#CIRC');
    const raw = t.rows[r]?.[c] ?? '';
    let v: CellValue;
    if (raw.startsWith('=')) {
      visiting.add(key);
      try {
        v = evalNode(parseFormula(tokenize(raw.slice(1))));
      } catch (e) {
        v = e instanceof FormulaError ? e.code : '#ERR';
      } finally {
        visiting.delete(key);
      }
    } else v = parseLiteral(raw, types[c], todayIs);
    cache.set(key, v);
    return v;
  }

  function num(v: CellValue): number {
    if (v === null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.startsWith('#')) throw new FormulaError(v);
    throw new FormulaError('#VALUE');
  }

  function flatten(args: Node[]): number[] {
    const out: number[] = [];
    for (const a of args) {
      if (a.k === 'range') {
        for (const [r, c] of rangeCells(a.v[0], a.v[1])) {
          const v = cell(r, c);
          if (typeof v === 'number') out.push(v);
          else if (typeof v === 'string' && v.startsWith('#')) throw new FormulaError(v);
        }
      } else out.push(num(evalNode(a)));
    }
    return out;
  }

  function evalNode(n: Node): CellValue {
    switch (n.k) {
      case 'num':
        return n.v;
      case 'str':
        return n.v;
      case 'name': {
        const rc = named.get(n.v);
        if (!rc) throw new FormulaError('#NAME');
        return cell(rc[0], rc[1]);
      }
      case 'ref': {
        const rc = refToRC(n.v);
        if (!rc) throw new FormulaError('#REF');
        return cell(rc[0], rc[1]);
      }
      case 'range':
        throw new FormulaError('#VALUE');
      case 'neg':
        return -num(evalNode(n.a));
      case 'bin': {
        const a = num(evalNode(n.a));
        const b = num(evalNode(n.b));
        if (n.op === '/' && b === 0) throw new FormulaError('#DIV/0');
        return BINARY[n.op](a, b);
      }
      case 'call': {
        const xs = () => flatten(n.args);
        const arg = (i: number, fallback?: number) => {
          if (n.args[i]) return num(evalNode(n.args[i]));
          if (fallback === undefined) throw new FormulaError('#VALUE');
          return fallback;
        };
        switch (n.fn) {
          case 'TODAY':
            return today;
          case 'DATE':
            return dateToSerial(arg(0), arg(1), arg(2));
          case 'YEAR':
            return serialToDate(arg(0)).y;
          case 'MONTH':
            return serialToDate(arg(0)).m;
          case 'DAY':
            return serialToDate(arg(0)).d;
          case 'WEEKDAY':
            return serialToDate(arg(0)).wd + 1;
          case 'DAYS':
            return Math.floor(arg(0)) - Math.floor(arg(1));
          case 'EDATE': {
            // The same day some months on; a day the month lacks becomes its last (31 Jan + 1 = 28 Feb).
            const { y, m, d } = serialToDate(arg(0));
            const first = new Date(Date.UTC(y, m - 1 + Math.trunc(arg(1)), 1));
            const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
            return dateToSerial(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, last));
          }
          case 'WORKDAYS': {
            // Monday to Friday, both ends included.
            const [a, b] = [Math.floor(arg(0)), Math.floor(arg(1))];
            const [lo, hi] = a <= b ? [a, b] : [b, a];
            if (hi - lo > 200000) throw new FormulaError('#NUM');
            let count = 0;
            for (let day = lo; day <= hi; day++) if (![0, 6].includes(serialToDate(day).wd)) count++;
            return a <= b ? count : -count;
          }
          case 'IF':
            // Only the chosen branch is worked out, so the other may be an error.
            return arg(0) !== 0 ? (n.args[1] ? evalNode(n.args[1]) : 1) : n.args[2] ? evalNode(n.args[2]) : 0;
          case 'AND':
            return xs().every((x) => x !== 0) ? 1 : 0;
          case 'OR':
            return xs().some((x) => x !== 0) ? 1 : 0;
          case 'NOT':
            return arg(0) === 0 ? 1 : 0;
          case 'MEDIAN': {
            const v = xs().sort((a, b) => a - b);
            if (!v.length) throw new FormulaError('#NUM');
            return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
          }
          case 'PRODUCT':
            return xs().reduce((s, x) => s * x, 1);
          case 'ROUNDUP':
          case 'ROUNDDOWN': {
            const f = Math.pow(10, arg(1, 0));
            const v = arg(0) * f;
            return (n.fn === 'ROUNDUP' ? Math.sign(v) * Math.ceil(Math.abs(v) - 1e-9) : Math.trunc(v + Math.sign(v) * 1e-9)) / f;
          }
          case 'NPV': {
            // Excel's convention: the first cash flow is one period away.
            const [rate, ...flows] = xs();
            return flows.reduce((s, x, i) => s + x / Math.pow(1 + rate, i + 1), 0);
          }
          case 'IRR': {
            const flows = xs();
            if (!flows.some((x) => x > 0) || !flows.some((x) => x < 0)) throw new FormulaError('#NUM');
            const npv = (rate: number) => flows.reduce((s, x, i) => s + x / Math.pow(1 + rate, i), 0);
            // Bisection: slower than Newton's method but it cannot run away.
            let lo = -0.99;
            let hi = 10;
            if (npv(lo) * npv(hi) > 0) throw new FormulaError('#NUM');
            for (let i = 0; i < 100; i++) {
              const mid = (lo + hi) / 2;
              if (npv(lo) * npv(mid) <= 0) hi = mid;
              else lo = mid;
            }
            return Math.round(((lo + hi) / 2) * 1e10) / 1e10;
          }
          case 'PMT': {
            const [rate, nper, pv, fv] = [arg(0), arg(1), arg(2), arg(3, 0)];
            if (nper === 0) throw new FormulaError('#NUM');
            if (rate === 0) return -(pv + fv) / nper;
            const g = Math.pow(1 + rate, nper);
            return (-rate * (pv * g + fv)) / (g - 1);
          }
          case 'FV': {
            const [rate, nper, pmt, pv] = [arg(0), arg(1), arg(2), arg(3, 0)];
            if (rate === 0) return -(pv + pmt * nper);
            const g = Math.pow(1 + rate, nper);
            return -(pv * g + (pmt * (g - 1)) / rate);
          }
          case 'PV': {
            const [rate, nper, pmt, fv] = [arg(0), arg(1), arg(2), arg(3, 0)];
            if (rate === 0) return -(fv + pmt * nper);
            const g = Math.pow(1 + rate, nper);
            return -(fv + (pmt * (g - 1)) / rate) / g;
          }
          case 'SUMIF':
          case 'COUNTIF': {
            // Only the cells whose test passes are worked out, so a total of inflows may sit among the flows it sums.
            const [range, test, sums] = n.args;
            if (range?.k !== 'range' || !test || (n.fn === 'SUMIF' && sums?.k !== 'range')) throw new FormulaError('#VALUE');
            const want = evalNode(test);
            const op = typeof want === 'string' ? /^(<>|<=|>=|<|>|=)(.*)$/.exec(want) : null;
            const target = op ? parseLiteral(op[2]) : want;
            const matches = (v: CellValue) => {
              if (op && op[1] !== '=' && op[1] !== '<>' && typeof target === 'number') return typeof v === 'number' && BINARY[op[1]](v, target) === 1;
              const same = typeof target === 'string' && typeof v === 'string' ? v.trim().toLowerCase() === target.trim().toLowerCase() : v === target || (v === null && target === '');
              return op?.[1] === '<>' ? !same : same;
            };
            const over = rangeCells(range.v[0], range.v[1]);
            const into = sums?.k === 'range' ? rangeCells(sums.v[0], sums.v[1]) : [];
            let total = 0;
            over.forEach(([r, c], i) => {
              if (!matches(cell(r, c))) return;
              if (n.fn === 'COUNTIF') return void total++;
              const at = into[i];
              if (!at) return;
              const v = cell(at[0], at[1]);
              if (typeof v === 'number') total += v;
              else if (typeof v === 'string' && v.startsWith('#')) throw new FormulaError(v);
            });
            return total;
          }
          case 'SUM':
            return xs().reduce((s, x) => s + x, 0);
          case 'AVG':
          case 'AVERAGE': {
            const v = xs();
            if (!v.length) throw new FormulaError('#DIV/0');
            return v.reduce((s, x) => s + x, 0) / v.length;
          }
          case 'MIN':
          case 'MAX': {
            const v = xs();
            return v.length ? (n.fn === 'MIN' ? Math.min(...v) : Math.max(...v)) : 0;
          }
          case 'COUNT':
            return xs().length;
          case 'ABS':
            return Math.abs(num(evalNode(n.args[0])));
          case 'SQRT': {
            const v = num(evalNode(n.args[0]));
            if (v < 0) throw new FormulaError('#NUM');
            return Math.sqrt(v);
          }
          case 'INT':
            return Math.floor(num(evalNode(n.args[0])));
          case 'ROUND': {
            const v = num(evalNode(n.args[0]));
            const f = Math.pow(10, arg(1, 0));
            return Math.round(v * f) / f;
          }
          case 'MOD': {
            const a = num(evalNode(n.args[0]));
            const b = num(evalNode(n.args[1]));
            if (b === 0) throw new FormulaError('#DIV/0');
            return a - b * Math.floor(a / b);
          }
        }
        throw new FormulaError('#NAME');
      }
    }
  }

  return { values: t.rows.map((row, r) => row.map((_, c) => cell(r, c))), named };
}

/** The table at block `at` (the document's first, unless said) worked out; null where there is no table. */
export function evaluate(doc: Doc, at = firstTable(doc), today = todaySerial()): Evaluated | null {
  const t = tableAt(doc, at);
  return t && evaluateTable(t, today);
}

/** A worked-out value as words: numbers rounded to what is worth showing, errors as they are, nothing for an empty cell. */
export function formatValue(v: CellValue): string {
  if (v === null) return '';
  if (typeof v === 'number') {
    if (!isFinite(v)) return '#NUM';
    return Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(4) : String(Math.round(v * 1e8) / 1e8);
  }
  return v;
}

/** A value as its column shows it: a date, money, a percentage, a number with its commas, a check box. */
export function formatCell(v: CellValue, type: string = 'text'): string {
  if (typeof v !== 'number' || !isFinite(v)) return type === 'check' && v === null ? '' : formatValue(v);
  const tidy = (n: number, digits: number) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 6) });
  if (type === 'date') return serialToIso(v);
  if (type === 'money') return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === 'percent') return tidy(Math.round(v * 1e8) / 1e6, 0) + '%';
  if (type === 'number') return Math.abs(v) >= 1e15 ? formatValue(v) : tidy(Math.round(v * 1e8) / 1e8, 0);
  if (type === 'check') return v ? '☑' : '☐';
  return formatValue(v);
}
