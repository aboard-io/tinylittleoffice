/**
 * <to-site-editor>: the Website app. The site as it will look, in a sandboxed frame (the generated page in
 * its preview form: a "+" at the end of every section, handles on every heading), and beside it (under it
 * on a phone) the words of the section being edited in one <to-text shape=doc> over that section's blocks
 * (docs/kernel.md §8, decision 3). A tap on the page picks the section; the "+" and the handles send
 * messages that become ops here: a thing added is a `splice` (a product a `rows`), a part moved a `move`,
 * removed a `splice`. The editor's own ops are offset to the section's span. The bar: Insert ▾ (the same
 * things as the "+", and a thing from the web, another document, put under the caret's block), the marks,
 * link, icon, the look ▾, and undo and redo, which are the kit's op log (DocElement). A products table is a
 * grid of cells beside the words (Write's <to-write-table>, its edits `cells` ops); the shop's currency and
 * where orders go are head fields typed above it.
 *
 * A section tapped in the frame is the thing in hand (docs/editing.md §6, §8): the focus comes to the box
 * round the frame, and a <to-context> under the section offers Edit, Move up, Move down, Duplicate, Delete.
 * Its keys are the standard's: Enter edits its words, Alt+Up/Down moves it, Mod+D duplicates it,
 * Delete/Backspace removes it, Mod+C/X/V copy, cut and paste it (TLO text and our marked HTML), Up/Down take
 * the next one, Escape lets it go; Escape in the words takes the section back in hand. Undo puts back the
 * part in hand, or the words' selection, of the change it takes back.
 */
import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowUp, Copy, CopyPlus, Palette, Scissors, SquarePen } from 'lucide';
import { blockLength, caret, type Sel } from '../../kit/textops.ts';
import { isText, plainText, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { tool } from '../../kit/bar.ts';
import { docToHtml, pasteFrom } from '../../kit/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { gateHtml, gateSvg, picture, showPictures } from '../../kit/pictures.ts';
import { t } from '../../kit/i18n.ts';
import { askDocLink, askEmbed, askPicture } from '../../kit/insert-dialogs.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { insertRowAfter, setCellAt, tableView, webBlock } from '../write/model.ts';
import { fenceLink } from '../write/view.ts';
import '../write/table.ts';
// The table's grid is drawn by Write's sheet (its `table.wt` rules), not a second copy of them.
import '../write/style.css';
import { addOps, duplicateOps, isPicture, kindName, kindsOf, linksOp, moveOps, partBlocks, partOf, pasteOps, readSite, removeOps, sectionAt, settingOp, themeOp, type Kind, type Site } from './model.ts';
import { FACES, THEMES, faceOf, isDark, type Face, type Theme } from './theme.ts';
import { sitePage } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/context.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-site-editor';

/** How long the page waits after a change before it is drawn again: typing does not reload it a letter at a time. */
const SETTLE = 350;

/** A message from the preview: what was done, to which section. */
interface FrameMessage {
  site: number;
  do: 'pick' | 'at' | 'add' | 'up' | 'down' | 'remove' | 'page' | 'undo' | 'redo' | 'ready';
  s?: number;
  kind?: Kind;
  id?: string;
  /** Where the section is in the frame: left, top, width, height. */
  r?: number[] | null;
}

/** What an undo entry remembers of the selection: the part in hand (its first block before and after), or the words' selection in the section beginning at `from`. */
type Mark = { part: number; after: number } | { from: number; sel: Sel | null };

/** Blocks onto the system clipboard as TLO text and our marked HTML (from a menu: a tap, not a key). */
function clipOut(blocks: Block[]) {
  const text = write({ head: {}, blocks });
  const html = docToHtml(blocks);
  const plain = () => navigator.clipboard?.writeText(text).catch(() => undefined);
  try {
    void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })]).catch(plain);
  } catch {
    void plain();
  }
}

