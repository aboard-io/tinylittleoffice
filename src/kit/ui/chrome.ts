/**
 * <to-chrome>: where things sit round a document. The page is never taller than the visible window: this element is
 * a column exactly the visual viewport's height (set from `visualViewport.height` as it resizes, the window put back
 * at its top whenever the browser slides it), with the header at its top, the banners under it (arriving by a short
 * link; another version kept here; a newer Tiny Little Office), and `.to-main` under them, which scrolls by itself and
 * holds the document. The app's bar has a place of its own in the column, `.to-column.barred`: at the column's top on a
 * wide screen, under the header as it always was, and at its bottom under a finger, so on a phone it sits above the
 * keyboard as one scrolling row, wherever the words are scrolled. Every scroll-to goes through kit/ui/scroll.ts. The
 * title, tapped or focused, opens a second row of the header with the field across it, at a size that can be read
 * (Paul: "The title is too small to edit"), a new document's automatic name (`fresh`) chosen whole so typing replaces
 * it; Enter keeps what was typed, Escape puts back what was there (either gives the focus back where it was, or to the
 * column), a tap elsewhere closes it.
 *
 * On a phone the bar comes with the focus (Paul, 2026-10-10: "We could also just hide the secondary bar unless we are
 * editing"): `indoc` says something in the document has the focus from the person's own tap or key (words, a cell, a
 * canvas, a chosen row, the bar itself; not the focus a document opens with), and page.css slides the bar under the column's foot while it is not set (reading), with the glide; an editor whose keys
 * are the document says `data-bar="always"` (the Calculator). What of the bar needs nothing in hand is a row of the
 * drawer's This document too (kit/ui/drawer.ts).
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
 * fifth of a second (page.css), and while it moves `gliding` is set and the bar fades out, back when the column settles
 * (its transitionend, a timer as the fallback). Under reduced motion the height changes at once and the fade alone
 * remains. The caret is kept in sight once the column has settled, not in flight (kit/ui/scroll.ts gliding(), which kit/text/text.ts asks).
 *
 * Why a column: Safari on iOS does not make the page shorter for the keyboard, only the visible window, so a bar
 * stuck to the page's top had to be measured into place after events that came late or never (a
 * frame-by-frame watch of the visible window's top). A column the visible window's height puts the bar where it belongs with
 * nothing measured but the window. The price: Safari's toolbar no longer collapses as the words scroll, since the
 * page itself never does (docs/kernel.md §7).
 *
 * The app's icon at the header's inline start is the way home, "#/" (Paul, 2026-10-10: "I need a way to get back to the
 * home state. Maybe the top left icon could do that"); a new document of the app is the drawer's first row under This
 * document. A document that lives nowhere but its link is asked about before it is left: the shell's (kit/core/shell.ts).
 *
 * The shell hands it what to draw: `doc`, the document the header names (none: the home page's name), with its
 * title, the lock while it has a password and how much of the link it uses (Share and Download are the drawer's, kit/ui/drawer.ts: Paul,
 * 2026-10-10, "Now the title has room to breathe"); `main` (the column's content) with its
 * `mainClass`, and `barred` when it holds an editor with a bar; or `plain`, the Display Link's line (the title and
 * Edit) or the embed's (the title and Open in Tiny Little Office), with no menu button and no bar. It speaks back by
 * events: `to-display-text` (the Display Link's Text or Pages), `to-drawer-open` (the menu button), `to-rooms-open` (the meter: Share with its table of where the link fits open),
 * `to-retitle` (detail: the name typed), `to-copy-new`, `to-arrival-close`, `to-other-close`, `to-copies-close` (the
 * Display Link's line that says a link is a copy, `plain.copies`).
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import type { AppDef } from '../core/app.ts';
import { budgetFor } from '../core/codec.ts';
import { routeHash } from '../core/route.ts';
import { icon, UI } from '../draw/icons.ts';
import { t } from '../core/i18n.ts';
import { ago, type Kept } from '../share/library.ts';
import { expiresSentence, SHORT_LINK_MAX, timeLeft } from '../share/short.ts';
import { pinWindow, redrawCaret, revealCaret } from './scroll.ts';
import { BAR_HERE, keysAria } from './bar.ts';
import { SHARE } from '../core/keys.ts';

/** The document the header names. */
export interface DocHead {
  def: AppDef;
  /** What it is called, and what the title box holds (its own name, or a new one's automatic name). */
  title: string;
  value: string;
  /** Locked: the name alone (said as locked), no box, no Share. */
  locked: boolean;
  /** The lock while it has a password (kit/ui/privacy-dialog.ts trustButton). */
  trust: TemplateResult | typeof nothing;
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
  trust?: TemplateResult | typeof nothing;
  locked?: boolean;
  /** Arrived by someone else's link: the line that says it is a copy, under the header (closed: `to-copies-close`). */
  copies?: boolean;
  /** The Display Link shown as its words rather than its pages: its button says Pages, and the column is not a picture. */
  reading?: boolean;
}

