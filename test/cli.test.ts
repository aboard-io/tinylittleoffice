// The command line (packages/doc/tinyoffice.ts): links from files and files from links, as Node 24 runs it.
import { test, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../packages/doc/tinyoffice.ts', import.meta.url));
const run = (args: string[], input = '') => execFileSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });

test('a link from a file, and the file back from the link', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-'));
  writeFileSync(join(dir, 'chores.tlo'), '---\ntitle: Chores\napp: outline\n---\n- [ ] Sweep\n- [x] Shop\n');
  const url = run(['link', join(dir, 'chores.tlo')]).trim();
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/outline\/#\/v2\/outline\/[wv]/);
  expect(run(['read', url])).toBe('---\ntitle: Chores\n---\n- [ ] Sweep\n- [x] Shop\n');
  const out = join(dir, 'back.tlo');
  expect(run(['file', url, '--out', out]).trim()).toBe(out);
  expect(readFileSync(out, 'utf8')).toBe('---\ntitle: Chores\napp: outline\n---\n- [ ] Sweep\n- [x] Shop\n');
  // The app's own Markdown, where it has one (a list's is the list).
  expect(run(['file', url, '--as', 'md', '--out', '-'])).toContain('- [ ] Sweep\n- [x] Shop\n');
});

test('stdin, the plain form, a show link, and JSON', () => {
  expect(run(['link', 'deck', '--title', 'Talk', '--view', 'show'], '## One\n').trim()).toMatch(/\?show$/);
  expect(run(['link', 'write', '--lang', 'ht'], 'Bonjou\n').trim()).toMatch(/\?lang=ht$/);
  expect(run(['link', 'outline', '--plain', '--title', 'Shop'], '- [ ] Milk\n').trim()).toBe('https://tinylittleoffice.com/outline/#title=Shop&doc=-+%5B+%5D+Milk');
  expect(JSON.parse(run(['read', 'https://tinylittleoffice.com/outline/#title=Shop&doc=-+%5B+%5D+Milk', '--json']))).toMatchObject({ app: 'outline', title: 'Shop' });
});

test('json gives the document as JSON; read --json carries it; a link and a file come back from it; file --as json is the download', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-'));
  const url = run(['link', 'outline', '--title', 'Chores'], '- [ ] Sweep \\ \n  - [x] Shop\n').trim();
  const json = run(['json', url]);
  expect(JSON.parse(json)).toStrictEqual({
    head: { title: 'Chores' },
    blocks: [
      { k: 'li', depth: 0, done: false, runs: [{ t: 'Sweep  ' }] },
      { k: 'li', depth: 1, done: true, runs: [{ t: 'Shop' }] },
    ],
  });
  expect(JSON.parse(run(['read', url, '--json']))).toMatchObject({ app: 'outline', title: 'Chores', json: JSON.parse(json) });
  // Back from JSON: the same link, the app given or named in the head.
  writeFileSync(join(dir, 'chores.json'), json);
  expect(run(['link', 'outline', '--json', join(dir, 'chores.json')]).trim()).toBe(url);
  expect(run(['link', 'outline', '--json'], json).trim()).toBe(url);
  const out = join(dir, 'chores.json');
  expect(run(['file', url, '--as', 'json', '--out', out]).trim()).toBe(out);
  expect(JSON.parse(readFileSync(out, 'utf8')).head).toStrictEqual({ title: 'Chores', app: 'outline' });
  expect(run(['link', '--json', out]).trim()).toBe(url);
  // A .tlo file, or an app and stdin, as lint takes them.
  writeFileSync(join(dir, 'chores.tlo'), run(['file', url, '--out', '-']));
  expect(run(['json', join(dir, 'chores.tlo')])).toBe(json);
  expect(run(['json', 'outline'], run(['read', url]))).toBe(json);
  // JSON that is not a document is said so, with where.
  const bad = spawnSync(process.execPath, [CLI, 'link', 'write', '--json'], { input: '{"head":{},"blocks":[{"k":"p","runs":[{}]}]}', encoding: 'utf8' });
  expect(bad.status).toBe(2);
  expect(bad.stderr).toContain('blocks[0].runs[0].t is missing');
});

