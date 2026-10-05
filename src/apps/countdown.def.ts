/** Countdown: the days, hours and minutes until something. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest, js } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'Countdown';
  const lines = rest(body);
  const m = /(\d{4}-\d\d-\d\d)(?:[ T](\d\d:\d\d))?/.exec(lines.join(' '));
  const when = m ? `${m[1]}T${m[2] ?? '00:00'}:00` : '';
  const words = lines.filter((l) => !m || !l.includes(m[1]));
  return htmlPage(
    title,
    m ? `Until ${m[0]}.` : title,
    `main{min-height:100vh;display:grid;place-content:center;text-align:center;padding:2rem 1.25rem;background:linear-gradient(#eef2ff,#fff)}h1{font-size:2rem;margin:0 0 1.5rem}
#t{display:flex;gap:1.2rem;justify-content:center;flex-wrap:wrap}#t div{min-width:4.5rem}#t b{display:block;font-size:3.4rem;line-height:1;color:#4f46e5;font-variant-numeric:tabular-nums}#t span{color:#52525b;font-size:.9rem}p{color:#3f3f46;font-size:1.1rem}`,
    `<main><h1>${xml(title)}</h1><div id="t" role="timer" aria-live="off"></div>${words.map((w) => `<p>${xml(w)}</p>`).join('')}</main>
<script>
var when = new Date(${js(when)}), el = document.getElementById('t');
function tick() {
  var s = Math.max(0, Math.floor((when - new Date()) / 1000));
  if (s !== s) { el.textContent = 'Give a date, like 2027-03-01.'; return; }
  el.innerHTML = [[Math.floor(s / 86400), 'days'], [Math.floor(s / 3600) % 24, 'hours'], [Math.floor(s / 60) % 60, 'minutes'], [s % 60, 'seconds']].map(function (p) { return '<div><b>' + p[0] + '</b><span>' + p[1] + '</span></div>'; }).join('');
}
tick(); setInterval(tick, 1000);
</script>`,
  );
}

export const spec = {
  form: [
    { name: 'What is coming', is: '# {What is coming}', once: true },
    { name: 'Date or words', is: '{A date (2027-03-01 18:00), or a line to show}' },
  ] as LineKind[],
  hint: '"# What is coming", then its date ("2027-03-01", or with a time: "2027-03-01 18:00"). Other lines are shown under the clock.',
  example: '# Launch day\n2027-03-01 09:00\nShip it, then lunch.',
  page,
};

export default definePage({ id: 'countdown', name: 'Countdown', icon: 'countdown', group: 'Personal', blurb: 'A live countdown to a date: days, hours, minutes, seconds.', title: h1 }, spec);
