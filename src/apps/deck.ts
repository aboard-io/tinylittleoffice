/**
 * <to-deck>: up to ten slides. A slide is a headline with bullets, a title,
 * two columns, or bullets beside a big icon; any of them can also show
 * another document (a drawing, a chart, a map...). Type shrinks as a slide
 * fills up, and when presenting, a slide builds one reveal per click.
 * Document format: see lib/deckmodel.ts. Layout and drawing: deck.def.ts.
 */
import { keyed } from 'lit/directives/keyed.js';
import { DocElement, defineElement, html, nothing, state, unsafeSVG, tool, icon, libraryIcon, UI, LIBRARY, searchIcons, suggestIcons, editRef, embeddable, makeRef, resolve, loadEditor, isKey } from '../kit.ts';
import type { SlDialog, SlInput, SlSelect } from '../kit.ts';
import { LAYOUTS, MAX_SLIDES, TRANSITIONS, deckTransition, parseDeck, serializeDeck, type Layout, type Slide, type Transition } from '../lib/deckmodel.ts';
import { SH, SW, layoutSlide, slidePage, slideSteps } from './deck.def.ts';

interface Deck {
  slides: Slide[];
  transition: Transition;
}

/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;
const blank = (): Slide => ({ icon: '', title: '', bullets: [] });

export class ToDeck extends DocElement<Deck> {
  @state() private cur = 0;
  /** The slide being presented, -1 when not presenting. */
  @state() private showing = -1;
  /** Reveals made on the slide being presented. */
  @state() private shown = 0;
  /** Reveals an embedded document has played by itself. */
  @state() private played = 0;
  @state() private query = '';
  private lastClick = 0;
  private timer = 0;

  protected parse(text: string): Deck {
    return { slides: parseDeck(text), transition: deckTransition(text) };
  }
  protected serialize(d: Deck) {
    return serializeDeck(d.slides, d.transition);
  }
  protected loaded() {
    this.cur = Math.min(this.cur, this.doc.slides.length - 1);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
  }

  private get slides() {
    return this.doc.slides;
  }
  private save(slides: Slide[]) {
    this.commit({ ...this.doc, slides });
  }
  private patch(i: number, p: Partial<Slide>) {
    this.save(this.slides.map((s, j) => (j === i ? { ...s, ...p } : s)));
  }

