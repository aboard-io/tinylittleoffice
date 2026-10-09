/**
 * Editing a page in place: the script a page preview gets so its words can
 * be typed on where they stand (apps/diagram-page.ts sends and receives
 * the messages). Fixed text, so the site's CSP allows it by hash.
 *
 * A field whose words appear in the page as they are is found by them.
 * A page may also mark its fields itself (none does now that the invoice
 * is a form of its own; the marks stay for one that will), and then it
 * can show more than its text holds:
 *
 *   data-lf="r,f"      field f of row r, typed into where it stands
 *   data-lf="+k,f"     field f of a row of kind k that is not in the text
 *                      yet: typing into it makes the row
 *   data-lf="r,f,p"    part p of a field written as several lines, each
 *                      its own box, joined by data-lf-join (" | ");
 *                      Enter moves to the next part
 *   data-hint="..."    what to put there, shown while it is empty
 *   data-lf-add="k"    a button that adds a row of kind k, after row
 *                      data-lf-after (else where the cursor is, else last)
 *   data-lf-menu="r"   a "+" that opens a chooser of the kinds of row that
 *                      can go after row r (all of them, or data-lf-kinds,
 *                      a list of kinds), where it stands
 *   data-lf-part="r"   with data-lf-do, a button that moves the heading at
 *                      row r (with all under it) up or down, or removes it
 *   data-lf-remove="r" a button that takes row r away
 *   <input data-lf>    a field typed (or picked: a date) in a box of the
 *                      browser's own rather than where it stands
 *
 * A page with no way of its own to add (no data-lf-add or data-lf-menu)
 * gets a "+" at its foot that opens the chooser of every kind.
 *
 * Where the cursor goes ("r,f,p" or "+k,f,p"; a trailing comma selects
 * the words, as for a field reached by keyboard or a row just added). The
 * cursor is put there as the script runs, and again once the page has
 * loaded if the browser took it away (it may, settling a frame that has
 * just been drawn afresh); not if it is in another field by then, put
 * there by the person, who would find it snatched back.
 */
import { pageData, pageScript } from '../kit/core.ts';

/**
 * Where the page was: a page that switches its parts by hash (a site's
 * pages) is drawn afresh on every change, and this puts it back on the
 * part it was showing. The hash is replaced in the history rather than
 * navigated to (a navigation scrolls, and takes the focus from the field
 * the editor puts the cursor in), and the event sent at once, so the
 * page's own script shows the part before anything else runs.
 */
export const PLACE_SCRIPT = pageScript(`(function(){
var s=document.getElementById('lf-at'),h=s?JSON.parse(s.textContent):'';
window.addEventListener('hashchange',function(){parent.postMessage({lf:'hash',h:location.hash},'*');});
if(h&&h!==location.hash){try{history.replaceState(null,'',location.href.split('#')[0]+h);}catch(e){location.hash=h;}window.dispatchEvent(new Event('hashchange'));}
})();`);

