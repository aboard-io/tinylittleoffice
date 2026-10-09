/**
 * The API for programs and agents (src/api.ts) as an ES module the site serves at /api.js: a build of its own,
 * after the site's (npm run build), so it shares no chunk with the pages and changes nothing they load. Its
 * lazy part (the apps' definitions, for apps() and templates()) is its own chunks under /api/.
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  publicDir: false,
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    minify: true,
    lib: { entry: resolve(import.meta.dirname, 'src/api.ts'), formats: ['es'], fileName: () => 'api.js' },
    rollupOptions: { output: { chunkFileNames: 'api/[name]-[hash].js' } },
  },
});
