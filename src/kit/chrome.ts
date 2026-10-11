/**
 * <to-chrome>: where things sit round a document. The page is never taller than the visible window: this element is
 * a column exactly the visual viewport's height (set from `visualViewport.height` as it resizes, the window put back
 * at its top whenever the browser slides it), with the header at its top, the banners under it (arriving by a short
 * link; another version kept here; a newer Tiny Little Office), and `.to-main` under them, which scrolls by itself and
 * holds the document. The app's bar has a place of its own in the column, `.to-column.barred`: at the column's top on a
 * wide screen, under the header as it always was, and at its bottom under a finger, so on a phone it sits above the
 * keyboard as one scrolling row, wherever the words are scrolled. Every scroll-to goes through kit/scroll.ts. The
 * title, tapped or focused, opens a second row of the header with the field across it, at a size that can be read
 * (Paul: "The title is too small to edit"), a new document's automatic name (`fresh`) chosen whole so typing replaces
 * it; Enter keeps what was typed, Escape puts back what was there (either gives the focus back where it was, or to the
 * column), a tap elsewhere closes it.
 *
 * On a phone the bar comes with the focus (Paul, 2026-10-10: "We could also just hide the secondary bar unless we are
 * editing"): `indoc` says something in the document has the focus from the person's own tap or key (words, a cell, a
 * canvas, a chosen row, the bar itself; not the focus a document opens with), and kit.css slides the bar under the column's foot while it is not set (reading), with the glide; an editor whose keys
 * are the document says `data-bar="always"` (the Calculator). What of the bar needs nothing in hand is a row of the
 * drawer's This document too (kit/drawer.ts). At the bar's end is the command palette's button (kit/palette.ts).
 *
 * Paul, 2026-10-10: "when editing, the top nav vanishes except for the hamburger. The secondary nav is now aligned
 * bottom." Under a coarse pointer, while a box has the focus (a `<to-text>`, a field in an app, a page in a frame)
 * from a person's tap or key (not the focus a document opens with, which raises no keyboard), `editing` is set and
 * the header hides; the menu button alone stays, slid into the column's very top inline corner and translucent there
 * ("Make the hamburger translucent when I'm editing. Maybe even move it further top right animating it so that it
 * doesn't bump text or content I'm editing"), opaque again under a hover or a key's focus, and the header comes back
 * when the focus leaves (a tap outside, Escape out of the box, Done), the button sliding back into its row. The menu
 * button is at the inline end on every screen (the right in a left-to-right language): the words begin at the inline
 * start, so a button there would cover the first line and the caret, and on an iPhone the left edge is Safari's back swipe.
 *
 * The bar glides (Paul: "When the keyboard appears and disappears it jumps and it's overwhelming. Could move briskly or
 * fade in and fade out"): under a finger the column's height follows the visible window through a transition of a
 * fifth of a second (kit.css), and while it moves `gliding` is set and the bar fades out, back when the column settles
 * (its transitionend, a timer as the fallback). Under reduced motion the height changes at once and the fade alone
 * remains. The caret is kept in sight once the column has settled, not in flight (kit/scroll.ts gliding(), which kit/text.ts asks).
 *
 * Why a column: Safari on iOS does not make the page shorter for the keyboard, only the visible window, so a bar
 * stuck to the page's top had to be measured into place after events that came late or never (round seven's
 * --to-vv-top and its frame-by-frame watch). A column the visible window's height puts the bar where it belongs with
 * nothing measured but the window. The price: Safari's toolbar no longer collapses as the words scroll, since the
 * page itself never does (docs/kernel.md §9).
 *
 * The app's icon at the header's inline start is the way home, "#/" (Paul, 2026-10-10: "I need a way to get back to the
 * home state. Maybe the top left icon could do that"); a new document of the app is the drawer's first row under This
 * document. A document that lives nowhere but its link is asked about before it is left: the shell's (kit/shell.ts).
 *
 * The shell hands it what to draw: `doc`, the document the header names (none: the home page's name), with its
 * title, its signed state and how much of the link it uses (Share and Download are the drawer's, kit/drawer.ts: Paul,
 * 2026-10-10, "Now the title has room to breathe"); `main` (the column's content) with its
 * `mainClass`, and `barred` when it holds an editor with a bar; or `plain`, the Display Link's line (the title and
 * Edit) or the embed's (the title and Open in Tiny Little Office), with no menu button and no bar. It speaks back by
 * events: `to-drawer-open` (the menu button), `to-palette-open` (the command palette's button, at the bar's end), `to-share-open` (the meter, a short link's Extend: detail.short),
 * `to-retitle` (detail: the name typed), `to-copy-new`, `to-arrival-close`, `to-other-close`.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef } from './app.ts';
import { budgetFor } from './codec.ts';
import { routeHash } from './route.ts';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { ago, type Kept } from './library.ts';
import { expiresSentence, timeLeft } from './short.ts';
import { pinWindow, reveal } from './scroll.ts';
import { cmdTool } from './bar.ts';
import { PALETTE } from './keys.ts';

/** The document the header names. */
export interface DocHead {
  def: AppDef;
  /** What it is called, and what the title box holds (its own name, or a new one's automatic name). */
  title: string;
  value: string;
  /** Locked: the name alone (said as locked), no box, no Share. */
  locked: boolean;
  /** The signed state (kit/privacy-dialog.ts trustButton). */
  trust: TemplateResult;
  /** How much of the link the document uses. */
  used: number;
}
/** The Display Link's line, or the embed's: the title, and Edit or Open in Tiny Little Office. */
export interface Plain {
  kind: 'display' | 'embed';
  title: string;
  href: string;
  /** A deck's show link: the reader can present it without editing (Paul, 2026-10-10: on a phone there was no way to play a deck from its link). */
  present?: string;
  trust?: TemplateResult;
  locked?: boolean;
}

