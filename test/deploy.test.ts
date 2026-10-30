// A tag deploys, from GitHub Actions (Paul, 2026-10-11: "GitHub Actions can handle the
// deploy to Cloudflare"): .github/workflows/deploy.yml runs scripts/deploy.mjs with the three secrets on a tag v*,
// checks the live site against the build, and makes the release; every action any workflow uses is pinned by its
// commit; and the deploy script refuses, with a sentence naming it, when a secret it needs is missing.
import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { yaml } from './yaml.ts';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const SECRETS = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'NPM_TOKEN'];

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}
interface Job {
  'runs-on': string;
  needs?: string;
  environment?: string;
  permissions?: Record<string, string>;
  env?: Record<string, string>;
  steps: Step[];
}
interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, Job>;
}

test('a tag v* deploys: the checks and the three Workers by npm run deploy with the three secrets, then the live site against the build, then the release', () => {
  const w = yaml(read('.github/workflows/deploy.yml')) as Workflow;
  // A tag, or a run by hand for a tag already pushed; never a push to main, never a pull request.
  expect(Object.keys(w.on).sort()).toEqual(['push', 'workflow_dispatch']);
  expect(w.on.push).toEqual({ tags: ['v*'] });
  expect((w.on.workflow_dispatch as { inputs: Record<string, { required: boolean }> }).inputs.tag.required).toBe(true);
  // One at a time, and a deploy under way is never cancelled by the next.
  expect(w.concurrency).toEqual({ group: 'deploy', 'cancel-in-progress': false });
  expect(w.permissions).toEqual({ contents: 'read' });

  const deploy = w.jobs.deploy;
  expect(deploy['runs-on']).toBe('ubuntu-latest');
  expect(deploy.environment).toBe('production');
  // The job that holds the Cloudflare and npm tokens may read the code and ask for an identity for provenance: nothing else.
  expect(deploy.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  const runs = deploy.steps.map((s) => s.run ?? '');
  const at = (cmd: string) => runs.findIndex((r) => r.split('\n').some((l) => l.trim().startsWith(cmd)));
  for (const cmd of ['npm ci', 'npx playwright install --with-deps chromium webkit', 'bash scripts/fonts-box.sh', 'npm run deploy', 'npm run verify-deploy -- https://tinylittleoffice.com/'])
    expect(at(cmd), cmd).toBeGreaterThanOrEqual(0);
  expect(at('npm ci')).toBeLessThan(at('npm run deploy'));
  expect(at('npm run deploy')).toBeLessThan(at('npm run verify-deploy'));
  expect(runs.join('\n')).toMatch(/apt-get install -y[^\n]*fonts-noto-core fonts-noto-cjk fonts-noto-extra/);
  // The secrets go to the deploy step alone, by name; no other step and no job-wide env sees one.
  const ship = deploy.steps[at('npm run deploy')];
  expect(ship.env).toEqual(Object.fromEntries(SECRETS.map((k) => [k, `\${{ secrets.${k} }}`])));
  for (const s of deploy.steps.filter((s) => s !== ship)) expect(JSON.stringify(s), s.name).not.toMatch(/secrets\./);
  expect(JSON.stringify(deploy.env ?? {})).not.toMatch(/secrets\./);
  // The tag is checked out with its history, so version.json names it and verify-deploy can find its commit.
  const checkout = deploy.steps.find((s) => s.uses?.startsWith('actions/checkout@'))!;
  expect(checkout.with).toMatchObject({ 'fetch-depth': 0 });

  // The release, after the deploy: the tag's build attested, and the notes (scripts/release-notes.ts) as its body.
  const release = w.jobs.release;
  expect(release.needs).toBe('deploy');
  expect(release.permissions).toEqual({ contents: 'write', 'id-token': 'write', attestations: 'write' });
  const rel = release.steps.map((s) => s.run ?? '').join('\n');
  expect(rel).toMatch(/node scripts\/release-notes\.ts [^\n]*> notes\.md/);
  expect(rel).toMatch(/gh release create [^\n]*--notes-file notes\.md/);
  expect(release.steps.some((s) => s.uses?.startsWith('actions/attest-build-provenance@'))).toBe(true);
  expect(JSON.stringify(release)).not.toMatch(/secrets\.(CLOUDFLARE|NPM)/);
  // One workflow makes a release: the old release workflow is folded into this one.
  expect(readdirSync(join(root, '.github/workflows')).sort()).toEqual(['ci.yml', 'dependencies.yml', 'deploy.yml', 'pages.yml']);
});

test('the mirror (docs/mirror.md): after a deploy that succeeded, or by hand, the tag built for GitHub Pages and published there, then its version.json checked', () => {
  const w = yaml(read('.github/workflows/pages.yml')) as Workflow & { env: Record<string, string> };
  expect(Object.keys(w.on).sort()).toEqual(['workflow_dispatch', 'workflow_run']);
  expect(w.on.workflow_run).toEqual({ workflows: ['Deploy'], types: ['completed'] });
  expect((yaml(read('.github/workflows/deploy.yml')) as { name: string }).name).toBe('Deploy');
  expect(w.permissions).toEqual({ contents: 'read' });
  expect(w.env.MIRROR).toBe('https://aboard-io.github.io/tinylittleoffice/');
  const job = w.jobs.mirror as Job & { if: string; environment: { name: string } };
  expect(job.if).toContain("github.event.workflow_run.conclusion == 'success'");
  expect(job.permissions).toEqual({ contents: 'read', pages: 'write', 'id-token': 'write' });
  expect(job.environment.name).toBe('github-pages');
  // No secret: the mirror holds nothing of Cloudflare's or npm's.
  expect(read('.github/workflows/pages.yml')).not.toMatch(/secrets\./);
  const at = (what: string) => job.steps.findIndex((s) => s.uses?.startsWith(what) || (s.run ?? '').includes(what));
  const order = [
    'actions/checkout@',
    'npm ci',
    'npm run build:mirror',
    'node scripts/check-build.ts',
    'actions/configure-pages@',
    'actions/upload-pages-artifact@',
    'actions/deploy-pages@',
    'version.json?run=',
  ];
  order.forEach((what, i) => expect(at(what), what).toBeGreaterThan(i ? at(order[i - 1]) : -1));
  expect(job.steps[at('actions/checkout@')].with?.ref).toBe('refs/tags/${{ steps.tag.outputs.tag }}');
  expect(job.steps[at('actions/upload-pages-artifact@')].with).toEqual({ path: 'dist', 'include-hidden-files': true });
  // The mirror's settings are one npm script's.
  const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
  expect(scripts['build:mirror']).toBe('VITE_SITE_URL=https://aboard-io.github.io/tinylittleoffice/ VITE_CSP_META=1 VITE_CARDS=0 VITE_TINIER=https://tinier.tinylittleoffice.com/ npm run build');
});

test('every action a workflow uses is pinned by its full commit hash, with its version beside it, never by a tag', () => {
  const dir = join(root, '.github/workflows');
  let seen = 0;
  for (const f of readdirSync(dir)) {
    for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
      const m = /^\s*(?:-\s+)?uses:\s*(.*)$/.exec(line);
      if (!m) continue;
      seen++;
      if (m[1].startsWith('./')) continue;
      expect(m[1], `${f}: ${line.trim()}`).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
    }
  }
  expect(seen).toBeGreaterThanOrEqual(6);
});

