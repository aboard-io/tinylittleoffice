/**
 * URL codec: turns a document string into the shortest fragment we can manage
 * and back again. The whole document lives in the URL, so every byte counts.
 *
 * Three encodings are tried and the shortest wins:
 *   y<base64url(deflate-raw(utf8, DICTIONARY))>   compressed against a shared dictionary
 *   z<base64url(deflate-raw(utf8))>               compressed (links made before the dictionary)
 *   r<base64url(utf8)>                            raw (wins for very short docs)
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

/**
 * Deflate can be primed with text both sides already know. Short documents
 * are mostly made of things every document has (common words, the apps' own
 * markup, icon names), so a document that refers back into this dictionary
 * instead of spelling those out comes out a good deal shorter.
 *
 * FROZEN: every "y" link ever made depends on these exact bytes. To improve
 * the dictionary, add a new one under a new flag; never edit this one.
 */
const DICTIONARY = strToU8(
  [
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
    // The apps' own markup.
    '=SUM(A1:A =AVG(B1:B =MIN( =MAX( =COUNT( =ROUND( =ABS( =SQRT( =INT( =MOD( C1:C ,2) Total\t',
    '\n## \n# \n+ \n- \n\n::t\n\n:t\n\n:',
    ' rocket lightbulb target trending-up bar-chart pie-chart users heart star flag globe mail calendar clock',
    ' map-pin dollar zap shield check warning megaphone message trophy compass puzzle laptop idea',
    '\nr,\ne,\nd,\nl,\na,\nt, ,0,0, ,1, ,2, ,0\n',
    '@Europe/London\n@America/Los_Angeles\n@America/New_York\nt\nd',
    '\nx \n-! \n- #Backlog\n#Review\n#To do\n#Doing\n#Done\n',
    'Stop \ti \tt ,a;',
  ].join('\n'),
);

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

/** Inverse of packDoc. Throws on malformed input. */
export function unpackDoc(flag: string, bytes: Uint8Array): string {
  if (flag === 'y') return strFromU8(inflateSync(bytes, { dictionary: DICTIONARY }));
  if (flag === 'z') return strFromU8(inflateSync(bytes));
  if (flag === 'r') return strFromU8(bytes);
  throw new Error('unknown flag');
}

/** Encode a document string into a URL-safe payload. */
export function encodeDoc(doc: string): string {
  if (!doc) return '';
  const { flag, bytes } = packDoc(doc);
  return flag + toBase64Url(bytes);
}

/** Decode a payload created by encodeDoc. Returns '' for anything unreadable. */
export function decodeDoc(payload: string): string {
  if (!payload) return '';
  try {
    return unpackDoc(payload[0], fromBase64Url(payload.slice(1)));
  } catch {
    return '';
  }
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
