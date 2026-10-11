// A zip back in (Paul, 2026-10-11: "Let me download all my docs as a single zip file and upload them too"): Open a
// file… and a drop take a zip; under Saved its documents are kept, under Private a dialog lists them and offers to keep
// them or open one; one document opens; and Download everything, then the zip opened on an empty device, gives the
// same library.
import { test, expect, afterEach, beforeAll, vi } from 'vitest';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { keep, library, forgetAll } from '../../src/kit/library.ts';
import { setKeeping, store } from '../../src/kit/store.ts';
import { keeping, lockCost, lockWith, pack } from '../../src/kit/privacy.ts';
import { zip } from '../../src/kit/zip.ts';
import { toast as say } from '../../src/kit/toast.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import type { ToDialog } from '../../src/kit/dialog.ts';

beforeAll(() => {
  lockCost.iterations = 1000;
});
afterEach(() => {
  vi.restoreAllMocks();
  setKeeping(true);
  forgetAll();
  setKeeping(false);
  history.replaceState(null, '', location.pathname);
});

const toast = () => document.querySelector('[role=status]')?.textContent ?? '';
const zipFile = (files: Record<string, string>) => new File([zip(files) as BlobPart], 'tiny-little-office.zip', { type: 'application/zip' });

/** Open a file…, from the drawer, given `file` as the picker gives it. */
async function openFromDrawer(shell: ToShell, file: File) {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('dialog.to-drawer[open] .to-open-input'));
  const input = shell.querySelector<HTMLInputElement>('.to-open-input')!;
  expect(input.accept).toContain('.zip');
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** What saveFile hands over (through the browser's own save-as), while `body` runs. */
async function saved(body: (files: () => File[]) => Promise<void>) {
  const files: File[] = [];
  const w = window as unknown as { showSaveFilePicker?: unknown };
  const had = w.showSaveFilePicker;
  w.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async (f: File) => void files.push(f), close: async () => {} }) });
  try {
    await body(() => files);
  } finally {
    w.showSaveFilePicker = had;
  }
}

const shape = () => library().map(({ app, title, hash }) => ({ app, title, hash }));

test('Download everything, then the zip opened on an empty device: the same library, titles, apps, texts and order; the key left alone', async () => {
  setKeeping(true);
  const now = Date.now();
  keep({ id: 'a', app: 'write', title: 'Launch notes', hash: `#/v1/write/${encodeDoc('---\ntitle: Launch notes\n---\nGo.\n')}`, at: now });
  keep({ id: 'b', app: 'sheet', title: '', hash: `#/v1/sheet/${encodeDoc('a | b\n--- | ---\n1 | 2\n')}`, at: now - 1 });
  keep({ id: 'c', app: 'write', title: '', hash: `#/v1/write/${await pack('secret', await lockWith('pw'))}`, at: now - 2 });
  keep({ id: 'd', app: 'todo', title: 'Errands', hash: `#/v1/todo/${encodeDoc('---\ntitle: Errands\n---\n- [ ] Milk\n')}`, at: now - 3 });
  const before = shape();
  let shell = await mount('');
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('.to-drawer-privacy'));
  shell.querySelector<HTMLButtonElement>('.to-drawer-privacy')!.click();
  const privacy = shell.querySelector('to-drawer to-privacy')!;
  await until(() => !!privacy.querySelector('.to-download-all'));
  let file: File | null = null;
  await saved(async (files) => {
    privacy.querySelector<HTMLButtonElement>('.to-download-all')!.click();
    await until(() => files().length === 1);
    file = files()[0];
  });
  // An empty device.
  forgetAll();
  store.remove('tinyoffice.key');
  shell = await mount('');
  expect(shell.querySelector('.to-home')!.textContent).not.toContain('Launch notes');
  await openFromDrawer(shell, new File([file!], 'tiny-little-office.zip', { type: 'application/zip' }));
  await until(() => toast() === '4 documents kept');
  expect(shape()).toEqual(before);
  expect(store.get('tinyoffice.key')).toBeNull();
  // The home page has them, nothing reloaded.
  await until(() => shell.querySelector('.to-home')!.textContent!.includes('Launch notes'));
  // The same zip again: nothing doubled.
  say('');
  await until(() => toast() === '');
  await openFromDrawer(shell, new File([file!], 'tiny-little-office.zip', { type: 'application/zip' }));
  await until(() => toast() === '4 documents kept' && library().length === 4);
});

