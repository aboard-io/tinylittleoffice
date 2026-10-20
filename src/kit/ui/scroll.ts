/**
 * Scrolling, in one place. The page is never taller than the visible window (kit/ui/chrome.ts): the document sits in a
 * column, `.to-main`, that scrolls by itself, and nothing scrolls the window. So every scroll-to in the kit and the
 * apps (the caret kept above a phone's keyboard, a match found, a note, a completion, a card or a stop brought into
 * view, a row dragged to the column's edge, a pinch keeping the words under the fingers) goes through here and moves
 * the boxes that scroll, from the nearest out, by just what it takes. (Were the window to scroll, the bar stuck to its
 * top would have to be measured into place under Safari's keyboard after events that come late or never.)
 *
 *   scrollerOf(el)        the nearest box that scrolls the way `el` would be scrolled (the column, a list's own box)
 *   reveal(el, opts)      `el` (or a rect over it, such as the caret's) brought inside what can be seen
 *   revealCaret(box, o)   the caret in `box` brought inside what can be seen of the column, above the bar: the one rule
 *                         for a caret, after an edit, a focus moved, the column settled or the window put back; after an
 *                         edit (`middle`), a caret below the middle is brought to it, as a typewriter keeps its line
 *   seen()                what can be seen: the visible window
 *   room()                where a menu, the context bar, the link box or the completion list may sit: the page's
 *                         frame (.to-page: <to-chrome>, or a host's, kit/ui/page-frame.ts) within what can be seen
 *   pinWindow()           the window put back at its top, should the browser have slid it (iOS does, for a box focused
 *                         and for a caret it finds under the keyboard); true when it had to
 *   gliding()             the column is moving for a phone's keyboard (kit/ui/page-frame.ts): the caret is kept in sight once it settles
 *
 * test/scroll.test.ts fails if any other module reads `window.scrollY` or scrolls the window.
 */

/** A box on the screen: top, left, bottom and right in the page's CSS pixels. */
export interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

const scrolls = (v: string) => v === 'auto' || v === 'scroll';

/**
 * The nearest box that scrolls vertically (or sideways, `axis: 'x'`) and has more than it shows, from `el` out; else
 * the column, if `el` is in one; else the document's own scroller (an editor drawn without the shell, in a test).
 */
export function scrollerOf(el: Element | null, axis: 'x' | 'y' = 'y'): HTMLElement {
  for (let at = el; at; at = at.parentElement) {
    if (at === document.documentElement || at === document.body) break;
    const look = getComputedStyle(at);
    const more = axis === 'y' ? at.scrollHeight > at.clientHeight : at.scrollWidth > at.clientWidth;
    if (more && scrolls(axis === 'y' ? look.overflowY : look.overflowX)) return at as HTMLElement;
  }
  return el?.closest<HTMLElement>('.to-main, .to-column > main') ?? ((document.scrollingElement as HTMLElement) || document.documentElement);
}

/** What can be seen: the visual viewport (above a phone's keyboard, inside a pinch). */
export function seen(): Box {
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const left = vv?.offsetLeft ?? 0;
  return { top, left, bottom: top + (vv?.height ?? window.innerHeight), right: left + (vv?.width ?? window.innerWidth) };
}

/** Where something placed over the page may sit: the column's box within what can be seen (all of it, outside the shell). */
export function room(): Box {
  const s = seen();
  const col = document.querySelector('.to-page')?.getBoundingClientRect();
  return col && col.height ? cut(col, s) : s;
}

/** A scroller's box inside its borders, on the screen (the document's own: what can be seen). */
function inner(sc: HTMLElement): Box {
  if (sc === document.scrollingElement || sc === document.documentElement) return seen();
  const r = sc.getBoundingClientRect();
  const top = r.top + sc.clientTop;
  const left = r.left + sc.clientLeft;
  const box = { top, left, bottom: top + sc.clientHeight, right: left + sc.clientWidth };
  // The column's foot under a phone's bar is covered, not room (and so is its head under a desktop's): a caret brought
  // in stops above the bar, or below it, and above the context row docked at the foot, never under either (Paul,
  // 2026-10-10: a new row of the outline appeared under the nav and was unreachable). An app's own box placed over the
  // column says so with `data-covers` (the Presentation Builder's rail, pinned above the bar while a slide is typed on
  // a phone): it covers while it is out of the flow, and is content like any other while it is in it.
  if (sc.matches('.to-main, .to-column, .to-column > main')) {
    const placed = (el: Element) => /^(absolute|fixed|sticky)$/.test(getComputedStyle(el).position);
    for (const el of [sc.querySelector('to-bar'), document.querySelector('.to-context[data-docked]:popover-open'), ...[...sc.querySelectorAll('[data-covers]')].filter(placed)]) {
      const b = el?.getBoundingClientRect();
      if (!b || !b.height || b.bottom <= box.top || b.top >= box.bottom) continue;
      if (b.top - box.top < b.height) box.top = Math.min(box.bottom, b.bottom);
      else box.bottom = Math.max(box.top, b.top);
    }
  }
  return box;
}
/** Two boxes' overlap (empty boxes keep their order). */
const cut = (a: Box, b: Box): Box => ({ top: Math.max(a.top, b.top), left: Math.max(a.left, b.left), bottom: Math.min(a.bottom, b.bottom), right: Math.min(a.right, b.right) });

