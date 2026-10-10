/**
 * A diagram drawn, with no DOM: each kind's layout (ported from the old tree's org, mind, family, lanes,
 * timeline, venn, seating and net definitions and lib/diagram.ts) turns the document's lines into Draw's
 * shapes and joins, and Draw's renderer draws them (src/apps/draw/view.ts), so a diagram is a picture, a
 * page, a thumbnail and, opened in Draw, shapes to move about by hand. Each shape remembers what it was drawn
 * from (`hit`), so the editor can make a tap on it an edit of those words; a lane's band and a Venn's circles
 * are regions (`region`), so a tap or a drop there means "in this lane", "in these sets".
 */
import type { Page } from '../../kit/app.ts';
import { MUTED, pageSvg, r, rect, text, textWidth, wrapText } from '../../kit/draw.ts';
import { glyphNamed } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { GRID, H, W, describeDrawing, isLink, shapeCells, type Color, type Fill, type Kind, type Shape, type TextSize } from '../draw/model.ts';
import { shapesPage } from '../draw/view.ts';
import { write, type Doc } from '../../doc/index.ts';
import { edgesOf, kindOf, labelOf, linesOf, same, setNames, type Hit, type KindId, type Line } from './model.ts';

/** A shape of a diagram: Draw's, with what it was drawn from, and the region it is (a lane, a set). */
export type DShape = Shape & { hit?: Hit; region?: string };

export interface Diagram {
  shapes: DShape[];
  w: number;
  h: number;
}

/** A shape, briefly. */
export const shape = (k: Kind, x: number, y: number, w: number, h: number, text = '', f: Fill = 0, c?: Color, z?: TextSize, hit?: Hit): DShape => {
  const s: DShape = { k, x, y, w, h, f, text };
  if (c) s.c = c;
  if (z && z !== 2) s.z = z;
  if (hit) s.hit = hit;
  return s;
};
/** A join between shape numbers `from` and `to`: an arrow, or a plain line (dotted with f 2). */
export const join = (from: number, to: number, arrow = true, text = '', c?: Color, f: Fill = 0, hit?: Hit): DShape => shape(arrow ? 'k' : 'j', from, to, 0, 0, text, f, c, undefined, hit);

/** The colours a diagram gives its parts, in turn. */
export const COLOR_CYCLE: Color[] = ['b', 'g', 'o', 'p', 'r'];

/** Each join straight after the later of the two shapes it joins: a thing, the next thing, the line between them… */
function weave(shapes: DShape[]): DShape[] {
  const order: number[] = [];
  const placed = new Set<number>();
  const links = shapes.map((s, i) => (isLink(s.k) ? i : -1)).filter((i) => i >= 0);
  shapes.forEach((s, i) => {
    if (isLink(s.k)) return;
    order.push(i);
    placed.add(i);
    for (const l of links) if (!placed.has(l) && placed.has(shapes[l].x) && placed.has(shapes[l].y)) (order.push(l), placed.add(l));
  });
  const now = new Map(order.map((old, at) => [old, at]));
  return order.map((old) => (isLink(shapes[old].k) ? { ...shapes[old], x: now.get(shapes[old].x)!, y: now.get(shapes[old].y)! } : shapes[old]));
}

/** The shapes moved to start at a margin, the page sized to hold them, in reading order. */
export function frame(drawn: DShape[], pad = 44): Diagram {
  const shapes = weave(drawn);
  const solid = shapes.filter((s) => !isLink(s.k));
  if (!solid.length) return { shapes: [], w: 480, h: 240 };
  const x0 = Math.min(...solid.map((s) => Math.min(s.x, s.x + s.w)));
  const y0 = Math.min(...solid.map((s) => Math.min(s.y, s.y + s.h)));
  const x1 = Math.max(...solid.map((s) => Math.max(s.x, s.x + s.w)));
  const y1 = Math.max(...solid.map((s) => Math.max(s.y, s.y + s.h)));
  return { shapes: shapes.map((s) => (isLink(s.k) ? s : { ...s, x: s.x - x0 + pad, y: s.y - y0 + pad })), w: Math.max(320, x1 - x0 + 2 * pad), h: Math.max(160, y1 - y0 + 2 * pad) };
}

/* ---------- trees: mind map, org chart, family tree ---------- */

