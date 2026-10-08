/** Invoice: who, what, how much; the sums done for you. */
import { readLines, writeLines, type Kind as LineKind, type Row } from '../lib/lines.ts';
import { column, parse as parseTlo } from '../lib/tlo.ts';
import { definePage, htmlPage, type PageOpts } from '../lib/diagram.ts';
import { xml, text, rect, clip, wrapText, pageScript, ACCENT, LINE, MUTED, SHADE, type Page } from '../kit/core.ts';

export interface Invoice {
  fields: Record<string, string>;
  /** A line: what was done, how many (and of what: hours, days, units; '' for none), at what price each. */
  items: { what: string; qty: number; unit: string; price: number }[];
  notes: string[];
  /** The row of the form (lib/lines.ts) each was read from: a field by its name, the items and the notes in order. */
  rows: { fields: Record<string, number>; items: number[]; notes: number[] };
  subtotal: number;
  tax: number;
  total: number;
  money(n: number): string;
}

/** The settings, each a line of its own at the top ("From: Harbor Studio | 14 Quay Street", "Tax: 8%"); the items, a table; the notes. */
const FORM: LineKind[] = [
  { name: 'From', is: 'From: {Who it is from}', once: true },
  { name: 'To', is: 'To: {Who it is for}', once: true },
  { name: 'Number', is: 'Number: {Number}', once: true },
  { name: 'Date', is: 'Date: {Date:date}', once: true },
  { name: 'Due', is: 'Due: {Due:date}', once: true },
  { name: 'Tax', is: 'Tax: {Rate}', once: true },
  { name: 'Currency', is: 'Currency: {Symbol}', once: true },
  { name: 'Terms', is: 'Terms: {Terms}', once: true },
  { name: 'Item', is: '{What} | {Qty:number} | {Units} | {Price:number}', table: true },
  { name: 'Note', is: '{Note}' },
];
const ITEM = FORM.findIndex((k) => k.name === 'Item');

const num = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, ''));

/**
 * The settings as lines ("From: ...", "Tax: 8%"); the items as a table,
 * "What | Qty | Units | Price"; anything else is a note at the foot.
 */
