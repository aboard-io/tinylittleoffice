// A document inside a PNG (kit/file/png.ts): written as an uncompressed iTXt chunk after the header, read back whole,
// with the CRC each chunk carries right; a file that is no PNG, or carries no words, says so.
import { test, expect } from 'vitest';
import { crc32, KEYWORD, textOf, withText } from '../src/kit/file/png.ts';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
/** The smallest PNG: a header, no pixels, the end. */
function tiny(): Uint8Array {
  const chunk = (type: string, data: number[]) => {
    const body = [...type].map((c) => c.charCodeAt(0)).concat(data);
    const crc = crc32(Uint8Array.from(body));
    return [(data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255, ...body, (crc >>> 24) & 255, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255];
  };
  return Uint8Array.from([...SIG, ...chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]), ...chunk('IEND', [])]);
}

test('CRC-32 is the PNG’s own: the IEND chunk’s is AE426082', () => {
  expect(crc32(Uint8Array.from([73, 69, 78, 68])).toString(16)).toBe('ae426082');
  expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
});

test('the words go in after the header, uncompressed, in UTF-8, and come back whole; written twice, once', () => {
  const text = '---\napp: write\ntitle: Café\n---\n# Dear neighbors\n\nThe stoop sale is on, rain or shine — 10 to 4.\n';
  const png = withText(tiny(), KEYWORD, text);
  expect([...png.subarray(0, 8)]).toEqual(SIG);
  // The chunks in order: IHDR, iTXt (the document), tEXt (Software), IEND.
  const types: string[] = [];
  for (let at = 8; at + 12 <= png.length;) {
    const len = new DataView(png.buffer, png.byteOffset + at).getUint32(0);
    types.push(String.fromCharCode(...png.subarray(at + 4, at + 8)));
    const body = png.subarray(at + 4, at + 8 + len);
    expect(new DataView(png.buffer, png.byteOffset + at + 8 + len).getUint32(0)).toBe(crc32(body));
    at += 12 + len;
  }
  expect(types).toEqual(['IHDR', 'iTXt', 'tEXt', 'IEND']);
  // The iTXt: keyword, NUL, compression flag 0, method 0, empty language, empty translated keyword, the text.
  const itxt = png.subarray(8 + 12 + 13 + 8);
  expect(String.fromCharCode(...itxt.subarray(0, 3))).toBe('tlo');
  expect([...itxt.subarray(3, 8)]).toEqual([0, 0, 0, 0, 0]);
  expect(new TextDecoder().decode(itxt.subarray(8, 8 + new TextEncoder().encode(text).length))).toBe(text);
  expect(textOf(png, KEYWORD)).toBe(text);
  expect(textOf(png, 'Software')).toBe('Tiny Little Office');
  expect(textOf(withText(png, KEYWORD, 'other'), KEYWORD)).toBe('other');
  expect(textOf(withText(png, KEYWORD, 'other'), KEYWORD)).not.toBe(text);
});

test('no PNG, or no words under the keyword, is null; a text that is not a PNG cannot take words', () => {
  expect(textOf(new TextEncoder().encode('not a png at all, not a png at all'), KEYWORD)).toBeNull();
  expect(textOf(tiny(), KEYWORD)).toBeNull();
  expect(() => withText(new TextEncoder().encode('not a png at all, not a png at all'), KEYWORD, 'x')).toThrow('not a PNG');
});
