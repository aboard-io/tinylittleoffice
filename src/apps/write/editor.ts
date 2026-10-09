/**
 * <to-write-editor>: the Write app. One bar (Insert ▾, the kinds of block, the marks, link, footnote, icon,
 * lists, indent, align, paper, undo and redo) over one <to-text shape=doc> that owns the whole document's
 * blocks and is drawn as paper. The editor's ops are applied here with the kernel, recorded in the op-log
 * history (src/kit/history.ts) and written back to the shell as TLO in "docchange"; the title the shell
 * edits is a head field, and comes back as a `head` op in the history like any other.
 *
 * What is not words is a card the editor asks this host to draw: a table block as a grid whose cells are
 * `cells` ops, worked out in place by the formula engine; another document as a picture of its first page;
 * a web address alone as a click-to-load card (<to-embed>). The document's own head fields (an invoice's
 * from and to) are inputs over the text; the footnotes are listed under it from notesOf, and the words are
 * counted at the foot.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Pilcrow, Ruler } from 'lucide';
import { applyAll, isEmbed, noteRuns, notesOf, parse, plainText, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { tool } from '../../kit/bar.ts';
import { linkToFence } from '../../kit/clipboard.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { History } from '../../kit/history.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { caret, insertBlocks, type Sel } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { PAPERS, blankTable, defaultPaper, fenceTitle, fieldsOf, insertRowAfter, paperOf, setCellAt, tableView, webBlock, wordCount, type Paper } from './model.ts';
import { fenceLink } from './view.ts';
import type { ToWriteTable } from './table.ts';
import '../../kit/bar.ts';
import '../../kit/dialog.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './table.ts';
import './style.css';

export const tag = 'to-write-editor';

/** A question with one box: what it asks, the box's name and hint, what is in it to begin with, and its kind. */
interface Ask {
  heading: string;
  label: string;
  placeholder: string;
  value: string;
  type: 'url' | 'text';
  done: (answer: string | null) => void;
}

export class ToWriteEditor extends LitElement {
  static properties = { value: {}, doc: { state: true }, asking: { state: true }, cardAt: { state: true } };
  /** The document's text, from the shell. */
  declare value: string;
  declare doc: Doc;
  /** The question open in the dialog, if any. */
  declare asking: Ask | null;
  /** The card whose menu is open: its block. */
  declare cardAt: number;
  readonly history = new History();
  /** The text last written out, so a value coming back is known for ours. */
  private emitted = '';
  /** The selection the editor last reported, for the bar's pressed states. */
  private sel: Sel | null = null;

  constructor() {
    super();
    this.value = '';
    this.doc = parse('');
    this.asking = null;
    this.cardAt = -1;
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
    return this.querySelector<ToText>('to-text.write-text')!;
  }

