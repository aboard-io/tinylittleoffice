/**
 * The Storybook's Vite: the site's language files as the site reads them (scripts/ftl-plugin.ts) and the dev box's
 * names, and nothing else of vite.config.ts, whose build writes the site's pages, headers and worker.
 *
 * The library's own apps' words are drawn here, as the library's editors draw them (`library: true`): the Board's
 * stories (stories/apps/board.stories.ts) speak every language.
 *
 * The checkout's /version.json, for the home page's foot (scripts/version.ts).
 */
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { ftlBare } from '../scripts/ftl-plugin.ts';
import { gitFacts, versionJson, versionOf } from '../scripts/version.ts';

const ROOT = resolve(import.meta.dirname, '..');

/** /version.json, which the home page's foot and About read (kit/core/version.ts), the checkout's commit, served and built as the site's build writes it. */
const version = (): Plugin => {
  const body = () => versionJson(versionOf(gitFacts(ROOT), []));
  return {
    name: 'storybook-version',
    configureServer: (server) => void server.middlewares.use('/version.json', (_req, res) => (res.setHeader('Content-Type', 'application/json'), res.end(body()))),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: body() });
    },
  };
};

export default defineConfig(({ mode }) => ({
  plugins: [ftlBare({ library: true }), version()],
  // The site's public/ is the site's: the Storybook serves the faces alone (main.ts staticDirs).
  publicDir: false,
  server: {
    allowedHosts: ['pefdev.exe.xyz', ...(loadEnv(mode, process.cwd()).VITE_ALLOWED_HOSTS?.split(',').filter(Boolean) ?? [])],
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 8192 },
}));
