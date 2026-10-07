/**
 * The calculator's arithmetic and its modes. Expressions are parsed by
 * hand (never evaluated as code): numbers, + - * / ^ %, parentheses, the
 * functions a scientific calculator has, π and e, and a variable x for
 * graphing. The money modes are the formulas every finance class teaches.
 *
 * Document format: the first line names the mode ("!mortgage"); then one
 * "name = value" a line for its inputs, or, for the calculator and the
 * grapher, one expression a line (the tape).
 */
export type Mode = 'calc' | 'graph' | 'mortgage' | 'invest' | 'cashflow' | 'interest';
export const MODES: { id: Mode; name: string }[] = [
  { id: 'calc', name: 'Calculator' },
  { id: 'graph', name: 'Scientific & graph' },
  { id: 'mortgage', name: 'Mortgage' },
  { id: 'invest', name: 'Investment' },
  { id: 'cashflow', name: 'Cash flow' },
  { id: 'interest', name: 'Interest' },
];

const FN: Record<string, (a: number, b?: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: (a, b = a) => Math.min(a, b), max: (a, b = a) => Math.max(a, b), pow: (a, b = 2) => Math.pow(a, b),
  fact: (n) => (n < 0 || n > 170 || n % 1 ? NaN : Array.from({ length: n }, (_, i) => i + 1).reduce((p, k) => p * k, 1)),
};
const CONST: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E, tau: 2 * Math.PI };

/** Evaluate an expression; NaN when it does not parse. `x` may be given. Degrees are not assumed: sin takes radians, as the keys say. */
export function evaluate(src: string, x = NaN): number {
  const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '^');
  let at = 0;
  const peek = () => s[at];
  const fail = (): never => {
    throw new Error('parse');
  };
  const atom = (): number => {
    const c = peek();
    if (c === '(') {
      at++;
      const v = expr();
      if (s[at++] !== ')') fail();
      return v;
    }
    if (c === '-') return (at++, -unary());
    if (c === '+') return (at++, unary());
    const m = /^(\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?%?/i.exec(s.slice(at));
    if (m) {
      at += m[0].length;
      return m[0].endsWith('%') ? parseFloat(m[0]) / 100 : parseFloat(m[0]);
    }
    const w = /^[a-zπ]+\d*/i.exec(s.slice(at));
    if (!w) return fail();
    at += w[0].length;
    const name = w[0].toLowerCase();
    if (peek() === '(' && FN[name]) {
      at++;
      const a = expr();
      let b: number | undefined;
      if (peek() === ',') (at++, (b = expr()));
      if (s[at++] !== ')') fail();
      return FN[name](a, b);
    }
    if (name === 'x') return x;
    if (name in CONST) return CONST[name];
    return fail();
  };
  const postfix = (): number => {
    let v = atom();
    while (peek() === '!') (at++, (v = FN.fact(v)));
    return v;
  };
  const unary = (): number => postfix();
  const power = (): number => {
    const base = unary();
    if (peek() === '^') return (at++, Math.pow(base, power()));
    return base;
  };
  const term = (): number => {
    let v = power();
    for (;;) {
      if (peek() === '*') (at++, (v *= power()));
      else if (peek() === '/') (at++, (v /= power()));
      else if (peek() === '(' || /[a-zπ]/i.test(peek() ?? '')) v *= power(); // 2(3+4), 2x, 3sin(x)
      else return v;
    }
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') v = s[at++] === '+' ? v + term() : v - term();
    return v;
  };
  if (!s) return NaN;
  try {
    const v = expr();
    return at === s.length ? v : NaN;
  } catch {
    return NaN;
  }
}

/** A number as a calculator shows it: up to 10 significant digits, no trailing noise. */
export function shown(v: number): string {
  if (!isFinite(v)) return isNaN(v) ? '' : v > 0 ? '∞' : '−∞';
  const a = Math.abs(v);
  const s = a >= 1e12 || (a < 1e-6 && a > 0) ? v.toExponential(6).replace(/\.?0+e/, 'e') : String(+v.toPrecision(10));
  return s.replace(/^-/, '−');
}
export const money = (v: number, d = 2) => (isFinite(v) ? v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');

/* ---------- the document ---------- */

export interface Calc {
  mode: Mode;
  /** The tape (calc, graph) or the inputs (the rest), as written. */
  lines: string[];
}
export function parseCalc(text: string): Calc {
  const lines = text ? text.split('\n') : [];
  const m = /^!([a-z]+)$/.exec(lines[0] ?? '');
  const mode = (m && MODES.some((x) => x.id === m[1]) ? m[1] : 'calc') as Mode;
  return { mode, lines: (m ? lines.slice(1) : lines).filter((l, i, a) => l.trim() || i < a.length - 1) };
}
export function serializeCalc(c: Calc): string {
  const body = c.lines.join('\n').replace(/\n+$/, '');
  return c.mode === 'calc' && !body ? '' : `!${c.mode}${body ? '\n' + body : ''}`;
}
/** "name = value" lines as numbers, by name; a plain number stands alone. */
export function inputs(lines: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) {
    const m = /^\s*([^=]+?)\s*=\s*(.+?)\s*$/.exec(l);
    if (m) out[m[1].toLowerCase()] = evaluate(m[2].replace(/[,$£€]/g, ''));
  }
  return out;
}
/** Defaults for a mode's inputs, in the order the form shows them. */
export const FIELDS: Record<Exclude<Mode, 'calc' | 'graph'>, { key: string; name: string; value: number; unit?: string }[]> = {
  mortgage: [
    { key: 'price', name: 'Price', value: 400000, unit: '$' },
    { key: 'deposit', name: 'Deposit', value: 80000, unit: '$' },
    { key: 'rate', name: 'Interest rate', value: 6.5, unit: '% a year' },
    { key: 'years', name: 'Term', value: 30, unit: 'years' },
  ],
  invest: [
    { key: 'start', name: 'Starting amount', value: 10000, unit: '$' },
    { key: 'monthly', name: 'Added each month', value: 500, unit: '$' },
    { key: 'return', name: 'Return', value: 7, unit: '% a year' },
    { key: 'years', name: 'For', value: 20, unit: 'years' },
  ],
  cashflow: [
    { key: 'rate', name: 'Discount rate', value: 8, unit: '% a year' },
    { key: 'year 0', name: 'Year 0', value: -100000, unit: '$' },
    { key: 'year 1', name: 'Year 1', value: 30000, unit: '$' },
    { key: 'year 2', name: 'Year 2', value: 40000, unit: '$' },
    { key: 'year 3', name: 'Year 3', value: 50000, unit: '$' },
    { key: 'year 4', name: 'Year 4', value: 30000, unit: '$' },
  ],
  interest: [
    { key: 'principal', name: 'Principal', value: 10000, unit: '$' },
    { key: 'rate', name: 'Rate', value: 5, unit: '% a year' },
    { key: 'years', name: 'For', value: 10, unit: 'years' },
    { key: 'times', name: 'Compounded', value: 12, unit: 'times a year' },
  ],
};
export function withDefaults(mode: Exclude<Mode, 'calc' | 'graph'>, given: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of FIELDS[mode]) out[f.key] = isFinite(given[f.key]) ? given[f.key] : f.value;
  // Cash flows may run on past the defaults.
  for (const k of Object.keys(given)) if (/^year \d+$/.test(k) && isFinite(given[k])) out[k] = given[k];
  return out;
}

