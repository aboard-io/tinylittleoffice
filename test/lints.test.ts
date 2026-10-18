// The rules of the code, held by code. Each lint reads the tree, and the tiny bad file of
// test/fixtures/lints that it must catch, so a lint that stops working is seen. A failure names the file, the line
// and what broke the rule, so the next builder can act on it without reading the lint. `npm run lint` runs these
// (with the stylesheet and window-scrolling lints), and `npm run build` runs that first.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { fetchedAtOnce, lazyImports, measure, overBudget, readBudgets, shapeOf, type Sizes } from '../scripts/budgets.ts';
import { deadExports } from '../scripts/dead.ts';
import { staleFiles } from '../scripts/generated.ts';
import { ADDRESS_NAMES, ALLOWED, KIT_FOLDERS, NOT_WORDS, WAIT_MS, bareWords, domNames, edgesOf, elementsOf, graphProblems, kitProblems, storiedOf, timedWaits, type Module } from './lints.ts';

const ROOT = join(import.meta.dirname, '..');
const FIXTURES = join(import.meta.dirname, 'fixtures/lints');

/** The modules under `dir` of `root` (forward-slash paths from root), tests left out. */
function modules(root: string, dir = 'src'): Module[] {
  return (readdirSync(join(root, dir), { recursive: true }) as string[])
    .map((f) => `${dir}/${f.replaceAll('\\', '/')}`)
    .filter((p) => p.endsWith('.ts') && !p.includes('/tests/'))
    .sort()
    .map((path) => ({ path, source: readFileSync(join(root, path), 'utf8') }));
}
const tree = modules(ROOT);

describe('bare words: every word a person reads in an html`` or svg`` template goes through t()', () => {
  const found = (mods: Module[]) => mods.filter((m) => !m.path.startsWith('src/i18n/')).flatMap((m) => bareWords(m.source).map((b) => `${m.path}:${b.line}: ${b.words}`));
  test('the fixture’s are found', () => {
    expect(found([{ path: 'bare-words.ts', source: readFileSync(join(FIXTURES, 'bare-words.ts'), 'utf8') }])).toStrictEqual(['bare-words.ts:4: Close the panel', 'bare-words.ts:4: Save all']);
  });
  test('the templates of src/ hold none (put each through t(), and npm run i18n:extract)', () => {
    expect(found(tree)).toStrictEqual([]);
  });
  test('the allowlist and the non-words are each still needed, so the lists only shrink', () => {
    const all = tree.flatMap((m) => ([...m.source.matchAll(/html`|svg`/g)].length ? [m.source] : [])).join('\n');
    expect(Object.keys(ALLOWED).filter((p) => !all.includes(p))).toStrictEqual([]);
    expect([...NOT_WORDS].filter((w) => !new RegExp(`>${w}<|"${w}"`).test(all))).toStrictEqual([]);
  });
});

/**
 * The modules of one app that another app imports today, each with what it is to the other. The rule is that an app
 * imports no other app: what two apps share belongs in the kit or the kernel. These are the shares that predate the
 * lint; a new one fails, and one no longer imported fails until it is taken off, so the list only shrinks.
 */
export const SHARED: Record<string, string> = {
  'src/apps/draw/model.ts': 'the shapes and their reading and writing: Animation’s frames and Diagram’s boxes are Draw’s shapes',
  'src/apps/draw/view.ts': 'a shape drawn as SVG, the same in Draw, Animation and Diagram',
  'src/apps/draw/editor.ts': 'Draw’s editor, which is Animation’s Draw mode (<to-draw-editor> inside it)',
  'src/apps/cal/model.ts': 'a calendar’s item block, made by the Spreadsheet’s and the Trip Planner’s “Open as calendar”',
  'src/apps/sheet/model.ts': 'the table block’s columns and cells, which the Word Processor’s tables edit',
  'src/apps/sheet/view.ts': 'a table drawn as a page, which the Word Processor draws its tables with',
  'src/apps/outline/model.ts': 'a list made from lines, which the Word Processor’s “Open as outline” makes',
};

