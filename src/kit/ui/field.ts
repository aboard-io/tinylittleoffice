/**
 * <to-field>: one fact of a host's record changed where it is shown (docs/library.md, The kit's small pieces): a
 * person's title, a company's size, a lead's close date. It reads as words (a link where it has `href`), and a click on
 * its words (not on a link), or on its pencil, makes it a field of its type: words, a number or an amount, a date or a
 * moment, one of its `options`, an email, an address, a phone number, or lines of words (`multiline`). Enter keeps it
 * (Shift+Enter is a new line in lines), the focus leaving keeps it, Escape lets it go; words where a number belongs are
 * not kept, and the field says so.
 *
 * An edit is shown at once and told in `fieldchange`, cancelable, `{ value, before, wait }` (FieldChange), as a typed
 * table's "rowchange" is (kit/ui/table.ts): a page that refuses it calls `preventDefault()`, or hands `wait` a promise
 * that rejects or comes back false (a server's answer), and the words go back. A kept edit is shown until the page gives
 * `value` again, which is then the truth. Its words are a table cell's (kit/ui/table-model.ts `cellWords`): money in its
 * `currency` with its `decimals`, a date in the page's language, an option's label.
 *
 * - `value`, `type` (FieldType), `label` (its name: the pencil's "Edit Title", the field's name), `placeholder` (what it
 *   says when empty), `href` (where its words open), `options` (an enum's), `currency` and `decimals` (money's),
 *   `multiline`, and `readonly` (words alone, no pencil).
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { cellWords, inputOf, isEmpty, parseInput, sameValue, type EnumOption, type TableColumn, type TableRow } from './table-model.ts';

/** What a field holds, and so how it is shown and edited. */
export type FieldType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'enum' | 'email' | 'url' | 'tel';

/** A change made in a field, told to the page to keep or refuse ("fieldchange", cancelable). */
export interface FieldChange {
  /** What it holds now: words, a number, a day ("2027-03-01"), a moment, an option's value; null for empty. */
  value: unknown;
  before: unknown;
  /** The page's answer, when it comes later: a promise that rejects, or comes back false, puts the words back. */
  wait(answer: Promise<unknown>): void;
}

const KEPT_NONE = Symbol('none');
let n = 0;

export class ToField extends LitElement {
  static properties = {
    value: { attribute: false },
    type: {},
    label: {},
    placeholder: {},
    href: {},
    options: { attribute: false },
    currency: {},
    decimals: { type: Number },
    multiline: { type: Boolean },
    readonly: { type: Boolean, reflect: true },
    editing: { state: true },
  };
  declare value: unknown;
  declare type: FieldType;
  declare label: string;
  declare placeholder: string;
  declare href: string;
  declare options: EnumOption[];
  declare currency: string;
  declare decimals: number | undefined;
  declare multiline: boolean;
  declare readonly: boolean;
  /** The field is open. */
  declare editing: boolean;
  readonly uid = `to-field-${++n}`;
  /** An edit shown while the page has not given its value again. */
  private kept: unknown = KEPT_NONE;

