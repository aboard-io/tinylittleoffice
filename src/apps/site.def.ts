/** Site: a website of little pages from a few lines of text, downloaded as one HTML file. */
import { definePage, htmlPage, type PageOpts } from '../lib/diagram.ts';
import { listPage, pageScript, pageSvg, slug, xml } from '../kit/core.ts';
import { refPage, resolve } from '../kit/embed.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { parseInline, plain } from '../lib/tlo.ts';
import { linkify } from '../lib/richtext.ts';
import { FORM, parseSite, readSite, safeUrl, siteOutline, type Card, type Color, type Section, type Theme } from '../lib/sitemodel.ts';

export { parseSite } from '../lib/sitemodel.ts';

/** Each colour: the accent, its tint, the deep shade words take on the tint, and the pale shade they take in the dark. Every pair reads at AA. */
const LOOKS: Record<Color, [string, string, string, string]> = {
  indigo: ['#4f46e5', '#eef2ff', '#3730a3', '#a5b4fc'],
  teal: ['#0f766e', '#ccfbf1', '#115e59', '#5eead4'],
  rose: ['#be123c', '#ffe4e6', '#9f1239', '#fda4af'],
  amber: ['#b45309', '#fef3c7', '#92400e', '#fcd34d'],
  ink: ['#18181b', '#f4f4f5', '#18181b', '#e4e4e7'],
};

/** The theme as CSS variables, and the serif face when asked for. */
function look(t: Theme): string {
  const [a, tint, deep, pale] = LOOKS[t.color];
  const vars = t.dark
    ? `--a:${t.color === 'ink' ? '#fafafa' : a};--on:${t.color === 'ink' ? '#18181b' : '#fff'};--tint:#27272a;--deep:${pale};--bg:#18181b;--glass:rgba(24,24,27,.92);--ink:#fafafa;--ink2:#d4d4d8;--ink3:#a1a1aa;--line:#3f3f46`
    : `--a:${a};--on:#fff;--tint:${tint};--deep:${deep};--bg:#fff;--glass:rgba(255,255,255,.92);--ink:#18181b;--ink2:#3f3f46;--ink3:#52525b;--line:#e4e4e7`;
  return `:root{${vars}}${t.serif ? "body,h1,h2,h3{font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif}" : ''}`;
}

/**
 * The pages, switched by hash: "#menu" shows the page called Menu, or the
 * page holding the section called that, and marks it in the nav. With no
 * script the pages sit one under another, which still reads. A link into
 * the site sets the hash itself: shown in a frame as a preview, the page
 * has its host's address for a base, and a plain "#menu" would leave it.
 */
const ROUTER = pageScript(`(function(){
var pages=[].slice.call(document.querySelectorAll('main>.page')),links=[].slice.call(document.querySelectorAll('nav a')),name=document.title,was=null;
document.addEventListener('click',function(ev){var a=ev.target&&ev.target.closest?ev.target.closest('a[href^="#"]'):null;if(!a||ev.defaultPrevented)return;ev.preventDefault();location.hash=a.getAttribute('href').slice(1);});
function show(){var h=decodeURIComponent(location.hash.slice(1)),page=null,at=null;
for(var i=0;i<pages.length;i++)if(pages[i].id===h)page=pages[i];
if(!page&&h){at=document.getElementById(h);if(at)page=at.closest('.page');}
if(!page)page=pages[0];
pages.forEach(function(p){p.hidden=p!==page;});
links.forEach(function(a){if(a.getAttribute('href')==='#'+page.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
var head=page.querySelector('h1,h2');
document.title=page===pages[0]||!head?name:head.textContent+' \\u00b7 '+name;
if(at&&at!==page)at.scrollIntoView();else if(was&&was!==page){window.scrollTo(0,0);if(head){head.tabIndex=-1;head.focus();}}
was=page;}
window.addEventListener('hashchange',show);show();
})();`);

const icon = (name: string, size: number, cls = '') => (ICON_SVG[name] ? `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[name]}</svg>` : '');
const MARKS = [['b', 'strong'], ['i', 'em'], ['u', 'u'], ['s', 's'], ['h', 'mark']] as const;
/** Words as written, inline Markdown and all: their marks, their links (a bare web address too), their icons. */
const prose = (t: string) =>
  parseInline(t)
    .map((r) => {
      if (r.ic) return icon(r.ic, 20);
      let h = r.href ? xml(r.t) : linkify(r.t).map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t))).join('');
      for (const [f, tag] of MARKS) if (r[f]) h = `<${tag}>${h}</${tag}>`;
      return r.href ? `<a href="${xml(safeUrl(r.href))}">${h}</a>` : h;
    })
    .join('');

