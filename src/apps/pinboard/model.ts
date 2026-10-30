/**
 * A pinboard as a view of the document, and its commands as operations. The document is the kernel's: one table, a
 * row per thing pinned, and a picture's bytes, where a host keeps them, as the image fence every app knows:
 *
 *   ---
 *   title: Rear Window
 *   ---
 *   Id | Kind | X | Y | W | H | Color | Words
 *   --- | --- | --- | --- | --- | --- | --- | ---
 *   act1 | frame | 0 | 0 | 720 | 440 | blue | Act one
 *   n1 | note | 40 | 80 | 200 | 160 |  | Jeff watches **everyone**
 *   p1 | picture | 280 | 80 | 320 | 180 |  |
 *   a1 | arrow | n1 | p1 |  |  |  | sees
 *   s1 | pen | 60 | 300 | 160 | 60 | pink | 0:100;40:0;100:60
 *
 *   ```image {#p1 alt="The courtyard at night" w=1280 h=720}
 *   asset:7f3a9c
 *   ```
 *
 * X, Y, W and H are whole pixels on an unbounded canvas (X and Y may be negative). Kinds: `note` (a sticky note, its
 * words on a color), `text` (words on nothing), `picture`, `frame` (a titled region drawn behind everything else),
 * `pen` (a freehand stroke: its Words are its corners, x:y pairs as hundredths of its box, as the Drawing Tool keeps
 * a stroke's), and two that join things, `arrow` and `line`, whose X and Y are the ids of the two things joined, so
 * a join follows them wherever they go. Color is one of `yellow orange pink purple blue green`, or blank for the
 * kind's own (a yellow note, an ink's black, a gray frame). Words are inline Markdown (`**bold**`, `*italic*`), one
 * line, wrapped where they are drawn. The rows are drawn in their order, frames first and joins last, so a later row
 * is on top; Bring to front takes a row out and puts it back at the end.
 *
 * Why an Id column, where the Drawing Tool numbers its rows: the board is edited by several people at once
 * (docs/kernel.md §12, a watch party's viewers each in their own window), and a row's number is not a name that
 * survives that. When one person adds a note while another draws an arrow to the fifth row, the kernel's transform
 * shifts the arrow's own row past the note, but it cannot know that the "4" in the arrow's X cell meant a row, so the
 * arrow would land on the wrong thing; the Drawing Tool renumbers its joins with `cells` ops that are themselves made
 * against a numbering the other person's edit has already changed. An id is a word the kernel never touches: rows
 * come and go around it, a join keeps naming what it named, a picture's fence is found by it (`{#p1}`) wherever the
 * blocks move, and the editor keeps what is in hand by it across another's edits. Ids are short, a letter for the
 * kind and three of four random letters and digits, made where the thing is made (`newId`); two people making the
 * same id at the same moment is a chance of one in 1.7 million, and a duplicate is still drawn, only a join to it
 * finding the first.
 *
 * Every command here is pure: given the document and what to do, the `Op[]` that does it, chosen so that two people
 * rarely meet. Moving or resizing a thing is `cells` on its row's X and Y (or W and H): different things are
 * different cells, so two people moving two things never conflict, and two moving one, the later wins. Its words and
 * its color are `cells` on their own cells. A thing added is a `rows` op putting one row in at the table's end (and a
 * picture's fence a `splice` at the document's end); taken away, a `rows` op taking its row out, with every join to
 * it (and its fence). The table is made with the board (blank() holds it) and never taken out, so two people's first
 * notes land in one table; a document without one is given it by a `splice` (and a column it lacks by `cols`).
 */
import { apply, columnsOf, imageOf, parseInline, plainText, writeInline, type Block, type Column, type Doc, type Image, type Op, type Run, type TableBlock, type TextNode } from '../../doc/index.ts';
import type { FenceBlock } from '../../doc/model.ts';

export const KINDS = ['note', 'text', 'picture', 'frame', 'pen', 'arrow', 'line'] as const;
export type Kind = (typeof KINDS)[number];
/** The colors a thing may take, by name; '' is the kind's own. */
export const COLOR_NAMES = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green'] as const;
export type Color = (typeof COLOR_NAMES)[number];

