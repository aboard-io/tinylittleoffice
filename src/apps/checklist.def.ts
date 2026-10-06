/** Checklist: sections and things to tick, on one page to print. Packing, moving, launching. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { text, rect, wrapText, ACCENT, FAINT } from '../kit/core.ts';

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Section', is: '## {Section}', head: true },
    { name: 'Thing', is: '{Thing to tick}' },
  ] as LineKind[],
  hint: '"# Title", "## Section", then a thing to tick per line. However long, it is fitted to one page (in two columns once it gets long).',
  example: '# Packing for the coast\n## Clothes\nWaterproof\nTwo jumpers\nWalking boots\nSwimming things\n## Kit\nPhone charger\nBinoculars\nMap\nFlask\n## Before leaving\nWater the plants\nEmpty the bins\nLock the back door',
  sheets: (body: string) => {
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const cols = lines.length > 26 ? 2 : 1;
    const cw = 720 / cols;
    const per = Math.ceil((lines.length - 1) / cols);
    let svg = '';
    let [x, y, n, top] = [0, 0, 0, 0];
    for (const l of lines) {
      if (l.startsWith('# ')) {
        svg += text(0, (y += 44), l.slice(2), { px: 36, bold: true });
        top = y += 12;
        continue;
      }
      if (cols > 1 && n++ === per) [x, y] = [cw, top];
      if (l.startsWith('## ')) svg += text(x, (y += 40), l.slice(3).toUpperCase(), { px: 13, bold: true, fill: ACCENT });
      else wrapText(l, cw - 50, 17).forEach((row, i) => (svg += (i ? '' : rect(x, y + 12, 18, 18, 'none', `rx="4" stroke="${FAINT}" stroke-width="1.5"`)) + text(x + 30, (y += 30) - 3, row, { px: 17 })));
    }
    return [onLetter({ w: 720, h: Math.max(200, (cols > 1 ? top + per * 34 : y) + 30), svg }, 60)];
  },
};

export default definePrint({ id: 'checklist', under: undefined, group: 'Plan', name: 'Checklist', icon: 'checklist', blurb: 'A checklist to print: sections and boxes to tick, fitted to one page.' }, spec);
