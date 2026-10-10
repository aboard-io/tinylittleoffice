/**
 * A release's notes, from the build's own /version.json (.github/workflows/release.yml): the tag and the
 * commit, the commit's date, the Content-Security-Policy's script hashes (the only inline code the site
 * will run), and how to check the release and a running site against it.
 *
 *   node scripts/release-notes.ts [archive name]   the notes for dist/, on stdout
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, isVersion, type Version } from '../src/kit/version.ts';

export function releaseNotes(v: Version, archive = 'dist.tar.gz'): string {
  const name = v.tag || v.commit.slice(0, 7);
  return [
    `Tiny Little Office ${name}: the site's files as built from commit ${v.commit} (committed ${v.built}).`,
    '',
    '## The script hashes',
    '',
    'The Content-Security-Policy runs no inline script but these (`script-src`, in `_headers`):',
    '',
    ...v.csp.scripts.map((h) => `- \`${h}\``),
    '',
    '## Checking it',
    '',
    `- The archive is the build itself, attested by GitHub: \`gh attestation verify ${archive} -R ${REPO}\`.`,
    `- Build it yourself: \`git checkout ${name} && npm ci && npm run build\` gives the same bytes; \`npm run build:verify\` builds it twice and compares.`,
    `- A running site: \`npm run verify-deploy -- https://tinylittleoffice.com/ ${name}\` fetches every file and compares it with this build. The site's own \`/version.json\` names the commit it runs.`,
    '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const v: unknown = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'dist', 'version.json'), 'utf8'));
  if (!isVersion(v) || !v.commit) {
    console.error('dist/version.json is missing its commit: build from a git checkout.');
    process.exit(1);
  }
  process.stdout.write(releaseNotes(v, process.argv[2]));
}