describe('the module graph: no cycle, and each layer imports only what is under it', () => {
  test('the fixture’s problems are found', () => {
    expect(graphProblems(modules(join(FIXTURES, 'graph')))).toStrictEqual([
      'an app imports another app: src/apps/a/editor.ts → src/apps/b/model.ts',
      'the kernel imports the kit or an app: src/doc/model.ts → src/kit/two.ts',
      'the kit imports an app outside kit/core/apps.ts: src/kit/one.ts → src/apps/a/editor.ts',
      'a language is imported outside kit/core/i18n.ts’s lazy load: src/kit/one.ts → src/i18n/fr.ts',
      'an import cycle: src/kit/one.ts → src/kit/two.ts → src/kit/one.ts',
    ]);
  });
  test('src/ has none', () => {
    expect(graphProblems(tree, SHARED)).toStrictEqual([]);
  });
  test('every module shared between apps is still shared, so the list only shrinks', () => {
    const imported = new Set(graphProblems(tree).flatMap((p) => /^an app imports another app: \S+ → (\S+)$/.exec(p)?.[1] ?? []));
    expect(Object.keys(SHARED).filter((m) => !imported.has(m))).toStrictEqual([]);
  });
});

describe('the kit in its six folders (docs/kernel.md §11): nothing at its root, no barrel, every import naming its file', () => {
  test('the fixture’s problems are found', () => {
    const fixture: Module[] = [
      { path: 'src/kit/stray.ts', source: '' },
      { path: 'src/kit/core/index.ts', source: "export * from './app.ts';" },
      { path: 'src/kit/core/app.ts', source: '' },
      {
        path: 'src/apps/a/editor.ts',
        source: "import { a } from '../../kit/core/app.ts';\nimport { b } from '../../kit/draw.ts';\nimport { c } from '../../kit/misc/c.ts';\nimport { d } from '../../kit/core';",
      },
      // A document kept in a kit folder and imported as text is named by its file too; one at the kit's root is not.
      { path: 'src/kit/ui/manual.ts', source: "import raw from './manual.tlo?raw';\nimport stray from '../stray.tlo?raw';" },
    ];
    expect(kitProblems(fixture)).toStrictEqual([
      "a file at the kit's root, in none of its folders: src/kit/stray.ts",
      'a barrel in the kit: src/kit/core/index.ts',
      'an import of the kit names no file in its six folders: src/apps/a/editor.ts → src/kit/draw.ts',
      'an import of the kit names no file in its six folders: src/apps/a/editor.ts → src/kit/misc/c.ts',
      'an import of the kit names no file in its six folders: src/apps/a/editor.ts → src/kit/core',
      'an import of the kit names no file in its six folders: src/kit/ui/manual.ts → src/kit/stray.tlo?raw',
    ]);
  });
  test('src/ and what reads it (test, scripts, packages, e2e, dev) have none, and the kit holds the six folders and nothing beside them', () => {
    const readers = ['test', 'scripts', 'packages', 'e2e', 'dev'].flatMap((d) => modules(ROOT, d)).filter((m) => !m.path.startsWith('test/fixtures/'));
    expect(kitProblems([...tree, ...readers])).toStrictEqual([]);
    expect(readdirSync(join(ROOT, 'src/kit')).sort()).toStrictEqual([...KIT_FOLDERS].sort());
  });
});

describe('no DOM in the model: the kernel (src/doc) never names window, document, navigator or localStorage', () => {
  const found = (mods: Module[]) => mods.filter((m) => m.path.startsWith('src/doc/')).flatMap((m) => domNames(m.source).map((d) => `${m.path}:${d.line}: ${d.words}`));
  test('the fixture’s is found', () => {
    expect(found(modules(join(FIXTURES, 'graph')))).toStrictEqual(['src/doc/model.ts:3: window']);
  });
  test('src/doc names none', () => {
    expect(found(tree)).toStrictEqual([]);
  });
});

/**
 * The browser globals the commands entry's modules ask for, each only behind a `typeof` test of it, by file and name,
 * with what it is. The library's build of the entry (vite.lib.config.ts, --mode commands) answers each "none", so
 * commands.js names none (test/package.test.ts). A new one fails, and one no longer named fails until it is taken off.
 */
