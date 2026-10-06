/** Writes the deflate dictionaries into the Python package, byte for byte, so its links decode here and ours there. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_DICTS } from '../src/lib/dicts.ts';
import { DICTIONARY_TEXT } from '../src/lib/codec.ts';

const py = [
  '"""The deflate dictionaries, generated from src/lib/codec.ts and dicts.ts by `npm run py-dicts`. FROZEN: do not edit."""',
  '',
  `DICTIONARY = ${JSON.stringify(DICTIONARY_TEXT)}.encode("utf-8")`,
  '',
  'APP_DICTS = {',
  ...Object.entries(APP_DICTS).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
  '}',
  '',
];
writeFileSync(resolve(import.meta.dirname, '../packages/python/tinylittleoffice/dicts.py'), py.join('\n'));
