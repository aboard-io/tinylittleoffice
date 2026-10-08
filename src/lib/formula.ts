/**
 * A small spreadsheet engine: 6 columns (A-F) by 1,000 rows.
 * Supports + - * / ^ %, comparisons (= <> < > <= >=, giving 1 or 0),
 * parentheses, unary minus, cell refs (A1), ranges (A1:A5) and the functions
 * in FUNCTIONS below: enough for a small business model.
 *
 * Document format (TLO, lib/tlo.ts): one table. Its header row names the
 * columns, each with what it holds ("Price:money"; see COLUMN_TYPES), and
 * its rows are rows 1, 2, 3 and so on, so A1 is the first row under the
 * names. The chart of the table, if any, is "chart: bar" (line, pie) in the
 * document's header.
 *
 * Dates are numbers: days counted the way spreadsheets count them (1900
 * system), so a date minus a date is a number of days and a date plus 30 is
 * the date a month on. A date column shows such numbers as dates.
 */
import { dayToYmd, ymdString, ymdToDay } from './tz.ts';
import { column, columnText, parse as parseTlo, write as writeTlo, type Block, type ColType } from './tlo.ts';
export const COLS = 6;
export const ROWS = 1000;
export const COL_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Every function the engine knows: name, example arguments, what it does. */
export const FUNCTIONS: [string, string, string][] = [
  ['SUM', 'A1:A5', 'Add up'],
  ['AVG', 'A1:A5', 'Average'],
  ['MIN', 'A1:A5', 'Smallest'],
  ['MAX', 'A1:A5', 'Largest'],
  ['COUNT', 'A1:A5', 'How many numbers'],
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

/** What a column holds: how its cells are read when typed, and shown. */
export const COLUMN_TYPES: { id: ColType; name: string; hint: string }[] = [
  { id: 'text', name: 'Text', hint: 'Shown as typed' },
  { id: 'number', name: 'Number', hint: '1,234.5' },
  { id: 'money', name: 'Money', hint: '$1,234.50' },
  { id: 'percent', name: 'Percent', hint: '12.5%' },
  { id: 'date', name: 'Date', hint: '2027-03-01' },
  { id: 'url', name: 'Link', hint: 'Opens when clicked' },
  { id: 'check', name: 'Checkbox', hint: '☑ or ☐' },
  { id: 'rich', name: 'Rich text', hint: '**bold** and *italic*' },
];

const DAY_MS = 86400000;
/** Days from the spreadsheet epoch (30 December 1899) to 1 January 1970. */
const EPOCH_SERIAL = 25569;
export const dateToSerial = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / DAY_MS) + EPOCH_SERIAL;
export function serialToDate(serial: number): { y: number; m: number; d: number; wd: number } {
  const t = new Date((Math.floor(serial) - EPOCH_SERIAL) * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}
export const todaySerial = () => {
  const n = new Date();
  return dateToSerial(n.getFullYear(), n.getMonth() + 1, n.getDate());
};
const pad = (n: number) => String(n).padStart(2, '0');
export const serialToIso = (serial: number) => {
  const { y, m, d } = serialToDate(serial);
  return `${y}-${pad(m)}-${pad(d)}`;
};

export type CellValue = number | string | null;
export type Grid = string[][]; // grid[row][col], raw text

type Tok =
  | { t: 'num'; v: number }
  | { t: 'ref'; v: string }
  | { t: 'range'; v: [string, string] }
  | { t: 'fn'; v: string }
  | { t: 'op'; v: string };

type Node =
  | { k: 'num'; v: number }
  | { k: 'ref'; v: string }
  | { k: 'range'; v: [string, string] }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'call'; fn: string; args: Node[] };

