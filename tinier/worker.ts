/** tinier on Cloudflare: the shortener (tinier.ts) with its rows in D1, the brake in a rate-limit binding, and the hourly sweep on a cron. */
import PAGE from './page.html';
import { D1Store, brake, handle } from './tinier.ts';

// Two brakes on one address: this instance's own count, and the platform's limiter, which is shared but lenient.
const mine = brake();
const allowed = (env: Env) => async (key: string) => (await mine(key)) && (await env.LIMITER.limit({ key })).success;

export default {
  fetch(req, env) {
    return handle(req, new D1Store(env.DB), allowed(env), PAGE);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(new D1Store(env.DB).sweep(Date.now()));
  },
} satisfies ExportedHandler<Env>;
