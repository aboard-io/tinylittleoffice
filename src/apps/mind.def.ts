/** Mind map: an idea and what branches from it, from an indented list. */
import { defineDiagram, frame, join, outline, placeTree, shape, PALETTE, type Diagram } from '../lib/diagram.ts';
import { textWidth } from '../kit/core.ts';

function layout(text: string): Diagram {
  const placed = placeTree(outline(text));
  // Each branch off the centre keeps one colour all the way out.
  let branch = -1;
  const colour = placed.map((p) => (p.node.depth === 0 ? undefined : PALETTE[(p.node.depth === 1 ? ++branch : branch) % PALETTE.length]));
  const boxes = placed.map((p, i) => {
    const d = p.node.depth;
    const w = Math.max(72, Math.min(220, textWidth(p.node.text, 14, d === 0) + 32));
    return shape('o', d * 210, p.across * 50, w, d === 0 ? 44 : 34, p.node.text, d === 0 ? 2 : d === 1 ? 1 : 0, colour[i], d === 0 ? 3 : undefined);
  });
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false, '', colour[i])]))]);
}

export const spec = {
  hint: 'The idea on the first line; indent lines under it to branch out, and under those to go further.',
  example: 'Launch\n  Product\n    Pricing\n    Onboarding\n  Marketing\n    Press\n    Social\n  Support\n    Help pages',
  layout,
};

export default defineDiagram({ id: 'mind', group: 'Visualization', under: 'draw', name: 'Mind map', icon: 'mind', blurb: 'An idea and everything that branches from it, drawn from an indented list.' }, spec);
