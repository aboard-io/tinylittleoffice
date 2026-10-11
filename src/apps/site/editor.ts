/**
 * <to-site-editor>: the Website app, edited in the page itself. The site as it will look fills the editor, in a
 * sandboxed frame (the generated page with the frame's own editing script, frame.ts: every thing on it marked). One
 * tap on a thing takes it in hand: outlined in the page, and its <to-context> beside it (Edit, the URL chip of a
 * button, a big link or a small link, Move up, Move down, Move left and Move right in a row of cards, buttons or
 * small links, Duplicate and Delete, in the standard's order, docs/editing.md §6). The same tap on its words opens
 * them where they are drawn, typed in the page (frame.ts): each change comes here as the thing's words and is
 * written as one `text` op, the page left as it is meanwhile (the frame holds the words being typed); Enter in a
 * heading or a paragraph goes on into a new paragraph; done (Enter elsewhere, Escape, which puts them back, a tap
 * elsewhere), the page is drawn again. What is not words is a form (forms.ts: where a link goes and its icon, from
 * the URL chip; the shop's settings) or the kit's own dialogs (another document's; a table's the
 * Spreadsheet's), opened by the tap; its bar is under the form, inside it, so a move is a
 * tap away (a move closes the form unwritten first). Escape writes nothing and leaves the thing in hand, its bar
 * beside it; a tap on the page's empty room lets it go. Enter or Edit on the thing in hand opens its words (or its
 * form) again. Nobody types a marker: the code writes every line.
 *
 * The bar: Insert ▾ first, at the top left (what can go in here, put after the thing in hand, or at the end of
 * the section on view: words with their words offered and chosen in the page, so the first letter typed replaces
 * them; the rest through its dialog, nothing written until Done), the look ▾, Preview (the page as
 * a visitor has it, the editing script off, with one Edit button back; Escape comes back too), Undo and Redo.
 * Keys on the thing in hand: Enter edits, Delete and Backspace remove, Alt+Up/Down move it, Mod+Alt+Left/Right
 * move it along its row, Mod+D duplicates, Mod+C/X/V copy, cut and paste it (TLO text and our marked HTML),
 * Up/Down take the thing before or after, Escape lets go. Undo puts back the thing in hand of the change it
 * takes back. Every change is the kernel's ops (model.ts).
 */
import { html, type PropertyDeclarations } from 'lit';
import { applyAll, write, type Block, type Doc, type Op, type TableBlock } from '../../doc/index.ts';
import { cmdBtn, cmdMenu } from '../../kit/bar.ts';
import { contextOf, drawnIn, runKey } from '../../kit/commands.ts';
import COMMANDS, { BOX, PREVIEW } from './commands.ts';
import { docToHtml, pasteFrom } from '../../kit/clipboard.ts';
import { type ContextEntry, type ToContext } from '../../kit/context.ts';
import { editFence, editTable, makeDoc } from '../../kit/doc-dialog.ts';
import { DocElement, type Entry } from '../../kit/element.ts';
import { t } from '../../kit/i18n.ts';
import { askDocLink } from '../../kit/insert-dialogs.ts';
import { openLink } from '../../kit/link-guard.ts';
import { askPlace, askShop, same, type Anchor } from './forms.ts';
import {
  cardFields,
  cardRuns,
  insertObj,
  linesOf,
  linkFields,
  linkRuns,
  objBlocks,
  objectAt,
  objectsOf,
  objId,
  pasteObj,
  plainRuns,
  productsBlock,
  readSite,
  removeObj,
  settingOp,
  splitOps,
  themeOp,
  withLine,
  WORDS,
  wordsOps,
  type Change,
  type Kind,
  type ObjKind,
  type PartName,
  type Site,
} from './model.ts';
import type { Run } from '../../doc/index.ts';
import { type Theme } from './theme.ts';
import { FRAME_SCRIPT, sitePage } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/context.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import './style.css';
import { qrBlock } from '../../kit/qr-picture.ts';

export const tag = 'to-site-editor';

