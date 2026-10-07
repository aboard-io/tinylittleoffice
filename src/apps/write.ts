/**
 * <to-write>: a one-page rich text editor built on contentEditable.
 *
 * Renders into light DOM like every TinyLittleOffice component; here that also
 * matters functionally, because execCommand and the selection APIs are
 * unreliable inside shadow roots in some browsers.
 */
import { LitElement, defineElement, html, nothing, property, state, tool, icon, UI, xml, type PropertyValues } from '../kit.ts';
import { linkToRef, makeRef, SELF } from '../kit/embed.ts';
import { editRef, insertOptions } from '../kit/browser.ts';
import '../widgets/insert-box.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { MAX_DEPTH, linkify, parseDoc, parseInline, serializeDoc, serializeInline, docText, ALIGN_NAMES, type Align, type Block, type BlockKind, type Run } from '../lib/richtext.ts';

const KIND_TAG: Record<BlockKind, string> = { p: 'p', h1: 'h1', h2: 'h2', ul: 'li', ol: 'li', e: 'figure' };


/**
 * An embedded TinyLittleOffice document. <to-embed> draws itself in a shadow root
 * and is not editable, so the text around it treats it as one thing.
 */
export function embedHtml(ref: string): string {
  const r = xml(ref);
  return `<to-embed contenteditable="false" tabindex="0" controls ref="${r}" data-ref="${r}"></to-embed>`;
}