/** Each color as a note's paper and as an ink (words, a stroke, an arrow, a frame's edge), told apart in the light and the dark. */
export const COLORS: Record<Color, { paper: string; ink: string }> = {
  yellow: { paper: '#fde68a', ink: '#a16207' },
  orange: { paper: '#fed7aa', ink: '#c2410c' },
  pink: { paper: '#fbcfe8', ink: '#be185d' },
  purple: { paper: '#ddd6fe', ink: '#7e22ce' },
  blue: { paper: '#bfdbfe', ink: '#1d4ed8' },
  green: { paper: '#bbf7d0', ink: '#15803d' },
};
/** The words on a note: dark on every paper, in the dark theme too (a note is paper). */
export const NOTE_INK = '#1f2937';

/** The columns, in the order the board writes them. */
const FIELDS = ['id', 'kind', 'x', 'y', 'w', 'h', 'color', 'words'] as const;
type Field = (typeof FIELDS)[number];
const NAMES: Record<Field, string> = { id: 'Id', kind: 'Kind', x: 'X', y: 'Y', w: 'W', h: 'H', color: 'Color', words: 'Words' };
const PATTERNS: Record<Field, RegExp> = { id: /^id$/, kind: /^kind$/, x: /^x$/, y: /^y$/, w: /^(w|width)$/, h: /^(h|height)$/, color: /^colou?r$/, words: /^(words|text|label)$/ };
export type Cols = Record<Field, number>;
const colsOf = (t: { cols: Column[] }): Cols => Object.fromEntries(FIELDS.map((f, i) => [f, columnsOf(t, ...FIELDS.map((g) => PATTERNS[g]))[i]])) as Cols;
const NONE: Cols = { id: -1, kind: -1, x: -1, y: -1, w: -1, h: -1, color: -1, words: -1 };

/** The default sizes of a new thing, in pixels. */
export const SIZES: Record<'note' | 'text' | 'frame' | 'picture', [number, number]> = { note: [200, 160], text: [240, 32], frame: [640, 400], picture: [320, 240] };
/** The smallest a thing is made by its handle. */
export const MIN = 24;
/** A frame's title strip, along its top inside it: where it is picked up. */
export const FRAME_HEAD = 36;

export interface Item {
  /** Its id (a row with none has one made for it here, `#<row>`, which no join can name and nothing writes). */
  id: string;
  k: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  color: Color | '';
  /** Its words as inline Markdown; '' for a pen's stroke and a picture. */
  words: string;
  /** A join's ends: the ids of the things it joins. */
  from?: string;
  to?: string;
  /** A pen's corners, x, y pairs as hundredths of its box. */
  pts?: number[];
  /** A picture's fence, read: its reference, its words (alt) and its size; absent where its fence is missing. */
  image?: Image;
  /** The row it is read from. */
  row: number;
}

/** What the board draws, read from the document. */
export interface BoardView {
  /** The table, or -1 while there is none. */
  at: number;
  cols: Cols;
  /** Each thing in the table's order (rows that are no thing are skipped and left alone). */
  items: Item[];
  /** A thing by its id (the first, where two share one). */
  byId: Map<string, Item>;
  /** Each picture's fence, by the id it carries: its block. */
  fences: Map<string, number>;
}

/** The table: the first with a Kind column. */
const tableAt = (doc: Doc): number => doc.blocks.findIndex((b) => b.k === 'table' && b.cols.some((c) => /^kind$/i.test(c.name.trim())));

/** Points as the text keeps them: "12:0;100:50". */
export const ptsText = (pts: number[]): string => {
  const out: string[] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) out.push(`${Math.round(pts[i])}:${Math.round(pts[i + 1])}`);
  return out.join(';');
};
export const ptsOf = (text: string): number[] =>
  text
    .split(';')
    .flatMap((p) => p.split(':').map((n) => +n))
    .filter((n) => Number.isFinite(n));

/** Words as a cell keeps them: one line; an "=" at the start kept as words (an apostrophe before it), so no formula is ever made of them. */
const cellWords = (words: string): string => {
  const one = words.replace(/\s*\n\s*/g, ' ');
  return one.startsWith('=') ? `'${one}` : one;
};
const wordsOfCell = (cell: string): string => (cell.startsWith("'=") ? cell.slice(1) : cell);

const isJoin = (k: Kind): boolean => k === 'arrow' || k === 'line';
export { isJoin };

