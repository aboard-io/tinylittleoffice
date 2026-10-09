/**
 * <to-deck>: slides. A slide is a headline with bullets, a title, two
 * columns, or bullets beside a big icon; any of them can also show another
 * document (a drawing, a chart, a map...), which then has the whole slide.
 * Type shrinks as a slide fills up, and when presenting, a slide builds one
 * reveal per click.
 * Document format: see lib/deckmodel.ts. Layout and drawing: deck.def.ts.
 */
import { keyed } from 'lit/directives/keyed.js';
import { defineElement, html, nothing, state, property, unsafeSVG, tool, swatches, icon, libraryIcon, UI, insertOptions, resolve, isKey } from '../kit.ts';
import type { SlSelect } from '../kit.ts';
import { PagesElement } from './pages.ts';
import { ICON_COLORS, LAYOUTS, TRANSITIONS, blankSlide, deckEndsWithQr, deckIconColor, deckTransition, parseDeck, serializeDeck, type Layout, type Slide, type Transition } from '../lib/deckmodel.ts';
import { SH, SW, layoutSlide, slidePage, slideSteps } from '../lib/slide.ts';
import { closingSlide, slidesWith } from './deck.def.ts';
import { templateLine, templateTool } from '../widgets/template-picker.ts';

interface Deck {
  slides: Slide[];
  transition: Transition;
  /** Ends with a QR code of itself (the default). */
  qr: boolean;
  /** The colour of every icon in the deck: a key of ICON_COLORS. */
  color: string;
}