/** An icon in a line of text: one thing, not editable inside, so the caret steps over it. */
export const iconHtml = (name: string) => `<span class="ic" data-icon="${xml(name)}" contenteditable="false" role="img" aria-label="${xml(name)} icon">${ICON_SVG[name] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[name]}</svg>` : `:${xml(name)}:`}</span>`;

function runsToHtml(runs: Run[]): string {
  if (!runs.length) return '<br>';
  return runs
    .map((r) => {
      if (r.ic) return iconHtml(r.ic);
      // Web addresses show as links; in the document they are just text.
      let h = linkify(r.t)
        .map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t)))
        .join('');
      if (r.h) h = `<mark>${h}</mark>`;
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
      out += `<li${b.a ? ` style="text-align:${ALIGN_NAMES[b.a]}"` : ''}>${runsToHtml(b.runs)}`;
      continue;
    }
    closeTo(0);
    out += b.k === 'e' ? embedHtml(b.ref!) : `<${KIND_TAG[b.k]}${b.a ? ` style="text-align:${ALIGN_NAMES[b.a]}"` : ''}>${runsToHtml(b.runs)}</${KIND_TAG[b.k]}>`;
  }
  closeTo(0);
  return out || '<p><br></p>';
}

type Flags = { b: boolean; i: boolean; u: boolean; s: boolean; h: boolean };

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
    if (f.h) run.h = true;
    const last = cur!.runs[cur!.runs.length - 1];
    if (last && !last.ic && !!last.b === f.b && !!last.i === f.i && !!last.u === f.u && !!last.s === f.s && !!last.h === f.h) last.t += t;
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
    if (el.dataset.icon) {
      if (!cur) open(k);
      cur!.runs.push({ t: '', ic: el.dataset.icon });
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
    if (tag === 'MARK' || (st.backgroundColor && st.backgroundColor !== 'transparent' && st.backgroundColor !== 'initial')) nf.h = true;
    if (isBlockTag(tag)) {
      block(el, k);
      return;
    }
    for (const child of Array.from(el.childNodes)) inline(child, nf, k, boundary);
  };

  const plain: Flags = { b: false, i: false, u: false, s: false, h: false };
  // A block's alignment, as the browser wrote it.
  const alignOf = (el: HTMLElement): Align | undefined => ({ center: 'c', right: 'r', justify: 'j' } as Record<string, Align>)[el.style.textAlign] ?? (el.getAttribute('align') ? ({ center: 'c', right: 'r', justify: 'j' } as Record<string, Align>)[el.getAttribute('align')!] : undefined);

  const block = (el: HTMLElement, inherited: BlockKind) => {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') {
      const k: BlockKind = tag === 'UL' ? 'ul' : 'ol';
      lists++;
      for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName === 'LI') {
          close();
          open(k);
          const a = alignOf(child as HTMLElement);
          if (a) cur!.a = a;
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
    const a = alignOf(el);
    if (a) cur!.a = a;
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

/**
 * The one rich text editor. As <to-write> it is the Write app: a whole
 * document, with headings, lists, embeds and a word count. As <to-rich>
 * it is a box anyone else can use: mode "line" is one line of marked
 * text (a headline), mode "lines" is a line per paragraph (a slide's
 * bullets, a page's words). In those modes it speaks "rich-change", not
 * "docchange", so the document it is part of is not mistaken for it.
 */
export class ToWrite extends LitElement {
  @property() value = '';
  @property() mode: 'doc' | 'line' | 'lines' = 'doc';
  @property() label = 'Document';
  @property() placeholder = '';
  /** Show the formatting toolbar. (A host with several boxes may keep one toolbar of its own and call exec().) */
  @property({ type: Boolean }) tools = true;
  @state() private fmt = { b: false, i: false, u: false, s: false, h: false, block: 'p', align: '' };
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

  /** The value as blocks: a document, or a paragraph per line. */
  private read(value: string): Block[] {
    if (this.mode === 'doc') return parseDoc(value);
    return (value ? value.split('\n') : ['']).map((line) => ({ k: 'p', runs: parseInline(line) }));
  }
  /** Blocks as the value: a document, or marked lines. */
  private write(blocks: Block[]): string {
    if (this.mode === 'doc') return serializeDoc(blocks);
    const lines = blocks.filter((b) => b.k !== 'e').map((b) => serializeInline(b.runs).replace(/\n/g, ' '));
    return this.mode === 'line' ? lines.join(' ').trim() : lines.join('\n');
  }

  private loadHtml() {
    const blocks = this.read(this.value);
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
    this.lastEmitted = this.write(blocks);
    this.page!.classList.toggle('blank', this.lastEmitted === '');
    if (this.mode === 'doc') this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
    else this.dispatchEvent(new CustomEvent('rich-change', { detail: this.lastEmitted }));
  };

  /** Run a formatting command from outside (a host's own toolbar). */
  exec(cmd: string, arg?: string) {
    this.run(cmd, arg);
  }
  /** Toggle highlight from outside. */
  highlight() {
    this.run('hiliteColor', this.fmt.h ? 'transparent' : '#fef08a');
  }
  /** In "lines" mode: step the line the caret is on in or out by two spaces (a slide's bullets nest that way). */
  shift(by: -1 | 1) {
    const sel = getSelection();
    let block: Node | null = sel?.anchorNode ?? null;
    while (block && block.parentNode !== this.page) block = block.parentNode;
    if (!block) return;
    const first = block.firstChild?.nodeType === Node.TEXT_NODE ? (block.firstChild as Text) : null;
    if (by > 0) {
      if (first) first.data = '  ' + first.data;
      else block.insertBefore(document.createTextNode('  '), block.firstChild);
    } else if (first) first.data = first.data.replace(/^(\t| {1,2})/, '');
    this.onInput();
  }

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
      h: !!(sel?.anchorNode && (sel.anchorNode.parentElement?.closest('mark') || /rgb\(254, 240, 138\)|#fef08a/i.test(getComputedStyle(sel.anchorNode.parentElement!).backgroundColor))),
      align: document.queryCommandState('justifyCenter') ? 'c' : document.queryCommandState('justifyRight') ? 'r' : document.queryCommandState('justifyFull') ? 'j' : '',
      block: document.queryCommandState('insertUnorderedList') ? 'ul' : document.queryCommandState('insertOrderedList') ? 'ol' : block,
    };
  };

  /** An icon at the caret, as one thing in the line. */
  async insertIcon() {
    // The picker is a dialog, which takes the focus and with it the caret: so the caret is kept, and put back.
    const sel = getSelection();
    const range = sel?.rangeCount && this.page?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : this.caret;
    const name = await chooseIcon();
    if (!name) return;
    this.page?.focus();
    const at = range ?? (() => {
      const r = document.createRange();
      r.selectNodeContents(this.page!);
      r.collapse(false);
      return r;
    })();
    // Put in by hand, where the caret was; then the caret goes after it.
    at.deleteContents();
    const holder = document.createElement('span');
    holder.innerHTML = iconHtml(name) + '\u00a0';
    const space = holder.lastChild!;
    const node = holder.firstChild!;
    at.insertNode(space);
    at.insertNode(node);
    const after = document.createRange();
    after.setStartAfter(space);
    after.collapse(true);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(after);
    this.onInput();
  }

  private run(cmd: string, arg?: string) {
    this.page?.focus();
    // (Colours and alignment are only ever written as styles; the rest as tags.)
    document.execCommand('styleWithCSS', false, cmd === 'hiliteColor' ? 'true' : 'false');
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
    else if (link.length === 1 && link[0].url) document.execCommand('insertHTML', false, `<a href="${xml(link[0].url)}">${xml(link[0].t)}</a>&nbsp;`);
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
    // The document's own QR code needs no editing: it is whatever the link is.
    if (what === 'qr-self') return void this.insertEmbed(SELF);
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
    if (e.key === 'Enter' && this.mode === 'line') {
      // One line: Return is for whoever holds the box (the next box, a new slide).
      e.preventDefault();
      this.dispatchEvent(new CustomEvent('rich-enter'));
      return;
    }
    if (e.key === 'Tab' && this.mode === 'lines' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.shift(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && (this.fmt.block === 'ul' || this.fmt.block === 'ol')) {
      // In a list, Tab moves the item in a level and Shift+Tab back out.
      e.preventDefault();
      this.run(e.shiftKey ? 'outdent' : 'indent');
      return;
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    const map: Record<string, [string, string?]> = {
      b: ['bold'], i: ['italic'], u: ['underline'], '1': ['formatBlock', 'h1'], '2': ['formatBlock', 'h2'], '0': ['formatBlock', 'p'],
    };
    if (k === 'h' && e.shiftKey) {
      e.preventDefault();
      this.run('hiliteColor', this.fmt.h ? 'transparent' : '#fef08a');
      return;
    }
    if (map[k] && !e.shiftKey && (this.mode === 'doc' || map[k][0] !== 'formatBlock')) {
      e.preventDefault();
      this.run(map[k][0], map[k][1]);
    }
  };

  private btn(label: string, ico: keyof typeof UI, pressed: boolean, cmd: string, arg?: string, key?: string) {
    return html`<sl-button data-tip=${key ? `${label} (${key})` : label}
        class="icon"
        size="small"
        aria-label=${label}
        aria-pressed=${pressed ? 'true' : 'false'}
        @mousedown=${(e: Event) => e.preventDefault()}
        @click=${() => this.run(cmd, arg)}
      >${icon(UI[ico], 16)}<span class="sr-only">${label}</span></sl-button>`;
  }

  render() {
    const f = this.fmt;
    const doc = this.mode === 'doc';
    return html`
      ${this.tools ? html`<div class="to-toolbar write-toolbar" role="toolbar" aria-label="Formatting">
        <sl-button-group label="Text style">
          ${this.btn('Bold', 'bold', f.b, 'bold', undefined, 'Mod+B')}
          ${this.btn('Italic', 'italic', f.i, 'italic', undefined, 'Mod+I')}
          ${this.btn('Underline', 'underline', f.u, 'underline', undefined, 'Mod+U')}
          ${this.btn('Strikethrough', 'strike', f.s, 'strikeThrough')}
          ${this.btn('Highlight', 'highlight', f.h, 'hiliteColor', f.h ? 'transparent' : '#fef08a', 'Mod+Shift+H')}
        </sl-button-group>
        <sl-button-group label="Alignment">
          ${this.btn('Align left', 'alignLeft', f.align === '', 'justifyLeft')}
          ${this.btn('Centre', 'alignCenter', f.align === 'c', 'justifyCenter')}
          ${this.btn('Align right', 'alignRight', f.align === 'r', 'justifyRight')}
          ${this.btn('Justify', 'alignJustify', f.align === 'j', 'justifyFull')}
        </sl-button-group>
        ${tool('Icon', 'smile', () => void this.insertIcon())}
        ${doc ? html`<sl-button-group label="Block">
          ${this.btn('Heading', 'h1', f.block === 'h1', 'formatBlock', 'h1', 'Mod+1')}
          ${this.btn('Subheading', 'h2', f.block === 'h2', 'formatBlock', 'h2', 'Mod+2')}
          ${this.btn('Paragraph', 'p', f.block === 'p' || f.block === 'div', 'formatBlock', 'p', 'Mod+0')}
        </sl-button-group>
        <sl-button-group label="Lists">
          ${this.btn('Bulleted list', 'ul', f.block === 'ul', 'insertUnorderedList')}
          ${this.btn('Numbered list', 'ol', f.block === 'ol', 'insertOrderedList')}
          ${this.btn('Bring out', 'outdent', false, 'outdent', undefined, 'Shift+Tab')}
          ${this.btn('Indent', 'indent', false, 'indent', undefined, 'Tab')}
        </sl-button-group>
        <to-insert label="Insert" placeholder="Insert: table, map, drawing…" .options=${insertOptions('write')} @pick=${(e: CustomEvent<string>) => this.insertNew(e.detail)}></to-insert>` : nothing}
      </div>` : nothing}
      <div
        class="write-page ${doc ? '' : 'rich-' + this.mode} ${this.value ? '' : 'blank'}"
        contenteditable="true"
        role="textbox"
        aria-multiline=${doc || this.mode === 'lines' ? 'true' : 'false'}
        aria-label=${this.label}
        data-placeholder=${this.placeholder}
        @input=${this.onInput}
        @keydown=${this.onKey}
        @paste=${this.onPaste}
        @click=${this.onClick}
        @blur=${this.onBlur}
        @embed-edit=${(e: Event) => this.editEmbed(e.target as HTMLElement)}
        @embed-remove=${(e: Event) => this.removeEmbed(e.target as HTMLElement)}
        @focus=${this.onSelection}
      ></div>
      ${doc ? html`<div class="to-foot write-foot">
        <span>${this.words} ${this.words === 1 ? 'word' : 'words'}</span>
        <span>${this.chars} characters</span>
      </div>` : nothing}
    `;
  }
}

/** The same editor, as a box for other apps. */
defineElement('write', ToWrite);
// The same editor as a field: one line, or a short rich text, inside another app.
if (!customElements.get('to-rich')) customElements.define('to-rich', class extends ToWrite {});

declare global {
  interface HTMLElementTagNameMap {
    'to-write': ToWrite;
    'to-rich': ToWrite;
  }
}
