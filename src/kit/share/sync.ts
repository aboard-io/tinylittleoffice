/**
 * A person's own store of documents, kept in sync across their devices (backends/README.md, "Sync, over the journal"):
 * a journal whose entries are snapshots of an index, the documents the person has, each a shared document's address
 * (src/kit/share/multiparty.ts), its app, its name and when it last changed, and nothing else. Its secret is made by
 * the app, shown once and given to each other device by hand, so the index and every document in it follow the person;
 * a document shared with someone is one whose address they were given, added to their own index. The server holds
 * ciphertext and an order, never a name or who has what.
 */
import { Journal, journalAddress, newSecret, openEntry, parseAddress, writerKeys, type Keys } from './journal.ts';
import { newShared } from './multiparty.ts';

/** A document as the index holds it. */
export interface Kept {
  /** The document's journal id: what makes it the same document across devices. */
  id: string;
  /** Its address, a writer's or a reader's (src/kit/share/journal.ts journalAddress). */
  address: string;
  app: string;
  title: string;
  /** When it was last added, renamed or made here, ms since the epoch. */
  at: number;
}
/** The index as an entry holds it: every document, and who wrote the index when. */
interface Index {
  by: string;
  at: number;
  documents: Kept[];
}

/** A store opened by its address (a writer's: a reader's could only look). */
export class SyncStore {
  readonly address: string;
  private journal: Journal;
  private keys: Keys;
  private by: string;
  private seq = 0;
  private documents: Kept[] = [];
  private watchers = new Set<(documents: Kept[]) => void>();
  private stop = new AbortController();
  private closed = false;
  private constructor(address: string, service: string, keys: Keys, by: string) {
    this.address = address;
    this.journal = new Journal(service, keys);
    this.keys = keys;
    this.by = by;
  }

  /** A new store at `service`: its journal made with an empty index. Its address is the thing to keep, and to give the next device. */
  static async make(service: string, by: string): Promise<SyncStore> {
    const secret = newSecret();
    const keys = await writerKeys(secret);
    const store = new SyncStore(journalAddress(service, keys.id, { secret }), service, keys, by);
    await store.journal.make({ by, at: Date.now(), documents: [] } satisfies Index);
    store.seq = 1;
    return store;
  }
  /** The store an address names, its index read; null for an address that is not a journal's. */
  static async open(address: string, by: string): Promise<SyncStore | null> {
    const at = await parseAddress(address);
    if (!at) return null;
    const store = new SyncStore(address, at.service, at.keys, by);
    await store.read();
    return store;
  }

  /** The documents, newest first. */
  list(): Kept[] {
    return [...this.documents].sort((a, b) => b.at - a.at);
  }
  /** The latest index from the journal. */
  private async read(): Promise<void> {
    const got = await this.journal.read();
    const last = got.entries.at(-1);
    const index = last ? await openEntry<Index>(this.keys, last) : null;
    if (!index || !Array.isArray(index.documents)) throw new Error('the store does not open');
    this.documents = index.documents.filter((k) => k && typeof k.id === 'string' && typeof k.address === 'string');
    this.seq = got.last;
  }
  /** The index written as `change` leaves it; another device's writing in between is read first and changed instead. */
  private async write(change: (documents: Kept[]) => Kept[]): Promise<void> {
    for (let tries = 0; tries < 8; tries++) {
      const documents = change(this.documents);
      const r = await this.journal.append(this.seq + 1, 'snapshot', { by: this.by, at: Date.now(), documents } satisfies Index);
      if ('seq' in r) {
        this.documents = documents;
        this.seq = r.seq;
        return;
      }
      await this.read();
    }
    throw new Error('the store is being written from elsewhere; try again');
  }
  /** A document put in the index (one already there, the same id, is replaced). */
  add(kept: Omit<Kept, 'at'>): Promise<void> {
    return this.write((docs) => [...docs.filter((d) => d.id !== kept.id), { ...kept, at: Date.now() }]);
  }
  /** A document taken out of the index: the journal itself stays for whoever else has its address, until it expires. */
  remove(id: string): Promise<void> {
    return this.write((docs) => docs.filter((d) => d.id !== id));
  }
  /** A document renamed. */
  rename(id: string, title: string): Promise<void> {
    return this.write((docs) => docs.map((d) => (d.id === id ? { ...d, title, at: Date.now() } : d)));
  }
  /** A new document of `app` with `text`: its own journal made with a snapshot, its writer's address kept here. */
  async create(service: string, app: string, text: string, title: string): Promise<Kept> {
    const { address } = await newShared(service, app, text, this.by);
    const id = (await parseAddress(address))!.id;
    await this.add({ id, address, app, title });
    return this.documents.find((d) => d.id === id)!;
  }
  /** Told the documents each time another device writes the index, until the function returned is called. */
  watch(fn: (documents: Kept[]) => void): () => void {
    this.watchers.add(fn);
    if (this.watchers.size === 1) void this.follow();
    return () => void this.watchers.delete(fn);
  }
  private async follow(): Promise<void> {
    let pause = 1000;
    while (!this.closed && this.watchers.size) {
      try {
        const got = await this.journal.poll(this.seq, this.stop.signal);
        pause = 1000;
        if (got.last > this.seq) {
          await this.read();
          for (const fn of this.watchers) fn(this.list());
        }
      } catch {
        if (this.closed) return;
        await new Promise((r) => setTimeout(r, pause));
        pause = Math.min(pause * 2, 30_000);
      }
    }
  }
  close(): void {
    this.closed = true;
    this.stop.abort();
  }
}
