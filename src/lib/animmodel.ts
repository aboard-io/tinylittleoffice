/**
 * Motion document model: a drawing whose shapes move. Each shape may have
 * keyframes; between them its offset, depth, size and spin are interpolated
 * in straight lines. Time is counted in frames, `fps` frames to the second.
 *
 * The text is TLO (lib/tlo.ts): the length and the speed in the header, the
 * shapes as Draw writes them (lib/drawmodel.ts), and a table of the shapes
 * that move:
 *
 *   ---
 *   frames: 24
 *   fps: 8
 *   ---
 *   Kind | X | Y | W | H | Style | Label
 *   --- | --- | --- | --- | --- | --- | ---
 *   i | 8 | 36 | 8 | 8 | 0b | rocket
 *
 *   Shape | Keys
 *   --- | ---
 *   0 | 0,0,0,0,1,0; 23,200,-200,100,1,-30,d
 *
 * A shape is its row's number in the shapes table, from 0. Keys are
 * separated by ";", each "<t>,<dx>,<dy>,<z>,<s>,<r>[,<fx>[,p<corners>]]":
 * the frame, the offset in px from where the shape was drawn, its depth in
 * px (nearer when positive), its scale (1 = as drawn), its spin in degrees,
 * letters for effects (see EFFECTS), and for a pen shape its corners
 * ("p0:0/100:50/0:100"). A Draw document on its own is a motion document in
 * which nothing moves yet; its alt text is the header's "alt" here too.
 */
import { parse, write, type Block, type Head } from './tlo.ts';
import { ptsOf, ptsText, removeShape, shapesBlock, shapesTable, tableShapes, type Shape } from './drawmodel.ts';

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
  /** What it shows, in words (see altOf in drawmodel). */
  alt?: string;
}

/** A key that leaves the shape as it was drawn. */
export const restKey = (t: number): Key => ({ t, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '' });
const atRest = (k: Key) => !k.dx && !k.dy && !k.z && k.s === 1 && !k.r && !k.fx && !k.pts;

/** How much nearer things look larger: 1 + z / 400, so z = 200 is half as big again. */
export const depthScale = (z: number) => 1 + z / (2 * MAX_Z);

const sortKeys = (keys: Key[]) => keys.sort((p, q) => p.t - q.t);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const letters = (fx: string) => [...new Set(fx.replace(/[^3dnogmwbi]/g, ''))].join('');

