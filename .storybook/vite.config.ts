/**
 * The Storybook's Vite: the site's language files as the site reads them (scripts/ftl-plugin.ts) and the dev box's
 * names, and nothing else of vite.config.ts, whose build writes the site's pages, headers and worker.
 */
import { defineConfig, loadEnv } from 'vite';
import { ftlBare } from '../scripts/ftl-plugin.ts';

export default defineConfig(({ mode }) => ({
  plugins: [ftlBare()],
  server: {
    allowedHosts: ['pefdev.exe.xyz', ...(loadEnv(mode, process.cwd()).VITE_ALLOWED_HOSTS?.split(',').filter(Boolean) ?? [])],
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 8192 },
}));