test('CI runs on pushes to main and on pull requests, and by hand (after a Dependabot branch is given its dependencies page), with no secret', () => {
  const ci = yaml(read('.github/workflows/ci.yml')) as Workflow;
  expect(ci.on).toEqual({ push: { branches: ['main'] }, pull_request: null, workflow_dispatch: null });
  expect(read('.github/workflows/ci.yml')).not.toMatch(/secrets\./);
});

test("Dependabot's pull requests are given the dependencies page its lockfile names, with no secret and no package's scripts, and CI run on that commit", () => {
  const w = yaml(read('.github/workflows/dependencies.yml')) as Workflow;
  expect(w.on).toEqual({ pull_request: { branches: ['main'] } });
  expect(w.permissions).toEqual({ contents: 'read' });
  const job = w.jobs.page as Job & { if: string };
  expect(job.if).toContain("github.actor == 'dependabot[bot]'");
  expect(job.permissions).toEqual({ contents: 'write', actions: 'write' });
  const runs = job.steps.map((s) => s.run ?? '').join('\n');
  expect(runs).toContain('npm ci --ignore-scripts');
  expect(runs.indexOf('npm run docs:deps')).toBeLessThan(runs.indexOf('git push'));
  expect(runs.indexOf('git push')).toBeLessThan(runs.indexOf('gh workflow run ci.yml'));
  expect(read('.github/workflows/dependencies.yml')).not.toMatch(/secrets\./);
});

