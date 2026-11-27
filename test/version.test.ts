// /version.json (docs/threat-model.md, "Checking it yourself"): its shape, written from git and the policy's hashes, never the clock.
import { test, expect } from 'vitest';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gitFacts, versionJson, versionOf } from '../scripts/version.ts';
import { commitUrl, isVersion, repoUrl } from '../src/kit/core/version.ts';

const root = join(import.meta.dirname, '..');

test('the file is the commit, its tag, its date and the script hashes without their quotes, and nothing else', () => {
  const v = versionOf({ commit: 'a'.repeat(40), tag: 'v1.0.0', built: '2026-10-10T09:00:00Z' }, ["'sha256-abc='", "'sha256-def='"]);
  expect(v).toEqual({ commit: 'a'.repeat(40), tag: 'v1.0.0', built: '2026-10-10T09:00:00Z', csp: { scripts: ['sha256-abc=', 'sha256-def='] } });
  expect(Object.keys(v)).toEqual(['commit', 'tag', 'built', 'csp']);
  expect(isVersion(JSON.parse(versionJson(v)))).toBe(true);
  expect(versionJson(v).endsWith('}\n')).toBe(true);
  // The same facts are the same bytes.
  expect(versionJson(v)).toBe(versionJson(versionOf({ ...v }, ["'sha256-abc='", "'sha256-def='"])));
});

test('anything else is not a version', () => {
  for (const bad of [null, 1, 'x', {}, { commit: 'a', tag: '', built: '' }, { commit: 'a', tag: '', built: '', csp: { scripts: [1] } }]) expect(isVersion(bad)).toBe(false);
});

test('the facts come from the checkout: the full commit and the commit’s own date in UTC, the same each time', () => {
  const f = gitFacts(root);
  expect(f.commit).toMatch(/^[0-9a-f]{40}$/);
  expect(f.built).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  expect(typeof f.tag).toBe('string');
  expect(gitFacts(root)).toEqual(f);
});

test('outside a checkout there are no facts, and no error', () => {
  expect(gitFacts('/', {})).toEqual({ commit: '', tag: '', built: '' });
});

test('outside a checkout (the self-hosted image), the facts the build is given, each only in its shape (#26)', () => {
  const commit = 'a'.repeat(40);
  expect(gitFacts('/', { TLO_COMMIT: commit, TLO_TAG: 'v1.2.42', TLO_BUILT: '2026-11-27T23:07:31Z' })).toEqual({ commit, tag: 'v1.2.42', built: '2026-11-27T23:07:31Z' });
  expect(gitFacts('/', { TLO_COMMIT: commit, TLO_TAG: '', TLO_BUILT: '' })).toEqual({ commit, tag: '', built: '' });
  expect(gitFacts('/', { TLO_COMMIT: commit, TLO_TAG: '<script>', TLO_BUILT: 'yesterday' })).toEqual({ commit, tag: '', built: '' });
  expect(gitFacts('/', { TLO_COMMIT: 'abc', TLO_TAG: 'v1', TLO_BUILT: '2026-11-27T23:07:31Z' })).toEqual({ commit: '', tag: '', built: '' });
  // A checkout's own facts win over anything given.
  expect(gitFacts(root, { TLO_COMMIT: commit }).commit).not.toBe(commit);
});

test('--env prints the checkout’s facts as the image’s build takes them', () => {
  const out = execFileSync('node', ['scripts/version.ts', '--env'], { cwd: root, encoding: 'utf8' }).trim();
  const f = gitFacts(root);
  expect(out).toBe(`COMMIT=${f.commit} TAG=${f.tag} BUILT=${f.built}`);
});

test('a commit and the repository itself link to their pages in the published source', () => {
  expect(commitUrl('abc')).toBe('https://github.com/aboard-io/tinylittleoffice/commit/abc');
  expect(repoUrl()).toBe('https://github.com/aboard-io/tinylittleoffice');
});

test('a release’s notes name the tag, the commit and every script hash, and how to check them', async () => {
  const { releaseNotes } = await import('../scripts/release-notes.ts');
  const notes = releaseNotes({ commit: 'b'.repeat(40), tag: 'v1.0.0', built: '2026-10-10T09:00:00Z', csp: { scripts: ['sha256-abc=', 'sha256-def='] } }, 'tinylittleoffice-v1.0.0.tar.gz');
  expect(notes).toContain(`Tiny Little Office v1.0.0: the site's files as built from commit ${'b'.repeat(40)}`);
  expect(notes).toContain('- `sha256-abc=`\n- `sha256-def=`');
  expect(notes).toContain('gh attestation verify tinylittleoffice-v1.0.0.tar.gz -R aboard-io/tinylittleoffice');
  expect(notes).toContain('npm run verify-deploy -- https://tinylittleoffice.com/ v1.0.0');
  // The tag's own message first, when there is one: what the release carries and who it thanks.
  const told = releaseNotes(
    { commit: 'b'.repeat(40), tag: 'v1.0.0', built: '2026-10-10T09:00:00Z', csp: { scripts: [] } },
    'x.tar.gz',
    'v1.0.0: links survive Messages (thanks to a contributor, #2)\n',
  );
  expect(told.split('\n').slice(0, 4)).toEqual([
    `Tiny Little Office v1.0.0: the site's files as built from commit ${'b'.repeat(40)} (committed 2026-10-10T09:00:00Z).`,
    '',
    'v1.0.0: links survive Messages (thanks to a contributor, #2)',
    '',
  ]);
  expect(notes).not.toContain('\n\n\n');
});
