import { defineConfig, loadEnv, type Plugin } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ftlBare } from './scripts/ftl-plugin.ts';
import { fillHeaders, headersFor, inlineScripts, scriptHash } from './scripts/headers.ts';
import { forHost, hostOf } from './scripts/mirror.ts';
import { listed, writePages } from './scripts/seo.ts';
import { writeWorker } from './scripts/sw-manifest.ts';
import { gitFacts, versionJson, versionOf } from './scripts/version.ts';
import type { AppDef } from './src/kit/core/app.ts';

/**
 * The registry and the page scripts, read from the source under node at the end of the build (the
 * definitions touch no DOM). Loaded by a computed path, so the config's own bundler does not follow the
 * apps into their editors and stylesheets.
 */
const fromSource = <T>(path: string): Promise<T> => import(pathToFileURL(resolve(import.meta.dirname, path)).href) as Promise<T>;

/**
 * After the build: the pages (scripts/seo.ts: a page per app with its name and line in its tags and its first text,
 * the embed page, the JSON-LD on each, the sitemap and robots.txt's line naming it); the Content-Security-Policy's
 * script hashes (the apps' page scripts and the theme script in the page) and hosts written into _headers
 * (public/_headers has the placeholders, scripts/headers.ts fills them); the service worker's list of files and its
 * cache's name, written into dist/sw.js (scripts/sw-manifest.ts); for a host other than Cloudflare's, the manifest's id
 * under the site's path and each page's policy in its own <meta> (scripts/mirror.ts: the mirror on GitHub Pages,
 * VITE_CSP_META=1); and which build this is, dist/version.json (the
 * commit, its tag and date, those hashes: scripts/version.ts).
 * For agents, /.well-known/llms.txt is /llms.txt again and /examples/<app>.json each app's examples.
 */
function afterBuild(host: ReturnType<typeof hostOf>): Plugin {
  return {
    name: 'tinyoffice-after-build',
    apply: 'build',
    async closeBundle() {
      const { apps } = await fromSource<{ apps(): AppDef[] }>('src/kit/core/apps.ts');
      const { pageScripts } = await fromSource<{ pageScripts(): string[] }>('src/kit/draw/page.ts');
      const dist = resolve(import.meta.dirname, 'dist');
      const facts = gitFacts(import.meta.dirname);
      writePages(dist, { site: host.site, apps: await listed(apps()), built: facts.built });
      // The policy's script hashes: the apps' page scripts and the built pages' own inline scripts (the theme script in
      // the shell, the same on every page), read as scripts/check-build.ts reads them (scripts/headers.ts).
      const inline = inlineScripts(readFileSync(resolve(dist, 'index.html'), 'utf8'));
      const hashes = [...new Set([...pageScripts(), ...inline].map(scriptHash))];
      writeFileSync(resolve(dist, '_headers'), fillHeaders(readFileSync(resolve(dist, '_headers'), 'utf8'), { scripts: hashes, tinier: host.tinier }));
      // A host other than Cloudflare's (the mirror: scripts/mirror.ts), before the worker's list is hashed from the pages.
      forHost(dist, host);
      writeWorker(
        dist,
        apps().map((a) => a.id),
      );
      // For agents: the short guide where some look for it too, and each app's examples (packages/doc/examples, written
      // by scripts/make-skill.ts) as static files, so an agent that can only fetch reads them.
      mkdirSync(resolve(dist, '.well-known'), { recursive: true });
      copyFileSync(resolve(dist, 'llms.txt'), resolve(dist, '.well-known', 'llms.txt'));
      mkdirSync(resolve(dist, 'examples'), { recursive: true });
      for (const app of apps()) copyFileSync(resolve(import.meta.dirname, 'packages/doc/examples', `${app.id}.json`), resolve(dist, 'examples', `${app.id}.json`));
      writeFileSync(resolve(dist, 'version.json'), versionJson(versionOf(facts, hashes)));
    },
  };
}

/**
 * Which file a module goes in: an app's templates are `templates-<app>` and a language other than English
 * `lang-<code>` (its .ftl file, as text), each fetched when asked for; every other module (the kit, every app's editor,
 * commands and view, English's en.ftl, the icon library, the emoji and the math) is `app`, the one file the pages name. A dynamic import
 * of a module in `app` is a static one in the build: the module is already there. The service worker (src/sw.ts) is
 * an entry of its own, dist/sw.js.
 */