/* ---------- the money ---------- */

export const pmt = (rate: number, n: number, pv: number) => (rate === 0 ? pv / n : (pv * rate) / (1 - Math.pow(1 + rate, -n)));

export function mortgage(v: Record<string, number>) {
  const loan = Math.max(0, v.price - v.deposit);
  const r = v.rate / 100 / 12;
  const n = Math.max(1, Math.round(v.years * 12));
  const monthly = pmt(r, n, loan);
  // Year by year: interest paid, principal paid, what is still owed.
  const years: { year: number; interest: number; principal: number; owed: number }[] = [];
  let owed = loan;
  for (let y = 1; y <= Math.ceil(n / 12); y++) {
    let interest = 0;
    let principal = 0;
    for (let m = 0; m < 12 && (y - 1) * 12 + m < n; m++) {
      const i = owed * r;
      interest += i;
      principal += monthly - i;
      owed -= monthly - i;
    }
    years.push({ year: y, interest, principal, owed: Math.max(0, owed) });
  }
  return { loan, monthly, total: monthly * n, interest: monthly * n - loan, years };
}

export function invest(v: Record<string, number>) {
  const r = v.return / 100 / 12;
  const n = Math.max(0, Math.round(v.years * 12));
  const years: { year: number; put: number; value: number }[] = [];
  let value = v.start;
  let put = v.start;
  for (let m = 1; m <= n; m++) {
    value = value * (1 + r) + v.monthly;
    put += v.monthly;
    if (m % 12 === 0 || m === n) years.push({ year: Math.ceil(m / 12), put, value });
  }
  return { final: value, put, growth: value - put, years };
}

export function cashflow(v: Record<string, number>) {
  const flows = Object.keys(v)
    .filter((k) => /^year \d+$/.test(k))
    .sort((a, b) => +a.slice(5) - +b.slice(5))
    .map((k) => v[k]);
  const r = v.rate / 100;
  const npv = flows.reduce((a, f, t) => a + f / Math.pow(1 + r, t), 0);
  // IRR by bisection on the sign change of NPV.
  const at = (rate: number) => flows.reduce((a, f, t) => a + f / Math.pow(1 + rate, t), 0);
  let lo = -0.99;
  let hi = 10;
  let irr = NaN;
  if (at(lo) * at(hi) < 0) {
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (at(lo) * at(mid) <= 0) hi = mid;
      else lo = mid;
    }
    irr = (lo + hi) / 2;
  }
  let running = 0;
  let payback = NaN;
  flows.forEach((f, t) => {
    const before = running;
    running += f;
    if (isNaN(payback) && before < 0 && running >= 0) payback = t - 1 + -before / f;
  });
  return { flows, npv, irr, payback, cumulative: flows.map((_, t) => flows.slice(0, t + 1).reduce((a, b) => a + b, 0)) };
}

export function interest(v: Record<string, number>) {
  const r = v.rate / 100;
  const simple = v.principal * r * v.years;
  const k = Math.max(1, Math.round(v.times));
  const compound = v.principal * Math.pow(1 + r / k, k * v.years) - v.principal;
  const apy = Math.pow(1 + r / k, k) - 1;
  const years = Array.from({ length: Math.max(1, Math.ceil(v.years)) }, (_, i) => ({ year: i + 1, simple: v.principal * (1 + r * (i + 1)), compound: v.principal * Math.pow(1 + r / k, k * (i + 1)) }));
  return { simple, compound, apy, double: r > 0 ? Math.log(2) / (k * Math.log(1 + r / k)) : NaN, years };
}

/** Points of y = f(x) across a range, for the graph; gaps where it is not finite. */
export function plot(expr: string, from = -10, to = 10, n = 240): (readonly [number, number] | null)[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    const y = evaluate(expr, x);
    return isFinite(y) ? ([x, y] as const) : null;
  });
}
