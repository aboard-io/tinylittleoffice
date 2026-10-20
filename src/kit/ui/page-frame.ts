/**
 * A page's frame: what holds a column the visible window's height, for the site's chrome (<to-chrome>, kit/ui/chrome.ts)
 * and for a host's page alike (docs/library.md, A host's page), so the two keep one copy of it. The element it is
 * given (`.to-page`, page-frame.css) is the visual viewport's height, set as it resizes, and the window is put back at
 * its top whenever the browser slides it (iOS does, for a box it focused and a caret it finds under the keyboard); its
 * column's `main` scrolls by itself, and its height is `--to-col-h` on the frame, for what fills it (a canvas, a map).
 *
 * Under a finger a change of height is the keyboard: the frame is `gliding` while the column moves to it (the bar
 * fades, page-frame.css) and settles a fifth of a second later, or at once under reduced motion; the caret, where a box
 * being edited has it, is kept in sight once it has settled, never in flight. And while a box of the frame's (words, a
 * field) has the focus from the person's own tap or key, not the focus a page opens with (which raises no keyboard), the
 * frame is `editing`: under a finger the header steps aside but for the menu button, translucent in the corner. A hop
 * to the bar, a menu or a dialog and back is neither; a tap on the frame's header or menu button acts on the box in
 * hand without being a tap into it.
 *
 * A Lit element holds one by making it (`new PageFrame(this)`), as a controller; an element of another kind calls its
 * `hostConnected`, `hostUpdated` (once its column is drawn) and `hostDisconnected` itself.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { pinWindow, redrawCaret, revealCaret } from './scroll.ts';

/** What a person types in: while one of these has the focus, the header steps aside on a phone. */
const BOX = 'to-text, input, textarea, select, [contenteditable="true"], iframe';
/** What a box hands the focus to and back from without the person having left it: the bar, a menu, a popover, a dialog. */
export const ASIDE = 'to-bar, to-context, [popover], dialog, to-dialog, to-link-pop, to-complete';
/** The frame's own header and menu button: a tap on them acts on the box in hand, and is no tap into the page. */
const CHROME = '.to-page-head, .to-page-menu';
/** The column's glide, a little longer than its transition (page-frame.css): the fallback should transitionend never come. */
const GLIDE_MS = 260;
const COARSE = '(pointer: coarse)';

export interface FrameOpts {
  /** What scrolls: the column's `main`, `.to-column > main` inside the frame unless said. */
  main?: () => HTMLElement | null;
  /**
   * Told in the same frame as `editing` is worked out, before it: the element with the focus, whether it was typed in,
   * and whether the person touched or pressed a key within the second (the site's chrome works out `indoc` from them).
   */
  focused?: (at: Element | null, typed: boolean, recent: boolean) => void;
}

export class PageFrame implements ReactiveController {
  /** When the person last touched, clicked or pressed a key: a box focused by the page itself (a document opening) is not editing. */
  touched = -Infinity;
  private settleTimer = 0;
  private sized: ResizeObserver | null = null;
  private readonly el: HTMLElement;
  private readonly opts: FrameOpts;

  constructor(el: HTMLElement & Partial<ReactiveControllerHost>, opts: FrameOpts = {}) {
    this.el = el;
    this.opts = opts;
    el.addController?.(this);
  }

  /** The column: what scrolls. */
  get main(): HTMLElement | null {
    return this.opts.main ? this.opts.main() : this.el.querySelector<HTMLElement>('.to-column > main');
  }
  /** A box of the frame's has the focus from the person (page-frame.css: the header steps aside under a finger). */
  get editing(): boolean {
    return this.el.hasAttribute('editing');
  }

