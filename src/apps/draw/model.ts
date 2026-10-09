/**
 * A drawing as a view of the document, and its commands as operations. The document is the kernel's: a
 * table, a row per shape, and the alt text in the head (ported from the old tree's lib/drawmodel.ts):
 *
 *   ---
 *   alt: A browser asks a server.
 *   ---
 *   Kind | X | Y | W | H | Style | Label
 *   --- | --- | --- | --- | --- | --- | ---
 *   o | 4 | 6 | 16 | 8 | 1b | Browser
 *   o | 32 | 6 | 16 | 8 | 1b | Server
 *   k | 0 | 1 | 0 | 0 | 0 | asks
 *
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use X, Y as the start and W, H as
 * the distance to the end. Style is the fill (0, 1 or 2), then optionally a colour letter and a text size
 * digit: "1", "2b", "0r3". Black and the normal text size are the defaults and are left out.
 *
 * Kinds: r rectangle, o rounded box, e ellipse, d diamond, h hexagon, p parallelogram, c cylinder, n note,
 * t text, i icon (its label is the icon's name), l line, a arrow, v any shape and w a stroke (their corners
 * in a Points column, there only while one is drawn), and two that join shapes: k (arrow) and j (line).
 * For those, X and Y are not places but the numbers of the two shapes joined, counting rows from 0, so the
 * join follows its shapes wherever they go. Read leniently, a kind may be named in words ("rectangle",
 * "arrow") and the columns may come in any order. A label may start with an icon, ":rocket Launch", drawn
 * before the words; " | " in a label starts a second, smaller line.
 *
 * Pixel mode (`grid: 8|16|32|64` in the head): the one `p` block is the grid, a line a row, a letter a
 * square (a to h the inks, "." clear), as the old pixel app wrote it. "Use as background" writes the grid
 * into the head as a `tile:` (kit/tile.ts), drawn behind the shapes.
 *
 * Every command here is pure: given the document and what to do, the `Op[]` that does it. A shape changed
 * is `cells` on its row; one added or taken away is `rows`; the joins that must be renumbered are `cells`;
 * a column that is wanted and missing is `cols`. The one `splice` is the table's birth and death (and the
 * pixel block, which is replaced whole, as a paragraph is).
 *
 * The clipboard carries shapes as a drawing of their own (shapesToTlo): a table of their rows, the joins among
 * them numbered within it, so a copy pastes into another drawing, into Motion, or into a sheet as a table.
 */
import { apply, columnsOf, parse, plainText, write, type Block, type Column, type Doc, type Op, type TableBlock } from '../../doc/index.ts';
import { t } from '../../kit/i18n.ts';
import { TILE_INKS, TILE_SIDES, parseTile, tileOf, type Tile } from '../../kit/tile.ts';

export const W = 640;
export const H = 400;
export const GRID = 8;

export const KINDS = ['r', 'o', 'e', 'd', 'h', 'p', 'c', 'n', 'i', 'l', 'a', 't', 'k', 'j', 'v', 'w'] as const;
export type Kind = (typeof KINDS)[number];

/** A label's icon and its words: ":rocket Launch" is ['rocket', 'Launch']. */
export function iconOf(label: string): [string, string] {
  const m = /^:([a-z0-9-]+)(?:\s+|$)(.*)$/.exec(label);
  return m ? [m[1], m[2]] : ['', label];
}

/** Kinds that join two shapes rather than sit somewhere. */
export const isLink = (k: Kind) => k === 'k' || k === 'j';
/** Kinds drawn as a stroke with no inside. */
export const isLine = (k: Kind) => k === 'l' || k === 'a' || isLink(k);
/** Kinds with corners of their own (the pen's and the hand's). */
export const isDrawn = (k: Kind) => k === 'v' || k === 'w';
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
  /** For 'v' and 'w': the corners, x,y pairs as hundredths of the box, in order. */
  pts?: number[];
}

