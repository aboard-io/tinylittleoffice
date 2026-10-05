/** Adventure: a story that branches. Scenes, and choices that lead to other scenes. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, js } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const scenes: Record<string, { text: string[]; go: string[][] }> = {};
  let cur = '';
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) scenes[(cur = line.slice(3).trim().toLowerCase())] = { text: [], go: [] };
    else if (!line || line.startsWith('# ') || !cur) continue;
    else if (line.startsWith('> ')) scenes[cur].go.push(line.slice(2).split('|').map((p) => p.trim()));
    else scenes[cur].text.push(line);
  }
  const title = h1(body) || 'An adventure';
  return htmlPage(
    title,
    'A story where you choose what happens next.',
    `main{max-width:36rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.2rem;color:#52525b;margin:0 0 2rem}p{font-size:1.15rem}
.go{display:grid;gap:.6rem;margin-top:2rem}.go button{text-align:left}.end{color:#52525b}.quiet{background:#eef2ff;color:#3730a3}`,
    `<main><h1>${xml(title)}</h1><div id="scene" aria-live="polite"></div></main>
<script>
var S = ${js(scenes)}, first = Object.keys(S)[0];
function show(name) {
  var s = S[name] || S[first], el = document.getElementById('scene'); el.innerHTML = '';
  if (!s) return;
  s.text.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; el.appendChild(p); });
  var go = document.createElement('div'); go.className = 'go';
  s.go.forEach(function (g) { var b = document.createElement('button'); b.textContent = g[0]; b.onclick = function () { show((g[1] || '').toLowerCase()); }; go.appendChild(b); });
  if (!s.go.length) { var e = document.createElement('p'); e.className = 'end'; e.textContent = 'The end.'; el.appendChild(e); var b = document.createElement('button'); b.className = 'quiet'; b.textContent = 'Start again'; b.onclick = function () { show(first); }; go.appendChild(b); }
  el.appendChild(go);
}
show(first);
</script>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Scene', is: '## {Scene name}' },
    { name: 'Choice', is: '> {What you do} | {Scene it leads to}' },
    { name: 'Story', is: '{Text:long}' },
  ] as LineKind[],
  hint: '"# Title"; "## scene" starts a scene; its lines are the story; "> What you do | scene it leads to" is a choice. A scene with no choices is an ending.',
  example: '# The Lighthouse\n## start\nThe storm has put the lamp out. Below, a ship is feeling for the rocks.\n> Climb to the lamp | lamp\n> Run to the village | village\n## lamp\nThe stairs are slick. The lamp is cold, but there is oil, and matches.\n> Light it | lit\n> Go back down | start\n## lit\nThe beam swings out. The ship turns. You sit down on the top step, shaking.\n## village\nBy the time you get back with help, there is only wreckage.',
  page,
};

export default definePage({ id: 'adventure', name: 'Adventure', icon: 'adventure', group: 'Games', blurb: 'A choose-your-own-adventure: scenes and choices, read by tapping.', title: h1 }, spec);
