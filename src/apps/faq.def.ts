/** FAQ: questions and their answers, as a page that can be searched. */
import { definePage, htmlPage, outline } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';
import { linkify } from '../lib/richtext.ts';

interface Faq {
  title: string;
  items: { q: string; a: string[] }[];
}

export function parseFaq(text: string): Faq {
  const lines = text.split('\n');
  const head = lines.findIndex((l) => l.trim());
  const titled = head >= 0 && lines[head].startsWith('# ');
  const nodes = outline(titled ? lines.slice(head + 1).join('\n') : text);
  return { title: titled ? lines[head].slice(2).trim() : '', items: nodes.map((n) => ({ q: n.text, a: n.kids.map((k) => k.text) })) };
}

const prose = (t: string) => linkify(t).map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t))).join('');

function page(text: string): string {
  const faq = parseFaq(text);
  const title = faq.title || 'Frequently asked questions';
  // The same questions as data, the way search engines ask for them.
  const data = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a.join(' ') } })) };
  return htmlPage(
    title,
    faq.items.slice(0, 3).map((i) => i.q).join(' '),
    `main{padding:2.5rem 0 4rem}h1{font-size:2.2rem;margin:0 0 1.2rem}
input{width:100%;font:inherit;padding:.65rem .9rem;border:1px solid #d4d4d8;border-radius:.6rem;margin-bottom:1.2rem}
details{border-bottom:1px solid #e4e4e7}summary{cursor:pointer;padding:1rem 0;font-weight:600;font-size:1.05rem}
details p{margin:0 0 1rem;color:#3f3f46}details[hidden]{display:none}.none{color:#52525b}`,
    `<main class="wrap">
<h1>${xml(title)}</h1>
<input type="search" id="q" placeholder="Search the questions" aria-label="Search the questions">
${faq.items.map((i) => `<details><summary>${xml(i.q)}</summary>${i.a.map((p) => `<p>${prose(p)}</p>`).join('')}</details>`).join('\n')}
<p class="none" id="none" hidden>Nothing matches.</p>
</main>
<script>
var box = document.getElementById('q'), all = [].slice.call(document.querySelectorAll('details'));
box.addEventListener('input', function () {
  var q = box.value.trim().toLowerCase(), shown = 0;
  all.forEach(function (d) { var hit = !q || d.textContent.toLowerCase().indexOf(q) >= 0; d.hidden = !hit; if (hit) shown++; });
  document.getElementById('none').hidden = shown > 0;
});
</script>`,
    `\n<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
  );
}

export const spec = {
  hint: 'A question on a line; its answer on the lines indented under it. A first line "# Title" names the page.',
  example: '# Help\nHow do I share a document?\n  Copy the link. The link is the document.\nIs anything stored on a server?\n  No. Everything is in the link, which never leaves your browser.\nCan two people edit at once?\n  Not at the same time: pass the link back and forth.',
  page,
};

export default definePage({ id: 'faq', name: 'FAQ', icon: 'faq', group: 'Publish and sell', blurb: 'Questions and answers as a searchable page, with the markup search engines read.', title: (body) => parseFaq(body).title }, spec);
