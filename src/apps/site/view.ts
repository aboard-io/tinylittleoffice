/**
 * The site drawn: as the web page it is (one HTML file, its pages switched by hash, a shop's cart, things
 * from the web loaded only when tapped), and as pictures of its pages for print, thumbnails and previews.
 * Every script in the page is a fixed text registered with the kit (src/kit/page.ts), so the site's
 * Content-Security-Policy allows it by hash and nothing typed can run, not even in the editor's preview
 * frame; a page's data goes beside its script as JSON. In the preview (`edit`), the page also carries the
 * "+" that offers what a section can take and, on each page's and section's heading, the handles that
 * move or remove it: each sends a message to the editor, which makes the change as ops. The words are
 * never edited in the frame (docs/kernel.md §8, decision 3). (Ported from the old tree's apps/site.def.ts,
 * apps/links.def.ts and lib/pageedit.ts.)
 */
import { isAtomic, linkify, parse, plainText, type Doc, type Run } from '../../doc/index.ts';
import { lookup, type Page as Picture } from '../../kit/app.ts';
import { clip, pageSvg, rect, text as line, wrapText, xml } from '../../kit/draw.ts';
import { embedOf, embedCaption } from '../../kit/embeds.ts';
import { iconInner, iconNamed, glyphNamed } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { pageData, pageScript } from '../../kit/page.ts';
import { fenceLink } from '../write/view.ts';
import { kindName, kindsOf, readSite, safeUrl, type Card, type Embed, type Link, type Product, type Section, type Site } from './model.ts';
import { paletteOf, themeCss } from './theme.ts';

/* ---------- the scripts ---------- */

/**
 * The pages, switched by hash: "#menu" shows the page called Menu, or the page holding the section called
 * that, and marks it in the nav. With no script the pages sit one under another, which still reads. A page
 * to show first may be named in the data "site-at" (the editor's preview, which keeps its place).
 */
