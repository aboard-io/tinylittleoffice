/** Floor plan: rooms by their size, to scale. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { asItems, defineDiagram, frame, readItems, shape, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';

const U = 36;
const form: LineKind[] = [{ name: 'Room', is: '- {Room}: {Width} x {Depth}[ at {Left},{Top}]' }];

function layout(text: string): Diagram {
  let next = 0;
  return frame(
    readLines(text, form).flatMap((r, i) => {
      // A size, and where its top left corner is. Without "at", rooms go side by side.
      const [room, w, h, left, top] = [r.values[0], +r.values[1], +r.values[2], r.values[3], r.values[4]];
      if (r.kind || !(w > 0 && h > 0)) return [];
      const [x, y] = left ? [+left || 0, +top || 0] : [next, 0];
      if (!left) next += w;
      return [shape('r', x * U, y * U, w * U, h * U, `${room} | ${w} × ${h}`, 1, COLOR_CYCLE[i % COLOR_CYCLE.length])];
    }),
  );
}

/** Rooms as they are loosely written: "4×3" and "@ 5,0" as well. */
const read = (text: string) => readItems(form)(asItems(text).replace(/(\d)\s*×\s*(?=\d)/g, '$1 x ').replace(/\s*@\s*(?=[\d.]+\s*,)/g, ' at '));

export const spec = {
  form,
  moves: { kind: 0, x: 3, y: 4, unit: U },
  hint: 'A room per line: "- Name: width x depth at left,top" (in metres, feet, anything). Leave out "at" and rooms line up side by side.',
  example: '- Living room: 5 x 4 at 0,0\n- Kitchen: 3 x 4 at 5,0\n- Hall: 8 x 1.5 at 0,4\n- Bedroom: 4 x 3.5 at 0,5.5\n- Bath: 2 x 3.5 at 4,5.5\n- Study: 2 x 3.5 at 6,5.5',
  layout,
};

export default defineDiagram({ id: 'floor', name: 'Floor plan', icon: 'floor', blurb: 'A floor plan to scale, from a list of rooms and their sizes.', read }, spec);
