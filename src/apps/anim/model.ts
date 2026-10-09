/**
 * Motion as a view of the document, and its commands as operations (ported from the old tree's
 * lib/animmodel.ts). A motion document is a drawing whose shapes move: Draw's table of shapes as Draw
 * writes it (src/apps/draw/model.ts), the length and the speed in the head, and a table of the shapes that
 * move:
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
 * A shape is its number among the drawing's shapes, from 0 (as a join counts them). Keys are separated by
 * ";", each "<t>,<dx>,<dy>,<z>,<s>,<r>[,<fx>[,p<corners>]]": the frame, the offset in px from where the
 * shape was drawn, its depth in px (nearer when positive), its scale (1 = as drawn), its spin in degrees,
 * letters for effects (EFFECTS), and for a pen shape its corners ("p0:0/100:50/0:100"). Between keys a
 * shape travels in straight lines. A Draw document on its own is a motion document in which nothing moves
 * yet, which is the whole of Draw's hand-off.
 *
 * The commands: the shapes are Draw's, so a shape taken out or copied is Draw's own ops on the shapes table
 * (`rows`, `cells`), and a drawing redrawn in Draw mode replaces that table (`splice`); the keys table is
 * replaced whole by a `splice` (put in when the first key is, taken out with the last); length, speed, alt
 * and the background tile are `head` ops. In every case the keys follow their shapes.
 */
import { applyAll, column, columnsOf, plainText, type Block, type Doc, type Op, type Run, type TableBlock } from '../../doc/index.ts';
import { bounds, duplicate as drawDuplicate, readDrawing, removeShape as drawRemove, isLink, pasteShapes, ptsOf, ptsText, shapeCells, shapesTable, H, W, type DrawView, type Shape } from '../draw/model.ts';

export const DEFAULT_FRAMES = 24;
export const MAX_FRAMES = 120;
export const FPS_CHOICES = [4, 8, 12] as const;
export const DEFAULT_FPS = 8;
/** How far a thing may come forward or go back, in px. */
export const MAX_Z = 200;

/** The effects, by letter: the order the menu lists them in. Names are keys for t(). */
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

/** What Motion draws, read from the document. */
export interface AnimView {
  frames: number;
  fps: number;
  /** Draw's reading of the same document: the shapes, their table, the alt, the tile. */
  draw: DrawView;
  shapes: Shape[];
  /** One list per shape, sorted by frame; empty when it stays put. */
  keys: Key[][];
  /** The keys table's block, or -1 while nothing moves. */
  keysAt: number;
  alt: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** A key that leaves the shape as it was drawn. */
export const restKey = (t: number): Key => ({ t, dx: 0, dy: 0, z: 0, s: 1, r: 0, fx: '' });

/** How much nearer things look larger: 1 + z / 400, so z = 200 is half as big again. */
export const depthScale = (z: number) => 1 + z / (2 * MAX_Z);

const sortKeys = (keys: Key[]) => keys.sort((p, q) => p.t - q.t);
const letters = (fx: string) => [...new Set(fx.replace(/[^3dnogmwbi]/g, ''))].join('');

/** The keys table: the first table with a Keys column. */
export const keysAt = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'table' && b.cols.some((c) => /^keys$/i.test(c.name.trim())));

