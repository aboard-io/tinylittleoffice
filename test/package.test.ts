// The npm package `tinylittleoffice` (packages/doc) as an agent with a runtime gets it: built (npm run build:cli, and
// npm run build:lib for the library's entry points), packed, installed from the tarball into a folder of its own, and
// run there. Node strips no types under node_modules, so this is the test that the package carries what it runs. The
// editors are a page's, so only their files are looked for here; test/browser/editors.test.ts mounts one.
import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PKG = join(ROOT, 'packages/doc');
const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));

test('the package is the site’s version, public, named tinylittleoffice, with both commands and no dependencies', () => {
  expect(pkg.name).toBe('tinylittleoffice');
  expect(pkg.private).toBeUndefined();
  expect(pkg.version).toBe(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version);
  expect(pkg.bin).toStrictEqual({ tinylittleoffice: 'dist/tinyoffice.js', tinyoffice: 'dist/tinyoffice.js' });
  expect(pkg.dependencies).toBeUndefined();
  expect(pkg.files).toEqual(expect.arrayContaining(['dist/tinyoffice.js', 'dist/api.js', 'dist/skill', 'examples', 'schema', 'README.md']));
});

test('the package serves the library: the kernel, the editors and their stylesheet, beside the API', () => {
  expect(pkg.exports).toMatchObject({ '.': './dist/api.js', './doc': './dist/doc.js', './editors': './dist/editors.js', './editors.css': './dist/editors.css' });
  expect(pkg.files).toEqual(expect.arrayContaining(['dist/doc.js', 'dist/editors.js', 'dist/editors.css', 'dist/editors']));
  // The kernel has no side effects to keep; the editors define their elements and the stylesheet styles the page.
  expect(pkg.sideEffects).not.toContain('./dist/doc.js');
  expect(pkg.sideEffects).toEqual(expect.arrayContaining(['./dist/editors.js', './dist/editors.css', './dist/editors/*']));
});

test('packed and installed elsewhere, `tinylittleoffice` lints an example, gives one, installs the skill, the API and the kernel import, and the editors are there', { timeout: 600_000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-npm-'));
  try {
    const npm = (args: string[], cwd: string) => execFileSync('npm', [...args, '--cache', join(dir, 'cache'), '--no-audit', '--no-fund', '--loglevel=error'], { cwd, encoding: 'utf8' });
    execFileSync('npm', ['run', '-s', 'build:cli'], { cwd: ROOT, stdio: 'ignore' });
    execFileSync('npm', ['run', '-s', 'build:lib'], { cwd: ROOT, stdio: 'ignore' });
    const tgz = npm(['pack', '--pack-destination', dir], PKG).trim().split('\n').pop()!;
    const app = join(dir, 'app');
    execFileSync('mkdir', [app]);
    writeFileSync(join(app, 'package.json'), '{ "name": "agent", "private": true, "type": "module" }\n');
    npm(['install', '--offline', join(dir, tgz)], app);
    const bin = join(app, 'node_modules/.bin/tinylittleoffice');
    const sheet = JSON.parse(readFileSync(join(app, 'node_modules/tinylittleoffice/examples/sheet.json'), 'utf8'));
    writeFileSync(join(app, 'money.tlo'), `---\napp: sheet\n---\n${sheet.shapes[0].text}`);
    expect(execFileSync(bin, ['lint', join(app, 'money.tlo')], { encoding: 'utf8' })).toBe('');
    expect(execFileSync(bin, ['example', 'sheet', 'money'], { encoding: 'utf8' })).toContain('The lint: clean');
    expect(execFileSync(join(app, 'node_modules/.bin/tinyoffice'), ['shapes', 'diagram'], { encoding: 'utf8' })).toContain('venn');
    // The skill's folder rides in the package, as `npm run skill` wrote it, and installs from there, whole.
    const files = [
      'SKILL.md',
      ...readdirSync(join(ROOT, 'skill/tinyoffice/references'))
        .sort()
        .map((f) => `references/${f}`),
    ];
    expect(execFileSync(bin, ['skill'], { encoding: 'utf8' })).toBe(readFileSync(join(ROOT, 'skill/tinyoffice/SKILL.md'), 'utf8'));
    expect(
      execFileSync(bin, ['skill', '--into', join(app, 'skills')], { encoding: 'utf8' })
        .trim()
        .split('\n'),
    ).toStrictEqual(files.map((f) => join(app, 'skills/tinyoffice', f)));
    for (const f of files) expect(readFileSync(join(app, 'skills/tinyoffice', f), 'utf8'), f).toBe(readFileSync(join(ROOT, 'skill/tinyoffice', f), 'utf8'));
    expect(readdirSync(join(app, 'node_modules/tinylittleoffice/dist/skill/tinyoffice')).sort()).toStrictEqual(['SKILL.md', 'references']);
    const made = execFileSync(process.execPath, ['--input-type=module', '-e', "import { link, read } from 'tinylittleoffice'; console.log(read(link('outline', '- [ ] Milk\\n')).text)"], {
      cwd: app,
      encoding: 'utf8',
    });
    expect(made).toBe('- [ ] Milk\n\n');
    // The kernel, as a program that keeps its own documents uses it: parsed, an operation applied, written, read again
    // the same, and the operation's inverse putting the first text back.
    const kernel = [
      "import { parse, apply, applyAll, invert, write } from 'tinylittleoffice/doc';",
      "const doc = parse('# Plan\\n\\nShip it.\\n');",
      "const op = { op: 'text', at: 1, from: 0, to: 4, runs: [{ t: 'Sail' }] };",
      'const next = apply(doc, op);',
      'console.log(JSON.stringify([write(next), write(parse(write(next))), write(applyAll(next, invert(doc, op)))]));',
    ].join('\n');
    expect(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', kernel], { cwd: app, encoding: 'utf8' }))).toStrictEqual([
      '# Plan\n\nSail it.\n',
      '# Plan\n\nSail it.\n',
      '# Plan\n\nShip it.\n',
    ]);
    // The editors and their stylesheet, whole (never run under Node), and the files fetched only when asked for beside them.
    const dist = join(app, 'node_modules/tinylittleoffice/dist');
    expect(statSync(join(dist, 'editors.js')).size).toBeGreaterThan(500_000);
    expect(statSync(join(dist, 'editors.css')).size).toBeGreaterThan(50_000);
    expect(readdirSync(join(dist, 'editors')).filter((f) => /^(map|templates-write|lang-fr)-/.test(f))).toHaveLength(3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
