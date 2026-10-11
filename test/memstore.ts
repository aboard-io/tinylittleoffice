// The shortener's rows in Maps: what D1 does, for the tests.
import { dayOf, type Link, type Store } from '../tinier/tinier.ts';

/** The rows in Maps: what D1 does, for the test. */
export class MemStore implements Store {
  rows = new Map<string, Link>();
  brakes = new Map<string, { n: number; day: number }>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, link: Link) {
    if (this.rows.has(id)) return false;
    this.rows.set(id, link);
    return true;
  }
  async drop(id: string) {
    this.rows.delete(id);
  }
  async count(h: string, day: number) {
    const n = (this.brakes.get(h)?.n ?? 0) + 1;
    this.brakes.set(h, { n, day });
    return n;
  }
  async sweep(now: number) {
    const today = dayOf(now);
    for (const [id, l] of this.rows) if (l.exp < now) this.rows.delete(id);
    for (const [h, b] of this.brakes) if (b.day !== today && b.day !== today - 1) this.brakes.delete(h);
  }
}
