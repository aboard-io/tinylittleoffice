import { PALETTE } from './palette.ts';
import { parse, write, takeHead, withHead, type Block } from './tlo.ts';
/**
 * Drawing document model. The text is TLO (lib/tlo.ts): a table, a row per
 * shape, and the alt text in the header:
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
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * X, Y as the start and W, H as the distance to the end. Style is the fill
 * (0, 1 or 2), then optionally a colour letter and a text size digit: "1",
 * "2b", "0r3". Black and the normal text size are the defaults and are left
 * out.
 *
 * Kinds: r rectangle, o rounded box, e ellipse, d diamond, h hexagon,
 * p parallelogram, c cylinder, n note, t text, i icon (its label is the
 * icon's name), l line, a arrow, v any shape (its corners in a Points
 * column, there only when one is drawn), and two that join shapes: k
 * (arrow) and j (line). For those, X and Y are not places but the numbers of
 * the two shapes joined, counting rows from 0, so the join follows its
 * shapes wherever they go. Read leniently, a kind may be named in words
 * ("rectangle", "arrow") and the columns may come in any order.
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

/** What a drawing shows, said in words for anyone who cannot see it (alt text): the header's "alt". '' when there is none. */
export const altOf = (text: string): string => takeHead(text, ['alt'])[0].alt ?? '';

/** The drawing's text with its alt text set (or taken out, when empty). */
export const withAlt = (text: string, alt: string): string => withHead(text, { alt: alt.replace(/\s+/g, ' ').trim() });

/**
 * A description made from the shapes themselves, when nobody wrote one: what
 * is labelled, and what leads to what. A start, not a substitute.
 */
export function describeDrawing(shapes: Shape[]): string {
  const named = (i: number) => iconOf(shapes[i]?.text ?? '')[1].trim() || iconOf(shapes[i]?.text ?? '')[0];
  const things = shapes.map((s, i) => (isLink(s.k) ? '' : named(i))).filter(Boolean);
  const joins = shapes
    .filter((s) => isLink(s.k) && named(s.x) && named(s.y))
    .map((s) => `${named(s.x)} ${s.k === 'k' ? 'leads to' : 'joins'} ${named(s.y)}${iconOf(s.text)[1].trim() ? ` (${iconOf(s.text)[1].trim()})` : ''}`);
  if (!shapes.length) return '';
  const head = things.length ? `A drawing of ${things.join(', ')}.` : `A drawing of ${shapes.length} unlabelled shape${shapes.length === 1 ? '' : 's'}.`;
  return joins.length ? `${head} ${joins.join('; ')}.` : head;
}

/** Kinds by name, for a table written by hand. */
const NAMED: Record<string, Kind> = { rect: 'r', rectangle: 'r', box: 'o', rounded: 'o', ellipse: 'e', circle: 'e', oval: 'e', diamond: 'd', hexagon: 'h', parallelogram: 'p', cylinder: 'c', database: 'c', note: 'n', icon: 'i', line: 'l', arrow: 'a', text: 't', shape: 'v', join: 'k', link: 'j' };
const COLS = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
type Table = Extract<Block, { k: 'table' }>;

/** The table of shapes: the first table with a Kind column. */
export const shapesBlock = (blocks: Block[]) => blocks.find((b) => b.k === 'table' && b.head.some((h) => /^kind$/i.test(h.trim()))) as Table | undefined;

/** A table's rows as shapes. Rows that are not a shape are left out. */
export function tableShapes(table: Table | undefined): Shape[] {
  if (!table) return [];
  const at = (c: string) => table.head.findIndex((h) => h.trim().toLowerCase() === c);
  const cols = Object.fromEntries([...COLS, 'Points'].map((c) => [c, at(c.toLowerCase())]));
  const out: Shape[] = [];
  for (const row of table.rows) {
    const get = (c: string) => (cols[c] >= 0 ? (row[cols[c]] ?? '').trim() : '');
    const word = get('Kind').toLowerCase();
    const k = (KINDS.includes(word as Kind) ? word : NAMED[word]) as Kind | undefined;
    if (!k) continue;
    const n = (c: string) => Math.round(parseFloat(get(c))) || 0;
    const f = get('Style');
    const style = /^([0-2])([a-z]?)([1-4]?)$/.exec(f);
    const shape: Shape = {
      k,
      // (A join's x and y are shape numbers, not places.)
      x: n('X') * (isLink(k) ? 1 : GRID),
      y: n('Y') * (isLink(k) ? 1 : GRID),
      w: n('W') * GRID,
      h: n('H') * GRID,
      f: (style ? +style[1] : Math.min(2, Math.max(0, parseInt(f, 10) || 0))) as Fill,
      text: get('Label'),
    };
    if (k === 'v') shape.pts = ptsOf(get('Points'));
    if (style && style[2] in COLORS) shape.c = style[2] as Color;
    if (style && style[3] && style[3] !== '2') shape.z = +style[3] as TextSize;
    out.push(shape);
  }
  return out;
}

/** Shapes as their table (with a Points column when one of them is drawn with the pen). */
export function shapesTable(shapes: Shape[]): Table {
  const g = (n: number) => String(Math.round(n / GRID));
  const pen = shapes.some((s) => s.k === 'v');
  return {
    k: 'table',
    head: pen ? [...COLS, 'Points'] : COLS,
    rows: shapes.map((s) => [s.k, isLink(s.k) ? String(s.x) : g(s.x), isLink(s.k) ? String(s.y) : g(s.y), g(s.w), g(s.h), `${s.f}${s.c ?? ''}${s.z && s.z !== 2 ? s.z : ''}`, s.text.replace(/\n/g, ' '), ...(pen ? [s.k === 'v' ? ptsText(s.pts ?? []) : ''] : [])]),
  };
}

export const parseDrawing = (text: string): Shape[] => tableShapes(shapesBlock(parse(text).blocks));

export function serializeDrawing(shapes: Shape[], alt = ''): string {
  const said = alt.replace(/\s+/g, ' ').trim();
  return write({ head: said ? { alt: said } : {}, blocks: shapes.length ? [shapesTable(shapes)] : [] }).replace(/\n$/, '');
}

/**
 * A drawing as a person or a program loosely writes it: its table, tidied;
 * or, with no table, a box for each thing listed (four to a row), and a
 * quote saying what it shows.
 */
export function readDrawing(text: string): string {
  const doc = parse(text);
  const quote = doc.blocks.find((b) => b.k === 'quote');
  const alt = doc.head.alt ?? (quote?.k === 'quote' ? quote.text : '');
  if (shapesBlock(doc.blocks)) return serializeDrawing(parseDrawing(text), alt);
  const labels = doc.blocks.flatMap((b) => (b.k === 'li' ? [b.text] : b.k === 'p' || b.k === 'h' ? b.text.split('\n') : [])).map((t) => t.trim()).filter(Boolean);
  return serializeDrawing(labels.map((text, i) => ({ k: 'r', x: (2 + (i % 4) * 14) * GRID, y: (2 + Math.floor(i / 4) * 8) * GRID, w: 12 * GRID, h: 6 * GRID, f: 1, text })), alt);
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
