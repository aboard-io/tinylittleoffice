/**
 * <to-lines>: a form for a text made of lines (see lib/lines.ts). A row for
 * each line, a box for each of its fields, and buttons to add, move and
 * remove. What it hands back is always the text.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { icon, libraryIcon, UI } from '../lib/icons.ts';
import { fieldsOf, kindsOf, readLines, writeLines, type Field, type Kind, type Row } from '../lib/lines.ts';
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
      void this.updateComplete.then(() => (this.querySelector<HTMLElement>(`[data-row="${focus}"] :is(input, textarea, select)`) ?? this.querySelector<HTMLElement>(`[data-row="${focus}"] button`))?.focus());
    }
  }

  private set(i: number, f: number, value: string) {
    this.save(this.rows.map((r, n) => (n === i ? { ...r, values: r.values.map((v, m) => (m === f ? value : v)) } : r)));
  }

  private add(kind: number, after = this.at) {
    const { kinds } = kindsOf(this.kinds);
    const k = kinds[kind];
    const fields = fieldsOf(this.kinds, kind);
    // A title or a setting goes to the top; anything else, after the row last worked in.
    const top = this.rows.findIndex((r) => !kinds[r.kind].once);
    const i = k.once ? (top < 0 ? this.rows.length : top) : after >= 0 && after < this.rows.length ? after + 1 : this.rows.length;
    const row: Row = { kind, values: fields.map((f) => (f.type === 'choice' ? f.options[0] : '')), depth: k.at ?? (k.indent ? (this.rows[i - 1]?.depth ?? 0) : 0) };
    this.save([...this.rows.slice(0, i), row, ...this.rows.slice(i)], i);
  }

  private move(i: number, by: number) {
    const to = i + by;
    if (to < 0 || to >= this.rows.length) return;
    const rows = this.rows.slice();
    [rows[i], rows[to]] = [rows[to], rows[i]];
    this.save(rows, to);
  }

  private field(row: Row, i: number, f: Field, n: number) {
    const label = `${f.name}, row ${i + 1}`;
    const value = row.values[n] ?? '';
    const typed = (e: Event) => this.set(i, n, (e.target as HTMLInputElement).value);
    if (f.type === 'icon') {
      return html`<button type="button" class="lf-icon" aria-label="${label}: ${value || 'none'}" title=${value ? `${f.name}: ${value}` : `Choose a ${f.name.toLowerCase()}`} @click=${async () => { const name = await chooseIcon(); if (name) this.set(i, n, name); }}>${value ? libraryIcon(value, 20) : icon(UI.smile, 18)}</button>`;
    }
    if (f.type === 'choice') return html`<select aria-label=${label} .value=${value} @change=${typed}>${f.options.map((o) => html`<option ?selected=${o.toLowerCase() === value.toLowerCase()}>${o}</option>`)}</select>`;
    // Return in a box starts another row of the same kind: lists are quick to type.
    return html`<input class=${f.type} type=${f.type === 'date' ? 'date' : 'text'} aria-label=${label} placeholder=${f.name} .value=${value} @input=${typed} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !kindsOf(this.kinds).kinds[row.kind].once && (e.preventDefault(), this.add(row.kind, i))} />`;
  }

  render() {
    const { kinds } = kindsOf(this.kinds);
    const button = (label: string, glyph: keyof typeof UI, act: () => void, off = false) => html`<button type="button" aria-label=${label} title=${label} ?disabled=${off} @click=${act}>${icon(UI[glyph], 15)}</button>`;
    return html`
      <ol class="lf-rows" aria-label="${this.name}, as a form">
        ${this.rows.map((row, i) => {
          const k = kinds[row.kind];
          const fields = fieldsOf(this.kinds, row.kind);
          return html`<li class="lf-row ${fields.length ? '' : 'rule'}" data-row=${i} style="--d:${row.depth}" @focusin=${() => (this.at = i)}>
            <span class="lf-kind">${k.name}</span>
            <div class="lf-fields">${fields.map((f, n) => this.field(row, i, f, n))}</div>
            <div class="lf-tools">
              ${k.indent ? html`${button(`Bring row ${i + 1} out`, 'outdent', () => this.save(this.rows.map((r, n) => (n === i ? { ...r, depth: Math.max(0, r.depth - 1) } : r)), i), !row.depth)}${button(`Indent row ${i + 1}`, 'indent', () => this.save(this.rows.map((r, n) => (n === i ? { ...r, depth: Math.min(6, r.depth + 1) } : r)), i), !i)}` : nothing}
              ${button(`Move row ${i + 1} up`, 'up', () => this.move(i, -1), !i)}${button(`Move row ${i + 1} down`, 'down', () => this.move(i, 1), i === this.rows.length - 1)}
              ${button(`Remove row ${i + 1}`, 'close', () => this.save(this.rows.filter((_, n) => n !== i), Math.min(i, this.rows.length - 2)))}
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
