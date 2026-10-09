// The shortener's rows in a Map: what D1 does, for the tests.
import type { Link, Revision, Store } from '../tinier/tinier.ts';

/** The rows in a Map: what D1 does, for the test. */
export class MemStore implements Store {
  rows = new Map<string, Link>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, link: Link) {
    if (this.rows.has(id)) return false;
    this.rows.set(id, link);
    return true;
  }
  async revise(id: string, rev: Revision) {
    const row = this.rows.get(id)!;
    this.rows.set(id, { ...row, ...rev, ver: row.ver + 1 });
  }
  async drop(id: string) {
    this.rows.delete(id);
  }
  async sweep(now: number) {
    let n = 0;
    for (const [id, l] of this.rows) if (l.exp < now) (this.rows.delete(id), n++);
    return n;
  }
}
