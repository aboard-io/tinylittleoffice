/**
 * The build's budgets and its shape (Paul, 2026-10-12: "package the whole thing up … then offline is instant"):
 * what the built site weighs, in bytes gzipped at level 9, how many files it is, and how many requests a page makes
 * before its first paint, held to budgets.json. The budget is a tripwire against growth nobody meant, never a reason
 * to make code terse: growth that buys simplicity is raised into budgets.json, in a commit of its own whose message
 * says why (Paul, 2026-10-10).
 *
 *   app         the one app file, dist/assets/app-<hash>.js: the kit, every app's editor, commands and view, the English
 *               strings, the icon library, the emoji and the math (vite.config.ts)
 *   stylesheet  the one stylesheet beside it, dist/assets/app-<hash>.css
 *   templates   each app's templates, a file of its own (`templates-<app>-<hash>.js`), fetched when its list opens
 *   languages   each language but English, a file of its own (`lang-<code>-<hash>.js`), fetched when a page is in it
 *   api         /api.js, the API for programs and agents (vite.api.config.ts): what an import of it fetches before its
 *               first call, one file; apiParts the one file under /api/ it fetches for apps(), templates(), the lint
 *               and the examples
 *   fonts       the type, IBM Plex (dist/fonts/, from public/fonts/): every woff2 file's bytes together, as served (a
 *               woff2 is compressed already). Never all loaded at once: a page loads the faces its words need
 *   files       how many files dist/ holds, every one
 *   requests    the requests a page makes before its first paint, at most, over every page: the page itself and each
 *               file its head names to fetch at once (a script, the stylesheet, a preload)
 *
 * The shape is held too (`shapeOf`): dist/assets holds the app file, the stylesheet, a templates file per app and a
 * file per language and nothing else (the theme script is in the page: index.html); the app file imports nothing lazily but a templates file or a language; dist/api/
 * is one file, and no editor (no custom element, no Lit element) is in the API; every page names the app file and the
 * stylesheet in its head; the service worker's list is filled in.
 *
 *   node scripts/budgets.ts            dist/ against budgets.json and the shape: a line per fault, and exit 1 (`npm run build` runs it last)
 *   node scripts/budgets.ts --sizes    print what dist/ weighs, as budgets.json's numbers (to read, or to raise a budget by hand)
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { UNFILLED } from './sw-manifest.ts';
import { LIBRARY_APPS } from './ftl-plugin.ts';

export interface Sizes {
  app: number;
  stylesheet: number;
  templates: Record<string, number>;
  languages: Record<string, number>;
  api: number;
  apiParts: number;
  fonts: number;
  files: number;
  requests: number;
}

const ROOT = resolve(import.meta.dirname, '..');

/** A file's bytes gzipped at level 9. */
const gz = (bytes: Uint8Array) => gzipSync(bytes, { level: 9 }).length;

/** Every file under a folder, as paths relative to it, sorted. */
function filesIn(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(dir, p).replaceAll('\\', '/'));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

/** The bytes of every woff2 file in a folder (dist/fonts/, public/fonts/): the type, as served. */
export const fontBytes = (dir: string): number =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.woff2'))
        .reduce((n, f) => n + statSync(join(dir, f)).size, 0)
    : 0;

/** What a page's head names to fetch at once: each script's source, the stylesheet, each preload; in order, once each. */
export function fetchedAtOnce(html: string): string[] {
  const head = (/<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '').replace(/<!--[\s\S]*?-->/g, '');
  const out: string[] = [];
  for (const m of head.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>|<link\b(?=[^>]*\brel="(?:stylesheet|preload|modulepreload)")[^>]*\bhref="([^"]+)"[^>]*>/g)) out.push(m[1] ?? m[2]);
  return [...new Set(out)];
}

/** The pages of a build: the home page, each app's and the embed page (every index.html). */
export const pagesOf = (dist: string): string[] => filesIn(dist).filter((f) => /(^|\/)index\.html$/.test(f));