/** Points as x, y pairs (a stray last number is left out). */
export const pairs = (pts: number[]): [number, number][] => Array.from({ length: Math.floor(pts.length / 2) }, (_, i) => [pts[2 * i], pts[2 * i + 1]]);
/** Points as the text keeps them: "12:0;100:50;0:100". */
export const ptsText = (pts: number[]) => pairs(pts).map(([x, y]) => `${Math.round(x)}:${Math.round(y)}`).join(';');
export const ptsOf = (text: string): number[] => text.split(';').flatMap((p) => p.split(':').map((n) => +n)).filter((n) => isFinite(n));

/** The colours a shape may take (the kit's palette, by letter: told apart by every pair of eyes). */
export const COLORS: Record<Color, string> = { r: '#b3261e', o: '#d55e00', g: '#009e73', b: '#0072b2', p: '#a05ca8' };
export const TEXT_PX: Record<TextSize, number> = { 1: 11, 2: 14, 3: 20, 4: 30 };

/** How a shape is painted, given the theme's ink, paper and grey. */
export function paint(s: Shape, ink: string, paper: string, shade: string) {
  const color = s.c ? COLORS[s.c] : ink;
  const closed = !isLine(s.k) && s.k !== 't' && s.k !== 'i' && s.k !== 'w';
  return {
    stroke: color,
    fill: s.f === 2 ? color : s.f === 1 ? (s.c ? color : shade) : paper,
    // A coloured "grey" fill is a tint of the colour.
    fillOpacity: s.f === 1 && s.c ? 0.16 : 1,
    text: s.f === 2 && closed ? paper : color,
    px: TEXT_PX[s.z ?? 2],
    marker: s.c ? `arrow-${s.c}` : 'arrow',
  };
}

/** A description made from the shapes themselves, when nobody wrote one: what is labelled, and what leads to what. A start, not a substitute. '' for no shapes. */
export function describeDrawing(shapes: Shape[]): string {
  if (!shapes.length) return '';
  const words = (s: Shape | undefined) => iconOf(s?.text ?? '')[1].trim();
  // A shape with no words is named by its icon.
  const named = (i: number) => words(shapes[i]) || iconOf(shapes[i]?.text ?? '')[0];
  const things = shapes.map((s, i) => (isLink(s.k) ? '' : named(i))).filter(Boolean);
  const joins = shapes
    .filter((s) => isLink(s.k) && named(s.x) && named(s.y))
    .map((s) => (s.k === 'k' ? t('{a} leads to {b}', { a: named(s.x), b: named(s.y) }) : t('{a} joins {b}', { a: named(s.x), b: named(s.y) })) + (words(s) ? ` (${words(s)})` : ''));
  const head = things.length ? t('A drawing of {things}.', { things: things.join(', ') }) : t('A drawing of {n|one unlabelled shape|# unlabelled shapes}.', { n: shapes.length });
  return joins.length ? `${head} ${joins.join('; ')}.` : head;
}

/* ---------- reading ---------- */

/** Kinds by name, for a table written by hand. */
const NAMED: Record<string, Kind> = { rect: 'r', rectangle: 'r', box: 'o', rounded: 'o', ellipse: 'e', circle: 'e', oval: 'e', diamond: 'd', hexagon: 'h', parallelogram: 'p', cylinder: 'c', database: 'c', note: 'n', icon: 'i', line: 'l', arrow: 'a', text: 't', shape: 'v', stroke: 'w', freehand: 'w', join: 'k', link: 'j' };
const FIELDS = ['kind', 'x', 'y', 'w', 'h', 'style', 'label', 'points'] as const;
type Field = (typeof FIELDS)[number];
const NAMES: Record<Field, string> = { kind: 'Kind', x: 'X', y: 'Y', w: 'W', h: 'H', style: 'Style', label: 'Label', points: 'Points' };
const PATTERNS: Record<Field, RegExp> = { kind: /^kind$/, x: /^x$/, y: /^y$/, w: /^w$/, h: /^h$/, style: /^style$/, label: /^label$/, points: /^points$/ };

