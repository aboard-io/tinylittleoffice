/**
 * <to-header>: a page's header in the site's look, for a page that is not the site and has no <to-shell>
 * (docs/library.md, A page's header): the way back up (breadcrumbs), the page's title, and room for the page's own
 * search and actions. On a narrow page the search takes a row of its own under the rest.
 *
 * - `heading`: the title. `editable`: the title is a field (Enter or leaving it keeps a new one, told in
 *   `titlechange`, `{ title }`; Escape puts the old one back). A `heading` the page gives while the field has the focus
 *   (a route changed under it) is the field's words from then on, and leaving it tells nothing of the words before.
 *   `level`: the heading's level (1).
 * - A long title wraps to two lines before it is cut short; a title that is a field, one line, is drawn smaller (to
 *   three quarters of its size) before it is. Beside the search, the search gives way first, down to its least.
 * - `crumbs`: the way back up, `{ label, href? }` each (Crumb), from the top. One with an address is a link; one without
 *   is a button. Either is told in `crumbpick`, cancelable, `{ index, crumb }`: a page that routes itself prevents the
 *   link and goes there its own way.
 * - Slots (kit/ui/slots.ts): `start` before the title (an icon, a back button), `search` (a <to-search>, say) and
 *   `actions` at the end (buttons, a menu).
 */
import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
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
  /** The title the field last took (as it took the focus, or kept, or was given while it had it): a heading other than it was given by the page. */
  private took = '';
  private sized: ResizeObserver | null = null;

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
  connectedCallback() {
    super.connectedCallback();
    this.sized = new ResizeObserver(() => this.fit());
    this.sized.observe(this);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.sized?.disconnect();
    this.sized = null;
  }
  protected updated(changed: PropertyValues<this>) {
    // A title the page gave while the field has the focus: the field's words now, and the one leaving it would compare with.
    const field = this.field;
    if (changed.has('heading') && field && document.activeElement === field && this.heading !== this.took) {
      field.value = this.heading;
      this.took = this.was = this.heading;
    }
    this.fit();
  }
  /** A title that is a field drawn smaller where its words would be cut short, down to three quarters of its size. */
  private fit() {
    const field = this.field;
    const title = this.querySelector<HTMLElement>('.to-ph-title');
    if (!field || !title) return;
    title.style.removeProperty('--to-ph-k');
    const room = field.clientWidth - 8;
    const need = field.scrollWidth - 8;
    if (room > 0 && need > room) title.style.setProperty('--to-ph-k', String(Math.max(0.75, Math.floor((room / need) * 100) / 100)));
  }
  /** The title's field, when it is editable. */
  get field(): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>('.to-ph-title input');
  }
  /** The title typed kept: told when it changed (and is not empty), else the field shows the title again. */
  private keep(field: HTMLInputElement) {
    // The page gave a title since the field took its words (a route changed before the update drew it): that is the
    // title, and the words in the field, the old one's, are not a new title.
    if (this.heading !== this.took) {
      field.value = this.took = this.was = this.heading;
      return;
    }
    const title = field.value.trim();
    if (title && title !== this.heading) {
      this.took = title;
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
          size=${Math.max(8, [...this.heading].length + 1)}
          aria-label=${t('common-title')}
          @focus=${() => (this.was = this.took = this.heading)}
          @input=${() => this.fit()}
          @keydown=${this.onKey}
          @blur=${(e: FocusEvent) => this.keep(e.currentTarget as HTMLInputElement)}
        />`
      : html`<span class="to-ph-words">${this.heading}</span>`;
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
