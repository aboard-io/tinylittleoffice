// The icon: a square PNG with the document inside (Paul, 2026-10-14: "an icon preview format that carries the document
// as metadata? PNG and uncompressed tlo"). Download → Icon builds it; dropped on the page, the document opens again in
// its app, byte for byte; a PNG that carries no document is said so. The page's own PNG carries nothing.
import { test, expect, afterEach } from 'vitest';
import { dropFile, mount, said, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { appOf } from '../../src/kit/core/apps.ts';
import { formatOf, formatsOf } from '../../src/kit/file/exports.ts';
import { KEYWORD, textOf } from '../../src/kit/file/png.ts';
import { tloText } from '../../src/kit/core/plain.ts';

afterEach(() => history.replaceState(null, '', location.pathname));

const text = '---\ntitle: Costs\n---\nItem | Cost:money\n--- | ---\nRent\\  | 1200\n';

test('the icon is a square PNG, the document inside it under "tlo", listed after the picture; the picture carries nothing', async () => {
  const def = appOf('sheet')!;
  const exts = formatsOf(def).map((f) => f.ext);
  expect(exts.indexOf('icon.png')).toBe(exts.indexOf('png') + 1);
  const ctx = { def, title: 'Costs', link: '' };
  const png = (await formatOf(def, 'icon.png')!.build(text, ctx)) as Uint8Array;
  expect([...png.subarray(1, 4)]).toEqual([80, 78, 71]);
  const bitmap = await createImageBitmap(new Blob([png as BlobPart], { type: 'image/png' }));
  expect([bitmap.width, bitmap.height]).toEqual([1024, 1024]);
  expect(textOf(png, KEYWORD)).toBe(tloText('sheet', text));
  expect(textOf((await formatOf(def, 'png')!.build(text, ctx)) as Uint8Array, KEYWORD)).toBeNull();
});

test('the icon dropped on the page opens its document, in its app, byte for byte', async () => {
  const def = appOf('sheet')!;
  const png = (await formatOf(def, 'icon.png')!.build(text, { def, title: 'Costs', link: '' })) as Uint8Array;
  await mount('');
  dropFile(new File([png as BlobPart], 'costs.icon.png', { type: 'image/png' }));
  await until(() => location.hash.startsWith('#/v1/sheet/'));
  expect(location.hash).toBe(`#/v1/sheet/${encodeDoc(text)}`);
  expect(said()).toBe('Opened costs.icon.png');
});

test('a PNG that carries no document is said so, and nothing opens', async () => {
  const def = appOf('sheet')!;
  const png = (await formatOf(def, 'png')!.build(text, { def, title: 'Costs', link: '' })) as Uint8Array;
  await mount('');
  dropFile(new File([png as BlobPart], 'costs.png', { type: 'image/png' }));
  await until(() => said() === 'That picture carries no document.');
  expect(location.hash).toBe('');
});
