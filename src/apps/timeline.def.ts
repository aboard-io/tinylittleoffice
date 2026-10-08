/** Timeline: what happened, in order, along a line. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, join, readItems, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

const form: LineKind[] = [{ name: 'Event', is: '- {When}: {What happened}' }];

function layout(text: string): Diagram {
  const events = readLines(text, form).filter((r) => r.kind === 0).map((r) => r.values);
  const shapes: Shape[] = [];
  const joins: Shape[] = [];
  // Six to a row; a long timeline winds down the page rather than shrinking to a thread.
  const PER = 6;
  events.forEach(([when, what = ''], i) => {
    const row = Math.floor(i / PER);
    const col = i % PER;
    const x = (row % 2 ? PER - 1 - col : col) * 150;
    const y = row * 280;
    // A dot on the line, joined to the dot before it, and to its box: above and below, turn about.
    shapes.push(shape('e', x + 60, y + 132, 16, 16, '', 2, COLOR_CYCLE[i % COLOR_CYCLE.length]), shape('o', x, y + (i % 2 ? 190 : 20), 136, 64, what ? `${when} | ${what}` : when, 1, COLOR_CYCLE[i % COLOR_CYCLE.length], 1));
    if (i) joins.push(join(2 * i - 2, 2 * i, false));
    joins.push(join(2 * i, 2 * i + 1, false));
  });
  return frame([...shapes, ...joins]);
}

export const spec = {
  form,
  hint: 'An event per line, in order: "- When: what happened".',
  example: '- 1843: Lovelace publishes her notes\n- 1936: Turing describes his machine\n- 1969: The first ARPANET message\n- 1989: The web is proposed\n- 2007: The phone becomes a computer',
  layout,
};

export default defineDiagram({ id: 'timeline', name: 'Timeline', icon: 'timeline', blurb: 'A timeline: events in order along a line.', read: readItems(form) }, spec);