function rowItem(row: string[], r: number, cols: Cols): Item | null {
  const get = (f: Field) => (cols[f] >= 0 ? (row[cols[f]] ?? '').trim() : '');
  const k = get('kind').toLowerCase() as Kind;
  if (!(KINDS as readonly string[]).includes(k)) return null;
  const n = (f: Field) => Math.round(parseFloat(get(f))) || 0;
  const c = get('color').toLowerCase();
  const color = ((COLOR_NAMES as readonly string[]).includes(c) ? c : '') as Color | '';
  const id = get('id') || `#${r}`;
  const words = cols.words >= 0 ? wordsOfCell(row[cols.words] ?? '') : '';
  if (isJoin(k)) return { id, k, x: 0, y: 0, w: 0, h: 0, color, words, from: get('x'), to: get('y'), row: r };
  const [dw, dh] = k === 'pen' ? [MIN, MIN] : (SIZES[k as keyof typeof SIZES] ?? [MIN, MIN]);
  const item: Item = { id, k, x: n('x'), y: n('y'), w: Math.max(1, n('w') || dw), h: Math.max(1, n('h') || dh), color, words: k === 'pen' || k === 'picture' ? '' : words, row: r };
  if (k === 'pen') item.pts = ptsOf(words);
  return item;
}

export function readBoard(doc: Doc): BoardView {
  const at = tableAt(doc);
  const t = at >= 0 ? (doc.blocks[at] as TableBlock) : null;
  const cols = t ? colsOf(t) : NONE;
  const fences = new Map<string, number>();
  doc.blocks.forEach((b, i) => {
    const id = b.k === 'fence' ? b.a?.id : undefined;
    if (id && imageOf(b) && !fences.has(id)) fences.set(id, i);
  });
  const items: Item[] = [];
  const byId = new Map<string, Item>();
  t?.rows.forEach((row, r) => {
    const it = rowItem(row, r, cols);
    if (!it) return;
    if (it.k === 'picture' && fences.has(it.id)) it.image = imageOf(doc.blocks[fences.get(it.id)!])!;
    items.push(it);
    if (!byId.has(it.id)) byId.set(it.id, it);
  });
  return { at, cols, items, byId, fences };
}

/** The things in the order they are drawn: frames at the back, then the rest as their rows come, joins on top. */
export const drawOrder = (v: BoardView): Item[] => [...v.items.filter((i) => i.k === 'frame'), ...v.items.filter((i) => i.k !== 'frame' && !isJoin(i.k)), ...v.items.filter((i) => isJoin(i.k))];

/** A note's paper, or a thing's ink, by its color: the theme's ink where it has none. */
export const paperOf = (it: Pick<Item, 'color'>): string => COLORS[it.color || 'yellow'].paper;
export const inkOf = (it: Pick<Item, 'color'>, ink: string): string => (it.color ? COLORS[it.color].ink : ink);

/* ---------- geometry the editor and the view share ---------- */

export type Box = [x: number, y: number, w: number, h: number];

/** Where a join runs: from the edge of one thing's box toward the other's centre, to the edge of the other. Null where either is missing (or is a join). */
export function joinEnds(j: Item, v: Pick<BoardView, 'byId'>): [number, number, number, number] | null {
  const a = j.from ? v.byId.get(j.from) : undefined;
  const b = j.to ? v.byId.get(j.to) : undefined;
  if (!a || !b || a === b || isJoin(a.k) || isJoin(b.k)) return null;
  const [ax, ay] = [a.x + a.w / 2, a.y + a.h / 2];
  const [bx, by] = [b.x + b.w / 2, b.y + b.h / 2];
  const edge = (q: Item, cx: number, cy: number, tx: number, ty: number): [number, number] => {
    const [dx, dy] = [tx - cx, ty - cy];
    if (!dx && !dy) return [cx, cy];
    const k = Math.min(dx ? (q.w / 2 + 6) / Math.abs(dx) : Infinity, dy ? (q.h / 2 + 6) / Math.abs(dy) : Infinity, 1);
    return [cx + dx * k, cy + dy * k];
  };
  return [...edge(a, ax, ay, bx, by), ...edge(b, bx, by, ax, ay)];
}

