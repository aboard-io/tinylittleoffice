/**
 * docs/dependencies.md, written from package.json and the lockfile: every dependency at its exact version,
 * its licence (its own package.json in node_modules, else the lockfile's), the native web API it beat and
 * why (scripts/dependencies.json, one hand-written line each, required: a dependency without one fails the
 * script), and the bytes it adds to the site. Then what the runtime dependencies bring with them.
 *
 *   node scripts/dependencies.ts            write docs/dependencies.md, keeping the sizes it already holds
 *   node scripts/dependencies.ts --sizes    build the site first and measure what each package adds (slow)
 *   node scripts/dependencies.ts --check    write nothing; fail if docs/dependencies.md is not current
 *
 * A size is measured from the build itself: each JavaScript chunk's minified bytes, shared among the
 * modules in it by the length each module rendered, and summed by the package a module came from. The
 * sizes move with every change to the code, so the check leaves them be and holds everything else.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES as EMOJI_SOURCES } from './emoji.ts';
import { generate } from './generated.ts';

const root = resolve(import.meta.dirname, '..');
const DOC = resolve(root, 'docs/dependencies.md');

type Lock = { packages: Record<string, { version?: string; license?: string; dependencies?: Record<string, string>; dev?: boolean }> };
type Pkg = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

const json = <T>(path: string): T => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as T;

/** The lockfile's entry for a package as one at `from` would resolve it: nested first, then upward. */
function locate(lock: Lock, name: string, from = ''): string | null {
  let at = from;
  for (;;) {
    const key = `${at ? at + '/' : ''}node_modules/${name}`;
    if (lock.packages[key]) return key;
    if (!at) return null;
    const i = at.lastIndexOf('/node_modules/');
    at = i < 0 ? '' : at.slice(0, i);
  }
}

function licence(lock: Lock, key: string): string {
  const own = resolve(root, key, 'package.json');
  if (existsSync(own)) {
    const l = (JSON.parse(readFileSync(own, 'utf8')) as { license?: string | { type?: string } }).license;
    if (typeof l === 'string') return l;
    if (l?.type) return l.type;
  }
  return lock.packages[key]?.license ?? 'unstated';
}

/** The package a module of the build came from, by its path: the last node_modules segment. */
export function packageOf(id: string): string | null {
  const m = /.*\/node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(id.replaceAll('\\', '/'));
  return m ? m[1]! : null;
}

/** Bytes per package, from a build's chunks: each chunk's code shared among its modules by rendered length. */
export function measure(chunks: { code: string; modules: Record<string, { renderedLength: number }> }[]): Record<string, number> {
  const sizes: Record<string, number> = {};
  for (const chunk of chunks) {
    const bytes = Buffer.byteLength(chunk.code);
    const mods = Object.entries(chunk.modules);
    const total = mods.reduce((n, [, m]) => n + m.renderedLength, 0);
    if (!total) continue;
    for (const [id, m] of mods) {
      const name = packageOf(id);
      if (name) sizes[name] = (sizes[name] ?? 0) + (bytes * m.renderedLength) / total;
    }
  }
  return sizes;
}

/** The sizes docs/dependencies.md holds now, by package (the last column of each row). */
export function sizesIn(doc: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of doc.split('\n')) {
    const m = /^\| `([^`]+)` \|.*\| ([^|]+) \|$/.exec(line);
    if (m) out[m[1]!] = /\(its own: ([^)]+)\)/.exec(m[2]!)?.[1] ?? m[2]!.trim();
  }
  return out;
}

/** A size as the page writes it, back to bytes (near enough to add up). */
const bytesOf = (s: string | undefined) => {
  const m = /^([\d.]+) (B|KB)$/.exec(s ?? '');
  return m ? Number(m[1]) * (m[2] === 'KB' ? 1024 : 1) : 0;
};
const kb = (n: number) => (n < 1 ? 'none' : n < 1024 ? `${Math.round(n)} B` : `${(n / 1024).toFixed(1)} KB`);
const cell = (s: string) => s.replace(/\|/g, '\\|');

/** The page, from package.json, the lockfile, the reasons and the sizes. Throws when a dependency has no reason, or a reason no dependency. */
export function dependenciesDoc(sizes: Record<string, string> = existsSync(DOC) ? sizesIn(readFileSync(DOC, 'utf8')) : {}, unmeasured = 'not measured'): string {
  const pkg = json<Pkg>('package.json');
  const lock = json<Lock>('package-lock.json');
  const why = json<Record<string, string>>('scripts/dependencies.json');
  const runtime = Object.keys(pkg.dependencies ?? {}).sort();
  const dev = Object.keys(pkg.devDependencies ?? {}).sort();
  const missing = [...runtime, ...dev].filter((n) => !why[n]?.trim());
  if (missing.length) throw new Error(`scripts/dependencies.json has no line for ${missing.join(', ')}: name the native API each one beat, and why.`);
  const extra = Object.keys(why).filter((n) => !runtime.includes(n) && !dev.includes(n));
  if (extra.length) throw new Error(`scripts/dependencies.json names ${extra.join(', ')}, which package.json does not: take the line out.`);

  const entry = (name: string) => {
    const key = locate(lock, name);
    if (!key) throw new Error(`${name} is not in package-lock.json: run npm install.`);
    return { key, version: lock.packages[key]!.version ?? '?', licence: licence(lock, key) };
  };
  const row = (name: string, adds: string) => {
    const e = entry(name);
    return `| \`${name}\` | ${e.version} | ${e.licence} | ${cell(why[name]!)} | ${adds} |`;
  };

  // What the runtime dependencies bring with them, walked through the lockfile.
  const brought = new Map<string, { key: string; by: Set<string> }>();
  const walk = (key: string, top: string) => {
    for (const dep of Object.keys(lock.packages[key]?.dependencies ?? {})) {
      const k = locate(lock, dep, key);
      if (!k || runtime.includes(dep)) continue;
      const seen = brought.get(k);
      if (seen) {
        seen.by.add(top);
        continue;
      }
      brought.set(k, { key: k, by: new Set([top]) });
      walk(k, top);
    }
  };
  for (const name of runtime) walk(entry(name).key, name);
  const nameOf = (key: string) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const inner = [...brought.values()]
    .sort((a, b) => nameOf(a.key).localeCompare(nameOf(b.key)))
    .map(({ key, by }) => {
      const name = nameOf(key);
      return `| \`${name}\` | ${lock.packages[key]!.version} | ${licence(lock, key)} | ${[...by]
        .sort()
        .map((b) => `\`${b}\``)
        .join(', ')} | ${sizes[name] ?? unmeasured} |`;
    });
  /** A runtime dependency's bytes with what it brings, and its own where those differ. */
  const adds = (name: string) => {
    const own = sizes[name];
    if (own === undefined) return unmeasured;
    const withIt = [...brought.values()].filter((b) => b.by.has(name)).reduce((n, b) => n + bytesOf(sizes[nameOf(b.key)]), bytesOf(own));
    const total = kb(withIt);
    return total === own ? own : `${total} (its own: ${own})`;
  };
  const devAll = Object.entries(lock.packages).filter(([k, p]) => k && p.dev).length;

  return `# Dependencies

