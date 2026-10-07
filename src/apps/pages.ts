/**
 * What a deck and a thing that folds have in common: a row of pages, one
 * of them open, with a headline, its words, an icon, and the choice of
 * showing another document instead. Deck (deck.ts) and the folded formats
 * (fold.ts) build on this; each adds what is its own.
 */
import { DocElement, html, state, editRef, makeRef, type TemplateResult } from '../kit.ts';
import type { Slide } from '../lib/deckmodel.ts';
import { chooseIcon, type IconChoice } from '../widgets/icon-picker.ts';
import './write.ts';
import type { ToWrite } from './write.ts';
import '../widgets/insert-box.ts';

export const blankPage = (): Slide => ({ icon: '', title: '', bullets: [] });

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

  /** Another document on the page (a chart is a sheet that asks to be drawn as one), made in its own editor; 'remove' takes it away. */
  protected async insert(what: string) {
    if (what === 'remove') return this.patch({ sub: undefined });
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

  /** The page's icon, from the library. */
  protected async pickIcon(opts: IconChoice = {}) {
    const name = await chooseIcon({ current: this.page.icon, none: true, ...opts });
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
    return html`<to-rich class="title" mode="line" .tools=${false} label=${label} placeholder=${placeholder} .value=${this.page.title} @focusin=${this.onField} @rich-change=${(e: CustomEvent<string>) => this.patch({ title: e.detail })} @rich-enter=${() => this.querySelector<HTMLElement>('to-rich.words .write-page, .bullets .write-page')?.focus()}></to-rich>`;
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
  /** The row of pages to pick from. */
  protected rail(cls: string, label: string, thumb: (p: Slide, i: number) => TemplateResult, name: (p: Slide, i: number) => string, after?: TemplateResult | typeof import('lit').nothing) {
    return html`<nav class="${cls}-rail" aria-label=${label}>
      ${this.pages().map((p, i) => html`<button class="${cls}-thumb" aria-label=${name(p, i)} aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>${thumb(p, i)}</button>`)}
      ${after ?? ''}
    </nav>`;
  }
}
