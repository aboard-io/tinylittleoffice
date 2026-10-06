/**
 * <to-deck>: up to ten slides. A slide is a headline with bullets, a title,
 * two columns, or bullets beside a big icon; any of them can also show
 * another document (a drawing, a chart, a map...), which then has the whole
 * slide. Type shrinks as a slide
 * fills up, and when presenting, a slide builds one reveal per click.
 * Document format: see lib/deckmodel.ts. Layout and drawing: deck.def.ts.
 */
import { keyed } from 'lit/directives/keyed.js';
import { DocElement, defineElement, html, nothing, state, property, unsafeSVG, tool, icon, libraryIcon, UI, LIBRARY, searchIcons, suggestIcons, editRef, insertMenu, makeRef, resolve, loadEditor, isKey } from '../kit.ts';
import type { SlDialog, SlInput, SlSelect } from '../kit.ts';
import { ICON_COLORS, LAYOUTS, MAX_SLIDES, TRANSITIONS, deckIconColor, deckTransition, parseDeck, serializeDeck, type Layout, type Slide, type Transition } from '../lib/deckmodel.ts';
import { iconCount } from '../lib/iconsearch.ts';
import { toggleMark } from '../lib/richtext.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';
import { SH, SW, depthOf, layoutSlide, slidePage, slideSteps } from './deck.def.ts';

interface Deck {
  slides: Slide[];
  transition: Transition;
  /** The colour of every icon in the deck: a key of ICON_COLORS. */
  color: string;
}

/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;
const blank = (): Slide => ({ icon: '', title: '', bullets: [] });

