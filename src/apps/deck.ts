/**
 * <to-deck>: up to ten slides. A slide is a headline with bullets, a title,
 * two columns, or bullets beside a big icon; any of them can also show
 * another document (a drawing, a chart, a map...), which then has the whole
 * slide. Type shrinks as a slide
 * fills up, and when presenting, a slide builds one reveal per click.
 * Document format: see lib/deckmodel.ts. Layout and drawing: deck.def.ts.
 */
import { keyed } from 'lit/directives/keyed.js';
import { defineElement, html, nothing, state, property, unsafeSVG, tool, icon, libraryIcon, UI, LIBRARY, suggestIcons, insertOptions, resolve, loadEditor, isKey } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import { PagesElement, blankPage } from './pages.ts';
import { ICON_COLORS, LAYOUTS, MAX_SLIDES, TRANSITIONS, deckIconColor, deckTransition, parseDeck, serializeDeck, type Layout, type Slide, type Transition } from '../lib/deckmodel.ts';
import { SH, SW, closingSlide, layoutSlide, slidePage, slideSteps, slidesWith } from './deck.def.ts';

interface Deck {
  slides: Slide[];
  transition: Transition;
  /** The colour of every icon in the deck: a key of ICON_COLORS. */
  color: string;
}

/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;
export class ToDeck extends PagesElement<Deck> {
  /** Opened from a link that asks to present: start presenting, and offer the way to the editor. */
  @property({ type: Boolean }) present = false;
  private started = false;
  /** The slide being presented, -1 when not presenting. */
  @state() private showing = -1;
  /** Reveals made on the slide being presented. */
  @state() private shown = 0;
  /** The slide being left, while the next one arrives over it; -1 otherwise. */
  @state() private leaving = -1;
  /** Speaker notes showing while presenting (N toggles). */
  @state() private noting = true;
  private forwards = true;
  private settle = 0;
  private lastClick = 0;

  protected parse(text: string): Deck {
    return { slides: parseDeck(text), transition: deckTransition(text), color: deckIconColor(text) };
  }
  protected serialize(d: Deck) {
    return serializeDeck(d.slides, d.transition, d.color);
  }
  protected loaded() {
    this.cur = Math.min(this.cur, this.doc.slides.length - 1);
  }

  protected updated() {
    if (this.present && !this.started) {
      this.started = true;
      this.show(0);
    } else if (!this.present) this.started = false;
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
  }

  private get slides() {
    return this.doc.slides;
  }
  protected pages() {
    return this.doc.slides;
  }
  protected savePages(slides: Slide[]) {
    this.commit({ ...this.doc, slides });
  }
  private save(slides: Slide[]) {
    this.savePages(slides);
  }

