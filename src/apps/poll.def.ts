/** Poll: a question, its choices, and a line from everyone who answers. Pass the link on. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

export function tally(body: string) {
  const options: string[] = [];
  const votes: [string, string][] = [];
  for (const l of rest(body)) {
    if (/^[-*] /.test(l)) options.push(l.slice(2).trim());
    else if (l.includes(':')) votes.push(l.split(/:(.*)/).slice(0, 2).map((p) => p.trim()) as [string, string]);
  }
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
<p class="how">${total} ${total === 1 ? 'answer' : 'answers'}. To answer, add a line with your name and choice, and pass the link on.</p></main>`,
  );
}

export const spec = {
  form: [
    { name: 'Question', is: '# {Question}', once: true },
    { name: 'Choice', is: '- {Choice}' },
    { name: 'Answer', is: '{Name}: {Their choice}' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: '"# The question"; "- A choice" for each choice; then a line from each person: "Name: their choice". Add yours and send the link on.',
  example: '# Where shall we eat on Friday?\n- Pizza\n- Sushi\n- Tacos\nPaul: Tacos\nSam: Sushi\nAda: Tacos',
  page,
};

export default definePage({ id: 'poll', name: 'Poll', icon: 'poll', group: 'Collaborate', blurb: 'A poll or RSVP: everyone adds a line and passes the link on.', title: h1 }, spec);
