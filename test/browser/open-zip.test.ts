// A zip back in (Paul, 2026-10-11: "Let me download all my docs as a single zip file and upload them too"): a drop
// takes a zip (the menu's Open a file… and Download everything are gone: Paul, 2026-10-12); under Saved its documents
// are kept, under Private a dialog lists them and offers to keep them or open one; one document opens; and a zip as
// Download everything wrote it, dropped on an empty device, gives the library it was written from.
import { test, expect, afterEach, vi } from 'vitest';
import { dropFile, mount, said, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/core/codec.ts';
import { library, forgetAll } from '../../src/kit/share/library.ts';
import { setKeeping } from '../../src/kit/core/store.ts';
import { keeping, lockWith } from '../../src/kit/share/privacy.ts';
import { pack } from '../../src/kit/share/crypt.ts';
import { zip } from '../../src/kit/file/zip.ts';
import { toast as say } from '../../src/kit/core/say.ts';
import type { ToDialog } from '../../src/kit/ui/dialog.ts';

afterEach(() => {
  vi.restoreAllMocks();
  setKeeping(true);
  forgetAll();
  setKeeping(false);
  history.replaceState(null, '', location.pathname);
});

const toast = said;
const zipFile = (files: Record<string, string>) => new File([zip(files) as BlobPart], 'tiny-little-office.zip', { type: 'application/zip' });

const shape = () => library().map(({ app, title, hash }) => ({ app, title, hash }));

test('a zip as Download everything wrote it, dropped on an empty device: the same library, titles, apps, texts and order; dropped again, nothing doubled', async () => {
  setKeeping(true);
  const launch = '---\ntitle: Launch notes\n---\nGo.\n';
  const sheet = 'a | b\n--- | ---\n1 | 2\n';
  const locked = await pack('secret', await lockWith('never-in-base64'));
  const errands = '---\ntitle: Errands\n---\n- [ ] Milk\n';
  const file = zipFile({
    'write/launch-notes.tlo': launch,
    'sheet/untitled.tlo': sheet,
    'write/locked.txt': `https://tinylittleoffice.example/#/v1/write/${locked}\n`,
    'outline/errands.tlo': errands,
  });
  const shell = await mount('');
  expect(shell.querySelector('.to-home')!.textContent).not.toContain('Launch notes');
  dropFile(file);
  await until(() => toast() === '4 documents kept');
  expect(shape()).toEqual([
    { app: 'write', title: 'Launch notes', hash: `#/v1/write/${encodeDoc(launch)}` },
    { app: 'sheet', title: '', hash: `#/v1/sheet/${encodeDoc(sheet)}` },
    { app: 'write', title: '', hash: `#/v1/write/${locked}` },
    { app: 'outline', title: 'Errands', hash: `#/v1/outline/${encodeDoc(errands)}` },
  ]);
  // The home page has them, nothing reloaded.
  await until(() => shell.querySelector('.to-home')!.textContent!.includes('Launch notes'));
  // The same zip again: nothing doubled.
  say('');
  await until(() => toast() === '');
  dropFile(file);
  await until(() => toast() === '4 documents kept' && library().length === 4);
});

test('under Private a zip lists its documents by app and name: Open the first, a name, or Keep them on this device (Saved turned on, said so)', async () => {
  const docs = {
    'write/plan.tlo': '---\ntitle: Plan\n---\nFirst.\n',
    'sheet/costs.tlo': '---\ntitle: Costs\n---\na | b\n--- | ---\n1 | 2\n',
    'write/memo.md': 'Just words.\n',
    'notes.json': '{}',
  };
  await mount('');
  dropFile(zipFile(docs));
  const dialog = () => document.querySelector<ToDialog>('to-dialog.to-zip-dialog')!;
  await until(() => !!dialog()?.dialog?.open);
  expect(library()).toEqual([]);
  const body = dialog().querySelector('.to-dialog-body')!;
  expect([...body.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Word Processor', 'Spreadsheet']);
  expect([...body.querySelectorAll('.to-zip-docs a')].map((a) => a.textContent!.trim())).toEqual(['Plan', 'memo', 'Costs']);
  // Open the first.
  body.querySelector<HTMLButtonElement>('.to-zip-first')!.click();
  await until(() => location.hash.startsWith('#/v1/write/') && !dialog().dialog.open);
  expect(location.hash).toBe(`#/v1/write/${encodeDoc('---\ntitle: Plan\n---\nFirst.\n')}`);
  expect(keeping()).toBe(false);
  await tick(50); // the hashchange heard before the next shell is mounted
  // A name opens that one; one with no name of its own is called by its file's.
  await mount('');
  dropFile(zipFile(docs));
  await until(() => !!dialog()?.dialog?.open);
  [...dialog().querySelectorAll<HTMLAnchorElement>('.to-zip-docs a')].find((a) => a.textContent!.trim() === 'memo')!.click();
  await until(() => !dialog().dialog.open && location.hash.startsWith('#/v1/write/'));
  expect(location.hash).toBe(`#/v1/write/${encodeDoc('---\ntitle: memo\n---\nJust words.\n')}`);
  await tick(50);
  // Keep them on this device.
  await mount('');
  dropFile(zipFile(docs));
  await until(() => !!dialog()?.dialog?.open);
  dialog().querySelector<HTMLButtonElement>('.to-zip-keep')!.click();
  await until(() => toast() === 'Saving in this browser: 3 documents kept');
  expect(keeping()).toBe(true);
  expect(library().map((k) => [k.app, k.title])).toEqual([
    ['write', 'Plan'],
    ['sheet', 'Costs'],
    ['write', 'memo'],
  ]);
  expect(dialog().dialog.open).toBe(false);
});

test('Cancel keeps nothing and opens nothing', async () => {
  await mount('');
  dropFile(zipFile({ 'write/a.tlo': 'A\n', 'write/b.tlo': 'B\n' }));
  const dialog = () => document.querySelector<ToDialog>('to-dialog.to-zip-dialog')!;
  await until(() => !!dialog()?.dialog?.open);
  dialog().querySelector<HTMLButtonElement>('.to-zip-cancel')!.click();
  await until(() => !dialog().dialog.open);
  expect(location.hash).toBe('');
  expect(keeping()).toBe(false);
});

test('a zip of one document opens it, as that file would; a zip of none says so', async () => {
  setKeeping(true);
  await mount('');
  dropFile(zipFile({ 'sheet/costs.tlo': '---\ntitle: Costs\n---\na | b\n', 'README.txt': 'hi\n' }));
  await until(() => location.hash.startsWith('#/v1/sheet/'));
  expect(location.hash).toBe(`#/v1/sheet/${encodeDoc('---\ntitle: Costs\n---\na | b\n')}`);
  expect(document.querySelector('to-dialog.to-zip-dialog')?.querySelector('dialog')?.open ?? false).toBe(false);
  await mount('');
  dropFile(zipFile({ 'README.txt': 'hi\n' }));
  await until(() => toast() === 'No readable documents found in that zip.');
  expect(location.hash).toBe('');
});

test('a zip dropped on the page, under Saved: its documents kept', async () => {
  setKeeping(true);
  await mount('');
  const dt = new DataTransfer();
  dt.items.add(zipFile({ 'write/a.tlo': '---\ntitle: A\n---\nA\n', 'outline/b.tlo': '---\ntitle: B\n---\n- [ ] B\n' }));
  window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  await until(() => toast() === '2 documents kept');
  expect(library().map((k) => [k.app, k.title])).toEqual([
    ['write', 'A'],
    ['outline', 'B'],
  ]);
});