test('diff says what changed and exits 1; the same document exits 0; a bad link is said so', () => {
  const a = run(['link', 'outline'], '- [ ] Milk\n- [ ] Eggs\n').trim();
  const b = run(['link', 'outline'], '- [ ] Milk\n- [x] Eggs\n').trim();
  const d = spawnSync(process.execPath, [CLI, 'diff', a, b], { encoding: 'utf8' });
  expect(d.status).toBe(1);
  expect(d.stdout).toBe('  - [ ] Milk\n- - [ ] Eggs\n+ - [x] Eggs\n');
  expect(spawnSync(process.execPath, [CLI, 'diff', a, a]).status).toBe(0);
  const bad = spawnSync(process.execPath, [CLI, 'read', 'https://example.com/'], { encoding: 'utf8' });
  expect(bad.status).toBe(2);
  expect(bad.stderr).toContain('Not a Tiny Little Office link');
  expect(run(['templates', 'sheet'])).toContain('budget');
  expect(run(['apps'])).toContain('Spreadsheet');
});

test('lint says what the eye would have seen, a line a finding, and exits 1; a clean document exits 0', () => {
  const FIX = fileURLToPath(new URL('./fixtures/lint/', import.meta.url));
  const bad = spawnSync(process.execPath, [CLI, 'lint', join(FIX, 'fence-bullets.tlo')], { encoding: 'utf8' });
  expect(bad.status).toBe(1);
  expect(bad.stdout).toBe(
    'deck · slide 1 · the slide shows the chart alone; the 3 lines beside it ("Measured at the end of round ten", …) are not drawn · put them in the notes (> lines) or on a slide of their own\n',
  );
  const json = JSON.parse(spawnSync(process.execPath, [CLI, 'lint', join(FIX, 'edge-end.tlo'), '--json'], { encoding: 'utf8' }).stdout);
  expect(json.findings).toMatchObject([{ block: 4, kind: 'edge-end', app: 'diagram', at: 'block 5' }]);
  expect(Object.keys(json.findings[0])).toEqual(expect.arrayContaining(['block', 'kind', 'words', 'fix']));
  const ok = spawnSync(process.execPath, [CLI, 'lint', join(FIX, 'fence-bullets.ok.tlo')], { encoding: 'utf8' });
  expect([ok.status, ok.stdout]).toStrictEqual([0, '']);
  // A link, and an app with the document on stdin, as `link` takes them.
  const url = run(['link', join(FIX, 'comma-number.tlo')]).trim();
  expect(spawnSync(process.execPath, [CLI, 'lint', url], { encoding: 'utf8' }).stdout).toContain('reads as two things');
  expect(spawnSync(process.execPath, [CLI, 'lint', 'deck'], { input: '## One\n\n```sheet\nA | B\n--- | ---\n1 | 2\n```\n\n- Hidden\n', encoding: 'utf8' }).status).toBe(1);
});

test('measure gives the sizes the layouts chose, as JSON', () => {
  const FIX = fileURLToPath(new URL('./fixtures/lint/', import.meta.url));
  const m = JSON.parse(run(['measure', join(FIX, 'body.tlo')]));
  expect(m).toMatchObject({ app: 'deck', short: { fits: true, over: 0 }, slides: [{ slide: 1, body: { px: 14, smallest: true } }] });
  expect(m.slides[0].body.over).toBeGreaterThan(0);
  expect(JSON.parse(run(['measure', join(FIX, 'edge-end.tlo')])).diagram.edges).toStrictEqual({ written: 1, drawn: 0, dropped: 1 });
  expect(JSON.parse(run(['measure', join(FIX, 'sheet-circ.tlo')])).tables).toStrictEqual([{ block: 0, formulas: 1, errors: [{ cell: 'B8', formula: '=SUM(B2:B8)', error: '#CIRC' }] }]);
});

test('lint works out a table’s formulas: a total that takes in its own cell is a finding, with the range it meant', () => {
  const FIX = fileURLToPath(new URL('./fixtures/lint/', import.meta.url));
  const bad = spawnSync(process.execPath, [CLI, 'lint', join(FIX, 'sheet-circ.tlo')], { encoding: 'utf8' });
  expect([bad.status, bad.stdout]).toStrictEqual([
    1,
    'sheet · block 1 · the table "The codebase": B8, =SUM(B2:B8), is #CIRC · the range includes the cell itself; rows count from the first data row: =SUM(B1:B7)\n',
  ]);
  expect(spawnSync(process.execPath, [CLI, 'lint', join(FIX, 'sheet-circ.ok.tlo')], { encoding: 'utf8' }).status).toBe(0);
});

