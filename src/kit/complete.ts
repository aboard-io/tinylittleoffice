/**
 * <to-complete>: the list under the caret while ":" and letters are typed in a <to-text> (":ca"): icons and
 * emoji whose names or tags begin with the letters, the best eight, the first one highlighted. The editor owns
 * it: it says what was typed (`show`), moves the highlight (`move`) and picks (`current`); a tap on a row says
 * `complete-pick` (detail: the Completion). A manual popover like the link box (kit/link-pop.ts): placed from
 * the visual viewport, so it sits above a phone's keyboard and no card or scrolling host clips it; a tap
 * outside it and outside its editor says `complete-cancel`.
 *
 * The starter icons answer at once; the first ":" loads the rest of Lucide with its tags (the icon picker's
 * own chunk) and the emoji table, and the list grows when they arrive. Where the editor holds no icon runs
 * (a shape's label, plain words) only emoji are offered.
 */
import { LitElement, html, nothing } from 'lit';
import { icon, iconNamed } from './icons.ts';
import { completeIcons } from './icons-search.ts';
import { t } from './i18n.ts';
import { reveal, room } from './scroll.ts';

const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const MAX = 8;

/** One row: an icon by name, or an emoji's character with its name. */
export interface Completion {
  kind: 'icon' | 'emoji';
  value: string;
  name: string;
}

let emoji: typeof import('./emoji.ts') | null = null;
let loading: Promise<void> | null = null;
/** The rest of Lucide with its tags (the picker's chunk joins them to the search) and the emoji table, loaded once; never rejects. */
export function loadCompletions(): Promise<void> {
  return (loading ??= Promise.all([import('./icons-picker.ts'), import('./emoji.ts')]).then(
    ([, e]) => void (emoji = e),
    () => void (loading = null),
  ));
}

/** The rows for what was typed after the ":": the best icons first and the best emoji after them, half each when both have enough. */
export function completions(query: string, icons: boolean): Completion[] {
  const e: Completion[] = emoji ? emoji.completeEmoji(query, MAX).map((c) => ({ kind: 'emoji', value: c, name: emoji!.emojiName(c) })) : [];
  if (!icons) return e;
  const i: Completion[] = completeIcons(query, MAX)
    .filter((n) => iconNamed(n))
    .map((n) => ({ kind: 'icon', value: n, name: n }));
  const take = i.slice(0, Math.max(MAX / 2, MAX - e.length));
  return [...take, ...e.slice(0, MAX - take.length)];
}

/** What ":name:" typed in full becomes: the icon by that name (where icons are offered), else the emoji by that name, else null. */
export function completeNamed(name: string, icons: boolean): Completion | null {
  const n = name.toLowerCase();
  if (icons && iconNamed(n)) return { kind: 'icon', value: n, name: n };
  const c = emoji?.emojiNamed(n);
  return c ? { kind: 'emoji', value: c, name: emoji!.emojiName(c) } : null;
}

let ids = 0;

export class ToComplete extends LitElement {
  static properties = { items: { state: true }, active: { state: true }, shown: { state: true } };
  declare items: Completion[];
  declare active: number;
  declare shown: boolean;
  /** The listbox's id, and its rows' prefix. */
  readonly uid = `to-complete-${++ids}`;
  private rect: DOMRect | null = null;

  constructor() {
    super();
    this.items = [];
    this.active = 0;
    this.shown = false;
  }
  createRenderRoot() {
    return this;
  }
  get pop(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > .to-complete')!;
  }
  /** The highlighted row. */
  get current(): Completion | undefined {
    return this.items[this.active];
  }
  /** The id of the highlighted row, for the editor's aria-activedescendant. */
  get activeId(): string {
    return `${this.uid}-${this.active}`;
  }

  /** The rows for the words at `rect`; the highlight goes back to the first when the rows are new. */
  async show(rect: DOMRect, items: Completion[]) {
    this.rect = rect;
    const same = items.length === this.items.length && items.every((c, i) => c.value === this.items[i].value);
    this.items = items;
    if (!same) this.active = 0;
    const was = this.shown;
    this.shown = true;
    await this.updateComplete;
    const p = this.pop;
    if (!this.shown) return;
    if (POPOVER && !p.matches(':popover-open')) p.showPopover();
    this.place();
    if (!was) {
      window.visualViewport?.addEventListener('resize', this.place);
      window.visualViewport?.addEventListener('scroll', this.place);
      document.addEventListener('pointerdown', this.onOutside, true);
    }
  }
  /** The highlight one row on (1) or back (-1), round from the last to the first. */
  move(by: 1 | -1) {
    const n = this.items.length;
    if (n) this.active = (this.active + by + n) % n;
  }
  hide() {
    if (!this.shown) return;
    this.shown = false;
    window.visualViewport?.removeEventListener('resize', this.place);
    window.visualViewport?.removeEventListener('scroll', this.place);
    document.removeEventListener('pointerdown', this.onOutside, true);
    const p = this.pop;
    if (POPOVER && p?.matches(':popover-open')) p.hidePopover();
  }
  private onOutside = (e: PointerEvent) => {
    const at = e.target as Node | null;
    if (at && (this.contains(at) || this.parentElement?.contains(at))) return;
    this.hide();
    this.dispatchEvent(new CustomEvent('complete-cancel', { bubbles: true }));
  };
  /** Under the words typed, or above them when there is no room below (a phone's keyboard), always inside the visual viewport. */
  private place = () => {
    const p = this.pop;
    const r = this.rect;
    if (!p || !r || !this.shown) return;
    const box = room();
    const [top0, left0, w, h] = [box.top, box.left, box.right - box.left, box.bottom - box.top];
    // On the screen, as the rest are.
    const { width: pw, height: ph } = p.getBoundingClientRect();
    let top = r.bottom + 4;
    if (top + ph > top0 + h && r.top - ph - 4 >= top0) top = r.top - ph - 4;
    p.style.top = `${Math.round(Math.max(top0 + 4, Math.min(top, top0 + h - ph - 4)))}px`;
    p.style.left = `${Math.round(Math.max(left0 + 4, Math.min(r.left, left0 + w - pw - 4)))}px`;
  };
  updated() {
    const active = this.querySelector(`[id="${this.activeId}"]`);
    if (active) reveal(active);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.hide();
  }
  render() {
    // The focus stays in the words: a row is pressed without taking it.
    const keep = (e: Event) => e.preventDefault();
    const pick = (c: Completion) => this.dispatchEvent(new CustomEvent<Completion>('complete-pick', { detail: c, bubbles: true }));
    const rows = !this.shown
      ? nothing
      : this.items.map((c, i) => {
          const node = c.kind === 'icon' ? iconNamed(c.value) : undefined;
          return html`<div class="to-complete-row" role="option" id=${`${this.uid}-${i}`} aria-selected=${i === this.active ? 'true' : 'false'} data-value=${c.value} data-kind=${c.kind} @mousedown=${keep} @click=${() => pick(c)}>
            <span class="to-complete-glyph" aria-hidden="true">${node ? icon(node, 18) : c.value}</span><span class="to-complete-name">${c.name}</span>
          </div>`;
        });
    return html`<div class="to-complete" id=${this.uid} popover=${POPOVER ? 'manual' : nothing} role="listbox" aria-label=${t('Icon or emoji')} ?hidden=${!POPOVER && !this.shown}>${rows}</div>`;
  }
}
if (!customElements.get('to-complete')) customElements.define('to-complete', ToComplete);
