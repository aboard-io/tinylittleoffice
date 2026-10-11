// The byte-stability gate: every canonical document the old tree held (templates, the guide's examples, the apps'
// examples) is written back by the kernel exactly as it was. The corpus is in corpus/, one file a source;
// `node test/doc/corpus/make.ts` writes it again from the old tree.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parse, write } from '../../src/doc/index.ts';
import { apps } from '../../src/kit/apps.ts';

const dir = join(import.meta.dirname, 'corpus');
const files = [...readdirSync(dir).filter((f) => f.endsWith('.json')), ...readdirSync(join(dir, 'apps')).map((f) => `apps/${f}`)];
const corpus = files.map((f) => ({ file: f, ...(JSON.parse(readFileSync(join(dir, f), 'utf8')) as { source: string; docs: { name: string; text: string }[] }) }));

test('the corpus is there: every source, dozens of documents', () => {
  expect(files.length).toBeGreaterThanOrEqual(20);
  expect(corpus.reduce((n, c) => n + c.docs.length, 0)).toBeGreaterThanOrEqual(80);
});

for (const { file, docs } of corpus)
  for (const { name, text } of docs)
    test(`${file} ${name}: write(parse(x)) === x`, () => {
      // TLO ends with one newline; a template body was trimmed. Granting that one byte, the text is exactly itself.
      const canon = text.endsWith('\n') ? text : text + '\n';
      expect(write(parse(text))).toBe(canon);
      // And reading what was written gives the same document.
      expect(parse(write(parse(text)))).toStrictEqual(parse(text));
    });

// And every template of every app on this tree: what the apps themselves write is canonical too.
for (const app of apps())
  for (const tpl of await app.templates())
    test(`${app.id}/${tpl.id}: write(parse(x)) === x`, () => {
      expect(write(parse(tpl.doc))).toBe(tpl.doc);
      expect(parse(write(parse(tpl.doc)))).toStrictEqual(parse(tpl.doc));
    });
