// The npm package `tinylittleoffice` (packages/doc) as an agent with a runtime gets it: built (npm run build:cli, and
// npm run build:lib for the library's entry points), packed, installed from the tarball into a folder of its own, and
// run there. Node strips no types under node_modules, so this is the test that the package carries what it runs. The
// editors are a page's, so only their files are looked for here; test/browser/editors.test.ts mounts one. The kit, for
// an app built outside the suite, is the editors' file at run time, so here it resolves to that file and the file
// exports every name the kit's source does; test/browser/kit.test.ts builds an app with it. A TypeScript program's
// check reads the declarations build:lib writes (tsconfig.lib.json), against the package as installed.
import { test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { domNames, exportsOf, importsOf } from './lints.ts';

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
  // The code's license travels with it (npm packs a LICENSE whatever `files` says): the repository's, word for word.
  expect(readFileSync(join(PKG, 'LICENSE'), 'utf8')).toBe(readFileSync(join(ROOT, 'LICENSE'), 'utf8'));
});

test('the package serves the library: the kernel, the commands, the editors, their stylesheet and the kit, beside the API, each typed', () => {
  // Each module's declarations first, as TypeScript reads the conditions in order (tsconfig.lib.json emits them).
  expect(pkg.exports).toStrictEqual({
    '.': { types: './dist/types/api.d.ts', default: './dist/api.js' },
    './doc': { types: './dist/types/kernel.d.ts', default: './dist/doc.js' },
    './commands': { types: './dist/types/commands.d.ts', default: './dist/commands.js' },
    './editors': { types: './dist/types/editors.d.ts', default: './dist/editors.js' },
    // The kit is the editors' own file, typed by its own declarations: one Lit and one registry for an app built outside.
    './kit': { types: './dist/types/kit.d.ts', default: './dist/editors.js' },
    './editors.css': { types: './editors.css.d.ts', default: './dist/editors.css' },
    './examples/*.json': './examples/*.json',
    './package.json': './package.json',
  });
  expect(pkg.files).toEqual(expect.arrayContaining(['dist/doc.js', 'dist/commands.js', 'dist/editors.js', 'dist/editors.css', 'editors.css.d.ts', 'dist/editors', 'dist/fonts', 'dist/types']));
  // The kernel and the commands have no side effects to keep; the editors define their elements and the stylesheet
  // styles the page.
  expect(pkg.sideEffects).not.toContain('./dist/doc.js');
  expect(pkg.sideEffects).not.toContain('./dist/commands.js');
  expect(pkg.sideEffects).toEqual(expect.arrayContaining(['./dist/editors.js', './dist/editors.css', './dist/editors/*']));
});

