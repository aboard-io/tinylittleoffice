/**
 * Editing a page in place: the script a page preview gets so its words can
 * be typed on where they stand (apps/diagram-page.ts sends and receives
 * the messages). Fixed text, so the site's CSP allows it by hash.
 */
import { pageData, pageScript } from '../kit/core.ts';

export const EDIT_SCRIPT = pageScript(`(function(){
var D=JSON.parse(document.getElementById('lf').textContent),V=D.v,K=D.k,F=D.f;
var nodes=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentNode;if(n.nodeValue.trim()&&p&&!/^(SCRIPT|STYLE|TITLE|TEXTAREA|OPTION)$/.test(p.tagName))nodes.push(n);}
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
var x=document.createElement('button');x.type='button';x.id='lf-x';x.textContent='\u00d7 Remove this';x.hidden=true;x.addEventListener('mousedown',function(ev){ev.preventDefault();});x.onclick=function(){parent.postMessage({lf:'remove'},'*');};bar.appendChild(x);
document.addEventListener('focusin',function(ev){x.hidden=!(ev.target&&ev.target.getAttribute&&ev.target.getAttribute('data-lf'));});
document.body.appendChild(bar);document.body.style.paddingBottom='60px';
if(F){var el=document.querySelector(F.slice(-1)===','?'[data-lf^="'+F+'"]':'[data-lf="'+F+'"]');if(el){el.focus();var sel=getSelection(),rg=document.createRange();rg.selectNodeContents(el);if(F.slice(-1)!==',')rg.collapse(false);sel.removeAllRanges();sel.addRange(rg);}}
})();`);

/** What the script needs: the values in the page, the kinds of row that can be added, and where the cursor goes. */
export const editData = (values: unknown, adds: unknown, focus: unknown) => pageData('lf', { v: values, k: adds, f: focus });
