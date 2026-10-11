/**
 * The chunk budgets (directive r9-lints): what the built site's chunks weigh, in bytes gzipped at level 9, held
 * to budgets.json. The budget is a tripwire against growth nobody meant, never a reason to make code terse: growth
 * that buys simplicity is raised into budgets.json, in a commit of its own whose message says why (Paul, 2026-10-10).
 *
 *   main       the entry chunk the home page runs
 *   apps       the apps' definitions, which the home page imports: light, their templates not in it
 *   home       everything the home page loads before anything is tapped: the entry, its preloads, its stylesheet
 *   icons      the kit's icons, on the home page; iconsFull the whole set, loaded when the icon picker opens
 *   templates  each app's templates, a chunk of their own (`templates-<app>`), loaded when its list opens or a
 *              pointer comes over its row; the home page's first load holds none (`eagerTemplates`, which fails the build)
 *   languages  each language's strings, loaded when chosen (English is the keys themselves and ships in the code)
 *   editors    each app's editor chunk and its commands chunk, loaded when it opens, and `open`: all that opening
 *              it adds to the home page's load (the chunks and stylesheets the two imports preload, less home's)
 *
 * The chunks are found by name: vite.config.ts names an app's editor `<app>-editor-<hash>.js`, its commands
 * `<app>-commands-<hash>.js`, its templates `templates-<app>-<hash>.js` and a language `lang-<code>-<hash>.js`, and what an import preloads is the list Vite
 * writes beside it (`__vite__mapDeps`).
 *
 *   node scripts/budgets.ts            dist/ against budgets.json: a line per chunk over, and exit 1 (`npm run build` runs it last)
 *   node scripts/budgets.ts --sizes    print what dist/ weighs, as budgets.json's numbers (to read, or to raise a budget by hand)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export interface Sizes {
  main: number;
  apps: number;
  home: number;
  icons: number;
  iconsFull: number;
  templates: Record<string, number>;
  languages: Record<string, number>;
  editors: Record<string, { editor: number; commands: number; open: number }>;
}

const ROOT = resolve(import.meta.dirname, '..');

/** A file's bytes gzipped at level 9. */
const gz = (bytes: Uint8Array) => gzipSync(bytes, { level: 9 }).length;

/** The chunk of `assets/` named `name` and a hash, or undefined. */
const named = (files: string[], name: string) => files.find((f) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[\\w-]{8}\\.js$`).test(f));

/** What each lazy import in a chunk preloads, the imported chunk first: `import("./x.js"),__vite__mapDeps([0,3])` read against the chunk's list of files. */
export function preloads(code: string): Map<string, string[]> {
  const list = /m\.f=\[([^\]]*)\]/.exec(code)?.[1];
  const files = list ? [...list.matchAll(/["'`]\.\/([^"'`]+)["'`]/g)].map((m) => m[1]) : [];
  const out = new Map<string, string[]>();
  for (const m of code.matchAll(/import\(\s*["'`]\.\/([^"'`]+)["'`]\s*\)(?:\s*,\s*__vite__mapDeps\(\[([\d,\s]*)\]\))?/g)) {
    const deps = m[2]
      ? m[2]
          .split(',')
          .filter((s) => s.trim())
          .map((i) => files[Number(i)])
      : [m[1]];
    out.set(m[1], [...new Set([m[1], ...deps])]);
  }
  return out;
}

/** The files of the home page's first load: what its page names (the entry, its preloads, its stylesheet). */
export function firstLoad(dist: string): Set<string> {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  return new Set([...html.matchAll(/(?:src|href)="\.\/assets\/([^"]+)"/g)].map((m) => m[1]));
}

/** The templates chunks among these files: none may be in the home page's first load. */
export const eagerTemplates = (files: Iterable<string>): string[] => [...files].filter((f) => /^templates-[a-z]+-[\w-]{8}\.js$/.test(f));

/** What a build in `dist` weighs. */
export function measure(dist: string): Sizes {
  const assets = join(dist, 'assets');
  const files = readdirSync(assets).sort();
  const size = new Map<string, number>();
  const weigh = (f: string) => size.get(f) ?? size.set(f, gz(readFileSync(join(assets, f)))).get(f)!;
  const must = (name: string) => {
    const f = named(files, name);
    if (!f) throw new Error(`${dist}: no chunk named ${name} in assets/`);
    return f;
  };
  const home = firstLoad(dist);
  const lazy = new Map<string, string[]>();
  for (const f of files.filter((x) => x.endsWith('.js'))) for (const [k, v] of preloads(readFileSync(join(assets, f), 'utf8'))) lazy.set(k, [...new Set([...(lazy.get(k) ?? []), ...v])]);
  const sum = (fs: Iterable<string>) => [...fs].reduce((n, f) => n + weigh(f), 0);
  const ids = [...new Set(files.map((f) => /^([a-z]+)-editor-[\w-]{8}\.js$/.exec(f)?.[1]).filter((x): x is string => !!x))];
  return {
    main: weigh(must('main')),
    apps: weigh(must('apps')),
    home: sum(home),
    icons: weigh(must('icons')),
    iconsFull: weigh(must('icons-full')),
    templates: Object.fromEntries(files.flatMap((f) => (/^templates-([a-z]+)-[\w-]{8}\.js$/.exec(f) ? [[/^templates-([a-z]+)-[\w-]{8}\.js$/.exec(f)![1], weigh(f)]] : []))),
    languages: Object.fromEntries(files.flatMap((f) => (/^lang-(.+)-[\w-]{8}\.js$/.exec(f) ? [[/^lang-(.+)-[\w-]{8}\.js$/.exec(f)![1], weigh(f)]] : []))),
    editors: Object.fromEntries(
      ids.map((id) => {
        const [editor, commands] = [must(`${id}-editor`), must(`${id}-commands`)];
        const opened = new Set([...(lazy.get(editor) ?? [editor]), ...(lazy.get(commands) ?? [commands])].filter((f) => !home.has(f)));
        return [id, { editor: weigh(editor), commands: weigh(commands), open: sum(opened) }];
      }),
    ),
  };
}

/** Every number of `sizes` over its budget, or with no budget, in words: "editors.write.open: 45 123 bytes, over its budget of 44 000 by 1 123". */
export function overBudget(sizes: Sizes, budgets: Partial<Sizes>): string[] {
  const out: string[] = [];
  const walk = (have: unknown, want: unknown, at: string) => {
    if (typeof have === 'number') {
      if (typeof want !== 'number') out.push(`${at}: ${have} bytes, and no budget for it in budgets.json`);
      else if (have > want) out.push(`${at}: ${have} bytes, over its budget of ${want} by ${have - want}`);
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
    for (const f of eagerTemplates(firstLoad(dist))) over.push(`${f}: an app's templates in the home page's first load (they are a chunk loaded when asked for)`);
    for (const line of over) console.error(line);
    if (over.length) {
      console.error('A chunk grew past its budget (budgets.json). If the growth buys simplicity, raise the budget in a commit of its own that says why.');
      process.exit(1);
    }
    console.log(`The chunks are within their budgets: main ${sizes.main}, apps ${sizes.apps}, home ${sizes.home} bytes gzipped.`);
  }
}
