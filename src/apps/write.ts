/**
 * <to-write>: a one-page rich text editor built on contentEditable.
 *
 * Renders into light DOM like every TinyLittleOffice component; here that also
 * matters functionally, because execCommand and the selection APIs are
 * unreliable inside shadow roots in some browsers.
 */
import { LitElement, html, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { linkToRef, makeRef } from '../kit/embed.ts';
import { editRef, insertMenu } from '../kit/browser.ts';
import { MAX_DEPTH, linkify, parseDoc, serializeDoc, docText, type Block, type BlockKind, type Run } from '../lib/richtext.ts';

const KIND_TAG: Record<BlockKind, string> = { p: 'p', h1: 'h1', h2: 'h2', ul: 'li', ol: 'li', e: 'figure' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * An embedded TinyLittleOffice document. <to-embed> draws itself in a shadow root
 * and is not editable, so the text around it treats it as one thing.
 */
export function embedHtml(ref: string): string {
  const r = esc(ref).replace(/"/g, '&quot;');
  return `<to-embed contenteditable="false" tabindex="0" controls ref="${r}" data-ref="${r}"></to-embed>`;
}

function runsToHtml(runs: Run[]): string {
  if (!runs.length) return '<br>';
  return runs
    .map((r) => {
      // Web addresses show as links; in the document they are just text.
      let h = linkify(r.t)
        .map((p) => (p.url ? `<a href="${esc(p.url).replace(/"/g, '&quot;')}">${esc(p.t)}</a>` : esc(p.t)))
        .join('');
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
  const open: string[] = []; // the lists we are inside, outermost first
  const closeTo = (depth: number) => {
    while (open.length > depth) out += `</li></${open.pop()}>`;
  };
  for (const b of blocks) {
    if (b.k === 'ul' || b.k === 'ol') {
      const depth = (b.d ?? 0) + 1;
      closeTo(depth);
      if (open.length === depth && open[depth - 1] !== b.k) closeTo(depth - 1);
      if (open.length === depth) out += '</li>';
      while (open.length < depth) {
        out += `<${b.k}>`;
        open.push(b.k);
        if (open.length < depth) out += '<li>';
      }
      out += `<li>${runsToHtml(b.runs)}`;
      continue;
    }
    closeTo(0);
    out += b.k === 'e' ? embedHtml(b.ref!) : `<${KIND_TAG[b.k]}>${runsToHtml(b.runs)}</${KIND_TAG[b.k]}>`;
  }
  closeTo(0);
  return out || '<p><br></p>';
}

type Flags = { b: boolean; i: boolean; u: boolean; s: boolean };

/** Walk the editor DOM and produce blocks. Tolerant of whatever contentEditable emits. */
export function domToBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  /** How many lists deep we are. */
  let lists = 0;

  const open = (k: BlockKind) => {
    cur = { k, runs: [] };
    if ((k === 'ul' || k === 'ol') && lists > 1) cur.d = Math.min(MAX_DEPTH, lists - 1);
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
    if (el.dataset.ref) {
      // An embed is a block of its own; nothing inside it is text.
      close();
      blocks.push({ k: 'e', runs: [], ref: el.dataset.ref });
      return;
    }
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
      lists++;
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'LI') {
          close();
          open(k);
          for (const c of Array.from(child.childNodes)) inline(c, plain, k, child);
          close();
        } else inline(child, plain, k, el);
      }
      lists--;
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

/** The embedded document just before or after the caret, if the caret is at that edge of its block. */
function embedBeside(page: HTMLElement, forward: boolean): HTMLElement | null {
  const sel = getSelection();
  if (!sel?.rangeCount || !sel.isCollapsed) return null;
  let block: Node | null = sel.anchorNode;
  while (block && block.parentNode !== page) block = block.parentNode;
  if (!block) return null;
  const edge = document.createRange();
  edge.selectNodeContents(block);
  if (forward) edge.setStart(sel.anchorNode!, sel.anchorOffset);
  else edge.setEnd(sel.anchorNode!, sel.anchorOffset);
  if (edge.toString() !== '') return null;
  const beside = forward ? (block as Element).nextElementSibling : (block as Element).previousElementSibling;
  return beside instanceof HTMLElement && beside.dataset.ref !== undefined ? beside : null;
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
  /** Where the caret last was in the text, so a menu can insert there. */
  private caret: Range | null = null;

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
    const sel = getSelection();
    if (sel?.rangeCount && this.page.contains(sel.anchorNode)) this.caret = sel.getRangeAt(0).cloneRange();
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
    // A TinyLittleOffice link on its own becomes a preview of that document.
    const ref = linkToRef(text);
    const link = linkify(text.trim());
    if (ref) this.insertEmbed(ref);
    // Any other web address on its own goes in as a link you can click.
    else if (link.length === 1 && link[0].url) document.execCommand('insertHTML', false, `<a href="${esc(link[0].url).replace(/"/g, '&quot;')}">${esc(link[0].t)}</a>&nbsp;`);
    else document.execCommand('insertText', false, text);
  };

  /** Put an embedded document where the caret is (or at the end), as a block of its own. */
  private insertEmbed(ref: string): HTMLElement | null {
    const page = this.page!;
    page.focus();
    const sel = getSelection()!;
    if (this.caret && !page.contains(sel.anchorNode)) {
      sel.removeAllRanges();
      sel.addRange(this.caret);
    }
    let block: Node | null = page.contains(sel.anchorNode) ? sel.anchorNode : null;
    while (block && block.parentNode !== page) block = block.parentNode;
    const box = document.createElement('div');
    box.innerHTML = embedHtml(ref);
    const el = box.firstElementChild as HTMLElement;
    const after = document.createElement('p');
    after.append(document.createElement('br'));
    // An empty paragraph gives way to the embed; otherwise it goes after the block the caret is in.
    if (block && block.textContent === '' && !(block as HTMLElement).dataset?.ref) (block as Element).replaceWith(el, after);
    else if (block) (block as Element).after(el, after);
    else page.append(el, after);
    sel.collapse(after, 0);
    this.onInput();
    return el;
  }

  private async insertNew(what: string) {
    const el = this.insertEmbed(what === 'chart' ? makeRef('sheet', '!bar') : makeRef(what, ''));
    if (el) await this.editEmbed(el);
  }

  private async editEmbed(el: HTMLElement) {
    const ref = await editRef(el.dataset.ref!);
    el.dataset.ref = ref;
    el.setAttribute('ref', ref);
    this.onInput();
  }

  private removeEmbed(el: HTMLElement) {
    const next = el.nextElementSibling ?? el.previousElementSibling;
    el.remove();
    if (!this.page!.firstChild) this.page!.innerHTML = '<p><br></p>';
    this.page!.focus();
    if (next?.isConnected) getSelection()?.collapse(next, 0);
    this.onInput();
  }

  /** Links in the text open in a new tab (a click in editable text would otherwise just move the caret). */
  private onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a');
    if (!a || !this.page!.contains(a) || a.closest('to-embed')) return;
    e.preventDefault();
    window.open(a.href, '_blank', 'noopener');
  };

  /** Addresses typed by hand become links once you leave the text. */
  private onBlur = () => {
    const page = this.page!;
    if (page.contains(document.activeElement)) return;
    const html = blocksToHtml(domToBlocks(page));
    if ((html.match(/<a /g)?.length ?? 0) !== page.querySelectorAll('a').length) page.innerHTML = html;
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // An embedded document is one thing: one key removes it, whether it has the focus or the caret is next to it.
      const target = e.target as HTMLElement;
      const embed = target.dataset?.ref !== undefined ? target : embedBeside(this.page!, e.key === 'Delete');
      if (embed) {
        e.preventDefault();
        this.removeEmbed(embed);
      }
      return;
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && (this.fmt.block === 'ul' || this.fmt.block === 'ol')) {
      // In a list, Tab moves the item in a level and Shift+Tab back out.
      e.preventDefault();
      this.exec(e.shiftKey ? 'outdent' : 'indent');
      return;
    }
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
          ${this.btn('Bring out', 'outdent', false, 'outdent', undefined, 'Shift+Tab')}
          ${this.btn('Indent', 'indent', false, 'indent', undefined, 'Tab')}
        </sl-button-group>
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => this.insertNew(e.detail.item.value)}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.insert, 14)} Insert</sl-button>
          <sl-menu>
            ${insertMenu('write')}
          </sl-menu>
        </sl-dropdown>
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
        @click=${this.onClick}
        @blur=${this.onBlur}
        @embed-edit=${(e: Event) => this.editEmbed(e.target as HTMLElement)}
        @embed-remove=${(e: Event) => this.removeEmbed(e.target as HTMLElement)}
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
