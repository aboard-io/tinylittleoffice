// The npm package `tinylittleoffice` (packages/doc) as an agent with a runtime gets it: built (npm run build:cli, and
// npm run build:lib for the library's entry points), packed, installed from the tarball into a folder of its own, and
// run there. Node strips no types under node_modules, so this is the test that the package carries what it runs. The
// editors are a page's, so only their files are looked for here; test/browser/editors.test.ts mounts one. A TypeScript
// program's check reads the declarations build:lib writes (tsconfig.lib.json), against the package as installed.
import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { domNames, importsOf } from './lints.ts';

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

test('the package serves the library: the kernel, the commands, the editors and their stylesheet, beside the API, each typed', () => {
  // Each module's declarations first, as TypeScript reads the conditions in order (tsconfig.lib.json emits them).
  expect(pkg.exports).toStrictEqual({
    '.': { types: './dist/types/api.d.ts', default: './dist/api.js' },
    './doc': { types: './dist/types/kernel.d.ts', default: './dist/doc.js' },
    './commands': { types: './dist/types/commands.d.ts', default: './dist/commands.js' },
    './editors': { types: './dist/types/editors.d.ts', default: './dist/editors.js' },
    './editors.css': './dist/editors.css',
    './examples/*.json': './examples/*.json',
    './package.json': './package.json',
  });
  expect(pkg.files).toEqual(expect.arrayContaining(['dist/doc.js', 'dist/commands.js', 'dist/editors.js', 'dist/editors.css', 'dist/editors', 'dist/types']));
  // The kernel and the commands have no side effects to keep; the editors define their elements and the stylesheet
  // styles the page.
  expect(pkg.sideEffects).not.toContain('./dist/doc.js');
  expect(pkg.sideEffects).not.toContain('./dist/commands.js');
  expect(pkg.sideEffects).toEqual(expect.arrayContaining(['./dist/editors.js', './dist/editors.css', './dist/editors/*']));
});

test('packed and installed elsewhere, `tinylittleoffice` lints an example, gives one, installs the skill, the API, kernel and commands import typed, editors are there', { timeout: 600_000 }, () => {
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
    // The commands, as a program serves them: one file that imports nothing and names no browser global
    // (vite.lib.config.ts answers what the registry's modules ask of a page "none"), a command declared, served as a
    // tool to the actor it names, its words in English with nothing set up, and documented.
    const commandsJs = readFileSync(join(app, 'node_modules/tinylittleoffice/dist/commands.js'), 'utf8');
    expect(importsOf(commandsJs)).toStrictEqual([]);
    expect(domNames(commandsJs)).toStrictEqual([]);
    const commands = [
      "import { command, register, registered, tools, docsOf } from 'tinylittleoffice/commands';",
      "const input = { type: 'object', properties: { company: { type: 'string' } } };",
      "register([command({ id: 'records.create', scope: 'records', label: 'bar-bold', where: ['keys-only'], input, who: ['team'], does: () => 1 })]);",
      "console.log(JSON.stringify([tools(registered(), 'team'), tools(registered(), 'guest'), docsOf(registered()).includes('- Scope: `records`')]));",
    ].join('\n');
    expect(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', commands], { cwd: app, encoding: 'utf8' }))).toStrictEqual([
      [{ name: 'records.create', description: 'Bold', inputSchema: { type: 'object', properties: { company: { type: 'string' } } } }],
      [],
      true,
    ]);
    // The types, as a TypeScript program that holds documents sees them: a consumer importing from every subpath checks
    // clean under strict, and a second file that misuses each fails, error by error, so the check is reading the
    // package's declarations rather than taking every name as any. skipLibCheck, as Atlas sets it: the declarations name
    // Lit's and Lucide's types, which ride bundled in editors.js and are not installed beside it, and those read as any.
    const tsconfig = (files: string[]) => ({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2022', 'DOM'], types: [], strict: true, skipLibCheck: true, noEmit: true },
      files,
    });
    writeFileSync(join(app, 'tsconfig.json'), JSON.stringify(tsconfig(['use.ts'])));
    writeFileSync(join(app, 'tsconfig.bad.json'), JSON.stringify(tsconfig(['use.ts', 'bad.ts'])));
    writeFileSync(
      join(app, 'use.ts'),
      [
        "import { link } from 'tinylittleoffice';",
        "import { apply, parse, write, type Doc, type Op } from 'tinylittleoffice/doc';",
        "import { command, register, tools, type Command } from 'tinylittleoffice/commands';",
        "import { mount, type Mounted } from 'tinylittleoffice/editors';",
        'interface Board { create(company: string): string }',
        "const doc: Doc = parse('# Plan\\n\\nShip it.\\n');",
        "const op: Op = { op: 'text', at: 1, from: 0, to: 4, runs: [{ t: 'Sail' }] };",
        'export const text: string = write(apply(doc, op));',
        "export const create: Command<Board> = command<Board>({ id: 'lead.create', scope: 'records', label: () => 'New lead', where: ['keys-only'], who: ['team'], does: (b) => b.create('Aboard') });",
        'register([create]);',
        "export const served: { name: string; description: string; inputSchema: object }[] = tools([create], 'team');",
        'export const place: (app: string, text: string, into: Element, onChange: (text: string) => void) => Promise<Mounted> = mount;',
        'export const share = async (into: Element, send: (ops: Op[], base: number) => void): Promise<HTMLElement> => {',
        "  const { editor, applyRemote } = await mount('write', text, into, () => {}, { onOps: send });",
        '  applyRemote([op]);',
        '  return editor;',
        '};',
        "export const url: string = link('write', text);",
      ].join('\n'),
    );
    writeFileSync(
      join(app, 'bad.ts'),
      [
        "import { write } from 'tinylittleoffice/doc';",
        "import { tools } from 'tinylittleoffice/commands';",
        "import { mount } from 'tinylittleoffice/editors';",
        "write('# Plan');",
        'tools([], 7);',
        "void mount('write', '', 'main', () => {});",
      ].join('\n'),
    );
    const tsc = (project: string) => {
      try {
        return execFileSync(join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', project], { cwd: app, encoding: 'utf8' });
      } catch (e) {
        return (e as { stdout: string }).stdout;
      }
    };
    expect(tsc('tsconfig.json')).toBe('');
    expect(
      tsc('tsconfig.bad.json')
        .trim()
        .split('\n')
        .map((l) => /^(\S+)\((\d+),\d+\): error (TS\d+)/.exec(l)?.slice(1).join(' ')),
    ).toStrictEqual(['bad.ts 4 TS2345', 'bad.ts 5 TS2345', 'bad.ts 6 TS2345']);
    // The editors and their stylesheet, whole (never run under Node), and the files fetched only when asked for beside them.
    const dist = join(app, 'node_modules/tinylittleoffice/dist');
    expect(statSync(join(dist, 'editors.js')).size).toBeGreaterThan(500_000);
    expect(statSync(join(dist, 'editors.css')).size).toBeGreaterThan(50_000);
    expect(readdirSync(join(dist, 'editors')).filter((f) => /^(map|templates-write|lang-fr)-/.test(f))).toHaveLength(3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