test('under Private a zip lists its documents by app and name: Open the first, a name, or Keep them on this device (Saved turned on, said so)', async () => {
  const docs = {
    'write/plan.tlo': '---\ntitle: Plan\n---\nFirst.\n',
    'sheet/costs.tlo': '---\ntitle: Costs\n---\na | b\n--- | ---\n1 | 2\n',
    'write/memo.md': 'Just words.\n',
    'signing-key.json': '{}',
  };
  const shell = await mount('');
  await openFromDrawer(shell, zipFile(docs));
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
  await openFromDrawer(document.querySelector<ToShell>('to-shell')!, zipFile(docs));
  await until(() => !!dialog()?.dialog?.open);
  [...dialog().querySelectorAll<HTMLAnchorElement>('.to-zip-docs a')].find((a) => a.textContent!.trim() === 'memo')!.click();
  await until(() => !dialog().dialog.open && location.hash.startsWith('#/v1/write/'));
  expect(location.hash).toBe(`#/v1/write/${encodeDoc('---\ntitle: memo\n---\nJust words.\n')}`);
  await tick(50);
  // Keep them on this device.
  await mount('');
  await openFromDrawer(document.querySelector<ToShell>('to-shell')!, zipFile(docs));
  await until(() => !!dialog()?.dialog?.open);
  dialog().querySelector<HTMLButtonElement>('.to-zip-keep')!.click();
  await until(() => toast() === 'Saved on this device from now on: 3 documents kept');
  expect(keeping()).toBe(true);
  expect(library().map((k) => [k.app, k.title])).toEqual([
    ['write', 'Plan'],
    ['sheet', 'Costs'],
    ['write', 'memo'],
  ]);
  expect(dialog().dialog.open).toBe(false);
});

test('Cancel keeps nothing and opens nothing', async () => {
  const shell = await mount('');
  await openFromDrawer(shell, zipFile({ 'write/a.tlo': 'A\n', 'write/b.tlo': 'B\n' }));
  const dialog = () => document.querySelector<ToDialog>('to-dialog.to-zip-dialog')!;
  await until(() => !!dialog()?.dialog?.open);
  dialog().querySelector<HTMLButtonElement>('.to-zip-cancel')!.click();
  await until(() => !dialog().dialog.open);
  expect(location.hash).toBe('');
  expect(keeping()).toBe(false);
});

test('a zip of one document opens it, as a dropped file would; a zip of none says so', async () => {
  setKeeping(true);
  const shell = await mount('');
  await openFromDrawer(shell, zipFile({ 'sheet/costs.tlo': '---\ntitle: Costs\n---\na | b\n', 'README.txt': 'hi\n' }));
  await until(() => location.hash.startsWith('#/v1/sheet/'));
  expect(location.hash).toBe(`#/v1/sheet/${encodeDoc('---\ntitle: Costs\n---\na | b\n')}`);
  expect(document.querySelector('to-dialog.to-zip-dialog')?.querySelector('dialog')?.open ?? false).toBe(false);
  await mount('');
  await openFromDrawer(document.querySelector<ToShell>('to-shell')!, zipFile({ 'README.txt': 'hi\n' }));
  await until(() => toast() === 'That zip holds no documents Tiny Little Office can read.');
  expect(location.hash).toBe('');
});

test('a zip dropped on the page, under Saved: its documents kept', async () => {
  setKeeping(true);
  await mount('');
  const dt = new DataTransfer();
  dt.items.add(zipFile({ 'write/a.tlo': '---\ntitle: A\n---\nA\n', 'todo/b.tlo': '---\ntitle: B\n---\n- [ ] B\n' }));
  window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  await until(() => toast() === '2 documents kept');
  expect(library().map((k) => [k.app, k.title])).toEqual([
    ['write', 'A'],
    ['todo', 'B'],
  ]);
});
