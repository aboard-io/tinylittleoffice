// The language is a parameter of the link and never written to the device (Paul, 2026-10-11: "Why are we writing
// language at all instead of encoding the parameter in the link?"): no source file names a storage key for it.
import { test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

test('nothing in src/ keeps the language on the device', () => {
  const hits = files('src').filter((f) => /\.(ts|js|css|html)$/.test(f) && readFileSync(f, 'utf8').includes('tinyoffice.lang'));
  expect(hits).toEqual([]);
});
