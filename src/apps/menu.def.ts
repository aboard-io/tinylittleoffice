/** Menu: sections, dishes and prices on exactly one page. */
import { readLines, writeLines, type Kind as LineKind, type Row } from '../lib/lines.ts';
import { columnsOf, parse as parseTlo } from '../lib/tlo.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { text, wrapText, textWidth, ACCENT, MUTED, LINE, type Page } from '../kit/core.ts';

const FORM: LineKind[] = [
  { name: 'Name', is: '# {Name}', once: true },
  { name: 'Section', is: '## {Section}', head: true },
  { name: 'Dish', is: '{Dish} | {Price:money} | {About}', table: true },
  { name: 'Line', is: '{Text}' },
];
const [NAME, SECTION, DISH] = [0, 1, 2];

/** "# Name", a line about it, then each "## Section" and its table of dishes, "Dish | Price | About". */
function sheet(body: string): Page {
  const w = 624;
  let y = 0;
  let svg = '';
  for (const { kind, values } of readLines(body, FORM)) {
    const [first, price = '', about = ''] = values.map((v) => v.trim());
    if (kind === SECTION) {
      y += 34;
      svg += text(w / 2, y, first.toUpperCase(), { px: 14, bold: true, fill: ACCENT, anchor: 'middle' }) + `<line x1="${w / 2 - 40}" y1="${y + 10}" x2="${w / 2 + 40}" y2="${y + 10}" stroke="${ACCENT}"/>`;
      y += 22;
    } else if (kind === NAME) svg += text(w / 2, (y += 52), first, { px: 44, bold: true, anchor: 'middle' });
    else if (kind === DISH) {
      y += 30;
      // Dots lead the eye from the dish to its price.
      const [from, to] = [textWidth(first, 18, true) + 8, w - textWidth(price, 18) - 8];
      svg += text(0, y, first, { px: 18, bold: true }) + text(w, y, price, { px: 18, anchor: 'end' }) + (to > from ? `<line x1="${from}" y1="${y - 2}" x2="${to}" y2="${y - 2}" stroke="${LINE}" stroke-dasharray="1 5" stroke-width="2" stroke-linecap="round"/>` : '');
      for (const l of about ? wrapText(about, w - 90, 14) : []) svg += text(0, (y += 20), l, { px: 14, fill: MUTED });
    } else for (const l of wrapText(first, w - 80, 16)) svg += text(w / 2, (y += 26), l, { px: 16, fill: MUTED, anchor: 'middle' });
  }
  return onLetter({ w, h: Math.max(200, y + 20), svg }, 84);
}

/**
 * A menu as a person or a model writes it, made canonical: the first
 * heading its name, the rest its sections; tables of dishes whose columns
 * may be named otherwise ("Item", "Cost", "Description") or come in
 * another order; a line (a list item, say) "Dish | price | about" a dish.
 */
export function readMenu(md: string): string {
  const rows: Row[] = [];
  const dish = (cells: string[]) => rows.push({ kind: DISH, values: [0, 1, 2].map((i) => (cells[i] ?? '').trim()), depth: 0 });
  const line = (l: string) => {
    const cells = l.split('|');
    if (cells.length >= 2) dish(cells);
    else if (l.trim()) rows.push({ kind: FORM.length - 1, values: [l.trim()], depth: 0 });
  };
  for (const b of parseTlo(md).blocks) {
    if (b.k === 'h') rows.push({ kind: b.level === 1 && !rows.some((r) => r.kind === NAME) ? NAME : SECTION, values: [b.text], depth: 0 });
    else if (b.k === 'p') b.text.split('\n').forEach(line);
    else if (b.k === 'li') line(b.text);
    else if (b.k === 'table') {
      const at = columnsOf(b, /^(dish|item|name)$/, /^(price|cost)$/, /^(about|description|what it is)$/);
      for (const r of b.rows) dish(at.some((i) => i >= 0) ? at.map((i) => r[i] ?? '') : r);
    }
  }
  return writeLines(rows, FORM);
}

export const spec = {
  form: FORM,
  hint: '"# Name" and a line about it; "## Section" starts each part, with its dishes a table: "Dish | Price | About". However long, it is fitted to one page.',
  example:
    '# Harbor Coffee\n\nSmall-batch coffee, roasted on the quay.\n\n## Coffee\n\nDish | Price:money | About\n--- | --- | ---\nEspresso | 3.00 | Dark and syrupy\nFlat white | 4.20 |\nFilter | 3.50 | Ask what is on today\n\n## To eat\n\nDish | Price:money | About\n--- | --- | ---\nCardamom bun | 3.50 | Baked at six, gone by ten\nToast and jam | 4.00 | Sourdough, salted butter',
  sheets: (body: string) => [sheet(body)],
};

export default definePrint(
  {
    id: 'menu',
    under: undefined,
    group: 'Create',
    name: 'Menu',
    icon: 'menucard',
    blurb: 'A menu on one page: sections, dishes, prices, fitted to the sheet.',
    read: readMenu,
  },
  spec,
);
