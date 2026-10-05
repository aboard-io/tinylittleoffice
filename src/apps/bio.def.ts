/** Links page: a name, a line about you, and your links as big buttons. */
import { definePage, htmlPage, h1, rest } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'My links';
  const lines = rest(body);
  const links = lines.filter((l) => l.includes('|')).map((l) => l.split('|').map((p) => p.trim()));
  const about = lines.filter((l) => !l.includes('|'));
  return htmlPage(
    title,
    about[0] ?? title,
    `main{max-width:26rem;margin:0 auto;padding:3rem 1.25rem;text-align:center}.me{width:5rem;height:5rem;border-radius:50%;background:#4f46e5;color:#fff;display:grid;place-items:center;font-size:2rem;font-weight:700;margin:0 auto 1rem}
h1{font-size:1.6rem;margin:0}p{color:#52525b;margin:.4rem 0}nav{display:grid;gap:.7rem;margin-top:1.6rem}nav a{padding:.9rem;border-radius:.9rem}`,
    `<main><div class="me" aria-hidden="true">${xml(title[0]?.toUpperCase() ?? '')}</div><h1>${xml(title)}</h1>${about.map((a) => `<p>${xml(a)}</p>`).join('')}
<nav aria-label="Links">${links.map(([label, url = '']) => `<a class="btn" href="${xml(/^(https?:|mailto:)/.test(url) ? url : '#')}" rel="noopener">${xml(label)}</a>`).join('')}</nav></main>`,
  );
}

export const spec = {
  hint: '"# Your name", a line about you, then a link per line: "Label | https://...".',
  example: '# Ada Lovelace\nMathematics, machines, and notes on both.\nMy notes | https://example.com/notes\nNewsletter | https://example.com/news\nEmail me | mailto:ada@example.com',
  page,
};

export default definePage({ id: 'bio', name: 'Links page', icon: 'bio', group: 'Personal', blurb: 'A link-in-bio page: your name, a line about you, and your links.', title: h1 }, spec);
