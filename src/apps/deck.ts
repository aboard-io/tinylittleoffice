/**
 * <to-deck>: up to ten slides, each with an optional icon, a headline and bullets.
 * Document format: slides separated by a blank line. Within a slide, an
 * optional ":icon-name" line, then the headline, then one bullet per line.
 */
import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { retro } from '../lib/styles.ts';
import { icon, libraryIcon, LIBRARY, LIBRARY_NAMES, UI } from '../lib/icons.ts';
import { MAX_SLIDES, parseDeck, serializeDeck, type Slide } from '../lib/deckmodel.ts';


@customElement('to-deck')
export class ToDeck extends LitElement {
  static styles = [
    retro,
    css`
      .layout {
        display: grid;
        grid-template-columns: 150px 1fr;
        min-height: 440px;
      }
      @media (max-width: 640px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      .rail {
        border-right: 1px solid var(--ink);
        background: var(--paper-dim);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .thumb {
        display: flex;
        gap: 6px;
        align-items: center;
        width: 100%;
        text-align: left;
        padding: 4px 6px;
        overflow: hidden;
        min-height: 36px;
        justify-content: flex-start;
      }
      .thumb .n {
        font-size: 10px;
        opacity: 0.7;
        width: 14px;
      }
      .thumb .t {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        font-size: 12px;
      }
      .rail .actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .editor {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .slide {
        border: 1px solid var(--ink);
        box-shadow: 2px 2px 0 var(--ink);
        aspect-ratio: 16 / 10;
        padding: 24px 28px;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 12px;
        background: var(--paper);
        position: relative;
      }
      .slide .head {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .slide .pick {
        width: 56px;
        height: 56px;
        padding: 0;
        flex-shrink: 0;
      }
      .slide .pick.empty {
        border-style: dashed;
        box-shadow: none;
      }
      .slide input.title {
        flex: 1;
        font-size: 26px;
        font-weight: bold;
        border: 0;
        border-bottom: 1px dashed transparent;
        padding: 4px 0;
        min-width: 0;
      }
      .slide input.title:hover,
      .slide textarea:hover {
        border-color: var(--ink);
      }
      .slide .bullets {
        display: flex;
        gap: 0;
        align-items: flex-start;
        min-height: 0;
      }
      .slide .dots {
        width: 1.4em;
        flex-shrink: 0;
        font-size: 17px;
        line-height: 1.5;
        text-align: center;
        user-select: none;
      }
      .slide .dots span {
        display: block;
      }
      .slide textarea {
        flex: 1;
        border: 0;
        border-bottom: 1px dashed transparent;
        resize: none;
        font-size: 17px;
        line-height: 1.5;
        padding: 0;
        min-height: 0;
        overflow: hidden;
      }
      .slide .num {
        position: absolute;
        right: 12px;
        bottom: 8px;
        font-size: 11px;
        opacity: 0.6;
      }
      .picker {
        border: 1px solid var(--ink);
        box-shadow: 2px 2px 0 var(--ink);
        background: var(--paper);
        padding: 8px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
        gap: 4px;
        max-height: 200px;
        overflow: auto;
      }
      .picker button {
        padding: 6px;
        justify-content: center;
      }
      .picker .none {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
      /* Presentation mode */
      .show {
        position: fixed;
        inset: 0;
        background: var(--paper);
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .show .frame {
        width: min(100vw, 160vh);
        aspect-ratio: 16 / 10;
        padding: 6vmin 8vmin;
        display: flex;
        flex-direction: column;
        gap: 4vmin;
        box-sizing: border-box;
      }
      .show .head {
        display: flex;
        align-items: center;
        gap: 3vmin;
      }
      .show h1 {
        font-size: 7vmin;
        margin: 0;
        line-height: 1.1;
      }
      .show ul {
        font-size: 4vmin;
        line-height: 1.5;
        margin: 0;
        padding-left: 1.2em;
      }
      .show .ctl {
        position: fixed;
        right: 12px;
        top: 12px;
        display: flex;
        gap: 4px;
      }
      .show .pos {
        position: fixed;
        left: 12px;
        bottom: 10px;
        font-size: 12px;
        opacity: 0.6;
      }
    `,
  ];

