/** Site: a website of little pages from a few lines of text, with a shop if it wants one, downloaded as one HTML file. */
import { definePage, htmlPage, type PageOpts } from '../lib/diagram.ts';
import { listPage, pageData, pageScript, pageSvg, slug, xml } from '../kit/core.ts';
import { refPage, resolve } from '../kit/embed.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { parseInline, plain } from '../lib/tlo.ts';
import { linkify } from '../lib/richtext.ts';
import { FORM, kindNamed, parseSite, readSite, safeUrl, siteOutline, themeCss, type Card, type Page, type Product, type Section, type Site } from '../lib/sitemodel.ts';
import type { Kind } from '../lib/lines.ts';

export { parseSite } from '../lib/sitemodel.ts';

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

/**
 * The cart, in the page itself: no server, nothing stored beyond the
 * visit. Orders go by email, or are copied. One cart for the whole site,
 * whatever page its products are on.
 */
const CART = pageScript(`(function(){
var cart={},P=JSON.parse(document.getElementById('products').textContent),S=JSON.parse(document.getElementById('shop').textContent);
function money(n){return S.currency+n.toFixed(2);}
function count(){return Object.keys(cart).reduce(function(a,k){return a+cart[k];},0);}
function total(){return Object.keys(cart).reduce(function(a,k){return a+cart[k]*P[k].price;},0);}
function order(){return Object.keys(cart).map(function(k){return cart[k]+' x '+P[k].name+' = '+money(cart[k]*P[k].price);}).join('\\n')+'\\nTotal: '+money(total());}
function draw(){var list=document.getElementById('lines');list.innerHTML='';
Object.keys(cart).forEach(function(k){var li=document.createElement('li');var name=document.createElement('span');name.textContent=P[k].name;li.appendChild(name);
[['-',-1,'One fewer '+P[k].name],['+',1,'One more '+P[k].name]].forEach(function(b,i){var btn=document.createElement('button');btn.textContent=b[0];btn.className='q';btn.setAttribute('aria-label',b[2]);
btn.onclick=function(){cart[k]+=b[1];if(cart[k]<=0)delete cart[k];draw();};
if(i===1){var n=document.createElement('b');n.textContent=cart[k];li.appendChild(n);}li.appendChild(btn);});
var sum=document.createElement('span');sum.className='sum';sum.textContent=money(cart[k]*P[k].price);li.appendChild(sum);list.appendChild(li);});
document.getElementById('count').textContent=count();document.getElementById('total').textContent=money(total());
document.getElementById('empty').hidden=count()>0;document.getElementById('send').disabled=count()===0;}
[].forEach.call(document.querySelectorAll('[data-add]'),function(b){b.onclick=function(){var k=b.getAttribute('data-add');cart[k]=(cart[k]||0)+1;draw();document.getElementById('said').textContent=P[k].name+' added to the cart';};});
document.getElementById('send').onclick=function(){var text='Order from '+S.name+'\\n\\n'+order();
if(S.orders)location.href='mailto:'+S.orders+'?subject='+encodeURIComponent('Order from '+S.name)+'&body='+encodeURIComponent(text);
else if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){document.getElementById('said').textContent='Order copied';});};
draw();})();`);

export const icon = (name: string, size: number, cls = '') => (ICON_SVG[name] ? `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[name]}</svg>` : '');
const MARKS = [['b', 'strong'], ['i', 'em'], ['u', 'u'], ['s', 's'], ['h', 'mark']] as const;
/** Words as written, inline Markdown and all: their marks, their links (a bare web address too), their icons. */
export const prose = (t: string) =>
  parseInline(t)
    .map((r) => {
      if (r.ic) return icon(r.ic, 20);
      let h = r.href ? xml(r.t) : linkify(r.t).map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t))).join('');
      for (const [f, tag] of MARKS) if (r[f]) h = `<${tag}>${h}</${tag}>`;
      return r.href ? `<a href="${xml(safeUrl(r.href))}">${h}</a>` : h;
    })
    .join('');

