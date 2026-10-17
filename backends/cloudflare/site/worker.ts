/**
 * The site on Cloudflare: dist/ as static assets, and this Worker in front of the few paths site.ts answers (the
 * preview cards, and a page asked for with ?c=). The cards live in the shortener's D1 database (backends/tinier/migrations/),
 * read and written through backends/tinier/d1.ts; what is read is kept at the edge (caches.default).
 */
import { brakeKey } from '../../tinier/brake.ts';
import { D1Store } from '../../tinier/d1.ts';
import { handleSite } from '../../cards/site.ts';

declare global {
  interface Env {
    /**
     * The secret the daily counts of cards are kept under: `wrangler secret put BRAKE_KEY` in production (the site's
     * own, beside the shortener's), .dev.vars on this machine. Never in the repo; brakeKey() refuses without it.
     */
    BRAKE_KEY: string;
  }
}

export default {
  fetch(req, env) {
    return handleSite(req, {
      assets: env.ASSETS,
      store: new D1Store(env.DB),
      // The cards' counts under a key of their own beside the links', as the process keeps them (backends/node/server.ts), so one secret may serve both Workers.
      key: `${brakeKey(env.BRAKE_KEY, 'backends/cloudflare/site/wrangler.jsonc', 'backends/cloudflare/site/.dev.vars', 'npm run site:dev')}\ncards`,
      edge: caches.default,
      now: Date.now(),
    });
  },
} satisfies ExportedHandler<Env>;
