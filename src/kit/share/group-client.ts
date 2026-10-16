/**
 * One device's view of a group document (issue #21; Paul, 2026-10-16: "exactly like a Signal chat"): it reads the
 * group's signed changes, opens the keys wrapped for this device, and takes the relay's envelopes in their order,
 * each checked (group-envelope.ts) before it counts. The document is the latest snapshot this device can read with
 * every edit after it applied by the kernel's applyAll; what the device writes goes to the relay and is taken back
 * from it in the same order as everyone else's, so every member's copy is the same text. An envelope of an epoch
 * older than one already taken is refused: whoever was removed cannot write into the past. docs/groups.md says the design.
 */
import { applyAll, parse, write, type Doc, type Op } from '../../doc/index.ts';
import { toBase64Url } from '../core/codec.ts';
import { groupState, newEpochKey, signChange, unwrap, wrap, type EpochKey, type GroupState, type Member, type Role } from './group.ts';
import { openEnvelope, seal, type Body, type Rejection } from './group-envelope.ts';
import type { Device, Directory } from './group-keys.ts';
import type { GroupStore } from './group-store.ts';

/** Why an envelope did not count: the envelope's reasons, or one of another group's, one written in an epoch already left, one seen before, or edits that do not apply. */
export type Reason = Rejection | 'wrong-group' | 'stale-epoch' | 'replayed' | 'bad-ops';

export interface Comment {
  seq: number;
  author: string;
  block?: number;
  text: string;
}

export class GroupClient {
  readonly group: string;
  /** The document as TLO text. */
  text = '';
  comments: Comment[] = [];
  /** Each envelope that did not count, with why. */
  rejected: { seq: number; reason: Reason }[] = [];
  private doc: Doc = parse('');
  private state: GroupState | null = null;
  private keys = new Map<number, EpochKey>();
  private seq = 0;
  private top = 0;
  /** The IVs of the envelopes taken: signed, random, so an envelope handed over twice is known (a signature is not, since ECDSA's can be altered and still verify). */
  private seen = new Set<string>();
  private me: Device;
  private dir: Directory;
  private store: GroupStore;

  private constructor(me: Device, dir: Directory, store: GroupStore, group: string) {
    this.me = me;
    this.dir = dir;
    this.store = store;
    this.group = group;
  }

  /** A new group for a document: its maker the one editor, epoch 0's key wrapped for each of the maker's devices, and the text as its first snapshot. */
  static async create(me: Device, dir: Directory, store: GroupStore, text: string): Promise<GroupClient> {
    const group = toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(16)));
    const c = new GroupClient(me, dir, store, group);
    await c.change(0, [{ did: me.record.did, role: 'editor' }], await newEpochKey());
    await c.post({ kind: 'snapshot', text });
    return c;
  }

  /** A group this device was let into, read from the relay. */
  static async open(me: Device, dir: Directory, store: GroupStore, group: string): Promise<GroupClient> {
    const c = new GroupClient(me, dir, store, group);
    await c.sync();
    return c;
  }

  /** Who is in the group now, and the epoch. */
  get members(): Member[] {
    return this.state?.last.members ?? [];
  }
  get epoch(): number {
    return this.state?.last.epoch ?? 0;
  }

  /** What the relay holds that this device has not taken yet: the changes, the keys wrapped for it, the envelopes past the last. */
  async sync(): Promise<void> {
    this.state = await groupState(this.dir, await this.store.changes(this.group));
    if (!this.state) throw new Error('no such group');
    for (const w of await this.store.keysFor(this.group, this.me.record.did, this.me.record.device)) {
      if (this.keys.has(w.epoch)) continue;
      const k = await unwrap(w, this.me);
      if (k) this.keys.set(w.epoch, k);
    }
    for (const e of await this.store.after(this.group, this.seq)) {
      this.seq = e.seq!;
      const reason = await this.take(e);
      if (reason) this.rejected.push({ seq: e.seq!, reason });
    }
    this.text = write(this.doc);
  }

  private async take(e: Parameters<typeof openEnvelope>[0]): Promise<Reason | null> {
    if (e.group !== this.group) return 'wrong-group';
    if (e.epoch < this.top) return 'stale-epoch';
    const opened = await openEnvelope(e, this.dir, this.state!, this.keys);
    if ('reason' in opened) return opened.reason;
    if (this.seen.has(e.iv)) return 'replayed';
    const { body } = opened;
    if (body.kind === 'ops') {
      try {
        this.doc = applyAll(this.doc, body.ops);
      } catch {
        return 'bad-ops';
      }
    } else if (body.kind === 'snapshot') this.doc = parse(body.text);
    else this.comments.push({ seq: e.seq!, author: e.author, ...(body.block === undefined ? {} : { block: body.block }), text: body.text });
    this.seen.add(e.iv);
    this.top = e.epoch;
    return null;
  }

  /** Edits to the document, refused here first if they do not apply to it. */
  async edit(ops: Op[]): Promise<void> {
    applyAll(this.doc, ops);
    await this.post({ kind: 'ops', ops });
  }

  async comment(text: string, block?: number): Promise<void> {
    await this.post({ kind: 'comment', text, ...(block === undefined ? {} : { block }) });
  }

  /** Let someone in: the current epoch's key wrapped for each of their devices, and with `past` every earlier epoch's this device holds. */
  async invite(did: string, role: Role, { past = false } = {}): Promise<void> {
    this.editor();
    if (this.members.some((m) => m.did === did)) throw new Error(`${did} is in the group`);
    const epochs = past ? [...this.keys.keys()] : [this.epoch];
    await this.change(this.epoch, [...this.members, { did, role }], null, did, epochs);
  }

  /** Take someone out: a new epoch, its key wrapped for every device that remains, and the text as its first snapshot. */
  async remove(did: string): Promise<void> {
    this.editor();
    const members = this.members.filter((m) => m.did !== did);
    if (members.length === this.members.length) throw new Error(`${did} is not in the group`);
    await this.change(this.epoch + 1, members, await newEpochKey());
    if (members.some((m) => m.did === this.me.record.did)) await this.post({ kind: 'snapshot', text: this.text });
  }

  private editor() {
    if (!this.members.some((m) => m.did === this.me.record.did && m.role === 'editor')) throw new Error('only an editor changes the group');
  }

  /**
   * The next change, signed, then the keys: a new epoch's (`fresh`) for every device of every member, or the epochs
   * given of this device's keys for the devices of `to` alone. The change goes first, so no key is wrapped for
   * someone the group does not yet say is in it.
   */
  private async change(epoch: number, members: Member[], fresh: EpochKey | null, to?: string, epochs: number[] = []): Promise<void> {
    const n = this.state ? this.state.last.n + 1 : 0;
    if (!(await this.store.putChange(await signChange(this.me, { group: this.group, n, epoch, members })))) throw new Error('the group changed first: sync, and try again');
    const wraps = [];
    for (const m of fresh ? members : members.filter((x) => x.did === to))
      for (const d of await this.dir.keysOf(m.did))
        for (const [e, k] of fresh ? ([[epoch, fresh]] as const) : epochs.map((e) => [e, this.keys.get(e)!] as const)) wraps.push(await wrap(k, d, this.group, e));
    await this.store.putKeys(wraps);
    await this.sync();
  }

  /** A body sealed in the current epoch and kept by the relay, then taken back in the relay's order. */
  private async post(body: Body): Promise<void> {
    const k = this.keys.get(this.epoch);
    if (!k) throw new Error('this device holds no key for the group now');
    await this.store.append(this.group, await seal(this.me, this.group, this.epoch, k, body));
    await this.sync();
  }
}
