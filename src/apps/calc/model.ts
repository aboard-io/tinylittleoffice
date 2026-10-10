/**
 * The calculator's document and its arithmetic, with no DOM. The document is a tape: one paragraph, an
 * expression a line ("a = 12" keeps its answer by name for the lines after; "ans" is the line before), and
 * `mode: graph` in the head when the lines are curves y = f(x) to draw. Everything else a person or a model
 * writes loosely (results after the expressions, "y = …", a list, a money mode's inputs) is read too, and
 * `tidy` is the one edit that makes it a tape.
 *
 * Expressions are parsed by hand, never run as code: numbers, + - × ÷ ^ %, parentheses, the functions a
 * scientific calculator has, π and e, and x for graphing. What the hand parser does not read (units and
 * conversions, numbers past a double, a little algebra) goes to a second engine, math.ts, a chunk the editor
 * fetches: `setEngine`. Ported from the old tree's lib/calc.ts (the money modes are Sheet templates now).
 */
import { isAtomic, writeInline, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';

export type Mode = 'calc' | 'graph';

const FN: Record<string, (a: number, b?: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: (a, b = a) => Math.min(a, b), max: (a, b = a) => Math.max(a, b), pow: (a, b = 2) => Math.pow(a, b),
  fact: (n) => (n < 0 || n > 170 || n % 1 ? NaN : Array.from({ length: n }, (_, i) => i + 1).reduce((p, k) => p * k, 1)),
};
const CONST: Record<string, number> = { pi: Math.PI, π: Math.PI, e: Math.E, tau: 2 * Math.PI };

/** The keys' signs as the parsers read them. */
const plainSigns = (s: string) => s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

/**
 * An expression worked out; NaN when it does not parse. `x` may be given, and `names` the values of names
 * from earlier lines of the tape. sin takes radians, as the keys say.
 */
export function evaluate(src: string, x = NaN, names: Record<string, number> = {}): number {
  const s = plainSigns(src.replace(/\s+/g, ''));
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
    // A sign binds looser than a power: -2^2 is -4, as on paper; 2^-1 is a half.
    if (c === '-') return (at++, -power());
    if (c === '+') return (at++, power());
    const m = /^(\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?%?/i.exec(s.slice(at));
    if (m) {
      at += m[0].length;
      return m[0].endsWith('%') ? parseFloat(m[0]) / 100 : parseFloat(m[0]);
    }
    const w = /^[a-zπ_][a-z0-9_]*/i.exec(s.slice(at));
    if (!w) return fail();
    at += w[0].length;
    const name = w[0].toLowerCase();
    if (name in names) return names[name];
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
  const power = (): number => {
    const base = postfix();
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

/**
 * The second engine: given the expression and the values the lines before kept, the value (for the lines
 * after), its text, and the number it is (NaN when it is not one).
 */
export type Engine = (src: string, scope: Record<string, unknown>) => { value: unknown; text: string; number: number };
let engine: Engine | null = null;
export const setEngine = (e: Engine | null) => void (engine = e);
export const hasEngine = () => engine !== null;

/** What a line comes to. */
export interface Result {
  number: number;
  text: string;
  value: unknown;
}
const numbersIn = (scope: Record<string, unknown>) => Object.fromEntries(Object.entries(scope).filter(([, v]) => typeof v === 'number')) as Record<string, number>;

/** The hand parser's number where it reads the line, else the engine's answer, else nothing. */
export function result(src: string, scope: Record<string, unknown> = {}, x = NaN): Result {
  const n = evaluate(src, x, numbersIn(scope));
  if (isFinite(n) || !engine) return { number: n, text: shown(n), value: n };
  try {
    return engine(plainSigns(src), scope);
  } catch {
    return { number: NaN, text: '', value: NaN };
  }
}

/** A line that keeps its answer: "unit price = 2.5" is kept as unit_price. */
const NAMED = /^\s*([a-zπ_][a-z0-9_ ]*?)\s*=\s*(.+?)\s*$/i;
/** The name a line keeps its answer under, or ''. A function's or a constant's name is never taken. */
const nameOf = (line: string): string => {
  const m = NAMED.exec(line);
  const name = m ? m[1].trim().toLowerCase().replace(/\s+/g, '_') : '';
  return name && !(name in FN) && !(name in CONST) && name !== 'ans' && name !== 'x' ? name : '';
};

/**
 * The tape worked out line by line, as the little program it is: a line "name = expression" keeps its
 * result under that name for the lines after it, and "ans" is always the line before. Each line's result (as
 * a number, and as its text), and what the names hold after the last.
 */
export function tape(lines: string[]): { results: number[]; texts: string[]; names: Record<string, number>; scope: Record<string, unknown> } {
  const scope: Record<string, unknown> = {};
  const texts: string[] = [];
  const results = lines.map((l) => {
    const m = NAMED.exec(l);
    const r = result(m ? m[2] : l, scope);
    const ok = isFinite(r.number) || r.text !== '';
    const name = nameOf(l);
    if (name && ok) scope[name] = r.value;
    if (ok) scope.ans = r.value;
    texts.push(r.text);
    return r.number;
  });
  return { results, texts, names: numbersIn(scope), scope };
}

/**
 * A line of words with no sum in it is a note on the tape, written as a sentence: it has no answer, it ends
 * in a full stop, a colon or an exclamation mark, and it has two words or more ("Check every dose with a
 * pharmacist."). Nothing marks it but the writing; a line that is neither (a typo, "3 inch to cmm") is a
 * line with no answer, shown as one.
 */
export const isNote = (line: string, answer: string): boolean => !answer && /[.:!]$/.test(line) && (line.match(/\p{L}{2,}/gu) ?? []).length >= 2;

/** What the line being typed comes to, after the tape: the words before "=" in "a = …" are its name, not the sum. */
export function live(entry: string, lines: string[], mode: Mode): string {
  if (!entry.trim()) return '';
  if (mode === 'graph') return result(entry, {}, 1).text;
  const m = NAMED.exec(entry);
  return result(m && nameOf(entry) ? m[2] : entry, tape(lines).scope).text;
}

/** A number as a calculator shows it: up to 10 significant digits, no trailing noise, a real minus sign. */
export function shown(v: number): string {
  if (!isFinite(v)) return isNaN(v) ? '' : v > 0 ? '∞' : '−∞';
  const a = Math.abs(v);
  const s = a >= 1e12 || (a < 1e-6 && a > 0) ? v.toExponential(6).replace(/\.?0+e/, 'e') : String(+v.toPrecision(10));
  return s.replace(/^-/, '−');
}

/** Points of y = f(x) across a range, for the graph; gaps where it is not finite. */
export function plot(expr: string, from = -10, to = 10, n = 240): (readonly [number, number] | null)[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    const y = evaluate(expr, x);
    return isFinite(y) ? ([x, y] as const) : null;
  });
}

/** A graph's first line may set the range: "x from -10 to 10". */
export const RANGE = /^x\s+from\s+(-?[\d.]+)\s+to\s+(-?[\d.]+)\s*$/i;
/** The curves of a graph, and the range they are drawn across. */
export function curves(lines: string[]): { from: number; to: number; exprs: string[] } {
  const m = RANGE.exec(lines[0] ?? '');
  const [from, to] = m && +m[1] < +m[2] ? [+m[1], +m[2]] : [-10, 10];
  return { from, to, exprs: lines.filter((l) => !RANGE.test(l)) };
}

/* ---------- the document ---------- */

export interface CalcView {
  mode: Mode;
  /** The tape, a line each, as written. */
  lines: string[];
  /** The tape's paragraph: its block, -1 while there is none. */
  at: number;
  /** The document holds more, or other, than a tape: `tidy` makes it one. */
  loose: boolean;
}

/** A run's words as typed: marks a loose text read as Markdown ("2*3*4" read as italics) are the signs they were. */
const typed = (r: Run): string => (isAtomic(r) ? '' : r.b || r.i || r.u || r.s || r.h || r.href ? writeInline([r]) : r.t);
const linesOf = (runs: Run[]): string[] =>
  runs
    .map(typed)
    .join('')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** A tape's paragraph: the lines as plain words, a line each. */
export const tapeBlock = (lines: string[]): Block => ({ k: 'p', runs: [{ t: lines.join('\n') }] });

/** Whether the blocks are already the tape of these lines (or nothing, for no lines). */
function isTape(blocks: Block[], lines: string[]): boolean {
  if (!lines.length) return !blocks.length;
  const b = blocks[0];
  return blocks.length === 1 && b.k === 'p' && !b.a && b.runs.length === 1 && typed(b.runs[0]) === b.runs[0].t && b.runs[0].t === lines.join('\n');
}

/**
 * What a document says, read as leniently as it is written: every line of words, in order; the mode from
 * the head, or "graph" when every line is a "y = …"; in a graph the "y =" goes, on the tape a result written
 * after an expression ("2+2 = 4") goes, while "a = 12" stays (it keeps a name).
 */
function loosely(doc: Doc): { mode: Mode; lines: string[]; title?: string } {
  const all = doc.blocks.flatMap((b) => (b.k === 'p' || b.k === 'li' || b.k === 'quote' ? linesOf(b.runs) : []));
  const heading = doc.blocks.find((b) => b.k === 'h');
  const mode: Mode = doc.head.mode === 'graph' || (!doc.head.mode && all.length > 0 && all.every((l) => /^y\s*=/i.test(l))) ? 'graph' : 'calc';
  const lines = all
    .map((l) => {
      if (mode === 'graph') return l.replace(/^y\s*=\s*/i, '');
      const m = /^(.+?)\s*=\s*([^=]*)$/.exec(l);
      return m && !nameOf(l) ? m[1] : l;
    })
    .filter(Boolean);
  const title = !doc.head.title && heading && 'runs' in heading ? linesOf(heading.runs).join(' ') : undefined;
  return { mode, lines, title };
}

export function readCalc(doc: Doc): CalcView {
  const { mode, lines } = loosely(doc);
  const at = doc.blocks.length === 1 && doc.blocks[0].k === 'p' ? 0 : -1;
  return { mode, lines, at: isTape(doc.blocks, lines) ? at : -1, loose: tidy(doc).length > 0 };
}

/** The one edit that makes a loosely written document a tape: its lines in one paragraph, the mode in the head. */
export function tidy(doc: Doc): Op[] {
  const { mode, lines, title } = loosely(doc);
  const ops: Op[] = [];
  const want = mode === 'graph' ? 'graph' : undefined;
  if (doc.head.mode !== want) ops.push({ op: 'head', key: 'mode', value: want });
  if (title) ops.push({ op: 'head', key: 'title', value: title });
  if (!isTape(doc.blocks, lines)) ops.push({ op: 'splice', at: 0, n: doc.blocks.length, blocks: lines.length ? [tapeBlock(lines)] : [] });
  return ops;
}

/* ---------- the commands: each the operations it is ---------- */

/** One line as the tape holds it: no line break inside. */
const clean = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();
/** Where line i starts in the tape's words, and where it ends. */
function span(v: CalcView, i: number): [number, number] {
  let from = 0;
  for (let k = 0; k < i; k++) from += v.lines[k].length + 1;
  return [from, from + v.lines[i].length];
}

/** A line put at the end of the tape (on a graph, a curve not already drawn). */
export function addLine(v: CalcView, s: string): Op[] {
  const line = clean(s);
  if (!line || (v.mode === 'graph' && v.lines.includes(line))) return [];
  if (v.at < 0) return [{ op: 'splice', at: 0, n: 0, blocks: [tapeBlock([line])] }];
  const end = span(v, v.lines.length - 1)[1];
  return [{ op: 'text', at: v.at, from: end, to: end, runs: [{ t: '\n' + line }] }];
}

/** Line i changed where it stands (the lines after it follow); emptied, it goes. */
export function setLine(v: CalcView, i: number, s: string): Op[] {
  const line = clean(s);
  if (!line) return removeLine(v, i);
  if (v.at < 0 || line === v.lines[i]) return [];
  const [from, to] = span(v, i);
  return [{ op: 'text', at: v.at, from, to, runs: [{ t: line }] }];
}

/** Line i taken away, with its line break; the last line taken, the tape goes. */
export function removeLine(v: CalcView, i: number): Op[] {
  if (v.at < 0 || !v.lines[i]) return [];
  if (v.lines.length === 1) return clearTape(v);
  const [from, to] = span(v, i);
  return [i < v.lines.length - 1 ? { op: 'text', at: v.at, from, to: to + 1, runs: [] } : { op: 'text', at: v.at, from: from - 1, to, runs: [] }];
}

/** The whole tape taken away. */
export const clearTape = (v: CalcView): Op[] => (v.at < 0 ? [] : [{ op: 'splice', at: v.at, n: 1, blocks: [] }]);

/** The other mode: its lines mean something else there, so the tape starts again (one undo brings it back). */
export const setMode = (v: CalcView, mode: Mode): Op[] => (mode === v.mode ? [] : [{ op: 'head', key: 'mode', value: mode === 'graph' ? 'graph' : undefined }, ...clearTape(v)]);

/**
 * Lines [from, to) given way to `put` (each cleaned, the empty ones dropped): one op over the tape's words, so a
 * run of lines moved, copied in, pasted or taken away is one step to undo. Every all-lines command is this.
 */
export function replaceLines(v: CalcView, from: number, to: number, put: string[]): Op[] {
  const add = put.map(clean).filter(Boolean);
  const n = v.lines.length;
  from = Math.max(0, Math.min(from, n));
  to = Math.max(from, Math.min(to, n));
  if (v.at < 0 || !n) return add.length ? [{ op: 'splice', at: 0, n: v.at < 0 ? 0 : 1, blocks: [tapeBlock(add)] }] : [];
  if (from === 0 && to === n && !add.length) return clearTape(v);
  const words = add.join('\n');
  if (from === to) {
    if (!add.length) return [];
    if (from < n) {
      const at = span(v, from)[0];
      return [{ op: 'text', at: v.at, from: at, to: at, runs: [{ t: words + '\n' }] }];
    }
    const end = span(v, n - 1)[1];
    return [{ op: 'text', at: v.at, from: end, to: end, runs: [{ t: '\n' + words }] }];
  }
  let a = span(v, from)[0];
  let b = span(v, to - 1)[1];
  if (!add.length) {
    if (to < n) b += 1;
    else a -= 1;
  }
  return [{ op: 'text', at: v.at, from: a, to: b, runs: add.length ? [{ t: words }] : [] }];
}

/** The tape in a new order: only the lines between the first and the last that moved are written. */
function reorder(v: CalcView, next: string[]): Op[] {
  let lo = 0;
  while (lo < next.length && next[lo] === v.lines[lo]) lo++;
  if (lo === next.length) return [];
  let hi = next.length;
  while (hi > lo && next[hi - 1] === v.lines[hi - 1]) hi--;
  return replaceLines(v, lo, hi, next.slice(lo, hi));
}

/** Lines [from, to) moved one past their neighbour (by -1 up, 1 down); nothing at the ends. */
export function moveLines(v: CalcView, from: number, to: number, by: 1 | -1): Op[] {
  if (from < 0 || to > v.lines.length || from >= to || (by < 0 && from === 0) || (by > 0 && to >= v.lines.length)) return [];
  const ls = [...v.lines];
  const run = ls.splice(from, to - from);
  ls.splice(from + by, 0, ...run);
  return reorder(v, ls);
}

/** Line i carried to just after line `after` (a drag by its grip). */
export function dropLine(v: CalcView, i: number, after: number): Op[] {
  if (!v.lines[i] || after < -1 || after >= v.lines.length || after === i) return [];
  const ls = [...v.lines];
  const [line] = ls.splice(i, 1);
  ls.splice(after < i ? after + 1 : after, 0, line);
  return reorder(v, ls);
}

/** Pasted blocks read as tape lines, the way a document is read (a result after a sum goes; on a graph, "y =" goes). */
export const pastedLines = (blocks: Block[], mode: Mode): string[] => loosely({ head: { mode }, blocks }).lines;