/** The length from "frames: 24": 2 to 120. */
export const framesOf = (v: string | undefined) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? clamp(n, 2, MAX_FRAMES) : DEFAULT_FRAMES;
};
export const fpsOf = (v: string | undefined) => {
  const n = parseInt(v ?? '', 10);
  return (FPS_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_FPS;
};

/** One key as the cell writes it. */
const keyText = (k: Key) => `${k.t},${k.dx},${k.dy},${k.z},${k.s},${k.r}${k.fx || k.pts ? `,${letters(k.fx)}` : ''}${k.pts ? `,p${ptsText(k.pts).replace(/;/g, '/')}` : ''}`;

/** A cell of keys read, for a motion `frames` long. */
export function keysOf(cell: string, frames: number): Key[] {
  const out: Key[] = [];
  for (const part of cell.split(';')) {
    const [t, dx, dy, z, s, r, fx = '', p = ''] = part.split(',').map((v) => v.trim());
    const n = (v: string | undefined, dflt: number) => (v !== undefined && Number.isFinite(parseFloat(v)) ? parseFloat(v) : dflt);
    if (!Number.isFinite(parseInt(t, 10))) continue;
    const at = clamp(Math.round(n(t, 0)), 0, frames - 1);
    const key: Key = { t: at, dx: Math.round(n(dx, 0)), dy: Math.round(n(dy, 0)), z: clamp(Math.round(n(z, 0)), -MAX_Z, MAX_Z), s: Math.max(0.1, Math.round(n(s, 1) * 10) / 10), r: Math.round(n(r, 0)), fx: letters(fx) };
    if (p.startsWith('p')) key.pts = ptsOf(p.slice(1).replace(/\//g, ';'));
    const was = out.findIndex((k) => k.t === at);
    if (was >= 0) out.splice(was, 1);
    out.push(key);
  }
  return sortKeys(out);
}

export function readAnim(doc: Doc): AnimView {
  const draw = readDrawing(doc);
  const frames = framesOf(doc.head.frames);
  const keys: Key[][] = draw.shapes.map(() => []);
  const at = keysAt(doc);
  if (at >= 0) {
    const table = doc.blocks[at] as TableBlock;
    const [which, what] = columnsOf(table, /^shape$/, /^keys$/);
    for (const row of table.rows) {
      const i = parseInt(row[which] ?? '', 10);
      if (!keys[i]) continue;
      const more = keysOf(row[what] ?? '', frames);
      keys[i] = sortKeys([...keys[i].filter((k) => !more.some((q) => q.t === k.t)), ...more]);
    }
  }
  return { frames, fps: fpsOf(doc.head.fps), draw, shapes: draw.shapes, keys, keysAt: at, alt: draw.alt };
}

/** The keys table as it is written: a row for each shape with a key; null when none has. */
export function keysBlock(keys: Key[][]): TableBlock | null {
  const rows = keys.flatMap((ks, i) => (ks.length ? [[String(i), sortKeys(ks.slice()).map(keyText).join('; ')]] : []));
  return rows.length ? { k: 'table', cols: [column('Shape'), column('Keys')], rows } : null;
}

const sameTable = (a: Block | undefined, b: TableBlock | null) => (!a && !b) || (!!a && !!b && a.k === 'table' && JSON.stringify(a.rows) === JSON.stringify(b.rows) && a.cols.map((c) => c.name).join('|') === b.cols.map((c) => c.name).join('|'));

/** The keys table written from these keys: put in, replaced, or taken out (a `splice`); [] when it is so already. */
export function setKeys(doc: Doc, keys: Key[][]): Op[] {
  const at = keysAt(doc);
  const next = keysBlock(keys);
  if (sameTable(at >= 0 ? doc.blocks[at] : undefined, next)) return [];
  if (at < 0) return [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [next!] }];
  return [{ op: 'splice', at, n: 1, blocks: next ? [next] : [] }];
}

/** The head's frames and fps, written once a motion is made of something (Draw's document has neither). */
const headOps = (doc: Doc, frames: number, fps: number): Op[] => [
  ...(doc.head.frames === String(frames) ? [] : [{ op: 'head' as const, key: 'frames', value: String(frames) }]),
  ...(doc.head.fps === String(fps) ? [] : [{ op: 'head' as const, key: 'fps', value: String(fps) }]),
];

/** Where shape `i` is at a (possibly fractional) frame. Effects hold from a key until the next. */
export function stateAt(anim: AnimView, i: number, frame: number): Key {
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

/** Does shape `i` have a key at this frame? */
export const hasKey = (anim: AnimView, i: number, t: number) => !!anim.keys[i]?.some((k) => k.t === t);

/** A key in the whole numbers the format keeps. */
const tidyKey = (key: Key): Key => {
  const k: Key = { t: Math.round(key.t), dx: Math.round(key.dx), dy: Math.round(key.dy), z: clamp(Math.round(key.z), -MAX_Z, MAX_Z), s: Math.max(0.1, Math.round(key.s * 10) / 10), r: Math.round(key.r), fx: letters(key.fx) };
  if (key.pts) k.pts = key.pts.map(Math.round);
  return k;
};

/** The keys with shape i's key at its frame set (or replaced). */
export function keysWith(anim: AnimView, i: number, key: Key): Key[][] {
  const k = tidyKey(key);
  return anim.shapes.map((_, j) => (j === i ? sortKeys([...(anim.keys[j] ?? []).filter((q) => q.t !== k.t), k]) : (anim.keys[j] ?? [])));
}

/* ---------- commands: each the ops that do it ---------- */

/** Shape i's key at its frame set: the keys table replaced, and the head given its length and speed. */
export function withKey(doc: Doc, i: number, key: Key): Op[] {
  const v = readAnim(doc);
  if (!v.shapes[i]) return [];
  const keys = setKeys(doc, keysWith(v, i, key));
  return keys.length ? [...headOps(doc, v.frames, v.fps), ...keys] : [];
}

/**
 * Several shapes keyed at once, each at its own key's frame, as one splice of the keys table: what a drag, a
 * nudge, K, an effect or a slider does to the shapes in hand. A shape keyed for the first time at a later
 * moment gets a key at the start too, where it was drawn, so it travels from there (its corners as drawn,
 * when its corners are what is keyed).
 */
export function withKeys(doc: Doc, list: { i: number; key: Key }[]): Op[] {
  const v = readAnim(doc);
  let keys = v.keys;
  for (const { i, key } of list) {
    const s = v.shapes[i];
    if (!s) continue;
    if (!keys[i]?.length && key.t > 0) keys = keysWith({ ...v, keys }, i, key.pts ? { ...restKey(0), pts: s.pts } : restKey(0));
    keys = keysWith({ ...v, keys }, i, key);
  }
  const ops = setKeys(doc, keys);
  return ops.length ? [...headOps(doc, v.frames, v.fps), ...ops] : [];
}

/** How far shape i may go from where it was drawn and stay on the stage: [min dx, max dx, min dy, max dy]. */
export function room(anim: AnimView, i: number): [number, number, number, number] {
  const [x, y, w, h] = bounds(anim.shapes[i], anim.shapes);
  return [-x, W - x - w, -y, H - y - h];
}

/** Shape i's key at frame t taken away. */
export function removeKey(doc: Doc, i: number, t: number): Op[] {
  const v = readAnim(doc);
  return setKeys(doc, v.keys.map((ks, j) => (j === i ? ks.filter((k) => k.t !== t) : ks)));
}

/** The length and the speed: `head` ops, and the keys past the new end taken out. */
export function setLength(doc: Doc, frames: number, fps: number): Op[] {
  const v = readAnim(doc);
  const f = clamp(Math.round(frames) || v.frames, 2, MAX_FRAMES);
  const s = (FPS_CHOICES as readonly number[]).includes(fps) ? fps : v.fps;
  if (f === v.frames && s === v.fps && doc.head.frames && doc.head.fps) return [];
  return [...headOps(doc, f, s), ...setKeys(doc, v.keys.map((ks) => ks.filter((k) => k.t < f)))];
}

/** How a shape is known across an edit: its row, and for a join the rows of the shapes it joins (so renumbering keeps it itself). */
function identities(shapes: Shape[]): string[] {
  const line = (s: Shape) => Object.values(shapeCells(s)).join('|');
  return shapes.map((s) => (isLink(s.k) ? `${s.k}|${shapeCells(s).label}|${shapes[s.x] ? line(shapes[s.x]) : s.x}|${shapes[s.y] ? line(shapes[s.y]) : s.y}` : line(s)));
}

/**
 * Which old shape each new one is, after the drawing was changed by hand (Draw mode): first a shape
 * unchanged wherever it went (a reorder, a join renumbered), then what is left paired in order (a shape
 * moved, resized or relabelled, with the joins to it). -1 for a shape that is new.
 */
export function follow(was: Shape[], now: Shape[]): number[] {
  const a = identities(was);
  const b = identities(now);
  const used = new Set<number>();
  const from = b.map((id) => {
    const j = a.findIndex((x, k) => x === id && !used.has(k));
    if (j >= 0) used.add(j);
    return j;
  });
  const left = a.map((_, j) => j).filter((j) => !used.has(j));
  return from.map((j) => (j >= 0 ? j : (left.shift() ?? -1)));
}

/** The keys table after the shapes went from `was` to the document's shapes now. */
const keysFollow = (after: Doc, keys: Key[][], map: number[]): Op[] => setKeys(after, map.map((j) => (j >= 0 ? (keys[j] ?? []) : [])));

/** Shape i taken out, with the joins to it (Draw's ops), and the keys of the rest kept with their shapes. */
export function removeShape(doc: Doc, i: number): Op[] {
  const v = readAnim(doc);
  const ops = drawRemove(doc, i);
  if (!ops.length) return [];
  const after = applyAll(doc, ops);
  return [...ops, ...keysFollow(after, v.keys, follow(v.shapes, readDrawing(after).shapes))];
}

/** A copy of shape i, a little down and to the right, at the end, moving as it does. */
export function duplicateShape(doc: Doc, i: number): Op[] {
  const v = readAnim(doc);
  const ops = drawDuplicate(doc, i);
  if (!ops.length) return [];
  const after = applyAll(doc, ops);
  return [...ops, ...setKeys(after, [...v.keys, (v.keys[i] ?? []).map((k) => ({ ...k }))])];
}

/** Several shapes taken out, the last first, each with the joins to it, and the keys of the rest kept with their shapes. */
export function removeShapes(doc: Doc, list: number[]): Op[] {
  const ops: Op[] = [];
  let now = doc;
  for (const i of [...new Set(list)].sort((a, b) => b - a)) {
    const step = removeShape(now, i);
    ops.push(...step);
    now = applyAll(now, step);
  }
  return ops;
}

/** Copies of several shapes, each moving as its own does; `sel` the copies' numbers. A join has no copy. */
export function duplicateShapes(doc: Doc, list: number[]): { ops: Op[]; sel: number[] } {
  const ops: Op[] = [];
  const sel: number[] = [];
  let now = doc;
  for (const i of [...new Set(list)].sort((a, b) => a - b)) {
    const step = duplicateShape(now, i);
    if (!step.length) continue;
    ops.push(...step);
    now = applyAll(now, step);
    sel.push(readDrawing(now).shapes.length - 1);
  }
  return { ops, sel };
}

/** Which of these shapes stay when they are a drawing of their own: every shape, and the joins whose two ends are there. */
function keptOf(all: Shape[], list: number[]): number[] {
  const order = [...new Set(list)].filter((i) => all[i]).sort((a, b) => a - b);
  const there = (n: number) => order.includes(n) && !isLink(all[n].k);
  return order.filter((i) => !isLink(all[i].k) || (there(all[i].x) && there(all[i].y) && all[i].x !== all[i].y));
}

/**
 * Shapes in hand as a motion of their own, for the clipboard: their table (the joins among them renumbered),
 * their keys with them, the length and the speed. Pasted into the Drawing Tool it is their drawing; into a
 * motion, they move as they did.
 */
export function motionOf(doc: Doc, list: number[]): Doc | null {
  const v = readAnim(doc);
  const kept = keptOf(v.shapes, list);
  if (!kept.length) return null;
  const now = new Map(kept.map((old, n) => [old, n]));
  const shapes = kept.map((i) => (isLink(v.shapes[i].k) ? { ...v.shapes[i], x: now.get(v.shapes[i].x)!, y: now.get(v.shapes[i].y)! } : v.shapes[i]));
  const keys = keysBlock(kept.map((i) => v.keys[i] ?? []));
  return { head: { frames: String(v.frames), fps: String(v.fps) }, blocks: keys ? [shapesTable(shapes), keys] : [shapesTable(shapes)] };
}

/**
 * A motion (or a drawing) pasted in: its shapes added beside where they were (Draw's paste) and its keys
 * following them, those past this motion's end left out. `sel` the shapes pasted, joins aside; [] when there
 * were none.
 */
export function pasteMotion(doc: Doc, pasted: Doc): { ops: Op[]; sel: number[] } {
  const from = readAnim(pasted);
  const kept = keptOf(from.shapes, from.shapes.map((_, i) => i));
  if (!kept.length) return { ops: [], sel: [] };
  const now = new Map(kept.map((old, n) => [old, n]));
  const shapes = kept.map((i) => (isLink(from.shapes[i].k) ? { ...from.shapes[i], x: now.get(from.shapes[i].x)!, y: now.get(from.shapes[i].y)! } : from.shapes[i]));
  const v = readAnim(doc);
  const base = v.shapes.length;
  const { ops } = pasteShapes(doc, shapes);
  if (!ops.length) return { ops: [], sel: [] };
  const after = applyAll(doc, ops);
  const keys = [...readAnim(after).shapes.map((_, j) => v.keys[j] ?? [])];
  kept.forEach((old, n) => (keys[base + n] = (from.keys[old] ?? []).filter((k) => k.t < v.frames)));
  const moving = keys.some((ks) => ks.length);
  const keyOps = setKeys(after, keys);
  return { ops: [...ops, ...(moving && keyOps.length ? headOps(after, v.frames, v.fps) : []), ...keyOps], sel: shapes.flatMap((s, n) => (isLink(s.k) ? [] : [base + n])) };
}

/** The drawing alone, as Draw's editor is given it in Draw mode: its alt, its tile and its table. */
export function drawingOf(doc: Doc): Doc {
  const at = readDrawing(doc).at;
  const head: Doc['head'] = {};
  if (doc.head.alt) head.alt = doc.head.alt;
  if (doc.head.tile) head.tile = doc.head.tile;
  return { head, blocks: at >= 0 ? [doc.blocks[at]] : [] };
}

/**
 * The drawing as Draw's editor left it: the table of shapes replaced (a `splice`; put in or taken out as
 * need be), its alt and tile into the head, and the keys following their shapes. Draw's other fields (a
 * pixel grid) are not Motion's and are left out.
 */
export function redraw(doc: Doc, drawing: Doc): Op[] {
  const v = readAnim(doc);
  const table = readDrawing(drawing).at >= 0 ? drawing.blocks[readDrawing(drawing).at] : null;
  const at = v.draw.at;
  const ops: Op[] = [];
  const same = at >= 0 && table && JSON.stringify(doc.blocks[at]) === JSON.stringify(table);
  if (!same) {
    if (at >= 0) ops.push({ op: 'splice', at, n: 1, blocks: table ? [table] : [] });
    else if (table) ops.push({ op: 'splice', at: 0, n: 0, blocks: [table] });
  }
  for (const key of ['alt', 'tile'])
    if ((doc.head[key] ?? '') !== (drawing.head[key] ?? '')) ops.push({ op: 'head', key, value: drawing.head[key] || undefined });
  if (!ops.length) return [];
  const after = applyAll(doc, ops);
  return [...ops, ...keysFollow(after, v.keys, follow(v.shapes, readDrawing(after).shapes))];
}

/**
 * Motion as a person or a program loosely writes it, with no table of shapes: each thing listed (an item, a
 * line of a paragraph or a heading) on the stage, one above the next, drifting from left to right
 * (":rocket:" alone is that icon), and a quote saying what it shows. Applied as the document arrives, one
 * splice and the head; [] for a document that has its table, or nothing to list.
 */
export function loosen(doc: Doc): Op[] {
  if (readDrawing(doc).at >= 0) return [];
  // (An icon in the words is its name between colons, as it was written.)
  const said = (runs: Run[]) => runs.map((r) => (r.ic ? `:${r.ic}:` : r.t)).join('');
  const words = doc.blocks.flatMap((b) => (b.k === 'li' ? [said(b.runs)] : b.k === 'p' || b.k === 'h' ? said(b.runs).split('\n') : [])).map((s) => s.trim()).filter(Boolean);
  if (!words.length) return [];
  const quote = doc.blocks.find((b) => b.k === 'quote');
  const shapes = words.map((l, i): Shape => {
    const ic = /^:([a-z][a-z0-9-]*):$/.exec(l);
    const y = Math.round((H * (i + 1)) / (words.length + 1) / 8) * 8 - 16;
    return ic ? { k: 'i', x: 80, y, w: 48, h: 48, f: 0, text: ic[1] } : { k: 't', x: 80, y, w: 160, h: 32, f: 0, text: l, z: 3 };
  });
  const cols = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
  const table: TableBlock = { k: 'table', cols: cols.map(column), rows: shapes.map((s) => { const c = shapeCells(s); return [c.kind, c.x, c.y, c.w, c.h, c.style, c.label]; }) };
  const keys = shapes.map(() => [restKey(0), { ...restKey(DEFAULT_FRAMES - 1), dx: Math.round(W * 0.6) }]);
  const ops: Op[] = [{ op: 'splice', at: 0, n: doc.blocks.length, blocks: [table, keysBlock(keys)!] }, ...headOps(doc, framesOf(doc.head.frames), fpsOf(doc.head.fps))];
  if (!doc.head.alt && quote?.k === 'quote') ops.push({ op: 'head', key: 'alt', value: plainText(quote.runs).replace(/\s+/g, ' ').trim() || undefined });
  return ops;
}
