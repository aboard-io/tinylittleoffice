// A PNG whole, as the card's check reads it (backends/cards/cards.ts pngSize): the eight bytes every PNG begins with,
// IHDR, one IDAT of filler and IEND, each chunk with its CRC, of `size` bytes in all. For the tests that post a card.
import { crc32 } from '../backends/cards/cards.ts';

export function png(w = 1200, h = 630, size = 2000): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(
      [...type].map((c) => c.charCodeAt(0)),
      4,
    );
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, w);
  new DataView(ihdr.buffer).setUint32(4, h);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const filler = Math.max(0, size - 8 - 25 - 12 - 12);
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk(
      'IDAT',
      Uint8Array.from({ length: filler }, (_, i) => i % 251),
    ),
    chunk('IEND', new Uint8Array(0)),
  ];
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((at, p) => (all.set(p, at), at + p.length), 0);
  return all;
}
