/**
 * /version.json, written into dist/ by the build (vite.config.ts): which commit this is, its tag, the
 * commit's own date and the CSP's script hashes (the shape is src/kit/version.ts). Everything comes from
 * git and the build's own files, never the clock, so two builds of one commit are the same bytes
 * (scripts/reproducible.ts). Outside a git checkout (a source archive) the commit, tag and date are "".
 */
import { execFileSync } from 'node:child_process';
import type { Version } from '../src/kit/version.ts';

/** `git <args>` in `root`, trimmed; "" when git cannot say. */
function git(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/** The commit checked out in `root`, the tag on it (the newest by name when there are several) and the commit's date. */
export function gitFacts(root: string): { commit: string; tag: string; built: string } {
  const commit = git(root, ['rev-parse', 'HEAD']);
  if (!commit) return { commit: '', tag: '', built: '' };
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
