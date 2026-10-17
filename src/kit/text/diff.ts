/**
 * What the second of two documents changed, block by block: the longest common subsequence of their
 * blocks (each written as TLO, so a block is the same block when it reads the same), then a walk back
 * through it. The head's fields count as blocks of their own ("title: Budget"). Pure, for the compare view,
 * the API and the command line.
 */
import { parse, writeBlock } from '../../doc/index.ts';

export type Change = { kind: ' ' | '-' | '+'; line: string };

/** The most cells the subsequence's table may hold (16 MB): past it the two lists are taken as replaced whole, rather than a version from anyone costing the memory of its length squared. */
const MOST = 4_000_000;

/**
 * Two lists of strings, compared: each kept (' '), taken out ('-') or put in ('+'), in the order they read. What the
 * two share at their start and end is kept first, so what one edit leaves to compare is small however long the lists.
 */
export function diffLines(x: string[], y: string[]): Change[] {
  let head = 0;
  while (head < x.length && head < y.length && x[head] === y[head]) head++;
  let tail = 0;
  while (tail < x.length - head && tail < y.length - head && x[x.length - 1 - tail] === y[y.length - 1 - tail]) tail++;
  const kept = (lines: string[]): Change[] => lines.map((line) => ({ kind: ' ', line }));
  return [...kept(x.slice(0, head)), ...between(x.slice(head, x.length - tail), y.slice(head, y.length - tail)), ...kept(x.slice(x.length - tail))];
}

/** The longest common subsequence of two lists that share nothing at either end, as the changes between them. */
function between(x: string[], y: string[]): Change[] {
  const n = x.length;
  const m = y.length;
  if (!n || !m || n * m > MOST) return [...x.map((line): Change => ({ kind: '-', line })), ...y.map((line): Change => ({ kind: '+', line }))];
  const L: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) (out.push({ kind: ' ', line: x[i++] }), j++);
    else if (i < n && (j >= m || L[i + 1][j] >= L[i][j + 1])) out.push({ kind: '-', line: x[i++] });
    else out.push({ kind: '+', line: y[j++] });
  }
  return out;
}

/** A document's text as the units compared: a line per head field, then each block as written. */
export function blocksOf(text: string): string[] {
  const doc = parse(text);
  return [...Object.entries(doc.head).map(([k, v]) => `${k}: ${v}`), ...doc.blocks.map((b) => writeBlock(b))];
}

/** Two documents' texts, compared block by block. */
export const diff = (a: string, b: string): Change[] => diffLines(blocksOf(a), blocksOf(b));

/** How many blocks the second took out and put in. */
export const tally = (changes: Change[]) => ({ removed: changes.filter((c) => c.kind === '-').length, added: changes.filter((c) => c.kind === '+').length });
