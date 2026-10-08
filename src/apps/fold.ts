/**
 * The editor for paper that folds, and for pages that tile on a sheet
 * (see lib/fold.ts): a tiny deck. Each page is typed on as a slide is, in
 * the page's own shape, with the rail of pages beside it; Print shows the
 * sheets the pages land on, and how to fold them.
 */
import { defineElement, html, nothing, state, unsafeSVG, tool, btn, icon, libraryIcon, UI, insertOptions, pageSvg } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { PagesElement, blankPage } from './pages.ts';
import { PAGE_LAYOUTS, panelOf, panelText, foldPage, foldSheets, formatOf, isFitted, parseFold, serializeFold, type Folded, type Format, type Panel } from '../lib/fold.ts';

const isBlank = (p: Slide) => !p.icon && !p.title && !p.sub && p.bullets.every((b) => !b.trim());

export class FoldElement extends PagesElement<Folded> {
  static app = '';
  private get f(): Format {
    return formatOf((this.constructor as typeof FoldElement).app)!;
  }
  @state() private sheet = false;

  protected parse(text: string) {
    return parseFold(text, this.f);
  }
  protected serialize(doc: Folded) {
    return serializeFold(doc, this.f);
  }

  protected pages() {
    return this.doc.pages;
  }
  protected savePages(pages: Slide[]) {
    this.commit({ ...this.doc, pages });
  }

  /** What one page is called, for a format that grows a page at a time: a badge, a card, a section. */
  private get noun() {
    return this.f.name(1, 3).replace(/ \d+$/, '').toLowerCase();
  }

  /** A comic page's panels, each a bullet ":icon: what is said | caption". */
  private panelsOf(s: Slide) {
    return s.bullets.filter((b) => b.trim()).map(panelOf);
  }
  private savePanels(rows: Panel[]) {
    this.patch({ bullets: rows.map(panelText) });
  }

  /** A comic's page on the canvas: the headline along the top, then the panels as they will print, each a bubble, a picture and a caption. */
  private panels(s: Slide) {
    const rows = this.panelsOf(s);
    const save = (i: number, change: Partial<(typeof rows)[0]> | null) => this.savePanels(change ? rows.map((r, n) => (n === i ? { ...r, ...change } : r)) : rows.filter((_, n) => n !== i));
    const field = (i: number, key: 'said' | 'caption', label: string) =>
      html`<input class=${key} aria-label="${label}, panel ${i + 1}" placeholder=${label} .value=${rows[i][key]} @input=${(e: Event) => save(i, { [key]: (e.target as HTMLInputElement).value })} />`;
    return html`<div class="head">${this.headline('Headline')}</div>
      <ol class="comic-panels" style="--cols:${rows.length > 3 ? 2 : 1}">
        ${rows.map(
          (r, i) => html`<li>
            ${field(i, 'said', 'What is said')}
            <button class="pick" aria-label="Picture, panel ${i + 1}" data-tip="Choose the picture" @click=${async () => { const name = await chooseIcon({ current: r.glyph }); if (name) save(i, { glyph: name }); }}>${r.glyph ? libraryIcon(r.glyph, 48) : html`${icon(UI.smile, 28)}<span>Picture</span>`}</button>
            ${field(i, 'caption', 'Caption')}
            ${btn(`Remove panel ${i + 1}`, 'close', () => save(i, null))}
          </li>`,
        )}
      </ol>`;
  }

