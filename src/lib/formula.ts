/**
 * A small spreadsheet engine: 6 columns (A-F) by 30 rows.
 * Supports + - * / ^ %, comparisons (= <> < > <= >=, giving 1 or 0),
 * parentheses, unary minus, cell refs (A1), ranges (A1:A5) and the functions
 * in FUNCTIONS below: enough for a small business model.
 *
 * Document format: rows separated by "\n", cells by "\t", trailing blanks
 * trimmed. An optional first line "!<chart>|<types>" carries the settings:
 * a chart of the table ("bar", "line", "pie" or nothing) and, after a bar,
 * one character per column for what the column holds (see COLUMN_TYPES;
 * "t", plain text, is the default and trailing ones are left off). A bare
 * "!" is written when the first row would otherwise look like settings.
 *
 * Dates are numbers: days counted the way spreadsheets count them (1900
 * system), so a date minus a date is a number of days and a date plus 30 is
 * the date a month on. A date column shows such numbers as dates.
 */
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
export const COLUMN_TYPES: { id: string; name: string; hint: string }[] = [
  { id: 't', name: 'Text', hint: 'Shown as typed' },
  { id: 'n', name: 'Number', hint: '1,234.5' },
  { id: '$', name: 'Money', hint: '$1,234.50' },
  { id: '%', name: 'Percent', hint: '12.5%' },
  { id: 'd', name: 'Date', hint: '2027-03-01' },
  { id: 'u', name: 'Link', hint: 'Opens when clicked' },
  { id: 'c', name: 'Checkbox', hint: '☑ or ☐' },
  { id: 'r', name: 'Rich text', hint: '*bold* and _italic_' },
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
export function parseLiteral(raw: string, type = 't'): CellValue {
  const s = raw.trim();
  if (s === '') return null;
  if (type === 'c') return /^(x|y|yes|true|1|done|☑|✓|✔)$/i.test(s) ? 1 : 0;
  if (type === 'd') {
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
  if (pct && type !== 't') return parseFloat(pct[1]) / 100;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(plain) && (plain === s || type === '$' || type === 'n' || type === '%')) return type === '%' ? parseFloat(plain) / 100 : parseFloat(plain);
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

const DIRECTIVE = /^!([a-z]*)(?:\|([a-z$%]*))?$/;

/** The chart a sheet asks for: 'bar', 'line', 'pie' or ''. */
export function chartOf(text: string): string {
  return DIRECTIVE.exec(text.split('\n', 1)[0])?.[1] ?? '';
}

/** What each column holds: one of COLUMN_TYPES' ids per column, 't' where nothing was said. */
export function typesOf(text: string): string[] {
  const set = DIRECTIVE.exec(text.split('\n', 1)[0])?.[2] ?? '';
  return Array.from({ length: COLS }, (_, c) => (COLUMN_TYPES.some((t) => t.id === set[c]) ? set[c] : 't'));
}

/** A value as its column shows it. */
export function formatCell(v: CellValue, type = 't'): string {
  if (typeof v !== 'number' || !isFinite(v)) return type === 'c' && v === null ? '' : formatValue(v);
  const tidy = (n: number, digits: number) => n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 6) });
  if (type === 'd') return serialToIso(v);
  if (type === '$') return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (type === '%') return tidy(Math.round(v * 1e8) / 1e6, 0) + '%';
  if (type === 'n') return Math.abs(v) >= 1e15 ? formatValue(v) : tidy(Math.round(v * 1e8) / 1e8, 0);
  if (type === 'c') return v ? '☑' : '☐';
  return formatValue(v);
}

/** Serialize a grid as tab/newline separated text with trailing blanks trimmed. */
export function serializeGrid(grid: Grid, chart = '', types: string[] = []): string {
  const rows = grid.map((row) => {
    const cells = row.slice();
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells.join('\t');
  });
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  const set = types.join('').replace(/t+$/, '');
  if (chart || set || (rows.length && DIRECTIVE.test(rows[0]))) rows.unshift('!' + chart + (set ? '|' + set : ''));
  return rows.join('\n');
}

export function parseGrid(text: string): Grid {
  const grid: Grid = [];
  const lines = text ? text.split('\n') : [];
  if (lines.length && DIRECTIVE.test(lines[0])) lines.shift();
  for (let r = 0; r < ROWS; r++) {
    const cells = (lines[r] ?? '').split('\t');
    const row: string[] = [];
    for (let c = 0; c < COLS; c++) row.push(cells[c] ?? '');
    grid.push(row);
  }
  return grid;
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
  return raw.replace(/\b([A-Fa-f])(\d{1,2})\b/g, (whole, col: string, row: string) => {
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
export function fillCells(grid: Grid, src: Range, dest: Range): Grid {
  const out = grid.map((row) => row.slice());
  const down = dest.r0 < src.r0 || dest.r1 > src.r1;
  const n = down ? src.r1 - src.r0 + 1 : src.c1 - src.c0 + 1;
  const num = (s: string) => (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s.trim()) ? parseFloat(s) : NaN);
  for (let line = down ? src.c0 : src.r0; line <= (down ? src.c1 : src.r1); line++) {
    const at = (k: number): [number, number] => (down ? [src.r0 + k, line] : [line, src.c0 + k]);
    const seed = Array.from({ length: n }, (_, k) => grid[at(k)[0]][at(k)[1]]);
    const nums = seed.map(num);
    const step = n >= 2 && nums.every((v) => !isNaN(v)) && nums.every((v, k) => k === 0 || Math.abs(v - nums[k - 1] - (nums[1] - nums[0])) < 1e-9) ? nums[1] - nums[0] : null;
    for (let k = (down ? dest.r0 : dest.c0) - (down ? src.r0 : src.c0); k <= (down ? dest.r1 : dest.c1) - (down ? src.r0 : src.c0); k++) {
      if (k >= 0 && k < n) continue;
      const from = ((k % n) + n) % n;
      const [r, c] = at(k);
      const raw = seed[from];
      out[r][c] = step !== null ? String(Math.round((nums[0] + step * k) * 1e10) / 1e10) : shiftFormula(raw, down ? k - from : 0, down ? 0 : k - from);
    }
  }
  return out;
}
