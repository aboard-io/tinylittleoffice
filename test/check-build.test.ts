// What a deploy checks of a build (scripts/check-build.ts): the offline copy's list and version, the worker's
// version, and the policy's script hashes, on a small build made here.
import { test, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBuild } from '../scripts/check-build.ts';
import { offlineList } from '../scripts/offline-files.ts';

const SCRIPT = 'document.title="cart"';
const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;
let dist = '';

/** A build as vite.config.ts leaves it: pages, a chunk, the list, the worker with its version, the headers with the hashes, version.json. */
function build(opts: { inline?: string } = {}) {
  const put = (p: string, s: string) => (mkdirSync(join(dist, p, '..'), { recursive: true }), writeFileSync(join(dist, p), s));
  put('index.html', `<!doctype html><script src="./theme.js"></script>${opts.inline ? `<script>${opts.inline}</script>` : ''}<script type="application/ld+json">{"a":1}</script>`);
  put('write/index.html', '<!doctype html><title>Word Processor</title>');
  put('assets/main-abc.js', 'export {}');
  put('theme.js', '//');
  put('version.json', JSON.stringify({ commit: 'a'.repeat(40), tag: '', built: '2026-10-10T00:00:00Z', csp: { scripts: [hash(SCRIPT).slice(1, -1)] } }));
  const files = ['index.html', 'write/index.html', 'assets/main-abc.js', 'theme.js', 'version.json'].map((path) => ({ path, bytes: statSync(join(dist, path)).size }));
  const list = offlineList(files);
  put('files.json', JSON.stringify(list));
  put('sw.js', `const VERSION = '${list.version}';`);
  put('_headers', `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${hash(SCRIPT)}; object-src 'none'\n/embed/\n  Content-Security-Policy: script-src 'self' ${hash(SCRIPT)}; frame-ancestors *\n`);
  return list;
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'tlo-dist-'));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

test('a build as the build writes it may ship', () => {
  build();
  expect(checkBuild(dist, [SCRIPT])).toEqual([]);
});

test('no build at all is said so', () => {
  expect(checkBuild(join(dist, 'nothing'))).toEqual([`No build in ${join(dist, 'nothing')}: run npm run build`]);
});

test('the offline list: a file named that is not there, a file left out, a stale version, a worker without it', () => {
  const list = build();
  writeFileSync(join(dist, 'files.json'), JSON.stringify({ version: list.version, files: [...list.files, 'gone.js'] }));
  expect(checkBuild(dist, [SCRIPT])).toEqual(['files.json names gone.js, which the build does not have']);
  build();
  writeFileSync(join(dist, 'assets/late-def.js'), 'export {}');
  const problems = checkBuild(dist, [SCRIPT]);
  expect(problems).toContain('files.json leaves out assets/late-def.js');
  expect(problems.some((p) => /^files\.json is version \w+, the build's files make \w+$/.test(p))).toBe(true);
  rmSync(join(dist, 'assets/late-def.js'));
  writeFileSync(join(dist, 'sw.js'), "const VERSION = '__TLO_VERSION__';");
  expect(checkBuild(dist, [SCRIPT])).toEqual(['sw.js does not carry the version of files.json']);
  writeFileSync(join(dist, 'files.json'), '{');
  expect(checkBuild(dist, [SCRIPT])).toEqual(['files.json is missing or not JSON']);
});

test('the policy: the placeholder left, a page script or an inline script without its hash', () => {
  build();
  writeFileSync(join(dist, '_headers'), "/*\n  Content-Security-Policy: script-src 'self' {{scripts}};\n");
  const problems = checkBuild(dist, [SCRIPT]);
  expect(problems[0]).toBe('_headers still has {{scripts}}: the hashes were not written');
  expect(problems[1]).toMatch(/^a page script is not in the policy: document\.title="cart"/);
  build({ inline: 'alert(1)' });
  expect(checkBuild(dist, [SCRIPT])).toEqual(['index.html has an inline script the policy does not allow']);
  build({ inline: SCRIPT });
  expect(checkBuild(dist, [SCRIPT])).toEqual([]);
});

test('version.json: missing, the wrong shape, or hashes that are not the policy’s', () => {
  build();
  writeFileSync(join(dist, 'version.json'), JSON.stringify({ commit: 'a', tag: '', built: '', csp: { scripts: ['sha256-other'] } }));
  expect(checkBuild(dist, [SCRIPT])).toContain('version.json’s script hashes are not the policy’s');
  writeFileSync(join(dist, 'version.json'), JSON.stringify({ commit: 'a' }));
  expect(checkBuild(dist, [SCRIPT])).toContain('version.json is not { commit, tag, built, csp: { scripts } }');
  rmSync(join(dist, 'version.json'));
  expect(checkBuild(dist, [SCRIPT])).toContain('version.json is missing or not JSON');
});
