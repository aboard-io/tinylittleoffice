/**
 * <to-note-pop>: the small box a footnote's words are written in, beside
 * its mark. A `line`-shaped <to-text> over the note's runs; Enter or Done
 * closes it, Remove takes the note out. The Popover API where there is one
 * (light-dismissed, on top of everything), a plain <dialog> where not. On a
 * phone it lies along the bottom of what is visible, above the keyboard,
 * placed from the visual viewport as that moves.
 *
 * Mod+Z and Mod+Shift+Z in the box are the box's own: a small history of
 * the note's words since it opened (the document's undo is never reached
 * from here; the shell does not forward keys from inside it).
 *
 * Events: note-change (detail: the note's words as inline Markdown),
 * note-remove, note-close (once, as the box goes).
 */
import { LitElement, html, nothing } from 'lit';
import { applyAll, noteRuns, writeInline, type TextBlock } from '../doc/index.ts';
import { tool } from './bar.ts';
import { UI } from './icons.ts';
import { t } from './i18n.ts';
import { History } from './history.ts';
import { caret } from './textops.ts';
import type { TextOps, ToText } from './text.ts';

const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/** The box under its mark, or above it when there is no room below; along the bottom of the visual viewport on a phone. */
export function placeNote(pop: HTMLElement, chip: HTMLElement) {
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const left = vv?.offsetLeft ?? 0;
  const w = vv?.width ?? innerWidth;
  const h = vv?.height ?? innerHeight;
  if (w < 600) {
    pop.style.left = `${left + 8}px`;
    pop.style.width = `${w - 16}px`;
    pop.style.top = `${Math.max(top + 8, top + h - pop.offsetHeight - 8)}px`;
    return;
  }
  const r = chip.getBoundingClientRect();
  pop.style.width = '';
  pop.style.left = `${Math.max(left + 8, Math.min(r.left, left + w - pop.offsetWidth - 8))}px`;
  pop.style.top = `${r.bottom + pop.offsetHeight + 6 > top + h ? r.top - pop.offsetHeight - 6 : r.bottom + 6}px`;
}

export class ToNotePop extends LitElement {
  static properties = { block: { state: true }, n: { state: true }, shown: { state: true } };
  /** The note's words, as one paragraph the inner editor owns. */
  declare block: TextBlock;
  declare n: number;
  declare shown: boolean;
  private chip: HTMLElement | null = null;
  private closing = false;
  /** The note's words as typed since the box opened, undone here. */
  private history = new History();

  constructor() {
    super();
    this.block = { k: 'p', runs: [] };
    this.n = 1;
    this.shown = false;
  }
  createRenderRoot() {
    return this;
  }
  get pop(): HTMLElement & Partial<HTMLDialogElement> {
    return this.querySelector<HTMLElement>(':scope > .to-note-pop')!;
  }
  get field(): ToText | null {
    return this.querySelector<ToText>('to-text');
  }
  get isOpen(): boolean {
    const p = this.pop;
    return !!p && (POPOVER ? p.matches(':popover-open') : !!p.open);
  }
  /** The note's words, as the document holds them. */
  get fn(): string {
    return writeInline(this.block.runs).replace(/\n/g, ' ');
  }

  /** Open beside a mark, over the note's words; the caret goes to the end of them. */
  async open(chip: HTMLElement, fn: string, n: number) {
    this.chip = chip;
    this.n = n;
    this.block = { k: 'p', runs: noteRuns(fn) };
    this.history.clear();
    this.shown = true;
    await this.updateComplete;
    const p = this.pop;
    if (POPOVER) {
      if (!p.matches(':popover-open')) p.showPopover();
    } else if (!p.open) p.show?.();
    this.place();
    window.visualViewport?.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('scroll', this.place);
    const f = this.field;
    if (f) {
      await f.updateComplete;
      f.sel = caret(0, this.block.runs.reduce((len, r) => len + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0));
    }
  }
  /** The mark was drawn again: follow it. */
  anchorTo(chip: HTMLElement) {
    this.chip = chip;
    this.place();
  }
  close() {
    if (!this.isOpen) return;
    const p = this.pop;
    POPOVER ? p.hidePopover() : p.close?.();
  }
  private place = () => {
    if (this.chip && this.isOpen) placeNote(this.pop, this.chip);
  };
  private gone() {
    window.visualViewport?.removeEventListener('resize', this.place);
    window.visualViewport?.removeEventListener('scroll', this.place);
    if (!this.shown) return;
    this.shown = false;
    if (this.closing) return;
    this.dispatchEvent(new CustomEvent('note-close', { bubbles: true }));
  }
  private onOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const { ops, sel, before, kind } = e.detail;
    const was = { head: {}, blocks: [this.block] };
    this.history.record(was, ops, before, sel, kind);
    this.block = applyAll(was, ops).blocks[0] as TextBlock;
    this.dispatchEvent(new CustomEvent<string>('note-change', { detail: this.fn, bubbles: true }));
  };
  /** One step of the box's own history: the words put back, the document told, the caret where it was. */
  private step(redo: boolean): boolean {
    const s = redo ? this.history.redo() : this.history.undo();
    if (!s) return false;
    this.block = applyAll({ head: {}, blocks: [this.block] }, s.ops).blocks[0] as TextBlock;
    this.dispatchEvent(new CustomEvent<string>('note-change', { detail: this.fn, bubbles: true }));
    const f = this.field;
    if (f && s.sel) void this.updateComplete.then(() => (f.sel = s.sel));
    return true;
  }
  private onHistory = (e: Event) => {
    e.stopPropagation();
    if (this.step(e.type === 'docredo')) e.preventDefault();
  };
  private removeNote = () => {
    this.closing = true;
    this.close();
    this.shown = false;
    this.closing = false;
    this.dispatchEvent(new CustomEvent('note-remove', { bubbles: true }));
  };
  private onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.isComposing && (k === 'z' || k === 'y')) {
      e.preventDefault();
      this.step(e.shiftKey || k === 'y');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    }
  };
  render() {
    const n = this.n;
    const inner = this.shown
      ? html`<span class="to-note-n" aria-hidden="true">${n}</span>
          <to-text class="to-note-words" shape="line" no-bubble .blocks=${[this.block]} label=${t('Footnote {n}', { n })} placeholder=${t("The note's words")} @text-ops=${this.onOps} @text-enter=${(e: Event) => (e.stopPropagation(), this.close())} @text-exit=${(e: Event) => e.stopPropagation()} @text-select=${(e: Event) => e.stopPropagation()} @text-escape=${(e: Event) => e.stopPropagation()} @docundo=${this.onHistory} @docredo=${this.onHistory} @keydown=${this.onKey}></to-text>
          ${tool({ label: t('Remove footnote'), icon: UI.trash, keep: true, does: this.removeNote })}
          ${tool({ label: t('Done'), icon: UI.check, does: () => this.close() })}`
      : nothing;
    return POPOVER
      ? html`<div class="to-note-pop" popover="auto" role="dialog" aria-label=${t('Footnote')} @toggle=${(e: Event) => (e as ToggleEvent).newState === 'closed' && this.gone()}>${inner}</div>`
      : html`<dialog class="to-note-pop" aria-label=${t('Footnote')} @close=${() => this.gone()} @cancel=${(e: Event) => (e.preventDefault(), this.close())}>${inner}</dialog>`;
  }
}
if (!customElements.get('to-note-pop')) customElements.define('to-note-pop', ToNotePop);
