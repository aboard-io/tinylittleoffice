/**
 * Editing a page in place: the script a page preview gets so its words can
 * be typed on where they stand (apps/diagram-page.ts sends and receives
 * the messages). Fixed text, so the site's CSP allows it by hash.
 */
import { pageData, pageScript } from '../kit/core.ts';

/**
 * Where the page was: a page that switches its parts by hash (a site's
 * pages) is drawn afresh on every change, and this puts it back on the
 * part it was showing. The hash is set and the event sent at once, so the
 * page's own script shows the part before anything else runs.
 */
export const PLACE_SCRIPT = pageScript(`(function(){
var s=document.getElementById('lf-at'),h=s?JSON.parse(s.textContent):'';
window.addEventListener('hashchange',function(){parent.postMessage({lf:'hash',h:location.hash},'*');});
if(h&&h!==location.hash){location.hash=h;window.dispatchEvent(new Event('hashchange'));}
})();`);

export const EDIT_SCRIPT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('lf').textContent),V=D.v,K=D.k,F=D.f,S=D.s||[];
var nodes=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentNode;if(n.nodeValue.trim()&&p&&!/^(SCRIPT|STYLE|TITLE|TEXTAREA|OPTION)$/.test(p.tagName)&&!p.closest('nav'))nodes.push(n);}
var used=[];
V.forEach(function(e){var r=e[0],f=e[1],v=e[2],t=null;for(var i=0;i<nodes.length;i++){if(used.indexOf(nodes[i])<0&&nodes[i].nodeValue.trim()===v){t=nodes[i];break;}}if(!t)return;used.push(t);
var m=/^(\\s*)([\\s\\S]*?)(\\s*)$/.exec(t.nodeValue),s=document.createElement('span');s.contentEditable='true';s.setAttribute('data-lf',r+','+f);s.setAttribute('role','textbox');s.setAttribute('aria-label',e[3]+', row '+(r+1));s.textContent=m[2];
var fr=document.createDocumentFragment();if(m[1])fr.appendChild(document.createTextNode(m[1]));fr.appendChild(s);if(m[3])fr.appendChild(document.createTextNode(m[3]));t.parentNode.replaceChild(fr,t);
s.addEventListener('input',function(){parent.postMessage({lf:'set',r:r,f:f,v:s.textContent},'*');});
s.addEventListener('focus',function(){parent.postMessage({lf:'focus',r:r},'*');});
s.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();parent.postMessage({lf:'enter',r:r},'*');}else if(ev.key==='Escape'){s.blur();parent.postMessage({lf:'done'},'*');}});});
document.addEventListener('focusout',function(ev){if(ev.target&&ev.target.getAttribute&&ev.target.getAttribute('data-lf'))parent.postMessage({lf:'done'},'*');});
var bar=document.createElement('div');bar.id='lf-bar';bar.setAttribute('role','group');bar.setAttribute('aria-label','Add');var lab=document.createElement('span');lab.textContent='Add:';bar.appendChild(lab);
K.forEach(function(k,i){if(k.hidden)return;var b=document.createElement('button');b.type='button';b.textContent='+ '+k.name;b.addEventListener('mousedown',function(ev){ev.preventDefault();});b.onclick=function(){parent.postMessage({lf:'add',k:i},'*');};bar.appendChild(b);});
var x=document.createElement('button');x.type='button';x.id='lf-x';x.textContent='× Remove this';x.hidden=true;x.addEventListener('mousedown',function(ev){ev.preventDefault();});x.onclick=function(){parent.postMessage({lf:'remove'},'*');};bar.appendChild(x);
var part=null,pb=[];
function partOf(el){var h=el&&el.closest?el.closest('[id]'):null,id=h?h.id:location.hash.slice(1);for(var i=0;i<S.length;i++)if(S[i][0]===id)return S[i];return null;}
function showPart(el){part=partOf(el);pb.forEach(function(b){b.hidden=!part;});if(part){var k=part[2].toLowerCase();pb[0].textContent='← '+part[2]+' earlier';pb[1].textContent=part[2]+' later →';pb[2].textContent='× Remove '+k;}}
['up','down','remove'].forEach(function(a){var b=document.createElement('button');b.type='button';b.className='lf-part';b.hidden=true;b.addEventListener('mousedown',function(ev){ev.preventDefault();});b.onclick=function(){if(part)parent.postMessage({lf:'part',r:part[1],do:a},'*');};pb.push(b);bar.appendChild(b);});
document.addEventListener('focusin',function(ev){var t=ev.target&&ev.target.getAttribute&&ev.target.getAttribute('data-lf');x.hidden=!t;showPart(t?ev.target:null);});
window.addEventListener('hashchange',function(){var a=document.activeElement;if(!a||!a.getAttribute('data-lf'))showPart(null);});
document.body.appendChild(bar);document.body.style.paddingBottom='60px';
var el=F?document.querySelector(F.slice(-1)===','?'[data-lf^="'+F+'"]':'[data-lf="'+F+'"]'):null;
var host=el?el.closest('[id]'):null;
if(host&&'#'+host.id!==location.hash){location.hash=host.id;window.dispatchEvent(new Event('hashchange'));}
if(el){el.focus();var sel=getSelection(),rg=document.createRange();rg.selectNodeContents(el);if(F.slice(-1)!==',')rg.collapse(false);sel.removeAllRanges();sel.addRange(rg);}else showPart(null);
})();`);

/** What the editing script needs: the values in the page, the kinds of row that can be added, where the cursor goes, and the page's parts (its headings: [id, row, kind]) that can be moved or removed. */
export const editData = (values: unknown, adds: unknown, focus: unknown, parts: unknown = []) => pageData('lf', { v: values, k: adds, f: focus, s: parts });
/** What the place script needs: the hash the page was showing. */
export const placeData = (hash: string) => pageData('lf-at', hash);
