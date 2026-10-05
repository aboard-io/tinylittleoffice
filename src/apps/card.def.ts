/** Group card: a greeting, and a note from everyone, on one page to print. */
import { definePrint, LETTER } from '../lib/print.ts';
import { h1, rest } from '../lib/diagram.ts';
import { fitted } from '../lib/fold.ts';
import { rect, place } from '../kit/core.ts';

const TINTS = ['#eef2ff', '#dcfce7', '#ffedd5', '#f3e8ff', '#fee2e2', '#cffafe'];

export const spec = {
  hint: '"# The greeting", then a line from each person: "Name: what they want to say". Everyone adds theirs and passes the link on.',
  example: '# Happy birthday, Sam!\nPaul: Many happy returns. Biscuit says woof.\nAda: You make the office better. Have a great one!\nGrace: Cake at three. Do not be late to your own party.\nAlan: Happy birthday! Here is to another lap round the sun.',
  sheets: (body: string) => {
    const notes = rest(body).map((l) => l.split(/:(.*)/).map((p) => p.trim()));
    const { w, h } = LETTER;
    const rows = Math.max(1, Math.ceil(notes.length / 2));
    const [cw, ch] = [(w - 96 - 16) / 2, Math.min(220, (h - 300 - (rows - 1) * 16) / rows)];
    let svg = fitted({ icon: '', title: h1(body), bullets: [] }, w, 250, { cover: true, max: 60, m: 48 }).svg;
    notes.forEach(([who, says = ''], i) => {
      const [x, y] = [48 + (i % 2) * (cw + 16), 250 + Math.floor(i / 2) * (ch + 16)];
      svg += rect(x, y, cw, ch, TINTS[i % TINTS.length], 'rx="12"') + place(fitted({ icon: '', title: '', bullets: [says, `— ${who}`] }, cw, ch, { max: 20, m: 18 }), x, y, cw, ch);
    });
    return [{ w, h, svg }];
  },
};

export default definePrint({ id: 'card', under: undefined, group: 'Together', name: 'Group card', icon: 'card', blurb: 'A card everyone signs: each adds a line, then it prints on one page.' }, spec);
