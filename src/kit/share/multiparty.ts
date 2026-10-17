/**
 * A document several people edit at once, over a journal (backends/README.md, "Multiparty, over the journal";
 * docs/kernel.md §12). The latest snapshot and the entries after it, opened and applied, are the text. Each change the
 * editor tells (`mount`'s onOps) is appended as it comes, the pending ops of the moment in one entry at the next seq;
 * an append the journal answers stale brings the entries past it, which are carried over the pending ops (the kernel's
 * `cross`) and handed to the editor (`applyRemote`), and the append is tried again. The others' entries come by the
 * held GET and are taken the same way. An entry whose ops do not apply to the journal's document, or leave one the text
 * would not read back as written (the kernel's checkOp and keptDoc), is passed over by every replica alike, since the
 * kernel is the same everywhere, so no one entry can part them; a writer whose own ops would not apply, a crossing the
 * kernel finds (Conflict), an entry that will not open, or a snapshot that is not the document as it is here, means
 * this replica has parted from the journal: the pending ops are let go and the document taken from the journal whole
 * again (rule 4: the journal's order is the document), which the page hears as a reset. Every SNAPSHOT_EVERY entries a
 * writer appends a snapshot, so a reader joining pays for the recent changes alone. Who did what is in every entry:
 * `by`, the writer's own word; the journal is the document's history, each entry a version (`versions`, `textAt`).
 */
import { applyAll, cross, keptDoc, parse, write, type Doc, type Op } from '../../doc/index.ts';
import { Journal, journalAddress, newSecret, openEntry, parseAddress, writerKeys, type Entry, type Kind } from './journal.ts';

/** An ops entry's content: who, when, which client (a writer knows its own entries as they come back) and the kernel's ops. */
export interface Ops {
  by: string;
  at: number;
  client: string;
  ops: Op[];
}
/** A snapshot's content: who wrote it and when, the app and the whole text. */
export interface Snapshot {
  by: string;
  at: number;
  app: string;
  text: string;
}
/** How many entries a writer lets pass before it appends a snapshot. */
export const SNAPSHOT_EVERY = 500;

/** A shared document, open: what the page holds beside the editor. */
export interface Shared {
  readonly app: string;
  /** The text as it was opened, for the editor's value. */
  readonly text: string;
  /** Whether this address writes (a reader's address only follows). */
  readonly writes: boolean;
  /** The journal's last seq applied here. */
  readonly seq: number;
  /** The editor's change, as its ops: appended as soon as it can be. */
  changed(ops: Op[]): void;
  /** Others' ops as they apply here, over what is pending: for the editor's applyRemote. */
  onRemote(fn: (ops: Op[]) => void): () => void;
  /** The document taken whole again (a crossing, or an entry that would not open): the editor's new value. */
  onReset(fn: (text: string) => void): () => void;
  /** Stop following and writing. */
  close(): void;
}

const clientId = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
/** The document with `ops` applied, as every replica takes an entry: null where they do not apply, or leave what the text would not keep. */
const applied = (doc: Doc, ops: Op[]): Doc | null => {
  try {
    const next = applyAll(doc, ops);
    keptDoc(next);
    return next;
  } catch {
    return null;
  }
};
const snapshotOf = (v: unknown): Snapshot | null => (v && typeof v === 'object' && typeof (v as Snapshot).text === 'string' && typeof (v as Snapshot).app === 'string' ? (v as Snapshot) : null);
const opsOf = (v: unknown): Ops | null => (v && typeof v === 'object' && Array.isArray((v as Ops).ops) ? (v as Ops) : null);

/**
 * A new shared document at `service`, of `app`, holding `text` (as an editor writes it), its first entry a snapshot by
 * `by`: the writer's address, to keep and to give a fellow writer, and the reader's, to give someone who follows.
 */
export async function newShared(service: string, app: string, text: string, by: string): Promise<{ address: string; reader: string }> {
  const secret = newSecret();
  const keys = await writerKeys(secret);
  await new Journal(service, keys).make({ by, at: Date.now(), app, text } satisfies Snapshot);
  return { address: journalAddress(service, keys.id, { secret }), reader: journalAddress(service, keys.id, { read: keys.read }) };
}

