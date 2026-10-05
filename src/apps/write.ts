/**
 * <to-write>: a one-page rich text editor built on contentEditable.
 *
 * This component renders into light DOM on purpose: document.execCommand and
 * selection APIs are unreliable inside shadow roots in some browsers, and the
 * editor needs both. Its styles are scoped with a "to-write" selector instead.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { parseDoc, serializeDoc, docText, type Block, type BlockKind, type Run } from '../lib/richtext.ts';

const STYLE = `
to-write { display: block; font: 13px/1.4 var(--font); color: var(--ink); }
to-write * { box-sizing: border-box; }
to-write .toolbar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; padding: 4px 6px; border-bottom: 1px solid var(--ink); background: var(--paper-dim); }
to-write .toolbar .sep { width: 1px; align-self: stretch; background: var(--ink); opacity: .4; margin: 0 2px; }
to-write .toolbar .spacer { flex: 1; }
to-write button { font: inherit; color: var(--ink); background: var(--paper); border: 1px solid var(--ink); border-radius: 4px; padding: 2px 4px; min-width: 24px; min-height: 24px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 1px 1px 0 var(--ink); line-height: 1; }
to-write button:hover { background: var(--paper-dim); }
to-write button:active, to-write button[aria-pressed="true"] { background: var(--ink); color: var(--paper); box-shadow: none; transform: translate(1px,1px); }
to-write button:focus-visible, to-write .page:focus-visible { outline: 2px dotted var(--ink); outline-offset: 1px; }
to-write .page { position: relative; min-height: 420px; padding: 28px 40px; outline: none; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.5; cursor: text; }
to-write .page:empty::before, to-write .page.blank::before { content: attr(data-placeholder); opacity: .5; position: absolute; pointer-events: none; }
to-write .page h1 { font-size: 24px; margin: 0 0 8px; line-height: 1.2; }
to-write .page h2 { font-size: 17px; margin: 14px 0 4px; line-height: 1.25; }
to-write .page p { margin: 0 0 8px; }
to-write .page ul, to-write .page ol { margin: 0 0 8px; padding-left: 24px; }
to-write .page li { margin: 0; }
to-write .foot { display: flex; gap: 12px; padding: 4px 8px; border-top: 1px solid var(--ink); font-size: 11px; opacity: .75; }
to-write .hint { font-size: 11px; opacity: .7; }
to-write .lucide { flex-shrink: 0; }
`;

const KIND_TAG: Record<BlockKind, string> = { p: 'p', h1: 'h1', h2: 'h2', ul: 'li', ol: 'li' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function runsToHtml(runs: Run[]): string {
  if (!runs.length) return '<br>';
  return runs
    .map((r) => {
      let h = esc(r.t);
      if (r.s) h = `<s>${h}</s>`;
      if (r.u) h = `<u>${h}</u>`;
      if (r.i) h = `<i>${h}</i>`;
      if (r.b) h = `<b>${h}</b>`;
      return h;
    })
    .join('');
}

export function blocksToHtml(blocks: Block[]): string {
  let out = '';
  let list: 'ul' | 'ol' | null = null;
  for (const b of blocks) {
    const wantList = b.k === 'ul' || b.k === 'ol' ? b.k : null;
    if (list && list !== wantList) {
      out += `</${list}>`;
      list = null;
    }
    if (wantList && !list) {
      out += `<${wantList}>`;
      list = wantList;
    }
    const tag = KIND_TAG[b.k];
    out += `<${tag}>${runsToHtml(b.runs)}</${tag}>`;
  }
  if (list) out += `</${list}>`;
  return out || '<p><br></p>';
}

type Flags = { b: boolean; i: boolean; u: boolean; s: boolean };

/** Walk the editor DOM and produce blocks. Tolerant of whatever contentEditable emits. */
export function domToBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;

  const open = (k: BlockKind) => {
    cur = { k, runs: [] };
    blocks.push(cur);
  };
  const close = () => {
    cur = null;
  };
  const addText = (text: string, f: Flags, k: BlockKind) => {
    if (!cur) open(k);
    const t = text.replace(/ /g, ' ');
    if (!t) return;
    const run: Run = { t };
    if (f.b) run.b = true;
    if (f.i) run.i = true;
    if (f.u) run.u = true;
    if (f.s) run.s = true;
    const last = cur!.runs[cur!.runs.length - 1];
    if (last && !!last.b === f.b && !!last.i === f.i && !!last.u === f.u && !!last.s === f.s) last.t += t;
    else cur!.runs.push(run);
  };

  /** A <br> is a line break only if something follows it inside its block. */
  const isTrailingBr = (br: Node, boundary: Node): boolean => {
    let n: Node | null = br;
    while (n && n !== boundary) {
      if (n.nextSibling) return false;
      n = n.parentNode;
    }
    return true;
  };

  const inline = (node: Node, f: Flags, k: BlockKind, boundary: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      addText(node.textContent ?? '', f, k);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') {
      if (!cur) open(k);
      if (!isTrailingBr(el, boundary)) {
        close();
        open(k);
      }
      return;
    }
    const nf: Flags = { ...f };
    const st = el.style;
    if (tag === 'B' || tag === 'STRONG' || st.fontWeight === 'bold' || parseInt(st.fontWeight) >= 600) nf.b = true;
    if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') nf.i = true;
    if (tag === 'U' || st.textDecoration.includes('underline')) nf.u = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || st.textDecoration.includes('line-through')) nf.s = true;
    if (isBlockTag(tag)) {
      block(el, k);
      return;
    }
    for (const child of Array.from(el.childNodes)) inline(child, nf, k, boundary);
  };

  const plain: Flags = { b: false, i: false, u: false, s: false };

  const block = (el: HTMLElement, inherited: BlockKind) => {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') {
      const k: BlockKind = tag === 'UL' ? 'ul' : 'ol';
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'LI') {
          close();
          open(k);
          for (const c of Array.from(child.childNodes)) inline(c, plain, k, child);
          close();
        } else inline(child, plain, k, el);
      }
      close();
      return;
    }
    const k: BlockKind = tag === 'H1' ? 'h1' : tag === 'H2' || tag === 'H3' ? 'h2' : tag === 'LI' ? inherited : 'p';
    close();
    open(k);
    for (const c of Array.from(el.childNodes)) inline(c, plain, k, el);
    close();
  };

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE && isBlockTag((child as HTMLElement).tagName)) {
      block(child as HTMLElement, 'p');
    } else inline(child, plain, 'p', root);
  }
  return blocks.length ? blocks : [{ k: 'p', runs: [] }];
}

