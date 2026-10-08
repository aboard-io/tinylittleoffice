/** Flashcards: a question on the front, the answer on the back. Tap to turn. */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1 } from '../lib/diagram.ts';
import { tidy, valuesOf } from '../lib/tidy.ts';
import { pageData, pageScript, xml } from '../kit/core.ts';

/** The page's script: fixed, so the site's CSP can allow it by hash (see pageScript). */
const SCRIPT = pageScript(`
var C = JSON.parse(document.getElementById('d').textContent), at = 0, back = false, card = document.getElementById('card');
function draw() { var c = C[at] || ['', '']; card.textContent = c[back ? 1 : 0] || ''; card.className = back ? 'back' : ''; card.setAttribute('aria-label', (back ? 'Answer: ' : 'Question: ') + card.textContent + '. Tap to turn over.'); document.getElementById('where').textContent = C.length ? at + 1 + ' / ' + C.length : ''; }
card.onclick = function () { back = !back; draw(); };
function go(d) { at = (at + d + C.length) % (C.length || 1); back = false; draw(); }
document.getElementById('next').onclick = function () { go(1); }; document.getElementById('back').onclick = function () { go(-1); };
document.getElementById('mix').onclick = function () { C.sort(function () { return Math.random() - 0.5; }); at = 0; back = false; draw(); };
draw();
`);

const CARD = 1;

function page(body: string): string {
  const title = h1(body) || 'Flashcards';
  const cards = valuesOf(readLines(body, spec.form), CARD);
  return htmlPage(
    title,
    `${cards.length} cards.`,
    `main{max-width:32rem;margin:0 auto;padding:2rem 1.25rem;text-align:center}h1{font-size:1.2rem;color:#52525b}
#card{display:grid;place-items:center;width:100%;min-height:15rem;margin:1rem 0;padding:1.5rem;font-size:1.6rem;font-weight:600;background:#fff;color:#18181b;border:2px solid #e4e4e7;border-radius:1rem}
#card.back{background:#eef2ff;border-color:#a5b4fc;color:#312e81}nav{display:flex;justify-content:center;align-items:center;gap:1rem}.quiet{background:#eef2ff;color:#3730a3}`,
    `<main><h1>${xml(title)}</h1><button id="card" aria-live="polite"></button>
<nav><button class="quiet" id="back">Back</button><span id="where"></span><button id="next">Next</button><button class="quiet" id="mix">Shuffle</button></nav></main>
${pageData('d', cards)}
${SCRIPT}`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Card', is: '{Front} | {Back}', table: true },
  ] as LineKind[],
  hint: '"# Title", then a table of "Front | Back", a card a row. Tap a card to turn it over.',
  example: '# Portuguese\n\nFront | Back\n--- | ---\nbom dia | good morning\nobrigado | thank you\npor favor | please\na conta | the bill\nonde fica...? | where is...?',
  page,
};

export default definePage({ id: 'flashcards', name: 'Flashcards', icon: 'flashcards', group: 'Play', blurb: 'Flashcards: a question, tap, the answer. Shuffle and go again.', read: (text) => tidy(text, spec.form) }, spec);
