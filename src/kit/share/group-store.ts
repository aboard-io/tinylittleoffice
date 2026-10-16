/**
 * The relay's rows for group documents, in tinier's shape (Paul, 2026-10-16: "a relay of tinier's shape orders
 * them"): a GroupStore keeps each group's envelopes under the numbers it gives them, the content keys wrapped for
 * each device, and the signed changes to who is in it. It holds ciphertext, sizes, times and DIDs, never a key it can
 * use or a word it can read. SqlGroupStore keeps them over the few calls of D1's tinier/d1.ts makes (its SQL), so D1
 * and the self-hosted process's node:sqlite run the same statements; the tests keep them in Maps too. No HTTP yet.
 */
import type { SQL } from '../../../tinier/d1.ts';
import type { Envelope } from './group-envelope.ts';
import type { Change, Wrapped } from './group.ts';

export interface GroupStore {
  /** Keep an envelope as the group's next; its number back, 1 for the first. */
  append(group: string, e: Envelope): Promise<number>;
  /** The group's envelopes numbered past `seq`, in order, each with its `seq`. */
  after(group: string, seq: number): Promise<Envelope[]>;
  putKeys(keys: Wrapped[]): Promise<void>;
  /** Every epoch's key wrapped for this device. */
  keysFor(group: string, did: string, device: string): Promise<Wrapped[]>;
  /** Keep a change under its number; false if that number is taken, so two editors cannot both make change n. */
  putChange(c: Change): Promise<boolean>;
  /** The group's changes, by number. */
  changes(group: string): Promise<Change[]>;
}

/** The tables, each made only when missing. */
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS group_messages (grp TEXT NOT NULL, seq INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY (grp, seq))',
  'CREATE TABLE IF NOT EXISTS group_keys (grp TEXT NOT NULL, epoch INTEGER NOT NULL, did TEXT NOT NULL, device TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY (grp, did, device, epoch))',
  'CREATE TABLE IF NOT EXISTS group_changes (grp TEXT NOT NULL, n INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY (grp, n))',
];

type Row = { body: string };

export class SqlGroupStore implements GroupStore {
  private db: SQL;
  private constructor(db: SQL) {
    this.db = db;
  }
  /** A store over `db`, its tables made first. */
  static async over(db: SQL): Promise<SqlGroupStore> {
    for (const q of SCHEMA) await db.prepare(q).bind().run();
    return new SqlGroupStore(db);
  }
  /** One statement, so two envelopes at once cannot both be given the same number. */
  async append(group: string, { seq: _, ...e }: Envelope) {
    const q = 'INSERT INTO group_messages (grp, seq, body) SELECT ?, COALESCE(MAX(seq), 0) + 1, ? FROM group_messages WHERE grp = ? RETURNING seq';
    return (await this.db.prepare(q).bind(group, JSON.stringify(e), group).first<{ seq: number }>())!.seq;
  }
  async after(group: string, seq: number) {
    const { results } = await this.db.prepare('SELECT seq, body FROM group_messages WHERE grp = ? AND seq > ? ORDER BY seq').bind(group, seq).all<Row & { seq: number }>();
    return results.map((r) => ({ ...(JSON.parse(r.body) as Envelope), seq: r.seq }));
  }
  async putKeys(keys: Wrapped[]) {
    for (const w of keys)
      await this.db.prepare('INSERT OR REPLACE INTO group_keys (grp, epoch, did, device, body) VALUES (?, ?, ?, ?, ?)').bind(w.group, w.epoch, w.did, w.device, JSON.stringify(w)).run();
  }
  async keysFor(group: string, did: string, device: string) {
    const { results } = await this.db.prepare('SELECT body FROM group_keys WHERE grp = ? AND did = ? AND device = ? ORDER BY epoch').bind(group, did, device).all<Row>();
    return results.map((r) => JSON.parse(r.body) as Wrapped);
  }
  async putChange(c: Change) {
    return (await this.db.prepare('INSERT OR IGNORE INTO group_changes (grp, n, body) VALUES (?, ?, ?)').bind(c.group, c.n, JSON.stringify(c)).run()).meta.changes === 1;
  }
  async changes(group: string) {
    const { results } = await this.db.prepare('SELECT body FROM group_changes WHERE grp = ? ORDER BY n').bind(group).all<Row>();
    return results.map((r) => JSON.parse(r.body) as Change);
  }
}
