/** Word search: your words hidden in a grid of letters, to print. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { h1, rest, seed } from '../lib/diagram.ts';
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

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Word', is: '{Word}' },
  ] as LineKind[],
  hint: '"# Title", then a word per line (up to 14 letters each). The puzzle is the same every time for the same words.',
  example: '# Coffee\nespresso\nfilter\ncrema\nroast\ngrinder\nkettle\nmilk\nbeans\ncup',
  sheets: (body: string) => {
    const { grid, placed } = hide(rest(body), seed(body));
    const c = 44;
    let svg = text(N * c / 2, 44, h1(body) || 'Word search', { px: 34, bold: true, anchor: 'middle' }) + rect(0, 70, N * c, N * c, 'none', `stroke="${LINE}" stroke-width="2"`);
    grid.forEach((row, y) => row.forEach((l, x) => (svg += text(x * c + c / 2, 70 + y * c + c / 2 + 8, l, { px: 22, anchor: 'middle' }))));
    placed.forEach((w, i) => (svg += text((i % 4) * (N * c / 4) + 8, 70 + N * c + 40 + Math.floor(i / 4) * 28, w, { px: 17, fill: MUTED })));
    return [onLetter({ w: N * c, h: 70 + N * c + 50 + Math.ceil(placed.length / 4) * 28, svg }, 72)];
  },
};

export default definePrint({ id: 'wordsearch', under: undefined, group: 'Play', name: 'Word search', icon: 'wordsearch', blurb: 'A word search puzzle from your own words, ready to print.' }, spec);