  private add() {
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, blank());
    this.save(slides);
    this.cur++;
    this.updateComplete.then(() => this.querySelector<HTMLInputElement>('input.title')?.focus());
  }

  private removeSlide() {
    if (this.slides.length <= 1) return this.save([blank()]);
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
    if (what.startsWith('layout:')) this.patch(this.cur, { layout: what.slice(7) as Layout });
    else void this.insert(what);
  }

  private async insert(what: string) {
    if (what === 'remove') return this.patch(this.cur, { sub: undefined });
    // A chart is a sheet that asks to be drawn as one.
    const ref = what === 'chart' ? makeRef('sheet', '!bar') : makeRef(what, '');
    const at = this.cur;
    this.patch(at, { sub: ref });
    this.patch(at, { sub: await editRef(ref) });
  }

  private async editSub() {
    const at = this.cur;
    const ref = this.slides[at].sub;
    if (ref) this.patch(at, { sub: await editRef(ref) });
  }

  /* ---------- presenting ---------- */

  /** How many clicks the slide takes, and what plays by itself. */
  private steps(i = this.showing) {
    const st = slideSteps(this.slides[i]);
    return { ...st, clicks: st.bullets + (st.auto ? 0 : st.sub) };
  }

  private show(i: number, shown = 0) {
    clearInterval(this.timer);
    this.showing = i;
    this.shown = shown;
    this.played = 0;
    if (i < 0) return;
    const st = this.steps(i);
    if (resolve(this.slides[i].sub ?? '').def?.id === 'trip') void loadEditor('trip');
    // Things that build by themselves (a table filling in) start as the slide arrives.
    if (st.auto && st.sub) {
      this.timer = window.setInterval(() => {
        if (++this.played >= st.sub) clearInterval(this.timer);
      }, 280);
    }
  }

  private forward() {
    if (this.shown < this.steps().clicks) this.shown++;
    else this.show(this.showing + 1 < this.slides.length ? this.showing + 1 : -1);
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
  private pickerButton(name: string, current: string) {
    return html`<button title=${name} aria-label=${name} aria-pressed=${current === name ? 'true' : 'false'} @click=${() => this.pickIcon(name)}>${icon(LIBRARY[name], 22)}</button>`;
  }

  /** A column of bullets: a textarea over a mirror that draws the dots where the lines really wrap. */
  private bulletsField(label: string, list: string[], placeholder: string, save: (list: string[]) => void) {
    return html`<div class="bullets">
      <div class="mirror" aria-hidden="true">${list.map((b) => html`<div class=${b.trim() ? 'on' : ''}>${b || '​'}</div>`)}</div>
      <textarea placeholder=${placeholder} aria-label=${label} .value=${list.join('\n')} @input=${(e: Event) => save((e.target as HTMLTextAreaElement).value.split('\n'))}></textarea>
    </div>`;
  }

  render() {
    const s = this.slides[this.cur];
    const n = this.slides.length;
    const kind = s.layout ?? '';
    const L = layoutSlide(s);
    const suggested = suggestIcons(s.title, s.bullets);
    const found = searchIcons(this.query);
    // Type is sized in the slide's own width, so the editor shows what the audience will see.
    const fit = `--title:${L.titlePx};--body:${L.bodyPx}`;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Slides">
        ${tool('Slide', 'plus', () => this.add(), { text: true, disabled: n >= MAX_SLIDES })}
        ${tool('Delete slide', 'trash', () => this.removeSlide())}
        <sl-button-group label="Reorder">
          ${tool('Move slide up', 'up', () => this.move(-1), { disabled: this.cur === 0 })}
          ${tool('Move slide down', 'down', () => this.move(1), { disabled: this.cur === n - 1 })}
        </sl-button-group>
        <sl-button size="small" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        <sl-dropdown class="deck-kind" hoist @sl-select=${(e: CustomEvent) => this.pickKind(e.detail.item.value)}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.columns, 14)} Slide type</sl-button>
          <sl-menu>
            <sl-menu-label>Layout</sl-menu-label>
            ${LAYOUTS.map((l) => html`<sl-menu-item type="checkbox" value="layout:${l.id}" ?checked=${kind === l.id}>${l.name}</sl-menu-item>`)}
            <sl-divider></sl-divider>
            <sl-menu-label>Show on this slide</sl-menu-label>
            ${embeddable('deck').map((a) => html`<sl-menu-item value=${a.id}>${icon(UI[a.icon as keyof typeof UI], 14, 'pre')} ${a.id === 'sheet' ? 'Table' : a.id === 'trip' ? 'Map' : a.id === 'draw' ? 'Drawing' : a.name}</sl-menu-item>${a.id === 'sheet' ? html`<sl-menu-item value="chart">${icon(UI.chart, 14, 'pre')} Chart</sl-menu-item>` : nothing}`)}
            ${s.sub ? html`<sl-divider></sl-divider><sl-menu-item value="remove">Remove what is shown</sl-menu-item>` : nothing}
          </sl-menu>
        </sl-dropdown>
        <span class="to-spacer"></span>
        <sl-select class="sr-label deck-transition" size="small" label="Transition" hoist .value=${this.doc.transition || 'cut'} @sl-change=${(e: Event) => this.commit({ ...this.doc, transition: (((e.target as SlSelect).value as string) === 'cut' ? '' : (e.target as SlSelect).value) as Transition })}>
          ${TRANSITIONS.map((t) => html`<sl-option value=${t.id || 'cut'}>${t.name}</sl-option>`)}
        </sl-select>
        <span class="to-hint">${n} / ${MAX_SLIDES}</span>
        <sl-button size="small" variant="primary" @click=${() => this.show(this.cur)}>${icon(UI.play, 14)} Present</sl-button>
      </div>
      <div class="deck-layout">
        <nav class="deck-rail" aria-label="Slides">
          ${this.slides.map((sl, i) => {
            const p = slidePage(sl);
            return html`<button class="deck-thumb" aria-label="Slide ${i + 1}: ${sl.title || 'untitled'}" aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>
              <span class="n">${i + 1}</span>
              <svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>
            </button>`;
          })}
        </nav>
        <div class="deck-editor">
          <div class="deck-slide lay-${kind || 'b'} ${s.sub ? 'has-sub' : ''}" style=${fit}>
            <div class="head">
              <button class="pick ${s.icon ? '' : 'empty'}" title=${s.icon ? 'Change icon' : 'Add an icon'} aria-label="Slide icon" @click=${this.openPicker}>
                ${s.icon ? libraryIcon(s.icon, 32) : html`${icon(UI.smile, 20)}<span>Icon</span>`}
              </button>
              <input class="title" placeholder=${kind === 't' ? 'Title' : 'Headline'} aria-label="Headline" .value=${s.title} @input=${(e: Event) => this.patch(this.cur, { title: (e.target as HTMLInputElement).value })} />
            </div>
            <div class="body">
              ${this.bulletsField('Bullets', s.bullets, kind === 't' ? 'Subtitle' : 'One bullet per line', (bullets) => this.patch(this.cur, { bullets }))}
              ${s.sub
                ? html`<to-embed ref=${s.sub} controls @embed-edit=${this.editSub} @embed-remove=${() => this.patch(this.cur, { sub: undefined })}></to-embed>`
                : kind === '2'
                  ? this.bulletsField('Right column', s.right ?? [], 'One bullet per line', (right) => this.patch(this.cur, { right }))
                  : kind === 'i'
                    ? html`<button class="big ${s.icon ? '' : 'empty'}" aria-label="Big icon" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 120) : html`${icon(UI.smile, 40)}<span>Pick an icon</span>`}</button>`
                    : nothing}
            </div>
            ${!s.icon && suggested.length
              ? html`<div class="deck-suggest" role="group" aria-label="Suggested icons">
                  <span>${icon(UI.sparkles, 12)} Suggested</span>
                  ${suggested.slice(0, 4).map((name) => html`<button title=${`Use ${name}`} aria-label=${`Use ${name} icon`} @click=${() => this.patch(this.cur, { icon: name })}>${icon(LIBRARY[name], 16)}</button>`)}
                </div>`
              : nothing}
            <span class="num">${this.cur + 1} / ${n}</span>
          </div>
        </div>
      </div>
      <sl-dialog id="icon-picker" label="Icon">
        <sl-input class="deck-search" size="small" type="search" placeholder="Search icons" aria-label="Search icons" autofocus clearable .value=${this.query} @sl-input=${(e: Event) => (this.query = (e.target as SlInput).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.query.trim() && found[0] && this.pickIcon(found[0])}><span slot="prefix">${icon(UI.search, 14)}</span></sl-input>
        ${!this.query.trim() && suggested.length
          ? html`<div class="deck-picker-label">Suggested for this slide</div>
              <div class="deck-picker suggested" role="group" aria-label="Suggested">${suggested.map((name) => this.pickerButton(name, s.icon))}</div>
              <div class="deck-picker-label">All icons</div>`
          : nothing}
        <div class="deck-picker" role="group" aria-label="Icon library">${found.map((name) => this.pickerButton(name, s.icon))}</div>
        ${found.length ? nothing : html`<p class="deck-picker-none">No icons match “${this.query.trim()}”.</p>`}
        <sl-button slot="footer" size="small" @click=${() => this.pickIcon('')}>${icon(UI.close, 14)} No icon</sl-button>
      </sl-dialog>
      ${this.showing >= 0 ? this.renderShow() : nothing}
    `;
  }

  private renderShow() {
    const s = this.slides[this.showing];
    const st = this.steps();
    const subStep = !st.sub ? undefined : st.auto ? this.played : Math.max(0, this.shown - st.bullets);
    const sub = s.sub ? resolve(s.sub) : null;
    // A map is shown live, over the place its picture would be, so it can fly from stop to stop.
    const map = sub?.def?.id === 'trip' ? layoutSlide(s).sub : undefined;
    const p = slidePage(s, this.shown, map ? 0 : subStep);
    return html`<div class="deck-show" role="dialog" aria-modal="true" aria-label="Presentation" @click=${this.onShowClick}>
      ${keyed(
        this.showing,
        html`<div class="frame tr-${this.doc.transition || 'cut'}">
          <svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${s.title}">${unsafeSVG(p.svg)}</svg>
          ${map && sub ? html`<to-trip class="deck-map" present .value=${sub.body} .step=${subStep ?? 0} style="left:${(map.x / SW) * 100}%;top:${(map.y / SH) * 100}%;width:${(map.w / SW) * 100}%;height:${(map.h / SH) * 100}%" @click=${(e: Event) => e.stopPropagation()}></to-trip>` : nothing}
        </div>`,
      )}
      <p class="sr-only" aria-live="polite">Slide ${this.showing + 1} of ${this.slides.length}: ${s.title}</p>
      <sl-button-group class="ctl" label="Presentation" @click=${(e: Event) => e.stopPropagation()}>
        ${tool('Previous', 'left', () => this.back(), { disabled: this.showing === 0 && this.shown === 0 })}
        ${tool('Next', 'right', () => this.forward())}
        ${tool('Exit', 'close', () => this.show(-1))}
      </sl-button-group>
      <span class="pos">${this.showing + 1} / ${this.slides.length}</span>
    </div>`;
  }
}
defineElement('deck', ToDeck);

declare global {
  interface HTMLElementTagNameMap {
    'to-deck': ToDeck;
  }
}
