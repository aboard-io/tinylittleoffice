/**
 * <to-context>: the small bar that comes up beside the thing in hand (a shape chosen on a canvas, a run of
 * rows, some words selected) with what can be done to it right there, and goes when the thing is let go.
 * It is a manual popover in the top layer, placed centred under its anchor (above it when there is no room
 * below), kept inside the visual viewport (above a phone's keyboard) and moved with the anchor as the page
 * scrolls. Its buttons never take the focus (an editor's selection stays, a phone's keyboard stays up), so a
 * host sets `items` and calls show(anchor) and hide(); the anchor is an element or a function giving a rect.
 * show(anchor, 'above') puts it above the anchor where there is room (below where there is not).
 *
 * On a phone (a coarse pointer) nothing floats: iOS draws its selection callout over whatever is near the words,
 * and no page can stop it over editable text (Paul, 2026-10-10: "Our menu keeps getting obscured under the native
 * copy paste menu"). So there the bar is a row of the bottom bar, `docked`: across the column's foot, where the app's
 * bar is, which slides away while it is up (`data-context-row` on the root; page.css) and back when it goes, with the
 * chrome's glide. `hint` is a line under the row (Paste refused: use the keyboard's).
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { tool } from './bar.ts';
import { coarse } from '../core/commands.ts';
import type { IconNode } from '../draw/icons.ts';
import { room } from './scroll.ts';

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
/** The bars docked now (a phone): while any is, the app's bar steps aside. */
const docked = new Set<object>();
const GAP = 6;

export class ToContext extends LitElement {
  static properties = { items: { attribute: false }, label: {}, hint: {} };
  declare items: ContextEntry[];
  declare label: string;
  /** A line under the buttons ('' for none); cleared when the bar goes. */
  declare hint: string;
  private anchor: Anchor | null = null;
  private side: 'below' | 'above' = 'below';
  private soon = 0;

  constructor() {
    super();
    this.items = [];
    this.label = '';
    this.hint = '';
  }
  createRenderRoot() {
    return this;
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatch();
    this.dock(false);
  }
  private get pop(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > .to-context');
  }
  get isOpen(): boolean {
    return !!this.pop?.matches(':popover-open');
  }

  /** Up beside the anchor; called again, it moves to a new anchor. */
  show(anchor: Anchor, side: 'below' | 'above' = 'below') {
    this.anchor = anchor;
    this.side = side;
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
    this.hint = '';
    this.unwatch();
    this.dock(false);
    const pop = this.pop;
    if (pop?.matches(':popover-open')) pop.hidePopover();
  }
  /** A row of the bottom bar (on a phone): the app's bar steps aside for it (page.css reads the root's attribute). */
  private dock(on: boolean) {
    this.pop?.toggleAttribute('data-docked', on);
    if (on) docked.add(this);
    else docked.delete(this);
    document.documentElement.toggleAttribute('data-context-row', docked.size > 0);
  }
  /** Put it where the anchor is now. */
  refresh = () => {
    const pop = this.pop;
    const a = this.anchor;
    if (!pop || !a || !pop.matches(':popover-open')) return;
    const rect = typeof a === 'function' ? a() : a.isConnected ? a.getBoundingClientRect() : null;
    if (!rect) return void this.hide();
    const box = room();
    const [top0, left0, vw, vh] = [box.top, box.left, box.right - box.left, box.bottom - box.top];
    if (coarse()) {
      // Docked: across the foot of the column, where the bottom bar is, whatever the anchor.
      this.dock(true);
      pop.style.left = `${Math.round(left0)}px`;
      pop.style.width = `${Math.round(vw)}px`;
      pop.style.top = `${Math.round(top0 + vh - pop.getBoundingClientRect().height)}px`;
      return;
    }
    this.dock(false);
    pop.style.width = '';
    const r = pop.getBoundingClientRect();
    const above = rect.top - GAP - r.height;
    let top = rect.bottom + GAP;
    if (this.side === 'above' && above >= top0) top = above;
    else if (top + r.height > top0 + vh - GAP && above >= top0) top = above;
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
    return html`<div class="to-context" popover="manual" role="toolbar" aria-label=${this.label || nothing}>${this.items.map((it) => this.renderItem(it))}${this.hint ? html`<p class="to-context-hint" role="status">${this.hint}</p>` : nothing}</div>`;
  }
}
if (!customElements.get('to-context')) customElements.define('to-context', ToContext);

declare global {
  interface HTMLElementTagNameMap {
    'to-context': ToContext;
  }
}
