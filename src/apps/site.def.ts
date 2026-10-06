/** Site: a one-page website from a few lines of text. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { linkify } from '../lib/richtext.ts';

interface Section {
  title: string;
  text: string[];
  points: string[];
  buttons: { label: string; url: string }[];
}

/** "# Name", a tagline, then sections: "## Heading", paragraphs, "- points", "> Button | https://..." */
export function parseSite(text: string): { name: string; sections: Section[] } {
  let name = '';
  const sections: Section[] = [{ title: '', text: [], points: [], buttons: [] }];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const cur = sections[sections.length - 1];
    if (!line) continue;
    if (line.startsWith('# ') && !name) name = line.slice(2).trim();
    else if (line.startsWith('## ')) sections.push({ title: line.slice(3).trim(), text: [], points: [], buttons: [] });
    else if (/^[-*] /.test(line)) cur.points.push(line.slice(2).trim());
    else if (line.startsWith('> ')) {
      const [label, url] = line.slice(2).split('|').map((p) => p.trim());
      cur.buttons.push({ label, url: /^(https?:|mailto:|#)/.test(url ?? '') ? url : '#' });
    } else cur.text.push(line);
  }
  return { name, sections };
}

const prose = (t: string) => linkify(t).map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t))).join('');
const slugOf = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function page(text: string): string {
  const site = parseSite(text);
  const [hero, ...rest] = site.sections;
  const name = site.name || 'My site';
  const buttons = (s: Section) => (s.buttons.length ? `<p class="go">${s.buttons.map((b, i) => `<a class="btn${i ? ' quiet' : ''}" href="${xml(b.url)}">${xml(b.label)}</a>`).join(' ')}</p>` : '');
  // A point may start with an icon (":rocket Fast") and be "Heading | detail".
  const card = (p: string) => {
    const [icon, words] = iconOf(p);
    const [head, detail] = words.split(' | ');
    return `<li>${ICON_SVG[icon] ? `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[icon]}</svg>` : ''}<strong>${xml(head)}</strong>${detail ? `<span>${prose(detail)}</span>` : ''}</li>`;
  };
  return htmlPage(
    name,
    hero.text[0] ?? name,
    `header{position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid #e4e4e7}
header .wrap{display:flex;align-items:center;gap:1.2rem;min-height:3.4rem;flex-wrap:wrap}header b{font-size:1.05rem;margin-right:auto}
header a{color:#3f3f46;text-decoration:none;font-size:.95rem}header a:hover{color:#4338ca}
.hero{padding:5rem 0 4rem;text-align:center;background:linear-gradient(#eef2ff,#fff)}
.hero h1{font-size:clamp(2.2rem,6vw,3.6rem);margin:0 0 1rem}.hero p{font-size:1.25rem;color:#3f3f46;max-width:38rem;margin:0 auto 1rem}
section{padding:3.2rem 0;border-top:1px solid #f4f4f5}section h2{font-size:1.8rem;margin:0 0 1rem}section p{max-width:44rem;color:#3f3f46}
ul.cards{list-style:none;padding:0;margin:1.6rem 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}
ul.cards li{border:1px solid #e4e4e7;border-radius:.9rem;padding:1.2rem;display:flex;flex-direction:column;gap:.4rem}
ul.cards span{color:#52525b;font-size:.95rem}.go{margin-top:1.6rem}.btn.quiet{background:#eef2ff;color:#3730a3}
footer{padding:2rem 0;color:#52525b;font-size:.9rem;border-top:1px solid #e4e4e7}`,
    `<header><div class="wrap"><b>${xml(name)}</b>${rest.filter((s) => s.title).map((s) => `<a href="#${slugOf(s.title)}">${xml(s.title)}</a>`).join('')}</div></header>
<main>
<div class="hero"><div class="wrap"><h1>${xml(name)}</h1>${hero.text.map((t) => `<p>${prose(t)}</p>`).join('')}${buttons(hero)}</div></div>
${hero.points.length ? `<section><div class="wrap"><ul class="cards">${hero.points.map(card).join('')}</ul></div></section>` : ''}
${rest.map((s) => `<section id="${slugOf(s.title)}"><div class="wrap"><h2>${xml(s.title)}</h2>${s.text.map((t) => `<p>${prose(t)}</p>`).join('')}${s.points.length ? `<ul class="cards">${s.points.map(card).join('')}</ul>` : ''}${buttons(s)}</div></section>`).join('\n')}
</main>
<footer><div class="wrap">${xml(name)}</div></footer>`,
  );
}

export const spec = {
  form: [
    { name: 'Name', is: '# {Name}', once: true },
    { name: 'Section', is: '## {Section}', head: true },
    { name: 'Card', is: '- [:{Picture:icon} ]{Heading}[ | {Detail}]' },
    { name: 'Button', is: '> {Label} | {Link}' },
    { name: 'Paragraph', is: '{Text:long}' },
  ] as LineKind[],
  hint: '"# Name" and a line about it; "## Section" starts each part; "- Point | detail" makes a card (":icon" first for an icon); "> Label | https://..." a button.',
  example: '# Harbor Coffee\nSmall-batch coffee, roasted on the quay every morning.\n> See the menu | #menu\n> Find us | #visit\n- :coffee Roasted daily | Never more than a week old\n- :leaf Fair trade | Bought direct from six farms\n- :bike Delivered | By bike, across the old town\n## Menu\nEspresso, filter, and a pastry case that empties by ten.\n- Espresso | 3.00\n- Flat white | 4.20\n- Cardamom bun | 3.50\n## Visit\n14 Quay Street, open 7 to 3, every day but Monday.\n> Email us | mailto:hello@example.com',
  page,
};

export default definePage({ id: 'site', name: 'Website', icon: 'site', group: 'Create', blurb: 'A one-page website, written as a few lines and downloaded as a single HTML file.', title: (body) => parseSite(body).name }, spec);
