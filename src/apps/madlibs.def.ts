/** Fill in the blanks: a story with gaps, filled in by someone who has not read it. */
import { definePage, htmlPage, h1, rest, js } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'Fill in the blanks';
  const story = rest(body);
  const blanks = [...story.join('\n').matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  return htmlPage(
    title,
    `A story with ${blanks.length} blanks to fill in.`,
    `main{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}form{display:grid;gap:.7rem}label{display:grid;gap:.2rem;font-size:.9rem;color:#52525b}
input{font:inherit;padding:.55rem .8rem;border:1px solid #d4d4d8;border-radius:.6rem;color:#18181b}#story p{font-size:1.2rem}#story b{color:#4338ca}`,
    `<main><h1>${xml(title)}</h1>
<form id="f">${blanks.map((b, i) => `<label>${xml(b[0].toUpperCase() + b.slice(1))}<input name="b${i}" required autocomplete="off"></label>`).join('')}<button>Tell the story</button></form>
<div id="story" aria-live="polite" hidden></div></main>
<script>
var S = ${js(story)};
document.getElementById('f').onsubmit = function (e) {
  e.preventDefault(); var n = 0, f = e.target, out = document.getElementById('story');
  S.forEach(function (line) { var p = document.createElement('p'); line.split(/\\[[^\\]]+\\]/).forEach(function (part, i) { if (i) { var b = document.createElement('b'); b.textContent = f['b' + n++].value; p.appendChild(b); } p.appendChild(document.createTextNode(part)); }); out.appendChild(p); });
  f.hidden = true; out.hidden = false;
};
</script>`,
  );
}

export const spec = {
  hint: '"# Title", then the story, with each blank in square brackets: "[adjective]", "[a place]". The reader fills them in before seeing the story.',
  example: '# A day at the office\nThis morning my [adjective] boss arrived riding a [animal].\n"We are moving the office to [a place]," she said, "and everyone must bring [plural noun]."\nI [verb, past tense] all the way home.',
  page,
};

export default definePage({ id: 'madlibs', name: 'Fill in the blanks', icon: 'madlibs', group: 'Games', blurb: 'A story with blanks: the reader supplies the words, then reads the result.', title: h1 }, spec);