/** Where each field's column is in a table, -1 for one it has not got. */
export type Cols = Record<Field, number>;
const colsOf = (table: { cols: Column[] }): Cols => Object.fromEntries(FIELDS.map((f, i) => [f, columnsOf(table, ...FIELDS.map((g) => PATTERNS[g]))[i]])) as Cols;

/** The index of the table of shapes: the first table with a Kind column; -1 for none. */
export const shapesAt = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'table' && b.cols.some((c) => /^kind$/i.test(c.name.trim())));
/** The index of the pixel grid's paragraph: the first `p`; -1 for none. */
export const pixelsAt = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'p');

/** A row as a shape; null for a row that is none. */
export function rowShape(row: string[], cols: Cols): Shape | null {
  const get = (f: Field) => (cols[f] >= 0 ? (row[cols[f]] ?? '').trim() : '');
  const word = get('kind').toLowerCase();
  const k = ((KINDS as readonly string[]).includes(word) ? word : NAMED[word]) as Kind | undefined;
  if (!k) return null;
  const n = (f: Field) => Math.round(parseFloat(get(f))) || 0;
  const f = get('style');
  const look = /^([0-2])([a-z]?)([1-4]?)$/.exec(f);
  const shape: Shape = {
    k,
    // (A join's x and y are shape numbers, not places.)
    x: n('x') * (isLink(k) ? 1 : GRID),
    y: n('y') * (isLink(k) ? 1 : GRID),
    w: n('w') * GRID,
    h: n('h') * GRID,
    f: (look ? +look[1] : Math.min(2, Math.max(0, parseInt(f, 10) || 0))) as Fill,
    text: get('label'),
  };
  if (isDrawn(k)) shape.pts = ptsOf(get('points'));
  if (look && look[2] in COLORS) shape.c = look[2] as Color;
  if (look && look[3] && look[3] !== '2') shape.z = +look[3] as TextSize;
  return shape;
}

/** A table's rows as shapes, rows that are no shape left out; `rows` says which row each came from. */
export function tableShapes(b: TableBlock): { shapes: Shape[]; rows: number[] } {
  const cols = colsOf(b);
  const shapes: Shape[] = [];
  const rows: number[] = [];
  b.rows.forEach((row, r) => {
    const s = rowShape(row, cols);
    if (s) (shapes.push(s), rows.push(r));
  });
  return { shapes, rows };
}

/** The cells of a shape's row, by field. */
export function shapeCells(s: Shape): Record<Field, string> {
  const g = (n: number) => String(Math.round(n / GRID));
  return {
    kind: s.k,
    x: isLink(s.k) ? String(s.x) : g(s.x),
    y: isLink(s.k) ? String(s.y) : g(s.y),
    w: g(s.w),
    h: g(s.h),
    style: `${s.f}${s.c ?? ''}${s.z && s.z !== 2 ? s.z : ''}`,
    label: s.text.replace(/\n/g, ' '),
    points: isDrawn(s.k) ? ptsText(s.pts ?? []) : '',
  };
}

/** What the drawing draws, read from the document. */
export interface DrawView {
  /** The table of shapes, or -1 while there is none. */
  at: number;
  /** Each shape, and the row it sits in (a row that is no shape is skipped and left alone). */
  shapes: Shape[];
  rows: number[];
  cols: Cols;
  alt: string;
  /** Pixel mode: the grid's side (8, 16, 32 or 64), or 0 for shapes. */
  grid: number;
  /** The pixel grid, `grid` rows of `grid` letters; the block it is read from, or -1. */
  pixels: Tile;
  pixelsAt: number;
  /** The background tile, if the head carries one. */
  tile: Tile | null;
}

const EMPTY: Cols = { kind: -1, x: -1, y: -1, w: -1, h: -1, style: -1, label: -1, points: -1 };

