/**
 * The editor for paper that folds (see lib/fold.ts): its pages to fill in,
 * each shown as it will print, and the sheets to print.
 */
import { DocElement, defineElement, html, nothing, state, unsafeSVG, tool, icon, libraryIcon, UI, editRef, insertMenu, makeRef, pageSvg } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { foldPage, foldSheets, formatOf, parseFold, serializeFold, type Folded, type Format } from '../lib/fold.ts';

export class FoldElement extends DocElement<Folded> {
  static app = '';
  private get f(): Format {
    return formatOf((this.constructor as typeof FoldElement).app)!;
  }
  @state() private cur = 0;
  @state() private sheet = false;

  protected parse(text: string) {
    return parseFold(text, this.f);
  }
  protected serialize(doc: Folded) {
    return serializeFold(doc, this.f);
  }

  private patch(change: Partial<Slide>) {
    this.commit({ ...this.doc, pages: this.doc.pages.map((p, i) => (i === this.cur ? { ...p, ...change } : p)) });
  }

  private async pickIcon() {
    const name = await chooseIcon();
    if (name) this.patch({ icon: name });
  }

  private async insert(what: string) {
    const at = this.cur;
    const ref = what === 'chart' ? makeRef('sheet', '!bar') : makeRef(what, '');
    this.patch({ sub: ref });
    const made = await editRef(ref);
    this.cur = at;
    this.patch({ sub: made });
  }

  private async editSub() {
    const at = this.cur;
    const made = await editRef(this.doc.pages[at].sub!);
    this.cur = at;
    this.patch({ sub: made });
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
            <button class="pick" aria-label="Picture, panel ${i + 1}" title="Choose the picture" @click=${async () => { const name = await chooseIcon(); if (name) save(i, { glyph: name }); }}>${r.glyph ? libraryIcon(r.glyph, 26) : icon(UI.smile, 20)}</button>
            ${field(i, 'said', 'What is said')} ${field(i, 'caption', 'Caption')}
            ${tool(`Remove panel ${i + 1}`, 'close', () => save(i, null))}
          </li>`,
        )}
      </ol>
      <sl-button size="small" ?disabled=${rows.length >= max} @click=${() => this.patch({ bullets: [...s.bullets.filter((b) => b.trim()), ':smile'] })}>${icon(UI.plus, 14)} Add a panel</sl-button>
      <p class="to-hint">${rows.length ? `Up to ${max} panels a page.` : 'A page with no panels is a title page.'}</p>`;
  }

  private onKey(e: KeyboardEvent) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    this.cur = Math.max(0, Math.min(this.doc.pages.length - 1, this.cur + (e.key === 'ArrowDown' ? 1 : -1)));
  }

  render() {
    const z = this.doc;
    const f = this.f;
    const n = z.pages.length;
    if (this.cur >= n) this.cur = n - 1;
    const s = z.pages[this.cur];
    const blank = (p: Slide) => !p.icon && !p.title && !p.sub && p.bullets.every((b) => !b.trim());
    const pic = (p: { w: number; h: number; svg: string }, label: string) => unsafeSVG(pageSvg(p, `role="img" aria-label="${label}"`));
    return html`
      <div class="to-toolbar" @keydown=${this.onKey}>
${f.sides ? html`        <sl-select class="sr-label zine-sides" size="small" label="Printing" hoist .value=${z.two ? 'two' : 'one'} @sl-change=${(e: Event) => this.commit({ ...z, two: (e.target as SlSelect).value === 'two' })}>
          <sl-option value="one">One-sided: fold and cut</sl-option>
          <sl-option value="two">Two-sided: cut and nest</sl-option>
        </sl-select>` : nothing}
        ${f.panels ? nothing : html`<sl-button size="small" @click=${this.pickIcon}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>`}
        ${s.icon ? tool('Remove the icon', 'close', () => this.patch({ icon: '' })) : nothing}
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => this.insert(e.detail.item.value)}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.plus, 14)} Insert</sl-button>
          <sl-menu>
            ${insertMenu('zine', (a) => !!formatOf(a.id))}
          </sl-menu>
        </sl-dropdown>
        ${f.grow
          ? html`<sl-button-group label="Pages">
              ${tool('Four more pages', 'plus', () => this.commit({ ...z, pages: [...z.pages, ...Array.from({ length: 4 }, () => ({ icon: '', title: '', bullets: [] }))] }), { text: true, disabled: n >= f.grow })}
              ${tool('Four fewer pages', 'trash', () => this.commit({ ...z, pages: z.pages.slice(0, n - 4) }), { disabled: n <= f.count || !z.pages.slice(n - 4).every(blank) })}
            </sl-button-group>`
          : nothing}
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
        : html`<div class="zine" @keydown=${this.onKey}>
            <nav class="zine-rail" aria-label="Pages">
              ${z.pages.map(
                (p, i) => html`<button class="zine-thumb" aria-label="${f.name(i, n)}${p.title ? ': ' + p.title : ''}" aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>
                  ${unsafeSVG(pageSvg(foldPage(z, i, f), 'aria-hidden="true"'))}<span>${f.name(i, n).replace(/ cover$|^Page /, '')}</span>
                </button>`,
              )}
            </nav>
            <div class="zine-edit">
              <h2>${f.name(this.cur, n)}</h2>
              ${s.sub
                ? html`<to-embed ref=${s.sub} controls @embed-edit=${this.editSub} @embed-remove=${() => this.patch({ sub: undefined })}></to-embed>`
                : html`<input class="title" aria-label="Headline" placeholder=${this.cur === 0 ? 'Title' : f.name(this.cur, n).startsWith('Page') ? 'Headline' : f.name(this.cur, n)} .value=${s.title} @input=${(e: Event) => this.patch({ title: (e.target as HTMLInputElement).value })} @keydown=${(e: KeyboardEvent) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                this.querySelector<HTMLTextAreaElement>('.zine-edit textarea')?.focus();
              }} />
${f.panels ? this.panels(s, f.panels) : html`              <textarea aria-label="Words" placeholder="What this page says. A new line starts a new paragraph. The type shrinks to fit the page." .value=${s.bullets.join('\n')} @input=${(e: Event) => this.patch({ bullets: (e.target as HTMLTextAreaElement).value.split('\n') })}></textarea>`}`}
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
