import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeGif, quantize, type GifFrame } from '../src/lib/gif.ts';

const solid = (w: number, h: number, rgba: number[]): Uint8ClampedArray => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) d.set(rgba, i);
  return d;
};
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const u16 = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);

/** A tiny reader for the test: the first frame's palette, pixels and control block. */
function decodeFirstFrame(gif: Uint8Array) {
  assert.deepEqual([...gif.subarray(0, 6)], ascii('GIF89a'));
  let p = 13;
  if (gif[10] & 0x80) p += 3 << ((gif[10] & 7) + 1);
  let delay = 0, transparent = -1, disposal = 0;
  const skipBlocks = () => { while (gif[p]) p += gif[p] + 1; p++; };
  while (gif[p] === 0x21) {
    if (gif[p + 1] === 0xf9) {
      disposal = (gif[p + 3] >> 2) & 7;
      delay = u16(gif, p + 4);
      if (gif[p + 3] & 1) transparent = gif[p + 6];
    }
    p += 2;
    skipBlocks();
  }
  assert.equal(gif[p], 0x2c, 'image descriptor');
  const width = u16(gif, p + 5), height = u16(gif, p + 7);
  const packed = gif[p + 9];
  p += 10;
  const palSize = 1 << ((packed & 7) + 1);
  const palette = gif.subarray(p, p + palSize * 3);
  p += palSize * 3;
  const minCodeSize = gif[p++];
  const data: number[] = [];
  while (gif[p]) { data.push(...gif.subarray(p + 1, p + 1 + gif[p])); p += gif[p] + 1; }

  // LZW, the decoder side.
  const clear = 1 << minCodeSize, eoi = clear + 1;
  let codeSize = minCodeSize + 1, next = eoi + 1;
  let dict: number[][] = [];
  const reset = () => { dict = Array.from({ length: eoi + 1 }, (_, i) => [i]); codeSize = minCodeSize + 1; next = eoi + 1; };
  reset();
  const pixels: number[] = [];
  let acc = 0, nbits = 0, pos = 0, prev: number[] | null = null;
  for (;;) {
    while (nbits < codeSize) { acc |= data[pos++] << nbits; nbits += 8; }
    const code = acc & ((1 << codeSize) - 1);
    acc >>>= codeSize; nbits -= codeSize;
    if (code === clear) { reset(); prev = null; continue; }
    if (code === eoi) break;
    let entry: number[];
    if (code < next) entry = dict[code];
    else if (code === next && prev) entry = [...prev, prev[0]];
    else throw new Error(`bad code ${code}`);
    pixels.push(...entry);
    if (prev && next < 4096) {
      dict[next++] = [...prev, entry[0]];
      if (next === 1 << codeSize && codeSize < 12) codeSize++;
    }
    prev = entry;
  }
  return { width, height, palette, pixels, delay, transparent, disposal };
}

test('two solid frames: header, screen size, loop block, trailer', () => {
  const frames: GifFrame[] = [
    { data: solid(8, 8, [255, 0, 0, 255]), delayMs: 100 },
    { data: solid(8, 8, [0, 0, 255, 255]), delayMs: 5 },
  ];
  const gif = encodeGif(8, 8, frames);
  assert.deepEqual([...gif.subarray(0, 6)], ascii('GIF89a'));
  assert.equal(u16(gif, 6), 8);
  assert.equal(u16(gif, 8), 8);
  assert.deepEqual([...gif.subarray(13, 31)], [0x21, 0xff, 0x0b, ...ascii('NETSCAPE2.0'), 3, 1, 0, 0]);
  assert.equal(gif[31], 0);
  assert.equal(gif[gif.length - 1], 0x3b);
  const f = decodeFirstFrame(gif);
  assert.equal(f.delay, 10);
  assert.equal(f.disposal, 2);
  assert.equal(f.transparent, -1);
  assert.deepEqual([...f.palette.subarray(0, 3)], [255, 0, 0]);
  assert.equal(f.pixels.length, 64);
  assert.ok(f.pixels.every((i) => i === 0));
  assert.equal(encodeGif(8, 8, [], { loop: 3 })[29], 3);
});

