/** Time capsule: a note that opens on a date. (On the honour system: the page keeps it shut, not a lock.) */
import { definePage, htmlPage, h1, rest, js } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'Time capsule';
  const lines = rest(body);
  const when = /^open(?:s)?(?: on)?\s*:\s*(\d{4}-\d\d-\d\d)/i.exec(lines.find((l) => /^opens?\b/i.test(l)) ?? '')?.[1] ?? '';
  const note = lines.filter((l) => !/^opens?(?: on)?\s*:/i.test(l)).map((l) => [...l].map((c) => c.charCodeAt(0) + 3));
  return htmlPage(
    title,
    when ? `Opens on ${when}.` : 'A note for later.',
    `main{max-width:34rem;margin:0 auto;padding:3rem 1.25rem;text-align:center}h1{font-size:1.8rem}#shut{font-size:1.3rem;color:#52525b}#days{display:block;font-size:4rem;font-weight:700;color:#4f46e5}#note{text-align:left;font-size:1.15rem}`,
    `<main><h1>${xml(title)}</h1><p id="shut" hidden><span id="days"></span> days until this opens, on ${xml(when)}.</p><div id="note" hidden></div></main>
<script>
var when = ${js(when)}, N = ${js(note)}, left = when ? Math.ceil((new Date(when + 'T00:00:00') - new Date()) / 864e5) : 0;
if (left > 0) { document.getElementById('days').textContent = left; document.getElementById('shut').hidden = false; }
else { var el = document.getElementById('note'); N.forEach(function (l) { var p = document.createElement('p'); p.textContent = l.map(function (c) { return String.fromCharCode(c - 3); }).join(''); el.appendChild(p); }); el.hidden = false; }
</script>`,
  );
}

export const spec = {
  hint: '"# Title", "open: 2030-01-01", then the note. Until that day the page shows only a countdown.',
  example: '# To us, in five years\nopen: 2031-10-05\nWe had just named the thing TinyLittleOffice.\nI hope the dog is well and the coffee is still good.',
  page,
};

export default definePage({ id: 'capsule', name: 'Time capsule', icon: 'capsule', group: 'Together', blurb: 'A note that stays shut until a date you choose.', title: h1 }, spec);
