/**
 * <to-notes>: a document's footnotes drawn where they are listed (the end of a page, a slide's foot, under an
 * outline), each note's words typed where they are drawn (docs/editing.md §2): a <to-text shape=line> over the
 * note's runs, rich as a note is (its marks and links: no blocks, no note inside a note). The host gives the
 * notes' words in the order of their marks (`notes`, as the document holds them) and answers what it hears:
 *
 *   note-change  {nth, fn}    the note's words now (inline Markdown): the host writes them on its mark, one `text` op.
 *   note-back    {nth}        Enter or Escape in the note, or its ↩ (`backs`): back to the words, after the mark.
 *   note-remove  {nth, back}  a note emptied and left, or Backspace at the start of an empty one: its mark goes;
 *                             `back`, the caret goes where the mark was.
 *
 * focusNote(nth) puts the caret at the end of a note's words and brings it into view (a mark tapped, a new
 * footnote). noteMarks() and noteIndex() are how a host finds a note's mark among its blocks.
 */
import { LitElement, html, nothing } from 'lit';
import { applyAll, isAtomic, noteRuns, writeInline, type Block, type Run } from '../doc/index.ts';
import { t } from './i18n.ts';
import { blockLength, caret } from './textops.ts';
import type { TextOps, ToText } from './text.ts';
import './text.ts';
import { reveal } from './scroll.ts';

/** A footnote's mark among blocks: its block, its offset there (one character), and its words. */
export interface NoteMark {
  block: number;
  offset: number;
  fn: string;
}

/** Every footnote mark in the blocks, in order. */
export function noteMarks(blocks: readonly Block[]): NoteMark[] {
  const out: NoteMark[] = [];
  blocks.forEach((b, block) => {
    if (!('runs' in b)) return;
    let offset = 0;
    for (const r of b.runs as Run[]) {
      if (r.fn !== undefined) out.push({ block, offset, fn: r.fn });
      offset += isAtomic(r) ? 1 : r.t.length;
    }
  });
  return out;
}
/** Which note mark `nth` of block `block` is, among all the marks of the blocks. */
export const noteIndex = (marks: readonly NoteMark[], block: number, nth: number): number => marks.filter((m) => m.block < block).length + nth;

/** A note's words as the one paragraph its editor holds. */
const noteBlock = (fn: string): Block => ({ k: 'p', runs: noteRuns(fn) });
/** A note's paragraph as the document holds it: inline Markdown on one line. */
const fnOf = (b: Block): string => ('runs' in b ? writeInline(b.runs).replace(/\n/g, ' ') : '');

export class ToNotes extends LitElement {
  static properties = { notes: { attribute: false }, backs: { type: Boolean } };
  /** Each note's words, in the order of their marks. */
  declare notes: string[];
  /** A ↩ beside each note, back to its mark (the Word Processor's endnotes). */
  declare backs: boolean;
  /** Each note's paragraph and the words it was last written as: kept while the document says the same, so the editor keeps its element and its caret. */
  private held: { fn: string; blocks: Block[] }[] = [];
  /** The note whose leaving is already answered (Escape, Enter, Backspace): its focusout says nothing more. */
  private settled = -1;

  constructor() {
    super();
    this.notes = [];
    this.backs = false;
  }
  createRenderRoot() {
    return this;
  }
  /** The note's editor. */
  field(nth: number): ToText | null {
    return this.querySelectorAll<ToText>('to-text.to-note-words')[nth] ?? null;
  }
  /** The caret at the end of note `nth`'s words, the note in view. */
  async focusNote(nth: number) {
    await this.updateComplete;
    const f = this.field(nth);
    if (!f) return;
    await f.updateComplete;
    f.focus();
    f.sel = caret(0, blockLength(f.model[0]));
    const li = f.closest('li');
    if (li) reveal(li);
  }
  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('notes')) this.held = this.notes.map((fn, i) => (this.held[i]?.fn === fn ? this.held[i] : { fn, blocks: [noteBlock(fn)] }));
  }
  private say<T>(type: string, detail: T) {
    this.dispatchEvent(new CustomEvent<T>(type, { detail, bubbles: true }));
  }
  private onOps(nth: number, e: CustomEvent<TextOps>) {
    e.stopPropagation();
    const was = this.held[nth];
    if (!was) return;
    const block = applyAll({ head: {}, blocks: was.blocks }, e.detail.ops).blocks[0] ?? { k: 'p', runs: [] };
    const fn = fnOf(block);
    this.held[nth] = { fn, blocks: [block] };
    this.requestUpdate();
    this.say('note-change', { nth, fn });
  }
  /** The note left with nothing in it: its mark goes too. */
  private leave(nth: number, back: boolean): boolean {
    if (this.held[nth]?.fn.trim()) return false;
    this.settled = nth;
    this.say('note-remove', { nth, back });
    return true;
  }
  private back(nth: number) {
    if (this.leave(nth, true)) return;
    this.settled = nth;
    this.say('note-back', { nth });
  }
  private onFocusOut(nth: number, e: FocusEvent) {
    const to = e.relatedTarget as Node | null;
    const li = (e.currentTarget as HTMLElement).closest('li');
    if (to && li?.contains(to)) return;
    if (this.settled === nth) return void (this.settled = -1);
    this.leave(nth, false);
  }
  private onFocusIn(nth: number) {
    if (this.settled === nth) this.settled = -1;
  }
  render() {
    if (!this.notes.length) return nothing;
    const stop = (e: Event) => e.stopPropagation();
    return html`<ol class="to-notes">
      ${this.held.map(
        (h, nth) => html`<li class="to-note">
          <to-text
            class="to-note-words"
            shape="line"
            .blocks=${h.blocks}
            label=${t('Footnote {n}', { n: nth + 1 })}
            placeholder=${t("The note's words")}
            @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(nth, e)}
            @text-enter=${(e: Event) => (stop(e), this.back(nth))}
            @text-escape=${(e: Event) => (stop(e), e.preventDefault(), this.back(nth))}
            @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (stop(e), e.detail.dir === 'back' && this.leave(nth, true))}
            @text-select=${stop}
            @text-selectall=${stop}
            @text-note=${stop}
            @focusin=${() => this.onFocusIn(nth)}
            @focusout=${(e: FocusEvent) => this.onFocusOut(nth, e)}
          ></to-text>
          ${
            this.backs
              ? html`<button type="button" class="to-note-back" role="doc-backlink" aria-label=${t('Back to footnote {n} in the text', { n: nth + 1 })} title=${t('Back to the text')} @click=${() => this.back(nth)}>↩</button>`
              : nothing
          }
        </li>`,
      )}
    </ol>`;
  }
}
if (!customElements.get('to-notes')) customElements.define('to-notes', ToNotes);

declare global {
  interface HTMLElementTagNameMap {
    'to-notes': ToNotes;
  }
}
