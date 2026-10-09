/**
 * <to-menu>: a button that opens a menu of items, on the Popover API: light-dismissed, on top of
 * everything, Escape closes it and focus comes back to the button. Placed by hand below (or above) its
 * button, inside the visual viewport, so it sits above a phone's keyboard.
 *
 * Its keys are `menuKey`'s, the one set every menu and listbox here keeps (the templates' too): the focus
 * roves over the items, so there is one item in hand and one highlight, the focused item's (a mouse over an
 * item takes the focus to it). Opened by a key, the first item has the focus; opened by a pointer, the menu
 * itself does, and the first arrow goes in.
 * `keep`: a menu that acts on an editor's selection (Align) never takes the focus from it by a pointer, so a
 * phone's keyboard stays up; opened from the keyboard, its items still take the focus to be walked.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI, type IconNode } from './icons.ts';

export interface MenuItem {
  label: string;
  icon?: IconNode;
  /** A colour shown as a dot in the icon's place (a colour menu, a theme's). */
  swatch?: string;
  /** A second line, smaller. */
  hint?: string;
  /** A heading the item sits under. */
  group?: string;
  disabled?: boolean;
  /** Given, the item is a checkbox (role=menuitemcheckbox). */
  checked?: boolean;
  does(): void;
}

/** Put a popover beside what opened it, inside the visual viewport (above the keyboard on a phone). */
export function place(pop: HTMLElement, anchor: HTMLElement, gap = 4) {
  const vv = window.visualViewport;
  const top0 = vv?.offsetTop ?? 0;
  const left0 = vv?.offsetLeft ?? 0;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const a = anchor.getBoundingClientRect();
  pop.style.maxHeight = `${Math.max(120, vh - 2 * gap)}px`;
  const r = pop.getBoundingClientRect();
  let top = a.bottom + gap;
  if (top + r.height > top0 + vh && a.top - gap - r.height >= top0) top = a.top - gap - r.height;
  top = Math.max(top0 + gap, Math.min(top, top0 + vh - r.height - gap));
  const left = Math.max(left0 + gap, Math.min(a.left, left0 + vw - r.width - gap));
  pop.style.top = `${Math.round(top)}px`;
  pop.style.left = `${Math.round(left)}px`;
}

let n = 0;

/** Whether the last thing reached for was reached by a pointer (rather than a key): a menu opened so focuses itself, not its first item. */
let byPointer = false;
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn']);
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => (byPointer = true), true);
  document.addEventListener('keydown', (e) => !MODIFIERS.has(e.key) && (byPointer = false), true);
}
/** Whether a pointer, not a key, opened what is opening now. */
export const openedByPointer = () => byPointer;

/** The letters typed into each menu lately, for type-ahead. */
const typed = new WeakMap<HTMLElement, { s: string; at: number }>();
/** An item's name, as type-ahead reads it: its words, not its hint. */
const nameOf = (el: HTMLElement) => (el.querySelector(':scope > [class$=-words] > span')?.textContent ?? el.textContent ?? '').trim().toLowerCase();

/**
 * A key pressed in a menu (or a listbox) whose items are `items`, the same in every one: ArrowDown and
 * ArrowUp to the next and the previous item, round the ends (from the menu itself, the first and the last);
 * Home and End (PageUp and PageDown) to the first and the last; letters to the next item whose name starts
 * with them; Enter or Space chooses (a click on the item); Escape and Tab close (`close` puts the focus back
 * on the opener). Shift, Alt, Ctrl and ⌘ change none of these. True, the key stopped here, when it was the menu's.
 */
export function menuKey(e: KeyboardEvent, box: HTMLElement, items: HTMLElement[], close: () => void): boolean {
  if (e.isComposing) return false;
  const n = items.length;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const go = (i: number) => n && items[((i % n) + n) % n].focus({ preventScroll: true });
  switch (e.key) {
    case 'ArrowDown':
      go(at < 0 ? 0 : at + 1);
      break;
    case 'ArrowUp':
      go(at < 0 ? n - 1 : at - 1);
      break;
    case 'Home':
    case 'PageUp':
      go(0);
      break;
    case 'End':
    case 'PageDown':
      go(n - 1);
      break;
    case 'Enter':
    case ' ':
      if (at >= 0) items[at].click();
      break;
    case 'Escape':
    case 'Tab':
      close();
      break;
    default: {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || !n) return false;
      const now = Date.now();
      const last = typed.get(box);
      const s = (last && now - last.at < 800 ? last.s : '') + e.key.toLowerCase();
      typed.set(box, { s, at: now });
      // A first letter looks on from the item after this one; more letters go on matching from this one.
      const from = s.length > 1 ? Math.max(0, at) : at + 1;
      for (let k = 0; k < n; k++) {
        const el = items[(from + k) % n];
        if (nameOf(el).startsWith(s)) {
          el.focus({ preventScroll: true });
          break;
        }
      }
    }
  }
  e.preventDefault();
  e.stopPropagation();
  return true;
}

/** A mouse over an item takes the focus to it, so the item under the mouse is the one the arrows go on from. */
export function hoverFocus(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement;
  if (e.pointerType === 'mouse' && document.activeElement !== el && !el.matches(':disabled, [aria-disabled=true]')) el.focus({ preventScroll: true });
}

export class ToMenu extends LitElement {
  static properties = { label: {}, icon: { attribute: false }, items: { attribute: false }, caret: { type: Boolean }, iconOnly: { type: Boolean, attribute: 'icon-only' }, keep: { type: Boolean } };
  declare label: string;
  /** Another button the menu was opened from (openAt): placed beside it, focus goes back to it. */
  private anchor: HTMLElement | null = null;
  declare icon: IconNode | null;
  declare items: MenuItem[];
  /** A small arrow after the words. */
  declare caret: boolean;
  /** The icon alone; the label is the button's name. */
  declare iconOnly: boolean;
  /** Never takes the focus by a pointer (it acts on an editor's selection). */
  declare keep: boolean;
  /** This opening came from a pointer on a `keep` menu: the focus stays where it was. */
  private kept = false;
  readonly uid = `to-menu-${++n}`;

