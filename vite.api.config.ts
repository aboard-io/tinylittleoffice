/** Builds @tinylittleoffice/doc: the API for programs and agents, as one ESM file for Node (and any runtime with Web Crypto). */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    ssr: resolve(import.meta.dirname, 'src/api.ts'),
    outDir: resolve(import.meta.dirname, 'packages/doc/dist'),
    emptyOutDir: true,
    minify: false,
    target: 'node20',
    rollupOptions: { output: { entryFileNames: 'index.js', inlineDynamicImports: true } },
  },
  // Everything bundled in, so the package has no dependencies.
  ssr: { noExternal: true, target: 'node' },
  publicDir: false,
  define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify('https://tinylittleoffice.com/') },
});
