// A .json back in (the document as JSON): what Download → Data (JSON) gives opens as its .tlo would, in its app
// and with its words byte for byte, dropped on the page; a .json that is not a document is said so and opens nothing.
import { test, expect, afterEach } from 'vitest';
import { dropFile, mount, said, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { appOf } from '../../src/kit/core/apps.ts';
import { formatOf } from '../../src/kit/file/exports.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

test('the .json a document downloads as opens as that document, in its app', async () => {
  const text = '---\ntitle: Costs\n---\nItem | Cost:money\n--- | ---\nRent\\  | 1200\n';
  const def = appOf('sheet')!;
  const json = (await formatOf(def, 'json')!.build(text, { def, title: 'Costs', link: '' })) as string;
  expect(JSON.parse(json).head).toStrictEqual({ title: 'Costs', app: 'sheet' });
  await mount('');
  dropFile(new File([json], 'costs.json', { type: 'application/json' }));
  await until(() => location.hash.startsWith('#/v2/sheet/'));
  expect(location.hash).toBe(`#/v2/sheet/${encodeDoc(text)}`);
});

test('a .json that is not a document is said so, and nothing opens', async () => {
  await mount('');
  dropFile(new File(['{"head":{},"blocks":[{"k":"shape"}]}'], 'other.json', { type: 'application/json' }));
  await until(() => said() === 'Tiny Little Office can’t read that file.');
  expect(location.hash).toBe('');
});
