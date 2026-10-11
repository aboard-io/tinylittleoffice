// A zip back in: unzip is zip's inverse, and a zip of documents (what Download everything writes, or any folder of
// .tlo and .md files) is read as documents, each in its app, everything else in it left alone.
import { test, expect } from 'vitest';
import { unzip, zip } from '../src/kit/zip.ts';
import { readZip } from '../src/kit/plain.ts';

const known = (id: string) => ['write', 'sheet', 'todo', 'deck'].includes(id);
const words = (files: Record<string, Uint8Array>) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new TextDecoder().decode(v)]));

test('unzip gives back what zip was given, in its order, words and bytes alike', () => {
  const files = { 'write/b.tlo': 'Bee\n', 'sheet/a.tlo': 'a | b\n', 'pic.png': new Uint8Array([137, 80, 78, 71, 0, 255]) };
  const back = unzip(zip(files));
  expect(Object.keys(back)).toEqual(['write/b.tlo', 'sheet/a.tlo', 'pic.png']);
  expect(words({ 'write/b.tlo': back['write/b.tlo'], 'sheet/a.tlo': back['sheet/a.tlo'] })).toEqual({ 'write/b.tlo': 'Bee\n', 'sheet/a.tlo': 'a | b\n' });
  expect([...back['pic.png']]).toEqual([137, 80, 78, 71, 0, 255]);
  // Only what is asked for is inflated.
  expect(Object.keys(unzip(zip(files), (name) => name.endsWith('.tlo')))).toEqual(['write/b.tlo', 'sheet/a.tlo']);
});

test('not a zip: an error, for the caller to say so', () => {
  expect(() => unzip(new TextEncoder().encode('just words'))).toThrow();
});

test('a zip of documents is read as documents: the app from the head, else the folder, else the app open now; anything else left alone', () => {
  const files = unzip(
    zip({
      'write/launch-notes.tlo': '---\ntitle: Launch notes\n---\nGo.\n',
      'sheet/untitled.tlo': 'a | b\n--- | ---\n1 | 2\n',
      'write/locked.txt': 'https://tinylittleoffice.com/#/v1/write/Eabc~def\n',
      'notes/shopping.md': '---\napp: todo\n---\n- [ ] Milk\n',
      'loose.md': '# Loose\n',
      'notes.json': '{"a":1}',
      'README.txt': 'What this is.\n',
      '__MACOSX/write/._launch-notes.tlo': 'junk',
      'write/.hidden.tlo': 'hidden\n',
      'write/empty.tlo': '\n',
    }),
  );
  expect(readZip(files, 'deck', known)).toEqual([
    { app: 'write', text: '---\ntitle: Launch notes\n---\nGo.\n', title: 'launch-notes', payload: '' },
    // The name Download everything gives a document with none is no name.
    { app: 'sheet', text: 'a | b\n--- | ---\n1 | 2\n', title: '', payload: '' },
    // A locked document is its link: kept as the link's payload, with no name, as the shell keeps one.
    { app: 'write', text: '', title: '', payload: 'Eabc~def' },
    { app: 'todo', text: '- [ ] Milk\n', title: 'shopping', payload: '' },
    { app: 'deck', text: '# Loose\n', title: 'loose', payload: '' },
  ]);
});