export const ROUTER = pageScript(`(function(){
var pages=[].slice.call(document.querySelectorAll('main>.page')),links=[].slice.call(document.querySelectorAll('nav a')),name=document.title,was=null,at0=document.getElementById('site-at'),first=at0?JSON.parse(at0.textContent):'';
document.addEventListener('click',function(ev){var a=ev.target&&ev.target.closest?ev.target.closest('a[href^="#"]'):null;if(!a||ev.defaultPrevented)return;ev.preventDefault();location.hash=a.getAttribute('href').slice(1);});
function show(){var h=decodeURIComponent(location.hash.slice(1))||first,page=null,at=null;first='';
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
 * A thing from the web on a page: its card, and under the card's button the thing itself, loaded only
 * then, in a sandboxed frame that sends no referrer, or by the browser's own element for a sound, a film
 * or a picture. The card says what to make in its attributes; this script holds no document text.
 */
export const WEB = pageScript(`(function(){
document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest?ev.target.closest('.web-load'):null;if(!b)return;
var box=b.parentNode,as=box.getAttribute('data-as'),el=document.createElement(as==='frame'?'iframe':as);
if(as==='frame'){el.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation');el.setAttribute('allow','autoplay; fullscreen; picture-in-picture');el.setAttribute('loading','lazy');el.title=box.getAttribute('data-title');}
else if(as==='img')el.alt=box.getAttribute('data-title');
else{el.controls=true;el.preload='none';el.setAttribute('playsinline','');}
el.className='web-'+box.getAttribute('data-kind');if(box.getAttribute('data-h'))el.style.height=box.getAttribute('data-h')+'px';
el.setAttribute('referrerpolicy','no-referrer');el.src=box.getAttribute('data-src');
while(box.firstChild)box.removeChild(box.firstChild);box.appendChild(el);});
})();`);

/**
 * The cart, in the page itself: no server, nothing stored beyond the visit. Orders go by email, or are
 * copied. One cart for the whole site, whatever page its products are on. Its words come in the data
 * "shop", in the language the site was made in.
 */
export const CART = pageScript(`(function(){
var cart={},P=JSON.parse(document.getElementById('products').textContent),S=JSON.parse(document.getElementById('shop').textContent),W=S.words;
function money(n){return S.currency+n.toFixed(2);}
function count(){return Object.keys(cart).reduce(function(a,k){return a+cart[k];},0);}
function total(){return Object.keys(cart).reduce(function(a,k){return a+cart[k]*P[k].price;},0);}
function order(){return Object.keys(cart).map(function(k){return cart[k]+' x '+P[k].name+' = '+money(cart[k]*P[k].price);}).join('\\n')+'\\n'+W.total+': '+money(total());}
function draw(){var list=document.getElementById('lines');while(list.firstChild)list.removeChild(list.firstChild);
Object.keys(cart).forEach(function(k){var li=document.createElement('li');var name=document.createElement('span');name.textContent=P[k].name;li.appendChild(name);
[['-',-1,W.fewer],['+',1,W.more]].forEach(function(b,i){var btn=document.createElement('button');btn.type='button';btn.textContent=b[0];btn.className='q';btn.setAttribute('aria-label',b[2]+' '+P[k].name);
btn.onclick=function(){cart[k]+=b[1];if(cart[k]<=0)delete cart[k];draw();};
if(i===1){var n=document.createElement('b');n.textContent=cart[k];li.appendChild(n);}li.appendChild(btn);});
var sum=document.createElement('span');sum.className='sum';sum.textContent=money(cart[k]*P[k].price);li.appendChild(sum);list.appendChild(li);});
document.getElementById('count').textContent=count();document.getElementById('total').textContent=money(total());
document.getElementById('empty').hidden=count()>0;document.getElementById('send').disabled=count()===0;}
[].forEach.call(document.querySelectorAll('[data-add]'),function(b){b.onclick=function(){var k=b.getAttribute('data-add');cart[k]=(cart[k]||0)+1;draw();document.getElementById('said').textContent=P[k].name+' '+W.added;};});
document.getElementById('send').onclick=function(){var text=W.order+'\\n\\n'+order();
if(S.orders)location.href='mailto:'+S.orders+'?subject='+encodeURIComponent(W.order)+'&body='+encodeURIComponent(text);
else if(navigator.clipboard)navigator.clipboard.writeText(text).then(function(){document.getElementById('said').textContent=W.copied;});};
draw();})();`);

/**
 * The preview's half of editing: a tap on a section picks it for the editor beside the frame; the "+"
 * opens a chooser of what the section can take (the kinds and their names come in the data "site-edit");
 * a heading's handles move or remove its part; a link out of the site does not leave the preview; the
 * page shown is told, so the next drawing keeps it; undo and redo keys go to the editor. The editor checks
 * that a message comes from its own frame.
 */
export const EDIT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('site-edit').textContent),menu=null;
function send(m){m.site=D.stamp;parent.postMessage(m,'*');}
function close(){if(menu){menu.parentNode.removeChild(menu);menu=null;}}
function offer(b){var n=+b.getAttribute('data-site-add');if(menu&&menu.previousSibling===b)return close();close();
menu=document.createElement('div');menu.className='site-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',D.add);
D.kinds.forEach(function(k){var it=document.createElement('button');it.type='button';it.setAttribute('role','menuitem');it.textContent=k[1];
it.addEventListener('click',function(ev){ev.stopPropagation();close();send({do:'add',s:n,kind:k[0]});});menu.appendChild(it);});
b.parentNode.insertBefore(menu,b.nextSibling);menu.querySelector('button').focus();}
document.addEventListener('click',function(ev){var el=ev.target;if(!el||!el.closest)return;
var plus=el.closest('[data-site-add]');if(plus){ev.preventDefault();return offer(plus);}
var part=el.closest('[data-site-part]');if(part){ev.preventDefault();close();return send({do:part.getAttribute('data-site-do'),s:+part.getAttribute('data-site-part')});}
if(menu&&!menu.contains(el))close();
var a=el.closest('a[href]');if(a&&a.getAttribute('href').charAt(0)!=='#')ev.preventDefault();
var s=el.closest('[data-s]');if(s&&!el.closest('nav'))send({do:'pick',s:+s.getAttribute('data-s')});},true);
document.addEventListener('keydown',function(ev){var k=ev.key.toLowerCase();if(ev.key==='Escape'&&menu){close();return;}
if((ev.ctrlKey||ev.metaKey)&&(k==='z'||k==='y')){ev.preventDefault();send({do:k==='y'||ev.shiftKey?'redo':'undo'});}});
window.addEventListener('hashchange',function(){send({do:'page',id:decodeURIComponent(location.hash.slice(1))});});
var cur=document.querySelector('[data-s="'+D.cur+'"]');if(cur&&D.cur>0)cur.scrollIntoView({block:'start'});
send({do:'ready'});
})();`);