export class ToDeck extends DocElement<Deck> {
  /** Opened from a link that asks to present: start presenting, and offer the way to the editor. */
  @property({ type: Boolean }) present = false;
  private started = false;
  @state() private cur = 0;
  /** The slide being presented, -1 when not presenting. */
  @state() private showing = -1;
  /** Reveals made on the slide being presented. */
  @state() private shown = 0;
  /** The slide being left, while the next one arrives over it; -1 otherwise. */
  @state() private leaving = -1;
  private forwards = true;
  private settle = 0;
  @state() private query = '';
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
    // A new slide of that type goes in after this one; the slide you are on is left as it is.
    if (this.slides.length >= MAX_SLIDES) return;
    const slides = [...this.slides];
    slides.splice(this.cur + 1, 0, what.startsWith('layout:') ? { ...blank(), layout: what.slice(7) as Layout } : blank());
    this.save(slides);
    this.cur++;
    if (what.startsWith('layout:')) this.updateComplete.then(() => this.querySelector<HTMLInputElement>('input.title')?.focus());
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
    if (resolve(this.slides[i].sub ?? '').def?.id === 'trip') void loadEditor('trip');
  }

  private forward() {
    if (this.shown < this.steps().clicks) this.shown++;
    else if (this.showing + 1 < this.slides.length) this.show(this.showing + 1);
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

  /** The headline box or bullets box last typed in: what the mark buttons work on. */
  private field: HTMLInputElement | HTMLTextAreaElement | null = null;

  /** Bold, italic, underline or strike round what is selected in the headline or a bullet (or taken off again). */
  private mark(mark: string) {
    const f = this.field;
    if (!f || !f.isConnected) return;
    const { selectionStart: a, selectionEnd: b, value } = f;
    if (a === null || b === null) return;
    // Within the one line the selection is on; a word, if nothing is selected.
    const lineStart = value.lastIndexOf('\n', a - 1) + 1;
    const lineEnd = value.indexOf('\n', b) < 0 ? value.length : value.indexOf('\n', b);
    let [from, to] = [a - lineStart, b - lineStart];
    const line = value.slice(lineStart, lineEnd);
    if (from === to) {
      while (from > 0 && /\S/.test(line[from - 1])) from--;
      while (to < line.length && /\S/.test(line[to])) to++;
    }
    const done = toggleMark(line, from, to, mark);
    f.value = value.slice(0, lineStart) + done.line + value.slice(lineEnd);
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.focus();
    f.setSelectionRange(lineStart + done.from, lineStart + done.to);
  }

  /** The indent buttons work on the bullets box last typed in. */
  private indent(out: boolean) {
    const f = this.field;
    if (!f || !f.isConnected || f.tagName !== 'TEXTAREA') return;
    f.focus();
    this.step(f as HTMLTextAreaElement, out);
  }

  /** Tab in the bullets: the line steps in (two spaces a level, up to three); Shift+Tab brings it out. */
  private onTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    this.step(e.target as HTMLTextAreaElement, e.shiftKey);
  }
  private step(area: HTMLTextAreaElement, out: boolean) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const from = value.lastIndexOf('\n', a - 1) + 1;
    const end = value.indexOf('\n', b) < 0 ? value.length : value.indexOf('\n', b);
    const was = value.slice(from, end).split('\n');
    const lines = was.map((l) => (out ? l.replace(/^(\t| {1,2})/, '') : depthOf(l) < 3 ? '  ' + l : l));
    const text = value.slice(0, from) + lines.join('\n') + value.slice(end);
    area.value = text;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.setSelectionRange(Math.max(from, a + lines[0].length - was[0].length), b + text.length - value.length);
  }

  /** An icon in the words, at the cursor of the box last typed in: ":rocket:" in the text, a picture on the slide. */
  private async inlineIcon() {
    const f = this.field;
    const name = await chooseIcon();
    if (!name || !f || !f.isConnected) return;
    const at = f.selectionStart ?? f.value.length;
    f.value = f.value.slice(0, at) + `:${name}: ` + f.value.slice(f.selectionEnd ?? at);
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.focus();
    f.setSelectionRange(at + name.length + 3, at + name.length + 3);
  }

  private onMarkKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const mark = e.shiftKey && e.key.toLowerCase() === 'h' ? '=' : e.shiftKey ? undefined : { b: '*', i: '_', u: '^' }[e.key.toLowerCase()];
    if (!mark) return;
    const t = e.target as HTMLElement;
    if (t.matches('input.title, .bullets textarea')) {
      e.preventDefault();
      this.field = t as HTMLInputElement;
      this.mark(mark);
    }
  };

  /** A column of bullets: a textarea over a mirror that draws the dots where the lines really wrap. */
  private bulletsField(label: string, list: string[], placeholder: string, save: (list: string[]) => void) {
    return html`<div class="bullets">
      <div class="mirror" aria-hidden="true">${list.map((b) => html`<div class=${b.trim() ? 'on' : ''}>${b || '​'}</div>`)}</div>
      <textarea placeholder=${placeholder} aria-label=${label} .value=${list.join('\n')} @focus=${(e: Event) => (this.field = e.target as HTMLTextAreaElement)} @keydown=${(e: KeyboardEvent) => (this.onMarkKey(e), this.onTab(e))} @input=${(e: Event) => save((e.target as HTMLTextAreaElement).value.split('\n'))}></textarea>
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
    const subDef = s.sub ? resolve(s.sub).def : undefined;
    // What kind of slide this is, in a word: its layout, or what it shows.
    const kindName = subDef ? (subDef.id === 'sheet' ? 'Table' : subDef.id === 'trip' ? 'Map' : subDef.id === 'draw' ? 'Drawing' : subDef.name) : LAYOUTS.find((l) => l.id === kind)!.name;
    const tint = ICON_COLORS[this.doc.color]?.hex ?? ICON_COLORS[''].hex;
    const fit = `--title:${L.titlePx};--body:${L.bodyPx};--icon:${tint}`;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Slides">
        ${tool('Slide', 'plus', () => this.add(), { text: true, disabled: n >= MAX_SLIDES })}
        <sl-dropdown class="deck-kind" hoist @sl-select=${(e: CustomEvent) => this.pickKind(e.detail.item.value)}>
          <sl-button slot="trigger" size="small" caret>${icon(UI.columns, 14)} <span class="sr-only">Slide type: </span>${kindName}</sl-button>
          <sl-menu>
            <sl-menu-label>Add a slide</sl-menu-label>
            ${LAYOUTS.map((l) => html`<sl-menu-item type="checkbox" value="layout:${l.id}" ?checked=${!s.sub && kind === l.id}>${l.name}</sl-menu-item>`)}
            <sl-divider></sl-divider>
            <sl-menu-label>Add a slide showing a</sl-menu-label>
            ${insertMenu('deck')}
          </sl-menu>
        </sl-dropdown>
        ${tool('Delete slide', 'trash', () => this.removeSlide())}
        <sl-button-group label="Reorder">
          ${tool('Move slide up', 'up', () => this.move(-1), { disabled: this.cur === 0 })}
          ${tool('Move slide down', 'down', () => this.move(1), { disabled: this.cur === n - 1 })}
        </sl-button-group>
        <sl-button-group label="Text">
          ${tool('Bold', 'bold', () => this.mark('*'))}${tool('Italic', 'italic', () => this.mark('_'))}${tool('Underline', 'underline', () => this.mark('^'))}${tool('Strike', 'strike', () => this.mark('~'))}${tool('Highlight', 'highlight', () => this.mark('='))}
        </sl-button-group>
        <sl-button size="small" @click=${this.inlineIcon}>${icon(UI.smile, 14)} Icon in text</sl-button>
        <sl-button-group label="Indent">
          ${tool('Bring the bullet out', 'outdent', () => this.indent(true))}${tool('Indent the bullet', 'indent', () => this.indent(false))}
        </sl-button-group>
        <sl-button size="small" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 14) : icon(UI.smile, 14)} Icon</sl-button>
        <span class="to-spacer"></span>
        <sl-select class="sr-label deck-transition" size="small" label="Transition" hoist .value=${this.doc.transition || 'fade'} @sl-change=${(e: Event) => this.commit({ ...this.doc, transition: (((e.target as SlSelect).value as string) === 'fade' ? '' : (e.target as SlSelect).value) as Transition })}>
          ${TRANSITIONS.map((t) => html`<sl-option value=${t.id || 'fade'}>${t.name}</sl-option>`)}
        </sl-select>
        <span class="to-hint">${n} ${n === 1 ? 'slide' : 'slides'}</span>
        <sl-button size="small" variant="primary" @click=${() => this.show(this.cur)}>${icon(UI.play, 14)} Present</sl-button>
      </div>
      <div class="deck-layout">
        <nav class="deck-rail" aria-label="Slides">
          ${this.slides.map((sl, i) => {
            const p = slidePage(sl, Infinity, undefined, this.doc.color);
            return html`<button class="deck-thumb" aria-label="Slide ${i + 1}: ${sl.title || 'untitled'}" aria-current=${i === this.cur ? 'true' : 'false'} @click=${() => (this.cur = i)}>
              <span class="n">${i + 1}</span>
              <svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(p.svg)}</svg>
            </button>`;
          })}
        </nav>
        <div class="deck-editor">
          <div class="deck-slide lay-${kind || 'b'} ${s.sub ? 'has-sub' : ''}" style=${fit}>
            ${s.sub
              ? html`<to-embed ref=${s.sub} controls @embed-edit=${this.editSub} @embed-remove=${() => this.patch(this.cur, { sub: undefined })}></to-embed>`
              : html`            <div class="head">
              <button class="pick ${s.icon ? '' : 'empty'}" title=${s.icon ? 'Change icon' : 'Add an icon'} aria-label="Slide icon" @click=${this.openPicker}>
                ${s.icon ? libraryIcon(s.icon, 32) : html`${icon(UI.smile, 20)}<span>Icon</span>`}
              </button>
              <input class="title" placeholder=${kind === 't' ? 'Title' : 'Headline'} aria-label="Headline" @focus=${(e: Event) => (this.field = e.target as HTMLInputElement)} .value=${s.title} @input=${(e: Event) => this.patch(this.cur, { title: (e.target as HTMLInputElement).value })} @keydown=${(e: KeyboardEvent) => { this.onMarkKey(e); if (!e.defaultPrevented) ((e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); this.querySelector<HTMLTextAreaElement>('.deck-slide .bullets textarea')?.focus(); } })(e); }} />
            </div>
            <div class="body">
              ${this.bulletsField('Bullets', s.bullets, kind === 't' ? 'Subtitle' : 'One bullet per line', (bullets) => this.patch(this.cur, { bullets }))}
              ${kind === '2'
                  ? this.bulletsField('Right column', s.right ?? [], 'One bullet per line', (right) => this.patch(this.cur, { right }))
                  : kind === 'i'
                    ? html`<button class="big ${s.icon ? '' : 'empty'}" aria-label="Big icon" @click=${this.openPicker}>${s.icon ? libraryIcon(s.icon, 120) : html`${icon(UI.smile, 40)}<span>Pick an icon</span>`}</button>`
                    : nothing}
            </div>`}
            ${!s.icon && !s.sub && suggested.length
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
        ${this.query.trim() ? nothing : html`<p class="deck-picker-more">Search to find any of ${iconCount().toLocaleString()} icons.</p>`}
        <div slot="footer" class="draw-colors deck-icon-color" role="radiogroup" aria-label="Icon colour, for the whole deck">
          ${Object.entries(ICON_COLORS).map(([id, c]) => html`<button role="radio" title=${c.name} aria-label=${c.name} aria-checked=${this.doc.color === id ? 'true' : 'false'} style="--c:${c.hex}" @click=${() => this.commit({ ...this.doc, color: id })}></button>`)}
        </div>
        <sl-button slot="footer" size="small" @click=${() => this.pickIcon('')}>${icon(UI.close, 14)} No icon</sl-button>
      </sl-dialog>
      ${this.showing >= 0 ? this.renderShow() : nothing}
    `;
  }

  private renderShow() {
    const s = this.slides[this.showing];
    const st = this.steps();
    const subStep = st.sub ? this.shown : undefined;
    const sub = s.sub ? resolve(s.sub) : null;
    // A map is shown live, over the place its picture would be, so it can fly from stop to stop.
    const map = sub?.def?.id === 'trip' ? layoutSlide(s).sub : undefined;
    const p = slidePage(s, this.shown, map ? 0 : subStep, this.doc.color);
    return html`<div class="deck-show" role="dialog" aria-modal="true" aria-label="Presentation" @click=${this.onShowClick}>
      ${this.leaving >= 0 && this.slides[this.leaving]
        ? keyed(this.leaving, html`<div class="was tr-${this.doc.transition || 'fade'} ${this.forwards ? '' : 'back'}" aria-hidden="true"><svg viewBox="0 0 ${SW} ${SH}">${unsafeSVG(slidePage(this.slides[this.leaving], Infinity, undefined, this.doc.color).svg)}</svg></div>`)
        : nothing}
      ${keyed(
        this.showing,
        html`<div class="frame tr-${this.doc.transition || 'fade'} ${this.forwards ? '' : 'back'}">
          <svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${s.title}">${unsafeSVG(p.svg)}</svg>
          ${map && sub ? html`<to-trip class="deck-map" present .value=${sub.body} .step=${subStep ?? 0} style="left:${(map.x / SW) * 100}%;top:${(map.y / SH) * 100}%;width:${(map.w / SW) * 100}%;height:${(map.h / SH) * 100}%" @click=${(e: Event) => e.stopPropagation()}></to-trip>` : nothing}
        </div>`,
      )}
      <p class="sr-only" aria-live="polite">Slide ${this.showing + 1} of ${this.slides.length}: ${s.title}</p>
      <sl-button-group class="ctl" label="Presentation" @click=${(e: Event) => e.stopPropagation()}>
        ${tool('Previous', 'left', () => this.back(), { disabled: this.showing === 0 && this.shown === 0 })}
        ${tool('Next', 'right', () => this.forward())}
        ${this.present ? tool('Edit this deck', 'pen', () => this.show(-1), { text: true }) : tool('Exit', 'close', () => this.show(-1))}
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
