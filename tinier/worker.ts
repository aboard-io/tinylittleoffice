/** tinier on Cloudflare: the shortener (tinier.ts) with its rows in D1, the brake in a rate-limit binding, and the hourly sweep on a cron. */
import PAGE from './page.html';
import { D1Store, handle } from './tinier.ts';

export default {
  fetch(req, env) {
    return handle(req, new D1Store(env.DB), (key) => env.LIMITER.limit({ key }).then((r) => r.success), PAGE);
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(new D1Store(env.DB).sweep(Date.now()));
  },
} satisfies ExportedHandler<Env>;