export function parseInvoice(body: string): Invoice {
  const fields: Record<string, string> = {};
  const items: Invoice['items'] = [];
  const notes: string[] = [];
  const rows: Invoice['rows'] = { fields: {}, items: [], notes: [] };
  readLines(body, FORM).forEach((r, at) => {
    const [a = '', b = '', c = '', d = ''] = r.values;
    if (r.kind < ITEM) (fields[FORM[r.kind].name.toLowerCase()] = a), (rows.fields[FORM[r.kind].name.toLowerCase()] = at);
    else if (r.kind === ITEM) items.push({ what: a, qty: b.trim() ? num(b) || 0 : 1, unit: c, price: num(d) || 0 }), rows.items.push(at);
    else notes.push(a), rows.notes.push(at);
  });
  const currency = fields.currency || '$';
  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const tax = (subtotal * (parseFloat(fields.tax ?? '0') || 0)) / 100;
  return { fields, items, notes, rows, subtotal, tax, total: subtotal + tax, money: (n) => (n < 0 ? '-' : '') + currency + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
}

/**
 * An invoice as a person or a model writes it, made canonical: the
 * settings from a header ("from: ...") or as lines ("**Tax:** 8%" too); the
 * items as a table whose columns may be named otherwise ("Description",
 * "Quantity", "Rate") or come in another order, or, where there is no
 * table, as lines "what, quantity, price", the quantity perhaps with its
 * units ("Design, 12 hours, 150"), or "what, price" for one of something.
 */
export function readInvoice(text: string): string {
  const doc = parseTlo(text);
  const rows: Row[] = [];
  const setting = (key: string, value: string) => {
    const kind = FORM.findIndex((k) => k.once && k.name.toLowerCase() === key.toLowerCase());
    if (kind >= 0) rows.push({ kind, values: [value.trim()], depth: 0 });
    return kind >= 0;
  };
  // A quantity may carry its units ("12 hours"); a price, its currency ("$150"), which is the invoice's to say.
  const item = (what: string, qty: string, units: string, price: string) => {
    const m = /^(-?[\d.,]*\d)\s+(\S.*)$/.exec(qty.trim());
    rows.push({ kind: ITEM, values: [what.trim(), m ? m[1] : qty.trim(), units.trim() || (m?.[2] ?? ''), price.trim().replace(/^[^\d.-]+/, '')], depth: 0 });
  };
  const tabled = doc.blocks.some((b) => b.k === 'table');
  const line = (l: string) => {
    const set = /^\**\s*(\w+)\s*:\s*\**\s*(.*)$/.exec(l);
    if (set && setting(set[1], set[2])) return;
    const parts = l.split(',').map((p) => p.trim());
    const [q, p] = parts.slice(-2);
    if (!tabled && parts.length >= 3 && !isNaN(num(q)) && !isNaN(num(p))) item(parts.slice(0, -2).join(', '), q, '', p);
    else if (!tabled && parts.length === 2 && !isNaN(num(p))) item(parts[0], '1', '', p);
    else if (l.trim()) rows.push({ kind: FORM.length - 1, values: [l.trim().replace(/^notes?\s*:\s*/i, '')], depth: 0 });
  };
  for (const [k, v] of Object.entries(doc.head)) setting(k, v);
  for (const b of doc.blocks) {
    if (b.k === 'p' || b.k === 'quote') b.text.split('\n').forEach(line);
    else if (b.k === 'li') line(b.text);
    else if (b.k === 'table') {
      const names = b.head.map((h) => column(h).name.toLowerCase());
      const find = (re: RegExp) => names.findIndex((n) => re.test(n));
      let [w, q, u, p] = [find(/^(what|description|item|service|task|work)$/), find(/^(qty|quantity|hours|days|count)$/), find(/^units?$/), find(/^(price|rate|cost|unit price|each)$/)];
      // Columns named nothing we know are taken in order: what, then the quantity, the units and the price, as there are columns for them.
      if (w < 0 && q < 0 && p < 0) [w, q, u, p] = names.length >= 4 ? [0, 1, 2, 3] : names.length === 3 ? [0, 1, -1, 2] : [0, -1, -1, 1];
      if (w < 0) w = names.findIndex((_, i) => ![q, u, p].includes(i));
      for (const r of b.rows) item(r[w] ?? '', q >= 0 ? r[q] : '1', u >= 0 ? r[u] : '', p >= 0 ? r[p] : '');
    }
  }
  // The settings at the top, as the editor puts them; then the items, one table; then the notes.
  return writeLines(rows.sort((a, b) => Math.sign(a.kind - ITEM) - Math.sign(b.kind - ITEM)), FORM);
}

/**
 * The sums, done again in the page as the numbers are typed (the text is
 * parsed for real once the typing pauses). Fixed text, registered for the CSP.
 */
const SUMS_SCRIPT = pageScript(`(function(){
function num(el){return parseFloat((el?el.textContent:'').replace(/[^0-9.-]/g,''))||0;}
function sum(){var c=document.querySelector('[data-inv=currency]'),cur=(c&&c.textContent.trim())||'$',t=0;
function money(n){return (n<0?'-':'')+cur+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
[].forEach.call(document.querySelectorAll('tr[data-inv=item]'),function(tr){var q=tr.querySelector('[data-inv=qty]'),a=(q?num(q):1)*num(tr.querySelector('[data-inv=price]'));tr.querySelector('[data-inv=amount]').textContent=money(a);t+=a;});
var x=t*num(document.querySelector('[data-inv=tax]'))/100;
document.querySelector('[data-inv=subtotal]').textContent=money(t);document.querySelector('[data-inv=taxed]').textContent=money(x);document.querySelector('[data-inv=total]').textContent=money(t+x);}
document.addEventListener('input',sum);
})();`);

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
  svg += rect(48, y, W - 96, 30, SHADE) + text(60, y + 20, 'Description', { px: 12, bold: true }) + text(400, y + 20, 'Qty', { px: 12, bold: true, anchor: 'end' }) + text(412, y + 20, 'Units', { px: 12, bold: true }) + text(560, y + 20, 'Price', { px: 12, bold: true, anchor: 'end' }) + text(W - 60, y + 20, 'Amount', { px: 12, bold: true, anchor: 'end' });
  y += 30;
  inv.items.forEach((it, i) => {
    if (i >= upTo) return void (y += 32);
    svg += text(60, y + 21, clip(it.what, 300, 14), { px: 14 }) + text(400, y + 21, String(it.qty), { px: 14, anchor: 'end' }) + (it.unit ? text(412, y + 21, clip(it.unit, 64, 13), { px: 13, fill: MUTED }) : '') + text(560, y + 21, inv.money(it.price), { px: 14, anchor: 'end' }) + text(W - 60, y + 21, inv.money(it.qty * it.price), { px: 14, anchor: 'end' });
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

/**
 * The invoice as a web page. Edited, it is the same page with every field
 * typed into where it stands, a hint where one is empty, a row added under
 * the items and taken away beside them (the marks are lib/pageedit.ts's).
 */
function page(body: string, { edit = false }: PageOpts = {}): string {
  const inv = parseInvoice(body);
  const f = inv.fields;
  const lines = (v: string | undefined) => (v ?? '').split(' | ').map((l, i) => (i ? xml(l) : `<strong>${xml(l)}</strong>`)).join('<br>');
  const kind = (name: string) => FORM.findIndex((k) => k.name === name);
  const box = (lf: string, value: string, hint: string, label: string, more = '') => `<span data-lf="${lf}" data-hint="${xml(hint)}" aria-label="${xml(label)}"${more}>${xml(value)}</span>`;
  // A field of its own row, or of the row typing into it will make.
  const at = (name: string, label: string) => (inv.rows.fields[name] === undefined ? `+${kind(label)}` : String(inv.rows.fields[name]));
  const one = (name: string, label: string, hint: string, more = '') => box(`${at(name, label)},0`, f[name] ?? '', hint, label, more);
  // A date is picked from a calendar: the browser's own date box, which says the date as the text holds it.
  const day = (name: string, label: string) => `<input type="date" data-lf="${at(name, label)},0" aria-label="${xml(label)}" value="${xml(/^\d{4}-\d\d-\d\d$/.test(f[name] ?? '') ? f[name] : '')}">`;
  // An address: its lines each a box, and one more to type the next into.
  const address = (name: string, label: string, hints: string[]) => {
    const parts = f[name] ? f[name].split(' | ') : [];
    return Array.from({ length: Math.max(2, parts.length + 1) }, (_, i) => (i ? '' : '<strong>') + box(`${at(name, label)},0,${i}`, parts[i] ?? '', hints[i] ?? 'Another line', `${label}, line ${i + 1}`, ' data-lf-join=" | "') + (i ? '' : '</strong>')).join('');
  };
  const read = edit ? readLines(body, FORM) : [];
  const item = (i: Invoice['items'][number], n: number) => {
    const r = inv.rows.items[n];
    // Each field as it is written: the quantity and price as typed, not as summed.
    const cell = (field: number, what: string, hint = '') => box(`${r},${field}`, read[r].values[field] ?? '', hint, `${what}, row ${r + 1}`, ` data-inv="${what.toLowerCase()}"`);
    return `<tr data-inv="item"><td>${box(`${r},0`, i.what, 'What was done', `What, row ${r + 1}`)}</td><td class="n">${cell(1, 'Qty')}</td><td class="u">${cell(2, 'Units', 'hours')}</td><td class="n">${cell(3, 'Price')}</td><td class="n" data-inv="amount">${inv.money(i.qty * i.price)}</td><td class="x"><button type="button" data-lf-remove="${r}" aria-label="Remove the line ${xml(i.what || 'with no description')}" title="Remove this line">\u2715</button></td></tr>`;
  };
  const after = Math.max(-1, ...inv.rows.items, ...Object.values(inv.rows.fields));
  return htmlPage(
    title(body) || 'Invoice',
    `${f.from ? f.from.split(' | ')[0] + ': ' : ''}${inv.money(inv.total)}${f.due ? ', due ' + f.due : ''}`,
    `main{max-width:46rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:2.4rem;margin:0;display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #4f46e5;padding-bottom:.6rem}
h1 small{font-size:1.1rem;font-weight:400;color:#52525b}dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:1.2rem;margin:1.6rem 0}
dt{font-size:.72rem;letter-spacing:.06em;color:#52525b;text-transform:uppercase}dd{margin:.2rem 0 0}
table{width:100%;border-collapse:collapse;margin-top:1rem}th{background:#f4f4f5;text-align:left;font-size:.8rem;padding:.5rem .7rem}td{padding:.55rem .7rem;border-bottom:1px solid #e4e4e7}
.n{text-align:right;font-variant-numeric:tabular-nums}tfoot td{border:0;color:#52525b}tfoot tr:last-child td{font-weight:700;font-size:1.1rem;color:#18181b}
.notes{margin-top:2rem;color:#52525b;font-size:.92rem}.u{color:#52525b}@media print{main{padding:0}}` +
      (edit
        ? `
dd [data-lf-join]{display:block}.x{width:2rem;padding:0 .2rem;text-align:center}tfoot .x{border:0}.sr{position:absolute;left:-9999px}
.x button,.add{font:inherit;font-weight:400;background:none;cursor:pointer}
.x button{width:1.9rem;height:1.9rem;border:1px solid #e4e4e7;border-radius:6px;color:#71717a;font-size:.85rem;line-height:1}.x button:hover,.x button:focus-visible{color:#b91c1c;border-color:#fca5a5;background:#fef2f2}
.adder td{border:0;padding:.5rem .7rem}.add{padding:.3rem .8rem;border:1px dashed #4f46e5;border-radius:999px;color:#4338ca;font-size:.9rem}
input[type=date][data-lf]{font:inherit;border:1px dashed rgba(79,70,229,.5);border-radius:4px;padding:.1rem .3rem;background:#fff;color:inherit}input[type=date][data-lf]:focus{outline:2px solid #4f46e5;background:#eef2ff}
.u{color:#52525b}`
        : ''),
    edit
      ? `<main>
<h1>Invoice <small>No. ${one('number', 'Number', 'Invoice number')}</small></h1>
<dl>${[['From', address('from', 'From', ['Your name', 'Your address'])], ['To', address('to', 'To', ['Who this is for', 'Their address'])], ['Date', day('date', 'Date')], ['Due', day('due', 'Due')], ['Terms', one('terms', 'Terms', 'Payment terms')], ['Currency', one('currency', 'Currency', '$, £ or €', ' data-inv="currency"')]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<table>
<thead><tr><th scope="col">Description</th><th scope="col" class="n">Qty</th><th scope="col">Units</th><th scope="col" class="n">Price</th><th scope="col" class="n">Amount</th><th scope="col" class="x"><span class="sr">Remove</span></th></tr></thead>
<tbody>${inv.items.map(item).join('')}<tr class="adder"><td colspan="6"><button type="button" class="add" data-lf-add="${kind('Item')}" data-lf-after="${after}">+ Add a line</button></td></tr></tbody>
<tfoot><tr><td colspan="4" class="n">Subtotal</td><td class="n" data-inv="subtotal">${inv.money(inv.subtotal)}</td><td class="x"></td></tr><tr><td colspan="4" class="n">Tax ${one('tax', 'Tax', 'rate %', ' data-inv="tax"')}</td><td class="n" data-inv="taxed">${inv.money(inv.tax)}</td><td class="x"></td></tr><tr><td colspan="4" class="n">Total</td><td class="n" data-inv="total">${inv.money(inv.total)}</td><td class="x"></td></tr></tfoot>
</table>
<div class="notes">${inv.notes.map((n, i) => `<p>${box(`${inv.rows.notes[i]},0`, n, '', `Note, row ${inv.rows.notes[i] + 1}`)}</p>`).join('')}<p>${box(`+${kind('Note')},0`, '', 'A note at the foot: thanks, how to pay', 'Note')}</p></div>
</main>${SUMS_SCRIPT}`
      : `<main>
<h1>Invoice${f.number ? ` <small>No. ${xml(f.number)}</small>` : ''}</h1>
<dl>${[['From', lines(f.from)], ['To', lines(f.to)], ['Date', xml(f.date ?? '')], ['Due', xml(f.due ?? '')], ['Terms', xml(f.terms ?? '')]].filter(([, v]) => v && v !== '<strong></strong>').map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
<table>
<thead><tr><th scope="col">Description</th><th scope="col" class="n">Qty</th><th scope="col">Units</th><th scope="col" class="n">Price</th><th scope="col" class="n">Amount</th></tr></thead>
<tbody>${inv.items.map((i) => `<tr><td>${xml(i.what)}</td><td class="n">${i.qty}</td><td class="u">${xml(i.unit)}</td><td class="n">${inv.money(i.price)}</td><td class="n">${inv.money(i.qty * i.price)}</td></tr>`).join('')}</tbody>
<tfoot>${inv.tax ? `<tr><td colspan="4" class="n">Subtotal</td><td class="n">${inv.money(inv.subtotal)}</td></tr><tr><td colspan="4" class="n">Tax (${xml(f.tax)})</td><td class="n">${inv.money(inv.tax)}</td></tr>` : ''}<tr><td colspan="4" class="n">Total</td><td class="n">${inv.money(inv.total)}</td></tr></tfoot>
</table>
${inv.notes.length ? `<div class="notes">${inv.notes.map((n) => `<p>${xml(n)}</p>`).join('')}</div>` : ''}
</main>`,
  );
}

export const spec = {
  form: FORM,
  hint: 'Settings first, a line each: "From:", "To:", "Number:", "Date:", "Due:", "Tax: 8%", "Currency: £" (" | " for a second line). Then the items, a table "What | Qty | Units | Price". Anything else is a note at the foot.',
  blankRows: true,
  example:
    'From: Harbor Studio | 14 Quay Street\nTo: Acme Ltd | Accounts payable\nNumber: 0042\nDate: 2027-03-01\nDue: 2027-03-31\nTax: 8%\n\nWhat | Qty:number | Units | Price:number\n--- | --- | --- | ---\nDesign | 12 | hours | 150\nBuild | 20 | hours | 140\nHosting for a year | 1 |  | 480\n\nThank you. Payment by bank transfer.',
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
    read: readInvoice,
  },
  spec,
);
