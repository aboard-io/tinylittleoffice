/**
 * <to-toast>: the one voice. Anything on the page says something with toast('Link copied') (kit/core/say.ts); it is shown long enough to
 * read (`toastTime`: four seconds, more for more words) and held while a pointer is on it. What is shown and what is said
 * are two elements: the toast seen (aria-hidden) and a status region heard. While a modal dialog is open the page outside
 * it is inert, and a region there is never heard, so the words are said by an sr-only region inside the topmost modal
 * (made once per dialog), else by the page's own, chosen on the frame they are said (a dialog closed meanwhile is not
 * where the person is). A region is emptied, then given the words on the next frame, so the same words twice are said
 * twice.
 *
 * A toast with an action (say.ts) draws it as a button after the words, named by its label, and stays while the button
 * has the focus as while a pointer is on it; the button runs the action and the toast goes, as Escape inside it lets
 * it go. The words are still said by the region, and only the button is heard in the toast itself.
 */
import { LitElement, html, nothing } from 'lit';
import { TOAST, type Action } from '../core/say.ts';

/** How long a message is shown, in ms: four seconds at least, and a second and a half more than 60ms a character. */
const toastTime = (message: string): number => Math.max(4000, 1500 + 60 * message.length);

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
  static properties = { message: { state: true }, action: { state: true } };
  declare message: string;
  /** What the toast offers beside its words, or null. */
  declare action: Action | null;
  private timer = 0;
  /** What is left of the time shown while a pointer holds it (null: it is counting down). */
  private left: number | null = null;
  private ends = 0;
  private frame = 0;
  constructor() {
    super();
    this.message = '';
    this.action = null;
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
    this.action = (e as CustomEvent<string> & { action?: Action }).action ?? null;
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
    this.timer = window.setTimeout(this.gone, ms);
  }
  private gone = () => {
    clearTimeout(this.timer);
    this.message = '';
    this.action = null;
    for (const r of this.regions()) r.textContent = '';
  };
  private hold = () => {
    if (!this.message || this.left !== null) return;
    clearTimeout(this.timer);
    this.left = Math.max(0, this.ends - Date.now());
  };
  /** Let go when neither a pointer nor the focus is on it: what leaves, and where the focus goes (a focusout's next). */
  private go = (e: Event) => {
    const box = e.currentTarget as HTMLElement;
    const held = e instanceof FocusEvent ? box.contains(e.relatedTarget as Node | null) || box.matches(':hover') : box.contains(document.activeElement);
    if (this.left === null || held) return;
    const ms = this.left;
    this.left = null;
    this.count(ms);
  };
  private act = () => {
    const does = this.action?.does;
    this.gone();
    does?.();
  };
  render() {
    const a = this.action;
    return html`<div
        class="to-toast ${this.message ? 'shown' : ''} ${a ? 'act' : ''}"
        aria-hidden=${a ? nothing : 'true'}
        @pointerenter=${this.hold}
        @pointerleave=${this.go}
        @focusin=${this.hold}
        @focusout=${this.go}
        @keydown=${(e: KeyboardEvent) => e.key === 'Escape' && this.gone()}
      >${a ? html`<span aria-hidden="true">${this.message}</span><button type="button" class="to-btn" aria-label=${a.label} @click=${this.act}>${a.label}</button>` : this.message}</div>
      <div class="sr-only to-said" role="status"></div>`;
  }
}
customElements.define('to-toast', ToToast);
