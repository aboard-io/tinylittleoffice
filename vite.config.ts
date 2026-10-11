import { defineConfig, loadEnv, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fillHeaders } from './scripts/headers.ts';
import { gitFacts, versionJson, versionOf } from './scripts/version.ts';
import type { AppDef } from './src/kit/app.ts';

/**
 * The registry and the page scripts, read from the source under node at the end of the build (the
 * definitions touch no DOM). Loaded by a computed path, so the config's own bundler does not follow the
 * apps into their editors and stylesheets.
 */
const fromSource = <T>(path: string): Promise<T> => import(pathToFileURL(resolve(import.meta.dirname, path)).href) as Promise<T>;

/**
 * After the build: a page per app (dist/<id>/index.html, the shell with that app's name and blurb in its
 * tags, so a shared link previews as that app); the Content-Security-Policy's script hashes and hosts
 * written into _headers (public/_headers has the placeholders, scripts/headers.ts fills them); and which
 * build this is, dist/version.json (the commit, its tag and date, those hashes: scripts/version.ts). Each app's
 * page names its own share card (public/og/<id>.png, drawn by scripts/make-cards.ts) where there is one; dist/embed/index.html is the shell again, at the one address another site may frame (the embed
 * view, public/_headers).
 */
function afterBuild(site: string): Plugin {
  const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return {
    name: 'tinyoffice-after-build',
    apply: 'build',
    async closeBundle() {
      const { apps } = await fromSource<{ apps(): AppDef[] }>('src/kit/apps.ts');
      const { pageScripts } = await fromSource<{ pageScripts(): string[] }>('src/kit/page.ts');
      const dist = resolve(import.meta.dirname, 'dist');
      const shell = readFileSync(resolve(dist, 'index.html'), 'utf8');
      mkdirSync(resolve(dist, 'embed'), { recursive: true });
      writeFileSync(resolve(dist, 'embed', 'index.html'), shell.replace(/(src|href)="\.\//g, '$1="../').replace('</title>', '</title>\n    <meta name="robots" content="noindex" />'));
      for (const app of apps()) {
        const title = `${app.name} · Tiny Little Office`;
        const page = shell
          .replace(/(src|href)="\.\//g, '$1="../')
          .replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*"/, `$1${attr(app.blurb)}"`)
          .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${attr(title)}"`)
          .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${attr(app.blurb)}"`)
          .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${site}${app.id}/"`)
          .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${site}${app.id}/"`)
          .replace(/(<meta property="og:image" content=")[^"]*"/, (m, a) => (existsSync(resolve(dist, 'og', `${app.id}.png`)) ? `${a}${site}og/${app.id}.png"` : m))
          .replace(/(<meta property="og:image:alt" content=")[^"]*"/, (m, a) => (existsSync(resolve(dist, 'og', `${app.id}.png`)) ? `${a}${attr(`${app.name}: ${app.blurb}`)}"` : m));
        mkdirSync(resolve(dist, app.id), { recursive: true });
        writeFileSync(resolve(dist, app.id, 'index.html'), page);
      }
      const hashes = pageScripts().map((code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`);
      writeFileSync(resolve(dist, '_headers'), fillHeaders(readFileSync(resolve(dist, '_headers'), 'utf8'), { scripts: hashes }));
      writeFileSync(resolve(dist, 'version.json'), versionJson(versionOf(gitFacts(import.meta.dirname), hashes)));
    },
  };
}

/** A chunk's name: `<app>-editor`, `<app>-commands`, `templates-<app>` or `lang-<code>` for the modules they hold, else the bundler's own. */
function chunkName(chunk: { name: string; facadeModuleId: string | null; moduleIds: readonly string[] }): string {
  for (const id of chunk.facadeModuleId ? [chunk.facadeModuleId] : chunk.moduleIds) {
    const m = /\/src\/apps\/([^/]+)\/(editor|commands|templates)\.ts$/.exec(id.replaceAll('\\', '/')) ?? /\/src\/(i18n)\/([^/]+)\.ts$/.exec(id.replaceAll('\\', '/'));
    if (m) return m[1] === 'i18n' ? `lang-${m[2]}` : m[2] === 'templates' ? `templates-${m[1]}` : `${m[1]}-${m[2]}`;
  }
  return chunk.name;
}

export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    // The dev box's own name, beside localhost; VITE_ALLOWED_HOSTS adds more (comma-separated).
    allowedHosts: [
      'pefdev.exe.xyz',
      ...(loadEnv(mode, import.meta.dirname)
        .VITE_ALLOWED_HOSTS?.split(',')
        .filter(Boolean) ?? []),
    ],
    // The shortener on this machine (npm run tinier:dev), under the dev server's own address.
    proxy: {
      '/tinier/': { target: 'http://127.0.0.1:8787', rewrite: (p) => p.slice('/tinier'.length) },
    },
  },
  plugins: [afterBuild(loadEnv(mode, import.meta.dirname).VITE_SITE_URL ?? '')],
  build: {
    target: 'es2022',
    outDir: 'dist',
    // (The API for programs, /api.js, is a build of its own after this one: vite.api.config.ts.)
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, 'index.html') },
      // The layout scripts/budgets.ts weighs (main, apps, each editor and its commands) is the bundler's by default, and
      // its pass that avoids "redundant" chunk loads folded the apps chunk into main once no lazy chunk imported a
      // module of main's own (round seventeen, signing gone): off, so the chunks stay what they were drawn to be.
      experimental: { chunkOptimization: { avoidRedundantChunkLoads: false } },
      // An app's editor and its commands are named for the app (write-editor-<hash>.js), its templates too
      // (templates-write-<hash>.js), a language for its code
      // (lang-fr-<hash>.js), so the built chunks say what they hold and scripts/budgets.ts can weigh each.
      output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: (chunk) => `assets/${chunkName(chunk)}-[hash].js` },
    },
  },
}));