/** A shared document opened at its address, as `by` (the name its changes carry); null for an address that is not a journal's. */
export async function openShared(address: string, by: string): Promise<Shared | null> {
  const at = await parseAddress(address);
  if (!at) return null;
  const journal = new Journal(at.service, at.keys);
  /** This replica's mark on its entries; new after each reset, so an entry sent before one comes back as another's and is told. */
  let client = clientId();
  let doc: Doc = { head: {}, blocks: [] };
  let app = '';
  let seq = 0;
  let snapshotAt = 0;
  /** Ops applied here and not yet taken by the journal, in order. */
  let pending: Op[] = [];
  let closed = false;
  const remotes = new Set<(ops: Op[]) => void>();
  const resets = new Set<(text: string) => void>();
  const stop = new AbortController();
  /** One thing at a time with the journal: an append's answer and a poll's entries never cross. */
  let chain: Promise<unknown> = Promise.resolve();
  const serially = <T>(f: () => Promise<T>): Promise<T> => (chain = chain.then(f, f)) as Promise<T>;

  /** The document from the journal whole: the latest snapshot and what follows. */
  const load = async (): Promise<void> => {
    const got = await journal.read();
    const first = got.entries[0];
    const snap = first && first.kind === 'snapshot' ? snapshotOf(await openEntry(at.keys, first)) : null;
    if (!snap) throw new Error('the journal does not open');
    let d = parse(snap.text);
    for (const e of got.entries.slice(1)) {
      const content = opsOf(await openEntry(at.keys, e));
      if (!content) throw new Error('the journal does not open');
      d = applied(d, content.ops) ?? d;
    }
    doc = d;
    app = snap.app;
    seq = got.last;
    snapshotAt = got.snapshot;
    pending = [];
    client = clientId();
  };
  /** The document taken again, and the page told. */
  const reset = async (): Promise<void> => {
    await load();
    const text = write(doc);
    for (const fn of resets) fn(text);
  };
  /** Entries past `seq` taken in: a writer's own are what it had pending; the others' are carried over what is pending and told. */
  const take = async (entries: Entry[]): Promise<void> => {
    for (const e of entries) {
      if (e.seq <= seq) continue;
      if (e.seq !== seq + 1) return reset();
      if (e.kind === 'snapshot') {
        // Someone's snapshot: the document as the order left it, which is as it is here, or this replica has parted from the journal.
        const snap = snapshotOf(await openEntry(at.keys, e));
        if (!snap || snap.text !== write(doc)) return reset();
        seq = e.seq;
        snapshotAt = e.seq;
        continue;
      }
      const content = opsOf(await openEntry(at.keys, e));
      if (!content) return reset();
      const next = applied(doc, content.ops);
      if (content.client === client) {
        // Our own entry, taken by the journal before its answer reached us: already applied here (and checked before it went).
        if (!next) return reset();
        pending = pending.slice(content.ops.length);
      } else if (next) {
        try {
          const [mine, passed] = cross(pending, content.ops);
          pending = mine;
          for (const fn of remotes) fn(passed);
        } catch {
          return reset();
        }
      }
      doc = next ?? doc;
      seq = e.seq;
    }
  };
  /** Everything pending appended as one entry at the next seq, again after each stale answer, until it is taken. */
  const flush = (): Promise<void> =>
    serially(async () => {
      if (closed || !at.keys.token) return;
      try {
        while (pending.length && !closed) {
          const ops = pending.slice();
          // What the journal's document will be with them: an editor's ops apply where they were made, or this replica has parted from it.
          const next = applied(doc, ops);
          if (!next) return reset();
          const r = await journal.append(seq + 1, 'ops', { by, at: Date.now(), client, ops } satisfies Ops);
          if ('seq' in r) {
            seq = r.seq;
            pending = pending.slice(ops.length);
            doc = next;
            if (seq - snapshotAt >= SNAPSHOT_EVERY) {
              const s = await journal.append(seq + 1, 'snapshot', { by, at: Date.now(), app, text: write(doc) } satisfies Snapshot);
              if ('seq' in s) ((seq = s.seq), (snapshotAt = s.seq));
            }
          } else if (!r.entries.length) return reset();
          else await take(r.entries);
        }
      } catch {
        // The journal unreachable, or refusing: what is pending stays here for the next change, or the next poll.
      }
    });
  /** The held GET, again and again, until closed; a journal unreachable is asked again, slower each time. */
  const follow = async (): Promise<void> => {
    let pause = 1000;
    while (!closed) {
      try {
        const got = await journal.poll(seq, stop.signal);
        pause = 1000;
        if (got.entries.length) await serially(() => take(got.entries));
      } catch {
        if (closed) return;
        await new Promise((r) => setTimeout(r, pause));
        pause = Math.min(pause * 2, 30_000);
      }
    }
  };

  await load();
  const text = write(doc);
  void follow();
  return {
    app,
    text,
    writes: !!at.keys.token,
    get seq() {
      return seq;
    },
    changed(ops) {
      if (closed || !ops.length) return;
      pending = [...pending, ...ops];
      void flush();
    },
    onRemote: (fn) => (remotes.add(fn), () => void remotes.delete(fn)),
    onReset: (fn) => (resets.add(fn), () => void resets.delete(fn)),
    close() {
      closed = true;
      stop.abort();
    },
  };
}

/** One entry of a shared document's history: its place, who made it and when, and whether it is a snapshot. */
export interface Version {
  seq: number;
  by: string;
  at: number;
  kind: Kind;
}
/** The whole of a journal from its first entry, opened: each entry and what it holds; null for an address that is not a journal's or a journal that will not open. */
async function history(address: string): Promise<{ entries: Entry[]; contents: (Ops | Snapshot)[] } | null> {
  const at = await parseAddress(address);
  if (!at) return null;
  const { entries } = await new Journal(at.service, at.keys).read(1);
  const contents: (Ops | Snapshot)[] = [];
  for (const e of entries) {
    const c = e.kind === 'snapshot' ? snapshotOf(await openEntry(at.keys, e)) : opsOf(await openEntry(at.keys, e));
    if (!c) return null;
    contents.push(c);
  }
  return { entries, contents };
}
/** A shared document's history, oldest first. */
export async function versions(address: string): Promise<Version[] | null> {
  const h = await history(address);
  return h && h.entries.map((e, i) => ({ seq: e.seq, by: h.contents[i].by, at: h.contents[i].at, kind: e.kind }));
}
/** The document as it was after the entry at `seq`: the first snapshot and every entry through it applied. */
export async function textAt(address: string, seq: number): Promise<string | null> {
  const h = await history(address);
  if (!h || !h.entries.length || !('text' in h.contents[0])) return null;
  let doc = parse(h.contents[0].text);
  for (const [i, c] of h.contents.entries()) {
    if (h.entries[i].seq > seq) break;
    doc = 'text' in c ? parse(c.text) : (applied(doc, c.ops) ?? doc);
  }
  return write(doc);
}
