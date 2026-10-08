/**
 * Editing a page in place: the script a page preview gets so its words can
 * be typed on where they stand (apps/diagram-page.ts sends and receives
 * the messages). Fixed text, so the site's CSP allows it by hash.
 *
 * A field whose words appear in the page as they are is found by them.
 * A page may also mark its fields itself (the invoice does), and then it
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
 *   data-lf-remove="r" a button that takes row r away
 *
 * A page that marks its fields itself offers its own ways to add and
 * remove (data-lf-add, data-lf-remove), and gets no bar along the bottom.
 *
 * Where the cursor goes ("r,f,p" or "+k,f,p"; a trailing comma selects
 * the words, as for a field reached by keyboard or a row just added).
 */
import { pageData, pageScript } from '../kit/core.ts';

export const EDIT_SCRIPT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('lf').textContent),V=D.v,K=D.k,F=D.f;
function send(m){m.s=D.s;parent.postMessage(m,'*');}
function key(s){return s.getAttribute('data-lf').split(',').slice(0,2).join(',');}
var fields=[].slice.call(document.querySelectorAll('[data-lf]')),keys=fields.map(key),own=fields.length>0;
var nodes=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentNode;if(n.nodeValue.trim()&&p&&!/^(SCRIPT|STYLE|TITLE|TEXTAREA|OPTION)$/.test(p.tagName)&&!p.hasAttribute('data-lf'))nodes.push(n);}
var used=[];
V.forEach(function(e){var r=e[0],f=e[1],v=e[2],t=null;if(keys.indexOf(r+','+f)>=0)return;for(var i=0;i<nodes.length;i++){if(used.indexOf(nodes[i])<0&&nodes[i].nodeValue.trim()===v){t=nodes[i];break;}}if(!t)return;used.push(t);
var m=/^(\\s*)([\\s\\S]*?)(\\s*)$/.exec(t.nodeValue),s=document.createElement('span');s.setAttribute('data-lf',r+','+f);s.setAttribute('aria-label',e[3]+', row '+(r+1));s.textContent=m[2];
var fr=document.createDocumentFragment();if(m[1])fr.appendChild(document.createTextNode(m[1]));fr.appendChild(s);if(m[3])fr.appendChild(document.createTextNode(m[3]));t.parentNode.replaceChild(fr,t);fields.push(s);});
var down=0;document.addEventListener('pointerdown',function(){down=Date.now();},true);
function select(el,all){el.focus();var sel=getSelection(),rg=document.createRange();rg.selectNodeContents(el);if(!all)rg.collapse(false);sel.removeAllRanges();sel.addRange(rg);}
function where(s){var a=s.getAttribute('data-lf').split(','),m={f:+a[1]};if(a[0].charAt(0)==='+')m.k=+a[0].slice(1);else m.r=+a[0];if(a.length>2)m.p=+a[2];return m;}
function value(s){var j=s.getAttribute('data-lf-join');if(j===null)return s.textContent;return [].map.call(document.querySelectorAll('[data-lf^="'+key(s)+',"]'),function(e){return e.textContent.trim();}).filter(Boolean).join(j);}
fields.forEach(function(s){var at=where(s);s.contentEditable='true';s.setAttribute('role','textbox');
s.addEventListener('input',function(){if(!s.textContent&&s.firstChild)s.textContent='';var m=where(s);m.lf='set';m.v=value(s);send(m);});
s.addEventListener('focus',function(){if(at.r!==undefined)send({lf:'focus',r:at.r});if(Date.now()-down>300)select(s,true);});
s.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();var a=s.getAttribute('data-lf').split(','),next=a.length>2?document.querySelector('[data-lf="'+a[0]+','+a[1]+','+(+a[2]+1)+'"]'):null;if(next)select(next,true);else if(at.r!==undefined)send({lf:'enter',r:at.r});}else if(ev.key==='Escape')s.blur();});});
document.addEventListener('keydown',function(ev){var k=ev.key.toLowerCase();if((ev.ctrlKey||ev.metaKey)&&(k==='z'||k==='y'||(ev.shiftKey&&k==='t'))){ev.preventDefault();parent.postMessage({lf:'key',key:ev.key,shift:ev.shiftKey},'*');}});
document.addEventListener('focusout',function(ev){var t=ev.target,n=ev.relatedTarget&&ev.relatedTarget.getAttribute&&ev.relatedTarget.getAttribute('data-lf');if(t&&t.getAttribute&&t.getAttribute('data-lf')!==null)send({lf:'done',n:n?n+(Date.now()-down>300?',':''):undefined});});
function button(b,m){b.addEventListener('mousedown',function(ev){ev.preventDefault();});b.addEventListener('click',function(){send(m());});}
[].forEach.call(document.querySelectorAll('[data-lf-add]'),function(b){button(b,function(){var m={lf:'add',k:+b.getAttribute('data-lf-add')};if(b.hasAttribute('data-lf-after'))m.r=+b.getAttribute('data-lf-after');return m;});});
[].forEach.call(document.querySelectorAll('[data-lf-remove]'),function(b){button(b,function(){return {lf:'remove',r:+b.getAttribute('data-lf-remove')};});});
var bar=document.createElement('div');bar.id='lf-bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Add');var lab=document.createElement('span');lab.textContent='Add:';bar.appendChild(lab);var some=false;
K.forEach(function(k,i){if(k.hidden||document.querySelector('[data-lf-add="'+i+'"],[data-lf^="+'+i+',"]'))return;var b=document.createElement('button');b.type='button';b.textContent='+ '+k.name;button(b,function(){return {lf:'add',k:i};});bar.appendChild(b);some=true;});
if(!document.querySelector('[data-lf-remove]')){var x=document.createElement('button');x.type='button';x.id='lf-x';x.textContent='× Remove this';x.hidden=true;button(x,function(){return {lf:'remove'};});bar.appendChild(x);some=true;
document.addEventListener('focusin',function(ev){x.hidden=!(ev.target&&ev.target.getAttribute&&ev.target.getAttribute('data-lf'));});}
if(some&&!own){document.body.appendChild(bar);document.body.style.paddingBottom='60px';}
if(F){var q=F.slice(-1)===','?F.slice(0,-1):F,el=document.querySelector('[data-lf="'+q+'"],[data-lf^="'+q+',"]');if(el)select(el,F.slice(-1)===',');}
})();`);

/** What the script needs: the values in the page, the kinds of row that can be added, where the cursor goes, and which drawing of the page this is (a message from an earlier one is stale). */
export const editData = (values: unknown, adds: unknown, focus: unknown, stamp = 0) => pageData('lf', { v: values, k: adds, f: focus, s: stamp });
