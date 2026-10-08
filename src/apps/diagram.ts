/**
 * The editor every diagram app shares: the picture, worked directly, and
 * beside it when wanted the same document as the text itself (or, for an
 * app that is rows at heart, as a list to fill in). What the picture means
 * is the app's own layout (see lib/diagram.ts); this edits the text and
 * shows what comes of it. The picture is one of three views, each a file
 * of its own: shapes (diagram-shapes.ts), printed sheets
 * (diagram-sheets.ts) or a web page in a frame (diagram-page.ts).
 */
import { DocElement, html, nothing, state, tool, btn, toast, appOf, hashOf, type TemplateResult } from '../kit.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import '../widgets/line-form.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { specOf, toDrawing, type DiagramSpec } from '../lib/diagram.ts';
import { store } from '../lib/store.ts';
import { blockEnd, fieldsOf, joinItems, kindsOf, listItems, moveItem, readLines, removeRow, writeLines, type Row } from '../lib/lines.ts';

/** A pattern that opens "{Key}: {Words}" (as a list item, "- {Key}: {Words}"): a lane and its step, a date and its event, a table and its people. */
const KEYED = /^\s*(?:- )?(?:\[:\{[^}]*\}\s*\])?\{[^}]*\}:\s\{[^}]*\}(?:\s*\[[^\]]*\])*\s*$/;
/** A pattern with something before a colon and its words after: what is before is the line's key ("Sales", "Fast & Cheap"). */
const HAS_KEY = /^[^:[\]]*\}:\s\{/;
/** The fields that name another thing on the picture: the two ends of a line, the sets something is shared by. */
const NAMES = /^(from|to|one set|other sets)$/i;
/** A name as it is compared: without its picture, its case or its edges. */
export const clean = (v: string) => v.replace(/^:[a-z0-9-]+\s*/, '').trim().toLowerCase();

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

  /**
   * A box over the picture, where a label or a line of a sheet is typed: the
   * row and field it writes (and which thing of a list field, when one of
   * those was tapped), and where it sits.
   */
  @state() protected editing: { row: number; field: number; item?: number; x: number; y: number; w: number; h: number } | null = null;

  /** When a box last closed: the tap that closed it must not also add something. */
  protected closedAt = -Infinity;
  protected get justClosed() {
    return performance.now() - this.closedAt < 400;
  }

  /** Open the box over an element of the picture, for a row's field (or one thing of its list). */
  protected editOver(el: Element, row: number, field = -1, item?: number) {
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
    this.editing = { row, field: f, item, x: b.left - p.left + pic.scrollLeft + (b.width - w) / 2, y: b.top - p.top + pic.scrollTop + (b.height - h) / 2, w, h };
    void this.updateComplete.then(() => {
      const box = this.querySelector<HTMLInputElement>('.pic-edit input');
      box?.focus();
      box?.select();
    });
  }

  /**
   * The box over the picture: every word field of the row (a name and a
   * role, say), the one tapped first, Tab moving between them. For one
   * thing of a list (a person at a table), or a thing named only by the
   * lines to it (a node of a network), the box is that one name.
   */
  private renderEditBox() {
    const e = this.editing;
    if (!e || !this.spec.form) return nothing;
    const form = this.spec.form;
    const rows = this.drafted();
    const row = rows[e.row];
    if (!row) return nothing;
    const all = fieldsOf(form, row.kind).map((f, n) => ({ ...f, n }));
    const refs = this.refFields(row.kind);
    const link = refs.length >= 2;
    // One name (a thing of a list, or a thing named by a line's end); else the row's words, minus the ends of a line.
    const naming = e.item !== undefined || refs.includes(e.field);
    const fields = naming ? [all[e.field]] : all.filter((f) => f.type !== 'icon' && f.type !== 'choice' && (link ? !refs.includes(f.n) : f.type !== 'pick' || f.n === e.field));
    const first = fields.findIndex((f) => f.n === e.field);
    const ordered = first > 0 ? [...fields.slice(first), ...fields.slice(0, first)] : fields;
    const value = (f: number) => (e.item !== undefined ? (listItems(row.values[f])[e.item] ?? '') : (row.values[f] ?? ''));
    const box = this.querySelector<HTMLElement>('.pic-edit');
    const close = () => {
      // A draft nothing was typed into goes; one with words is already in the text.
      const [at, f, item] = [e.row, e.field, e.item];
      const wasDraft = !!this.draft;
      this.editing = null;
      this.draft = null;
      this.closedAt = performance.now();
      this.unpick();
      // A list is left tidy: a thing emptied out is gone from it.
      const r = this.rows()[at];
      if (!wasDraft && item !== undefined && r && listItems(r.values[f]).some((v) => !v)) this.putRows(this.rows().map((q, n) => (n === at ? { ...q, values: q.values.map((v, m) => (m === f ? joinItems(listItems(v).filter(Boolean)) : v)) } : q)));
    };
    const done = (ev: FocusEvent) => {
      // Leaving the box altogether, not moving to its next field; and only this box, not one that has already given way to the next.
      if (ev.relatedTarget && box?.contains(ev.relatedTarget as Node)) return;
      if (this.editing !== e) return;
      close();
    };
    const write = (f: number, typed: string) => {
      const was = this.drafted()[e.row];
      const old = value(f);
      const set = (v: string) => (e.item !== undefined ? joinItems(listItems(v).map((x, k) => (k === e.item ? typed : x))) : typed);
      let next = this.drafted().map((r, n) => (n === e.row ? { ...r, values: r.values.map((v, m) => (m === f ? set(v) : v)) } : r));
      if (this.draft) {
        // The first keystroke makes the draft real.
        if (!typed) return;
        this.draft = null;
      } else if (old.trim() && e.item === undefined && was.kind < form.length && all[f].type !== 'list') {
        // A thing's name changes wherever it is named: the lines to it, the sets it is shared by, the lane its steps are in.
        next = this.renamed(next, e.row, f, old, typed);
      }
      this.putRows(next);
    };
    // Enter closes and starts the next one under (or after) this; Backspace on empty words takes it away.
    const next = () => {
      const [at, f, item] = [e.row, e.field, e.item];
      if (this.draft) return close();
      if (link && item === undefined) {
        // On a thing named only by its lines (a node of a network), Enter starts a line from it: "API > ", the far end to type.
        if (!refs.includes(f)) return close();
        const name = (this.rows()[at]?.values[f] ?? '').trim();
        if (!name) return close();
        const values = row.values.map((_, n) => (n === refs[0] ? name : ''));
        this.editing = null;
        this.closedAt = performance.now();
        return this.startDraft(row.kind, at + 1, row.depth, values, refs[1]);
      }
      // The box gives way to the next one's; what was picked stays picked until the new draft has read it.
      this.editing = null;
      this.closedAt = performance.now();
      if (!this.rows()[at]) return this.unpick();
      if (item !== undefined) this.addItem(at, f, item + 1);
      else this.addAfter(at, f);
    };
    const gone = () => {
      const [at, f, item] = [e.row, e.field, e.item];
      close();
      if (this.rows()[at]) this.removeThing(at, f, item);
    };
    const empty = ordered.every((f) => !value(f.n).trim());
    const name = kindsOf(form).kinds[row.kind].name.toLowerCase();
    return html`<div class="pic-edit ${ordered.length > 1 ? 'many' : ''}" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;min-height:${e.h}px">
      ${ordered.map(
        (f) => html`<input
          aria-label="${f.name}, row ${e.row + 1}"
          placeholder=${f.name}
          .value=${value(f.n)}
          @input=${(ev: Event) => write(f.n, (ev.target as HTMLInputElement).value)}
          @keydown=${(ev: KeyboardEvent) => (ev.key === 'Enter' ? (ev.preventDefault(), next()) : ev.key === 'Escape' ? (ev.preventDefault(), close()) : ev.key === 'Backspace' && empty && !this.draft ? (ev.preventDefault(), gone()) : null)}
          @blur=${done}
        />`,
      )}
      ${this.draft
        ? nothing
        : html`<div class="pic-edit-acts" role="group" aria-label="This thing">
            ${link && e.item === undefined ? nothing : btn(e.item !== undefined ? 'Add one after it' : naming ? 'Add one joined to it' : 'Add one under it', 'plus', next, { keepFocus: true, size: 13, tip: `${e.item !== undefined ? 'Add one after it' : naming ? 'Add one joined to it' : 'Add one under it'} (Enter)` })}
            ${this.linkKind() < 0 || link || e.item !== undefined ? nothing : btn('Join it to another thing', 'join', () => { const [at, f] = [e.row, e.field]; const from = clean(this.rows()[at]?.values[f] ?? ''); close(); if (from) this.joining = { from }; }, { keepFocus: true, size: 13 })}
            ${link && e.item === undefined ? nothing : btn('Give it a picture', 'smile', () => { const [at, f, item] = [e.row, e.field, e.item]; close(); void this.iconFor(at, f, item); }, { keepFocus: true, size: 13 })}
            ${btn(link && e.item === undefined ? `Take the ${name} away` : 'Take it away', 'trash', gone, { keepFocus: true, size: 13 })}
          </div>`}
    </div>`;
  }

  /**
   * The picture is the editor. Beside it, when wanted, the same document as
   * the text itself; an app that is rows at heart offers a list to fill in
   * too. The choice is remembered.
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
  /** Whether the document can be shown as a list to fill in: a page or a sheet, not a picture of shapes. */
  protected get lists(): boolean {
    return true;
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
    location.hash = hashOf('draw', toDrawing(this.spec.layout!(this.doc)));
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onModeKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onModeKey);
  }
  /** Mod+Shift+T: the text itself, for whoever wants it. Escape gives up a join half made. */
  private onModeKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't' && this.spec.form) {
      e.preventDefault();
      this.setMode(this.mode === 'text' ? 'picture' : 'text');
    } else if (e.key === 'Escape' && this.joining) this.joining = null;
  };

  /* ---------- the rows of the form, from the picture ---------- */

  /**
   * A thing being added: it shows in the picture (with its field's name
   * for words) and has the box open, but is not in the text until something
   * is typed. Abandoned, it goes without a trace. With `item`, the draft is
   * a thing added to row `at`'s list (a person at a table), and the row
   * stands in for the one written.
   */
  @state() protected draft: { at: number; row: Row; field: number; item?: number } | null = null;

  /** A line being made from one thing to another: the first is chosen, the next tap on a thing is the other end. */
  @state() protected joining: { from: string } | null = null;

  /** The rows as written. */
  protected rows(): Row[] {
    return readLines(this.textOf(this.doc), this.spec.form!);
  }
  /** The rows with the draft among them: what the picture and the box work on. */
  protected drafted(): Row[] {
    const rows = this.rows();
    const d = this.draft;
    if (!d) return rows;
    if (d.item !== undefined) return rows.map((r, n) => (n === d.at ? d.row : r));
    return [...rows.slice(0, d.at), d.row, ...rows.slice(d.at)];
  }
  /** The document as the picture should draw it: with the draft's placeholder words in place, so there is something to draw and to tap. */
  protected drawnText(): string {
    const form = this.spec.form;
    const d = this.draft;
    if (!d || !form) return this.textOf(this.doc);
    const fields = fieldsOf(form, d.row.kind);
    // Every field the line cannot be read without shows its name; the thing being added shows its field's name.
    const shown = {
      ...d.row,
      values: d.row.values.map((v, n) => {
        if (d.item !== undefined && n === d.field) return joinItems(listItems(v).map((x, k) => (k === d.item && !x ? fields[n].name : x)));
        return !v && !fields[n].optional && fields[n].type !== 'icon' && fields[n].type !== 'choice' ? fields[n].name : v;
      }),
    };
    const rows = this.rows();
    return writeLines(d.item !== undefined ? rows.map((r, n) => (n === d.at ? shown : r)) : [...rows.slice(0, d.at), shown, ...rows.slice(d.at)], form);
  }
  /** The words the draft shows for the thing being added: what to look for on the picture. */
  protected draftWords(): string {
    const d = this.draft;
    return d ? fieldsOf(this.spec.form!, d.row.kind)[d.field].name : '';
  }

  /** The fields of a kind that name other things: the ends of a line, the sets a thing is shared by. */
  protected refFields(kind: number): number[] {
    return fieldsOf(this.spec.form!, kind).map((f, n) => (f.type === 'pick' || NAMES.test(f.name) ? n : -1)).filter((n) => n >= 0);
  }
  /** The field of a kind that holds things with commas between, if any. */
  protected listField(kind: number): number {
    return fieldsOf(this.spec.form!, kind).findIndex((f) => f.type === 'list');
  }
  /** The field a keyed kind ("{Who}: {What}") is keyed by, else -1. */
  protected keyField(kind: number): number {
    const fields = fieldsOf(this.spec.form!, kind);
    return KEYED.test(kindsOf(this.spec.form!).kinds[kind].is) ? fields.findIndex((f) => f.type !== 'icon' && f.type !== 'choice') : -1;
  }
  /** What a row is keyed by, as written before its colon ("Sales", "Fast & Cheap"); '' for a kind with no key. */
  protected keyOf(row: Row): string {
    const { kinds, made } = kindsOf(this.spec.form!);
    if (row.kind >= this.spec.form!.length || !HAS_KEY.test(kinds[row.kind].is)) return '';
    return made[row.kind].write(row.values).split(/:(.*)/)[0].replace(/^\s*- /, '').trim();
  }
  /** The row a line keyed `key` would be ("Fast & Cheap: "), as the form reads it; null when no kind of the form is keyed so. */
  protected keyRow(key: string): Row | null {
    const form = this.spec.form!;
    for (const line of [`- ${key}: x`, `${key}: x`]) {
      const read = readLines(line, form)[0];
      if (read && read.kind < form.length) return read;
    }
    return null;
  }
  /** The kind that is a line between two things, if the app has one: the first with two naming fields. */
  protected linkKind(): number {
    const form = this.spec.form!;
    return form.findIndex((_, n) => this.refFields(n).length >= 2);
  }
  /**
   * The field a kind's words go in: its list, if it has one (the people at
   * a table); else the words after its key ("{Who}: {What}"); else the
   * first field that is text. A pick field will do when that is all.
   */
  protected wordsField(kind: number): number {
    const form = this.spec.form!;
    const fields = fieldsOf(form, kind);
    const list = this.listField(kind);
    if (list >= 0) return list;
    const plain = fields.map((f, n) => (f.type !== 'icon' && f.type !== 'choice' && f.type !== 'pick' ? n : -1)).filter((n) => n >= 0);
    if (plain.length >= 2 && this.keyField(kind) >= 0) return plain[1];
    return plain[0] ?? fields.findIndex((f) => f.type === 'pick');
  }
  /** Start a draft of `kind` at `at`, with any values given, and open the box on its words once drawn. */
  protected startDraft(kind: number, at: number, depth: number, values?: string[], field = this.wordsField(kind)) {
    const form = this.spec.form!;
    const fields = fieldsOf(form, kind);
    this.unpick();
    this.editing = null;
    this.draft = { at, row: { kind, values: values ?? fields.map((f) => (f.type === 'choice' ? f.options[0] : '')), depth }, field };
    this.drawDraft(at, field);
  }
  /** Start a draft thing in row `at`'s list field, before its `item`th thing: it shows there, named for its field, until typed into. */
  protected addItem(at: number, field: number, item: number) {
    const row = this.rows()[at];
    if (!row) return;
    const items = listItems(row.values[field]);
    item = Math.min(item, items.length);
    items.splice(item, 0, '');
    this.unpick();
    this.editing = null;
    this.draft = { at, row: { ...row, values: row.values.map((v, n) => (n === field ? joinItems(items) : v)) }, field, item };
    this.drawDraft(at, field, item);
  }
  /** Once the draft is drawn, the box opens on it; a draft the picture has no room for goes, and says so. */
  private drawDraft(at: number, field: number, item?: number) {
    void this.updateComplete.then(() => {
      const el = this.draftElement();
      if (el) this.editOver(el, at, field, item);
      else if (this.draft) {
        toast(this, `There is no room on the picture for another ${kindsOf(this.spec.form!).kinds[this.draft.row.kind].name.toLowerCase()}`);
        this.draft = null;
      }
    });
  }
  /** Where the draft is drawn: the shape or sheet line showing its words. */
  protected draftElement(): Element | null {
    return null;
  }
  protected putRows(rows: Row[], focus = -1) {
    this.type(writeLines(rows, this.spec.form!));
    if (focus >= 0) void this.updateComplete.then(() => this.querySelector<HTMLElement>(`to-lines [data-row="${focus}"] :is(input, textarea, select)`)?.focus());
  }

  /** A row like row i, after it (under it, for an outline; a thing more in its list, for a row that has one): then the cursor is in it. */
  protected addAfter(i: number, _field = -1) {
    const form = this.spec.form!;
    const rows = this.rows();
    const k = kindsOf(form).kinds[rows[i].kind];
    const list = this.listField(rows[i].kind);
    if (list >= 0) return this.addItem(i, list, listItems(rows[i].values[list]).length);
    const at = k.indent ? blockEnd(rows, form, i) : i + 1;
    const depth = k.indent ? rows[i].depth + 1 : rows[i].depth;
    this.unpick();
    // A draft on the picture until something is typed (the list beside, if showing, follows).
    // Like the one it came from: its key (the same lane, the same date), its size and place beside it; the rest to type.
    const words = this.wordsField(rows[i].kind);
    const fields = fieldsOf(form, rows[i].kind);
    const m = this.spec.moves;
    const keep = (n: number) => n < words || fields[n].type === 'choice' || (m?.kind === rows[i].kind && n !== words);
    const values = rows[i].values.map((v, n) => (keep(n) && fields[n].type !== 'icon' ? v : ''));
    if (m && m.kind === rows[i].kind && values[m.x] !== '') values[m.x] = String(+values[m.x] + (+values[1] || 3));
    this.startDraft(rows[i].kind, at, depth, values);
  }

  /**
   * Add to what a key names: a thing more in that row's list (a set's
   * things), or a row like the ones with that key (a step in that lane).
   * A key no row has yet is read as a line of its own ("Fast & Cheap: ").
   */
  protected addTo(key: string) {
    const form = this.spec.form!;
    const rows = this.rows();
    const at = rows.findIndex((r) => clean(this.keyOf(r)) === clean(key));
    if (at >= 0) {
      const list = this.listField(rows[at].kind);
      if (list >= 0) return this.addItem(at, list, listItems(rows[at].values[list]).length);
      const words = this.wordsField(rows[at].kind);
      return this.startDraft(rows[at].kind, rows.length, rows[at].depth, rows[at].values.map((v, n) => (n < words && fieldsOf(form, rows[at].kind)[n].type !== 'icon' ? v : '')), words);
    }
    const read = this.keyRow(key);
    if (!read) return;
    const words = this.wordsField(read.kind);
    this.startDraft(read.kind, rows.length, read.depth, read.values.map((v, n) => (n === words ? '' : v)), words);
  }

  /** The row keyed `key`, made if no row has it yet: for a thing dropped into a lane or a set. */
  protected rowKeyed(rows: Row[], key: string): [Row[], number] {
    const at = rows.findIndex((r) => clean(this.keyOf(r)) === clean(key));
    if (at >= 0) return [rows, at];
    const read = this.keyRow(key);
    if (!read) return [rows, -1];
    const words = this.wordsField(read.kind);
    return [[...rows, { ...read, values: read.values.map((v, n) => (n === words ? '' : v)) }], rows.length];
  }

  /** Move one thing of a list into what a key names (a person to another table, a thing into the overlap of two sets). */
  protected moveInto(row: number, field: number, item: number, key: string) {
    const [rows, to] = this.rowKeyed(this.rows(), key);
    if (to < 0) return;
    const list = this.listField(rows[to].kind);
    if (list < 0) return;
    this.putRows(moveItem(rows, row, field, item, to, list, Infinity));
  }

  /** A line of the app's link kind from one named thing to another ("API > Cache", "Cy .. Eve"), then its words open to type. */
  protected joinTo(to: string) {
    const from = this.joining?.from;
    this.joining = null;
    const kind = this.linkKind();
    if (!from || kind < 0 || clean(to) === from) return;
    const form = this.spec.form!;
    const fields = fieldsOf(form, kind);
    const refs = this.refFields(kind);
    const rows = this.rows();
    const name = (c: string) => {
      // The name as it is written somewhere, so the line finds it.
      for (const r of rows) for (const [n, v] of r.values.entries()) if (fieldsOf(form, r.kind)[n]?.type !== 'icon' && clean(v) === c) return v.replace(/^:[a-z0-9-]+\s*/, '').trim();
      return c;
    };
    const values = fields.map((f, n) => (n === refs[0] ? name(from) : n === refs[1] ? name(clean(to)) : f.type === 'choice' ? f.options[0] : ''));
    if (rows.some((r) => r.kind === kind && clean(r.values[refs[0]]) === clean(values[refs[0]]) && clean(r.values[refs[1]]) === clean(values[refs[1]]))) return;
    this.putRows([...rows, { kind, values, depth: kindsOf(form).kinds[kind].at ?? 0 }]);
  }

  /**
   * A name changed on row `row`, field `field`: every other place that
   * names the thing follows (the ends of lines, the sets something is
   * shared by; with regions on the picture, the other rows keyed by it).
   */
  protected renamed(rows: Row[], row: number, field: number, old: string, now: string): Row[] {
    const form = this.spec.form!;
    const was = clean(old);
    const to = now.replace(/^:[a-z0-9-]+\s*/, '').trim();
    if (!was) return rows;
    const keyed = this.spec.keyAt && this.keyField(rows[row].kind) === field;
    return rows.map((r, n) => {
      if (r.kind >= form.length) return r;
      const refs = this.refFields(r.kind);
      const values = r.values.map((v, m) => {
        if (n === row && m === field) return v;
        if (refs.includes(m)) return v.split(' & ').map((part) => (clean(part) === was ? to : part)).join(' & ');
        if (keyed && r.kind === rows[row].kind && m === field && clean(v) === was) return v.replace(/^(:[a-z0-9-]+\s*)?.*$/s, (_, icon = '') => icon + to);
        return v;
      });
      return values.some((v, m) => v !== r.values[m]) ? { ...r, values } : r;
    });
  }

  /**
   * Take a thing away: one thing of a list; or a row, with the lines that
   * name it (a thing named only by its lines goes by those going).
   */
  protected removeThing(row: number, field: number, item?: number) {
    const form = this.spec.form!;
    let rows = this.rows();
    const r = rows[row];
    if (!r) return;
    if (item !== undefined) {
      const items = listItems(r.values[field]).filter((_, k) => k !== item);
      return this.putRows(rows.map((q, n) => (n === row ? { ...q, values: q.values.map((v, m) => (m === field ? joinItems(items.filter(Boolean)) : v)) } : q)));
    }
    const refs = this.refFields(r.kind);
    const named = clean(refs.includes(field) ? r.values[field] : r.values[this.wordsField(r.kind)] ?? '');
    // The row itself, unless it is a line and the thing named is one end of it.
    if (!refs.includes(field) || refs.length < 2) rows = removeRow(rows, form, row);
    // Then every line to the thing.
    if (named) rows = rows.filter((q) => q.kind >= form.length || this.refFields(q.kind).length < 2 || !this.refFields(q.kind).some((m) => clean(q.values[m]) === named));
    this.putRows(rows);
  }

  /** A picture on the thing: the row's icon field, or ":name" before its words (before the one thing of a list, or the name wherever it is written). */
  protected async iconFor(i: number, field = -1, item?: number) {
    const name = await chooseIcon();
    if (!name) return;
    const form = this.spec.form!;
    const rows = this.rows();
    const row = rows[i];
    if (!row) return;
    const fields = fieldsOf(form, row.kind);
    const put = (v: string) => `:${name} ${v.replace(/^:[a-z0-9-]+\s*/, '')}`;
    if (item !== undefined) return this.putRows(rows.map((r, n) => (n === i ? { ...r, values: r.values.map((v, m) => (m === field ? joinItems(listItems(v).map((x, k) => (k === item ? put(x) : x))) : v)) } : r)));
    if (field >= 0 && this.refFields(row.kind).includes(field)) {
      // Named by its lines: the picture goes on the name, wherever it is written.
      const old = row.values[field];
      return this.putRows(this.renamed(rows, i, field, old, put(old)).map((r, n) => (n === i ? { ...r, values: r.values.map((v, m) => (m === field ? put(v) : v)) } : r)));
    }
    const slot = fields.findIndex((f) => f.type === 'icon');
    const words = fields.findIndex((f) => f.type !== 'icon' && f.type !== 'choice');
    const values = row.values.map((v, n) => (n === slot ? name : slot < 0 && n === words ? put(v) : v));
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
    const lists = !!spec.form && this.lists;
    const listing = lists && this.mode === 'form';
    const hint = !form
      ? spec.hint
      : listing
        ? 'Add a row for each thing, and fill it in.'
        : this.joining
          ? `Tap the thing to join ${this.joining.from} to; tap empty space to stop.`
          : this.kind === 'page'
            ? 'Type into the page; the bar along the bottom adds to it.'
            : this.kind === 'print'
              ? 'Tap words on the sheet to change them.'
              : 'Tap empty space to add a thing; tap a thing to type on it, Enter for the next; drag it where it goes.';
    return html`
      <div class="to-toolbar">
        <span class="to-hint diagram-hint">${hint}</span>
        <span class="to-spacer"></span>
        ${text.trim() ? nothing : tool('Start from an example', 'sparkles', () => this.type(spec.example), { text: true })}
        ${lists && this.mode === 'text' ? tool('Edit as a form', 'form', () => this.setMode('form'), { text: true }) : nothing}
        ${lists && this.mode !== 'text' ? tool(listing ? 'Hide the list' : 'List', 'form', () => this.setMode(listing ? 'picture' : 'form'), { text: true, pressed: listing }) : nothing}
        ${form || this.kind === 'page' ? nothing : tool('Icon', 'smile', () => this.addIcon(), { text: true })}
        ${inside || !this.drawable() ? nothing : tool('Open in Draw', 'draw', () => this.toDraw(), { text: true })}
      </div>
      ${this.extra()}
      <div class="diagram ${this.kind} ${form && !listing ? 'alone' : ''} ${this.joining ? 'joining' : ''}">
${form
          ? listing
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
