import { PALETTE } from './palette.ts';
/**
 * Drawing document model.
 * Format: one shape per line:  kind,x,y,w,h,style,label
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * x,y as the start and w,h as the delta to the end. Style is the fill (0, 1
 * or 2), then optionally a colour letter and a text size digit: "1", "2b",
 * "0r3". Black and the normal text size are the defaults and are left out.
 *
 * Kinds: r rectangle, o rounded box, e ellipse, d diamond, h hexagon,
 * p parallelogram, c cylinder, n note, t text, i icon (its label is the icon's
 * name), l line, a arrow, and two that
 * join shapes: k (arrow) and j (line). For those, x and y are not places but
 * the numbers of the two shapes joined, counting lines from 0, so the join
 * follows its shapes wherever they go.
 *
 * A label may start with an icon, ":rocket Launch", drawn before the words;
 * " | " in a label starts a second, smaller line.
 */
export const W = 640;
export const H = 400;
export const GRID = 8;

/** 'v' is any shape at all: its points, as hundredths of its box, drawn with the pen. */
export type Kind = 'r' | 'o' | 'e' | 'd' | 'h' | 'p' | 'c' | 'n' | 'i' | 'l' | 'a' | 't' | 'k' | 'j' | 'v';

/** A label's icon and its words: ":rocket Launch" is ['rocket', 'Launch']. */
export function iconOf(label: string): [string, string] {
  const m = /^:([a-z0-9-]+)(?:\s+|$)(.*)$/.exec(label);
  return m ? [m[1], m[2]] : ['', label];
}

/** Kinds that join two shapes rather than sit somewhere. */
export const isLink = (k: Kind) => k === 'k' || k === 'j';
/** Kinds drawn as a stroke with no inside. */
export const isLine = (k: Kind) => k === 'l' || k === 'a' || isLink(k);
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
  /** For 'v': the corners, x,y pairs as hundredths of the box, in order. */
  pts?: number[];
}

/** Points as the text keeps them: "12:0;100:50;0:100". */
export const ptsText = (pts: number[]) => Array.from({ length: Math.floor(pts.length / 2) }, (_, i) => `${Math.round(pts[2 * i])}:${Math.round(pts[2 * i + 1])}`).join(';');
export const ptsOf = (text: string): number[] => text.split(';').flatMap((p) => p.split(':').map((n) => +n)).filter((n) => isFinite(n));

export const COLORS: Record<Color, { name: string; hex: string }> = { r: PALETTE.r, o: PALETTE.o, g: PALETTE.g, b: PALETTE.b, p: PALETTE.p };
export const TEXT_SIZES: Record<TextSize, { name: string; px: number }> = {
  1: { name: 'Small', px: 11 },
  2: { name: 'Normal', px: 14 },
  3: { name: 'Large', px: 20 },
  4: { name: 'Huge', px: 30 },
};

/** How a shape is painted, given the theme's ink, paper and grey. */
export function paint(s: Shape, ink: string, paper: string, shade: string) {
  const color = s.c ? COLORS[s.c].hex : ink;
  const closed = !isLine(s.k) && s.k !== 't' && s.k !== 'i';
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

const KINDS: Kind[] = ['r', 'o', 'e', 'd', 'h', 'p', 'c', 'n', 'i', 'l', 'a', 't', 'k', 'j', 'v'];

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
      // (A join's x and y are shape numbers, not places.)
      x: (parseInt(x, 10) || 0) * (isLink(k as Kind) ? 1 : GRID),
      y: (parseInt(y, 10) || 0) * (isLink(k as Kind) ? 1 : GRID),
      w: (parseInt(w, 10) || 0) * GRID,
      h: (parseInt(h, 10) || 0) * GRID,
      f: (style ? parseInt(style[1], 10) : Math.min(2, Math.max(0, parseInt(f, 10) || 0))) as Fill,
      text: parts.slice(k === 'v' ? 7 : 6).join(','),
    };
    if (k === 'v') shape.pts = ptsOf(parts[6] ?? '');
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
      const base = `${s.k},${isLink(s.k) ? s.x : g(s.x)},${isLink(s.k) ? s.y : g(s.y)},${g(s.w)},${g(s.h)},${s.f}${s.c ?? ''}${s.z && s.z !== 2 ? s.z : ''}${s.k === 'v' ? ',' + ptsText(s.pts ?? []) : ''}`;
      return s.text ? `${base},${s.text.replace(/\n/g, ' ')}` : base;
    })
    .join('\n');
}

/** Where a join's line runs: from the edge of one shape's box to the edge of the other's. Null if either is missing. */
export function linkEnds(s: Shape, all: Shape[]): [number, number, number, number] | null {
  const a = all[s.x];
  const b = all[s.y];
  if (!a || !b || a === b || isLink(a.k) || isLink(b.k)) return null;
  const mid = (q: Shape): [number, number] => [q.x + q.w / 2, q.y + q.h / 2];
  const [ax, ay] = mid(a);
  const [bx, by] = mid(b);
  // Walk from a box's centre toward the other centre until its edge.
  const edge = (q: Shape, cx: number, cy: number, tx: number, ty: number): [number, number] => {
    const dx = tx - cx;
    const dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const k = Math.min(dx ? (Math.abs(q.w) / 2 + 3) / Math.abs(dx) : Infinity, dy ? (Math.abs(q.h) / 2 + 3) / Math.abs(dy) : Infinity, 1);
    return [cx + dx * k, cy + dy * k];
  };
  return [...edge(a, ax, ay, bx, by), ...edge(b, bx, by, ax, ay)];
}

/** Take a shape out, along with any joins to it; the joins that remain keep pointing at the right shapes. */
export function removeShape(shapes: Shape[], i: number): Shape[] {
  return renumber(shapes, shapes.map((_, j) => j).filter((j) => j !== i));
}

/** Bring a shape to the front or send it to the back. Returns the shapes and where it ended up. */
export function restack(shapes: Shape[], i: number, toFront: boolean): { shapes: Shape[]; at: number } {
  const others = shapes.map((_, j) => j).filter((j) => j !== i);
  const order = toFront ? [...others, i] : [i, ...others];
  return { shapes: renumber(shapes, order), at: toFront ? order.length - 1 : 0 };
}

/** The shapes in a new order (old numbers, possibly fewer), with joins following. */
function renumber(shapes: Shape[], order: number[]): Shape[] {
  const now = new Map(order.map((old, at) => [old, at]));
  return order.flatMap((old) => {
    const s = shapes[old];
    if (!isLink(s.k)) return [s];
    const [x, y] = [now.get(s.x), now.get(s.y)];
    return x === undefined || y === undefined ? [] : [{ ...s, x, y }];
  });
}
