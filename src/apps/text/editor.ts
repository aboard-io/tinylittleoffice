/**
 * <to-text-editor>: the Text app. One bar (Insert ▾, the marks, a link, undo and redo) over one
 * <to-text shape=doc> that owns the whole document's blocks. The editor's ops are applied here with the
 * kernel, recorded in the op-log history (src/kit/history.ts) and written back to the shell as TLO in
 * "docchange". The title the shell edits is a head field: when the value comes back with a changed head,
 * that is a `head` op in the history like any other. Write proper builds on this.
 */
import { LitElement, html } from 'lit';
import { applyAll, parse, write, type Doc, type Op } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { History } from '../../kit/history.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import type { Sel, TextOps, ToText } from '../../kit/text.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-text-editor';

export class ToTextEditor extends LitElement {
  static properties = { value: {}, doc: { state: true } };
  /** The document's text, from the shell. */
  declare value: string;
  declare doc: Doc;
  readonly history = new History();
  /** The text last written out, so a value coming back is known for ours. */
  private emitted = '';
  /** The selection the editor last reported, for the bar's pressed states. */
  private sel: Sel | null = null;

  constructor() {
    super();
    this.value = '';
    this.doc = parse('');
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('docundo', this.onUndo);
    this.addEventListener('docredo', this.onRedo);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('docundo', this.onUndo);
    this.removeEventListener('docredo', this.onRedo);
  }
  get text(): ToText {
    return this.querySelector<ToText>('to-text')!;
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') && this.value !== this.emitted) this.take(this.value);
  }
  /** A value from outside: the same blocks with another head is the head edited (undoable); anything else is another document. */
  private take(text: string) {
    const next = parse(text);
    const same = next.blocks.length === this.doc.blocks.length && write({ head: {}, blocks: next.blocks }) === write({ head: {}, blocks: this.doc.blocks });
    if (same && this.emitted) {
      const keys = new Set([...Object.keys(this.doc.head), ...Object.keys(next.head)]);
      const ops: Op[] = [...keys].filter((k) => this.doc.head[k] !== next.head[k]).map((key) => ({ op: 'head', key, value: next.head[key] }));
      const sel = this.text?.sel ?? null;
      this.history.record(this.doc, ops, sel, sel);
      this.doc = { head: next.head, blocks: this.doc.blocks };
    } else {
      this.history.clear();
      this.doc = next;
    }
    this.emitted = text;
  }
  /** The document changed here: the shell is told, and writes it into the link. */
  private emit() {
    this.emitted = write(this.doc);
    this.value = this.emitted;
    this.dispatchEvent(new CustomEvent<string>('docchange', { detail: this.emitted, bubbles: true }));
  }
  private onOps = (e: CustomEvent<TextOps>) => {
    const { ops, sel, before, kind } = e.detail;
    const was = this.doc;
    this.doc = applyAll(was, ops);
    this.history.record(was, ops, before, sel, kind);
    this.emit();
  };
  private step(which: 'undo' | 'redo') {
    const s = which === 'undo' ? this.history.undo() : this.history.redo();
    if (!s) return;
    this.doc = applyAll(this.doc, s.ops);
    this.emit();
    void this.updateComplete.then(() => {
      if (s.sel) this.text.sel = s.sel;
      else this.text.focus();
    });
  }
  private onUndo = (e: Event) => {
    e.preventDefault();
    this.step('undo');
  };
  private onRedo = (e: Event) => {
    e.preventDefault();
    this.step('redo');
  };
  private onSelect = (e: CustomEvent<Sel | null>) => {
    this.sel = e.detail;
    this.requestUpdate();
  };

  private inserts(): MenuItem[] {
    return [
      { label: t('Heading'), icon: UI.heading, does: () => this.text.exec('h2') },
      { label: t('List'), icon: UI.list, does: () => this.text.exec('ul') },
      { label: t('Numbered list'), icon: UI.listOrdered, does: () => this.text.exec('ol') },
      { label: t('Footnote'), icon: UI.footnote, does: () => this.text.exec('fn') },
      { label: t('Date'), icon: UI.calendar, does: () => this.text.exec('date') },
    ];
  }
  render() {
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    const kind = x?.kind ?? null;
    const on = (c: 'b' | 'i' | 'u' | 's' | 'h') => !!m[c];
    return html`<to-bar class="text-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: on('b'), does: () => this.text.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: on('i'), does: () => this.text.exec('i') })}
        ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: on('u'), does: () => this.text.exec('u') })}
        ${tool({ label: t('Strikethrough'), icon: UI.strike, keep: true, pressed: on('s'), does: () => this.text.exec('s') })}
        ${tool({ label: t('Highlight'), icon: UI.highlight, keep: true, pressed: on('h'), does: () => this.text.exec('h') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.text.exec('link') })}
        ${tool({ label: t('Heading'), icon: UI.heading, keep: true, pressed: kind === 'h2' || kind === 'h1', does: () => this.text.exec(kind === 'h2' || kind === 'h1' ? 'p' : 'h2') })}
        ${tool({ label: t('List'), icon: UI.list, keep: true, pressed: kind === 'ul', does: () => this.text.exec('ul') })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.history.canUndo, does: () => this.step('undo') })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.history.canRedo, does: () => this.step('redo') })}
      </to-bar>
      <to-text class="text-body" shape="doc" .blocks=${this.doc.blocks} label=${t('Text')} placeholder=${t('Write here.')} @text-ops=${this.onOps} @text-select=${this.onSelect}></to-text>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTextEditor);