Every package Tiny Little Office depends on, at the exact version the lockfile holds, with its licence, the
native web API it beat and why, and what it adds to the site. The standing rule (docs/rebuild.md): the
browser first; a dependency names what it beat. This page is written by \`npm run docs:deps\`
(\`scripts/dependencies.ts\`) from package.json, package-lock.json and the reasons in
\`scripts/dependencies.json\`; a test fails when it is out of date, and the script fails for a dependency
with no reason.

"Adds" is the minified JavaScript the build carries for that package and what it brings, in all its chunks
(its own share in brackets where the two differ); most of it loads only with the app that uses it (the map with the Trip Planner, mathjs with the Calculator). It is measured by
\`npm run docs:deps -- --sizes\`, which builds the site, and moves a little with every build. Nothing is
vendored: every byte comes from npm through the committed lockfile.

## Built into the site

| Package | Version | Licence | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
${runtime.map((n) => row(n, adds(n))).join('\n')}

## What those bring with them

| Package | Version | Licence | Comes with | Adds |
| --- | --- | --- | --- | --- |
${inner.join('\n')}

## Data, not packages

The icon picker's Emoji set (\`src/kit/emoji-data.ts\`: every base emoji's character, name, keywords and
group) is data, not code: the browser lists no emoji by name, and the characters themselves are drawn by the
system's own font. It is written by \`npm run emoji\` (\`scripts/emoji.ts\`) from Unicode's
[emoji-test.txt](${EMOJI_SOURCES.test}) (which emoji are fully qualified, and their groups) and CLDR's English
[annotations](${EMOJI_SOURCES.annotations}) and [derived annotations](${EMOJI_SOURCES.derived}) (names and
keywords), at those pinned versions, under the Unicode licence (Unicode-3.0), and checked in. It loads only with
the picker; neither source is a dependency.

## For building and testing

None of these reaches the site; they build it, check it and deploy it. With what they bring, the lockfile
holds ${devAll} packages for development.

| Package | Version | Licence | The native API it beat, and why | Adds |
| --- | --- | --- | --- | --- |
${dev.map((n) => row(n, 'not shipped')).join('\n')}
`;
}

/** Build the site (vite.config.ts, as npm run build does) and measure each package's bytes. */
async function build(): Promise<Record<string, string>> {
  const { build: vite } = await import('vite');
  const chunks: { code: string; modules: Record<string, { renderedLength: number }> }[] = [];
  await vite({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'warn',
    plugins: [
      {
        name: 'tinyoffice-measure',
        generateBundle(_options, bundle) {
          for (const out of Object.values(bundle)) if (out.type === 'chunk') chunks.push({ code: out.code, modules: out.modules });
        },
      },
    ],
  });
  return Object.fromEntries(Object.entries(measure(chunks)).map(([k, v]) => [k, kb(v)]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) generate({ 'docs/dependencies.md': dependenciesDoc() }, 'npm run docs:deps');
  else {
    // Measured, a package the build holds none of adds none; otherwise the sizes the page holds are kept.
    writeFileSync(DOC, args.includes('--sizes') ? dependenciesDoc(await build(), 'none') : dependenciesDoc());
    console.log('Wrote docs/dependencies.md.');
  }
}
