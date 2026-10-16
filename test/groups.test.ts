// Encrypted documents for small groups (issue #21): mock accounts with one or two devices each and a mock
// directory, a relay in Maps and on SQLite, and every client of every account reading the same relay. Who can read,
// who can write, who stops reading when removed, and every envelope that must be refused, with its reason.
import { describe, expect, test } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { parse, type Op } from '../src/doc/index.ts';
import { sqlite } from '../selfhost/sqlite.ts';
import { GroupClient } from '../src/kit/group/client.ts';
import { groupState, newEpochKey, signChange, unwrap } from '../src/kit/group/group.ts';
import { seal, type Envelope } from '../src/kit/group/envelope.ts';
import { newDevice, type Device, type DeviceRecord, type Directory } from '../src/kit/group/keys.ts';
import { SqlGroupStore, type GroupStore } from '../src/kit/group/store.ts';
import { MemGroupStore } from './memstore.ts';

const ALICE = 'did:plc:alice';
const BOB = 'did:plc:bob';
const CAROL = 'did:plc:carol';
const DAVE = 'did:plc:dave';
const TEXT = '# Plans\n\nWhere we go next.\n';

/** The devices the PDSes would publish, in a Map. */
class MockDirectory implements Directory {
  records = new Map<string, DeviceRecord[]>();
  add(d: Device) {
    this.records.set(d.record.did, [...(this.records.get(d.record.did) ?? []), d.record]);
  }
  async keysOf(did: string) {
    return this.records.get(did) ?? [];
  }
}

/** A paragraph put at the end of what `c` holds. */
const para = (c: GroupClient, words: string): Op[] => [{ op: 'splice', at: parse(c.text).blocks.length, n: 0, blocks: [{ k: 'p', runs: [{ t: words }] }] }];
const reasons = (c: GroupClient) => c.rejected.map((r) => r.reason);

const stores: [string, () => Promise<GroupStore>][] = [
  ['in Maps', async () => new MemGroupStore()],
  ['on SQLite', () => SqlGroupStore.over(sqlite(new DatabaseSync(':memory:')))],
];

