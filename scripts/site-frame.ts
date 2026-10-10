/**
 * The Website Builder's frame script (src/apps/site/frame.ts): the editing half that runs inside the page in the
 * editor's frame, with <to-text> and what it brings (Lit, the kernel, the selection bubble), built as one classic
 * script. The frame is sandboxed (an opaque origin), so a module script would need CORS to load; a classic one
 * does not. The frame inherits the site's Content-Security-Policy, whose 'self' lets it load from the site by
 * <script src>, while no inline script runs there but the pages' own, by hash (src/kit/page.ts).
 *
 * The site's build emits it as /site-frame.js; the dev server and the test runner build it when it is asked for
 * (once, and again after a source file changes). A downloaded site never names it.
 */
import { resolve } from 'node:path';
import { build, type Plugin } from 'vite';

export const FRAME_FILE = 'site-frame.js';

/** The script, built from the source under `root`. */
export async function buildFrame(root: string): Promise<string> {
  const out = await build({
    configFile: false,
    root,
    logLevel: 'warn',
    publicDir: false,
    build: {
      write: false,
      target: 'es2022',
      minify: true,
      copyPublicDir: false,
      emptyOutDir: false,
      lib: { entry: resolve(root, 'src/apps/site/frame.ts'), formats: ['iife'], name: 'TinyOfficeFrame', fileName: () => FRAME_FILE },
      // (The strings come with the page, so the languages i18n.ts would find by import.meta.glob are not wanted here.)
      rollupOptions: { onwarn: (w, warn) => (w.code === 'EMPTY_IMPORT_META' ? undefined : warn(w)) },
    },
  });
  const outputs = (Array.isArray(out) ? out : [out]) as { output: { type: string; fileName: string; code?: string }[] }[];
  const chunk = outputs.flatMap((o) => o.output).find((c) => c.type === 'chunk' && c.code !== undefined);
  if (!chunk?.code) throw new Error('the frame script was not built');
  return chunk.code;
}

/** /site-frame.js: built into the site, and served by a dev or test server as it is asked for. */
export function siteFrame(root: string): Plugin {
  let made: Promise<string> | null = null;
  return {
    name: 'tinyoffice-site-frame',
    configureServer(server) {
      server.watcher.on('change', (file) => {
        if (file.startsWith(resolve(root, 'src'))) made = null;
      });
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== `/${FRAME_FILE}`) return next();
        made ??= buildFrame(root);
        made.then(
          (code) => {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(code);
          },
          (e: unknown) => {
            made = null;
            next(e);
          },
        );
      });
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: FRAME_FILE, source: await buildFrame(root) });
    },
  };
}
