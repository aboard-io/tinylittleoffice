/**
 * <to-bar>: the one bar an app has. A single row that scrolls sideways when it must; a fade at either edge
 * says there is more (data-fade-start, data-fade-end: set here, drawn by the stylesheet). It is a toolbar: Left and Right
 * walk its buttons, Home and End go to its ends. Its buttons are the registry's commands (kit/core/commands.ts) drawn by
 * cmdTool, cmdBtn and cmdMenu. The buttons in
 * it are made with tool() and btn(): real <button>s, named, 44px to the finger, aria-pressed when they
 * are a state; dateNav() is the group an app with dates has (back, what is on view, on, Today).
 */
import { html, nothing, type TemplateResult } from 'lit';
import { ChevronLeft, ChevronRight } from 'lucide';
import { icon, type IconNode } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { ariaKeys, chords, drawnIn, keysText, labelOf, run, say, type Command } from '../core/commands.ts';

/** Said by a bar as it is put in the page: the chrome makes a bar slid away inert (kit/ui/chrome.ts). */
export const BAR_HERE = 'to-bar-here';

export class ToBar extends HTMLElement {
  private watch: ResizeObserver | null = null;
  private soon = 0;
  connectedCallback() {
    this.setAttribute('role', 'toolbar');
    this.addEventListener('keydown', this.walk);
    this.addEventListener('scroll', this.fade, { passive: true });
    this.watch = new ResizeObserver(() => this.fadeSoon());
    this.watch.observe(this);
    new MutationObserver(() => this.fadeSoon()).observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'class', 'data-tool-group'] });
    this.fadeSoon();
    this.dispatchEvent(new Event(BAR_HERE, { bubbles: true }));
  }
  disconnectedCallback() {
    this.removeEventListener('keydown', this.walk);
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
  /** The bar's buttons and menus, in order: what Left and Right walk (never one inside a menu that is open, nor one turned off). */
  private stops(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('button')].filter((b) => !b.closest('[popover], dialog') && !(b as HTMLButtonElement).disabled && b.offsetParent !== null);
  }
  /**
   * The bar is a toolbar (docs/editing.md §7): Left and Right walk its buttons and menus, round the ends, Home and End
   * to its ends; Tab goes on out of it. A key inside a menu that is open, a field or a box of words is theirs.
   */
  private walk = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const at = e.target as HTMLElement;
    if (at.tagName !== 'BUTTON' || at.closest('[popover], dialog')) return;
    const stops = this.stops();
    const i = stops.indexOf(at);
    if (i < 0) return;
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? stops.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    stops[(to + stops.length) % stops.length].focus();
  };
  /** What the edges say: scrolled past the start, more past the end; and under 360px, room for one pinned tool (Undo) alone. */
  fade = () => {
    let previous: string | undefined;
    for (const child of this.children) {
      if ((child as HTMLElement).hidden) continue;
      const group = child.getAttribute('data-tool-group') ?? '';
      child.toggleAttribute('data-group-start', previous !== undefined && group !== previous);
      previous = group;
    }
    const more = this.scrollWidth - this.clientWidth - this.scrollLeft;
    this.toggleAttribute('data-narrow', this.clientWidth < 360);
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
  /** Under a finger, kept at the bar's inline end outside its scroll (a command's `pinned`: Undo, Redo). */
  pinned?: boolean;
  group?: string;
}

// Cancelled on mousedown, not pointerdown: a tap in WebKit whose pointerdown is cancelled fires no click at all, while
// cancelling the compatibility mousedown (which is what would move the focus) still lets the click through.
const keepFocus = (e: Event) => e.preventDefault();

// The keys are written in the tooltip where there is a keyboard to press them on (commands.ts chords), and are the button's aria-keyshortcuts always.
const tip = (o: BtnOpts) => (o.keys && chords() ? `${o.hint ?? o.label} (${keysText(o.keys)})` : (o.hint ?? o.label));
const cls = (o: BtnOpts) => `${o.cls ?? ''}${o.pinned ? ' to-pin' : ''}`;

/**
 * The keys written at a row's end (a menu's item, the drawer's, a command its search finds), where there is a keyboard
 * to press them on (commands.ts chords); hidden from a screen reader, which hears them from the control's
 * aria-keyshortcuts instead, so they are never part of its name.
 */
