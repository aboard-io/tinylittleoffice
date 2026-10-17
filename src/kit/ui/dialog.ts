/**
 * <to-dialog>: a native <dialog>, modal, with a heading and a close button. Escape closes it, a click on
 * the backdrop too, and focus goes back where it was (the browser's own doing, and this element's where the browser's
 * finds nothing: a frame whose page had it). Give it `body`, a
 * template, and call show(); the body is drawn only while it is open. `describedby`, the ids of elements in the body,
 * is the dialog's description: what a screen reader says after its name as it opens (the link guard's host).
 *
 * One modal at a time (Paul, 2026-10-10: "the outer one hands over"): a dialog opened from a control inside another is
 * never stacked on it. A task with a step of its own (Share's Password…) steps aside with handOver() and comes back as it
 * was; a menu (the drawer, kit/ui/drawer.ts) closes first and names the way back with handBack().
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';

let n = 0;

/**
 * The focus given back to `from` when a dialog over it closes: to the button of the menu `from` was in if that menu has
 * closed meanwhile, and to the document's column where nothing it names can take it. (The drawer's too: kit/ui/drawer.ts.)
 */
export function focusBack(from: HTMLElement | null) {
  const menu = from?.closest('[popover]:not(:popover-open)')?.closest('to-menu')?.querySelector<HTMLElement>(':scope > button');
  const to = menu ?? from;
  if (to?.isConnected) to.focus({ preventScroll: true });
  const at = document.activeElement;
  if (!at || at === document.body || at.closest('dialog:not([open])')) document.querySelector<HTMLElement>('main.to-main')?.focus({ preventScroll: true });
}

/**
 * A menu's row that opens a dialog: the menu (`close`) closes first, the focus is put on `back` (the button the menu
 * was opened from), and `open` opens the dialog. The dialog's way back is then `back`: the browser's own, and a
 * <to-dialog>'s `from`, are where the focus was as it opened. The menu does not come back.
 */
export function handBack(close: () => void, back: HTMLElement | null, open: () => unknown) {
  close();
  if (back?.isConnected) back.focus({ preventScroll: true });
  return open();
}

export class ToDialog extends LitElement {
  static properties = { heading: {}, describedby: {}, body: { attribute: false }, open: { state: true } };
  declare heading: string;
  declare describedby: string;
  declare body: TemplateResult | typeof nothing;
  declare open: boolean;
  readonly uid = `to-dialog-${++n}`;

  constructor() {
    super();
    this.heading = '';
    this.describedby = '';
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
  /** Stepped aside for another (handOver): closed, its body (and so its scroll) and its `from` kept, no to-close said. */
  private aside: { back: HTMLElement } | null = null;
  async show() {
    // Nothing that edits opens inside a read-only editor (kit/core/element.ts).
    if (this.closest('[readonly]')) return;
    if (!this.dialog?.open && !this.aside) this.from = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const aside = this.aside;
    this.aside = null;
    this.open = true;
    await this.updateComplete;
    if (!this.dialog.open) this.dialog.showModal();
    if (aside?.back.isConnected) aside.back.focus({ preventScroll: true });
  }
  /**
   * A step of this dialog's task in a dialog of its own (`next`, opened from `back`, a control in this one): this one
   * closes and `next` opens, one modal at a time; when `next` closes (its Cancel, Escape, or the thing done) this one is
   * open again as it was, nothing drawn again (what was typed, chosen and scrolled kept), the focus on `back`.
   */
  async handOver(next: ToDialog, back: HTMLElement) {
    this.aside = { back };
    this.dialog.close();
    next.addEventListener('to-close', () => void (this.isConnected && this.aside && this.show()), { once: true });
    await next.show();
  }
  close() {
    if (this.dialog?.open) this.dialog.close();
  }
  private onClose = () => {
    // The close event comes a moment after close(): shown again in between (a second link asked about), it stays open.
    if (this.dialog.open || this.aside) return;
    this.open = false;
    // The browser gives the focus back itself, but not to a frame whose page had it: then it is given here.
    const at = document.activeElement;
    const from = this.from;
    this.from = null;
    if (!at || at === document.body || this.contains(at)) focusBack(from);
    this.dispatchEvent(new Event('to-close'));
  };
  render() {
    return html`<dialog class="to-dialog" aria-labelledby=${this.uid} aria-describedby=${this.describedby || nothing} @close=${this.onClose} @click=${(e: Event) => e.target === this.dialog && this.close()}>
      <div class="to-dialog-inner">
        <header class="to-dialog-head"><h2 id=${this.uid}>${this.heading}</h2><button type="button" class="to-btn to-tool" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.close()}>${icon(UI.close)}</button></header>
        <div class="to-dialog-body">${this.open ? this.body : nothing}</div>
      </div>
    </dialog>`;
  }
}
customElements.define('to-dialog', ToDialog);