/** Ops from the editor over a span, moved to where the span sits in the document. */
export function offset(ops: Op[], by: number): Op[] {
  return ops.map((op) => (op.op === 'head' ? op : op.op === 'move' ? { ...op, at: op.at + by, to: op.to + by } : { ...op, at: op.at + by }));
}

const THEME_NAMES = (): Record<string, string> => ({
  indigo: t('Indigo'), teal: t('Teal'), rose: t('Rose'), amber: t('Amber'), ink: t('Ink'), forest: t('Forest'), ocean: t('Ocean'), sunset: t('Sunset'),
  plum: t('Plum'), candy: t('Candy'), olive: t('Olive'), slate: t('Slate'), paper: t('Paper'), typewriter: t('Typewriter'), midnight: t('Midnight'), coal: t('Coal'),
});
const FACE_NAMES = (): Record<Face, string> => ({ sans: t('Sans serif'), serif: t('Serif'), rounded: t('Rounded'), mono: t('Monospace') });

export class ToSiteEditor extends DocElement<Site> {
  static properties: PropertyDeclarations = { cur: { state: true }, held: { state: true }, cardAt: { state: true }, shown: { state: true } };
  /** The section being edited. */
  declare cur: number;
  /** The section in hand as a thing (tapped in the frame), or null when the words are. */
  declare held: number | null;
  /** Where the section in hand is in the frame, as the frame last said. */
  private heldRect: number[] | null = null;
  /** The card whose menu is open: its block. */
  declare cardAt: number;
  /** The page drawn in the frame, and the stamp its messages carry. */
  declare shown: string;
  private stamp = 0;
  private timer = 0;
  /** The section's blocks as last handed to the editor, kept while they are the same blocks. */
  private span: Block[] = [];
  private sel: Sel | null = null;

