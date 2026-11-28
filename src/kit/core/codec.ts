/**
 * The link codec: a document's text as the shortest fragment we can manage, and back. The whole document
 * lives in the URL, so every byte counts. A payload's first letter says how it was packed, and the letters of the
 * two versions are never the same, so a payload read anywhere (a link, the journal, a paste) is read the way it was
 * written. Links are written in v2; v1's are read forever, by v1's code here, unchanged (test/links.test.ts holds
 * every link a release made to that).
 *
 * v2 (issue #23, Oskar Austegard's proposal; Paul, 2026-11-28), "#/v2/<app>/<payload>":
 *   w<crc><base62(deflate-raw(utf8, DICTIONARY_V2))>  compressed against v2's dictionary of 16 KB
 *   v<crc><base62(deflate-raw(utf8))>                 compressed, without a dictionary
 *   e<crc><base62(salt | iv | AES-GCM(flag + packed bytes))>  sealed under a password (kit/share/crypt.ts)
 * <crc> is three base62 characters of CRC-16 over the flag's byte and the bytes, so a link cut short, or with a
 * word glued to its end, is an error, never another document. base62 ("0-9A-Za-z") carries no punctuation for a chat
 * or a mail client to escape, break at or leave out of the link: the reader takes every other character out, after
 * percent-decoding the payload until it stops changing (cleanPayload). Upper-case letters are kept for a QR body.
 *
 * v1, "#/v1/<app>/<payload>", read and never written:
 *   y<base64url(deflate-raw(utf8, DICTIONARY))>   compressed against the dictionary of TLO's own words
 *   z<base64url(deflate-raw(utf8))>               compressed, without a dictionary
 *   r<base64url(utf8)>                            raw (wins for very short documents)
 *   E<base64url(salt | iv | AES-GCM(flag + packed bytes))>  sealed (kit/share/crypt.ts)
 * A sealed payload decodeDoc reads as nothing, and the shell asks for the password instead.
 *
 * "base64url" here is RFC 4648's URL alphabet with "~" for 62 where the RFC has "-": a hyphen is a place a line
 * may break (UAX #14), so a long link full of them was cut wherever a mail client or a chat wrapped it, and "~"
 * is unreserved in a URL and breaks nowhere. Reading is lenient: "-" is 62 too, so every link made before opens.
 *
 * A link carries its payload with a "+" after every 300 characters (withBreaks; kit/core/route.ts routeHash writes
 * it, parseHash takes it out): iMessage and Signal do not make a link of one whose run of letters and digits is
 * longer than 301 characters (https://www.patrickweaver.net/blog/imessage-mystery/), and "~" and "_" fall where
 * the bytes put them, so a long payload could hold such a run. "+" is not in the alphabet, is allowed in a URL's
 * fragment, iMessage takes it as a break, and it is no place a line may break. A payload is the same without its
 * breaks: a link made before them opens, and fromBase64Url passes over them.
 *
 * fflate rather than the browser's CompressionStream: the native API has no dictionary, is asynchronous,
 * and is absent under node for the tests; the dictionary is what makes short documents 20 to 35 percent
 * smaller. The dictionaries' bytes never change: a link made under them opens only under them.
 */
import { Inflate, deflateSync, strToU8, strFromU8 } from 'fflate';
import { DICTIONARY_V2_TEXT } from './dictionary-v2.ts';

/**
 * The link the header's meter counts to: 2,048 characters, the length a link was safe at everywhere when Internet
 * Explorer stopped at 2,083, and that much software passing links on still keeps. No browser in use stops here (Chrome
 * at 2,097,152, Firefox at 1,048,576): kit/share/limits.ts says every limit, and the Share dialog's table states them.
 */
export const URL_LIMIT = 2048;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_';
const B64_REV: Record<string, number> = { '-': 62 };
for (let i = 0; i < B64.length; i++) B64_REV[B64[i]] = i;

/** What a link puts in its payload so no run of letters and digits is longer than BREAK_EVERY. */
export const BREAK = '+';
/** iMessage and Signal take a run of up to 301; 300 leaves the payload's breaks on round numbers. */
export const BREAK_EVERY = 300;

/** A payload as a link carries it: a BREAK after every BREAK_EVERY characters (never at its end). */
export function withBreaks(payload: string): string {
  const bare = withoutBreaks(payload);
  const parts: string[] = [];
  for (let i = 0; i < bare.length; i += BREAK_EVERY) parts.push(bare.slice(i, i + BREAK_EVERY));
  return parts.join(BREAK);
}

/** A payload without its breaks: what the codec and the seal read. "%2B" too, a "+" something on the way percent-encoded. */
export const withoutBreaks = (payload: string): string => payload.replace(/\+|%2B/gi, '');

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
    if (ch === BREAK) continue;
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

/**
 * Deflate can be primed with text both sides already know. Short documents are mostly made of things every
 * document has (common words, the apps' own markup, icon names), so a document that refers back into this
 * dictionary instead of spelling those out comes out a good deal shorter.
 *
 * FROZEN: every v1 "y" link depends on these exact bytes, and v2's dictionary ends with them. A better dictionary
 * is a new one under a new flag (v2's "w"); never edit this one.
 */
