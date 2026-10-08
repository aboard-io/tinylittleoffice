/** Seating chart: tables, and who sits round each. */
import { listItems, readLines, type Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, readItems, shape, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import { iconOf, type Shape } from '../lib/drawmodel.ts';
import { fitted } from '../lib/fold.ts';
import { tile } from '../lib/print.ts';
import type { Page } from '../kit/core.ts';

const form: LineKind[] = [{ name: 'Table', is: '- {Table}: {Who:list}' }];

/** The tables, each with its people in the order given. */
function parse(text: string): { name: string; people: string[] }[] {
  return readLines(text, form)
    .filter((r) => r.kind === 0)
    .map((r) => ({ name: r.values[0], people: listItems(r.values[1]).filter(Boolean) }));
}

function layout(text: string): Diagram {
  const tables = parse(text);
  const perRow = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const shapes: Shape[] = [];
  tables.forEach(({ name, people }, t) => {
    const [cx, cy] = [(t % perRow) * 330 + 165, Math.floor(t / perRow) * 290 + 145];
    shapes.push(shape('e', cx - 60, cy - 46, 120, 92, name, 1, COLOR_CYCLE[t % COLOR_CYCLE.length]));
    // Round the table, clockwise from the top.
    people.forEach((p, i) => {
      const a = (i / people.length) * 2 * Math.PI - Math.PI / 2;
      shapes.push(shape('o', cx + Math.cos(a) * 118 - 44, cy + Math.sin(a) * 100 - 14, 88, 28, p, 0, COLOR_CYCLE[t % COLOR_CYCLE.length], 1));
    });
  });
  return frame(shapes);
}

/** A place card per seated person: their name large, their table small, 4 by 2.5 inches; eight to a letter sheet, with lines to cut along. */
export function placeCards(text: string): Page[] {
  const cards = parse(text).flatMap(({ name, people }) =>
    people.map((p) => {
      const [icon, who] = iconOf(p);
      return fitted({ icon, title: who, bullets: [iconOf(name)[1]] }, 384, 240, { cover: true });
    }),
  );
  return tile(cards, 2, 4);
}

export const spec = {
  form,
  hint: 'A table per line: "- Table name: Ann, Bob, Cy". People are seated round it in the order given.',
  example: '- Top table: Sam, Paul, Ada, Grace, Alan, Margaret\n- Table 2: Linus, Barbara, Ken, Dennis, Edsger\n- Table 3: Tim, Vint, Radia, Leslie',
  layout,
};

export default defineDiagram(
  {
    id: 'seating',
    name: 'Seating chart',
    icon: 'seating',
    blurb: 'Who sits where: tables, with their people round them.',
    read: readItems(form),
    downloads: [{ ext: 'cards.pdf', label: 'Place cards (PDF)', mime: 'application/pdf', pages: placeCards }],
  },
  spec,
);