  constructor() {
    super();
    this.cur = 0;
    this.held = null;
    this.cardAt = -1;
    this.shown = '';
  }
  protected read(doc: Doc): Site {
    return readSite(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.onMessage);
    for (const k of ['copy', 'cut', 'paste']) document.addEventListener(k, this.onClip as EventListener);
    document.addEventListener('focusin', this.onFocusIn);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.onMessage);
    for (const k of ['copy', 'cut', 'paste']) document.removeEventListener(k, this.onClip as EventListener);
    document.removeEventListener('focusin', this.onFocusIn);
    clearTimeout(this.timer);
  }
  get text(): ToText | null {
    return this.querySelector<ToText>('to-text.site-text');
  }
  get frame(): HTMLIFrameElement | null {
    return this.querySelector<HTMLIFrameElement>('iframe.site-frame');
  }
  /** The box round the frame: it holds the focus while a section is in hand. */
  get box(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.site-preview');
  }
  private get ctx(): ToContext | null {
    return this.querySelector<ToContext>('to-context.site-context');
  }
  /** The section being edited, kept inside the site as it changes. */
  private get section() {
    const all = this.view.sections;
    return all[Math.min(this.cur, all.length - 1)];
  }

  /* ---------- the frame ---------- */

  /** The page in its preview form, drawn now. */
  draw() {
    clearTimeout(this.timer);
    this.timer = 0;
    this.stamp++;
    this.shown = sitePage(this.doc, { base: `${location.origin}${location.pathname}`, edit: { cur: this.section.n, stamp: this.stamp, held: this.held === this.section.n } });
  }
  /** The page drawn again once changes have settled. */
  private drawSoon() {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.draw(), SETTLE);
  }
  /** The document the page in the frame is (or is about to be) drawn from. */
  private drawnFor: Doc | null = null;
  protected willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    if (this.doc === this.drawnFor) return;
    const first = !this.drawnFor;
    this.drawnFor = this.doc;
    this.cur = Math.max(0, Math.min(this.cur, this.view.sections.length - 1));
    if (this.held !== null && this.held >= this.view.sections.length) this.release();
    if (first) this.draw();
    else this.drawSoon();
  }
  private onMessage = (e: MessageEvent) => {
    const m = e.data as FrameMessage | null;
    if (!m || typeof m !== 'object' || e.source !== this.frame?.contentWindow || m.site !== this.stamp) return;
    const n = typeof m.s === 'number' ? m.s : -1;
    if (m.do === 'pick' && n >= 0) this.hold(n, m.r ?? null);
    else if (m.do === 'at') {
      if (this.held === n && m.r) {
        this.heldRect = m.r;
        this.ctx?.show(this.heldAnchor);
      }
    } else if (m.do === 'add' && n >= 0 && m.kind) void this.add(m.kind, n);
    else if ((m.do === 'up' || m.do === 'down') && n >= 0) this.movePart(n, m.do === 'up' ? -1 : 1);
    else if (m.do === 'remove' && n >= 0) this.removePart(n);
    else if (m.do === 'page') {
      const p = this.view.pages.find((x) => x.id === m.id) ?? this.view.pages[0];
      if (this.section.page !== this.view.pages.indexOf(p)) this.pick(p.sections[0].n, false);
    } else if (m.do === 'undo' || m.do === 'redo') this.dispatchEvent(new CustomEvent(m.do === 'undo' ? 'docundo' : 'docredo', { cancelable: true }));
  };

  /* ---------- the section in hand ---------- */

  private pick(n: number, redraw = true) {
    this.release();
    this.cur = n;
    if (redraw) this.draw();
    else this.drawSoon();
  }
  /** Section `n` in hand as a thing: the focus on the box round the frame, its bar under it. `r` is where the frame says it is; without it the frame is drawn again and says. */
  private hold(n: number, r: number[] | null = null) {
    const moved = n !== this.cur;
    if (moved) this.sel = null;
    this.cur = n;
    this.held = n;
    this.heldRect = r;
    if (!r) this.draw();
    else if (moved) this.drawSoon();
    this.box?.focus({ preventScroll: true });
    void this.updateComplete.then(() => this.held === n && this.ctx?.show(this.heldAnchor));
  }
  /** The section in hand let go: its bar goes. */
  private release() {
    if (this.held === null) return;
    this.held = null;
    this.heldRect = null;
    this.ctx?.hide();
  }
  /** Where the bar of the section in hand hangs from: the section's rect in the frame, as much of it as is on view. */
  private heldAnchor = (): DOMRect | null => {
    const f = this.frame;
    const r = this.heldRect;
    if (!f || !r || this.held === null) return null;
    const fr = f.getBoundingClientRect();
    const top = Math.max(fr.top, fr.top + r[1]);
    const bottom = Math.min(fr.bottom, fr.top + r[1] + r[3]);
    if (bottom <= top) return null;
    return new DOMRect(fr.left + r[0], top, r[2], bottom - top);
  };
  /** The first block of the part section `n` stands for. */
  private partFrom(n: number): number {
    return partOf(this.view, n)?.from ?? this.view.sections[n]?.from ?? 0;
  }
  /** The words of section `n`, the caret at the end of its first line, the panel on view. */
  private async editWords(n: number) {
    this.release();
    if (n !== this.cur) {
      this.cur = n;
      this.draw();
    }
    await this.updateComplete;
    const x = this.text;
    if (!x) return;
    await x.updateComplete;
    const b = this.doc.blocks[this.section.from];
    x.sel = caret(0, b ? blockLength(b) : 0);
    x.focus();
    this.querySelector('.site-panel')?.scrollIntoView({ block: 'nearest' });
  }
  /** The keys of the section in hand (docs/editing.md §6): never from words, a field or a button. */
  private onBoxKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.target !== e.currentTarget || this.held === null || e.isComposing) return;
    const n = this.held;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const plain = !mod && !e.altKey && !e.shiftKey;
    const upDown = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    if (e.key === 'Escape' && plain) {
      e.preventDefault();
      this.release();
      this.frame?.focus({ preventScroll: true });
    } else if (e.key === 'Enter' && plain) {
      e.preventDefault();
      void this.editWords(n);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && plain) {
      e.preventDefault();
      this.removePart(n);
    } else if (upDown && e.altKey && !mod && !e.shiftKey) {
      e.preventDefault();
      this.movePart(n, e.key === 'ArrowUp' ? -1 : 1);
    } else if (upDown && plain) {
      e.preventDefault();
      const next = n + (e.key === 'ArrowUp' ? -1 : 1);
      if (next >= 0 && next < this.view.sections.length) this.hold(next);
    } else if (mod && !e.altKey && !e.shiftKey && k === 'd') {
      e.preventDefault();
      this.duplicatePart(n);
    } else if (mod && !e.altKey && !e.shiftKey && k === 'a') e.preventDefault();
  };
  /** The focus gone somewhere else lets the section go: not into the frame, its bar, or the app's bar (Insert ▾ puts its thing after the section in hand). */
  private onFocusIn = (e: FocusEvent) => {
    if (this.held === null) return;
    const to = e.target as Node;
    if (this.box?.contains(to) || this.ctx?.contains(to) || this.querySelector('to-bar.site-bar')?.contains(to)) return;
    this.release();
  };
  /** Copy, cut and paste of the section in hand, while the box has the focus. */
  private onClip = (e: ClipboardEvent) => {
    const n = this.held;
    if (n === null || !e.clipboardData || !this.box || document.activeElement !== this.box) return;
    if (e.type === 'paste') {
      e.preventDefault();
      const p = pasteFrom({ text: e.clipboardData.getData('text/plain'), html: e.clipboardData.getData('text/html') }, 'doc');
      const blocks: Block[] = !p ? [] : 'blocks' in p ? p.blocks : [{ k: 'p', runs: p.runs }];
      const r = pasteOps(this.view, n, blocks);
      if (!r) return;
      this.edit(r.ops, undefined, { part: this.partFrom(n), after: r.at } satisfies Mark);
      this.hold(sectionAt(this.view, r.at));
      return;
    }
    const blocks = partBlocks(this.doc, this.view, n);
    if (!blocks.length) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', write({ head: {}, blocks }));
    e.clipboardData.setData('text/html', docToHtml(blocks));
    if (e.type === 'cut') this.removePart(n);
  };
  private heldItems(): ContextEntry[] {
    const n = this.held;
    if (n === null || !this.view.sections[n]) return [];
    const part = partOf(this.view, n);
    return [
      { label: t('Edit'), icon: SquarePen, keys: 'Enter', does: () => void this.editWords(n) },
      { label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: !moveOps(this.view, n, -1), does: () => this.movePart(n, -1) },
      { label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: !moveOps(this.view, n, 1), does: () => this.movePart(n, 1) },
      { label: t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', disabled: !part, does: () => this.duplicatePart(n) },
      SEP,
      { label: t('Delete'), icon: UI.trash, keys: 'Delete', disabled: !part, does: () => this.removePart(n) },
    ];
  }
  /** After an undo or a redo: the part it moved back in hand, or the words' selection back where it was. */
  protected undone(entry: Entry, redo: boolean) {
    const m = entry.mark as Mark | undefined;
    if (m && 'part' in m) {
      const at = Math.max(0, Math.min(redo ? m.after : m.part, this.doc.blocks.length - 1));
      this.hold(sectionAt(this.view, at));
      return;
    }
    const at = m ? m.from : firstAt(entry);
    if (at < 0) return;
    this.release();
    this.cur = sectionAt(this.view, at);
    this.draw();
    void this.caretBack(m ? m.sel : null, at);
  }
  private async caretBack(sel: Sel | null, at: number) {
    await this.updateComplete;
    const x = this.text;
    if (!x) return;
    await x.updateComplete;
    x.sel = sel ?? caret(Math.max(0, at - this.section.from), 0);
    x.focus();
  }
  /** The section's blocks, the same array while they are the same blocks (so the editor redraws nothing). */
  private blocks(): Block[] {
    const s = this.section;
    const next = this.doc.blocks.slice(s.from, s.to);
    if (next.length !== this.span.length || next.some((b, i) => b !== this.span[i])) this.span = next;
    return this.span;
  }
  private onOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const { ops, kind } = e.detail;
    const s = this.section;
    let moved = offset(ops, s.from);
    const first = moved[0];
    // A site's first words are its name.
    if (!this.doc.blocks.length && first?.op === 'splice' && first.n === 0 && first.blocks[0]?.k === 'p') moved = [{ ...first, blocks: [{ k: 'h', level: 1, runs: [] }, ...first.blocks.slice(1)] }, ...moved.slice(1)];
    this.edit(moved, kind ? `type:${s.n}` : undefined, { from: s.from, sel: e.detail.before } satisfies Mark);
  };
  /** Escape in the words with nothing left to close: the section goes back in hand. */
  private onTextEscape = (e: Event) => {
    e.preventDefault();
    this.hold(this.section.n);
  };
  /** Enter or Space on a card in the words opens it, as a tap does. */
  private onTextKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (e.defaultPrevented || (e.key !== 'Enter' && e.key !== ' ') || e.altKey || e.ctrlKey || e.metaKey || !el.classList?.contains('tx-card')) return;
    const rel = [...(this.text?.tx.children ?? [])].indexOf(el);
    if (rel < 0) return;
    e.preventDefault();
    this.onCardTap(new CustomEvent('text-embed', { detail: { block: rel } }));
  };
  private onSelect = (e: CustomEvent<Sel | null>) => {
    this.sel = e.detail;
    this.requestUpdate();
  };
  /** The caret over block `at` of the document (all of its words), once the section holding it is drawn. */
  private async select(at: number) {
    this.release();
    this.cur = sectionAt(this.view, at);
    this.draw();
    await this.updateComplete;
    const x = this.text;
    if (!x) return;
    await x.updateComplete;
    const rel = at - this.section.from;
    const b = this.doc.blocks[at];
    x.sel = b && isText(b) ? { anchor: { block: rel, offset: 0 }, focus: { block: rel, offset: blockLength(b) } } : caret(Math.max(0, rel), 0);
    x.focus();
  }

  /* ---------- commands ---------- */

  /** Where Insert ▾ puts a thing: under the block the caret is in (a document index), or, with a section in hand or no caret, at the end of the section. */
  private caretBlock(): number | undefined {
    const sel = this.sel;
    if (!sel || this.held !== null) return undefined;
    return this.section.from + Math.max(sel.anchor.block, sel.focus.block);
  }
  /** A thing put in under the caret's block from Insert ▾, at the end of section `n` from its "+" (a page after its page): asked for first where it needs an address or an icon. */
  private async add(k: Kind, n?: number) {
    const after = n === undefined ? this.caretBlock() : undefined;
    n ??= this.section.n;
    let arg = '';
    if (k === 'picture') {
      arg = (await askPicture())?.url ?? '';
      if (!arg) return;
    }
    if (k === 'icon') {
      const { chooseIcon } = await import('../../kit/icons-picker.ts');
      arg = (await chooseIcon()) ?? '';
      if (!arg) return;
    }
    const { ops, at } = addOps(this.doc, this.view, n, k, arg, after);
    this.edit(ops);
    void this.select(at);
  }
  private movePart(n: number, by: -1 | 1) {
    const ops = moveOps(this.view, n, by);
    if (!ops) return;
    const from = this.view.sections[n].from;
    const head = this.doc.blocks[from];
    const mark: Mark = { part: this.partFrom(n), after: from };
    this.edit(ops, undefined, mark);
    mark.after = this.partFrom(sectionAt(this.view, this.doc.blocks.indexOf(head)));
    // The section goes on being the one in hand, where it is now.
    this.landOn(sectionAt(this.view, this.doc.blocks.indexOf(head)));
  }
  private removePart(n: number) {
    const ops = removeOps(this.view, n);
    if (!ops) return;
    const mark: Mark = { part: this.partFrom(n), after: 0 };
    this.edit(ops, undefined, mark);
    const next = Math.max(0, Math.min(n - 1, this.view.sections.length - 1));
    mark.after = this.view.sections[next].from;
    this.landOn(next);
  }
  private duplicatePart(n: number) {
    const r = duplicateOps(this.doc, this.view, n);
    if (!r) return;
    this.edit(r.ops, undefined, { part: this.partFrom(n), after: r.at } satisfies Mark);
    this.landOn(sectionAt(this.view, r.at));
  }
  /** After a part changed: section `n` is the one being edited, and in hand again if a section was. */
  private landOn(n: number) {
    if (this.held !== null) return this.hold(n);
    this.cur = n;
    this.draw();
  }
  private setTheme(next: Partial<Theme>) {
    this.edit([themeOp({ ...this.view.theme, ...next })]);
  }
  private async addWeb() {
    const after = this.caretBlock();
    const url = await askEmbed();
    if (!url) return;
    const at = after === undefined ? this.section.to : after + 1;
    this.edit([{ op: 'splice', at, n: 0, blocks: [webBlock(url)] }]);
    void this.select(at);
  }
  private async addDocument() {
    const after = this.caretBlock();
    const fence = await askDocLink();
    if (!fence) return;
    const at = after === undefined ? this.section.to : after + 1;
    this.edit([{ op: 'splice', at, n: 0, blocks: [fence] }]);
    void this.select(at);
  }
  private async insertIcon() {
    const x = this.text;
    const sel = x?.sel;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon();
    if (!name || !x) return;
    if (sel) x.sel = sel;
    x.exec('icon', name);
  }

  /* ---------- the cards: what in a section is not words ---------- */

  private card = (b: Block, rel: number): TemplateResult | null => {
    const at = this.section.from + rel;
    if (b.k === 'table') {
      const v = tableView(this.doc, at);
      if (!v) return null;
      return html`<to-write-table .view=${v} currency=${this.view.currency} @wt-cell=${(e: CustomEvent<{ r: number; c: number; raw: string }>) => this.edit(setCellAt(this.doc, at, e.detail.r, e.detail.c, e.detail.raw), `cell:${at}:${e.detail.r}:${e.detail.c}`)} @wt-row=${(e: CustomEvent<{ r: number }>) => this.edit(insertRowAfter(at, e.detail.r))}></to-write-table>`;
    }
    if (b.k === 'fence' && b.lang) {
      const def = lookup.appOf(b.lang);
      const page = def?.view(b.body, { small: true })[0];
      const name = def?.title(b.body) || def?.name || b.lang;
      return html`<figure class="site-doc">${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${name}>${unsafeSVG(gateSvg(page.svg))}</svg>` : nothing}<figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption></figure>`;
    }
    if (b.k === 'img') return b.url ? picture(b.url, b.alt, 'site-pic') : null;
    if (b.k === 'p' && b.runs.length === 1) {
      const url = plainText(b.runs).trim();
      if (isPicture(url)) return picture(url, '', 'site-pic');
      return html`<to-embed url=${url}></to-embed>`;
    }
    return null;
  };
  private onCardTap = (e: CustomEvent<{ block: number }>) => {
    const rel = e.detail.block;
    const at = this.section.from + rel;
    const b = this.doc.blocks[at];
    if (!b || b.k === 'table') return;
    this.cardAt = at;
    const el = this.text?.tx.children[rel] as HTMLElement | undefined;
    void this.updateComplete.then(async () => {
      const menu = this.querySelector<ToMenu>('to-menu.site-cardmenu');
      if (!menu || !el) return;
      await menu.updateComplete;
      menu.openAt(el);
    });
  };
  private cardItems(): MenuItem[] {
    const at = this.cardAt;
    const b = this.doc.blocks[at];
    if (!b) return [];
    const cut = () => this.edit([{ op: 'splice', at, n: 1, blocks: [] }]);
    const remove = { label: t('Remove'), icon: UI.trash, does: cut };
    const clip: MenuItem[] = [
      { label: t('Copy'), icon: Copy, does: () => clipOut([b]) },
      { label: t('Cut'), icon: Scissors, does: () => (clipOut([b]), cut()) },
    ];
    if (b.k === 'fence' && b.lang) {
      const link = fenceLink(b.lang, b.body, `${location.origin}${location.pathname}`);
      return [{ label: t('Open in {app}', { app: lookup.appOf(b.lang)?.name ?? b.lang }), icon: UI.open, does: () => void window.open(link, '_blank', 'noopener') }, ...clip, remove];
    }
    const url = b.k === 'img' ? b.url : isText(b) ? plainText(b.runs).trim() : '';
    return [
      {
        label: t('Change the address…'),
        icon: UI.pen,
        does: async () => {
          const next = b.k === 'img' ? (await askPicture({ url, alt: b.alt }))?.url : await askEmbed(url);
          if (next) this.edit([{ op: 'splice', at, n: 1, blocks: [b.k === 'img' ? { ...b, url: next } : webBlock(next)] }]);
        },
      },
      ...clip,
      remove,
    ];
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    const ic: Partial<Record<Kind, MenuItem['icon']>> = { p: UI.text, picture: UI.image, icon: UI.icon, section: UI.heading, page: UI.heading1, product: UI.table, button: UI.link, link: UI.link, card: UI.list };
    return [
      ...kindsOf(this.view).map((k) => ({ label: kindName(k), icon: ic[k], does: () => void this.add(k) })),
      { label: t('Web Embed…'), icon: UI.globe, does: () => void this.addWeb() },
      ...(this.view.links ? [] : [{ label: t('Tiny Little Office Doc…'), icon: UI.insert, does: () => void this.addDocument() }]),
    ];
  }
  private lookItems(): MenuItem[] {
    const th = this.view.theme;
    const names = THEME_NAMES();
    const faces = FACE_NAMES();
    const mode = th.dark === undefined ? 'auto' : th.dark ? 'dark' : 'light';
    return [
      ...Object.entries(THEMES).map(([id, T]) => ({ label: names[id], swatch: T.a, group: t('Theme'), checked: th.id === id, does: () => this.setTheme({ id }) })),
      { label: t('As the theme is'), group: t('Light or dark'), checked: mode === 'auto', does: () => this.setTheme({ dark: undefined }) },
      { label: t('Light'), group: t('Light or dark'), checked: mode === 'light', does: () => this.setTheme({ dark: false }) },
      { label: t('Dark'), group: t('Light or dark'), checked: mode === 'dark', does: () => this.setTheme({ dark: true }) },
      ...FACES.map((f) => ({ label: faces[f], group: t('Type'), checked: faceOf(th) === f, does: () => this.setTheme({ face: f }) })),
      { label: t('A website of pages'), group: t('Shape'), checked: !this.view.links, does: () => this.edit([linksOp(false)]) },
      { label: t('Quick links: one column'), group: t('Shape'), checked: this.view.links, does: () => this.edit([linksOp(true)]) },
    ];
  }
  /** What the picker of sections says for each: a page by its title, a section under it. */
  private partName(n: number): string {
    const s = this.view.sections[n];
    const front = this.view.pages[s.page].sections[0] === s;
    if (!front) return `— ${s.title || t('Section')}`;
    return s.page ? s.title || t('Page {n}', { n: s.page + 1 }) : s.title || t('Home');
  }

  render() {
    const site = this.view;
    const s = this.section;
    // The page in the frame with its pictures from the web grey until asked for (kit/pictures.ts).
    const framed = gateHtml(this.shown);
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    const th = site.theme;
    const shop = s.shop >= 0;
    return html`<to-bar class="site-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: !!m.b, does: () => this.text?.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: !!m.i, does: () => this.text?.exec('i') })}
        ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: !!m.u, does: () => this.text?.exec('u') })}
        ${tool({ label: t('Strikethrough'), icon: UI.strike, keys: 'Mod+Shift+X', keep: true, pressed: !!m.s, does: () => this.text?.exec('s') })}
        ${tool({ label: t('Highlight'), icon: UI.highlight, keys: 'Mod+Shift+H', keep: true, pressed: !!m.h, does: () => this.text?.exec('h') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.text?.exec('link') })}
        ${tool({ label: t('Icon'), icon: UI.icon, keep: true, does: () => void this.insertIcon() })}
        <to-menu class="site-look" icon-only .label=${t('Look: {theme}', { theme: `${THEME_NAMES()[th.id] ?? th.id}${isDark(th) ? ' · ' + t('Dark') : ''}` })} .icon=${Palette} .items=${this.lookItems()}></to-menu>
        ${this.undoTools()}
      </to-bar>
      <div class="site-body">
        <div class="site-preview" tabindex="-1" role="group" aria-label=${t('The website, as it will look')} @keydown=${this.onBoxKey}>
          ${framed.hidden
            ? html`<p class="to-webpics-bar">${icon(UI.image, 18)}<span>${t('{n|A picture from the web waits|# pictures from the web wait} to be asked for.', { n: framed.hidden })}</span><button type="button" class="to-btn" @click=${() => showPictures()}>${t('Show pictures from the web')}</button></p>`
            : nothing}
          <iframe class="site-frame" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title=${t('The website, as it will look')} .srcdoc=${framed.html}></iframe>
        </div>
        <section class="site-panel" aria-label=${t('The words of {part}', { part: this.partName(s.n) })}>
          <select class="site-part" aria-label=${t('Part being edited')} .value=${String(s.n)} @change=${(e: Event) => this.pick(Number((e.target as HTMLSelectElement).value))}>
            ${site.sections.map((z) => html`<option value=${z.n} ?selected=${z.n === s.n}>${this.partName(z.n)}</option>`)}
          </select>
          ${shop
            ? html`<div class="site-shop">
                <label class="to-field"><span>${t('Orders go to')}</span><input type="email" .value=${site.orders} placeholder=${t('you@example.com, or orders are copied')} autocomplete="off" @change=${(e: Event) => this.edit([settingOp('orders', (e.target as HTMLInputElement).value)])} /></label>
                <label class="to-field"><span>${t('Currency')}</span><input type="text" .value=${this.doc.head.currency ?? ''} placeholder="$" autocomplete="off" @change=${(e: Event) => this.edit([settingOp('currency', (e.target as HTMLInputElement).value)])} /></label>
              </div>`
            : nothing}
          <to-text class="site-text" shape="doc" .blocks=${this.blocks()} .card=${this.card} label=${t('The words of {part}', { part: this.partName(s.n) })} placeholder=${s.n === 0 ? t('Your site’s name, then a line about it') : t('Words for this part')} @text-ops=${this.onOps} @text-select=${this.onSelect} @text-embed=${this.onCardTap} @text-escape=${this.onTextEscape} @keydown=${this.onTextKey}></to-text>
          <p class="site-hint to-hint">${site.links ? t('A button is a quote: “Label | https://…”. A small link is a list item: “:icon: Name | https://…”.') : t('A card is a list item: “Heading | a line about it”. A button is a quote: “Label | https://…”.')}</p>
        </section>
      </div>
      <to-context class="site-context" .label=${this.held !== null && partOf(site, this.held)?.page ? t('This page') : t('This section')} .items=${this.heldItems()}></to-context>
      <to-menu class="site-cardmenu" .label=${t('This card')} .items=${this.cardItems()}></to-menu>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToSiteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-site-editor': ToSiteEditor;
  }
}
