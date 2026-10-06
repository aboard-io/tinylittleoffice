/**
 * <to-insert>: a combobox for adding something: type a few letters of
 * what you want ("org", "chart", "two col"), pick it, and it is added.
 * Fires "pick" with the option's value. The options are given in the
 * order and groups the main menu uses.
 */
import { LitElement, html } from 'lit';
import { icon, UI } from '../lib/icons.ts';

export interface InsertOption {
  value: string;
  label: string;
  group?: string;
}

export class ToInsert extends LitElement {
  static properties = { options: { attribute: false }, label: {}, placeholder: {} };
  declare options: InsertOption[];
  declare label: string;
  declare placeholder: string;
  private static n = 0;
  private listId = `to-insert-${ToInsert.n++}`;

  constructor() {
    super();
    this.options = [];
    this.label = 'Insert';
    this.placeholder = 'Insert…';
  }

  protected createRenderRoot() {
    return this;
  }

  /** What was typed, as an option: the one whose label it is, else the first whose label starts that way. */
  private match(text: string): InsertOption | undefined {
    const t = text.trim().toLowerCase();
    if (!t) return undefined;
    return this.options.find((o) => o.label.toLowerCase() === t) ?? this.options.find((o) => o.label.toLowerCase().startsWith(t)) ?? this.options.find((o) => o.label.toLowerCase().includes(t));
  }

  private pick(box: HTMLInputElement) {
    const o = this.match(box.value);
    if (!o) return;
    box.value = '';
    this.dispatchEvent(new CustomEvent('pick', { detail: o.value, bubbles: true }));
  }

  render() {
    return html`<label class="to-insert">
      <span class="to-insert-icon">${icon(UI.plus, 14)}</span>
      <span class="sr-only">${this.label}</span>
      <input
        role="combobox"
        list=${this.listId}
        aria-label=${this.label}
        aria-expanded="false"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        placeholder=${this.placeholder}
        @change=${(e: Event) => this.pick(e.target as HTMLInputElement)}
        @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.pick(e.target as HTMLInputElement))}
      />
      <datalist id=${this.listId}>${this.options.map((o) => html`<option value=${o.label}>${o.group ?? ''}</option>`)}</datalist>
    </label>`;
  }
}
if (!customElements.get('to-insert')) customElements.define('to-insert', ToInsert);