  constructor() {
    super();
    this.value = null;
    this.type = 'text';
    this.label = '';
    this.placeholder = '';
    this.href = '';
    this.options = [];
    this.currency = '';
    this.decimals = undefined;
    this.multiline = false;
    this.readonly = false;
    this.editing = false;
  }
  createRenderRoot() {
    return this;
  }
  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('value')) this.kept = KEPT_NONE;
  }

  /** What is shown: the edit kept, else the page's value. */
  get shown(): unknown {
    return this.kept === KEPT_NONE ? this.value : this.kept;
  }
  /** The field, while it is open. */
  get field(): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    return this.querySelector('.to-fd-input');
  }
  /** The field as a typed table's column, whose words and parsing it shares. */
  private column(): TableColumn {
    const type = this.type === 'email' || this.type === 'url' || this.type === 'tel' ? 'text' : this.type;
    return { key: 'v', label: this.label, type, options: this.options, currency: this.currency || undefined, decimals: this.decimals };
  }
  private row(): TableRow {
    return { id: 0, v: this.shown };
  }

  /** The field opened, its words chosen to type over. */
  async edit() {
    if (this.readonly || this.editing) return;
    this.editing = true;
    await this.updateComplete;
    const f = this.field;
    f?.focus();
    if (f instanceof HTMLInputElement && (f.type === 'text' || f.type === 'email' || f.type === 'url' || f.type === 'tel')) f.select();
    if (f instanceof HTMLTextAreaElement) f.select();
  }
  /** Kept (`keep`) or let go, and the focus back on the pencil. */
  private end(keep: boolean, refocus = true) {
    if (!this.editing) return;
    const f = this.field;
    if (keep && f) {
      const value = parseInput(this.column(), f.value);
      if (value === undefined) {
        // Words that are not of its type: kept by nobody. A key keeps the field open to mend them; leaving lets them go.
        if (refocus) return void f.setAttribute('aria-invalid', 'true');
      } else this.commit(value);
    }
    this.editing = false;
    if (refocus) void this.updateComplete.then(() => this.querySelector<HTMLElement>('.to-fd-edit')?.focus());
  }
  private commit(raw: unknown) {
    const value = typeof raw === 'string' && this.type !== 'enum' ? (raw.trim() ? raw.trim() : null) : raw;
    const before = this.shown;
    if (sameValue(value, before)) return;
    const was = this.kept;
    this.kept = value;
    // Refused, what was shown before it comes back: an edit kept before it and not yet given back as the value, or the value.
    const back = () => {
      if (this.kept !== value) return;
      this.kept = was;
      this.requestUpdate();
    };
    const change: FieldChange = { value, before, wait: (answer) => void answer.then((ok) => ok === false && back(), back) };
    if (!this.dispatchEvent(new CustomEvent<FieldChange>('fieldchange', { detail: change, bubbles: true, composed: true, cancelable: true }))) back();
    this.requestUpdate();
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !(this.multiline && e.shiftKey)) {
      e.preventDefault();
      this.end(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.end(false);
    }
  };
  private onBlur = () => this.end(true, false);
  private onWordsClick = (e: MouseEvent) => {
    if ((e.target as Element).closest('a')) return;
    void this.edit();
  };

  private input(): TemplateResult {
    const start = inputOf(this.column(), this.row());
    const on = { key: this.onKey, blur: this.onBlur, input: (e: Event) => (e.currentTarget as HTMLElement).removeAttribute('aria-invalid') };
    if (this.type === 'enum')
      return html`<select class="to-fd-input" id="${this.uid}-f" aria-label=${this.label || nothing} @keydown=${on.key} @blur=${on.blur}>
        ${isEmpty(this.shown) ? html`<option value="" selected></option>` : nothing}
        ${this.options.map((o) => html`<option value=${o.value} ?selected=${o.value === start}>${o.label ?? o.value}</option>`)}
      </select>`;
    if (this.multiline)
      return html`<textarea class="to-fd-input" id="${this.uid}-f" rows="3" aria-label=${this.label || nothing} .value=${start} @input=${on.input} @keydown=${on.key} @blur=${on.blur}></textarea>`;
    const kind = { date: 'date', datetime: 'datetime-local', email: 'email', url: 'url', tel: 'tel' }[this.type as string] ?? 'text';
    const numeric = this.type === 'number' || this.type === 'money';
    return html`<input
      class="to-fd-input"
      id="${this.uid}-f"
      type=${kind}
      inputmode=${numeric ? 'decimal' : nothing}
      aria-label=${this.label || nothing}
      placeholder=${this.placeholder || nothing}
      .value=${live(start)}
      @input=${on.input}
      @keydown=${on.key}
      @blur=${on.blur}
    />`;
  }
  render() {
    if (this.editing) return html`<span class="to-fd to-fd-editing">${this.input()}</span>`;
    const words = cellWords(this.column(), this.row());
    const shown = words
      ? this.href
        ? html`<a class="to-fd-link" href=${this.href}>${words}</a>`
        : html`<span class="to-fd-text ${this.multiline ? 'to-fd-lines' : ''}">${words}</span>`
      : html`<span class="to-fd-empty">${this.placeholder || '–'}</span>`;
    return html`<span class="to-fd ${this.readonly ? '' : 'to-fd-can'}" @click=${this.readonly ? nothing : this.onWordsClick}>
      ${shown}
      ${
        this.readonly
          ? nothing
          : html`<button type="button" class="to-btn to-tool to-fd-edit" aria-label=${t('field-edit-name', { name: this.label || t('common-edit') })} title=${t('common-edit')} @click=${(e: Event) => (e.stopPropagation(), void this.edit())}>
              ${icon(UI.pen, 14)}
            </button>`
      }
    </span>`;
  }
}
if (!customElements.get('to-field')) customElements.define('to-field', ToField);

declare global {
  interface HTMLElementTagNameMap {
    'to-field': ToField;
  }
}