/** The look every page of a site and a Quick Links page share: the theme's variables, then the parts. */
export const SITE_CSS = `body{background:var(--bg);color:var(--ink)}a{color:var(--deep)}.btn{background:var(--a);color:var(--on);border-radius:var(--r)}.btn.quiet{background:var(--tint);color:var(--deep)}button{border-radius:var(--r)}
header{position:sticky;top:0;z-index:2;background:var(--glass);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;gap:1.2rem;min-height:3.4rem}header b{font-size:1.05rem;white-space:nowrap}
nav{display:flex;gap:1.1rem;margin-left:auto;overflow-x:auto;scrollbar-width:none}nav a{color:var(--ink2);text-decoration:none;font-size:.95rem;white-space:nowrap;padding:.9rem 0}nav a:hover{color:var(--deep)}nav a[aria-current]{color:var(--deep);box-shadow:inset 0 -2px var(--a)}
.hero{padding:5rem 0 4rem;text-align:center;background:linear-gradient(var(--tint),var(--bg))}.hero.top{padding:3.2rem 0 2.6rem}
.hero h1{font-size:clamp(2.2rem,6vw,3.6rem);margin:0 0 1rem}.hero.top h1{font-size:clamp(1.8rem,5vw,2.6rem)}.hero p{font-size:1.25rem;color:var(--ink2);max-width:38rem;margin:0 auto 1rem}
.hero .pic{width:8rem;height:8rem;border-radius:50%;object-fit:cover;display:block;margin:0 auto 1.2rem}.ico{display:block;margin:0 auto 1rem;color:var(--a)}.part .ico{margin:0 0 1rem}
.part{padding:3.2rem 0;border-top:1px solid var(--line)}.part h2{font-size:1.8rem;margin:0 0 1rem}.part p{max-width:44rem;color:var(--ink2)}.part .pic{display:block;max-width:100%;border-radius:var(--r);margin:0 0 1.2rem}
.cards{list-style:none;padding:0;margin:1.6rem 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}
.cards li{border:1px solid var(--line);border-radius:var(--r);padding:1.2rem;display:flex;flex-direction:column;gap:.4rem;background:var(--bg)}.cards svg{color:var(--a)}.cards span{color:var(--ink3);font-size:.95rem}
.go{margin:1.6rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem}.hero .go{justify-content:center}.btn svg{vertical-align:-.25em;margin-right:.4rem}
.go.stack{flex-direction:column;max-width:22rem;margin:1.6rem auto 0}.go.stack .btn{padding:.85rem 1.1rem;font-size:1.05rem;text-align:center}
.social{list-style:none;padding:0;margin:2rem 0 0;display:flex;justify-content:center;gap:.8rem}.social a{display:grid;place-items:center;width:2.6rem;height:2.6rem;border-radius:50%;background:var(--tint);color:var(--deep)}
.embed{margin:1.6rem 0 0}.embed svg{display:block;width:100%;max-width:48rem;height:auto;border:1px solid var(--line);border-radius:var(--r);background:#fff}.embed figcaption{font-size:.9rem;color:var(--ink3);margin-top:.4rem}
.shop{display:grid;grid-template-columns:1fr 18rem;gap:1.6rem;align-items:start;margin-top:1.6rem}.grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:1rem}
.grid li{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;background:var(--bg)}.grid img,.grid .ph{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--tint);display:block}
.grid div{padding:.9rem;display:flex;flex-direction:column;gap:.3rem;flex:1}.grid span{color:var(--ink3);font-size:.92rem;flex:1}.price{font-weight:700}
.cart{position:sticky;top:4.4rem;border:1px solid var(--line);border-radius:var(--r);padding:1.1rem}.cart h3{margin:0 0 .6rem;font-size:1.1rem}#lines{list-style:none;margin:0;padding:0}#lines li{display:flex;align-items:center;gap:.4rem;padding:.35rem 0}#lines span:first-child{flex:1}
.q{padding:0;width:1.7rem;height:1.7rem;border-radius:50%;background:var(--tint);color:var(--deep)}.sum{min-width:4.2rem;text-align:right;font-variant-numeric:tabular-nums}
.tot{display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--line);margin-top:.6rem;padding-top:.6rem}#send{width:100%;margin-top:.8rem}#send:disabled{opacity:.45;cursor:default}#empty{color:var(--ink3)}
@media(max-width:46rem){.shop{grid-template-columns:1fr}.cart{position:static}}
footer{padding:2rem 0;color:var(--ink3);font-size:.9rem;border-top:1px solid var(--line)}`;

/**
 * Edited in place: a "+" at the end of every section opens a chooser of
 * what can go there; a page or section heading carries its own buttons to
 * move it past its neighbour or take it away; a picture shows its address
 * under it, to type over. The marks are lib/pageedit.ts's.
 */
export const EDIT_CSS = `.lf-plus{display:inline-grid;place-items:center;width:2rem;height:2rem;padding:0;border-radius:50%;border:1px dashed var(--a);background:var(--bg);color:var(--a);font:600 1.2rem/1 var(--font);cursor:pointer;margin:1.2rem 0 0}.hero .lf-plus{margin:1.2rem auto 0}
.lf-tools{display:inline-flex;gap:.3rem;vertical-align:middle;margin-left:.6rem}.lf-tools button{width:1.7rem;height:1.7rem;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--bg);color:var(--ink3);font:.85rem/1 var(--font);cursor:pointer}.lf-tools button:hover{color:var(--deep);border-color:var(--a)}
.pic-at{display:block;font-size:.85rem;color:var(--ink3);margin:-.8rem 0 1.2rem}.hero .pic-at{text-align:center}`;

