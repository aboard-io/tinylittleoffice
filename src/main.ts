/**
 * The page: the stylesheet with its layers, the shell, and what runs at load: the language, the theme,
 * and the copy of the app kept on the device, if the switch was left on.
 */
import './styles.css';
import { initLanguage } from './kit/i18n.ts';
import { initTheme } from './kit/theme.ts';
import { keepOffline } from './kit/offline.ts';
import './kit/shell.ts';

// After a new version is published, a page opened before it may ask for a piece of the old one that is
// gone. Reloading (once) gets the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('to-reloaded')) return;
  sessionStorage.setItem('to-reloaded', '1');
  e.preventDefault();
  location.reload();
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('to-reloaded'), 5000));

initTheme();
void initLanguage();
keepOffline();
