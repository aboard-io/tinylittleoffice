/**
 * What the second of two documents changed, block by block: the longest common subsequence of their
 * blocks (each written as TLO, so a block is the same block when it reads the same), then a walk back
 * through it. The head's fields count as blocks of their own ("title: Budget"). Ported from the old tree's
 * lib/diff.ts, which did it line by line; pure, for the compare view, the API and the command line.
 */
import { parse, writeBlock } from '../doc/index.ts';

export type Change = { kind: ' ' | '-' | '+'; line: string };

/** Two lists of strings, compared: each kept (' '), taken out ('-') or put in ('+'), in the order they read. */
export function diffLines(x: string[], y: string[]): Change[] {
  const n = x.length;
  const m = y.length;
  const L: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) out.push({ kind: ' ', line: x[i++] }), j++;
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