export class FormulaError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

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
    if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+\d*/i.exec(src.slice(i))!;
      const word = m[0].toUpperCase();
      i += m[0].length;
      if (/^[A-Z]{1,2}\d+$/.test(word)) {
        // maybe a range
        const r = /^:([a-z]{1,2}\d+)/i.exec(src.slice(i));
        if (r) {
          i += r[0].length;
          toks.push({ t: 'range', v: [word, r[1].toUpperCase()] });
        } else {
          toks.push({ t: 'ref', v: word });
        }
      } else {
        toks.push({ t: 'fn', v: word });
      }
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

function parse(toks: Tok[]): Node {
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v;

  function primary(): Node {
    const t = next();
    if (!t) throw new FormulaError('#ERR');
    if (t.t === 'num') return { k: 'num', v: t.v };
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
  function term(): Node {
    let a = power();
    while (isOp('*') || isOp('/')) {
      const op = (next() as { v: string }).v;
      a = { k: 'bin', op, a, b: power() };
    }
    return a;
  }
  function expr(): Node {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const op = (next() as { v: string }).v;
      a = { k: 'bin', op, a, b: term() };
    }
    return a;
  }
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

export function refToRC(ref: string): [number, number] | null {
  const m = /^([A-F])(\d+)$/.exec(ref);
  if (!m) return null;
  const col = m[1].charCodeAt(0) - 65;
  const row = parseInt(m[2], 10) - 1;
  if (row < 0 || row >= ROWS || col >= COLS) return null;
  return [row, col];
}

export function rcToRef(row: number, col: number): string {
  return COL_NAMES[col] + (row + 1);
}

function rangeCells(a: string, b: string): [number, number][] {
  const p = refToRC(a);
  const q = refToRC(b);
  if (!p || !q) throw new FormulaError('#REF');
  const out: [number, number][] = [];
  for (let r = Math.min(p[0], q[0]); r <= Math.max(p[0], q[0]); r++)
    for (let c = Math.min(p[1], q[1]); c <= Math.max(p[1], q[1]); c++) out.push([r, c]);
  return out;
}

/** Parse a raw cell string into its displayed/computed value. */
export function parseLiteral(raw: string, type = 'text'): CellValue {
  const s = raw.trim();
  if (s === '') return null;
  if (type === 'check') return /^(x|y|yes|true|1|done|☑|✓|✔)$/i.test(s) ? 1 : 0;
  if (type === 'date') {
    // A date as written: 2027-03-01, or 3/1/2027, or "today".
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) return dateToSerial(+iso[1], +iso[2], +iso[3]);
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (us) return dateToSerial(+us[3], +us[1], +us[2]);
    if (/^today$/i.test(s)) return todaySerial();
  }
  // Money and percentages may be typed with their signs and commas.
  const plain = s.replace(/^([+-]?)\$/, '$1').replace(/(\d),(?=\d{3})/g, '$1');
  const pct = /^([+-]?(?:\d+\.?\d*|\.\d+))%$/.exec(plain);
  if (pct && type !== 'text') return parseFloat(pct[1]) / 100;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(plain) && (plain === s || type === 'money' || type === 'number' || type === 'percent')) return type === 'percent' ? parseFloat(plain) / 100 : parseFloat(plain);
  return raw;
}

