/** Word search: your words hidden in a grid of letters, to print. */
import { readLines, writeLines, type Kind as LineKind, type Row } from '../lib/lines.ts';
import { parse as parseTlo, plain } from '../lib/tlo.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { seed } from '../lib/diagram.ts';
import { text, rect, LINE, MUTED } from '../kit/core.ts';

const N = 14;
/** The grid: each word laid across, down or diagonally where it fits, the gaps filled with letters. The same words always give the same puzzle. */
export function hide(words: string[], from: number): { grid: string[][]; placed: string[] } {
  let s = from || 1;
  const rnd = (n: number) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0), s % n);
  const grid = Array.from({ length: N }, () => Array<string>(N).fill(''));
  const placed: string[] = [];
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    const w = word.toUpperCase().replace(/[^A-Z]/g, '');
    for (let tries = 0; w.length > 1 && w.length <= N && tries < 200; tries++) {
      const [dx, dy] = [[1, 0], [0, 1], [1, 1], [1, -1]][rnd(4)];
      const [x, y] = [rnd(N), rnd(N)];
      const cells = [...w].map((c, i) => [x + dx * i, y + dy * i, c] as const);
      if (!cells.every(([cx, cy, c]) => grid[cy]?.[cx] !== undefined && (grid[cy][cx] === '' || grid[cy][cx] === c))) continue;
      for (const [cx, cy, c] of cells) grid[cy][cx] = c;
      placed.push(word);
      break;
    }
  }
  return { grid: grid.map((row) => row.map((c) => c || String.fromCharCode(65 + rnd(26)))), placed };
}

const FORM: LineKind[] = [
  { name: 'Title', is: '# {Title}', once: true },
  { name: 'Word', is: '- {Word}' },
];

/** "# Title", then the words as a list. */
function puzzle(body: string): { title: string; words: string[] } {
  const rows = readLines(body, FORM);
  return { title: rows.find((r) => r.kind === 0)?.values[0] ?? '', words: rows.filter((r) => r.kind === 1).map((r) => plain(r.values[0])) };
}

/** Words written any way (a line each, or with commas between; a list; a table's first column) as the list. */
export function readWordsearch(md: string): string {
  const rows: Row[] = [];
  const words = (s: string) => s.split(',').forEach((w) => w.trim() && rows.push({ kind: 1, values: [w.trim()], depth: 0 }));
  for (const b of parseTlo(md).blocks) {
    if (b.k === 'h' && !rows.some((r) => r.kind === 0)) rows.unshift({ kind: 0, values: [b.text], depth: 0 });
    else if (b.k === 'p' || b.k === 'li') b.text.split('\n').forEach(words);
    else if (b.k === 'table') b.rows.forEach((r) => words(r[0]));
  }
  return writeLines(rows, FORM);
}

export const spec = {
  form: FORM,
  hint: '"# Title", then the words as a list, "- word" (up to 14 letters each). The puzzle is the same every time for the same words.',
  example: '# Coffee\n\n- espresso\n- filter\n- crema\n- roast\n- grinder\n- kettle\n- milk\n- beans\n- cup',
  sheets: (body: string) => {
    const { title, words } = puzzle(body);
    const { grid, placed } = hide(words, seed(body));
    const c = 44;
    let svg = text((N * c) / 2, 44, title || 'Word search', { px: 34, bold: true, anchor: 'middle' }) + rect(0, 70, N * c, N * c, 'none', `stroke="${LINE}" stroke-width="2"`);
    grid.forEach((row, y) => row.forEach((l, x) => (svg += text(x * c + c / 2, 70 + y * c + c / 2 + 8, l, { px: 22, anchor: 'middle' }))));
    placed.forEach((w, i) => (svg += text((i % 4) * ((N * c) / 4) + 8, 70 + N * c + 40 + Math.floor(i / 4) * 28, w, { px: 17, fill: MUTED })));
    return [onLetter({ w: N * c, h: 70 + N * c + 50 + Math.ceil(placed.length / 4) * 28, svg }, 72)];
  },
};

export default definePrint(
  {
    id: 'wordsearch',
    under: undefined,
    group: 'Play',
    name: 'Word search',
    icon: 'wordsearch',
    blurb: 'A word search puzzle from your own words, ready to print.',
    title: (body) => puzzle(body).title,
    outline: (body) => puzzle(body).words.slice(0, 14),
    read: readWordsearch,
  },
  spec,
);