/* ---------- words ---------- */

export const iconSvg = (name: string, size: number, cls = '') => {
  const node = iconNamed(name);
  return node ? `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconInner(node)}</svg>` : '';
};
const MARKS = [['b', 'strong'], ['i', 'em'], ['u', 'u'], ['s', 's'], ['h', 'mark']] as const;
/** Runs as HTML: their marks, their links (a bare web address too), their icons; a footnote as its words, on hover. */
export const prose = (runs: Run[]) =>
  runs
    .map((r) => {
      if (r.ic) return iconSvg(r.ic, 20);
      if (r.fn !== undefined) return `<sup title="${xml(r.fn)}">*</sup>`;
      let h = r.href ? xml(r.t) : linkify(r.t).map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t))).join('');
      for (const [f, tag] of MARKS) if (r[f]) h = `<${tag}>${h}</${tag}>`;
      return r.href ? `<a href="${xml(safeUrl(r.href))}">${h}</a>` : h;
    })
    .join('');
const words = (runs: Run[]) => plainText(runs.filter((r) => !isAtomic(r))).trim();

/* ---------- the page ---------- */

/** The look every page shares: the theme's variables, then the parts. */
const CSS = `*{box-sizing:border-box}body{margin:0;font:17px/1.6 var(--font);background:var(--bg);color:var(--ink)}
a{color:var(--deep)}h1,h2,h3{line-height:1.2;letter-spacing:-.01em}.wrap{max-width:60rem;margin:0 auto;padding:0 1.25rem}
button,.btn{font:inherit;font-weight:600;border:0;border-radius:var(--r);padding:.6rem 1.1rem;background:var(--a);color:var(--on);cursor:pointer;text-decoration:none;display:inline-block}.btn.quiet{background:var(--tint);color:var(--deep)}
button:focus-visible,a:focus-visible{outline:3px solid var(--deep);outline-offset:2px}
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
.social{list-style:none;padding:0;margin:2rem 0 0;display:flex;justify-content:center;gap:.8rem}.social a{display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:50%;background:var(--tint);color:var(--deep)}
.embed{margin:1.6rem 0 0}.embed svg{display:block;width:100%;max-width:48rem;height:auto;border:1px solid var(--line);border-radius:var(--r);background:#fff}.embed figcaption{font-size:.9rem;color:var(--ink3);margin-top:.4rem}
.web-pic{position:relative;max-width:48rem;min-height:9rem;border:1px solid var(--line);border-radius:var(--r);background:var(--tint)}.web-load{position:absolute;left:50%;bottom:1rem;transform:translateX(-50%);white-space:nowrap}.web-pic iframe,.web-pic video,.web-pic audio,.web-pic img{display:block;width:100%;border:0;border-radius:var(--r);background:#fff}
.web-pic img{height:auto}.web-video{aspect-ratio:16/9}.web-map{aspect-ratio:4/3}.web-post{height:520px}.web-music{height:352px}.web-code{height:400px}.web-pdf,.web-page{height:70vh}
.shop{display:grid;grid-template-columns:1fr 18rem;gap:1.6rem;align-items:start;margin-top:1.6rem}.grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:1rem}
.grid li{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;background:var(--bg)}.grid img,.grid .ph{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--tint);display:block}
.grid div{padding:.9rem;display:flex;flex-direction:column;gap:.3rem;flex:1}.grid span{color:var(--ink3);font-size:.92rem;flex:1}.price{font-weight:700}
.cart{position:sticky;top:4.4rem;border:1px solid var(--line);border-radius:var(--r);padding:1.1rem}.cart h3{margin:0 0 .6rem;font-size:1.1rem}#lines{list-style:none;margin:0;padding:0}#lines li{display:flex;align-items:center;gap:.4rem;padding:.35rem 0}#lines span:first-child{flex:1}
.q{padding:0;width:2rem;height:2rem;border-radius:50%;background:var(--tint);color:var(--deep)}.sum{min-width:4.2rem;text-align:right;font-variant-numeric:tabular-nums}
.tot{display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--line);margin-top:.6rem;padding-top:.6rem}#send{width:100%;margin-top:.8rem}#send:disabled{opacity:.45;cursor:default}#empty{color:var(--ink3)}
@media(max-width:46rem){.shop{grid-template-columns:1fr}.cart{position:static}}
footer{padding:2rem 0;color:var(--ink3);font-size:.9rem;border-top:1px solid var(--line)}`;

