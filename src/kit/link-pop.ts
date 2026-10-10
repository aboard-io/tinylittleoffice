/**
 * <to-link-pop>: the bubble under a link when the caret is in it: the
 * address, Open, Edit, Remove. `ask()` opens it with a box for the address
 * (making a link, or changing one). A manual popover (nothing dismisses it
 * but the editor), placed from the visual viewport so it sits above a
 * phone's keyboard. A tap outside it and outside its editor (the element
 * it sits in) hides it. Events: link-set (detail: the address, '' to
 * remove), link-remove, link-cancel (Escape in the address box: the editor
 * takes the focus back).
 */
import { LitElement, html, nothing } from 'lit';
import { linkable, linkTarget } from '../doc/index.ts';
import { tool } from './bar.ts';
import { UI } from './icons.ts';
import { t } from './i18n.ts';
import { openLink } from './link-guard.ts';
import { zoomed } from './zoom.ts';

const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

export class ToLinkPop extends LitElement {
  static properties = { href: { state: true }, editing: { state: true }, shown: { state: true } };
  declare href: string;
  declare editing: boolean;
  declare shown: boolean;
  private rect: DOMRect | null = null;

  constructor() {
    super();
    this.href = '';
    this.editing = false;
    this.shown = false;
  }
  createRenderRoot() {
    return this;
  }
  get pop(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > .to-link-pop')!;
  }
  get input(): HTMLInputElement | null {
    return this.querySelector('input');
  }

  /** The bubble for a link the caret is in. */
  show(rect: DOMRect, href: string) {
    this.rect = rect;
    this.href = href;
    this.editing = false;
    void this.reveal();
  }
  /** The bubble with a box for the address, for a link to make or change. */
  ask(rect: DOMRect, href: string) {
    this.rect = rect;
    this.href = href;
    this.editing = true;
    void this.reveal().then(() => {
      const i = this.input;
      i?.focus({ preventScroll: true });
      i?.select();
    });
  }
  private async reveal() {
    this.shown = true;
    await this.updateComplete;
    const p = this.pop;
    if (POPOVER && !p.matches(':popover-open')) p.showPopover();
    this.place();
    window.visualViewport?.addEventListener('resize', this.place);
    document.addEventListener('pointerdown', this.onOutside, true);
  }
  /** A tap on neither the box nor its editor: the box goes (the selection may well not move, a margin is not selectable). */
  private onOutside = (e: PointerEvent) => {
    const at = e.target as Node | null;
    const editor = this.parentElement;
    if (at && (this.contains(at) || editor?.contains(at))) return;
    this.hide();
  };
  hide() {
    if (!this.shown) return;
    this.shown = false;
    this.editing = false;
    window.visualViewport?.removeEventListener('resize', this.place);
    document.removeEventListener('pointerdown', this.onOutside, true);
    const p = this.pop;
    if (POPOVER && p?.matches(':popover-open')) p.hidePopover();
  }
  private place = () => {
    const p = this.pop;
    const r = this.rect;
    if (!p || !r || !this.shown) return;
    const vv = window.visualViewport;
    const top0 = vv?.offsetTop ?? 0;
    const left0 = vv?.offsetLeft ?? 0;
    const w = vv?.width ?? innerWidth;
    const h = vv?.height ?? innerHeight;
    const pw = p.offsetWidth;
    const ph = p.offsetHeight;
    let top = r.bottom + 6;
    if (top + ph > top0 + h && r.top - ph - 6 >= top0) top = r.top - ph - 6;
    const z = zoomed();
    p.style.top = `${Math.round(Math.max(top0 + 4, Math.min(top, top0 + h - ph - 4)) / z)}px`;
    p.style.left = `${Math.round(Math.max(left0 + 4, Math.min(r.left, left0 + w - pw - 4)) / z)}px`;
  };
  private set() {
    const raw = (this.input?.value ?? '').trim();
    const href = raw && !/^(https?:|mailto:|tel:|#)/.test(raw) ? (raw.includes('@') ? `mailto:${raw}` : `https://${raw}`) : raw;
    if (href && !linkable(href)) return this.input?.setCustomValidity(t('Not an address')) ?? undefined;
    this.hide();
    this.dispatchEvent(new CustomEvent<string>('link-set', { detail: href ? linkTarget(href) : '', bubbles: true }));
  }
  private open() {
    // Asked first, as every link that leaves the site is (kit/link-guard.ts).
    openLink(this.href);
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.set();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
      this.dispatchEvent(new CustomEvent('link-cancel', { bubbles: true }));
    }
  };
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.onOutside, true);
  }
  render() {
    const keep = (e: Event) => e.preventDefault();
    const inner = !this.shown
      ? nothing
      : this.editing
        ? html`<input type="url" class="to-link-input" .value=${this.href} placeholder="https://" aria-label=${t('Address')} autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" enterkeyhint="done" @keydown=${this.onKey} @input=${() => this.input?.setCustomValidity('')} />
            ${tool({ label: t('Set link'), icon: UI.check, does: () => this.set() })}`
        : html`<a class="to-link-href" href=${this.href} target="_blank" rel="noopener" title=${this.href} @pointerdown=${keep}>${this.href}</a>
            ${tool({ label: t('Open link'), icon: UI.open, keep: true, does: () => this.open() })}
            ${tool({ label: t('Edit link'), icon: UI.pen, keys: 'Mod+K', keep: true, does: () => this.ask(this.rect!, this.href) })}
            ${tool({ label: t('Remove link'), icon: UI.unlink, keep: true, does: () => (this.hide(), this.dispatchEvent(new CustomEvent('link-remove', { bubbles: true }))) })}`;
    return html`<div class="to-link-pop" popover=${POPOVER ? 'manual' : nothing} role="dialog" aria-label=${t('Link')} ?hidden=${!POPOVER && !this.shown}>${inner}</div>`;
  }
}
if (!customElements.get('to-link-pop')) customElements.define('to-link-pop', ToLinkPop);
