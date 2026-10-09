/**
 * <to-deck-editor>: the Deck app. One bar (Insert ▾, Present, the marks, link, footnote, the slide's icon,
 * indent, Layout, Look, Transition, Format, the QR toggle, move, delete, undo, redo) over the current
 * slide, which fills the editor in its format's shape: the headline is a <to-text shape=line> over the
 * slide's heading block, the words a <to-text shape=lines> over its items and paragraphs (two of them for
 * two columns, either side of the "|"), the speaker notes a <to-text shape=lines> over its quote blocks.
 * Every op from an editor is offset by its span's start and applied here with the kernel, recorded in the
 * op-log history (kit/history.ts) and written back to the shell as TLO. A slide that shows another
 * document (a fence, a table, a picture, a web address alone) shows it as a card with a menu. A rail of
 * thumbnails is drawn by the view; a printed format shows its sheets on request; presenting shows one
 * slide at a time with the transition the header names, and ends on the QR code of the deck.
 */
import { LitElement, html, nothing } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ChevronDown, ChevronUp, LayoutTemplate, Palette, Play, Printer, Scroll, Shuffle } from 'lucide';
import { applyAll, noteRuns, parse, plainText, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { tool } from '../../kit/bar.ts';
import { linkToFence } from '../../kit/clipboard.ts';
import { encodeDoc } from '../../kit/codec.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { pageSvg } from '../../kit/draw.ts';
import { History } from '../../kit/history.ts';
import { icon, iconNamed, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { routeHash } from '../../kit/route.ts';
import type { Sel } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { addSlide, FORMATS, joinHeadline, LAYOUTS, loosen, moveSlide, removeSlide, setHead, setIcon, setLayout, setSub, settingsOf, slideNotes, slidesOf, TRANSITIONS, webBlock, type Format, type Layout, type Settings, type Slide } from './model.ts';
import { ICON_COLORS, THEMES } from './theme.ts';
import { closingPage, emptySlide, geometryOf, layoutSlide, lookOf, pageCount, pageOf, pageSize, sheetsOf, SH, slidePage, slideSteps, subPage, SW, type Look } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/dialog.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-deck-editor';

/** A question with one box: what it asks, the box's name and hint, what is in it to begin with. */
interface Ask {
  heading: string;
  label: string;
  placeholder: string;
  value: string;
  done: (answer: string | null) => void;
}
/** Which box the bar's text buttons work on. */
type Field = 'title' | 'words' | 'right' | 'notes';
/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;

/** Ops from an editor over a span, moved to where the span sits in the document. */
export function offset(ops: Op[], by: number): Op[] {
  return ops.map((op) => {
    if (op.op === 'head') return op;
    if (op.op === 'move') return { ...op, at: op.at + by, to: op.to + by };
    return { ...op, at: op.at + by };
  });
}

export class ToDeckEditor extends LitElement {
  static properties = { value: {}, doc: { state: true }, cur: { state: true }, asking: { state: true }, showing: { state: true }, shown: { state: true }, leaving: { state: true }, noting: { state: true }, sheets: { state: true }, subMenu: { state: true } };
  /** The document's text, from the shell. */
  declare value: string;
  declare doc: Doc;
  /** The slide open for editing. */
  declare cur: number;
  declare asking: Ask | null;
  /** The slide being presented, -1 when not presenting. */
  declare showing: number;
  /** Reveals made on the slide being presented. */
  declare shown: number;
  /** The slide being left, while the next one arrives over it; -1 otherwise. */
  declare leaving: number;
  /** Speaker notes showing while presenting (N toggles). */
  declare noting: boolean;
  /** A printed format showing the sheets to print rather than its pages. */
  declare sheets: boolean;
  /** The sub-document's menu is open. */
  declare subMenu: boolean;
  readonly history = new History();
  /** The text last written out, so a value coming back is known for ours. */
  private emitted = '';
  /** The selection the editor last reported, and which box it was in. */
  private sel: Sel | null = null;
  private field: Field = 'title';
  private forwards = true;
  private settle = 0;
  private lastClick = 0;
  /** Focus asked for after the next draw: the box, and the caret's place in it. */
  private focusNext: { field: Field; at: 'start' | 'end' } | null = null;

  constructor() {
    super();
    this.value = '';
    this.doc = parse('');
    this.cur = 0;
    this.asking = null;
    this.showing = -1;
    this.shown = 0;
    this.leaving = -1;
    this.noting = true;
    this.sheets = false;
    this.subMenu = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('docundo', this.onUndo);
    this.addEventListener('docredo', this.onRedo);
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('docundo', this.onUndo);
    this.removeEventListener('docredo', this.onRedo);
    window.removeEventListener('keydown', this.onKey);
    clearTimeout(this.settle);
  }

  /* ---------- the document ---------- */

  get slides(): Slide[] {
    return slidesOf(this.doc);
  }
  get settings(): Settings {
    return settingsOf(this.doc);
  }
  /** How many pages there are to edit: the slides written, or the format's count. */
  get count(): number {
    return Math.max(1, pageCount(this.doc, this.settings, this.slides.length));
  }
  /** The current slide; past what is written, an empty one at the document's end. */
  get slide(): Slide {
    return this.slides[this.cur] ?? emptySlide(this.doc.blocks.length);
  }
  text(field: Field): ToText | null {
    return this.querySelector<ToText>(`to-text.deck-${field}`);
  }
  /** The box last typed in, for the bar's buttons. */
  get current(): ToText | null {
    return this.text(this.field) ?? this.text('words') ?? this.text('title');
  }
  /** The spans of blocks each box owns, cut once per document and slide: the same arrays on every draw, so <to-text> redraws only what changed. */
  private spans: { doc: Doc; cur: number; title: Block[]; words: Block[]; right: Block[]; notes: Block[] } | null = null;
  private boxes(s: Slide): { title: Block[]; words: Block[]; right: Block[]; notes: Block[] } {
    if (this.spans && this.spans.doc === this.doc && this.spans.cur === this.cur) return this.spans;
    const b = this.doc.blocks;
    const written = this.cur < this.slides.length;
    this.spans = {
      doc: this.doc,
      cur: this.cur,
      // The headline box owns the words alone: the icon is the button beside it (the ops come back joined, see onOps).
      title: written && s.head >= 0 ? [{ ...(b[s.head] as Extract<Block, { k: 'h' }>), runs: s.title }] : [],
      words: written ? b.slice(s.words[0], s.layout === '2' && s.pipe >= 0 ? s.pipe : s.words[1]) : [],
      right: written && s.layout === '2' && s.pipe >= 0 ? b.slice(s.pipe + 1, s.words[1]) : [],
      notes: written ? b.slice(s.notes[0], s.notes[1]) : [],
    };
    return this.spans;
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') && this.value !== this.emitted) this.take(this.value);
    if (this.cur >= this.count) this.cur = this.count - 1;
  }
  /** A value from outside: the same blocks with another head is the head edited (undoable); anything else is another document, loosened if written loosely. */
  private take(text: string) {
    const parsed = parse(text);
    const same = parsed.blocks.length === this.doc.blocks.length && write({ head: {}, blocks: parsed.blocks }) === write({ head: {}, blocks: this.doc.blocks });
    if (same && this.emitted) {
      const keys = new Set([...Object.keys(this.doc.head), ...Object.keys(parsed.head)]);
      const ops: Op[] = [...keys].filter((k) => this.doc.head[k] !== parsed.head[k]).map((key) => ({ op: 'head', key, value: parsed.head[key] }));
      this.history.record(this.doc, ops, this.sel, this.sel);
      this.doc = { head: parsed.head, blocks: this.doc.blocks };
      this.emitted = text;
      return;
    }
    this.history.clear();
    const next = loosen(parsed);
    this.doc = next;
    this.cur = 0;
    this.emitted = text;
    if (next !== parsed) this.emit();
  }
  private emit() {
    this.emitted = write(this.doc);
    this.value = this.emitted;
    this.dispatchEvent(new CustomEvent<string>('docchange', { detail: this.emitted, bubbles: true }));
  }
  /** Ops from anywhere: applied, recorded, the shell told. */
  private edit(ops: Op[], key?: string) {
    if (!ops.length) return;
    const was = this.doc;
    this.doc = applyAll(was, ops);
    this.history.record(was, ops, this.sel, this.sel, key);
    this.emit();
  }
  /** The rules that make slide i exist, when it is a page past what is written: the ops, and where its (empty) span will sit. */
  private ensure(i: number): { ops: Op[]; start: number } {
    const n = this.slides.length;
    if (i < n) return { ops: [], start: -1 };
    const hrs = Array.from({ length: i - n + 1 }, () => ({ k: 'hr' }) as Block);
    return { ops: [{ op: 'splice', at: this.doc.blocks.length, n: 0, blocks: hrs }], start: this.doc.blocks.length + hrs.length };
  }
  /** Ops from one of the boxes: offset to its span, the first block of an empty span given the kind the box is for. */
  private onOps(field: Field, e: CustomEvent<TextOps>) {
    e.stopPropagation();
    const { ops, sel, before, kind } = e.detail;
    const s = this.slide;
    const made = this.ensure(this.cur);
    if (field === 'title') {
      // The headline: the ops are applied to the words alone, and the block put back whole with its icon in front.
      const was = s.head >= 0 ? (this.doc.blocks[s.head] as Extract<Block, { k: 'h' }>) : null;
      const next = applyAll({ head: {}, blocks: this.boxes(s).title }, ops).blocks[0];
      const runs = next && 'runs' in next ? next.runs : [];
      const h: Block = { k: 'h', level: was?.level ?? 2, runs: joinHeadline(s.icon, runs), ...(was?.a ? { a: was.a } : {}) };
      const put: Op = was ? { op: 'splice', at: s.head, n: 1, blocks: [h] } : { op: 'splice', at: made.start >= 0 ? made.start : s.from, n: 0, blocks: [h] };
      const all = [...made.ops, put];
      const before_ = this.doc;
      this.doc = applyAll(before_, all);
      this.history.record(before_, all, before, sel, kind);
      this.emit();
      return;
    }
    const start = made.start >= 0 ? made.start : field === 'words' ? s.words[0] : field === 'right' ? s.pipe + 1 : s.notes[0];
    let moved = offset(ops, start);
    const first = moved[0];
    // The editor over an empty span puts a paragraph in first: here it is the block the box is for.
    if (first?.op === 'splice' && first.n === 0 && first.blocks.length === 1 && first.blocks[0].k === 'p' && !first.blocks[0].runs.length) moved = [{ ...first, blocks: [this.born(field, s)] }, ...moved.slice(1)];
    const all = [...made.ops, ...moved];
    const was = this.doc;
    this.doc = applyAll(was, all);
    this.history.record(was, all, before, sel, kind);
    this.emit();
  }
  /** The block an empty box's first words make: a headline, a bullet (prose on a printed page), a note. */
  private born(field: Field, s: Slide): Block {
    if (field === 'title') return { k: 'h', level: 2, runs: [] };
    if (field === 'notes') return { k: 'quote', runs: [] };
    const prose = !!this.settings.format && this.settings.format !== 'comic' && !s.layout;
    return prose ? { k: 'p', runs: [] } : { k: 'li', depth: 0, runs: [] };
  }
  private step(which: 'undo' | 'redo') {
    const st = which === 'undo' ? this.history.undo() : this.history.redo();
    if (!st) return;
    this.doc = applyAll(this.doc, st.ops);
    this.emit();
    void this.updateComplete.then(() => {
      const box = this.current;
      if (box && st.sel) box.sel = st.sel;
      else box?.focus({ preventScroll: true });
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
  /** A box's selection, for the bar's pressed states (the box itself is known from its focus). */
  private onSelect(field: Field, e: CustomEvent<Sel | null>) {
    e.stopPropagation();
    if (e.detail) this.field = field;
    this.sel = e.detail;
    this.requestUpdate();
  }
  /** The caret into a box: at its start or its end. */
  private focusBox(field: Field, at: 'start' | 'end' = 'end') {
    this.focusNext = { field, at };
    this.requestUpdate();
  }
  private placeFocus() {
    const f = this.focusNext;
    if (!f) return;
    this.focusNext = null;
    const box = this.text(f.field);
    if (!box) return;
    const model = box.model;
    const last = model.length - 1;
    const len = (b: Block) => ('runs' in b ? b.runs.reduce((n, r) => n + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0) : 0);
    const pos = f.at === 'start' ? { block: 0, offset: 0 } : { block: last, offset: len(model[last]) };
    box.sel = { anchor: pos, focus: pos };
    box.focus({ preventScroll: true });
  }

  /* ---------- slides ---------- */

  private go(i: number) {
    this.cur = Math.max(0, Math.min(this.count - 1, i));
    this.sheets = false;
  }
  /** A new slide after this one, of a layout, opened with the caret in its headline. */
  private newSlide(layout: Layout = '', blocks?: Block[]) {
    const g = geometryOf(this.settings.format);
    if (g?.grow && this.count >= g.grow) return;
    const made = this.ensure(this.cur);
    const doc = applyAll(this.doc, made.ops);
    const added = addSlide(doc, this.cur, layout, blocks);
    this.edit([...made.ops, ...added.ops]);
    this.cur = added.at;
    this.focusBox('title');
  }
  private deleteSlide() {
    if (this.cur >= this.slides.length) return;
    this.edit(removeSlide(this.doc, this.cur));
    this.cur = Math.max(0, Math.min(this.cur, this.count - 1));
  }
  private move(by: 1 | -1) {
    const j = this.cur + by;
    if (j < 0 || j >= this.count) return;
    // Moving against a page not yet written: the rules are written first, so that both exist.
    const made = this.ensure(Math.max(j, this.cur));
    const doc = applyAll(this.doc, made.ops);
    this.edit([...made.ops, ...moveSlide(doc, this.cur, j)]);
    this.cur = j;
  }
  /** The current slide, made to exist first: the ops that make it, and the slide as it then is. */
  private existing(): { ops: Op[]; doc: Doc; s: Slide } {
    const made = this.ensure(this.cur);
    const doc = applyAll(this.doc, made.ops);
    return { ops: made.ops, doc, s: made.start >= 0 ? emptySlide(made.start) : this.slide };
  }
  private setLayout(layout: Layout) {
    const { ops, doc, s } = this.existing();
    this.edit([...ops, ...setLayout(doc, s, layout)]);
  }
  /** The slide's icon, from the library, its own words suggesting; the deck's icon colour is in the Look menu. */
  private async pickIcon() {
    const s = this.slide;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const { suggestIcons } = await import('../../kit/icons-search.ts');
    const name = await chooseIcon({ current: s.icon, none: true, suggested: suggestIcons(plainText(s.title), s.items.map((it) => plainText(it.runs))) });
    if (name === null) return;
    const made = this.existing();
    this.edit([...made.ops, ...setIcon(made.doc, made.s, name)]);
  }
  /** Another document on the slide: on this one if it has nothing on it, else on a new slide after it. */
  private putSub(block: Block) {
    const s = this.slide;
    const blank = this.cur >= this.slides.length || (s.sub < 0 && !s.items.length && !s.right.length && !plainText(s.title).trim() && !s.icon);
    if (!blank) return this.newSlide('', [block]);
    const made = this.existing();
    this.edit([...made.ops, ...setSub(made.s, block)]);
  }
  private subItems(): MenuItem[] {
    const s = this.slide;
    const b = s.sub >= 0 ? this.doc.blocks[s.sub] : null;
    if (!b) return [];
    const here = `${location.origin}${location.pathname}`;
    const remove = { label: t('Remove from the slide'), icon: UI.trash, does: () => this.edit(setSub(s, null)) };
    if (b.k === 'fence' && b.lang) {
      const def = lookup.appOf(b.lang);
      return [{ label: t('Open in {app}', { app: def?.name ?? b.lang }), icon: UI.open, does: () => void window.open(here + routeHash(b.lang, encodeDoc(b.body)), '_blank', 'noopener') }, remove];
    }
    if (b.k === 'table') return [{ label: t('Open in {app}', { app: lookup.appOf('sheet')?.name ?? 'Sheet' }), icon: UI.open, does: () => void window.open(here + routeHash('sheet', encodeDoc(write({ head: {}, blocks: [b] }))), '_blank', 'noopener') }, remove];
    const url = b.k === 'img' ? b.url : plainText(b.k === 'p' ? b.runs : []).trim();
    return [
      {
        label: t('Change the address…'),
        icon: UI.pen,
        does: async () => {
          const next = await this.ask(b.k === 'img' ? t('Picture') : t('From the web'), t('Address'), 'https://', url);
          if (next?.trim()) this.edit(setSub(s, b.k === 'img' ? { ...b, url: next.trim() } : webBlock(next)));
        },
      },
      remove,
    ];
  }
  private openSubMenu = (e: Event) => {
    this.subMenu = true;
    const card = e.currentTarget as HTMLElement;
    void this.updateComplete.then(async () => {
      const menu = this.querySelector<ToMenu>('to-menu.deck-submenu');
      if (!menu) return;
      await menu.updateComplete;
      menu.openAt(card);
    });
  };

  /* ---------- asking ---------- */

  private ask(heading: string, label: string, placeholder: string, value = ''): Promise<string | null> {
    return new Promise((done) => {
      this.asking = { heading, label, placeholder, value, done };
      void this.updateComplete.then(() => void this.querySelector<ToDialog>('to-dialog.deck-ask')?.show());
    });
  }
  private answer(value: string | null) {
    const a = this.asking;
    if (!a) return;
    this.asking = null;
    this.querySelector<ToDialog>('to-dialog.deck-ask')?.close();
    a.done(value);
  }
  private async insertPicture() {
    const url = await this.ask(t('Picture'), t('Address of the picture'), 'https://');
    if (url?.trim()) this.putSub({ k: 'img', alt: '', url: url.trim() });
  }
  private async insertWeb() {
    const url = await this.ask(t('From the web'), t('Address of a video, a post, a song, a place, a page'), 'https://');
    if (url?.trim()) this.putSub(webBlock(url));
  }
  private async insertDocument() {
    const url = await this.ask(t('A document by link'), t('A TinyLittleOffice link'), 'https://tinylittleoffice.com/#/v1/…');
    const fence = url && linkToFence(url.trim());
    if (fence) this.putSub(fence);
  }
  private inserts(): MenuItem[] {
    const g = geometryOf(this.settings.format);
    const full = !!g?.grow && this.count >= g.grow;
    const page = !!g;
    const group = page ? t('Pages') : t('Slides');
    const name = (l: Layout) => (page ? { '': t('Page'), t: t('Title page'), '2': t('Two-column page'), i: t('Big icon page') }[l] : { '': t('Bullets slide'), t: t('Title slide'), '2': t('Two-column slide'), i: t('Big icon slide') }[l]);
    const icons: Record<Layout, typeof UI.list> = { '': UI.list, t: UI.heading1, '2': LayoutTemplate, i: UI.icon };
    const bySheet = !!g?.grow && (g.by ?? 4) > 1;
    const onSlide = page ? t('On the page') : t('On the slide');
    return [
      ...(bySheet
        ? [{ label: t('Four more pages'), icon: UI.plus, group, disabled: full, does: () => this.edit(setHead('pages', String(Math.min(g!.grow!, this.count + (g!.by ?? 4))))) }]
        : LAYOUTS.map((l) => ({ label: name(l.id), icon: icons[l.id], group, disabled: full, does: () => this.newSlide(l.id) }))),
      { label: t('Picture…'), icon: UI.image, group: onSlide, does: () => void this.insertPicture() },
      { label: t('Table'), icon: UI.table, group: onSlide, does: () => this.putSub({ k: 'table', cols: [{ name: 'ColA', type: 'text' }, { name: 'ColB', type: 'text' }, { name: 'ColC', type: 'text' }], rows: [] }) },
      { label: t('From the web…'), icon: UI.globe, group: onSlide, does: () => void this.insertWeb() },
      { label: t('A document by link…'), icon: UI.insert, group: onSlide, does: () => void this.insertDocument() },
    ];
  }

  /* ---------- the menus ---------- */

  private layoutItems(): MenuItem[] {
    const now = this.slide.layout;
    return LAYOUTS.map((l) => ({ label: l.name(), checked: l.id === now, does: () => this.setLayout(l.id) }));
  }
  private lookItems(): MenuItem[] {
    const s = this.settings;
    const theme = (id: string) => ({ label: THEMES[id].name(), swatch: THEMES[id].dark ? THEMES[id].paper : THEMES[id].accent, group: THEMES[id].fun ? t('Fun') : t('Theme'), checked: s.theme === id, does: () => this.edit(setHead('theme', id)) });
    return [
      ...Object.keys(THEMES).map(theme),
      { label: t('The theme\'s colour'), swatch: THEMES[s.theme].accent, group: t('Icons'), checked: !s.color, does: () => this.edit(setHead('color', '')) },
      ...Object.entries(ICON_COLORS).map(([id, c]) => ({ label: c.name(), swatch: c.hex, group: t('Icons'), checked: s.color === id, does: () => this.edit(setHead('color', id)) })),
    ];
  }
  private transitionItems(): MenuItem[] {
    const now = this.settings.transition;
    return TRANSITIONS.map((x) => ({ label: x.name(), checked: x.id === now, does: () => this.edit(setHead('transition', x.id)) }));
  }
  private formatItems(): MenuItem[] {
    const s = this.settings;
    const g = geometryOf(s.format);
    return [
      ...FORMATS.map((f) => ({ label: f.name(), group: t('Format'), checked: f.id === s.format, does: () => this.setFormat(f.id) })),
      ...(g?.sides
        ? [
            { label: t('One-sided: fold and cut'), group: t('Printing'), checked: !s.two, does: () => this.edit(setHead('sides', '')) },
            { label: t('Two-sided: cut and nest'), group: t('Printing'), checked: s.two, does: () => this.edit(setHead('sides', '2')) },
          ]
        : []),
    ];
  }
  private setFormat(format: Format) {
    this.edit([...setHead('format', format), ...setHead('sides', ''), ...setHead('pages', '')]);
    this.sheets = false;
  }

  /* ---------- presenting ---------- */

  /** The closing code, drawn from the deck as it stands. */
  private get end() {
    return closingPage(this.emitted || write(this.doc), this.doc, this.settings);
  }
  private total(): number {
    return this.slides.length + (this.end ? 1 : 0);
  }
  private steps(i = this.showing): number {
    return i < this.slides.length ? slideSteps(this.slides[i]) : 0;
  }
  private show(i: number, shown = 0) {
    clearTimeout(this.settle);
    this.leaving = i >= 0 && this.showing >= 0 && i !== this.showing ? this.showing : -1;
    this.forwards = i >= this.showing;
    if (this.leaving >= 0) this.settle = window.setTimeout(() => (this.leaving = -1), 650);
    const was = this.showing;
    this.showing = i;
    this.shown = shown;
    // Out of the show, the focus comes back to the button that began it.
    if (i < 0 && was >= 0) void this.updateComplete.then(() => this.querySelector<HTMLButtonElement>('button.deck-present')?.focus({ preventScroll: true }));
  }
  private forward() {
    if (this.shown < this.steps()) this.shown++;
    else if (this.showing + 1 < this.total()) this.show(this.showing + 1);
    else this.show(-1);
  }
  private back() {
    if (this.shown > 0) this.shown--;
    else if (this.showing > 0) this.show(this.showing - 1, this.steps(this.showing - 1));
  }
  private onShowClick = () => {
    const now = performance.now();
    // A fast second click means "just show me the slide".
    if (now - this.lastClick < FAST) this.shown = this.steps();
    else this.forward();
    this.lastClick = now;
  };
  private onKey = (e: KeyboardEvent) => {
    if (!this.isConnected) return;
    if (this.showing >= 0) {
      if (e.key === 'Escape') this.show(-1);
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') this.forward();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') this.back();
      else if (e.key === 'End') this.shown = this.steps();
      else if (e.key.toLowerCase() === 'n') this.noting = !this.noting;
      else return;
      e.preventDefault();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.shiftKey && e.key === 'Enter' && !this.settings.format) this.show(this.cur);
    else if (mod && e.key === 'Enter') this.newSlide();
    else if (e.key === 'PageDown' && !mod) this.go(this.cur + 1);
    else if (e.key === 'PageUp' && !mod) this.go(this.cur - 1);
    else return;
    e.preventDefault();
  };

  /* ---------- drawing ---------- */

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
  /** The theme as the canvas wears it: its colours, the sizes the layout chose (in the canvas's own width), and its decoration as the background. */
  private canvasStyle(s: Slide, look: Look, size: { w: number; h: number }): string {
    const loud = this.settings.format === 'poster' ? 2 : this.settings.format && s.layout === 't' ? 1.6 : 1;
    const L = layoutSlide(s, { w: size.w, h: size.h, loud });
    const T = look.theme;
    const deco = look.themed && T.deco ? `--deck-deco:url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none">${T.deco}</svg>`)}");` : '';
    const colours = look.themed ? `--deck-paper:${T.paper};--deck-ink:${T.ink};--deck-muted:${T.muted};--deck-accent:${T.accent};` : '';
    const px = (n: number) => `${Math.round((n / size.w) * 10000) / 100}cqw`;
    return `--deck-w:${size.w};--deck-h:${size.h};--deck-title:${px(L.titlePx || 40)};--deck-body:${px(L.bodyPx || 20)};--deck-icon:${look.icon};${colours}${deco}`;
  }
  private renderCanvas(s: Slide, look: Look) {
    const st = this.settings;
    const g = geometryOf(st.format);
    const size = pageSize(st);
    const n = this.count;
    const { title: titleBlocks, words: wordsBlocks, right: rightBlocks, notes: noteBlocks } = this.boxes(s);
    const titleNotes = s.title.filter((r) => r.fn !== undefined).length;
    const leftNotes = s.items.reduce((k, it) => k + it.runs.filter((r) => r.fn !== undefined).length, 0);
    const notes = slideNotes(s);
    const sub = s.sub >= 0 ? subPage(this.doc, s) : null;
    const prose = !!st.format && st.format !== 'comic' && !s.layout;
    const wordsHint = st.format === 'comic' ? t('A panel a line: what is said | the caption. Icon gives it a picture.') : prose ? t('What this page says. The type shrinks to fit the page.') : s.layout === 't' ? t('A line or two under the title') : t('One bullet a line. Tab steps it in.');
    const foot = g ? g.name(this.cur, n) : t('{n} / {total}', { n: this.cur + 1, total: n });
    const pickLabel = s.icon ? t('Change the icon') : t('Add an icon');
    const pick = html`<button type="button" class="deck-pick ${s.icon ? '' : 'empty'}" aria-label=${pickLabel} title=${pickLabel} @click=${() => void this.pickIcon()}>${s.icon && iconNamed(s.icon) ? icon(iconNamed(s.icon)!, 32) : icon(UI.icon, 20)}</button>`;
    return html`<div class="deck-canvas lay-${s.layout || 'b'} ${look.themed ? 'themed' : ''} ${look.theme.dark ? 'dark' : ''} ${sub ? 'has-sub' : ''} ${prose ? 'prose' : ''}" style=${this.canvasStyle(s, look, size)} data-format=${st.format || 'deck'}>
        <div class="deck-head">
          ${s.layout === 'i' ? nothing : pick}
          <to-text class="deck-title" shape="line" .blocks=${titleBlocks} label=${t('Headline')} placeholder=${s.layout === 't' || (g && this.cur === 0) ? t('Title') : t('Headline')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('title', e)} @focusin=${() => (this.field = 'title')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('title', e)} @text-enter=${() => this.focusBox(sub ? 'notes' : 'words', 'start')}></to-text>
        </div>
        ${sub
          ? html`<figure class="deck-sub" tabindex="0" role="group" aria-label=${sub.alt || t('A document on the slide')} @click=${this.openSubMenu} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), this.openSubMenu(e))}>
              <svg viewBox="0 0 ${sub.w} ${sub.h}" aria-hidden="true">${unsafeSVG(sub.svg)}</svg>
            </figure>`
          : html`<div class="deck-words-row">
              <to-text class="deck-words" shape="lines" .blocks=${wordsBlocks} note-start=${titleNotes} label=${s.layout === '2' ? t('Left column') : t('Words')} placeholder=${wordsHint} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('words', e)} @focusin=${() => (this.field = 'words')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('words', e)} @text-exit=${() => this.focusBox('title')}></to-text>
              ${s.layout === '2'
                ? html`<to-text class="deck-right" shape="lines" .blocks=${rightBlocks} note-start=${titleNotes + leftNotes} label=${t('Right column')} placeholder=${t('One bullet a line.')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('right', e)} @focusin=${() => (this.field = 'right')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('right', e)} @text-exit=${() => this.focusBox('words')}></to-text>`
                : s.layout === 'i'
                  ? html`<button type="button" class="deck-big ${s.icon ? '' : 'empty'}" aria-label=${pickLabel} @click=${() => void this.pickIcon()}>${s.icon && iconNamed(s.icon) ? icon(iconNamed(s.icon)!, 120) : html`${icon(UI.icon, 40)}<span>${t('Pick an icon')}</span>`}</button>`
                  : nothing}
            </div>`}
        ${notes.length
          ? html`<ol class="deck-fn" aria-label=${t('Footnotes')}>
              ${notes.map((fn) => html`<li>${this.noteWords(fn)}</li>`)}
            </ol>`
          : nothing}
        <span class="deck-num">${foot}</span>
      </div>
      <to-text class="deck-notes" shape="lines" .blocks=${noteBlocks} label=${t('Speaker notes')} placeholder=${t('Speaker notes: for you when presenting, never on the slide')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('notes', e)} @focusin=${() => (this.field = 'notes')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('notes', e)} @text-exit=${() => this.focusBox(sub ? 'title' : 'words')}></to-text>`;
  }
  private renderRail(look: Look) {
    const st = this.settings;
    const g = geometryOf(st.format);
    const n = this.count;
    const slides = this.slides;
    const end = g ? null : this.end;
    return html`<nav class="deck-rail" aria-label=${g ? t('Pages') : t('Slides')}>
      ${Array.from({ length: n }, (_, i) => {
        const s = slides[i];
        const p = pageOf(this.doc, i, st, slides, look);
        const words = s ? plainText(s.title).trim() || plainText(s.items[0]?.runs ?? []).trim() : '';
        const name = (g ? g.name(i, n) : t('Slide {n}', { n: i + 1 })) + (words ? `: ${words}` : '');
        return html`<button type="button" class="deck-thumb" aria-label=${name} aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => this.go(i)}><span class="n">${i + 1}</span><svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg></button>`;
      })}
      ${end ? html`<div class="deck-end" role="img" aria-label=${t('Last slide, added for you: a QR code of this whole deck')} title=${t('Ends with a QR code of this deck, so the room can take it home. The QR button turns it off.')}>${icon(UI.qr, 28)}<span>${t('QR code of this deck')}</span></div>` : nothing}
    </nav>`;
  }
  private renderSheets() {
    const st = this.settings;
    const g = geometryOf(st.format)!;
    return html`<div class="deck-sheets">
      <p class="to-hint">${g.how(st.two)}</p>
      ${sheetsOf(this.doc, st).map((p, i) => html`<div class="deck-sheet">${unsafeSVG(pageSvg(p, `role="img" aria-label="${t('Sheet, side {n}', { n: i + 1 })}"`))}</div>`)}
    </div>`;
  }
  private renderShow(look: Look) {
    const slides = this.slides;
    const end = this.end;
    const total = slides.length + (end ? 1 : 0);
    const page = (i: number, shown = Infinity) => (i < slides.length ? slidePage(this.doc, slides[i], look, shown) : end!);
    const p = page(this.showing, this.shown);
    const s = slides[this.showing];
    const motion = `tr-${this.settings.transition || 'fade'} ${this.forwards ? '' : 'back'}`;
    return html`<div class="deck-show" role="dialog" aria-modal="true" aria-label=${t('Presentation')} @click=${this.onShowClick}>
      ${this.leaving >= 0 && this.leaving < total ? keyed(this.leaving, html`<div class="was ${motion}" aria-hidden="true"><svg viewBox="0 0 ${SW} ${SH}">${unsafeSVG(page(this.leaving).svg)}</svg></div>`) : nothing}
      ${keyed(this.showing, html`<div class="frame ${motion}"><svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label=${p.alt || ''}>${unsafeSVG(p.svg)}</svg></div>`)}
      <p class="sr-only" aria-live="polite">${t('Slide {n} of {total}', { n: this.showing + 1, total })}: ${p.alt ?? ''}</p>
      <div class="ctl" role="group" aria-label=${t('Presentation')} @click=${(e: Event) => e.stopPropagation()}>
        ${tool({ label: t('Previous'), icon: ChevronUp, disabled: this.showing === 0 && this.shown === 0, does: () => this.back() })}
        ${tool({ label: t('Next'), icon: ChevronDown, does: () => this.forward() })}
        ${tool({ label: t('Stop presenting'), icon: UI.close, keys: 'Esc', does: () => this.show(-1) })}
      </div>
      <span class="pos">${this.showing + 1} / ${total}</span>
      ${s?.noteLines.length && this.noting ? html`<div class="notes" @click=${(e: Event) => e.stopPropagation()}><b>${t('Notes')}</b> ${s.noteLines.map((ln) => html`<p>${ln}</p>`)}<small>${t('N hides them')}</small></div>` : nothing}
    </div>`;
  }

  render() {
    const st = this.settings;
    const look = lookOf(st);
    const g = geometryOf(st.format);
    const s = this.slide;
    const box = this.sel ? this.current : null;
    const m = box?.marks ?? {};
    const on = (c: 'b' | 'i' | 'u' | 's' | 'h') => !!m[c];
    const canIndent = this.field !== 'title' && box?.kind === 'ul';
    const a = this.asking;
    const n = this.count;
    return html`<to-bar class="deck-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${g
          ? tool({ label: this.sheets ? t('Back to the pages') : t('See the sheets to print'), icon: Printer, pressed: this.sheets, cls: 'deck-present', does: () => (this.sheets = !this.sheets) })
          : tool({ label: t('Present'), icon: Play, keys: 'Mod+Shift+Enter', cls: 'deck-present', does: () => this.show(this.cur) })}
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: on('b'), does: () => this.current?.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: on('i'), does: () => this.current?.exec('i') })}
        ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: on('u'), does: () => this.current?.exec('u') })}
        ${tool({ label: t('Strikethrough'), icon: UI.strike, keep: true, pressed: on('s'), does: () => this.current?.exec('s') })}
        ${tool({ label: t('Highlight'), icon: UI.highlight, keep: true, pressed: on('h'), does: () => this.current?.exec('h') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.current?.exec('link') })}
        ${tool({ label: t('Footnote'), icon: UI.footnote, keep: true, does: () => this.current?.exec('fn') })}
        ${tool({ label: t('Icon'), icon: UI.icon, does: () => void this.pickIcon() })}
        ${tool({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', keep: true, disabled: !canIndent, does: () => this.current?.exec('outdent') })}
        ${tool({ label: t('Indent'), icon: UI.indent, keys: 'Tab', keep: true, disabled: !canIndent, does: () => this.current?.exec('indent') })}
        <to-menu class="deck-layout" icon-only .label=${t('Layout: {layout}', { layout: LAYOUTS.find((l) => l.id === s.layout)!.name() })} .icon=${LayoutTemplate} .items=${this.layoutItems()}></to-menu>
        <to-menu class="deck-look" icon-only .label=${t('Look: {theme}', { theme: THEMES[st.theme].name() })} .icon=${Palette} .items=${this.lookItems()}></to-menu>
        ${g ? nothing : html`<to-menu class="deck-transition" icon-only .label=${t('Transition: {transition}', { transition: TRANSITIONS.find((x) => x.id === st.transition)!.name() })} .icon=${Shuffle} .items=${this.transitionItems()}></to-menu>`}
        <to-menu class="deck-format" icon-only .label=${t('Format: {format}', { format: FORMATS.find((f) => f.id === st.format)!.name() })} .icon=${Scroll} .items=${this.formatItems()}></to-menu>
        ${g ? nothing : tool({ label: t('End with a QR code of this deck'), icon: UI.qr, pressed: st.qr, does: () => this.edit(setHead('qr', st.qr ? 'no' : '')) })}
        ${tool({ label: g ? t('Move page up') : t('Move slide up'), icon: ChevronUp, disabled: this.cur === 0, does: () => this.move(-1) })}
        ${tool({ label: g ? t('Move page down') : t('Move slide down'), icon: ChevronDown, disabled: this.cur >= n - 1, does: () => this.move(1) })}
        ${tool({ label: g ? t('Delete page') : t('Delete slide'), icon: UI.trash, disabled: this.cur >= this.slides.length, does: () => this.deleteSlide() })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.history.canUndo, does: () => this.step('undo') })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.history.canRedo, does: () => this.step('redo') })}
      </to-bar>
      ${this.sheets && g
        ? this.renderSheets()
        : html`<div class="deck-body">
            <div class="deck-stage">${this.renderCanvas(s, look)}</div>
            ${this.renderRail(look)}
          </div>`}
      ${this.showing >= 0 ? this.renderShow(look) : nothing}
      <to-menu class="deck-submenu" .label=${t('This document')} .items=${this.subMenu ? this.subItems() : []}></to-menu>
      <to-dialog class="deck-ask" heading=${a?.heading ?? ''} @to-close=${() => this.answer(null)} .body=${a
        ? html`<form class="deck-ask-form" @submit=${(e: Event) => (e.preventDefault(), this.answer((e.target as HTMLFormElement).querySelector('input')!.value))}>
            <label class="to-field"><span>${a.label}</span><input type="url" name="answer" .value=${a.value} placeholder=${a.placeholder} autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" enterkeyhint="done" required /></label>
            <div class="to-row"><button type="submit" class="to-btn primary">${icon(UI.check, 16)}<span>${t('OK')}</span></button></div>
          </form>`
        : nothing}></to-dialog>`;
  }
  protected updated(changed: Map<string, unknown>) {
    if (changed.has('asking') && this.asking) void this.updateComplete.then(() => this.querySelector<HTMLInputElement>('.deck-ask-form input')?.focus({ preventScroll: true }));
    if (this.focusNext) void this.updateComplete.then(() => this.placeFocus());
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDeckEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-deck-editor': ToDeckEditor;
  }
}