/**
 * The deploy script, `--dry-run`, in an empty folder (no .env of this checkout's) with `env` and none of the three
 * secrets from this process. With `stub`, the folder is a git repository with one commit, and `npx`, `npm` and `node`
 * first on PATH are a stub that writes its command line and its environment to a log and runs nothing; `npx wrangler
 * secret list` prints `stub.list` (or fails when it is null). The log is returned as one entry per command.
 */
function deploy(files: Record<string, string>, env: Record<string, string> = {}, stub?: { list: string | null }) {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-deploy-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(dir, path, '..'), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    // Neither the secrets nor the runner's own identity (ACTIONS_ID_TOKEN_REQUEST_URL on GitHub, which turns provenance on) reach the dry run unless a test passes them.
    const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !SECRETS.includes(k) && !k.startsWith('ACTIONS_')));
    let PATH = clean.PATH ?? '';
    const log = join(dir, '..', `${dir.split('/').at(-1)}.log`);
    if (stub) {
      const git = (...a: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', ...a], { cwd: dir });
      git('init', '-q');
      git('add', '-A');
      git('commit', '-q', '--allow-empty', '-m', 'a commit');
      const bin = join(dir, '.stub');
      mkdirSync(bin);
      const list = stub.list === null ? 'echo "Authentication error [code: 10000]" >&2; exit 1' : `printf '%s' '${stub.list}'`;
      for (const name of ['npx', 'npm', 'node'])
        writeFileSync(join(bin, name), `#!/bin/sh\n{ echo "=== ${name} $*"; env; } >> '${log}'\ncase "${name} $*" in "npx wrangler secret list"*) ${list};; esac\nexit 0\n`, { mode: 0o755 });
      PATH = `${bin}:${PATH}`;
    }
    const r = spawnSync(process.execPath, [join(root, 'scripts/deploy.mjs'), '--dry-run'], { cwd: dir, env: { ...clean, ...env, PATH }, encoding: 'utf8' });
    let calls: { cmd: string; env: string }[] = [];
    try {
      calls = readFileSync(log, 'utf8')
        .split(/^=== /m)
        .filter(Boolean)
        .map((c) => ({ cmd: c.slice(0, c.indexOf('\n')), env: c.slice(c.indexOf('\n')) }));
    } catch {
      calls = [];
    }
    rmSync(log, { force: true });
    return { ...r, calls };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the deploy refuses, before any check, with a sentence naming each secret it needs and does not have', () => {
  const none = deploy({});
  expect(none.status).toBe(1);
  expect(none.stdout).not.toMatch(/▸/);
  expect(none.stderr).toMatch(/^Not deployed: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not set\. /);
  // While the command line's package is private there is nothing for npm, and no NPM_TOKEN is asked for.
  expect(none.stderr).not.toMatch(/NPM_TOKEN/);

  // The environment first, this checkout's .env second; a published package needs NPM_TOKEN too. No value is printed.
  const pkg = JSON.stringify({ name: 'tinylittleoffice', version: '1.0.0' });
  const one = deploy({ '.env': 'CLOUDFLARE_API_TOKEN="cf-token-from-dotenv"\n', 'packages/doc/package.json': pkg }, { CLOUDFLARE_ACCOUNT_ID: 'an-account' });
  expect(one.status).toBe(1);
  expect(one.stderr).toMatch(/^Not deployed: NPM_TOKEN is not set\. /);
  expect(one.stderr).toMatch(/repository secret/);
  expect(one.stderr).toMatch(/\.env/);
  expect(one.stdout + one.stderr).not.toMatch(/cf-token-from-dotenv|an-account/);
});

/** Stub values for the three secrets, and a command line's package that is published. */
const STUB = { CLOUDFLARE_API_TOKEN: 'stub-cf-token', CLOUDFLARE_ACCOUNT_ID: 'stub-cf-account', NPM_TOKEN: 'stub-npm-token' };
const PUBLISHED = { 'packages/doc/package.json': JSON.stringify({ name: 'tinylittleoffice', version: '1.0.0' }) };