  /* ---------- the document ---------- */

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
  /** Ops from anywhere but the text (a cell, a head field, a block put in): applied, recorded with the caret as it is. */
  private edit(ops: Op[], after: Sel | null = this.text?.sel ?? null, key?: string) {
    if (!ops.length) return;
    const was = this.doc;
    this.doc = applyAll(was, ops);
    this.history.record(was, ops, this.text?.sel ?? null, after, key);
    this.emit();
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

  /* ---------- putting things in ---------- */

  /** Where the caret is, or the end of the text. */
  private where(): Sel {
    const blocks = this.doc.blocks;
    return this.text?.sel ?? caret(Math.max(0, blocks.length - 1), 0);
  }
  /** A block put in at the caret (the editor's own rule for blocks: words join, cards stand alone), with the caret after it. */
  private insertBlock(b: Block) {
    const blocks = this.doc.blocks.length ? this.doc.blocks : [{ k: 'p', runs: [] } as Block];
    const prefix: Op[] = this.doc.blocks.length ? [] : [{ op: 'splice', at: 0, n: 0, blocks }];
    const e = insertBlocks(blocks, this.where(), [b]);
    this.edit([...prefix, ...e.ops], e.sel);
    void this.updateComplete.then(() => (this.text.sel = e.sel));
  }
  /** One question, asked in the dialog; null when it is closed without an answer. */
  private ask(heading: string, label: string, placeholder: string, value = '', type: 'url' | 'text' = 'url'): Promise<string | null> {
    return new Promise((done) => {
      this.asking = { heading, label, placeholder, value, type, done };
      void this.updateComplete.then(() => void this.querySelector<ToDialog>('to-dialog.write-ask')?.show());
    });
  }
  private answer(value: string | null) {
    const a = this.asking;
    if (!a) return;
    this.asking = null;
    this.querySelector<ToDialog>('to-dialog.write-ask')?.close();
    a.done(value);
  }
  private async insertPicture() {
    const url = await this.ask(t('Picture'), t('Address of the picture'), 'https://');
    if (url?.trim()) this.insertBlock({ k: 'img', alt: '', url: url.trim() });
  }
  private async insertWeb() {
    const url = await this.ask(t('From the web'), t('Address of a video, a post, a song, a place, a page'), 'https://');
    if (url?.trim()) this.insertBlock(webBlock(url));
  }
  private async insertDocument() {
    const url = await this.ask(t('A document by link'), t('A TinyLittleOffice link'), 'https://tinylittleoffice.com/#/v1/…');
    const fence = url && linkToFence(url.trim());
    if (fence) this.insertBlock(fence);
  }
  /** An icon from the kit's library (a lazy chunk, the whole of Lucide), put in at the caret. */
  private async insertIcon() {
    const sel = this.text.sel;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon();
    if (!name) return;
    if (sel) this.text.sel = sel;
    this.text.exec('icon', name);
  }
  private inserts(): MenuItem[] {
    return [
      { label: t('Table'), icon: UI.table, does: () => this.insertBlock(blankTable()) },
      { label: t('Picture…'), icon: UI.image, does: () => void this.insertPicture() },
      { label: t('From the web…'), icon: UI.globe, does: () => void this.insertWeb() },
      { label: t('A document by link…'), icon: UI.insert, does: () => void this.insertDocument() },
      { label: t('Date'), icon: UI.calendar, does: () => this.text.exec('date') },
    ];
  }

  /* ---------- the paper and the fields ---------- */

  private setPaper(paper: Paper) {
    this.edit([{ op: 'head', key: 'paper', value: paper === defaultPaper() ? undefined : paper }]);
  }
  private paperItems(): MenuItem[] {
    const now = paperOf(this.doc);
    return (Object.keys(PAPERS) as Paper[]).map((p) => ({ label: PAPERS[p].name, checked: p === now, does: () => this.setPaper(p) }));
  }
  private alignItems(): MenuItem[] {
    const now = this.sel ? this.text.alignment : 'left';
    const pick = (how: 'left' | 'center' | 'right' | 'justify', label: string, ic: typeof UI.alignLeft) => ({ label, icon: ic, checked: now === how, does: () => this.text.exec(how) });
    return [pick('left', t('Align left'), UI.alignLeft), pick('center', t('Centre'), UI.alignCenter), pick('right', t('Align right'), UI.alignRight), pick('justify', t('Justify'), UI.alignJustify)];
  }
  private setField(key: string, value: string) {
    this.edit([{ op: 'head', key, value: value.replace(/\n/g, ' | ').trim() || '' }]);
  }
  private renderFields() {
    const fields = fieldsOf(this.doc);
    if (!fields.length) return nothing;
    return html`<dl class="write-fields">
      ${fields.map(([k, v]) => {
        const lines = v.split(' | ');
        const tall = lines.length > 1 || k === 'from' || k === 'to';
        return html`<div>
          <dt><label for="write-field-${k}">${k}</label></dt>
          <dd>
            ${tall
              ? html`<textarea id="write-field-${k}" rows=${Math.max(2, lines.length)} .value=${lines.join('\n')} @change=${(e: Event) => this.setField(k, (e.target as HTMLTextAreaElement).value)}></textarea>`
              : html`<input id="write-field-${k}" type=${k === 'date' || k === 'due' ? 'date' : 'text'} .value=${v} @change=${(e: Event) => this.setField(k, (e.target as HTMLInputElement).value)} />`}
          </dd>
        </div>`;
      })}
    </dl>`;
  }

  /* ---------- the cards ---------- */

  /** What the editor shows for a block that is not words: a grid for a table, a picture of another document, a thing from the web. */
  private card = (b: Block, at: number): TemplateResult | null => {
    if (b.k === 'table') {
      const v = tableView(this.doc, at);
      if (!v) return null;
      return html`<to-write-table .view=${v} currency=${this.doc.head.currency ?? ''} @wt-cell=${(e: CustomEvent<{ r: number; c: number; raw: string }>) => this.onCell(at, e)} @wt-row=${(e: CustomEvent<{ r: number }>) => this.edit(insertRowAfter(at, e.detail.r))}></to-write-table>`;
    }
    if (b.k === 'fence' && b.lang === 'signatures') {
      const rows = parse(b.body).blocks.find((x) => x.k === 'table');
      const signed = rows?.k === 'table' ? rows.rows.filter((r) => r[0]) : [];
      return html`<div class="write-signatures" role="group" aria-label=${t('Signatures')}>
        ${signed.length ? signed.map((r) => html`<div><b>${r[0]}</b><small>${t('Signed with the key ending {key}', { key: r[1].slice(-10) })}</small></div>`) : html`<span class="to-hint">${t('No one has signed yet.')}</span>`}
      </div>`;
    }
    if (b.k === 'fence' && b.lang) {
      const def = lookup.appOf(b.lang);
      const page = def?.view(b.body, { small: true })[0];
      const name = fenceTitle(b.body) || def?.name || b.lang;
      return html`<figure class="write-doc">
        ${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${name}>${unsafeSVG(page.svg)}</svg>` : html`<pre>${b.body.split('\n').slice(0, 6).join('\n')}</pre>`}
        <figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption>
      </figure>`;
    }
    if (b.k === 'p' && isEmbed(b)) return html`<to-embed url=${plainText(b.runs).trim()}></to-embed>`;
    return null;
  };
  private onCell(at: number, e: CustomEvent<{ r: number; c: number; raw: string }>) {
    const { r, c, raw } = e.detail;
    this.edit(setCellAt(this.doc, at, r, c, raw), null, `cell:${at}:${r}:${c}`);
  }
  /** A card tapped: what can be done to it, beside it. */
  private onCardTap = (e: CustomEvent<{ block: number }>) => {
    const at = e.detail.block;
    const b = this.doc.blocks[at];
    if (!b || b.k === 'table') return;
    this.cardAt = at;
    const card = this.text.tx.children[at] as HTMLElement | undefined;
    void this.updateComplete.then(async () => {
      const menu = this.querySelector<ToMenu>('to-menu.write-cardmenu');
      if (!menu || !card) return;
      await menu.updateComplete;
      menu.openAt(card);
    });
  };
  private cardItems(): MenuItem[] {
    const at = this.cardAt;
    const b = this.doc.blocks[at];
    if (!b) return [];
    const remove = { label: t('Remove'), icon: UI.trash, does: () => this.edit([{ op: 'splice', at, n: 1, blocks: [] }], caret(Math.max(0, at - 1), 0)) };
    if (b.k === 'fence' && b.lang && b.lang !== 'signatures') {
      const link = fenceLink(b.lang, b.body, `${location.origin}${location.pathname}`);
      return [{ label: t('Open in {app}', { app: lookup.appOf(b.lang)?.name ?? b.lang }), icon: UI.open, does: () => void window.open(link, '_blank', 'noopener') }, remove];
    }
    if (b.k === 'img' || (b.k === 'p' && isEmbed(b))) {
      const url = b.k === 'img' ? b.url : plainText(b.runs).trim();
      return [
        {
          label: t('Change the address…'),
          icon: UI.pen,
          does: async () => {
            const next = await this.ask(b.k === 'img' ? t('Picture') : t('From the web'), t('Address'), 'https://', url);
            if (next?.trim()) this.edit([{ op: 'splice', at, n: 1, blocks: [b.k === 'img' ? { ...b, url: next.trim() } : webBlock(next)] }]);
          },
        },
        remove,
      ];
    }
    return [remove];
  }

  /* ---------- the notes ---------- */

  private noteWords(fn: string): unknown[] {
    return noteRuns(fn).map((run: Run) => {
      if (run.ic) return html`<span class="ic" data-icon=${run.ic} role="img" aria-label=${run.ic}></span>`;
      let node: unknown = run.t;
      if (run.h) node = html`<mark>${node}</mark>`;
      if (run.s) node = html`<s>${node}</s>`;
      if (run.u) node = html`<u>${node}</u>`;
      if (run.i) node = html`<i>${node}</i>`;
      if (run.b) node = html`<b>${node}</b>`;
      if (run.href) node = html`<a href=${run.href} target="_blank" rel="noopener">${node}</a>`;
      return node;
    });
  }
  /** Back to a note's mark in the text: the mark takes the focus. */
  private backTo(i: number) {
    const chips = this.text.tx.querySelectorAll<HTMLElement>('.fn');
    chips[i]?.focus({ preventScroll: true });
    chips[i]?.scrollIntoView({ block: 'center' });
  }
  private renderNotes() {
    const notes = notesOf(this.doc.blocks);
    if (!notes.length) return nothing;
    return html`<section class="write-notes" role="doc-endnotes" aria-label=${t('Footnotes')}>
      <hr />
      <ol>
        ${notes.map((fn, i) => html`<li>${this.noteWords(fn)} <button type="button" class="write-back" role="doc-backlink" aria-label=${t('Back to footnote {n} in the text', { n: i + 1 })} title=${t('Back to the text')} @click=${() => this.backTo(i)}>↩</button></li>`)}
      </ol>
    </section>`;
  }

  /* ---------- drawing ---------- */

  render() {
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    const kind = x?.kind ?? null;
    const on = (c: 'b' | 'i' | 'u' | 's' | 'h') => !!m[c];
    const paper = paperOf(this.doc);
    const words = wordCount(this.doc);
    const alignIcon = { left: UI.alignLeft, center: UI.alignCenter, right: UI.alignRight, justify: UI.alignJustify }[x?.alignment ?? 'left'];
    const a = this.asking;
    return html`<to-bar class="write-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Title'), icon: UI.text, keep: true, pressed: kind === 'title', does: () => this.text.exec(kind === 'title' ? 'p' : 'title') })}
        ${tool({ label: t('Heading'), icon: UI.heading1, keep: true, pressed: kind === 'h1', does: () => this.text.exec(kind === 'h1' ? 'p' : 'h1') })}
        ${tool({ label: t('Subheading'), icon: UI.heading, keep: true, pressed: kind === 'h2', does: () => this.text.exec(kind === 'h2' ? 'p' : 'h2') })}
        ${tool({ label: t('Paragraph'), icon: Pilcrow, keep: true, pressed: kind === 'p', does: () => this.text.exec('p') })}
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: on('b'), does: () => this.text.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: on('i'), does: () => this.text.exec('i') })}
        ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: on('u'), does: () => this.text.exec('u') })}
        ${tool({ label: t('Strikethrough'), icon: UI.strike, keep: true, pressed: on('s'), does: () => this.text.exec('s') })}
        ${tool({ label: t('Highlight'), icon: UI.highlight, keep: true, pressed: on('h'), does: () => this.text.exec('h') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.text.exec('link') })}
        ${tool({ label: t('Footnote'), icon: UI.footnote, keep: true, does: () => this.text.exec('fn') })}
        ${tool({ label: t('Icon'), icon: UI.icon, keep: true, does: () => void this.insertIcon() })}
        ${tool({ label: t('Bulleted list'), icon: UI.list, keep: true, pressed: kind === 'ul', does: () => this.text.exec('ul') })}
        ${tool({ label: t('Numbered list'), icon: UI.listOrdered, keep: true, pressed: kind === 'ol', does: () => this.text.exec('ol') })}
        ${tool({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', keep: true, disabled: kind !== 'ul' && kind !== 'ol', does: () => this.text.exec('outdent') })}
        ${tool({ label: t('Indent'), icon: UI.indent, keys: 'Tab', keep: true, disabled: kind !== 'ul' && kind !== 'ol', does: () => this.text.exec('indent') })}
        <to-menu class="write-align" icon-only .label=${t('Align')} .icon=${alignIcon} .items=${this.alignItems()}></to-menu>
        <to-menu class="write-paper" icon-only .label=${t('Paper: {paper}', { paper: PAPERS[paper].name })} .icon=${Ruler} .items=${this.paperItems()}></to-menu>
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.history.canUndo, does: () => this.step('undo') })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.history.canRedo, does: () => this.step('redo') })}
      </to-bar>
      <div class="write-page" data-paper=${paper}>
        ${this.renderFields()}
        <to-text class="write-text" shape="doc" .blocks=${this.doc.blocks} .card=${this.card} label=${t('Document')} placeholder=${t('Write here.')} @text-ops=${this.onOps} @text-select=${this.onSelect} @text-embed=${this.onCardTap}></to-text>
        ${this.renderNotes()}
      </div>
      <div class="write-foot"><span>${t('{n|one word|# words}', { n: words })}</span><span>${PAPERS[paper].name}</span></div>
      <to-menu class="write-cardmenu" .label=${t('This card')} .items=${this.cardItems()}></to-menu>
      <to-dialog class="write-ask" heading=${a?.heading ?? ''} @to-close=${() => this.answer(null)} .body=${a
        ? html`<form class="write-ask-form" @submit=${(e: Event) => (e.preventDefault(), this.answer((e.target as HTMLFormElement).querySelector('input')!.value))}>
            <label class="to-field"><span>${a.label}</span><input type=${a.type} name="answer" .value=${a.value} placeholder=${a.placeholder} autocomplete="off" autocapitalize="off" spellcheck="false" inputmode=${a.type === 'url' ? 'url' : 'text'} enterkeyhint="done" required /></label>
            <div class="to-row"><button type="submit" class="to-btn primary">${icon(UI.check, 16)}<span>${t('OK')}</span></button></div>
          </form>`
        : nothing}></to-dialog>`;
  }
  protected updated(changed: Map<string, unknown>) {
    if (changed.has('asking') && this.asking) void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.write-ask-form input')?.focus({ preventScroll: true }));
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToWriteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-write-editor': ToWriteEditor;
    'to-write-table': ToWriteTable;
  }
}
