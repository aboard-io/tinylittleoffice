/** tinier on Cloudflare: the shortener (tinier.ts) with its rows and its daily counts in D1, and the hourly sweep on a cron. */
import PAGE from './page.html';
import { D1Store } from './d1.ts';
import { SITE, brakeKey, handle } from './tinier.ts';

declare global {
  interface Env {
    /** Set only under `wrangler dev` (npm run tinier:dev), for a copy of the site on this machine. */
    SITE?: string;
    /**
     * The secret the daily counts are kept under: `wrangler secret put BRAKE_KEY` in production, tinier/.dev.vars on
     * this machine (where `wrangler types` reads it as a string too). Never in the repo; brakeKey() refuses without it.
     */
    BRAKE_KEY: string;
  }
}

export default {
  fetch(req, env) {
    return handle(req, new D1Store(env.DB), brakeKey(env.BRAKE_KEY), PAGE, Date.now(), env.SITE || SITE);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(new D1Store(env.DB).sweep(Date.now()));
  },
} satisfies ExportedHandler<Env>;
