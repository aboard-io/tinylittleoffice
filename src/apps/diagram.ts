/**
 * The editor every diagram app shares: an outline on one side, its picture
 * on the other. What the outline means is the app's own layout (see
 * lib/diagram.ts); this only edits text and shows what comes of it.
 */
import { DocElement, defineElement, html, nothing, unsafeSVG, tool, appOf, makeRef, pageSvg, type TemplateResult } from '../kit.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { ToLines } from '../widgets/line-form.ts';
import { state, fontsForPictures } from '../kit.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { specOf, toDrawing, type DiagramSpec } from '../lib/diagram.ts';
import { blockEnd, fieldsOf, kindsOf, readLines, removeRow, writeLines, type Row } from '../lib/lines.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { isLink } from '../lib/drawmodel.ts';
import { svg } from 'lit';
import { arrowDefs, shapeSvg } from './draw.def.ts';

export class DiagramElement extends DocElement<string> {
  /** Which diagram app this is; set by defineDiagramEditor. */
  static app = '';

  protected parse(text: string) {
    return text;
  }
  protected serialize(text: string) {
    return text;
  }

  /** Filled in as a form, or typed as text: the same document either way. The choice is remembered. */
  /* ---------- working the page itself ---------- */

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

  /* ---------- typing on the picture ---------- */

  /** A box over the picture, where a label or a line of a sheet is typed: the row and field it writes, and where it sits. */
  @state() private editing: { row: number; field: number; x: number; y: number; w: number; h: number } | null = null;

  /** Open the box over an element of the picture, for a row's field. */
  private editOver(el: Element, row: number, field = -1) {
    const form = this.spec.form;
    if (!form) return;
    const rows = this.rows();
    if (!rows[row]) return;
    const fields = fieldsOf(form, rows[row].kind);
    const f = field >= 0 ? field : fields.findIndex((x) => x.type !== 'icon' && x.type !== 'choice');
    if (f < 0) return;
    const pic = this.querySelector<HTMLElement>('.pic')!;
    const [b, p] = [el.getBoundingClientRect(), pic.getBoundingClientRect()];
    // At least a readable size, wherever the words are.
    const w = Math.max(120, b.width + 16);
    const h = Math.max(34, Math.min(60, b.height + 8));
    this.editing = { row, field: f, x: b.left - p.left + pic.scrollLeft + (b.width - w) / 2, y: b.top - p.top + pic.scrollTop + (b.height - h) / 2, w, h };
    this.sel = -1;
    void this.updateComplete.then(() => {
      const box = this.querySelector<HTMLInputElement>('.pic-edit input');
      box?.focus();
      box?.select();
    });
  }

  /** A sheet's words, tapped: the row and field they came from, if any. */
  private onSheetClick(e: Event) {
    const t = (e.target as Element).closest('text');
    const form = this.spec.form;
    if (!t || !form) return;
    const label = (t.textContent ?? '').trim();
    const rows = this.rows();
    for (let i = 0; i < rows.length; i++) {
      const f = rows[i].values.findIndex((v, n) => fieldsOf(form, rows[i].kind)[n].type !== 'icon' && v.trim() && (v.trim() === label || label.startsWith(v.trim())));
      if (f >= 0) return this.editOver(t, i, f);
    }
  }

  private renderEditBox() {
    const e = this.editing;
    if (!e || !this.spec.form) return nothing;
    const rows = this.rows();
    const row = rows[e.row];
    if (!row) return nothing;
    const field = fieldsOf(this.spec.form, row.kind)[e.field];
    const done = () => (this.editing = null);
    return html`<div class="pic-edit" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px">
      <input
        aria-label="${field.name}, row ${e.row + 1}"
        .value=${row.values[e.field] ?? ''}
        @input=${(ev: Event) => this.putRows(rows.map((r, n) => (n === e.row ? { ...r, values: r.values.map((v, m) => (m === e.field ? (ev.target as HTMLInputElement).value : v)) } : r)))}
        @keydown=${(ev: KeyboardEvent) => (ev.key === 'Enter' || ev.key === 'Escape') && (ev.preventDefault(), done())}
        @blur=${done}
      />
    </div>`;
  }

