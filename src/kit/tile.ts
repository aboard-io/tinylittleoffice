/**
 * A repeating background tile: a small grid of coloured squares, written in one head field so any page app
 * (a drawing, a slide, a web page) can carry it and draw it behind its content. Made in Draw's pixel mode
 * ("Use as background"); read and drawn here, with no DOM.
 *
 *   tile: 8:a..a..a./.a..a..a/a..a..a./.a..a..a
 *
 * The side first (squares along each edge, 2 to 64), then the rows, "/" between them, a letter a square: a
 * to h for the inks, "." for one left clear (the page shows through). A row's trailing clear squares are
 * left off, and a trailing empty row too, so the field stays short.
 */
import { xml } from './draw.ts';

/** The inks a tile (and Draw's pixel mode) may use, by letter. Their names are the editor's (through t()). */
export const TILE_INKS: Record<string, string> = { a: '#18181b', b: '#4f46e5', c: '#dc2626', d: '#ea580c', e: '#facc15', f: '#16a34a', g: '#38bdf8', h: '#f472b6' };
/** The sides a grid may have. */
export const TILE_SIDES = [8, 16, 32, 64] as const;
export const TILE_MIN = 2;
export const TILE_MAX = 64;

export interface Tile {
  /** Squares along each edge. */
  n: number;
  /** n rows of n letters, "." for a clear square. */
  rows: string[];
}

/** The letter at a square, read leniently: an ink's letter, else clear. */
const letter = (ch: string | undefined) => (ch && ch in TILE_INKS ? ch : '.');

/** A tile with every square clear. */
export const blankTile = (n: number): Tile => ({ n, rows: Array.from({ length: n }, () => '.'.repeat(n)) });

/** Rows as written (any length, any letters) as a tile of side n, squared off. */
export const tileOf = (n: number, rows: string[]): Tile => ({ n, rows: Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => letter(rows[y]?.[x])).join('')) });

/** The field read: null for what is no tile. */
export function parseTile(ref: string): Tile | null {
  const m = /^\s*(\d+)\s*:\s*(.*)$/s.exec(ref);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < TILE_MIN || n > TILE_MAX) return null;
  return tileOf(n, m[2].trim().split('/'));
}

/** The rows as the field keeps them: trailing clear squares and empty rows left off. */
export function tileRows(t: Tile): string[] {
  const rows = t.rows.map((r) => r.replace(/\.+$/, ''));
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  return rows;
}
/** The tile as its field is written. */
export const tileRef = (t: Tile): string => `${t.n}:${tileRows(t).join('/')}`;
/** Whether any square is inked. */
export const tileFilled = (t: Tile): boolean => t.rows.some((r) => /[a-h]/.test(r));
/** How many squares are inked. */
export const tileCount = (t: Tile): number => t.rows.reduce((n, r) => n + (r.match(/[a-h]/g)?.length ?? 0), 0);

/** One tile's squares as SVG rects, `side` px square in all. A square is drawn a hair wide so no seams show. */
export function tileRects(t: Tile, side: number): string {
  const c = side / t.n;
  let out = '';
  t.rows.forEach((row, y) => {
    for (let x = 0; x < t.n; x++) {
      const ink = TILE_INKS[row[x]];
      if (ink) out += `<rect x="${r(x * c)}" y="${r(y * c)}" width="${r(c + 0.3)}" height="${r(c + 0.3)}" fill="${ink}"/>`;
    }
  });
  return out;
}
const r = (n: number) => String(Math.round(n * 1000) / 1000);

/** The tile as an SVG <pattern> for a page's <defs>: fill="url(#id)" repeats it every `side` px. */
export const tilePattern = (t: Tile, id = 'tile', side = 64): string => `<pattern id="${xml(id)}" width="${side}" height="${side}" patternUnits="userSpaceOnUse">${tileRects(t, side)}</pattern>`;

/** One tile as a complete SVG document, `side` px square (the file "Use as background" gives, and what the PNG is drawn from). */
export const tileSvg = (t: Tile, side = 64): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${side}" height="${side}" shape-rendering="crispEdges">${tileRects(t, side)}</svg>`;

/** The tile as a CSS background for an HTML page: a data URL, repeating every `side` px. */
export const tileCss = (t: Tile, side = 64): string => `url("data:image/svg+xml,${encodeURIComponent(tileSvg(t, side)).replace(/%20/g, ' ').replace(/%22/g, "'")}")`;
