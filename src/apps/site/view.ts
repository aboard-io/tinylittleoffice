/**
 * The site drawn: as the web page it is (one HTML file, its pages switched by hash, a shop's cart, things
 * from the web loaded only when tapped), and as pictures of its pages for print, thumbnails and previews.
 * Every script in the page is a fixed text registered with the kit (src/kit/page.ts), so the site's
 * Content-Security-Policy allows it by hash and nothing typed can run, not even in the editor's frame; a
 * page's data goes beside its script as JSON. A section's things are drawn in the order of the document (a
 * run of cards, of buttons or of small links in one row). In the editor's frame (`edit`) every thing is also
 * marked with its id and the EDIT script says what is tapped; the words are never edited in the page itself
 * but in each thing's form (docs/kernel.md §8, decision 3). (Ported from the old tree's apps/site.def.ts,
 * apps/links.def.ts and lib/pageedit.ts.)
 */
import { isAtomic, linkify, parse, plainText, write, type Doc, type Run } from '../../doc/index.ts';
import { lookup, type Page as Picture } from '../../kit/app.ts';
import { clip, pageSvg, rect, text as line, wrapText, xml } from '../../kit/draw.ts';
import { embedOf, embedCaption } from '../../kit/embeds.ts';
import { iconInner, iconNamed, glyphNamed } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { pageData, pageScript } from '../../kit/page.ts';
import { fenceLink } from '../write/view.ts';
import { cardFields, iconOf, linesOf, linkFields, objId, readSite, ROW, safeUrl, type Embed, type Obj, type ObjKind, type Product, type Section, type Site } from './model.ts';
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
 * The editor's half of editing, in its frame: every thing on the page is marked with its id (data-o), and every
 * section with its heading's (data-sec). A tap on a thing takes it in hand (outlined; the editor is told where it
 * is, and again as the page scrolls), a tap on the thing in hand asks for its form, a tap on a section's empty
 * room takes its heading; nothing in the page is followed or bought meanwhile, but the nav still goes from page to
 * page. The editor says which thing is in hand by a message (Up and Down, Escape, a change made); undo and redo
 * keys go to the editor, and Select All never selects the page. Each thing listens for its own click, for WebKit
 * counts a finger's tap as a click only on an element that does. The page keeps its place when drawn again ("y").
 * The editor checks that a message comes from its own frame, and this script that one comes from its parent.
 */
