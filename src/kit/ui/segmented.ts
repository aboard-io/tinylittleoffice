/**
 * <to-segmented>: a choice of a few drawn as one row of segments (docs/library.md, The kit's small pieces): My and All,
 * Table and Calendar, Board and Table. It is a radio group, as ARIA has it (`role=radiogroup`, each segment
 * `role=radio` and `aria-checked`): one segment takes Tab, the one chosen; the arrows (Left and Right as the page reads,
 * Up and Down), Home and End move to another and choose it; a click chooses. The choice is told in `change`, bubbling,
 * `{ value }`, and shown at once; a page that keeps it elsewhere gives `value` again.
 *
 * - `options`: `{ value, label, icon? }` each (Segment), in order; `value`, the one chosen; `label`, the group's name
 *   for a screen reader ("Whose leads").
 * - Its look is the kit's `.to-seg` (kit.css), the chosen segment the accent's.
 */
import { LitElement, html, nothing } from 'lit';
import { icon, type IconNode } from '../draw/icons.ts';

/** One segment: the value it stands for, its words, an icon before them. */
export interface Segment {
  value: string;
  label: string;
  icon?: IconNode;
}

export class ToSegmented extends LitElement {
  static properties = {
    options: { attribute: false },
    value: {},
    label: {},
  };
  declare options: Segment[];
  declare value: string;
  /** The group's name, for a screen reader. */
  declare label: string;

  constructor() {
    super();
    this.options = [];
    this.value = '';
    this.label = '';
  }
  createRenderRoot() {
    return this;
  }
  private get segments(): HTMLButtonElement[] {
    return [...this.querySelectorAll<HTMLButtonElement>('[role=radio]')];
  }
  /** Segment `i` chosen: shown, told, and (by a key) focused. */
  private choose(i: number, focus = false) {
    const o = this.options[i];
    if (!o) return;
    if (o.value !== this.value) {
      this.value = o.value;
      this.dispatchEvent(new CustomEvent<{ value: string }>('change', { detail: { value: o.value }, bubbles: true, composed: true }));
    }
    if (focus) void this.updateComplete.then(() => this.segments[i]?.focus());
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const n = this.options.length;
    const at = Math.max(
      0,
      this.options.findIndex((o) => o.value === this.value),
    );
    const rtl = getComputedStyle(this).direction === 'rtl';
    let to: number;
    switch (e.key) {
      case 'ArrowRight':
        to = at + (rtl ? -1 : 1);
        break;
      case 'ArrowLeft':
        to = at + (rtl ? 1 : -1);
        break;
      case 'ArrowDown':
        to = at + 1;
        break;
      case 'ArrowUp':
        to = at - 1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.choose((to + n) % n, true);
  };
  render() {
    const chosen = this.options.some((o) => o.value === this.value) ? this.value : this.options[0]?.value;
    return html`<div class="to-seg" role="radiogroup" aria-label=${this.label || nothing} @keydown=${this.onKey}>
      ${this.options.map(
        (o, i) =>
          html`<button type="button" class="to-btn" role="radio" title=${o.label} aria-checked=${String(o.value === this.value)} tabindex=${o.value === chosen ? 0 : -1} @click=${() => this.choose(i)}>
            ${o.icon ? icon(o.icon, 16) : nothing}<span>${o.label}</span>
          </button>`,
      )}
    </div>`;
  }
}
if (!customElements.get('to-segmented')) customElements.define('to-segmented', ToSegmented);

declare global {
  interface HTMLElementTagNameMap {
    'to-segmented': ToSegmented;
  }
}