  @property() value = '';
  @state() private slides: Slide[] = parseDeck('');
  @state() private cur = 0;
  @state() private picking = false;
  @state() private showing = -1;
  private lastEmitted = '';

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
    const slides = this.slides.map((s, j) => (j === i ? { ...s, ...p } : s));
    this.commit(slides);
  }

  private add() {
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, { icon: '', title: '', bullets: [] });
    this.commit(slides);
    this.cur++;
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLInputElement>('input.title')?.focus());
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
    if (n >= this.slides.length) {
      this.showing = -1;
      return;
    }
    this.showing = n;
  }

  render() {
    const s = this.slides[this.cur];
    const n = this.slides.length;
    return html`
      <div class="toolbar">
        <button @click=${this.add} ?disabled=${n >= MAX_SLIDES} title="Insert a slide after this one">${icon(UI.plus, 14)} Slide</button>
        <button @click=${this.removeSlide} title="Delete this slide">${icon(UI.trash, 14)}</button>
        <span class="sep"></span>
        <button class="icon" @click=${() => this.move(-1)} ?disabled=${this.cur === 0} title="Move slide up">${icon(UI.up, 14)}</button>
        <button class="icon" @click=${() => this.move(1)} ?disabled=${this.cur === n - 1} title="Move slide down">${icon(UI.down, 14)}</button>
        <span class="spacer"></span>
        <span class="hint">${n} / ${MAX_SLIDES} slides</span>
        <button @click=${() => (this.showing = 0)} title="Present from the first slide">${icon(UI.play, 14)} Present</button>
      </div>
      <div class="layout">
        <aside class="rail" aria-label="Slides">
          ${this.slides.map(
            (sl, i) => html`<button
              class="thumb"
              aria-pressed=${i === this.cur ? 'true' : 'false'}
              @click=${() => {
                this.cur = i;
                this.picking = false;
              }}
            >
              <span class="n">${i + 1}</span>
              ${sl.icon ? libraryIcon(sl.icon, 14) : nothing}
              <span class="t">${sl.title || html`<em>Untitled</em>`}</span>
            </button>`,
          )}
        </aside>
        <div class="editor">
          <div class="slide">
            <div class="head">
              <button
                class="pick ${s.icon ? '' : 'empty'}"
                title=${s.icon ? 'Change icon' : 'Add an icon'}
                aria-label="Slide icon"
                aria-expanded=${this.picking ? 'true' : 'false'}
                @click=${() => (this.picking = !this.picking)}
              >
                ${s.icon ? libraryIcon(s.icon, 36) : icon(UI.plus, 18)}
              </button>
              <input
                class="title"
                placeholder="Headline"
                aria-label="Headline"
                .value=${s.title}
                @input=${(e: Event) => this.patch(this.cur, { title: (e.target as HTMLInputElement).value })}
              />
            </div>
            <div class="bullets">
              <div class="dots" aria-hidden="true">${s.bullets.map((b) => html`<span>${b.trim() ? '•' : ' '}</span>`)}</div>
              <textarea
                placeholder="One bullet per line"
                aria-label="Bullets"
                rows=${Math.max(3, s.bullets.length + 1)}
                .value=${s.bullets.join('\n')}
                @input=${(e: Event) => this.patch(this.cur, { bullets: (e.target as HTMLTextAreaElement).value.split('\n') })}
              ></textarea>
            </div>
            <span class="num">${this.cur + 1} / ${n}</span>
          </div>
          ${this.picking ? this.renderPicker() : nothing}
        </div>
      </div>
      ${this.showing >= 0 ? this.renderShow() : nothing}
    `;
  }

  private renderPicker() {
    return html`<div class="picker" role="listbox" aria-label="Icon library">
      <button class="none" @click=${() => this.pickIcon('')}>${icon(UI.close, 14)} No icon</button>
      ${LIBRARY_NAMES.map(
        (name) => html`<button title=${name} aria-label=${name} aria-pressed=${this.slides[this.cur].icon === name ? 'true' : 'false'} @click=${() => this.pickIcon(name)}>
          ${icon(LIBRARY[name], 20)}
        </button>`,
      )}
    </div>`;
  }

  private pickIcon(name: string) {
    this.patch(this.cur, { icon: name });
    this.picking = false;
  }

  private renderShow() {
    const s = this.slides[this.showing];
    const bullets = s.bullets.filter((b) => b.trim() !== '');
    return html`<div class="show" role="dialog" aria-label="Presentation" @click=${() => this.step(1)}>
      <div class="frame">
        <div class="head">
          ${LIBRARY[s.icon] ? icon(LIBRARY[s.icon], 96) : nothing}
          <h1>${s.title}</h1>
        </div>
        ${bullets.length ? html`<ul>${bullets.map((b) => html`<li>${b}</li>`)}</ul>` : nothing}
      </div>
      <div class="ctl" @click=${(e: Event) => e.stopPropagation()}>
        <button class="icon" @click=${() => this.step(-1)} ?disabled=${this.showing === 0} aria-label="Previous">${icon(UI.left, 14)}</button>
        <button class="icon" @click=${() => this.step(1)} aria-label="Next">${icon(UI.right, 14)}</button>
        <button class="icon" @click=${() => (this.showing = -1)} aria-label="Exit">${icon(UI.close, 14)}</button>
      </div>
      <span class="pos">${this.showing + 1} / ${this.slides.length} · arrow keys, Esc</span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-deck': ToDeck;
  }
}