  /** The shape picked in the picture, whose buttons are showing. */
  @state() private sel = -1;
  /** The fonts, as CSS, for the page shown in its frame. */
  @state() private faces = '';
  @state() private asText = (() => {
    try {
      return localStorage.getItem('tinyoffice.edit') === 'text';
    } catch {
      return false;
    }
  })();
  private setMode(text: boolean) {
    this.asText = text;
    try {
      localStorage.setItem('tinyoffice.edit', text ? 'text' : 'form');
    } catch {
      // (Not remembered, then.)
    }
  }

  protected get spec(): DiagramSpec {
    return specOf((this.constructor as typeof DiagramElement).app)!;
  }

  /** The part of the document that is typed (an app may keep more in it than text). */
  protected textOf(doc: string): string {
    return doc;
  }
  /** The document with its typed part replaced. */
  protected withText(_doc: string, text: string): string {
    return text;
  }
  /** Anything an app adds under its toolbar. */
  protected extra(): TemplateResult | typeof nothing {
    return nothing;
  }
  private type(text: string) {
    this.commit(this.withText(this.doc, text));
  }

  /** Put an icon at the front of the line the caret is on: ":rocket Launch". */
  private async addIcon() {
    const area = this.querySelector<HTMLTextAreaElement>('.diagram textarea')!;
    const at = area.selectionStart;
    const name = await chooseIcon();
    if (!name) return;
    const value = this.textOf(this.doc);
    const from = value.lastIndexOf('\n', at - 1) + 1;
    const end = value.indexOf('\n', from) < 0 ? value.length : value.indexOf('\n', from);
    // After the indent, and after "Who: " where a line has one; replacing an icon already there.
    const line = value.slice(from, end);
    const lead = /^\s*(?:[^:|>]{1,24}:\s+(?!\/))?/.exec(line)![0];
    const rest = line.slice(lead.length).replace(/^:[a-z0-9-]+\s*/, '');
    this.type(value.slice(0, from) + lead + `:${name} ` + rest + value.slice(end));
  }

