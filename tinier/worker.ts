/** tinier on Cloudflare: the shortener (tinier.ts) with its rows in D1, the brake in a rate-limit binding, and the hourly sweep on a cron. */
import PAGE from './page.html';
import { D1Store, SITE, brake, handle } from './tinier.ts';

// Set only under `wrangler dev` (npm run tinier:dev), for a copy of the site on this machine.
declare global {
  interface Env {
    SITE?: string;
  }
}

// Two brakes on one address: this instance's own count, and the platform's limiter, which is shared but lenient.
const mine = brake();
const allowed = (env: Env) => async (key: string) => (await mine(key)) && (await env.LIMITER.limit({ key })).success;

export default {
  fetch(req, env) {
    return handle(req, new D1Store(env.DB), allowed(env), PAGE, Date.now(), env.SITE || SITE);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(new D1Store(env.DB).sweep(Date.now()));
  },
} satisfies ExportedHandler<Env>;
