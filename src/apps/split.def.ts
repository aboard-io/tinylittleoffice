/** Split the bill: who paid what, and the fewest payments that make it even. */
import { listItems, readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { xml } from '../kit/core.ts';

const [, BETWEEN, PAYMENT] = [0, 1, 2];

export function settle(body: string) {
  const rows = readLines(body, spec.form);
  const people = listItems(valuesOf(rows, BETWEEN)[0]?.[0] ?? '').filter(Boolean);
  const paid = valuesOf(rows, PAYMENT).map(([who, amount, what]) => ({ who, amount: parseFloat(amount.replace(/[^0-9.]/g, '')) || 0, what }));
  for (const p of paid) if (!people.includes(p.who)) people.push(p.who);
  const total = paid.reduce((a, p) => a + p.amount, 0);
  const share = people.length ? total / people.length : 0;
  // What each is owed (or owes, if negative); then the biggest debtor pays the biggest creditor until it is even.
  const bal = people.map((n) => ({ n, v: paid.filter((p) => p.who === n).reduce((a, p) => a + p.amount, 0) - share }));
  const pays: { from: string; to: string; amount: number }[] = [];
  for (let i = 0; i < 100; i++) {
    const [lo, hi] = [bal.reduce((a, b) => (b.v < a.v ? b : a), bal[0]), bal.reduce((a, b) => (b.v > a.v ? b : a), bal[0])];
    if (!lo || hi.v < 0.005) break;
    const amount = Math.min(-lo.v, hi.v);
    pays.push({ from: lo.n, to: hi.n, amount });
    lo.v += amount;
    hi.v -= amount;
  }
  return { people, paid, total, share, pays };
}

function page(body: string): string {
  const title = h1(body) || 'Split the bill';
  const s = settle(body);
  const m = (n: number) => n.toFixed(2);
  return htmlPage(
    title,
    `${m(s.total)} between ${s.people.length}.`,
    `main{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}table{width:100%;border-collapse:collapse}td{padding:.45rem 0;border-bottom:1px solid #e4e4e7}.n{text-align:right;font-variant-numeric:tabular-nums}
h2{font-size:1.1rem;margin-top:2rem}.pay{font-size:1.15rem;padding:.5rem 0}.pay b{color:#4338ca}small{color:#52525b}`,
    `<main><h1>${xml(title)}</h1>
<table><tbody>${s.paid.map((p) => `<tr><td>${xml(p.who)}</td><td><small>${xml(p.what)}</small></td><td class="n">${m(p.amount)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><small>${m(s.share)} each, between ${s.people.length}</small></td><td class="n"><b>${m(s.total)}</b></td></tr></tbody></table>
<h2>To settle up</h2>${s.pays.map((p) => `<div class="pay">${xml(p.from)} pays ${xml(p.to)} <b>${m(p.amount)}</b></div>`).join('') || '<p>All even.</p>'}</main>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Shared between', is: 'between: {People (commas between)}', once: true, key: 'between' },
    { name: 'Payment', is: '{Who} | {Amount:money} | {What}', table: true },
  ] as LineKind[],
  hint: '"# Title", then a table of who paid: "Who | Amount | What". "between: Ada, Sam, Paul" names everyone sharing, if some paid nothing.',
  example: '---\nbetween: Paul, Sam, Ada, Grace\n---\n# Weekend away\n\nWho | Amount:money | What\n--- | --- | ---\nPaul | 240 | the cottage\nSam | 86.50 | groceries\nAda | 45 | petrol',
  page,
};

/** A payment may come as "Sam: 86.50, groceries". */
const read = (text: string) => tidy(text, spec.form, (line) => ((m) => (m ? [PAYMENT, [m[1], m[2], m[3] ?? '']] : null))(/^([^:|]+):\s*([^\s,]*\d[^\s,]*)(?:,\s*(.*))?$/.exec(line)));

export default definePage({ id: 'split', name: 'Split the bill', icon: 'split', group: 'Collaborate', blurb: 'Who paid what, what each owes, and the fewest payments to settle up.', read }, spec);