interface Node {
  line: Line;
  depth: number;
  kids: Node[];
}
interface Placed {
  node: Node;
  /** Position across the leaves (0, 1, 2…), halfway for a parent. */
  across: number;
  parent: number;
}

/** The lines as a forest: an item deeper than the one before is under it; a gap in the depths closes up. */
function forest(lines: Line[]): Node[] {
  const roots: Node[] = [];
  const path: Node[] = [];
  for (const line of lines) {
    if (!line.all.words && !line.all.icon) continue;
    const depth = Math.min(line.depth, path.length);
    const node: Node = { line, depth, kids: [] };
    path.length = depth;
    (depth ? path[depth - 1].kids : roots).push(node);
    path.push(node);
  }
  return roots;
}

/** A forest laid out as a tree: leaves in order, each parent centred over its children. */
function placeTree(roots: Node[]): Placed[] {
  const out: Placed[] = [];
  let leaf = 0;
  const walk = (node: Node, parent: number): number => {
    const at = out.length;
    out.push({ node, across: 0, parent });
    const kids = node.kids.map((k) => walk(k, at));
    out[at].across = kids.length ? (out[kids[0]].across + out[kids[kids.length - 1]].across) / 2 : leaf++;
    return at;
  };
  for (const r of roots) walk(r, -1);
  return out;
}

const whole = (l: Line): Hit => ({ k: 'line', at: l.at, part: 'all' });

/** Org chart (and family tree): who reports to whom, boxes in rows; "~ A -- B: advises" a dotted line beside. */
function orgLayout(doc: Doc): Diagram {
  const BW = 156;
  const BH = 54;
  const placed = placeTree(forest(linesOf(doc)));
  const boxes = placed.map((p) => shape('o', p.across * (BW + 20), p.node.depth * (BH + 44), BW, BH, labelOf(p.node.line.all), p.node.depth === 0 ? 2 : p.node.depth === 1 ? 1 : 0, p.node.depth < 2 ? 'b' : undefined, undefined, whole(p.node.line)));
  const at = (name: string) => placed.findIndex((p) => same(p.node.line.all.words, name));
  const dotted = edgesOf(doc).flatMap((e) => {
    const [a, b] = [at(e.from), at(e.to)];
    return a >= 0 && b >= 0 && a !== b ? [join(a, b, false, e.label, 'p', 2, { k: 'edge', at: e.at })] : [];
  });
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false)])), ...dotted]);
}

/** Mind map: the idea in the middle of its left edge, its branches out to the right, each branch its own colour. */
function mindLayout(doc: Doc): Diagram {
  const placed = placeTree(forest(linesOf(doc)));
  let branch = -1;
  const colour = placed.map((p) => (p.node.depth === 0 ? undefined : COLOR_CYCLE[(p.node.depth === 1 ? ++branch : branch) % COLOR_CYCLE.length]));
  // A long idea wraps inside its box, which grows down to hold it; the rows space out to the tallest box.
  const sized = placed.map((p) => {
    const d = p.node.depth;
    const px = d === 0 ? 17 : 14;
    const { words, icon } = p.node.line.all;
    const mark = icon ? px * 1.4 : 0;
    const w = Math.max(72, Math.min(220, textWidth(words, px, d === 0) + 32 + mark));
    const lines = Math.min(5, wrapText(words, w - 16 - mark, px, d === 0).length);
    return { w, h: Math.max(d === 0 ? 44 : 34, lines * px * 1.25 + 14) };
  });
  const pitch = Math.max(50, ...sized.map((z) => z.h + 16));
  const boxes = placed.map((p, i) => {
    const d = p.node.depth;
    return shape('o', d * 210, p.across * pitch, sized[i].w, sized[i].h, labelOf(p.node.line.all), d === 0 ? 2 : d === 1 ? 1 : 0, colour[i], d === 0 ? 3 : undefined, whole(p.node.line));
  });
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false, '', colour[i])]))]);
}

/* ---------- swimlanes ---------- */

