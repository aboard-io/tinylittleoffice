/**
 * <to-site-editor>: the Website app. The site as it will look, in a sandboxed frame (the generated page in
 * its preview form: a "+" at the end of every section, handles on every heading), and beside it (under it
 * on a phone) the words of the section being edited in one <to-text shape=doc> over that section's blocks
 * (docs/kernel.md §8, decision 3). A tap on the page picks the section; the "+" and the handles send
 * messages that become ops here: a thing added is a `splice` (a product a `rows`), a part moved a `move`,
 * removed a `splice`. The editor's own ops are offset to the section's span. The bar: Insert ▾ (the same
 * things as the "+", and a thing from the web, another document), bold, italic, link, icon, the look ▾, and
 * undo and redo, which are the kit's op log (DocElement). A products table is a grid of cells beside the
 * words (Write's <to-write-table>, its edits `cells` ops); the shop's currency and where orders go are head
 * fields typed above it.
 */
import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Palette } from 'lucide';
import { blockLength, caret, type Sel } from '../../kit/textops.ts';
import { isText, plainText, type Block, type Doc, type Op } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { tool } from '../../kit/bar.ts';
import { linkToFence } from '../../kit/clipboard.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { insertRowAfter, setCellAt, tableView, webBlock } from '../write/model.ts';
import { fenceLink } from '../write/view.ts';
import '../write/table.ts';
// The table's grid is drawn by Write's sheet (its `table.wt` rules), not a second copy of them.
import '../write/style.css';
import { addOps, isPicture, kindName, kindsOf, linksOp, moveOps, readSite, removeOps, sectionAt, settingOp, themeOp, type Kind, type Site } from './model.ts';
import { FACES, THEMES, faceOf, isDark, type Face, type Theme } from './theme.ts';
import { sitePage } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/dialog.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-site-editor';

/** How long the page waits after a change before it is drawn again: typing does not reload it a letter at a time. */
const SETTLE = 350;

interface Ask {
  heading: string;
  label: string;
  value: string;
  done: (answer: string | null) => void;
}

