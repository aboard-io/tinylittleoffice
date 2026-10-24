/**
 * <to-field>: one fact of a host's record changed where it is shown (docs/library.md, The kit's small pieces): a
 * person's title, a company's size, a lead's close date. It reads as words (a link where it has `href`), and a click on
 * its words (not on a link), or on its pencil, makes it a field of its type: words, a number or an amount, a date or a
 * moment, one of its `options`, an email, an address, a phone number, lines of words (`multiline`), or another of the
 * host's records (`record`: a person's company, a task's assignee). Enter keeps it (Shift+Enter is a new line in
 * lines), the focus leaving keeps it, Escape lets it go; words where a number belongs are not kept, and the field says
 * so. A record is picked, not typed: the field searches the host's records as a typed table's record cell does
 * (kit/ui/record-pick.ts), `search(q, signal)` the host's own answer, Down and Up through those found, Enter chooses
 * (the field emptied, none), Escape or leaving lets it go.
 *
 * An edit is shown at once and told in `fieldchange`, cancelable, `{ value, before, wait }` (FieldChange), as a typed
 * table's "rowchange" is (kit/ui/table.ts): a page that refuses it calls `preventDefault()`, or hands `wait` a promise
 * that rejects or comes back false (a server's answer), and the words go back. A kept edit is shown until the page gives
 * `value` again, which is then the truth. Its words are a table cell's (kit/ui/table-model.ts `cellWords`): money in its
 * `currency` with its `decimals`, a date in the page's language, an option's label.
 *
 * - `value`, `type` (FieldType), `label` (its name: the pencil's "Edit Title", the field's name), `placeholder` (what it
 *   says when empty), `href` (where its words open), `options` (an enum's), `currency` and `decimals` (money's),
 *   `multiline`, `search` (a record's: RecordSearch), and `readonly` (words alone, no pencil). A record's `value` is
 *   `{ id, label, href? }` (RecordValue) or an id alone; its change is told with the id as `value` and the record
 *   chosen as `record`.
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { RecordPicking } from './record-pick.ts';
import {
  cellWords,
  inputOf,
  isEmpty,
  parseInput,
  recordOf,
  sameValue,
  type EnumOption,
  type RecordOption,
  type RecordSearch,
  type RecordValue,
  type TableColumn,
  type TableRow,
} from './table-model.ts';

/** What a field holds, and so how it is shown and edited. */
export type FieldType = 'text' | 'number' | 'money' | 'date' | 'datetime' | 'enum' | 'email' | 'url' | 'tel' | 'record';