/** Evaluate every cell of the grid. Returns computed values in the same shape. */
export function evaluateGrid(grid: Grid, types: string[] = []): CellValue[][] {
  const cache = new Map<string, CellValue>();
  const visiting = new Set<string>();

  function cell(r: number, c: number): CellValue {
    const key = rcToRef(r, c);
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) throw new FormulaError('#CIRC');
    const raw = grid[r]?.[c] ?? '';
    let v: CellValue;
    if (raw.startsWith('=')) {
      visiting.add(key);
      try {
        v = evalNode(parse(tokenize(raw.slice(1))));
      } catch (e) {
        v = e instanceof FormulaError ? e.code : '#ERR';
      } finally {
        visiting.delete(key);
      }
    } else {
      v = parseLiteral(raw, types[c]);
    }
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
      } else {
        out.push(num(evalNode(a)));
      }
    }
    return out;
  }

  function evalNode(n: Node): CellValue {
    switch (n.k) {
      case 'num':
        return n.v;
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
        switch (n.op) {
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '*':
            return a * b;
          case '/':
            if (b === 0) throw new FormulaError('#DIV/0');
            return a / b;
          case '^':
            return Math.pow(a, b);
          case '=':
            return a === b ? 1 : 0;
          case '<>':
            return a !== b ? 1 : 0;
          case '<':
            return a < b ? 1 : 0;
          case '>':
            return a > b ? 1 : 0;
          case '<=':
            return a <= b ? 1 : 0;
          case '>=':
            return a >= b ? 1 : 0;
        }
        throw new FormulaError('#ERR');
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
            return todaySerial();
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
          case 'SUM':
            return xs().reduce((s, x) => s + x, 0);
          case 'AVG':
          case 'AVERAGE': {
            const v = xs();
            if (!v.length) throw new FormulaError('#DIV/0');
            return v.reduce((s, x) => s + x, 0) / v.length;
          }
          case 'MIN': {
            const v = xs();
            return v.length ? Math.min(...v) : 0;
          }
          case 'MAX': {
            const v = xs();
            return v.length ? Math.max(...v) : 0;
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
            const d = n.args[1] ? num(evalNode(n.args[1])) : 0;
            const f = Math.pow(10, d);
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

  const out: CellValue[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < COLS; c++) row.push(cell(r, c));
    out.push(row);
  }
  return out;
}

/** Format a computed value for display. */
export function formatValue(v: CellValue): string {
  if (v === null) return '';
  if (typeof v === 'number') {
    if (!isFinite(v)) return '#NUM';
    const s = Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-6 && v !== 0) ? v.toExponential(4) : String(Math.round(v * 1e8) / 1e8);
    return s;
  }
  return v;
}

/**
 * A column's name as shown: the one given it, or else what it holds
 * ("Date", "Money"; "Date B" when an earlier column already goes by that),
 * or "ColA" for a column of text.
 */
export function columnName(c: number, types: string[], names: string[] = []): string {
  if (names[c]?.trim()) return names[c].trim();
  return defaultColumnName(c, types);
}
export function defaultColumnName(c: number, types: string[]): string {
  const type = types[c] ?? 'text';
  if (type === 'text') return `Col${COL_NAMES[c]}`;
  const name = COLUMN_TYPES.find((t) => t.id === type)!.name;
  return types.slice(0, c).includes(type) ? `${name} ${COL_NAMES[c]}` : name;
}

/** A value as its column shows it. */
export function formatCell(v: CellValue, type = 'text'): string {
  if (typeof v !== 'number' || !isFinite(v)) return type === 'check' && v === null ? '' : formatValue(v);
  const tidy = (n: number, digits: number) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 6) });
  if (type === 'date') return serialToIso(v);
  if (type === 'money') return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === 'percent') return tidy(Math.round(v * 1e8) / 1e6, 0) + '%';
  if (type === 'number') return Math.abs(v) >= 1e15 ? formatValue(v) : tidy(Math.round(v * 1e8) / 1e8, 0);
  if (type === 'check') return v ? '☑' : '☐';
  return formatValue(v);
}

/* ---------- the document ---------- */

/** A sheet as its document holds it: the cells, the chart asked for, and each column's type and name. */
export interface Sheet {
  grid: Grid;
  /** 'bar', 'line', 'pie' or ''. */
  chart: string;
  /** One of COLUMN_TYPES' ids per column. */
  types: string[];
  /** The names given to the columns: '' where a column goes by its default (see defaultColumnName). */
  names: string[];
}

type Table = Extract<Block, { k: 'table' }>;
const CHARTS = ['bar', 'line', 'pie'];
const blankGrid = (): Grid => Array.from({ length: ROWS }, () => Array<string>(COLS).fill(''));

