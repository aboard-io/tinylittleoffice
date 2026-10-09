/**
 * Pixel art: a small grid of coloured squares.
 * Document format (TLO): one paragraph, a line per row of the grid, a letter
 * per square ("." for an empty one, a to h for the colours). Empty ends are
 * left off, and an empty row is a lone ".", so the paragraph stays whole.
 */
import { defineApp, rect, type Page } from '../kit/core.ts';
import { parse } from '../lib/tlo.ts';

export const INKS: Record<string, { name: string; hex: string }> = {
  a: { name: 'Black', hex: '#18181b' },
  b: { name: 'Indigo', hex: '#4f46e5' },
  c: { name: 'Red', hex: '#dc2626' },
  d: { name: 'Orange', hex: '#ea580c' },
  e: { name: 'Yellow', hex: '#facc15' },
  f: { name: 'Green', hex: '#16a34a' },
  g: { name: 'Sky', hex: '#38bdf8' },
  h: { name: 'Pink', hex: '#f472b6' },
};
/** Squares along each side. */
export const SIZE = 16;

/**
 * The grid, read leniently: the lines of the text, or of the fence it was
 * handed over in. A blank line is an empty row, and anything but a colour's
 * letter is an empty square.
 */
export function parsePixels(body: string): string[][] {
  const fence = parse(body).blocks.find((b) => b.k === 'fence');
  const lines = (fence?.k === 'fence' ? fence.body : body).split('\n');
  return Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => (INKS[lines[y]?.trim()[x]] ? lines[y].trim()[x] : '.')));
}
export function serializePixels(grid: string[][]): string {
  const rows = grid.map((row) => row.join('').replace(/\.+$/, ''));
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  return rows.map((row) => row || '.').join('\n');
}

function picture(body: string): Page {
  const c = 480 / SIZE;
  let svg = '';
  parsePixels(body).forEach((row, y) =>
    row.forEach((ink, x) => {
      // (A hair wider than its square, so no seams show between neighbours.)
      if (ink !== '.') svg += rect(x * c, y * c, c + 0.5, c + 0.5, INKS[ink].hex);
    }),
  );
  return { w: 480, h: 480, svg };
}

export default defineApp({
  id: 'pixel',
  group: 'Design',
  name: 'Pixel art',
  icon: 'pixel',
  blurb: 'A 16 by 16 pixel drawing, small enough to live in a link.',
  title: () => '',
  outline: (body) => [`${[...body].filter((ch) => INKS[ch]).length} squares filled`],
  view: (body) => [picture(body)],
  read: (text) => serializePixels(parsePixels(text)),
  shortcuts: [
    { keys: 'Arrow keys', does: 'Move from square to square' },
    { keys: 'Enter or Space', does: 'Colour the square' },
  ],
});