  private add() {
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, blankPage());
    this.save(slides);
    this.cur++;
    this.updateComplete.then(() => this.querySelector<HTMLElement>('to-rich.title .write-page')?.focus());
  }

  private removeSlide() {
    if (this.slides.length <= 1) return this.save([blankPage()]);
    const slides = this.slides.filter((_, j) => j !== this.cur);
    this.save(slides);
    this.cur = Math.min(this.cur, slides.length - 1);
  }

  private move(d: number) {
    const j = this.cur + d;
    if (j < 0 || j >= this.slides.length) return;
    const slides = [...this.slides];
    [slides[this.cur], slides[j]] = [slides[j], slides[this.cur]];
    this.save(slides);
    this.cur = j;
  }

  /* ---------- another document on the slide ---------- */

  /** The Slide type menu: a layout for the slide, or a document to show on it. */
  private pickKind(what: string) {
    // A new slide of that type goes in after this one; the slide you are on is left as it is.
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, what.startsWith('layout:') ? { ...blankPage(), layout: what.slice(7) as Layout } : blankPage());
    this.save(slides);
    this.cur++;
    if (what.startsWith('layout:')) this.updateComplete.then(() => this.querySelector<HTMLElement>('to-rich.title .write-page')?.focus());
    else void this.insert(what);
  }

  /* ---------- presenting ---------- */

  /** The slides as shown: what was written, then the closing QR code of the whole deck. */
  private get shows(): Slide[] {
    return slidesWith(this.serialize(this.doc));
  }

  /** How many clicks the slide takes, and what plays by itself. */
  private steps(i = this.showing) {
    const st = slideSteps(this.shows[i]);
    return { ...st, clicks: st.bullets + st.sub };
  }

  private show(i: number, shown = 0) {
    // The slide being left stays underneath until the new one has arrived, so nothing flashes.
    clearTimeout(this.settle);
    this.leaving = i >= 0 && this.showing >= 0 && i !== this.showing ? this.showing : -1;
    this.forwards = i >= this.showing;
    if (this.leaving >= 0) this.settle = window.setTimeout(() => (this.leaving = -1), 650);
    this.showing = i;
    this.shown = shown;
    if (i < 0 && this.present) this.dispatchEvent(new CustomEvent('present-end', { bubbles: true, composed: true }));
    if (i < 0) return;
    if (resolve(this.shows[i]?.sub ?? '').def?.id === 'trip') void loadEditor('trip');
  }

  private forward() {
    if (this.shown < this.steps().clicks) this.shown++;
    else if (this.showing + 1 < this.shows.length) this.show(this.showing + 1);
    // Someone sent a link to watch stays on the last slide; a rehearsal drops back to the editor.
    else if (!this.present) this.show(-1);
  }

  private back() {
    if (this.shown > 0) this.shown--;
    else if (this.showing > 0) this.show(this.showing - 1, this.steps(this.showing - 1).clicks);
  }

  private onShowClick() {
    const now = performance.now();
    // A fast second click means "just show me the slide".
    if (now - this.lastClick < FAST) this.shown = this.steps().clicks;
    else this.forward();
    this.lastClick = now;
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.showing >= 0) {
      if (e.key === 'Escape') this.show(-1);
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') this.forward();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') this.back();
      else if (e.key === 'End') this.shown = this.steps().clicks;
      else if (e.key.toLowerCase() === 'n') this.noting = !this.noting;
      else return;
      e.preventDefault();
      return;
    }
    // Only while this deck is the document on screen, not one being edited inside another.
    if (!this.isConnected || this.closest('sl-dialog:not([open])')) return;
    if (isKey(e, 'Mod+Shift+Enter')) this.show(this.cur);
    else if (isKey(e, 'Mod+Enter')) this.add();
    else if (e.key === 'PageDown' && this.cur < this.slides.length - 1) this.cur++;
    else if (e.key === 'PageUp' && this.cur > 0) this.cur--;
    else return;
    e.preventDefault();
  };

  /** The slide's icon: the library, with the slide's own words suggesting, and the deck's icon colour in the footer. */
  private openPicker = () => {
    const s = this.slides[this.cur];
    void this.pickIcon({
      suggested: suggestIcons(s.title, s.bullets),
      footer: () => html`<div class="draw-colors deck-icon-color" role="radiogroup" aria-label="Icon colour, for the whole deck">
        ${Object.entries(ICON_COLORS).map(([id, c]) => html`<button role="radio" title=${c.name} aria-label=${c.name} aria-checked=${this.doc.color === id ? 'true' : 'false'} style="--c:${c.hex}" @click=${() => this.commit({ ...this.doc, color: id })}></button>`)}
      </div>`,
    });
  };

  /** An icon in the words, at the cursor of the box last typed in. */
  private inlineIcon() {
    void this.field?.insertIcon();
  }

  render() {
    const s = this.slides[this.cur];
    const n = this.slides.length;
    const kind = s.layout ?? '';
    const L = layoutSlide(s);
    const suggested = suggestIcons(s.title, s.bullets);
    // Type is sized in the slide's own width, so the editor shows what the audience will see.
    const subDef = s.sub ? resolve(s.sub).def : undefined;
    // What kind of slide this is, in a word: its layout, or what it shows.
    const kindName = subDef ? (subDef.id === 'sheet' ? 'Table' : subDef.id === 'trip' ? 'Map' : subDef.id === 'draw' ? 'Drawing' : subDef.name) : LAYOUTS.find((l) => l.id === kind)!.name;
    const tint = ICON_COLORS[this.doc.color]?.hex ?? ICON_COLORS[''].hex;
    const fit = `--title:${L.titlePx};--body:${L.bodyPx};--icon:${tint}`;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Slides">
        <sl-button-group label="Slides">
          ${tool('Slide', 'plus', () => this.add(), { text: true, disabled: n >= MAX_SLIDES })}
          <span class="deck-kind to-hint" title="What kind of slide this is">${kindName}</span>
          <to-insert class="deck-add" label="Add a slide" placeholder="Add: type, table, map…" .options=${[...LAYOUTS.map((l) => ({ value: `layout:${l.id}`, label: `${l.name} slide`, group: 'Layouts' })), ...insertOptions('deck')]} @pick=${(e: CustomEvent<string>) => this.pickKind(e.detail)}></to-insert>
          ${tool('Move slide up', 'up', () => this.move(-1), { disabled: this.cur === 0 })}
          ${tool('Move slide down', 'down', () => this.move(1), { disabled: this.cur === n - 1 })}
          ${tool('Delete slide', 'trash', () => this.removeSlide())}
        </sl-button-group>
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.field?.exec('bold'))}${tool('Italic', 'italic', () => this.field?.exec('italic'))}${tool('Underline', 'underline', () => this.field?.exec('underline'))}${tool('Strike', 'strike', () => this.field?.exec('strikeThrough'))}${tool('Highlight', 'highlight', () => this.field?.highlight())}
          ${tool('Bring the bullet out', 'outdent', () => this.field?.shift(-1))}${tool('Indent the bullet', 'indent', () => this.field?.shift(1))}
          ${tool('Icon in text', 'smile', () => this.inlineIcon())}
        </sl-button-group>
        <sl-button size="small" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        <span class="to-spacer"></span>
        <sl-select class="sr-label deck-transition" size="small" label="Transition" hoist .value=${this.doc.transition || 'fade'} @sl-change=${(e: Event) => this.commit({ ...this.doc, transition: (((e.target as SlSelect).value as string) === 'fade' ? '' : (e.target as SlSelect).value) as Transition })}>
          ${TRANSITIONS.map((t) => html`<sl-option value=${t.id || 'fade'}>${t.name}</sl-option>`)}
        </sl-select>
        <span class="to-hint deck-count">${n} ${n === 1 ? 'slide' : 'slides'}</span>
        <sl-button size="small" variant="primary" @click=${() => this.show(this.cur)}>${icon(UI.play, 14)} Present</sl-button>
      </div>
      <div class="deck-layout">
        ${this.rail(
          'deck',
          'Slides',
          (sl, i) => {
            const p = slidePage(sl, Infinity, undefined, this.doc.color);
            return html`<span class="n">${i + 1}</span><svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>`;
          },
          (sl, i) => `Slide ${i + 1}: ${sl.title || 'untitled'}`,
          (() => {
            // The closing slide is made, not written: a QR code of the deck, shown here so it is no surprise.
            const end = closingSlide(this.serialize(this.doc));
            if (!end) return nothing;
            const p = slidePage(end, Infinity, undefined, this.doc.color);
            return html`<div class="deck-end" role="img" aria-label="Last slide, added for you: a QR code of this whole deck" title="Ends with a QR code of this deck, so the room can take it home">
              <span class="n">${icon(UI.qr, 12)}</span>
              <svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>
            </div>`;
          })(),
        )}
        <div class="deck-editor">
          <div class="deck-slide lay-${kind || 'b'} ${s.sub ? 'has-sub' : ''}" style=${fit}>
            ${s.sub
              ? this.embed()
              : html`            <div class="head">
              <button class="pick ${s.icon ? '' : 'empty'}" title=${s.icon ? 'Change icon' : 'Add an icon'} aria-label="Slide icon" @click=${this.openPicker}>
                ${s.icon ? libraryIcon(s.icon, 32) : html`${icon(UI.smile, 20)}<span>Icon</span>`}
              </button>
              ${this.headline(kind === 't' ? 'Title' : 'Headline')}
            </div>
            <div class="body">
              ${this.words('Bullets', s.bullets, kind === 't' ? 'Subtitle' : 'One bullet per line', (bullets) => this.patch({ bullets }))}
              ${kind === '2'
                  ? this.words('Right column', s.right ?? [], 'One bullet per line', (right) => this.patch({ right }))
                  : kind === 'i'
                    ? html`<button class="big ${s.icon ? '' : 'empty'}" aria-label="Big icon" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 120) : html`${icon(UI.smile, 40)}<span>Pick an icon</span>`}</button>`
                    : nothing}
            </div>`}
            ${!s.icon && !s.sub && suggested.length
              ? html`<div class="deck-suggest" role="group" aria-label="Suggested icons">
                  <span>${icon(UI.sparkles, 12)} Suggested</span>
                  ${suggested.slice(0, 4).map((name) => html`<button title=${`Use ${name}`} aria-label=${`Use ${name} icon`} @click=${() => this.patch({ icon: name })}>${icon(LIBRARY[name], 16)}</button>`)}
                </div>`
              : nothing}
            <span class="num">${this.cur + 1} / ${n}</span>
          </div>
          <textarea class="deck-notes" aria-label="Speaker notes" placeholder="Speaker notes: for you when presenting, never on the slide" rows="2" .value=${(s.notes ?? []).join('\n')} @input=${(e: Event) => this.patch({ notes: (e.target as HTMLTextAreaElement).value.split('\n').filter((l) => l.trim()) })}></textarea>
        </div>
      </div>
      ${this.showing >= 0 ? this.renderShow() : nothing}
    `;
  }

  private renderShow() {
    const shows = this.shows;
    const s = shows[this.showing];
    const st = this.steps();
    const subStep = st.sub ? this.shown : undefined;
    const sub = s.sub ? resolve(s.sub) : null;
    // A map is shown live, over the place its picture would be, so it can fly from stop to stop.
    const map = sub?.def?.id === 'trip' ? layoutSlide(s).sub : undefined;
    const p = slidePage(s, this.shown, map ? 0 : subStep, this.doc.color);
    return html`<div class="deck-show" role="dialog" aria-modal="true" aria-label="Presentation" @click=${this.onShowClick}>
      ${this.leaving >= 0 && shows[this.leaving]
        ? keyed(this.leaving, html`<div class="was tr-${this.doc.transition || 'fade'} ${this.forwards ? '' : 'back'}" aria-hidden="true"><svg viewBox="0 0 ${SW} ${SH}">${unsafeSVG(slidePage(shows[this.leaving], Infinity, undefined, this.doc.color).svg)}</svg></div>`)
        : nothing}
      ${keyed(
        this.showing,
        html`<div class="frame tr-${this.doc.transition || 'fade'} ${this.forwards ? '' : 'back'}">
          <svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${s.title}">${unsafeSVG(p.svg)}</svg>
          ${map && sub ? html`<to-trip class="deck-map" present .value=${sub.body} .step=${subStep ?? 0} style="left:${(map.x / SW) * 100}%;top:${(map.y / SH) * 100}%;width:${(map.w / SW) * 100}%;height:${(map.h / SH) * 100}%" @click=${(e: Event) => e.stopPropagation()}></to-trip>` : nothing}
        </div>`,
      )}
      <p class="sr-only" aria-live="polite">Slide ${this.showing + 1} of ${shows.length}: ${s.title || (this.showing === shows.length - 1 ? 'A QR code of this deck' : '')}</p>
      <sl-button-group class="ctl" label="Presentation" @click=${(e: Event) => e.stopPropagation()}>
        ${tool('Previous', 'left', () => this.back(), { disabled: this.showing === 0 && this.shown === 0 })}
        ${tool('Next', 'right', () => this.forward())}
        ${this.present ? tool('Edit this deck', 'pen', () => this.show(-1), { text: true }) : tool('Exit', 'close', () => this.show(-1))}
      </sl-button-group>
      <span class="pos">${this.showing + 1} / ${shows.length}</span>
      ${s.notes?.length && this.noting ? html`<div class="notes" @click=${(e: Event) => e.stopPropagation()}><b>Notes</b> ${s.notes.map((n) => html`<p>${n}</p>`)}<small>N hides them</small></div>` : nothing}
    </div>`;
  }
}
defineElement('deck', ToDeck);

declare global {
  interface HTMLElementTagNameMap {
    'to-deck': ToDeck;
  }
}