function page(text: string, { base = '' }: PageOpts = {}): string {
  const site = parseSite(text);
  const name = site.name || 'My site';
  const multi = site.pages.length > 1;
  // Ids: the pages first, then the sections, so "#menu" is the page Menu even when a section is called that too.
  const ids = new Set(['home']);
  const idFor = (title: string, fallback: string) => {
    const base = slug(title) || fallback;
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };
  const pageIds = site.pages.map((p, i) => (i ? idFor(p.title, `page-${i + 1}`) : 'home'));
  const sectionIds = site.pages.map((p) => p.sections.map((s, j) => (j ? idFor(s.title, 'section') : '')));

  // A card may have an icon, and a detail under its heading.
  const card = (c: Card) => `<li>${icon(c.icon, 28)}<strong>${prose(c.head)}</strong>${c.detail ? `<span>${prose(c.detail)}</span>` : ''}</li>`;
  const cards = (s: Section) => (s.points.length ? `<ul class="cards">${s.points.map(card).join('')}</ul>` : '');
  // Three or more buttons on a page's front are the page: stacked, as a link-in-bio page is.
  const buttons = (s: Section, front: boolean) => {
    if (!s.buttons.length) return '';
    const stack = front && s.buttons.length >= 3;
    return `<p class="go${stack ? ' stack' : ''}">${s.buttons.map((b, i) => `<a class="btn${i && !stack ? ' quiet' : ''}" href="${xml(b.url)}">${icon(b.icon, 20)}${xml(b.label)}</a>`).join(' ')}</p>`;
  };
  const pics = (s: Section, size: number) => (s.icon ? icon(s.icon, size, 'ico') : '') + s.pics.map((p) => `<img class="pic" src="${xml(p)}" alt="" loading="lazy">`).join('');
  const embed = (ref: string) => {
    const d = resolve(ref);
    return `<figure class="embed">${pageSvg(refPage(ref), `role="img" aria-label="${xml(d.title)}"`)}<figcaption><a href="${xml(base + d.hash)}">${xml(d.title)}</a> <small>${xml(d.def?.name ?? 'Document')}</small></figcaption></figure>`;
  };
  const embeds = (s: Section) => s.embeds.map(embed).join('');
  const paras = (s: Section) => s.text.map((t) => `<p>${prose(t)}</p>`).join('');
  // A page: its front (the title, its words and buttons), then what else its first section holds, then its sections.
  const render = (i: number) => {
    const p = site.pages[i];
    const [front, ...rest] = p.sections;
    const title = i ? p.title || `Page ${i + 1}` : name;
    return `<section class="page" id="${pageIds[i]}">
<div class="hero${i ? ' top' : ''}"><div class="wrap">${pics(front, 64)}<h1>${xml(title)}</h1>${paras(front)}${buttons(front, true)}</div></div>
${front.points.length || front.embeds.length ? `<div class="part"><div class="wrap">${cards(front)}${embeds(front)}</div></div>` : ''}
${rest.map((s, j) => `<section class="part" id="${sectionIds[i][j + 1]}"><div class="wrap"><h2>${xml(s.title)}</h2>${pics(s, 40)}${paras(s)}${cards(s)}${embeds(s)}${buttons(s, false)}</div></section>`).join('\n')}
</section>`;
  };
  // The nav: the pages, or for a site of one page its sections, as before.
  const nav = multi ? site.pages.map((p, i) => [`#${pageIds[i]}`, i ? p.title || `Page ${i + 1}` : 'Home']) : site.pages[0].sections.slice(1).map((s, j) => [`#${sectionIds[0][j + 1]}`, s.title]).filter(([, t]) => t);
  const front = site.pages[0].sections[0];
  return htmlPage(
    name,
    front.text[0] ? plain(front.text[0]) : name,
    `${look(site.theme)}
body{background:var(--bg);color:var(--ink)}a{color:var(--deep)}.btn{background:var(--a);color:var(--on)}.btn.quiet{background:var(--tint);color:var(--deep)}
header{position:sticky;top:0;z-index:2;background:var(--glass);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;gap:1.2rem;min-height:3.4rem}header b{font-size:1.05rem;white-space:nowrap}
nav{display:flex;gap:1.1rem;margin-left:auto;overflow-x:auto;scrollbar-width:none}nav a{color:var(--ink2);text-decoration:none;font-size:.95rem;white-space:nowrap;padding:.9rem 0}nav a:hover{color:var(--deep)}nav a[aria-current]{color:var(--deep);box-shadow:inset 0 -2px 0 var(--a)}
.hero{padding:5rem 0 4rem;text-align:center;background:linear-gradient(var(--tint),var(--bg))}.hero.top{padding:3.2rem 0 2.6rem}
.hero h1{font-size:clamp(2.2rem,6vw,3.6rem);margin:0 0 1rem}.hero.top h1{font-size:clamp(1.8rem,5vw,2.6rem)}.hero p{font-size:1.25rem;color:var(--ink2);max-width:38rem;margin:0 auto 1rem}
.hero .pic{width:8rem;height:8rem;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1.2rem}.ico{display:block;margin:0 auto 1rem;color:var(--a)}.part .ico{margin:0 0 1rem}
.part{padding:3.2rem 0;border-top:1px solid var(--line)}.part h2{font-size:1.8rem;margin:0 0 1rem}.part p{max-width:44rem;color:var(--ink2)}.part .pic{display:block;max-width:100%;border-radius:.9rem;margin:0 0 1.2rem}
.cards{list-style:none;padding:0;margin:1.6rem 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}
.cards li{border:1px solid var(--line);border-radius:.9rem;padding:1.2rem;display:flex;flex-direction:column;gap:.4rem}.cards svg{color:var(--a)}.cards span{color:var(--ink3);font-size:.95rem}
.go{margin:1.6rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem}.hero .go{justify-content:center}.btn svg{vertical-align:-.25em;margin-right:.4rem}
.go.stack{flex-direction:column;max-width:22rem;margin:1.6rem auto 0}.go.stack .btn{padding:.85rem 1.1rem;font-size:1.05rem;text-align:center}
.embed{margin:1.6rem 0 0}.embed svg{display:block;width:100%;max-width:48rem;height:auto;border:1px solid var(--line);border-radius:.9rem;background:#fff}.embed figcaption{font-size:.9rem;color:var(--ink3);margin-top:.4rem}
footer{padding:2rem 0;color:var(--ink3);font-size:.9rem;border-top:1px solid var(--line)}`,
    `<header><div class="wrap"><b>${xml(name)}</b><nav aria-label="${multi ? 'Pages' : 'Sections'}">${nav.map(([href, t]) => `<a href="${xml(href)}">${xml(t)}</a>`).join('')}</nav></div></header>
<main>
${site.pages.map((_, i) => render(i)).join('\n')}
</main>
<footer><div class="wrap">${xml(name)}</div></footer>
${ROUTER}`,
  );
}