/** The buttons a page or section heading carries while editing: earlier, later, away. */
const partTools = (row: number, what: string) =>
  `<span class="lf-tools" role="group" aria-label="This ${what}">${[['up', '↑', `Move this ${what} earlier`], ['down', '↓', `Move this ${what} later`], ['remove', '×', `Remove this ${what}`]].map(([d, g, l]) => `<button type="button" data-lf-part="${row}" data-lf-do="${d}" aria-label="${l}">${g}</button>`).join('')}</span>`;
/** The "+" at the end of a section: what can go there, as kinds of line, Paragraph first. */
const plus = (form: Kind[], row: number, kinds: string[], label: string) => `<button type="button" class="lf-plus" data-lf-menu="${row}" data-lf-kinds="${kinds.map((k) => kindNamed(form, k)).filter((k) => k >= 0).join(',')}" aria-label="${label}">+</button>`;

export interface SitePageOpts extends PageOpts {
  /** The lines the page is made of: a site's, or a Quick Links page's (a part of them). */
  form?: Kind[];
}

/** What a section is drawn as, in pieces: its pictures and icon (a page's front puts its title after them), the rest, and the "+" of editing. */
export function drawn(site: Site, s: Section, { edit = false, base = '', form = FORM }: SitePageOpts, hero: boolean, products: Product[]): { pics: string; body: string; add: string } {
  const card = (c: Card) => `<li>${icon(c.icon, 28)}<strong>${prose(c.head)}</strong>${c.detail ? `<span>${prose(c.detail)}</span>` : ''}</li>`;
  const cards = s.points.length ? `<ul class="cards">${s.points.map(card).join('')}</ul>` : '';
  // Three or more buttons on a page's front are the page: stacked, as a link-in-bio page is.
  const stack = hero && s.buttons.length >= 3;
  const buttons = s.buttons.length ? `<p class="go${stack ? ' stack' : ''}">${s.buttons.map((b, i) => `<a class="btn${i && !stack ? ' quiet' : ''}" href="${xml(b.url)}">${icon(b.icon, 20)}${xml(b.label)}</a>`).join(' ')}</p>` : '';
  const socials = s.socials.length ? `<ul class="social" aria-label="Elsewhere">${s.socials.map((b) => `<li><a href="${xml(b.url)}" aria-label="${xml(b.label)}" title="${xml(b.label)}">${icon(b.icon || 'link', 22)}</a></li>`).join('')}</ul>` : '';
  // Editing, a picture's address sits under it, to type over.
  const pic = (url: string, n: number) => {
    const at = s.rows.pics[n];
    return (url ? `<img class="pic" src="${xml(url)}" alt="" loading="lazy">` : '') + (edit && at ? `<span class="pic-at" data-lf="${at[0]},${at[1]}" data-hint="https://… the picture's address" aria-label="Picture, row ${at[0] + 1}">${xml(url)}</span>` : '');
  };
  const pics = (s.icon ? icon(s.icon, hero ? 64 : 40, 'ico') : '') + s.pics.map(pic).join('');
  const embed = (ref: string) => {
    const d = resolve(ref);
    return `<figure class="embed">${pageSvg(refPage(ref), `role="img" aria-label="${xml(d.title)}"`)}<figcaption><a href="${xml(base + d.hash)}">${xml(d.title)}</a> <small>${xml(d.def?.name ?? 'Document')}</small></figcaption></figure>`;
  };
  const paras = s.text.map((t) => `<p>${prose(t)}</p>`).join('');
  // The shop: a grid of what is for sale, and, by the first of them, the cart.
  const shop = s.products.length
    ? `<div class="shop"><ul class="grid" aria-label="Products">${s.products.map((p) => `<li>${p.image ? `<img src="${xml(p.image)}" alt="" loading="lazy">` : '<div class="ph" aria-hidden="true"></div>'}<div><strong>${xml(p.name)}</strong><span>${prose(p.about)}</span><b class="price">${xml(site.currency)}${p.price.toFixed(2)}</b><button type="button" data-add="${products.indexOf(p)}" aria-label="Add ${xml(p.name)} to the cart">Add to cart</button></div></li>`).join('')}</ul>${products[0] === s.products[0] ? `<aside class="cart" aria-label="Cart"><h3>Cart (<span id="count">0</span>)</h3><p id="empty">Nothing in it yet.</p><ul id="lines"></ul><div class="tot"><span>Total</span><span id="total"></span></div><button type="button" id="send">${site.orders ? 'Send order by email' : 'Copy order'}</button><p id="said" role="status" aria-live="polite"></p>${pageData('products', products)}${pageData('shop', { name: site.name || 'My site', currency: site.currency, orders: site.orders })}${CART}</aside>` : ''}</div>`
    : '';
  const kinds = form === FORM ? ['Paragraph', 'Card', 'Button', 'Picture', 'Product', 'Section', 'Page'] : ['Paragraph', 'Button', 'Social', 'Picture'];
  const add = edit ? plus(form, s.rows.end, kinds, s.title ? `Add to ${s.title}` : 'Add to this page') : '';
  return { pics, body: `${paras}${cards}${shop}${s.embeds.map(embed).join('')}${buttons}${socials}`, add };
}

