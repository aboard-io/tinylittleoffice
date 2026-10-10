/**
 * A build of one commit, made apart from this checkout, and the hash of every file a build holds: the parts
 * scripts/reproducible.ts (two builds of a commit are the same bytes) and scripts/verify-deploy.ts (the live
 * site is a commit's build) share. A build is made in a fresh git worktree of the commit, in a folder of its
 * own under the system's temporary directory, with this checkout's node_modules linked in and the VITE_
 * settings this checkout's build would see (its .env files and the environment): the same `npm run build`
 * anyone runs, and nothing of this checkout's uncommitted work.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, type Dirent } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { loadEnv } from 'vite';

export const ROOT = resolve(import.meta.dirname, '..');

/** Every file under `dist` (relative, forward slashes) and its sha256, in hex, sorted by path. */
export function hashTree(dist: string): Map<string, string> {
  const files = (readdirSync(dist, { recursive: true, withFileTypes: true }) as Dirent[])
    .filter((f) => f.isFile())
    .map((f) => resolve(f.parentPath, f.name))
    .map((p) => [relative(dist, p).replaceAll('\\', '/'), sha256(readFileSync(p))] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(files);
}

export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** The first way two builds differ, in words (a file only one has, or a file whose bytes differ), or null when they are the same. */
export function firstDifference(a: Map<string, string>, b: Map<string, string>, names = ['the first build', 'the second build']): string | null {
  const paths = [...new Set([...a.keys(), ...b.keys()])].sort();
  for (const p of paths) {
    if (!b.has(p)) return `${p}: only in ${names[0]}`;
    if (!a.has(p)) return `${p}: only in ${names[1]}`;
    if (a.get(p) !== b.get(p)) return `${p}: ${a.get(p)!.slice(0, 12)} in ${names[0]}, ${b.get(p)!.slice(0, 12)} in ${names[1]}`;
  }
  return null;
}

const git = (args: string[], cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The full id of a commit this checkout has, or null. */
export function commitOf(ref: string): string | null {
  try {
    return git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  } catch {
    return null;
  }
}

/** The VITE_ settings a production build in this checkout sees: its .env files, then the environment over them. */
export const viteEnv = () => loadEnv('production', ROOT, 'VITE_');

/** Whether this checkout is `commit` with nothing changed, and its dist/ says it is that commit's build. */
export function distIs(commit: string): boolean {
  const clean = git(['status', '--porcelain', '--untracked-files=no']) === '';
  try {
    return clean && commitOf('HEAD') === commit && JSON.parse(readFileSync(join(ROOT, 'dist', 'version.json'), 'utf8')).commit === commit;
  } catch {
    return false;
  }
}

export interface Made {
  /** The build's dist/. */
  dist: string;
  /** Removes the worktree and its folder. */
  done(): void;
}

/**
 * `npm run build` of `commit` in a fresh worktree under a new temporary folder (`label` names it); its output
 * to `log`. `env` are settings this checkout's own (its .env files, the environment) override. `deep` puts the checkout two folders further down, so a path the build writes relative to where
 * node_modules really is (a bundler's note, a source map) comes out different, and is caught.
 */
export function buildCommit(commit: string, label: string, { deep = false, env = {} as Record<string, string>, log = (_: string) => {} } = {}): Made {
  const folder = mkdtempSync(join(tmpdir(), `tlo-${label}-`));
  const tree = deep ? join(folder, 'one', 'more', 'tree') : join(folder, 'tree');
  git(['worktree', 'add', '--detach', '--quiet', tree, commit]);
  const done = () => {
    try {
      git(['worktree', 'remove', '--force', tree]);
    } catch {
      // Already gone: prune what git still remembers of it.
      git(['worktree', 'prune']);
    }
    rmSync(folder, { recursive: true, force: true });
  };
  try {
    const modules = join(ROOT, 'node_modules');
    if (!existsSync(modules)) throw new Error('no node_modules here: run npm ci first');
    symlinkSync(realpathSync(modules), join(tree, 'node_modules'), 'dir');
    log(execFileSync('npm', ['run', '-s', 'build'], { cwd: tree, encoding: 'utf8', env: { ...process.env, ...env, ...viteEnv() }, stdio: ['ignore', 'pipe', 'pipe'] }));
    return { dist: join(tree, 'dist'), done };
  } catch (e) {
    done();
    throw e;
  }
}