/** A table as a sheet: its header row the names and types, its rows the cells. Columns past F and rows past the last are left out. */
export function tableSheet(table: Table | undefined, chart = ''): Sheet {
  const grid = blankGrid();
  const types = Array<string>(COLS).fill('text');
  const names = Array<string>(COLS).fill('');
  if (table) {
    table.head.slice(0, COLS).forEach((h, c) => {
      const col = column(h);
      types[c] = COLUMN_TYPES.some((t) => t.id === col.type) ? col.type : 'text';
      names[c] = col.name;
    });
    // A name that is only the default ("ColA", "Date") is no name: it follows the column's type.
    names.forEach((n, c) => n === defaultColumnName(c, types) && (names[c] = ''));
    table.rows.slice(0, ROWS).forEach((row, r) => row.slice(0, COLS).forEach((v, c) => (grid[r][c] = v)));
  }
  return { grid, chart: CHARTS.includes(chart) ? chart : '', types, names };
}

/** A sheet's document read: the first table in it, and the chart in its header. */
export function readSheet(text: string): Sheet {
  const doc = parseTlo(text);
  return tableSheet(doc.blocks.find((b): b is Table => b.k === 'table'), (doc.head.chart ?? '').toLowerCase());
}

export const parseGrid = (text: string): Grid => readSheet(text).grid;
/** The chart a sheet asks for: 'bar', 'line', 'pie' or ''. */
export const chartOf = (text: string): string => readSheet(text).chart;
/** What each column holds: one of COLUMN_TYPES' ids per column, 'text' where nothing was said. */
export const typesOf = (text: string): string[] => readSheet(text).types;
/** The names given to the columns ('' where none was given). */
export const namesOf = (text: string): string[] => readSheet(text).names;

/**
 * A sheet as its document: the used rows under a header row of every used
 * column's name and type. At least two columns are written, so the table
 * reads as one (a lone column has no "|" to tell it from words).
 */
export function serializeGrid(grid: Grid, chart = '', types: string[] = [], names: string[] = []): string {
  let rows = 0;
  let cols = 0;
  grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === '') return;
      rows = Math.max(rows, r + 1);
      cols = Math.max(cols, c + 1);
    }),
  );
  for (let c = 0; c < COLS; c++) if (names[c]?.trim() || (types[c] && types[c] !== 'text')) cols = Math.max(cols, c + 1);
  const across = cols ? Math.max(2, cols) : 0;
  const blocks: Block[] = across
    ? [{ k: 'table', head: Array.from({ length: across }, (_, c) => columnText(columnName(c, types, names), (types[c] ?? 'text') as ColType)), rows: grid.slice(0, rows).map((row) => Array.from({ length: across }, (_, c) => row[c] ?? '')) }]
    : [];
  return writeTlo({ head: chart ? { chart } : {}, blocks }).trimEnd();
}

/* ---------- blocks of cells: copy, paste, clear, fill ---------- */

