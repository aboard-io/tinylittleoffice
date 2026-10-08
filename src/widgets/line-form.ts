/**
 * <to-lines>: a form for a text made of lines (see lib/lines.ts). A row for
 * each line, a box for each of its fields, and buttons to add, move and
 * remove. What it hands back is always the text.
 */
import { goLinks } from './link-guard.ts';
import { LitElement, html, nothing, btn, icon, libraryIcon, UI, type PropertyValues } from '../kit.ts';
import { blockEnd, depths, fieldsOf, kindsOf, marksAfter, moveBlock, readLines, removeRow, shiftBlock, writeLines, type Field, type Kind, type Row } from '../lib/lines.ts';
import { chooseIcon } from './icon-picker.ts';

export class ToLines extends LitElement {
  static properties = { text: {}, kinds: { attribute: false }, name: {} };
  declare text: string;
  declare kinds: Kind[];
  /** What is being edited, for labels ("Menu"). */
  declare name: string;
  private rows: Row[] = [];
  /** The text as this form last wrote it: anything else arriving is a change from outside. */
  private written: string | null = null;
  /** Rows folded shut: what is under them is out of sight for now. (Not part of the document.) */
  private folded = new WeakSet<Row>();
  /** The row last worked in: new rows go after it. */
  private at = -1;

  protected createRenderRoot() {
    return this;
  }

  protected willUpdate(changed: PropertyValues) {
    if ((changed.has('text') || changed.has('kinds')) && this.text !== this.written) {
      this.rows = readLines(this.text ?? '', this.kinds);
      this.written = this.text;
    }
  }