/** A Quick Links page's own look: everything centred in one narrow column, the buttons always stacked and all of one colour. */
const LINKS_CSS = `main.hero{max-width:26rem;margin:0 auto;padding:3rem 1.25rem 4rem;text-align:center;background:none}
.go{flex-direction:column}.go .btn{padding:.9rem 1.1rem;font-size:1.05rem;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.06)}.go .btn.quiet{background:var(--a);color:var(--on)}
h1{font-size:2rem;margin:0 0 .6rem}p{color:var(--ink2);margin:0 0 1rem}
footer{border:0;padding:1rem 0 0;font-size:.85rem}`;

/** The preview's marks: the section being edited outlined, the "+" and the handles thumb-sized. */
const EDIT_CSS = `[data-s]{cursor:pointer}.site-cur{outline:2px dashed var(--a);outline-offset:-2px}
.site-plus{display:inline-grid;place-items:center;width:2.75rem;height:2.75rem;padding:0;border-radius:50%;border:1px dashed var(--a);background:var(--bg);color:var(--a);font:600 1.3rem/1 var(--font);margin:1.2rem 0 0}.hero .site-plus,main>.site-plus{margin:1.2rem auto 0}
.site-tools{display:inline-flex;gap:.3rem;vertical-align:middle;margin-left:.6rem}.site-tools button{width:2.75rem;height:2.75rem;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--bg);color:var(--ink2);font:1rem/1 var(--font)}.site-tools button:hover{color:var(--deep);border-color:var(--a)}
.site-menu{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:.8rem auto 0;max-width:30rem}.site-menu button{background:var(--tint);color:var(--deep);padding:.55rem .9rem;min-height:2.75rem}`;

export interface SitePageOpts {
  /** Where another document's link begins: the site the link is on. */
  base?: string;
  /** The preview in the editor: the section being edited, and a stamp the frame's messages carry back. */
  edit?: { cur: number; stamp: number };
}

/** The buttons a page's or a section's heading carries in the preview: earlier, later, away. */
function tools(n: number, page: boolean) {
  const what = page ? [t('Move this page earlier'), t('Move this page later'), t('Remove this page')] : [t('Move this section earlier'), t('Move this section later'), t('Remove this section')];
  return `<span class="site-tools" role="group" aria-label="${xml(page ? t('This page') : t('This section'))}">${['up', 'down', 'remove']
    .map((d, i) => `<button type="button" data-site-part="${n}" data-site-do="${d}" aria-label="${xml(what[i])}">${['↑', '↓', '×'][i]}</button>`)
    .join('')}</span>`;
}
const plus = (s: Section) => `<button type="button" class="site-plus" data-site-add="${s.n}" aria-label="${xml(s.title ? t('Add to {part}', { part: s.title }) : t('Add to this page'))}">+</button>`;

