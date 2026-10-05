/**
 * URL codec: turns a document string into the shortest fragment we can manage
 * and back again. The whole document lives in the URL, so every byte counts.
 *
 * Two encodings are tried and the shorter wins:
 *   z<base64url(deflate-raw(utf8))>   compressed
 *   r<base64url(utf8)>                raw (wins for very short docs)
 */
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

/** Hard ceiling for the full URL, as requested: 2 KB. */
export const URL_LIMIT = 2048;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_REV: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) B64_REV[B64[i]] = i;

export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8);
    out += B64[n >> 18] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
  }
  return out;
}

export function fromBase64Url(s: string): Uint8Array {
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64_REV[ch];
    if (v === undefined) throw new Error('bad base64url');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 255);
    }
  }
  return new Uint8Array(out);
}

/** Encode a document string into a URL-safe payload. */
export function encodeDoc(doc: string): string {
  if (!doc) return '';
  const bytes = strToU8(doc);
  const raw = 'r' + toBase64Url(bytes);
  const packed = 'z' + toBase64Url(deflateSync(bytes, { level: 9, mem: 12 }));
  return packed.length < raw.length ? packed : raw;
}

/** Decode a payload created by encodeDoc. Returns '' for anything unreadable. */
export function decodeDoc(payload: string): string {
  if (!payload) return '';
  try {
    const mode = payload[0];
    const body = fromBase64Url(payload.slice(1));
    if (mode === 'z') return strFromU8(inflateSync(body));
    if (mode === 'r') return strFromU8(body);
  } catch {
    /* fall through */
  }
  return '';
}

export interface Budget {
  /** Characters consumed by origin + path + "#/app/" prefix. */
  overhead: number;
  /** Characters available for the payload. */
  available: number;
}

/** Work out how many characters of payload fit under URL_LIMIT for a given prefix. */
export function budgetFor(prefixUrl: string): Budget {
  const overhead = prefixUrl.length;
  return { overhead, available: Math.max(0, URL_LIMIT - overhead) };
}
