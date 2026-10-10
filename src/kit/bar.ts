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
import { drawnIn, keysText, run, type Command } from './commands.ts';

export { keysText };

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
  /** What more there is to say than the label's two words, as the tooltip ("Use the grid as the drawing's background"). */
  hint?: string;
}

// Cancelled on mousedown, not pointerdown: a tap in WebKit whose pointerdown is cancelled fires no click at all, while
// cancelling the compatibility mousedown (which is what would move the focus) still lets the click through.
const keepFocus = (e: Event) => e.preventDefault();

const tip = (o: BtnOpts) => (o.keys ? `${o.hint ?? o.label} (${keysText(o.keys)})` : (o.hint ?? o.label));

/** A button with its words on it (two at most, so the bar never wraps them; `hint` says the rest), and an icon before them if it has one. */
export const btn = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn ${o.cls ?? ''}" ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} title=${o.keys || o.hint ? tip(o) : nothing} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}<span>${o.label}</span></button>`;

/** An icon button: its name is spoken and shown as a tooltip. */
export const tool = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn to-tool ${o.cls ?? ''}" ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} aria-label=${o.label} title=${tip(o)} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}</button>`;

/**
 * A command of the registry (kit/commands.ts) as a bar's icon button, in its context: its words, icon and keys, its
 * pressed state, disabled where it is not to be done now (or where there is no context: nothing in hand), and nothing
 * at all where it is not in force (`when`). `over` changes what the bar needs changed (a class; `disabled` given, the
 * button stays in its place, off, where the command is not in force: a bar that keeps its buttons where they are).
 */
export function cmdTool<C>(cmd: Command<C>, c: C | null | undefined, over: Partial<BtnOpts> = {}): TemplateResult | typeof nothing {
  const has = c !== null && c !== undefined;
  if (has && cmd.when && !cmd.when(c) && over.disabled === undefined) return nothing;
  return tool({
    label: cmd.label(has ? c : undefined),
    icon: cmd.icon,
    keys: cmd.keys,
    hint: cmd.hint?.(has ? c : undefined),
    keep: !cmd.takesFocus,
    pressed: cmd.pressed ? has && cmd.pressed(c) : undefined,
    disabled: !has || !!cmd.disabled?.(c),
    does: (e) => void (has && run(cmd, c, e)),
    ...over,
    cls: `${over.cls ?? ''} cmd-${cmd.id.replace(/\./g, '-')}`.trim(),
  });
}
/** A command that is a menu (`menu`), as the bar's <to-menu>: its items the commands drawn in `menu:<name>` among `all`. */
export const cmdMenu = <C>(cmd: Command<C>, c: C, all: readonly Command<C>[], cls = '', opts: { caret?: boolean; words?: boolean; icon?: IconNode; keep?: boolean } = {}): TemplateResult =>
  html`<to-menu class="${cls} cmd-${cmd.id.replace(/\./g, '-')}" ?icon-only=${!opts.words} ?caret=${!!opts.caret} ?keep=${!!opts.keep} .label=${cmd.label(c)} .icon=${opts.icon ?? cmd.icon ?? null} .items=${drawnIn(all, `menu:${cmd.menu}`, c)}></to-menu>`;

/** The same as a button with its words on it (btn): a command whose words say more than an icon would (Connect, Preview). */
export function cmdBtn<C>(cmd: Command<C>, c: C | null | undefined, over: Partial<BtnOpts> = {}): TemplateResult | typeof nothing {
  const has = c !== null && c !== undefined;
  if (has && cmd.when && !cmd.when(c) && over.disabled === undefined) return nothing;
  return btn({
    label: cmd.label(has ? c : undefined),
    icon: cmd.icon,
    keys: cmd.keys,
    hint: cmd.hint?.(has ? c : undefined),
    keep: !cmd.takesFocus,
    pressed: cmd.pressed ? has && cmd.pressed(c) : undefined,
    disabled: !has || !!cmd.disabled?.(c),
    does: (e) => void (has && run(cmd, c, e)),
    ...over,
    cls: `${over.cls ?? ''} cmd-${cmd.id.replace(/\./g, '-')}`.trim(),
  });
}

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
