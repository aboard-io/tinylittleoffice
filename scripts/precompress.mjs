#!/usr/bin/env node
/**
 * Write a .gz beside every text file of a build, compressed as hard as
 * gzip goes. nginx (gzip_static) then serves the ready-made file instead
 * of compressing on every request, or sending the script uncompressed.
 *   node scripts/precompress.mjs dist
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, constants } from 'node:zlib';

const TEXT = /\.(?:js|mjs|css|html|svg|json|txt|xml|webmanifest|ts|map)$/;
const dir = process.argv[2] ?? 'dist';
let files = 0;
let before = 0;
let after = 0;
for (const f of readdirSync(dir, { recursive: true })) {
  const path = join(dir, String(f));
  if (!TEXT.test(path) || !statSync(path).isFile()) continue;
  const raw = readFileSync(path);
  const packed = gzipSync(raw, { level: constants.Z_BEST_COMPRESSION });
  if (packed.length >= raw.length) continue;
  writeFileSync(path + '.gz', packed);
  files++;
  before += raw.length;
  after += packed.length;
}
console.log(`precompressed ${files} files: ${(before / 1024).toFixed(0)} kB → ${(after / 1024).toFixed(0)} kB`);