export const EDIT_SCRIPT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('lf').textContent),V=D.v,K=D.k,F=D.f;
function send(m){m.s=D.s;parent.postMessage(m,'*');}
function key(s){return s.getAttribute('data-lf').split(',').slice(0,2).join(',');}
var fields=[].slice.call(document.querySelectorAll('[data-lf]')),keys=fields.map(key),own=fields.length>0;
var nodes=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentNode;if(n.nodeValue.trim()&&p&&!/^(SCRIPT|STYLE|TITLE|TEXTAREA|OPTION)$/.test(p.tagName)&&!p.hasAttribute('data-lf')&&!p.closest('nav'))nodes.push(n);}
var used=[];
V.forEach(function(e){var r=e[0],f=e[1],v=e[2],t=null;if(keys.indexOf(r+','+f)>=0)return;for(var i=0;i<nodes.length;i++){if(used.indexOf(nodes[i])<0&&nodes[i].nodeValue.trim()===v){t=nodes[i];break;}}if(!t)return;used.push(t);
var m=/^(\\s*)([\\s\\S]*?)(\\s*)$/.exec(t.nodeValue),s=document.createElement('span');s.setAttribute('data-lf',r+','+f);s.setAttribute('aria-label',e[3]+', row '+(r+1));s.textContent=m[2];
var fr=document.createDocumentFragment();if(m[1])fr.appendChild(document.createTextNode(m[1]));fr.appendChild(s);if(m[3])fr.appendChild(document.createTextNode(m[3]));t.parentNode.replaceChild(fr,t);fields.push(s);});
var down=0;document.addEventListener('pointerdown',function(){down=Date.now();},true);
function select(el,all){el.focus();if(el.tagName==='INPUT')return;var sel=getSelection(),rg=document.createRange();rg.selectNodeContents(el);if(!all)rg.collapse(false);sel.removeAllRanges();sel.addRange(rg);}
function where(s){var a=s.getAttribute('data-lf').split(','),m={f:+a[1]};if(a[0].charAt(0)==='+')m.k=+a[0].slice(1);else m.r=+a[0];if(a.length>2)m.p=+a[2];return m;}
function value(s){if(s.tagName==='INPUT')return s.value;var j=s.getAttribute('data-lf-join');if(j===null)return s.textContent;return [].map.call(document.querySelectorAll('[data-lf^="'+key(s)+',"]'),function(e){return e.textContent.trim();}).filter(Boolean).join(j);}
fields.forEach(function(s){var at=where(s),box=s.tagName==='INPUT';if(!box){s.contentEditable='true';s.setAttribute('role','textbox');}
s.addEventListener(box?'change':'input',function(){if(!box&&!s.textContent&&s.firstChild)s.textContent='';var m=where(s);m.lf='set';m.v=value(s);send(m);});
s.addEventListener('focus',function(){if(at.r!==undefined)send({lf:'focus',r:at.r});if(Date.now()-down>300)select(s,true);});
s.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();var a=s.getAttribute('data-lf').split(','),next=a.length>2?document.querySelector('[data-lf="'+a[0]+','+a[1]+','+(+a[2]+1)+'"]'):null;if(next)select(next,true);else if(at.r!==undefined)send({lf:'enter',r:at.r});}else if(ev.key==='Escape')s.blur();});});
document.addEventListener('keydown',function(ev){var k=ev.key.toLowerCase();if((ev.ctrlKey||ev.metaKey)&&(k==='z'||k==='y'||(ev.shiftKey&&k==='t'))){ev.preventDefault();parent.postMessage({lf:'key',key:ev.key,shift:ev.shiftKey},'*');}});
document.addEventListener('focusout',function(ev){var t=ev.target,n=ev.relatedTarget&&ev.relatedTarget.getAttribute&&ev.relatedTarget.getAttribute('data-lf');if(t&&t.getAttribute&&t.getAttribute('data-lf')!==null)send({lf:'done',n:n?n+(Date.now()-down>300?',':''):undefined});});
function button(b,m){b.addEventListener('mousedown',function(ev){ev.preventDefault();});b.addEventListener('click',function(){send(m());});}
[].forEach.call(document.querySelectorAll('[data-lf-add]'),function(b){button(b,function(){var m={lf:'add',k:+b.getAttribute('data-lf-add')};if(b.hasAttribute('data-lf-after'))m.r=+b.getAttribute('data-lf-after');return m;});});
[].forEach.call(document.querySelectorAll('[data-lf-remove]'),function(b){button(b,function(){return {lf:'remove',r:+b.getAttribute('data-lf-remove')};});});
var menu=null;function closeMenu(){if(menu){menu.remove();menu=null;}}
document.addEventListener('click',function(ev){if(menu&&!menu.contains(ev.target)&&!(ev.target.closest&&ev.target.closest('[data-lf-menu]')))closeMenu();});
document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&menu){closeMenu();}});
function offer(b){var after=b.getAttribute('data-lf-menu'),only=b.getAttribute('data-lf-kinds'),ks=only?only.split(',').map(Number):K.map(function(k,i){return i;});
if(menu&&menu.previousSibling===b)return closeMenu();closeMenu();
menu=document.createElement('div');menu.className='lf-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Add');
ks.forEach(function(i){var k=K[i];if(!k||k.hidden)return;var it=document.createElement('button');it.type='button';it.setAttribute('role','menuitem');it.textContent=k.name;
it.addEventListener('mousedown',function(ev){ev.preventDefault();});it.addEventListener('click',function(){var m={lf:'add',k:i};if(after!==''&&after!==null)m.r=+after;closeMenu();send(m);});menu.appendChild(it);});
b.parentNode.insertBefore(menu,b.nextSibling);var first=menu.querySelector('button');if(first)first.focus();}
function plusses(){[].forEach.call(document.querySelectorAll('[data-lf-menu]'),function(b){b.addEventListener('mousedown',function(ev){ev.preventDefault();});b.addEventListener('click',function(){offer(b);});});}
[].forEach.call(document.querySelectorAll('[data-lf-part]'),function(b){button(b,function(){return {lf:'part',r:+b.getAttribute('data-lf-part'),do:b.getAttribute('data-lf-do')};});});
if(!document.querySelector('[data-lf-add],[data-lf-menu]')){var kinds=K.filter(function(k){return !k.hidden;});if(kinds.length){var foot=document.createElement('p');foot.className='lf-foot';var pb=document.createElement('button');pb.type='button';pb.className='lf-plus';pb.setAttribute('data-lf-menu','');pb.setAttribute('aria-label','Add a line');pb.textContent='+';foot.appendChild(pb);(document.querySelector('main')||document.body).appendChild(foot);}}
plusses();
var el=null;if(F){var q=F.slice(-1)===','?F.slice(0,-1):F;el=document.querySelector('[data-lf="'+q+'"],[data-lf^="'+q+',"]');}
var host=el?el.closest('[id]'):null;
if(host&&'#'+host.id!==location.hash){try{history.replaceState(null,'',location.href.split('#')[0]+'#'+host.id);}catch(e){location.hash=host.id;}window.dispatchEvent(new Event('hashchange'));}
if(el){var all=F.slice(-1)===',';select(el,all);window.addEventListener('load',function(){var a=document.activeElement;if(!a||a===document.body)select(el,all);});}
})();`);

/**
 * What the editing script needs: the values in the page, the kinds of row
 * that can be added, where the cursor goes, and which drawing of the page
 * this is (a message from an earlier one is stale).
 */
export const editData = (values: unknown, adds: unknown, focus: unknown, stamp = 0) => pageData('lf', { v: values, k: adds, f: focus, s: stamp });
/** What the place script needs: the hash the page was showing. */
export const placeData = (hash: string) => pageData('lf-at', hash);