test('packed and installed elsewhere, `tinylittleoffice` lints an example, gives one, installs the skill, the API, kernel and commands import typed, editors are there', { timeout: 180_000 }, () => {
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
    expect(readFileSync(join(app, 'node_modules/tinylittleoffice/LICENSE'), 'utf8')).toContain('MIT License');
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
    // Who did what, for a server as for a page: the kernel's file tracks two people's versions, says each change, and
    // makes the edit that rejects one, with nothing of the editors loaded: one file that imports nothing and names no
    // browser global, as the commands' (docs/library.md, Tracked changes and comments for a host).
    const docJs = readFileSync(join(app, 'node_modules/tinylittleoffice/dist/doc.js'), 'utf8');
    expect(importsOf(docJs)).toStrictEqual([]);
    expect(domNames(docJs)).toStrictEqual([]);
    const tracking = [
      "import { applyAll, changesOf, diffLines, parse, rejectOps, track, trackOn, write } from 'tinylittleoffice/doc';",
      "const versions = [{ author: 'a@x.co', text: 'Due in 30 days.\\n', hash: 'v0' }, { author: 'b@x.co', text: 'Due in 45 days, net.\\n', hash: 'v1' }];",
      'const tracked = track(versions);',
      "const typing = trackOn(tracked, { author: 'b@x.co', text: 'Due in 45 days, net 30.\\n', hash: 'v2' }, 2);",
      'const now = parse(versions[1].text);',
      "const back = write(applyAll(now, rejectOps(tracked, now.blocks, ['v1:0'])));",
      "console.log(JSON.stringify([changesOf(tracked).map((c) => [c.author, c.put, c.took]), changesOf(typing).length, back, diffLines(['a', 'b'], ['b']).map((c) => c.kind)]));",
    ].join('\n');
    expect(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', tracking], { cwd: app, encoding: 'utf8' }))).toStrictEqual([
      [
        ['b@x.co', '45', '30'],
        ['b@x.co', ', net', ''],
      ],
      2,
      'Due in 30 days, net.\n',
      ['-', ' '],
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
    // The README's mount, as a page would copy it, checked with the rest: it must take what mount returns.
    const shown = readFileSync(join(PKG, 'README.md'), 'utf8').match(/^const .+ = await mount\(.+$/m)?.[0];
    expect(shown).toBeDefined();
    // Lit's types, as an app built outside the suite has them: the kit's declarations name them (its DocElement is a
    // LitElement), and an app installs lit at the kit's version for its types alone, its run time importing Lit from the
    // kit (docs/library.md, An app built outside). Linked from this checkout, as an installed copy would be found.
    symlinkSync(join(ROOT, 'node_modules/lit'), join(app, 'node_modules/lit'), 'dir');
    writeFileSync(join(app, 'tsconfig.json'), JSON.stringify(tsconfig(['use.ts'])));
    writeFileSync(join(app, 'tsconfig.bad.json'), JSON.stringify(tsconfig(['use.ts', 'bad.ts'])));
    writeFileSync(
      join(app, 'use.ts'),
      [
        "import { link } from 'tinylittleoffice';",
        "import { apply, parse, write, type Doc, type Op } from 'tinylittleoffice/doc';",
        "import { command, register, tools, type Command } from 'tinylittleoffice/commands';",
        "import { mount, type Mounted } from 'tinylittleoffice/editors';",
        "import { DocElement, addStrings, defineApp, html, registerApp, t, type AppDef, type GhostAt, type SheetMark } from 'tinylittleoffice/kit';",
        "import { COLORS, changesOf, ghostsOf, paint, pinComments, rejectOps, track, wordsOf, type Change, type Drawing, type Ghost, type Mention, type Pinned, type Step } from 'tinylittleoffice/kit';",
        "import { rejectOps as rejectOn, track as trackOnServer, type Tracked } from 'tinylittleoffice/doc';",
        "import 'tinylittleoffice/editors.css';",
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
        'declare const main: Element;',
        'declare const save: (next: string) => void;',
        shown!,
        'export const drawn: HTMLElement = editor;',
        // An app built outside the suite, with the kit and the kernel alone.
        'class Tally extends DocElement<Doc> {',
        '  protected read(doc: Doc): Doc { return doc; }',
        "  render() { return html`<p>${t('tally-name')}</p>`; }",
        '}',
        "customElements.define('tally-editor', Tally);",
        "addStrings('en', 'tally-name = Tally\\n');",
        "export const tally: AppDef = defineApp({ id: 'tally', name: 'Tally', noun: 'tally', group: 'Plan', icon: [], blurb: 'Marks.', blank: () => '',",
        "  templates: async () => [], editor: async () => ({ tag: 'tally-editor' }), title: () => '', retitle: (doc) => doc, view: () => [{ w: 1, h: 1, svg: '' }] });",
        'registerApp(tally);',
        // Who did what, for a host whose documents several people write: versions by their authors, drawn over the words.
        "const versions: Step[] = [{ author: 'a@x.co', text: '# Plan\\n' }, { author: 'b@x.co', text: '# Plans\\n', hash: 'v1' }];",
        'export const changes: Change[] = changesOf(track(versions));',
        // The same tracking from the kernel's file, for a server: the kit's and the kernel's types are one.
        'export const tracked: Tracked[] = trackOnServer(versions);',
        "export const undo: Op[] | null = rejectOps(track(versions), parse(versions[1].text).blocks, ['v1:0']) ?? rejectOn(tracked, [], []);",
        "export const people: Mention[] = [{ name: 'Bea', detail: 'b@x.co' }];",
        // The edit the keys reach, as a host hears it; a host's marks on a read-only sheet.
        'export const opened = (e: CustomEvent<GhostAt>): string => `${e.detail.id} ${e.detail.block} ${e.detail.el?.title ?? ""}`;',
        "export const marked: SheetMark[] = [{ row: 0, text: '2', title: '2 comments' }, { row: 1, col: 2, text: '!' }];",
        "const drawing: Drawing = { color: () => COLORS[0], initials: () => 'B', name: () => 'Bea', accepted: () => false, takenOutBy: (n) => n, cardChanged: 'Changed', rejected: 'rejected', restored: 'restored' };",
        'export const redline = async (into: Element, frame: HTMLElement): Promise<Pinned[]> => {',
        "  const words = wordsOf((await mount('write', versions[1].text, into, () => {})).editor);",
        '  if (!words) return [];',
        '  const tracked = track(versions);',
        '  const ghosts: Map<number, Ghost[]> = ghostsOf(tracked, words.model, () => false, drawing);',
        '  await words.showGhosts((i) => ghosts.get(i) ?? []);',
        "  paint(words, tracked, ['a@x.co', 'b@x.co']);",
        '  words.mentions = people;',
        "  return pinComments(words, frame, [{ id: 'c1', quote: 'Plans' }]);",
        '};',
      ].join('\n'),
    );
    writeFileSync(
      join(app, 'bad.ts'),
      [
        "import { write } from 'tinylittleoffice/doc';",
        "import { tools } from 'tinylittleoffice/commands';",
        "import { mount } from 'tinylittleoffice/editors';",
        "import { registerApp, track } from 'tinylittleoffice/kit';",
        "import { rejectOps } from 'tinylittleoffice/doc';",
        "write('# Plan');",
        'tools([], 7);',
        "void mount('write', '', 'main', () => {});",
        "registerApp('tally');",
        "track('# Plan');",
        "rejectOps([], 'v1:0', []);",
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
    ).toStrictEqual(['bad.ts 6 TS2345', 'bad.ts 7 TS2345', 'bad.ts 8 TS2345', 'bad.ts 9 TS2345', 'bad.ts 10 TS2345', 'bad.ts 11 TS2345']);
    // The editors and their stylesheet, whole (never run under Node), and the files fetched only when asked for beside them.
    const dist = join(app, 'node_modules/tinylittleoffice/dist');
    // The kit is the editors' file: resolved there, and that file exports every value the kit's source does (its last
    // statement, `export{a as b,…}`, read as written, since it defines custom elements and never runs under Node).
    const resolved = (spec: string) => execFileSync(process.execPath, ['--input-type=module', '-e', `console.log(import.meta.resolve('${spec}'))`], { cwd: app, encoding: 'utf8' }).trim();
    expect(resolved('tinylittleoffice/kit')).toBe(resolved('tinylittleoffice/editors'));
    const served = new Set(
      /export\{([^}]*)\};?\s*$/
        .exec(readFileSync(join(dist, 'editors.js'), 'utf8'))![1]
        .split(',')
        .map((p) => p.split(' as ').pop()!.trim()),
    );
    const kit = exportsOf(readFileSync(join(ROOT, 'src/kit.ts'), 'utf8')).names.filter((n) => !n.type);
    expect(kit.length).toBeGreaterThan(50);
    expect(kit.map((n) => n.name).filter((n) => !served.has(n))).toStrictEqual([]);
    expect(statSync(join(dist, 'editors.js')).size).toBeGreaterThan(500_000);
    expect(statSync(join(dist, 'editors.css')).size).toBeGreaterThan(50_000);
    expect(readdirSync(join(dist, 'editors')).filter((f) => /^(map|templates-write|lang-fr)-/.test(f))).toHaveLength(3);
    // The faces ride beside the stylesheet, which names each of them there (./fonts/…) and none at the site's /fonts/,
    // with the license the OFL asks to travel with them.
    const faces = [...readFileSync(join(dist, 'editors.css'), 'utf8').matchAll(/url\(['"]?([^)'"]+\.woff2)/g)].map((m) => m[1]);
    expect(faces).toHaveLength(16);
    for (const face of faces) {
      expect(face).toMatch(/^\.\/fonts\/IBMPlex[\w-]+\.woff2$/);
      expect(statSync(join(dist, face)).size, face).toBe(statSync(join(ROOT, 'public', face)).size);
    }
    expect(readdirSync(join(dist, 'fonts')).sort()).toStrictEqual([...new Set(faces.map((f) => f.slice('./fonts/'.length))), 'LICENSE.txt'].sort());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
