/**
 * Scavenger hunt: clues that open one after another. Each clue is hidden
 * until the answer to the one before is typed. (Hidden from a look at the
 * page, not from someone determined: it is scrambled with the answer, not
 * properly encrypted.)
 */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest, seed } from '../lib/diagram.ts';
import { pageData, pageScript, xml } from '../kit/core.ts';

/** The page's script: fixed, so the site's CSP can allow it by hash (see pageScript). */
const SCRIPT = pageScript(`
var D = JSON.parse(document.getElementById('d').textContent), at = 0;
function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }
function seed(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h >>> 0; }
function add(t) { var li = document.createElement('li'); li.textContent = t; var all = document.querySelectorAll('li'); if (all.length) all[all.length - 1].className = 'done'; document.getElementById('clues').appendChild(li); }
if (D.length) add(D[0].c);
function end() { if (!D[at] || !D[at].h) document.getElementById('f').hidden = true; }
end();
document.getElementById('f').onsubmit = function (e) {
  e.preventDefault();
  var a = norm(document.getElementById('a').value), say = document.getElementById('say');
  if (seed(a) !== D[at].h) { say.textContent = 'Not that. Look again.'; return; }
  say.textContent = ''; document.getElementById('a').value = ''; at++;
  if (D[at]) add(D[at].c.map(function (n, i) { return String.fromCharCode(n ^ a.charCodeAt(i % a.length)); }).join('')); else add('You found everything.');
  end();
};
`);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const scramble = (text: string, key: string) => [...text].map((c, i) => c.charCodeAt(0) ^ key.charCodeAt(i % key.length));

function page(body: string): string {
  const steps = rest(body).map((l) => l.split('|').map((p) => p.trim()));
  const title = h1(body) || 'Scavenger hunt';
  // The first clue is in the open; each later one is scrambled with the answer before it.
  const data = steps.map(([clue], i) => ({ c: i ? scramble(clue, norm(steps[i - 1][1] ?? '') || ' ') : clue, h: steps[i][1] ? seed(norm(steps[i][1])) : 0 }));
  return htmlPage(
    title,
    `${steps.length} clues, each opened by the answer before it.`,
    `main{max-width:32rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.6rem}ol{padding-left:1.2rem}li{margin:0 0 1rem;font-size:1.1rem}li.done{color:#52525b}
form{display:flex;gap:.5rem;margin-top:1.5rem}input{flex:1;min-width:0;font:inherit;padding:.6rem .8rem;border:1px solid #d4d4d8;border-radius:.6rem}#say{color:#b91c1c;min-height:1.5em}`,
    `<main><h1>${xml(title)}</h1><ol id="clues" aria-live="polite"></ol>
<form id="f"><input id="a" aria-label="Your answer" placeholder="Your answer" autocomplete="off"><button>Try it</button></form><p id="say" role="status"></p></main>
${pageData('d', data)}
${SCRIPT}`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Clue', is: '{Clue:long} | {Answer}' },
    { name: 'Ending', is: '{Text}' },
  ] as LineKind[],
  hint: '"# Title", then a line per step: "Clue | answer". Each clue shows only once the answer before it is typed. End with a line that has no answer.',
  example: '# Birthday hunt\nStart where the coffee is made. What colour is the kettle? | red\nGood. Now count the stairs to the attic. | 14\nLook under the thing with 88 keys. What is taped there? | envelope\nOpen it. Happy birthday!',
  page,
};

export default definePage({ id: 'hunt', name: 'Scavenger hunt', icon: 'hunt', group: 'Play', blurb: 'A scavenger hunt: each clue opens with the answer to the one before.' }, spec);