export function fileOf(id: string): string {
  const path = id.replaceAll('\\', '/');
  const tpl = /\/src\/apps\/([^/]+)\/templates\.ts$/.exec(path);
  if (tpl) return `templates-${tpl[1]}`;
  const lang = /\/src\/i18n\/([^/]+)\.ftl(\?raw)?$/.exec(path);
  if (lang && lang[1] !== 'en') return `lang-${lang[1]}`;
  const pkg = /\/node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(path);
  if (pkg && MAP.has(pkg[1])) return 'map';
  // (The bundler's own runtime, a virtual module, is the app file's: never a file of its own between the two groups.)
  return /\/src\/sw\.ts$/.test(path) ? 'sw' : 'app';
}

/**
 * The map's packages: maplibre-gl and everything it brings with it (the lockfile says), which the Trip Planner imports
 * with its first map and nothing else needs. They are the one file the app file fetches lazily beyond the templates and
 * the languages (Paul, 2026-10-15: "hot-load it for that path"); its worker is a file of its own too (?worker&url).
 */
const MAP = ((): Set<string> => {
  const lock = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package-lock.json'), 'utf8')) as { packages: Record<string, { dependencies?: Record<string, string> }> };
  const out = new Set<string>();
  const walk = (name: string) => {
    if (out.has(name)) return;
    out.add(name);
    for (const dep of Object.keys(lock.packages[`node_modules/${name}`]?.dependencies ?? {})) walk(dep);
  };
  walk('maplibre-gl');
  return out;
})();

/**
 * `npm run preview` serves the build with the cache's headers dist/_headers gives each file (scripts/headers.ts), so the
 * smoke run sees what a browser keeps on the site: the hashed files a year, the pages asked for each time.
 */
const previewCache = (): Plugin => ({
  name: 'tinyoffice-preview-cache',
  configurePreviewServer(server) {
    const file = resolve(import.meta.dirname, 'dist', '_headers');
    const rules = existsSync(file) ? readFileSync(file, 'utf8') : '';
    server.middlewares.use((req, res, next) => {
      const cache = headersFor(rules, new URL(req.url ?? '/', 'http://x').pathname)['Cache-Control'];
      if (cache) {
        // The static server writes its own Cache-Control with the head: the build's goes in last.
        const writeHead = res.writeHead.bind(res) as (...a: unknown[]) => typeof res;
        res.writeHead = ((code: number, ...rest: unknown[]) => {
          const headers = rest.find((r): r is Record<string, unknown> => !!r && typeof r === 'object');
          if (headers) headers['Cache-Control'] = cache;
          else res.setHeader('Cache-Control', cache);
          return writeHead(code, ...rest);
        }) as typeof res.writeHead;
      }
      next();
    });
  },
});

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
      // The site's Worker on this machine (npm run site:dev): the preview cards (site/site.ts).
      '/card': { target: 'http://127.0.0.1:8789' },
    },
  },
  plugins: [ftlBare(), afterBuild(hostOf(loadEnv(mode, import.meta.dirname))), previewCache()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    // One stylesheet beside the one app file (the editors' styles and the map's are in it).
    cssCodeSplit: false,
    // No preload helper: the only lazy files, the templates and the languages, need nothing the app file does not hold.
    modulePreload: false,
    // The app file is one file on purpose (its size is held by budgets.json, not by this warning).
    chunkSizeWarningLimit: 4096,
    // (The API for programs, /api.js, is a build of its own after this one: vite.api.config.ts.)
    rollupOptions: {
      input: { app: resolve(import.meta.dirname, 'index.html'), sw: resolve(import.meta.dirname, 'src/sw.ts') },
      // A dynamic import of a module the app file holds anyway is not a split, and is meant: no warning for each.
      checks: { ineffectiveDynamicImport: false },
      output: {
        // The worker at the site's root, under a name that never changes: its scope is the whole site, and a new build is a new sw.js.
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
        chunkFileNames: (chunk) => `assets/${chunk.facadeModuleId ? fileOf(chunk.facadeModuleId) : chunk.name}-[hash].js`,
        assetFileNames: (asset) => (asset.names.some((n) => n.endsWith('.css')) ? 'assets/app-[hash][extname]' : 'assets/[name]-[hash][extname]'),
        // Every module fileOf puts in the app file is one group, so the bundler splits off only the templates, the languages and
        // the map: the map's modules are left out of the group and become the chunk its dynamic import makes, named by
        // fileOf (a group of their own would have the bundler's runtime helpers, shared by two groups, in a third file every
        // page would fetch first).
        codeSplitting: { groups: [{ name: 'app', test: (id: string) => fileOf(id) === 'app' }] },
      },
    },
  },
}));