/** The grid's side from "grid: 16"; 0 for anything else. */
export const gridOf = (value: string | undefined): number => {
  const n = parseInt(value ?? '', 10);
  return (TILE_SIDES as readonly number[]).includes(n) ? n : 0;
};

export function readDrawing(doc: Doc): DrawView {
  const at = shapesAt(doc);
  const b = at >= 0 ? (doc.blocks[at] as TableBlock) : null;
  const { shapes, rows } = b ? tableShapes(b) : { shapes: [], rows: [] };
  const grid = gridOf(doc.head.grid);
  const pAt = pixelsAt(doc);
  const lines = pAt >= 0 ? plainText((doc.blocks[pAt] as Extract<Block, { k: 'p' }>).runs).split('\n').map((l) => l.trim()) : [];
  const side = grid || 16;
  return { at, shapes, rows, cols: b ? colsOf(b) : EMPTY, alt: doc.head.alt ?? '', grid, pixels: tileOf(side, lines), pixelsAt: pAt, tile: doc.head.tile ? parseTile(doc.head.tile) : null };
}

/** The grid as its paragraph is written: a row a line, trailing clear squares left off, an empty row a lone ".", trailing empty rows gone. */
export function pixelText(p: Tile): string {
  const rows = p.rows.map((row) => row.replace(/\.+$/, ''));
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  return rows.map((row) => row || '.').join('\n');
}

/* ---------- geometry the editor and the view share ---------- */

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

/** A shape's box as drawn: [x, y, w, h], never negative (a join's is the line between its shapes). */
export function bounds(s: Shape, all: Shape[]): [number, number, number, number] {
  const [x1, y1, x2, y2] = isLink(s.k) ? (linkEnds(s, all) ?? [0, 0, 0, 0]) : [s.x, s.y, s.x + s.w, s.y + s.h];
  return [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)];
}

/** A path with the points that do not change its course taken out (Ramer–Douglas–Peucker), so a hand's wobble is a few corners. */
export function simplify(pts: [number, number][], eps = 2.5): [number, number][] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let far = 0;
  let at = 0;
  pts.forEach((p, i) => {
    const d = len ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > far) (far = d), (at = i);
  });
  return far > eps ? [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)] : [a, b];
}

/** Points drawn (in px) as a shape: closed and filled, or, open, a stroke. A hand-drawn line that ends near where it began is closed too. Null for too few points. */
export function strokeShape(pts: [number, number][], closed = false): Shape | null {
  if (pts.length < 2) return null;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const shut = closed || (pts.length >= 3 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 14);
  if (shut && !closed) pts = pts.slice(0, -1);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const [w, h] = [Math.max(GRID, x1 - x0), Math.max(GRID, y1 - y0)];
  return { k: shut ? 'v' : 'w', x: x0, y: y0, w, h, f: shut ? 1 : 0, text: '', pts: pts.flatMap(([px, py]) => [((px - x0) / w) * 100, ((py - y0) / h) * 100]) };
}

/* ---------- commands: each the ops that do it ---------- */

/** Ops gathered in order, each applied to a running copy of the document so the next sees what it did. */
class Builder {
  ops: Op[] = [];
  doc: Doc;
  constructor(doc: Doc) {
    this.doc = doc;
  }
  push(...ops: Op[]) {
    for (const op of ops) {
      this.doc = apply(this.doc, op);
      this.ops.push(op);
    }
    return this;
  }
  get view(): DrawView {
    return readDrawing(this.doc);
  }
  get table(): TableBlock {
    return this.doc.blocks[this.view.at] as TableBlock;
  }
}

const col = (f: Field): Column => ({ name: NAMES[f], type: 'text' });
const BASE: Field[] = ['kind', 'x', 'y', 'w', 'h', 'style', 'label'];

