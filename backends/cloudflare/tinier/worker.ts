/**
 * tinier on Cloudflare: the shortener (tinier.ts) with its rows and its daily counts in D1, a landing page with a
 * preview card kept at the edge (caches.default), and the hourly sweep on a cron (links, cards and old counts).
 */
import PAGE from '../../tinier/page.html';
import { brakeKey } from '../../tinier/brake.ts';
import { D1Store } from '../../tinier/d1.ts';
import { SITE, handle } from '../../tinier/tinier.ts';

// SITE, the sites that may call it (tinier.ts), is wrangler.jsonc's var, which `wrangler types` declares; under
// `wrangler dev` (npm run tinier:dev) it names a copy of the site on this machine instead.
declare global {
  interface Env {
    /**
     * The secret the daily counts are kept under: `wrangler secret put BRAKE_KEY` in production, backends/cloudflare/tinier/.dev.vars on
     * this machine (where `wrangler types` reads it as a string too). Never in the repo; brakeKey() refuses without it.
     */
    BRAKE_KEY: string;
  }
}

export default {
  fetch(req, env) {
    return handle(req, new D1Store(env.DB), brakeKey(env.BRAKE_KEY), PAGE, Date.now(), env.SITE || SITE, caches.default);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(new D1Store(env.DB).sweep(Date.now()));
  },
} satisfies ExportedHandler<Env>;