test('the secrets are out of the environment of every check, and reach Wrangler alone', () => {
  const r = deploy(PUBLISHED, STUB, { list: '[{"name":"BRAKE_KEY","type":"secret_text"}]' });
  expect(r.status, r.stderr).toBe(0);
  const checks = r.calls.filter((c) => /^(npm run|node) /.test(c.cmd));
  const wrangler = r.calls.filter((c) => c.cmd.startsWith('npx wrangler '));
  // Every check ran: the types, the strings, the unit and browser tests, the smoke run, the policy and the version.
  expect(checks.map((c) => c.cmd)).toEqual(['npm run -s typecheck', 'npm run -s i18n:check', 'npm run -s test:unit', 'npm run -s test:browser', 'node scripts/check-build.ts']);
  expect(r.calls.some((c) => c.cmd.startsWith('npx playwright test'))).toBe(true);
  for (const c of r.calls.filter((c) => !c.cmd.startsWith('npx wrangler '))) for (const k of SECRETS) expect(c.env, `${c.cmd}: ${k}`).not.toMatch(new RegExp(`^${k}=`, 'm'));
  expect(wrangler.map((c) => c.cmd)).toEqual([
    'npx wrangler secret list -c backends/cloudflare/tinier/wrangler.jsonc --format json',
    'npx wrangler secret list -c backends/cloudflare/site/wrangler.jsonc --format json',
    'npx wrangler secret list -c backends/cloudflare/journal/wrangler.jsonc --format json',
  ]);
  expect(wrangler[0].env).toMatch(/^CLOUDFLARE_API_TOKEN=stub-cf-token$/m);
  expect(wrangler[0].env).toMatch(/^CLOUDFLARE_ACCOUNT_ID=stub-cf-account$/m);
  expect(wrangler[0].env).not.toMatch(/^NPM_TOKEN=/m);
  expect(r.stdout + r.stderr).not.toMatch(/stub-cf-token|stub-cf-account|stub-npm-token/);
});

test('the deploy stops before any check when a Worker has no BRAKE_KEY, or its secrets cannot be listed', () => {
  const none = deploy({}, STUB, { list: '[]' });
  expect(none.status).toBe(1);
  expect(none.stderr).toMatch(/^Not deployed: the shortener has no BRAKE_KEY\. /);
  expect(none.stdout.split('the shortener has its BRAKE_KEY\n')[1] ?? '').not.toMatch(/▸/);
  expect(none.calls.map((c) => c.cmd)).toEqual(['npx wrangler secret list -c backends/cloudflare/tinier/wrangler.jsonc --format json']);

  const failed = deploy({}, STUB, { list: null });
  expect(failed.status).toBe(1);
  expect(failed.stderr).toMatch(/^Not deployed: Wrangler could not list the shortener's secrets with this token and account \(Authentication error \[code: 10000\]\)\./);
  expect(failed.calls).toHaveLength(1);
});

test("a dry run lists the shipping: the shortener's migrations before either Worker, and npm with provenance only on a runner", () => {
  const list = '[{"name":"BRAKE_KEY"}]';
  const here = deploy(PUBLISHED, STUB, { list });
  expect(here.status, here.stderr).toBe(0);
  const lines = here.stdout.slice(here.stdout.indexOf('Dry run:')).split('\n');
  const at = (s: string) => lines.findIndex((l) => l.includes(s));
  expect(at("the shortener's tables: npx wrangler d1 migrations apply tinier --remote -c backends/cloudflare/tinier/wrangler.jsonc")).toBeGreaterThan(0);
  expect(at("the shortener's tables:")).toBeLessThan(at('the site: npx wrangler deploy'));
  expect(at("the shortener's tables:")).toBeLessThan(at('the shortener: npx wrangler deploy -c backends/cloudflare/tinier/wrangler.jsonc'));
  expect(at('the shortener: npx wrangler deploy')).toBeLessThan(at('the journal: npx wrangler deploy -c backends/cloudflare/journal/wrangler.jsonc'));
  expect(here.stdout).toMatch(/the command line, on npm: tinylittleoffice 1\.0\.0, if npm has not that version: npm publish --access public --provenance=false$/m);

  const runner = deploy(PUBLISHED, { ...STUB, ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.actions.example/' }, { list });
  expect(runner.status, runner.stderr).toBe(0);
  expect(runner.stdout).toMatch(/npm publish --access public --provenance=true$/m);
});
