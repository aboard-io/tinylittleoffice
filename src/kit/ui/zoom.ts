/**
 * The size of everything: a stepper in the menu, 70% to 200% in steps of 10%, and on a touch screen a pinch outside a
 * spatial canvas (kit/ui/pinch.ts), which sets it continuously and keeps it to the nearest 5%. Kept on the device under
 * Private and Saved alike, as the language is (kit/core/store.ts): a link opened from a message or a QR code is at the size
 * the person reads at, not at 100% again. Read once, when first asked, so a page is at one size whatever another tab
 * does. Reached from the drawer's size row and from its search for anything (kit/ui/drawer.ts: 'Everything larger',
 * 'Everything smaller', 'Normal size', kit/core/keys.ts), with no key of its own: Ctrl+=, Ctrl+- and Ctrl+0 are the
 * browser's zoom, and a keyboard keeps them.
 *
 * The person's own size is the 100%: the root's font size is the browser's default (100%) × the size × BASE, so a
 * browser set to larger type draws everything larger. An iPhone's browser keeps 16px whatever the device's text size
 * (Settings, Larger Text), so there, while nothing is kept, the size starts at the body text style's size over its
 * normal 17px (`deviceStart`). Above 100%, the root carries `data-large` (the menu button is opaque then: page.css).
 *
 * The size is two plain numbers on the root, and the stylesheet does the rest (kit.css's header): `--to-doc`, the
 * document's scale, which is the root's font size (the browser's default × it), so every length in rem follows it; and `--to-nav`, the
 * nav's, which is the font size of each nav element, so every length in em inside one follows that. A length measured
 * on the screen is then a length set in CSS, and whatever is placed from the page's coordinates (a menu, the context
 * bar, the link box) is placed by them as they are. Not the root's CSS `zoom`: under it every length is a pixel that
 * only the zoom moves, each thing placed by hand must divide by it, and the nav needs a second zoom to stop at its limit.
 *
 * The normal size, 100%, draws everything at BASE (1.3): the lengths in the stylesheet were too small to start from
 * (Paul, 2026-10-10, on his iPhone: "Start at what we now call 130%"). The stepper and the pill say the size alone, so
 * 100% is normal. Nothing drawn outside the page (print, the PDF, the PNG, the thumbnails, the cards) is in rem; a page
 * printed from the screen has both scales put back to 1 (page.css).
 *
 * The nav has a natural limit: the bar, the header, the drawer, the dialogs, the context bar, the menus and the pills
 * grow with the size up to 120% (NAV_MAX) and no further, while the words, the cards and the pictures go on to 200%.
 */
import { store } from '../core/store.ts';

const KEY = 'tinyoffice.size';
/** What the normal size draws at: at 100% a rem (and the nav's em) is this many times 16px. */
export const BASE = 1.3;
export const SIZE_MIN = 0.7;
export const SIZE_MAX = 2;
/** The most the nav grows to: past it a larger size enlarges the document alone. */
export const NAV_MAX = 1.2;

/** A size as the scale it is drawn at (BASE × it), free of float dust. */
const drawn = (n: number) => Math.round(n * BASE * 10000) / 10000;

/** Within 70%–200%, and free of float dust. */
export const clampSize = (n: number) => Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, n)) * 1000) / 1000;

/** The size a pinch has in hand, drawn but not yet kept. */
let live: number | null = null;
/** The size kept, as read from the device the first time it is asked for. */
let kept: number | null = null;

/** Where a size starts on an iPhone from the body text style's size in px (17 at the device's normal text size): to the nearest 5%. */
export const deviceStart = (px: number): number => (px > 0 ? clampSize(Math.round((px / 17) * 20) / 20) : 1);

/** Where the size starts on this device, once read. */
let start: number | null = null;
/** The device's own text size, where nothing is kept: on an iPhone or iPad, its body text style read from a probe; elsewhere the browser's default already is the 100%. */
function fromDevice(): number {
  return (start ??= readDevice());
}
function readDevice(): number {
  if (typeof document === 'undefined') return 1;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // An engine that has no such style (WebKit off Apple's systems) would give the probe the root's size instead.
  if (!ios || !CSS.supports('font', '-apple-system-body')) return 1;
  const probe = document.createElement('span');
  probe.style.font = '-apple-system-body';
  document.documentElement.append(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  return deviceStart(px);
}

/** The size chosen: 1 is the normal size. */
export function size(): number {
  if (live !== null) return live;
  if (kept === null) {
    const n = Number(store.get(KEY));
    kept = Number.isFinite(n) && n > 0 ? clampSize(n) : fromDevice();
  }
  return kept;
}

/** The size the nav is drawn at: the size, up to 120%. */
export const navSize = (): number => Math.min(size(), NAV_MAX);

/** The size, on the page: the two scales on the root (`--to-doc`, `--to-nav`), and nothing else. Says so with a `to-size` event on the window. */
export function applySize() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--to-doc', String(drawn(size())));
  root.setProperty('--to-nav', String(drawn(navSize())));
  document.documentElement.toggleAttribute('data-large', size() > 1);
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
  kept = k;
  // Where the device starts is not written down; 100% on an iPhone set to larger text is.
  if (k === fromDevice()) store.remove(KEY);
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
