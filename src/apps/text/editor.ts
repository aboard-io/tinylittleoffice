/**
 * <to-text-editor>: the placeholder editor. One bar (Insert ▾, bold, italic) over the TLO text in a
 * textarea. Replaced by <to-text> on the kernel (docs/kernel.md §4); the bar and the contract with the
 * shell (value in, "docchange" out) are what stays.
 */
import { LitElement, html } from 'lit';
import { tool } from '../../kit/bar.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { Doc } from '../../kit/app.ts';
import type { MenuItem } from '../../kit/menu.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import './style.css';

export const tag = 'to-text-editor';

export class ToTextEditor extends LitElement {
  static properties = { value: {} };
  declare value: Doc;

  constructor() {
    super();
    this.value = '';
  }
  createRenderRoot() {
    return this;
  }
  get area(): HTMLTextAreaElement {
    return this.querySelector('textarea')!;
  }
  /** The text is now `doc`: the shell is told, and writes it into the link. */
  private set(doc: Doc) {
    if (doc === this.value) return;
    this.value = doc;
    this.dispatchEvent(new CustomEvent<Doc>('docchange', { detail: doc, bubbles: true }));
  }
  /** `before` and `after` round the selection (or at the caret), the caret kept. */
  private wrap(before: string, after = before) {
    const a = this.area;
    const { selectionStart: s, selectionEnd: e, value } = a;
    const picked = value.slice(s, e);
    a.setRangeText(before + picked + after, s, e, 'select');
    a.setSelectionRange(s + before.length, e + before.length);
    a.focus();
    this.set(a.value);
  }
  /** A block of text on a line of its own, after the caret's line. */
  private insertBlock(block: string) {
    const a = this.area;
    const at = a.value.indexOf('\n', a.selectionEnd);
    const end = at < 0 ? a.value.length : at;
    const before = a.value.slice(0, end);
    const after = a.value.slice(end);
    const text = `${before.trim() ? '\n\n' : ''}${block}${after.startsWith('\n') ? '' : '\n'}`;
    a.setRangeText(text, end, end, 'end');
    a.focus();
    this.set(a.value);
  }
  private inserts(): MenuItem[] {
    return [
      { label: t('Heading'), icon: UI.heading, does: () => this.insertBlock('## ') },
      { label: t('List'), icon: UI.list, does: () => this.insertBlock('- ') },
      { label: t('Table'), icon: UI.table, does: () => this.insertBlock('What | How many:number\n--- | ---\n | ') },
    ];
  }
  render() {
    return html`<to-bar class="text-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', does: () => this.wrap('**') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', does: () => this.wrap('*') })}
      </to-bar>
      <textarea class="text-body" aria-label=${t('Text')} placeholder=${t('Write here.')} spellcheck="true" .value=${this.value} @input=${(e: Event) => this.set((e.target as HTMLTextAreaElement).value)} @keydown=${(e: KeyboardEvent) => {
        if (!(e.metaKey || e.ctrlKey)) return;
        if (e.key === 'b') (e.preventDefault(), this.wrap('**'));
        if (e.key === 'i') (e.preventDefault(), this.wrap('*'));
      }}></textarea>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTextEditor);
