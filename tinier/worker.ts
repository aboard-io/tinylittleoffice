/** tinier on Cloudflare: the shortener (tinier.ts) with its rows in D1, the brake in a rate-limit binding, and the hourly sweep on a cron. */
import PAGE from './page.html';
import { SITE, brake, handle, type Link, type Revision, type Store } from './tinier.ts';

// Set only under `wrangler dev` (npm run tinier:dev), for a copy of the site on this machine.
declare global {
  interface Env {
    SITE?: string;
  }
}

/** The rows in Cloudflare D1 (tinier/schema.sql). */
export class D1Store implements Store {
  private db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }
  async get(id: string) {
    return (await this.db.prepare('SELECT c, iv, exp, owner, ver, updated FROM links WHERE id = ?').bind(id).first<Link>()) ?? null;
  }
  async put(id: string, { c, iv, exp, owner }: Link) {
    const r = await this.db.prepare('INSERT OR IGNORE INTO links (id, c, iv, exp, owner) VALUES (?, ?, ?, ?, ?)').bind(id, c, iv, exp, owner).run();
    return r.meta.changes === 1;
  }
  async revise(id: string, { c, iv, exp, updated }: Revision) {
    await this.db.prepare('UPDATE links SET c = ?, iv = ?, exp = ?, updated = ?, ver = ver + 1 WHERE id = ?').bind(c, iv, exp, updated, id).run();
  }
  async drop(id: string) {
    await this.db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  }
  async sweep(now: number) {
    return (await this.db.prepare('DELETE FROM links WHERE exp < ?').bind(now).run()).meta.changes;
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