/** What a person types in: while one of these has the focus, the header steps aside on a phone. */
const BOX = 'to-text, input, textarea, select, [contenteditable="true"], iframe';
/** The column's glide, a little longer than its transition (page.css): the fallback should transitionend never come. */
const GLIDE_MS = 260;

/** What a box hands the focus to and back from without the person having left it: the bar, a menu, a popover, a dialog. */
const ASIDE = 'to-bar, to-context, [popover], dialog, to-dialog, to-link-pop, to-complete';

/**
 * What page.css slides away under a finger, by its own selectors: the app's bar while the
 * person reads (no `indoc`), and under a docked context row. What is away is inert as well, out of Tab's order and a
 * screen reader's swipes, set wherever those flags change (stow), so the look and the flag change together.
 */
const AWAY = [
  "to-chrome:not([indoc]) .to-column.barred > main > .to-editor:not([data-bar='always']) to-bar:not(:is(dialog, [popover], .to-dialog, .deck-show) *)",
  ':root[data-context-row] .to-column.barred > main > .to-editor to-bar:not(:is(dialog, [popover], .to-dialog, .deck-show) *)',
].join(', ');
const COARSE = '(pointer: coarse)';

/** When a tap last made a new document (the home page's rows and templates, the drawer's New): its editor, once drawn, is the person's to type in. */
let madeAt = -Infinity;
/**
 * A new document is being made by the person's own tap: it arrives with the focus in its first box and, on a phone, the
 * keyboard up and the bar shown (Paul, 2026-10-11: "When I make a new doc of any kind I should land on it open with
 * focus on the first node"). iOS raises the keyboard only for a focus taken in the gesture itself, and the editor is
 * drawn later: so a hidden box takes the focus now, and the editor's first box takes it from there when it is drawn,
 * the keyboard staying up between the two; where the tap opens nothing new, the document on view takes it. The focus a
 * shared link opens with is still not the person's.
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
    // iOS draws a focused box's caret itself, whatever the box's opacity (Paul, 2026-10-13: "There's a big black area the cursor is in it. Then it focuses"): the hold's is transparent (page.css).

    hold.addEventListener('focusout', () => hold!.remove());
    document.body.append(hold);
  }
  hold.focus({ preventScroll: true });
  // A tap whose link is the one on view (Blank, on a blank document of the app) opens nothing, and nothing would take the
  // focus from the hold: the document on view takes it where a person starts, as a new one would (docs/editing.md §1).
  // A link that goes has changed the address by now; one the shell asks about first has its dialog holding the focus.
  const was = location.hash;
  setTimeout(() => {
    if (document.activeElement !== hold || location.hash !== was) return;
    const editor = document.querySelector<HTMLElement & { focusFirst?(): unknown }>('main.to-main .to-editor');
    if (editor?.focusFirst) void editor.focusFirst();
    else document.querySelector<HTMLElement>('main.to-main')?.focus({ preventScroll: true });
  });
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
  /** A box has the focus: on a phone the header steps aside (page.css). */
  declare editing: boolean;
  /** Something in the document has the focus (words, a cell, a canvas, a chosen row, its bar): on a phone the bar is shown (page.css). */
  declare indoc: boolean;
  /** Arrived by a short link that expires then (ms since the epoch); 0: no banner. */
  declare expires: number;
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
    window.visualViewport?.addEventListener('scroll', this.pin);
    window.addEventListener('scroll', this.pin);
    window.addEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.addEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, this.onPerson, true);
    window.addEventListener('hashchange', this.opened);
    this.addEventListener('transitionend', this.onGlided);
    this.addEventListener('scroll', this.pinSelf, true);
    // A bar drawn (a document opened, a bar lent to a dialog and back), a context row docked, a finger arriving: stowed again.
    document.addEventListener(BAR_HERE, this.stow);
    this.rowWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-context-row'] });
    matchMedia(COARSE).addEventListener('change', this.stow);
    this.fit();
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.visualViewport?.removeEventListener('resize', this.fit);
    window.visualViewport?.removeEventListener('scroll', this.pin);
    window.removeEventListener('scroll', this.pin);
    window.removeEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.removeEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.removeEventListener(type, this.onPerson, true);
    window.removeEventListener('hashchange', this.opened);
    this.removeEventListener('transitionend', this.onGlided);
    this.removeEventListener('scroll', this.pinSelf, true);
    document.removeEventListener(BAR_HERE, this.stow);
    this.rowWatch.disconnect();
    matchMedia(COARSE).removeEventListener('change', this.stow);
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
    // Under a finger a change of height is the keyboard: the bar fades while the column glides (page.css), back when it settles.
    if (this.style.height && this.style.height !== h && matchMedia('(pointer: coarse)').matches) this.glide();
    this.style.height = h;
    this.pin();
  };
  /**
   * The chrome and its column hold still: only `main` scrolls. The browser scrolls any box to bring a focused element
   * into view, a hidden one too (the bar's button, focused while the bar is away under the column's foot, scrolled the
   * chrome up by the header's height: the walks found it); so as the window is pinned (scroll.ts pinWindow), these are.
   */
  private pinSelf = (e: Event) => {
    const box = e.target as HTMLElement;
    if ((box === this || box.classList?.contains('to-column')) && (box.scrollTop || box.scrollLeft)) {
      box.scrollTo(0, 0);
      // Put back under a caret iOS has drawn where the box had slid: drawn again where the words are.
      const at = document.activeElement;
      if (this.editing && at && this.contains(at)) redrawCaret(at);
    }
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
    this.keepCaret();
  };
  /** The caret, where a box being edited has it, inside what can be seen of the column (kit/ui/scroll.ts revealCaret, the one rule), and drawn afresh there (redrawCaret: iOS leaves its own where it first drew it). */
  private keepCaret() {
    const at = document.activeElement;
    if (!(this.editing && at && this.contains(at))) return;
    revealCaret(at);
    redrawCaret(at);
  }
  /**
   * The window slid (iOS slides it to bring a box it focused, or a caret it finds under the keyboard, into sight: a
   * scroll of the window, which the visual viewport's own `scroll` does not always tell) is put back at its top, and the
   * caret is brought into sight the column's way instead (Paul, 2026-10-11: "I keep losing my cursor in Outline
   * because it's below the keyboard"). While the column glides, it is kept once it settles.
   */
  private pin = () => {
    if (pinWindow() && !this.hasAttribute('gliding')) this.keepCaret();
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
      // A hop to a menu or a dialog of the page's own outside the column (one on the body, as kit/ui/doc-dialog.ts puts
      // its own) and back is neither: the bar stays as it was, so the focus closing it gives back is not inert.
      const aside = !inside && !!at && at !== document.body && !!at.closest(ASIDE);
      const indoc = aside ? this.indoc : inside && (this.indoc || typed || performance.now() - this.touched < 1000);
      if (indoc !== this.indoc) {
        this.indoc = indoc;
        // The bar arriving or leaving changes the column's room: the same glide as a keyboard's, the caret kept in sight once it settles.
        if (matchMedia('(pointer: coarse)').matches) this.glide();
      }
      if (at && at !== document.body && at.closest(ASIDE)) return;
      const box = !!at && this.contains(at) && !at.closest('.to-header') && !!at.closest(BOX);
      const editing = box && (this.editing || typed || performance.now() - this.touched < 1000);
      if (editing !== this.editing) {
        this.editing = editing;
        // The header stepping aside moves the words under a caret iOS has already drawn: drawn again once the page is laid out (while the column glides, settle() does it; nothing is kept in flight).
        if (editing)
          requestAnimationFrame(() => {
            const at = document.activeElement;
            if (this.editing && at && this.contains(at) && !this.hasAttribute('gliding')) redrawCaret(at);
          });
      }
    });
  };

  /** What is slid away (AWAY) is inert; what is back is not. */
  private stow = () => {
    const finger = matchMedia(COARSE).matches;
    for (const el of document.querySelectorAll<HTMLElement>('to-bar')) {
      const away = finger && el.matches(AWAY);
      if (el.inert !== away) el.inert = away;
    }
  };
  private rowWatch = new MutationObserver(this.stow);

  protected updated() {
    this.stow();
    // The column's height, for what fills it (a canvas, a map): --to-col-h.
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
    return html`<div class="to-arrival ${urgency} ${this.inDisplay ? 'in-display' : ''}" role="region" aria-label=${t('common-short-link')}>
      <p class="to-arrival-words">${expiresSentence(this.expires)}</p>
      <div class="to-arrival-acts">
        <button type="button" class="to-btn to-arrival-copy" @click=${() => this.say('to-copy-new')}>${icon(UI.copy, 16)}<span>${t('share-copy-into-new-document')}</span></button>
      </div>
      <button type="button" class="to-btn to-tool to-arrival-close" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.say('to-arrival-close')}>${icon(UI.close, 20)}</button>
    </div>`;
  }

  /** Another version of this document is kept on this device (or the link is from a newer Tiny Little Office): a quiet line above the document. */
  private renderOther() {
    if (this.newer) return html`<div class="to-other" role="status"><p>${t('shell-this-link-was-made-by')}</p></div>`;
    const k = this.other;
    if (!k) return nothing;
    return html`<div class="to-other" role="region" aria-label=${t('shell-another-version')}>
      <p>${t('shell-this-device-keeps-another-version', { title: k.title, when: ago(k.at, document.documentElement.lang) })}</p>
      <a class="to-btn to-other-open" href=${k.hash}>${t('shell-open-it')}</a>
      <button type="button" class="to-btn to-tool" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.say('to-other-close')}>${icon(UI.close, 18)}</button>
    </div>`;
  }

  /** The header's words for a document: the way home (the app's icon), the title (which has the room), the lock, the room left in the link (a tap: Share). */
  private renderDoc(d: DocHead) {
    const home = t('common-home');
    const here = html`<a class="to-here" href="#/" title=${home} aria-label=${home}>${icon(d.def.icon, 24)}</a>`;
    if (d.locked) return html`${here}<h1 class="to-title to-title-locked">${d.title}</h1>${d.trust}`;
    const prefix = `${location.origin}${location.pathname}${routeHash(d.def.id)}/`;
    const { available } = budgetFor(prefix);
    const left = available - d.used;
    const pct = Math.min(1, d.used / Math.max(1, available));
    const c = 2 * Math.PI * 9;
    // Past some browsers' limit, the next place the link no longer fits is a short link (kit/share/limits.ts): said by name, or the room it has left.
    const shortLeft = SHORT_LINK_MAX - prefix.length - d.used;
    const room =
      shortLeft < 0
        ? t('shell-n-characters-over-what-short', { n: -shortLeft })
        : left < 0
          ? t('shell-n-characters-over-link-limit-short-link-holds-max', { n: -left, max: SHORT_LINK_MAX })
          : t('shell-n-of-max-link-characters', { n: left, max: available });
    // The meter opens Share with the table of where the link fits already open (Paul, 2026-10-16: "When I click on the circle… It brings up the share menu"): the circle is about the size.
    const rooms = () => this.say('to-rooms-open');
    return html`${here}<h1 class="sr-only">${d.title}</h1>
      <input class="to-title" type="text" placeholder=${t('common-untitled-noun', { noun: d.def.noun })} aria-label=${t('common-title')} autocomplete="off" enterkeyhint="done" .value=${d.value} @change=${(e: Event) => this.say('to-retitle', (e.target as HTMLInputElement).value.trim())} />
      ${d.trust}
      <button type="button" class="to-btn to-tool to-meter ${left < 0 ? 'over' : pct > 0.85 ? 'warn' : ''}" aria-label=${room} title=${room} @click=${rooms}>
        <svg class="to-icon" width="24" height="24" style="--i:1.5" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="3"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray=${`${c * pct} ${c}`} transform="rotate(-90 12 12)"/></svg>
      </button>`;
  }

  /** The Display Link: its pages under a line with the title, Text (its words instead, kit/text/text-view.ts) and Edit. The embed: the pages under the title and Open in Tiny Little Office. */
  private renderPlain(p: Plain) {
    const head =
      p.kind === 'embed'
        ? html`<header class="to-embed-head"><span class="to-embed-title">${p.title}</span><a class="to-btn to-embed-open" href=${p.href} target="_blank" rel="noopener">${icon(UI.open, 16)}<span>${t('common-open-in-tiny-little-office')}</span></a></header>`
        : html`<header class="to-display-head"><h1 class="to-display-title">${p.title}</h1>${p.trust}<button type="button" class="to-btn to-display-mode" @click=${() => this.say('to-display-text')}>${icon(p.reading ? UI.image : UI.text, 16)}<span>${p.reading ? t('common-pages') : t('common-text')}</span></button>${p.present ? html`<a class="to-btn primary to-display-present" href=${p.present}>${icon(UI.play, 16)}<span>${t('common-present')}</span></a>` : nothing}<a class="to-btn ${p.present ? '' : 'primary'} to-display-edit" href=${p.href}>${icon(UI.pen, 16)}<span>${t('common-edit')}</span></a></header>`;
    const cls = p.kind === 'embed' ? `to-display to-embed ${p.locked ? 'to-embed-locked' : ''}` : 'to-display';
    // The pages scroll and hold nothing to tab to: the column itself is in the tab order, to scroll by the keys.
    // The pages are a picture to two fingers (kit/core/shell.ts pinchZoom): spatial, so the size of everything is not what a pinch here sets.
    // An <aside>: a landmark of its own, so a screen reader's landmark list and axe's region rule both place it.
    const copies = p.copies
      ? html`<aside class="to-copies">
          <p>${t('common-whoever-opens-this-link-gets')}</p>
          <button type="button" class="to-btn to-tool to-copies-close" aria-label=${t('common-close')} title=${t('common-close')} @click=${() => this.say('to-copies-close')}>${icon(UI.close, 18)}</button>
        </aside>`
      : nothing;
    // Shown as words (the Display Link's Text), the column reflows: a pinch is the size of everything, as in a text.
    return html`${head}${copies}${this.renderArrival()}<div class="to-column"><main class=${cls} ?data-spatial=${!p.reading} tabindex="0" aria-label=${p.title}>${this.main}</main></div>`;
  }

  render() {
    if (this.plain) return this.renderPlain(this.plain);
    // The menu button is a hamburger (Paul, 2026-10-10: "Make the hamburger a hamburger"); the mark is the drawer's.
    const burger = html`<button type="button" class="to-btn to-tool to-burger" aria-label=${t('shell-menu')} title=${t('leave-tiny-little-office-menu')} aria-haspopup="dialog" @click=${() => this.say('to-drawer-open')}>${icon(UI.menu, 24)}</button>`;
    // Share, at the menu button's inline start on every document, floating with it while the header has stepped aside (Paul, 2026-10-13: "Put the share menu to the left of the hamburger on every document — sharing is very important"); a locked document has no Share until it is opened.
    const share =
      this.doc && !this.doc.locked
        ? html`<button type="button" class="to-btn to-tool to-share-btn" aria-label=${t('common-share')} title=${t('common-share')} aria-keyshortcuts=${keysAria(SHARE.keys)} aria-haspopup="dialog" @click=${() => this.say('to-share-open')}>${icon(UI.share, 24)}</button>`
        : nothing;
    const head = html`<header class="to-header ${this.titling ? 'titling' : ''}" aria-label=${t('common-tiny-little-office')} @focusin=${this.openTitle} @focusout=${() => (this.titling = false)} @keydown=${this.titleKey}>${this.doc ? this.renderDoc(this.doc) : html`<a class="to-brand" href="#/">${t('common-tiny-little-office')}</a>`}</header>`;
    // The column scrolls (the room below the last line sees to that even in a short document), so it is in the tab order and the keys scroll it, as the Display Link's column is; a scrollable box no key can reach fails axe's scrollable-region-focusable.
    return html`${share}${burger}${head}${this.renderArrival()}${this.renderOther()}<div class="to-column ${this.barred ? 'barred' : ''}">
      <main class=${this.mainClass} tabindex="0" aria-label=${this.label || nothing}>${this.main}</main>
    </div>`;
  }
}
customElements.define('to-chrome', ToChrome);
