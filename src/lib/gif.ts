/**
 * An animated GIF from RGBA frames: GIF89a, one local colour table per
 * frame (median cut to 256 colours), transparency for see-through pixels,
 * and the Netscape loop so it plays forever. No dependencies.
 */
export interface GifFrame {
  /** RGBA, width*height*4 bytes. */
  data: Uint8ClampedArray | Uint8Array;
  delayMs: number;
}

/**
 * Quantize RGBA to at most `maxColors` colours by median cut. Returns the
 * palette as RGB triples and one index per pixel. Pixels with alpha below
 * 128 are left out of the palette and get the index one past its end.
 */
export function quantize(data: Uint8ClampedArray | Uint8Array, maxColors = 256): { palette: Uint8Array; indices: Uint8Array } {
  // Count the distinct opaque colours; note whether anything is see-through.
  const counts = new Map<number, number>();
  let clear = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) clear = true;
    else {
      const c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const limit = clear ? maxColors - 1 : maxColors;
  const colors = [...counts.keys()];
  // Split the box with the widest channel at its weighted median, until
  // we have enough boxes or nothing is left to split.
  const boxes: number[][] = [colors];
  const chan = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  while (boxes.length < limit) {
    let best = -1, bestAxis = 0, bestRange = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let k = 0; k < 3; k++) {
        let lo = 255, hi = 0;
        for (const c of box) { const v = chan(c, k); if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) [best, bestAxis, bestRange] = [i, k, hi - lo];
      }
    });
    if (best < 0) break;
    const box = boxes[best].sort((a, b) => chan(a, bestAxis) - chan(b, bestAxis));
    const total = box.reduce((n, c) => n + counts.get(c)!, 0);
    let cut = 0;
    for (let n = 0; cut < box.length - 2 && n + counts.get(box[cut])! < total / 2; cut++) n += counts.get(box[cut])!;
    boxes.splice(best, 1, box.slice(0, cut + 1), box.slice(cut + 1));
  }
  // Each box becomes its weighted average colour.
  const palette = new Uint8Array(boxes.length * 3);
  boxes.forEach((box, i) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (const c of box) { const w = counts.get(c)!; r += chan(c, 0) * w; g += chan(c, 1) * w; b += chan(c, 2) * w; n += w; }
    if (n) palette.set([Math.round(r / n), Math.round(g / n), Math.round(b / n)], i * 3);
  });
  const indices = new Uint8Array(data.length / 4);
  const lookup = new Map<number, number>();
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    if (data[i + 3] < 128) { indices[p] = boxes.length; continue; }
    const c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let idx = lookup.get(c);
    if (idx === undefined) lookup.set(c, (idx = nearest(palette, data[i], data[i + 1], data[i + 2])));
    indices[p] = idx;
  }
  return { palette, indices };
}

function nearest(palette: Uint8Array, r: number, g: number, b: number): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length; i += 3) {
    const d = (palette[i] - r) ** 2 + (palette[i + 1] - g) ** 2 + (palette[i + 2] - b) ** 2;
    if (d < bestD) [best, bestD] = [i / 3, d];
  }
  return best;
}

/** Floyd–Steinberg: spread each pixel's rounding error to its neighbours. */
function dither(data: Uint8ClampedArray | Uint8Array, width: number, palette: Uint8Array, indices: Uint8Array): void {
  const px = Float32Array.from(data);
  const height = data.length / 4 / width;
  const spill = (i: number, e: number[], f: number) => { px[i] += e[0] * f; px[i + 1] += e[1] * f; px[i + 2] += e[2] * f; };
  for (let y = 0, p = 0; y < height; y++)
    for (let x = 0; x < width; x++, p++) {
      if (data[p * 4 + 3] < 128) continue;
      const i = p * 4;
      const rgb = [px[i], px[i + 1], px[i + 2]].map((v) => Math.max(0, Math.min(255, v)));
      const k = (indices[p] = nearest(palette, rgb[0], rgb[1], rgb[2])) * 3;
      const e = [rgb[0] - palette[k], rgb[1] - palette[k + 1], rgb[2] - palette[k + 2]];
      if (x + 1 < width) spill(i + 4, e, 7 / 16);
      if (y + 1 < height) {
        if (x > 0) spill(i + width * 4 - 4, e, 3 / 16);
        spill(i + width * 4, e, 5 / 16);
        if (x + 1 < width) spill(i + width * 4 + 4, e, 1 / 16);
      }
    }
}

/** LZW as GIF wants it: variable code size, clear codes, 12 bits at most. */
function lzw(indices: Uint8Array, minCodeSize: number): number[] {
  const out: number[] = [];
  let acc = 0, nbits = 0;
  const clear = 1 << minCodeSize, eoi = clear + 1;
  let codeSize = minCodeSize + 1, next = eoi + 1;
  const emit = (code: number) => {
    acc |= code << nbits;
    nbits += codeSize;
    for (; nbits >= 8; nbits -= 8, acc >>>= 8) out.push(acc & 255);
  };
  const dict = new Map<number, number>();
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const key = (prefix << 8) | indices[i];
    const found = dict.get(key);
    if (found !== undefined) { prefix = found; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      dict.clear();
      codeSize = minCodeSize + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      dict.set(key, next++);
    }
    prefix = indices[i];
  }
  emit(prefix);
  emit(eoi);
  if (nbits) out.push(acc & 255);
  return out;
}

/** Encode RGBA frames of one size as an animated GIF (looping forever by default). */
export function encodeGif(width: number, height: number, frames: GifFrame[], opts: { loop?: number; dither?: boolean } = {}): Uint8Array {
  const out: number[] = [];
  const u16 = (n: number) => out.push(n & 255, (n >> 8) & 255);
  out.push(...[...'GIF89a'].map((c) => c.charCodeAt(0)));
  u16(width);
  u16(height);
  out.push(0x70, 0, 0); // no global colour table; 8-bit colour
  out.push(0x21, 0xff, 0x0b, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1);
  u16(opts.loop ?? 0);
  out.push(0);

  for (const frame of frames) {
    const { palette, indices } = quantize(frame.data);
    if (opts.dither) dither(frame.data, width, palette, indices);
    const colors = palette.length / 3;
    const transparent = indices.includes(colors);
    let bits = 1;
    while (1 << bits < colors + (transparent ? 1 : 0)) bits++;

    // Graphics control: disposal 2 (back to background), the delay, transparency.
    out.push(0x21, 0xf9, 4, (2 << 2) | (transparent ? 1 : 0));
    u16(Math.max(2, Math.round(frame.delayMs / 10)));
    out.push(transparent ? colors : 0, 0);
    // Image descriptor with a local colour table, padded to a power of two.
    out.push(0x2c);
    u16(0); u16(0); u16(width); u16(height);
    out.push(0x80 | (bits - 1));
    const table = new Uint8Array(3 << bits);
    table.set(palette);
    out.push(...table);
    // The pixels, LZW'd and cut into 255-byte sub-blocks.
    const minCodeSize = Math.max(2, bits);
    out.push(minCodeSize);
    const packed = lzw(indices, minCodeSize);
    for (let i = 0; i < packed.length; i += 255) {
      const chunk = packed.slice(i, i + 255);
      out.push(chunk.length, ...chunk);
    }
    out.push(0);
  }
  out.push(0x3b);
  return Uint8Array.from(out);
}
