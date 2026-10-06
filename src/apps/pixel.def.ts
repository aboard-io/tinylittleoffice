/**
 * Pixel art: a small grid of coloured squares. Also what a stitch pattern is.
 * Document format: a row of the grid per line, a letter per square ("."
 * for an empty one, a to h for the colours); empty ends are left off.
 */
import { defineApp, rect, text, MUTED, type AppDef, type Page } from '../kit/core.ts';

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
export interface Pixels {
  size: number;
  /** A stitch pattern: drawn with grid lines and a count of each colour. */
  pattern?: boolean;
}
const KINDS = new Map<string, Pixels>();
export const pixelsOf = (id: string) => KINDS.get(id)!;

export const parsePixels = (body: string, size: number): string[][] => Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => (INKS[body.split('\n')[y]?.[x]] ? body.split('\n')[y][x] : '.')));
export const serializePixels = (grid: string[][]) => grid.map((row) => row.join('').replace(/\.+$/, '')).join('\n').replace(/\n+$/, '');

function picture(body: string, k: Pixels): Page {
  const grid = parsePixels(body, k.size);
  const c = 480 / k.size;
  let svg = '';
  const count: Record<string, number> = {};
  grid.forEach((row, y) =>
    row.forEach((ink, x) => {
      if (ink === '.') return;
      count[ink] = (count[ink] ?? 0) + 1;
      // (A hair wider than its square, so no seams show between neighbours.)
      svg += rect(x * c, y * c, c + (k.pattern ? 0 : 0.5), c + (k.pattern ? 0 : 0.5), INKS[ink].hex);
    }),
  );
  if (!k.pattern) return { w: 480, h: 480, svg };
  // Lines to count by, heavier every fifth; and how many stitches of each colour.
  for (let i = 0; i <= k.size; i++) svg += `<path d="M${i * c} 0V480M0 ${i * c}H480" stroke="#a1a1aa" stroke-width="${i % 5 ? 0.5 : 1.5}"/>`;
  Object.keys(count).sort().forEach((ink, i) => (svg += rect(i * 118, 496, 16, 16, INKS[ink].hex) + text(i * 118 + 22, 509, `${INKS[ink].name} ${count[ink]}`, { px: 12, fill: MUTED })));
  return { w: 480, h: 524, svg };
}

export function definePixels(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'> & Partial<AppDef>, k: Pixels): AppDef {
  KINDS.set(app.id, k);
  return defineApp({
    group: 'Design',
    title: () => '',
    outline: (body) => [`${[...body].filter((ch) => INKS[ch]).length} squares filled`],
    view: (body) => [picture(body, k)],
    shortcuts: [
      { keys: 'Arrow keys', does: 'Move from square to square' },
      { keys: 'Enter or Space', does: 'Colour the square' },
    ],
    ...app,
  });
}

export default definePixels({ id: 'pixel', name: 'Pixel art', icon: 'pixel', blurb: 'A 16 by 16 pixel drawing, small enough to live in a link.' }, { size: 16 });