export function parseAnim(text: string): Anim {
  const anim: Anim = { frames: DEFAULT_FRAMES, fps: DEFAULT_FPS, shapes: [], keys: [] };
  if (!text) return anim;
  const { head, blocks } = parse(text);
  const frames = parseInt(head.frames, 10);
  if (Number.isFinite(frames)) anim.frames = clamp(frames, 2, MAX_FRAMES);
  if (FPS_CHOICES.includes(parseInt(head.fps, 10))) anim.fps = parseInt(head.fps, 10);
  if (head.alt) anim.alt = head.alt;
  anim.shapes = tableShapes(shapesBlock(blocks));
  anim.keys = anim.shapes.map(() => []);
  const table = blocks.find((b) => b.k === 'table' && b.head.some((h) => /^keys$/i.test(h.trim()))) as Extract<Block, { k: 'table' }> | undefined;
  const [which, what] = ['shape', 'keys'].map((c) => table?.head.findIndex((h) => h.trim().toLowerCase() === c) ?? -1);
  for (const row of table?.rows ?? []) {
    const i = parseInt(row[which], 10);
    if (!anim.keys[i]) continue;
    for (const part of (row[what] ?? '').split(';')) {
      const [t, dx, dy, z, s, r, fx = '', p = ''] = part.split(',').map((v) => v.trim());
      const n = (v: string | undefined, dflt: number) => (v !== undefined && Number.isFinite(parseFloat(v)) ? parseFloat(v) : dflt);
      if (!Number.isFinite(parseInt(t, 10))) continue;
      const at = clamp(Math.round(n(t, 0)), 0, anim.frames - 1);
      anim.keys[i] = anim.keys[i].filter((k) => k.t !== at);
      const key: Key = { t: at, dx: Math.round(n(dx, 0)), dy: Math.round(n(dy, 0)), z: clamp(Math.round(n(z, 0)), -MAX_Z, MAX_Z), s: Math.max(0.1, Math.round(n(s, 1) * 10) / 10), r: Math.round(n(r, 0)), fx: letters(fx) };
      if (p.startsWith('p')) key.pts = ptsOf(p.slice(1).replace(/\//g, ';'));
      anim.keys[i].push(key);
    }
    sortKeys(anim.keys[i]);
  }
  return anim;
}

export function serializeAnim(anim: Anim): string {
  const keyed = anim.keys.map((ks, i) => (ks.some((k) => !atRest(k)) ? ([i, ks] as const) : null)).filter((x): x is readonly [number, Key[]] => !!x);
  if (!anim.shapes.length && !keyed.length && !anim.alt && anim.frames === DEFAULT_FRAMES && anim.fps === DEFAULT_FPS) return '';
  const head: Head = { frames: String(anim.frames), fps: String(anim.fps), ...(anim.alt ? { alt: anim.alt } : {}) };
  const keys = (ks: Key[]) => sortKeys(ks.slice()).map((k) => `${k.t},${k.dx},${k.dy},${k.z},${k.s},${k.r}${k.fx || k.pts ? `,${letters(k.fx)}` : ''}${k.pts ? `,p${ptsText(k.pts).replace(/;/g, '/')}` : ''}`).join('; ');
  const blocks: Block[] = [...(anim.shapes.length ? [shapesTable(anim.shapes)] : []), ...(keyed.length ? [{ k: 'table' as const, head: ['Shape', 'Keys'], rows: keyed.map(([i, ks]) => [String(i), keys(ks)]) }] : [])];
  return write({ head, blocks }).replace(/\n$/, '');
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
 * dropped. (The drawing is compared row by row, as Draw writes it.)
 */
export function withShapes(anim: Anim, shapes: Shape[]): Anim {
  const line = (list: Shape[]) => shapesTable(list).rows.map((r) => r.join('|'));
  const was = line(anim.shapes);
  const now = line(shapes);
  const keyOf = (j: number) => anim.keys[j] ?? [];
  let keys: Key[][] | null = null;
  if (now.length === was.length) {
    // A pure reorder (to the front, to the back): every line finds its old self.
    const free = was.map((_, j) => j);
    const from = now.map((row) => {
      const at = free.findIndex((j) => was[j] === row);
      return at < 0 ? -1 : free.splice(at, 1)[0];
    });
    if (from.every((j) => j >= 0)) keys = from.map(keyOf);
  } else if (now.length === was.length - 1) {
    // One taken out: which one, and the rest shift down.
    const gone = anim.shapes.findIndex((_, j) => line(removeShape(anim.shapes, j)).join('\n') === now.join('\n'));
    if (gone >= 0) keys = anim.shapes.map((_, j) => j).filter((j) => j !== gone).map(keyOf);
  }
  return { ...anim, shapes, keys: shapes.map((_, j) => (keys ? keys[j] : keyOf(j)) ?? []) };
}

/** Does shape `i` have a key at this frame? */
export const hasKey = (anim: Anim, i: number, t: number) => !!anim.keys[i]?.some((k) => k.t === t);

/**
 * Motion as a person or a program loosely writes it: its tables, tidied; or,
 * with none, each thing listed on the stage, one above the next, drifting
 * from left to right (":rocket:" alone is that icon), and a quote saying
 * what it shows.
 */
export function readAnim(text: string): string {
  const doc = parse(text);
  if (shapesBlock(doc.blocks)) return serializeAnim(parseAnim(text));
  const quote = doc.blocks.find((b) => b.k === 'quote');
  const list = doc.blocks.flatMap((b) => (b.k === 'li' ? [b.text] : b.k === 'p' || b.k === 'h' ? b.text.split('\n') : [])).map((t) => t.trim()).filter(Boolean);
  const anim = parseAnim('');
  anim.shapes = list.map((l, i): Shape => {
    const ic = /^:([a-z][a-z0-9-]*):$/.exec(l);
    const y = Math.round((H * (i + 1)) / (list.length + 1) / 8) * 8 - 16;
    return ic ? { k: 'i', x: 80, y, w: 48, h: 48, f: 0, text: ic[1] } : { k: 't', x: 80, y, w: 160, h: 32, f: 0, text: l, z: 3 };
  });
  anim.keys = anim.shapes.map(() => [restKey(0), { ...restKey(DEFAULT_FRAMES - 1), dx: Math.round(W * 0.6) }]);
  const alt = doc.head.alt ?? (quote?.k === 'quote' ? quote.text : '');
  if (alt) anim.alt = alt;
  return serializeAnim(anim);
}
