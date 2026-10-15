/**
 * Tiny Little Office on one machine, without Cloudflare: one Node process (node:http, node:sqlite, nothing else) on two
 * ports, the site and its short-link service, running the very code the two Workers run (site/site.ts and
 * tinier/tinier.ts) over a SQLite file in place of D1 (selfhost/sqlite.ts) and the build's files in place of the
 * ASSETS binding (selfhost/http.ts). Paul (issue #7, 2026-10-15): "the smallest possible stack … ideally it would just
 * all be JS + sqlite instead of something heavy like nginx."
 *
 *   node selfhost/server.ts        after `npm run build` with VITE_TINIER set to the shortener's address
 *
 * The environment (.env.example):
 *   BRAKE_KEY    the secret the daily counts are kept under (required; any long random string, kept nowhere else)
 *   SITE         the site's address as a browser reaches it (http://localhost:8000): the one origin the shortener answers
 *   PORT         the site's port (8000);  TINIER_PORT  the shortener's (8001);  HOST  where both listen (0.0.0.0)
 *   DB           the SQLite file (data/tinier.sqlite): the links, the preview cards and the daily counts
 *   DIST         the built site (dist/)
 *   IP_HEADER    behind a proxy, the header that names the client's address (x-forwarded-for), so the brake counts
 *                each reader rather than the proxy
 *
 * What the Workers keep at the edge (caches.default) is not kept here: every card page is read from the file. The
 * hourly sweep runs in the process. Nothing is logged but the two addresses it listens on, and nothing is fetched.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { D1Store } from '../tinier/d1.ts';
import { handle } from '../tinier/tinier.ts';
import { handleSite } from '../site/site.ts';
import { noEdge } from '../tinier/cards.ts';
import { assets, send, toRequest } from './http.ts';
import { migrate, sqlite } from './sqlite.ts';

export interface Options {
  key: string;
  site: string;
  port: number;
  tinierPort: number;
  host: string;
  db: string;
  dist: string;
  ipHeader: string;
}

const ROOT = resolve(import.meta.dirname, '..');
const fail = (why: string): never => {
  throw new Error(why);
};

/** The options from the environment; without BRAKE_KEY it throws, saying what to set. */
export function options(env: Record<string, string | undefined>): Options {
  return {
    key: env.BRAKE_KEY || fail('BRAKE_KEY is not set: put a long random string in .env (openssl rand -base64 32 makes one), or in the environment docker compose is run in.'),
    site: (env.SITE || `http://localhost:${env.PORT || 8000}`).replace(/\/+$/, ''),
    port: Number(env.PORT || 8000),
    tinierPort: Number(env.TINIER_PORT || 8001),
    host: env.HOST || '0.0.0.0',
    db: resolve(ROOT, env.DB || 'data/tinier.sqlite'),
    dist: resolve(ROOT, env.DIST || 'dist'),
    ipHeader: (env.IP_HEADER || '').toLowerCase(),
  };
}

/** The paths the site's Worker runs first for (wrangler.jsonc run_worker_first); every other path is the files alone. */
const WORKER_FIRST = /^\/(c\/|card$|card\/)/;

/** Both listeners, started; `close()` stops them and closes the database. A port of 0 takes any free one. */
export async function start(o: Options): Promise<{ site: Server; tinier: Server; close(): Promise<void> }> {
  if (o.db !== ':memory:') mkdirSync(dirname(o.db), { recursive: true });
  const db = migrate(new DatabaseSync(o.db));
  const store = new D1Store(sqlite(db));
  const files = assets(o.dist);
  const page = readFileSync(resolve(ROOT, 'tinier/page.html'), 'utf8');
  // The cards' counts beside the links' in one table, under a key of their own, as the two Workers' two secrets keep them apart.
  const cardKey = `${o.key}\ncards`;
  const listen = (port: number, answer: (req: Request) => Promise<Response>) =>
    new Promise<Server>((ready) => {
      const server = createServer(async (req, res) => {
        try {
          const request = await toRequest(req, `http://${req.headers.host || 'localhost'}`, o.ipHeader);
          await send(res, request ? await answer(request) : new Response('Too large', { status: 413 }), String(req.headers['accept-encoding'] ?? ''));
        } catch {
          if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
          res.end('Something went wrong.');
        }
      });
      server.listen(port, o.host, () => ready(server));
    });
  const site = await listen(o.port, (req) =>
    WORKER_FIRST.test(new URL(req.url).pathname) ? handleSite(req, { assets: files, store, key: cardKey, edge: noEdge, now: Date.now() }) : files.fetch(req),
  );
  const tinier = await listen(o.tinierPort, (req) => handle(req, store, o.key, page, Date.now(), o.site, noEdge));
  // The Worker's cron, "17 * * * *": expired links and cards, and the counts of days before yesterday.
  const sweep = setInterval(() => void store.sweep(Date.now()), 3_600_000);
  sweep.unref();
  void store.sweep(Date.now());
  return {
    site,
    tinier,
    async close() {
      clearInterval(sweep);
      await Promise.all([site, tinier].map((s) => new Promise((done) => (s.close(done), s.closeAllConnections()))));
      db.close();
    },
  };
}

if (import.meta.main) {
  const o = options(process.env);
  const running = await start(o);
  console.log(`Tiny Little Office: the site on http://${o.host}:${o.port}/ (as ${o.site}), the short links on http://${o.host}:${o.tinierPort}/, kept in ${o.db}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => void running.close().then(() => process.exit(0)));
}
