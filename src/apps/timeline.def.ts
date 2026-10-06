/** Timeline: what happened, in order, along a line. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, join, PALETTE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

function layout(text: string): Diagram {
  const events = text.split('\n').map((l) => l.split(/:(.*)/).map((p) => p.trim())).filter((e) => e[0]);
  const shapes: Shape[] = [];
  const joins: Shape[] = [];
  events.forEach(([when, what = ''], i) => {
    const x = i * 150;
    // A dot on the line, joined to the dot before it, and to its box: above and below, turn about.
    shapes.push(shape('e', x + 60, 132, 16, 16, '', 2, PALETTE[i % PALETTE.length]), shape('o', x, i % 2 ? 190 : 20, 136, 64, what ? `${when} | ${what}` : when, 1, PALETTE[i % PALETTE.length], 1));
    if (i) joins.push(join(2 * i - 2, 2 * i, false));
    joins.push(join(2 * i, 2 * i + 1, false));
  });
  return frame([...shapes, ...joins]);
}

export const spec = {
  form: [
    { name: 'Event', is: '{When}: {What happened}' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: 'An event per line, in order: "When: what happened".',
  example: '1843: Lovelace publishes her notes\n1936: Turing describes his machine\n1969: The first ARPANET message\n1989: The web is proposed\n2007: The phone becomes a computer',
  layout,
};

export default defineDiagram({ id: 'timeline', group: 'Design', under: 'draw', name: 'Timeline', icon: 'timeline', blurb: 'A timeline: events in order along a line.' }, spec);
