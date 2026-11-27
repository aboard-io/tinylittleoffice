/**
 * /version.json, written into dist/ by the build (vite.config.ts): which commit this is, its tag, the
 * commit's own date and the CSP's script hashes (the shape is src/kit/core/version.ts). Everything comes from
 * git and the build's own files, never the clock, so two builds of one commit are the same bytes
 * (scripts/reproducible.ts). Outside a git checkout they come from the build's TLO_COMMIT, TLO_TAG and TLO_BUILT, as
 * the self-hosted image is built (Dockerfile; `node scripts/version.ts --env` prints them from the checkout), and
 * are "" where none is given (a source archive).
 *
 *   node scripts/version.ts --env       COMMIT=… TAG=… BUILT=… for the checkout, as `docker compose build` takes them
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Version } from '../src/kit/core/version.ts';

/** `git <args>` in `root`, trimmed; "" when git cannot say. */
function git(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** The commit checked out in `root`, the tag on it (the newest by name when there are several) and the commit's date. */
export function gitFacts(root: string, env: Record<string, string | undefined> = process.env): { commit: string; tag: string; built: string } {
  const commit = git(root, ['rev-parse', 'HEAD']);
  if (!commit) return givenFacts(env);
  const tags = git(root, ['tag', '--points-at', 'HEAD', '--sort=-v:refname']).split('\n').filter(Boolean);
  // %cI: the committer's date, strict ISO 8601; shown in UTC so the bytes do not depend on where it was committed.
  const date = git(root, ['show', '-s', '--format=%cI', 'HEAD']);
  return { commit, tag: tags[0] ?? '', built: date ? new Date(date).toISOString().replace('.000Z', 'Z') : '' };
}

/** The file's value: `scripts` are the policy's hashes as _headers has them ("'sha256-…'"), written without the quotes. */
export function versionOf(facts: { commit: string; tag: string; built: string }, scripts: string[]): Version {
  return { commit: facts.commit, tag: facts.tag, built: facts.built, csp: { scripts: scripts.map((s) => s.replace(/^'|'$/g, '')) } };
}

/** The file's text: the value, two-space indented, a newline at the end. */
export const versionJson = (v: Version) => `${JSON.stringify(v, null, 2)}\n`;

/**
 * The facts a build without git is given (TLO_COMMIT, TLO_TAG, TLO_BUILT), each kept only in its shape: a full commit, a
 * tag of letters, digits, dots and dashes, and a date as gitFacts writes it; all "" without a commit.
 */
function givenFacts(env: Record<string, string | undefined>): { commit: string; tag: string; built: string } {
  const commit = /^[0-9a-f]{40}$/.test(env.TLO_COMMIT ?? '') ? env.TLO_COMMIT! : '';
  if (!commit) return { commit: '', tag: '', built: '' };
  const tag = /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(env.TLO_TAG ?? '') ? env.TLO_TAG! : '';
  const built = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(env.TLO_BUILT ?? '') ? env.TLO_BUILT! : '';
  return { commit, tag, built };
}

if (process.argv[1] === import.meta.filename && process.argv.includes('--env')) {
  const f = gitFacts(join(import.meta.dirname, '..'));
  console.log(`COMMIT=${f.commit} TAG=${f.tag} BUILT=${f.built}`);
}
