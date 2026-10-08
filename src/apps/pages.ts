/**
 * What a deck and a thing that folds have in common: a row of pages, one
 * of them open on a canvas its own shape, with an icon, a headline, its
 * words, and the choice of showing another document instead. Deck
 * (deck.ts) and the folded formats (fold.ts) build on this; each adds
 * what is its own.
 */
import { DocElement, html, nothing, state, editRef, makeRef, tool, icon, libraryIcon, UI, LIBRARY, suggestIcons, SELF, type TemplateResult } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon, type IconChoice } from '../widgets/icon-picker.ts';
import './write.ts';
import type { ToWrite } from './write.ts';
import '../widgets/insert-box.ts';

export const blankPage = (): Slide => ({ icon: '', title: '', bullets: [] });

/** How the canvas shows a page. */
export interface Canvas {
  /** The page's layout: '' or 'b' bullets, 't' title, '2' two columns, 'i' big icon. */
  kind: string;
  /** Classes of its own: `prose` for paragraphs without dots, `cover` to centre everything. */
  cls?: string;
  /** The sizes, as CSS custom properties (--title, --body, and for a page --pw, --ph, --m). */
  style: string;
  /** The headline's placeholder. */
  title?: string;
  /** The words' label and placeholder. */
  words?: [string, string];
  /** Opens the icon picker. */
  pick: () => void;
  /** What the icon button is called to a screen reader. */
  iconLabel?: string;
  /** Drawn in place of the icon, headline and words (a comic's panels). */
  inner?: TemplateResult;
  /** The small print at the foot: a number, a name. */
  foot?: TemplateResult | string;
}

export abstract class PagesElement<D> extends DocElement<D> {
  /** The page open for editing. */
  @state() protected cur = 0;
  /** The box last typed in: what text buttons work on. */
  protected field: ToWrite | null = null;
  protected onField = (e: Event) => (this.field = e.currentTarget as ToWrite);

  protected abstract pages(): Slide[];
  protected abstract savePages(pages: Slide[]): void;

  protected get page(): Slide {
    return this.pages()[Math.min(this.cur, this.pages().length - 1)];
  }
  protected patch(change: Partial<Slide>, i = this.cur) {
    this.savePages(this.pages().map((p, n) => (n === i ? { ...p, ...change } : p)));
  }

  /** A new page after this one, opened with the cursor in its headline. */
  protected addPage(page: Slide = blankPage()) {
    const pages = [...this.pages()];
    pages.splice(this.cur + 1, 0, page);
    this.savePages(pages);
    this.cur++;
    this.updateComplete.then(() => this.querySelector<HTMLElement>('to-rich.title .write-page')?.focus());
  }
  /** This page goes; the last one is emptied rather than taken away. */
  protected removePage() {
    if (this.pages().length <= 1) return this.savePages([blankPage()]);
    const pages = this.pages().filter((_, j) => j !== this.cur);
    this.savePages(pages);
    this.cur = Math.min(this.cur, pages.length - 1);
  }
  /** This page swaps with the one before (-1) or after (1). */
  protected movePage(d: number) {
    const j = this.cur + d;
    if (j < 0 || j >= this.pages().length) return;
    const pages = [...this.pages()];
    [pages[this.cur], pages[j]] = [pages[j], pages[this.cur]];
    this.savePages(pages);
    this.cur = j;
  }

  /** Another document on the page (a chart is a sheet that asks to be drawn as one), made in its own editor; 'remove' takes it away. */
  protected async insert(what: string) {
    if (what === 'remove') return this.patch({ sub: undefined });
    if (what === 'qr-self') return this.patch({ sub: SELF });
    const at = this.cur;
    const ref = what === 'chart' ? makeRef('sheet', '!bar') : makeRef(what, '');
    this.patch({ sub: ref }, at);
    const made = await editRef(ref);
    this.cur = at;
    this.patch({ sub: made }, at);
  }
  protected async editSub() {
    const at = this.cur;
    const ref = this.pages()[at].sub;
    if (!ref) return;
    const made = await editRef(ref);
    this.cur = at;
    this.patch({ sub: made }, at);
  }

  /** The page's icon, from the library, its own words suggesting. */
  protected async pickIcon(opts: IconChoice = {}) {
    const name = await chooseIcon({ current: this.page.icon, none: true, suggested: suggestIcons(this.page.title, this.page.bullets), ...opts });
    if (name !== null) this.patch({ icon: name });
  }