/** A message from the preview: what was done, to which section. */
interface FrameMessage {
  site: number;
  do: 'pick' | 'add' | 'up' | 'down' | 'remove' | 'page' | 'undo' | 'redo' | 'ready';
  s?: number;
  kind?: Kind;
  id?: string;
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
  static properties: PropertyDeclarations = { cur: { state: true }, asking: { state: true }, cardAt: { state: true }, shown: { state: true } };
  /** The section being edited. */
  declare cur: number;
  declare asking: Ask | null;
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
    this.asking = null;
    this.cardAt = -1;
    this.shown = '';
  }
  protected read(doc: Doc): Site {
    return readSite(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this.onMessage);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this.onMessage);
    clearTimeout(this.timer);
  }
  get text(): ToText | null {
    return this.querySelector<ToText>('to-text.site-text');
  }
  get frame(): HTMLIFrameElement | null {
    return this.querySelector<HTMLIFrameElement>('iframe.site-frame');
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
    this.shown = sitePage(this.doc, { base: `${location.origin}${location.pathname}`, edit: { cur: this.section.n, stamp: this.stamp } });
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
    if (first) this.draw();
    else this.drawSoon();
  }
  private onMessage = (e: MessageEvent) => {
    const m = e.data as FrameMessage | null;
    if (!m || typeof m !== 'object' || e.source !== this.frame?.contentWindow || m.site !== this.stamp) return;
    const n = typeof m.s === 'number' ? m.s : -1;
    if (m.do === 'pick' && n >= 0 && n !== this.cur) this.pick(n, false);
    else if (m.do === 'add' && n >= 0 && m.kind) void this.add(m.kind, n);
    else if ((m.do === 'up' || m.do === 'down') && n >= 0) this.movePart(n, m.do === 'up' ? -1 : 1);
    else if (m.do === 'remove' && n >= 0) this.removePart(n);
    else if (m.do === 'page') {
      const p = this.view.pages.find((x) => x.id === m.id) ?? this.view.pages[0];
      if (this.section.page !== this.view.pages.indexOf(p)) this.pick(p.sections[0].n, false);
    } else if (m.do === 'undo' || m.do === 'redo') this.dispatchEvent(new CustomEvent(m.do === 'undo' ? 'docundo' : 'docredo', { cancelable: true }));
  };

  /* ---------- the section in hand ---------- */

  private pick(n: number, redraw = true) {
    this.cur = n;
    if (redraw) this.draw();
    else this.drawSoon();
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
    this.edit(moved, kind ? `type:${s.n}` : undefined);
  };
  private onSelect = (e: CustomEvent<Sel | null>) => {
    this.sel = e.detail;
    this.requestUpdate();
  };
  /** The caret over block `at` of the document (all of its words), once the section holding it is drawn. */
  private async select(at: number) {
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

  /** A thing put in at the end of section `n` (a page after its page): asked for first where it needs an address or an icon. */
  private async add(k: Kind, n = this.section.n) {
    let arg = '';
    if (k === 'picture') {
      arg = (await this.ask(t('Picture'), t('Address of the picture'), 'https://'))?.trim() ?? '';
      if (!arg) return;
    }
    if (k === 'icon') {
      const { chooseIcon } = await import('../../kit/icons-picker.ts');
      arg = (await chooseIcon()) ?? '';
      if (!arg) return;
    }
    const { ops, at } = addOps(this.doc, this.view, n, k, arg);
    this.edit(ops);
    void this.select(at);
  }
  private movePart(n: number, by: -1 | 1) {
    const ops = moveOps(this.view, n, by);
    if (!ops) return;
    const head = this.doc.blocks[this.view.sections[n].from];
    this.edit(ops);
    // The section goes on being the one in hand, where it is now.
    this.cur = sectionAt(this.view, this.doc.blocks.indexOf(head));
    this.draw();
  }
  private removePart(n: number) {
    const ops = removeOps(this.view, n);
    if (!ops) return;
    this.edit(ops);
    this.cur = Math.max(0, Math.min(n - 1, this.view.sections.length - 1));
    this.draw();
  }
  private setTheme(next: Partial<Theme>) {
    this.edit([themeOp({ ...this.view.theme, ...next })]);
  }
  private async addWeb() {
    const url = (await this.ask(t('From the web'), t('Address of a video, a post, a song, a place, a page'), 'https://'))?.trim();
    if (!url) return;
    const at = this.section.to;
    this.edit([{ op: 'splice', at, n: 0, blocks: [webBlock(url)] }]);
    void this.select(at);
  }
  private async addDocument() {
    const url = await this.ask(t('A document by link'), t('A TinyLittleOffice link'), 'https://tinylittleoffice.com/#/v1/…');
    const fence = url && linkToFence(url.trim());
    if (!fence) return;
    const at = this.section.to;
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

  /* ---------- asking ---------- */

  private ask(heading: string, label: string, placeholder: string, value = ''): Promise<string | null> {
    return new Promise((done) => {
      this.asking = { heading, label, value, done };
      void this.updateComplete.then(async () => {
        await this.querySelector<ToDialog>('to-dialog.site-ask')?.show();
        this.querySelector<HTMLInputElement>('.site-ask-form input')?.setAttribute('placeholder', placeholder);
        this.querySelector<HTMLInputElement>('.site-ask-form input')?.focus({ preventScroll: true });
      });
    });
  }
  private answer(value: string | null) {
    const a = this.asking;
    if (!a) return;
    this.asking = null;
    this.querySelector<ToDialog>('to-dialog.site-ask')?.close();
    a.done(value);
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
      return html`<figure class="site-doc">${page ? html`<svg viewBox="0 0 ${page.w} ${page.h}" role="img" aria-label=${name}>${unsafeSVG(page.svg)}</svg>` : nothing}<figcaption><b>${name}</b><small>${def?.name ?? b.lang}</small></figcaption></figure>`;
    }
    if (b.k === 'img') return b.url ? html`<img class="site-pic" src=${b.url} alt=${b.alt} referrerpolicy="no-referrer" />` : null;
    if (b.k === 'p' && b.runs.length === 1) {
      const url = plainText(b.runs).trim();
      if (isPicture(url)) return html`<img class="site-pic" src=${url} alt="" referrerpolicy="no-referrer" />`;
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
    const remove = { label: t('Remove'), icon: UI.trash, does: () => this.edit([{ op: 'splice', at, n: 1, blocks: [] }]) };
    if (b.k === 'fence' && b.lang) {
      const link = fenceLink(b.lang, b.body, `${location.origin}${location.pathname}`);
      return [{ label: t('Open in {app}', { app: lookup.appOf(b.lang)?.name ?? b.lang }), icon: UI.open, does: () => void window.open(link, '_blank', 'noopener') }, remove];
    }
    const url = b.k === 'img' ? b.url : isText(b) ? plainText(b.runs).trim() : '';
    return [
      {
        label: t('Change the address…'),
        icon: UI.pen,
        does: async () => {
          const next = (await this.ask(b.k === 'img' ? t('Picture') : t('From the web'), t('Address'), 'https://', url))?.trim();
          if (next) this.edit([{ op: 'splice', at, n: 1, blocks: [b.k === 'img' ? { ...b, url: next } : webBlock(next)] }]);
        },
      },
      remove,
    ];
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    const ic: Partial<Record<Kind, MenuItem['icon']>> = { p: UI.text, picture: UI.image, icon: UI.icon, section: UI.heading, page: UI.heading1, product: UI.table, button: UI.link, link: UI.link, card: UI.list };
    return [
      ...kindsOf(this.view).map((k) => ({ label: kindName(k), icon: ic[k], does: () => void this.add(k) })),
      { label: t('From the web…'), icon: UI.globe, does: () => void this.addWeb() },
      ...(this.view.links ? [] : [{ label: t('A document by link…'), icon: UI.insert, does: () => void this.addDocument() }]),
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
    const x = this.sel ? this.text : null;
    const m = x?.marks ?? {};
    const th = site.theme;
    const a = this.asking;
    const shop = s.shop >= 0;
    return html`<to-bar class="site-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: !!m.b, does: () => this.text?.exec('b') })}
        ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: !!m.i, does: () => this.text?.exec('i') })}
        ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, does: () => this.text?.exec('link') })}
        ${tool({ label: t('Icon'), icon: UI.icon, keep: true, does: () => void this.insertIcon() })}
        <to-menu class="site-look" icon-only .label=${t('Look: {theme}', { theme: `${THEME_NAMES()[th.id] ?? th.id}${isDark(th) ? ' · ' + t('Dark') : ''}` })} .icon=${Palette} .items=${this.lookItems()}></to-menu>
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
      </to-bar>
      <div class="site-body">
        <div class="site-preview">
          <iframe class="site-frame" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title=${t('The website, as it will look')} .srcdoc=${this.shown}></iframe>
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
          <to-text class="site-text" shape="doc" .blocks=${this.blocks()} .card=${this.card} label=${t('The words of {part}', { part: this.partName(s.n) })} placeholder=${s.n === 0 ? t('Your site’s name, then a line about it') : t('Words for this part')} @text-ops=${this.onOps} @text-select=${this.onSelect} @text-embed=${this.onCardTap}></to-text>
          <p class="site-hint to-hint">${site.links ? t('A button is a quote: “Label | https://…”. A small link is a list item: “:icon: Name | https://…”.') : t('A card is a list item: “Heading | a line about it”. A button is a quote: “Label | https://…”.')}</p>
        </section>
      </div>
      <to-menu class="site-cardmenu" .label=${t('This card')} .items=${this.cardItems()}></to-menu>
      <to-dialog class="site-ask" heading=${a?.heading ?? ''} @to-close=${() => this.answer(null)} .body=${a
        ? html`<form class="site-ask-form" @submit=${(e: Event) => (e.preventDefault(), this.answer((e.target as HTMLFormElement).querySelector('input')!.value))}>
            <label class="to-field"><span>${a.label}</span><input type="url" name="answer" .value=${a.value} autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" enterkeyhint="done" required /></label>
            <div class="to-row"><button type="submit" class="to-btn primary">${icon(UI.check, 16)}<span>${t('OK')}</span></button></div>
          </form>`
        : nothing}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToSiteEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-site-editor': ToSiteEditor;
  }
}
