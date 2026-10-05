/**
 * <to-zine>: eight pages to fill in, each shown as it will print.
 * Layout, the print sheets and the reader: zine.def.ts.
 */
import { DocElement, defineElement, html, nothing, state, unsafeSVG, tool, icon, libraryIcon, UI, editRef, embeddable, makeRef, pageSvg } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { PAGES, pageName, parseZine, serializeZine, sheets, zinePage, type Zine } from './zine.def.ts';

class ToZine extends DocElement<Zine> {
  @state() private cur = 0;
  @state() private sheet = false;

  protected parse(text: string) {
    return parseZine(text);
  }
  protected serialize(doc: Zine) {
    return serializeZine(doc);
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

  private onKey(e: KeyboardEvent) {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    this.cur = Math.max(0, Math.min(PAGES - 1, this.cur + (e.key === 'ArrowDown' ? 1 : -1)));
  }

  render() {
    const z = this.doc;
    const s = z.pages[this.cur];
    const pic = (p: { w: number; h: number; svg: string }, label: string) => unsafeSVG(pageSvg(p, `role="img" aria-label="${label}"`));
    return html`
      <div class="to-toolbar" @keydown=${this.onKey}>
        <sl-select class="sr-label zine-sides" size="small" label="Printing" hoist .value=${z.two ? 'two' : 'one'} @sl-change=${(e: Event) => this.commit({ ...z, two: (e.target as SlSelect).value === 'two' })}>
          <sl-option value="one">One-sided: fold and cut</sl-option>
          <sl-option value="two">Two-sided: cut and nest</sl-option>
        </sl-select>
        <sl-button size="small" @click=${this.pickIcon}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        ${s.icon ? tool('Remove the icon', 'close', () => this.patch({ icon: '' })) : nothing}
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => this.insert(e.detail.item.value)}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.plus, 14)} Insert</sl-button>
          <sl-menu>
            ${embeddable('zine').filter((a) => a.id !== 'zine').map((a) => html`<sl-menu-item value=${a.id}>${icon(UI[a.icon as keyof typeof UI], 14, 'pre')} ${a.name}</sl-menu-item>`)}
          </sl-menu>
        </sl-dropdown>
        <span class="to-spacer"></span>
        ${tool(this.sheet ? 'Back to the pages' : 'See the sheet to print', 'printer', () => (this.sheet = !this.sheet), { text: true, pressed: this.sheet })}
      </div>
      ${this.sheet
        ? html`<div class="zine-sheets">
            <p class="to-hint">
              ${z.two
                ? 'Download the PDF and print it double-sided on letter paper, flipping on the long edge, at actual size. Cut along the dashes, lay the top half over the bottom half, and fold them together down the middle.'
                : 'Download the PDF and print it on one side of letter paper, at actual size. Fold it in half the long way, then into quarters; cut the dashes in the middle; push the ends together and fold it into a book.'}
            </p>
            ${sheets(z).map((p, i) => html`<div class="zine-sheet">${pic(p, `Sheet, side ${i + 1}`)}</div>`)}
          </div>`
        : html`<div class="zine" @keydown=${this.onKey}>
            <nav class="zine-rail" aria-label="Pages">
              ${z.pages.map(
                (p, i) => html`<button class="zine-thumb" aria-label="${pageName(i)}${p.title ? ': ' + p.title : ''}" aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>
                  ${unsafeSVG(pageSvg(zinePage(p, i, z.two), 'aria-hidden="true"'))}<span>${i === 0 ? 'Front' : i === PAGES - 1 ? 'Back' : i + 1}</span>
                </button>`,
              )}
            </nav>
            <div class="zine-edit">
              <h2>${pageName(this.cur)}</h2>
              <input class="title" aria-label="Headline" placeholder=${this.cur === 0 ? 'Title of the zine' : 'Headline'} .value=${s.title} @input=${(e: Event) => this.patch({ title: (e.target as HTMLInputElement).value })} @keydown=${(e: KeyboardEvent) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                this.querySelector<HTMLTextAreaElement>('.zine-edit textarea')?.focus();
              }} />
              <textarea aria-label="Words" placeholder="What this page says. A new line starts a new paragraph. The type shrinks to fit the page." .value=${s.bullets.join('\n')} @input=${(e: Event) => this.patch({ bullets: (e.target as HTMLTextAreaElement).value.split('\n') })}></textarea>
              ${s.sub ? html`<to-embed ref=${s.sub} controls @embed-edit=${this.editSub} @embed-remove=${() => this.patch({ sub: undefined })}></to-embed>` : nothing}
            </div>
            <div class="zine-page">${pic(zinePage(s, this.cur, z.two), `${pageName(this.cur)}, as it will print`)}</div>
          </div>`}
    `;
  }
}
defineElement('zine', ToZine);
