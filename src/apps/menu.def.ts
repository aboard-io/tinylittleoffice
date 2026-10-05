/** Menu: sections, dishes and prices on exactly one page. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { text, wrapText, textWidth, ACCENT, MUTED, LINE, type Page } from '../kit/core.ts';

/** "# Name", a line about it, "## Section", then "Dish | price | what it is". */
function sheet(body: string): Page {
  const w = 624;
  let y = 0;
  let svg = '';
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      y += 34;
      svg += text(w / 2, y, line.slice(3).toUpperCase(), { px: 14, bold: true, fill: ACCENT, anchor: 'middle' }) + `<line x1="${w / 2 - 40}" y1="${y + 10}" x2="${w / 2 + 40}" y2="${y + 10}" stroke="${ACCENT}"/>`;
      y += 22;
    } else if (line.startsWith('# ')) svg += text(w / 2, (y += 52), line.slice(2), { px: 44, bold: true, anchor: 'middle' });
    else if (line.includes('|')) {
      const [dish, price = '', about = ''] = line.split('|').map((p) => p.trim());
      y += 30;
      // Dots lead the eye from the dish to its price.
      const [from, to] = [textWidth(dish, 18, true) + 8, w - textWidth(price, 18) - 8];
      svg += text(0, y, dish, { px: 18, bold: true }) + text(w, y, price, { px: 18, anchor: 'end' }) + (to > from ? `<line x1="${from}" y1="${y - 2}" x2="${to}" y2="${y - 2}" stroke="${LINE}" stroke-dasharray="1 5" stroke-width="2" stroke-linecap="round"/>` : '');
      for (const l of about ? wrapText(about, w - 90, 14) : []) svg += text(0, (y += 20), l, { px: 14, fill: MUTED });
    } else for (const l of wrapText(line, w - 80, 16)) svg += text(w / 2, (y += 26), l, { px: 16, fill: MUTED, anchor: 'middle' });
  }
  return onLetter({ w, h: Math.max(200, y + 20), svg }, 84);
}

export const spec = {
  form: [
    { name: 'Name', is: '# {Name}', once: true },
    { name: 'Section', is: '## {Section}' },
    { name: 'Dish', is: '{Dish} | {Price}[ | {What it is}]' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: '"# Name" and a line about it; "## Section" starts each part; a dish per line: "Dish | price | what it is". However long, it is fitted to one page.',
  example: '# Harbor Coffee\nSmall-batch coffee, roasted on the quay.\n## Coffee\nEspresso | 3.00 | Dark and syrupy\nFlat white | 4.20\nFilter | 3.50 | Ask what is on today\n## To eat\nCardamom bun | 3.50 | Baked at six, gone by ten\nToast and jam | 4.00 | Sourdough, salted butter',
  sheets: (body: string) => [sheet(body)],
};

export default definePrint({ id: 'menu', name: 'Menu', icon: 'menucard', blurb: 'A menu on one page: sections, dishes, prices, fitted to the sheet.' }, spec);
