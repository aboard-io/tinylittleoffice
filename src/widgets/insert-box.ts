/**
 * <to-insert>: a combobox for adding something. Tap it and a list drops
 * down, in the menu's groups, to scroll or to narrow by typing a few
 * letters ("org", "two col"); arrows move, Enter or a tap picks. Fires
 * "pick" with the option's value.
 */
import { LitElement, html, nothing } from 'lit';
import { icon, UI } from '../lib/icons.ts';

export interface InsertOption {
  value: string;
  label: string;
  group?: string;
  /** The option's picture: a key of UI (an app's icon, a layout's). */
  icon?: keyof typeof UI;
}

export class ToInsert extends LitElement {
  static properties = { options: { attribute: false }, label: {}, placeholder: {}, open: { state: true }, text: { state: true }, at: { state: true } };
  declare options: InsertOption[];
  declare label: string;
  declare placeholder: string;
  /** The list is showing. */
  declare open: boolean;
  /** What has been typed, which narrows the list. */
  declare text: string;
  /** The option the arrows are on. */
  declare at: number;
  private static n = 0;
  private listId = `to-insert-${ToInsert.n++}`;

  constructor() {
    super();
    this.options = [];
    this.label = 'Insert';
    this.placeholder = 'Insert…';
    this.open = false;
    this.text = '';
    this.at = 0;
  }

  protected createRenderRoot() {
    return this;
  }

  /** The options that fit what was typed: by the start of a word first, then anywhere. */
  private shown(): InsertOption[] {
    const t = this.text.trim().toLowerCase();
    if (!t) return this.options;
    const starts = this.options.filter((o) => o.label.toLowerCase().split(/\s+/).some((w) => w.startsWith(t)) || o.label.toLowerCase().startsWith(t));
    const within = this.options.filter((o) => !starts.includes(o) && (o.label.toLowerCase().includes(t) || o.group?.toLowerCase().includes(t)));
    return [...starts, ...within];
  }

  private pick(o: InsertOption | undefined) {
    if (!o) return;
    this.text = '';
    this.open = false;
    this.dispatchEvent(new CustomEvent('pick', { detail: o.value, bubbles: true }));
  }

  private onKey(e: KeyboardEvent) {
    const list = this.shown();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.open = true;
      this.at = Math.max(0, Math.min(list.length - 1, this.at + (e.key === 'ArrowDown' ? 1 : -1)));
      this.querySelector(`#${this.listId}-${this.at}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.pick(list[this.at] ?? list[0]);
    } else if (e.key === 'Escape') {
      this.open = false;
    }
  }

  render() {
    const list = this.shown();
    let lastGroup: string | undefined;
    return html`<div class="to-insert" @focusout=${(e: FocusEvent) => !this.contains(e.relatedTarget as Node) && (this.open = false)}>
      <span class="to-insert-icon">${icon(UI.plus, 14)}</span>
      <input
        role="combobox"
        aria-label=${this.label}
        aria-expanded=${this.open ? 'true' : 'false'}
        aria-controls=${this.listId}
        aria-autocomplete="list"
        aria-activedescendant=${this.open && list[this.at] ? `${this.listId}-${this.at}` : ''}
        autocomplete="off"
        spellcheck="false"
        placeholder=${this.placeholder}
        .value=${this.text}
        @focus=${() => (this.open = true)}
        @click=${() => (this.open = true)}
        @input=${(e: Event) => ((this.text = (e.target as HTMLInputElement).value), (this.at = 0), (this.open = true))}
        @keydown=${this.onKey}
      />
      ${this.open
        ? html`<ul id=${this.listId} class="to-insert-list" role="listbox" aria-label=${this.label}>
            ${list.length ? nothing : html`<li class="none">Nothing called “${this.text.trim()}”</li>`}
            ${list.map((o, i) => {
              const head = o.group && o.group !== lastGroup && !this.text.trim() ? html`<li class="group" role="presentation">${o.group}</li>` : nothing;
              lastGroup = o.group;
              return html`${head}<li id="${this.listId}-${i}" role="option" aria-selected=${i === this.at ? 'true' : 'false'} class=${i === this.at ? 'on' : ''} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.pick(o)}>${o.icon && UI[o.icon] ? html`<span class="ic">${icon(UI[o.icon], 16)}</span>` : html`<span class="ic"></span>`}${o.label}${this.text.trim() && o.group ? html`<small>${o.group}</small>` : nothing}</li>`;
            })}
          </ul>`
        : nothing}
    </div>`;
  }
}
if (!customElements.get('to-insert')) customElements.define('to-insert', ToInsert);