  constructor() {
    super();
    this.label = '';
    this.icon = null;
    this.items = [];
    this.caret = false;
    this.iconOnly = false;
    this.keep = false;
  }
  createRenderRoot() {
    return this;
  }
  /** The words on the button; a subclass may give a default. */
  protected labelText(): string {
    return this.label;
  }
  get button(): HTMLButtonElement {
    return this.querySelector<HTMLButtonElement>(':scope > button')!;
  }
  get menu(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > [popover]')!;
  }
  get isOpen(): boolean {
    return this.menu?.matches(':popover-open') ?? false;
  }
  open() {
    this.menu.showPopover();
  }
  /** Open beside `anchor` instead of this menu's own button: one menu for many openers (a sheet's column heads). */
  openAt(anchor: HTMLElement) {
    this.anchor = anchor;
    this.menu.showPopover();
  }
  close() {
    if (this.isOpen) this.menu.hidePopover();
  }
  private menuItems(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role^=menuitem]:not([disabled])')];
  }
  private onToggle = (e: Event) => {
    const open = (e as ToggleEvent).newState === 'open';
    const from = this.anchor ?? this.button;
    from.setAttribute('aria-expanded', String(open));
    if (open) {
      place(this.menu, from);
      // Opened by a key, the first item has the focus; by a pointer, the menu itself (a `keep` menu leaves it where it is, and its arrows still come here).
      if (this.kept) document.addEventListener('keydown', this.onKeptKey, true);
      else if (byPointer) this.menu.focus({ preventScroll: true });
      else this.menuItems()[0]?.focus({ preventScroll: true });
      window.visualViewport?.addEventListener('resize', this.replace);
    } else {
      window.visualViewport?.removeEventListener('resize', this.replace);
      document.removeEventListener('keydown', this.onKeptKey, true);
      // The focused item is gone with the menu: back to the button, unless the dismissing click put focus somewhere.
      if (document.activeElement === document.body || this.menu.contains(document.activeElement)) from.focus();
      this.anchor = null;
      this.kept = false;
    }
  };
  private replace = () => this.isOpen && place(this.menu, this.anchor ?? this.button);
  private onKey = (e: KeyboardEvent) => menuKey(e, this.menu, this.menuItems(), () => this.close());
  /** A `keep` menu open while the focus stays in the editor: Up and Down take the focus into the menu, which is then an ordinary one. */
  private onKeptKey = (e: KeyboardEvent) => {
    if (!this.isOpen || this.menu.contains(document.activeElement) || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    this.kept = false;
    document.removeEventListener('keydown', this.onKeptKey, true);
    menuKey(e, this.menu, this.menuItems(), () => this.close());
  };
  private choose(item: MenuItem) {
    if (!this.isOpen) return;
    const from = this.anchor ?? this.button;
    const kept = this.kept;
    this.kept = false;
    this.close();
    if (!kept) from.focus();
    item.does();
  }
  /** A pointer on a `keep` menu's button or items: no focus moves. */
  private hold = (e: Event) => {
    if (!this.keep) return;
    e.preventDefault();
    if (!this.isOpen) this.kept = true;
  };
  private renderItem(item: MenuItem): TemplateResult {
    return html`<button type="button" class="to-menu-item" role=${item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked=${item.checked === undefined ? nothing : String(item.checked)} ?disabled=${item.disabled} tabindex="-1" @mousedown=${(e: Event) => this.keep && e.preventDefault()} @pointermove=${(e: PointerEvent) => !this.kept && hoverFocus(e)} @click=${() => this.choose(item)}>
      ${item.icon ? icon(item.icon, 18) : item.swatch ? html`<span class="to-swatch" style="--swatch:${item.swatch}" aria-hidden="true"></span>` : nothing}<span class="to-menu-words"><span>${item.label}</span>${item.hint ? html`<small>${item.hint}</small>` : nothing}</span>${item.checked ? icon(UI.check, 16, 'to-menu-check') : nothing}
    </button>`;
  }
  render() {
    const label = this.labelText();
    // Items under a heading sit in a group; the heading is said once.
    const parts: TemplateResult[] = [];
    let group: string | undefined;
    let run: MenuItem[] = [];
    const flush = () => {
      if (!run.length) return;
      parts.push(group ? html`<div role="group" aria-label=${group}><div class="to-menu-head" aria-hidden="true">${group}</div>${run.map((i) => this.renderItem(i))}</div>` : html`${run.map((i) => this.renderItem(i))}`);
      run = [];
    };
    for (const item of this.items) {
      if (item.group !== group) {
        flush();
        group = item.group;
      }
      run.push(item);
    }
    flush();
    return html`<button type="button" class="to-btn ${this.iconOnly ? 'to-tool' : ''}" popovertarget=${this.uid} aria-haspopup="menu" aria-expanded="false" aria-label=${this.iconOnly ? label : nothing} title=${this.iconOnly ? label : nothing} @mousedown=${this.hold}>
        ${this.icon ? icon(this.icon) : nothing}${this.iconOnly ? nothing : html`<span>${label}</span>`}${this.caret ? icon(UI.down, 14, 'to-caret') : nothing}
      </button>
      <div id=${this.uid} popover="auto" class="to-menu" role="menu" tabindex="-1" aria-label=${label} @toggle=${this.onToggle} @keydown=${this.onKey}>${parts}</div>`;
  }
}
customElements.define('to-menu', ToMenu);
