/**
 * <to-toast>: the one voice. Anything on the page says something with toast('Link copied'); it is shown for a
 * moment and read out by a screen reader. What is shown and what is said are two elements: the toast seen
 * (aria-hidden) and a status region heard. While a modal dialog is open the page outside it is inert, and a region
 * there is never heard, so the words are said by an sr-only region inside the topmost modal (made once per dialog),
 * else by the page's own. A region is emptied, then given the words on the next frame, so the same words twice are
 * said twice.
 */
import { LitElement, html } from 'lit';

export const TOAST = 'to-toast';
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST, { detail: message }));
}

/** The region a dialog's words are said in: made the first time it is wanted, kept with the dialog. */
function regionIn(d: HTMLDialogElement): HTMLElement {
  let r = d.querySelector<HTMLElement>(':scope > .to-said');
  if (!r) {
    r = document.createElement('div');
    r.className = 'sr-only to-said';
    r.setAttribute('role', 'status');
    d.append(r);
  }
  return r;
}

export class ToToast extends LitElement {
  static properties = { message: { state: true } };
  declare message: string;
  private timer = 0;
  private frame = 0;
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
  /** Every region that may hold words: the page's and each dialog's. */
  private regions(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('dialog > .to-said'), ...this.querySelectorAll<HTMLElement>('.to-said')];
  }
  private onToast = (e: Event) => {
    const words = (e as CustomEvent<string>).detail;
    this.message = words;
    const modals = [...document.querySelectorAll<HTMLDialogElement>('dialog')].filter((d) => d.matches(':modal'));
    const top = modals[modals.length - 1];
    const region = top ? regionIn(top) : this.querySelector<HTMLElement>('.to-said');
    for (const r of this.regions()) r.textContent = '';
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => region && (region.textContent = words));
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.message = '';
      for (const r of this.regions()) r.textContent = '';
    }, 2500);
  };
  render() {
    return html`<div class="to-toast ${this.message ? 'shown' : ''}" aria-hidden="true">${this.message}</div>
      <div class="sr-only to-said" role="status"></div>`;
  }
}
customElements.define('to-toast', ToToast);
