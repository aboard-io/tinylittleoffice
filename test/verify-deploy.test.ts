// Checking a live site against a commit's build (scripts/verify-deploy.ts, scripts/builds.ts), with the site faked:
// what is fetched, how a file compares, the table, and the first difference between two builds.
import { test, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { firstDifference, hashTree, sha256 } from '../scripts/builds.ts';
import { addressOf, compare, served, table } from '../scripts/verify-deploy.ts';

const bytes = (s: string) => new TextEncoder().encode(s);

test('a build is every file and its hash, by path; two builds differ first where their files do', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-hash-'));
  try {
    mkdirSync(join(dir, 'write'));
    writeFileSync(join(dir, 'index.html'), 'home');
    writeFileSync(join(dir, 'write', 'index.html'), 'write');
    const a = hashTree(dir);
    expect([...a.keys()]).toEqual(['index.html', 'write/index.html']);
    expect(a.get('index.html')).toBe(sha256(bytes('home')));
    expect(firstDifference(a, new Map(a))).toBeNull();
    expect(firstDifference(a, new Map([...a, ['index.html', 'f'.repeat(64)]]))).toBe(`index.html: ${a.get('index.html')!.slice(0, 12)} in the first build, ffffffffffff in the second build`);
    expect(firstDifference(a, new Map([['index.html', a.get('index.html')!]]))).toBe('write/index.html: only in the first build');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every file but _headers is asked for, a page by its folder, under the site’s address', () => {
  const built = new Map([['_headers', 'x'], ['index.html', 'x'], ['text/index.html', 'x'], ['assets/a.js', 'x']]);
  expect(served(built)).toEqual(['index.html', 'text/index.html', 'assets/a.js']);
  expect(addressOf('https://example.com/', 'index.html')).toBe('https://example.com/');
  expect(addressOf('https://example.com/', 'text/index.html')).toBe('https://example.com/text/');
  expect(addressOf('https://example.com/office/', 'assets/a.js')).toBe('https://example.com/office/assets/a.js');
});

test('each file is the same, differs, is missing, or could not be fetched; the table says which', async () => {
  const site: Record<string, string> = { 'https://s.test/': 'home', 'https://s.test/a.js': 'changed' };
  const built = new Map([
    ['index.html', sha256(bytes('home'))],
    ['a.js', sha256(bytes('a'))],
    ['gone.js', sha256(bytes('gone'))],
    ['down.js', sha256(bytes('down'))],
  ]);
  const get = (async (url: string) => {
    if (url.endsWith('down.js')) throw new Error('offline');
    return url in site ? new Response(site[url]) : new Response('', { status: 404 });
  }) as unknown as typeof fetch;
  const rows = await compare('https://s.test/', built, get);
  expect(rows.map((r) => [r.path, r.status])).toEqual([
    ['index.html', 'same'],
    ['a.js', 'differs'],
    ['gone.js', '404'],
    ['down.js', 'failed: offline'],
  ]);
  const lines = table(rows).split('\n');
  expect(lines[0]).toMatch(/^file\s+built\s+live/);
  expect(lines[2]).toBe(`index.html  ${sha256(bytes('home')).slice(0, 12)}  ${sha256(bytes('home')).slice(0, 12)}  same`);
  expect(lines[4]).toBe(`gone.js     ${sha256(bytes('gone')).slice(0, 12)}  -             404`);
});