describe.each(stores)('a group document, its relay %s', (_name, makeStore) => {
  async function world() {
    const dir = new MockDirectory();
    const alice = await newDevice(ALICE, 'alice-laptop');
    const bobPhone = await newDevice(BOB, 'bob-phone');
    const bobLaptop = await newDevice(BOB, 'bob-laptop');
    const carol = await newDevice(CAROL, 'carol-phone');
    const dave = await newDevice(DAVE, 'dave-laptop');
    for (const d of [alice, bobPhone, bobLaptop, carol, dave]) dir.add(d);
    const store = await makeStore();
    const a = await GroupClient.create(alice, dir, store, TEXT);
    return { dir, store, alice, bobPhone, bobLaptop, carol, dave, a };
  }

  test('Alice makes a group and edits; Bob, invited as an editor, reads it from the relay on his own client and edits; both come to the same text', async () => {
    const { dir, store, bobPhone, a } = await world();
    expect(a.text).toBe(TEXT);
    await a.edit(para(a, 'From Alice.'));
    await a.invite(BOB, 'editor');
    const b = await GroupClient.open(bobPhone, dir, store, a.group);
    expect(b.text).toBe(a.text);
    expect(b.text).toContain('From Alice.');
    await b.edit(para(b, 'From Bob.'));
    await b.comment('Shall we?', 1);
    await a.sync();
    expect(a.text).toBe(b.text);
    expect(a.text).toMatch(/From Alice\.\n\nFrom Bob\./);
    expect(a.comments).toEqual([{ seq: 4, author: BOB, block: 1, text: 'Shall we?' }]);
    expect([a.rejected, b.rejected]).toEqual([[], []]);
    expect(a.members).toEqual([
      { did: ALICE, role: 'editor' },
      { did: BOB, role: 'editor' },
    ]);
  });

  test('Carol, invited as a viewer, reads and comments; her edits are refused by the others (the signature is hers, the role is wrong), and she cannot invite', async () => {
    const { dir, store, carol, a } = await world();
    await a.invite(CAROL, 'viewer');
    const c = await GroupClient.open(carol, dir, store, a.group);
    expect(c.text).toBe(TEXT);
    await c.edit(para(c, 'From Carol.'));
    await c.comment('Nice.');
    await a.sync();
    expect(a.text).toBe(TEXT);
    expect(c.text).toBe(TEXT);
    expect(reasons(a)).toEqual(['not-an-editor']);
    expect(a.comments.map((m) => [m.author, m.text])).toEqual([[CAROL, 'Nice.']]);
    await expect(c.invite(DAVE, 'editor')).rejects.toThrow('only an editor');
  });

  test('Alice removes Bob: a new epoch; Bob keeps what he had but cannot open the next edit, by his keys or the relay’s rows; Carol and Alice can; his writes into the old epoch are refused', async () => {
    const { dir, store, bobPhone, carol, a } = await world();
    await a.invite(BOB, 'editor');
    await a.invite(CAROL, 'viewer');
    const b = await GroupClient.open(bobPhone, dir, store, a.group);
    const c = await GroupClient.open(carol, dir, store, a.group);
    await b.edit(para(b, 'From Bob.'));
    const had = b.text;

    await a.remove(BOB);
    expect(a.epoch).toBe(1);
    await a.edit(para(a, 'After Bob.'));
    await b.sync();
    await c.sync();
    expect(b.text).toBe(had);
    expect(reasons(b)).toEqual(['no-key', 'no-key']); // the new epoch's snapshot and the edit after it
    expect(c.text).toBe(a.text);
    expect(c.text).toMatch(/From Bob\.\n\nAfter Bob\./);

    // A fresh client of Bob's still opens everything before the removal, and nothing after it.
    const again = await GroupClient.open(bobPhone, dir, store, a.group);
    expect(again.text).toBe(had);
    // The relay holds no epoch 1 key for Bob, and his device opens none of the epoch 1 keys it holds for the others.
    const mine = await store.keysFor(a.group, BOB, 'bob-phone');
    expect(mine.map((w) => w.epoch)).toEqual([0]);
    expect(await unwrap(mine[0], bobPhone)).not.toBeNull();
    const theirs = [...(await store.keysFor(a.group, ALICE, 'alice-laptop')), ...(await store.keysFor(a.group, CAROL, 'carol-phone'))].filter((w) => w.epoch === 1);
    expect(theirs).toHaveLength(2);
    for (const w of theirs) expect(await unwrap({ ...w, did: BOB, device: 'bob-phone' }, bobPhone)).toBeNull();
    for (const w of theirs) expect(await unwrap(w, bobPhone)).toBeNull();
    // Bob cannot write either: no key for the epoch, and an envelope sealed in epoch 0 is too late.
    await expect(b.edit(para(b, 'Still here.'))).rejects.toThrow('no key');
    await store.append(a.group, await seal(bobPhone, a.group, 0, (await unwrap(mine[0], bobPhone))!, { kind: 'ops', ops: para(b, 'Still here.') }));
    await a.sync();
    expect(reasons(a)).toEqual(['stale-epoch']);
    expect(a.text).not.toContain('Still here.');
  });

  test('a tampered ciphertext, a tampered header, a forged author, a device not the author’s, an epoch the author was not in, a key that does not open it, a replay and another group’s envelope are each refused with their reason', async () => {
    const { dir, store, alice, bobPhone, carol, dave, a } = await world();
    await a.invite(CAROL, 'viewer');
    await a.edit(para(a, 'Real.'));
    const [real] = (await store.after(a.group, 1)).map(({ seq: _, ...e }) => e as Envelope);
    const before = a.text;
    const flip = (s: string) => (s[5] === 'A' ? 'B' : 'A');
    const k = await newEpochKey();
    const forged = await seal({ ...bobPhone, record: alice.record }, a.group, 0, k, { kind: 'ops', ops: para(a, 'Forged.') });
    const other = await GroupClient.create(alice, dir, store, TEXT);
    const sent: Envelope[] = [
      { ...real, ciphertext: real.ciphertext.slice(0, 5) + flip(real.ciphertext) + real.ciphertext.slice(6) },
      { ...real, epoch: 1 },
      forged,
      { ...(await seal(bobPhone, a.group, 0, k, { kind: 'comment', text: 'hi' })), author: ALICE },
      await seal(dave, a.group, 0, k, { kind: 'comment', text: 'let me in' }),
      await seal(carol, a.group, 0, k, { kind: 'comment', text: 'garbled' }),
      real,
      (await store.after(other.group, 0))[0],
    ];
    for (const e of sent) await store.append(a.group, e);
    await a.sync();
    expect(reasons(a)).toEqual(['bad-signature', 'bad-signature', 'bad-signature', 'unknown-device', 'not-a-member', 'bad-ciphertext', 'replayed', 'wrong-group']);
    expect(a.text).toBe(before);
    expect(a.comments).toEqual([]);
  });

  test('a change to the group counts only from an editor, and dropping someone takes a new epoch', async () => {
    const { dir, store, carol, a, alice } = await world();
    await a.invite(CAROL, 'viewer');
    const members = [...a.members, { did: DAVE, role: 'editor' as const }];
    await store.putChange(await signChange(carol, { group: a.group, n: 2, epoch: 0, members }));
    await a.sync();
    expect(a.members.map((m) => m.did)).toEqual([ALICE, CAROL]);
    expect((await groupState(dir, await store.changes(a.group)))!.rejected).toEqual([{ n: 2, reason: 'not-an-editor' }]);

    const s2 = await makeStore();
    const g = await GroupClient.create(alice, dir, s2, TEXT);
    await g.invite(CAROL, 'viewer');
    await s2.putChange(await signChange(alice, { group: g.group, n: 2, epoch: 0, members: [{ did: ALICE, role: 'editor' }] }));
    expect((await groupState(dir, await s2.changes(g.group)))!.rejected).toEqual([{ n: 2, reason: 'dropped-without-new-epoch' }]);
  });

  test('Bob’s second device reads and writes too; removing Bob removes both', async () => {
    const { dir, store, bobPhone, bobLaptop, a } = await world();
    await a.invite(BOB, 'editor');
    const phone = await GroupClient.open(bobPhone, dir, store, a.group);
    const laptop = await GroupClient.open(bobLaptop, dir, store, a.group);
    expect(laptop.text).toBe(a.text);
    await laptop.edit(para(laptop, 'From the laptop.'));
    await phone.sync();
    expect(phone.text).toBe(laptop.text);
    expect(phone.text).toContain('From the laptop.');

    await a.remove(BOB);
    await a.edit(para(a, 'Without Bob.'));
    for (const c of [phone, laptop]) {
      await c.sync();
      expect(c.text).not.toContain('Without Bob.');
      expect(reasons(c)).toEqual(['no-key', 'no-key']);
    }
    for (const device of ['bob-phone', 'bob-laptop']) expect((await store.keysFor(a.group, BOB, device)).map((w) => w.epoch)).toEqual([0]);
  });

  test('a late joiner reads the snapshot and what follows, and earlier epochs only when the past keys were given', async () => {
    const { dir, store, carol, dave, a } = await world();
    await a.edit(para(a, 'Epoch zero.'));
    await a.invite(BOB, 'editor');
    await a.remove(BOB);
    await a.edit(para(a, 'Epoch one.'));

    await a.invite(DAVE, 'editor');
    const d = await GroupClient.open(dave, dir, store, a.group);
    expect(d.text).toBe(a.text);
    expect(d.text).toMatch(/Epoch zero\.\n\nEpoch one\./);
    expect(reasons(d)).toEqual(['no-key', 'no-key']); // epoch 0's snapshot and edit
    expect((await store.keysFor(a.group, DAVE, 'dave-laptop')).map((w) => w.epoch)).toEqual([1]);

    await a.invite(CAROL, 'viewer', { past: true });
    const c = await GroupClient.open(carol, dir, store, a.group);
    expect(c.text).toBe(a.text);
    expect(c.rejected).toEqual([]);
    expect((await store.keysFor(a.group, CAROL, 'carol-phone')).map((w) => w.epoch)).toEqual([0, 1]);
  });
});