/**
 * The lazy imports in a chunk: the file each `import("./…")` names, and "?" for any other `import(` (a method of that
 * name, as mathjs's `.import(`, is not one).
 */
export function lazyImports(code: string): string[] {
  const all = [...code.matchAll(/(?<![\w$.])import\(/g)].length;
  const named = [...code.matchAll(/(?<![\w$.])import\(\s*["'`]\.\/([^"'`]+)["'`]\s*\)/g)].map((m) => m[1]);
  return [...named, ...Array<string>(all - named.length).fill('?')];
}

/** What a build in `dist` weighs and counts. */
export function measure(dist: string): Sizes {
  const assets = filesIn(join(dist, 'assets'));
  const weigh = (f: string) => gz(readFileSync(join(dist, f)));
  const one = (re: RegExp, what: string) => {
    const f = assets.find((x) => re.test(x));
    if (!f) throw new Error(`${dist}: no ${what} in assets/`);
    return weigh(`assets/${f}`);
  };
  const byName = (re: RegExp) => Object.fromEntries(assets.flatMap((f) => (re.test(f) ? [[re.exec(f)![1], weigh(`assets/${f}`)]] : [])));
  return {
    app: one(/^app-[\w-]{8}\.js$/, 'app file'),
    stylesheet: one(/^app-[\w-]{8}\.css$/, 'stylesheet'),
    templates: byName(/^templates-([a-z]+)-[\w-]{8}\.js$/),
    languages: byName(/^lang-(.+)-[\w-]{8}\.js$/),
    api: existsSync(join(dist, 'api.js')) ? weigh('api.js') : 0,
    apiParts: filesIn(join(dist, 'api')).reduce((n, f) => n + weigh(`api/${f}`), 0),
    fonts: fontBytes(join(dist, 'fonts')),
    files: filesIn(dist).length,
    requests: Math.max(0, ...pagesOf(dist).map((p) => 1 + fetchedAtOnce(readFileSync(join(dist, p), 'utf8')).length)),
  };
}

/**
 * The apps with templates and the languages but English, as the source in `root` has them: the files a build must hold.
 * The library's own apps (the Board) are not the site's, and the site holds nothing of theirs.
 */
function sourceFiles(root = ROOT): { apps: string[]; langs: string[] } {
  return {
    apps: readdirSync(join(root, 'src/apps')).filter((a) => existsSync(join(root, 'src/apps', a, 'templates.ts')) && !LIBRARY_APPS.includes(a)),
    langs: readdirSync(join(root, 'src/i18n'))
      .filter((f) => f.endsWith('.ftl') && f !== 'en.ftl')
      .map((f) => f.replace(/\.ftl$/, '')),
  };
}

/** Where the build's shape is not the one the design says, in words; [] when it is. `source` is what the build was made from. */
export function shapeOf(dist: string, { apps, langs } = sourceFiles()): string[] {
  const out: string[] = [];
  const assets = filesIn(join(dist, 'assets'));
  const wanted: [RegExp, string][] = [
    [/^app-[\w-]{8}\.js$/, 'the app file'],
    [/^app-[\w-]{8}\.css$/, 'the stylesheet'],
    ...apps.map((a): [RegExp, string] => [new RegExp(`^templates-${a}-[\\w-]{8}\\.js$`), `${a}’s templates`]),
    ...langs.map((l): [RegExp, string] => [new RegExp(`^lang-${l}-[\\w-]{8}\\.js$`), `the language ${l}`]),
    // The Trip Planner's map (MapLibre on OpenFreeMap, vite.config.ts MAP), fetched with the first map, and its worker.
    [/^map-[\w-]{8}\.js$/, 'the map'],
    [/^maplibre-gl-worker-[\w-]{8}\.js$/, 'the map’s worker'],
  ];
  for (const [re, what] of wanted) {
    const n = assets.filter((f) => re.test(f)).length;
    if (n !== 1) out.push(`assets/ holds ${n} files for ${what}, not one`);
  }
  for (const f of assets)
    if (!wanted.some(([re]) => re.test(f))) out.push(`assets/${f}: a file the design does not have (one app file, one stylesheet, the templates, the languages, the map and its worker)`);
  const app = assets.find((f) => /^app-[\w-]{8}\.js$/.test(f));
  const css = assets.find((f) => /^app-[\w-]{8}\.css$/.test(f));
  if (app)
    for (const f of lazyImports(readFileSync(join(dist, 'assets', app), 'utf8')))
      if (!/^(templates-[a-z]+|lang-[\w-]+|map)-[\w-]{8}\.js$/.test(f)) out.push(`assets/${app} imports ${f} lazily: only a templates file, a language or the map may be`);
  const api = filesIn(join(dist, 'api'));
  if (api.length > 1) out.push(`api/ holds ${api.length} files, not one`);
  for (const f of ['api.js', ...api.map((x) => `api/${x}`)].filter((x) => existsSync(join(dist, x))))
    if (/customElements\.define|LitElement/.test(readFileSync(join(dist, f), 'utf8')))
      out.push(`${f} holds an element of the page (customElements.define or LitElement): the API carries no editor and no chrome`);
  for (const page of pagesOf(dist)) {
    const named = fetchedAtOnce(readFileSync(join(dist, page), 'utf8')).map((u) => u.replace(/^(\.\.?\/)+/, ''));
    for (const f of [app, css]) if (f && !named.includes(`assets/${f}`)) out.push(`${page} does not name assets/${f} in its head`);
  }
  const sw = join(dist, 'sw.js');
  if (!existsSync(sw)) out.push('sw.js is missing: the service worker (src/sw.ts)');
  else if (readFileSync(sw, 'utf8').includes(UNFILLED)) out.push('sw.js still has its unfilled list (scripts/sw-manifest.ts)');
  return out;
}

/** Every number of `sizes` over its budget, or with no budget, in words: "app: 723123 bytes, over its budget of 716800 by 6323". */
export function overBudget(sizes: Sizes, budgets: Partial<Sizes>): string[] {
  const out: string[] = [];
  const walk = (have: unknown, want: unknown, at: string) => {
    const unit = at === 'files' || at === 'requests' ? at : 'bytes';
    if (typeof have === 'number') {
      if (typeof want !== 'number') out.push(`${at}: ${have} ${unit}, and no budget for it in budgets.json`);
      else if (have > want) out.push(`${at}: ${have} ${unit}, over its budget of ${want} by ${have - want}`);
    } else if (have && typeof have === 'object') for (const [k, v] of Object.entries(have)) walk(v, (want as Record<string, unknown> | undefined)?.[k], at ? `${at}.${k}` : k);
  };
  walk(sizes, budgets, '');
  return out;
}

/** budgets.json. */
export const readBudgets = (root = ROOT): Partial<Sizes> => JSON.parse(readFileSync(join(root, 'budgets.json'), 'utf8'));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = join(ROOT, 'dist');
  if (!existsSync(join(dist, 'assets'))) {
    console.error('No build in dist/: run npm run build.');
    process.exit(1);
  }
  const sizes = measure(dist);
  if (process.argv.includes('--sizes')) console.log(JSON.stringify(sizes, null, 2));
  else {
    const over = overBudget(sizes, readBudgets());
    const shape = shapeOf(dist);
    for (const line of [...over, ...shape]) console.error(line);
    if (over.length) console.error('The build grew past its budget (budgets.json). If the growth buys simplicity, raise the budget in a commit of its own that says why.');
    if (over.length || shape.length) process.exit(1);
    console.log(
      `The build is within its budgets and of its shape: the app file ${sizes.app} and the stylesheet ${sizes.stylesheet} bytes gzipped, ${sizes.files} files, at most ${sizes.requests} requests before a page's first paint.`,
    );
  }
}
