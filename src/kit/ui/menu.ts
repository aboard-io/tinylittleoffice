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
 * A row (an item with `actions`) is one stop for Up and Down, its first action the focus when it is reached; Left and
 * Right go between its actions, and Enter or Space does the one in hand. A screen reader hears the row's words (its
 * group's name) and then the action.
 * `filter` (Insert ▾ has it): letters typed narrow the list to the items with a word that starts with them
 * (case and accents aside), said at the menu's top; Backspace takes a letter back, Escape the letters, then
 * the menu. The arrows walk what is left.
 * `buttonless`: no button of its own, for a menu a page opens with `openAt` beside what was picked (a table's row, an
 * outline's item, a column's head); placed beside that, the focus given back to it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI, type IconNode } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { fold } from '../share/search.ts';
import { keysAria, keysKbd } from './bar.ts';
import { room } from './scroll.ts';

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
  /** It destroys something (Delete): drawn in the danger color. */
  danger?: boolean;
  /** The keys that do the same, written at the item's end as the device writes them: "Mod+Shift+L". */
  keys?: string;
  /** Given, the item is a checkbox (role=menuitemcheckbox). */
  checked?: boolean;
  /**
   * Given, the item is a row: its words at the left, these as icon buttons at the right, each a menu item of its own
   * (the Download menu's formats: view, share, download, copy link). The row's own `does` is not called.
   */
  actions?: MenuAction[];
  does(): void;
}

/** One of a row's actions: an icon, the words a screen reader says and a hover shows, and what it does. */
export interface MenuAction {
  icon: IconNode;
  label: string;
  does(): void;
}

/**
 * Put a popover beside what opened it, inside the visual viewport (above the keyboard on a phone): under it, or
 * over it where only that side has the room; where neither has, on the side with more, as tall as that side
 * allows, scrolling inside. Its left edge at the opener's; where that would run off the screen, its right edge
 * at the opener's (a menu from a button at the right comes down under that button, not against the screen's
 * other side).
 */
export function place(pop: HTMLElement, anchor: HTMLElement, gap = 4) {
  const box = room();
  const [top0, left0, vw, vh] = [box.top, box.left, box.right - box.left, box.bottom - box.top];
  const a = anchor.getBoundingClientRect();
  const below = top0 + vh - a.bottom - 2 * gap;
  const above = a.top - top0 - 2 * gap;
  pop.style.maxHeight = `${Math.max(120, vh - 2 * gap)}px`;
  let r = pop.getBoundingClientRect();
  const under = r.height <= below || (r.height > above && below >= above);
  if (r.height > (under ? below : above)) {
    pop.style.maxHeight = `${Math.max(120, under ? below : above)}px`;
    r = pop.getBoundingClientRect();
  }
  let top = under ? a.bottom + gap : a.top - gap - r.height;
  top = Math.max(top0 + gap, Math.min(top, top0 + vh - r.height - gap));
  let left = a.left;
  if (left + r.width > left0 + vw - gap) left = a.right - r.width;
  left = Math.max(left0 + gap, Math.min(left, left0 + vw - r.width - gap));
  pop.style.top = `${Math.round(top)}px`;
  pop.style.left = `${Math.round(left)}px`;
}

let n = 0;

/** Whether the last thing reached for was reached by a pointer (rather than a key): a menu opened so focuses itself, not its first item. */
let byPointer = false;
/** Where a pointer last pressed (its pointerdown, then its click) and when, by performance.now(). */
let pressed: Spot | null = null;
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn']);
if (typeof document !== 'undefined') {
  const press = (e: MouseEvent) => (pressed = { x: e.clientX, y: e.clientY, at: performance.now() });
  document.addEventListener('pointerdown', (e) => ((byPointer = true), press(e)), true);
  // A click a key made (Enter on a button) has no place: detail 0.
  document.addEventListener('click', (e) => e.detail > 0 && press(e), true);
  document.addEventListener('keydown', (e) => !MODIFIERS.has(e.key) && (byPointer = false), true);
}
/** Whether a pointer, not a key, opened what is opening now. */
export const openedByPointer = () => byPointer;

