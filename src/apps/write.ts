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
import { askLink } from '../widgets/link-dialog.ts';
import { askDate } from '../widgets/date-dialog.ts';
import { openLink } from '../widgets/link-guard.ts';
import { templateLine, templateTool } from '../widgets/template-picker.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { MAX_DEPTH, linkable, linkTarget, linkify, parseDoc, parseInline, serializeDoc, serializeInline, docText, ALIGN_NAMES, type Align, type Block, type BlockKind, type Run } from '../lib/richtext.ts';

const KIND_TAG: Record<BlockKind, string> = { p: 'p', title: 'h1', h1: 'h1', h2: 'h2', ul: 'li', ol: 'li', e: 'figure' };


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
      // Linked words are a link; a web address in the text shows as one too (in the document it is just text).
      let h = r.href
        ? `<a href="${xml(r.href)}">${xml(r.t)}</a>`
        : linkify(r.t)
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
    out += b.k === 'e' ? embedHtml(b.ref!) : `<${KIND_TAG[b.k]}${b.k === 'title' ? ' class="doc-title"' : ''}${b.a ? ` style="text-align:${ALIGN_NAMES[b.a]}"` : ''}>${runsToHtml(b.runs)}</${KIND_TAG[b.k]}>`;
  }
  closeTo(0);
  return out || '<p><br></p>';
}

/** The marks in force, and the address of the link the words are in (a: '' for none). */
type Flags = { b: boolean; i: boolean; u: boolean; s: boolean; h: boolean; a?: string };

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
    if (f.a) run.href = f.a;
    const last = cur!.runs[cur!.runs.length - 1];
    if (last && !last.ic && !!last.b === f.b && !!last.i === f.i && !!last.u === f.u && !!last.s === f.s && !!last.h === f.h && (last.href ?? '') === (f.a ?? '')) last.t += t;
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
    // What is not text at all, pasted from elsewhere.
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'svg', 'BUTTON', 'SELECT', 'INPUT', 'TEXTAREA'].includes(tag)) return;
    const nf: Flags = { ...f };
    const st = el.style;
    // (A tag can say bold while its style says otherwise: Google Docs wraps everything it copies in <b style="font-weight:normal">.)
    const weight = st.fontWeight === 'bold' ? 700 : st.fontWeight === 'normal' ? 400 : parseInt(st.fontWeight);
    if (((tag === 'B' || tag === 'STRONG') && !(weight < 600)) || weight >= 600) nf.b = true;
    if (tag === 'A') {
      // Words linked somewhere are a link; an address showing itself is just the address, a link wherever it is shown.
      const href = el.getAttribute('href') ?? '';
      const words = (el.textContent ?? '').trim();
      nf.a = linkable(href) && words !== href && words !== href.replace(/^mailto:/, '') ? linkTarget(href) : '';
    }
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

  const plain: Flags = { b: false, i: false, u: false, s: false, h: false, a: '' };
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
    const k: BlockKind = tag === 'H1' ? (el.classList.contains('doc-title') ? 'title' : 'h1') : tag === 'H2' || tag === 'H3' ? 'h2' : tag === 'LI' ? inherited : 'p';
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
  // A heading is bold through and through, so bold in one says nothing.
  for (const b of blocks) if (b.k === 'title' || b.k === 'h1' || b.k === 'h2') b.runs = mergeRuns(b.runs.map(({ b: _, ...r }) => r));
  return blocks.length ? blocks : [{ k: 'p', runs: [] }];
}

