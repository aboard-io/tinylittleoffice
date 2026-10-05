/** Org chart: who reports to whom, from an indented list. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, join, outline, placeTree, shape, type Diagram } from '../lib/diagram.ts';

const BW = 156;
const BH = 54;

function layout(text: string): Diagram {
  const placed = placeTree(outline(text));
  // Boxes first, then the lines between them, so the numbers joins use are the boxes' own.
  const boxes = placed.map((p) => shape('o', p.across * (BW + 20), p.node.depth * (BH + 44), BW, BH, p.node.text, p.node.depth === 0 ? 2 : p.node.depth === 1 ? 1 : 0, p.node.depth < 2 ? 'b' : undefined));
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false)]))]);
}

export const spec = {
  form: [
    { name: 'Person', is: '[:{Picture:icon} ]{Name}[ | {Role}]', indent: true },
  ] as LineKind[],
  hint: 'One person per line, "Name | Role". Indent a line to put them under the person above.',
  example: 'Ada Diaz | Chief executive\n  Ben Okoro | Engineering\n    Cy Lund | Platform\n    Di Shah | Apps\n  Eve Marsh | Design\n  Flo Reyes | Sales',
  layout,
};

export default defineDiagram({ id: 'org', group: 'Visualization', under: 'draw', name: 'Org chart', icon: 'org', blurb: 'Who reports to whom, drawn from an indented list.' }, spec);