/** The document given its table of shapes if it has none, and the columns `need` after any it lacks (Points only when asked for). */
function ensure(b: Builder, need: Field[] = BASE): Builder {
  if (b.view.at < 0) b.push({ op: 'splice', at: b.doc.blocks.length, n: 0, blocks: [{ k: 'table', cols: BASE.map(col), rows: [] }] });
  const have = b.view.cols;
  const missing = need.filter((f) => have[f] < 0);
  if (missing.length) b.push({ op: 'cols', at: b.view.at, c: b.table.cols.length, n: 0, cols: missing.map(col) });
  return b;
}

/** A shape as its row in the table as it stands (every column, ours filled, the others blank). */
function rowOf(b: Builder, s: Shape): string[] {
  const cells = shapeCells(s);
  const cols = b.view.cols;
  const row = b.table.cols.map(() => '');
  for (const f of FIELDS) if (cols[f] >= 0) row[cols[f]] = cells[f];
  return row;
}

/** The cells of row r that differ from what a shape writes: one `cells` op per run of changed columns. */
function patchRow(b: Builder, r: number, s: Shape): Builder {
  const cells = shapeCells(s);
  const cols = b.view.cols;
  const row = b.table.rows[r];
  const want = row.slice();
  for (const f of FIELDS) if (cols[f] >= 0) want[cols[f]] = cells[f];
  let c = 0;
  while (c < want.length) {
    if (want[c] === row[c]) {
      c++;
      continue;
    }
    let end = c;
    while (end < want.length && want[end] !== row[end]) end++;
    b.push({ op: 'cells', at: b.view.at, r, c, values: [want.slice(c, end)] });
    c = end;
  }
  return b;
}

/** The Points column taken out once nothing is drawn with the pen; the table taken out once it holds no shape. */
function tidy(b: Builder): Builder {
  const v = b.view;
  if (v.at < 0) return b;
  if (!v.shapes.length && b.table.rows.length === 0) return b.push({ op: 'splice', at: v.at, n: 1, blocks: [] });
  if (v.cols.points >= 0 && !v.shapes.some((s) => isDrawn(s.k)) && b.table.rows.every((row) => !row[v.cols.points])) b.push({ op: 'cols', at: v.at, c: v.cols.points, n: 1 });
  return b;
}

/** The joins' shape numbers put right after the shapes were renumbered: `now(old)` is where shape `old` is now (undefined: gone). */
function renumber(b: Builder, now: (old: number) => number | undefined): Builder {
  const v = b.view;
  for (let i = v.shapes.length - 1; i >= 0; i--) {
    const s = v.shapes[i];
    if (!isLink(s.k)) continue;
    const [x, y] = [now(s.x), now(s.y)];
    if (x === undefined || y === undefined) b.push({ op: 'rows', at: v.at, r: v.rows[i], n: 1 });
    else if (x !== s.x || y !== s.y) patchRow(b, v.rows[i], { ...s, x, y });
  }
  return b;
}

/** A new shape, at the end. */
export function addShape(doc: Doc, s: Shape): Op[] {
  const b = ensure(new Builder(doc), isDrawn(s.k) ? [...BASE, 'points'] : BASE);
  return b.push({ op: 'rows', at: b.view.at, r: b.table.rows.length, n: 1, rows: [rowOf(b, s)] }).ops;
}

/** Shape i changed: its row's cells. */
export function patchShape(doc: Doc, i: number, patch: Partial<Shape>): Op[] {
  const v = readDrawing(doc);
  const s = v.shapes[i];
  if (!s) return [];
  const next = { ...s, ...patch };
  const b = ensure(new Builder(doc), isDrawn(next.k) ? [...BASE, 'points'] : BASE);
  return tidy(patchRow(b, v.rows[i], next)).ops;
}

/** Shape i taken out, along with any joins to it; the joins that remain keep pointing at the right shapes. */
export function removeShape(doc: Doc, i: number): Op[] {
  const v = readDrawing(doc);
  if (!v.shapes[i]) return [];
  // What goes: the shape, and every join to it. Rows come out from the last, so each row number still holds.
  const gone = [i, ...v.shapes.flatMap((s, j) => (isLink(s.k) && (s.x === i || s.y === i) ? [j] : []))].sort((a, b) => b - a);
  const b = new Builder(doc);
  for (const j of gone) b.push({ op: 'rows', at: v.at, r: v.rows[j], n: 1 });
  // The shapes left are numbered without those: the joins read the table as it stands and are told where their shapes are now.
  const now = (old: number) => (gone.includes(old) ? undefined : old - gone.filter((g) => g < old).length);
  return tidy(renumber(b, now)).ops;
}

