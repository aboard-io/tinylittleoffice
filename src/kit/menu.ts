/**
 * <to-menu>: a button that opens a menu of items, on the Popover API: light-dismissed, on top of
 * everything, Escape closes it and focus comes back to the button. Arrow keys walk the items. Placed by
 * hand below (or above) its button, inside the visual viewport, so it sits above a phone's keyboard.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI, type IconNode } from './icons.ts';

export interface MenuItem {
  label: string;
  icon?: IconNode;
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

export class ToMenu extends LitElement {
  static properties = { label: {}, icon: { attribute: false }, items: { attribute: false }, caret: { type: Boolean }, iconOnly: { type: Boolean, attribute: 'icon-only' } };
  declare label: string;
  /** Another button the menu was opened from (openAt): placed beside it, focus goes back to it. */
  private anchor: HTMLElement | null = null;
  declare icon: IconNode | null;
  declare items: MenuItem[];
  /** A small arrow after the words. */
  declare caret: boolean;
  /** The icon alone; the label is the button's name. */
  declare iconOnly: boolean;
  readonly uid = `to-menu-${++n}`;

  constructor() {
    super();
    this.label = '';
    this.icon = null;
    this.items = [];
    this.caret = false;
    this.iconOnly = false;
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
      this.menuItems()[0]?.focus();
      window.visualViewport?.addEventListener('resize', this.replace);
    } else {
      window.visualViewport?.removeEventListener('resize', this.replace);
      // The focused item is gone with the menu: back to the button, unless the dismissing click put focus somewhere.
      if (document.activeElement === document.body || this.menu.contains(document.activeElement)) from.focus();
      this.anchor = null;
    }
  };
  private replace = () => this.isOpen && place(this.menu, this.anchor ?? this.button);
  private onKey = (e: KeyboardEvent) => {
    const items = this.menuItems();
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else if (e.key === 'Tab') {
      e.preventDefault();
      this.close();
      this.button.focus();
    }
  };
  private choose(item: MenuItem) {
    const from = this.anchor ?? this.button;
    this.close();
    from.focus();
    item.does();
  }
  private renderItem(item: MenuItem): TemplateResult {
    return html`<button type="button" class="to-menu-item" role=${item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked=${item.checked === undefined ? nothing : String(item.checked)} ?disabled=${item.disabled} tabindex="-1" @click=${() => this.choose(item)}>
      ${item.icon ? icon(item.icon, 18) : nothing}<span class="to-menu-words"><span>${item.label}</span>${item.hint ? html`<small>${item.hint}</small>` : nothing}</span>${item.checked ? icon(UI.check, 16, 'to-menu-check') : nothing}
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
    return html`<button type="button" class="to-btn ${this.iconOnly ? 'to-tool' : ''}" popovertarget=${this.uid} aria-haspopup="menu" aria-expanded="false" aria-label=${this.iconOnly ? label : nothing} title=${this.iconOnly ? label : nothing}>
        ${this.icon ? icon(this.icon) : nothing}${this.iconOnly ? nothing : html`<span>${label}</span>`}${this.caret ? icon(UI.down, 14, 'to-caret') : nothing}
      </button>
      <div id=${this.uid} popover="auto" class="to-menu" role="menu" aria-label=${label} @toggle=${this.onToggle} @keydown=${this.onKey}>${parts}</div>`;
  }
}
customElements.define('to-menu', ToMenu);
