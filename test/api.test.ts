// The API (src/api.ts, served at /api.js): links made and read over the kernel, without a browser.
import { test, expect } from 'vitest';
import { apps, compare, decode, encode, file, formats, fromJson, fromTlo, link, markdown, parse, plain, read, templates, text, tlo, toJson, write } from '../src/api.ts';

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
  const said = '---\ntitle: Budget\nby: planner\n---\nItem | Cost:money\n--- | ---\nRent | 1200\n';
  expect(r).toEqual({ app: 'sheet', view: '', text: said, json: toJson(said), title: 'Budget', by: 'planner', display: false });
  expect(fromJson(r.json)).toBe(said);
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
  const url = plain('outline', '- [ ] Milk\n', { title: 'Shop', by: 'agent' });
  expect(url).toBe('https://tinylittleoffice.com/outline/#title=Shop&by=agent&doc=-+%5B+%5D+Milk');
  const said = '---\nby: agent\ntitle: Shop\n---\n- [ ] Milk\n';
  expect(read(url)).toEqual({ app: 'outline', view: '', text: said, json: toJson(said), title: 'Shop', by: 'agent', display: false });
});

test('a .tlo file is the text with its app in the head, both ways', () => {
  expect(tlo('outline', '- [ ] Milk\n')).toBe('---\napp: outline\n---\n- [ ] Milk\n');
  expect(fromTlo('---\napp: outline\n---\n- [ ] Milk\n')).toEqual({ app: 'outline', text: '- [ ] Milk\n' });
});

test('compare: what the second link changed', () => {
  const a = link('outline', '- [ ] Milk\n- [ ] Eggs\n');
  const b = link('outline', '- [ ] Milk\n- [x] Eggs\n');
  expect(compare(a, a)).toMatchObject({ same: true, removed: 0, added: 0 });
  expect(compare(a, b)).toMatchObject({ same: false, removed: 1, added: 1 });
});

test('the apps, their templates and the files they make without a browser', async () => {
  const all = await apps();
  expect(all.map((a) => a.id)).toEqual(['write', 'outline', 'deck', 'sheet', 'calc', 'draw', 'pinboard', 'diagram', 'anim', 'cal', 'trip']);
  expect(all.find((a) => a.id === 'sheet')).toMatchObject({ name: 'Spreadsheet', noun: 'spreadsheet' });
  const tpl = await templates('sheet');
  expect(tpl[0]).toMatchObject({ id: 'budget', name: 'Budget' });
  expect(tpl[0].text).toContain('=SUM(');
  await expect(templates('nope')).rejects.toThrow();
  expect(await formats('sheet')).toEqual(expect.arrayContaining(['md', 'tlo', 'json', 'csv', 'xlsx']));
  expect(await file('sheet', 'A | B\n--- | ---\n1 | 2\n', 'csv')).toBeInstanceOf(Uint8Array);
  expect(await file('outline', '- [ ] Milk\n', 'tlo')).toBe('---\napp: outline\n---\n- [ ] Milk\n');
  // The .json is the kernel's document with its app in its head, as the .tlo is the text with it.
  expect(await file('outline', '- [ ] Milk\n', 'json')).toBe(toJson('---\napp: outline\n---\n- [ ] Milk\n'));
  expect(await file('sheet', 'A^[a note]\n', 'md')).toBe('A[^1]\n\n[^1]: a note\n');
  await expect(file('sheet', 'x', 'pptx')).rejects.toThrow(/makes no \.pptx/);
});

test('text(link): the document as what it says, in Markdown, its title first; markdown(app, text) for one in hand', async () => {
  const url = link('write', '# Minutes\n\nWe met.^[On Tuesday.]\n', { title: 'Minutes' });
  // The title is the document's first heading already: said once.
  expect(await text(url)).toBe('# Minutes\n\nWe met.[^1]\n\n[^1]: On Tuesday.\n');
  expect(await text(link('todo', '- [x] Milk\n- [ ] Eggs\n', { title: 'Shop' }))).toBe('# Shop\n\n- [x] Milk\n- [ ] Eggs\n');
  expect(await markdown('calc', 'a = 2\na * 3\n')).toBe('a = 2\na * 3\n');
});

test('seal: the app makes the password (Paul, 2026-10-11); the link holds ciphertext and the password it returns opens it', async () => {
  const { unseal } = await import('../src/kit/share/crypt.ts');
  const { unpackDoc } = await import('../src/kit/core/codec.ts');
  const { parseHash } = await import('../src/kit/core/route.ts');
  const sealed = await link('write', 'Salaries are up.\n', { title: 'Pay', seal: true });
  expect(sealed.password).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
  expect(sealed.url).toMatch(/^https:\/\/tinylittleoffice\.com\/write\/#\/v1\/write\/E[A-Za-z0-9_~]+$/);
  expect(sealed.url).not.toContain('Salaries');
  const payload = parseHash(new URL(sealed.url).hash).payload;
  const opened = await unseal(sealed.password, payload);
  expect(unpackDoc(opened!.flag, opened!.bytes)).toBe('---\ntitle: Pay\n---\nSalaries are up.\n');
  expect(await unseal('Hq7wN-3mXkd-RtP9z-aVb4s', payload)).toBeNull();
  // Two seals, two passwords.
  expect((await link('write', 'x', { seal: true })).password).not.toBe(sealed.password);
});

test('a password supplied from outside is refused, with or without seal', async () => {
  const refused = 'The app makes the password; ask for one with seal.';
  expect(() => link('write', 'x', { password: 'tulip' } as never)).toThrow(refused);
  expect(() => link('write', 'x', { seal: true, password: 'tulip' } as never)).toThrow(refused);
});
