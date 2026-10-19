/**
 * <to-tabs>: a page's views named along a row, one of them current (docs/library.md, The kit's small pieces): a
 * project's Overview, Graph, Model and Documents; a company's People and Model. Each tab is a link to its view's
 * address (`href`), or a button where the page has none; the current one is marked `aria-current` ("page" on a
 * link, "true" on a button), and a count may follow its words. A tab taken is told in `tabpick`, bubbling and
 * cancelable, `{ value, tab }`: a page that routes itself prevents the link and goes there its own way; either way
 * the tab is shown current at once, and a page that keeps the choice elsewhere gives `value` again.
 *
 * - `tabs`: `{ value, label, href?, count?, icon? }` each (Tab), in order. `value`: the current one's. `label`: the
 *   row's name for a screen reader ("Views of this project").
 * - It is a `<nav>` of links, not a tab list: each view has an address of its own and a reader moves between them
 *   with Tab, as between links.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, type IconNode } from '../draw/icons.ts';

/** One tab: the value it stands for, its words, where it opens, how many its view holds, an icon before its words. */
export interface Tab {
  value: string;
  label: string;
  href?: string;
  count?: number;
  icon?: IconNode;
}

export class ToTabs extends LitElement {
  static properties = {
    tabs: { attribute: false },
    value: {},
    label: {},
  };
  declare tabs: Tab[];
  declare value: string;
  /** The row's name, for a screen reader. */
  declare label: string;

  constructor() {
    super();
    this.tabs = [];
    this.value = '';
    this.label = '';
  }
  createRenderRoot() {
    return this;
  }
  private tab(tab: Tab): TemplateResult {
    const current = tab.value === this.value;
    const tell = (e: Event) => {
      const go = this.dispatchEvent(new CustomEvent<{ value: string; tab: Tab }>('tabpick', { detail: { value: tab.value, tab }, bubbles: true, composed: true, cancelable: true }));
      if (!go) e.preventDefault();
      this.value = tab.value;
    };
    const inner = html`${tab.icon ? icon(tab.icon, 16) : nothing}<span class="to-tab-words">${tab.label}</span>${tab.count === undefined ? nothing : html`<span class="to-tab-count">${tab.count}</span>`}`;
    return html`<li>
      ${
        tab.href
          ? html`<a class="to-tab" href=${tab.href} aria-current=${current ? 'page' : nothing} @click=${tell}>${inner}</a>`
          : html`<button type="button" class="to-tab" aria-current=${current ? 'true' : nothing} @click=${tell}>${inner}</button>`
      }
    </li>`;
  }
  render() {
    return html`<nav class="to-tabs" aria-label=${this.label || nothing}>
      <ul class="to-tabs-list">
        ${this.tabs.map((tab) => this.tab(tab))}
      </ul>
    </nav>`;
  }
}
if (!customElements.get('to-tabs')) customElements.define('to-tabs', ToTabs);

declare global {
  interface HTMLElementTagNameMap {
    'to-tabs': ToTabs;
  }
}