/** A thing's box as drawn (a join's, the box round its line); null for a join that joins nothing there. */
export function boxOf(it: Item, v: Pick<BoardView, 'byId'>): Box | null {
  if (!isJoin(it.k)) return [it.x, it.y, it.w, it.h];
  const e = joinEnds(it, v);
  return e ? [Math.min(e[0], e[2]), Math.min(e[1], e[3]), Math.abs(e[2] - e[0]), Math.abs(e[3] - e[1])] : null;
}

/** The box round every thing given (all of them by default); null for none. */
export function boundsOf(v: BoardView, items: Item[] = v.items): Box | null {
  const boxes = items.map((i) => boxOf(i, v)).filter((b): b is Box => !!b);
  if (!boxes.length) return null;
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}

const inside = (b: Box, l: number, t: number, r: number, bt: number) => b[0] >= l && b[1] >= t && b[0] + b[2] <= r && b[1] + b[3] <= bt;

/** The things a box from (x0, y0) to (x1, y1) takes: every thing wholly inside it, and every join whose two ends are taken. Ids, in the table's order. */
export function itemsWithin(v: BoardView, x0: number, y0: number, x1: number, y1: number): string[] {
  const [l, t, r, b] = [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
  const taken = new Set(v.items.filter((i) => !isJoin(i.k) && inside([i.x, i.y, i.w, i.h], l, t, r, b)).map((i) => i.id));
  return v.items.filter((i) => taken.has(i.id) || (isJoin(i.k) && taken.has(i.from!) && taken.has(i.to!))).map((i) => i.id);
}

/** What a frame holds: every other thing (frames too) wholly inside it, which goes with it when it moves. Ids. */
export function frameHolds(v: BoardView, frame: Item): string[] {
  return v.items.filter((i) => i !== frame && !isJoin(i.k) && inside([i.x, i.y, i.w, i.h], frame.x, frame.y, frame.x + frame.w, frame.y + frame.h)).map((i) => i.id);
}

/** A path with the points that do not change its course taken out (Ramer–Douglas–Peucker), so a hand's wobble is a few corners. */
export function simplify(pts: [number, number][], eps = 1.5): [number, number][] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let far = 0;
  let at = 0;
  pts.forEach((p, i) => {
    const d = len ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > far) ((far = d), (at = i));
  });
  return far > eps ? [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)] : [a, b];
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));

/** Points drawn with the pen (in canvas pixels) as a stroke: its box theirs, its corners hundredths of it. Null for fewer than two. */
export function penStroke(pts: [number, number][], id: string, color: Color | '' = ''): Item | null {
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, y0] = [Math.round(Math.min(...xs)), Math.round(Math.min(...ys))];
  const [w, h] = [Math.max(1, Math.round(Math.max(...xs)) - x0), Math.max(1, Math.round(Math.max(...ys)) - y0)];
  return { id, k: 'pen', x: x0, y: y0, w, h, color, words: '', pts: pts.flatMap(([px, py]) => [clamp100(((px - x0) / w) * 100), clamp100(((py - y0) / h) * 100)]), row: -1 };
}

/* ---------- ids ---------- */

const LETTER: Record<Kind, string> = { note: 'n', text: 't', picture: 'p', frame: 'f', pen: 's', arrow: 'a', line: 'l' };
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
/** A new id for a thing of kind `k`: its letter and four random letters and digits, none the board has already (`taken`). */
export function newId(k: Kind, taken: { has(id: string): boolean }, rand: () => number = Math.random): string {
  for (let tries = 0; ; tries++) {
    let id = LETTER[k];
    for (let i = 0; i < 4; i++) id += ALPHABET[Math.floor(rand() * ALPHABET.length) % ALPHABET.length];
    // A chance that keeps giving one answer (a test's) is given a number after it.
    if (tries > 8) id += tries;
    if (!taken.has(id)) return id;
  }
}

/* ---------- commands: each the ops that do it ---------- */

/** Ops gathered in order, each applied to a running copy of the document so the next sees what it did. */
class Builder {
  ops: Op[] = [];
  doc: Doc;
  constructor(doc: Doc) {
    this.doc = doc;
  }
  push(...ops: Op[]): this {
    for (const op of ops) {
      this.doc = apply(this.doc, op);
      this.ops.push(op);
    }
    return this;
  }
  get view(): BoardView {
    return readBoard(this.doc);
  }
  get table(): TableBlock {
    return this.doc.blocks[this.view.at] as TableBlock;
  }
}

