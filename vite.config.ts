import { defineConfig, loadEnv, type Plugin } from 'vite';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { offlineList } from './scripts/offline-files.ts';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import './src/apps/index.ts';
import { apps, pageScripts } from './src/kit/core.ts';
import './src/lib/pageedit.ts';

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
      // The CSP allows exactly the scripts the apps' pages carry, by hash (public/_headers has the placeholder).
      const hashes = pageScripts().map((code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`);
      writeFileSync(resolve(dist, '_headers'), readFileSync(resolve(dist, '_headers'), 'utf8').replaceAll('{{scripts}}', hashes.join(' ')));
      // The guide to making documents by URL, where programs look for one: /llms.txt.
      // It is the skill in skill/tinyoffice, without the heading a skill needs.
      const skill = readFileSync(resolve(import.meta.dirname, 'skill/tinyoffice/SKILL.md'), 'utf8');
      // The files the device keeps for working offline (src/sw.ts, built as dist/sw.js, fetches them all when the
      // switch in the menu is on), which are also what "Download everything" zips; the worker is versioned by them.
      const built = (readdirSync(dist, { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
        .filter((f) => f.isFile())
        .map((f) => ({ path: relative(dist, resolve(f.parentPath, f.name)).replaceAll('\\', '/'), bytes: statSync(resolve(f.parentPath, f.name)).size }));
      const offline = offlineList(built);
      writeFileSync(resolve(dist, 'files.json'), JSON.stringify(offline));
      writeFileSync(resolve(dist, 'sw.js'), readFileSync(resolve(dist, 'sw.js'), 'utf8').replace('__TLO_VERSION__', offline.version));
      writeFileSync(resolve(dist, 'llms.txt'), skill.replace(/^---[\s\S]*?---\n+/, '').replaceAll('https://tinylittleoffice.com/', site));
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  // The shortener on this machine (npm run tinier:dev), under the dev server's own address, so it needs no address of its own.
  server: { proxy: { '/tinier/': { target: 'http://127.0.0.1:8787', rewrite: (p) => p.slice('/tinier'.length) } } },
  plugins: [appPages(loadEnv(mode, import.meta.dirname).VITE_SITE_URL ?? '')],
  build: {
    target: 'es2022',
    outDir: 'dist',
    cssCodeSplit: false,
    // One script for the whole suite is the point (see kit/browser.ts); only the map library and the full icon set are chunks of their own.
    chunkSizeWarningLimit: 1200,
    // The service worker is an entry of its own, at a fixed name (a browser looks for it at one address, build after build).
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html'), sw: resolve(import.meta.dirname, 'src/sw.ts') },
      output: { entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js') },
    },
  },
}));
