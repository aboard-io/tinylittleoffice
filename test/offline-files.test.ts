// The list of a build's files the device keeps for working offline. (Ported from the old tree's test/offline.test.ts.)
import { test, expect } from 'vitest';
import { offlineList } from '../scripts/offline-files.ts';

const built = [
  { path: 'index.html', bytes: 4000 },
  { path: 'text/index.html', bytes: 4100 },
  { path: 'assets/main-abc123.js', bytes: 90000 },
  { path: 'assets/editor-def456.js', bytes: 15000 },
  { path: 'manifest.webmanifest', bytes: 500 },
  { path: 'theme.js', bytes: 800 },
  { path: 'og.png', bytes: 30000 },
  { path: 'sw.js', bytes: 1200 },
  { path: 'files.json', bytes: 300 },
  { path: '_headers', bytes: 1000 },
];

test('every built file is kept but the headers, the list and the worker itself', () => {
  expect(offlineList(built).files).toEqual(['', 'assets/editor-def456.js', 'assets/main-abc123.js', 'manifest.webmanifest', 'og.png', 'text/', 'theme.js']);
});

test('the version follows the files: the same build is the same version, a changed file a new one', () => {
  const a = offlineList(built);
  expect(a.version).toMatch(/^[0-9a-f]{12}$/);
  expect(offlineList([...built].reverse()).version).toBe(a.version);
  expect(offlineList(built.map((f) => (f.path === 'index.html' ? { ...f, bytes: 4001 } : f))).version).not.toBe(a.version);
});

test('what is for other sites and programs stays behind: the share cards, the embed page, /api.js, /llms.txt', () => {
  const more = [...built, { path: 'og/write.png', bytes: 20000 }, { path: 'embed/index.html', bytes: 4000 }, { path: 'api.js', bytes: 3000 }, { path: 'api/apps-abc.js', bytes: 9000 }, { path: 'llms.txt', bytes: 30000 }];
  expect(offlineList(more).files).toEqual(offlineList(built).files);
});
