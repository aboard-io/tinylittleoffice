/** A line-by-line diff of two documents: what the second changed. Longest common subsequence, then a walk back through it. */
export type Change = { kind: ' ' | '-' | '+'; line: string };

export function diff(a: string, b: string): Change[] {
  const x = a.split('\n');
  const y = b.split('\n');
  const n = x.length;
  const m = y.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
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