test('delay is in hundredths and never below 2', () => {
  const gif = encodeGif(2, 2, [{ data: solid(2, 2, [1, 2, 3, 255]), delayMs: 5 }]);
  assert.equal(decodeFirstFrame(gif).delay, 2);
});

test('a 256-colour frame round-trips pixel for pixel', () => {
  const w = 64, h = 64;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const c = (p * 7919) & 255; // 256 distinct colours, scattered so LZW works hard
    data.set([c, (c * 3) & 255, 255 - c, 255], p * 4);
  }
  const gif = encodeGif(w, h, [{ data, delayMs: 40 }]);
  const f = decodeFirstFrame(gif);
  assert.equal(f.width, w);
  assert.equal(f.height, h);
  assert.equal(f.pixels.length, w * h);
  for (let p = 0; p < w * h; p++) {
    const k = f.pixels[p] * 3;
    assert.deepEqual([f.palette[k], f.palette[k + 1], f.palette[k + 2]], [...data.subarray(p * 4, p * 4 + 3)], `pixel ${p}`);
  }
});

test('a big noisy frame crosses the 4096-code boundary and still decodes', () => {
  const w = 200, h = 200;
  const data = new Uint8ClampedArray(w * h * 4);
  let seed = 1;
  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const c = (seed >> 16) & 15;
    data.set([c * 17, 0, 0, 255], i);
  }
  const f = decodeFirstFrame(encodeGif(w, h, [{ data, delayMs: 100 }]));
  assert.equal(f.pixels.length, w * h);
  for (let p = 0; p < w * h; p++) assert.equal(f.palette[f.pixels[p] * 3], data[p * 4]);
});

test('see-through pixels get a transparent index', () => {
  const data = solid(4, 4, [0, 200, 0, 255]);
  data[3] = 0; // first pixel clear
  data[7] = 100; // second pixel mostly clear
  const f = decodeFirstFrame(encodeGif(4, 4, [{ data, delayMs: 50 }]));
  assert.notEqual(f.transparent, -1);
  assert.equal(f.pixels[0], f.transparent);
  assert.equal(f.pixels[1], f.transparent);
  assert.notEqual(f.pixels[2], f.transparent);
  assert.deepEqual([...f.palette.subarray(f.pixels[2] * 3, f.pixels[2] * 3 + 3)], [0, 200, 0]);
});

test('quantize keeps a 1000-colour gradient close', () => {
  const n = 1000;
  const data = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const r = Math.round((i / (n - 1)) * 255);
    data.set([r, 255 - r, Math.round(128 + 127 * Math.sin(i / 60)), 255], i * 4);
  }
  const { palette, indices } = quantize(data);
  assert.ok(palette.length / 3 <= 256);
  assert.ok(palette.length / 3 > 200);
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const k = indices[i] * 3;
    for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(palette[k + c] - data[i * 4 + c]));
  }
  assert.ok(worst <= 8, `worst channel error ${worst}`);
});

test('dithering still decodes to the frame size', () => {
  const w = 16, h = 16;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) data.set([p, (p * 5) & 255, (p * 11) & 255, 255], p * 4);
  const f = decodeFirstFrame(encodeGif(w, h, [{ data, delayMs: 40 }], { dither: true }));
  assert.equal(f.pixels.length, w * h);
});

test('PIL opens it and sees two frames', (t) => {
  const probe = spawnSync('python3', ['-c', 'import PIL']);
  if (probe.status !== 0) return t.skip('python3 with PIL not available');
  const gif = encodeGif(12, 9, [
    { data: solid(12, 9, [255, 0, 0, 255]), delayMs: 100 },
    { data: solid(12, 9, [0, 0, 255, 255]), delayMs: 100 },
  ]);
  const file = join(mkdtempSync(join(tmpdir(), 'gif-')), 'a.gif');
  writeFileSync(file, gif);
  const py = `from PIL import Image\nim = Image.open(${JSON.stringify(file)})\nprint(im.n_frames, im.size[0], im.size[1])`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '2 12 9');
});
