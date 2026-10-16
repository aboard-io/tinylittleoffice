/**
 * A device's keys for a group document (issue #21; Paul, 2026-10-16: "exactly like a Signal chat"). Every device a
 * person uses has two P-256 key pairs: ECDH, for the content keys wrapped to it, and ECDSA, for signing what it
 * writes. The private halves are made non-extractable, so not even this page can read them out; the public halves
 * are a DeviceRecord, the record its owner publishes in their atproto repository (`com.tinylittleoffice.deviceKey`),
 * and a Directory is where a client looks a person's devices up. WebCrypto alone; docs/groups.md says the design.
 */
import { fromBase64Url, toBase64Url } from '../core/codec.ts';

/** A device's public keys as published: JSON, so a PDS can keep it as a record. */
export interface DeviceRecord {
  did: string;
  device: string;
  ecdh: JsonWebKey;
  ecdsa: JsonWebKey;
  created: string;
}

/** One device: its published record and its two private keys, which never leave WebCrypto. */
export interface Device {
  record: DeviceRecord;
  ecdh: CryptoKey;
  ecdsa: CryptoKey;
}

/** Where a person's devices are found: their atproto repository, in time; a Map in the tests. */
export interface Directory {
  keysOf(did: string): Promise<DeviceRecord[]>;
}

export const subtle = () => globalThis.crypto.subtle;
export const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const;
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

/** A public JWK's four fields alone, so a record says nothing but the key. */
const bare = ({ kty, crv, x, y }: JsonWebKey): JsonWebKey => ({ kty, crv, x, y });

/** A new device for `did`: both key pairs made here, the private halves non-extractable. */
export async function newDevice(did: string, device: string, now = new Date()): Promise<Device> {
  const ecdh = await subtle().generateKey(ECDH, false, ['deriveBits']);
  const ecdsa = await subtle().generateKey(ECDSA, false, ['sign', 'verify']);
  return {
    record: { did, device, ecdh: bare(await subtle().exportKey('jwk', ecdh.publicKey)), ecdsa: bare(await subtle().exportKey('jwk', ecdsa.publicKey)), created: now.toISOString() },
    ecdh: ecdh.privateKey,
    ecdsa: ecdsa.privateKey,
  };
}

/** JSON with every object's keys in order: the one byte string a signature covers, however the object was built. */
export function canonical(value: unknown): Uint8Array {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .filter(([, x]) => x !== undefined)
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([k, x]) => [k, sorted(x)]),
          )
        : v;
  return new TextEncoder().encode(JSON.stringify(sorted(value)));
}

/** A signature by a device over `value`'s canonical bytes, as base64url. */
export async function sign(device: Device, value: unknown): Promise<string> {
  return toBase64Url(new Uint8Array(await subtle().sign(SIGN, device.ecdsa, canonical(value) as BufferSource)));
}

/** Whether `signature` is the published device's over `value`; false for a key or signature that will not even parse. */
export async function verify(record: DeviceRecord, value: unknown, signature: string): Promise<boolean> {
  try {
    const key = await subtle().importKey('jwk', record.ecdsa, ECDSA, false, ['verify']);
    return await subtle().verify(SIGN, key, fromBase64Url(signature) as BufferSource, canonical(value) as BufferSource);
  } catch {
    return false;
  }
}

/** The published record of `did`'s device `device`, or undefined. */
export const deviceOf = async (dir: Directory, did: string, device: string) => (await dir.keysOf(did)).find((r) => r.did === did && r.device === device);
