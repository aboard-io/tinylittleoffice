/** Builds the API for programs and agents as one ESM file, served by the site at /api.js and used by the CLI in packages/doc. */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    ssr: resolve(import.meta.dirname, 'src/api.ts'),
    outDir: resolve(import.meta.dirname, process.env.API_OUT ?? 'dist'),
    emptyOutDir: false,
    minify: false,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: process.env.API_OUT ? 'index.js' : 'api.js', inlineDynamicImports: true } },
  },
  // Everything bundled in, so the package has no dependencies.
  ssr: { noExternal: true, target: 'node' },
  publicDir: false,
  resolve: { alias: { module: resolve(import.meta.dirname, 'src/shims/module.ts') } },
  define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify('https://tinylittleoffice.com/') },
});