  render() {
    const z = this.doc;
    const f = this.f;
    const n = z.pages.length;
    const by = f.by ?? 4;
    if (this.cur >= n) this.cur = n - 1;
    const s = z.pages[this.cur];
    const name = (i: number) => f.name(i, n);
    const drawn = foldPage(z, this.cur, f);
    const fit = isFitted(drawn) ? drawn : null;
    const panels = f.panels && !fit ? this.panelsOf(s) : null;
    const pic = (p: { w: number; h: number; svg: string }, label: string) => unsafeSVG(pageSvg(p, `role="img" aria-label="${label}"`));
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Pages" @keydown=${this.onPageKey}>
        <sl-button-group label="Pages">
          ${f.grow && by === 1
            ? html`${tool(`Another ${this.noun}`, 'plus', () => this.addPage(), { text: true, disabled: n >= f.grow })}
              ${tool(`Remove this ${this.noun}`, 'trash', () => this.removePage(), { disabled: n <= f.count })}`
            : f.grow
              ? html`${tool('Four more pages', 'plus', () => this.commit({ ...z, pages: [...z.pages, ...Array.from({ length: by }, blankPage)] }), { text: true, disabled: n >= f.grow })}
                ${tool('Four fewer pages', 'trash', () => this.commit({ ...z, pages: z.pages.slice(0, n - by) }), { disabled: n <= f.count || !z.pages.slice(n - by).every(isBlank) })}`
              : nothing}
          ${f.panels ? tool('Add a panel', 'plus', () => this.savePanels([...(panels ?? []), { glyph: 'smile', said: '', caption: '' }]), { text: true, disabled: (panels?.length ?? 0) >= f.panels }) : nothing}
          ${tool('Move page up', 'up', () => this.movePage(-1), { disabled: this.cur === 0 })}
          ${tool('Move page down', 'down', () => this.movePage(1), { disabled: this.cur === n - 1 })}
        </sl-button-group>
        ${panels
          ? nothing
          : html`<sl-select class="sr-label zine-layout" size="small" label="Page type" hoist .value=${fit?.layout ?? s.layout ?? ''} @sl-change=${(e: Event) => this.patch({ layout: ((e.target as SlSelect).value || undefined) as Slide['layout'] })}>
              ${PAGE_LAYOUTS.map((l) => html`<sl-option value=${l.id}>${l.name}</sl-option>`)}
            </sl-select>`}
        <to-insert label="Insert" placeholder="Insert: a poll, a map…" .options=${insertOptions('zine', (a) => !!formatOf(a.id))} @pick=${(e: CustomEvent<string>) => this.insert(e.detail)}></to-insert>
        ${this.textTools()}
        ${panels ? nothing : html`<sl-button size="small" @click=${() => this.pickIcon()}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>`}
        <span class="to-spacer"></span>
        ${f.sides
          ? html`<sl-select class="sr-label zine-sides" size="small" label="Printing" hoist .value=${z.two ? 'two' : 'one'} @sl-change=${(e: Event) => this.commit({ ...z, two: (e.target as SlSelect).value === 'two' })}>
              <sl-option value="one">One-sided: fold and cut</sl-option>
              <sl-option value="two">Two-sided: cut and nest</sl-option>
            </sl-select>`
          : nothing}
        <sl-button-group label="Print">
          ${tool(this.sheet ? 'Back to the pages' : 'See the sheet to print', 'printer', () => (this.sheet = !this.sheet), { text: true, pressed: this.sheet })}
          ${tool('PDF', 'download', () => this.dispatchEvent(new CustomEvent('to-download', { detail: 'pdf', bubbles: true, composed: true })), { text: true, key: 'Mod+P' })}
        </sl-button-group>
      </div>
      ${this.sheet
        ? html`<div class="zine-sheets">
            <p class="to-hint">${f.how(z.two)}</p>
            ${foldSheets(z, f).map((p, i) => html`<div class="zine-sheet">${pic(p, `Sheet, side ${i + 1}`)}</div>`)}
          </div>`
        : html`<div class="deck-layout print" @keydown=${this.onPageKey}>
            ${this.rail(
              'deck',
              'Pages',
              (_, i) => {
                const p = foldPage(z, i, f);
                return html`<span class="n">${name(i).replace(/ cover$/, '').replace(/^[A-Z][a-z]+ (\d+)$/, '$1')}</span><svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>`;
              },
              (p, i) => `${name(i)}${p.title ? ': ' + p.title : ''}`,
            )}
            <div class="deck-editor">
              <div class="deck-page" style=${fit ? `--title:${fit.titlePx};--body:${fit.bodyPx};--pw:${fit.w};--ph:${fit.h};--m:${fit.m}` : `--title:10;--body:8.5;--pw:${drawn.w};--ph:${drawn.h};--m:10`}>
                ${fit
                  ? this.canvas({
                      kind: fit.layout,
                      cls: `print ${fit.layout ? '' : 'prose'} ${fit.cover ? 'cover' : ''}`,
                      style: '',
                      title: this.cur === 0 ? 'Title' : name(this.cur).startsWith('Page') ? 'Headline' : name(this.cur),
                      words: fit.layout === '' ? ['Words', 'What this page says. A new line starts a new paragraph. The type shrinks to fit the page.'] : fit.layout === 't' ? ['Words', 'A line or two under the title'] : ['Words', 'One bullet per line'],
                      pick: () => this.pickIcon(),
                      foot: name(this.cur),
                    })
                  : this.canvas({ kind: '', cls: 'print comic', style: '', pick: () => this.pickIcon(), inner: this.panels(s), foot: name(this.cur) })}
              </div>
            </div>
          </div>`}
    `;
  }
}

/** Register the editor for one folded app. */
export function defineFoldEditor(id: string) {
  defineElement(id, class extends FoldElement {
    static app = id;
  });
}