export interface Reveal {
  /**
   * Where in what can be seen: as little as it takes (the default), the middle, or the top; or `middle`: at the middle
   * when it is below it, and as little as it takes otherwise (the caret as you type: kit/text/text.ts).
   */
  block?: 'nearest' | 'center' | 'start' | 'middle';
  /** A part of `el` to bring in rather than all of it (a caret's rect, a range's). */
  rect?: Box;
  /** Room to leave between it and the edge, in CSS pixels. */
  margin?: number;
  /** Sideways too, as little as it takes. */
  inline?: boolean;
}

/** How far to move a span [a, b] so it lies in [lo, hi]. */
function delta(a: number, b: number, lo: number, hi: number, block: Reveal['block']): number {
  const below = (a + b) / 2 - (lo + hi) / 2;
  if (block === 'center' || (block === 'middle' && below > 0)) return below;
  if (block === 'start') return a - lo;
  if (b - a > hi - lo) return a - lo;
  return a < lo ? a - lo : b > hi ? b - hi : 0;
}

/**
 * `el` (or `opts.rect` over it) brought into view: each box that scrolls round it, the nearest first, moved by what it
 * takes, and nothing else. The window itself is never scrolled.
 */
export function reveal(el: Element | null | undefined, opts: Reveal = {}): void {
  if (!el) return;
  const m = opts.margin ?? 0;
  let target: Box = opts.rect ?? el.getBoundingClientRect();
  let from: Element | null = el.parentElement;
  const fixed = getComputedStyle(document.documentElement).overflowY === 'hidden';
  // In a dialog or a popover (the top layer), the boxes in it scroll and nothing behind it does.
  const layer = el.closest('[popover], dialog');
  for (let i = 0; from && i < 8; i++) {
    const sc = scrollerOf(from);
    if (layer && !layer.contains(sc)) return;
    const page = sc === document.scrollingElement || sc === document.documentElement;
    const own = inner(sc);
    const box = cut(own, seen());
    const dy = delta(target.top - m, target.bottom + m, box.top, box.bottom, opts.block);
    const before = sc.scrollTop;
    if (dy && !(page && fixed)) sc.scrollTop += dy;
    const moved = sc.scrollTop - before;
    if (opts.inline) {
      const sx = scrollerOf(from, 'x');
      const bx = cut(inner(sx), seen());
      const dx = delta(target.left - m, target.right + m, bx.left, bx.right, 'nearest');
      if (dx && sx !== document.scrollingElement) sx.scrollLeft += dx;
    }
    if (page) return;
    // The next box out brings in what this one holds of the target, where it now is.
    target = cut({ ...target, top: target.top - moved, bottom: target.bottom - moved }, own);
    from = sc.parentElement;
  }
}

/**
 * The caret in `box` (a `<to-text>`, a field) brought inside what can be seen of the column, above a phone's bar and
 * keyboard. A caret in a block with no words yet (the row or the paragraph Enter just made) has no rect of its own:
 * its block stands in for it, the element the caret sits in, never the whole box (a document's box is the document,
 * and revealing it scrolled to the top: Paul, 2026-10-11, "the cursor goes beneath the nav"). Nothing when the
 * selection is not in `box`.
 *
 * After an edit (`middle`), a caret below the middle of what can be seen is brought to the middle, and one above it is
 * only kept in sight (Paul, 2026-10-12: "enough padding at the end of a document we are editing that the cursor stays
 * roughly in the middle of the screen unless we scroll"); the room below the last line is the column's padding
 * (page.css). A click, an arrow key or Find never asks for it, so the person's own scroll is never undone.
 */
export function revealCaret(box: Element, opts: { middle?: boolean } = {}): void {
  const sel = document.getSelection();
  if (!sel?.rangeCount || !box.contains(sel.focusNode)) return;
  const block = opts.middle ? 'middle' : 'nearest';
  const range = sel.getRangeAt(0);
  const r = range.getBoundingClientRect();
  if (r.height) return reveal(box, { rect: r, margin: 8, block });
  const node = range.startContainer;
  const at = node instanceof Element ? node : node.parentElement;
  const el = at?.closest('[data-block], p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th') ?? at;
  // The whole box is never brought to the middle: its middle is not the caret's.
  if (el && box.contains(el)) reveal(el, { margin: 8, block });
  else reveal(box, { margin: 8 });
}

/**
 * The caret drawn again where the words are. iOS draws the caret of a box it has focused itself, where the box's
 * selection was when the keyboard rose, and leaves it there after the page puts the window back (pinWindow) or the
 * header steps aside under the words (chrome.ts editing): a caret standing in the dark above the first line, until
 * the next key (Paul, 2026-10-13: "There's a big black area the cursor is in it. Then it focuses"). The same selection
 * written again makes it draw the caret afresh, where the words now are. True when it was written.
 */
export function redrawCaret(box: Element): boolean {
  const sel = document.getSelection();
  if (!sel?.rangeCount || !box.contains(sel.focusNode)) return false;
  const at = sel.focusNode instanceof Element ? sel.focusNode : sel.focusNode?.parentElement;
  if (!at?.closest('[contenteditable]')) return false;
  const range = sel.getRangeAt(0).cloneRange();
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

/** The window back at its top: the page is the visible window and the column scrolls, so the window never should. True when it had slid. */
export function pinWindow(): boolean {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  else return false;
  return true;
}

/** The column is gliding to a keyboard's height (kit/ui/page-frame.ts): where the caret should be kept is known once it settles, and it is kept then. */
export const gliding = (): boolean => !!document.querySelector('.to-page[gliding]');
