/** Fill in the blanks: a story with gaps, filled in by someone who has not read it. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { plain } from '../lib/tlo.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { pageData, pageScript, xml } from '../kit/core.ts';

/** The page's script: fixed, so the site's CSP can allow it by hash (see pageScript). */
const SCRIPT = pageScript(`
var S = JSON.parse(document.getElementById('d').textContent);
document.getElementById('f').onsubmit = function (e) {
  e.preventDefault(); var n = 0, f = e.target, out = document.getElementById('story');
  S.forEach(function (line) { var p = document.createElement('p'); line.split(/\\[[^\\]]+\\]/).forEach(function (part, i) { if (i) { var b = document.createElement('b'); b.textContent = f['b' + n++].value; p.appendChild(b); } p.appendChild(document.createTextNode(part)); }); out.appendChild(p); });
  f.hidden = true; out.hidden = false;
};
`);

const STORY = 1;

function page(body: string): string {
  const title = h1(body) || 'Fill in the blanks';
  const story = valuesOf(readLines(body, spec.form), STORY).map(([line]) => plain(line));
  const blanks = [...story.join('\n').matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  return htmlPage(
    title,
    `A story with ${blanks.length} blanks to fill in.`,
    `main{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}form{display:grid;gap:.7rem}label{display:grid;gap:.2rem;font-size:.9rem;color:#52525b}
input{font:inherit;padding:.55rem .8rem;border:1px solid #d4d4d8;border-radius:.6rem;color:#18181b}#story p{font-size:1.2rem}#story b{color:#4338ca}`,
    `<main><h1>${xml(title)}</h1>
<form id="f">${blanks.map((b, i) => `<label>${xml(b[0].toUpperCase() + b.slice(1))}<input name="b${i}" required autocomplete="off"></label>`).join('')}<button>Tell the story</button></form>
<div id="story" aria-live="polite" hidden></div></main>
${pageData('d', story)}
${SCRIPT}`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Story', is: '{A line of the story:long}' },
  ] as LineKind[],
  hint: '"# Title", then the story, with each blank in square brackets: "[adjective]", "[a place]". The reader fills them in before seeing the story.',
  example: '# A day at the office\n\nThis morning my [adjective] boss arrived riding a [animal].\n\n"We are moving the office to [a place]," she said, "and everyone must bring [plural noun]."\n\nI [verb, past tense] all the way home.',
  page,
};

export default definePage({ id: 'madlibs', name: 'Fill in the blanks', icon: 'madlibs', group: 'Play', blurb: 'A story with blanks: the reader supplies the words, then reads the result.', read: (text) => tidy(text, spec.form) }, spec);