const COMMANDS_ASK: Record<string, string> = {
  'src/kit/core/commands.ts: navigator': 'MAC, whether keys are spelled a Mac’s way: a program spells them as on Windows',
  'src/kit/core/i18n.ts: document': 'the page’s root taking the language chosen, which a program never chooses',
  'src/kit/core/i18n.ts: navigator': 'the browser’s languages, the default of browserLanguage, which a program never calls',
};

describe('no DOM in the commands entry: src/commands.ts and what it imports name a browser global only where they ask whether there is one', () => {
  /** The modules an entry runs: itself and every module of `mods` it imports, not as a type and not lazily, on down. */
  const closure = (mods: Module[], entry: string): Module[] => {
    const byPath = new Map(mods.map((m) => [m.path, m]));
    const seen = new Set<string>();
    const walk = (path: string) => {
      const m = byPath.get(path);
      if (!m || seen.has(path)) return;
      seen.add(path);
      for (const e of edgesOf(m)) if (!e.type && !e.lazy) walk(e.to);
    };
    walk(entry);
    return mods.filter((m) => seen.has(m.path));
  };
  const asked = (mods: Module[]) => [...new Set(mods.flatMap((m) => domNames(m.source).map((d) => `${m.path}: ${d.words}`)))].sort();
  test('the closure is followed through value imports, and a name is found', () => {
    const mods: Module[] = [
      { path: 'src/e.ts', source: "export { a } from './a.ts';\nimport type { T } from './t.ts';\nconst l = () => import('./l.ts');" },
      { path: 'src/a.ts', source: "import { b } from './b.ts';\nexport const a = b;" },
      { path: 'src/b.ts', source: 'export const b = typeof navigator;\nexport interface B { document?: boolean }' },
      { path: 'src/t.ts', source: 'export type T = typeof window;' },
      { path: 'src/l.ts', source: 'export const l = document;' },
    ];
    expect(asked(closure(mods, 'src/e.ts'))).toStrictEqual(['src/b.ts: navigator']);
  });
  test('its modules name only the globals listed, each behind a typeof test of it', () => {
    const mods = closure(tree, 'src/commands.ts');
    expect(mods.map((m) => m.path)).toContain('src/kit/core/commands.ts');
    expect(asked(mods)).toStrictEqual(Object.keys(COMMANDS_ASK).sort());
    for (const key of Object.keys(COMMANDS_ASK)) {
      const [path, name] = key.split(': ');
      expect(mods.find((m) => m.path === path)!.source, key).toMatch(new RegExp(`typeof ${name}\\b`));
    }
  });
});

describe('the address is the host’s: an app never names location or history (kit/core/host.ts, docs/library.md)', () => {
  const found = (mods: Module[]) =>
    mods.filter((m) => m.path.startsWith('src/apps/') && !m.path.includes('/tests/')).flatMap((m) => domNames(m.source, ADDRESS_NAMES).map((d) => `${m.path}:${d.line}: ${d.words}`));
  test('the fixture’s are found, and a property or a key is not', () => {
    const source = 'const a = location.href;\nhistory.back();\nconst b = x.location;\nconst c = { location: 1 };\n';
    expect(found([{ path: 'src/apps/x/editor.ts', source }])).toStrictEqual(['src/apps/x/editor.ts:1: location', 'src/apps/x/editor.ts:2: history']);
  });
  test('src/apps names neither', () => {
    expect(found(tree)).toStrictEqual([]);
  });
});

/** Every test that runs in a browser: test/browser, the apps' own (src/apps/<id>/tests) and the Playwright specs (e2e). */
const browserTests: Module[] = ['test/browser', 'src', 'e2e'].flatMap((dir) =>
  (readdirSync(join(ROOT, dir), { recursive: true }) as string[])
    .map((f) => `${dir}/${f.replaceAll('\\', '/')}`)
    .filter((p) => p.endsWith('.ts') && (dir !== 'src' || p.includes('/tests/')))
    .sort()
    .map((path) => ({ path, source: readFileSync(join(ROOT, path), 'utf8') })),
);