  private save(rows: Row[], focus = -1) {
    this.rows = rows;
    this.written = writeLines(rows, this.kinds);
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent('lines-change', { detail: this.written }));
    if (focus >= 0) {
      this.at = focus;
      // Whatever hides the row being worked in opens up.
      rows.forEach((r, n) => n < focus && this.folded.has(r) && blockEnd(rows, this.kinds, n) > focus && this.folded.delete(r));
      void this.updateComplete.then(() => (this.querySelector<HTMLElement>(`[data-row="${focus}"] :is(input, textarea, select)`) ?? this.querySelector<HTMLElement>(`[data-row="${focus}"] button`))?.focus());
    }
  }

  private set(i: number, f: number, value: string) {
    this.save(this.rows.map((r, n) => (n === i ? { ...r, values: r.values.map((v, m) => (m === f ? value : v)) } : r)));
  }

  /** A new row of a kind at a place, from outside (a picture's "+" button): the cursor goes to it. */
  insert(kind: number, at: number, depth: number) {
    const fields = fieldsOf(this.kinds, kind);
    this.save([...this.rows.slice(0, at), { kind, values: fields.map((f) => (f.type === 'choice' ? f.options[0] : '')), depth }, ...this.rows.slice(at)], at);
  }

  private add(kind: number, after = this.at) {
    const { kinds } = kindsOf(this.kinds);
    const k = kinds[kind];
    const fields = fieldsOf(this.kinds, kind);
    // A title or a setting goes to the top; anything else, after the row last worked in.
    const top = this.rows.findIndex((r) => !kinds[r.kind].once);
    // (After a row of its own kind that has rows under it, it goes below those: a sibling, not a new parent for them.)
    const here = after >= 0 && after < this.rows.length;
    const i = k.once ? (top < 0 ? this.rows.length : top) : !here ? this.rows.length : k.indent && this.rows[after].kind === kind ? blockEnd(this.rows, this.kinds, after) : after + 1;
    const row: Row = { kind, values: fields.map((f) => (f.type === 'choice' ? f.options[0] : '')), depth: k.at ?? (k.indent && here && kinds[this.rows[after].kind].indent ? this.rows[after].depth : 0) };
    this.save([...this.rows.slice(0, i), row, ...this.rows.slice(i)], i);
  }

  private move(i: number, by: -1 | 1) {
    const moved = moveBlock(this.rows, this.kinds, i, by);
    if (moved) this.save(moved[0], moved[1]);
  }
  private shift(i: number, by: -1 | 1) {
    const rows = shiftBlock(this.rows, this.kinds, i, by);
    if (rows) this.save(rows, i);
  }
  private drop(i: number) {
    this.save(removeRow(this.rows, this.kinds, i), Math.max(0, Math.min(i - 1, this.rows.length - 2)));
  }

  /** The keys an outline is worked with: Alt and the arrows move and indent; Backspace in an empty row takes it away. */
  private onKey(e: KeyboardEvent, i: number) {
    const arrow = e.altKey && !e.ctrlKey && !e.metaKey ? e.key : '';
    if (arrow === 'ArrowUp' || arrow === 'ArrowDown') this.move(i, arrow === 'ArrowUp' ? -1 : 1);
    else if (arrow === 'ArrowRight' || arrow === 'ArrowLeft') this.shift(i, arrow === 'ArrowRight' ? 1 : -1);
    else if (e.key === 'Backspace' && this.rows.length > 1 && this.rows[i].values.every((v) => !v) && fieldsOf(this.kinds, this.rows[i].kind).length) this.drop(i);
    else return;
    e.preventDefault();
  }

  private field(row: Row, i: number, f: Field, n: number) {
    const label = `${f.name}, row ${i + 1}`;
    const value = row.values[n] ?? '';
    const typed = (e: Event) => this.set(i, n, (e.target as HTMLInputElement).value);
    if (f.type === 'icon') {
      return html`<button type="button" class="lf-icon" aria-label="${label}: ${value || 'none'}" data-tip=${value ? `${f.name}: ${value}` : `Choose a ${f.name.toLowerCase()}`} @click=${async () => { const name = await chooseIcon(); if (name) this.set(i, n, name); }}>${value ? libraryIcon(value, 20) : icon(UI.smile, 18)}</button>`;
    }
    if (f.type === 'choice') return html`<select aria-label=${label} .value=${value} @change=${typed}>${f.options.map((o) => html`<option ?selected=${o.toLowerCase() === value.toLowerCase()}>${o}</option>`)}</select>`;
    // What a box must not hold: the marks that, in the text, would end it early.
    const marks = marksAfter(this.kinds, row.kind, n);
    const clean = (e: Event) => {
      const box = e.target as HTMLInputElement;
      const was = box.value;
      for (const m of marks) box.value = box.value.split(m).join('');
      if (box.value !== was) box.setSelectionRange(box.value.length, box.value.length);
      typed(e);
    };
    // Return in a box starts another row of the same kind: lists are quick to type.
    const names = f.type === 'pick' ? [...new Set(this.rows.filter((r) => r !== row).map((r) => (r.values.find((v, k) => v && fieldsOf(this.kinds, r.kind)[k].type !== 'icon') ?? '').split(' | ')[0]).filter(Boolean))] : [];
    const list = f.type === 'pick' ? `lf-pick-${i}-${n}` : undefined;
    return html`${names.length ? html`<datalist id=${list!}>${names.map((v) => html`<option value=${v}></option>`)}</datalist>` : nothing}<input class=${f.type} type=${f.type === 'date' ? 'date' : 'text'} inputmode=${f.type === 'number' ? 'decimal' : nothing} list=${list ?? nothing} aria-label=${label} placeholder=${f.name} .value=${value} @input=${clean} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !kindsOf(this.kinds).kinds[row.kind].once && (e.preventDefault(), this.add(row.kind, i))} />${f.type === 'text' || f.type === 'long' ? goLinks(value) : nothing}`;
  }

  render() {
    const { kinds } = kindsOf(this.kinds);
    const deep = depths(this.rows, this.kinds);
    // What is under a folded row is not shown.
    const hidden = new Set<number>();
    this.rows.forEach((r, n) => {
      if (this.folded.has(r)) for (let m = n + 1; m < blockEnd(this.rows, this.kinds, n); m++) hidden.add(m);
    });
    const fold = (r: Row, i: number) => {
      if (this.folded.has(r)) this.folded.delete(r);
      else this.folded.add(r);
      this.at = i;
      this.requestUpdate();
    };
    const button = (label: string, glyph: keyof typeof UI, act: () => void, off = false) => btn(label, glyph, act, { disabled: off, size: 15 });
    return html`
      <ol class="lf-rows" aria-label="${this.name}, as a form">
        ${this.rows.map((row, i) => {
          const k = kinds[row.kind];
          const fields = fieldsOf(this.kinds, row.kind);
          const under = blockEnd(this.rows, this.kinds, i) - i - 1;
          return html`<li class="lf-row ${fields.length ? '' : 'rule'} ${k.head || k.once ? 'head' : ''}" data-row=${i} style="--d:${deep[i]}" ?hidden=${hidden.has(i)} @focusin=${() => (this.at = i)} @keydown=${(e: KeyboardEvent) => this.onKey(e, i)}>
            <span class="lf-kind">${under && !k.once ? html`<button type="button" class="lf-fold" aria-expanded=${this.folded.has(row) ? 'false' : 'true'} aria-label="${this.folded.has(row) ? 'Show' : 'Hide'} the ${under} ${under === 1 ? 'row' : 'rows'} under row ${i + 1}" @click=${() => fold(row, i)}>${icon(this.folded.has(row) ? UI.right : UI.down, 13)}${this.folded.has(row) ? html`<b>${under}</b>` : nothing}</button>` : nothing}${k.name}</span>
            <div class="lf-fields">${fields.map((f, n) => this.field(row, i, f, n))}</div>
            <div class="lf-tools">
              ${k.indent ? html`${button(`Bring row ${i + 1} out`, 'outdent', () => this.shift(i, -1), !shiftBlock(this.rows, this.kinds, i, -1))}${button(`Indent row ${i + 1}`, 'indent', () => this.shift(i, 1), !shiftBlock(this.rows, this.kinds, i, 1))}` : nothing}
              ${button(`Move row ${i + 1} up`, 'up', () => this.move(i, -1), !moveBlock(this.rows, this.kinds, i, -1))}${button(`Move row ${i + 1} down`, 'down', () => this.move(i, 1), !moveBlock(this.rows, this.kinds, i, 1))}
              ${button(`Remove row ${i + 1}`, 'close', () => this.drop(i))}
            </div>
          </li>`;
        })}
      </ol>
      <div class="lf-add" role="group" aria-label="Add">
        ${kinds.map((k, n) => (k.once && this.rows.some((r) => r.kind === n) ? nothing : html`<button type="button" @click=${() => this.add(n)}>${icon(UI.plus, 14)} ${k.name}</button>`))}
      </div>
    `;
  }
}
if (!customElements.get('to-lines')) customElements.define('to-lines', ToLines);