  /** Alt+Up and Alt+Down move between pages. */
  protected onPageKey = (e: KeyboardEvent) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    this.cur = Math.max(0, Math.min(this.pages().length - 1, this.cur + (e.key === 'ArrowDown' ? 1 : -1)));
  };

  /** The headline, one rich line; Enter moves on to the words. */
  protected headline(placeholder: string, label = 'Headline') {
    return html`<to-rich class="title" mode="line" .tools=${false} label=${label} placeholder=${placeholder} .value=${this.page.title} @focusin=${this.onField} @rich-change=${(e: CustomEvent<string>) => this.patch({ title: e.detail })} @rich-enter=${() => this.querySelector<HTMLElement>('to-rich.words .write-page, .bullets .write-page, .comic-panels input')?.focus()}></to-rich>`;
  }
  /** A column of words: one rich box, a line a bullet (or a paragraph). */
  protected words(label: string, list: string[], placeholder: string, save: (list: string[]) => void) {
    return html`<div class="bullets"><to-rich class="words" mode="lines" .tools=${false} label=${label} placeholder=${placeholder} .value=${list.join('\n')} @focusin=${this.onField} @rich-change=${(e: CustomEvent<string>) => save(e.detail.split('\n'))}></to-rich></div>`;
  }
  /** The other document on the page, with its buttons, when there is one. */
  protected embed() {
    const s = this.page;
    return s.sub ? html`<to-embed ref=${s.sub} controls @embed-edit=${this.editSub} @embed-remove=${() => this.patch({ sub: undefined })}></to-embed>` : null;
  }
  /** The text buttons: marks, the bullet's depth, an icon among the words; they work on the box last typed in. */
  protected textTools() {
    return html`<sl-button-group label="Text">
      ${tool('Bold', 'bold', () => this.field?.exec('bold'))}${tool('Italic', 'italic', () => this.field?.exec('italic'))}${tool('Underline', 'underline', () => this.field?.exec('underline'))}${tool('Strike', 'strike', () => this.field?.exec('strikeThrough'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}
      ${tool('Bring the bullet out', 'outdent', () => this.field?.shift(-1))}${tool('Indent the bullet', 'indent', () => this.field?.shift(1))}
      ${tool('Icon in text', 'smile', () => void this.field?.insertIcon())}
    </sl-button-group>`;
  }

  /**
   * The page as a canvas to type on, in its own shape: the icon, the
   * headline and the words where they will be, the type the size it will
   * be. A page given to another document shows that instead.
   */
  protected canvas(c: Canvas) {
    const s = this.page;
    const suggested = suggestIcons(s.title, s.bullets);
    const [wordsLabel, wordsHint] = c.words ?? ['Bullets', c.kind === 't' ? 'Subtitle' : 'One bullet per line'];
    return html`<div class="deck-slide lay-${c.kind || 'b'} ${s.sub ? 'has-sub' : ''} ${c.cls ?? ''}" style=${c.style}>
      ${s.sub
        ? this.embed()
        : (c.inner ??
          html`<div class="head">
              <button class="pick ${s.icon ? '' : 'empty'}" data-tip=${s.icon ? 'Change icon' : 'Add an icon'} aria-label=${c.iconLabel ?? 'Page icon'} @click=${c.pick}>
                ${s.icon ? libraryIcon(s.icon, 32) : html`${icon(UI.smile, 20)}<span>Icon</span>`}
              </button>
              ${this.headline(c.title ?? (c.kind === 't' ? 'Title' : 'Headline'))}
            </div>
            <div class="body">
              ${this.words(wordsLabel, s.bullets, wordsHint, (bullets) => this.patch({ bullets }))}
              ${c.kind === '2'
                ? this.words('Right column', s.right ?? [], 'One bullet per line', (right) => this.patch({ right }))
                : c.kind === 'i'
                  ? html`<button class="big ${s.icon ? '' : 'empty'}" aria-label="Big icon" @click=${c.pick}>${s.icon ? libraryIcon(s.icon, 120) : html`${icon(UI.smile, 40)}<span>Pick an icon</span>`}</button>`
                  : nothing}
            </div>`)}
      ${!s.icon && !s.sub && !c.inner && suggested.length
        ? html`<div class="deck-suggest" role="group" aria-label="Suggested icons">
            <span>${icon(UI.sparkles, 12)} Suggested</span>
            ${suggested.slice(0, 4).map((name) => html`<button data-tip=${`Use ${name}`} aria-label=${`Use ${name} icon`} @click=${() => this.patch({ icon: name })}>${icon(LIBRARY[name], 16)}</button>`)}
          </div>`
        : nothing}
      ${c.foot ? html`<span class="num">${c.foot}</span>` : nothing}
    </div>`;
  }
  /** The row of pages to pick from. */
  protected rail(cls: string, label: string, thumb: (p: Slide, i: number) => TemplateResult, name: (p: Slide, i: number) => string, after?: TemplateResult | typeof nothing) {
    return html`<nav class="${cls}-rail" aria-label=${label}>
      ${this.pages().map((p, i) => html`<button class="${cls}-thumb" aria-label=${name(p, i)} aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>${thumb(p, i)}</button>`)}
      ${after ?? ''}
    </nav>`;
  }
}