/** What a person types in: while one of these has the focus, the header steps aside on a phone. */
const BOX = 'to-text, input, textarea, select, [contenteditable="true"], iframe';
/** The column's glide, a little longer than its transition (kit.css): the fallback should transitionend never come. */
const GLIDE_MS = 260;

/** What a box hands the focus to and back from without the person having left it: the bar, a menu, a popover, a dialog. */
const ASIDE = 'to-bar, to-context, [popover], dialog, to-dialog, to-link-pop, to-complete';

/** When a tap last made a new document (the home page's rows and templates, the drawer's New): its editor, once drawn, is the person's to type in. */
let madeAt = -Infinity;
/**
 * A new document is being made by the person's own tap: it arrives with the focus in its first box and, on a phone, the
 * keyboard up and the bar shown (Paul, 2026-10-11: "When I make a new doc of any kind I should land on it open with
 * focus on the first node"). iOS raises the keyboard only for a focus taken in the gesture itself, and the editor is
 * drawn later: so a hidden box takes the focus now, and the editor's first box takes it from there when it is drawn,
 * the keyboard staying up between the two. The focus a shared link opens with is still not the person's.
 */
export function startEditing(): void {
  madeAt = performance.now();
  if (!matchMedia('(pointer: coarse)').matches) return;
  let hold = document.querySelector<HTMLElement>('.to-keyboard-hold');
  if (!hold) {
    hold = document.createElement('div');
    hold.className = 'to-keyboard-hold';
    hold.contentEditable = 'true';
    hold.tabIndex = -1;
    hold.setAttribute('aria-hidden', 'true');
    hold.addEventListener('focusout', () => hold!.remove());
    document.body.append(hold);
  }
  hold.focus({ preventScroll: true });
}

