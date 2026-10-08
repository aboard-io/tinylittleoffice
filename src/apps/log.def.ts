/** Log: what you did and how much, with totals. Workouts, practice, anything counted. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { xml } from '../kit/core.ts';

const ENTRY = 1;

export function totals(body: string) {
  const rows = valuesOf(readLines(body, spec.form), ENTRY);
  const sums = new Map<string, { n: number; unit: string; times: number }>();
  for (const [, what, amount = ''] of rows) {
    const m = /^([\d.]+)\s*(.*)$/.exec(amount);
    const s = sums.get(what) ?? { n: 0, unit: m?.[2] ?? '', times: 0 };
    sums.set(what, { n: s.n + (m ? parseFloat(m[1]) : 0), unit: s.unit || (m?.[2] ?? ''), times: s.times + 1 });
  }
  return { rows, sums: [...sums].map(([what, s]) => ({ what, ...s })) };
}

function page(body: string): string {
  const title = h1(body) || 'Log';
  const t = totals(body);
  const num = (n: number) => String(Math.round(n * 100) / 100);
  return htmlPage(
    title,
    `${t.rows.length} entries.`,
    `main{max-width:38rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}.sums{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.8rem;margin:1rem 0 2rem}
.sums div{border:1px solid #e4e4e7;border-radius:.9rem;padding:.8rem}.sums b{display:block;font-size:1.6rem;color:#4f46e5}.sums small{color:#52525b}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:.8rem;color:#52525b;padding:.4rem 0}td{padding:.45rem 0;border-top:1px solid #e4e4e7}`,
    `<main><h1>${xml(title)}</h1>
<div class="sums">${t.sums.map((s) => `<div><span>${xml(s.what)}</span><b>${s.n ? `${num(s.n)} ${xml(s.unit)}` : s.times}</b><small>${s.times} ${s.times === 1 ? 'time' : 'times'}</small></div>`).join('')}</div>
<table><thead><tr><th scope="col">When</th><th scope="col">What</th><th scope="col">How much</th></tr></thead><tbody>${t.rows.map(([when, what, amount = '']) => `<tr><td>${xml(when)}</td><td>${xml(what)}</td><td>${xml(amount)}</td></tr>`).join('')}</tbody></table></main>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Entry', is: '{When} | {What} | {How much}', table: true },
  ] as LineKind[],
  hint: '"# Title", then a table of entries, "When | What | How much" ("3 March | Run | 5 km"). Each kind of thing is totalled.',
  example: '# March training\n\nWhen | What | How much\n--- | --- | ---\n1 March | Run | 5 km\n2 March | Piano | 30 min\n3 March | Run | 7.5 km\n5 March | Swim | 40 lengths\n6 March | Piano | 45 min\n7 March | Run | 10 km',
  page,
};

/** An entry may come as "3 March, Run, 5 km". */
const read = (text: string) => tidy(text, spec.form, (line) => ((m) => (m ? [ENTRY, [m[1], m[2], m[3] ?? '']] : null))(/^([^,|]+),\s*([^,|]+)(?:,\s*([^|]*))?$/.exec(line)));

export default definePage({ id: 'log', name: 'Log', icon: 'log', group: 'Track', blurb: 'A workout or practice log: entries, and a total for each kind.', read }, spec);
