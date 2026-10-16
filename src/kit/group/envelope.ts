/**
 * What a group's members write, sealed: every edit, comment and snapshot is an envelope (Paul, 2026-10-16: "people
 * can talk about a document, edit it and access it"). The words are JSON, encrypted with the epoch's key by AES-GCM
 * with the header (group, epoch, author, device) as additional data, then signed by the author's device over the
 * header, the IV and the ciphertext. A reader takes one only when the signature is the published key's, the author
 * was a member of that epoch, the key opens it, and, for edits and snapshots, the author was an editor; otherwise it
 * says why, as one of a few reasons. docs/groups.md says the design.
 */
import type { Op } from '../../doc/index.ts';
import { fromBase64Url, toBase64Url } from '../core/codec.ts';
import type { EpochKey, GroupState } from './group.ts';
import { canonical, deviceOf, sign, subtle, verify, type Device, type Directory } from './keys.ts';

/** What an envelope holds once opened. */
export type Body = { kind: 'ops'; ops: Op[] } | { kind: 'comment'; block?: number; text: string } | { kind: 'snapshot'; text: string };

/** The relay's number for an envelope (`seq`) is its own, outside what is signed: it orders, and can say nothing else. */
export interface Envelope {
  group: string;
  epoch: number;
  author: string;
  device: string;
  seq?: number;
  iv: string;
  ciphertext: string;
  signature: string;
}

/** Why an envelope was not taken. */
export type Rejection = 'unknown-device' | 'bad-signature' | 'not-a-member' | 'no-key' | 'bad-ciphertext' | 'bad-message' | 'not-an-editor';

const header = ({ group, epoch, author, device }: Envelope) => ({ group, epoch, author, device });
const signed = (e: Envelope) => ({ ...header(e), iv: e.iv, ciphertext: e.ciphertext });

/** A body sealed by `me` for `group` in `epoch`, under the epoch's key and a fresh IV. */
export async function seal(me: Device, group: string, epoch: number, k: EpochKey, body: Body): Promise<Envelope> {
  const head = { group, epoch, author: me.record.did, device: me.record.device };
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: canonical(head) as BufferSource },
    k.key,
    new TextEncoder().encode(JSON.stringify(body)) as BufferSource,
  );
  const e = { ...head, iv: toBase64Url(iv), ciphertext: toBase64Url(new Uint8Array(ct)), signature: '' };
  return { ...e, signature: await sign(me, signed(e)) };
}

const isBody = (b: unknown): b is Body => {
  const x = b as Record<string, unknown> | null;
  if (!x || typeof x !== 'object') return false;
  if (x.kind === 'ops') return Array.isArray(x.ops);
  if (x.kind === 'comment') return typeof x.text === 'string' && (x.block === undefined || Number.isInteger(x.block));
  return x.kind === 'snapshot' && typeof x.text === 'string';
};

/** An envelope checked and opened, in that order: the device, the signature, the membership, the key, the words, the role. */
export async function openEnvelope(e: Envelope, dir: Directory, state: GroupState, keys: Map<number, EpochKey>): Promise<{ body: Body } | { reason: Rejection }> {
  const record = await deviceOf(dir, e.author, e.device);
  if (!record) return { reason: 'unknown-device' };
  if (!(await verify(record, signed(e), e.signature))) return { reason: 'bad-signature' };
  const member = state.epochs.get(e.epoch)?.find((m) => m.did === e.author);
  if (!member) return { reason: 'not-a-member' };
  const k = keys.get(e.epoch);
  if (!k) return { reason: 'no-key' };
  let plain: ArrayBuffer;
  try {
    plain = await subtle().decrypt(
      { name: 'AES-GCM', iv: fromBase64Url(e.iv) as BufferSource, additionalData: canonical(header(e)) as BufferSource },
      k.key,
      fromBase64Url(e.ciphertext) as BufferSource,
    );
  } catch {
    return { reason: 'bad-ciphertext' };
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return { reason: 'bad-message' };
  }
  if (!isBody(body)) return { reason: 'bad-message' };
  if (body.kind !== 'comment' && member.role !== 'editor') return { reason: 'not-an-editor' };
  return { body };
}
