/**
 * Drawing document model.
 * Format: one shape per line:  kind,x,y,w,h,fill,label
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * x,y as the start and w,h as the delta to the end.
 */
export const W = 640;
export const H = 400;
export const GRID = 8;

export type Kind = 'r' | 'e' | 'd' | 'l' | 'a' | 't';
export type Fill = 0 | 1 | 2;
export interface Shape {
  k: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  f: Fill;
  text: string;
}

const KINDS: Kind[] = ['r', 'e', 'd', 'l', 'a', 't'];

export function parseDrawing(text: string): Shape[] {
  if (!text) return [];
  const out: Shape[] = [];
  for (const line of text.split('\n')) {
    const parts = line.split(',');
    if (parts.length < 6) continue;
    const [k, x, y, w, h, f] = parts;
    if (!KINDS.includes(k as Kind)) continue;
    out.push({
      k: k as Kind,
      x: (parseInt(x, 10) || 0) * GRID,
      y: (parseInt(y, 10) || 0) * GRID,
      w: (parseInt(w, 10) || 0) * GRID,
      h: (parseInt(h, 10) || 0) * GRID,
      f: Math.min(2, Math.max(0, parseInt(f, 10) || 0)) as Fill,
      text: parts.slice(6).join(','),
    });
  }
  return out;
}

export function serializeDrawing(shapes: Shape[]): string {
  const g = (n: number) => Math.round(n / GRID);
  return shapes
    .map((s) => {
      const base = `${s.k},${g(s.x)},${g(s.y)},${g(s.w)},${g(s.h)},${s.f}`;
      return s.text ? `${base},${s.text.replace(/\n/g, ' ')}` : base;
    })
    .join('\n');
}
