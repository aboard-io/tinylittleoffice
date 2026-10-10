/**
 * The size of everything: a stepper in the menu, 70% to 200% in steps of 10%, and on a touch screen a pinch outside a
 * spatial canvas (kit/pinch.ts), which sets it continuously and keeps it to the nearest 5%. Kept like any preference
 * (under Saved, on the device; under Private, for the visit).
 *
 * The size is two plain numbers on the root, and the stylesheet does the rest (kit.css's header): `--to-doc`, the
 * document's scale, which is the root's font size (16px × it), so every length in rem follows it; and `--to-nav`, the
 * nav's, which is the font size of each nav element, so every length in em inside one follows that. A length measured
 * on the screen is then a length set in CSS, and whatever is placed from the page's coordinates (a menu, the context
 * bar, the link box) is placed by them as they are. Until round eight the size was the root's CSS `zoom`: every
 * length a pixel, so nothing but a zoom could move them, and each thing placed by hand divided by it, and the nav
 * needed a second zoom of its own to stop at its limit.
 *
 * The normal size, 100%, draws everything at BASE (1.3): the lengths in the stylesheet were too small to start from
 * (Paul, 2026-10-10, on his iPhone: "Start at what we now call 130%"). The stepper and the pill say the size alone, so
 * 100% is normal. Nothing drawn outside the page (print, the PDF, the PNG, the thumbnails, the cards) is in rem; a page
 * printed from the screen has both scales put back to 1 (kit.css).
 *
 * The nav has a natural limit: the bar, the header, the drawer, the dialogs, the context bar, the menus and the pills
 * grow with the size up to 120% (NAV_MAX) and no further, while the words, the cards and the pictures go on to 200%.
 */
import { store } from './store.ts';

const KEY = 'tinyoffice.size';
/** What the normal size draws at: at 100% a rem (and the nav's em) is this many times 16px. */
export const BASE = 1.3;
export const SIZE_MIN = 0.7;
export const SIZE_MAX = 2;
export const SIZE_STEP = 0.1;
/** The most the nav grows to: past it a larger size enlarges the document alone. */
export const NAV_MAX = 1.2;

/** A size as the scale it is drawn at (BASE × it), free of float dust. */
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

/** The size, on the page: the two scales on the root (`--to-doc`, `--to-nav`), and nothing else. Says so with a `to-size` event on the window. */
export function applySize() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--to-doc', String(drawn(size())));
  root.setProperty('--to-nav', String(drawn(navSize())));
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

/**
 * A pixel of the document's own, on the screen: a sixteenth of a rem, at the size of everything now (as drawn, so
 * BASE × the size once applied). For what keeps lengths of its own and draws them in rem (a sheet's column widths, a
 * chart's days): a length measured on the screen is divided by this to be one of them again.
 */
export const remScale = (): number => (typeof document === 'undefined' ? 1 : parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);
