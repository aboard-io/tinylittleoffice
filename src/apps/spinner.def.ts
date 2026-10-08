/** Spinner: a wheel of names or choices, to spin. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { pageData, pageScript, xml } from '../kit/core.ts';

/** The page's script: fixed, so the site's CSP can allow it by hash (see pageScript). */
const SCRIPT = pageScript(`
var I = JSON.parse(document.getElementById('d').textContent), turn = 0;
document.getElementById('go').onclick = function () {
  var pick = Math.floor(Math.random() * I.length), slice = 360 / I.length;
  turn = Math.ceil(turn / 360) * 360 + 1440 - (pick + 0.5) * slice;
  document.getElementById('w').style.transform = 'rotate(' + turn + 'deg)'; document.getElementById('won').textContent = '';
  setTimeout(function () { document.getElementById('won').textContent = I[pick] || ''; }, matchMedia('(prefers-reduced-motion:reduce)').matches ? 0 : 4100);
};
`);

const CHOICE = 1;
const COLORS =['#4f46e5', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777'];

function page(body: string): string {
  const title = h1(body) || 'Spin';
  const items = valuesOf(readLines(body, spec.form), CHOICE).map(([c]) => c);
  const n = Math.max(1, items.length);
  const at = (i: number, r: number) => `${(Math.sin((i / n) * 2 * Math.PI) * r).toFixed(1)} ${(-Math.cos((i / n) * 2 * Math.PI) * r).toFixed(1)}`;
  const slices = items
    .map((t, i) => `${n > 1 ? `<path d="M0 0L${at(i, 100)}A100 100 0 0 1 ${at(i + 1, 100)}z" fill="${COLORS[i % COLORS.length]}"/>` : `<circle r="100" fill="${COLORS[0]}"/>`}<text transform="rotate(${((i + 0.5) / n) * 360 - 90}) translate(92 0)" text-anchor="end" dominant-baseline="middle" font-size="${n > 14 ? 6 : 9}" fill="#fff" font-weight="600">${xml(t.slice(0, 22))}</text>`)
    .join('');
  return htmlPage(
    title,
    items.slice(0, 6).join(', '),
    `main{max-width:30rem;margin:0 auto;padding:2rem 1.25rem;text-align:center}h1{font-size:1.6rem}.wheel{position:relative;margin:1rem auto}
#w{transition:transform 4s cubic-bezier(.15,.8,.2,1);transform-origin:50% 50%}@media(prefers-reduced-motion:reduce){#w{transition:none}}
.pin{position:absolute;left:50%;top:-6px;transform:translateX(-50%);border:10px solid transparent;border-top:18px solid #18181b}#won{font-size:1.5rem;font-weight:700;min-height:2.2rem}`,
    `<main><h1>${xml(title)}</h1><div class="wheel"><div class="pin"></div><svg viewBox="-104 -104 208 208" role="img" aria-label="Wheel of ${items.length} choices"><g id="w">${slices}</g><circle r="6" fill="#fff"/></svg></div>
<p id="won" role="status" aria-live="polite"></p><button id="go">Spin</button></main>
${pageData('d', items)}
${SCRIPT}`,
  );
}

export const spec = {
  form: [
    { name: 'What is being decided', is: '# {What is being decided}', once: true },
    { name: 'Choice', is: '- {Choice}' },
  ] as LineKind[],
  hint: '"# What is being decided", then the names or choices as a list, "- Ada".',
  example: '# Who buys lunch?\n\n- Ada\n- Grace\n- Alan\n- Margaret\n- Linus\n- Barbara',
  page,
};

/** A choice alone on its line is a choice. */
const read = (text: string) => tidy(text, spec.form, (line) => (line ? [CHOICE, [line]] : null));

export default definePage({ id: 'spinner', name: 'Spinner', icon: 'spinner', group: 'Play', blurb: 'A wheel to spin: names or choices in, one picked at random.', read }, spec);
