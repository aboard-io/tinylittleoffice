/**
 * <to-dialog>: a native <dialog>, modal, with a heading and a close button. Escape closes it, a click on
 * the backdrop too, and focus goes back where it was (the browser's own doing, and this element's where the browser's
 * finds nothing: a frame whose page had it). Give it `body`, a
 * template, and call show(); the body is drawn only while it is open.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';

let n = 0;

/**
 * The focus given back to `from` when a dialog over it closes: to the button of the menu `from` was in if that menu has
 * closed meanwhile, and to the document's column where nothing it names can take it. (The palette's too: kit/palette.ts.)
 */
export function focusBack(from: HTMLElement | null) {
  const menu = from?.closest('[popover]:not(:popover-open)')?.closest('to-menu')?.querySelector<HTMLElement>(':scope > button');
  const to = menu ?? from;
  if (to?.isConnected) to.focus({ preventScroll: true });
  const at = document.activeElement;
  if (!at || at === document.body || at.closest('dialog:not([open])')) document.querySelector<HTMLElement>('main.to-main')?.focus({ preventScroll: true });
}

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
  /** What had the focus when it opened: it has it again when it closes. */
  private from: HTMLElement | null = null;
  async show() {
    if (!this.dialog?.open) this.from = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
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
    // The browser gives the focus back itself, but not to a frame whose page had it: then it is given here.
    const at = document.activeElement;
    const from = this.from;
    this.from = null;
    if (!at || at === document.body || this.contains(at)) focusBack(from);
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
