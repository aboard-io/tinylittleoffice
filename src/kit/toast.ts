/**
 * <to-toast>: the one live region. Anything on the page says something with toast('Link copied'); it is
 * shown long enough to read (`toastTime`: four seconds, more for more words), held while a pointer is on it, and read
 * out by a screen reader (role=status).
 */
import { LitElement, html } from 'lit';

export const TOAST = 'to-toast';
/** How long a message is shown, in ms: four seconds at least, and a second and a half more than 60ms a character. */
export const toastTime = (message: string): number => Math.max(4000, 1500 + 60 * message.length);
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST, { detail: message }));
}

export class ToToast extends LitElement {
  static properties = { message: { state: true } };
  declare message: string;
  private timer = 0;
  /** What is left of the time shown while a pointer holds it (null: it is counting down). */
  private left: number | null = null;
  private ends = 0;
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
    this.left = null;
    this.count(toastTime(this.message));
  };
  private count(ms: number) {
    clearTimeout(this.timer);
    this.ends = Date.now() + ms;
    this.timer = window.setTimeout(() => (this.message = ''), ms);
  }
  private hold = () => {
    if (!this.message || this.left !== null) return;
    clearTimeout(this.timer);
    this.left = Math.max(0, this.ends - Date.now());
  };
  private go = () => {
    if (this.left === null) return;
    const ms = this.left;
    this.left = null;
    this.count(ms);
  };
  render() {
    return html`<div class="to-toast ${this.message ? 'shown' : ''}" role="status" aria-live="polite" @pointerenter=${this.hold} @pointerleave=${this.go}>${this.message}</div>`;
  }
}
customElements.define('to-toast', ToToast);
