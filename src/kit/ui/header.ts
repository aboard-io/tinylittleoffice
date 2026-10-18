/**
 * <to-header>: a page's header in the site's look, for a page that is not the site and has no <to-shell>
 * (docs/library.md, A page's header): the way back up (breadcrumbs), the page's title, and room for the page's own
 * search and actions. On a narrow page the search takes a row of its own under the rest.
 *
 * - `heading`: the title. `editable`: the title is a field (Enter or leaving it keeps a new one, told in
 *   `titlechange`, `{ title }`; Escape puts the old one back). `level`: the heading's level (1).
 * - `crumbs`: the way back up, `{ label, href? }` each (Crumb), from the top. One with an address is a link; one without
 *   is a button. Either is told in `crumbpick`, cancelable, `{ index, crumb }`: a page that routes itself prevents the
 *   link and goes there its own way.
 * - Slots (kit/ui/slots.ts): `start` before the title (an icon, a back button), `search` (a <to-search>, say) and
 *   `actions` at the end (buttons, a menu).
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { live } from 'lit/directives/live.js';
import { t } from '../core/i18n.ts';
import { Slots } from './slots.ts';

/** One step of the way back up: its words and, where it opens as a link, its address. */
export interface Crumb {
  label: string;
  href?: string;
}

export class ToHeader extends LitElement {
  static properties = {
    heading: {},
    editable: { type: Boolean },
    level: { type: Number },
    crumbs: { attribute: false },
  };
  declare heading: string;
  declare editable: boolean;
  declare level: number;
  declare crumbs: Crumb[];
  private slots = new Slots(this);
  /** The title as it was when the field took the focus: what Escape puts back. */
  private was = '';

  constructor() {
    super();
    this.heading = '';
    this.editable = false;
    this.level = 1;
    this.crumbs = [];
  }
  createRenderRoot() {
    this.slots.take();
    return this;
  }
  /** The title's field, when it is editable. */
  get field(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('.to-ph-title input');
  }
  /** The title typed kept: told when it changed (and is not empty), else the field shows the title again. */
  private keep(field: HTMLInputElement) {
    const title = field.value.trim();
    if (title && title !== this.heading) {
      this.heading = title;
      this.dispatchEvent(new CustomEvent('titlechange', { detail: { title }, bubbles: true, composed: true }));
    } else field.value = this.heading;
  }
  private onKey = (e: KeyboardEvent) => {
    const field = e.currentTarget as HTMLInputElement;
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.keep(field);
      this.was = this.heading;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      field.value = this.was;
      field.blur();
    }
  };
  private crumb(c: Crumb, index: number): TemplateResult {
    const tell = (e: Event) => {
      const go = this.dispatchEvent(new CustomEvent('crumbpick', { detail: { index, crumb: c }, bubbles: true, composed: true, cancelable: true }));
      if (!go) e.preventDefault();
    };
    return html`<li>${c.href ? html`<a href=${c.href} @click=${tell}>${c.label}</a>` : html`<button type="button" @click=${tell}>${c.label}</button>`}</li>`;
  }
  render() {
    const level = Math.min(6, Math.max(1, this.level || 1));
    const title = this.editable
      ? html`<input
          .value=${live(this.heading)}
          aria-label=${t('common-title')}
          @focus=${() => (this.was = this.heading)}
          @keydown=${this.onKey}
          @blur=${(e: FocusEvent) => this.keep(e.currentTarget as HTMLInputElement)}
        />`
      : this.heading;
    return html`<header class="to-ph">
      <div class="to-ph-main">
        ${this.slots.get('start')}
        <div class="to-ph-titles">
          ${this.crumbs.length ? html`<nav aria-label=${t('header-breadcrumbs')}><ol class="to-ph-crumbs">${this.crumbs.map((c, i) => this.crumb(c, i))}</ol></nav>` : nothing}
          <div class="to-ph-title" role="heading" aria-level=${level}>${title}</div>
        </div>
      </div>
      <div class="to-ph-search">${this.slots.get('search')}</div>
      <div class="to-ph-actions">${this.slots.get('actions')}</div>
    </header>`;
  }
}
customElements.define('to-header', ToHeader);
