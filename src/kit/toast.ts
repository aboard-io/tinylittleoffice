/**
 * <to-toast>: the one voice. Anything on the page says something with toast('Link copied'); it is shown long enough to
 * read (`toastTime`: four seconds, more for more words) and held while a pointer is on it. What is shown and what is said
 * are two elements: the toast seen (aria-hidden) and a status region heard. While a modal dialog is open the page outside
 * it is inert, and a region there is never heard, so the words are said by an sr-only region inside the topmost modal
 * (made once per dialog), else by the page's own, chosen on the frame they are said (a dialog closed meanwhile is not
 * where the person is). A region is emptied, then given the words on the next frame, so the same words twice are said
 * twice.
 */
import { LitElement, html } from 'lit';

export const TOAST = 'to-toast';
/** How long a message is shown, in ms: four seconds at least, and a second and a half more than 60ms a character. */
export const toastTime = (message: string): number => Math.max(4000, 1500 + 60 * message.length);
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
  /** What is left of the time shown while a pointer holds it (null: it is counting down). */
  private left: number | null = null;
  private ends = 0;
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
    this.left = null;
    for (const r of this.regions()) r.textContent = '';
    cancelAnimationFrame(this.frame);
    // Where the person is on that frame: a dialog that said it and closed at once (the leave dialog's Turn on Saved) is gone by then.
    this.frame = requestAnimationFrame(() => {
      const modals = [...document.querySelectorAll<HTMLDialogElement>('dialog')].filter((d) => d.matches(':modal'));
      const top = modals[modals.length - 1];
      const region = top ? regionIn(top) : this.querySelector<HTMLElement>('.to-said');
      if (region) region.textContent = words;
    });
    this.count(toastTime(words));
  };
  private count(ms: number) {
    clearTimeout(this.timer);
    this.ends = Date.now() + ms;
    this.timer = window.setTimeout(() => {
      this.message = '';
      for (const r of this.regions()) r.textContent = '';
    }, ms);
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
    return html`<div class="to-toast ${this.message ? 'shown' : ''}" aria-hidden="true" @pointerenter=${this.hold} @pointerleave=${this.go}>${this.message}</div>
      <div class="sr-only to-said" role="status"></div>`;
  }
}
customElements.define('to-toast', ToToast);
