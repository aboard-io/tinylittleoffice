/** Trivia: rounds of questions, answers that show when tapped, and a scoreboard. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'Trivia night';
  let teams = ['Team A', 'Team B'];
  let n = 0;
  const html = rest(body)
    .map((l) => {
      const set = /^teams\s*:\s*(.*)$/i.exec(l);
      if (set) return (teams = set[1].split(',').map((t) => t.trim()).filter(Boolean)), '';
      if (l.startsWith('## ')) return `<h2>${xml(l.slice(3))}</h2>`;
      const [q, a = ''] = l.split('|').map((p) => p.trim());
      return `<details><summary><b>${++n}.</b> ${xml(q)}</summary><p>${xml(a)}</p></details>`;
    })
    .join('\n');
  return htmlPage(
    title,
    `${n} questions.`,
    `main{max-width:42rem;margin:0 auto;padding:2rem 1.25rem 4rem}h1{font-size:2rem}h2{font-size:1rem;letter-spacing:.06em;text-transform:uppercase;color:#4338ca;margin:2rem 0 .5rem}
details{border-bottom:1px solid #e4e4e7}summary{cursor:pointer;padding:.9rem 0;font-size:1.1rem}details p{margin:0 0 1rem;font-weight:600;color:#15803d}
.board{display:flex;flex-wrap:wrap;gap:.8rem;position:sticky;top:0;background:#fff;padding:.8rem 0;border-bottom:1px solid #e4e4e7}
.team{display:flex;align-items:center;gap:.5rem;border:1px solid #e4e4e7;border-radius:.8rem;padding:.4rem .6rem}.team output{font-weight:700;font-size:1.3rem;min-width:1.5em;text-align:center}
.team button{padding:0;width:2rem;height:2rem;border-radius:50%}.team button.less{background:#eef2ff;color:#3730a3}`,
    `<main><h1>${xml(title)}</h1>
<div class="board" role="group" aria-label="Scores">${teams.map((t) => `<div class="team"><span>${xml(t)}</span><button class="less" aria-label="Take a point from ${xml(t)}">−</button><output>0</output><button aria-label="Give ${xml(t)} a point">+</button></div>`).join('')}</div>
${html}</main>
<script>[].forEach.call(document.querySelectorAll('.team'), function (t) { var o = t.querySelector('output'), b = t.querySelectorAll('button'); b[0].onclick = function () { o.textContent = +o.textContent - 1; }; b[1].onclick = function () { o.textContent = +o.textContent + 1; }; });</script>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Teams', is: 'teams: {Teams (commas between)}', once: true },
    { name: 'Round', is: '## {Round}', head: true },
    { name: 'Question', is: '{Question} | {Answer}' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: '"# Title"; "teams: Reds, Blues"; "## Round"; then "Question | answer". Tap a question to show its answer; the buttons keep score.',
  example: '# Quiz night\nteams: Reds, Blues, Greens\n## Warm-up\nWhat is the capital of Portugal? | Lisbon\nHow many keys on a piano? | 88\n## Science\nWhat gas do plants take in? | Carbon dioxide\nWho wrote the first published program? | Ada Lovelace',
  page,
};

export default definePage({ id: 'trivia', name: 'Trivia', icon: 'trivia', group: 'Play', blurb: 'A quiz night: rounds of questions, tap for the answer, and a scoreboard.' }, spec);
