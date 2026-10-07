/**
 * The editor every diagram app shares: an outline (a form, or the text
 * itself) on one side, its picture on the other. What the outline means is
 * the app's own layout (see lib/diagram.ts); this edits the text and shows
 * what comes of it. The picture is one of three views, each a file of its
 * own: shapes (diagram-shapes.ts), printed sheets (diagram-sheets.ts) or a
 * web page in a frame (diagram-page.ts).
 */
import { DocElement, html, nothing, tool, appOf, makeRef, type TemplateResult } from '../kit.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { ToLines } from '../widgets/line-form.ts';
import { state } from '../kit.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { specOf, toDrawing, type DiagramSpec } from '../lib/diagram.ts';
import { store } from '../lib/store.ts';
import { blockEnd, fieldsOf, kindsOf, readLines, writeLines, type Row } from '../lib/lines.ts';

export class DiagramElement extends DocElement<string> {
  /** Which diagram app this is; set by defineDiagramEditor. */
  static app = '';

  protected parse(text: string) {
    return text;
  }
  protected serialize(text: string) {
    return text;
  }

  /* ---------- typing on the picture ---------- */

  /** A box over the picture, where a label or a line of a sheet is typed: the row and field it writes, and where it sits. */
  @state() protected editing: { row: number; field: number; x: number; y: number; w: number; h: number } | null = null;

  /** Open the box over an element of the picture, for a row's field. */
  protected editOver(el: Element, row: number, field = -1) {
    const form = this.spec.form;
    if (!form) return;
    const rows = this.drafted();
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
    this.unpick();
    void this.updateComplete.then(() => {
      const box = this.querySelector<HTMLInputElement>('.pic-edit input');
      box?.focus();
      box?.select();
    });
  }

  /** The box over the picture: every word field of the row (a name and a role, say), the one tapped first; Tab moves between them. */
  private renderEditBox() {
    const e = this.editing;
    if (!e || !this.spec.form) return nothing;
    const rows = this.drafted();
    const row = rows[e.row];
    if (!row) return nothing;
    const fields = fieldsOf(this.spec.form, row.kind).map((f, n) => ({ ...f, n })).filter((f) => f.type !== 'icon' && f.type !== 'choice' && (f.type !== 'pick' || f.n === e.field));
    const first = fields.findIndex((f) => f.n === e.field);
    const ordered = first > 0 ? [...fields.slice(first), ...fields.slice(0, first)] : fields;
    const box = this.querySelector<HTMLElement>('.pic-edit');
    const close = () => {
      // A draft nothing was typed into goes; one with words is already in the text.
      this.editing = null;
      this.draft = null;
    };
    const done = (ev: FocusEvent) => {
      // Leaving the box altogether, not moving to its next field.
      if (ev.relatedTarget && box?.contains(ev.relatedTarget as Node)) return;
      close();
    };
    const write = (f: number, value: string) => {
      const next = this.drafted().map((r, n) => (n === e.row ? { ...r, values: r.values.map((v, m) => (m === f ? value : v)) } : r));
      if (this.draft) {
        // The first keystroke makes the draft real.
        if (!value) return;
        this.draft = null;
      }
      this.putRows(next);
    };
    return html`<div class="pic-edit ${ordered.length > 1 ? 'many' : ''}" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;min-height:${e.h}px">
      ${ordered.map(
        (f) => html`<input
          aria-label="${f.name}, row ${e.row + 1}"
          placeholder=${f.name}
          .value=${row.values[f.n] ?? ''}
          @input=${(ev: Event) => write(f.n, (ev.target as HTMLInputElement).value)}
          @keydown=${(ev: KeyboardEvent) => (ev.key === 'Enter' || ev.key === 'Escape') && (ev.preventDefault(), close())}
          @blur=${done}
        />`,
      )}
    </div>`;
  }

  /**
   * The picture is the editor. Beside it, when wanted, the same document as
   * a list to fill in, or as the text itself: the choice is remembered.
   */
  @state() protected mode: 'picture' | 'form' | 'text' = ((): 'picture' | 'form' | 'text' => {
    const m = store.get('tinyoffice.edit');
    return m === 'text' || m === 'form' ? m : 'picture';
  })();
  protected get asText() {
    return this.mode === 'text';
  }
  private setMode(mode: 'picture' | 'form' | 'text') {
    this.mode = mode;
    if (mode === 'picture') store.remove('tinyoffice.edit');
    else store.set('tinyoffice.edit', mode);
  }