export class ToChrome extends LitElement {
  static properties = {
    doc: { attribute: false },
    plain: { attribute: false },
    main: { attribute: false },
    mainClass: { attribute: false },
    label: { attribute: false },
    barred: { type: Boolean },
    fresh: { attribute: false },
    titling: { state: true },
    editing: { type: Boolean, reflect: true },
    indoc: { type: Boolean, reflect: true },
    expires: { type: Number },
    extend: { type: Boolean },
    inDisplay: { type: Boolean },
    other: { attribute: false },
    newer: { type: Boolean },
  };
  declare doc: DocHead | null;
  declare main: unknown;
  declare mainClass: string;
  declare label: string;
  /** The column holds an editor with a bar: the bar's place is kept for it. */
  declare barred: boolean;
  /** The Display Link or the embed: its own line, no menu button, no bar. */
  declare plain: Plain | null;
  /** The title box shows a new document's automatic name, to be chosen whole when focused; '' otherwise. */
  declare fresh: string;
  /** The title being edited: the header's second row. */
  declare titling: boolean;
  private titleWas = '';
  /** What had the focus before the title: it has it again after Enter or Escape. */
  private titleFrom: HTMLElement | null = null;
  /** A box has the focus: on a phone the header steps aside (kit.css). */
  declare editing: boolean;
  /** Something in the document has the focus (words, a cell, a canvas, a chosen row, its bar): on a phone the bar is shown (kit.css). */
  declare indoc: boolean;
  /** Arrived by a short link that expires then (ms since the epoch); 0: no banner. */
  declare expires: number;
  /** The banner offers Extend (the owner's link). */
  declare extend: boolean;
  declare inDisplay: boolean;
  /** Another version of this document kept here, offered in a quiet line; `newer`: the link is from a newer Tiny Little Office. */
  declare other: Kept | null;
  declare newer: boolean;
  private sized?: ResizeObserver;