/** A message from the frame: what was done, to which thing. */
interface FrameMessage {
  site: number;
  do: 'pick' | 'at' | 'page' | 'undo' | 'redo' | 'ready' | 'leave' | 'words' | 'split' | 'end' | 'link';
  /** The thing's id (null: a tap on the page's empty room). */
  o?: string | null;
  /** A pick on the thing's words: they are open in the page, typed there. */
  words?: boolean;
  /** Which of the thing's words, and what they are now; Enter's split: the words before the caret and after it. */
  part?: PartName;
  runs?: Run[];
  before?: Run[];
  after?: Run[];
  id?: string;
  /** Where the thing is in the frame: left, top, width, height. */
  r?: number[] | null;
  /** How far the page in the frame is scrolled. */
  y?: number;
  /** A link out of the page (the Preview's): where it goes. */
  href?: string;
}

/** What an undo entry remembers: the thing in hand before the change, and after it. */
interface Mark {
  held: string | null;
  after: string | null;
}

/** What a thing is called, in its form's heading and its bar's name. */
export const objName = (k: ObjKind): string =>
  ({
    page: t('Page'),
    section: t('Section'),
    heading: t('Heading'),
    p: t('Paragraph'),
    card: t('Big link'),
    button: t('Button'),
    link: t('Small link'),
    icon: t('Big icon'),
    doc: t('Tiny Little Office Doc'),
    table: t('Table'),
    products: t('Products'),
  })[k];
export class ToSiteEditor extends DocElement<Site> {
  static properties: PropertyDeclarations = { held: { state: true }, shown: { state: true }, preview: { type: Boolean, reflect: true } };
  /** The thing in hand, by its id, or null. */
  declare held: string | null;
  /** The page drawn in the frame. */
  declare shown: string;
  /** The page as a visitor has it: no editing, one Edit button back (where a Display Link lands). */
  declare preview: boolean;
  /** The section whose page is on view: where a thing goes with nothing in hand. */
  cur = 0;
  /** Where the thing in hand is in the frame, as the frame last said. */
  private heldRect: number[] | null = null;
  /** How far the page in the frame is scrolled, kept when it is drawn again. */
  private frameY = 0;
  /** The thing in hand is scrolled into view when the page is next drawn. */
  private showHeld = false;
  /** The stamp the frame's messages carry: a page drawn before is not listened to. */
  private stamp = 0;
  /** A form is open: the focus in it does not let the thing in hand go, and its bar waits. */
  private asking = false;
  /** Once the page is drawn again, the words of this thing are opened in it: chosen (`all`: a thing just put in), or the caret at their end. */
  private openNext: { id: string; all: boolean } | null = null;
  /** The stamp of the page that last said it was ready. */
  private ready = -1;