/** A rectangle of cells, corners included. */
export interface Range {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

export const rangeOf = (a: [number, number], b: [number, number] = a): Range => ({ r0: Math.min(a[0], b[0]), c0: Math.min(a[1], b[1]), r1: Math.max(a[0], b[0]), c1: Math.max(a[1], b[1]) });
export const rangeRef = (g: Range) => (g.r0 === g.r1 && g.c0 === g.c1 ? rcToRef(g.r0, g.c0) : `${rcToRef(g.r0, g.c0)}:${rcToRef(g.r1, g.c1)}`);
const inGrid = (r: number, c: number) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

/** A formula as it reads after moving by (dr, dc): its references move with it. Other text is untouched. */
export function shiftFormula(raw: string, dr: number, dc: number): string {
  if (!raw.startsWith('=') || (!dr && !dc)) return raw;
  return raw.replace(/\b([A-Fa-f])(\d{1,4})\b/g, (whole, col: string, row: string) => {
    const at = refToRC(col.toUpperCase() + row);
    if (!at) return whole;
    return inGrid(at[0] + dr, at[1] + dc) ? rcToRef(at[0] + dr, at[1] + dc) : '#REF';
  });
}

/** The cells of a range as text: tabs between cells, newlines between rows. What spreadsheets put on the clipboard. */
export function copyCells(grid: Grid, g: Range): string {
  const rows: string[] = [];
  for (let r = g.r0; r <= g.r1; r++) rows.push(grid[r].slice(g.c0, g.c1 + 1).join('\t'));
  return rows.join('\n');
}

export function clearCells(grid: Grid, g: Range): Grid {
  return grid.map((row, r) => row.map((cell, c) => (r >= g.r0 && r <= g.r1 && c >= g.c0 && c <= g.c1 ? '' : cell)));
}

/**
 * Paste tab-and-newline text with its top left at (r, c). `moved` shifts
 * formulas' references (a copy within the sheet); `into` repeats a single
 * value over a whole selection. Returns the new grid and the cells written.
 */
export function pasteCells(grid: Grid, r: number, c: number, text: string, moved?: { dr: number; dc: number }, into?: Range): { grid: Grid; range: Range } {
  const rows = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
  const out = grid.map((row) => row.slice());
  const single = rows.length === 1 && rows[0].length === 1;
  const g: Range = single && into ? into : { r0: r, c0: c, r1: Math.min(ROWS - 1, r + rows.length - 1), c1: Math.min(COLS - 1, c + Math.max(...rows.map((x) => x.length)) - 1) };
  for (let y = g.r0; y <= g.r1; y++)
    for (let x = g.c0; x <= g.c1; x++) {
      const raw = single ? rows[0][0] : (rows[y - r]?.[x - c] ?? '');
      // Each copy of a single cell moves by its own distance from the original.
      out[y][x] = moved ? shiftFormula(raw, moved.dr + (single ? y - r : 0), moved.dc + (single ? x - c : 0)) : raw;
    }
  return { grid: out, range: g };
}

/**
 * Drag-fill: carry the cells of `src` out to `dest` (which contains it and
 * extends one way). Formulas move their references; two or more numbers in
 * step carry on counting; anything else repeats.
 */
/**
 * The rows in order of column `c`, numbers before words, blanks last.
 * (The names above the columns are not a row, so they stay where they are.)
 * Formulas move with their rows as they are.
 */
export function sortRows(grid: Grid, c: number, descending = false): Grid {
  const used = grid.reduce((n, row, r) => (row.some((v) => v !== '') ? r + 1 : n), 0);
  if (used < 2) return grid;
  const num = (s: string) => (/^[+-]?(\d+\.?\d*|\.\d+)%?$/.test(s.trim()) ? parseFloat(s) : NaN);
  const rows = grid.slice(0, used);
  const key = (row: string[]) => row[c] ?? '';
  const sorted = rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      const x = key(a.row), y = key(b.row);
      if (x === '' || y === '') return x === '' ? (y === '' ? a.i - b.i : 1) : -1;
      const nx = num(x), ny = num(y);
      const d = !isNaN(nx) && !isNaN(ny) ? nx - ny : isNaN(nx) === isNaN(ny) ? x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' }) : isNaN(nx) ? 1 : -1;
      return (descending && x !== '' && y !== '' ? -d : d) || a.i - b.i;
    })
    .map(({ row }) => row);
  return [...sorted, ...grid.slice(used)];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Steps that are all the same: the step, or null. */
const evenStep = (v: number[]) => (v.length >= 2 && v.every((x, k) => k === 0 || Math.abs(x - v[k - 1] - (v[1] - v[0])) < 1e-9) ? v[1] - v[0] : null);