  /** Tab and Shift+Tab move the current line (or the selected lines) in and out. */
  private onKey(e: KeyboardEvent) {
    const area = e.target as HTMLTextAreaElement;
    const { selectionStart: a, selectionEnd: b, value } = area;
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // A new line starts as far in as the one before it.
      const indent = /^[ \t]*/.exec(value.slice(value.lastIndexOf('\n', a - 1) + 1, a))![0];
      if (!indent) return;
      e.preventDefault();
      this.type(value.slice(0, a) + '\n' + indent + value.slice(b));
      this.updateComplete.then(() => area.setSelectionRange(a + 1 + indent.length, a + 1 + indent.length));
      return;
    }
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const from = value.lastIndexOf('\n', a - 1) + 1;
    const lines = value.slice(from, b).split('\n');
    const moved = lines.map((l) => (e.shiftKey ? l.replace(/^( {1,2}|\t)/, '') : '  ' + l));
    const text = value.slice(0, from) + moved.join('\n') + value.slice(b);
    const first = moved[0].length - lines[0].length;
    this.type(text);
    this.updateComplete.then(() => area.setSelectionRange(Math.max(from, a + first), b + text.length - value.length));
  }

  /** Open the picture in Draw, where its shapes can be moved about by hand. */
  private toDraw() {
    location.hash = '#/v2/' + makeRef('draw', toDrawing(this.spec.layout!(this.doc)));
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onModeKey);
    window.addEventListener('message', this.onPageMessage);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onModeKey);
    window.removeEventListener('message', this.onPageMessage);
  }
  /** Mod+Shift+T: the text itself, for whoever wants it. */
  private onModeKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't' && this.spec.form) {
      e.preventDefault();
      this.setMode(!this.asText);
    }
  };

  /* ---------- working the picture itself ---------- */

  /** The row of the form that shape i was drawn from: the row written as the shape's label, or whose first words are. */
  private rowOf(i: number, shapes: ReturnType<NonNullable<DiagramSpec['layout']>>['shapes']): number {
    const form = this.spec.form;
    if (!form) return -1;
    const rows = readLines(this.textOf(this.doc), form);
    const { made } = kindsOf(form);
    const label = shapes[i].text.trim();
    const head = label.split(' | ')[0].replace(/^:[a-z0-9-]+\s*/, '').trim().toLowerCase();
    const exact = rows.findIndex((r) => made[r.kind].write(r.values).trim() === label);
    if (exact >= 0) return exact;
    return rows.findIndex((r) => r.values.some((v, n) => fieldsOf(form, r.kind)[n].type !== 'icon' && v.trim().toLowerCase() === head));
  }

  private rows(): Row[] {
    return readLines(this.textOf(this.doc), this.spec.form!);
  }
  private putRows(rows: Row[], focus = -1) {
    this.type(writeLines(rows, this.spec.form!));
    if (focus >= 0) void this.updateComplete.then(() => this.querySelector<HTMLElement>(`to-lines [data-row="${focus}"] :is(input, textarea, select)`)?.focus());
  }

  /** A row like row i, after it (under it, for an outline): then the cursor is in it. */
  private addAfter(i: number) {
    const form = this.spec.form!;
    const rows = this.rows();
    const k = kindsOf(form).kinds[rows[i].kind];
    const at = k.indent ? blockEnd(rows, form, i) : i + 1;
    const depth = k.indent ? rows[i].depth + 1 : rows[i].depth;
    this.sel = -1;
    // The form keeps an empty row until there is something in it; the text alone would not.
    const lines = this.querySelector<ToLines>('to-lines');
    if (lines) lines.insert(rows[i].kind, at, depth);
    else {
      const row: Row = { kind: rows[i].kind, values: fieldsOf(form, rows[i].kind).map((f) => (f.type === 'choice' ? f.options[0] : '')), depth };
      this.putRows([...rows.slice(0, at), row, ...rows.slice(at)], at);
    }
  }

  /** A picture on the thing: the row's icon field, or ":name" before its first words. */
  private async iconFor(i: number) {
    const name = await chooseIcon();
    if (!name) return;
    const form = this.spec.form!;
    const rows = this.rows();
    const fields = fieldsOf(form, rows[i].kind);
    const slot = fields.findIndex((f) => f.type === 'icon');
    const words = fields.findIndex((f) => f.type !== 'icon' && f.type !== 'choice');
    const values = rows[i].values.map((v, n) => (n === slot ? name : slot < 0 && n === words ? `:${name} ${v.replace(/^:[a-z0-9-]+\s*/, '')}` : v));
    this.putRows(rows.map((r, n) => (n === i ? { ...r, values } : r)));
  }

  /** Little buttons under the picked shape: add one like it, give it a picture, go to its words, take it away. */
  private controls(d: ReturnType<NonNullable<DiagramSpec['layout']>>) {
    const i = this.sel;
    const s = d.shapes[i];
    if (!s || isLink(s.k)) return nothing;
    const row = this.rowOf(i, d.shapes);
    if (row < 0) return nothing;
    // A finger's width on screen, whatever the picture's scale.
    const el = this.querySelector<SVGSVGElement>('.pic > svg');
    const unit = el ? el.getBoundingClientRect().width / d.w : 1;
    const size = Math.max(22, Math.round(34 / unit));
    const acts: [string, string, () => void][] = [
      ['Add one under it', 'plus', () => this.addAfter(row)],
      ['Give it a picture', 'smile', () => this.iconFor(row)],
      ['Edit its words', 'pencil', () => this.editOver(this.querySelector(`.pic > svg g.pick[data-i="${i}"]`)!, row)],
      ['Take it away', 'x', () => (this.sel = -1, this.putRows(removeRow(this.rows(), this.spec.form!, row)))],
    ];
    const x0 = s.x + s.w / 2 - (acts.length * (size + 4) - 4) / 2;
    const y = s.y + s.h + 6;
    return svg`<g class="diagram-ctl" role="group" aria-label="Shape ${i + 1}">
      ${acts.map(([label, glyph, act], n) => svg`<g role="button" tabindex="0" aria-label=${label} transform="translate(${x0 + n * (size + 4)} ${y})" @click=${(e: Event) => (e.stopPropagation(), act())} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act())}>
        <title>${label}</title>
        <rect width=${size} height=${size} rx=${size / 4}/>
        <g transform="translate(${size * 0.18} ${size * 0.18}) scale(${(size * 0.64) / 24})" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${unsafeSVG(ICON_SVG[glyph] ?? '')}</g>
      </g>`)}
    </g>`;
  }

  render() {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    const d = spec.layout?.(this.doc);
    const name = appOf((this.constructor as typeof DiagramElement).app)!.name;
    const inside = !!this.closest('sl-dialog');
    const form = !!spec.form && !this.asText;
    if (spec.page && !this.faces) void fontsForPictures().then((faces) => (this.faces = faces || ' '));
    return html`
      <div class="to-toolbar">
        <span class="to-hint diagram-hint">${form ? 'Add a row for each thing, and fill it in.' : spec.hint}</span>
        <span class="to-spacer"></span>
        ${text.trim() ? nothing : tool('Start from an example', 'sparkles', () => this.type(spec.example), { text: true })}
        ${spec.form && this.asText ? tool('Edit as a form', 'form', () => this.setMode(false), { text: true }) : nothing}
        ${form ? nothing : d || spec.sheets ? tool('Icon', 'smile', () => this.addIcon(), { text: true }) : nothing}
        ${inside || !d?.shapes.length ? nothing : tool('Open in Draw', 'draw', () => this.toDraw(), { text: true })}
      </div>
      ${this.extra()}
      <div class="diagram ${spec.page ? 'page' : spec.sheets ? 'print' : ''}">
${form
          ? html`<to-lines class="lf" .text=${text} .kinds=${spec.form!} name=${name} @lines-change=${(e: CustomEvent<string>) => this.type(e.detail)}></to-lines>`
          : html`        <textarea aria-label="${name}, as text" spellcheck=${spec.page || spec.sheets ? 'true' : 'false'} autocapitalize="off" placeholder=${spec.example} .value=${text} @input=${(e: Event) => this.type((e.target as HTMLTextAreaElement).value)} @keydown=${this.onKey}></textarea>`}
        <div class="pic" @click=${(e: Event) => spec.sheets && form && this.onSheetClick(e)}>
          ${this.renderEditBox()}
          ${spec.page
            ? // The page as it will be, in a frame of its own: its scripts run, but it cannot reach this one.
              html`<iframe title="${name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${(this.lastSrc = this.held ?? (form ? this.editablePage() : this.pageHtml()))} class=${text.trim() ? '' : 'sample'}></iframe>`
            : spec.sheets
              ? (text.trim() ? spec.sheets(this.doc) : spec.sheets(spec.example)).map((p, i) => html`<div class="sheet ${text.trim() ? '' : 'sample'}">${unsafeSVG(pageSvg(p, `role="img" aria-label="${name}, sheet ${i + 1}"`))}</div>`)
            : d!.shapes.length
              ? html`<svg viewBox="0 0 ${d!.w} ${d!.h}" role=${spec.form ? 'group' : 'img'} aria-label=${name} style="max-width:${d!.w * 1.4}px" @click=${() => (this.sel = -1)}>
                  <defs>${unsafeSVG(arrowDefs())}</defs>
                  ${d!.shapes.map((s, i) =>
                    isLink(s.k) || !spec.form
                      ? svg`<g>${unsafeSVG(shapeSvg(s, d!.shapes))}</g>`
                      : svg`<g class="pick ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="${s.text.replace(/^:[a-z0-9-]+\s*/, '') || 'Shape'}: tap for its buttons, twice to type" aria-pressed=${this.sel === i ? 'true' : 'false'} @dblclick=${(e: Event) => (e.stopPropagation(), this.editOver(e.currentTarget as Element, this.rowOf(i, d!.shapes)))} @click=${(e: Event) => (e.stopPropagation(), (this.sel = this.sel === i ? -1 : i), this.requestUpdate())} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), (this.sel = this.sel === i ? -1 : i))}>${unsafeSVG(shapeSvg(s, d!.shapes))}</g>`,
                  )}
                  ${this.controls(d!)}
                </svg>`
              : html`<p class="to-empty">Write on the left and it is drawn here.</p>`}
          ${spec.aside ? html`<div class="diagram-aside">${unsafeHTML(spec.aside(this.doc))}</div>` : nothing}
        </div>
      </div>
    `;
  }
}

/** Register the editor for one diagram app. */
export function defineDiagramEditor(id: string) {
  defineElement(id, class extends DiagramElement {
    static app = id;
  });
}
