import './styles.css';
import './lib/shoelace.ts';
import './widgets/meter.ts';
import './kit/tip.ts';
import './app.ts';
import { keepOffline } from './lib/store.ts';

// After a new version is published, a page opened before it may ask for a
// piece of the old one that is gone. Reloading (once) gets the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('to-reloaded')) return;
  sessionStorage.setItem('to-reloaded', '1');
  e.preventDefault();
  location.reload();
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('to-reloaded'), 5000));

keepOffline();
