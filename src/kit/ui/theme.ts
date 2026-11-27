/**
 * Light or dark: the choice in the menu, or the device's. Said as data-theme on <html>, so the tokens in
 * src/styles/tokens.css follow; the theme script in the page (index.html) sets it before the first paint, this keeps
 * it afterwards. Kept on the device under Private and Saved alike, as the language and the size are
 * (kit/core/store.ts), and read once, when first asked, so a page keeps its theme whatever another tab does.
 */
import { store } from '../core/store.ts';
import { t } from '../core/i18n.ts';

export type Theme = 'auto' | 'light' | 'dark';
export const THEMES: Theme[] = ['auto', 'light', 'dark'];
const KEY = 'to-theme';
const dark = () => matchMedia('(prefers-color-scheme: dark)');

let chosen: Theme | null = null;

export function theme(): Theme {
  if (chosen === null) {
    const v = store.get(KEY);
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
  if (th === 'auto') store.remove(KEY);
  else store.set(KEY, th);
  applyTheme();
}

/** Whether the page is drawn dark now (data-theme, as applyTheme sets it). */
export const drawnDark = (): boolean => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

/** `fn` each time the page's theme changes, by a choice or by the device's; returns its undoing. */
export function onTheme(fn: () => void): () => void {
  const watch = new MutationObserver(fn);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => watch.disconnect();
}

/** At load: the choice as it was left, and the device's changes followed while it is "auto". */
export function initTheme() {
  applyTheme();
  dark().addEventListener('change', applyTheme);
}
