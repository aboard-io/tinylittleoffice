/**
 * <to-section>: one part of a host's page (docs/library.md, The kit's small pieces): a heading with how many things
 * it holds, the page's own actions beside it (Add, a menu), and the things themselves, the page's children, drawn
 * under them; or, with nothing in it, the words the page gives for that. A person's projects, a lead's meetings, a
 * company's people, each a section of a record's page, in one look.
 *
 * - `heading`: its name. `count`: how many it holds, drawn after the name; null for none said. `level`: the
 *   heading's (2). `empty`: what an empty section says ("No meetings yet"), drawn where `count` is 0, or where the
 *   section has no child of its own (a child given with a `slot` is not one).
 * - Slot (kit/ui/slots.ts): `actions`, at the heading's end (a button, a menu). Everything else the page puts in the
 *   section is its body, left where the page put it, under the heading: a <to-table>, a list, anything.
 */
import { LitElement, html, nothing } from 'lit';
import { Slots } from './slots.ts';

let n = 0;

export class ToSection extends LitElement {
  static properties = {
    heading: {},
    count: { type: Number },
    level: { type: Number },
    empty: {},
  };
  declare heading: string;
  declare count: number | null;
  declare level: number;
  declare empty: string;
  readonly uid = `to-section-${++n}`;
  private slots = new Slots(this);
  private watch: MutationObserver | null = null;
  /** Whether the body had a child of its own when it was last drawn. */
  private had = false;

  constructor() {
    super();
    this.heading = '';
    this.count = null;
    this.level = 2;
    this.empty = '';
  }
  createRenderRoot() {
    this.slots.take();
    // The heading goes before the page's children, which are the body; Lit draws it there from now on.
    this.renderOptions.renderBefore ??= this.firstChild;
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-labelledby', `${this.uid}-h`);
    this.watch ??= new MutationObserver(() => this.has !== this.had && this.requestUpdate());
    this.watch.observe(this, { childList: true });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.watch?.disconnect();
    this.watch = null;
  }
  /** Whether the page gave the section a body: a child of its own, beside what is drawn here and the slots. */
  get has(): boolean {
    return [...this.children].some((el) => !el.hasAttribute('slot') && !el.classList.contains('to-sec-head') && !el.classList.contains('to-sec-empty'));
  }
  render() {
    const level = Math.min(6, Math.max(1, this.level || 2));
    this.had = this.has;
    const empty = this.empty && (this.count === 0 || (this.count === null && !this.had));
    return html`<header class="to-sec-head">
        <div class="to-sec-title" id="${this.uid}-h" role="heading" aria-level=${level}>
          <span class="to-sec-words">${this.heading}</span>
          ${this.count === null ? nothing : html`<span class="to-sec-count">${this.count}</span>`}
        </div>
        <div class="to-sec-actions">${this.slots.get('actions')}</div>
      </header>
      ${empty ? html`<p class="to-sec-empty to-empty">${this.empty}</p>` : nothing}`;
  }
}
if (!customElements.get('to-section')) customElements.define('to-section', ToSection);

declare global {
  interface HTMLElementTagNameMap {
    'to-section': ToSection;
  }
}
