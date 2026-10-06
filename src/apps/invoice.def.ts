/** Invoice: who, what, how much; the sums done for you. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage } from '../lib/diagram.ts';
import { xml, text, rect, clip, wrapText, ACCENT, LINE, MUTED, SHADE, type Page } from '../kit/core.ts';

export interface Invoice {
  fields: Record<string, string>;
  items: { what: string; qty: number; price: number }[];
  notes: string[];
  subtotal: number;
  tax: number;
  total: number;
  money(n: number): string;
}

/**
 * "From: ...", "To: ...", "Number: ...", "Date: ...", "Due: ...", "Tax: 8%",
 * "Currency: $" as headings; lines "what, quantity, price" as items (a line
 * "what, price" is one of them); anything else is a note at the foot.
 */
export function parseInvoice(body: string): Invoice {
  const fields: Record<string, string> = {};
  const items: Invoice['items'] = [];
  const notes: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const field = /^(from|to|number|date|due|tax|currency|terms)\s*:\s*(.*)$/i.exec(line);
    const parts = line.split(',').map((p) => p.trim());
    const nums = parts.slice(-2).map((p) => parseFloat(p.replace(/[^0-9.-]/g, '')));
    if (field) fields[field[1].toLowerCase()] = field[2];
    else if (parts.length >= 3 && nums.every((n) => !isNaN(n))) items.push({ what: parts.slice(0, -2).join(', '), qty: nums[0], price: nums[1] });
    else if (parts.length === 2 && !isNaN(nums[1]) && /\d/.test(parts[1])) items.push({ what: parts[0], qty: 1, price: nums[1] });
    else notes.push(line.replace(/^notes?\s*:\s*/i, ''));
  }
  const currency = fields.currency || '$';
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const tax = (subtotal * (parseFloat(fields.tax ?? '0') || 0)) / 100;
  return { fields, items, notes, subtotal, tax, total: subtotal + tax, money: (n) => (n < 0 ? '-' : '') + currency + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
}

const title = (body: string) => {
  const n = parseInvoice(body).fields.number;
  return n ? `Invoice ${n}` : '';
};

/** The invoice on paper: what the PDF is. */
function sheet(body: string, upTo = Infinity): Page {
  const inv = parseInvoice(body);
  const W = 720;
  const f = inv.fields;
  let svg = text(48, 76, 'Invoice', { px: 36, bold: true }) + (f.number ? text(W - 48, 76, `No. ${f.number}`, { px: 18, fill: MUTED, anchor: 'end' }) : '');
  svg += rect(48, 96, W - 96, 3, ACCENT);
  const block = (label: string, value: string | undefined, x: number, y: number) => (value ? text(x, y, label, { px: 11, fill: MUTED }) + value.split(' | ').map((l, i) => text(x, y + 20 + i * 19, clip(l, 300, 14, i === 0), { px: 14, bold: i === 0 })).join('') : '');
  svg += block('FROM', f.from, 48, 136) + block('TO', f.to, 384, 136);
  svg += block('DATE', f.date, 48, 232) + block('DUE', f.due, 216, 232) + block('TERMS', f.terms, 384, 232);
  let y = 300;
  svg += rect(48, y, W - 96, 30, SHADE) + text(60, y + 20, 'Description', { px: 12, bold: true }) + text(456, y + 20, 'Qty', { px: 12, bold: true, anchor: 'end' }) + text(560, y + 20, 'Price', { px: 12, bold: true, anchor: 'end' }) + text(W - 60, y + 20, 'Amount', { px: 12, bold: true, anchor: 'end' });
  y += 30;
  inv.items.forEach((it, i) => {
    if (i >= upTo) return void (y += 32);
    svg += text(60, y + 21, clip(it.what, 340, 14), { px: 14 }) + text(456, y + 21, String(it.qty), { px: 14, anchor: 'end' }) + text(560, y + 21, inv.money(it.price), { px: 14, anchor: 'end' }) + text(W - 60, y + 21, inv.money(it.qty * it.price), { px: 14, anchor: 'end' });
    svg += `<line x1="48" y1="${y + 32}" x2="${W - 48}" y2="${y + 32}" stroke="${LINE}"/>`;
    y += 32;
  });
  y += 12;
  const done = upTo >= inv.items.length;
  const row = (label: string, value: string, bold = false) => {
    if (done) svg += text(560, y + 20, label, { px: bold ? 16 : 14, bold, anchor: 'end', fill: bold ? undefined : MUTED }) + text(W - 60, y + 20, value, { px: bold ? 16 : 14, bold, anchor: 'end' });
    y += bold ? 34 : 26;
  };
  if (inv.tax) {
    row('Subtotal', inv.money(inv.subtotal));
    row(`Tax (${f.tax})`, inv.money(inv.tax));
  }
  row('Total', inv.money(inv.total), true);
  for (const note of inv.notes) for (const line of wrapText(note, W - 96, 13)) svg += text(48, (y += 22), line, { px: 13, fill: MUTED });
  return { w: W, h: Math.max(520, y + 56), svg };
}

