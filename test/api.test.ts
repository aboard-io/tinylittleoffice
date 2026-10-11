// The API (src/api.ts, served at /api.js): links made and read over the kernel, without a browser.
import { test, expect } from 'vitest';
import { apps, compare, decode, encode, file, formats, fromTlo, link, parse, plain, read, templates, tlo, write } from '../src/api.ts';

test('encode and decode are the codec; parse and write the kernel', () => {
  const text = '# Hello\n\nWorld\n';
  expect(decode(encode(text))).toBe(text);
  expect(decode('not a payload')).toBe('');
  expect(write(parse(text))).toBe(text);
  expect(parse(text).blocks[0]).toMatchObject({ k: 'h', level: 1 });
});

test('link makes the packed link, with a title and by in the head; read takes it back', () => {
  const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget', by: 'planner' });
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/sheet\/#\/v1\/sheet\/[yzr][A-Za-z0-9_~]+$/);
  const r = read(url);
  expect(r).toEqual({ app: 'sheet', view: '', text: '---\ntitle: Budget\nby: planner\n---\nItem | Cost:money\n--- | ---\nRent | 1200\n', title: 'Budget', by: 'planner', display: false });
  expect(link('write', 'x', { view: 'pdf', site: 'http://localhost:4178' })).toMatch(/^http:\/\/localhost:4178\/write\/#\/v1\/write\.pdf\//);
  expect(link('deck', '## A', { show: true }).endsWith('?show')).toBe(true);
  expect(read(link('write', 'x', { display: true })).display).toBe(true);
  // Only the fragment will do too.
  expect(read(url.slice(url.indexOf('#'))).app).toBe('sheet');
  expect(() => link('No Such', 'x')).toThrow();
  expect(() => read('https://example.com/')).toThrow(/Not a Tiny Little Office link/);
  expect(() => read('https://tinylittleoffice.com/write/#/v1/write/zAAAA')).toThrow(/cannot be read/);
});

test('a link can open in a language: lang, beside the Display Link and the show link, read back', () => {
  const url = link('write', '# Bonjou\n', { lang: 'ht' });
  expect(url).toMatch(/^https:\/\/tinylittleoffice\.com\/write\/#\/v1\/write\/[yzr][A-Za-z0-9_~]+\?lang=ht$/);
  expect(read(url)).toMatchObject({ app: 'write', text: '# Bonjou\n', lang: 'ht' });
  expect(read(link('write', 'x'))).not.toHaveProperty('lang');
  expect(link('deck', '## A', { show: true, display: true, lang: 'pt-br' })).toMatch(/\?d&lang=pt-br&show$/);
  expect(link('deck', '## A', { show: true, lang: 'ar' })).toMatch(/\?lang=ar&show$/);
  expect(() => link('write', 'x', { lang: 'Not a language' })).toThrow(/language/);
});

test('a plain link is read as the document it stands for', () => {
  const url = plain('todo', '- [ ] Milk\n', { title: 'Shop', by: 'agent' });
  expect(url).toBe('https://tinylittleoffice.com/todo/#title=Shop&by=agent&doc=-+%5B+%5D+Milk');
  expect(read(url)).toEqual({ app: 'todo', view: '', text: '---\nby: agent\ntitle: Shop\n---\n- [ ] Milk\n', title: 'Shop', by: 'agent', display: false });
});

test('a .tlo file is the text with its app in the head, both ways', () => {
  expect(tlo('todo', '- [ ] Milk\n')).toBe('---\napp: todo\n---\n- [ ] Milk\n');
  expect(fromTlo('---\napp: todo\n---\n- [ ] Milk\n')).toEqual({ app: 'todo', text: '- [ ] Milk\n' });
});

test('compare: what the second link changed', () => {
  const a = link('todo', '- [ ] Milk\n- [ ] Eggs\n');
  const b = link('todo', '- [ ] Milk\n- [x] Eggs\n');
  expect(compare(a, a)).toMatchObject({ same: true, removed: 0, added: 0 });
  expect(compare(a, b)).toMatchObject({ same: false, removed: 1, added: 1 });
});

test('the apps, their templates and the files they make without a browser', async () => {
  const all = await apps();
  expect(all.map((a) => a.id)).toContain('sheet');
  expect(all.find((a) => a.id === 'sheet')).toMatchObject({ name: 'Spreadsheet', noun: 'spreadsheet' });
  const tpl = await templates('sheet');
  expect(tpl[0]).toMatchObject({ id: 'budget', name: 'Budget' });
  expect(tpl[0].text).toContain('=SUM(');
  await expect(templates('nope')).rejects.toThrow();
  expect(await formats('sheet')).toEqual(expect.arrayContaining(['md', 'tlo', 'csv', 'xlsx']));
  expect(await file('sheet', 'A | B\n--- | ---\n1 | 2\n', 'csv')).toBeInstanceOf(Uint8Array);
  expect(await file('todo', '- [ ] Milk\n', 'tlo')).toBe('---\napp: todo\n---\n- [ ] Milk\n');
  expect(await file('sheet', 'A^[a note]\n', 'md')).toBe('A[^1]\n\n[^1]: a note\n');
  await expect(file('sheet', 'x', 'pptx')).rejects.toThrow(/makes no \.pptx/);
});
