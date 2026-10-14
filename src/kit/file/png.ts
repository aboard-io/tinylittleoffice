/**
 * A document inside a PNG (Paul, 2026-10-14: "an icon preview format that carries the document as metadata? PNG and
 * uncompressed tlo"): the picture is a picture anywhere, and here it is the document too. The text rides in an iTXt
 * chunk, the PNG's own way to carry UTF-8 words, uncompressed, under the keyword "tlo", straight after the header
 * where any reader of chunks finds it first; a tEXt "Software" names the maker. Nothing here decodes pixels: the
 * chunks are walked by their lengths, and the CRC each ends with is the PNG's own (CRC-32, as a zip's).
 */

/** The eight bytes every PNG begins with. */
const MAGIC = [137, 80, 78, 71, 13, 10, 26, 10];
/** The keyword the document is kept under. */
export const KEYWORD = 'tlo';

const table = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** CRC-32 of the bytes, as a PNG chunk and a zip entry carry it. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ascii = (s: string) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);

/** A chunk: its type's four letters, its data, its CRC over both. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(ascii(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const join = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) (out.set(p, at), (at += p.length));
  return out;
};

/** An iTXt chunk: the keyword, no compression, no language, no translated keyword, the text as UTF-8. */
const iTXt = (keyword: string, text: string) => chunk('iTXt', join([ascii(keyword), new Uint8Array([0, 0, 0, 0, 0]), new TextEncoder().encode(text)]));
/** A tEXt chunk: the keyword and Latin-1 words. */
const tEXt = (keyword: string, text: string) => chunk('tEXt', join([ascii(keyword), new Uint8Array([0]), ascii(text)]));

const isPng = (bytes: Uint8Array) => bytes.length > 33 && MAGIC.every((b, i) => bytes[i] === b);

/** The PNG with the words written into it under the keyword, after its header (and any words already there under that keyword taken out). */
export function withText(png: Uint8Array, keyword: string, text: string, software = 'Tiny Little Office'): Uint8Array {
  if (!isPng(png)) throw new Error('not a PNG');
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  let at = 8;
  let written = false;
  while (at + 12 <= png.length) {
    const len = new DataView(png.buffer, png.byteOffset + at).getUint32(0);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const whole = png.subarray(at, at + 12 + len);
    if (!(type === 'iTXt' || type === 'tEXt') || keywordOf(whole.subarray(8, 8 + len)) !== keyword) parts.push(whole);
    if (type === 'IHDR' && !written) {
      parts.push(iTXt(keyword, text), tEXt('Software', software));
      written = true;
    }
    at += 12 + len;
  }
  if (!written) throw new Error('not a PNG');
  return join(parts);
}

/** The keyword a text chunk's data begins with (up to its first NUL). */
function keywordOf(data: Uint8Array): string {
  const end = data.indexOf(0);
  return String.fromCharCode(...data.subarray(0, end < 0 ? data.length : end));
}

/** The words a PNG carries under the keyword (an iTXt's UTF-8, or a tEXt's Latin-1); null when it is no PNG or carries none. */
export function textOf(png: Uint8Array, keyword: string): string | null {
  if (!isPng(png)) return null;
  let at = 8;
  while (at + 12 <= png.length) {
    const len = new DataView(png.buffer, png.byteOffset + at).getUint32(0);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const data = png.subarray(at + 8, at + 8 + len);
    if ((type === 'iTXt' || type === 'tEXt') && keywordOf(data) === keyword) {
      const k = data.indexOf(0);
      if (type === 'tEXt') return String.fromCharCode(...data.subarray(k + 1));
      // iTXt: keyword NUL, compression flag, compression method, language NUL, translated keyword NUL, text.
      const flag = data[k + 1];
      let p = k + 3;
      p = data.indexOf(0, p) + 1;
      p = data.indexOf(0, p) + 1;
      if (flag !== 0) return null;
      return new TextDecoder().decode(data.subarray(p));
    }
    if (type === 'IEND') break;
    at += 12 + len;
  }
  return null;
}
