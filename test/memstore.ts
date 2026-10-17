// The shortener's rows and the journal's in Maps: what D1 and SQLite do, for the tests.
import { dayOf } from '../backends/tinier/brake.ts';
import type { Card } from '../backends/cards/cards.ts';
import type { Entry, Journal, Store as JournalStore } from '../backends/journal/journal.ts';
import type { Link, Store } from '../backends/tinier/tinier.ts';

/** The rows in Maps: what D1 does, for the test. */
export class MemStore implements Store {
  rows = new Map<string, Link>();
  brakes = new Map<string, { n: number; day: number }>();
  cards = new Map<string, Card & { png: Uint8Array }>();
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
  async card(id: string) {
    const c = this.cards.get(id);
    return c ? { app: c.app, title: c.title, text: c.text, exp: c.exp } : null;
  }
  async cardPng(id: string) {
    const c = this.cards.get(id);
    return c ? { png: c.png, exp: c.exp } : null;
  }
  async putCard(id: string, card: Card & { png: Uint8Array }) {
    if (this.cards.has(id)) return false;
    this.cards.set(id, card);
    return true;
  }
  async sweep(now: number) {
    const today = dayOf(now);
    for (const [id, l] of this.rows) if (l.exp < now) this.rows.delete(id);
    for (const [id, c] of this.cards) if (c.exp < now) this.cards.delete(id);
    for (const [h, b] of this.brakes) if (b.day !== today && b.day !== today - 1) this.brakes.delete(h);
  }
}

/** The journal's rows in Maps (backends/journal/journal.ts Store): what SQLite does, for the tests. */
export class JournalMemStore implements JournalStore {
  journals = new Map<string, Journal>();
  entries = new Map<string, Entry[]>();
  brakes = new Map<string, { n: number; day: number }>();
  async journal(id: string) {
    return this.journals.get(id) ?? null;
  }
  async make(j: Journal, first: Entry) {
    if (this.journals.has(j.id)) return false;
    this.journals.set(j.id, { ...j });
    this.entries.set(j.id, [first]);
    return true;
  }
  async append(id: string, e: Entry, exp: number) {
    const j = this.journals.get(id);
    if (!j || j.last !== e.seq - 1) return false;
    this.entries.get(id)!.push(e);
    Object.assign(j, { last: e.seq, bytes: j.bytes + e.c.length, exp, ...(e.kind === 'snapshot' ? { snapshot: e.seq } : {}) });
    return true;
  }
  async read(id: string, from: number) {
    return (this.entries.get(id) ?? []).filter((e) => e.seq >= from);
  }
  async touch(id: string, exp: number) {
    const j = this.journals.get(id);
    if (j) j.exp = exp;
  }
  async count(h: string, day: number) {
    const n = (this.brakes.get(h)?.n ?? 0) + 1;
    this.brakes.set(h, { n, day });
    return n;
  }
  async sweep(now: number) {
    const today = dayOf(now);
    for (const [id, j] of this.journals) if (j.exp < now) (this.journals.delete(id), this.entries.delete(id));
    for (const [h, b] of this.brakes) if (b.day !== today && b.day !== today - 1) this.brakes.delete(h);
  }
}
