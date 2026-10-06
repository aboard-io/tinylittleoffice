/**
 * The page view: the document as a web page in a sandboxed frame of its
 * own (its scripts run, but it cannot reach this one). With a form, the
 * page is editable in place: every field whose words appear in it can be
 * typed into, and a bar along the bottom adds rows. Changes come back as
 * messages, the only way the frame can speak to us.
 */
import { html, state, fontsForPictures, type TemplateResult } from '../kit.ts';
import { DiagramElement } from './diagram.ts';
import { blockEnd, fieldsOf, kindsOf, readLines, removeRow, writeLines, type Row } from '../lib/lines.ts';

export class PageView extends DiagramElement {
  /** The fonts, as CSS, for the page shown in its frame. */
  @state() private faces = '';

  /** While someone types in the page, the page is left alone (reloading it would lose their place); the text changes underneath. */
  private held: string | null = null;
  /** The row being typed in, in the page. */
  private pageRow = -1;
  /** Where to put the cursor once the page is drawn again: a row, or a row and field with the cursor at the end. */
  private focusRow: number | string = -1;
  private settle = 0;
  /** The page last given to the frame. */
  private lastSrc = '';

  private onPageMessage = (e: MessageEvent) => {
    const frame = this.querySelector<HTMLIFrameElement>('.diagram.page iframe');
    if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data.lf !== 'string' || !this.spec.form) return;
    const form = this.spec.form;
    const m = e.data as { lf: string; r?: number; f?: number; v?: string; k?: number };
    const rows = readLines(this.textOf(this.doc), form);
    // A new row starts with its fields' names as its words, so it shows up on the page to be typed into (a number where a number is wanted).
    const fresh = (kind: number): Row => ({
      kind,
      values: fieldsOf(form, kind).map((f) => (f.type === 'choice' ? f.options[0] : f.type === 'date' ? new Date().toISOString().slice(0, 10) : f.type === 'icon' ? '' : /amount|price|quantity|qty|stars|value|lowest|highest|width|depth|left|top|semitones|how much/i.test(f.name) ? '10' : f.name)),
      depth: kindsOf(form).kinds[kind].at ?? 0,
    });
    if (m.lf === 'focus') this.pageRow = m.r!;
    else if (m.lf === 'set' && rows[m.r!]) {
      // (The page as it is on screen, script and all: swapping in a plain one would lose the cursor.)
      this.held ??= this.lastSrc;
      rows[m.r!].values[m.f!] = m.v ?? '';
      this.type(writeLines(rows, form));
      // Once the typing pauses, the page is drawn afresh (its sums and all), with the cursor back where it was.
      clearTimeout(this.settle);
      this.settle = window.setTimeout(() => {
        this.held = null;
        this.focusRow = `${m.r},${m.f}`;
        this.requestUpdate();
      }, 900);
    } else if (m.lf === 'done') {
      clearTimeout(this.settle);
      this.held = null;
      this.requestUpdate();
    } else if (m.lf === 'enter' || m.lf === 'add') {
      const kind = m.lf === 'add' ? m.k! : rows[m.r!]?.kind;
      if (kind === undefined) return;
      const k = kindsOf(form).kinds[kind];
      const after = m.lf === 'enter' ? m.r! : this.pageRow;
      const top = rows.findIndex((r) => !kindsOf(form).kinds[r.kind].once);
      const at = k.once ? (top < 0 ? rows.length : top) : after >= 0 && after < rows.length ? (k.indent ? blockEnd(rows, form, after) : after + 1) : rows.length;
      this.held = null;
      this.focusRow = at;
      this.putRows([...rows.slice(0, at), fresh(kind), ...rows.slice(at)]);
    } else if (m.lf === 'remove' && rows[this.pageRow]) {
      this.held = null;
      this.putRows(removeRow(rows, form, this.pageRow));
      this.pageRow = -1;
    }
  };

  /** The page as it stands, for its frame. */
  private pageHtml(): string {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    return (text.trim() ? spec.page!(this.doc) : spec.page!(spec.example)).replace('<head>', `<head><style>${this.faces}</style>`);
  }

  /**
   * The page, made editable in place: every field whose words appear in
   * it as they are can be typed into; a bar along the bottom adds rows.
   * Changes come back as messages (the frame is sandboxed: this is the
   * only way it can speak to us), and are written into the text.
   */
  private editablePage(): string {
    const form = this.spec.form!;
    const text = this.textOf(this.doc);
    if (!text.trim()) return this.pageHtml();
    const rows = readLines(text, form);
    const { kinds } = kindsOf(form);
    const values = rows.flatMap((r, i) => r.values.map((v, f) => [i, f, v, fieldsOf(form, r.kind)[f].name] as const).filter(([, , v, , ]) => v.trim().length > 1 && fieldsOf(form, r.kind).length));
    const adds = kinds.map((k, i) => ({ name: k.name, hidden: k.is === '' || (k.once && rows.some((r) => r.kind === i)) }));
    const focus = typeof this.focusRow === 'string' ? this.focusRow : this.focusRow >= 0 ? `${this.focusRow},` : '';
    this.focusRow = -1;
    const script = `<style>[data-lf]{outline:1px dashed rgba(79,70,229,.5);outline-offset:2px;border-radius:3px;cursor:text;min-width:1ch;display:inline-block}[data-lf]:focus{outline:2px solid #4f46e5;background:#eef2ff;color:#18181b}
#lf-bar{position:fixed;left:0;right:0;bottom:0;z-index:9;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 10px;background:rgba(255,255,255,.96);border-top:1px solid #e4e4e7;font:13px system-ui,sans-serif}
#lf-bar button{font:inherit;padding:5px 11px;border:1px dashed #4f46e5;background:#fff;color:#4338ca;border-radius:999px;cursor:pointer}#lf-bar button:focus-visible{outline:2px solid #4f46e5}
#lf-x{margin-left:auto;border-color:#dc2626;color:#b91c1c}#lf-bar span{color:#52525b;margin-right:4px}</style>
<script>(function(){
var V=${JSON.stringify(values).replace(/</g, '\u003c')},K=${JSON.stringify(adds)},F=${JSON.stringify(focus)};
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
})();</script>`;
    return this.pageHtml().replace('</body>', script + '</body>');
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.onPageMessage);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.onPageMessage);
  }

  protected get kind() {
    return 'page';
  }
  protected picture(): TemplateResult {
    if (!this.faces) void fontsForPictures().then((faces) => (this.faces = faces || ' '));
    const text = this.textOf(this.doc);
    return html`<iframe title="${this.name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${(this.lastSrc = this.held ?? (this.form ? this.editablePage() : this.pageHtml()))} class=${text.trim() ? '' : 'sample'}></iframe>`;
  }
}
