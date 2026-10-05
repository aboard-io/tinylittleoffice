/**
 * Motion document model: icons and text that move around a stage.
 * Each item has keyframes; between them position and size are interpolated
 * in straight lines. Time is counted in frames, FPS frames to the second.
 *
 * Format: the first line is the length in frames (base 36). Then one item per
 * line: "i<icon id>" or "t<text>", a tab, and its keyframes separated by ";",
 * each "<frame>,<x>,<y>,<size>" in base 36. x and y are the item's centre in
 * 8px grid units on the 640 by 400 stage; size is in tenths (a = 1x).
 */
export const W = 640;
export const H = 400;
export const GRID = 8;
export const FPS = 4;
export const DEFAULT_FRAMES = 16;
export const MAX_FRAMES = 60;
export const MAX_ITEMS = 12;

export interface Key {
  /** Frame number. */
  t: number;
  /** Centre, px. */
  x: number;
  y: number;
  /** Scale, 1 = natural size. */
  s: number;
}

export interface Item {
  kind: 'i' | 't';
  /** Icon id, or the text. */
  value: string;
  keys: Key[];
}

export interface Anim {
  frames: number;
  items: Item[];
}

const b = (n: number) => Math.round(n).toString(36);
const sortKeys = (keys: Key[]) => keys.sort((p, q) => p.t - q.t);

export function parseAnim(text: string): Anim {
  const anim: Anim = { frames: DEFAULT_FRAMES, items: [] };
  if (!text) return anim;
  const lines = text.split('\n');
  const frames = parseInt(lines[0], 36);
  if (Number.isFinite(frames)) anim.frames = Math.min(MAX_FRAMES, Math.max(2, frames));
  for (const line of lines.slice(1)) {
    const tab = line.lastIndexOf('\t');
    const kind = line[0];
    if (tab < 1 || (kind !== 'i' && kind !== 't')) continue;
    const keys: Key[] = [];
    for (const part of line.slice(tab + 1).split(';')) {
      const [t, x, y, s] = part.split(',').map((v) => parseInt(v, 36));
      if (![t, x, y, s].every(Number.isFinite)) continue;
      keys.push({ t: Math.min(anim.frames - 1, Math.max(0, t)), x: x * GRID, y: y * GRID, s: Math.max(1, s) / 10 });
    }
    if (keys.length) anim.items.push({ kind, value: line.slice(1, tab), keys: sortKeys(keys) });
  }
  return anim;
}

export function serializeAnim(anim: Anim): string {
  if (!anim.items.length && anim.frames === DEFAULT_FRAMES) return '';
  const lines = [b(anim.frames)];
  for (const it of anim.items) {
    const keys = sortKeys(it.keys.slice()).map((k) => `${b(k.t)},${b(k.x / GRID)},${b(k.y / GRID)},${b(k.s * 10)}`);
    lines.push(`${it.kind}${it.value.replace(/[\n\t]/g, ' ')}\t${keys.join(';')}`);
  }
  return lines.join('\n');
}

/** Where an item is at a (possibly fractional) frame. */
export function stateAt(item: Item, frame: number): Key {
  const keys = item.keys;
  if (frame <= keys[0].t) return { ...keys[0], t: frame };
  const last = keys[keys.length - 1];
  if (frame >= last.t) return { ...last, t: frame };
  let i = 0;
  while (keys[i + 1].t <= frame) i++;
  const p = keys[i];
  const q = keys[i + 1];
  const f = (frame - p.t) / (q.t - p.t);
  const mix = (m: number, n: number) => m + (n - m) * f;
  return { t: frame, x: mix(p.x, q.x), y: mix(p.y, q.y), s: mix(p.s, q.s) };
}

/** Set (or replace) an item's keyframe at a frame, returning a new item. */
export function withKey(item: Item, key: Key): Item {
  return { ...item, keys: sortKeys([...item.keys.filter((k) => k.t !== key.t), key]) };
}
