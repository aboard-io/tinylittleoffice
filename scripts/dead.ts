/**
 * Nothing exported that nothing uses (Paul, 2026-10-11: "Do a dead code sweep … we have unused functions"). Every
 * `export` of src/, scripts/, packages/, tinier/, site/ and selfhost/ is named, as a whole word, in some other file of the tree, or it is
 * printed with its file and line and the script exits 1. A plain count of words by regex, no type-checker: tsc cannot
 * say an export is unused across files, and a dependency for one check is more than this file.
 *
 *   unused      no other file names it: delete it, or drop `export` when its own file uses it
 *   test-only   only tests name it, and its own file never does: it is dead, and its test goes with it
 *
 * An export only tests name that its own file uses is a helper tested on its own, and is printed (as "tested") but
 * passes. A re-export (`export { x } from`) counts only an import of that name from this file. `export default` (an
 * app's definition, the worker) is not counted. The exemptions are EXEMPT, each with why.
 *
 *   node scripts/dead.ts            the tree: a line per dead export, and exit 1 (`npm run lint` runs it)
 *   node scripts/dead.ts --tested   also the exports only tests use that their own files use too
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** Where exports are counted, and where a use counts (with the root's configuration files and page). */
const EXPORTERS = ['src', 'scripts', 'packages', 'tinier', 'site', 'selfhost'];
const USERS = ['src', 'test', 'e2e', 'scripts', 'packages', 'tinier', 'site', 'selfhost', 'dev', 'stories', '.storybook'];
const SKIP = /(^|\/)(node_modules|dist)\/|\.d\.ts$/;

/** The exports that need no other file, each with why. */
const EXEMPT: { why: string; test: (path: string, name: string, source: string) => boolean }[] = [
  { why: 'the API for programs and agents: its exports are the public surface (packages/doc/README.md)', test: (path) => path === 'src/api.ts' },
  {
    why: 'the library’s entry points, the kernel, the commands, the editors and the kit (docs/library.md): their exports are the public surface the package serves as tinylittleoffice/doc, tinylittleoffice/commands, tinylittleoffice/editors and tinylittleoffice/kit',
    test: (path) => path === 'src/kernel.ts' || path === 'src/commands.ts' || path === 'src/editors.ts' || path === 'src/kit.ts',
  },
  {
    why: 'a number or a string its own file uses: exported, the bundler writes the value where it is read (rolldown inlines an exported constant), where its own file’s alone stays a variable, and the chunk grows',
    test: (_p, name, source) => new RegExp(`^export const ${name} = (-?[\\d.]+|'[^'\\n]*'|"[^"\\n]*");`, 'm').test(source) && count(code(source), name) > 1,
  },
  { why: 'a custom element’s class: the page names it by its tag, not its class', test: (_p, name, source) => new RegExp(`customElements\\.define\\([^)]*\\b${name}\\)`).test(source) },
];

export interface Dead {
  path: string;
  line: number;
  name: string;
  kind: 'unused' | 'test-only' | 'tested';
}

const isTest = (path: string) => /^(test|e2e)\//.test(path) || path.includes('/tests/') || /\.test\.ts$/.test(path);
const escape = (s: string) => s.replace(/[$]/g, '\\$');
const count = (text: string, name: string) => text.match(new RegExp(`(?<![\\w$])${escape(name)}(?![\\w$])`, 'g'))?.length ?? 0;
const lineAt = (source: string, at: number) => source.slice(0, at).split('\n').length;
/** The code of a file without its block comments and its lines that are comments: a name its own file only mentions is not used. */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function files(root: string, dirs: string[], ext: RegExp): string[] {
  const top = readdirSync(root).filter((f) => /\.(ts|html)$/.test(f));
  return [...top, ...dirs.filter((d) => existsSync(join(root, d))).flatMap((d) => (readdirSync(join(root, d), { recursive: true }) as string[]).map((f) => `${d}/${f.replaceAll('\\', '/')}`))]
    .filter((p) => ext.test(p) && !SKIP.test(p))
    .sort();
}

/** The names a file exports: declarations, `export { a, b as c }` lists, and re-exports (with the module they come from). */
function exportsOf(source: string): { name: string; local: string; at: number; type: boolean; list?: boolean; from?: string }[] {
  const out: ReturnType<typeof exportsOf> = [];
  for (const m of source.matchAll(/^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(function\*?|const|let|var|class|type|interface|enum)\s+([\w$]+)/gm))
    out.push({ name: m[2], local: m[2], at: m.index, type: m[1] === 'type' || m[1] === 'interface' });
  for (const m of source.matchAll(/^export\s+(type\s+)?\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/gm))
    for (const part of m[2]
      .split(',')
      .map((s) => s.trim().replace(/^type\s+/, ''))
      .filter(Boolean)) {
      const [local, name = local] = part.split(/\s+as\s+/);
      // `import { x } from './y.ts'; export { x };` passes on what it imported: a re-export too.
      const imported = new RegExp(`import\\s+(?:type\\s+)?\\{[^}]*(?<![\\w$])${local.replace(/[$]/g, '\\$')}(?![\\w$])[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`).exec(source);
      out.push({ name, local, at: m.index, type: !!m[1], list: true, from: m[3] ?? imported?.[1] });
    }
  return out;
}

/** Whether `user` imports `name` from the module at `path` (a relative import that resolves to it). */
function imports(user: string, userSource: string, path: string, name: string): boolean {
  return [...userSource.matchAll(/(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)].some(
    (m) =>
      join(dirname(user), m[2]).replace(/\.js$/, '.ts') === path &&
      m[1].split(',').some(
        (p) =>
          p
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0] === name,
      ),
  );
}

/** Every dead export under `root`: unused and test-only always, tested too when `tested`. */
export function deadExports(root = ROOT, tested = false): Dead[] {
  const users = files(root, USERS, /\.(ts|mjs|js|html)$/).map((path) => {
    const source = readFileSync(join(root, path), 'utf8');
    return { path, source, words: new Set(source.match(/[\w$]+/g)) };
  });
  const out: Dead[] = [];
  for (const { path, source } of users) {
    if (!EXPORTERS.some((d) => path.startsWith(`${d}/`)) || isTest(path) || !path.endsWith('.ts')) continue;
    for (const e of exportsOf(source)) {
      if (EXEMPT.some((x) => x.test(path, e.name, source))) continue;
      const others = users.filter((u) => u.path !== path && (e.from ? imports(u.path, u.source, path, e.name) : u.words.has(e.name)));
      if (others.some((u) => !isTest(u.path))) continue;
      // Its own file uses it (beyond declaring it), or, for a re-export, the module it comes from is the one that does.
      const own = e.from ? true : count(code(source), e.local) > (e.list ? 2 : 1);
      if (!others.length && e.type && own && !e.from) continue; // a type its own file uses (in a parameter's type, say): not dead
      const kind = !others.length ? 'unused' : own ? 'tested' : 'test-only';
      if (kind !== 'tested' || tested) out.push({ path, line: lineAt(source, e.at), name: e.name, kind });
    }
  }
  return out;
}

if (import.meta.main) {
  const dead = deadExports(ROOT, process.argv.includes('--tested'));
  for (const d of dead) console.log(`${relative(process.cwd(), join(ROOT, d.path))}:${d.line}: ${d.name} (${d.kind})`);
  if (dead.some((d) => d.kind !== 'tested')) {
    console.error('Nothing outside its own file uses these exports: delete what nothing uses, drop `export` where only its own file does (scripts/dead.ts).');
    process.exit(1);
  }
}