const DICTIONARY_TEXT = [
  // English, roughly least to most common so the commonest sit closest.
  ' experience development information different important available',
  ' question together business company project customer product service research meeting',
  ' schedule calendar document review design launch update report budget summary agenda',
  ' through between because without before after should could would their there these those',
  ' about which where while other first last next week month year today tomorrow',
  ' people team plan work time need make take want know good new more most some',
  ' Monday Tuesday Wednesday Thursday Friday Saturday Sunday',
  ' January February March April May June July August September October November December',
  ' what when will with have from they this that were been your our are was not but all can has had its',
  ' The and for you the ing tion ed to of in is it on at as be or an by we us if so do no up',
  // TLO's own words (docs/tlo.md): the header, the marks, the shapes the apps write, the commonest icons.
  ' rocket lightbulb target trending-up chart-column users heart star flag globe mail calendar clock',
  ' map-pin dollar-sign zap shield check megaphone message-circle trophy compass puzzle laptop coffee',
  ':number :money :percent :date :check :url | --- | --- | --- |\n| =SUM(B1:B =AVERAGE( =MIN( =MAX( =ROUND(',
  'What | Qty:number | Units | Price:money\nName | Price:money | About\nTask | Start:date | Days:number | Done:percent\nPlace | Lat:number | Lon:number | Note',
  'Kind | X:number | Y:number | W:number | H:number | Style | Label\nQuestion | Answer\nFront | Back\nClue | Answer\n',
  '~ \n- [ ] \n- [x] \n  - \n    - \n1. \n> \n\n---\n\n## \n### \n# \n```sheet\n```draw\n```\n{.title}\n{.two}\n**',
  '---\ntitle: \nby: \ncreated: 2026-\nchart: bar\ncurrency: $\ntax: \nzone: America/New_York\nunits: km\nmode: \n---\n',
].join('\n');
/** The dictionary's bytes (exported for scripts/dictionary.ts, which measures it). */
export const DICTIONARY = strToU8(DICTIONARY_TEXT);

/**
 * v2's dictionary: 16 KB of TLO's own documents, chosen by zstd's trainer (scripts/dictionary-v2.py says how), with v1's
 * DICTIONARY last, nearest the document. FROZEN: every "w" link depends on these exact bytes (a test holds their hash).
 */
export const DICTIONARY_V2 = strToU8(DICTIONARY_V2_TEXT);

/** How a v2 payload's bytes were packed: deflated against DICTIONARY_V2 ("w"), or without a dictionary ("v"). */
export type Flag = 'w' | 'v';

/** Pack text as bytes for a link: deflated with v2's dictionary ("w") or without ("v"), whichever is shorter. */
export function packDoc(doc: string): { flag: Flag; bytes: Uint8Array } {
  const raw = strToU8(doc);
  const primed = deflateSync(raw, { level: 9, mem: 12, dictionary: DICTIONARY_V2 });
  const plain = deflateSync(raw, { level: 9, mem: 12 });
  return primed.length <= plain.length ? { flag: 'w', bytes: primed } : { flag: 'v', bytes: plain };
}

/** The most a document may inflate to. A link is small; a few hundred bytes that unpack to gigabytes is an attack on the browser, not a document. */
export const MAX_DOC_BYTES = 4 * 1024 * 1024;

function inflate(bytes: Uint8Array, dictionary?: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let size = 0;
  const inf = new Inflate({ dictionary }, (chunk) => {
    size += chunk.length;
    if (size > MAX_DOC_BYTES) throw new Error('document too large');
    parts.push(chunk);
  });
  inf.push(bytes, true);
  const out = new Uint8Array(size);
  parts.reduce((at, p) => (out.set(p, at), at + p.length), 0);
  return out;
}

/** Inverse of packDoc, and of v1's packings. Throws on malformed input, and on input that unpacks to more than MAX_DOC_BYTES. */
export function unpackDoc(flag: string, bytes: Uint8Array): string {
  if (flag === 'w') return strFromU8(inflate(bytes, DICTIONARY_V2));
  if (flag === 'v') return strFromU8(inflate(bytes));
  if (flag === 'y') return strFromU8(inflate(bytes, DICTIONARY));
  if (flag === 'z') return strFromU8(inflate(bytes));
  if (flag === 'r') return strFromU8(bytes);
  throw new Error('unknown flag');
}

/* ---------- v2's text: base62, and a checksum ---------- */

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const B62_REV: Record<string, number> = {};
for (let i = 0; i < B62.length; i++) B62_REV[B62[i]] = i;
/** base62 goes 32 bytes at a time, as 43 characters (62^43 ≥ 2^256): a number that size is quick as a BigInt. */
const BLOCK = 32;
/** The fewest characters that hold k bytes, for k from 0 to BLOCK; each k's is its own, so a last block's length says its bytes. */
const WIDTH = Array.from({ length: BLOCK + 1 }, (_, k) => {
  let c = 0;
  while (62n ** BigInt(c) < 256n ** BigInt(k)) c++;
  return c;
});
const BYTES_IN = new Map(WIDTH.map((c, k) => [c, k]));

