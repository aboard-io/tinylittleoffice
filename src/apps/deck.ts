/**
 * <to-deck>: up to ten slides, each with an optional icon, a headline and bullets.
 * A title slide centres a big headline over a subtitle.
 * Document format: see lib/deckmodel.ts.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, libraryIcon, LIBRARY, UI } from '../lib/icons.ts';
import { MAX_SLIDES, parseDeck, serializeDeck, type Slide } from '../lib/deckmodel.ts';
import { searchIcons, suggestIcons } from '../lib/iconsearch.ts';
import type { SlDialog, SlInput } from '../lib/shoelace.ts';

@customElement('to-deck')
export class ToDeck extends LitElement {
  @property() value = '';
  @state() private slides: Slide[] = parseDeck('');
  @state() private cur = 0;
  @state() private showing = -1;
  @state() private query = '';
  private lastEmitted = '';

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.slides = parseDeck(this.value);
      this.lastEmitted = this.value;
      this.cur = Math.min(this.cur, this.slides.length - 1);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
  }

  private commit(slides: Slide[]) {
    this.slides = slides;
    this.lastEmitted = serializeDeck(slides);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patch(i: number, p: Partial<Slide>) {
    this.commit(this.slides.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private add() {
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, { icon: '', title: '', bullets: [] });
    this.commit(slides);
    this.cur++;
    this.updateComplete.then(() => this.querySelector<HTMLInputElement>('input.title')?.focus());
  }

  private removeSlide() {
    if (this.slides.length <= 1) {
      this.commit([{ icon: '', title: '', bullets: [] }]);
      return;
    }
    const slides = this.slides.filter((_, j) => j !== this.cur);
    this.commit(slides);
    this.cur = Math.min(this.cur, slides.length - 1);
  }

  private move(d: number) {
    const j = this.cur + d;
    if (j < 0 || j >= this.slides.length) return;
    const slides = [...this.slides];
    [slides[this.cur], slides[j]] = [slides[j], slides[this.cur]];
    this.commit(slides);
    this.cur = j;
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.showing < 0) return;
    if (e.key === 'Escape') this.showing = -1;
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') this.step(1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') this.step(-1);
    else return;
    e.preventDefault();
  };

  private step(d: number) {
    const n = this.showing + d;
    if (n < 0) return;
    this.showing = n >= this.slides.length ? -1 : n;
  }

  private picker(): SlDialog | null {
    return this.querySelector<SlDialog>('#icon-picker');
  }

  private openPicker() {
    this.query = '';
    this.picker()?.show();
  }

  private pickIcon(name: string) {
    this.patch(this.cur, { icon: name });
    this.picker()?.hide();
  }

  private onSearchKey(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const first = searchIcons(this.query)[0];
    if (this.query.trim() && first) this.pickIcon(first);
  }

  private pickerButton(name: string, current: string) {
    return html`<button title=${name} aria-label=${name} aria-pressed=${current === name ? 'true' : 'false'} @click=${() => this.pickIcon(name)}>${icon(LIBRARY[name], 22)}</button>`;
  }

  render() {
    const s = this.slides[this.cur];
    const n = this.slides.length;
    const suggested = suggestIcons(s.title, s.bullets);
    const found = searchIcons(this.query);
    return html`
      <div class="to-toolbar">
        <sl-button size="small" @click=${this.add} ?disabled=${n >= MAX_SLIDES}>${icon(UI.plus, 14)} Slide</sl-button>
        <sl-tooltip content="Delete this slide" hoist><sl-button class="icon" size="small" aria-label="Delete slide" @click=${this.removeSlide}>${icon(UI.trash, 14)}<span class="sr-only">Delete slide</span></sl-button></sl-tooltip>
        <sl-button-group label="Reorder">
          <sl-button class="icon" size="small" aria-label="Move slide up" ?disabled=${this.cur === 0} @click=${() => this.move(-1)}>${icon(UI.up, 14)}<span class="sr-only">Move slide up</span></sl-button>
          <sl-button class="icon" size="small" aria-label="Move slide down" ?disabled=${this.cur === n - 1} @click=${() => this.move(1)}>${icon(UI.down, 14)}<span class="sr-only">Move slide down</span></sl-button>
        </sl-button-group>
        <sl-button size="small" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        <sl-tooltip content="Big centred headline with a subtitle" hoist><sl-button size="small" aria-pressed=${s.cover ? 'true' : 'false'} @click=${() => this.patch(this.cur, { cover: !s.cover })}>${icon(UI.h1, 14)} Title slide</sl-button></sl-tooltip>
        <span class="to-spacer"></span>
        <span class="to-hint">${n} / ${MAX_SLIDES}</span>
        <sl-button size="small" variant="primary" @click=${() => (this.showing = 0)}>${icon(UI.play, 14)} Present</sl-button>
      </div>
      <div class="deck-layout">
        <aside class="deck-rail" aria-label="Slides">
          ${this.slides.map(
            (sl, i) => html`<button class="deck-thumb" aria-pressed=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>
              <span class="n">${i + 1}</span>
              ${sl.icon ? libraryIcon(sl.icon, 14) : nothing}
              <span class="t">${sl.title || html`<em>Untitled</em>`}</span>
            </button>`,
          )}
        </aside>
        <div class="deck-editor">
          <div class="deck-slide ${s.cover ? 'cover' : ''}">
            <div class="head">
              <button class="pick ${s.icon ? '' : 'empty'}" title=${s.icon ? 'Change icon' : 'Add an icon'} aria-label="Slide icon" @click=${this.openPicker}>
                ${s.icon ? libraryIcon(s.icon, 32) : html`${icon(UI.smile, 20)}<span>Icon</span>`}
              </button>
              <input class="title" placeholder=${s.cover ? 'Title' : 'Headline'} aria-label="Headline" .value=${s.title} @input=${(e: Event) => this.patch(this.cur, { title: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="bullets">
              <!-- The mirror wraps exactly as the textarea does, so each dot sits on its bullet's first line. -->
              <div class="mirror" aria-hidden="true">${s.bullets.map((b) => html`<div class=${b.trim() ? 'on' : ''}>${b || '\u200b'}</div>`)}</div>
              <textarea
                placeholder=${s.cover ? 'Subtitle' : 'One bullet per line'}
                aria-label="Bullets"
                .value=${s.bullets.join('\n')}
                @input=${(e: Event) => this.patch(this.cur, { bullets: (e.target as HTMLTextAreaElement).value.split('\n') })}
              ></textarea>
            </div>
            ${!s.icon && suggested.length
              ? html`<div class="deck-suggest" role="group" aria-label="Suggested icons">
                  <span>${icon(UI.sparkles, 12)} Suggested</span>
                  ${suggested.slice(0, 4).map(
                    (name) => html`<button title=${`Use ${name}`} aria-label=${`Use ${name} icon`} @click=${() => this.patch(this.cur, { icon: name })}>${icon(LIBRARY[name], 16)}</button>`,
                  )}
                </div>`
              : nothing}
            <span class="num">${this.cur + 1} / ${n}</span>
          </div>
        </div>
      </div>
      <sl-dialog id="icon-picker" label="Icon">
        <sl-input
          class="deck-search"
          size="small"
          type="search"
          placeholder="Search icons"
          aria-label="Search icons"
          autofocus
          clearable
          .value=${this.query}
          @sl-input=${(e: Event) => (this.query = (e.target as SlInput).value)}
          @keydown=${this.onSearchKey}
        ><span slot="prefix">${icon(UI.search, 14)}</span></sl-input>
        ${!this.query.trim() && suggested.length
          ? html`<div class="deck-picker-label">Suggested for this slide</div>
              <div class="deck-picker suggested" role="group" aria-label="Suggested">${suggested.map((name) => this.pickerButton(name, s.icon))}</div>
              <div class="deck-picker-label">All icons</div>`
          : nothing}
        <div class="deck-picker" role="listbox" aria-label="Icon library">${found.map((name) => this.pickerButton(name, s.icon))}</div>
        ${found.length ? nothing : html`<p class="deck-picker-none">No icons match “${this.query.trim()}”.</p>`}
        <sl-button slot="footer" size="small" @click=${() => this.pickIcon('')}>${icon(UI.close, 14)} No icon</sl-button>
      </sl-dialog>
      ${this.showing >= 0 ? this.renderShow() : nothing}
    `;
  }

  private renderShow() {
    const s = this.slides[this.showing];
    const bullets = s.bullets.filter((b) => b.trim() !== '');
    return html`<div class="deck-show" role="dialog" aria-label="Presentation" @click=${() => this.step(1)}>
      <div class="frame ${s.cover ? 'cover' : ''}">
        <div class="head">${LIBRARY[s.icon] ? icon(LIBRARY[s.icon], 96) : nothing}<h1>${s.title}</h1></div>
        ${bullets.length ? (s.cover ? html`<p class="sub">${bullets.map((b) => html`<span>${b}</span>`)}</p>` : html`<ul>${bullets.map((b) => html`<li>${b}</li>`)}</ul>`) : nothing}
      </div>
      <sl-button-group class="ctl" @click=${(e: Event) => e.stopPropagation()}>
        <sl-button class="icon" size="small" ?disabled=${this.showing === 0} aria-label="Previous" @click=${() => this.step(-1)}>${icon(UI.left, 14)}<span class="sr-only">Previous</span></sl-button>
        <sl-button class="icon" size="small" aria-label="Next" @click=${() => this.step(1)}>${icon(UI.right, 14)}<span class="sr-only">Next</span></sl-button>
        <sl-button class="icon" size="small" aria-label="Exit" @click=${() => (this.showing = -1)}>${icon(UI.close, 14)}<span class="sr-only">Exit</span></sl-button>
      </sl-button-group>
      <span class="pos">${this.showing + 1} / ${this.slides.length}</span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-deck': ToDeck;
  }
}
