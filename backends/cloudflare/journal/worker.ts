/**
 * The journal on Cloudflare (backends/README.md, "The platforms"): a Durable Object a journal, which keeps the rows in
 * its own SQLite database (ctx.storage.sql, by SCHEMA's statements), its waiters in memory and its sweep as an alarm
 * set to the journal's expiry; the Worker in front routes `/j/<id>` to the object named `<id>` and answers nothing
 * else itself. The daily counts stay in D1's `brakes` table, the shortener's database, the one thing shared.
 */
import { DurableObject } from 'cloudflare:workers';
import { brakeKey, SITE } from '../../tinier/brake.ts';
import { D1Store, type SQL } from '../../tinier/d1.ts';
import { handle, SCHEMA, SqlStore, waiters, type Store, type Wake } from '../../journal/journal.ts';

declare global {
  interface Env {
    /** The secret the daily counts are kept under: `wrangler secret put BRAKE_KEY -c backends/cloudflare/journal/wrangler.jsonc`; backends/cloudflare/journal/.dev.vars on this machine. */
    BRAKE_KEY: string;
  }
}

const CONFIG = 'backends/cloudflare/journal/wrangler.jsonc';
const PATH = /^\/j\/([A-Za-z0-9_~-]{22})$/;

/** A Durable Object's database as D1's few calls (tinier/d1.ts SQL): prepare → bind → first, run and all. */
const sqlOf = (sql: SqlStorage): SQL => ({
  prepare: (query) => ({
    bind: (...values) => ({
      first: async <T>() => (sql.exec(query, ...values).toArray()[0] as T | undefined) ?? null,
      run: async () => ({ meta: { changes: sql.exec(query, ...values).rowsWritten } }),
      all: async <T>() => ({ results: sql.exec(query, ...values).toArray() as T[] }),
    }),
  }),
});

/** No journal at all: what the Worker answers a path that names none with, through the handler, which asks this of nothing. */
const none: Store = { journal: async () => null, make: async () => false, append: async () => false, read: async () => [], touch: async () => {}, sweep: async () => {}, count: async () => 1 };
const nobody = waiters();

export class JournalObject extends DurableObject<Env> {
  private store: Store;
  private wake: Wake = waiters();
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    for (const statement of SCHEMA.split(';')) if (statement.trim()) ctx.storage.sql.exec(statement);
    this.store = new SqlStore(sqlOf(ctx.storage.sql), new D1Store(env.DB));
  }
  async fetch(req: Request): Promise<Response> {
    const res = await handle(req, this.store, brakeKey(this.env.BRAKE_KEY, CONFIG, 'backends/cloudflare/journal/.dev.vars', 'npm run journal:dev'), Date.now(), this.env.SITE || SITE, this.wake);
    // The alarm is the sweep: at the journal's expiry, wherever a request moved it.
    const row = this.ctx.storage.sql.exec('SELECT exp FROM journals').toArray()[0] as { exp: number } | undefined;
    if (row && (await this.ctx.storage.getAlarm()) !== row.exp) await this.ctx.storage.setAlarm(row.exp);
    return res;
  }
  /** Past its time, the journal and everything of it goes; not yet, the alarm is set again. */
  async alarm(): Promise<void> {
    const row = this.ctx.storage.sql.exec('SELECT exp FROM journals').toArray()[0] as { exp: number } | undefined;
    if (!row || row.exp <= Date.now()) await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(row.exp);
  }
}

export default {
  fetch(req, env) {
    const id = PATH.exec(new URL(req.url).pathname)?.[1];
    if (!id) return handle(req, none, 'none', Date.now(), env.SITE || SITE, nobody);
    return env.JOURNALS.get(env.JOURNALS.idFromName(id)).fetch(req);
  },
} satisfies ExportedHandler<Env>;
