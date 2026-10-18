/**
 * Light or dark: the choice in the menu, or the device's. Said as data-theme on <html>, so the tokens in
 * src/styles/tokens.css follow; the theme script in the page (index.html) sets it before the first paint, this keeps
 * it afterwards. Kept on the device under Private and Saved alike, as the language and the size are
 * (kit/core/store.ts), and read once, when first asked, so a page keeps its theme whatever another tab does. A page
 * that is not the site may keep it under a key of its own, or not at all (`keepThemeAt`).
 */
import { prefAt, store } from '../core/store.ts';
import { t } from '../core/i18n.ts';

export type Theme = 'auto' | 'light' | 'dark';
export const THEMES: Theme[] = ['auto', 'light', 'dark'];
const KEY = 'to-theme';
const dark = () => matchMedia('(prefers-color-scheme: dark)');

let chosen: Theme | null = null;
/** Where the choice is kept: the site's key through the store, or where a page said. */
let kept: { get(): string | null; set(v: string): void; remove(): void } = { get: () => store.get(KEY), set: (v) => store.set(KEY, v), remove: () => store.remove(KEY) };

/**
 * Where a page keeps the theme chosen: on the device under its own `key`, or, null, nowhere (memory, for the visit).
 * Called before anything asks for the theme (before `setup`); the site's own key, "to-theme", is the default.
 */
export function keepThemeAt(key: string | null) {
  kept = prefAt(key);
  chosen = null;
}

export function theme(): Theme {
  if (chosen === null) {
    const v = kept.get();
    chosen = v === 'light' || v === 'dark' ? v : 'auto';
  }
  return chosen;
}

export const themeName = (th: Theme): string => (th === 'auto' ? t('drawer-match-device') : th === 'light' ? t('drawer-light') : t('drawer-dark'));

/** The theme as it stands, on the page. */
export function applyTheme() {
  const th = theme();
  document.documentElement.dataset.theme = th === 'auto' ? (dark().matches ? 'dark' : 'light') : th;
}

export function setTheme(th: Theme) {
  chosen = th;
  if (th === 'auto') kept.remove();
  else kept.set(th);
  applyTheme();
}

/** At load: the choice as it was left, and the device's changes followed while it is "auto". */
export function initTheme() {
  applyTheme();
  dark().addEventListener('change', applyTheme);
}
