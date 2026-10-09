/**
 * <to-bar>: the one bar an app has. A single row that scrolls sideways when it must; a fade at either edge
 * says there is more (data-fade-start, data-fade-end: set here, drawn by the stylesheet). The buttons in
 * it are made with tool() and btn(): real <button>s, named, 44px to the finger, aria-pressed when they
 * are a state; dateNav() is the group an app with dates has (back, what is on view, on, Today).
 */
import { html, nothing, type TemplateResult } from 'lit';
import { ChevronLeft, ChevronRight } from 'lucide';
import { icon, type IconNode } from './icons.ts';
import { t } from './i18n.ts';

export class ToBar extends HTMLElement {
  private watch: ResizeObserver | null = null;
  private soon = 0;
  connectedCallback() {
    this.setAttribute('role', 'toolbar');
    this.addEventListener('scroll', this.fade, { passive: true });
    this.watch = new ResizeObserver(() => this.fadeSoon());
    this.watch.observe(this);
    new MutationObserver(() => this.fadeSoon()).observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'class'] });
    this.fadeSoon();
  }
  disconnectedCallback() {
    this.removeEventListener('scroll', this.fade);
    this.watch?.disconnect();
    this.watch = null;
  }
  private fadeSoon() {
    if (this.soon) return;
    this.soon = requestAnimationFrame(() => {
      this.soon = 0;
      this.fade();
    });
  }
  /** What the edges say: scrolled past the start, more past the end. */
  fade = () => {
    const more = this.scrollWidth - this.clientWidth - this.scrollLeft;
    this.toggleAttribute('data-fade-start', this.scrollLeft > 1);
    this.toggleAttribute('data-fade-end', more > 1);
  };
}
customElements.define('to-bar', ToBar);

export interface BtnOpts {
  /** The button's name: shown by btn(), spoken (and a tooltip) by tool(). */
  label: string;
  icon?: IconNode;
  does?: (e: Event) => void;
  /** Given, the button is a state: aria-pressed. */
  pressed?: boolean;
  disabled?: boolean;
  cls?: string;
  /** The keys, for the tooltip: "Mod+B" is written as the device writes it. */
  keys?: string;
  /** The button never takes the focus: an editor's selection stays where it is, and a phone's keyboard stays up. */
  keep?: boolean;
}

// Cancelled on mousedown, not pointerdown: a tap in WebKit whose pointerdown is cancelled fires no click at all, while
// cancelling the compatibility mousedown (which is what would move the focus) still lets the click through.
const keepFocus = (e: Event) => e.preventDefault();

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** "Mod+B" as this device writes it: ⌘B on a Mac, Ctrl+B elsewhere. */
export const keysText = (keys: string) => (mac ? keys.replace('Mod+', '⌘').replace('Shift+', '⇧').replace('Alt+', '⌥') : keys.replace('Mod+', 'Ctrl+'));

const tip = (o: BtnOpts) => (o.keys ? `${o.label} (${keysText(o.keys)})` : o.label);

/** A button with its words on it, and an icon before them if it has one. */
export const btn = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn ${o.cls ?? ''}" ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} title=${o.keys ? tip(o) : nothing} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}<span>${o.label}</span></button>`;

/** An icon button: its name is spoken and shown as a tooltip. */
export const tool = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn to-tool ${o.cls ?? ''}" ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} aria-label=${o.label} title=${tip(o)} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}</button>`;

export interface DateNavOpts {
  /** What is on view: "March 2027". */
  label: string;
  /** The two arrows' names: "Previous month", "A week earlier". */
  prev: string;
  next: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/**
 * Where an app with dates is: back, what is on view, on, and Today. A group in the bar, the arrows icon
 * buttons with their names, Today words on a button.
 */
export const dateNav = (o: DateNavOpts): TemplateResult =>
  html`<span class="to-datenav" role="group" aria-label=${o.label}>${tool({ label: o.prev, icon: ChevronLeft, does: o.onPrev })}<span class="to-datenav-label" aria-live="polite">${o.label}</span>${tool({ label: o.next, icon: ChevronRight, does: o.onNext })}${btn({ label: t('Today'), cls: 'to-datenav-today', does: o.onToday })}</span>`;