/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;
/** A picture for each kind of slide. */
const LAYOUT_ICONS: Record<string, keyof typeof UI> = { '': 'ul', t: 'h1', '2': 'columns', i: 'smile' };

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
    return { slides: parseDeck(text), transition: deckTransition(text), color: deckIconColor(text), qr: deckEndsWithQr(text) };
  }
  protected serialize(d: Deck) {
    return serializeDeck(d.slides, d.transition, d.color, d.qr);
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

  protected pages() {
    return this.doc.slides;
  }
  protected savePages(slides: Slide[]) {
    this.commit({ ...this.doc, slides });
  }

  /** A template becomes the deck, from its first slide: one change, one undo. */
  private useTemplate = (t: { body: string }) => {
    this.commit(this.parse(t.body));
    this.cur = 0;
  };

  /* ---------- another document on the slide ---------- */

  /** The Add menu: a new slide after this one, of a layout or showing a document; the slide you are on is left as it is. */
  private pickKind(what: string) {
    if (what.startsWith('layout:')) return this.addPage({ ...blankSlide(), layout: what.slice(7) as Layout });
    this.addPage();
    void this.insert(what);
  }

  /** The transition menu says "fade" for the default, which is written as nothing. */
  private setTransition(e: Event) {
    const t = (e.target as SlSelect).value as string;
    this.commit({ ...this.doc, transition: (t === 'fade' ? '' : t) as Transition });
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
    else if (isKey(e, 'Mod+Enter')) this.addPage();
    else if (e.key === 'PageDown' && this.cur < this.doc.slides.length - 1) this.cur++;
    else if (e.key === 'PageUp' && this.cur > 0) this.cur--;
    else return;
    e.preventDefault();
  };

  /** The slide's icon: the library, with the slide's own words suggesting, and the deck's icon colour in the footer. */
  private openPicker = () => {
    void this.pickIcon({
      footer: () => swatches('Icon colour, for the whole deck', ICON_COLORS, this.doc.color, (id) => this.commit({ ...this.doc, color: id }), { cls: 'deck-icon-color' }),
    });
  };

  render() {
    const s = this.doc.slides[this.cur];
    const n = this.doc.slides.length;
    const kind = s.layout ?? '';
    const L = layoutSlide(s);
    // Type is sized in the slide's own width, so the editor shows what the audience will see.
    const subDef = s.sub ? resolve(s.sub).def : undefined;
    // What kind of slide this is, in a word: its layout, or what it shows.
    const kindName = subDef ? (subDef.id === 'sheet' ? 'Table' : subDef.id === 'trip' ? 'Map' : subDef.id === 'draw' ? 'Drawing' : subDef.name) : LAYOUTS.find((l) => l.id === kind)!.name;
    const tint = ICON_COLORS[this.doc.color]?.hex ?? ICON_COLORS[''].hex;
    const fit = `--title:${L.titlePx};--body:${L.bodyPx};--icon:${tint}`;
    // An untouched new deck is written as nothing: that is when a template is offered.
    const blank = this.serialize(this.doc) === '';
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Slides">
        <sl-button size="small" variant="primary" @click=${() => this.show(this.cur)}>${icon(UI.play, 14)} Present</sl-button>
        <sl-button-group label="Slides">
          ${tool('Slide', 'plus', () => this.addPage(), { text: true })}
          <span class="deck-kind to-hint" data-tip="What kind of slide this is">${kindName}</span>
          <to-insert class="deck-add" label="Add a slide" placeholder="Add: type, table, map…" .options=${[...LAYOUTS.map((l) => ({ value: `layout:${l.id}`, label: `${l.name} slide`, group: 'Layouts', icon: LAYOUT_ICONS[l.id] })), ...insertOptions('deck')]} @pick=${(e: CustomEvent<string>) => this.pickKind(e.detail)}></to-insert>
          ${tool('Move slide up', 'up', () => this.movePage(-1), { disabled: this.cur === 0 })}
          ${tool('Move slide down', 'down', () => this.movePage(1), { disabled: this.cur === n - 1 })}
          ${tool('Delete slide', 'trash', () => this.removePage())}
        </sl-button-group>
        ${this.textTools()}
        <sl-button size="small" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        <span class="to-spacer"></span>
        ${tool('End with a QR code of this deck', 'qr', () => this.commit({ ...this.doc, qr: !this.doc.qr }), { pressed: this.doc.qr })}
        <sl-select class="sr-label deck-transition" size="small" label="Transition" hoist .value=${this.doc.transition || 'fade'} @sl-change=${this.setTransition}>
          ${TRANSITIONS.map((t) => html`<sl-option value=${t.id || 'fade'}>${t.name}</sl-option>`)}
        </sl-select>
        <span class="to-hint deck-count">${n} ${n === 1 ? 'slide' : 'slides'}</span>
        ${blank ? templateTool('deck', this.useTemplate) : nothing}
      </div>
      ${blank ? templateLine('deck', this.useTemplate) : nothing}
      <div class="deck-layout">
        <!-- The slide first, then the row of every slide under it. -->
        <div class="deck-editor">
          ${this.canvas({ kind, style: fit, pick: this.openPicker, iconLabel: 'Slide icon', foot: `${this.cur + 1} / ${n}` })}
          <textarea class="deck-notes" aria-label="Speaker notes" placeholder="Speaker notes: for you when presenting, never on the slide" rows="2" .value=${(s.notes ?? []).join('\n')} @input=${(e: Event) => this.patch({ notes: (e.target as HTMLTextAreaElement).value.split('\n').filter((l) => l.trim()) })}></textarea>
        </div>
        ${this.rail(
          'deck',
          'Slides',
          (sl, i) => {
            const p = slidePage(sl, Infinity, undefined, this.doc.color);
            return html`<span class="n">${i + 1}</span><svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>`;
          },
          (sl, i) => `Slide ${i + 1}: ${sl.title || 'untitled'}`,
          // The closing slide is made, not written: a QR code of the deck, shown here so it is no surprise.
          closingSlide(this.serialize(this.doc))
            ? html`<div class="deck-end" role="img" aria-label="Last slide, added for you: a QR code of this whole deck" data-tip="Ends with a QR code of this deck, so the room can take it home. Turn it off in the toolbar.">
                ${icon(UI.qr, 28)}<span>QR code of this deck</span>
              </div>`
            : nothing,
        )}
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
    // How the slide arrives, and which way: back when going back.
    const motion = `tr-${this.doc.transition || 'fade'} ${this.forwards ? '' : 'back'}`;
    return html`<div class="deck-show" role="dialog" aria-modal="true" aria-label="Presentation" @click=${this.onShowClick}>
      ${this.leaving >= 0 && shows[this.leaving]
        ? keyed(this.leaving, html`<div class="was ${motion}" aria-hidden="true"><svg viewBox="0 0 ${SW} ${SH}">${unsafeSVG(slidePage(shows[this.leaving], Infinity, undefined, this.doc.color).svg)}</svg></div>`)
        : nothing}
      ${keyed(
        this.showing,
        html`<div class="frame ${motion}">
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
