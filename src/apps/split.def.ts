/** Split the bill: who paid what, and the fewest payments that make it even. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

export function settle(body: string) {
  let people: string[] = [];
  const paid: { who: string; amount: number; what: string }[] = [];
  for (const l of rest(body)) {
    const [who, more = ''] = l.split(/:(.*)/).map((p) => p.trim());
    if (/^(people|between)$/i.test(who)) people = more.split(',').map((p) => p.trim()).filter(Boolean);
    else if (/\d/.test(more)) paid.push({ who, amount: parseFloat(more.replace(/[^0-9.]/g, '')) || 0, what: more.replace(/^[^,]*,?\s*/, '') });
  }
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
    { name: 'Shared between', is: 'between: {People (commas between)}', once: true },
    { name: 'Payment', is: '{Who paid}: {Amount}[, {What for}]' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: '"# Title", then who paid: "Name: amount, what for". "between: Ada, Sam, Paul" names everyone sharing, if some paid nothing.',
  example: '# Weekend away\nbetween: Paul, Sam, Ada, Grace\nPaul: 240, the cottage\nSam: 86.50, groceries\nAda: 45, petrol',
  page,
};

export default definePage({ id: 'split', name: 'Split the bill', icon: 'split', group: 'Together', blurb: 'Who paid what, what each owes, and the fewest payments to settle up.', title: h1 }, spec);
