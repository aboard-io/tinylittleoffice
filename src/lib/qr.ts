/**
 * A QR code from bytes: the standard construction (byte mode, error
 * correction level L, the smallest version that fits, the best mask),
 * after Project Nayuki's reference. Returns the modules, row by row.
 */
export const QR_MAX_BYTES = 2953;

const ECC_PER_BLOCK = [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30];
const BLOCKS = [1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25];

function rawModules(v: number): number {
  let n = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const a = Math.floor(v / 7) + 2;
    n -= (25 * a - 10) * a - 55;
    if (v >= 7) n -= 36;
  }
  return n;
}
const dataCodewords = (v: number) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v - 1] * BLOCKS[v - 1];

function alignmentPositions(v: number): number[] {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2;
  const step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let p = v * 4 + 10; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
}

/* Reed-Solomon over GF(2^8) */
const mul = (x: number, y: number) => {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
};
function rsDivisor(degree: number): number[] {
  const out = Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < out.length; j++) {
      out[j] = mul(out[j], root);
      if (j + 1 < out.length) out[j] ^= out[j + 1];
    }
    root = mul(root, 2);
  }
  return out;
}
function rsRemainder(data: number[], divisor: number[]): number[] {
  const out = Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const f = b ^ out.shift()!;
    out.push(0);
    divisor.forEach((c, i) => (out[i] ^= mul(c, f)));
  }
  return out;
}

export function qrCode(bytes: Uint8Array): boolean[][] {
  if (bytes.length > QR_MAX_BYTES) throw new Error('too long for a QR code');
  // The smallest version with room: mode (4 bits), count (8 or 16), the bytes.
  let v = 1;
  while (4 + (v < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(v) * 8) v++;
  const bits: number[] = [];
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(4, 4);
  push(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const cap = dataCodewords(v) * 8;
  push(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // Split into blocks, add error correction, interleave.
  const nb = BLOCKS[v - 1];
  const ecc = ECC_PER_BLOCK[v - 1];
  const raw = Math.floor(rawModules(v) / 8);
  const shortBlocks = nb - (raw % nb);
  const shortLen = Math.floor(raw / nb);
  const blocks: number[][] = [];
  const div = rsDivisor(ecc);
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - ecc + (i < shortBlocks ? 0 : 1);
    const dat = data.slice(k, k + len);
    k += len;
    const block = dat.concat(i < shortBlocks ? [0] : [], rsRemainder(dat, div));
    blocks.push(block);
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => (i !== shortLen - ecc || j >= shortBlocks) && all.push(b[i]));

  // The grid: function patterns, then data in the zigzag, then the best mask.
  const size = v * 4 + 17;
  const m = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const fn = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const set = (x: number, y: number, on: boolean) => {
    m[y][x] = on;
    fn[y][x] = true;
  };
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const [x, y] = [cx + dx, cy + dy];
        if (x >= 0 && y >= 0 && x < size && y < size) set(x, y, d !== 2 && d !== 4);
      }
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const al = alignmentPositions(v);
  al.forEach((cy, i) =>
    al.forEach((cx, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }),
  );
  const formatArea = (mask: number) => {
    // Level L is 01; BCH(15,5) on the five bits.
    let r = (1 << 3) | mask;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((((1 << 3) | mask) << 10) | r) ^ 0x5412;
    const bit = (i: number) => ((f >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  formatArea(0);
  if (v >= 7) {
    let r = v;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const info = (v << 12) | r;
    for (let i = 0; i < 18; i++) {
      const on = ((info >>> i) & 1) !== 0;
      const [a, b] = [size - 11 + (i % 3), Math.floor(i / 3)];
      set(a, b, on);
      set(b, a, on);
    }
  }
  // Data, two columns at a time, up and down.
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const y = (right + 1) & 2 ? vert : size - 1 - vert;
        if (!fn[y][x] && i < all.length * 8) {
          m[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
  }
  // The mask with the lowest penalty.
  const masks = [(x: number, y: number) => (x + y) % 2, (_: number, y: number) => y % 2, (x: number) => x % 3, (x: number, y: number) => (x + y) % 3, (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2, (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3), (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2, (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2];
  const apply = (k: number) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && masks[k](x, y) === 0) m[y][x] = !m[y][x];
  };
  const penalty = (): number => {
    let p = 0;
    const run = (get: (a: number, b: number) => boolean) => {
      for (let a = 0; a < size; a++) {
        let runLen = 0;
        let was: boolean | null = null;
        const hist = [0, 0, 0, 0, 0, 0, 0];
        const finderLike = () => {
          const n = hist[1];
          const core = n > 0 && hist[2] === n && hist[3] === n * 3 && hist[4] === n && hist[5] === n;
          return (core && hist[0] >= n * 4 && hist[6] >= n ? 1 : 0) + (core && hist[6] >= n * 4 && hist[0] >= n ? 1 : 0);
        };
        const add = (len: number) => {
          hist.shift();
          hist.push(len);
        };
        for (let b = 0; b < size; b++) {
          const on = get(a, b);
          if (on === was) {
            runLen++;
            if (runLen === 5) p += 3;
            else if (runLen > 5) p++;
          } else {
            if (was !== null) {
              add(runLen);
              if (!was) p += finderLike() * 40;
            }
            was = on;
            runLen = 1;
          }
        }
        add(runLen);
        if (!was) p += finderLike() * 40;
        add(0);
        p += finderLike() * 40;
      }
    };
    run((y, x) => m[y][x]);
    run((x, y) => m[y][x]);
    let dark = 0;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (m[y][x]) dark++;
        if (x < size - 1 && y < size - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
      }
    const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
    return p + k * 10;
  };
  let best = 0;
  let bestScore = Infinity;
  for (let k = 0; k < 8; k++) {
    apply(k);
    formatArea(k);
    const score = penalty();
    if (score < bestScore) [best, bestScore] = [k, score];
    apply(k);
  }
  apply(best);
  formatArea(best);
  return m;
}

/** The code as SVG, with the quiet zone the standard asks for. */
export function qrSvg(bytes: Uint8Array, px = 4): string {
  const m = qrCode(bytes);
  const n = m.length + 8;
  let d = '';
  m.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x + 4} ${y + 4}h1v1h-1z`)));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * px}" height="${n * px}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
