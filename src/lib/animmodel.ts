/**
 * Motion document model: a drawing whose shapes move. Each shape may have
 * keyframes; between them its offset, depth, size and spin are interpolated
 * in straight lines. Time is counted in frames, `fps` frames to the second.
 *
 * Format, line by line:
 *   !<frames>[,<fps>]      length in frames (base 36), and 4, 8 or 12 a second
 *   <shape lines>          exactly as Draw writes them (lib/drawmodel.ts)
 *   @<shape>\t<keys>       keys for shape number <shape> (base 36, from 0)
 * Keys are separated by ";", each "<t>,<dx>,<dy>,<z>,<s>,<r>[,<fx>]" in
 * base 36: the frame, the offset in px from where the shape was drawn, its
 * depth in px (nearer when positive), its scale in tenths (a = 1), its spin in
 * degrees, and letters for effects (see EFFECTS). A Draw document on its own
 * is a motion document in which nothing moves yet.
 */
import { parseDrawing, ptsOf, ptsText, removeShape, serializeDrawing, type Shape } from './drawmodel.ts';

export const W = 640;
export const H = 400;
export const DEFAULT_FRAMES = 24;
export const MAX_FRAMES = 120;
export const FPS_CHOICES = [4, 8, 12];
const DEFAULT_FPS = 8;
/** How far a thing may come forward or go back, in px. */
export const MAX_Z = 200;

export const EFFECTS: { letter: string; name: string }[] = [
  { letter: 'i', name: 'Impact' },
  { letter: '3', name: '3D' },
  { letter: 'd', name: 'Shadow' },
  { letter: 'n', name: 'Neon' },
  { letter: 'o', name: 'Outline' },
  { letter: 'g', name: 'Rainbow' },
  { letter: 'm', name: 'Mirror' },
  { letter: 'w', name: 'Wobble' },
  { letter: 'b', name: 'Blur' },
];

export interface Key {
  /** Frame number. */
  t: number;
  /** Offset from where the shape was drawn, px. */
  dx: number;
  dy: number;
  /** Depth, px: positive is nearer (and so larger). */
  z: number;
  /** Scale, 1 = as drawn. */
  s: number;
  /** Spin, degrees. */
  r: number;
  /** Effect letters, any combination. */
  fx: string;
  /** For a pen shape: its corners at this key (hundredths of its box), tweened to the next key's when both have as many. */
  pts?: number[];
}

export interface Anim {
  frames: number;
  fps: number;
  shapes: Shape[];
  /** One list per shape, sorted by frame; empty when it stays put. */
  keys: Key[][];
}

/** A key that leaves the shape as it was drawn. */
export const restKey = (t: number): Key => ({ t, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '' });
const atRest = (k: Key) => !k.dx && !k.dy && !k.z && k.s === 1 && !k.r && !k.fx && !k.pts;

/** How much nearer things look larger: 1 + z / 400, so z = 200 is half as big again. */
export const depthScale = (z: number) => 1 + z / (2 * MAX_Z);

const b = (n: number) => Math.round(n).toString(36);
const sortKeys = (keys: Key[]) => keys.sort((p, q) => p.t - q.t);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const letters = (fx: string) => [...new Set(fx.replace(/[^3dnogmwbi]/g, ''))].join('');

