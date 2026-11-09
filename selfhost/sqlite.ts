/**
 * The shortener's rows in one SQLite file, by node's own SQLite (node:sqlite, no package): the few calls of D1's that
 * tinier/d1.ts makes (its SQL interface), so the self-hosted process keeps its links, cards and daily counts with the
 * very statements the Workers run on Cloudflare. The tables are tinier/migrations/, applied in order on start; each
 * is safe on a database that has its tables already (0001_links.sql says why), so a restart applies them again.
 */
import { readdirSync, readFileSync } from 'node:fs';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { SQL } from '../tinier/d1.ts';

/** D1's prepare → bind → first, run or all, over a node:sqlite database; a statement is prepared once and kept. */
export function sqlite(db: DatabaseSync): SQL {
  const kept = new Map<string, ReturnType<DatabaseSync['prepare']>>();
  const statement = (query: string) => kept.get(query) ?? kept.set(query, db.prepare(query)).get(query)!;
  return {
    prepare: (query) => ({
      bind: (...values) => ({
        first: async <T>() => (statement(query).get(...(values as SQLInputValue[])) as T | undefined) ?? null,
        run: async () => ({ meta: { changes: Number(statement(query).run(...(values as SQLInputValue[])).changes) } }),
        all: async <T>() => ({ results: statement(query).all(...(values as SQLInputValue[])) as T[] }),
      }),
    }),
  };
}

/** tinier/migrations/, in the order `wrangler d1 migrations apply` takes them (by name: NNNN_name.sql). */
export const MIGRATIONS = new URL('../tinier/migrations/', import.meta.url);

/** Every migration, in order, on `db`; the database back. */
export function migrate(db: DatabaseSync): DatabaseSync {
  for (const f of readdirSync(MIGRATIONS).sort()) db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'));
  return db;
}
