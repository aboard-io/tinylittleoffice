/** Floor plan: rooms by their size, to scale. */
import { defineDiagram, frame, shape, PALETTE, type Diagram } from '../lib/diagram.ts';

const U = 36;
function layout(text: string): Diagram {
  let next = 0;
  return frame(
    text.split('\n').flatMap((l, i) => {
      // "Kitchen: 4 x 3 at 5,0": a size, and where its top left corner is. Without "at", rooms go side by side.
      const m = /^(.*?):\s*([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*(?:at|@)\s*([\d.]+)\s*,\s*([\d.]+))?/i.exec(l.trim());
      if (!m) return [];
      const [w, h] = [+m[2], +m[3]];
      const [x, y] = m[4] ? [+m[4], +m[5]] : [next, 0];
      if (!m[4]) next += w;
      return [shape('r', x * U, y * U, w * U, h * U, `${m[1].trim()} | ${w} × ${h}`, 1, PALETTE[i % PALETTE.length])];
    }),
  );
}

export const spec = {
  hint: 'A room per line: "Name: width x depth at left,top" (in metres, feet, anything). Leave out "at" and rooms line up side by side.',
  example: 'Living room: 5 x 4 at 0,0\nKitchen: 3 x 4 at 5,0\nHall: 8 x 1.5 at 0,4\nBedroom: 4 x 3.5 at 0,5.5\nBath: 2 x 3.5 at 4,5.5\nStudy: 2 x 3.5 at 6,5.5',
  layout,
};

export default defineDiagram({ id: 'floor', group: 'Visualization', under: 'draw', name: 'Floor plan', icon: 'floor', blurb: 'A floor plan to scale, from a list of rooms and their sizes.' }, spec);
