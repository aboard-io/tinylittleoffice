// The shortener's rows in Maps, and a group relay's: what D1 does, for the tests.
import { dayOf } from '../tinier/brake.ts';
import type { Card } from '../tinier/cards.ts';
import type { Link, Store } from '../tinier/tinier.ts';
import type { Change, Wrapped } from '../src/kit/share/group.ts';
import type { Envelope } from '../src/kit/share/group-envelope.ts';
import type { GroupStore } from '../src/kit/share/group-store.ts';

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

/** A group relay's rows in arrays: what SqlGroupStore does, for the tests (test/groups.test.ts). */
export class MemGroupStore implements GroupStore {
  messages = new Map<string, Envelope[]>();
  wrapped: Wrapped[] = [];
  changeRows: Change[] = [];
  async append(group: string, e: Envelope) {
    const list = this.messages.get(group) ?? this.messages.set(group, []).get(group)!;
    list.push({ ...e, seq: list.length + 1 });
    return list.length;
  }
  async after(group: string, seq: number) {
    return (this.messages.get(group) ?? []).filter((e) => e.seq! > seq).map((e) => ({ ...e }));
  }
  async putKeys(keys: Wrapped[]) {
    for (const w of keys) {
      this.wrapped = this.wrapped.filter((x) => !(x.group === w.group && x.epoch === w.epoch && x.did === w.did && x.device === w.device));
      this.wrapped.push(w);
    }
  }
  async keysFor(group: string, did: string, device: string) {
    return this.wrapped.filter((w) => w.group === group && w.did === did && w.device === device).sort((a, b) => a.epoch - b.epoch);
  }
  async putChange(c: Change) {
    if (this.changeRows.some((x) => x.group === c.group && x.n === c.n)) return false;
    this.changeRows.push(c);
    return true;
  }
  async changes(group: string) {
    return this.changeRows.filter((c) => c.group === group).sort((a, b) => a.n - b.n);
  }
}
