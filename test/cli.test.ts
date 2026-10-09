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
  writeFileSync(join(dir, 'chores.tlo'), '---\ntitle: Chores\napp: todo\n---\n- [ ] Sweep\n- [x] Shop\n');
  const url = run(['link', join(dir, 'chores.tlo')]).trim();
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/todo\/#\/v1\/todo\/[yzr]/);
  expect(run(['read', url])).toBe('---\ntitle: Chores\n---\n- [ ] Sweep\n- [x] Shop\n');
  const out = join(dir, 'back.tlo');
  expect(run(['file', url, '--out', out]).trim()).toBe(out);
  expect(readFileSync(out, 'utf8')).toBe('---\ntitle: Chores\napp: todo\n---\n- [ ] Sweep\n- [x] Shop\n');
  // The app's own Markdown, where it has one (a list's is the list).
  expect(run(['file', url, '--as', 'md', '--out', '-'])).toContain('- [ ] Sweep\n- [x] Shop\n');
});

test('stdin, the plain form, a show link, and JSON', () => {
  expect(run(['link', 'deck', '--title', 'Talk', '--view', 'show'], '## One\n').trim()).toMatch(/\?show$/);
  expect(run(['link', 'todo', '--plain', '--title', 'Shop'], '- [ ] Milk\n').trim()).toBe('https://tinylittleoffice.com/todo/#title=Shop&doc=-+%5B+%5D+Milk');
  expect(JSON.parse(run(['read', 'https://tinylittleoffice.com/todo/#title=Shop&doc=-+%5B+%5D+Milk', '--json']))).toMatchObject({ app: 'todo', title: 'Shop' });
});

test('diff says what changed and exits 1; the same document exits 0; a bad link is said so', () => {
  const a = run(['link', 'todo'], '- [ ] Milk\n- [ ] Eggs\n').trim();
  const b = run(['link', 'todo'], '- [ ] Milk\n- [x] Eggs\n').trim();
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
