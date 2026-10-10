// Nothing of the round's dev tools ships (directive r9-common): the grammar and its generators (test/doc/tlo-grammar.ts),
// fast-check, and the dictionary's training (scripts/dictionary.ts) never reach the built site. Runs on the build in
// dist/ when there is one (after `npm run build`); with none it has nothing to look at.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const dist = join(import.meta.dirname, '../dist');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : /\.(js|html|css)$/.test(e.name) ? [join(dir, e.name)] : []));

/** Words only the dev tools hold (names are minified away, words are not): the grammar's, its reader's, fast-check's, the trainer's. */
const DEV_ONLY = ['block      = paragraph | heading', 'grammar: no rule', 'Property failed after', 'fast-check', 'The rule is not met', 'Dictionary today:'];

test.skipIf(!existsSync(dist))('the built site holds nothing of the grammar, its generators, fast-check or the dictionary\'s training', () => {
  const found = files(dist).flatMap((f) => DEV_ONLY.filter((s) => readFileSync(f, 'utf8').includes(s)).map((s) => `${f.slice(dist.length + 1)}: ${s}`));
  expect(found).toStrictEqual([]);
});
