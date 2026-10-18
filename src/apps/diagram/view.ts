/**
 * A diagram drawn, with no DOM: each kind's layout (org, mind, family, lanes, timeline, venn, seating and
 * net) turns the document's lines into Draw's
 * shapes and joins, and Draw's renderer draws them (src/apps/draw/view.ts), so a diagram is a picture, a
 * page, a thumbnail and, opened in Draw, shapes to move about by hand. Each shape remembers what it was drawn
 * from (`hit`), so the editor can make a tap on it an edit of those words; a lane's band and a Venn's circles
 * are regions (`region`), so a tap or a drop there means "in this lane", "in these sets".
 */
import type { Page } from '../../kit/core/app.ts';
import { MUTED, pageSvg, r, rect, text, textWidth, wrapText } from '../../kit/draw/draw.ts';
import { glyphNamed } from '../../kit/draw/icons.ts';
import { t } from '../../kit/core/i18n.ts';
import { GRID, H, W, describeDrawing, isLink, shapeCells, type Color, type Fill, type Kind, type Shape, type TextSize } from '../draw/model.ts';
import { cropPage, shapesPage } from '../draw/view.ts';
import { write, type Dir, type Doc } from '../../doc/index.ts';
import { asLabel, edgesOf, kindOf, labelOf, linesOf, newLaneName, same, setKey, setNames, shapeOf, shapes, SHAPES, stepNamed, type Hit, type KindId, type Line } from './model.ts';

/** A shape of a diagram: Draw's, with what it was drawn from, and the region it is (a lane, a set). */
export type DShape = Shape & {
  hit?: Hit;
  region?: string;
  /** A swimlane's line that its kind draws by itself, from line to line: tapped, it becomes a connection, to be given words. */
  flow?: [number, number];
  /** The thing Enter offers next, drawn but not in the document until it is tapped (the editor's). */
  ghost?: boolean;
};

export interface Diagram {
  shapes: DShape[];
  w: number;
  h: number;
  /** Presented a step at a time: how many shapes are drawn once step n has come (a lane with its first step, a step with the arrow that reaches it). Absent, a shape a step. */
  steps?: number[];
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
const COLOR_CYCLE: Color[] = ['b', 'g', 'o', 'p', 'r'];

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

/** Org chart (and family tree): who reports to whom, boxes in rows; "~ A -- B: advises" a dotted line beside ("->" with an arrow). */
function orgLayout(doc: Doc): Diagram {
  const BW = 156;
  const BH = 54;
  const placed = placeTree(forest(linesOf(doc)));
  const boxes = placed.map((p) =>
    shape(
      'o',
      p.across * (BW + 20),
      p.node.depth * (BH + 44),
      BW,
      BH,
      labelOf(p.node.line.all),
      p.node.depth === 0 ? 2 : p.node.depth === 1 ? 1 : 0,
      p.node.depth < 2 ? 'b' : undefined,
      undefined,
      whole(p.node.line),
    ),
  );
  const at = (name: string) => placed.findIndex((p) => same(p.node.line.all.words, name));
  const dotted = edgesOf(doc).flatMap((e) => {
    const [a, b] = [at(e.from), at(e.to)];
    const [x, y] = e.dir === '<-' ? [b, a] : [a, b];
    return a >= 0 && b >= 0 && a !== b ? [join(x, y, e.dir === '->' || e.dir === '<-', e.label, 'p', 2, { k: 'edge', at: e.at })] : [];
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
    const { icon } = p.node.line.all;
    const words = p.node.line.all.words.replace(/\n/g, ' | ');
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
  const at = (name: string) => placed.findIndex((p) => same(p.node.line.all.words, name));
  const root = boxes[0] ? [boxes[0].x + boxes[0].w / 2, boxes[0].y + boxes[0].h / 2] : [0, 0];
  const links = edgesOf(doc).flatMap((e) => {
    const [a, b] = [at(e.from), at(e.to)];
    return a >= 0 && b >= 0 && a !== b ? crossLink(boxes[a], boxes[b], boxes, root as [number, number], e.dir, e.label, { k: 'edge', at: e.at }) : [];
  });
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false, '', colour[i])])), ...links]);
}

