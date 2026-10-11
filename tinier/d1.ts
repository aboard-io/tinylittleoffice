/** The shortener's rows in Cloudflare D1 (tinier/schema.sql, tinier/migrations/): the Store tinier.ts asks for. */
import { dayOf, type Link, type Store } from './tinier.ts';

/** The few calls of D1's the store makes (a D1Database has them all; the tests give it node's SQLite). */
export interface SQL {
  prepare(query: string): {
    bind(...values: (string | number)[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
}

export class D1Store implements Store {
  private db: SQL;
  constructor(db: SQL) {
    this.db = db;
  }
  async get(id: string) {
    return (await this.db.prepare('SELECT c, iv, exp FROM links WHERE id = ?').bind(id).first<Link>()) ?? null;
  }
  async put(id: string, { c, iv, exp }: Link) {
    const r = await this.db.prepare('INSERT OR IGNORE INTO links (id, c, iv, exp) VALUES (?, ?, ?, ?)').bind(id, c, iv, exp).run();
    return r.meta.changes === 1;
  }
  async drop(id: string) {
    await this.db.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
  }
  /** One statement, so two requests at once cannot both be counted as the hundredth. */
  async count(h: string, day: number) {
    const row = await this.db.prepare('INSERT INTO brakes (h, n, day) VALUES (?, 1, ?) ON CONFLICT (h) DO UPDATE SET n = n + 1 RETURNING n').bind(h, day).first<{ n: number }>();
    return row?.n ?? 1;
  }
  async sweep(now: number) {
    const today = dayOf(now);
    await this.db.prepare('DELETE FROM links WHERE exp < ?').bind(now).run();
    await this.db
      .prepare('DELETE FROM brakes WHERE day NOT IN (?, ?)')
      .bind(today, today - 1)
      .run();
  }
}
