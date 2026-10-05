/**
 * Drawing document model.
 * Format: one shape per line:  kind,x,y,w,h,style,label
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * x,y as the start and w,h as the delta to the end. Style is the fill (0, 1
 * or 2), then optionally a colour letter and a text size digit: "1", "2b",
 * "0r3". Black and the normal text size are the defaults and are left out.
 */
export const W = 640;
export const H = 400;
export const GRID = 8;

export type Kind = 'r' | 'e' | 'd' | 'l' | 'a' | 't';
export type Fill = 0 | 1 | 2;
export type Color = 'r' | 'o' | 'g' | 'b' | 'p';
export type TextSize = 1 | 2 | 3 | 4;
export interface Shape {
  k: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  f: Fill;
  text: string;
  /** Colour of the outline and label; absent for the default ink. */
  c?: Color;
  /** Text size; absent for the normal size (2). */
  z?: TextSize;
}

export const COLORS: Record<Color, { name: string; hex: string }> = {
  r: { name: 'Red', hex: '#dc2626' },
  o: { name: 'Orange', hex: '#d97706' },
  g: { name: 'Green', hex: '#16a34a' },
  b: { name: 'Blue', hex: '#2563eb' },
  p: { name: 'Purple', hex: '#9333ea' },
};
export const TEXT_SIZES: Record<TextSize, { name: string; px: number }> = {
  1: { name: 'Small', px: 11 },
  2: { name: 'Normal', px: 14 },
  3: { name: 'Large', px: 20 },
  4: { name: 'Huge', px: 30 },
};

/** How a shape is painted, given the theme's ink, paper and grey. */
export function paint(s: Shape, ink: string, paper: string, shade: string) {
  const color = s.c ? COLORS[s.c].hex : ink;
  const closed = s.k === 'r' || s.k === 'e' || s.k === 'd';
  return {
    stroke: color,
    fill: s.f === 2 ? color : s.f === 1 ? (s.c ? color : shade) : paper,
    // A coloured "grey" fill is a tint of the colour.
    fillOpacity: s.f === 1 && s.c ? 0.16 : 1,
    text: s.f === 2 && closed ? paper : color,
    px: TEXT_SIZES[s.z ?? 2].px,
    marker: s.c ? `arrow-${s.c}` : 'arrow',
  };
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
    const style = /^([0-2])([a-z]?)([1-4]?)$/.exec(f);
    const shape: Shape = {
      k: k as Kind,
      x: (parseInt(x, 10) || 0) * GRID,
      y: (parseInt(y, 10) || 0) * GRID,
      w: (parseInt(w, 10) || 0) * GRID,
      h: (parseInt(h, 10) || 0) * GRID,
      f: (style ? parseInt(style[1], 10) : Math.min(2, Math.max(0, parseInt(f, 10) || 0))) as Fill,
      text: parts.slice(6).join(','),
    };
    if (style && style[2] in COLORS) shape.c = style[2] as Color;
    if (style && style[3] && style[3] !== '2') shape.z = parseInt(style[3], 10) as TextSize;
    out.push(shape);
  }
  return out;
}

export function serializeDrawing(shapes: Shape[]): string {
  const g = (n: number) => Math.round(n / GRID);
  return shapes
    .map((s) => {
      const base = `${s.k},${g(s.x)},${g(s.y)},${g(s.w)},${g(s.h)},${s.f}${s.c ?? ''}${s.z && s.z !== 2 ? s.z : ''}`;
      return s.text ? `${base},${s.text.replace(/\n/g, ' ')}` : base;
    })
    .join('\n');
}