const column = (f: Field): Column => ({ name: NAMES[f], type: 'text' });
/** The board's empty table, as a new board holds it. */
export const emptyTable = (): TableBlock => ({ k: 'table', cols: FIELDS.map(column), rows: [] });

/** The document given its table if it has none, and the columns it lacks. */
function ensure(b: Builder): Builder {
  if (b.view.at < 0) b.push({ op: 'splice', at: b.doc.blocks.length, n: 0, blocks: [emptyTable()] });
  const missing = FIELDS.filter((f) => b.view.cols[f] < 0);
  if (missing.length) b.push({ op: 'cols', at: b.view.at, c: b.table.cols.length, n: 0, cols: missing.map(column) });
  return b;
}

/** A thing's cells, by field. */
function cellsOf(it: Item): Record<Field, string> {
  const n = (v: number) => String(Math.round(v));
  const join = isJoin(it.k);
  return {
    id: it.id.startsWith('#') ? '' : it.id,
    kind: it.k,
    x: join ? (it.from ?? '') : n(it.x),
    y: join ? (it.to ?? '') : n(it.y),
    w: join ? '' : n(it.w),
    h: join ? '' : n(it.h),
    color: it.color,
    words: it.k === 'pen' ? ptsText(it.pts ?? []) : it.k === 'picture' ? '' : cellWords(it.words),
  };
}

/** A thing as its row in the table as it stands (every column, ours filled, the others blank). */
function rowOf(b: Builder, it: Item): string[] {
  const cells = cellsOf(it);
  const cols = b.view.cols;
  const row = b.table.cols.map(() => '');
  for (const f of FIELDS) if (cols[f] >= 0) row[cols[f]] = cells[f];
  return row;
}

