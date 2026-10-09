/** Venn diagram: two or three sets, and what they share. */
import { listItems, readLines, type Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, readItems, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import { textWidth, wrapText } from '../kit/core.ts';
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

/**
 * The middle of a region (the circles it is in, and not the others): the
 * point farthest from every edge, found on a coarse grid; and how far that
 * is, which is the room the region's words have.
 */
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

const LINE = 17;
const PX = 11;

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
  // The things of each region, one under another from its middle, each wide enough for its words, so none runs into
  // its neighbour; a thing too wide for the region wraps onto two lines; more things than stand in one column stand
  // in two or three beside each other, the block kept inside its circles and out of the others.
  const lists: Shape[] = groups.flatMap((g) => {
    const idx = g.names.map((n) => sets.findIndex((x) => x.toLowerCase() === n.toLowerCase()));
    if (idx.includes(-1) || !g.items.length) return [];
    const { cx, cy, room } = regionCentre(idx, at);
    const widest = Math.max(72, 2 * room - 10);
    const items = g.items.map((item) => {
      const w = Math.min(textWidth(item, PX) + 14, widest);
      return { item, w, h: wrapText(item, w - 8, PX).length * LINE };
    });
    // How tall a block this wide may be here: within the chord of every circle it is in, and clear of the others above or below.
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
    let widths = [Math.max(...items.map((it) => it.w))];
    let [top, bottom] = roomY(widths[0]);
    const height = (cs: typeof cols) => Math.max(...cs.map((col) => col.reduce((a, x) => a + x.h, 0)));
    for (let n = 2; n <= 3 && height(cols) > bottom - top && n <= items.length; n++) {
      const more = split(n);
      const ws = more.map((col) => Math.max(...col.map((it) => it.w)));
      const [t, b] = roomY(ws.reduce((a, w) => a + w, 0) + (n - 1) * 6);
      // Only if the wider block has more room for its shorter columns than the narrower one had for its taller.
      if (b - t > height(more) || b - t - height(more) > bottom - top - height(cols)) [cols, widths, top, bottom] = [more, ws, t, b];
    }
    const total = widths.reduce((a, w) => a + w, 0) + (cols.length - 1) * 6;
    const tall = height(cols);
    const y0 = Math.max(top, Math.min(cy - tall / 2, bottom - tall));
    let x = cx - total / 2;
    return cols.flatMap((col, c) => {
      const left = x;
      x += widths[c] + 6;
      let y = y0;
      return col.map(({ item, w, h }) => {
        const s = shape('t', left + (widths[c] - w) / 2, y, w, h, item, 0, undefined, 1);
        y += h;
        return s;
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
