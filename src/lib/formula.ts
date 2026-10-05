/**
 * A very small spreadsheet engine: 3 columns (A-C) by 20 rows.
 * Supports + - * / ^ %, parentheses, unary minus, cell refs (A1), ranges
 * (A1:A5) and the functions SUM AVG MIN MAX COUNT ABS ROUND SQRT INT MOD.
 */
export const COLS = 3;
export const ROWS = 20;
export const COL_NAMES = ['A', 'B', 'C'] as const;

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
        args.push(expr());
        while (isOp(',')) {
          next();
          args.push(expr());
        }
      }
      if (!isOp(')')) throw new FormulaError('#ERR');
      next();
      return { k: 'call', fn: t.v, args };
    }
    if (t.t === 'op' && t.v === '(') {
      const e = expr();
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
  const n = expr();
  if (p !== toks.length) throw new FormulaError('#ERR');
  return n;
}

export function refToRC(ref: string): [number, number] | null {
  const m = /^([A-C])(\d+)$/.exec(ref);
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
export function parseLiteral(raw: string): CellValue {
  const s = raw.trim();
  if (s === '') return null;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return parseFloat(s);
  return raw;
}

/** Evaluate every cell of the grid. Returns computed values in the same shape. */
export function evaluateGrid(grid: Grid): CellValue[][] {
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
      v = parseLiteral(raw);
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
        }
        throw new FormulaError('#ERR');
      }
      case 'call': {
        const xs = () => flatten(n.args);
        switch (n.fn) {
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

/** Serialize a grid as tab/newline separated text with trailing blanks trimmed. */
export function serializeGrid(grid: Grid): string {
  const rows = grid.map((row) => {
    const cells = row.slice();
    while (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells.join('\t');
  });
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  return rows.join('\n');
}

export function parseGrid(text: string): Grid {
  const grid: Grid = [];
  const lines = text ? text.split('\n') : [];
  for (let r = 0; r < ROWS; r++) {
    const cells = (lines[r] ?? '').split('\t');
    const row: string[] = [];
    for (let c = 0; c < COLS; c++) row.push(cells[c] ?? '');
    grid.push(row);
  }
  return grid;
}
