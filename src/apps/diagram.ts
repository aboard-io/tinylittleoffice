/**
 * The editor every diagram app shares: an outline on one side, its picture
 * on the other. What the outline means is the app's own layout (see
 * lib/diagram.ts); this only edits text and shows what comes of it.
 */
import { DocElement, defineElement, html, nothing, unsafeSVG, tool, appOf, makeRef, pageSvg, type TemplateResult } from '../kit.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { specOf, toDrawing, type DiagramSpec } from '../lib/diagram.ts';
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

  render() {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    const d = spec.layout?.(this.doc);
    const name = appOf((this.constructor as typeof DiagramElement).app)!.name;
    const inside = !!this.closest('sl-dialog');
    return html`
      <div class="to-toolbar">
        <span class="to-hint diagram-hint">${spec.hint}</span>
        <span class="to-spacer"></span>
        ${text.trim() ? nothing : tool('Start from an example', 'sparkles', () => this.type(spec.example), { text: true })}
        ${d || spec.sheets ? tool('Icon', 'smile', () => this.addIcon(), { text: true }) : nothing}
        ${inside || !d?.shapes.length ? nothing : tool('Open in Draw', 'draw', () => this.toDraw(), { text: true })}
      </div>
      ${this.extra()}
      <div class="diagram ${spec.page ? 'page' : spec.sheets ? 'print' : ''}">
        <textarea aria-label="${name}, as text" spellcheck=${spec.page || spec.sheets ? 'true' : 'false'} autocapitalize="off" placeholder=${spec.example} .value=${text} @input=${(e: Event) => this.type((e.target as HTMLTextAreaElement).value)} @keydown=${this.onKey}></textarea>
        <div class="pic">
          ${spec.page
            ? // The page as it will be, in a frame of its own: its scripts run, but it cannot reach this one.
              html`<iframe title="${name}, as a page" sandbox="allow-scripts allow-popups allow-forms" srcdoc=${text.trim() ? spec.page(this.doc) : spec.page(spec.example)} class=${text.trim() ? '' : 'sample'}></iframe>`
            : spec.sheets
              ? (text.trim() ? spec.sheets(this.doc) : spec.sheets(spec.example)).map((p, i) => html`<div class="sheet ${text.trim() ? '' : 'sample'}">${unsafeSVG(pageSvg(p, `role="img" aria-label="${name}, sheet ${i + 1}"`))}</div>`)
            : d!.shapes.length
              ? html`<svg viewBox="0 0 ${d!.w} ${d!.h}" role="img" aria-label=${name} style="max-width:${d!.w * 1.4}px"><defs>${unsafeSVG(arrowDefs())}</defs>${unsafeSVG(d!.shapes.map((s) => shapeSvg(s, d!.shapes)).join(''))}</svg>`
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