/** The cells of row r that differ from what the thing writes: one `cells` op per run of changed columns. */
function patchRow(b: Builder, r: number, it: Item): Builder {
  const cells = cellsOf(it);
  const cols = b.view.cols;
  const row = b.table.rows[r];
  const want = row.slice();
  for (const f of FIELDS) if (cols[f] >= 0 && (f !== 'id' || cells.id)) want[cols[f]] = cells[f];
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

/** What may be changed of a thing. */
export type Patch = Partial<Pick<Item, 'k' | 'x' | 'y' | 'w' | 'h' | 'color' | 'words' | 'pts' | 'from' | 'to'>>;

/** A thing as it is added: its kind and place, its id made by the caller (`newId`). */
export type NewItem = Omit<Item, 'row' | 'image'> & { row?: number };

/** New things, at the end of the table (on top), as one `rows` op; a picture's fence given with it goes at the document's end, carrying its id. */
function addItems(doc: Doc, items: NewItem[], fences: FenceBlock[] = []): Op[] {
  if (!items.length) return [];
  const b = ensure(new Builder(doc));
  b.push({ op: 'rows', at: b.view.at, r: b.table.rows.length, n: items.length, rows: items.map((it) => rowOf(b, { ...it, row: -1 })) });
  if (fences.length) b.push({ op: 'splice', at: b.doc.blocks.length, n: 0, blocks: fences });
  return b.ops;
}
export const addItem = (doc: Doc, it: NewItem): Op[] => addItems(doc, [it]);

/** A picture put in: its row, and its fence (from kit/draw/image-picture.ts putImage) carrying the row's id. */
export function addPicture(doc: Doc, it: NewItem, fence: FenceBlock): Op[] {
  return addItems(doc, [{ ...it, k: 'picture', words: '' }], [{ ...fence, a: { ...fence.a, id: it.id } }]);
}

/** Several things changed, each its own patch, by id: the cells of each, written against the document the ones before it left. */
export function patchItems(doc: Doc, patches: [id: string, patch: Patch][]): Op[] {
  const b = new Builder(doc);
  for (const [id, p] of patches) {
    const v = b.view;
    const it = v.items.find((i) => i.id === id);
    if (!it) continue;
    patchRow(b, it.row, { ...it, ...p });
  }
  return b.ops;
}
export const patchItem = (doc: Doc, id: string, p: Patch): Op[] => patchItems(doc, [[id, p]]);

/** Things moved by (dx, dy): their X and Y cells, each thing its own op. */
export function moveItems(doc: Doc, ids: string[], dx: number, dy: number): Op[] {
  const v = readBoard(doc);
  if (!dx && !dy) return [];
  return patchItems(
    doc,
    ids.flatMap((id): [string, Patch][] => {
      const it = v.items.find((i) => i.id === id);
      return it && !isJoin(it.k) ? [[id, { x: it.x + dx, y: it.y + dy }]] : [];
    }),
  );
}

/** The ids given and every join to one of them, and every join that joins nothing there any more: what goes when they go. */
function goneWith(v: BoardView, ids: string[]): Set<string> {
  const gone = new Set(ids.filter((id) => v.items.some((i) => i.id === id)));
  for (const i of v.items) if (isJoin(i.k) && (gone.has(i.from!) || gone.has(i.to!) || !joinEnds(i, v))) gone.add(i.id);
  return gone;
}

/** Things taken out, with every join to them (and any join left joining nothing), and a picture's fence. */
export function removeItems(doc: Doc, ids: string[]): Op[] {
  const v = readBoard(doc);
  if (!ids.some((id) => v.items.some((i) => i.id === id))) return [];
  const gone = goneWith(v, ids);
  const rows = v.items
    .filter((i) => gone.has(i.id))
    .map((i) => i.row)
    .sort((a, b) => b - a);
  const b = new Builder(doc);
  for (const r of rows) b.push({ op: 'rows', at: v.at, r, n: 1 });
  // A fence goes only when no row is left that names it.
  const left = new Set(b.view.items.map((i) => i.id));
  const fences = [...v.fences]
    .filter(([id]) => gone.has(id) && !left.has(id))
    .map(([, at]) => at)
    .sort((a, b) => b - a);
  for (const at of fences) b.push({ op: 'splice', at, n: 1, blocks: [] });
  return b.ops;
}

/** Copies of things (and the joins among them), `by` pixels down and to the right, on top; `ids` are the copies'. */
export function duplicateItems(doc: Doc, ids: string[], by = 24, rand: () => number = Math.random): { ops: Op[]; ids: string[] } {
  const v = readBoard(doc);
  const pick = new Set(ids);
  const things = v.items.filter((i) => pick.has(i.id) && !isJoin(i.k));
  if (!things.length) return { ops: [], ids: [] };
  const taken = new Set(v.items.map((i) => i.id));
  const now = new Map<string, string>();
  for (const it of things) {
    const id = newId(it.k, taken, rand);
    taken.add(id);
    now.set(it.id, id);
  }
  const joins = v.items.filter((i) => isJoin(i.k) && now.has(i.from!) && now.has(i.to!));
  const copies: NewItem[] = [
    ...things.map((it) => ({ ...it, id: now.get(it.id)!, x: it.x + by, y: it.y + by })),
    ...joins.map((j) => {
      const id = newId(j.k, taken, rand);
      taken.add(id);
      return { ...j, id, from: now.get(j.from!), to: now.get(j.to!) };
    }),
  ];
  const fences = things.flatMap((it): FenceBlock[] => {
    const at = v.fences.get(it.id);
    const f = at === undefined ? undefined : (doc.blocks[at] as FenceBlock);
    return f ? [{ ...f, a: { ...f.a, id: now.get(it.id)! } }] : [];
  });
  return { ops: addItems(doc, copies, fences), ids: copies.map((c) => c.id) };
}

/** Things brought to the front (drawn last among their kind), keeping their order among themselves: each row taken out and put back at the end. */
export function toFront(doc: Doc, ids: string[]): Op[] {
  const v = readBoard(doc);
  const pick = new Set(ids);
  const moving = v.items.filter((i) => pick.has(i.id));
  if (!moving.length) return [];
  const t = doc.blocks[v.at] as TableBlock;
  // Already the table's last rows, in this order: nothing to do.
  if (moving.every((i, n) => i.row === t.rows.length - moving.length + n)) return [];
  const b = new Builder(doc);
  const rows = moving.map((i) => t.rows[i.row]);
  for (const r of moving.map((i) => i.row).sort((a, c) => c - a)) b.push({ op: 'rows', at: v.at, r, n: 1 });
  b.push({ op: 'rows', at: v.at, r: b.table.rows.length, n: rows.length, rows });
  return b.ops;
}

/** A join from one thing to another (an arrow, or a line), on top. Nothing where either is missing or a join, or they are the same. */
export function joinItems(doc: Doc, from: string, to: string, id: string, k: 'arrow' | 'line' = 'arrow'): Op[] {
  const v = readBoard(doc);
  const [a, b] = [v.byId.get(from), v.byId.get(to)];
  if (!a || !b || a === b || isJoin(a.k) || isJoin(b.k) || from.startsWith('#') || to.startsWith('#')) return [];
  return addItem(doc, { id, k, x: 0, y: 0, w: 0, h: 0, color: '', words: '', from, to });
}

/** A picture's words (its alt): its fence replaced by itself with them, every other attribute riding along. */
export function setAlt(doc: Doc, id: string, alt: string): Op[] {
  const v = readBoard(doc);
  const at = v.fences.get(id);
  if (at === undefined) return [];
  const f = doc.blocks[at] as FenceBlock;
  const said = alt.replace(/\s+/g, ' ').trim();
  if ((f.a?.kv?.alt ?? '') === said) return [];
  const kv: Record<string, string> = { ...(f.a?.kv ?? {}) };
  if (said) kv.alt = said;
  else delete kv.alt;
  // alt first, as imageBlock writes it.
  const { alt: _a, ...rest } = kv;
  const ordered = said ? { alt: said, ...rest } : rest;
  const block: Block = { ...f, a: { ...f.a, kv: ordered } };
  return [{ op: 'splice', at, n: 1, blocks: [block] }];
}

/* ---------- words ---------- */

/** A thing's words as runs (bold, italic…): links and notes are not a thing's, their words stay plain. */
export function wordsRuns(words: string): Run[] {
  return parseInline(words).flatMap((r): Run[] => {
    if (r.fn !== undefined) return [];
    if (r.ic) return [{ t: `:${r.ic}:` }];
    if (!r.href) return [r];
    const out = { ...r };
    delete out.href;
    return [out];
  });
}
/** Runs as a thing's words: inline Markdown on one line. */
export const runsWords = (runs: Run[]): string => writeInline(runs.map((r) => ({ ...r, t: r.t.replace(/\n/g, ' ') })));
/** A thing's words, plain. */
export const plainWords = (words: string): string => plainText(wordsRuns(words)).replace(/\s+/g, ' ').trim();

/** What a thing is called, read aloud: its words, a picture's alt. */
export const nameOf = (it: Item): string => (it.k === 'picture' ? (it.image?.alt ?? '') : plainWords(it.words));

/**
 * The board as text (AppDef.text): each frame's title as a heading and the words of what it holds, then the words of
 * what no frame holds, then each arrow as "this → that", in words. Nothing of where anything sits.
 */
export function boardText(v: BoardView): TextNode[] {
  const out: TextNode[] = [];
  const held = new Set<string>();
  const said = (ids: string[]) =>
    ids
      .map((id) => v.byId.get(id))
      .filter((i): i is Item => !!i && i.k !== 'frame' && i.k !== 'pen' && !isJoin(i.k))
      .map(nameOf)
      .filter(Boolean);
  for (const f of v.items.filter((i) => i.k === 'frame')) {
    const ids = frameHolds(v, f).filter((id) => !held.has(id));
    ids.forEach((id) => held.add(id));
    out.push({ k: 'h', level: 2, runs: [{ t: plainWords(f.words) || '—' }] });
    const words = said(ids);
    if (words.length) out.push({ k: 'list', ord: false, items: words.map((t) => ({ runs: [{ t }] })) });
  }
  const loose = said(v.items.filter((i) => !held.has(i.id)).map((i) => i.id));
  if (loose.length) out.push({ k: 'list', ord: false, items: loose.map((t) => ({ runs: [{ t }] })) });
  const joins = v.items
    .filter((j) => isJoin(j.k) && joinEnds(j, v))
    .map((j) => {
      const [a, b] = [nameOf(v.byId.get(j.from!)!), nameOf(v.byId.get(j.to!)!)];
      return `${a || '…'} ${j.k === 'arrow' ? '→' : '—'} ${b || '…'}${j.words ? ` (${plainWords(j.words)})` : ''}`;
    });
  if (joins.length) out.push({ k: 'list', ord: false, items: joins.map((t) => ({ runs: [{ t }] })) });
  return out;
}
