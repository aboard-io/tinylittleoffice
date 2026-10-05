/**
 * <to-write>: a one-page rich text editor built on contentEditable.
 *
 * Renders into light DOM like every TinyOffice component; here that also
 * matters functionally, because execCommand and the selection APIs are
 * unreliable inside shadow roots in some browsers.
 */
import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { parseDoc, serializeDoc, docText, type Block, type BlockKind, type Run } from '../lib/richtext.ts';

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
    return this;
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
    this.page = this.querySelector<HTMLElement>('.write-page')!;
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
    return html`<sl-tooltip content=${key ? `${label} (${key})` : label} hoist>
      <sl-button
        class="icon"
        size="small"
        aria-label=${label}
        aria-pressed=${pressed ? 'true' : 'false'}
        @mousedown=${(e: Event) => e.preventDefault()}
        @click=${() => this.exec(cmd, arg)}
      >${icon(UI[ico], 16)}<span class="sr-only">${label}</span></sl-button>
    </sl-tooltip>`;
  }

  render() {
    const f = this.fmt;
    return html`
      <div class="to-toolbar write-toolbar" role="toolbar" aria-label="Formatting">
        <sl-button-group label="Text style">
          ${this.btn('Bold', 'bold', f.b, 'bold', undefined, 'Ctrl+B')}
          ${this.btn('Italic', 'italic', f.i, 'italic', undefined, 'Ctrl+I')}
          ${this.btn('Underline', 'underline', f.u, 'underline', undefined, 'Ctrl+U')}
          ${this.btn('Strikethrough', 'strike', f.s, 'strikeThrough')}
        </sl-button-group>
        <sl-button-group label="Block">
          ${this.btn('Heading', 'h1', f.block === 'h1', 'formatBlock', 'h1', 'Ctrl+1')}
          ${this.btn('Subheading', 'h2', f.block === 'h2', 'formatBlock', 'h2', 'Ctrl+2')}
          ${this.btn('Paragraph', 'p', f.block === 'p' || f.block === 'div', 'formatBlock', 'p', 'Ctrl+0')}
        </sl-button-group>
        <sl-button-group label="Lists">
          ${this.btn('Bulleted list', 'ul', f.block === 'ul', 'insertUnorderedList')}
          ${this.btn('Numbered list', 'ol', f.block === 'ol', 'insertOrderedList')}
        </sl-button-group>
      </div>
      <div
        class="write-page ${this.value ? '' : 'blank'}"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        aria-label="Document"
        data-placeholder=""
        @input=${this.onInput}
        @keydown=${this.onKey}
        @paste=${this.onPaste}
        @focus=${this.onSelection}
      ></div>
      <div class="to-foot write-foot">
        <span>${this.words} ${this.words === 1 ? 'word' : 'words'}</span>
        <span>${this.chars} characters</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-write': ToWrite;
  }
}
