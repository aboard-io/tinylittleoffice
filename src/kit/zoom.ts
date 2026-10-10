/**
 * The size of everything: a stepper in the menu, 70% to 200% in steps of 10%, and on a touch screen a pinch outside a
 * spatial canvas (kit/pinch.ts), which sets it continuously and keeps it to the nearest 5%. Kept like any preference
 * (under Saved, on the device; under Private, for the visit). Every length in the stylesheet is a pixel, so the size is
 * the root's CSS `zoom` (native, in every browser now) rather than its font-size, which would move nothing.
 *
 * The normal size, 100%, draws everything at BASE (1.3): the lengths in the stylesheet were too small to start from
 * (Paul, 2026-10-10, on his iPhone: "Start at what we now call 130%"). The root's zoom is BASE × the size, and the
 * stepper and the pill say the size alone, so 100% is normal. Nothing drawn outside the page (print, the PDF, the PNG,
 * the thumbnails, the cards) is under the root's zoom; a page printed from the screen has its zoom taken off (kit.css).
 *
 * The nav has a natural limit: the bar, the header, the drawer, the dialogs, the context bar, the menus and the pills
 * grow with the size up to 120% (NAV_MAX) and no further, while the words, the cards and the pictures go on to 200%.
 * The root carries `--to-nav-zoom` (navSize / size), which kit.css applies as `zoom` to the nav's outermost elements,
 * and `--to-size` / `--to-nav-size` (each × BASE: what is drawn, not what is said), by which a length measured on the
 * screen (the keyboard's offset) is divided.
 * What places a popover by hand from the page's coordinates divides by `zoomOf(the popover)`, since a length set under
 * zoom is drawn that much larger.
 */
import { store } from './store.ts';

const KEY = 'tinyoffice.size';
/** What the normal size draws at: a length in the stylesheet is this many pixels on the screen at 100%. */
export const BASE = 1.3;
export const SIZE_MIN = 0.7;
export const SIZE_MAX = 2;
export const SIZE_STEP = 0.1;
/** The most the nav grows to: past it a larger size enlarges the document alone. */
export const NAV_MAX = 1.2;

/** A size as the zoom it is drawn at, free of float dust. */
const drawn = (n: number) => Math.round(n * BASE * 10000) / 10000;

/** Within 70%–200%, and free of float dust. */
export const clampSize = (n: number) => Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, n)) * 1000) / 1000;

/** The size a pinch has in hand, drawn but not yet kept. */
let live: number | null = null;

/** The size chosen: 1 is the normal size. */
export function size(): number {
  if (live !== null) return live;
  const n = Number(store.get(KEY));
  return Number.isFinite(n) && n > 0 ? clampSize(n) : 1;
}

/** The size the nav is drawn at: the size, up to 120%. */
export const navSize = (): number => Math.min(size(), NAV_MAX);

/** The size, on the page: the root's zoom (BASE × the size), and the nav's own beside it. Says so with a `to-size` event on the window. */
export function applySize() {
  if (typeof document === 'undefined') return;
  const n = size();
  const root = document.documentElement.style;
  const nav = navSize() / n;
  for (const [k, v] of [
    ['zoom', String(drawn(n))],
    ['--to-nav-zoom', nav === 1 ? '' : String(Math.round(nav * 10000) / 10000)],
    ['--to-size', String(drawn(n))],
    ['--to-nav-size', String(drawn(navSize()))],
  ])
    if (v) root.setProperty(k, v);
    else root.removeProperty(k);
  window.dispatchEvent(new Event('to-size'));
}

/** A size drawn while fingers are on the screen: applied now, not kept. */
export function pinchSize(n: number): number {
  live = clampSize(n);
  applySize();
  return live;
}

/** A size kept, rounded to the nearest 5% (where a pinch leaves it). */
export function keepSize(n: number): number {
  live = null;
  const k = clampSize(Math.round(n * 20) / 20);
  if (k === 1) store.remove(KEY);
  else store.set(KEY, String(k));
  applySize();
  return k;
}

/** The step from `n`: up to the next ten above (+1), down to the next below (-1), or back to normal (0). */
export function stepFrom(n: number, by: -1 | 0 | 1): number {
  if (by === 0) return 1;
  const tens = n * 10;
  const at = by > 0 ? Math.floor(tens + 1e-6) + 1 : Math.ceil(tens - 1e-6) - 1;
  return clampSize(at / 10);
}

/** A step larger (+1) or smaller (-1), or back to normal (0), kept. */
export const stepSize = (by: -1 | 0 | 1): number => keepSize(stepFrom(size(), by));

/** The root's zoom: what the document is drawn at (BASE × the size, once applied). */
export const zoomed = (): number => (typeof document === 'undefined' ? 1 : Number(document.documentElement.style.getPropertyValue('zoom')) || 1);

/**
 * The zoom an element is drawn at, all its ancestors' zooms multiplied (the nav's own under the root's): divide a page
 * coordinate by it to place the element there.
 */
export function zoomOf(el: Element): number {
  const native = (el as Element & { currentCSSZoom?: number }).currentCSSZoom;
  if (typeof native === 'number' && native > 0) return native;
  let z = 1;
  for (let at: Element | null = el; at; at = at.parentElement) z *= Number(getComputedStyle(at).zoom) || 1;
  return z;
}
