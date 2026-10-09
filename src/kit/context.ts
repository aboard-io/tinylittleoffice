/**
 * <to-context>: the small bar that comes up beside the thing in hand (a shape chosen on a canvas, a run of
 * rows, some words selected) with what can be done to it right there, and goes when the thing is let go.
 * It is a manual popover in the top layer, placed centred under its anchor (above it when there is no room
 * below), kept inside the visual viewport (above a phone's keyboard) and moved with the anchor as the page
 * scrolls. Its buttons never take the focus (an editor's selection stays, a phone's keyboard stays up), so a
 * host sets `items` and calls show(anchor) and hide(); the anchor is an element or a function giving a rect.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { tool } from './bar.ts';
import type { IconNode } from './icons.ts';

export interface ContextItem {
  label: string;
  icon?: IconNode;
  /** A colour shown as a dot in the icon's place. */
  swatch?: string;
  /** Words shown on the button instead of an icon ("S", "M", "L"). */
  text?: string;
  /** Given, the button is a state: aria-pressed. */
  pressed?: boolean;
  disabled?: boolean;
  /** The keys, for the tooltip: "Mod+D". */
  keys?: string;
  does(): void;
}
/** A gap between groups. */
export const SEP = '|';
export type ContextEntry = ContextItem | typeof SEP;

type Anchor = HTMLElement | (() => DOMRect | null);
const GAP = 6;

export class ToContext extends LitElement {
  static properties = { items: { attribute: false }, label: {} };
  declare items: ContextEntry[];
  declare label: string;
  private anchor: Anchor | null = null;
  private soon = 0;

  constructor() {
    super();
    this.items = [];
    this.label = '';
  }
  createRenderRoot() {
    return this;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatch();
  }
  private get pop(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > .to-context');
  }
  get isOpen(): boolean {
    return !!this.pop?.matches(':popover-open');
  }

  /** Up beside the anchor; called again, it moves to a new anchor. */
  show(anchor: Anchor) {
    this.anchor = anchor;
    void this.updateComplete.then(() => {
      const pop = this.pop;
      if (!pop || !this.isConnected) return;
      if (!pop.matches(':popover-open')) {
        try {
          pop.showPopover();
        } catch {
          return;
        }
        this.watch();
      }
      this.refresh();
    });
  }
  hide() {
    this.anchor = null;
    this.unwatch();
    const pop = this.pop;
    if (pop?.matches(':popover-open')) pop.hidePopover();
  }
  /** Put it where the anchor is now. */
  refresh = () => {
    const pop = this.pop;
    const a = this.anchor;
    if (!pop || !a || !pop.matches(':popover-open')) return;
    const rect = typeof a === 'function' ? a() : a.isConnected ? a.getBoundingClientRect() : null;
    if (!rect) return void this.hide();
    const vv = window.visualViewport;
    const top0 = vv?.offsetTop ?? 0;
    const left0 = vv?.offsetLeft ?? 0;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const r = pop.getBoundingClientRect();
    let top = rect.bottom + GAP;
    if (top + r.height > top0 + vh - GAP && rect.top - GAP - r.height >= top0) top = rect.top - GAP - r.height;
    top = Math.max(top0 + GAP, Math.min(top, top0 + vh - r.height - GAP));
    const left = Math.max(left0 + GAP, Math.min(rect.left + rect.width / 2 - r.width / 2, left0 + vw - r.width - GAP));
    pop.style.top = `${Math.round(top)}px`;
    pop.style.left = `${Math.round(left)}px`;
  };
  private refreshSoon = () => {
    if (this.soon) return;
    this.soon = requestAnimationFrame(() => {
      this.soon = 0;
      this.refresh();
    });
  };
  private watch() {
    document.addEventListener('scroll', this.refreshSoon, { capture: true, passive: true });
    window.addEventListener('resize', this.refreshSoon);
    window.visualViewport?.addEventListener('resize', this.refreshSoon);
    window.visualViewport?.addEventListener('scroll', this.refreshSoon);
  }
  private unwatch() {
    document.removeEventListener('scroll', this.refreshSoon, { capture: true });
    window.removeEventListener('resize', this.refreshSoon);
    window.visualViewport?.removeEventListener('resize', this.refreshSoon);
    window.visualViewport?.removeEventListener('scroll', this.refreshSoon);
    if (this.soon) cancelAnimationFrame(this.soon);
    this.soon = 0;
  }
  protected updated() {
    if (this.isOpen) this.refreshSoon();
  }

  private renderItem(it: ContextEntry): TemplateResult {
    if (it === SEP) return html`<span class="to-context-sep" role="separator"></span>`;
    if (it.swatch !== undefined)
      return html`<button type="button" class="to-btn to-tool to-context-swatch" ?disabled=${it.disabled} aria-label=${it.label} title=${it.label} aria-pressed=${it.pressed === undefined ? nothing : String(it.pressed)} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => it.does()}><span class="to-swatch" style="--swatch:${it.swatch}" aria-hidden="true"></span></button>`;
    if (it.text !== undefined)
      return html`<button type="button" class="to-btn to-tool to-context-text" ?disabled=${it.disabled} aria-label=${it.label} title=${it.label} aria-pressed=${it.pressed === undefined ? nothing : String(it.pressed)} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => it.does()}>${it.text}</button>`;
    return tool({ label: it.label, icon: it.icon, pressed: it.pressed, disabled: it.disabled, keys: it.keys, keep: true, does: () => it.does() });
  }
  render() {
    return html`<div class="to-context" popover="manual" role="toolbar" aria-label=${this.label || nothing}>${this.items.map((it) => this.renderItem(it))}</div>`;
  }
}
if (!customElements.get('to-context')) customElements.define('to-context', ToContext);

declare global {
  interface HTMLElementTagNameMap {
    'to-context': ToContext;
  }
}