export const spec = {
  form: FORM,
  hint: '"# Name" and a line about it; each further "# Title" starts a page, "## Section" a part of one; "- Point | detail" makes a card (":icon:" first for an icon); "> Label | https://..." a button; "theme: teal serif dark" the look.',
  example:
    'theme: amber serif\n\n# Harbor Coffee\n\nSmall-batch coffee, roasted on the quay every morning.\n\n> See the menu | #menu\n> Find us | #find-us\n\n- :coffee: Roasted daily | Never more than a week old\n- :leaf: Fair trade | Bought direct from six farms\n- :bike: Delivered | By bike, across the old town\n\n# Menu\n\nEspresso, filter, and a pastry case that empties by ten.\n\n## Coffee\n\n- Espresso | 3.00\n- Flat white | 4.20\n\n## Pastry\n\n- Cardamom bun | 3.50\n\n# Find us\n\n14 Quay Street, open 7 to 3, every day but Monday.\n\n> Email us | mailto:hello@example.com',
  page,
};

/** The site's lines as a picture: its name over them, one more at each step of a slide. */
function view(body: string, step?: number, w?: number) {
  const name = parseSite(body).name;
  return listPage(name || 'Website', siteOutline(body).slice(name ? 1 : 0, (name ? 1 : 0) + (step ?? 40)), w);
}

export default definePage(
  {
    id: 'site',
    name: 'Website',
    icon: 'site',
    group: 'Create',
    blurb: 'A website of little pages, written as a few lines and downloaded as a single HTML file. Good for a link in bio.',
    title: (body) => parseSite(body).name,
    outline: (body) => siteOutline(body).slice(0, 14),
    view: (body, opts = {}) => [view(body, opts.step, opts.w)],
    steps: (body) => Math.min(40, siteOutline(body).length - (parseSite(body).name ? 1 : 0)),
    read: readSite,
  },
  spec,
);
