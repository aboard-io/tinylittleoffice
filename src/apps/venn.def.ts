/** Venn diagram: two or three sets, and what they share. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import { textWidth } from '../kit/core.ts';
import type { Shape } from '../lib/drawmodel.ts';

const R = 130;

/** The lines as sets (at most three) and what each group of them holds. */
function parse(text: string) {
  const groups = text
    .split('\n')
    .map((l) => /^\s*([^:]+):\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ names: m[1].split('&').map((n) => n.trim()).filter(Boolean), items: m[2].split(',').map((t) => t.trim()).filter(Boolean) }));
  return { groups, sets: [...new Set(groups.filter((g) => g.names.length === 1).map((g) => g.names[0]))].slice(0, 3) };
}

function layout(text: string): Diagram {
  const { groups, sets } = parse(text);
  if (!sets.length) return frame([]);
  // Circle centres: side by side, or a triangle for three.
  const centres: [number, number][] = sets.length === 1 ? [[R, R]] : sets.length === 2 ? [[R, R], [R * 2.15, R]] : [[R, R], [R * 2.15, R], [R * 1.575, R * 2]];
  const circles: Shape[] = sets.map((_, i) => shape('e', centres[i][0] - R, centres[i][1] - R, R * 2, R * 2, '', 1, COLOR_CYCLE[i]));
  const names: Shape[] = sets.map((name, i) => {
    const below = sets.length === 3 && i === 2;
    // (Text is drawn from its left edge, so to centre a line, start it half its width back.)
    const w = textWidth(name, 20) + 8;
    return shape('t', centres[i][0] - w / 2, below ? centres[i][1] + R + 6 : centres[i][1] - R - 30, w, 24, name, 0, COLOR_CYCLE[i], 3);
  });
  const lists: Shape[] = groups.flatMap((g) => {
    const idx = g.names.map((n) => sets.indexOf(n));
    if (idx.includes(-1) || !g.items.length) return [];
    // The middle of the circles it belongs to, pushed away from the ones it does not.
    let cx = idx.reduce((a, i) => a + centres[i][0], 0) / idx.length;
    let cy = idx.reduce((a, i) => a + centres[i][1], 0) / idx.length;
    const all = [centres.reduce((a, c) => a + c[0], 0) / centres.length, centres.reduce((a, c) => a + c[1], 0) / centres.length];
    if (idx.length < sets.length) {
      const push = idx.length === 1 ? 0.55 : 0.35;
      cx += (cx - all[0]) * push;
      cy += (cy - all[1]) * push;
    }
    return g.items.map((item, k) => {
      const w = textWidth(item, 11) + 8;
      return shape('t', cx - w / 2, cy - (g.items.length * 18) / 2 + k * 18, w, 18, item, 0, undefined, 1);
    });
  });
  return frame([...circles, ...names, ...lists], 56);
}

export const spec = {
  form: [
    { name: 'Shared', is: '{One set} & {Other sets}: {What they share:list}' },
    { name: 'Set', is: '{Set}: {What is in it:list}' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: 'A set per line: "Name: thing, thing". What two share: "A & B: thing". What all share: "A & B & C: thing".',
  example: 'Fast: sprinting, espresso\nCheap: instant noodles, walking\nGood: slow cooking\nFast & Cheap: fast food\nCheap & Good: home cooking\nFast & Good: a great takeaway\nFast & Cheap & Good: toast',
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

export default defineDiagram({ id: 'venn', name: 'Venn', icon: 'venn', blurb: 'Two or three sets as overlapping circles, with what belongs where.' }, spec);
