// The repository as a stranger finds it at github.com/aboard-io/tinylittleoffice (directive r17-public): no old name
// and no path of the machine it was built on, the package's metadata, the community files, and a CI that runs every
// check the deploy runs (scripts/deploy.mjs), in workflow files that are YAML.
import { test, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../src/kit/version.ts';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const URL = 'https://github.com/aboard-io/tinylittleoffice';

/**
 * The YAML a workflow, an issue form and dependabot.yml are written in: block mappings and sequences by indentation
 * (two spaces), plain, quoted and `|` block scalars, and flow sequences of scalars. Anything else throws, so a file
 * that parses here is YAML GitHub reads the same way.
 */
export function yaml(text: string): unknown {
  const lines = text.split('\n');
  let i = 0;
  const indentOf = (l: string) => l.length - l.trimStart().length;
  const skip = () => {
    while (i < lines.length && (!lines[i].trim() || lines[i].trimStart().startsWith('#'))) i++;
  };
  const scalar = (s: string): unknown => {
    s = s.trim();
    if (/^'.*'$/.test(s)) return s.slice(1, -1).replaceAll("''", "'");
    if (/^".*"$/.test(s)) return JSON.parse(s);
    if (/^\[.*\]$/.test(s)) return s.slice(1, -1).trim() ? s.slice(1, -1).split(',').map(scalar) : [];
    if (/^[[{"'&*!%@`]/.test(s) || /\s#/.test(s) || /:\s/.test(s)) throw new Error(`line ${i}: a scalar this reader does not take: ${s}`);
    return s === 'true' ? true : s === 'false' ? false : /^-?\d+$/.test(s) ? Number(s) : s;
  };
  const block = (at: number): string => {
    const out: string[] = [];
    while (i < lines.length && (!lines[i].trim() || indentOf(lines[i]) > at)) out.push(lines[i++]);
    while (out.length && !out.at(-1)!.trim()) out.pop();
    const cut = Math.min(...out.filter((l) => l.trim()).map(indentOf));
    return out.map((l) => l.slice(cut)).join('\n') + '\n';
  };
  const node = (at: number): unknown => {
    skip();
    if (i >= lines.length) return null;
    const first = lines[i];
    if (first.includes('\t')) throw new Error(`line ${i + 1}: a tab`);
    if (indentOf(first) !== at) throw new Error(`line ${i + 1}: indented ${indentOf(first)}, not ${at}`);
    if (first.trimStart().startsWith('- ') || first.trim() === '-') {
      const list: unknown[] = [];
      while ((skip(), i < lines.length) && indentOf(lines[i]) === at && lines[i].trimStart().startsWith('-')) {
        const rest = lines[i].trimStart().slice(1).trimStart();
        if (/^[\w.-]+:(\s|$)/.test(rest)) {
          lines[i] = ' '.repeat(at + 2) + rest;
          list.push(node(at + 2));
        } else {
          i++;
          list.push(scalar(rest));
        }
      }
      return list;
    }
    const map: Record<string, unknown> = {};
    while ((skip(), i < lines.length) && indentOf(lines[i]) === at) {
      const m = /^([\w.-]+|'[^']*'):(?:\s+(.*))?$/.exec(lines[i].trim());
      if (!m) throw new Error(`line ${i + 1}: not a key: ${lines[i].trim()}`);
      const key = m[1].replace(/^'|'$/g, '');
      if (key in map) throw new Error(`line ${i + 1}: ${key} twice`);
      i++;
      if (m[2] === '|') map[key] = block(at);
      else if (m[2] !== undefined) map[key] = scalar(m[2]);
      else {
        skip();
        map[key] = i < lines.length && indentOf(lines[i]) > at ? node(indentOf(lines[i])) : null;
      }
    }
    return map;
  };
  const doc = node(0);
  skip();
  if (i < lines.length) throw new Error(`line ${i + 1}: left over: ${lines[i]}`);
  return doc;
}

const ymls = (dir: string): string[] =>
  readdirSync(join(root, dir), { recursive: true })
    .map(String)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => `${dir}/${f}`);

test('the reader takes what the files use and refuses what it does not', () => {
  expect(yaml('a: 1\nb:\n  - x\n  - k: v\n    l: [m, "n"]\nc: |\n  one\n    two\nd: true\n')).toEqual({ a: 1, b: ['x', { k: 'v', l: ['m', 'n'] }], c: 'one\n  two\n', d: true });
  for (const bad of ['a: 1\n\tb: 2\n', 'a:\n  b: 1\n c: 2\n', 'a: {b: 1}\n', 'a: 1\na: 2\n', 'a: b: c\n']) expect(() => yaml(bad), bad).toThrow();
});

test('every YAML file in .github is YAML', () => {
  const files = ymls('.github');
  expect(files).toEqual(expect.arrayContaining(['.github/workflows/ci.yml', '.github/dependabot.yml', '.github/ISSUE_TEMPLATE/bug.yml', '.github/ISSUE_TEMPLATE/feature.yml']));
  for (const f of files) expect(() => yaml(read(f)), f).not.toThrow();
});

test('no old name and no path of this machine anywhere in the tree (docs/history is a record, and kept)', () => {
  const old = ['ftrain', 'tinyoffice'].join('/');
  const home = ['', 'home', 'exedev'].join('/');
  const r = spawnSync('git', ['grep', '-n', '-I', '-F', '-e', old, '-e', home, '--', '.', ':!docs/history'], { cwd: root, encoding: 'utf8' });
  expect(r.status === 0 ? r.stdout.trim().split('\n') : [], r.stderr).toEqual([]);
  expect(`https://github.com/${REPO}`).toBe(URL);
});

test('the package says what it is and where it lives, and stays unpublished: a site, not a package', () => {
  for (const path of ['package.json', 'packages/doc/package.json']) {
    const p = JSON.parse(read(path));
    expect(p.private, path).toBe(true);
    expect(p.license, path).toBe('MIT');
    expect(p.homepage, path).toBe('https://tinylittleoffice.com');
    expect(p.repository, path).toEqual({ type: 'git', url: URL, ...(path === 'package.json' ? {} : { directory: 'packages/doc' }) });
    expect(p.bugs, path).toEqual({ url: `${URL}/issues` });
  }
  expect(JSON.parse(read('package.json')).name).toBe('tinylittleoffice');
  expect(JSON.parse(read('package-lock.json')).name).toBe('tinylittleoffice');
});

test('a stranger finds the licence, how to contribute, how to report a hole privately, and the code of conduct', () => {
  expect(read('LICENSE')).toMatch(/^MIT License\n\nCopyright \(c\) 2026 Paul Ford\n/);
  const contributing = read('CONTRIBUTING.md');
  for (const cmd of ['npm test', 'npm run lint', 'npm run build', 't()', 'Prettier']) expect(contributing, cmd).toContain(cmd);
  const security = read('SECURITY.md');
  expect(security).toContain(`${URL}/security/advisories/new`);
  expect(security).toContain('docs/threat-model.md');
  expect(security).not.toMatch(/[\w.-]+@[\w-]+\.[\w.]+/);
  const conduct = read('CODE_OF_CONDUCT.md');
  expect(conduct).toContain('# Contributor Covenant Code of Conduct');
  expect(conduct).toContain('version 2.1');
  for (const h of ['## Our Pledge', '## Our Standards', '## Enforcement Responsibilities', '## Scope', '## Enforcement', '## Enforcement Guidelines', '## Attribution'])
    expect(conduct, h).toContain(h);
  expect(existsSync(join(root, '.github/PULL_REQUEST_TEMPLATE.md'))).toBe(true);
  expect(read('.github/PULL_REQUEST_TEMPLATE.md').trim().split('\n').length).toBe(3);
  for (const f of ['.github/ISSUE_TEMPLATE/bug.yml', '.github/ISSUE_TEMPLATE/config.yml', 'README.md']) expect(read(f), f).not.toMatch(/security@/);
});

/** What the deploy runs before it ships (scripts/deploy.mjs's run(what, cmd)), less Wrangler's deploys and the --full e2e run. */
const deployChecks = () =>
  [...read('scripts/deploy.mjs').matchAll(/run\('([^']+)', '([^']+)'\)/g)].map((m) => m[2].replaceAll(' -s ', ' ')).filter((cmd) => !cmd.startsWith('npx wrangler') && cmd !== 'npx playwright test');

test('CI runs, on every push and pull request, every check the deploy runs, in Chromium and WebKit with the fonts the measuring tests need', () => {
  const ci = yaml(read('.github/workflows/ci.yml')) as { on: Record<string, unknown>; jobs: Record<string, { 'runs-on': string; steps: { run?: string }[] }> };
  expect(Object.keys(ci.on).sort()).toEqual(['pull_request', 'push']);
  const job = Object.values(ci.jobs)[0];
  expect(Object.keys(ci.jobs)).toEqual(['check']);
  expect(job['runs-on']).toBe('ubuntu-latest');
  const runs = job.steps.flatMap((s) => (s.run ?? '').split('\n').map((l) => l.trim().replaceAll(' -s ', ' '))).filter(Boolean);
  const checks = deployChecks();
  expect(checks.length).toBeGreaterThanOrEqual(7);
  for (const cmd of checks) expect(runs, cmd).toContain(cmd);
  for (const cmd of ['npm ci', 'npx playwright install --with-deps chromium webkit', 'npm run lint']) expect(runs, cmd).toContain(cmd);
  expect(runs.indexOf('npm ci')).toBe(0);
  expect(runs.join('\n')).toMatch(/apt-get install -y[^\n]*fonts-noto-core fonts-noto-cjk fonts-noto-extra/);
});

test('dependabot asks for npm updates weekly, grouped', () => {
  const d = yaml(read('.github/dependabot.yml')) as { version: number; updates: { 'package-ecosystem': string; schedule: { interval: string }; groups: Record<string, unknown> }[] };
  expect(d.version).toBe(2);
  const npm = d.updates.find((u) => u['package-ecosystem'] === 'npm')!;
  expect(npm.schedule.interval).toBe('weekly');
  expect(Object.keys(npm.groups).length).toBeGreaterThan(0);
});
