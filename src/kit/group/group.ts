/**
 * A group per document: who is in it, as what, and the content key of each epoch (Paul, 2026-10-16: "people can talk
 * about a document, edit it and access it, and lose access when removed"). Small groups only, tens of people, so no
 * MLS: a random AES-GCM 256 key per epoch, wrapped for each member device by ECDH with a one-time key pair, HKDF-SHA-256
 * and AES-GCM. Adding someone wraps the current key for their devices; removing someone starts a new epoch whose key
 * is wrapped only for the devices that remain. Every change is a signed record, numbered from 0, and a client takes a
 * change only when an editor of the group as it stood made it. docs/groups.md says the design and what it leaves open.
 */
import { fromBase64Url, toBase64Url } from '../core/codec.ts';
import { deviceOf, ECDH, sign, subtle, verify, type Device, type DeviceRecord, type Directory } from './keys.ts';

export type Role = 'editor' | 'viewer';
export interface Member {
  did: string;
  role: Role;
}

/** A change to the group: the members from change `n` on, in `epoch`, signed by `by`'s `device`. */
export interface Change {
  group: string;
  n: number;
  epoch: number;
  members: Member[];
  by: string;
  device: string;
  signature: string;
}

/** An epoch's content key wrapped for one device: the one-time public key, an IV and the key under AES-GCM. */
export interface Wrapped {
  group: string;
  epoch: number;
  did: string;
  device: string;
  eph: JsonWebKey;
  iv: string;
  key: string;
}

/** An epoch's key, raw (to wrap again for someone invited) and as the AES-GCM key that seals and opens. */
export interface EpochKey {
  raw: Uint8Array;
  key: CryptoKey;
}

const random = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const aes = (raw: Uint8Array) => subtle().importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** A new epoch's key: 32 random bytes. */
export const newEpochKey = async (): Promise<EpochKey> => {
  const raw = random(32);
  return { raw, key: await aes(raw) };
};

/** HKDF's info for a wrap: the group, the epoch and the device, so a wrapped key is for that one place alone. */
const info = (group: string, epoch: number, did: string, device: string) => new TextEncoder().encode(`tinylittleoffice group key v1\0${group}\0${epoch}\0${did}\0${device}`);

/** The AES-GCM key one ECDH agreement gives, through HKDF-SHA-256. */
async function wrapping(priv: CryptoKey, pub: JsonWebKey, label: Uint8Array): Promise<CryptoKey> {
  const other = await subtle().importKey('jwk', pub, ECDH, false, []);
  const bits = await subtle().deriveBits({ name: 'ECDH', public: other }, priv, 256);
  const base = await subtle().importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: label as BufferSource }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** An epoch's key wrapped for a device, under a one-time key pair forgotten as this returns. */
export async function wrap(k: EpochKey, to: DeviceRecord, group: string, epoch: number): Promise<Wrapped> {
  const eph = await subtle().generateKey(ECDH, false, ['deriveBits']);
  const label = info(group, epoch, to.did, to.device);
  const iv = random(12);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: label as BufferSource }, await wrapping(eph.privateKey, to.ecdh, label), k.raw as BufferSource);
  const { kty, crv, x, y } = await subtle().exportKey('jwk', eph.publicKey);
  return { group, epoch, did: to.did, device: to.device, eph: { kty, crv, x, y }, iv: toBase64Url(iv), key: toBase64Url(new Uint8Array(ct)) };
}

/** A wrapped key opened by the device it was wrapped for; null when it was not for this device, or was altered. */
export async function unwrap(w: Wrapped, me: Device): Promise<EpochKey | null> {
  try {
    const label = info(w.group, w.epoch, me.record.did, me.record.device);
    const raw = new Uint8Array(
      await subtle().decrypt(
        { name: 'AES-GCM', iv: fromBase64Url(w.iv) as BufferSource, additionalData: label as BufferSource },
        await wrapping(me.ecdh, w.eph, label),
        fromBase64Url(w.key) as BufferSource,
      ),
    );
    return { raw, key: await aes(raw) };
  } catch {
    return null;
  }
}

/** A change signed by `me`. */
export async function signChange(me: Device, change: Omit<Change, 'by' | 'device' | 'signature'>): Promise<Change> {
  const body = { ...change, by: me.record.did, device: me.record.device };
  return { ...body, signature: await sign(me, body) };
}

/** Why a change was not taken. */
export type ChangeRejection = 'out-of-order' | 'unknown-device' | 'bad-signature' | 'not-an-editor' | 'dropped-without-new-epoch';

/** The group as its changes leave it: the members of each epoch (all who were in it), and the latest change. */
export interface GroupState {
  epochs: Map<number, Member[]>;
  last: Change;
  rejected: { n: number; reason: ChangeRejection }[];
}

const same = (a: Member[], b: Member[]) => b.every((m) => a.some((x) => x.did === m.did && x.role === m.role));

/**
 * The changes taken in order, each only if it is the next number, signed by a published device of its maker, and
 * its maker an editor: of the group as change 0 itself says for the first, of the group before it for every other.
 * Within an epoch members are only added; someone dropped means a new epoch, so a member's key is never kept from
 * the people it should be. The first change that fails stops the chain: nothing after it can be trusted. Null with no change 0.
 */
export async function groupState(dir: Directory, changes: Change[]): Promise<GroupState | null> {
  const epochs = new Map<number, Member[]>();
  const rejected: GroupState['rejected'] = [];
  let last: Change | undefined;
  for (const c of [...changes].sort((a, b) => a.n - b.n)) {
    const { signature, ...body } = c;
    const before = last?.members ?? c.members;
    const record = await deviceOf(dir, c.by, c.device);
    const reason: ChangeRejection | null =
      c.n !== (last ? last.n + 1 : 0) || c.epoch < (last?.epoch ?? 0) || c.epoch > (last ? last.epoch + 1 : 0)
        ? 'out-of-order'
        : !record
          ? 'unknown-device'
          : !(await verify(record, body, signature))
            ? 'bad-signature'
            : !before.some((m) => m.did === c.by && m.role === 'editor')
              ? 'not-an-editor'
              : last && c.epoch === last.epoch && !same(c.members, last.members)
                ? 'dropped-without-new-epoch'
                : null;
    if (reason) {
      rejected.push({ n: c.n, reason });
      break;
    }
    epochs.set(c.epoch, c.members);
    last = c;
  }
  return last ? { epochs, last, rejected } : null;
}
