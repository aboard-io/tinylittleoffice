/**
 * <to-insert>: the Insert menu. A button; tap it and a list drops down,
 * in the menu's groups, to scroll or to narrow by typing a few letters
 * ("org", "two col"); arrows move, Enter or a tap picks. Fires "pick"
 * with the option's value.
 */
import { LitElement, html, nothing } from '../kit.ts';
import { icon, UI } from '../lib/icons.ts';

export interface InsertOption {
  value: string;
  label: string;
  group?: string;
  /** The option's picture: a key of UI (an app's icon, a layout's). */
  icon?: keyof typeof UI;
}

export class ToInsert extends LitElement {
  static properties = { options: { attribute: false }, label: {}, open: { state: true }, text: { state: true }, at: { state: true } };
  declare options: InsertOption[];
  declare label: string;
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
    this.open = false;
    this.text = '';
    this.at = 0;
  }

  protected createRenderRoot() {
    return this;
  }

  /**
   * The list is placed against the window, under the button: a bar that
   * scrolls sideways would otherwise cut it off. It follows the button
   * while the page or the bar scrolls.
   */
  private place = () => {
    const list = this.querySelector<HTMLElement>('.to-insert-list');
    const box = this.querySelector('sl-button')?.getBoundingClientRect();
    if (!list || !box) return;
    const width = Math.min(288, innerWidth - 16);
    list.style.top = `${box.bottom + 4}px`;
    list.style.left = `${Math.max(8, Math.min(box.left, innerWidth - width - 8))}px`;
    list.style.width = `${width}px`;
  };
  protected updated(changed: Map<string, unknown>) {
    if (!this.open) return;
    // In the top layer, over everything on the page, whatever sits in front of the bar.
    const list = this.querySelector<HTMLElement>('.to-insert-list');
    if (list?.showPopover && !list.matches(':popover-open')) list.showPopover();
    this.place();
    if (changed.has('open')) this.querySelector<HTMLInputElement>('input')?.focus();
  }
  connectedCallback() {
    super.connectedCallback();
    addEventListener('scroll', this.place, true);
    addEventListener('resize', this.place);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    removeEventListener('scroll', this.place, true);
    removeEventListener('resize', this.place);
  }

  /** The options that fit what was typed: by the start of a word first, then anywhere. */
  private shown(): InsertOption[] {
    const t = this.text.trim().toLowerCase();
    if (!t) return this.options;
    const starts = this.options.filter((o) => o.label.toLowerCase().split(/\s+/).some((w) => w.startsWith(t)) || o.label.toLowerCase().startsWith(t));
    const within = this.options.filter((o) => !starts.includes(o) && (o.label.toLowerCase().includes(t) || o.group?.toLowerCase().includes(t)));
    return [...starts, ...within];
  }

  private toggle(open = !this.open) {
    this.open = open;
    this.text = '';
    this.at = 0;
  }

  private pick(o: InsertOption | undefined) {
    if (!o) return;
    this.toggle(false);
    this.dispatchEvent(new CustomEvent('pick', { detail: o.value, bubbles: true }));
  }

  private onKey(e: KeyboardEvent) {
    const list = this.shown();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.at = Math.max(0, Math.min(list.length - 1, this.at + (e.key === 'ArrowDown' ? 1 : -1)));
      this.querySelector(`#${this.listId}-${this.at}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.pick(list[this.at] ?? list[0]);
    } else if (e.key === 'Escape') {
      this.toggle(false);
      this.querySelector<HTMLElement>('sl-button')?.focus();
    }
  }

  render() {
    const list = this.shown();
    let lastGroup: string | undefined;
    return html`<div class="to-insert" @focusout=${(e: FocusEvent) => !this.contains(e.relatedTarget as Node) && this.open && this.toggle(false)}>
      <sl-button size="small" caret aria-haspopup="listbox" aria-expanded=${this.open ? 'true' : 'false'} aria-controls=${this.listId} @click=${() => this.toggle()}>${icon(UI.plus, 14)} ${this.label}</sl-button>
      ${this.open
        ? html`<div class="to-insert-list" popover="manual" @keydown=${this.onKey}>
            <input type="search" aria-label="Narrow the list" placeholder="Type to narrow…" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls=${this.listId} aria-autocomplete="list" aria-activedescendant=${list[this.at] ? `${this.listId}-${this.at}` : ''} .value=${this.text} @input=${(e: Event) => ((this.text = (e.target as HTMLInputElement).value), (this.at = 0))} />
            <ul id=${this.listId} role="listbox" aria-label=${this.label}>
              ${list.length ? nothing : html`<li class="none">Nothing called “${this.text.trim()}”</li>`}
              ${list.map((o, i) => {
                const head = o.group && o.group !== lastGroup && !this.text.trim() ? html`<li class="group" role="presentation">${o.group}</li>` : nothing;
                lastGroup = o.group;
                return html`${head}<li id="${this.listId}-${i}" role="option" aria-selected=${i === this.at ? 'true' : 'false'} class=${i === this.at ? 'on' : ''} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.pick(o)}>${o.icon && UI[o.icon] ? html`<span class="ic">${icon(UI[o.icon], 16)}</span>` : html`<span class="ic"></span>`}${o.label}${this.text.trim() && o.group ? html`<small>${o.group}</small>` : nothing}</li>`;
              })}
            </ul>
          </div>`
        : nothing}
    </div>`;
  }
}
if (!customElements.get('to-insert')) customElements.define('to-insert', ToInsert);