function embedHtml(e: Embed, base: string): string {
  if ('lang' in e) {
    const def = lookup.appOf(e.lang);
    const page = def?.view(e.body, { small: true })[0];
    const name = (def && def.title(e.body)) || def?.name || e.lang;
    return `<figure class="embed">${page ? pageSvg(page, `role="img" aria-label="${xml(name)}"`) : ''}<figcaption><a href="${xml(fenceLink(e.lang, e.body, base))}">${xml(name)}</a> <small>${xml(def?.name ?? t('Document'))}</small></figcaption></figure>`;
  }
  // From the web: a card, a button that loads the thing in its place (WEB), and a link to it where it lives. What must be asked first (a Wikipedia summary), or embeds nothing, is the link alone.
  const w = embedOf(e.web);
  const { provider, title } = embedCaption(e.web);
  const caption = `<figcaption><a href="${xml(e.web)}" target="_blank" rel="noopener noreferrer">${xml(title)}</a> <small>${xml(provider)}</small></figcaption>`;
  if (!w || !w.src || w.lookup || w.kind === 'link') return `<figure class="embed">${caption}</figure>`;
  const as = w.kind === 'image' ? 'img' : w.kind === 'audio' ? 'audio' : w.file && w.kind === 'video' ? 'video' : 'frame';
  const plays = w.kind === 'video' || w.kind === 'audio' || w.kind === 'music';
  const label = plays ? t('Play (loads it from {provider})', { provider: w.provider }) : t('Show (loads it from {provider})', { provider: w.provider });
  return `<figure class="embed"><div class="web-pic" data-as="${as}" data-kind="${w.kind}" data-src="${xml(w.src)}" data-title="${xml(w.title)}"${w.h ? ` data-h="${w.h}"` : ''}><button type="button" class="btn web-load">${xml(label)}</button></div>${caption}</figure>`;
}

const hasWeb = (site: Site) => site.sections.some((s) => s.embeds.some((e) => 'web' in e && !!embedOf(e.web)?.src));

/** What a section is drawn as, in pieces: its pictures and icon (a page's front puts its title after them), the rest. */
function drawn(site: Site, s: Section, o: SitePageOpts, hero: boolean, products: Product[]): { pics: string; body: string } {
  const card = (c: Card) => `<li>${iconSvg(c.icon, 28)}<strong>${prose(c.head)}</strong>${c.detail.length ? `<span>${prose(c.detail)}</span>` : ''}</li>`;
  const cards = s.cards.length ? `<ul class="cards">${s.cards.map(card).join('')}</ul>` : '';
  // Three or more buttons on a page's front are the page: stacked, as a link-in-bio page is.
  const stack = hero && (s.buttons.length >= 3 || site.links);
  const button = (b: Link, i: number) => `<a class="btn${i && !stack ? ' quiet' : ''}" href="${xml(b.url)}">${iconSvg(b.icon, 20)}${xml(b.label)}</a>`;
  const buttons = s.buttons.length ? `<p class="go${stack ? ' stack' : ''}">${s.buttons.map(button).join(' ')}</p>` : '';
  const socials = s.socials.length ? `<ul class="social" aria-label="${xml(t('Elsewhere'))}">${s.socials.map((b) => `<li><a href="${xml(b.url)}" aria-label="${xml(b.label)}" title="${xml(b.label)}">${iconSvg(b.icon && iconNamed(b.icon) ? b.icon : 'globe', 22)}</a></li>`).join('')}</ul>` : '';
  const pics = (s.icon ? iconSvg(s.icon, hero ? 64 : 40, 'ico') : '') + s.pics.map((p) => (p.url ? `<img class="pic" src="${xml(p.url)}" alt="${xml(p.alt)}" loading="lazy">` : '')).join('');
  const paras = s.text.map((r) => `<p>${prose(r)}</p>`).join('');
  const money = (n: number) => `${xml(site.currency)}${n.toFixed(2)}`;
  // The shop: a grid of what is for sale, and, by the first of them, the cart.
  const first = site.sections.find((x) => x.products.length)?.n === s.n;
  const shop = s.products.length
    ? `<div class="shop"><ul class="grid" aria-label="${xml(t('Products'))}">${s.products
        .map(
          (p) =>
            `<li>${p.image ? `<img src="${xml(p.image)}" alt="" loading="lazy">` : '<div class="ph" aria-hidden="true"></div>'}<div><strong>${xml(p.name)}</strong><span>${xml(p.about)}</span><b class="price">${money(p.price)}</b><button type="button" data-add="${products.indexOf(p)}" aria-label="${xml(t('Add {thing} to the cart', { thing: p.name }))}">${xml(t('Add to cart'))}</button></div></li>`,
        )
        .join('')}</ul>${
        first
          ? `<aside class="cart" aria-label="${xml(t('Cart'))}"><h3>${xml(t('Cart'))} (<span id="count">0</span>)</h3><p id="empty">${xml(t('Nothing in it yet.'))}</p><ul id="lines"></ul><div class="tot"><span>${xml(t('Total'))}</span><span id="total"></span></div><button type="button" id="send">${xml(site.orders ? t('Send order by email') : t('Copy order'))}</button><p id="said" role="status" aria-live="polite"></p>${pageData('products', products)}${pageData('shop', {
              currency: site.currency,
              orders: site.orders,
              words: { total: t('Total'), fewer: t('One fewer'), more: t('One more'), added: t('added to the cart'), copied: t('Order copied'), order: t('Order from {site}', { site: site.name || t('My site') }) },
            })}${CART}</aside>`
          : ''
      }</div>`
    : '';
  return { pics, body: `${paras}${cards}${shop}${s.embeds.map((e) => embedHtml(e, o.base ?? '')).join('')}${buttons}${socials}` };
}

