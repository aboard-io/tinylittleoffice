/**
 * The size of everything: a stepper in the menu, 90% to 150%, kept like any preference (under Saved, on
 * the device; under Private, for the visit). Every length in the stylesheet is a pixel, so the size is the
 * root's CSS `zoom` (native, in every browser now) rather than its font-size, which would move nothing.
 * What places a popover by hand from the page's coordinates (menu.ts `place`, the context bar, the link
 * and note boxes) divides by `zoomed()`, since a length set under zoom is drawn that much larger.
 */
import { store } from './store.ts';

const KEY = 'tinyoffice.size';
export const SIZE_MIN = 0.9;
export const SIZE_MAX = 1.5;
export const SIZE_STEP = 0.1;

const clamp = (n: number) => Math.min(SIZE_MAX, Math.max(SIZE_MIN, n));

/** The size chosen: 1 is the normal size. */
export function size(): number {
  const n = Number(store.get(KEY));
  return Number.isFinite(n) && n > 0 ? clamp(n) : 1;
}

/** The size, on the page. */
export function applySize() {
  if (typeof document === 'undefined') return;
  const n = size();
  document.documentElement.style.setProperty('zoom', n === 1 ? '' : String(n));
}

/** A step larger (+1) or smaller (-1), or back to normal (0). */
export function stepSize(by: -1 | 0 | 1): number {
  const n = by === 0 ? 1 : clamp(Math.round((size() + by * SIZE_STEP) * 10) / 10);
  if (n === 1) store.remove(KEY);
  else store.set(KEY, String(n));
  applySize();
  return n;
}

/** The zoom a length set by hand is drawn at: divide a page coordinate by it to place something there. */
export const zoomed = (): number => (typeof document === 'undefined' ? 1 : Number(document.documentElement.style.getPropertyValue('zoom')) || 1);