export const EDIT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('site-edit').textContent),held=D.held,soon=0;
function send(m){m.site=D.stamp;parent.postMessage(m,'*');}
function el(id){return id===null?null:document.querySelector('[data-o="'+id+'"]');}
function rect(id){var e=el(id);if(!e)return null;var r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];}
function mark(id){[].forEach.call(document.querySelectorAll('.site-cur'),function(e){e.classList.remove('site-cur');});var e=el(id);if(e)e.classList.add('site-cur');}
function where(){soon=0;send({do:'at',o:held,r:rect(held),y:window.scrollY});}
function later(){if(!soon)soon=requestAnimationFrame(where);}
document.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.closest)return;
var o=t.closest('[data-o]');if(!o){var sec=t.closest('[data-sec]');if(sec&&!t.closest('nav'))o=el(sec.getAttribute('data-sec'));}
if(!o){var a=t.closest('a[href]');if(a&&a.getAttribute('href').charAt(0)!=='#')ev.preventDefault();return;}
ev.preventDefault();ev.stopPropagation();var id=o.getAttribute('data-o');
if(id===held)return send({do:'edit',o:id});
held=id;mark(id);send({do:'pick',o:id,r:rect(id),y:window.scrollY});},true);
window.addEventListener('message',function(ev){var m=ev.data;if(ev.source!==parent||!m||m.site!==D.stamp)return;
held=m.held===undefined?null:m.held;mark(held);var e=el(held);if(e&&m.show)e.scrollIntoView({block:'nearest'});where();});
document.addEventListener('keydown',function(ev){var k=ev.key.toLowerCase(),mod=ev.ctrlKey||ev.metaKey;
if(mod&&(k==='z'||k==='y')){ev.preventDefault();send({do:k==='y'||ev.shiftKey?'redo':'undo'});return;}
if(mod&&k==='a'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName))ev.preventDefault();});
window.addEventListener('scroll',later,{passive:true});window.addEventListener('resize',later);
[].forEach.call(document.querySelectorAll('[data-o],[data-sec]'),function(e){e.addEventListener('click',function(){});});
window.addEventListener('hashchange',function(){send({do:'page',id:decodeURIComponent(location.hash.slice(1))});});
if(D.y)window.scrollTo(0,D.y);mark(held);var e0=el(held);if(e0&&D.show)e0.scrollIntoView({block:'nearest'});
send({do:'ready'});where();
})();`);

/**
 * The editor's Preview: the page as a visitor has it, with one thing more. Escape in the page tells the editor
 * (which goes back to editing), and a link out of the site opens beside the editor, not in its frame.
 */
export const PEEK = pageScript(`(function(){
var D=JSON.parse(document.getElementById('site-peek').textContent);
document.addEventListener('keydown',function(ev){if(ev.key==='Escape')parent.postMessage({site:D.stamp,do:'leave'},'*');});
document.addEventListener('click',function(ev){var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null;if(a&&a.getAttribute('href').charAt(0)!=='#'){a.target='_blank';a.rel='noopener noreferrer';}},true);
})();`);

/* ---------- words ---------- */

export const iconSvg = (name: string, size: number, cls = '', attrs = '') => {
  const node = iconNamed(name);
  return node ? `<svg${cls ? ` class="${cls}"` : ''}${attrs} viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconInner(node)}</svg>` : '';
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
.go-card{position:relative}.go-card strong a{color:inherit;text-decoration:none}.go-card strong a::after{content:'';position:absolute;inset:0;border-radius:var(--r)}.go-card:hover{border-color:var(--a)}
.part h3{font-size:1.25rem;margin:1.8rem 0 .6rem}.pic.ph{width:8rem;height:6rem;background:var(--tint);border-radius:var(--r)}
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

/** The editor's marks: every thing a finger's target, the one under the pointer outlined lightly, the one in hand firmly. */
const EDIT_CSS = `[data-o],[data-sec]{cursor:pointer;touch-action:manipulation}[data-o]:hover{outline:1px dashed var(--a);outline-offset:3px}
.site-cur,.site-cur:hover{outline:2px solid var(--a);outline-offset:3px;border-radius:2px}
h1[data-o]:empty::before{content:attr(data-empty);color:var(--ink3)}`;

export interface SitePageOpts {
  /** Where another document's link begins: the site the link is on. */
  base?: string;
  /** The section whose page shows first (the editor's frame and its Preview). */
  cur?: number;
  /** The editor's frame: the thing in hand (`show`: scrolled into view), the scroll to keep, a stamp the frame's messages carry back. */
  edit?: { stamp: number; held?: string | null; y?: number; show?: boolean };
  /** The editor's Preview: the page as a visitor has it, which tells the editor of Escape. */
  peek?: number;
}

function embedHtml(e: Embed, base: string, attrs = ''): string {
  if ('lang' in e) {
    const def = lookup.appOf(e.lang);
    const page = def?.view(e.body, { small: true })[0];
    const name = (def && def.title(e.body)) || def?.name || e.lang;
    // A QR code is a picture: nothing to open beneath it.
    if (e.lang === 'qr') return `<figure class="embed"${attrs}>${page ? pageSvg(page, `role="img" aria-label="${xml(page.alt ?? name)}"`) : ''}</figure>`;
    return `<figure class="embed"${attrs}>${page ? pageSvg(page, `role="img" aria-label="${xml(name)}"`) : ''}<figcaption><a href="${xml(fenceLink(e.lang, e.body, base))}">${xml(name)}</a> <small>${xml(def?.name ?? t('Document'))}</small></figcaption></figure>`;
  }
  // From the web: a card, a button that loads the thing in its place (WEB), and a link to it where it lives. What must be asked first (a Wikipedia summary), or embeds nothing, is the link alone.
  const w = embedOf(e.web);
  const { provider, title } = embedCaption(e.web);
  const caption = `<figcaption><a href="${xml(e.web)}" target="_blank" rel="noopener noreferrer">${xml(title)}</a> <small>${xml(provider)}</small></figcaption>`;
  if (!w || !w.src || w.lookup || w.kind === 'link') return `<figure class="embed"${attrs}>${caption}</figure>`;
  const as = w.kind === 'image' ? 'img' : w.kind === 'audio' ? 'audio' : w.file && w.kind === 'video' ? 'video' : 'frame';
  const plays = w.kind === 'video' || w.kind === 'audio' || w.kind === 'music';
  const label = plays ? t('Play (loads it from {provider})', { provider: w.provider }) : t('Show (loads it from {provider})', { provider: w.provider });
  return `<figure class="embed"${attrs}><div class="web-pic" data-as="${as}" data-kind="${w.kind}" data-src="${xml(w.src)}" data-title="${xml(w.title)}"${w.h ? ` data-h="${w.h}"` : ''}><button type="button" class="btn web-load">${xml(label)}</button></div>${caption}</figure>`;
}

const hasWeb = (site: Site) => site.sections.some((s) => s.embeds.some((e) => 'web' in e && !!embedOf(e.web)?.src));

/** What sits under a page's title: the things that are not words, buttons or pictures begin the part below the front. */
const BODY: ReadonlySet<ObjKind> = new Set(['heading', 'card', 'products', 'web', 'doc', 'table']);

interface Ctx {
  doc: Doc;
  site: Site;
  o: SitePageOpts;
  products: Product[];
}

/** A section's things as HTML, in the order of the document; a run of cards, of buttons or of small links in one row. `hero`: on a page's front (buttons may stack). */
function things(c: Ctx, s: Section, items: Obj[], hero: boolean): string {
  const { doc, site, o } = c;
  const mark = (x: Obj) => (o.edit ? ` data-o="${objId(x)}"` : '');
  let out = '';
  for (let i = 0; i < items.length; ) {
    const x = items[i];
    let j = i + 1;
    if (ROW.has(x.kind)) while (j < items.length && items[j].kind === x.kind) j++;
    const row = items.slice(i, j);
    const b = doc.blocks[x.at];
    i = j;
    switch (x.kind) {
      case 'card':
        out += `<ul class="cards">${row
          .map((y) => {
            const r = doc.blocks[y.at];
            const f = cardFields(r.k === 'li' ? r.runs : []);
            const head = f.url ? `<a href="${xml(safeUrl(f.url))}">${prose(f.head)}</a>` : prose(f.head);
            return `<li${mark(y)}${f.url ? ' class="go-card"' : ''}>${iconSvg(f.icon, 28)}<strong>${head}</strong>${f.detail.length ? `<span>${prose(f.detail)}</span>` : ''}</li>`;
          })
          .join('')}</ul>`;
        break;
      case 'button': {
        // Three or more buttons on a page's front are the page: stacked, as a link-in-bio page is.
        const stack = hero && (row.length >= 3 || site.links);
        const button = (y: Obj, k: number) => {
          const r = doc.blocks[y.at];
          const l = linkFields(r.k === 'quote' ? linesOf(r.runs)[y.line] : []);
          return `<a class="btn${k && !stack ? ' quiet' : ''}"${mark(y)} href="${xml(safeUrl(l.url))}">${iconSvg(l.icon, 20)}${xml(l.label)}</a>`;
        };
        out += `<p class="go${stack ? ' stack' : ''}">${row.map(button).join(' ')}</p>`;
        break;
      }
      case 'link':
        out += `<ul class="social" aria-label="${xml(t('Elsewhere'))}">${row
          .map((y) => {
            const r = doc.blocks[y.at];
            const l = linkFields(r.k === 'li' ? r.runs : []);
            return `<li${mark(y)}><a href="${xml(safeUrl(l.url))}" aria-label="${xml(l.label)}" title="${xml(l.label)}">${iconSvg(l.icon && iconNamed(l.icon) ? l.icon : 'globe', 22)}</a></li>`;
          })
          .join('')}</ul>`;
        break;
      case 'heading':
        out += `<h3${mark(x)}>${xml(words(b.k === 'h' ? b.runs : []))}</h3>`;
        break;
      case 'p':
        out += `<p${mark(x)}>${linesOf(b.k === 'p' ? b.runs : [])
          .filter((l) => l.length)
          .map(prose)
          .join('<br>')}</p>`;
        break;
      case 'icon':
        out += iconSvg(iconOf(b.k === 'p' ? b.runs : [])[0], hero ? 64 : 40, 'ico', mark(x));
        break;
      case 'picture': {
        const url = b.k === 'img' ? b.url : b.k === 'p' ? plainText(b.runs).trim() : '';
        const alt = b.k === 'img' ? b.alt : '';
        out += /^https?:\/\//.test(url) ? `<img class="pic"${mark(x)} src="${xml(url)}" alt="${xml(alt)}" referrerpolicy="no-referrer" loading="lazy">` : o.edit ? `<span class="pic ph"${mark(x)} role="img" aria-label="${xml(t('Web Picture'))}"></span>` : '';
        break;
      }
      case 'web':
        out += embedHtml({ web: plainText(b.k === 'p' ? b.runs : []).trim() }, o.base ?? '', mark(x));
        break;
      case 'doc':
        if (b.k === 'fence') out += embedHtml({ lang: b.lang, body: b.body }, o.base ?? '', mark(x));
        break;
      case 'table':
        out += embedHtml({ lang: 'sheet', body: write({ head: {}, blocks: [b] }).trimEnd() }, o.base ?? '', mark(x));
        break;
      case 'products':
        out += shopHtml(c, s, mark(x));
        break;
    }
  }
  return out;
}

/** The shop: a grid of what is for sale, and, by the first of them on the site, the cart. */
function shopHtml(c: Ctx, s: Section, attrs: string): string {
  const { site, products } = c;
  const money = (n: number) => `${xml(site.currency)}${n.toFixed(2)}`;
  const first = site.sections.find((x) => x.products.length)?.n === s.n;
  return `<div class="shop"${attrs}><ul class="grid" aria-label="${xml(t('Products'))}">${s.products
    .map(
      (p) =>
        `<li>${p.image ? `<img src="${xml(p.image)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : '<div class="ph" aria-hidden="true"></div>'}<div><strong>${xml(p.name)}</strong><span>${xml(p.about)}</span><b class="price">${money(p.price)}</b><button type="button" data-add="${products.indexOf(p)}" aria-label="${xml(t('Add {thing} to the cart', { thing: p.name }))}">${xml(t('Add to cart'))}</button></div></li>`,
    )
    .join('')}</ul>${
    first
      ? `<aside class="cart" aria-label="${xml(t('Cart'))}"><h3>${xml(t('Cart'))} (<span id="count">0</span>)</h3><p id="empty">${xml(t('Nothing in it yet.'))}</p><ul id="lines"></ul><div class="tot"><span>${xml(t('Total'))}</span><span id="total"></span></div><button type="button" id="send">${xml(site.orders ? t('Send order by email') : t('Copy order'))}</button><p id="said" role="status" aria-live="polite"></p>${pageData('products', products)}${pageData('shop', {
          currency: site.currency,
          orders: site.orders,
          words: { total: t('Total'), fewer: t('One fewer'), more: t('One more'), added: t('added to the cart'), copied: t('Order copied'), order: t('Order from {site}', { site: site.name || t('My site') }) },
        })}${CART}</aside>`
      : ''
  }</div>`;
}

/** A front's things cut in three: the pictures and the big icon before anything else (drawn over the title), the words and buttons under the title, the rest in the part below. */
function front(items: Obj[]) {
  const cut = items.findIndex((x) => BODY.has(x.kind));
  const top = cut < 0 ? items : items.slice(0, cut);
  const isPic = (x: Obj) => x.kind === 'picture' || x.kind === 'icon';
  return { pics: top.filter(isPic), hero: top.filter((x) => !isPic(x)), rest: cut < 0 ? [] : items.slice(cut) };
}

/** The document as one web page: every page of the site in it, switched by the router; in the editor's frame, every thing marked too. */
export function sitePage(doc: Doc, o: SitePageOpts = {}): string {
  const site = readSite(doc);
  const name = site.name || (site.links ? t('Quick Links') : t('My site'));
  const edit = o.edit;
  const c: Ctx = { doc, site, o, products: site.sections.flatMap((s) => s.products) };
  const lead = site.sections[0];
  const about = lead.text[0] ? words(lead.text[0]) : name;
  const sec = (s: Section) => (edit ? ` data-sec="${objId(s.head)}"` : '');
  const head = (s: Section) => (edit ? ` data-o="${objId(s.head)}"` : '');
  let body: string;
  if (site.links) {
    // One column: the front's pictures, the name, the words, the stacked buttons, the small links; anything else under them.
    const parts = site.sections.map((s, i) => {
      if (i) return `<div${sec(s)}><h2${head(s)}>${xml(s.title)}</h2>${things(c, s, s.items, true)}</div>`;
      const f = front(s.items);
      return `<div${sec(s)}>${things(c, s, f.pics, true)}<h1${head(s)}>${xml(name)}</h1>${things(c, s, [...f.hero, ...f.rest], true)}</div>`;
    });
    body = `<main class="hero">${parts.join('')}<footer>${xml(name)}</footer></main>`;
  } else {
    const render = (i: number) => {
      const p = site.pages[i];
      const [lead, ...rest] = p.sections;
      const title = i ? p.title || t('Page {n}', { n: i + 1 }) : name;
      const f = front(lead.items);
      const more = f.rest.length ? `<div class="part"${sec(lead)}><div class="wrap">${things(c, lead, f.rest, false)}</div></div>` : '';
      return `<section class="page" id="${p.id}">
<div class="hero${i ? ' top' : ''}"${sec(lead)}><div class="wrap">${things(c, lead, f.pics, true)}<h1${head(lead)}>${xml(title)}</h1>${things(c, lead, f.hero, true)}</div></div>
${more}
${rest.map((s) => `<section class="part" id="${s.id}"${sec(s)}><div class="wrap"><h2${head(s)}>${xml(s.title)}</h2>${things(c, s, s.items, false)}</div></section>`).join('\n')}
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
  const shown = o.cur !== undefined && !site.links ? (site.pages[site.sections[o.cur]?.page ?? 0]?.id ?? '') : '';
  const scripts = `${site.links ? '' : ROUTER}${hasWeb(site) ? WEB : ''}${edit ? pageData('site-edit', { stamp: edit.stamp, held: edit.held ?? null, y: edit.y ?? 0, show: !!edit.show }) + EDIT : ''}${
    o.peek !== undefined && !edit ? pageData('site-peek', { stamp: o.peek }) + PEEK : ''
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
<meta name="generator" content="Tiny Little Office">
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