  constructor() {
    super();
    this.doc = null;
    this.main = nothing;
    this.mainClass = 'to-main';
    this.label = '';
    this.barred = false;
    this.plain = null;
    this.fresh = '';
    this.titling = false;
    this.editing = false;
    this.indoc = false;
    this.expires = 0;
    this.extend = false;
    this.inDisplay = false;
    this.other = null;
    this.newer = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    window.visualViewport?.addEventListener('resize', this.fit);
    window.visualViewport?.addEventListener('scroll', pinWindow);
    window.addEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.addEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, this.onPerson, true);
    window.addEventListener('hashchange', this.opened);
    this.addEventListener('transitionend', this.onGlided);
    this.addEventListener('scroll', this.pinSelf, true);
    this.fit();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.visualViewport?.removeEventListener('resize', this.fit);
    window.visualViewport?.removeEventListener('scroll', pinWindow);
    window.removeEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.removeEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.removeEventListener(type, this.onPerson, true);
    window.removeEventListener('hashchange', this.opened);
    this.removeEventListener('transitionend', this.onGlided);
    this.removeEventListener('scroll', this.pinSelf, true);
    clearTimeout(this.settleTimer);
    this.sized?.disconnect();
  }

  /** The column: what scrolls. */
  get column(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.to-column > main');
  }

  /** The column the visible window's height (the layout viewport's while a desktop's pinch has zoomed in), the window at its top. */
  private fit = () => {
    const vv = window.visualViewport;
    const h = `${vv && vv.scale <= 1.01 ? vv.height : window.innerHeight}px`;
    // Under a finger a change of height is the keyboard: the bar fades while the column glides (kit.css), back when it settles.
    if (this.style.height && this.style.height !== h && matchMedia('(pointer: coarse)').matches) this.glide();
    this.style.height = h;
    pinWindow();
  };
  /**
   * The chrome and its column hold still: only `main` scrolls. The browser scrolls any box to bring a focused element
   * into view, a hidden one too (the bar's button, focused while the bar is away under the column's foot, scrolled the
   * chrome up by the header's height: the walks found it); so as the window is pinned (scroll.ts pinWindow), these are.
   */
  private pinSelf = (e: Event) => {
    const box = e.target as HTMLElement;
    if ((box === this || box.classList?.contains('to-column')) && (box.scrollTop || box.scrollLeft)) box.scrollTo(0, 0);
  };
  private settleTimer = 0;
  private glide() {
    this.toggleAttribute('gliding', true);
    clearTimeout(this.settleTimer);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.settleTimer = window.setTimeout(this.settle, reduced ? 140 : GLIDE_MS);
  }
  /** The column settled: the bar back, and the caret (where a box has it) kept in sight of what is left above the keyboard. */
  private settle = () => {
    clearTimeout(this.settleTimer);
    if (!this.hasAttribute('gliding')) return;
    this.removeAttribute('gliding');
    const at = document.activeElement;
    const sel = document.getSelection();
    if (!this.editing || !at || !this.contains(at) || !sel?.rangeCount || !at.contains(sel.anchorNode)) return;
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (r.height) reveal(at, { rect: r, margin: 8 });
  };
  private onGlided = (e: TransitionEvent) => e.target === this && e.propertyName === 'height' && this.settle();

  /** When the person last touched, clicked or pressed a key: a box focused by the page itself (a document opening) is not editing. */
  private touched = -Infinity;
  /** Another document opened: not editing it yet, whatever had the focus; unless the person's own tap just made it (startEditing), which counts as their tap into it, once. */
  private opened = () => {
    this.editing = false;
    this.indoc = false;
    this.touched = performance.now() - madeAt < 3000 ? performance.now() : -Infinity;
    madeAt = -Infinity;
  };
  private onPerson = (e: Event) => {
    // A tap on the bar, in a menu or on the header acts on the box in hand (or elsewhere) without being a tap into it.
    if ((e.target as Element | null)?.closest?.(`${ASIDE}, .to-burger, .to-header`)) return;
    this.touched = performance.now();
    this.onFocus(e);
  };
  /**
   * A box took the focus or left it. Taken in a person's own gesture (a tap, a key), or typed in, it is editing; the
   * focus a document is opened with is not (iOS raises no keyboard for it), so the header stays until the first tap.
   * A hop to the bar, a menu or a dialog and back is neither.
   */
  private onFocus = (e: Event) => {
    const typed = e.type === 'beforeinput';
    requestAnimationFrame(() => {
      const at = document.activeElement;
      // The document has the focus from the person (its bar, its menus and its dialogs are the document's too): on a phone
      // its bar comes with it. The focus a document opens with is not theirs (they are reading), as for `editing`.
      const main = this.column;
      const inside = !!at && !!main && main !== at && main.contains(at);
      const indoc = inside && (this.indoc || typed || performance.now() - this.touched < 1000);
      if (indoc !== this.indoc) {
        this.indoc = indoc;
        // The bar arriving or leaving changes the column's room: the same glide as a keyboard's, the caret kept in sight once it settles.
        if (matchMedia('(pointer: coarse)').matches) this.glide();
      }
      if (at && at !== document.body && at.closest(ASIDE)) return;
      const box = !!at && this.contains(at) && !at.closest('.to-header') && !!at.closest(BOX);
      const editing = box && (this.editing || typed || performance.now() - this.touched < 1000);
      if (editing !== this.editing) this.editing = editing;
    });
  };

  protected updated() {
    // The column's height, for what fills it (a canvas, a map, a site's frame): --to-col-h.
    const col = this.column;
    if (!col || this.sized) return;
    // Set a frame later: what it sizes is in the column, and a change it makes is never this observer's to hear again at once.
    const set = () => this.style.getPropertyValue('--to-col-h') !== `${col.clientHeight}px` && this.style.setProperty('--to-col-h', `${col.clientHeight}px`);
    this.sized = new ResizeObserver(() => requestAnimationFrame(set));
    this.sized.observe(col);
  }

  /** The title focused: the wide row opens, an automatic name chosen whole (WebKit puts the caret where the tap landed after the focus, so again then). */
  private openTitle = (e: FocusEvent) => {
    const field = e.target as HTMLInputElement;
    if (!field.matches('input.to-title')) return;
    this.titleWas = field.value;
    this.titleFrom = e.relatedTarget instanceof HTMLElement && !this.querySelector('.to-header')?.contains(e.relatedTarget) ? e.relatedTarget : null;
    this.titling = true;
    if (!this.fresh) return;
    field.select();
    const again = () => setTimeout(() => document.activeElement === field && field.value === this.fresh && field.select());
    document.addEventListener('pointerup', again, { once: true, capture: true });
    void this.updateComplete.then(again);
  };
  /** Enter keeps what was typed, Escape puts back what was there; either closes the row (and so does a tap elsewhere). */
  private titleKey = (e: KeyboardEvent) => {
    const field = e.target as HTMLInputElement;
    if (!field.matches('input.to-title') || (e.key !== 'Escape' && e.key !== 'Enter')) return;
    e.preventDefault();
    if (e.key === 'Escape') {
      e.stopPropagation();
      field.value = this.titleWas;
    }
    // The focus goes back where it was (the words, a cell), or to the column, never to nothing (the walks found it on the body).
    const back = this.titleFrom?.isConnected ? this.titleFrom : this.column;
    if (back) back.focus({ preventScroll: true });
    else field.blur();
  };

  private say(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  }

  /** Arrived by a short link: how long it has left, big and coloured by how soon; small while a box has the focus on a phone. */
  private renderArrival() {
    if (!this.expires) return nothing;
    const { urgency } = timeLeft(this.expires);
    return html`<div class="to-arrival ${urgency} ${this.inDisplay ? 'in-display' : ''}" role="region" aria-label=${t('Short link')}>
      <p class="to-arrival-words">${expiresSentence(this.expires)}</p>
      <div class="to-arrival-acts">
        <button type="button" class="to-btn to-arrival-copy" @click=${() => this.say('to-copy-new')}>${icon(UI.copy, 16)}<span>${t('Copy into a new document')}</span></button>
        ${this.extend ? html`<button type="button" class="to-btn to-arrival-extend" @click=${() => this.say('to-share-open', { short: true })}>${icon(UI.calendar, 16)}<span>${t('Extend')}</span></button>` : nothing}
      </div>
      <button type="button" class="to-btn to-tool to-arrival-close" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.say('to-arrival-close')}>${icon(UI.close, 20)}</button>
    </div>`;
  }

  /** Another version of this document is kept on this device (or the link is from a newer Tiny Little Office): a quiet line above the document. */
  private renderOther() {
    if (this.newer) return html`<div class="to-other" role="status"><p>${t('This link was made by a newer Tiny Little Office. Reload the page to get it.')}</p></div>`;
    const k = this.other;
    if (!k) return nothing;
    return html`<div class="to-other" role="region" aria-label=${t('Another version')}>
      <p>${t('This device keeps another version of “{title}”, from {when}.', { title: k.title, when: ago(k.at, document.documentElement.lang) })}</p>
      <a class="to-btn to-other-open" href=${k.hash}>${t('Open it')}</a>
      <button type="button" class="to-btn to-tool" aria-label=${t('Close')} title=${t('Close')} @click=${() => this.say('to-other-close')}>${icon(UI.close, 18)}</button>
    </div>`;
  }

  /** The header's words for a document: the way home (the app's icon), the title (which has the room), the signed state, the room left in the link (a tap: Share). */
  private renderDoc(d: DocHead) {
    const home = t('Home');
    const here = html`<a class="to-here" href="#/" title=${home} aria-label=${home}>${icon(d.def.icon, 24)}</a>`;
    if (d.locked) return html`${here}<h1 class="to-title to-title-locked">${d.title}</h1>${d.trust}`;
    const { available } = budgetFor(`${location.origin}${location.pathname}${routeHash(d.def.id)}/`);
    const left = available - d.used;
    const pct = Math.min(1, d.used / Math.max(1, available));
    const c = 2 * Math.PI * 9;
    const room = left < 0 ? t('{n} characters over the link limit', { n: -left }) : t('{n} of {max} link characters left', { n: left, max: available });
    const share = () => this.say('to-share-open');
    return html`${here}<h1 class="sr-only">${d.title}</h1>
      <input class="to-title" type="text" placeholder=${t('Untitled {noun}', { noun: d.def.noun })} aria-label=${t('Title')} autocomplete="off" enterkeyhint="done" .value=${d.value} @change=${(e: Event) => this.say('to-retitle', (e.target as HTMLInputElement).value.trim())} />
      ${d.trust}
      <button type="button" class="to-btn to-tool to-meter ${left < 0 ? 'over' : pct > 0.85 ? 'warn' : ''}" aria-label=${room} title=${room} @click=${share}>
        <svg class="to-icon" width="24" height="24" style="--i:1.5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray=${`${c * pct} ${c}`} transform="rotate(-90 12 12)"/></svg>
      </button>`;
  }

  /** The Display Link: its pages under a line with the title and Edit. The embed: the pages under the title and Open in Tiny Little Office. */
  private renderPlain(p: Plain) {
    const head =
      p.kind === 'embed'
        ? html`<header class="to-embed-head"><span class="to-embed-title">${p.title}</span><a class="to-btn to-embed-open" href=${p.href} target="_blank" rel="noopener">${icon(UI.open, 16)}<span>${t('Open in Tiny Little Office')}</span></a></header>`
        : html`<header class="to-display-head"><h1 class="to-display-title">${p.title}</h1>${p.trust}${p.present ? html`<a class="to-btn primary to-display-present" href=${p.present}>${icon(UI.play, 16)}<span>${t('Present')}</span></a>` : nothing}<a class="to-btn ${p.present ? '' : 'primary'} to-display-edit" href=${p.href}>${icon(UI.pen, 16)}<span>${t('Edit')}</span></a></header>`;
    const cls = p.kind === 'embed' ? `to-display to-embed ${p.locked ? 'to-embed-locked' : ''}` : 'to-display';
    // The pages scroll and hold nothing to tab to: the column itself is in the tab order, to scroll by the keys.
    return html`${head}${this.renderArrival()}<div class="to-column"><main class=${cls} tabindex="0" aria-label=${p.title}>${this.main}</main></div>`;
  }

  render() {
    if (this.plain) return this.renderPlain(this.plain);
    // The menu button is a hamburger (Paul, 2026-10-10: "Make the hamburger a hamburger"); the mark is the drawer's.
    const burger = html`<button type="button" class="to-btn to-tool to-burger" aria-label=${t('Menu')} title=${t('Tiny Little Office menu')} aria-haspopup="dialog" @click=${() => this.say('to-drawer-open')}>${icon(UI.menu, 24)}</button>`;
    const head = html`<header class="to-header ${this.titling ? 'titling' : ''}" aria-label=${t('Tiny Little Office')} @focusin=${this.openTitle} @focusout=${() => (this.titling = false)} @keydown=${this.titleKey}>${this.doc ? this.renderDoc(this.doc) : html`<a class="to-brand" href="#/">${t('Tiny Little Office')}</a>`}</header>`;
    // The command palette's button at the bar's end (kit/palette.ts): the kit's, in the bar's row, after whatever the app's bar holds.
    const palette = this.barred ? cmdTool(PALETTE, { palette: () => this.say('to-palette-open') }, { cls: 'to-palette-btn' }) : nothing;
    return html`${burger}${head}${this.renderArrival()}${this.renderOther()}<div class="to-column ${this.barred ? 'barred' : ''}">
      <main class=${this.mainClass} tabindex="-1" aria-label=${this.label || nothing}>${this.main}</main>${palette}
    </div>`;
  }
}
customElements.define('to-chrome', ToChrome);
