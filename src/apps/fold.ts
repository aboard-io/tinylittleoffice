/**
 * The editor for paper that folds (see lib/fold.ts): its pages to fill in,
 * each shown as it will print, and the sheets to print.
 */
import { defineElement, html, nothing, state, unsafeSVG, tool, icon, libraryIcon, UI, insertOptions, pageSvg } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { PagesElement, blankPage } from './pages.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { PAGE_LAYOUTS, foldPage, foldSheets, formatOf, parseFold, serializeFold, type Folded, type Format } from '../lib/fold.ts';

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

  /** A comic's page: a row for each panel, with its picture, what is said, and its caption. */
  private panels(s: Slide, max: number) {
    const rows = s.bullets.filter((b) => b.trim()).map((b) => {
      const [glyph, words] = iconOf(b);
      const [said = '', caption = ''] = words.split('|').map((p) => p.trim());
      return { glyph, said, caption };
    });
    const save = (i: number, change: Partial<(typeof rows)[0]> | null) => {
      const next = change ? rows.map((r, n) => (n === i ? { ...r, ...change } : r)) : rows.filter((_, n) => n !== i);
      this.patch({ bullets: next.map((r) => `${r.glyph ? `:${r.glyph} ` : ''}${r.said.replace(/\|/g, '/')}${r.caption ? ` | ${r.caption.replace(/\|/g, '/')}` : ''}` || ' ') });
    };
    const field = (i: number, key: 'said' | 'caption', label: string) =>
      html`<input aria-label="${label}, panel ${i + 1}" placeholder=${label} .value=${rows[i][key]} @input=${(e: Event) => save(i, { [key]: (e.target as HTMLInputElement).value })} />`;
    return html`<ol class="zine-panels">
        ${rows.map(
          (r, i) => html`<li>
            <button class="pick" aria-label="Picture, panel ${i + 1}" data-tip="Choose the picture" @click=${async () => { const name = await chooseIcon(); if (name) save(i, { glyph: name }); }}>${r.glyph ? libraryIcon(r.glyph, 26) : icon(UI.smile, 20)}</button>
            ${field(i, 'said', 'What is said')} ${field(i, 'caption', 'Caption')}
            ${tool(`Remove panel ${i + 1}`, 'close', () => save(i, null))}
          </li>`,
        )}
      </ol>
      <sl-button size="small" ?disabled=${rows.length >= max} @click=${() => this.patch({ bullets: [...s.bullets.filter((b) => b.trim()), ':smile'] })}>${icon(UI.plus, 14)} Add a panel</sl-button>
      <p class="to-hint">${rows.length ? `Up to ${max} panels a page.` : 'A page with no panels is a title page.'}</p>`;
  }

  render() {
    const z = this.doc;
    const f = this.f;
    const n = z.pages.length;
    const by = f.by ?? 4;
    if (this.cur >= n) this.cur = n - 1;
    const s = z.pages[this.cur];
    const blank = (p: Slide) => !p.icon && !p.title && !p.sub && p.bullets.every((b) => !b.trim());
    const pic = (p: { w: number; h: number; svg: string }, label: string) => unsafeSVG(pageSvg(p, `role="img" aria-label="${label}"`));
    return html`
      <div class="to-toolbar" @keydown=${this.onPageKey}>
        ${f.template && z.pages.every(blank) ? tool('Start from the template', 'sparkles', () => this.commit(parseFold(f.template!, f)), { text: true }) : nothing}
${f.sides ? html`        <sl-select class="sr-label zine-sides" size="small" label="Printing" hoist .value=${z.two ? 'two' : 'one'} @sl-change=${(e: Event) => this.commit({ ...z, two: (e.target as SlSelect).value === 'two' })}>
          <sl-option value="one">One-sided: fold and cut</sl-option>
          <sl-option value="two">Two-sided: cut and nest</sl-option>
        </sl-select>` : nothing}
        ${f.panels ? nothing : html`<sl-button size="small" @click=${() => this.pickIcon()}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>`}
        <to-insert label="Insert" placeholder="Insert: a poll, a map…" .options=${insertOptions('zine', (a) => !!formatOf(a.id))} @pick=${(e: CustomEvent<string>) => this.insert(e.detail)}></to-insert>
        ${f.grow
          ? html`<sl-button-group label="Pages">
              ${tool(by === 1 ? `Another ${f.name(n, n + 1).replace(/ \d+$/, '').toLowerCase()}` : 'Four more pages', 'plus', () => this.commit({ ...z, pages: [...z.pages, ...Array.from({ length: by }, blankPage)] }), { text: true, disabled: n >= f.grow })}
              ${tool(by === 1 ? 'Remove the last' : 'Four fewer pages', 'trash', () => this.commit({ ...z, pages: z.pages.slice(0, n - by) }), { disabled: n <= f.count || !z.pages.slice(n - by).every(blank) })}
            </sl-button-group>`
          : nothing}
        <sl-select class="sr-label zine-layout" size="small" label="Page type" hoist .value=${s.layout ?? ''} @sl-change=${(e: Event) => this.patch({ layout: ((e.target as SlSelect).value || undefined) as Slide['layout'] })}>
          ${PAGE_LAYOUTS.map((l) => html`<sl-option value=${l.id}>${l.name}</sl-option>`)}
        </sl-select>
        <span class="to-spacer"></span>
        ${tool(this.sheet ? 'Back to the pages' : 'See the sheet to print', 'printer', () => (this.sheet = !this.sheet), { text: true, pressed: this.sheet })}
      </div>
      ${this.sheet
        ? html`<div class="zine-sheets">
            <p class="to-hint">
              ${f.how(z.two)}
            </p>
            ${foldSheets(z, f).map((p, i) => html`<div class="zine-sheet">${pic(p, `Sheet, side ${i + 1}`)}</div>`)}
          </div>`
        : html`<div class="zine" @keydown=${this.onPageKey}>
            ${this.rail('zine', 'Pages', (_, i) => html`${unsafeSVG(pageSvg(foldPage(z, i, f), 'aria-hidden="true"'))}<span>${f.name(i, n).replace(/ cover$|^Page /, '')}</span>`, (p, i) => `${f.name(i, n)}${p.title ? ': ' + p.title : ''}`)}
            <div class="zine-edit">
              <h2>${f.name(this.cur, n)}</h2>
              ${this.embed() ??
              html`${this.headline(this.cur === 0 ? 'Title' : f.name(this.cur, n).startsWith('Page') ? 'Headline' : f.name(this.cur, n))}
                ${f.panels ? this.panels(s, f.panels) : this.words('Words', s.bullets, s.layout === 'b' || s.layout === '2' || s.layout === 'i' ? 'One bullet per line' : 'What this page says. A new line starts a new paragraph. The type shrinks to fit the page.', (bullets) => this.patch({ bullets }))}
                ${s.layout === '2' ? this.words('Right column', s.right ?? [], 'One bullet per line', (right) => this.patch({ right })) : nothing}`}
            </div>
            <div class="zine-page">${pic(foldPage(z, this.cur, f), `${f.name(this.cur, n)}, as it will print`)}</div>
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