/** Shape i brought to the front (drawn last) or sent to the back; the joins follow. Where it ended up is given with the ops. */
export function restack(doc: Doc, i: number, toFront: boolean): { ops: Op[]; at: number } {
  const v = readDrawing(doc);
  const s = v.shapes[i];
  if (!s) return { ops: [], at: i };
  const n = v.shapes.length;
  const at = toFront ? n - 1 : 0;
  if (at === i) return { ops: [], at };
  const b = new Builder(doc);
  // Out, then back in at the far end: a row only moves by leaving and arriving.
  b.push({ op: 'rows', at: v.at, r: v.rows[i], n: 1 });
  const after = b.view;
  const r = toFront ? (after.rows[after.rows.length - 1] ?? -1) + 1 : (after.rows[0] ?? 0);
  b.push({ op: 'rows', at: v.at, r, n: 1, rows: [rowOf(b, s)] });
  const now = (old: number) => (old === i ? at : toFront ? (old > i ? old - 1 : old) : old < i ? old + 1 : old);
  return { ops: renumber(b, now).ops, at };
}

/** A copy of shape i, a little down and to the right, at the end. */
export function duplicate(doc: Doc, i: number): Op[] {
  const s = readDrawing(doc).shapes[i];
  return s && !isLink(s.k) ? addShape(doc, { ...s, x: s.x + GRID * 2, y: s.y + GRID * 2 }) : [];
}

/** The alt text: what the drawing shows, in words. */
export const setAlt = (doc: Doc, alt: string): Op[] => {
  const said = alt.replace(/\s+/g, ' ').trim();
  return (doc.head.alt ?? '') === said ? [] : [{ op: 'head', key: 'alt', value: said || undefined }];
};

/** Pixel mode on (a side) or off (0). */
export const setGrid = (doc: Doc, side: number): Op[] => (gridOf(doc.head.grid) === side ? [] : [{ op: 'head', key: 'grid', value: side ? String(side) : undefined }]);

/** The background tile ('' for none). */
export const setTile = (doc: Doc, ref: string): Op[] => ((doc.head.tile ?? '') === ref ? [] : [{ op: 'head', key: 'tile', value: ref || undefined }]);

/** The pixel grid as it now is: its paragraph replaced (or put in, or, empty, taken out). */
export function setPixels(doc: Doc, p: Tile): Op[] {
  const at = pixelsAt(doc);
  const text = pixelText(p);
  if (!text) return at >= 0 ? [{ op: 'splice', at, n: 1, blocks: [] }] : [];
  const block: Block = { k: 'p', runs: [{ t: text }] };
  return at >= 0 ? [{ op: 'splice', at, n: 1, blocks: [block] }] : [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [block] }];
}

/** Square (x, y) given this ink ('.' clears it). */
export function paintSquare(p: Tile, x: number, y: number, ink: string): Tile {
  if (!(ink === '.' || ink in TILE_INKS) || p.rows[y]?.[x] === undefined || p.rows[y][x] === ink) return p;
  return { n: p.n, rows: p.rows.map((row, ry) => (ry === y ? row.slice(0, x) + ink + row.slice(x + 1) : row)) };
}

/** Fill: every square joined to (x, y) of the same ink becomes this one. */
export function floodSquare(p: Tile, x: number, y: number, ink: string): Tile {
  const was = p.rows[y]?.[x];
  if (was === undefined || was === ink) return p;
  const grid = p.rows.map((r) => r.split(''));
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (grid[cy]?.[cx] !== was) continue;
    grid[cy][cx] = ink;
    stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
  }
  return { n: p.n, rows: grid.map((r) => r.join('')) };
}