test('read --text gives the document as what it says, in Markdown: a link, a .tlo file, or an app and stdin', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-'));
  writeFileSync(join(dir, 'net.tlo'), '---\ntitle: Supply\napp: diagram\nkind: net\n---\n- Shop\n- Warehouse\n~ Shop -> Warehouse: orders\n');
  const md = '# Supply\n\n## Shop\n\n## Warehouse\n\n## Connections\n\n- Shop → Warehouse: orders\n';
  expect(run(['read', '--text', join(dir, 'net.tlo')])).toBe(md);
  expect(run(['read', '--text', run(['link', join(dir, 'net.tlo')]).trim()])).toBe(md);
  expect(run(['read', '--text', 'sheet'], 'Item | Cost:money\n--- | ---\nRent | 1200\n')).toBe('Item | Cost\n--- | ---\nRent | $1,200.00\n');
});

test('measure counts the words a reader hears and the headings they move between', () => {
  const m = JSON.parse(run(['measure', 'write'], '# One two\n\nThree four.\n'));
  expect([m.words, m.headings]).toEqual([4, 1]);
});

test('link --seal prints the link and, on a second line, the password the app made; --password is refused', async () => {
  const { unseal } = await import('../src/kit/share/crypt.ts');
  const { unpackDoc } = await import('../src/kit/core/codec.ts');
  const { parseHash } = await import('../src/kit/core/route.ts');
  const [url, password, ...more] = run(['link', 'write', '--seal', '--title', 'Pay'], 'Salaries are up.\n').trimEnd().split('\n');
  expect(more).toEqual([]);
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/write\/#\/v2\/write\/e/);
  expect(password).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
  const opened = await unseal(password, parseHash(new URL(url).hash).payload);
  expect(unpackDoc(opened!.flag, opened!.bytes)).toBe('---\ntitle: Pay\n---\nSalaries are up.\n');
  const r = spawnSync(process.execPath, [CLI, 'link', 'write', '--seal', '--password', 'tulip'], { input: 'x\n', encoding: 'utf8' });
  expect(r.status).toBe(2);
  expect(r.stderr).toBe('tinyoffice: The app makes the password; ask for one with seal.\n');
  expect(r.stdout).toBe('');
});

