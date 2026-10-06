/** Org chart: who reports to whom, from an indented list. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { defineDiagram, frame, join, outline, placeTree, shape, type Diagram } from '../lib/diagram.ts';

const BW = 156;
const BH = 54;

/** "Ben .. Eve: advises": a dotted line between two people, beside the lines of who reports to whom. */
const DOTTED = /^\s*(.+?)\s*\.\.\s*(.+?)(?:\s*:\s*(.*))?$/;
const who = (label: string) => iconOf(label)[1].split(' | ')[0].trim().toLowerCase();

function layout(text: string): Diagram {
  const lines = text.split('\n');
  const placed = placeTree(outline(lines.filter((l) => !DOTTED.test(l)).join('\n')));
  const at = (name: string) => placed.findIndex((p) => who(p.node.text) === name.trim().toLowerCase());
  const dotted = lines.flatMap((l) => {
    const m = DOTTED.exec(l);
    const [a, b] = m ? [at(m[1]), at(m[2])] : [-1, -1];
    return a >= 0 && b >= 0 && a !== b ? [join(a, b, false, m![3] ?? '', 'p', 2)] : [];
  });
  // Boxes first, then the lines between them, so the numbers joins use are the boxes' own.
  const boxes = placed.map((p) => shape('o', p.across * (BW + 20), p.node.depth * (BH + 44), BW, BH, p.node.text, p.node.depth === 0 ? 2 : p.node.depth === 1 ? 1 : 0, p.node.depth < 2 ? 'b' : undefined));
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false)])), ...dotted]);
}

export const spec = {
  form: [
    { name: 'Dotted line', is: '{From:pick} .. {To:pick}[: {What it means}]' },
    { name: 'Person', is: '[:{Picture:icon} ]{Name}[ | {Role}]', indent: true },
  ] as LineKind[],
  hint: 'One person per line, "Name | Role". Indent a line to put them under the person above. "Ben .. Eve: advises" draws a dotted line between two people.',
  example: 'Ada Diaz | Chief executive\n  Ben Okoro | Engineering\n    Cy Lund | Platform\n    Di Shah | Apps\n  Eve Marsh | Design\n  Flo Reyes | Sales\nCy Lund .. Eve Marsh: design partner',
  layout,
};

export default defineDiagram({ id: 'org', group: 'Visualization', under: 'draw', name: 'Org chart', icon: 'org', blurb: 'Who reports to whom, drawn from an indented list.' }, spec);