/** The lanes in order of first mention, and the steps; "- Sales:" alone is a lane with nothing in it yet. A line with no "Who:" is in the lane before it. */
export function lanesOf(doc: Doc): { lanes: string[]; steps: { line: Line; lane: string }[] } {
  const lanes: string[] = [];
  const steps: { line: Line; lane: string }[] = [];
  let lane = '';
  for (const l of linesOf(doc)) {
    if (l.key) lane = l.key.words;
    if (!lanes.some((x) => x.toLowerCase() === lane.toLowerCase())) lanes.push(lane);
    if (l.words.words || l.words.icon) steps.push({ line: l, lane: lanes.find((x) => x.toLowerCase() === lane.toLowerCase())! });
  }
  return { lanes: lanes.filter((x) => x || steps.some((s) => s.lane === x)), steps };
}

function lanesLayout(doc: Doc): Diagram {
  const LABEL = 120;
  const COL = 176;
  const ROW = 88;
  const { lanes, steps } = lanesOf(doc);
  if (!lanes.length) return frame([]);
  const width = LABEL + Math.max(1, steps.length) * COL + 12;
  // The lanes lie behind everything: a band and its name each.
  const bands: DShape[] = lanes.flatMap((lane, i) => {
    const c = COLOR_CYCLE[i % COLOR_CYCLE.length];
    const band = shape('r', 0, i * ROW, width, ROW - 8, '', 1, c);
    band.region = lane;
    return [band, shape('t', 8, i * ROW + (ROW - 8) / 2 - 12, LABEL - 12, 24, lane || '—', 0, c, undefined, { k: 'lane', name: lane })];
  });
  const first = bands.length;
  // A step that asks a question is a decision.
  const boxes = steps.map((s, i) => {
    const w = s.line.words;
    return shape(w.words.endsWith('?') ? 'd' : 'o', LABEL + i * COL + 12, lanes.indexOf(s.lane) * ROW + 14, COL - 28, ROW - 36, labelOf(w), 0, undefined, undefined, { k: 'line', at: s.line.at, part: 'words' });
  });
  return frame([...bands, ...boxes, ...steps.slice(1).map((_, i) => join(first + i, first + i + 1))]);
}

/* ---------- timeline ---------- */