function isBlockTag(tag: string): boolean {
  return ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE'].includes(tag);
}

@customElement('to-write')
export class ToWrite extends LitElement {
  @property() value = '';
  @state() private fmt = { b: false, i: false, u: false, s: false, block: 'p' };
  @state() private words = 0;
  @state() private chars = 0;
  private lastEmitted = '';
  private page?: HTMLElement;

  createRenderRoot() {
    return this; // light DOM, see note at top of file
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelection);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this.onSelection);
  }

  firstUpdated() {
    this.page = this.querySelector<HTMLElement>('.page')!;
    this.loadHtml();
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.lastEmitted = this.value;
      if (this.page) this.loadHtml();
    }
  }

  private loadHtml() {
    const blocks = parseDoc(this.value);
    this.page!.innerHTML = blocksToHtml(blocks);
    this.count(blocks);
  }

  private count(blocks: Block[]) {
    const text = docText(blocks);
    this.chars = text.replace(/\n/g, '').length;
    this.words = (text.match(/\S+/g) ?? []).length;
  }

  private onInput = () => {
    const blocks = domToBlocks(this.page!);
    this.count(blocks);
    this.lastEmitted = serializeDoc(blocks);
    this.page!.classList.toggle('blank', this.lastEmitted === '');
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  };

  private onSelection = () => {
    if (!this.page || !this.page.contains(document.activeElement) && document.activeElement !== this.page) return;
    const block = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
    this.fmt = {
      b: document.queryCommandState('bold'),
      i: document.queryCommandState('italic'),
      u: document.queryCommandState('underline'),
      s: document.queryCommandState('strikeThrough'),
      block: document.queryCommandState('insertUnorderedList') ? 'ul' : document.queryCommandState('insertOrderedList') ? 'ol' : block,
    };
  };

  private exec(cmd: string, arg?: string) {
    this.page?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd, false, arg);
    this.onInput();
    this.onSelection();
  }

  private onPaste = (e: ClipboardEvent) => {
    // Keep pasted content plain: it is the compact, predictable path.
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  };

  private onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const map: Record<string, [string, string?]> = {
      b: ['bold'], i: ['italic'], u: ['underline'], '1': ['formatBlock', 'h1'], '2': ['formatBlock', 'h2'], '0': ['formatBlock', 'p'],
    };
    if (map[k] && !e.shiftKey) {
      e.preventDefault();
      this.exec(map[k][0], map[k][1]);
    }
  };

  private btn(label: string, ico: keyof typeof UI, pressed: boolean, cmd: string, arg?: string, key?: string) {
    return html`<button
      type="button"
      title=${key ? `${label} (${key})` : label}
      aria-label=${label}
      aria-pressed=${pressed ? 'true' : 'false'}
      @mousedown=${(e: Event) => e.preventDefault()}
      @click=${() => this.exec(cmd, arg)}
    >${icon(UI[ico], 14)}</button>`;
  }

  render() {
    const f = this.fmt;
    return html`
      <style>${STYLE}</style>
      <div class="toolbar" role="toolbar" aria-label="Formatting">
        ${this.btn('Bold', 'bold', f.b, 'bold', undefined, 'Ctrl+B')}
        ${this.btn('Italic', 'italic', f.i, 'italic', undefined, 'Ctrl+I')}
        ${this.btn('Underline', 'underline', f.u, 'underline', undefined, 'Ctrl+U')}
        ${this.btn('Strikethrough', 'strike', f.s, 'strikeThrough')}
        <span class="sep"></span>
        ${this.btn('Heading', 'h1', f.block === 'h1', 'formatBlock', 'h1', 'Ctrl+1')}
        ${this.btn('Subheading', 'h2', f.block === 'h2', 'formatBlock', 'h2', 'Ctrl+2')}
        ${this.btn('Paragraph', 'p', f.block === 'p' || f.block === 'div', 'formatBlock', 'p', 'Ctrl+0')}
        <span class="sep"></span>
        ${this.btn('Bulleted list', 'ul', f.block === 'ul', 'insertUnorderedList')}
        ${this.btn('Numbered list', 'ol', f.block === 'ol', 'insertOrderedList')}
        <span class="spacer"></span>
        <span class="hint">Formatting costs a byte or two. Plain text goes furthest.</span>
      </div>
      <div
        class="page ${this.value ? '' : 'blank'}"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Document"
        data-placeholder="Start typing. One short page is plenty."
        @input=${this.onInput}
        @keydown=${this.onKey}
        @paste=${this.onPaste}
        @focus=${this.onSelection}
      ></div>
      <div class="foot">
        <span>${this.words} ${this.words === 1 ? 'word' : 'words'}</span>
        <span>${this.chars} characters</span>
        ${nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-write': ToWrite;
  }
}
