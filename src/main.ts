import './styles.css';
import './lib/shoelace.ts';
import './widgets/meter.ts';
import './app.ts';
import { keeping } from './lib/store.ts';

// After a new version is published, a page opened before it may ask for a
// piece of the old one that is gone. Reloading (once) gets the new version.
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('to-reloaded')) return;
  sessionStorage.setItem('to-reloaded', '1');
  e.preventDefault();
  location.reload();
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('to-reloaded'), 5000));

// Keep the whole of it on the device, so it opens with no connection (see sw.js, written by the build).
// Only when asked to keep things: private by default means no offline copy either.
if (import.meta.env.PROD && keeping() && 'serviceWorker' in navigator) void navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