/* ---------- the clipboard: shapes as a drawing of their own ---------- */

/** Joins kept only where both their shapes are there (and are no joins), renumbered past the ones dropped. */
function keepJoins(shapes: Shape[]): Shape[] {
  const ok = (n: number) => Number.isInteger(n) && !!shapes[n] && !isLink(shapes[n].k);
  const keep = shapes.map((s) => !isLink(s.k) || (ok(s.x) && ok(s.y) && s.x !== s.y));
  const now: number[] = [];
  let n = 0;
  keep.forEach((k, i) => (now[i] = k ? n++ : -1));
  return shapes.flatMap((s, i) => (!keep[i] ? [] : isLink(s.k) ? [{ ...s, x: now[s.x], y: now[s.y] }] : [s]));
}

/** Shapes picked out of a drawing by number, in the drawing's order, as a drawing of their own: the joins among them renumbered, joins to a shape left behind dropped. */
export function pickShapes(all: Shape[], picked: number[]): Shape[] {
  const order = [...new Set(picked)].filter((i) => all[i]).sort((a, b) => a - b);
  const now = new Map(order.map((old, i) => [old, i]));
  return keepJoins(order.map((i) => (isLink(all[i].k) ? { ...all[i], x: now.get(all[i].x) ?? -1, y: now.get(all[i].y) ?? -1 } : all[i])));
}

/** Shapes as the table that holds them (Points only when one is drawn with the pen or by hand). */
export function shapesTable(shapes: Shape[]): TableBlock {
  const fields = shapes.some((s) => isDrawn(s.k)) ? [...BASE, 'points' as const] : BASE;
  return { k: 'table', cols: fields.map(col), rows: shapes.map((s) => fields.map((f) => shapeCells(s)[f])) };
}

/** Shapes as a complete drawing in TLO: what the clipboard's text holds. */
export const shapesToTlo = (shapes: Shape[]): string => write({ head: {}, blocks: [shapesTable(shapes)] });

/** Shapes read from pasted text: the first table with a Kind column, its joins numbered within it (joins to shapes not there dropped). [] when there is none. */
export function shapesFromText(text: string): Shape[] {
  const doc = parse(text.replace(/\r\n?/g, '\n'));
  const at = shapesAt(doc);
  return at < 0 ? [] : keepJoins(tableShapes(doc.blocks[at] as TableBlock).shapes);
}

/**
 * Shapes pasted into a drawing: added at the end as one `rows` op (after the table's birth or a missing
 * column, if need be), each a grid step down and to the right of where it was (further, while a shape already
 * sits there, so a paste over its copy shows), the joins among them renumbered to their new rows. `sel` is the
 * last pasted shape that is no join (the one drawn on top).
 */
export function pasteShapes(doc: Doc, shapes: Shape[]): { ops: Op[]; sel: number } {
  const kept = keepJoins(shapes);
  if (!kept.length) return { ops: [], sel: -1 };
  const have = readDrawing(doc).shapes;
  const base = have.length;
  const first = kept.find((s) => !isLink(s.k));
  let d = GRID;
  while (first && have.some((s) => !isLink(s.k) && s.k === first.k && s.x === first.x + d && s.y === first.y + d)) d += GRID;
  const moved = kept.map((s) => (isLink(s.k) ? { ...s, x: s.x + base, y: s.y + base } : { ...s, x: s.x + d, y: s.y + d }));
  const b = ensure(new Builder(doc), moved.some((s) => isDrawn(s.k)) ? [...BASE, 'points'] : BASE);
  b.push({ op: 'rows', at: b.view.at, r: b.table.rows.length, n: moved.length, rows: moved.map((s) => rowOf(b, s)) });
  let last = moved.length - 1;
  while (last > 0 && isLink(moved[last].k)) last--;
  return { ops: b.ops, sel: base + last };
}
