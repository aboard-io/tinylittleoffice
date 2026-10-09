// The list of a build's files the device keeps for working offline (and that "Download everything" zips).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offlineList } from '../scripts/offline-files.ts';

const built = [
  { path: 'index.html', bytes: 4000 },
  { path: 'deck/index.html', bytes: 4100 },
  { path: 'assets/index-abc123.js', bytes: 900000 },
  { path: 'assets/leaflet-def456.js', bytes: 150000 },
  { path: 'assets/ibm-plex-sans-latin-400-normal-789.woff2', bytes: 20000 },
  { path: 'manifest.webmanifest', bytes: 500 },
  { path: 'theme.js', bytes: 800 },
  { path: 'og/deck.png', bytes: 30000 },
  { path: 'og.png', bytes: 30000 },
  { path: 'sw.js', bytes: 1200 },
  { path: 'files.json', bytes: 300 },
  { path: 'llms.txt', bytes: 50000 },
  { path: '_headers', bytes: 1000 },
];

test('every built file is kept but the share cards, the headers, the guide and the worker itself', () => {
  const { files } = offlineList(built);
  assert.deepEqual(files, ['', 'assets/ibm-plex-sans-latin-400-normal-789.woff2', 'assets/index-abc123.js', 'assets/leaflet-def456.js', 'deck/', 'manifest.webmanifest', 'og.png', 'theme.js']);
});

test('a page is named by its folder, as a browser asks for it', () => {
  const { files } = offlineList([{ path: 'index.html', bytes: 1 }, { path: 'sheet/index.html', bytes: 1 }]);
  assert.deepEqual(files, ['', 'sheet/']);
});

test('the version follows the files: the same build is the same version, a changed file a new one', () => {
  const a = offlineList(built);
  assert.match(a.version, /^[0-9a-f]{12}$/);
  assert.equal(offlineList([...built].reverse()).version, a.version);
  assert.notEqual(offlineList(built.map((f) => (f.path === 'index.html' ? { ...f, bytes: 4001 } : f))).version, a.version);
  // A new share card is not a new version: it is not kept.
  assert.equal(offlineList([...built, { path: 'og/sheet.png', bytes: 1 }]).version, a.version);
});