/** A place on the screen and a moment. */
interface Spot {
  x: number;
  y: number;
  at: number;
}
/** A finger's width: a press this near the one that opened a list is the same press again. */
const SPOT_PX = 24;
/** How long after a list opens a press at its opening spot is not a choice. */
const SPOT_MS = 500;

/**
 * A list that opens under the press that opened it (the templates' dialog, over the whole screen: its first rows land
 * where the button was) takes no press at that spot for the first moment (Paul, 2026-10-12: "Sometimes when I click a
 * template the link to an app underneath opens up"). `open()` as the list opens remembers where the press that opened
 * it was, if a pointer's and now; `down` and `stops`, on the list's pointerdown and click in the capture phase, swallow a press
 * within SPOT_PX of that spot and within SPOT_MS of the open, or of the last press it swallowed (a double tap, a slow
 * tap the browser delivers after the list opened, a finger that presses again because the list seemed slow): nothing
 * is chosen and nothing closes. A press decided at its pointerdown is decided for its click; a click whose press began
 * before the list opened (on the button) is decided by where it lands. A key's click (detail 0) always goes through.
 */
export class OpeningPress {
  private spot: Spot | null = null;
  /** The press under way in the list, decided at its pointerdown: swallowed or not; null, none began in the list. */
  private held: boolean | null = null;
  open() {
    const now = performance.now();
    this.spot = byPointer && pressed && now - pressed.at < SPOT_MS ? { ...pressed, at: now } : null;
    this.held = null;
  }
  /** Whether a press here and now is the opening one again; if it is, the moment starts over. */
  private again(e: MouseEvent): boolean {
    const s = this.spot;
    const now = performance.now();
    if (!s || now - s.at > SPOT_MS || Math.hypot(e.clientX - s.x, e.clientY - s.y) > SPOT_PX) return false;
    s.at = now;
    return true;
  }
  /** On the list's pointerdown, in the capture phase: the press is decided as it begins. */
  readonly down = { capture: true, handleEvent: (e: PointerEvent) => (this.held = this.again(e)) };
  /** On a click in the list, in the capture phase: true when it is the opening press again, stopped here. */
  stops(e: MouseEvent): boolean {
    if (e.detail === 0) return false;
    const held = this.held ?? this.again(e);
    this.held = null;
    if (held) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    return held;
  }
}

/** The letters typed into each menu lately, for type-ahead. */
const typed = new WeakMap<HTMLElement, { s: string; at: number }>();
/** An item's name, as type-ahead reads it: its words, not its hint. */
const nameOf = (el: HTMLElement) =>
  (el.closest('.to-menu-row')?.getAttribute('aria-label') ?? el.querySelector(':scope > [class$=-words] > span')?.textContent ?? el.textContent ?? '').trim().toLowerCase();
/** The row an action is in, or null for an item of its own. */
const rowOf = (el: Element | null) => el?.closest<HTMLElement>('.to-menu-row') ?? null;

/**
 * A key pressed in a menu (or a listbox) whose items are `items`, the same in every one: ArrowDown and
 * ArrowUp to the next and the previous item, round the ends (from the menu itself, the first and the last);
 * Home and End (PageUp and PageDown) to the first and the last; letters to the next item whose name starts
 * with them; Enter or Space chooses (a click on the item); Escape and Tab close (`close` puts the focus back
 * on the opener). Shift, Alt, Ctrl and ⌘ change none of these. True, the key stopped here, when it was the menu's.
 */
