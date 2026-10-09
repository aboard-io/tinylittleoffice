/** Venn diagram: two or three sets, and what they share. */
import { listItems, readLines, type Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, readItems, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import { textWidth } from '../kit/core.ts';
import type { Shape } from '../lib/drawmodel.ts';

const R = 150;
/** The distance between circle centres: close enough that two circles share a lens with room for words. */
const D = R * 1.12;
/** Where the circles sit, for one, two or three sets: side by side, or a triangle. */
const centres = (n: number): [number, number][] => (n === 1 ? [[R, R]] : n === 2 ? [[R, R], [R + D, R]] : [[R, R], [R + D, R], [R + D / 2, R + D * 0.87]]);

const form: LineKind[] = [
  { name: 'Shared', is: '- {One set} & {Other sets}: {What they share:list}' },
  { name: 'Set', is: '- {Set}: {What is in it:list}' },
];

/** The lines as sets (at most three) and what each group of them holds; a set named twice is one set, its things together. */
function parse(text: string) {
  const groups: { names: string[]; items: string[] }[] = [];
  for (const r of readLines(text, form)) {
    if (r.kind >= form.length) continue;
    const [names, items] = r.kind === 0 ? [`${r.values[0]} & ${r.values[1]}`, r.values[2]] : r.values;
    const key = names.split('&').map((n) => n.trim()).filter(Boolean);
    const same = groups.find((g) => g.names.length === key.length && g.names.every((n, i) => n.toLowerCase() === key[i].toLowerCase()));
    if (same) same.items.push(...listItems(items).filter(Boolean));
    else groups.push({ names: key, items: listItems(items).filter(Boolean) });
  }
  return { groups, sets: [...new Set(groups.filter((g) => g.names.length === 1).map((g) => g.names[0]))].slice(0, 3) };
}

/** The middle of a region: the circles it is in, pushed away from the ones it is not. */
function regionCentre(idx: number[], all: [number, number][]): [number, number] {
  const mid = (pts: [number, number][]): [number, number] => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
  const [cx, cy] = mid(idx.map((i) => all[i]));
  const others = all.filter((_, i) => !idx.includes(i));
  if (!others.length) return [cx, cy];
  const [ox, oy] = mid(others);
  // Alone in its circle, a region's room is the far side from the rest; a lens of two is pushed a little from the third.
  const push = idx.length === 1 ? (all.length === 2 ? 0.55 : 0.6) : 0.42;
  const len = Math.hypot(cx - ox, cy - oy) || 1;
  return [cx + ((cx - ox) / len) * R * push, cy + ((cy - oy) / len) * R * push];
}

function layout(text: string): Diagram {
  const { groups, sets } = parse(text);
  if (!sets.length) return frame([]);
  const at = centres(sets.length);
  const circles: Shape[] = sets.map((_, i) => shape('e', at[i][0] - R, at[i][1] - R, R * 2, R * 2, '', 1, COLOR_CYCLE[i]));
  const names: Shape[] = sets.map((name, i) => {
    const below = sets.length === 3 && i === 2;
    // (Text is drawn from its left edge, so to centre a line, start it half its width back.)
    const w = textWidth(name, 20, true) + 16;
    return shape('t', at[i][0] - w / 2, below ? at[i][1] + R + 8 : at[i][1] - R - 34, w, 26, name, 0, COLOR_CYCLE[i], 3);
  });
  // The things of each region, one under another from its middle, in columns of a dozen when there are more than
  // that; each wide enough for its words, so none wraps onto its neighbour.
  const LINE = 17;
  const PER = 12;
  const lists: Shape[] = groups.flatMap((g) => {
    const idx = g.names.map((n) => sets.findIndex((x) => x.toLowerCase() === n.toLowerCase()));
    if (idx.includes(-1) || !g.items.length) return [];
    const [cx, cy] = regionCentre(idx, at);
    const cols = Array.from({ length: Math.ceil(g.items.length / PER) }, (_, c) => g.items.slice(c * PER, c * PER + PER));
    const widths = cols.map((col) => Math.max(...col.map((item) => textWidth(item, 11) + 14)));
    const total = widths.reduce((a, w) => a + w, 0) + (cols.length - 1) * 6;
    let x = cx - total / 2;
    return cols.flatMap((col, c) => {
      const left = x;
      x += widths[c] + 6;
      return col.map((item, k) => {
        const w = textWidth(item, 11) + 14;
        return shape('t', left + (widths[c] - w) / 2, cy - (col.length * LINE) / 2 + k * LINE, w, LINE, item, 0, undefined, 1);
      });
    });
  });
  return frame([...circles, ...names, ...lists], 56);
}

export const spec = {
  form,
  hint: 'A set per line: "- Name: thing, thing". What two share: "- A & B: thing". What all share: "- A & B & C: thing".',
  example: '- Fast: sprinting, espresso\n- Cheap: instant noodles, walking\n- Good: slow cooking\n- Fast & Cheap: fast food\n- Cheap & Good: home cooking\n- Fast & Good: a great takeaway\n- Fast & Cheap & Good: toast',
  layout,
  // A tap inside the circles adds a thing to the sets round it ("Fast & Cheap"); a thing dropped there moves into them.
  keyAt(text: string, x: number, y: number) {
    const { sets } = parse(text);
    const circles = layout(text).shapes.filter((s) => s.k === 'e');
    const inside = sets.filter((_, i) => {
      const c = circles[i];
      return c && ((x - c.x - c.w / 2) / (c.w / 2)) ** 2 + ((y - c.y - c.h / 2) / (c.h / 2)) ** 2 <= 1;
    });
    return inside.length ? inside.join(' & ') : undefined;
  },
};

export default defineDiagram({ id: 'venn', name: 'Venn', icon: 'venn', blurb: 'Two or three sets as overlapping circles, with what belongs where.', read: readItems(form) }, spec);