/** A change made in a field, told to the page to keep or refuse ("fieldchange", cancelable). */
export interface FieldChange {
  /** What it holds now: words, a number, a day ("2027-03-01"), a moment, an option's value, a record's id; null for empty. */
  value: unknown;
  before: unknown;
  /** A record's: the record chosen, as the search offered it, or null where the field was emptied. */
  record?: RecordValue | null;
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
    search: { attribute: false },
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
  /** A record's search: the host's records for the words typed. */
  declare search: RecordSearch | undefined;
  declare readonly: boolean;
  /** The field is open. */
  declare editing: boolean;
  readonly uid = `to-field-${++n}`;
  /** An edit shown while the page has not given its value again. */
  private kept: unknown = KEPT_NONE;
  /** A record's picker (kit/ui/record-pick.ts), open while a record field is edited. */
  private picker = new RecordPicking(this);

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
    this.search = undefined;
    this.readonly = false;
    this.editing = false;
  }
  createRenderRoot() {
    return this;
  }
  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('value')) this.kept = KEPT_NONE;
  }
  protected updated() {
    if (this.editing && this.type === 'record') this.picker.place(this.field);
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
    return { key: 'v', label: this.label, type, options: this.options, currency: this.currency || undefined, decimals: this.decimals, search: this.search };
  }
  private row(): TableRow {
    return { id: 0, v: this.shown };
  }

  /** The field opened, its words chosen to type over. */
  async edit() {
    if (this.readonly || this.editing) return;
    this.editing = true;
    if (this.type === 'record') this.picker.begin(this.search);
    await this.updateComplete;
    const f = this.field;
    f?.focus();
    if (f instanceof HTMLInputElement && (f.type === 'text' || f.type === 'email' || f.type === 'url' || f.type === 'tel')) f.select();
    if (f instanceof HTMLTextAreaElement) f.select();
    // A choice's options and a date's calendar drop at once, where the browser lets a script (on a click or a key, not
    // otherwise), so one click opens them (Paul, 2026-10-24: "I have to click once to establish focus and AGAIN to pop
    // up the component. I want to click once").
    if (f instanceof HTMLSelectElement || (f instanceof HTMLInputElement && (f.type === 'date' || f.type === 'datetime-local'))) {
      try {
        (f as { showPicker?: () => void }).showPicker?.();
      } catch {
        /* no activation: they drop on the next click or key */
      }
    }
  }
  /** Where the focus goes once the field closes: the words, which are the control; the pencil, where the words are a link. */
  private refocus() {
    void this.updateComplete.then(() => this.querySelector<HTMLElement>('.to-fd-words, .to-fd-edit')?.focus());
  }
  /** Kept (`keep`) or let go, and the focus back on the pencil. */
  private end(keep: boolean, refocus = true) {
    if (!this.editing) return;
    const f = this.field;
    if (keep && f && this.type === 'record') {
      // A record is kept only by being chosen: the one in hand, or none where the field was emptied; words that found nothing keep the field open.
      const held = this.picker.held;
      if (held) this.commit(held.id, held);
      else if (!f.value.trim()) this.commit(null, null);
      else if (refocus) return;
    } else if (keep && f) {
      const value = parseInput(this.column(), f.value);
      if (value === undefined) {
        // Words that are not of its type: kept by nobody. A key keeps the field open to mend them; leaving lets them go.
        if (refocus) return void f.setAttribute('aria-invalid', 'true');
      } else this.commit(value);
    }
    this.editing = false;
    this.picker.end();
    if (refocus) this.refocus();
  }
  /** The edit kept: a value, or for a record its id with the record chosen (the words shown; null, emptied). */
  private commit(raw: unknown, record?: RecordOption | null) {
    const isRecord = this.type === 'record';
    const value = typeof raw === 'string' && this.type !== 'enum' && !isRecord ? (raw.trim() ? raw.trim() : null) : raw;
    const before = isRecord ? (recordOf(this.column(), this.row())?.id ?? null) : this.shown;
    if (sameValue(value, before)) return;
    const was = this.kept;
    const shown = isRecord ? (record ?? null) : value;
    this.kept = shown;
    // Refused, what was shown before it comes back: an edit kept before it and not yet given back as the value, or the value.
    const back = () => {
      if (this.kept !== shown) return;
      this.kept = was;
      this.requestUpdate();
    };
    const change: FieldChange = { value, before, ...(isRecord ? { record: record ?? null } : {}), wait: (answer) => void answer.then((ok) => ok === false && back(), back) };
    if (!this.dispatchEvent(new CustomEvent<FieldChange>('fieldchange', { detail: change, bubbles: true, composed: true, cancelable: true }))) back();
    this.requestUpdate();
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (this.type === 'record' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.picker.move(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter' && !(this.multiline && e.shiftKey)) {
      e.preventDefault();
      this.end(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.end(false);
    }
  };
  /** Leaving keeps the words; a record, kept only by being chosen, is let go. */
  private onBlur = () => this.end(this.type !== 'record', false);
  private onWordsClick = (e: MouseEvent) => {
    if ((e.target as Element).closest('a')) return;
    void this.edit();
  };

  private input(): TemplateResult {
    const start = inputOf(this.column(), this.row());
    const on = { key: this.onKey, blur: this.onBlur, input: (e: Event) => (e.currentTarget as HTMLElement).removeAttribute('aria-invalid') };
    if (this.type === 'record')
      return html`<input
          class="to-fd-input to-fd-pick"
          id="${this.uid}-f"
          type="text"
          role="combobox"
          autocomplete="off"
          spellcheck="false"
          aria-label=${this.label || nothing}
          aria-expanded="true"
          aria-controls="${this.uid}-pick"
          aria-autocomplete="list"
          aria-activedescendant=${this.picker.active(this.uid)}
          placeholder=${t('search-label')}
          .value=${start}
          @input=${(e: Event) => this.picker.type((e.currentTarget as HTMLInputElement).value)}
          @keydown=${on.key}
          @blur=${on.blur}
        />
        ${this.picker.list(this.uid, this.label, (o) => this.commitPicked(o))}`;
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
  /** A record clicked in the picker: kept and the field closed, the focus back on the words (or the pencil of a link). */
  private commitPicked(o: RecordOption) {
    if (!this.editing) return;
    this.commit(o.id, o);
    this.editing = false;
    this.picker.end();
    this.refocus();
  }
  /** Enter or Space on the words opens the field, as a click does. */
  private onWordsKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void this.edit();
    }
  };
  render() {
    if (this.editing) return html`<span class="to-fd to-fd-editing">${this.input()}</span>`;
    const words = cellWords(this.column(), this.row());
    const href = (this.type === 'record' ? recordOf(this.column(), this.row())?.href : undefined) ?? this.href;
    const name = t('field-edit-name', { name: this.label || t('common-edit') });
    // The words are the control (Paul, 2026-10-24: a pencil after an edit is "Not needed"): a button for the keyboard,
    // opened by a click, Enter or Space, and where the focus returns once the field closes. Words that are a link
    // stay a link, so a pencil beside them opens the field; a read-only field is words alone.
    const shown = words
      ? href
        ? html`<a class="to-fd-link" href=${href}>${words}</a>`
        : html`<span class="to-fd-text ${this.multiline ? 'to-fd-lines' : ''}">${words}</span>`
      : html`<span class="to-fd-empty">${this.placeholder || '–'}</span>`;
    if (this.readonly) return html`<span class="to-fd">${shown}</span>`;
    if (href)
      return html`<span class="to-fd to-fd-can" @click=${this.onWordsClick}>
        ${shown}
        <button type="button" class="to-btn to-tool to-fd-edit" aria-label=${name} title=${t('common-edit')} @click=${(e: Event) => (e.stopPropagation(), void this.edit())}>${icon(UI.pen, 14)}</button>
      </span>`;
    return html`<span class="to-fd to-fd-can" @click=${this.onWordsClick}>
      <span class="to-fd-words" role="button" tabindex="0" aria-label=${name} @keydown=${this.onWordsKey}>${shown}</span>
    </span>`;
  }
}
if (!customElements.get('to-field')) customElements.define('to-field', ToField);

declare global {
  interface HTMLElementTagNameMap {
    'to-field': ToField;
  }
}