/** The document as one web page: every page of the site in it, switched by the router; in the preview, the editing marks too. */
export function sitePage(doc: Doc, o: SitePageOpts = {}): string {
  const site = readSite(doc);
  const name = site.name || (site.links ? t('Quick Links') : t('My site'));
  const edit = o.edit;
  const products = site.sections.flatMap((s) => s.products);
  const front = site.sections[0];
  const about = front.text[0] ? words(front.text[0]) : name;
  const mark = (s: Section) => (edit ? ` data-s="${s.n}"${edit.cur === s.n ? ' class="site-cur"' : ''}` : '');
  const cls = (s: Section, base: string) => (edit && edit.cur === s.n ? `${base} site-cur` : base);
  const at = (s: Section) => (edit ? ` data-s="${s.n}"` : '');
  let body: string;
  if (site.links) {
    // One column: the front's pictures, the name, the words, the stacked buttons, the small links; anything else under them.
    const parts = site.sections.map((s, i) => {
      const d = drawn(site, s, o, true, products);
      return `<div${mark(s)}>${i ? '' : d.pics}${i ? `<h2>${xml(s.title)}</h2>${d.pics}` : `<h1>${xml(name)}</h1>`}${d.body}${edit ? plus(s) : ''}</div>`;
    });
    body = `<main class="hero">${parts.join('')}<footer>${xml(name)}</footer></main>`;
  } else {
    const render = (i: number) => {
      const p = site.pages[i];
      const [head, ...rest] = p.sections;
      const title = i ? p.title || t('Page {n}', { n: i + 1 }) : name;
      const f = drawn(site, { ...head, cards: [], products: [], embeds: [] }, o, true, products);
      const more = head.cards.length || head.embeds.length || head.products.length ? drawn(site, { ...head, text: [], buttons: [], pics: [], icon: '', socials: [] }, o, false, products).body : '';
      const handles = edit && i ? tools(head.n, true) : '';
      return `<section class="page" id="${p.id}">
<div class="${cls(head, `hero${i ? ' top' : ''}`)}"${at(head)}><div class="wrap">${f.pics}<h1>${xml(title)}${handles}</h1>${f.body}${edit && !more ? plus(head) : ''}</div></div>
${more ? `<div class="${cls(head, 'part')}"${at(head)}><div class="wrap">${more}${edit ? plus(head) : ''}</div></div>` : ''}
${rest
  .map((s) => {
    const d = drawn(site, s, o, false, products);
    return `<section class="${cls(s, 'part')}" id="${s.id}"${at(s)}><div class="wrap"><h2>${xml(s.title)}${edit ? tools(s.n, false) : ''}</h2>${d.pics}${d.body}${edit ? plus(s) : ''}</div></section>`;
  })
  .join('\n')}
</section>`;
    };
    // The nav: the pages, or for a site of one page its sections.
    const multi = site.pages.length > 1;
    const nav = multi ? site.pages.map((p, i) => [`#${p.id}`, i ? p.title || t('Page {n}', { n: i + 1 }) : t('Home')]) : site.pages[0].sections.slice(1).filter((s) => s.title).map((s) => [`#${s.id}`, s.title]);
    body = `<header><div class="wrap"><b>${xml(name)}</b><nav aria-label="${xml(multi ? t('Pages') : t('Sections'))}">${nav.map(([href, w]) => `<a href="${xml(href)}">${xml(w)}</a>`).join('')}</nav></div></header>
<main>
${site.pages.map((_, i) => render(i)).join('\n')}
</main>
<footer><div class="wrap">${xml(name)}</div></footer>`;
  }
  const shown = edit ? site.pages[site.sections[edit.cur]?.page ?? 0]?.id ?? '' : '';
  const scripts = `${site.links ? '' : ROUTER}${hasWeb(site) ? WEB : ''}${
    edit ? pageData('site-edit', { cur: edit.cur, stamp: edit.stamp, add: t('Add'), kinds: kindsOf(site).map((k) => [k, kindName(k)]) }) + EDIT : ''
  }`;
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(name)}</title>
<meta name="description" content="${xml(about)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${xml(name)}">
<meta property="og:description" content="${xml(about)}">
<meta name="generator" content="TinyLittleOffice">
<style>
${themeCss(site.theme)}
${CSS}${site.links ? `\n${LINKS_CSS}` : ''}${edit ? `\n${EDIT_CSS}` : ''}
</style>
</head>
<body>
${body}
${shown ? pageData('site-at', shown) : ''}${scripts}
</body>
</html>
`;
}

/* ---------- the pictures ---------- */

const W = 800;

/**
 * The site as pictures, a page each (the home page alone when small): its bar with the name, the front in
 * the theme's tint, and each section's words, cards, buttons, products and documents as they stand.
 */
export function sitePictures(textDoc: string, small = false): Picture[] {
  const site = readSite(parse(textDoc));
  const p = paletteOf(site.theme);
  const name = site.name || (site.links ? t('Quick Links') : t('My site'));
  const pages = small ? site.pages.slice(0, 1) : site.pages;
  return pages.map((pg, i) => {
    let svg = '';
    let y = 0;
    const pad = 40;
    const inner = W - 2 * pad;
    const para = (runs: Run[], px: number, fill: string, center: boolean) => {
      for (const l of wrapText(words(runs), center ? inner - 80 : inner, px)) {
        y += px * 1.45;
        svg += line(center ? W / 2 : pad, y, l, { px, fill, anchor: center ? 'middle' : 'start' });
      }
    };
    if (!site.links) {
      svg += rect(0, 0, W, 52, p.bg) + rect(0, 51, W, 1, p.line);
      svg += line(pad, 32, clip(name, 300, 17, true), { px: 17, bold: true, fill: p.ink });
      const nav = site.pages.length > 1 ? site.pages.map((x, k) => (k ? x.title : t('Home'))) : site.pages[0].sections.slice(1).map((s) => s.title);
      svg += line(W - pad, 32, clip(nav.join('   '), 380, 14), { px: 14, fill: p.ink2, anchor: 'end' });
      y = 52;
    }
    pg.sections.forEach((s, j) => {
      const hero = j === 0;
      const top = y;
      if (hero) {
        y += 48;
        if (s.icon && iconNamed(s.icon)) svg += glyphNamed(s.icon, W / 2 - 28, y, 56, p.hex.a), (y += 72);
        else if (s.pics.some((x) => x.url)) svg += `<circle cx="${W / 2}" cy="${y + 44}" r="44" fill="${p.hex.tint}" stroke="${p.line}"/>`, (y += 104);
        y += 34;
        svg += line(W / 2, y, clip(i ? pg.title || t('Page {n}', { n: i + 1 }) : name, inner, 34, true), { px: 34, bold: true, fill: p.ink, anchor: 'middle' });
        y += 10;
        for (const r of s.text) para(r, 18, p.ink2, true);
      } else {
        svg += rect(0, y, W, 1, p.line);
        y += 56;
        svg += line(pad, y, clip(s.title, inner, 26, true), { px: 26, bold: true, fill: p.ink });
        y += 6;
        for (const r of s.text) para(r, 16, p.ink2, false);
      }
      if (s.buttons.length) {
        y += 22;
        const stack = hero && (s.buttons.length >= 3 || site.links);
        if (stack)
          for (const b of s.buttons) {
            svg += rect(W / 2 - 170, y, 340, 44, p.hex.a, 'rx="10"') + line(W / 2, y + 28, clip(b.label, 300, 16, true), { px: 16, bold: true, fill: p.on, anchor: 'middle' });
            y += 54;
          }
        else {
          const ws = s.buttons.map((b) => Math.min(220, b.label.length * 9 + 40));
          let x = hero ? (W - ws.reduce((a, b) => a + b + 10, -10)) / 2 : pad;
          s.buttons.forEach((b, k) => {
            const fill = k ? p.hex.tint : p.hex.a;
            svg += rect(x, y, ws[k], 40, fill, 'rx="10"') + line(x + ws[k] / 2, y + 26, clip(b.label, ws[k] - 16, 15, true), { px: 15, bold: true, fill: k ? p.hex.deep : p.on, anchor: 'middle' });
            x += ws[k] + 10;
          });
          y += 50;
        }
      }
      if (s.socials.length) {
        y += 16;
        const x0 = W / 2 - (s.socials.length * 52 - 8) / 2;
        s.socials.forEach((b, k) => (svg += `<circle cx="${x0 + k * 52 + 22}" cy="${y + 22}" r="22" fill="${p.hex.tint}"/>` + glyphNamed(b.icon && iconNamed(b.icon) ? b.icon : 'globe', x0 + k * 52 + 11, y + 11, 22, p.hex.deep)));
        y += 56;
      }
      // Cards and products: boxes three across.
      const boxes: { head: string; detail: string; icon: string }[] = [
        ...s.cards.map((c) => ({ head: words(c.head), detail: words(c.detail), icon: c.icon })),
        ...s.products.map((x) => ({ head: x.name, detail: `${site.currency}${x.price.toFixed(2)}`, icon: '' })),
        ...s.embeds.map((e) => ({ head: 'lang' in e ? lookup.appOf(e.lang)?.title(e.body) || lookup.appOf(e.lang)?.name || e.lang : embedCaption(e.web).title, detail: 'lang' in e ? (lookup.appOf(e.lang)?.name ?? '') : embedCaption(e.web).provider, icon: '' })),
      ];
      if (boxes.length) {
        y += 24;
        const bw = (inner - 32) / 3;
        boxes.forEach((b, k) => {
          const x = pad + (k % 3) * (bw + 16);
          const by = y + Math.floor(k / 3) * 112;
          svg += rect(x, by, bw, 96, p.bg, `rx="10" stroke="${p.line}"`);
          let ty = by + 30;
          if (b.icon && iconNamed(b.icon)) svg += glyphNamed(b.icon, x + 16, by + 14, 22, p.hex.a), (ty += 22);
          svg += line(x + 16, ty, clip(b.head, bw - 32, 15, true), { px: 15, bold: true, fill: p.ink });
          if (b.detail) svg += line(x + 16, ty + 22, clip(b.detail, bw - 32, 13), { px: 13, fill: p.ink3 });
        });
        y += Math.ceil(boxes.length / 3) * 112 - 16;
      }
      y += hero ? 48 : 40;
      if (hero && !site.links) svg = rect(0, top, W, y - top, p.hex.tint) + svg;
    });
    const h = Math.max(small ? 420 : 560, Math.round(y + 24));
    return { w: W, h: small ? Math.min(h, 600) : h, svg: rect(0, 0, W, h, p.bg) + svg, alt: i ? pg.title : name };
  });
}