/** Bytes as base62: big-endian blocks of 32 bytes in 43 characters, the last block in the fewest that hold it. */
export function toBase62(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += BLOCK) {
    const block = bytes.subarray(i, i + BLOCK);
    let n = 0n;
    for (const b of block) n = (n << 8n) | BigInt(b);
    let s = '';
    for (let w = WIDTH[block.length]; w > 0; w--, n /= 62n) s = B62[Number(n % 62n)] + s;
    out += s;
  }
  return out;
}

/** Inverse of toBase62. Throws on a character outside the alphabet, a length no bytes have, or a block too large for its bytes. */
export function fromBase62(s: string): Uint8Array {
  const full = WIDTH[BLOCK];
  const last = BYTES_IN.get(s.length % full);
  if (last === undefined) throw new Error('bad base62');
  const out = new Uint8Array(Math.floor(s.length / full) * BLOCK + last);
  for (let i = 0, at = 0; i < s.length; i += full) {
    const chunk = s.slice(i, i + full);
    const k = BYTES_IN.get(chunk.length)!;
    let n = 0n;
    for (const ch of chunk) {
      const v = B62_REV[ch];
      if (v === undefined) throw new Error('bad base62');
      n = n * 62n + BigInt(v);
    }
    if (n >> BigInt(8 * k)) throw new Error('bad base62');
    for (let j = k - 1; j >= 0; j--, n >>= 8n) out[at + j] = Number(n & 255n);
    at += k;
  }
  return out;
}

/** CRC-16/CCITT-FALSE (polynomial 0x1021, from 0xFFFF; "123456789" is 0x29B1) over the flag's byte and the bytes. */
export function crc16(flag: string, bytes: Uint8Array): number {
  let c = 0xffff;
  const step = (b: number) => {
    c ^= b << 8;
    for (let i = 0; i < 8; i++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  };
  step(flag.charCodeAt(0));
  bytes.forEach(step);
  return c;
}
const CRC_CHARS = 3;
const crcText = (n: number) => B62[Math.floor(n / 3844)] + B62[Math.floor(n / 62) % 62] + B62[n % 62];

/** A v2 payload: the flag, its checksum, and the bytes in base62. */
export const wrap = (flag: string, bytes: Uint8Array): string => flag + crcText(crc16(flag, bytes)) + toBase62(bytes);

/** A v2 payload's flag and bytes. Throws when the checksum is not theirs: the link was cut short, or something was glued to it. */
export function unwrap(payload: string): { flag: string; bytes: Uint8Array } {
  const flag = payload[0] ?? '';
  const bytes = fromBase62(withoutBreaks(payload.slice(1 + CRC_CHARS)));
  if (payload.length < 1 + CRC_CHARS || crcText(crc16(flag, bytes)) !== payload.slice(1, 1 + CRC_CHARS)) throw new Error('damaged');
  return { flag, bytes };
}

/** Which version of the format a payload's first letter belongs to (2 or 1), or 0 for none. */
export const payloadVersion = (payload: string): number => (/^[wve]/.test(payload) ? 2 : /^[yzrE]/.test(payload) ? 1 : 0);

/**
 * A payload as it was written, from what a link brought: percent-decoded until it stops changing (a chat that encoded
 * it once or twice), then without every character its flag's version does not write (its "+" breaks, a space or a line
 * break a mail client wrapped it with, a zero-width space, a quote glued to its end).
 */
export function cleanPayload(arrived: string): string {
  let p = arrived;
  for (let i = 0; i < 4; i++) {
    let next: string;
    try {
      next = decodeURIComponent(p);
    } catch {
      break;
    }
    if (next === p) break;
    p = next;
  }
  p = p.replace(/^[^0-9A-Za-z]+/, '');
  return p.replace(payloadVersion(p) === 1 ? /[^0-9A-Za-z~_-]/g : /[^0-9A-Za-z]/g, '');
}

/** Whether a payload is sealed under a password (kit/share/crypt.ts), rather than packed: v2's "e", v1's "E". */
export const isSealed = (payload: string): boolean => /^[eE]/.test(payload);

/** A document's text as a link payload; '' for an empty document. */
export function encodeDoc(doc: string): string {
  if (!doc) return '';
  const { flag, bytes } = packDoc(doc);
  return wrap(flag, bytes);
}

/** The text a payload holds, in either version; '' for anything unreadable. */
export function decodeDoc(payload: string): string {
  if (!payload) return '';
  try {
    const v = payloadVersion(payload);
    if (v === 2) {
      const { flag, bytes } = unwrap(payload);
      return unpackDoc(flag, bytes);
    }
    return v === 1 ? unpackDoc(payload[0], fromBase64Url(payload.slice(1))) : '';
  } catch {
    return '';
  }
}

/** How many characters of payload fit under URL_LIMIT after a given prefix (origin, path, "#/v2/app/"). */
export function budgetFor(prefixUrl: string): { available: number } {
  return { available: Math.max(0, URL_LIMIT - prefixUrl.length) };
}