export const keysKbd = (keys: string | undefined): TemplateResult | typeof nothing => (keys && chords() ? html`<kbd class="to-menu-keys" aria-hidden="true">${keysText(keys)}</kbd>` : nothing);
/** The keys as the control's aria-keyshortcuts (none: no attribute). */
export const keysAria = (keys: string | undefined): string | typeof nothing => (keys ? ariaKeys(keys) : nothing);

/** A button with its words on it (two at most, so the bar never wraps them; `hint` says the rest), and an icon before them if it has one. */
export const btn = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn ${cls(o)}" data-tool-group=${o.group ?? nothing} ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} aria-keyshortcuts=${o.keys ? ariaKeys(o.keys) : nothing} title=${(o.keys && chords()) || o.hint ? tip(o) : nothing} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}<span>${o.label}</span></button>`;

/** An icon button: its name is spoken and shown as a tooltip. */
export const tool = (o: BtnOpts): TemplateResult =>
  html`<button type="button" class="to-btn to-tool ${cls(o)}" data-tool-group=${o.group ?? nothing} ?disabled=${o.disabled} aria-pressed=${o.pressed === undefined ? nothing : String(o.pressed)} aria-keyshortcuts=${o.keys ? ariaKeys(o.keys) : nothing} aria-label=${o.label} title=${tip(o)} @mousedown=${o.keep ? keepFocus : nothing} @click=${o.does}>${o.icon ? icon(o.icon) : nothing}</button>`;

/**
 * A command of the registry (kit/core/commands.ts) as a bar's icon button, in its context: its words, icon and keys, its
 * pressed state, disabled where it is not to be done now (or where there is no context: nothing in hand), and nothing
 * at all where it is not in force (`when`). `over` changes what the bar needs changed (a class; `disabled` given, the
 * button stays in its place, off, where the command is not in force: a bar that keeps its buttons where they are).
 */
export const cmdTool = <C>(cmd: Command<C>, c: C | null | undefined, over: Partial<BtnOpts> = {}): TemplateResult | typeof nothing => drawCmd(tool, cmd, c, over);
/** The same as a button with its words on it (btn): a command whose words say more than an icon would (Connect, Preview). */
export const cmdBtn = <C>(cmd: Command<C>, c: C | null | undefined, over: Partial<BtnOpts> = {}): TemplateResult | typeof nothing => drawCmd(btn, cmd, c, over);
function drawCmd<C>(draw: (o: BtnOpts) => TemplateResult, cmd: Command<C>, c: C | null | undefined, over: Partial<BtnOpts>): TemplateResult | typeof nothing {
  const has = c !== null && c !== undefined;
  if (has && cmd.when && !cmd.when(c) && over.disabled === undefined) return nothing;
  return draw({
    label: labelOf(cmd, has ? c : undefined),
    icon: cmd.icon,
    keys: cmd.keys,
    hint: say(cmd.hint, has ? c : undefined),
    keep: !cmd.takesFocus,
    pinned: cmd.pinned,
    group: cmd.group,
    pressed: cmd.pressed ? has && cmd.pressed(c) : undefined,
    disabled: !has || !!cmd.disabled?.(c),
    does: (e) => void (has && run(cmd, c, e)),
    ...over,
    cls: `${over.cls ?? ''} cmd-${cmd.id.replace(/\./g, '-')}`.trim(),
  });
}
/** A command that is a menu (`menu`), as the bar's <to-menu>: its items the commands drawn in `menu:<name>` among `all`. */
export const cmdMenu = <C>(cmd: Command<C>, c: C, all: readonly Command<C>[], cls = '', opts: { caret?: boolean; words?: boolean; icon?: IconNode; keep?: boolean } = {}): TemplateResult =>
  html`<to-menu class="${cls} cmd-${cmd.id.replace(/\./g, '-')}" data-tool-group=${cmd.group ?? nothing} ?icon-only=${!opts.words} ?caret=${!!opts.caret} ?keep=${!!opts.keep} .label=${labelOf(cmd, c)} .icon=${opts.icon ?? cmd.icon ?? null} .items=${drawnIn(all, `menu:${cmd.menu}`, c)}></to-menu>`;

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
  html`<span class="to-datenav" role="group" aria-label=${o.label}>${tool({ label: o.prev, icon: ChevronLeft, does: o.onPrev })}<span class="to-datenav-label" aria-live="polite">${o.label}</span>${tool({ label: o.next, icon: ChevronRight, does: o.onNext })}${btn({ label: t('common-today'), cls: 'to-datenav-today', does: o.onToday })}</span>`;
