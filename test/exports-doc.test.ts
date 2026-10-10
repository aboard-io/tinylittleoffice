// docs/exports.md is what the apps' definitions say (scripts/exports-doc.ts writes it).
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { exportsDoc } from '../scripts/exports-doc.ts';

test('docs/exports.md is up to date with the definitions', () => {
  expect(readFileSync(new URL('../docs/exports.md', import.meta.url), 'utf8')).toBe(exportsDoc());
});
