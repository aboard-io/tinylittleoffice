/** Adventure: a story that branches. Scenes, and choices that lead to other scenes. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { parseInline, plain } from '../lib/tlo.ts';
import { tidy } from '../lib/tidy.ts';
import { pageData, pageScript, slug, xml } from '../kit/core.ts';

/** The page's script: fixed, so the site's CSP can allow it by hash (see pageScript). */
const SCRIPT = pageScript(`
var S = JSON.parse(document.getElementById('d').textContent), first = Object.keys(S)[0];
function show(name) {
  var s = S[name] || S[first], el = document.getElementById('scene'); el.innerHTML = '';
  if (!s) return;
  s.text.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; el.appendChild(p); });
  var go = document.createElement('div'); go.className = 'go';
  s.go.forEach(function (g) { var b = document.createElement('button'); b.textContent = g[0]; b.onclick = function () { show(g[1]); }; go.appendChild(b); });
  if (!s.go.length) { var e = document.createElement('p'); e.className = 'end'; e.textContent = 'The end.'; el.appendChild(e); var b = document.createElement('button'); b.className = 'quiet'; b.textContent = 'Start again'; b.onclick = function () { show(first); }; go.appendChild(b); }
  el.appendChild(go);
}
show(first);
`);

const [TITLE, SCENE, CHOICE] = [0, 1, 2];

/** The scenes, by their names as slugs: the story's lines, and each choice as its words and the scene its link leads to. */
function scenes(body: string) {
  const out: Record<string, { text: string[]; go: string[][] }> = {};
  let cur = '';
  for (const r of readLines(body, spec.form)) {
    if (r.kind === SCENE) out[(cur = slug(r.values[0]))] = { text: [], go: [] };
    else if (!cur || r.kind === TITLE) continue;
    else if (r.kind === CHOICE) {
      const runs = parseInline(r.values[0]);
      // (An address keeps a space in a scene's name as "%20".)
      const to = (runs.find((x) => x.href)?.href ?? '').slice(1).replace(/%([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
      out[cur].go.push([runs.map((x) => x.t).join(''), slug(to)]);
    } else out[cur].text.push(plain(r.values[0]));
  }
  return out;
}

function page(body: string): string {
  const title = h1(body) || 'An adventure';
  return htmlPage(
    title,
    'A story where you choose what happens next.',
    `main{max-width:36rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.2rem;color:#52525b;margin:0 0 2rem}p{font-size:1.15rem}
.go{display:grid;gap:.6rem;margin-top:2rem}.go button{text-align:left}.end{color:#52525b}.quiet{background:#eef2ff;color:#3730a3}`,
    `<main><h1>${xml(title)}</h1><div id="scene" aria-live="polite"></div></main>
${pageData('d', scenes(body))}
${SCRIPT}`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Scene', is: '## {Scene name}', head: true },
    { name: 'Choice', is: '- {Choice}' },
    { name: 'Story', is: '{Text:long}' },
  ] as LineKind[],
  hint: '"# Title"; "## scene" starts a scene; its paragraphs are the story; "- [What you do](#scene)" is a choice, a link to the scene it leads to. A scene with no choices is an ending.',
  example: '# The Lighthouse\n\n## start\n\nThe storm has put the lamp out. Below, a ship is feeling for the rocks.\n\n- [Climb to the lamp](#lamp)\n- [Run to the village](#village)\n\n## lamp\n\nThe stairs are slick. The lamp is cold, but there is oil, and matches.\n\n- [Light it](#lit)\n- [Go back down](#start)\n\n## lit\n\nThe beam swings out. The ship turns. You sit down on the top step, shaking.\n\n## village\n\nBy the time you get back with help, there is only wreckage.',
  page,
};

export default definePage({ id: 'adventure', name: 'Adventure', icon: 'adventure', group: 'Play', blurb: 'A choose-your-own-adventure: scenes and choices, read by tapping.', read: (text) => tidy(text, spec.form) }, spec);
