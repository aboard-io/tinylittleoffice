/** Sticky notes: a wall of them, one per line. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, type Diagram } from '../lib/diagram.ts';
import { wrapText } from '../kit/core.ts';
import type { Color } from '../lib/drawmodel.ts';

const NAMES: Record<string, Color> = { red: 'r', orange: 'o', green: 'g', blue: 'b', purple: 'p' };
const NW = 168;
const NH = 124;

function layout(text: string): Diagram {
  const notes = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const perRow = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(notes.length))));
  return frame(
    notes.map((note, i) => {
      // "green: Call Sam" is a green note; yellow (orange, tinted) is what a note is otherwise.
      const m = /^(red|orange|green|blue|purple)\s*:\s*(.*)$/i.exec(note);
      const words = m ? m[2] : note;
      const icon = /^:[a-z0-9-]+\s/.exec(words)?.[0] ?? '';
      // Wrapped to the note; " | " is how a label says "new line".
      const lines = wrapText(words.slice(icon.length), NW - 28, 14).slice(0, 5);
      return shape('n', (i % perRow) * (NW + 16), Math.floor(i / perRow) * (NH + 16), NW, NH, icon + lines.join(' | '), 1, m ? NAMES[m[1].toLowerCase()] : 'o');
    }),
  );
}

export const spec = {
  form: [
    { name: 'Coloured note', is: '{Colour:choice=red,orange,green,blue,purple}: [:{Picture:icon} ]{Note}' },
    { name: 'Note', is: '[:{Picture:icon} ]{Note}' },
  ] as LineKind[],
  hint: 'One note per line. Start a line with a colour and a colon ("green: Call Sam") to colour it.',
  example: 'Ship the beta\ngreen: Thank the testers\nblue: Write the launch post\nred: Fix the login bug\nBook the offsite\npurple: Ask Sam about pricing',
  layout,
};

export default defineDiagram({ id: 'sticky', name: 'Sticky notes', icon: 'sticky', group: 'Visualization', under: 'draw', blurb: 'A wall of sticky notes, one per line, in any of six colours.' }, spec);