/**
 * The timed waits that model a real delay, each with why it is a time and not a condition: the file, the line as
 * written (trimmed), how many such lines the file has, and the reason. Most say that nothing must happen: an absence has
 * no moment to wait for, so the test gives what would come a while to come and sees that it did not. The rest are times
 * the product keeps (a toast's, the gap that makes two taps one) or a delay a fake device answers after.
 */
export const TIMED: { file: string; wait: string; n: number; why: string }[] = [
  {
    file: 'test/browser/chrome.test.ts',
    wait: 'await tick(100);',
    n: 1,
    why: 'the header must stay with the focus in the words: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  { file: 'test/browser/commands-keys.test.ts', wait: 'await tick(60);', n: 1, why: 'a key pressed may run a command or none: what ran is collected for a while, since none has no moment' },
  {
    file: 'test/browser/complete.test.ts',
    wait: 'await tick(80);',
    n: 1,
    why: '"10:30" must open no list: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/download.test.ts',
    wait: 'await new Promise((r) => setTimeout(r, 300));',
    n: 1,
    why: 'a link with no such format must download nothing and say nothing: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/languages.test.ts',
    wait: 'await tick(100);',
    n: 1,
    why: 'a language whose dictionary is on its way must draw nothing: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  { file: 'test/browser/motion.test.ts', wait: 'await tick(300);', n: 1, why: 'a paused animation must not move: its clock is read, time passes, and it is read again' },
  { file: 'test/browser/motion.test.ts', wait: 'await tick(200);', n: 1, why: 'a paused animation must not move: its clock is read, time passes, and it is read again' },
  {
    file: 'test/browser/pinch.test.ts',
    wait: 'await tick(400);',
    n: 2,
    why: 'the slideshow tells a tap from two by the time between them (a real gap), and a swipe must turn no slide: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/shell.test.ts',
    wait: 'await tick(1000);',
    n: 2,
    why: 'under Private, and before anything is typed under Saved, nothing may be kept: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/shell.test.ts',
    wait: 'await tick(100);',
    n: 1,
    why: 'display mode must focus nothing: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/text-whole.test.ts',
    wait: 'await tick(300);',
    n: 1,
    why: 'an arrow key must not scroll the column back: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  { file: 'test/browser/toast.test.ts', wait: 'await new Promise((r) => setTimeout(r, 5000));', n: 1, why: 'a long toast stays its own time, longer than a short one: the time is the behaviour' },
  { file: 'test/browser/toast.test.ts', wait: 'await new Promise((r) => setTimeout(r, 2800));', n: 1, why: 'a pointer on a toast holds it past its time: the time is the behaviour' },
  {
    file: 'test/browser/trip.test.ts',
    wait: 'await tick(60);',
    n: 2,
    why: 'the device must not be asked where it is, and a trip with stops must not move to it: the fake device answers in 10ms, given a while',
  },
  {
    file: 'test/browser/walks.test.ts',
    wait: 'if (out instanceof Promise) await Promise.race([out.catch((e) => r.errors.push(`${s.id}: ${(e as Error)?.message ?? e}`)), tick(60)]);',
    n: 1,
    why: 'a cap on a step that may never settle (a dialog left open), raced against it: not a wait for anything',
  },
  {
    file: 'test/browser/webm.test.ts',
    wait: 'await new Promise((r) => setTimeout(r, 200));',
    n: 1,
    why: 'a browser that answers no to WebM must still offer the GIF: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'src/apps/draw/tests/editor.test.ts',
    wait: 'await tick(300);',
    n: 2,
    why: 'a paste the browser’s event did must not be done again by the hand after its own wait (CLIP_WAIT): nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'src/apps/trip/tests/editor.test.ts',
    wait: 'await tick(450);',
    n: 1,
    why: 'a double tap zooms and adds no stop: past the gap that makes two taps one, nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'src/apps/trip/tests/editor.test.ts',
    wait: 'await tick(80);',
    n: 1,
    why: 'a trip with stops must not ask the device where it is: nothing must happen: an absence has no moment to wait for, so what would come is given a while to come',
  },
  {
    file: 'test/browser/home.test.ts',
    wait: 'await tick(600);',
    n: 1,
    why: 'a press at the spot the templates list opened under is no choice for half a second after the last such press (kit/ui/menu.ts OpeningPress): the time is the behaviour, past it the press chooses',
  },
  { file: 'e2e/anim.spec.ts', wait: 'await page.waitForTimeout(500);', n: 1, why: 'two taps on a shape open its words only when they come within the gap: the tap before is let go past it first' },
  { file: 'e2e/outline-phone.spec.ts', wait: 'await page.waitForTimeout(100);', n: 1, why: 'the phone keyboard modelled going down late (kbLate): the delay is the device being modelled' },
  { file: 'e2e/outline-phone.spec.ts', wait: 'await page.waitForTimeout(400);', n: 1, why: 'the phone keyboard modelled arriving late (kbLate = 400): the delay is the device being modelled' },
  {
    file: 'e2e/thumbs-phone.spec.ts',
    wait: 'await page.waitForTimeout(300);',
    n: 1,
    why: 'the address holding still: polled until it has not changed for a while, which a stillness has no moment for',
  },
];

describe(`a wait in a test is a condition: no tick(), setTimeout or waitForTimeout of more than ${WAIT_MS}ms`, () => {
  const key = (file: string, wait: string) => `${file} | ${wait}`;
  const counts = (mods: Module[]) => {
    const n = new Map<string, number>();
    for (const m of mods) for (const w of timedWaits(m.source)) n.set(key(m.path, w.words), (n.get(key(m.path, w.words)) ?? 0) + 1);
    return n;
  };
  test('the fixture’s are found', () => {
    expect(timedWaits(readFileSync(join(FIXTURES, 'timed-waits.ts'), 'utf8')).map((w) => `${w.line}: ${w.words}`)).toStrictEqual([
      '10: await tick(300);',
      '11: await new Promise((r) => setTimeout(r, 1_000));',
      '12: await page.waitForTimeout(400);',
      '13: setTimeout(() => {',
    ]);
  });
  test('the browser tests wait for conditions: a time is allowed only where TIMED says why (until(() => …) otherwise, or settled())', () => {
    const allowed = new Map(TIMED.map((a) => [key(a.file, a.wait), a.n]));
    const over = [...counts(browserTests)].filter(([k, n]) => n > (allowed.get(k) ?? 0)).map(([k, n]) => `${k} (${n}×)`);
    expect(over).toStrictEqual([]);
  });
  test('the suite’s pre-bundled dependencies are the checkout’s own (.vite/), not node_modules’, which a worktree shares by a link', async () => {
    const config = (await import('../vitest.config.ts')).default as { cacheDir?: string; test: { projects: { cacheDir?: string; test: { name: string } }[] } };
    for (const c of [config, ...config.test.projects]) expect(c.cacheDir, 'name' in c.test ? c.test.name : 'the root').toBe(join(ROOT, '.vite'));
  });
  test('every allowed time is still there, as many times as it says, so the list only shrinks', () => {
    const found = counts(browserTests);
    expect(TIMED.filter((a) => (found.get(key(a.file, a.wait)) ?? 0) !== a.n).map((a) => `${key(a.file, a.wait)}: ${found.get(key(a.file, a.wait)) ?? 0}, not ${a.n}`)).toStrictEqual([]);
    for (const a of TIMED) expect(a.why.length, key(a.file, a.wait)).toBeGreaterThan(20);
  });
});

describe('nothing exported that nothing uses (scripts/dead.ts, which npm run lint runs too)', () => {
  test('the fixture’s unused and test-only exports are found, and the used and the tested pass', () => {
    const found = (tested: boolean) => deadExports(join(FIXTURES, 'dead'), tested).map((d) => `${d.path}:${d.line}: ${d.name} (${d.kind})`);
    expect(found(false)).toStrictEqual(['src/made.ts:4: fixtureUnused (unused)', 'src/made.ts:5: fixtureTestOnly (test-only)']);
    expect(found(true)).toContain('src/made.ts:6: fixtureTested (tested)');
  });
  test('the tree has none', () => {
    expect(deadExports().map((d) => `${d.path}:${d.line}: ${d.name} (${d.kind})`)).toStrictEqual([]);
  }, 30_000);
});

/**
 * Words for what is gone (Paul, 2026-10-11: "My guess is a lot of your docs and comments are out of date"): no file
 * names them but the records (docs/history), each with what it was. A sentence that needs one describes something
 * removed, or explains the code by where it came from rather than by what it does.
 */
export const STALE: { word: RegExp; was: string }[] = [
  { word: /\bsignatures?\b/i, was: 'signing a document, and the signatures under it: removed 2026-10-11' },
  { word: /\bsigning\b/i, was: 'the same' },
  { word: /\bkanban\b/i, was: 'the Kanban app: removed 2026-10-11' },
  { word: /\bto-do list\b/i, was: 'the To-do List app: removed 2026-10-11' },
  { word: /\bwebsite builder\b/i, was: 'the Website Builder: removed 2026-10-11' },
  { word: /\bowner key\b/i, was: 'the key that let a short link’s maker change it: removed with the living link' },
  { word: /\bliving (short )?link\b/i, was: 'a short link its maker could change or delete (PUT and DELETE): removed 2026-10-11' },
  { word: /\bpicture proxy\b/i, was: 'the Worker that fetched pictures from the web for a document: removed 2026-10-11' },
  { word: /\bwhitelist\b/i, was: 'the proxy’s list of hosts it would fetch from' },
  { word: /\bpbkdf2\b/i, was: 'the password hash before HKDF, when a person typed passwords: replaced 2026-10-11' },
  { word: /\bthe old tree\b/i, was: 'the code before the rebuild: a comment says what the code does, not where it came from' },
  { word: /\bthe rebuil(d|t)\b/i, was: 'the same: the tree before it is the tag v0-before-rebuild, named by what it holds' },
  { word: /\bdirective r\d/i, was: 'the brief for a round of work (docs/history/directives): the code says why, not which brief asked' },
  { word: /\b(in|added in|since|from) round [a-z0-9]+\b|\(round [a-z0-9]+[,)]/i, was: 'the same, by the round of work' },
  { word: /\bcopy display link\b/i, was: 'Share’s second copy: Edit link and Present link since 2026-10-12' },
  { word: /\bmade with respect by\b/i, was: 'the home page’s foot before Paul’s words of 2026-10-12, "Made with respect in New York City"' },
];

/** The files that may say them, each with why. */
const STALE_OK: Record<string, string> = {
  'test/lints.test.ts': 'the list itself',
  'test/fixtures/lints/stale-words.md': 'the fixture the lint must catch',
  'src/kit/draw/icons-meta.ts': 'Lucide’s own tags for its icons ("signature", "kanban"), generated from its release',
  'src/i18n/fr.ftl': '"une signature" is French for a byline',
  'docs/self-host.md': '`npm audit signatures`, npm’s check of a package’s provenance',
  '.storybook/vite.config.ts': 'the Board’s package and its checkout are named so (@aboard/kanban, ../projects/kanban)',
  'stories/packages/board.stories.ts': 'the Board’s package is named so (@aboard/kanban)',
};

/**
 * Every text file of the tree but the records: what git holds or would add (`--exclude-standard`), so nothing
 * .gitignore keeps out is read, such as dependencies, builds and the Worker's types that `wrangler types` writes.
 */
const RECORDS = /^(docs\/history|docs\/directives)\/|^CHANGELOG\.md$/;
const textFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0')
  .filter((f) => f && !RECORDS.test(f) && existsSync(join(ROOT, f)))
  .filter((f) => /\.(ts|js|mjs|json|jsonc|md|html|css|txt|tlo|ftl|sh|yml|yaml|svg|webmanifest)$|(^|\/)_headers$/.test(f))
  .sort();

describe('no word for what is gone: a sentence about something removed is rewritten or deleted', () => {
  const found = (files: string[]) =>
    files.flatMap((f) =>
      readFileSync(join(ROOT, f), 'utf8')
        .split('\n')
        .flatMap((line, i) => STALE.filter((s) => s.word.test(line)).map((s) => `${f}:${i + 1}: ${s.word.source}`)),
    );
  test('the fixture’s are found, and a word that only holds one is not', () => {
    expect(found(['test/fixtures/lints/stale-words.md'])).toStrictEqual([
      'test/fixtures/lints/stale-words.md:1: \\bkanban\\b',
      'test/fixtures/lints/stale-words.md:1: \\bpicture proxy\\b',
      'test/fixtures/lints/stale-words.md:1: \\bwhitelist\\b',
      'test/fixtures/lints/stale-words.md:5: \\bthe rebuil(d|t)\\b',
      'test/fixtures/lints/stale-words.md:5: \\bdirective r\\d',
      'test/fixtures/lints/stale-words.md:5: \\b(in|added in|since|from) round [a-z0-9]+\\b|\\(round [a-z0-9]+[,)]',
      'test/fixtures/lints/stale-words.md:9: \\bcopy display link\\b',
      'test/fixtures/lints/stale-words.md:9: \\bmade with respect by\\b',
    ]);
  });
  test('the tree has none', () => {
    expect(found(textFiles.filter((f) => !(f in STALE_OK)))).toStrictEqual([]);
  }, 30_000);
  test('every file allowed still says one, so the list only shrinks', () => {
    expect(Object.keys(STALE_OK).filter((f) => !found([f]).length)).toStrictEqual([]);
  });
});

describe('generated outputs are fresh: each generating script, run with --check, finds its files as it would write them', () => {
  test('a stale file is found', () => {
    expect(staleFiles({ 'test/fixtures/lints/stale.md': 'What the script writes now.\n' })).toStrictEqual(['test/fixtures/lints/stale.md']);
    expect(staleFiles({ 'test/fixtures/lints/stale.md': 'What the script wrote once.\n' })).toStrictEqual([]);
  });
  test.each([
    ['network-doc', 'docs/network.md, public/network.html'],
    ['commands', 'docs/editing.md’s tables, the skill and /llms-full.txt'],
    ['make-skill', 'the skill, /llms.txt, /llms-full.txt, the app pages and the examples'],
    ['dependencies', 'docs/dependencies.md'],
    ['exports-doc', 'docs/exports.md'],
    ['schema', 'packages/doc/schema/tlo.schema.json'],
    ['countries', 'the Trip Planner’s table of countries, from the boxes'],
  ])(
    'scripts/%s.ts --check (%s)',
    (script) => {
      let said = '';
      try {
        execFileSync(process.execPath, [join(ROOT, 'scripts', `${script}.ts`), '--check'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) {
        said = String((e as { stderr?: string }).stderr || e);
      }
      expect(said).toBe('');
      // make-skill cuts every app's examples from its templates and lints each: seconds, more on a busy machine.
    },
    60_000,
  );
});

// The build in dist/ is held to them by scripts/budgets.ts, the build's last step, and by test/build.test.ts.
describe('the build’s budgets and shape: the built site within budgets.json, in the shape the design says', () => {
  const built = join(FIXTURES, 'built');
  const gz = (f: string) => gzipSync(readFileSync(join(built, f)), { level: 9 }).length;
  test('the fixture is weighed and counted: the app file, the stylesheet, the templates and the languages; the API in two; the files; the requests before a page’s first paint', () => {
    const sizes = measure(built);
    expect(sizes.app).toBe(gz('assets/app-AAAAAAAA.js'));
    expect(sizes.stylesheet).toBe(gz('assets/app-AAAAAAAA.css'));
    expect(sizes.templates).toStrictEqual({ write: gz('assets/templates-write-AAAAAAAA.js') });
    expect(sizes.languages).toStrictEqual({ fr: gz('assets/lang-fr-AAAAAAAA.js') });
    expect(sizes.api).toBe(gz('api.js'));
    expect(sizes.apiParts).toBe(gz('api/editor-AAAAAAAA.js') + gz('api/parts-AAAAAAAA.js'));
    expect(sizes.files).toBe(11);
    // The home page: itself, a face, the app file and the stylesheet; not the inline script, the icon, nor what a comment names.
    expect(fetchedAtOnce(readFileSync(join(built, 'index.html'), 'utf8'))).toStrictEqual(['./fonts/IBMPlexSans-Regular.woff2', './assets/app-AAAAAAAA.js', './assets/app-AAAAAAAA.css']);
    expect(sizes.requests).toBe(4);
    const budgets: Sizes = JSON.parse(JSON.stringify(sizes));
    budgets.app = 10;
    budgets.requests = 3;
    expect(overBudget(sizes, budgets)).toStrictEqual([`app: ${sizes.app} bytes, over its budget of 10 by ${sizes.app - 10}`, 'requests: 4 requests, over its budget of 3 by 1']);
  });
  test('the fixture’s shape is wrong in every way the check knows, each said', () => {
    expect(lazyImports('a.import({ ln }); import(`./lang-fr-AAAAAAAA.js`); import(name)')).toStrictEqual(['lang-fr-AAAAAAAA.js', '?']);
    expect(shapeOf(built, { apps: ['write', 'sheet'], langs: ['fr'] })).toStrictEqual([
      'assets/ holds 0 files for sheet’s templates, not one',
      'assets/ holds 0 files for the map, not one',
      'assets/ holds 0 files for the map’s worker, not one',
      'assets/write-editor-AAAAAAAA.js: a file the design does not have (one app file, one stylesheet, the templates, the languages, the map and its worker)',
      'assets/app-AAAAAAAA.js imports write-editor-AAAAAAAA.js lazily: only a templates file, a language or the map may be',
      'api/ holds 2 files, not one',
      'api/editor-AAAAAAAA.js holds an element of the page (customElements.define or LitElement): the API carries no editor and no chrome',
      'write/index.html does not name assets/app-AAAAAAAA.css in its head',
      'sw.js still has its unfilled list (scripts/sw-manifest.ts)',
    ]);
  });
  test('budgets.json has a budget for everything it weighs and counts', () => {
    const budgets = readBudgets();
    for (const k of ['app', 'stylesheet', 'api', 'apiParts', 'fonts', 'files', 'requests'] as const) expect(typeof budgets[k], k).toBe('number');
    expect(Object.keys(budgets.templates ?? {}).sort()).toStrictEqual(
      tree
        .filter((m) => /^src\/apps\/[^/]+\/templates\.ts$/.test(m.path))
        .map((m) => m.path.split('/')[2])
        .sort(),
    );
    expect(Object.keys(budgets.languages ?? {}).sort()).toStrictEqual(
      readdirSync(join(ROOT, 'src/i18n'))
        .filter((f) => f.endsWith('.ftl') && f !== 'en.ftl')
        .map((f) => f.replace(/\.ftl$/, ''))
        .sort(),
    );
  });
});

/**
 * The Storybook (docs/library.md, The Storybook) shows every element the kit and the apps define, so a new one cannot
 * land without one: a stories file's meta names it as its `component`, or one of its stories names it in
 * `parameters.covers` (an element drawn only inside another, as a table is inside a text).
 */
describe('stories: every custom element in src/ has a story in stories/', () => {
  const STORIES = join(ROOT, 'stories');
  const storyFiles = (readdirSync(STORIES, { recursive: true }) as string[]).filter((f) => f.endsWith('.stories.ts')).map((f) => readFileSync(join(STORIES, f), 'utf8'));
  test('the fixture’s element with no story is found', () => {
    const told = new Set(storiedOf(readFileSync(join(FIXTURES, 'stories/stories.ts'), 'utf8')));
    expect(elementsOf(readFileSync(join(FIXTURES, 'stories/elements.ts'), 'utf8')).filter((t) => !told.has(t))).toStrictEqual(['to-untold']);
  });
  test('each element defined in src/ is a story’s component or covered by one (stories/**/*.stories.ts)', () => {
    const defined = tree.flatMap((m) => elementsOf(m.source).map((tag) => ({ tag, path: m.path })));
    expect(defined.length).toBeGreaterThan(30);
    expect(defined.filter((d) => d.tag.startsWith('?')).map((d) => `${d.path}: ${d.tag}`)).toStrictEqual([]);
    const told = new Set(storyFiles.flatMap(storiedOf));
    expect(defined.filter((d) => !told.has(d.tag)).map((d) => `${d.path}: <${d.tag}> has no story`)).toStrictEqual([]);
  });
});
