/**
 * <to-toast>: the one live region. Anything on the page says something with toast('Link copied'); it is
 * shown for a moment and read out by a screen reader (role=status).
 */
import { LitElement, html } from 'lit';

export const TOAST = 'to-toast';
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST, { detail: message }));
}

export class ToToast extends LitElement {
  static properties = { message: { state: true } };
  declare message: string;
  private timer = 0;
  constructor() {
    super();
    this.message = '';
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(TOAST, this.onToast);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(TOAST, this.onToast);
  }
  private onToast = (e: Event) => {
    this.message = (e as CustomEvent<string>).detail;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.message = ''), 2500);
  };
  render() {
    return html`<div class="to-toast ${this.message ? 'shown' : ''}" role="status" aria-live="polite">${this.message}</div>`;
  }
}
customElements.define('to-toast', ToToast);