/**
 * What a run of cells goes on as, when dragged further: the k-th cell
 * (k counted from the first of the run, negative before it), or null when
 * the run is no series and is repeated instead. Numbers in even steps;
 * dates by even days, or by whole months when the day stays put (a lone
 * date goes a day at a time); words ending in a number ("Week 1", "Q1"),
 * a lone one counting up by one; month and weekday names, round the year
 * and the week, spelled as they were (full or three letters).
 */
export function seriesOf(seed: string[]): ((k: number) => string) | null {
  const cells = seed.map((s) => s.trim());
  if (!cells.length || cells.some((c) => !c || c.startsWith('='))) return null;
  const n = cells.length;
  // Numbers, with or without thousands commas.
  const nums = cells.map((c) => (/^[+-]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/.test(c) && /\d/.test(c) ? parseFloat(c.replace(/,/g, '')) : NaN));
  if (nums.every((v) => !isNaN(v))) {
    const step = evenStep(nums);
    return step === null ? null : (k) => String(Math.round((nums[0] + step * k) * 1e10) / 1e10);
  }
  // Dates.
  const ymd = cells.map((c) => /^(\d{4})-(\d\d)-(\d\d)$/.exec(c));
  if (ymd.every(Boolean)) {
    const parts = ymd.map((m) => [+m![1], +m![2], +m![3]]);
    const days = parts.map(([y, m, d]) => ymdToDay(y, m, d));
    const months = parts.map(([y, m]) => y * 12 + m - 1);
    const monthStep = n >= 2 && parts.every((p) => p[2] === parts[0][2]) ? evenStep(months) : null;
    if (monthStep) {
      return (k) => {
        const total = months[0] + monthStep * k;
        const [y, m] = [Math.floor(total / 12), (total % 12) + 1];
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return ymdString(y, m, Math.min(parts[0][2], last));
      };
    }
    const step = n === 1 ? 1 : evenStep(days);
    if (step === null) return null;
    return (k) => {
      const { y, m, d } = dayToYmd(days[0] + step * k);
      return ymdString(y, m, d);
    };
  }
  // Month and weekday names.
  for (const names of [MONTH_NAMES, DAY_NAMES]) {
    const short = cells.every((c) => c.length === 3);
    const idx = cells.map((c) => names.findIndex((x) => (short ? x.slice(0, 3) : x).toLowerCase() === c.toLowerCase()));
    if (idx.every((i) => i >= 0)) {
      const step = n === 1 ? 1 : evenStep(idx);
      if (step === null) return null;
      const upper = cells[0] === cells[0].toUpperCase();
      return (k) => {
        const name = names[(((idx[0] + step * k) % names.length) + names.length) % names.length];
        const word = short ? name.slice(0, 3) : name;
        return upper ? word.toUpperCase() : cells[0][0] === cells[0][0].toLowerCase() ? word.toLowerCase() : word;
      };
    }
  }
  // Words ending in a number, all with the same words before it.
  const tails = cells.map((c) => /^(.*?\D)(\d+)$/.exec(c));
  if (tails.every(Boolean) && tails.every((t) => t![1] === tails[0]![1])) {
    const v = tails.map((t) => +t![2]);
    const step = n === 1 ? 1 : evenStep(v);
    if (step === null) return null;
    const width = tails[0]![2].startsWith('0') ? tails[0]![2].length : 0;
    return (k) => {
      const at = v[0] + step * k;
      return at < 0 ? cells[((k % n) + n) % n] : tails[0]![1] + String(at).padStart(width, '0');
    };
  }
  return null;
}

