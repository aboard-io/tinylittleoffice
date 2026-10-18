/**
 * The Storybook's Vite: the site's language files as the site reads them (scripts/ftl-plugin.ts) and the dev box's
 * names, and nothing else of vite.config.ts, whose build writes the site's pages, headers and worker.
 *
 * The checkout's /version.json, for the home page's foot (scripts/version.ts).
 *
 * And the Board (@aboard/kanban, an app built outside the suite on the kit), when its checkout is beside this one
 * (`BOARD_DIR`, or ../projects/kanban): its source is shown as a page holds it, `tinylittleoffice/kit` and
 * `tinylittleoffice/doc` answered by this tree's own src/kit.ts and src/kernel.ts, so the Board joins the one Lit and the
 * one registry the stories use, and nothing is installed either way (the Board depends on this package, so this one
 * cannot depend on it). Its stories import `virtual:board`: the Board's `install`, or null where there is no checkout.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, searchForWorkspaceRoot, type Plugin } from 'vite';
import { ftlBare } from '../scripts/ftl-plugin.ts';
import { gitFacts, versionJson, versionOf } from '../scripts/version.ts';

const ROOT = resolve(import.meta.dirname, '..');
const BOARD = resolve(process.env.BOARD_DIR ?? resolve(ROOT, '../projects/kanban'));
const boardHere = existsSync(resolve(BOARD, 'src/index.ts'));
const VIRTUAL = 'virtual:board';
const board = (): Plugin => ({
  name: 'storybook-board',
  resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
  load: (id) => (id === `\0${VIRTUAL}` ? (boardHere ? `export { install } from ${JSON.stringify(resolve(BOARD, 'src/index.ts'))};` : 'export const install = null;') : undefined),
});

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
  plugins: [ftlBare(), board(), version()],
  // The site's public/ is the site's: the Storybook serves the faces alone (main.ts staticDirs).
  publicDir: false,
  resolve: {
    alias: (boardHere ? { 'tinylittleoffice/kit': resolve(ROOT, 'src/kit.ts'), 'tinylittleoffice/doc': resolve(ROOT, 'src/kernel.ts') } : {}) as Record<string, string>,
    // The Board's Lucide is this tree's: one copy of its icons.
    dedupe: ['lucide', 'lit'],
  },
  server: {
    fs: { allow: [searchForWorkspaceRoot(ROOT), ...(boardHere ? [BOARD] : [])] },
    allowedHosts: ['pefdev.exe.xyz', ...(loadEnv(mode, process.cwd()).VITE_ALLOWED_HOSTS?.split(',').filter(Boolean) ?? [])],
  },
  build: { target: 'es2022', chunkSizeWarningLimit: 8192 },
}));
