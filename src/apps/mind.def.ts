/** Mind map: an idea and what branches from it, from a nested list (lib/outlinemodel.ts). */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, join, outline, placeTree, shape, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import { textWidth, wrapText } from '../kit/core.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { outlineLines, readOutline } from '../lib/outlinemodel.ts';

function layout(text: string): Diagram {
  const placed = placeTree(outline(text));
  // Each branch off the centre keeps one colour all the way out.
  let branch = -1;
  const colour = placed.map((p) => (p.node.depth === 0 ? undefined : COLOR_CYCLE[(p.node.depth === 1 ? ++branch : branch) % COLOR_CYCLE.length]));
  // A long idea wraps inside its box, which grows down to hold it; the rows space out to the tallest box.
  const sized = placed.map((p) => {
    const d = p.node.depth;
    const px = d === 0 ? 17 : 14;
    const words = iconOf(p.node.text)[1];
    const w = Math.max(72, Math.min(220, textWidth(words, px, d === 0) + 32 + (iconOf(p.node.text)[0] ? px * 1.4 : 0)));
    const lines = Math.min(5, wrapText(words, w - 16 - (iconOf(p.node.text)[0] ? px * 1.4 : 0), px, d === 0).length);
    return { w, h: Math.max(d === 0 ? 44 : 34, lines * px * 1.25 + 14) };
  });
  const pitch = Math.max(50, ...sized.map((z) => z.h + 16));
  const boxes = placed.map((p, i) => {
    const d = p.node.depth;
    return shape('o', d * 210, p.across * pitch, sized[i].w, sized[i].h, p.node.text, d === 0 ? 2 : d === 1 ? 1 : 0, colour[i], d === 0 ? 3 : undefined);
  });
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false, '', colour[i])]))]);
}

export const spec = {
  form: [
    { name: 'Idea', is: '[:{Picture:icon} ]{Idea}', indent: true },
  ] as LineKind[],
  hint: 'A list: "- The idea" first, then "  - " two spaces in for each branch, and two more to go further.',
  example: '- Launch\n  - Product\n    - Pricing\n    - Onboarding\n  - Marketing\n    - Press\n    - Social\n  - Support\n    - Help pages',
  layout,
};

export default defineDiagram({ id: 'mind', name: 'Mind map', icon: 'mind', blurb: 'An idea and everything that branches from it, drawn from an indented list.', outline: outlineLines, read: readOutline }, spec);
