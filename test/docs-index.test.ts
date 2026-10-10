// docs/README.md lists every document in docs/, and nothing that is not there.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

test('docs/README.md names every page in docs/', () => {
  const dir = new URL('../docs/', import.meta.url);
  const pages = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
  const index = readFileSync(new URL('README.md', dir), 'utf8');
  const listed = [...index.matchAll(/^- \[([^\]]+)\]\(\1\): \S/gm)].map((m) => m[1]).sort();
  expect(listed).toEqual(pages);
});
