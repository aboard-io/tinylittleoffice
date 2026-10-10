/**
 * The link codec: a document's text as the shortest fragment we can manage, and back. The whole document
 * lives in the URL, so every byte counts. Three encodings are tried and the shortest wins:
 *   y<base64url(deflate-raw(utf8, DICTIONARY))>   compressed against the dictionary of TLO's own words
 *   z<base64url(deflate-raw(utf8))>               compressed, without a dictionary
 *   r<base64url(utf8)>                            raw (wins for very short documents)
 * A document under a password is a fourth shape, E<base64url(salt | iv | AES-GCM(flag + packed bytes))>
 * (kit/crypt.ts): decodeDoc reads it as nothing, and the shell asks for the password instead.
 *
 * "base64url" here is RFC 4648's URL alphabet with "~" for 62 where the RFC has "-": a hyphen is a place a line
 * may break (UAX #14), so a long link full of them was cut wherever a mail client or a chat wrapped it, and "~"
 * is unreserved in a URL and breaks nowhere. Reading is lenient: "-" is 62 too, so every link made before opens.
 *
 * fflate rather than the browser's CompressionStream: the native API has no dictionary, is asynchronous,
 * and is absent under node for the tests; the dictionary is what makes short documents 20 to 35 percent
 * smaller. (Ported from the old tree's src/lib/codec.ts; the dictionary bytes are kept as they were.)
 */
import { Inflate, deflateSync, strToU8, strFromU8 } from 'fflate';

/** Hard ceiling for the full URL: 2 KB. */
export const URL_LIMIT = 2048;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_';
const B64_REV: Record<string, number> = { '-': 62 };
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

/**
 * Deflate can be primed with text both sides already know. Short documents are mostly made of things every
 * document has (common words, the apps' own markup, icon names), so a document that refers back into this
 * dictionary instead of spelling those out comes out a good deal shorter.
 *
 * FROZEN once v1 launches: every "y" link made after that depends on these exact bytes. To improve the
 * dictionary, add a new one under a new flag; never edit this one.
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
  '---\ntitle: \nby: \ncreated: 2026-\nchart: bar\ncurrency: $\ntax: \nzone: Europe/London\nunits: km\nmode: \n---\n',
].join('\n');
const DICTIONARY = strToU8(DICTIONARY_TEXT);

export type Flag = 'y' | 'z' | 'r';

/** Pack text as bytes: deflated with the dictionary ("y"), without ("z"), or raw ("r"), whichever is shortest. */
export function packDoc(doc: string): { flag: Flag; bytes: Uint8Array } {
  const raw = strToU8(doc);
  let best: { flag: Flag; bytes: Uint8Array } = { flag: 'r', bytes: raw };
  const plain = deflateSync(raw, { level: 9, mem: 12 });
  if (plain.length < best.bytes.length) best = { flag: 'z', bytes: plain };
  const primed = deflateSync(raw, { level: 9, mem: 12, dictionary: DICTIONARY });
  if (primed.length < best.bytes.length) best = { flag: 'y', bytes: primed };
  return best;
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

/** Inverse of packDoc. Throws on malformed input, and on input that unpacks to more than MAX_DOC_BYTES. */
export function unpackDoc(flag: string, bytes: Uint8Array): string {
  if (flag === 'y') return strFromU8(inflate(bytes, DICTIONARY));
  if (flag === 'z') return strFromU8(inflate(bytes));
  if (flag === 'r') return strFromU8(bytes);
  throw new Error('unknown flag');
}

/** Whether a payload is sealed under a password (kit/crypt.ts), rather than one of the three packings. */
export const isSealed = (payload: string): boolean => payload.startsWith('E');

/** A document's text as a link payload; '' for an empty document. */
export function encodeDoc(doc: string): string {
  if (!doc) return '';
  const { flag, bytes } = packDoc(doc);
  return flag + toBase64Url(bytes);
}

/** The text a payload holds; '' for anything unreadable. */
export function decodeDoc(payload: string): string {
  if (!payload) return '';
  try {
    return unpackDoc(payload[0], fromBase64Url(payload.slice(1)));
  } catch {
    return '';
  }
}

/** How many characters of payload fit under URL_LIMIT after a given prefix (origin, path, "#/v1/app/"). */
export function budgetFor(prefixUrl: string): { available: number } {
  return { available: Math.max(0, URL_LIMIT - prefixUrl.length) };
}
