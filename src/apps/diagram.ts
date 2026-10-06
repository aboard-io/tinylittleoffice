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
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onModeKey);
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
      ['Edit its words', 'pencil', () => this.putRows(this.rows(), row)],
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
        <div class="pic">
          ${spec.page
            ? // The page as it will be, in a frame of its own: its scripts run, but it cannot reach this one.
              html`<iframe title="${name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${(text.trim() ? spec.page(this.doc) : spec.page(spec.example)).replace('<head>', `<head><style>${this.faces}</style>`)} class=${text.trim() ? '' : 'sample'}></iframe>`
            : spec.sheets
              ? (text.trim() ? spec.sheets(this.doc) : spec.sheets(spec.example)).map((p, i) => html`<div class="sheet ${text.trim() ? '' : 'sample'}">${unsafeSVG(pageSvg(p, `role="img" aria-label="${name}, sheet ${i + 1}"`))}</div>`)
            : d!.shapes.length
              ? html`<svg viewBox="0 0 ${d!.w} ${d!.h}" role=${spec.form ? 'group' : 'img'} aria-label=${name} style="max-width:${d!.w * 1.4}px" @click=${() => (this.sel = -1)}>
                  <defs>${unsafeSVG(arrowDefs())}</defs>
                  ${d!.shapes.map((s, i) =>
                    isLink(s.k) || !spec.form
                      ? svg`<g>${unsafeSVG(shapeSvg(s, d!.shapes))}</g>`
                      : svg`<g class="pick ${this.sel === i ? 'on' : ''}" role="button" tabindex="0" aria-label="${s.text.replace(/^:[a-z0-9-]+\s*/, '') || 'Shape'}: tap for its buttons" aria-pressed=${this.sel === i ? 'true' : 'false'} @click=${(e: Event) => (e.stopPropagation(), (this.sel = this.sel === i ? -1 : i), this.requestUpdate())} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), (this.sel = this.sel === i ? -1 : i))}>${unsafeSVG(shapeSvg(s, d!.shapes))}</g>`,
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