function page(body: string): string {
  const inv = parseInvoice(body);
  const f = inv.fields;
  const lines = (v: string | undefined) => (v ?? '').split(' | ').map((l, i) => (i ? xml(l) : `<strong>${xml(l)}</strong>`)).join('<br>');
  return htmlPage(
    title(body) || 'Invoice',
    `${f.from ? f.from.split(' | ')[0] + ': ' : ''}${inv.money(inv.total)}${f.due ? ', due ' + f.due : ''}`,
    `main{max-width:46rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:2.4rem;margin:0;display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #4f46e5;padding-bottom:.6rem}
h1 small{font-size:1.1rem;font-weight:400;color:#52525b}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1.2rem;margin:1.6rem 0}
dt{font-size:.72rem;letter-spacing:.06em;color:#52525b;text-transform:uppercase}dd{margin:.2rem 0 0}
table{width:100%;border-collapse:collapse;margin-top:1rem}th{background:#f4f4f5;text-align:left;font-size:.8rem;padding:.5rem .7rem}td{padding:.55rem .7rem;border-bottom:1px solid #e4e4e7}
.n{text-align:right;font-variant-numeric:tabular-nums}tfoot td{border:0;color:#52525b}tfoot tr:last-child td{font-weight:700;font-size:1.1rem;color:#18181b}
.notes{margin-top:2rem;color:#52525b;font-size:.92rem}@media print{main{padding:0}}`,
    `<main>
<h1>Invoice${f.number ? ` <small>No. ${xml(f.number)}</small>` : ''}</h1>
<dl>${[['From', lines(f.from)], ['To', lines(f.to)], ['Date', xml(f.date ?? '')], ['Due', xml(f.due ?? '')], ['Terms', xml(f.terms ?? '')]].filter(([, v]) => v && v !== '<strong></strong>').map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<table>
<thead><tr><th scope="col">Description</th><th scope="col" class="n">Qty</th><th scope="col" class="n">Price</th><th scope="col" class="n">Amount</th></tr></thead>
<tbody>${inv.items.map((i) => `<tr><td>${xml(i.what)}</td><td class="n">${i.qty}</td><td class="n">${inv.money(i.price)}</td><td class="n">${inv.money(i.qty * i.price)}</td></tr>`).join('')}</tbody>
<tfoot>${inv.tax ? `<tr><td colspan="3" class="n">Subtotal</td><td class="n">${inv.money(inv.subtotal)}</td></tr><tr><td colspan="3" class="n">Tax (${xml(f.tax)})</td><td class="n">${inv.money(inv.tax)}</td></tr>` : ''}<tr><td colspan="3" class="n">Total</td><td class="n">${inv.money(inv.total)}</td></tr></tfoot>
</table>
${inv.notes.length ? `<div class="notes">${inv.notes.map((n) => `<p>${xml(n)}</p>`).join('')}</div>` : ''}
</main>`,
  );
}

export const spec = {
  form: [
    { name: 'From', is: 'From: {Who it is from}', once: true },
    { name: 'To', is: 'To: {Who it is for}', once: true },
    { name: 'Number', is: 'Number: {Number}', once: true },
    { name: 'Date', is: 'Date: {Date:date}', once: true },
    { name: 'Due', is: 'Due: {Due:date}', once: true },
    { name: 'Tax', is: 'Tax: {Rate}', once: true },
    { name: 'Currency', is: 'Currency: {Symbol}', once: true },
    { name: 'Terms', is: 'Terms: {Terms}', once: true },
    { name: 'Item', is: '{What}, {Quantity}, {Price}' },
    { name: 'Single item', is: '{What}, {Price}' },
    { name: 'Note', is: '{Note}' },
  ] as LineKind[],
  hint: 'Headings: "From:", "To:", "Number:", "Date:", "Due:", "Tax: 8%", "Currency: £" (use " | " for a second line). Then an item per line: "what, quantity, price".',
  example: 'From: Harbor Studio | 14 Quay Street\nTo: Acme Ltd | Accounts payable\nNumber: 0042\nDate: 2027-03-01\nDue: 2027-03-31\nTax: 8%\nDesign, 12, 150\nBuild, 20, 140\nHosting for a year, 480\nThank you. Payment by bank transfer.',
  page,
};

export default definePage(
  {
    id: 'invoice',
    name: 'Invoice',
    icon: 'invoice',
    group: 'Create',
    blurb: 'An invoice from a few lines: who, what and how much, with the sums done and a PDF to send.',
    title,
    outline: (body) => {
      const inv = parseInvoice(body);
      return [...inv.items.map((i) => `${i.what}  ·  ${inv.money(i.qty * i.price)}`), `Total  ·  ${inv.money(inv.total)}`];
    },
    view: (body, opts = {}) => [sheet(body, opts.step)],
    // On a slide, the lines of the invoice arrive one at a time, then the total.
    steps: (body) => parseInvoice(body).items.length,
  },
  spec,
);
