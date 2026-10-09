/**
 * <to-find>: Find in this document (Mod+F). A small bar under the app's bar: the words to find, how many
 * there are and which is in hand, previous and next, Close. Every word of the search is found (search.ts's
 * terms: words, "phrases in quotes", case and accents aside). Where the app shows words, they are marked
 * through the browser's own highlights (the CSS Custom Highlight API: nothing in the page is changed), the
 * one in hand stronger, scrolled into view. An editor whose words are not text on the page (a sheet's cells
 * are inputs) finds them itself: it has a `find(terms)` (Findable) that counts and goes to each.
 */
import { LitElement, html } from 'lit';
import { fold, termsOf } from './search.ts';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { zoomed } from './zoom.ts';

/** What an editor found: how many, and a way to show the one in hand. */
export interface Found {
  count: number;
  go(i: number): void;
  /** The marks taken away (before a new search, or as the bar closes). */
  clear?(): void;
  /** The bar closed by Escape: the focus goes to the match in hand. */
  leave?(): void;
}
/** An editor that finds in its own way. */
export interface Findable {
  find(terms: string[]): Found;
}
export const isFindable = (el: unknown): el is Findable => !!el && typeof (el as Findable).find === 'function';

/** Whose words these are not: the app's bar, menus, dialogs, the find bar itself. */
const NOT_WORDS = 'to-bar, to-context, [popover], dialog, to-dialog, script, style, template, .to-find, .sr-only';

/** Where the terms are among the words shown under `root`, in the order they are read. */
export function rangesIn(root: Element, terms: string[]): Range[] {
  if (!terms.length) return [];
  const out: Range[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(NOT_WORDS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = n.nodeValue ?? '';
    if (!text.trim()) continue;
    const f = fold(text);
    const spans: [number, number][] = [];
    for (const term of terms) for (let i = f.indexOf(term); i >= 0; i = f.indexOf(term, i + term.length)) spans.push([i, i + term.length]);
    spans.sort((a, b) => a[0] - b[0]);
    let end = -1;
    for (const [a, b] of spans) {
      if (a < end) continue;
      const r = document.createRange();
      r.setStart(n, a);
      r.setEnd(n, b);
      out.push(r);
      end = b;
    }
  }
  return out;
}

const highlights = () => (typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null);

/** The words on the page under `root`: marked, and each in turn shown. */
export function findInPage(root: Element, terms: string[]): Found {
  const ranges = rangesIn(root, terms);
  const hl = highlights();
  let now = -1;
  hl?.set('to-find', new Highlight(...ranges));
  hl?.delete('to-find-now');
  return {
    count: ranges.length,
    go(i) {
      const r = ranges[i];
      if (!r) return;
      now = i;
      hl?.set('to-find-now', new Highlight(r));
      const el = r.startContainer.parentElement;
      el?.scrollIntoView({ block: 'center', inline: 'nearest' });
    },
    clear() {
      hl?.delete('to-find');
      hl?.delete('to-find-now');
    },
    leave() {
      // Words that can be typed in: the match chosen in them, to type over or mark.
      const r = ranges[now];
      const box = r?.startContainer.parentElement?.closest<HTMLElement>('[contenteditable=true]');
      if (!r || !box) return;
      box.focus({ preventScroll: true });
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    },
  };
}

export class ToFind extends LitElement {
  static properties = { open: { type: Boolean, reflect: true }, query: { state: true }, at: { state: true }, count: { state: true } };
  declare open: boolean;
  declare query: string;
  /** The match in hand, from 0; -1 for none. */
  declare at: number;
  declare count: number;
  /** Where to look: the editor. */
  target: Element | null = null;
  private found: Found | null = null;

  constructor() {
    super();
    this.open = false;
    this.query = '';
    this.at = -1;
    this.count = 0;
  }
  createRenderRoot() {
    return this;
  }
  get input(): HTMLInputElement | null {
    return this.querySelector('input');
  }
  /** Opened (or, open, the words chosen again to type over); the words selected in the page are what it looks for. */
  async show() {
    const picked = window.getSelection()?.toString().trim() ?? '';
    if (picked && !picked.includes('\n') && picked.length < 80) this.query = picked;
    this.open = true;
    await this.updateComplete;
    this.place();
    this.input?.focus();
    this.input?.select();
    if (this.query) this.run(0);
  }
  close() {
    if (!this.open) return;
    this.found?.clear?.();
    this.found = null;
    this.open = false;
    this.at = -1;
    this.count = 0;
  }
  /** Just under the app's bar, wherever that is now. */
  private place() {
    const bar = this.target?.querySelector('to-bar');
    const below = bar ? bar.getBoundingClientRect().bottom : (document.querySelector('.to-header')?.getBoundingClientRect().bottom ?? 0);
    this.style.top = `${Math.round((Math.max(0, below) + 4) / zoomed())}px`;
  }
  /** Look again (the document may have changed) and show the `i`th. */
  private run(i: number) {
    this.found?.clear?.();
    const terms = termsOf(this.query);
    const target = this.target;
    this.found = !target || !terms.length ? null : isFindable(target) ? target.find(terms) : findInPage(target, terms);
    this.count = this.found?.count ?? 0;
    this.at = this.count ? ((i % this.count) + this.count) % this.count : -1;
    if (this.at >= 0) this.found!.go(this.at);
  }
  next = () => this.run(this.at + 1);
  prev = () => this.run(this.at < 0 ? -1 : this.at - 1);
  private onKey = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) this.prev();
      else this.next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      const found = this.found;
      this.close();
      found?.leave?.();
    }
  };
  render() {
    if (!this.open) return html``;
    const status = !this.query.trim() ? '' : this.count ? t('{n} of {count}', { n: this.at + 1, count: this.count }) : t('Not found');
    return html`<div class="to-find" role="search" aria-label=${t('Find in this document')}>
      <input type="search" class="to-find-input" placeholder=${t('Find in this document')} aria-label=${t('Find in this document')} autocomplete="off" .value=${this.query} @input=${(e: Event) => ((this.query = (e.target as HTMLInputElement).value), this.run(0))} @keydown=${this.onKey} />
      <span class="to-find-count" role="status" aria-live="polite">${status}</span>
      <button type="button" class="to-btn to-tool" aria-label=${t('Previous')} title=${t('Previous')} ?disabled=${!this.count} @click=${this.prev}>${icon(UI.up, 18)}</button>
      <button type="button" class="to-btn to-tool" aria-label=${t('Next')} title=${t('Next')} ?disabled=${!this.count} @click=${this.next}>${icon(UI.down, 18)}</button>
      <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.close()}>${icon(UI.close, 18)}</button>
    </div>`;
  }
}
customElements.define('to-find', ToFind);
