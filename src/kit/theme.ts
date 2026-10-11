/**
 * Light or dark: the choice in the menu, or the device's. Said as data-theme on <html>, so the tokens in
 * src/styles/tokens.css follow; public/theme.js sets it before the first paint, this keeps it afterwards. Kept on the
 * device under Private and Saved alike, as the language and the size are (kit/store.ts), and read once, when first
 * asked, so a page keeps its theme whatever another tab does.
 */
import { store } from './store.ts';
import { t } from './i18n.ts';

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

export const themeName = (th: Theme): string => (th === 'auto' ? t('Match the device') : th === 'light' ? t('Light') : t('Dark'));

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

/** At load: the choice as it was left, and the device's changes followed while it is "auto". */
export function initTheme() {
  applyTheme();
  dark().addEventListener('change', applyTheme);
}
