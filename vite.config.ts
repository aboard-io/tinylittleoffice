import { defineConfig, loadEnv, type Plugin } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
        const title = `${app.name} · TinyOffice`;
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
  },
}));