test('shapes, example and try: what an app reads, the smallest document of each shape, and a draft in one call', () => {
  expect(run(['shapes', 'sheet']).split('\n')[0]).toMatch(/^money +a money column, /);
  const venn = run(['example', 'diagram', 'venn']);
  expect(venn).toMatch(/^## venn: a Venn diagram\n/);
  for (const part of [
    '```\n---\nkind: venn\n---\n',
    'As a link: https://tinylittleoffice.com/diagram/#doc=',
    'The JSON:\n\n{\n  "head": {',
    'The lint: clean',
    'The measures:\n\n{\n  "app": "diagram"',
  ])
    expect(venn).toContain(part);
  const bad = spawnSync(process.execPath, [CLI, 'example', 'sheet', 'nope'], { encoding: 'utf8' });
  expect([bad.status, bad.stderr]).toStrictEqual([2, 'tinyoffice: sheet has no shape "nope"; its shapes: money, formula, bar, line, pie, sankey, model, lock, date, check, percent, option\n']);
  const draft = spawnSync(process.execPath, [CLI, 'try', 'diagram', '-', '--json'], { input: '---\nkind: venn\n---\n- Cats: 2,000 cases\n- Dogs: walks\n', encoding: 'utf8' });
  expect(draft.status).toBe(1);
  const t = JSON.parse(draft.stdout);
  expect([t.lint[0].kind, t.measure.app, t.json.head.kind]).toStrictEqual(['comma-number', 'diagram', 'venn']);
  expect(spawnSync(process.execPath, [CLI, 'try', 'write', '-'], { input: '# Hello\n', encoding: 'utf8' }).stdout).toMatch(/^The lint: clean\n\nThe measures:/);
});

test('example, run for every app and every shape, is clean every time', { timeout: 120_000 }, () => {
  const ids = run(['apps'])
    .trim()
    .split('\n')
    .map((l) => l.split(' ')[0]);
  expect(ids).toContain('diagram');
  for (const a of ids) {
    const all = JSON.parse(run(['example', a, '--json'])) as { id: string; lint: unknown[]; text: string }[];
    expect(all.length, a).toBeGreaterThan(0);
    for (const x of all) expect(x.lint, `${a} ${x.id}`).toStrictEqual([]);
  }
});

test('file --as webm says the video is made in the browser and exits 2, and the help says so beside the format', () => {
  for (const [app, text] of [
    ['anim', ''],
    ['deck', '## One\n'],
  ]) {
    const url = run(['link', app], text).trim();
    const r = spawnSync(process.execPath, [CLI, 'file', url, '--as', 'webm', '--out', '-'], { encoding: 'utf8' });
    expect(r.status, app).toBe(2);
    expect(r.stdout, app).toBe('');
    expect(r.stderr, app).toBe('tinyoffice: WebM is made in the browser: open the link and save it from Download.\n');
  }
  expect(run(['help'])).toMatch(/tinyoffice file <link>[^\n]*\n[^\n]*\n[^\n]*--as webm: made in the browser/);
});

// The skill an agent installs: the repository's skill/tinyoffice/ (npm run skill writes it), its SKILL.md printed as it
// is, or the folder written where Claude Code reads a skills folder, <dir>/tinyoffice/ (SKILL.md and references/*.md),
// never over one already there unless asked (Paul, 2026-10-12: "How are people supposed to install the skill or know
// it's there?"; 2026-10-15: the skill as a folder, "make skills work like they are supposed to work").
test('skill prints SKILL.md; --into writes the folder, refuses a second time, and replaces it whole with --force', () => {
  const root = fileURLToPath(new URL('../skill/tinyoffice/', import.meta.url));
  const files = [
    'SKILL.md',
    ...readdirSync(join(root, 'references'))
      .sort()
      .map((f) => `references/${f}`),
  ];
  expect(files.length).toBeGreaterThan(10);
  const skill = readFileSync(join(root, 'SKILL.md'), 'utf8');
  expect(run(['skill'])).toBe(skill);
  const dir = join(mkdtempSync(join(tmpdir(), 'tlo-skill-')), 'skills');
  const folder = join(dir, 'tinyoffice');
  const to = join(folder, 'SKILL.md');
  expect(run(['skill', '--into', dir])).toBe(files.map((f) => join(folder, f)).join('\n') + '\n');
  for (const f of files) expect(readFileSync(join(folder, f), 'utf8'), f).toBe(readFileSync(join(root, f), 'utf8'));
  writeFileSync(to, 'a skill of my own\n');
  writeFileSync(join(folder, 'references', 'gone.md'), 'a reference of an earlier version\n');
  const again = spawnSync(process.execPath, [CLI, 'skill', '--into', dir], { encoding: 'utf8' });
  expect([again.status, again.stdout, again.stderr]).toStrictEqual([1, '', `tinyoffice: ${folder} is there already; --force replaces it\n`]);
  expect(readFileSync(to, 'utf8')).toBe('a skill of my own\n');
  expect(run(['skill', '--force', '--into', dir])).toBe(files.map((f) => join(folder, f)).join('\n') + '\n');
  expect(readFileSync(to, 'utf8')).toBe(skill);
  expect(existsSync(join(folder, 'references', 'gone.md'))).toBe(false);
  const where = spawnSync(process.execPath, [CLI, 'skill', '--into'], { encoding: 'utf8' });
  expect(where.status).toBe(2);
  // The help names it beside shapes, example and try, with the line that installs it for Claude Code.
  const help = run(['help']);
  for (const cmd of ['shapes', 'example', 'try', 'skill']) expect(help).toContain(`tinyoffice ${cmd} `);
  expect(help.indexOf('tinyoffice skill ')).toBeGreaterThan(help.indexOf('tinyoffice try '));
  expect(help).toContain('npx tinylittleoffice skill --into ~/.claude/skills');
});