/** Where a line from a box's centre toward (tx, ty) leaves the box. */
function rim(q: DShape, tx: number, ty: number): [number, number] {
  const [cx, cy] = [q.x + q.w / 2, q.y + q.h / 2];
  const [dx, dy] = [tx - cx, ty - cy];
  if (!dx && !dy) return [cx, cy];
  const k = Math.min(dx ? (q.w / 2 + 3) / Math.abs(dx) : Infinity, dy ? (q.h / 2 + 3) / Math.abs(dy) : Infinity, 1);
  return [cx + dx * k, cy + dy * k];
}
/** Points as Draw's "any shape" keeps them: a box, and each point as hundredths of it. */
function boxed(k: 'v' | 'w', pts: [number, number][], f: Fill, c?: Color, hit?: Hit): DShape {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  const [w, h] = [Math.max(1, Math.max(...xs) - x), Math.max(1, Math.max(...ys) - y)];
  const s = shape(k, x, y, w, h, '', f, c, undefined, hit);
  s.pts = pts.flatMap(([px, py]) => [Math.round(((px - x) / w) * 1000) / 10, Math.round(((py - y) / h) * 1000) / 10]);
  return s;
}
/** An arrowhead at (x, y), pointing along (dx, dy). */
function head(x: number, y: number, dx: number, dy: number, c?: Color): DShape {
  const n = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / n, dy / n];
  const [L, Wd] = [11, 5];
  return boxed(
    'v',
    [
      [x, y],
      [x - ux * L - uy * Wd, y - uy * L + ux * Wd],
      [x - ux * L + uy * Wd, y - uy * L - ux * Wd],
    ],
    2,
    c,
  );
}
/**
 * A mind map's cross-link from box a to box b: a dashed quadratic curve bowing away from the idea in the middle (so it
 * runs round the tree rather than through it where it can), an arrowhead at an end it points to, and its words at its
 * middle. Drawn as Draw's own shapes (a stroke, a filled shape, a text), so the page, the SVG and Draw all have it.
 */
