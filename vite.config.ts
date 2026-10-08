import { defineConfig, loadEnv, type Plugin } from 'vite';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import './src/apps/index.ts';
import { apps } from './src/kit/core.ts';

/**
 * A page per app: dist/<id>/index.html is the same shell with that app's
 * name, description and preview card in its tags. Links are made to these
 * pages, so a shared Deck previews as a deck. (What is in the document can
 * never show in a preview: it lives after the "#", which no server sees.)
 */
function appPages(site: string): Plugin {
  const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return {
    name: 'tinyoffice-app-pages',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');
      for (const app of apps()) {
        const title = `${app.name} · TinyLittleOffice`;
        const page = shell
          .replace(/(src|href)="\.\//g, '$1="../')
          .replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*"/, `$1${attr(app.blurb)}"`)
          .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${attr(title)}"`)
          .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${attr(app.blurb)}"`)
          .replace(/(<meta property="og:image:alt" content=")[^"]*"/, `$1${attr(`${app.name}: ${app.blurb}`)}"`)
          .replace(/(<meta property="og:image" content=")[^"]*"/, `$1${site}og/${app.id}.png"`)
          .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${site}${app.id}/"`)
          .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${site}${app.id}/"`);
        mkdirSync(resolve(dist, app.id), { recursive: true });
        writeFileSync(resolve(dist, app.id, 'index.html'), page);
      }
      // The guide to making documents by URL, where programs look for one: /llms.txt.
      // It is the skill in skill/tinyoffice, without the heading a skill needs.
      const skill = readFileSync(resolve(import.meta.dirname, 'skill/tinyoffice/SKILL.md'), 'utf8');
      // The service worker: every file of the build, fetched once and then served from the device,
      // so the whole thing works with no connection. (Share cards are for link previews; they stay behind.)
      const files = (readdirSync(dist, { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
        .filter((f) => f.isFile())
        .map((f) => relative(dist, resolve(f.parentPath, f.name)).replaceAll('\\', '/'))
        .filter((f) => !f.startsWith('og/') && f !== 'sw.js' && f !== 'llms.txt' && f !== '_headers')
        .sort();
      const version = createHash('sha256').update(files.map((f) => f + readFileSync(resolve(dist, f)).length).join('|')).digest('hex').slice(0, 12);
      // The same list, as data, for "Download everything" (the app and the library in one zip).
      writeFileSync(resolve(dist, 'files.json'), JSON.stringify(files.map((f) => f.replace(/(^|\/)index\.html$/, '$1'))));
      writeFileSync(
        resolve(dist, 'sw.js'),
        `const CACHE = 'tlo-${version}';
const FILES = ${JSON.stringify(files.map((f) => f.replace(/(^|\/)index\.html$/, '$1')))};
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only this site's own files; anything else (map tiles) goes to the network as it always did.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
`,
      );
      writeFileSync(resolve(dist, 'llms.txt'), skill.replace(/^---[\s\S]*?---\n+/, '').replaceAll('https://tinylittleoffice.com/', site));
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [appPages(loadEnv(mode, import.meta.dirname).VITE_SITE_URL ?? '')],
  build: {
    target: 'es2022',
    outDir: 'dist',
    cssCodeSplit: false,
    // One script for the whole suite is the point (see kit/browser.ts); only the map library and the full icon set are chunks of their own.
    chunkSizeWarningLimit: 1200,
  },
}));
