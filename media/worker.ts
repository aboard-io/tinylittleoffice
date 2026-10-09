/** media on Cloudflare: the proxy (media.ts) with the edge's own cache and the platform's rate limiter. Logs nothing. */
import { handle, SITE } from './media.ts';

// Set only under `wrangler dev` (npm run media:dev), for a copy of the site on this machine.
declare global {
  interface Env {
    SITE?: string;
  }
}

export default {
  fetch(req, env, ctx) {
    return handle(req, {
      fetch: (input, init) => fetch(input, init),
      cache: caches.default,
      allowed: async (key) => (await env.LIMITER.limit({ key })).success,
      later: (p) => ctx.waitUntil(p),
      site: env.SITE || SITE,
    });
  },
} satisfies ExportedHandler<Env>;