function page(text: string, opts: SitePageOpts = {}): string {
  const { edit = false } = opts;
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
  const products = site.pages.flatMap((p) => p.sections.flatMap((s) => s.products));
  const o: SitePageOpts = { ...opts, form: FORM };
  // A page: its front (its pictures, the title, its words and buttons), then what else its first section holds (cards, a shop, a document) in a part under it, then its sections.
  const render = (i: number) => {
    const p: Page = site.pages[i];
    const [front, ...rest] = p.sections;
    const title = i ? p.title || `Page ${i + 1}` : name;
    const f = drawn(site, { ...front, points: [], products: [], embeds: [] }, o, true, products);
    const more = front.points.length || front.embeds.length || front.products.length ? drawn(site, { ...front, text: [], buttons: [], pics: [], icon: '', socials: [] }, { ...o, edit: false }, false, products).body : '';
    return `<section class="page" id="${pageIds[i]}">
<div class="hero${i ? ' top' : ''}"><div class="wrap">${f.pics}<h1>${xml(title)}${edit && i ? partTools(p.row, 'page') : ''}</h1>${f.body}${more ? '' : f.add}</div></div>
${more ? `<div class="part"><div class="wrap">${more}${f.add}</div></div>` : ''}
${rest
  .map((s, j) => {
    const d = drawn(site, s, o, false, products);
    return `<section class="part" id="${sectionIds[i][j + 1]}"><div class="wrap"><h2>${xml(s.title)}${edit ? partTools(s.rows.head, 'section') : ''}</h2>${d.pics}${d.body}${d.add}</div></section>`;
  })
  .join('\n')}
</section>`;
  };
  // The nav: the pages, or for a site of one page its sections, as before.
  const nav = multi ? site.pages.map((p, i) => [`#${pageIds[i]}`, i ? p.title || `Page ${i + 1}` : 'Home']) : site.pages[0].sections.slice(1).map((s, j) => [`#${sectionIds[0][j + 1]}`, s.title]).filter(([, t]) => t);
  const front = site.pages[0].sections[0];
  return htmlPage(
    name,
    front.text[0] ? plain(front.text[0]) : name,
    `${themeCss(site.theme)}\n${SITE_CSS}${edit ? EDIT_CSS : ''}`,
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
  hint: '"# Name" and a line about it; each further "# Title" starts a page, "## Section" a part of one; "- Point | detail" makes a card (":icon:" first for an icon); "> Label | https://..." a button; a table "Name | Price | About | Image" a shop with a cart; "theme: forest serif dark" the look.',
  example:
    '---\ntheme: amber serif\n---\n# Harbor Coffee\n\nSmall-batch coffee, roasted on the quay every morning.\n\n> See the menu | #menu\n> Find us | #find-us\n\n- :coffee: Roasted daily | Never more than a week old\n- :leaf: Fair trade | Farms we have visited\n- :bike: Delivered | By bike, on the day\n\n# Menu\n\nWhat we pour, and what we bake.\n\n## Coffee\n\n- Espresso | 3.00\n- Flat white | 4.20\n\n## Pastry\n\n- Cardamom bun | 3.50\n\n# Find us\n\n14 Quay Street, open 7 to 3, every day but Monday.\n\n> Email us | mailto:hello@example.com',
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
    blurb: 'A website of little pages, written as a few lines and downloaded as a single HTML file; a shop with a cart if you list what you sell.',
    title: (body) => parseSite(body).name,
    outline: (body) => siteOutline(body).slice(0, 14),
    view: (body, opts = {}) => [view(body, opts.step, opts.w)],
    steps: (body) => Math.min(40, siteOutline(body).length - (parseSite(body).name ? 1 : 0)),
    read: readSite,
  },
  spec,
);
