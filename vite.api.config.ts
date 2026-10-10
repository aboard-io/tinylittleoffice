/**
 * The API for programs and agents (src/api.ts) as an ES module the site serves at /api.js: a build of its own,
 * after the site's (npm run build), so it shares no chunk with the pages and changes nothing they load. Its
 * lazy part (the apps' definitions, for apps() and templates()) is its own chunks under /api/. A program has no
 * use for the editors' styles the definitions bring along, so no stylesheet is written (it was a stray
 * dist/tinyoffice.css).
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [
    {
      name: 'tinyoffice-api-no-css',
      enforce: 'post',
      generateBundle(_, bundle) {
        for (const name of Object.keys(bundle)) if (name.endsWith('.css')) delete bundle[name];
      },
    },
  ],
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    minify: true,
    lib: { entry: resolve(import.meta.dirname, 'src/api.ts'), formats: ['es'], fileName: () => 'api.js' },
    // A library build keeps its whitespace, and with it the bundler's "//#region <path>" notes, which name where the
    // modules were on the building machine (a checkout elsewhere, node_modules linked in): none, so a build is the
    // same bytes wherever it is made (scripts/reproducible.ts).
    rollupOptions: { experimental: { attachDebugInfo: 'none' }, output: { chunkFileNames: 'api/[name]-[hash].js' } },
  },
});
