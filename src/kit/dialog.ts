/**
 * <to-dialog>: a native <dialog>, modal, with a heading and a close button. Escape closes it, a click on
 * the backdrop too, and focus goes back where it was (the browser's own doing). Give it `body`, a
 * template, and call show(); the body is drawn only while it is open.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';

let n = 0;

export class ToDialog extends LitElement {
  static properties = { heading: {}, body: { attribute: false }, open: { state: true } };
  declare heading: string;
  declare body: TemplateResult | typeof nothing;
  declare open: boolean;
  readonly uid = `to-dialog-${++n}`;

  constructor() {
    super();
    this.heading = '';
    this.body = nothing;
    this.open = false;
  }
  createRenderRoot() {
    return this;
  }
  get dialog(): HTMLDialogElement {
    return this.querySelector('dialog')!;
  }
  async show() {
    this.open = true;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }
  private onClose = () => {
    // The close event comes a moment after close(): shown again in between (a second link asked about), it stays open.
    if (this.dialog.open) return;
    this.open = false;
    this.dispatchEvent(new Event('to-close'));
  };
  render() {
    return html`<dialog class="to-dialog" aria-labelledby=${this.uid} @close=${this.onClose} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-dialog-inner">
        <header class="to-dialog-head"><h2 id=${this.uid}>${this.heading}</h2><button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.close()}>${icon(UI.close)}</button></header>
        <div class="to-dialog-body">${this.open ? this.body : nothing}</div>
      </div>
    </dialog>`;
  }
}
customElements.define('to-dialog', ToDialog);