function crossLink(a: DShape, b: DShape, boxes: DShape[], root: [number, number], dir: Dir, label: string, hit: Hit): DShape[] {
  const C: Color = 'p';
  const [ax, ay, bx, by] = [a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2];
  const [mx, my] = [(ax + bx) / 2, (ay + by) / 2];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  // The normal to a→b, turned to the side away from the middle idea.
  let [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
  if (nx * (mx - root[0]) + ny * (my - root[1]) < 0) [nx, ny] = [-nx, -ny];
  // Far enough out to clear the two boxes and every box between them: how far each reaches past the line from a to b,
  // that way, against how far out the curve is over it (a quadratic is out 2u(1-u) of the way to its control point at u).
  const [ux, uy] = [(bx - ax) / len, (by - ay) / len];
  const reach = (q: DShape) => (q.x + q.w / 2 - ax) * nx + (q.y + q.h / 2 - ay) * ny + Math.abs(nx) * (q.w / 2) + Math.abs(ny) * (q.h / 2) + 16;
  let bow = Math.max(48, len * 0.35, 2 * reach(a), 2 * reach(b));
  for (const q of boxes) {
    const u = ((q.x + q.w / 2 - ax) * ux + (q.y + q.h / 2 - ay) * uy) / len;
    if (q === a || q === b || u <= 0 || u >= 1) continue;
    const v = Math.min(Math.max(u, 0.2), 0.8);
    bow = Math.max(bow, reach(q) / (2 * v * (1 - v)));
  }
  const [cx, cy] = [mx + nx * bow, my + ny * bow];
  const p0 = rim(a, cx, cy);
  const p2 = rim(b, cx, cy);
  const at = (t: number): [number, number] => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * cx + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * cy + t * t * p2[1]];
  const curve = boxed(
    'w',
    Array.from({ length: 25 }, (_, i) => at(i / 24)),
    1,
    C,
    hit,
  );
  const out: DShape[] = [curve];
  if (dir === '->' || dir === '<->') out.push(head(p2[0], p2[1], p2[0] - cx, p2[1] - cy, C));
  if (dir === '<-' || dir === '<->') out.push(head(p0[0], p0[1], p0[0] - cx, p0[1] - cy, C));
  if (label) {
    // Its words just outside the curve's middle, clear of the line.
    const w = Math.min(180, textWidth(label, 12) + 16);
    const [px, py] = at(0.5);
    const [lx, ly] = [px + nx * (w / 2 + 2), py + ny * 14];
    out.push(shape('t', lx - w / 2, ly - 12, w, 24, label, 0, C, 1, hit));
  }
  return out;
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

/** Editing (`editing`), an empty band under the last lane: a tap or a drop there is a new lane. */
function lanesLayout(doc: Doc, editing = false): Diagram {
  const LABEL = 120;
  const COL = 176;
  const ROW = 88;
  const { lanes, steps } = lanesOf(doc);
  if (!lanes.length) return frame([]);
  // The flow: each connection, as the way it reads (a "<-" from its far end); then each step to the next, unless a
  // connection already leads out of it or into the next (a branch, a step reached another way). A "<->" is an
  // exchange beside the flow: the step it goes to, joined by those alone (a record looked up), is passed over by it.
  const all = linesOf(doc);
  const index = (name: string) => ((l) => (l ? steps.findIndex((x) => x.line.at === l.at) : -1))(stepNamed(all, name));
  const joined = edgesOf(doc).flatMap((e) => {
    const [a, b] = [index(e.from), index(e.to)];
    return a >= 0 && b >= 0 && a !== b ? [{ e, a, b }] : [];
  });
  const flows = joined.flatMap(({ e, a, b }) => (e.dir === '<-' ? [[b, a]] : e.dir === '<->' ? [] : [[a, b]]));
  const both = joined.filter(({ e }) => e.dir === '<->');
  const aside = (i: number) => both.some(({ b }) => b === i) && !joined.some(({ e, a, b }) => e.dir !== '<->' && (a === i || b === i));
  // The flow by itself, as a mind map branches (Paul, 2026-10-18): a step leads to the steps indented under it, in
  // parallel; one with none leads on to the next step on the margin after the one it is under (where its branch
  // rejoins). Not where a connection already does: between a step and one under it, or out of the one or into the next.
  const depth = steps.map((s) => s.line.depth);
  const under = (i: number) => {
    const kids: number[] = [];
    for (let j = i + 1; j < steps.length && depth[j] > depth[i]; j++) if (depth[j] === depth[i] + 1 && !aside(j)) kids.push(j);
    return kids;
  };
  const top = (i: number) => {
    while (depth[i] > 0 && i > 0) i--;
    return i;
  };
  const onward = (i: number) => {
    for (let j = top(i) + 1; j < steps.length; j++) if (depth[j] === 0 && !aside(j)) return j;
    return -1;
  };
  const tied = (i: number, j: number) => joined.some(({ a, b }) => (a === i && b === j) || (a === j && b === i));
  const auto: [number, number][] = steps.flatMap((_, i): [number, number][] => {
    if (aside(i)) return [];
    const kids = under(i);
    if (kids.length) return kids.filter((j) => !tied(i, j)).map((j): [number, number] => [i, j]);
    const j = onward(i);
    return j >= 0 && !flows.some(([a, b]) => a === i || b === j) ? [[i, j]] : [];
  });
  const into = (i: number) => auto.some(([, b]) => b === i) || flows.some(([, b]) => b === i) || both.some(({ a, b }) => a === i || b === i);
  const out = (i: number) => auto.some(([a]) => a === i) || flows.some(([a]) => a === i) || both.some(({ a, b }) => a === i || b === i);
  // Each step's column (Paul, 2026-10-18: "Stack"): one past the furthest step before it that leads into it, so
  // branches side by side share columns and the step they rejoin at comes after the longest; a look-up beside the
  // flow, its partner's; a step nothing before it leads into, the next after the step before it. Two steps of one
  // lane never share a column: the later moves on one.
  const col: number[] = [];
  const taken = new Set<string>();
  steps.forEach((s, i) => {
    const partner = both.find(({ b }) => b === i)?.a;
    const from = [...auto, ...flows].filter(([a, b]) => b === i && a < i).map(([a]) => col[a] + 1);
    let c = aside(i) && partner !== undefined && partner < i ? col[partner] : from.length ? Math.max(...from) : i ? col[i - 1] + 1 : 0;
    while (taken.has(`${lanes.indexOf(s.lane)} ${c}`)) c++;
    taken.add(`${lanes.indexOf(s.lane)} ${c}`);
    col.push(c);
  });
  const width = LABEL + Math.max(1, ...col.map((c) => c + 1)) * COL + 12;
  // The lanes lie behind everything: a band and its name each.
  const bands: DShape[] = lanes.flatMap((lane, i) => {
    const c = COLOR_CYCLE[i % COLOR_CYCLE.length];
    const band = shape('r', 0, i * ROW, width, ROW - 8, '', 1, c);
    band.region = lane;
    return [band, shape('t', 8, i * ROW + (ROW - 8) / 2 - 12, LABEL - 12, 24, lane ? asLabel(lane) : '—', 0, c, undefined, { k: 'lane', name: lane })];
  });
  // A step that asks a question is a decision; one the flow starts or ends at, a start or an end; any other, a task.
  const boxes = steps.map((s, i) => {
    const w = s.line.words;
    const k = w.words.endsWith('?') ? 'h' : !into(i) || !out(i) ? 'o' : 'r';
    return shape(k, LABEL + col[i] * COL + 12, lanes.indexOf(s.lane) * ROW + 14, COL - 28, ROW - 36, labelOf(w), 0, undefined, undefined, {
      k: 'line',
      at: s.line.at,
      part: 'words',
    });
  });
  // In the order they come when presented (Paul, 2026-10-13: "It should be lane, graphic, lane, graphic"): each step
  // brings its lane's band and name the first time that lane is reached, then the arrow that reaches the step, then
  // the step itself; a lane with no step is drawn first. A band is always before any box in its row, so it lies behind.
  const shapes: DShape[] = [];
  const ends: number[] = [];
  const shown = new Set<number>();
  const band = (lane: string) => {
    const i = lanes.indexOf(lane);
    if (shown.has(i)) return;
    shown.add(i);
    shapes.push(bands[2 * i], bands[2 * i + 1]);
  };
  lanes.forEach((lane) => {
    if (!steps.some((s) => s.lane === lane)) band(lane);
  });
  steps.forEach((s, i) => {
    band(s.lane);
    for (const [from] of auto.filter(([, to]) => to === i)) {
      const flow: [number, number] = [steps[from].line.at, s.line.at];
      shapes.push(...elbow(boxes[from], boxes[i], boxes, '->').map((x): DShape => ({ ...x, flow })));
    }
    shapes.push(boxes[i]);
    ends.push(shapes.length);
  });
  for (const { e, a, b } of joined) shapes.push(...elbow(boxes[a], boxes[b], boxes, e.dir, e.label, { k: 'edge', at: e.at }));
  if (editing) {
    const more = shape('r', 0, lanes.length * ROW, width, ROW - 8, '', 0);
    more.region = newLaneName(lanes);
    shapes.push(more, shape('t', 8, lanes.length * ROW + (ROW - 8) / 2 - 12, LABEL - 12, 24, '+'));
  }
  return { ...frame(shapes), steps: ends };
}

/**
 * A swimlane's line from step a to step b, at right angles (Paul, 2026-10-18): out of a's right side and into b's
 * left, turning in the gap before b, or after a where that row is clearer, or along the gap between two lanes where
 * both are not; back to an earlier step, out of a's foot, along the gap under its lane and into b. An arrowhead
 * where it points ("->", "<-", "<->"; "--" none), and its words beside its first long stretch.
 */
/** Points from their coordinates in pairs: path(x1, y1, x2, y2, …). */
const path = (...xy: number[]): [number, number][] => xy.flatMap((v, i) => (i % 2 ? [] : [[v, xy[i + 1]] as [number, number]]));
function elbow(a: DShape, b: DShape, boxes: DShape[], dir: Dir, label = '', hit?: Hit): DShape[] {
  const GAP = 14;
  const [ay, by] = [a.y + a.h / 2, b.y + b.h / 2];
  // Whether a stretch of row y from x1 to x2 passes through no step.
  const clear = (y: number, x1: number, x2: number) => !boxes.some((q) => q !== a && q !== b && q.y <= y && y <= q.y + q.h && q.x < x2 && q.x + q.w > x1);
  // The gap under a's lane, or over it, toward b.
  const lane = by >= ay ? a.y + a.h + 18 : a.y - 18;
  let pts: [number, number][];
  if (b.x < a.x + a.w && a.x < b.x + b.w) {
    // One over the other in a column: straight up or down, or beside the column where a step is in the way.
    const [x, y1, y2] = by > ay ? [a.x + a.w / 2, a.y + a.h, b.y] : [a.x + a.w / 2, a.y, b.y + b.h];
    const blocked = boxes.some((q) => q !== a && q !== b && q.x < x && x < q.x + q.w && Math.min(y1, y2) < q.y + q.h && q.y < Math.max(y1, y2));
    const side = a.x + a.w + GAP;
    pts = blocked ? path(a.x + a.w, ay, side, ay, side, by, b.x + b.w, by) : path(x, y1, x, y2);
  } else if (b.x > a.x + a.w) {
    const [x1, x2, xIn, xOut] = [a.x + a.w, b.x, b.x - GAP, a.x + a.w + GAP];
    if (ay === by && clear(ay, x1, x2)) pts = path(x1, ay, x2, by);
    else if (clear(ay, x1, xIn)) pts = path(x1, ay, xIn, ay, xIn, by, x2, by);
    else if (clear(by, xOut, x2)) pts = path(x1, ay, xOut, ay, xOut, by, x2, by);
    else pts = path(x1, ay, xOut, ay, xOut, lane, xIn, lane, xIn, by, x2, by);
  } else {
    const [ax, bx, under] = [a.x + a.w / 2, b.x + b.w / 2, a.y + a.h + 18];
    pts = path(ax, a.y + a.h, ax, under, bx, under, bx, b.y > under ? b.y : b.y + b.h);
  }
  const out: DShape[] = [boxed('w', pts, 0, undefined, hit)];
  const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
  if (dir === '->' || dir === '<->') out.push(head(q[0], q[1], q[0] - p[0], q[1] - p[1]));
  if (dir === '<-' || dir === '<->') out.push(head(pts[0][0], pts[0][1], pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]));
  if (label) {
    const w = Math.min(160, textWidth(label, 12) + 12);
    const long = pts.findIndex((m, j) => j + 1 < pts.length && Math.hypot(pts[j + 1][0] - m[0], pts[j + 1][1] - m[1]) >= 24);
    const i = Math.max(0, long);
    const [[x1, y1], [x2, y2]] = [pts[i], pts[i + 1] ?? pts[i]];
    // Over a stretch across, beside one down.
    const [lx, ly] = y1 === y2 ? [(x1 + x2) / 2 - w / 2, y1 - 24] : [x1 + 4, (y1 + y2) / 2 - 12];
    out.push(shape('t', lx, ly, w, 24, asLabel(label), 0, undefined, 1, hit));
  }
  return out;
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
  const label = (r: (typeof rows)[number]) => labelOf({ ...r.l.all, words: r.what ? `${r.when}\n${r.what}` : r.when });
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
    const names = setNames(l.key ? l.key.src : l.words.src);
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
const centres = (n: number): [number, number][] =>
  n === 1
    ? [[R, R]]
    : n === 2
      ? [
          [R, R],
          [R + D, R],
        ]
      : [
          [R, R],
          [R + D, R],
          [R + D / 2, R + D * 0.87],
        ];

/** The middle of a region (the circles it is in and not the others): the point farthest from every edge, and how far that is. */
function regionCentre(idx: number[], all: [number, number][]): { cx: number; cy: number; room: number } {
  const span = 2 * R + D;
  let best = -Infinity;
  let at: [number, number] = all[idx[0]];
  for (let x = 0; x <= span; x += 4) {
    for (let y = 0; y <= span; y += 4) {
      const clear = Math.min(...all.map(([cx, cy], i) => (idx.includes(i) ? R - Math.hypot(x - cx, y - cy) : Math.hypot(x - cx, y - cy) - R)));
      if (clear > best) ((best = clear), (at = [x, y]));
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
    // The region names the set as a line's key writes it, so "R&D" stays one set in "R\&D & Sales".
    c.region = setKey([name]);
    return c;
  });
  const names: DShape[] = sets.map((name, i) => {
    const below = sets.length === 3 && i === 2;
    const w = textWidth(name, 20, true) + 16;
    const g = groups.find((x) => x.names.length === 1 && x.names[0].toLowerCase() === name.toLowerCase())!;
    return shape('t', at[i][0] - w / 2, below ? at[i][1] + R + 8 : at[i][1] - R - 34, w, 26, asLabel(name), 0, COLOR_CYCLE[i], 3, { k: 'line', at: g.line.at, part: 'key' });
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

/** Cards laid out on sheets, `cols` × `rows` to a sheet, centred, each with a dashed line round it to cut along. */
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
    out.push({
      ...sheet,
      svg,
      alt: cards
        .slice(i, i + cols * rows)
        .map((c) => c.alt)
        .join('; '),
    });
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
    // An icon on the thing stands before its name: room for it too, so the name is not wrapped.
    const w = Math.max(84, Math.min(170, textWidth(name, 14) + 30 + (labels[i].startsWith(':') ? 24 : 0)));
    return shape('o', Math.cos(a) * radius * 1.35 - w / 2, Math.sin(a) * radius - 20, w, 40, labels[i], 1, 'b', undefined, hits[i]);
  });
  return frame([...nodes, ...links.filter((l) => l.a !== l.b).map((l) => join(l.a, l.b, l.arrow, l.label, undefined, 0, { k: 'edge', at: l.at }))], 30);
}

/* ---------- the kinds, and the page ---------- */

const LAYOUTS: Record<KindId, (doc: Doc, editing?: boolean) => Diagram> = {
  mind: mindLayout,
  org: orgLayout,
  family: orgLayout,
  lanes: lanesLayout,
  timeline: timelineLayout,
  venn: vennLayout,
  seating: seatingLayout,
  net: netLayout,
};

/** The document as its kind draws it; `editing`, with what only the editor draws (the band for a new lane). */
export const layout = (doc: Doc, editing = false): Diagram => shaped(doc, LAYOUTS[kindOf(doc)](doc, editing));

/** Each thing drawn in the shape its line's class gives it ("{.diamond}"), where its kind draws things as boxes. */
function shaped(doc: Doc, d: Diagram): Diagram {
  if (!shapes(kindOf(doc))) return d;
  const named = (s: DShape) => (s.hit?.k === 'line' && s.k !== 't' && s.k !== 'w' && s.k !== 'v' ? shapeOf(doc, s.hit.at) : undefined);
  return { ...d, shapes: d.shapes.map((s) => ((n) => (n ? { ...s, k: SHAPES[n] } : s))(named(s))) };
}

/** The regions under a point of the picture: a lane by its plain name, or the sets of a Venn whose circles hold it as a key writes them ("Fast & Cheap", "R\&D & Sales"). */
export function regionAt(d: Diagram, x: number, y: number): string | undefined {
  const inside = d.shapes.filter(
    (s) => s.region !== undefined && (s.k === 'e' ? ((x - s.x - s.w / 2) / (s.w / 2)) ** 2 + ((y - s.y - s.h / 2) / (s.h / 2)) ** 2 <= 1 : x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h),
  );
  return inside.length ? inside.map((s) => s.region).join(' & ') : undefined;
}

/**
 * The diagram's one page, with words for anyone who cannot see it: as big as its kind lays it out. As a
 * thumbnail (`thumb`) a picture more than twice as wide as tall (a family tree of many) is its middle, twice as
 * wide as tall, so what shows can be read rather than a strip of specks.
 */
export function diagramPage(doc: Doc, upTo = Infinity, thumb = false): Page {
  const d = layout(doc);
  // Presented: the first `upTo` steps, which the layout may group (a lane with its first step); else a shape a step.
  const shown = d.steps ? (upTo >= d.steps.length ? Infinity : (d.steps[Math.floor(upTo) - 1] ?? 0)) : upTo;
  const page = { ...shapesPage(d.shapes, d.w, d.h, shown), alt: doc.head.alt || describeDrawing(d.shapes) || t('diagram-empty-diagram') };
  return thumb && d.w > 2 * d.h ? cropPage(page, Math.round((d.w - 2 * d.h) / 2), 0, 2 * d.h, d.h) : page;
}

export const diagramSvg = (doc: Doc): string => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(diagramPage(doc)) + '\n';

/** The diagram as a drawing Draw opens: scaled to fit its canvas, snapped to its grid, a row a shape. */
export function toDrawing(doc: Doc): string {
  const d = layout(doc);
  const k = Math.min(1, W / d.w, H / d.h);
  const g = (n: number) => Math.round((n * k) / GRID) * GRID;
  const shapes: Shape[] = d.shapes.map(({ hit: _h, region: _r, ...s }) =>
    isLink(s.k) ? s : { ...s, x: g(s.x), y: g(s.y), w: Math.max(GRID, g(s.w)), h: Math.max(GRID, g(s.h)), ...(k < 0.75 ? { z: 1 as TextSize } : {}) },
  );
  const fields = ['kind', 'x', 'y', 'w', 'h', 'style', 'label'] as const;
  const names = ['Kind', 'X', 'Y', 'W', 'H', 'Style', 'Label'];
  const head: Record<string, string> = doc.head.title ? { title: doc.head.title } : {};
  if (!shapes.length) return write({ head, blocks: [] });
  return write({ head, blocks: [{ k: 'table', cols: names.map((name) => ({ name, type: 'text' as const })), rows: shapes.map((s) => fields.map((f) => shapeCells(s)[f])) }] });
}