export function fillCells(grid: Grid, src: Range, dest: Range): Grid {
  const out = grid.map((row) => row.slice());
  const down = dest.r0 < src.r0 || dest.r1 > src.r1;
  const n = down ? src.r1 - src.r0 + 1 : src.c1 - src.c0 + 1;
  for (let line = down ? src.c0 : src.r0; line <= (down ? src.c1 : src.r1); line++) {
    const at = (k: number): [number, number] => (down ? [src.r0 + k, line] : [line, src.c0 + k]);
    const seed = Array.from({ length: n }, (_, k) => grid[at(k)[0]][at(k)[1]]);
    // A lone number is copied, as spreadsheets do; anything else that makes a series goes on as one.
    const series = n === 1 && /^[+-]?[\d,.]+$/.test(seed[0].trim()) ? null : seriesOf(seed);
    for (let k = (down ? dest.r0 : dest.c0) - (down ? src.r0 : src.c0); k <= (down ? dest.r1 : dest.c1) - (down ? src.r0 : src.c0); k++) {
      if (k >= 0 && k < n) continue;
      const from = ((k % n) + n) % n;
      const [r, c] = at(k);
      out[r][c] = series ? series(k) : shiftFormula(seed[from], down ? k - from : 0, down ? 0 : k - from);
    }
  }
  return out;
}


/* ---------- rows put in and taken out ---------- */

/**
 * A formula's references after rows move: `to(r)` is where row r is now,
 * or null if it is gone. A range keeps what is left of it (taking rows out
 * of its middle shrinks it; putting rows in its middle grows it); a
 * reference to a row that is gone is #REF. Words in quotes are left alone.
 */
function remapRows(raw: string, to: (r: number) => number | null, gone: [number, number] | null): string {
  if (!raw.startsWith('=')) return raw;
  const one = (r: number) => to(r);
  return raw
    .split(/("[^"]*")/)
    .map((part, i) => {
      if (i % 2) return part;
      // Ranges first, set aside so their cells are not moved twice; then single cells; then the ranges back.
      const ranges: string[] = [];
      const out = part
        .replace(/\b([A-Fa-f])(\d{1,4}):([A-Fa-f])(\d{1,4})\b/g, (_, c0: string, r0: string, c1: string, r1: string) => {
          let [a, b] = [+r0 - 1, +r1 - 1];
          if (a > b) [a, b] = [b, a];
          // Each end goes where its row went; an end whose row is gone comes to the nearest row still there.
          let na = one(a);
          let nb = one(b);
          if (na === null) na = gone ? gone[0] : a;
          if (nb === null) nb = gone ? gone[0] - 1 : b;
          ranges.push(nb < na || na < 0 || nb >= ROWS ? '#REF' : `${c0.toUpperCase()}${na + 1}:${c1.toUpperCase()}${nb + 1}`);
          return `\u0001${ranges.length - 1}\u0002`;
        })
        .replace(/\b([A-Fa-f])(\d{1,4})\b/g, (_, c: string, r: string) => {
          const n = one(+r - 1);
          return n === null || n >= ROWS ? '#REF' : `${c.toUpperCase()}${n + 1}`;
        });
      return out.replace(/\u0001(\d+)\u0002/g, (_, k: string) => ranges[+k]);
    })
    .join('');
}

/** n empty rows put in before row `at`; null when the sheet has no room (its last rows are not empty). */
export function insertRows(grid: Grid, at: number, n = 1): Grid | null {
  if (grid.slice(ROWS - n).some((row) => row.some((v) => v !== ''))) return null;
  const to = (r: number) => (r >= at ? r + n : r);
  const moved = [...grid.slice(0, at), ...Array.from({ length: n }, () => Array<string>(COLS).fill('')), ...grid.slice(at, ROWS - n)];
  return moved.map((row) => row.map((v) => remapRows(v, to, null)));
}

/** Rows r0 to r1 taken out; those below come up, and empty rows fill the foot of the sheet. */
export function deleteRows(grid: Grid, r0: number, r1: number): Grid {
  const n = r1 - r0 + 1;
  const to = (r: number) => (r < r0 ? r : r > r1 ? r - n : null);
  const kept = [...grid.slice(0, r0), ...grid.slice(r1 + 1), ...Array.from({ length: n }, () => Array<string>(COLS).fill(''))];
  return kept.map((row) => row.map((v) => remapRows(v, to, [r0, r1])));
}
