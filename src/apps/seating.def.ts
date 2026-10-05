/** Seating chart: tables, and who sits round each. */
import { defineDiagram, frame, shape, PALETTE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

function layout(text: string): Diagram {
  const tables = text.split('\n').map((l) => l.split(/:(.*)/).map((p) => p.trim())).filter((t) => t[0]);
  const perRow = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const shapes: Shape[] = [];
  tables.forEach(([name, who = ''], t) => {
    const [cx, cy] = [(t % perRow) * 330 + 165, Math.floor(t / perRow) * 290 + 145];
    const people = who.split(',').map((p) => p.trim()).filter(Boolean);
    shapes.push(shape('e', cx - 60, cy - 46, 120, 92, name, 1, PALETTE[t % PALETTE.length]));
    // Round the table, clockwise from the top.
    people.forEach((p, i) => {
      const a = (i / people.length) * 2 * Math.PI - Math.PI / 2;
      shapes.push(shape('o', cx + Math.cos(a) * 118 - 44, cy + Math.sin(a) * 100 - 14, 88, 28, p, 0, PALETTE[t % PALETTE.length], 1));
    });
  });
  return frame(shapes);
}

export const spec = {
  hint: 'A table per line: "Table name: Ann, Bob, Cy". People are seated round it in the order given.',
  example: 'Top table: Sam, Paul, Ada, Grace, Alan, Margaret\nTable 2: Linus, Barbara, Ken, Dennis, Edsger\nTable 3: Tim, Vint, Radia, Leslie',
  layout,
};

export default defineDiagram({ id: 'seating', group: 'Visualization', under: 'draw', name: 'Seating chart', icon: 'seating', blurb: 'Who sits where: tables, with their people round them.' }, spec);