  hostConnected() {
    window.visualViewport?.addEventListener('resize', this.fit);
    window.visualViewport?.addEventListener('scroll', this.pin);
    window.addEventListener('scroll', this.pin);
    window.addEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.addEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, this.onPerson, true);
    this.el.addEventListener('transitionend', this.onGlided);
    this.el.addEventListener('scroll', this.pinSelf, true);
    this.fit();
  }
  hostDisconnected() {
    window.visualViewport?.removeEventListener('resize', this.fit);
    window.visualViewport?.removeEventListener('scroll', this.pin);
    window.removeEventListener('scroll', this.pin);
    window.removeEventListener('resize', this.fit);
    for (const type of ['focusin', 'focusout', 'beforeinput']) document.removeEventListener(type, this.onFocus);
    for (const type of ['pointerdown', 'keydown']) document.removeEventListener(type, this.onPerson, true);
    this.el.removeEventListener('transitionend', this.onGlided);
    this.el.removeEventListener('scroll', this.pinSelf, true);
    clearTimeout(this.settleTimer);
    this.sized?.disconnect();
    this.sized = null;
  }
  /** The column's height, for what fills it (a canvas, a map): `--to-col-h`, watched from the first time the column is there. */
  hostUpdated() {
    const col = this.main;
    if (!col || this.sized) return;
    // Set a frame later: what it sizes is in the column, and a change it makes is never this observer's to hear again at once.
    const set = () => this.el.style.getPropertyValue('--to-col-h') !== `${col.clientHeight}px` && this.el.style.setProperty('--to-col-h', `${col.clientHeight}px`);
    this.sized = new ResizeObserver(() => requestAnimationFrame(set));
    this.sized.observe(col);
  }

  /** The frame the visible window's height (the layout viewport's while a desktop's pinch has zoomed in), the window at its top. */
  private fit = () => {
    const vv = window.visualViewport;
    const h = `${vv && vv.scale <= 1.01 ? vv.height : window.innerHeight}px`;
    // Under a finger a change of height is the keyboard: the bar fades while the column glides (page-frame.css), back when it settles.
    if (this.el.style.height && this.el.style.height !== h && matchMedia(COARSE).matches) this.glide();
    this.el.style.height = h;
    this.pin();
  };
  /**
   * The frame and its column hold still: only `main` scrolls. The browser scrolls any box to bring a focused element
   * into view, a hidden one too (a bar's button, focused while the bar is away under the column's foot, scrolled the
   * chrome up by the header's height: the walks found it); so as the window is pinned (scroll.ts pinWindow), these are.
   */
  private pinSelf = (e: Event) => {
    const box = e.target as HTMLElement;
    if ((box === this.el || box.classList?.contains('to-column')) && (box.scrollTop || box.scrollLeft)) {
      box.scrollTo(0, 0);
      // Put back under a caret iOS has drawn where the box had slid: drawn again where the words are.
      const at = document.activeElement;
      if (this.editing && at && this.el.contains(at)) redrawCaret(at);
    }
  };
  /** The column moving (a keyboard's height, the bar arriving or leaving): `gliding` until it settles. */
  glide() {
    this.el.toggleAttribute('gliding', true);
    clearTimeout(this.settleTimer);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.settleTimer = window.setTimeout(this.settle, reduced ? 140 : GLIDE_MS);
  }
  /** The column settled: the bar back, and the caret (where a box has it) kept in sight of what is left above the keyboard. */
  private settle = () => {
    clearTimeout(this.settleTimer);
    if (!this.el.hasAttribute('gliding')) return;
    this.el.removeAttribute('gliding');
    this.keepCaret();
  };
  /** The caret, where a box being edited has it, inside what can be seen of the column (scroll.ts revealCaret, the one rule), and drawn afresh there (redrawCaret: iOS leaves its own where it first drew it). */
  private keepCaret() {
    const at = document.activeElement;
    if (!(this.editing && at && this.el.contains(at))) return;
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
    if (pinWindow() && !this.el.hasAttribute('gliding')) this.keepCaret();
  };
  private onGlided = (e: TransitionEvent) => e.target === this.el && e.propertyName === 'height' && this.settle();

  private onPerson = (e: Event) => {
    // A tap on the bar, in a menu or on the header acts on the box in hand (or elsewhere) without being a tap into it.
    if ((e.target as Element | null)?.closest?.(`${ASIDE}, ${CHROME}`)) return;
    this.touched = performance.now();
    this.onFocus(e);
  };
  /**
   * A box took the focus or left it. Taken in a person's own gesture (a tap, a key), or typed in, it is editing; the
   * focus a page is opened with is not (iOS raises no keyboard for it), so the header stays until the first tap.
   * A hop to the bar, a menu or a dialog and back is neither.
   */
  private onFocus = (e: Event) => {
    const typed = e.type === 'beforeinput';
    requestAnimationFrame(() => {
      const at = document.activeElement;
      const recent = performance.now() - this.touched < 1000;
      this.opts.focused?.(at, typed, recent);
      if (at && at !== document.body && at.closest(ASIDE)) return;
      const box = !!at && this.el.contains(at) && !at.closest('.to-page-head') && !!at.closest(BOX);
      const editing = box && (this.editing || typed || recent);
      if (editing === this.editing) return;
      this.el.toggleAttribute('editing', editing);
      // The header stepping aside moves the words under a caret iOS has already drawn: drawn again once the page is laid out (while the column glides, settle() does it; nothing is kept in flight).
      if (editing)
        requestAnimationFrame(() => {
          const now = document.activeElement;
          if (this.editing && now && this.el.contains(now) && !this.el.hasAttribute('gliding')) redrawCaret(now);
        });
    });
  };
}
