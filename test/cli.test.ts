// The command line (packages/doc/tinyoffice.ts): links from files and files from links, as Node 24 runs it.
import { test, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../packages/doc/tinyoffice.ts', import.meta.url));
const run = (args: string[], input = '') => execFileSync(process.execPath, [CLI, ...args], { input, encoding: 'utf8' });

test('a link from a file, and the file back from the link', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tlo-'));
  writeFileSync(join(dir, 'chores.tlo'), '---\ntitle: Chores\napp: outline\n---\n- [ ] Sweep\n- [x] Shop\n');
  const url = run(['link', join(dir, 'chores.tlo')]).trim();
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/outline\/#\/v1\/outline\/[yzr]/);
  expect(run(['read', url])).toBe('---\ntitle: Chores\n---\n- [ ] Sweep\n- [x] Shop\n');
  const out = join(dir, 'back.tlo');
  expect(run(['file', url, '--out', out]).trim()).toBe(out);
  expect(readFileSync(out, 'utf8')).toBe('---\ntitle: Chores\napp: outline\n---\n- [ ] Sweep\n- [x] Shop\n');
  // The app's own Markdown, where it has one (a list's is the list).
  expect(run(['file', url, '--as', 'md', '--out', '-'])).toContain('- [ ] Sweep\n- [x] Shop\n');
});

test('stdin, the plain form, a show link, and JSON', () => {
  expect(run(['link', 'deck', '--title', 'Talk', '--view', 'show'], '## One\n').trim()).toMatch(/\?show$/);
  expect(run(['link', 'outline', '--plain', '--title', 'Shop'], '- [ ] Milk\n').trim()).toBe('https://tinylittleoffice.com/outline/#title=Shop&doc=-+%5B+%5D+Milk');
  expect(JSON.parse(run(['read', 'https://tinylittleoffice.com/outline/#title=Shop&doc=-+%5B+%5D+Milk', '--json']))).toMatchObject({ app: 'outline', title: 'Shop' });
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
  expect(m).toMatchObject({ app: 'deck', slides: [{ slide: 1, body: { px: 14, smallest: true } }] });
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
