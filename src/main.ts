/**
 * The page: the stylesheet with its layers, the shell, and what runs at load: the language, the theme, and the
 * service worker under Save in browser (kit/share/offline.ts), registered once the page has loaded, and what draws a
 * trip's map in a picture.
 * (The size of everything is drawn by the shell.)
 */
import './styles.css';
import { initLanguage } from './kit/core/i18n.ts';
import { initTheme } from './kit/ui/theme.ts';
import { offlineAtLoad } from './kit/share/offline.ts';
import { drawsMaps } from './kit/draw/maps.ts';
import './kit/core/shell.ts';

// A map in a picture is drawn by MapLibre on OpenFreeMap, fetched with the first one (apps/trip/picture.ts): named here,
// the page's own, since the kit names no app and the API's files must never carry it.
drawsMaps((box) => import('./apps/trip/picture.ts').then((m) => m.drawMap(box)));

initTheme();
void initLanguage();
if (document.readyState === 'complete') void offlineAtLoad();
else window.addEventListener('load', () => void offlineAtLoad(), { once: true });