export function parseAnim(text: string): Anim {
  const anim: Anim = { frames: DEFAULT_FRAMES, fps: DEFAULT_FPS, shapes: [], keys: [] };
  if (!text) return anim;
  const lines = text.split('\n');
  if (lines[0]?.startsWith('!')) {
    const [frames, fps] = lines.shift()!.slice(1).split(',');
    const n = parseInt(frames, 36);
    if (Number.isFinite(n)) anim.frames = clamp(n, 2, MAX_FRAMES);
    if (FPS_CHOICES.includes(parseInt(fps, 10))) anim.fps = parseInt(fps, 10);
  }
  anim.shapes = parseDrawing(lines.filter((l) => !l.startsWith('@')).join('\n'));
  anim.keys = anim.shapes.map(() => []);
  for (const line of lines.filter((l) => l.startsWith('@'))) {
    const tab = line.indexOf('\t');
    const i = parseInt(line.slice(1, tab), 36);
    if (tab < 0 || !anim.keys[i]) continue;
    for (const part of line.slice(tab + 1).split(';')) {
      const [t, dx, dy, z, s, r, fx = '', p = ''] = part.split(',');
      const n = (v: string | undefined, dflt: number) => (v !== undefined && Number.isFinite(parseInt(v, 36)) ? parseInt(v, 36) : dflt);
      if (!Number.isFinite(parseInt(t, 36))) continue;
      anim.keys[i] = anim.keys[i].filter((k) => k.t !== n(t, 0));
      const key: Key = { t: clamp(n(t, 0), 0, anim.frames - 1), dx: n(dx, 0), dy: n(dy, 0), z: clamp(n(z, 0), -MAX_Z, MAX_Z), s: Math.max(1, n(s, 10)) / 10, r: n(r, 0), fx: letters(fx) };
      if (p.startsWith('p')) key.pts = ptsOf(p.slice(1).replace(/\//g, ';'));
      anim.keys[i].push(key);
    }
    sortKeys(anim.keys[i]);
  }
  return anim;
}

export function serializeAnim(anim: Anim): string {
  const keyed = anim.keys.map((ks, i) => (ks.some((k) => !atRest(k)) ? [i, ks] as const : null)).filter((x): x is readonly [number, Key[]] => !!x);
  if (!anim.shapes.length && !keyed.length && anim.frames === DEFAULT_FRAMES && anim.fps === DEFAULT_FPS) return '';
  const head = `!${b(anim.frames)}${anim.fps !== DEFAULT_FPS ? `,${anim.fps}` : ''}`;
  const lines = [head, ...(anim.shapes.length ? [serializeDrawing(anim.shapes)] : [])];
  for (const [i, ks] of keyed) {
    const keys = sortKeys(ks.slice()).map((k) => `${b(k.t)},${b(k.dx)},${b(k.dy)},${b(k.z)},${b(k.s * 10)},${b(k.r)}${k.fx || k.pts ? `,${letters(k.fx)}` : ''}${k.pts ? `,p${ptsText(k.pts).replace(/;/g, '/')}` : ''}`);
    lines.push(`@${b(i)}\t${keys.join(';')}`);
  }
  return lines.join('\n');
}

/** Where shape `i` is at a (possibly fractional) frame. Effects hold from a key until the next. */
export function stateAt(anim: Anim, i: number, frame: number): Key {
  const keys = anim.keys[i] ?? [];
  if (!keys.length) return restKey(frame);
  if (frame <= keys[0].t) return { ...keys[0], t: frame };
  const last = keys[keys.length - 1];
  if (frame >= last.t) return { ...last, t: frame };
  let k = 0;
  while (keys[k + 1].t <= frame) k++;
  const p = keys[k];
  const q = keys[k + 1];
  const f = (frame - p.t) / (q.t - p.t);
  const mix = (m: number, n: number) => m + (n - m) * f;
  const out: Key = { t: frame, dx: mix(p.dx, q.dx), dy: mix(p.dy, q.dy), z: mix(p.z, q.z), s: mix(p.s, q.s), r: mix(p.r, q.r), fx: p.fx };
  // Corners morph when both keys have the same number of them; otherwise they hold.
  if (p.pts && q.pts && p.pts.length === q.pts.length) out.pts = p.pts.map((v, n) => mix(v, q.pts![n]));
  else if (p.pts) out.pts = p.pts;
  return out;
}

/** Set (or replace) shape `i`'s key at its frame, in the whole numbers the format keeps. */
export function withKey(anim: Anim, i: number, key: Key): Anim {
  const keys = anim.shapes.map((_, j) => anim.keys[j] ?? []);
  const k: Key = { t: Math.round(key.t), dx: Math.round(key.dx), dy: Math.round(key.dy), z: Math.round(key.z), s: Math.round(key.s * 10) / 10, r: Math.round(key.r), fx: letters(key.fx) };
  if (key.pts) k.pts = key.pts.map(Math.round);
  keys[i] = sortKeys([...keys[i].filter((q) => q.t !== k.t), k]);
  return { ...anim, keys };
}

export function removeKey(anim: Anim, i: number, t: number): Anim {
  return { ...anim, keys: anim.shapes.map((_, j) => (anim.keys[j] ?? []).filter((k) => j !== i || k.t !== t)) };
}

/**
 * The drawing redrawn: the keys follow their shapes. A shape edited in place
 * keeps its keys; a reordered one takes them along; a removed one's are
 * dropped. (The drawing is compared line by line, as Draw writes it.)
 */
export function withShapes(anim: Anim, shapes: Shape[]): Anim {
  const was = anim.shapes.map((s) => serializeDrawing([s]));
  const now = shapes.map((s) => serializeDrawing([s]));
  const keyOf = (j: number) => anim.keys[j] ?? [];
  let keys: Key[][] | null = null;
  if (now.length === was.length) {
    // A pure reorder (to the front, to the back): every line finds its old self.
    const free = was.map((_, j) => j);
    const from = now.map((line) => {
      const at = free.findIndex((j) => was[j] === line);
      return at < 0 ? -1 : free.splice(at, 1)[0];
    });
    if (from.every((j) => j >= 0)) keys = from.map(keyOf);
  } else if (now.length === was.length - 1) {
    // One taken out: which one, and the rest shift down.
    const gone = anim.shapes.findIndex((_, j) => serializeDrawing(removeShape(anim.shapes, j)) === serializeDrawing(shapes));
    if (gone >= 0) keys = anim.shapes.map((_, j) => j).filter((j) => j !== gone).map(keyOf);
  }
  return { ...anim, shapes, keys: shapes.map((_, j) => (keys ? keys[j] : keyOf(j)) ?? []) };
}

/** Does shape `i` have a key at this frame? */
export const hasKey = (anim: Anim, i: number, t: number) => !!anim.keys[i]?.some((k) => k.t === t);
