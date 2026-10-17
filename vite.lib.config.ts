/**
 * Tiny Little Office as a library (docs/library.md): the two entry points the npm package `tinylittleoffice`
 * (packages/doc) serves to a program or a page that holds documents of its own, built beside the command line's
 * files in packages/doc/dist (vite.cli.config.ts), from the same modules as the site.
 *
 *   --mode doc       dist/doc.js: the kernel (src/kernel.ts) and everything it imports in one file, no dependencies
 *                    left outside it and no DOM, for Node 24 and anything newer that runs ES modules;
 *                    `import { parse, write, apply } from 'tinylittleoffice/doc'`
 *   --mode editors   dist/editors.js: the editors for a page that is not the site (src/editors.ts), bundled as the
 *                    site bundles its app file (vite.config.ts fileOf: Lit, the kit and every app in the one file),
 *                    with its stylesheet whole beside it as dist/editors.css, and what the site fetches lazily (an
 *                    app's templates, a language other than English, the trip's map and its worker) as files of
 *                    their own under dist/editors/, fetched by the page when asked for
 *
 * `npm run build:lib` makes both, after `npm run build:cli` or before it: neither build empties the folder, each
 * removes only its own files from the last build. The deploy makes both before it publishes, and
 * test/package.test.ts packs the package and installs it.
 *
 * The stylesheet names the site's fonts by the site's paths (/fonts/…), left as they are: a page serves them there, or
 * sets its own (docs/library.md, Theming).
 */
import { defineConfig } from 'vite';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { ftlBare } from './scripts/ftl-plugin.ts';
import { fileOf } from './vite.config.ts';

const DIST = resolve(import.meta.dirname, 'packages/doc/dist');

export default defineConfig(({ mode }) => ({
  base: './',
  publicDir: false,
  logLevel: 'warn',
  plugins: [
    ftlBare(),
    {
      // The library's own files from the last build go before this one writes, and nothing else in the folder: the
      // command line's api.js, tinyoffice.js and skill/ stay.
      name: 'tinyoffice-lib-clean',
      apply: 'build',
      buildStart() {
        if (mode === 'doc') rmSync(resolve(DIST, 'doc.js'), { force: true });
        else for (const f of ['editors.js', 'editors.css', 'editors']) rmSync(resolve(DIST, f), { recursive: true, force: true });
      },
    },
  ],
  build: {
    outDir: DIST,
    emptyOutDir: false,
    copyPublicDir: false,
    ...(mode === 'doc'
      ? {
          target: 'node24',
          minify: false,
          ssr: resolve(import.meta.dirname, 'src/kernel.ts'),
          rollupOptions: {
            // No "//#region <path>" notes, which name where the modules were on the building machine.
            experimental: { attachDebugInfo: 'none' as const },
            output: { entryFileNames: 'doc.js', codeSplitting: false },
          },
        }
      : {
          target: 'es2022',
          // The map's worker beside the lazy files, not in an assets/ folder of its own.
          assetsDir: 'editors',
          // One stylesheet, editors.css, beside the one file, as the site has one beside its app file.
          cssCodeSplit: false,
          // No preload helper: the lazy files need nothing the editors' file does not hold.
          modulePreload: false,
          chunkSizeWarningLimit: 4096,
          lib: { entry: resolve(import.meta.dirname, 'src/editors.ts'), formats: ['es' as const], fileName: () => 'editors.js', cssFileName: 'editors' },
          rollupOptions: {
            experimental: { attachDebugInfo: 'none' as const },
            // The entry may carry exports its lazy parts share with it, rather than be a facade over a third file.
            preserveEntrySignatures: 'allow-extension' as const,
            checks: { ineffectiveDynamicImport: false },
            output: {
              minify: true,
              chunkFileNames: (chunk: { facadeModuleId: string | null; name: string }) => `editors/${chunk.facadeModuleId ? fileOf(chunk.facadeModuleId) : chunk.name}-[hash].js`,
              assetFileNames: (asset: { names: string[] }) => (asset.names.some((n) => n.endsWith('.css')) ? 'editors.css' : 'editors/[name]-[hash][extname]'),
              // Every module the site puts in its app file is one group, the entry's: the bundler splits off only the
              // templates, the languages and the map (vite.config.ts says why the map is left out of every group).
              codeSplitting: { groups: [{ name: 'editors', test: (id: string) => fileOf(id) === 'app' }] },
            },
          },
        }),
  },
  // The packages' production builds (Lit's, for one, warns of its development build on every run otherwise).
  ssr: { noExternal: true, target: 'node' as const, resolve: { conditions: ['node', 'production', 'import', 'module', 'default'] } },
}));
