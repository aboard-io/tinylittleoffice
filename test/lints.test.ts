// The rules of the code, held by code (directive r9-lints). Each lint reads the tree, and the tiny bad file of
// test/fixtures/lints that it must catch, so a lint that stops working is seen. A failure names the file, the line
// and what broke the rule, so the next builder can act on it without reading the lint. `npm run lint` runs these
// (with the stylesheet and window-scrolling lints), and `npm run build` runs that first.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { eagerTemplates, firstLoad, measure, overBudget, readBudgets, type Sizes } from '../scripts/budgets.ts';
import { staleFiles } from '../scripts/generated.ts';
import { ALLOWED, NOT_WORDS, bareWords, domNames, graphProblems, type Module } from './lints.ts';

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
      'the kit imports an app outside kit/apps.ts: src/kit/one.ts → src/apps/a/editor.ts',
      'a language is imported outside kit/i18n.ts’s lazy load: src/kit/one.ts → src/i18n/fr.ts',
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

describe('no DOM in the model: the kernel (src/doc) never names window, document, navigator or localStorage', () => {
  const found = (mods: Module[]) => mods.filter((m) => m.path.startsWith('src/doc/')).flatMap((m) => domNames(m.source).map((d) => `${m.path}:${d.line}: ${d.words}`));
  test('the fixture’s is found', () => {
    expect(found(modules(join(FIXTURES, 'graph')))).toStrictEqual(['src/doc/model.ts:3: window']);
  });
  test('src/doc names none', () => {
    expect(found(tree)).toStrictEqual([]);
  });
});

describe('generated outputs are fresh: each generating script, run with --check, finds its files as it would write them', () => {
  test('a stale file is found', () => {
    expect(staleFiles({ 'test/fixtures/lints/stale.md': 'What the script writes now.\n' })).toStrictEqual(['test/fixtures/lints/stale.md']);
    expect(staleFiles({ 'test/fixtures/lints/stale.md': 'What the script wrote once.\n' })).toStrictEqual([]);
  });
  test.each([
    ['network-doc', 'docs/network.md, public/network.html'],
    ['commands', 'docs/editing.md’s tables, the skill and /llms.txt'],
    ['make-skill', 'the skill and /llms.txt'],
    ['dependencies', 'docs/dependencies.md'],
    ['exports-doc', 'docs/exports.md'],
  ])('scripts/%s.ts --check (%s)', (script) => {
    let said = '';
    try {
      execFileSync(process.execPath, [join(ROOT, 'scripts', `${script}.ts`), '--check'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      said = String((e as { stderr?: string }).stderr || e);
    }
    expect(said).toBe('');
  });
});

// The build in dist/ is held to them by scripts/budgets.ts, the build's last step, and by test/budgets.test.ts.
describe('chunk budgets: the built chunks within budgets.json', () => {
  test('the fixture’s entry chunk is over the budget it is given', () => {
    const sizes = measure(join(FIXTURES, 'built'));
    // Opening Write adds its editor, its commands and the chunk they share; the icons are the home page's already.
    const gz = (f: string) => gzipSync(readFileSync(join(FIXTURES, 'built/assets', f)), { level: 9 }).length;
    expect(sizes.editors.write).toStrictEqual({
      editor: gz('write-editor-AAAAAAAA.js'),
      commands: gz('write-commands-AAAAAAAA.js'),
      open: gz('write-editor-AAAAAAAA.js') + gz('write-commands-AAAAAAAA.js') + gz('shared-AAAAAAAA.js'),
    });
    expect(sizes.languages).toStrictEqual({ fr: gz('lang-fr-AAAAAAAA.js') });
    // An app's templates are a chunk of their own, and the home page's first load holds none of them.
    expect(sizes.templates).toStrictEqual({ write: gz('templates-write-AAAAAAAA.js') });
    expect(eagerTemplates(firstLoad(join(FIXTURES, 'built')))).toStrictEqual([]);
    expect(eagerTemplates(['main-AAAAAAAA.js', 'templates-write-AAAAAAAA.js'])).toStrictEqual(['templates-write-AAAAAAAA.js']);
    const budgets: Sizes = JSON.parse(JSON.stringify(sizes));
    budgets.main = 10;
    expect(overBudget(sizes, budgets)).toStrictEqual([`main: ${sizes.main} bytes, over its budget of 10 by ${sizes.main - 10}`]);
  });
  test('budgets.json has a budget for every chunk it weighs', () => {
    const budgets = readBudgets();
    for (const k of ['main', 'apps', 'home', 'icons', 'iconsFull', 'fonts'] as const) expect(typeof budgets[k], k).toBe('number');
    expect(Object.keys(budgets.editors ?? {}).sort()).toStrictEqual(
      tree
        .filter((m) => /^src\/apps\/[^/]+\/editor\.ts$/.test(m.path))
        .map((m) => m.path.split('/')[2])
        .sort(),
    );
    expect(Object.keys(budgets.templates ?? {}).sort()).toStrictEqual(
      tree
        .filter((m) => /^src\/apps\/[^/]+\/templates\.ts$/.test(m.path))
        .map((m) => m.path.split('/')[2])
        .sort(),
    );
    expect(Object.keys(budgets.languages ?? {}).sort()).toStrictEqual(
      tree
        .filter((m) => /^src\/i18n\/[^/]+\.ts$/.test(m.path) && !m.path.endsWith('/en.ts'))
        .map((m) => m.path.split('/')[2].replace(/\.ts$/, ''))
        .sort(),
    );
  });
});