/** "When" as a point in time, in years: "1969", "1969-07-20", "July 1969", "44 BC"; NaN for anything else. */
export function moment(when: string): number {
  const w = when.trim();
  const iso = /^(-?\d{1,4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(w);
  if (iso) return +iso[1] + (+iso[2] - 1) / 12 + (iso[3] ? (+iso[3] - 1) / 365 : 0);
  const year = /^(?:[A-Za-z]+\.?\s+)?(\d{1,4})\s*(BC|BCE|AD|CE)?$/i.exec(w);
  if (!year) return NaN;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m = months.indexOf(w.slice(0, 3).toLowerCase());
  const y = +year[1] * (/^bc/i.test(year[2] ?? '') ? -1 : 1);
  return y + (m >= 0 ? m / 12 : 0);
}

/** "When" as a span of time, "1990–1999": its two ends in years, or null. */
export function era(when: string): [number, number] | null {
  const m = /^(.+?)\s*(?:[–—]|\s-\s|(?<=^\d{1,4})-(?=\d{1,4}$))\s*(.+)$/.exec(when.trim());
  if (!m) return null;
  const [a, b] = [moment(m[1]), moment(m[2])];
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? [a, b] : null;
}

const GAP = 96;
/** Moments that make a scale: two or more, none before the one above it, the last after the first. */
const ordered = (ts: number[]) => ts.length > 1 && ts.every((v, i) => !i || v >= ts[i - 1]) && ts[ts.length - 1] > ts[0];

/** Where each dot goes along the axis: as the years fall when they are known and in order, else evenly; never closer than GAP. */
export function places(whens: string[]): number[] {
  const tm = whens.map(moment);
  const known = tm.filter(Number.isFinite);
  const dated = ordered(known);
  const [t0, t1] = [known[0], known[known.length - 1]];
  const span = (whens.length - 1) * GAP * 1.6;
  const xs = tm.map((v, i) => (dated ? (Number.isFinite(v) ? ((v - t0) / (t1 - t0)) * span : -Infinity) : i * GAP * 1.4));
  xs[0] = Math.max(xs[0], 0);
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + GAP);
  return xs;
}

function timelineLayout(doc: Doc): Diagram {
  const BOX_W = 150;
  const BOX_H = 64;
  const AXIS = 150;
  const rows = linesOf(doc)
    .filter((l) => l.all.words || l.all.icon)
    .map((l) => ({ l, when: l.key ? l.key.words : l.words.words, what: l.key ? l.words.words : '' }));
  if (!rows.length) return frame([]);
  const spans = rows.map((r) => era(r.when));
  const events = rows.filter((_, i) => !spans[i]);
  const xs = places(events.map((e) => e.when));
  const known = events.map((e, i) => [moment(e.when), xs[i]]).filter(([v]) => Number.isFinite(v));
  const dated = ordered(known.map(([v]) => v));
  const eras = dated ? rows.flatMap((r, i) => (spans[i] ? [{ r, span: spans[i]! }] : [])) : [];
  if (!dated) rows.forEach((r, i) => spans[i] && events.push(r));
  // A moment's place among the known ones: between the two it falls between, or beyond the ends at the pace of the nearest pair.
  const at = (v: number) => {
    let i = known.findIndex((_, k) => k < known.length - 1 && v <= known[k + 1][0]);
    if (i < 0) i = known.length - 2;
    const [[ta, xa], [tb, xb]] = [known[i], known[i + 1]];
    return xa + ((v - ta) / (tb - ta || 1)) * (xb - xa);
  };
  const label = (r: (typeof rows)[number]) => labelOf({ ...r.l.all, words: r.what ? `${r.when} | ${r.what}` : r.when });
  const shapes: DShape[] = [];
  const joins: DShape[] = [];
  const ends = [...xs, ...eras.flatMap((e) => [at(e.span[0]), at(e.span[1])])];
  const [x0, x1] = [Math.min(...ends), Math.max(...ends)];
  shapes.push(shape('l', x0 - 48, AXIS, x1 - x0 + 96, 0));
  eras.forEach((e, i) => {
    const [a, b] = [at(e.span[0]), at(e.span[1])];
    shapes.push(shape('o', a, AXIS + 40 + BOX_H + 16, Math.max(GAP / 2, b - a), 30, label(e.r), 1, COLOR_CYCLE[(events.length + i) % COLOR_CYCLE.length], undefined, whole(e.r.l)));
  });
  events.forEach((e, i) => {
    const x = xs[i] ?? xs[xs.length - 1];
    const c = COLOR_CYCLE[i % COLOR_CYCLE.length];
    const above = i % 2 === 0;
    const dot = shapes.push(shape('e', x - 8, AXIS - 8, 16, 16, '', 2, c)) - 1;
    const box = shapes.push(shape('o', x - BOX_W / 2, above ? AXIS - 40 - BOX_H : AXIS + 40, BOX_W, BOX_H, label(e), 1, c, undefined, whole(e.l))) - 1;
    joins.push(join(dot, box, false, '', c));
  });
  return frame([...shapes, ...joins]);
}

/* ---------- Venn ---------- */

interface Group {
  names: string[];
  items: { line: Line; item: number; label: string }[];
  /** The line that names this group alone, where its name is typed. */
  line: Line;
}

/** The lines as sets (at most three) and what each group of them holds; a set named twice is one set, its things together. */
export function vennOf(doc: Doc): { groups: Group[]; sets: string[] } {
  const groups: Group[] = [];
  for (const l of linesOf(doc)) {
    const names = setNames(l.key ? l.key.words : l.words.words);
    if (!names.length) continue;
    const items = l.key ? l.items.flatMap((p, item) => (p.words || p.icon ? [{ line: l, item, label: labelOf(p) }] : [])) : [];
    const sameGroup = groups.find((g) => g.names.length === names.length && g.names.every((n) => names.some((m) => m.toLowerCase() === n.toLowerCase())));
    if (sameGroup) sameGroup.items.push(...items);
    else groups.push({ names, items, line: l });
  }
  const sets: string[] = [];
  for (const g of groups) if (g.names.length === 1 && !sets.some((s) => s.toLowerCase() === g.names[0].toLowerCase())) sets.push(g.names[0]);
  return { groups, sets: sets.slice(0, 3) };
}

const R = 150;
const D = R * 1.12;
const centres = (n: number): [number, number][] => (n === 1 ? [[R, R]] : n === 2 ? [[R, R], [R + D, R]] : [[R, R], [R + D, R], [R + D / 2, R + D * 0.87]]);

/** The middle of a region (the circles it is in and not the others): the point farthest from every edge, and how far that is. */
function regionCentre(idx: number[], all: [number, number][]): { cx: number; cy: number; room: number } {
  const span = 2 * R + D;
  let best = -Infinity;
  let at: [number, number] = all[idx[0]];
  for (let x = 0; x <= span; x += 4) {
    for (let y = 0; y <= span; y += 4) {
      const clear = Math.min(...all.map(([cx, cy], i) => (idx.includes(i) ? R - Math.hypot(x - cx, y - cy) : Math.hypot(x - cx, y - cy) - R)));
      if (clear > best) (best = clear), (at = [x, y]);
    }
  }
  return { cx: at[0], cy: at[1], room: best };
}

function vennLayout(doc: Doc): Diagram {
  const LINE = 17;
  const PX = 11;
  const { groups, sets } = vennOf(doc);
  if (!sets.length) return frame([]);
  const at = centres(sets.length);
  const circles: DShape[] = sets.map((name, i) => {
    const c = shape('e', at[i][0] - R, at[i][1] - R, R * 2, R * 2, '', 1, COLOR_CYCLE[i]);
    c.region = name;
    return c;
  });
  const names: DShape[] = sets.map((name, i) => {
    const below = sets.length === 3 && i === 2;
    const w = textWidth(name, 20, true) + 16;
    const g = groups.find((x) => x.names.length === 1 && x.names[0].toLowerCase() === name.toLowerCase())!;
    return shape('t', at[i][0] - w / 2, below ? at[i][1] + R + 8 : at[i][1] - R - 34, w, 26, name, 0, COLOR_CYCLE[i], 3, { k: 'line', at: g.line.at, part: 'key' });
  });
  // The things of each region, one under another from its middle, each as wide as its words; more than fit in one column
  // stand in two or three beside each other, the block kept inside its circles and out of the others.
  const lists: DShape[] = groups.flatMap((g) => {
    const idx = g.names.map((n) => sets.findIndex((x) => x.toLowerCase() === n.toLowerCase()));
    if (idx.includes(-1) || !g.items.length) return [];
    const { cx, cy, room } = regionCentre(idx, at);
    const widest = Math.max(72, 2 * room - 10);
    const items = g.items.map((it) => {
      const w = Math.min(textWidth(it.label, PX) + 14, widest);
      return { it, w, h: wrapText(it.label, w - 8, PX).length * LINE };
    });
    const roomY = (w: number): [number, number] => {
      let [top, bottom] = [-Infinity, Infinity];
      at.forEach(([ax, ay], i) => {
        if (idx.includes(i)) {
          const half = Math.sqrt(Math.max(0, R * R - (Math.abs(cx - ax) + w / 2) ** 2));
          [top, bottom] = [Math.max(top, ay - half), Math.min(bottom, ay + half)];
        } else {
          const dx = Math.max(0, Math.abs(cx - ax) - w / 2);
          if (dx >= R) return;
          const half = Math.sqrt(R * R - dx * dx);
          if (ay < cy) top = Math.max(top, ay + half);
          else bottom = Math.min(bottom, ay - half);
        }
      });
      return [top + 4, bottom - 4];
    };
    const split = (n: number) => Array.from({ length: n }, (_, c) => items.slice(Math.ceil((c * items.length) / n), Math.ceil(((c + 1) * items.length) / n)));
    let cols = split(1);
    let widths = [Math.max(...items.map((x) => x.w))];
    let [top, bottom] = roomY(widths[0]);
    const height = (cs: typeof cols) => Math.max(...cs.map((col) => col.reduce((a, x) => a + x.h, 0)));
    for (let n = 2; n <= 3 && height(cols) > bottom - top && n <= items.length; n++) {
      const more = split(n);
      const ws = more.map((col) => Math.max(...col.map((x) => x.w)));
      const [tp, bt] = roomY(ws.reduce((a, w) => a + w, 0) + (n - 1) * 6);
      if (bt - tp > height(more) || bt - tp - height(more) > bottom - top - height(cols)) [cols, widths, top, bottom] = [more, ws, tp, bt];
    }
    const total = widths.reduce((a, w) => a + w, 0) + (cols.length - 1) * 6;
    const tall = height(cols);
    const y0 = Math.max(top, Math.min(cy - tall / 2, bottom - tall));
    let x = cx - total / 2;
    return cols.flatMap((col, c) => {
      const left = x;
      x += widths[c] + 6;
      let y = y0;
      return col.map(({ it, w, h }) => {
        const s = shape('t', left + (widths[c] - w) / 2, y, w, h, it.label, 0, undefined, 1, { k: 'line', at: it.line.at, part: it.item });
        y += h;
        return s;
      });
    });
  });
  return frame([...circles, ...names, ...lists], 56);
}

/* ---------- seating ---------- */

function seatingLayout(doc: Doc): Diagram {
  const tables = linesOf(doc).filter((l) => l.all.words || l.all.icon);
  const perRow = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const shapes: DShape[] = [];
  tables.forEach((l, n) => {
    const [cx, cy] = [(n % perRow) * 330 + 165, Math.floor(n / perRow) * 290 + 145];
    const c = COLOR_CYCLE[n % COLOR_CYCLE.length];
    const name = l.key ?? l.words;
    shapes.push(shape('e', cx - 60, cy - 46, 120, 92, labelOf(name), 1, c, undefined, { k: 'line', at: l.at, part: 'key' }));
    const people = l.key ? l.items.map((p, item) => ({ p, item })).filter(({ p }) => p.words || p.icon) : [];
    // Round the table, clockwise from the top.
    people.forEach(({ p, item }, i) => {
      const a = (i / people.length) * 2 * Math.PI - Math.PI / 2;
      shapes.push(shape('o', cx + Math.cos(a) * 118 - 44, cy + Math.sin(a) * 100 - 14, 88, 28, labelOf(p), 0, c, 1, { k: 'line', at: l.at, part: item }));
    });
  });
  return frame(shapes);
}

/* ---------- place cards (a seating chart's) ---------- */

/** A letter sheet, at 96 to the inch. */
export const LETTER = { w: 816, h: 1056 };
/** A place card, 4 by 2.5 inches. */
export const CARD = { w: 384, h: 240 };

/** Cards laid out on sheets, `cols` × `rows` to a sheet, centred, each with a dashed line round it to cut along. (The old tree's lib/print.ts `tile`.) */
export function tile(cards: Page[], cols: number, rows: number, sheet = LETTER): Page[] {
  if (!cards.length) return [{ ...sheet, svg: '' }];
  const { w, h } = cards[0];
  const [x0, y0] = [(sheet.w - cols * w) / 2, (sheet.h - rows * h) / 2];
  const out: Page[] = [];
  for (let i = 0; i < cards.length; i += cols * rows) {
    const svg = cards
      .slice(i, i + cols * rows)
      .map((c, n) => {
        const [x, y] = [x0 + (n % cols) * w, y0 + Math.floor(n / cols) * h];
        return `<svg x="${r(x)}" y="${r(y)}" width="${w}" height="${h}" viewBox="0 0 ${c.w} ${c.h}">${c.svg}</svg>` + rect(x, y, w, h, 'none', 'stroke="#a1a1aa" stroke-dasharray="6 5"');
      })
      .join('');
    out.push({ ...sheet, svg, alt: cards.slice(i, i + cols * rows).map((c) => c.alt).join('; ') });
  }
  return out;
}

/** One card: the person's name large (their icon above it, if they have one), their table small beneath. */
function placeCard(name: string, icon: string, table: string): Page {
  const { w, h } = CARD;
  let px = 40;
  while (px > 16 && textWidth(name, px, true) > w - 48) px -= 2;
  const top = icon ? 56 : 0;
  let svg = rect(0, 0, w, h, '#fff');
  if (icon) svg += glyphNamed(icon, w / 2 - 22, 40, 44, '#18181b');
  svg += text(w / 2, h / 2 + 10 + top / 2, name, { px, bold: true, anchor: 'middle' });
  if (table) svg += text(w / 2, h / 2 + 44 + top / 2, table, { px: 16, fill: MUTED, anchor: 'middle' });
  return { w, h, svg, alt: table ? `${name}, ${table}` : name };
}

/** A seating chart's place cards: one for each person at each table, eight to a letter sheet (two across, four down), to print and cut. */
export function placeCards(doc: Doc): Page[] {
  const cards = linesOf(doc)
    .filter((l) => l.key)
    .flatMap((l) => l.items.filter((p) => p.words || p.icon).map((p) => placeCard(p.words, p.icon, l.key!.words)));
  return tile(cards, 2, 4);
}

/* ---------- network ---------- */

function netLayout(doc: Doc): Diagram {
  const names: string[] = [];
  const hits: Hit[] = [];
  const labels: string[] = [];
  const find = (name: string) => names.findIndex((n) => same(n, name));
  const at = (name: string, hit: Hit, label = name) => {
    const i = find(name);
    if (i >= 0) return i;
    hits.push(hit);
    labels.push(label);
    return names.push(name) - 1;
  };
  for (const l of linesOf(doc)) if (l.all.words) at(l.all.words, whole(l), labelOf(l.all));
  const links = edgesOf(doc).map((e) => {
    const [from, to] = e.dir === '<-' ? [e.to, e.from] : [e.from, e.to];
    return { a: at(from, { k: 'node', name: from }), b: at(to, { k: 'node', name: to }), arrow: e.dir === '->' || e.dir === '<-', label: e.label, at: e.at };
  });
  if (!names.length) return frame([]);
  // Round a circle, starting at the top; a lone pair sits side by side.
  const n = names.length;
  const radius = n < 3 ? 110 : Math.max(120, (n * 150) / (2 * Math.PI));
  const nodes = names.map((name, i) => {
    const a = n < 3 ? Math.PI * i : (i / n) * Math.PI * 2 - Math.PI / 2;
    const w = Math.max(84, Math.min(170, textWidth(name, 14) + 30));
    return shape('o', Math.cos(a) * radius * 1.35 - w / 2, Math.sin(a) * radius - 20, w, 40, labels[i], 1, 'b', undefined, hits[i]);
  });
  return frame([...nodes, ...links.filter((l) => l.a !== l.b).map((l) => join(l.a, l.b, l.arrow, l.label, undefined, 0, { k: 'edge', at: l.at }))], 30);
}

/* ---------- the kinds, and the page ---------- */

const LAYOUTS: Record<KindId, (doc: Doc) => Diagram> = { mind: mindLayout, org: orgLayout, family: orgLayout, lanes: lanesLayout, timeline: timelineLayout, venn: vennLayout, seating: seatingLayout, net: netLayout };

/** The document as its kind draws it. */
export const layout = (doc: Doc): Diagram => LAYOUTS[kindOf(doc)](doc);

/** The regions under a point of the picture: a lane, or the sets of a Venn whose circles hold it ("Fast & Cheap"). */
export function regionAt(d: Diagram, x: number, y: number): string | undefined {
  const inside = d.shapes.filter((s) => s.region !== undefined && (s.k === 'e' ? ((x - s.x - s.w / 2) / (s.w / 2)) ** 2 + ((y - s.y - s.h / 2) / (s.h / 2)) ** 2 <= 1 : x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h));
  return inside.length ? inside.map((s) => s.region).join(' & ') : undefined;
}

/** The diagram's one page, with words for anyone who cannot see it. */
export function diagramPage(doc: Doc, upTo = Infinity): Page {
  const d = layout(doc);
  return { ...shapesPage(d.shapes, d.w, d.h, upTo), alt: doc.head.alt || describeDrawing(d.shapes) || t('An empty diagram') };
}

export const diagramSvg = (doc: Doc): string => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(diagramPage(doc)) + '\n';

/** The diagram as a drawing Draw opens: scaled to fit its canvas, snapped to its grid, a row a shape. */
export function toDrawing(doc: Doc): string {
  const d = layout(doc);
  const k = Math.min(1, W / d.w, H / d.h);
  const g = (n: number) => Math.round((n * k) / GRID) * GRID;
  const shapes: Shape[] = d.shapes.map(({ hit: _h, region: _r, ...s }) => (isLink(s.k) ? s : { ...s, x: g(s.x), y: g(s.y), w: Math.max(GRID, g(s.w)), h: Math.max(GRID, g(s.h)), ...(k < 0.75 ? { z: 1 as TextSize } : {}) }));
  const fields = ['kind', 'x', 'y', 'w', 'h', 'style', 'label'] as const;
  const names = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
  const head: Record<string, string> = doc.head.title ? { title: doc.head.title } : {};
  if (!shapes.length) return write({ head, blocks: [] });
  return write({ head, blocks: [{ k: 'table', cols: names.map((name) => ({ name, type: 'text' as const })), rows: shapes.map((s) => fields.map((f) => shapeCells(s)[f])) }] });
}