export function menuKey(e: KeyboardEvent, box: HTMLElement, items: HTMLElement[], close: () => void, focused = document.activeElement as HTMLElement | null): boolean {
  if (e.isComposing) return false;
  const n = items.length;
  const at = items.indexOf(focused as HTMLElement);
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
      const key = e.key.toLowerCase();
      let s = (last && now - last.at < 800 ? last.s : '') + key;
      const find = (want: string, from: number) => {
        for (let k = 0; k < n; k++) {
          const el = items[(((from + k) % n) + n) % n];
          if (nameOf(el).startsWith(want)) return el;
        }
        return null;
      };
      // One letter again and again goes round the items starting with it; letters in a row find a longer name from this item on; letters that find nothing start again from the last.
      const same = [...s].every((ch) => ch === key);
      let hit = same ? find(key, at + 1) : find(s, Math.max(0, at));
      if (!hit && !same) hit = find((s = key), at + 1);
      typed.set(box, { s, at: now });
      hit?.focus({ preventScroll: true });
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
  static properties = {
    label: {},
    icon: { attribute: false },
    /** A colour as a dot on the button, in place of an icon (a menu of colours shows the one chosen). */
    swatch: {},
    items: { attribute: false },
    caret: { type: Boolean },
    iconOnly: { type: Boolean, attribute: 'icon-only' },
    keys: {},
    keep: { type: Boolean },
    filter: { type: Boolean },
    buttonless: { type: Boolean },
    query: { state: true },
  };
  declare label: string;
  /** Another button the menu was opened from (openAt): placed beside it, focus goes back to it. */
  private anchor: HTMLElement | null = null;
  declare icon: IconNode | null;
  declare swatch: string;
  declare items: MenuItem[];
  /** A small arrow after the words. */
  declare caret: boolean;
  /** The icon alone; the label is the button's name. */
  declare iconOnly: boolean;
  /** The key that opens it, written at the button's end (the drawer's Download row). */
  declare keys: string;
  /** Never takes the focus by a pointer (it acts on an editor's selection). */
  declare keep: boolean;
  /** Letters typed narrow the items (Insert ▾). */
  declare filter: boolean;
  /** No button of its own: the page opens it with `openAt`, beside what it opens for. */
  declare buttonless: boolean;
  /** The letters typed so far, while `filter`. */
  declare query: string;
  /** This opening came from a pointer on a `keep` menu: the focus stays where it was. */
  private kept = false;
  /** The menu is closing by a key (see closeByKey). */
  private byKey = false;
  /** Opened by a pointer: what had the focus then (the words a row's bullet acts on), where a key's close gives it back. */
  private cameFrom: HTMLElement | null = null;
  readonly uid = `to-menu-${++n}`;

  constructor() {
    super();
    this.label = '';
    this.icon = null;
    this.swatch = '';
    this.items = [];
    this.caret = false;
    this.iconOnly = false;
    this.keys = '';
    this.keep = false;
    this.filter = false;
    this.buttonless = false;
    this.query = '';
  }
  createRenderRoot() {
    return this;
  }
  /** The words on the button; a subclass may give a default. */
  protected labelText(): string {
    return this.label;
  }
  /** The menu's own button (none where it is `buttonless`). */
  get button(): HTMLButtonElement {
    return this.querySelector<HTMLButtonElement>(':scope > button')!;
  }
  /** What the menu is placed beside and gives the focus back to: the opener `openAt` was given, else its own button, else itself. */
  private get from(): HTMLElement {
    return this.anchor ?? this.querySelector<HTMLButtonElement>(':scope > button') ?? this;
  }
  get menu(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > [popover]')!;
  }
  get isOpen(): boolean {
    return this.menu?.matches(':popover-open') ?? false;
  }
  open() {
    // Nothing that edits opens inside a read-only editor (kit/core/element.ts).
    if (!this.closest('[readonly]')) this.menu.showPopover();
  }
  /** Open beside `anchor` instead of this menu's own button: one menu for many openers (a sheet's column heads). */
  openAt(anchor: HTMLElement) {
    this.anchor = anchor;
    this.open();
  }
  close() {
    if (this.isOpen) this.menu.hidePopover();
  }
  /** The stops Up and Down go between: every item, and of a row its first action. */
  private menuItems(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>('[role^=menuitem]:not([disabled])')].filter((el) => (rowOf(el)?.querySelector('[role=menuitem]') ?? el) === el);
  }
  private onToggle = (e: Event) => {
    const open = (e as ToggleEvent).newState === 'open';
    const from = this.from;
    from.setAttribute('aria-expanded', String(open));
    if (open) {
      place(this.menu, from);
      // Opened by a key, the first item has the focus; by a pointer, the menu itself (a `keep` menu leaves it where it is, and its arrows still come here).
      this.cameFrom = byPointer && !this.kept ? (document.activeElement as HTMLElement | null) : null;
      if (this.kept) document.addEventListener('keydown', this.onKeptKey, true);
      else if (byPointer) this.menu.focus({ preventScroll: true });
      else this.menuItems()[0]?.focus({ preventScroll: true });
      window.visualViewport?.addEventListener('resize', this.replace);
    } else {
      window.visualViewport?.removeEventListener('resize', this.replace);
      document.removeEventListener('keydown', this.onKeptKey, true);
      this.query = '';
      // The focused item is gone with the menu: back to the button, unless the dismissing click put focus somewhere. Closed
      // by a key (Escape, Tab), always: the browser gives the focus back to what had it before the menu opened, which in
      // the drawer is its search box, not the button that the key opened the menu from; but a menu a pointer opened
      // gives it back to what had it then (a row's words, whose bullet opened it and never takes the focus).
      const back = this.cameFrom?.isConnected && this.cameFrom !== document.body && !this.menu.contains(this.cameFrom) ? this.cameFrom : from;
      if (this.byKey) back.focus();
      else if (document.activeElement === document.body || this.menu.contains(document.activeElement)) from.focus();
      this.byKey = false;
      this.cameFrom = null;
      this.anchor = null;
      this.kept = false;
    }
  };
  private replace = () => this.isOpen && place(this.menu, this.from);
  private onKey = (e: KeyboardEvent) => {
    if (this.filter && this.narrow(e)) return;
    const now = document.activeElement as HTMLElement | null;
    const row = rowOf(now);
    if (row && now && !e.isComposing) {
      const acts = [...row.querySelectorAll<HTMLElement>('[role=menuitem]')];
      const i = acts.indexOf(now);
      const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (by || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (by) acts[(i + by + acts.length) % acts.length].focus({ preventScroll: true });
        else now.click();
        return;
      }
    }
    // In a row, the row's first action stands for the focus: Up and Down go on from the row.
    menuKey(e, this.menu, this.menuItems(), this.closeByKey, row ? row.querySelector<HTMLElement>('[role=menuitem]') : now);
  };
  /** A letter typed into a menu that filters: the list narrowed (or widened by Backspace, or whole again by Escape). True when the key was this. */
  private narrow(e: KeyboardEvent): boolean {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return false;
    let q = this.query;
    if (e.key === 'Backspace' && q) q = q.slice(0, -1);
    else if (e.key === 'Escape' && q) q = '';
    else if (e.key.length === 1 && (e.key !== ' ' || q)) q += e.key;
    else return false;
    e.preventDefault();
    e.stopPropagation();
    this.query = q;
    void this.updateComplete.then(() => {
      (this.menuItems()[0] ?? this.menu).focus({ preventScroll: true });
      place(this.menu, this.from);
    });
    return true;
  }
  /** Whether an item stays while letters are typed: a word of its name starts with them. */
  private stays(item: MenuItem): boolean {
    const q = fold(this.query.trim());
    return (
      !q ||
      fold(item.label)
        .split(/[\s\-–—/(),.…]+/)
        .some((w) => w.startsWith(q)) ||
      fold(item.label).startsWith(q)
    );
  }
  /** A `keep` menu open while the focus stays in the editor: Up and Down take the focus into the menu, which is then an ordinary one. */
  private onKeptKey = (e: KeyboardEvent) => {
    if (!this.isOpen || this.menu.contains(document.activeElement) || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    this.kept = false;
    document.removeEventListener('keydown', this.onKeptKey, true);
    menuKey(e, this.menu, this.menuItems(), this.closeByKey);
  };
  /** Closed by a key (Escape, Tab): the focus goes back to the button whatever the browser restores. */
  private closeByKey = () => {
    this.byKey = true;
    this.close();
  };
  private choose(item: MenuItem | MenuAction) {
    if (!this.isOpen) return;
    const from = this.from;
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
    if (item.actions)
      return html`<div class="to-menu-row" role="group" aria-label=${item.label}>
        ${item.icon ? icon(item.icon, 18) : nothing}<span class="to-menu-words" aria-hidden="true"><span>${item.label}</span>${item.hint ? html`<small>${item.hint}</small>` : nothing}</span>${item.actions.map(
          (a) =>
            html`<button type="button" class="to-menu-act" role="menuitem" tabindex="-1" aria-label=${a.label} title=${a.label} @pointermove=${(e: PointerEvent) => !this.kept && hoverFocus(e)} @click=${() => this.choose(a)}>${icon(a.icon, 20)}</button>`,
        )}
      </div>`;
    return html`<button type="button" class="to-menu-item ${item.danger ? 'to-danger' : ''}" role=${item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked=${item.checked === undefined ? nothing : String(item.checked)} aria-keyshortcuts=${keysAria(item.keys)} ?disabled=${item.disabled} tabindex="-1" @mousedown=${(e: Event) => this.keep && e.preventDefault()} @pointermove=${(e: PointerEvent) => !this.kept && hoverFocus(e)} @click=${() => this.choose(item)}>
      ${item.icon ? icon(item.icon, 18) : item.swatch ? html`<span class="to-swatch" style="--swatch:${item.swatch}" aria-hidden="true"></span>` : nothing}<span class="to-menu-words"><span>${item.label}</span>${item.hint ? html`<small>${item.hint}</small>` : nothing}</span>${keysKbd(item.keys)}${item.checked ? icon(UI.check, 16, 'to-menu-check') : nothing}
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
      parts.push(
        group
          ? html`<div role="group" aria-label=${group}><div class="to-menu-head" aria-hidden="true">${group}</div>${run.map((i) => this.renderItem(i))}</div>`
          : html`${run.map((i) => this.renderItem(i))}`,
      );
      run = [];
    };
    for (const item of this.items) {
      if (!this.stays(item)) continue;
      if (item.group !== group) {
        flush();
        group = item.group;
      }
      run.push(item);
    }
    flush();
    const button = this.buttonless
      ? nothing
      : html`<button type="button" class="to-btn ${this.iconOnly ? 'to-tool' : ''}" popovertarget=${this.uid} aria-haspopup="menu" aria-expanded="false" aria-keyshortcuts=${keysAria(this.keys || undefined)} aria-label=${this.iconOnly ? label : nothing} title=${this.iconOnly ? label : nothing} @mousedown=${this.hold}>
        ${this.swatch ? html`<span class="to-swatch" style="--swatch:${this.swatch}" aria-hidden="true"></span>` : this.icon ? icon(this.icon) : nothing}${this.iconOnly ? nothing : html`<span>${label}</span>`}${keysKbd(this.keys)}${this.caret ? icon(UI.down, 14, 'to-caret') : nothing}
        </button>`;
    return html`${button}
      <div id=${this.uid} popover="auto" class="to-menu" role="menu" tabindex="-1" aria-label=${label} @toggle=${this.onToggle} @keydown=${this.onKey}>${this.query ? html`<div class="to-menu-filter" role="status">${parts.length ? t('menu-starting-q', { q: this.query }) : t('menu-nothing-starts-q', { q: this.query })}</div>` : nothing}${parts}</div>`;
  }
}
customElements.define('to-menu', ToMenu);