  constructor() {
    super();
    this.held = null;
    this.shown = '';
    this.preview = false;
  }
  protected read(doc: Doc): Site {
    return readSite(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.onMessage);
    for (const k of ['copy', 'cut', 'paste']) document.addEventListener(k, this.onClip as EventListener);
    document.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.onMessage);
    for (const k of ['copy', 'cut', 'paste']) document.removeEventListener(k, this.onClip as EventListener);
    document.removeEventListener('focusin', this.onFocusIn);
    this.removeEventListener('keydown', this.onKey);
  }
  get frame(): HTMLIFrameElement | null {
    return this.querySelector<HTMLIFrameElement>('iframe.site-frame');
  }
  /** The box round the frame: it holds the focus while a thing is in hand. */
  get box(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.site-page');
  }
  /** The bar of the thing in hand: here, or lent to the form open on the thing. */
  private get ctx(): ToContext | null {
    return this.querySelector<ToContext>('to-context.site-context') ?? this.lent?.querySelector<ToContext>('to-context.site-context') ?? null;
  }
  /** The form the thing's bar is lent to, while it is open. */
  private lent: HTMLDialogElement | null = null;
  /** The thing's bar put inside its open form, under it; given back (here, where it was) when the form closes. */
  private lend = (d: HTMLDialogElement): (() => void) => {
    const ctx = this.ctx;
    if (!ctx || this.held === null) return () => {};
    this.lent = d;
    d.append(ctx);
    ctx.show(d);
    return () => {
      this.lent = null;
      ctx.hide();
      this.append(ctx);
    };
  };
  /** A thing done from its bar while its form is open: the form closed first, unwritten. */
  private fromBar(f: () => void): () => void {
    return () => {
      this.lent?.close();
      f();
    };
  }

  /* ---------- the frame ---------- */

  /** The page drawn now: in its editing form, or as a visitor has it. */
  draw() {
    this.stamp++;
    const base = `${location.origin}${location.pathname}`;
    this.shown = this.preview
      ? sitePage(this.doc, { base, cur: this.cur, peek: this.stamp })
      : sitePage(this.doc, {
          base,
          cur: this.cur,
          edit: { stamp: this.stamp, held: this.held, y: this.frameY, show: this.showHeld, src: `${location.origin}/${FRAME_SCRIPT}`, dark: document.documentElement.dataset.theme === 'dark' },
        });
    this.showHeld = false;
  }
  /** The document and the mode the page in the frame is drawn from. */
  private drawnFor: [Doc, boolean] | null = null;
  protected willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    if (this.drawnFor && this.doc === this.drawnFor[0] && this.preview === this.drawnFor[1]) return;
    this.drawnFor = [this.doc, this.preview];
    this.cur = Math.max(0, Math.min(this.cur, this.view.sections.length - 1));
    if (this.preview) this.release();
    else if (this.held !== null && !objectAt(this.view, this.held)) this.release();
    this.draw();
  }
  /** The page told which thing is in hand (nothing drawn again); it answers with where the thing is. */
  private tell(show = false) {
    this.frame?.contentWindow?.postMessage({ site: this.stamp, held: this.held, show }, '*');
  }
  /** The page asked to open a thing's words where they are drawn (`all`: chosen, so the first letter replaces them). */
  private openWords(id: string, all = false) {
    this.frame?.contentWindow?.postMessage({ site: this.stamp, edit: id, all }, '*');
  }
  /** A change typed in the page: written, and the page left as it is (it holds the words being typed). */
  private typedIn(ops: Op[], key: string | undefined, mark: Mark) {
    this.edit(ops, key, mark);
    this.drawnFor = [this.doc, this.preview];
  }
  private onMessage = (e: MessageEvent) => {
    const m = e.data as FrameMessage | null;
    if (!m || typeof m !== 'object' || e.source !== this.frame?.contentWindow || m.site !== this.stamp) return;
    if (typeof m.y === 'number') this.frameY = m.y;
    const id = typeof m.o === 'string' ? m.o : null;
    if (m.do === 'pick' && id !== null) {
      // One tap: the thing in hand, and its words open in the page (the focus stays there) or its form open at once.
      this.hold(id, m.r ?? null, false, !m.words);
      if (!m.words) void this.editObj(id);
    } else if (m.do === 'pick') this.release();
    else if (m.do === 'words' && id !== null && m.part && Array.isArray(m.runs)) {
      const o = objectAt(this.view, id);
      const ops = wordsOps(this.doc, this.view, id, m.part, m.runs);
      if (!o || !ops) return;
      // The site's name typed where there was none: a heading put in at the top, every thing after it one block on.
      const after = o.at < 0 ? '0' : id;
      this.typedIn(ops, `words:${after}:${m.part}`, { held: this.held, after });
      if (this.held === id) this.held = after;
    } else if (m.do === 'split' && id !== null && Array.isArray(m.before) && Array.isArray(m.after)) {
      const c = splitOps(this.doc, this.view, id, m.before, m.after);
      if (!c) return;
      this.typedIn(c.ops, undefined, { held: id, after: c.id });
      this.held = c.id;
      this.cur = objectAt(this.view, c.id)?.n ?? this.cur;
    } else if (m.do === 'end') this.endWords(id);
    else if (m.do === 'ready') {
      this.ready = m.site;
      const next = this.openNext;
      this.openNext = null;
      // Not when the person has gone elsewhere meanwhile (a menu, a dialog, the title): the page would take the focus from it.
      const at = document.activeElement;
      if (next && next.id === this.held && (!at || at === document.body || at === this.frame || at === this.box)) this.openWords(next.id, next.all);
    } else if (m.do === 'at') {
      if (id === null || id !== this.held) return;
      this.heldRect = m.r ?? null;
      if (this.lent) this.ctx?.show(this.lent);
      else if (this.heldRect && !this.asking) this.ctx?.show(this.heldAnchor);
      else this.ctx?.hide();
    } else if (m.do === 'page') {
      const p = this.view.pages.find((x) => x.id === m.id) ?? this.view.pages[0];
      this.cur = p.sections[0].n;
      const o = objectAt(this.view, this.held);
      if (o && this.view.sections[o.n].page !== this.view.pages.indexOf(p)) this.release();
    } else if (m.do === 'undo' || m.do === 'redo') this.dispatchEvent(new CustomEvent(m.do === 'undo' ? 'docundo' : 'docredo', { cancelable: true }));
    else if (m.do === 'leave') this.endPreview();
    // A link out of the page, asked about as every link that leaves is (kit/link-guard.ts).
    else if (m.do === 'link' && typeof m.href === 'string') openLink(m.href);
  };

  /* ---------- the thing in hand ---------- */

  /** Where a person starts: the site's name (the first thing on the page) in hand, its words open in the page, the caret at their end. */
  async focusFirst() {
    await this.updateComplete;
    const first = objectsOf(this.view)[0];
    if (!first) return this.box?.focus({ preventScroll: true });
    const id = objId(first);
    this.hold(id);
    // The frame focused from here first: WebKit lets a page in a frame take the focus only once the frame has it.
    this.frame?.focus({ preventScroll: true });
    if (this.ready === this.stamp) this.openWords(id);
    else this.openNext = { id, all: false };
  }

  /**
   * Thing `id` in hand: its bar beside it, and the focus on the box round the frame (`focus`; not when its words are
   * open in the page, where the focus is). `r` is where the frame says it is; without it the frame is asked.
   */
  private hold(id: string | null, r: number[] | null = null, show = false, focus = true) {
    const o = objectAt(this.view, id);
    if (!o || id === null) return this.release();
    this.held = id;
    this.cur = o.n;
    this.heldRect = r;
    if (focus) this.box?.focus({ preventScroll: true });
    if (r) void this.updateComplete.then(() => this.held === id && !this.lent && this.ctx?.show(this.heldAnchor));
    else this.tell(show);
  }
  /** The thing in hand let go: its bar goes, its outline too. */
  release() {
    if (this.held === null) return;
    this.held = null;
    this.heldRect = null;
    this.ctx?.hide();
    this.tell();
  }
  /** Where the thing in hand is on the screen: its rect in the frame, as much of it as is on view. */
  private heldAnchor = (): DOMRect | null => {
    const f = this.frame;
    const r = this.heldRect;
    if (!f || !r || this.held === null) return null;
    const fr = f.getBoundingClientRect();
    // The frame says it in its own lengths, which are the screen's.
    const [x, y, w, h] = r;
    const top = Math.max(fr.top, fr.top + y);
    const bottom = Math.min(fr.bottom, fr.top + y + h);
    if (bottom <= top) return null;
    return new DOMRect(fr.left + x, top, w, bottom - top);
  };
  /** A change made: its ops, and the thing it leaves in hand (scrolled into view when the page is drawn again). */
  change(c: Change | null) {
    if (!c) return;
    this.edit(c.ops, undefined, { held: this.held, after: c.id } satisfies Mark);
    this.land(c.id);
  }
  /** After the document changed: thing `id` in hand, or nothing; the page, drawn again, says where it is. */
  private land(id: string | null) {
    const o = objectAt(this.view, id);
    this.ctx?.hide();
    this.heldRect = null;
    this.held = o ? id : null;
    if (!o) return;
    this.cur = o.n;
    this.showHeld = true;
    this.box?.focus({ preventScroll: true });
  }
  /** Done with the words typed in the page: a paragraph left with none goes; the page is drawn again, the thing still in hand. */
  private endWords(id: string | null) {
    const o = objectAt(this.view, id);
    const b = o ? this.doc.blocks[o.at] : undefined;
    if (o && id !== null && o.kind === 'p' && b?.k === 'p' && !b.runs.length) return this.change(removeObj(this.doc, this.view, id));
    this.drawnFor = null;
    if (o && id !== null && this.held === id) this.showHeld = true;
    this.requestUpdate();
    this.box?.focus({ preventScroll: true });
  }
  protected undone(entry: Entry, redo: boolean) {
    const m = entry.mark as Mark | undefined;
    this.land(m ? (redo ? m.after : m.held) : null);
  }
  /** The keys of the thing in hand (commands.ts; docs/editing.md §6): never from a field or a button. */
  private onBoxKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.target !== e.currentTarget || this.held === null || e.isComposing || this.asking) return;
    if (runKey(e, BOX, this)) return;
    // Select all: there is nothing more to choose than the thing in hand, and never the page's words.
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'a') e.preventDefault();
  };
  /** Escape on the thing in hand: let go, the focus back to the page. */
  letGo() {
    this.release();
    this.frame?.focus({ preventScroll: true });
  }
  /** A bar's button: whatever form is open closes first. */
  fromBarDo(f: () => void) {
    this.fromBar(f)();
  }
  /** The thing before or after the one in hand, on the same page. */
  step(by: -1 | 1) {
    const o = objectAt(this.view, this.held);
    if (!o) return;
    const page = this.view.sections[o.n].page;
    const all = objectsOf(this.view).filter((x) => this.view.sections[x.n].page === page);
    const next = all[all.indexOf(o) + by];
    if (next) this.hold(objId(next), null, true);
  }
  /** The focus gone somewhere else lets the thing go: not into the frame, its bar, the app's bar or a dialog. */
  private onFocusIn = (e: FocusEvent) => {
    if (this.held === null || this.asking) return;
    const to = e.target as Element;
    if (this.box?.contains(to) || this.ctx?.contains(to) || this.querySelector('to-bar.site-bar')?.contains(to) || to.closest?.('dialog')) return;
    this.release();
  };
  /** Copy, cut and paste of the thing in hand, while the box has the focus. */
  private onClip = (e: ClipboardEvent) => {
    const id = this.held;
    if (id === null || !e.clipboardData || !this.box || document.activeElement !== this.box) return;
    e.preventDefault();
    if (e.type === 'paste') {
      const p = pasteFrom({ text: e.clipboardData.getData('text/plain'), html: e.clipboardData.getData('text/html') }, 'doc');
      const blocks: Block[] = !p ? [] : 'blocks' in p ? p.blocks : [{ k: 'p', runs: p.runs }];
      const r = pasteObj(this.view, id, blocks);
      if (!r) return;
      const first = objectsOf(readSite(applyAll(this.doc, r.ops))).find((x) => x.at >= r.at);
      this.change({ ops: r.ops, id: first ? objId(first) : null });
      return;
    }
    const blocks = objBlocks(this.doc, this.view, id);
    if (!blocks.length) return;
    e.clipboardData.setData('text/plain', write({ head: {}, blocks }));
    e.clipboardData.setData('text/html', docToHtml(blocks));
    if (e.type === 'cut') this.change(removeObj(this.doc, this.view, id));
  };
  /** The bar beside the thing in hand (commands.ts). */
  private heldItems(): ContextEntry[] {
    return objectAt(this.view, this.held) && this.held !== null ? (contextOf(COMMANDS, this) as ContextEntry[]) : [];
  }

  /* ---------- the forms ---------- */

  /** The site's own pages and sections, for where a link goes. */
  private places(): [string, string][] {
    const site = this.view;
    return site.sections.map((s) => {
      const page = site.pages[s.page];
      const pageName = s.page ? page.title || t('Page {n}', { n: s.page + 1 }) : site.name || t('Home');
      return [`#${s.id}`, page.sections[0] === s ? pageName : `${pageName} · ${s.title}`];
    });
  }
  /** A form open: the thing's bar out of the way meanwhile. */
  private async asked<T>(ask: Promise<T>): Promise<T> {
    this.asking = true;
    this.ctx?.hide();
    try {
      return await ask;
    } finally {
      this.asking = false;
      if (this.held !== null && this.heldRect && !this.preview) this.ctx?.show(this.heldAnchor);
    }
  }
  /** Where a button, a big link or a small link goes, and its icon. */
  placeOf(id: string): { url: string; icon: string } | null {
    const o = objectAt(this.view, id);
    const b = o ? this.doc.blocks[o.at] : undefined;
    if (!o || !b) return null;
    if (o.kind === 'button' && b.k === 'quote') return linkFields(linesOf(b.runs)[o.line] ?? []);
    if (o.kind === 'link' && b.k === 'li') return linkFields(b.runs);
    if (o.kind === 'card' && b.k === 'li') return cardFields(b.runs);
    return null;
  }
  /** The URL chip's form: where the thing goes and its icon, written with its words as they are. */
  async editPlace(id: string) {
    const o = objectAt(this.view, id);
    const place = this.placeOf(id);
    const b = o ? this.doc.blocks[o.at] : undefined;
    if (!o || !place || !b || this.asking) return;
    const anchor: Anchor = this.held === id ? this.heldAnchor() : null;
    const got = await this.asked(askPlace({ heading: objName(o.kind), value: { url: place.url, icon: place.icon }, anchors: this.places(), anchor, lend: this.held === id ? this.lend : undefined }));
    if (!got) return;
    let next: Block | null = null;
    if (o.kind === 'button' && b.k === 'quote') next = withLine(b, o.line, linkRuns({ ...linkFields(linesOf(b.runs)[o.line] ?? []), ...got }));
    else if (o.kind === 'link' && b.k === 'li') next = { ...b, runs: linkRuns({ ...linkFields(b.runs), ...got }) };
    else if (o.kind === 'card' && b.k === 'li') next = { ...b, runs: cardRuns({ ...cardFields(b.runs), ...got }) };
    if (next && !same(b, next)) this.change({ ops: [{ op: 'splice', at: o.at, n: 1, blocks: [next] }], id });
  }
  /** Thing `id`'s words opened in the page, or its form (what is not words); a form's Done written as ops (nothing when nothing changed). */
  async editObj(id: string) {
    const o = objectAt(this.view, id);
    if (!o || this.asking) return;
    if (WORDS.has(o.kind)) {
      if (this.held !== id) this.hold(id, null, true, false);
      return this.openWords(id);
    }
    const b = this.doc.blocks[o.at] as Block | undefined;
    const replace = (next: Block | null): Op[] => (!next || (b && same(b, next)) ? [] : [{ op: 'splice', at: o.at, n: 1, blocks: [next] }]);
    const anchor: Anchor = this.held === id ? this.heldAnchor() : null;
    const lend = this.held === id ? this.lend : undefined;
    let ops: Op[] = [];
    switch (o.kind) {
      case 'icon': {
        const { chooseIcon } = await import('../../kit/icons-picker.ts');
        const name = await this.asked(chooseIcon({ emoji: false, current: b?.k === 'p' ? (b.runs[0]?.ic ?? '') : '' }));
        if (name) ops = replace({ k: 'p', runs: [{ t: '', ic: name }] });
        break;
      }
      case 'doc':
        if (b?.k === 'fence') ops = replace(await this.asked(editFence(b)));
        break;
      case 'table':
        if (b?.k === 'table') ops = replace(await this.asked(editTable(b)));
        break;
      case 'products': {
        if (b?.k !== 'table') return;
        const head = this.doc.head;
        const shop = await this.asked(askShop({ value: { currency: head.currency ?? '', orders: head.orders ?? '', table: b }, anchor, lend }));
        if (!shop) return;
        if (shop.currency.trim() !== (head.currency ?? '')) ops.push(settingOp('currency', shop.currency));
        if (shop.orders.trim() !== (head.orders ?? '')) ops.push(settingOp('orders', shop.orders));
        ops.push(...replace(shop.table));
        break;
      }
    }
    if (ops.length) this.change({ ops, id });
  }

  /**
   * A new thing of kind `k`, put in after the thing in hand: words with their words offered, opened in the page and
   * chosen, so the first letter typed replaces them; the rest through its dialog first (nothing written until Done).
   */
  async insert(k: Kind) {
    if (this.asking) return;
    const offered = (b: Block) => {
      const c = insertObj(this.doc, this.view, this.held, this.cur, b);
      this.change(c);
      this.openNext = c.id === null ? null : { id: c.id, all: true };
    };
    let block: Block | null = null;
    switch (k) {
      case 'page':
      case 'section':
      case 'heading':
        return offered({ k: 'h', level: k === 'page' ? 1 : k === 'section' ? 2 : 3, runs: plainRuns(k === 'page' ? t('New page') : k === 'section' ? t('New section') : t('Heading')) });
      case 'p':
        return offered({ k: 'p', runs: plainRuns(t('New paragraph')) });
      case 'button':
        return offered({ k: 'quote', runs: linkRuns({ icon: '', label: t('Button'), url: '' }) });
      case 'link':
        return offered({ k: 'li', depth: 0, runs: linkRuns({ icon: 'globe', label: t('Small link'), url: '' }) });
      case 'card':
        return offered({ k: 'li', depth: 0, runs: cardRuns({ icon: '', head: plainRuns(t('Big link')), detail: [], url: '' }) });
      case 'icon': {
        const { chooseIcon } = await import('../../kit/icons-picker.ts');
        const name = await this.asked(chooseIcon({ emoji: false }));
        if (name) block = { k: 'p', runs: [{ t: '', ic: name }] };
        break;
      }
      case 'doc':
        block = await this.asked(askDocLink());
        break;
      case 'product':
        block = await this.asked(editTable(productsBlock() as TableBlock));
        break;
    }
    if (block) this.change(insertObj(this.doc, this.view, this.held, this.cur, block));
  }

  /* ---------- the bar ---------- */

  /** Insert ▾ a QR code of this document; a new document of another app, made in its own editor in the dialog (kit/doc-dialog.ts). */
  insertQr() {
    this.change(insertObj(this.doc, this.view, this.held, this.cur, qrBlock()));
  }
  async insertApp(id: string) {
    const f = await makeDoc(id);
    if (f) this.change(insertObj(this.doc, this.view, this.held, this.cur, f));
  }
  setTheme(next: Partial<Theme>) {
    this.edit([themeOp({ ...this.view.theme, ...next })]);
  }
  /** Preview: the page as a visitor has it, and the Edit button that comes back. */
  startPreview() {
    this.preview = true;
    void this.updateComplete.then(() => this.querySelector<HTMLElement>('.site-edit')?.focus());
  }
  endPreview() {
    if (!this.preview) return;
    this.preview = false;
    void this.updateComplete.then(() => this.box?.focus({ preventScroll: true }));
  }
  /** Escape in the preview (outside its page: the page's own Escape comes as a message) goes back to editing. */
  private onKey = (e: KeyboardEvent) => {
    if (this.preview) runKey(e, PREVIEW, this);
  };

  render() {
    const o = objectAt(this.view, this.held);
    const label = t('The website, as it will look');
    const own = (id: string) => COMMANDS.find((c) => c.id === `site.${id}`)!;
    return html`<to-bar class="site-bar">
        ${
          this.preview
            ? cmdBtn(own('edit'), this, { cls: 'primary site-edit', keep: false })
            : html`<to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
              ${cmdMenu(own('look'), this, COMMANDS, 'site-look')}
              ${cmdBtn(own('preview'), this, { cls: 'site-preview-btn', keep: false })} ${this.undoTools()}`
        }
      </to-bar>
      <div class="site-page" tabindex="-1" role="group" aria-label=${label} @keydown=${this.onBoxKey}>
        <iframe class="site-frame" sandbox="allow-scripts allow-popups" title=${this.preview ? t('The website, as a visitor sees it') : label} .srcdoc=${this.shown}></iframe>
      </div>
      <to-context class="site-context" .label=${o ? objName(o.kind) : ''} .items=${this.heldItems()}></to-context>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToSiteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-site-editor': ToSiteEditor;
  }
}
