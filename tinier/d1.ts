/** The shortener's rows in Cloudflare D1 (tinier/migrations/): the Store tinier.ts asks for, and the cards the site's Worker keeps there too. */
import { dayOf } from './brake.ts';
import type { Card } from './cards.ts';
import type { Link, Store } from './tinier.ts';

type Value = string | number | Uint8Array;
/** The few calls of D1's the stores make, tinier's here and the group relay's (src/kit/share/group-store.ts): a D1Database has them all; the tests give them node's SQLite. */
export interface SQL {
  prepare(query: string): {
    bind(...values: Value[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
      all<T>(): Promise<{ results: T[] }>;
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
  async card(id: string) {
    return (await this.db.prepare('SELECT app, title, text, exp FROM cards WHERE id = ?').bind(id).first<Card>()) ?? null;
  }
  /** The picture alone; D1 hands a BLOB back as an array of bytes, node's SQLite as a Uint8Array. */
  async cardPng(id: string) {
    const row = await this.db.prepare('SELECT png, exp FROM cards WHERE id = ?').bind(id).first<{ png: ArrayLike<number> | ArrayBuffer; exp: number }>();
    return row ? { png: new Uint8Array(row.png as ArrayLike<number>), exp: row.exp } : null;
  }
  async putCard(id: string, { app, title, text, png, exp }: Card & { png: Uint8Array }) {
    const r = await this.db.prepare('INSERT OR IGNORE INTO cards (id, app, title, text, png, exp) VALUES (?, ?, ?, ?, ?, ?)').bind(id, app, title, text, png, exp).run();
    return r.meta.changes === 1;
  }
  async sweep(now: number) {
    const today = dayOf(now);
    await this.db.prepare('DELETE FROM links WHERE exp < ?').bind(now).run();
    await this.db.prepare('DELETE FROM cards WHERE exp < ?').bind(now).run();
    await this.db
      .prepare('DELETE FROM brakes WHERE day NOT IN (?, ?)')
      .bind(today, today - 1)
      .run();
  }
}
