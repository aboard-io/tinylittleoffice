/** Secret Santa: names in; each person taps their own name to see who they give to. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest, js, seed } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

/** Everyone gives to the next person round a shuffled ring: nobody draws themselves, and the draw is the same every time the link is opened. */
export function draw(names: string[]): Record<string, string> {
  const ring = names.map((n) => [seed(n + names.join('|')), n] as const).sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  return Object.fromEntries(ring.map((n, i) => [n, ring[(i + 1) % ring.length]]));
}

function page(body: string): string {
  const title = h1(body) || 'Secret Santa';
  const names = [...new Set(rest(body))];
  const gives = draw(names);
  // (Kept out of plain sight in the page; this is a game of trust, not a vault.)
  const hidden = names.map((n) => [...(names.length > 1 ? gives[n] : '')].map((c) => c.charCodeAt(0) + 7));
  return htmlPage(
    title,
    `${names.length} people.`,
    `.quiet{background:#eef2ff;color:#3730a3}#ask{border:1px solid #e4e4e7;border-radius:.9rem;padding:.5rem 1rem;margin:1rem 0}main{max-width:30rem;margin:0 auto;padding:2.5rem 1.25rem;text-align:center}h1{font-size:1.8rem}.names{display:grid;gap:.6rem;margin:1.5rem 0}#who{font-size:1.4rem;font-weight:700;min-height:4rem}p{color:#52525b}`,
    `<main><h1>${xml(title)}</h1><p>Find your own name and tap it. No peeking at anyone else's.</p>
<div class="names">${names.map((n, i) => `<button data-i="${i}">${xml(n)}</button>`).join('')}</div>
<div id="ask" hidden><p>Are you <b id="asked"></b>?</p><p><button id="yes">Yes, show me</button> <button id="no" class="quiet">No</button></p></div>
<p id="who" role="status" aria-live="polite"></p></main>
<script>
var H = ${js(hidden)}, N = ${js(names)}, t, asking = -1, ask = document.getElementById('ask'), who = document.getElementById('who');
[].forEach.call(document.querySelectorAll('[data-i]'), function (b) { b.onclick = function () {
  asking = +b.getAttribute('data-i'); who.textContent = ''; document.getElementById('asked').textContent = N[asking]; ask.hidden = false; document.getElementById('yes').focus();
}; });
document.getElementById('no').onclick = function () { ask.hidden = true; };
document.getElementById('yes').onclick = function () {
  ask.hidden = true;
  who.textContent = N[asking] + ', you give to ' + H[asking].map(function (c) { return String.fromCharCode(c - 7); }).join('') + '.';
  clearTimeout(t); t = setTimeout(function () { who.textContent = ''; }, 6000);
};
</script>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Person', is: '{Name}' },
  ] as LineKind[],
  hint: '"# Title", then a name per line. Send everyone the link: each taps their own name to see who they give to (it hides again after a moment).',
  example: '# Office Secret Santa\nAda\nGrace\nAlan\nMargaret\nLinus',
  page,
};

export default definePage({ id: 'santa', name: 'Secret Santa', icon: 'santa', group: 'Collaborate', blurb: 'Secret Santa: a list of names, and a private answer for each.', title: h1 }, spec);
