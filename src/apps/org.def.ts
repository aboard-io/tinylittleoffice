/** Org chart: who reports to whom, from a nested list of "Name | Role" (lib/outlinemodel.ts). */
import type { Kind as LineKind } from '../lib/lines.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { plain } from '../lib/tlo.ts';
import { outlineLines, outlineToOrg, readTree } from '../lib/outlinemodel.ts';
import { defineDiagram, frame, join, outline, placeTree, shape, type Diagram } from '../lib/diagram.ts';

const BW = 156;
const BH = 54;

/** A person's name alone, for finding them: without their picture, their role or any marks. */
const who = (label: string) => plain(iconOf(label.trim())[1].split(' | ')[0]).trim().toLowerCase();

function layout(text: string): Diagram {
  const placed = placeTree(outline(text));
  const at = (name: string) => placed.findIndex((p) => who(p.node.text) === who(name));
  // "~ Ben -- Eve: advises": a dotted line between two people, beside the lines of who reports to whom.
  const dotted = readTree(text).links.flatMap((l) => {
    const [a, b] = [at(l.from), at(l.to)];
    return a >= 0 && b >= 0 && a !== b ? [join(a, b, false, l.label ?? '', 'p', 2)] : [];
  });
  // Boxes first, then the lines between them, so the numbers joins use are the boxes' own.
  const boxes = placed.map((p) => shape('o', p.across * (BW + 20), p.node.depth * (BH + 44), BW, BH, p.node.text, p.node.depth === 0 ? 2 : p.node.depth === 1 ? 1 : 0, p.node.depth < 2 ? 'b' : undefined));
  return frame([...boxes, ...placed.flatMap((p, i) => (p.parent < 0 ? [] : [join(p.parent, i, false)])), ...dotted]);
}

export const spec = {
  form: [
    { name: 'Dotted line', is: '~ {From:pick} -- {To:pick}[: {What it means}]' },
    { name: 'Person', is: '[:{Picture:icon} ]{Name}[ | {Role}]', indent: true },
  ] as LineKind[],
  hint: 'A list: a person per item, "- Name | Role", two spaces in to put them under the person above. "~ Ben -- Eve: advises" draws a dotted line between two people.',
  example: '- Ada Diaz | Chief executive\n  - Ben Okoro | Engineering\n    - Cy Lund | Platform\n    - Di Shah | Apps\n  - Eve Marsh | Design\n  - Flo Reyes | Sales\n\n~ Cy Lund -- Eve Marsh: design partner',
  layout,
};

/** Loose Markdown as an org chart: any edge is a dotted line. */
const read = (text: string) => {
  const { items, links } = readTree(text);
  return outlineToOrg(items, links);
};

export default defineDiagram({ id: 'org', name: 'Org chart', icon: 'org', blurb: 'Who reports to whom, drawn from an indented list.', outline: outlineLines, read }, spec);
