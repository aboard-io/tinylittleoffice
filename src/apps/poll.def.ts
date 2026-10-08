/** Poll: a question, its choices, and a row from everyone who answers. Pass the link on. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { xml } from '../kit/core.ts';

const [, CHOICE, ANSWER] = [0, 1, 2];

export function tally(body: string) {
  const rows = readLines(body, spec.form);
  const options = valuesOf(rows, CHOICE).map(([o]) => o);
  const votes = valuesOf(rows, ANSWER);
  // An answer nobody listed still counts: it becomes a choice.
  for (const [, v] of votes) if (v && !options.some((o) => o.toLowerCase() === v.toLowerCase())) options.push(v);
  return options.map((o) => ({ option: o, who: votes.filter(([, v]) => v.toLowerCase() === o.toLowerCase()).map(([n]) => n) }));
}

function page(body: string): string {
  const title = h1(body) || 'A poll';
  const rows = tally(body);
  const most = Math.max(1, ...rows.map((r) => r.who.length));
  const total = rows.reduce((a, r) => a + r.who.length, 0);
  return htmlPage(
    title,
    `${total} answers so far.`,
    `main{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}li{list-style:none;margin:0 0 1.1rem}ul{padding:0}
.bar{height:.9rem;border-radius:.5rem;background:#4f46e5;min-width:3px}.top{display:flex;justify-content:space-between;font-weight:600}small{color:#52525b}.how{color:#52525b;font-size:.9rem;margin-top:2rem}`,
    `<main><h1>${xml(title)}</h1><ul>${rows.map((r) => `<li><div class="top"><span>${xml(r.option)}</span><span>${r.who.length}</span></div><div class="bar" style="width:${(r.who.length / most) * 100}%"></div><small>${xml(r.who.join(', '))}</small></li>`).join('')}</ul>
<p class="how">${total} ${total === 1 ? 'answer' : 'answers'}. To answer, add a row with your name and choice, and pass the link on.</p></main>`,
  );
}

export const spec = {
  form: [
    { name: 'Question', is: '# {Question}', once: true },
    { name: 'Choice', is: '- {Choice}' },
    { name: 'Answer', is: '{Name} | {Choice}', table: true },
  ] as LineKind[],
  hint: '"# The question"; "- A choice" for each choice; then a table of "Name | Choice", a row from each person. Add yours and send the link on.',
  example: '# Where shall we eat on Friday?\n\n- Pizza\n- Sushi\n- Tacos\n\nName | Choice\n--- | ---\nPaul | Tacos\nSam | Sushi\nAda | Tacos',
  page,
};

/** An answer may come as "Sam: Tacos". */
const read = (text: string) => tidy(text, spec.form, (line) => ((m) => (m ? [ANSWER, [m[1], m[2]]] : null))(/^([^:|]+):\s*(.+)$/.exec(line)));

export default definePage({ id: 'poll', name: 'Poll', icon: 'poll', group: 'Collaborate', blurb: 'A poll or RSVP: everyone adds a row and passes the link on.', read }, spec);