  protected get spec(): DiagramSpec {
    return specOf((this.constructor as typeof DiagramElement).app)!;
  }
  protected get name(): string {
    return appOf((this.constructor as typeof DiagramElement).app)!.name;
  }
  /** Whether the document is worked through its form (the picture and the list), rather than its text. */
  protected get form(): boolean {
    return !!this.spec.form && this.mode !== 'text';
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
  protected type(text: string) {
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
      this.setMode(this.mode === 'text' ? 'picture' : 'text');
    }
  };


  /* ---------- the rows of the form, from the picture ---------- */

  /**
   * A thing being added: it shows in the picture (with its kind's name for
   * words) and has the box open, but is not in the text until something is
   * typed. Abandoned, it goes without a trace.
   */
  @state() protected draft: { at: number; row: Row; field: number } | null = null;

  /** The rows as written. */
  protected rows(): Row[] {
    return readLines(this.textOf(this.doc), this.spec.form!);
  }
  /** The rows with the draft among them: what the picture and the box work on. */
  protected drafted(): Row[] {
    const rows = this.rows();
    if (!this.draft) return rows;
    return [...rows.slice(0, this.draft.at), this.draft.row, ...rows.slice(this.draft.at)];
  }
  /** The document as the picture should draw it: with the draft's placeholder words in place. */
  protected drawnText(): string {
    if (!this.draft || !this.spec.form) return this.textOf(this.doc);
    const d = this.draft;
    const shown = { ...d.row, values: d.row.values.map((v, n) => (n === d.field && !v ? kindsOf(this.spec.form!).kinds[d.row.kind].name : v)) };
    return writeLines([...this.rows().slice(0, d.at), shown, ...this.rows().slice(d.at)], this.spec.form);
  }
  /**
   * The field a kind's words go in: the first that is text, unless the
   * pattern opens "{Key}: {Words}" (a lane and its step, a date and its
   * event), when it is the second. A pick field will do when that is all.
   */
  protected wordsField(kind: number): number {
    const form = this.spec.form!;
    const fields = fieldsOf(form, kind);
    const plain = fields.map((f, n) => (f.type !== 'icon' && f.type !== 'choice' && f.type !== 'pick' ? n : -1)).filter((n) => n >= 0);
    const keyed = /^\s*(?:\[:\{[^}]*\}\s*\])?\{[^}]*\}:\s/.test(kindsOf(form).kinds[kind].is);
    if (plain.length >= 2 && keyed) return plain[1];
    return plain[0] ?? fields.findIndex((f) => f.type === 'pick');
  }
  /** Start a draft of `kind` at `at`, with any values given, and open the box on its words once drawn. */
  protected startDraft(kind: number, at: number, depth: number, values?: string[], field = this.wordsField(kind)) {
    const form = this.spec.form!;
    const fields = fieldsOf(form, kind);
    this.unpick();
    this.editing = null;
    this.draft = { at, row: { kind, values: values ?? fields.map((f) => (f.type === 'choice' ? f.options[0] : '')), depth }, field };
    void this.updateComplete.then(() => {
      const el = this.draftElement();
      if (el) this.editOver(el, at, field);
      else this.draft = null;
    });
  }
  /** Where the draft is drawn: the shape or sheet line showing the kind's name. */
  protected draftElement(): Element | null {
    return null;
  }
  protected putRows(rows: Row[], focus = -1) {
    this.type(writeLines(rows, this.spec.form!));
    if (focus >= 0) void this.updateComplete.then(() => this.querySelector<HTMLElement>(`to-lines [data-row="${focus}"] :is(input, textarea, select)`)?.focus());
  }

  /** A row like row i, after it (under it, for an outline): then the cursor is in it. */
  protected addAfter(i: number) {
    const form = this.spec.form!;
    const rows = this.rows();
    const k = kindsOf(form).kinds[rows[i].kind];
    const at = k.indent ? blockEnd(rows, form, i) : i + 1;
    const depth = k.indent ? rows[i].depth + 1 : rows[i].depth;
    this.unpick();
    // The form keeps an empty row until there is something in it; the picture shows a draft until something is typed.
    const lines = this.querySelector<ToLines>('to-lines');
    if (lines) return lines.insert(rows[i].kind, at, depth);
    // Like the one it came from: its key (the same lane, the same date), its size and place beside it; the rest to type.
    const words = this.wordsField(rows[i].kind);
    const fields = fieldsOf(form, rows[i].kind);
    const m = this.spec.moves;
    const keep = (n: number) => n < words || fields[n].type === 'choice' || (m?.kind === rows[i].kind && n !== words);
    const values = rows[i].values.map((v, n) => (keep(n) && fields[n].type !== 'icon' ? v : ''));
    if (m && m.kind === rows[i].kind && values[m.x] !== '') values[m.x] = String(+values[m.x] + (+values[1] || 3));
    this.startDraft(rows[i].kind, at, depth, values);
  }

  /** A picture on the thing: the row's icon field, or ":name" before its first words. */
  protected async iconFor(i: number) {
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


  /* ---------- the picture: one of three views ---------- */

  /** Let go of whatever the view has picked. */
  protected unpick() {}

  /** The picture of the document, drawn by the view. */
  protected picture(): TemplateResult {
    return html`<p class="to-empty">Write on the left and it is drawn here.</p>`;
  }
  /** A tap on the picture's surround, for the view to make of what it will. */
  protected onPicClick(_e: Event) {}
  /** The class of the picture's box: 'page' or 'print', else ''. */
  protected get kind(): string {
    return '';
  }
  /** Whether "Open in Draw" makes sense: a picture of shapes, with some in it. */
  protected drawable(): boolean {
    return false;
  }

  render() {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    const name = this.name;
    const inside = !!this.closest('sl-dialog');
    const form = this.form;
    return html`
      <div class="to-toolbar">
        <span class="to-hint diagram-hint">${form ? (this.mode === 'form' ? 'Add a row for each thing, and fill it in.' : this.kind === 'page' ? 'Type into the page; the bar along the bottom adds to it.' : this.kind === 'print' ? 'Tap words on the sheet to change them.' : 'Tap empty space to add a thing; tap a thing for its buttons, twice to type on it; drag it where it goes.') : spec.hint}</span>
        <span class="to-spacer"></span>
        ${text.trim() ? nothing : tool('Start from an example', 'sparkles', () => this.type(spec.example), { text: true })}
        ${spec.form && this.mode === 'text' ? tool('Edit as a form', 'form', () => this.setMode('form'), { text: true }) : nothing}
        ${spec.form && this.mode !== 'text' ? tool(this.mode === 'form' ? 'Hide the list' : 'List', 'form', () => this.setMode(this.mode === 'form' ? 'picture' : 'form'), { text: true, pressed: this.mode === 'form' }) : nothing}
        ${form || this.kind === 'page' ? nothing : tool('Icon', 'smile', () => this.addIcon(), { text: true })}
        ${inside || !this.drawable() ? nothing : tool('Open in Draw', 'draw', () => this.toDraw(), { text: true })}
      </div>
      ${this.extra()}
      <div class="diagram ${this.kind} ${form && this.mode === 'picture' ? 'alone' : ''}">
${form
          ? this.mode === 'form'
            ? html`<to-lines class="lf" .text=${text} .kinds=${spec.form!} name=${name} @lines-change=${(e: CustomEvent<string>) => this.type(e.detail)}></to-lines>`
            : nothing
          : html`        <textarea aria-label="${name}, as text" spellcheck=${this.kind ? 'true' : 'false'} autocapitalize="off" placeholder=${spec.example} .value=${text} @input=${(e: Event) => this.type((e.target as HTMLTextAreaElement).value)} @keydown=${this.onKey}></textarea>`}
        <div class="pic" @click=${(e: Event) => this.onPicClick(e)}>
          ${this.renderEditBox()}
          ${this.picture()}
          ${spec.aside ? html`<div class="diagram-aside">${unsafeHTML(spec.aside(this.doc))}</div>` : nothing}
        </div>
      </div>
    `;
  }
}

