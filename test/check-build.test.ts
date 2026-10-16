// What a deploy checks of a build (scripts/check-build.ts): the policy's script hashes and version.json, on a
// small build made here and on the build in dist/ when there is one.
import { test, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkBuild } from '../scripts/check-build.ts';
import { inlineScripts, scriptHash } from '../scripts/headers.ts';

const SCRIPT = 'document.title="cart"';
const hash = (code: string) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`;
let dist = '';

/** A build as vite.config.ts leaves it: pages, a chunk, the headers with the hashes, version.json. */
function build(opts: { inline?: string; scripts?: string[] } = {}) {
  const scripts = opts.scripts ?? [SCRIPT];
  const put = (p: string, s: string) => (mkdirSync(join(dist, p, '..'), { recursive: true }), writeFileSync(join(dist, p), s));
  put('index.html', `<!doctype html><script src="./assets/main-abc.js"></script>${opts.inline ? `<script>${opts.inline}</script>` : ''}<script type="application/ld+json">{"a":1}</script>`);
  put('write/index.html', '<!doctype html><title>Word Processor</title>');
  put('assets/main-abc.js', 'export {}');
  put('llms.txt', '# Tiny Little Office');
  put('.well-known/llms.txt', '# Tiny Little Office');
  put('llms-full.txt', '# Tiny Little Office links');
  put('llms/sheet.txt', '# Spreadsheet');
  put('examples/sheet.json', '{}');
  const hashes = scripts.map(hash);
  put('version.json', JSON.stringify({ commit: 'a'.repeat(40), tag: '', built: '2026-10-10T00:00:00Z', csp: { scripts: hashes.map((h) => h.slice(1, -1)) } }));
  put(
    '_headers',
    `/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${hashes.join(' ')}; object-src 'none'\n/embed/\n  Content-Security-Policy: script-src 'self' ${hashes.join(' ')}; frame-ancestors *\n`,
  );
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

test('the theme script in the shell (index.html), its hash in the policy and version.json, may ship', () => {
  const [theme] = inlineScripts(readFileSync(join(import.meta.dirname, '../index.html'), 'utf8'));
  build({ inline: theme });
  expect(checkBuild(dist, [SCRIPT])).toEqual(['index.html has an inline script the policy does not allow']);
  build({ inline: theme, scripts: [SCRIPT, theme] });
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

test('the guides for agents: both, the well-known copy the same, and each app’s examples beside its page', () => {
  build();
  rmSync(join(dist, 'llms-full.txt'));
  writeFileSync(join(dist, '.well-known/llms.txt'), 'old');
  rmSync(join(dist, 'examples/sheet.json'));
  expect(checkBuild(dist, [SCRIPT])).toEqual([
    'llms-full.txt is missing: the guide for agents (npm run skill)',
    '.well-known/llms.txt is not llms.txt',
    'examples/sheet.json is missing: llms/sheet.txt sends agents to it',
  ]);
});

test('the type: a font a stylesheet names or a page preloads is in the build, its licence beside it', () => {
  build();
  const put = (p: string, s: string) => (mkdirSync(join(dist, p, '..'), { recursive: true }), writeFileSync(join(dist, p), s));
  put('assets/main-abc.css', "@font-face{font-family:'IBM Plex Sans';src:url(../fonts/IBMPlexSans-Regular.woff2) format('woff2')}@font-face{src:url('/fonts/IBMPlexMono-Regular.woff2')}");
  put('write/index.html', '<!doctype html><link rel="preload" href="../fonts/IBMPlexSans-Regular.woff2" as="font" type="font/woff2" crossorigin />');
  expect(checkBuild(dist, [SCRIPT])).toEqual([
    'fonts/IBMPlexMono-Regular.woff2 is named by the build but is not in it',
    'fonts/IBMPlexSans-Regular.woff2 is named by the build but is not in it',
    'fonts/LICENSE.txt is missing: the fonts’ licence goes with them',
  ]);
  put('fonts/IBMPlexSans-Regular.woff2', 'wOF2');
  put('fonts/IBMPlexMono-Regular.woff2', 'wOF2');
  put('fonts/LICENSE.txt', 'SIL Open Font License');
  expect(checkBuild(dist, [SCRIPT])).toEqual([]);
});

test('a build whose pages carry their policy (the mirror: scripts/mirror.ts): every page, each its path’s from _headers less frame-ancestors', () => {
  build();
  const meta = (policy: string) => `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
  const hashes = hash(SCRIPT);
  const index = readFileSync(join(dist, 'index.html'), 'utf8');
  writeFileSync(join(dist, 'index.html'), index.replace('<!doctype html>', `<!doctype html>${meta(`default-src 'self'; script-src 'self' ${hashes}; object-src 'none'`)}`));
  expect(checkBuild(dist, [SCRIPT])).toEqual(['write/index.html has no policy in a <meta>, where the other pages have theirs']);
  writeFileSync(join(dist, 'write/index.html'), `<!doctype html>${meta(`default-src 'self'`)}<title>Word Processor</title>`);
  expect(checkBuild(dist, [SCRIPT])).toEqual(['write/index.html: the policy in its <meta> is not the one _headers gives /write/']);
  writeFileSync(join(dist, 'write/index.html'), `<!doctype html>${meta(`default-src 'self'; script-src 'self' ${hashes}; object-src 'none'`)}<title>Word Processor</title>`);
  // The embed page's own policy, in place of the site's (as public/_headers writes it).
  writeFileSync(join(dist, '_headers'), readFileSync(join(dist, '_headers'), 'utf8').replace('/embed/\n', '/embed/\n  ! Content-Security-Policy\n'));
  mkdirSync(join(dist, 'embed'));
  writeFileSync(join(dist, 'embed/index.html'), `<!doctype html>${meta(`script-src 'self' ${hashes}`)}`);
  expect(checkBuild(dist, [SCRIPT])).toEqual([]);
});

// The build in dist/ (after `npm run build`): the policy and version.json both name the hash of the theme script the
// pages carry, read from the built home page; no page names a theme file, and assets/ holds none.
const built = join(import.meta.dirname, '../dist');
test.skipIf(!existsSync(join(built, 'version.json')))('the build in dist/: the theme script in the page, its hash in _headers and version.json', () => {
  const inline = inlineScripts(readFileSync(join(built, 'index.html'), 'utf8'));
  expect(inline).toHaveLength(1);
  const want = scriptHash(inline[0]);
  for (const policy of readFileSync(join(built, '_headers'), 'utf8').matchAll(/script-src ([^;]*);/g)) expect(policy[1].split(/\s+/)).toContain(want);
  expect(JSON.parse(readFileSync(join(built, 'version.json'), 'utf8')).csp.scripts).toContain(want.slice(1, -1));
  expect(readdirSync(join(built, 'assets')).filter((f) => f.startsWith('theme'))).toEqual([]);
  expect(existsSync(join(built, 'theme.js'))).toBe(false);
});