/** Neighbouring runs with the same marks and link, as one. */
function mergeRuns(runs: Run[]): Run[] {
  const same = (a: Run, b: Run) => !a.ic && !b.ic && !!a.b === !!b.b && !!a.i === !!b.i && !!a.u === !!b.u && !!a.s === !!b.s && !!a.h === !!b.h && (a.href ?? '') === (b.href ?? '');
  return runs.reduce<Run[]>((out, r) => (out.length && same(out[out.length - 1], r) ? (out[out.length - 1] = { ...out[out.length - 1], t: out[out.length - 1].t + r.t }, out) : [...out, r]), []);
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

/** The paragraph (the page's own child) a node is in. */
function blockOf(node: Node, page: HTMLElement): Node | null {
  let n: Node | null = node;
  while (n && n.parentNode !== page) n = n.parentNode;
  return n;
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
  @state() private fmt = { b: false, i: false, u: false, s: false, h: false, link: false, block: 'p', align: '' };
  @state() private words = 0;
  @state() private chars = 0;
  private lastEmitted = '';
  private page?: HTMLElement;
  /** Where the caret last was in the text, so a menu can insert there. */
  private caret: Range | null = null;
  /** The link the caret was put in by a click: where it goes, shown under it. */
  @state() private bubble: { href: string; x: number; y: number; a: HTMLAnchorElement } | null = null;

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
    this.bubble = null;
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
      link: !!sel?.anchorNode?.parentElement?.closest('a[href]'),
      align: document.queryCommandState('justifyCenter') ? 'c' : document.queryCommandState('justifyRight') ? 'r' : document.queryCommandState('justifyFull') ? 'j' : '',
      block: document.queryCommandState('insertUnorderedList') ? 'ul' : document.queryCommandState('insertOrderedList') ? 'ol' : sel?.anchorNode?.parentElement?.closest('h1.doc-title') || (sel?.anchorNode instanceof Element && sel.anchorNode.closest('h1.doc-title')) ? 'title' : block,
    };
  };

  /** A date at the caret, picked from a calendar and written out in words. */
  async insertDate() {
    const sel = getSelection();
    const range = sel?.rangeCount && this.page?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : this.caret;
    const words = await askDate();
    if (!words) return;
    this.page?.focus();
    const at = range ?? (() => {
      const r = document.createRange();
      r.selectNodeContents(this.page!);
      r.collapse(false);
      return r;
    })();
    at.deleteContents();
    const t = document.createTextNode(words);
    at.insertNode(t);
    const after = document.createRange();
    after.setStartAfter(t);
    after.collapse(true);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(after);
    this.onInput();
  }

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

  /** Put markup in where the caret is, replacing what is selected; the page is read back afterwards, which sorts out how it nests. */
  private insertHtmlByHand(markup: string) {
    const sel = getSelection();
    const range = sel?.rangeCount && this.page!.contains(sel.anchorNode) ? sel.getRangeAt(0) : (() => {
      const r = document.createRange();
      r.selectNodeContents(this.page!);
      r.collapse(false);
      return r;
    })();
    range.deleteContents();
    const holder = document.createElement('template');
    holder.innerHTML = markup;
    const last = holder.content.lastChild;
    // Paragraphs pasted into an empty one take its place.
    const block = blockOf(range.startContainer, this.page!);
    const blocks = !!holder.content.firstElementChild && isBlockTag(holder.content.firstElementChild.tagName);
    if (blocks && !this.page!.textContent && !this.page!.querySelector('[data-ref], [data-icon]')) this.page!.replaceChildren(holder.content);
    else if (blocks && block instanceof HTMLElement && !block.textContent) block.replaceWith(holder.content);
    else range.insertNode(holder.content);
    if (last) {
      const after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(after);
    }
  }

  /**
   * Link the selected words (Mod+K), or change or take off the link the
   * caret is in; with nothing selected, the words are asked for too and
   * put in where the caret is.
   */
  async link() {
    const sel = getSelection();
    const range = sel?.rangeCount && this.page?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : this.caret?.cloneRange() ?? null;
    const node = range?.commonAncestorContainer ?? null;
    const anchor = (node instanceof Element ? node : node?.parentElement)?.closest('a') ?? null;
    const inside = anchor && this.page!.contains(anchor) ? anchor : null;
    const words = range && !range.collapsed ? range.toString() : inside?.textContent ?? '';
    const answer = await askLink({ url: inside?.getAttribute('href') ?? '', text: words, askText: !words.trim() });
    this.page!.focus();
    if (range) {
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    }
    if (!answer) return;
    if ('remove' in answer) {
      if (inside) inside.replaceWith(...Array.from(inside.childNodes));
    } else if (inside && (!range || range.collapsed || inside.contains(range.startContainer) && inside.contains(range.endContainer))) {
      inside.setAttribute('href', answer.url);
    } else {
      const at = range ?? (() => {
        const r = document.createRange();
        r.selectNodeContents(this.page!);
        r.collapse(false);
        return r;
      })();
      const a = document.createElement('a');
      a.setAttribute('href', answer.url);
      if (at.collapsed) a.textContent = answer.text.trim();
      else if (blockOf(at.startContainer, this.page!) === blockOf(at.endContainer, this.page!)) a.append(at.extractContents());
      else {
        // Across paragraphs: the browser's own command links each part.
        document.execCommand('createLink', false, answer.url);
        this.onInput();
        return;
      }
      at.insertNode(a);
      const after = document.createRange();
      after.setStartAfter(a);
      after.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(after);
    }
    this.onInput();
  }

  /** Whether the caret (or selection) is in a heading: headings are bold, always. */
  private inHeading(): boolean {
    const n = getSelection()?.anchorNode ?? null;
    return !!(n && this.page?.contains(n) && (n instanceof Element ? n : n.parentElement)?.closest('h1, h2, h3'));
  }

  /** The paragraph the caret is in made the document's title (big), or back to a paragraph if it is one. By hand: a title is a heading of its own kind. */
  private makeTitle() {
    const sel = getSelection();
    const node = sel?.anchorNode;
    if (!node || !this.page?.contains(node)) return;
    const block = blockOf(node, this.page);
    if (!(block instanceof HTMLElement) || block.tagName === 'UL' || block.tagName === 'OL' || block.dataset.ref !== undefined) return;
    const was = block.matches('h1.doc-title');
    const made = document.createElement(was ? 'p' : 'h1');
    if (!was) made.className = 'doc-title';
    if (block.style.textAlign) made.style.textAlign = block.style.textAlign;
    made.append(...Array.from(block.childNodes));
    if (!made.childNodes.length) made.innerHTML = '<br>';
    block.replaceWith(made);
    const r = document.createRange();
    r.selectNodeContents(made);
    r.collapse(false);
    sel!.removeAllRanges();
    sel!.addRange(r);
    this.onInput();
    this.onSelection();
  }

  private run(cmd: string, arg?: string) {
    if (cmd === 'bold' && this.inHeading()) return;
    if (cmd === 'formatBlock' && arg === 'title') return void this.makeTitle();
    this.page?.focus();
    // (Colours and alignment are only ever written as styles; the rest as tags.)
    document.execCommand('styleWithCSS', false, cmd === 'hiliteColor' ? 'true' : 'false');
    document.execCommand(cmd, false, arg);
    this.onInput();
    this.onSelection();
  }

  private onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    // Formatted text (from another document here, or anywhere) keeps what this text can hold: headings, lists,
    // marks and links, read by the same reader as the page itself and written out afresh, so nothing else comes in.
    const rich = e.clipboardData?.getData('text/html') ?? '';
    if (rich && !linkToRef(text.trim())) {
      const body = new DOMParser().parseFromString(rich, 'text/html').body;
      // Spaces as a browser shows them: runs of white space are one space, none at a paragraph's ends, and a paragraph of nothing but white space (the source's own line breaks) is not one.
      const blocks = domToBlocks(body)
        .map((b) => {
          const runs = b.runs.map((r) => ({ ...r, t: r.t.replace(/\s+/g, ' ') }));
          if (runs.length && !runs[0].ic) runs[0] = { ...runs[0], t: runs[0].t.trimStart() };
          if (runs.length && !runs[runs.length - 1].ic) runs[runs.length - 1] = { ...runs[runs.length - 1], t: runs[runs.length - 1].t.trimEnd() };
          return { ...b, runs: runs.filter((r) => r.t || r.ic), blank: b.runs.every((r) => !r.ic && !r.t) };
        })
        .filter((b) => b.k === 'e' || b.runs.length || b.blank)
        .map(({ blank: _, ...b }) => b as Block);
      if (blocks.length) {
        const fit: Block[] =
          this.mode === 'doc'
            ? blocks
            : this.mode === 'lines'
              ? blocks.filter((b) => b.k !== 'e').map((b) => ({ k: 'p', runs: b.runs }))
              : [{ k: 'p', runs: blocks.filter((b) => b.k !== 'e').flatMap((b, i) => (i ? [{ t: ' ' }, ...b.runs] : b.runs)) }];
        // One paragraph goes in as its words, into the line the caret is in; more go in as paragraphs.
        const made = fit.length === 1 && fit[0].k === 'p' ? runsToHtml(fit[0].runs) : blocksToHtml(fit);
        // The browser's own command keeps undo working; where there is none, it goes in by hand.
        if (!document.execCommand('insertHTML', false, made)) this.insertHtmlByHand(made);
        this.onInput();
        return;
      }
    }
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

  /** A template becomes the document: one change, so one undo brings the blank page back. */
  private useTemplate = (t: { body: string }) => {
    this.page!.innerHTML = blocksToHtml(parseDoc(t.body));
    this.onInput();
    this.page!.focus();
    getSelection()?.collapse(this.page!.firstChild, 0);
  };

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
  /** A click in a link puts the caret there, as anywhere in the text, and shows where it goes: open, edit, remove. (Mod+click opens it.) */
  private onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a');
    if (!a || !this.page!.contains(a) || a.closest('to-embed')) {
      this.bubble = null;
      return;
    }
    e.preventDefault();
    this.showBubble(a);
  };
  private showBubble(a: HTMLAnchorElement) {
    const box = this.getBoundingClientRect();
    const r = a.getBoundingClientRect();
    this.bubble = { href: a.getAttribute('href') ?? '', x: Math.max(0, r.left - box.left), y: r.bottom - box.top + 4, a };
  }
  private renderBubble() {
    const b = this.bubble;
    if (!b) return nothing;
    return html`<div class="link-bubble" role="dialog" aria-label="Link" style="left:${b.x}px;top:${b.y}px" @mousedown=${(e: Event) => e.preventDefault()}>
      <!-- The address itself opens it too, asking first, like the arrow beside it. (It goes through openLink, so the page's guard lets it be.) -->
      <a class="lb-href" href=${b.href} data-trusted title=${b.href} @click=${(e: Event) => {
        e.preventDefault();
        this.bubble = null;
        openLink(b.href);
      }}>${b.href}</a>
      ${tool('Open link', 'arrow', () => ((this.bubble = null), openLink(b.href)), { keepFocus: true })}
      ${tool('Edit link', 'pen', () => {
        this.bubble = null;
        const r = document.createRange();
        r.selectNodeContents(b.a);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(r);
        void this.link();
      }, { keepFocus: true, key: 'Mod+K' })}
      ${tool('Remove link', 'close', () => {
        this.bubble = null;
        b.a.replaceWith(...Array.from(b.a.childNodes));
        this.onInput();
      }, { keepFocus: true })}
    </div>`;
  }

  /** Addresses typed by hand become links once you leave the text. */
  private onBlur = () => {
    this.bubble = null;
    const page = this.page!;
    if (page.contains(document.activeElement)) return;
    const html = blocksToHtml(domToBlocks(page));
    if ((html.match(/<a /g)?.length ?? 0) !== page.querySelectorAll('a').length) page.innerHTML = html;
  };

  /** The list item the caret is in, if the caret is at its very start: [the item, whether it is empty]. */
  private itemAtStart(): [HTMLLIElement, boolean] | null {
    const sel = getSelection();
    if (!sel?.rangeCount || !sel.isCollapsed || !this.page?.contains(sel.anchorNode)) return null;
    const node = sel.anchorNode!;
    const li = (node instanceof Element ? node : node.parentElement)?.closest('li');
    if (!li || !this.page.contains(li)) return null;
    const before = document.createRange();
    before.selectNodeContents(li);
    before.setEnd(sel.anchorNode!, sel.anchorOffset);
    if (before.toString() !== '') return null;
    return [li as HTMLLIElement, !(li.textContent ?? '').trim() && !li.querySelector('[data-icon], [data-ref]')];
  }

  /**
   * Out of a list, as word processors do: Backspace at the start of an
   * item takes its bullet off (an empty one first comes a level out, if it
   * is in one). Done by hand, so it is the same in every browser.
   */
  private unlist(li: HTMLLIElement, empty: boolean) {
    const list = li.parentElement!;
    const outer = list.parentElement?.closest('li');
    if (empty && outer && this.page!.contains(outer)) {
      this.run('outdent');
      return;
    }
    // The item becomes a paragraph where it stood: the items before stay a list above it, those after a list below.
    const p = document.createElement('p');
    p.append(...Array.from(li.childNodes).filter((n) => !(n instanceof HTMLElement && (n.tagName === 'UL' || n.tagName === 'OL'))));
    if (!p.childNodes.length) p.innerHTML = '<br>';
    const after = Array.from(list.children).slice(Array.from(list.children).indexOf(li) + 1);
    const rest = document.createElement(list.tagName);
    rest.append(...after);
    li.remove();
    list.after(p);
    if (rest.children.length) p.after(rest);
    if (!list.children.length) list.remove();
    const r = document.createRange();
    r.setStart(p, 0);
    r.collapse(true);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(r);
    this.onInput();
  }

  /**
   * As text is typed: "- " or "* " opening a paragraph starts a bulleted
   * list and "1. " or "1) " a numbered one (in a document); quotes and
   * apostrophes are curly, opening after a space or the start, closing
   * after a word.
   */
  private onBeforeInput = (e: InputEvent) => {
    if (e.inputType !== 'insertText' || !e.data || !this.page) return;
    const sel = getSelection();
    if (!sel?.rangeCount || !this.page.contains(sel.anchorNode)) return;
    const range = sel.getRangeAt(0);
    const block = blockOf(range.startContainer, this.page);
    const upTo = document.createRange();
    upTo.setStart(block ?? this.page, 0);
    upTo.setEnd(range.startContainer, range.startOffset);
    const before = upTo.toString();
    if (e.data === ' ' && this.mode === 'doc' && sel.isCollapsed && block instanceof HTMLElement && (block.tagName === 'P' || block.tagName === 'DIV')) {
      const list = /^[-*]$/.test(before) ? 'ul' : /^\d{1,3}[.)]$/.test(before) ? 'ol' : '';
      if (list) {
        e.preventDefault();
        upTo.deleteContents();
        if (!block.textContent) block.innerHTML = '<br>';
        // By hand: the browser's own command nests the list inside the paragraph.
        const l = document.createElement(list);
        const li = document.createElement('li');
        li.append(...Array.from(block.childNodes));
        l.append(li);
        block.replaceWith(l);
        const at = document.createRange();
        at.setStart(li, 0);
        at.collapse(true);
        sel.removeAllRanges();
        sel.addRange(at);
        this.onInput();
        return;
      }
    }
    if (e.data === '"' || e.data === "'") {
      e.preventDefault();
      const prev = before.slice(-1);
      const opening = !prev || /[\s([{\u2014\u2013\u201c\u2018-]/.test(prev);
      const curly = e.data === '"' ? (opening ? '\u201c' : '\u201d') : opening ? '\u2018' : '\u2019';
      if (!document.execCommand('insertText', false, curly)) {
        range.deleteContents();
        const t = document.createTextNode(curly);
        range.insertNode(t);
        const at = document.createRange();
        at.setStartAfter(t);
        at.collapse(true);
        sel.removeAllRanges();
        sel.addRange(at);
        this.onInput();
      }
    }
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const at = this.itemAtStart();
      if (at) {
        e.preventDefault();
        this.unlist(...at);
        return;
      }
    }
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
      b: ['bold'], i: ['italic'], u: ['underline'], '1': ['formatBlock', 'h1'], '2': ['formatBlock', 'h2'], '0': ['formatBlock', 'p'], '9': ['formatBlock', 'title'],
    };
    if (k === 'k' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      void this.link();
      return;
    }
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

  private btn(label: string, ico: keyof typeof UI, pressed: boolean, cmd: string, arg?: string, key?: string, disabled = false) {
    return html`<sl-button data-tip=${key ? `${label} (${key})` : label}
        class="icon"
        size="small"
        aria-label=${label}
        aria-pressed=${pressed ? 'true' : 'false'}
        ?disabled=${disabled}
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
          ${this.btn('Bold', 'bold', f.b, 'bold', undefined, 'Mod+B', f.block === 'title' || f.block === 'h1' || f.block === 'h2' || f.block === 'h3')}
          ${this.btn('Italic', 'italic', f.i, 'italic', undefined, 'Mod+I')}
          ${this.btn('Underline', 'underline', f.u, 'underline', undefined, 'Mod+U')}
          ${this.btn('Strikethrough', 'strike', f.s, 'strikeThrough')}
          ${this.btn('Highlight', 'highlight', f.h, 'hiliteColor', f.h ? 'transparent' : '#fef08a', 'Mod+Shift+H')}
          ${tool('Link', 'link', () => void this.link(), { key: 'Mod+K', keepFocus: true, pressed: f.link })}
        </sl-button-group>
        <sl-button-group label="Alignment">
          ${this.btn('Align left', 'alignLeft', f.align === '', 'justifyLeft')}
          ${this.btn('Centre', 'alignCenter', f.align === 'c', 'justifyCenter')}
          ${this.btn('Align right', 'alignRight', f.align === 'r', 'justifyRight')}
          ${this.btn('Justify', 'alignJustify', f.align === 'j', 'justifyFull')}
        </sl-button-group>
        ${tool('Icon', 'smile', () => void this.insertIcon())}
        ${tool('Date', 'cal', () => void this.insertDate())}
        ${doc ? html`<sl-button-group label="Block">
          ${this.btn('Title', 'text', f.block === 'title', 'formatBlock', 'title', 'Mod+9')}
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
        <to-insert label="Insert" placeholder="Insert: table, map, drawing…" .options=${insertOptions('write')} @pick=${(e: CustomEvent<string>) => this.insertNew(e.detail)}></to-insert>
        ${doc && !this.value ? templateTool('write', this.useTemplate) : nothing}` : nothing}
      </div>` : nothing}
      ${doc && !this.value ? templateLine('write', this.useTemplate) : nothing}
      <div
        class="write-page ${doc ? '' : 'rich-' + this.mode} ${this.value ? '' : 'blank'}"
        contenteditable="true"
        role="textbox"
        aria-multiline=${doc || this.mode === 'lines' ? 'true' : 'false'}
        aria-label=${this.label}
        data-placeholder=${this.placeholder}
        @input=${this.onInput}
        @keydown=${this.onKey}
        @beforeinput=${this.onBeforeInput}
        @paste=${this.onPaste}
        @click=${this.onClick}
        @blur=${this.onBlur}
        @embed-edit=${(e: Event) => this.editEmbed(e.target as HTMLElement)}
        @embed-remove=${(e: Event) => this.removeEmbed(e.target as HTMLElement)}
        @focus=${this.onSelection}
      ></div>
      ${this.renderBubble()}
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
