/**
 * Scrolling, in one place. The page is never taller than the visible window (kit/chrome.ts): the document sits in a
 * column, `.to-main`, that scrolls by itself, and nothing scrolls the window. So every scroll-to in the kit and the
 * apps (the caret kept above a phone's keyboard, a match found, a note, a completion, a card or a stop brought into
 * view, a row dragged to the column's edge, a pinch keeping the words under the fingers) goes through here and moves
 * the boxes that scroll, from the nearest out, by just what it takes. (Until round eight the window scrolled, with the
 * bar stuck to its top and measured into place under Safari's keyboard after events that came late or never.)
 *
 *   scrollerOf(el)        the nearest box that scrolls the way `el` would be scrolled (the column, a list's own box)
 *   reveal(el, opts)      `el` (or a rect over it, such as the caret's) brought inside what can be seen
 *   seen()                what can be seen: the visible window
 *   room()                where a menu, the context bar, the link box or the completion list may sit: the column's
 *                         box (<to-chrome>) within what can be seen
 *   pinWindow()           the window put back at its top, should the browser have slid it (iOS does, for a box focused)
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
  return el?.closest<HTMLElement>('.to-main') ?? ((document.scrollingElement as HTMLElement) || document.documentElement);
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
  const col = document.querySelector('to-chrome')?.getBoundingClientRect();
  return col && col.height ? cut(col, s) : s;
}

/** A scroller's box inside its borders, on the screen (the document's own: what can be seen). */
function inner(sc: HTMLElement): Box {
  if (sc === document.scrollingElement || sc === document.documentElement) return seen();
  const r = sc.getBoundingClientRect();
  const top = r.top + sc.clientTop;
  const left = r.left + sc.clientLeft;
  return { top, left, bottom: top + sc.clientHeight, right: left + sc.clientWidth };
}
/** Two boxes' overlap (empty boxes keep their order). */
const cut = (a: Box, b: Box): Box => ({ top: Math.max(a.top, b.top), left: Math.max(a.left, b.left), bottom: Math.min(a.bottom, b.bottom), right: Math.min(a.right, b.right) });

export interface Reveal {
  /** Where in what can be seen: as little as it takes (the default), the middle, or the top. */
  block?: 'nearest' | 'center' | 'start';
  /** A part of `el` to bring in rather than all of it (a caret's rect, a range's). */
  rect?: Box;
  /** Room to leave between it and the edge, in CSS pixels. */
  margin?: number;
  /** Sideways too, as little as it takes. */
  inline?: boolean;
}

/** How far to move a span [a, b] so it lies in [lo, hi]. */
function delta(a: number, b: number, lo: number, hi: number, block: Reveal['block']): number {
  if (block === 'center') return (a + b) / 2 - (lo + hi) / 2;
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

/** The window back at its top: the page is the visible window and the column scrolls, so the window never should. */
export function pinWindow(): void {
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
}
