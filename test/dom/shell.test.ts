// The shell around the editors, in happy-dom: titles, the library, the menu, keeping (ported from e2e/more.spec.ts).
import { test, expect, beforeEach } from 'vitest';
import { type, button, press, setSl } from './helpers.ts';
import { open, visit, reopen, go, prefs, box, typeRich, saved, settleAll, shortcut, until } from './helpers-more.ts';

beforeEach(() => prefs());

test('a document has a title of its own', async () => {
  await open('#/v0/sheet');
  const title = () => box(document, 'Title');
  // Until it is given one, it says what it is.
  expect(title().placeholder).toBe('Untitled Sheet');
  expect(document.title).toBe('Untitled Sheet · TinyLittleOffice');
  type(title(), 'Q3 budget');
  await settleAll();
  expect(document.title).toBe('Q3 budget · TinyLittleOffice');
  await until(() => expect(location.hash).toMatch(/#\/v0\/sheet\/[yzr]/));
  await reopen();
  expect(title().value).toBe('Q3 budget');
  // Downloads are named after it.
  shortcut('s');
  await until(() => expect(saved.at(-1)?.name).toBe('q3-budget.xlsx'));
  // A deck with no name of its own goes by its first headline.
  await go('#/v0/deck');
  typeRich(box(document, 'Headline'), 'Spring launch');
  await settleAll();
  expect(title().placeholder).toBe('Spring launch');
  type(title(), 'Board deck');
  await settleAll();
  expect(document.title).toBe('Board deck · TinyLittleOffice');
});

const keep = () => document.querySelector<HTMLButtonElement>('.to-keep')!;
const typeDoc = async (words: string) => {
  typeRich(box(document, 'Document'), words);
  await settleAll();
};
const addTask = async (task: string) => {
  const add = document.querySelector('sl-input.todo-new')!;
  setSl(add, task, 'sl-input');
  press(add, 'Enter');
  await settleAll();
};

test('the library: documents are kept on the device, in folders, once asked', async () => {
  // Private unless asked: nothing written at all.
  localStorage.clear();
  await open('#/v0/write');
  expect(keep().textContent!.trim()).toBe('Private');
  await typeDoc('Nothing kept of this');
  await go('#/');
  expect(document.querySelector('.to-library')).toBeNull();
  expect(Object.keys(localStorage)).toEqual([]);
  await go('#/v0/write');
  keep().click();
  await until(() => expect(keep().textContent!.trim()).toBe('Saved'));
  // (The suite's own preference, cleared above with the rest: links open for editing.)
  await visit('#/v0/write');
  await typeDoc('Notes from the quay');
  type(box(document, 'Title'), 'Quay notes');
  await settleAll();
  await go('#/v0/todo');
  await addTask('Buy milk');
  await until(() => expect(location.hash).toMatch(/#\/v0\/todo\/[yzr]/));
  // Home glimpses them; Drive holds them, each in a folder named for its app.
  await go('#/');
  const library = document.querySelector('.to-library')!;
  expect(link(library, /Quay notes/)).toBeTruthy();
  await go(link(library, /Drive, all 2/).getAttribute('href')!);
  const drive = document.querySelector('to-drive')!;
  const folders = () => [...drive.querySelectorAll('.drive-nav nav a .name')].map((n) => n.textContent);
  expect(folders()).toEqual(['Everything', 'Todo', 'Write']);
  expect(link(drive, /Quay notes/)).toBeTruthy();
  // Into a folder of your own, nested with a slash.
  answer('Harbor/Plans');
  button(drive, 'Move Quay notes to another folder').click();
  await settleAll();
  expect(folders()).toEqual(['Everything', 'Harbor', 'Plans', 'Todo']);
  [...drive.querySelectorAll<HTMLElement>('.drive-nav nav a')].find((a) => a.textContent!.includes('Plans'))!.click();
  await settleAll();
  expect(drive.querySelector('h1')!.textContent).toContain('Harbor/Plans');
  expect(drive.querySelectorAll('.drive-list li')).toHaveLength(1);
  // Search looks inside the documents, not only at their titles.
  type(box(drive, 'Search your documents'), 'milk');
  await settleAll();
  expect(drive.querySelectorAll('.drive-list li')).toHaveLength(1);
  expect(drive.querySelector('.drive-list li')!.textContent).toContain('Todo');
  // It shows where: the line inside that says it, the words marked.
  expect([...drive.querySelectorAll('.drive-list li .drive-context mark')].map((m) => m.textContent)).toEqual(['milk']);
  expect(drive.querySelector('.drive-context')!.textContent).toContain('Buy milk');
  // Every word must be there, in any order; one in the title comes first, marked there.
  type(box(drive, 'Search your documents'), 'quay notes');
  await settleAll();
  expect([...drive.querySelectorAll('.drive-list li b mark')].map((m) => m.textContent)).toEqual(['Quay', 'notes']);
  type(box(drive, 'Search your documents'), 'quay milk');
  await settleAll();
  expect(drive.querySelectorAll('.drive-list li')).toHaveLength(0);
  type(box(drive, 'Search your documents'), '');
  await settleAll();
  // It opens as it was left; changing it keeps it in its folder.
  await go(link(drive, /Quay notes/).getAttribute('href')!);
  expect(box(document, 'Document').textContent).toContain('Notes from the quay');
  await typeDoc('Notes from the quay, and more');
  await visit('#/drive');
  expect(folders2()).toEqual(['Everything', 'Harbor', 'Plans', 'Todo']);
  await go(link(document.querySelector('to-drive')!, /Quay notes/).getAttribute('href')!);
  expect(box(document, 'Document').textContent).toContain('and more');
  await go('#/drive');
  // Rename a folder; remove a document.
  const drive2 = document.querySelector('to-drive')!;
  answer('Harbour');
  button(drive2, 'Rename Harbor').click();
  await settleAll();
  expect(folders2()).toEqual(['Everything', 'Harbour', 'Plans', 'Todo']);
  button(drive2, 'Remove Quay notes from this device').click();
  await settleAll();
  expect(folders2()).toEqual(['Everything', 'Todo']);
  expect(drive2.textContent).toContain('Saved only on this device');
  // All of them at once; the links still open.
  const todo = link(drive2, /Untitled Todo/).getAttribute('href')!;
  answer(true);
  drive2.querySelector<HTMLButtonElement>('.drive-nuke')!.click();
  await settleAll();
  expect(drive2.querySelectorAll('.drive-list li')).toHaveLength(0);
  await go(todo);
  expect(document.querySelector('to-todo')!.textContent).toContain('Buy milk');
});

const folders2 = () => [...document.querySelectorAll('to-drive .drive-nav nav a .name')].map((n) => n.textContent);
const link = (root: ParentNode, name: RegExp) => {
  const a = [...root.querySelectorAll('a')].find((a) => name.test(a.textContent ?? ''));
  if (!a) throw new Error(`no link ${name}`);
  return a;
};
/** What the next prompt or confirm is answered with. */
const answer = (with_: string | boolean) => {
  window.prompt = () => (typeof with_ === 'string' ? with_ : null);
  window.confirm = () => !!with_;
};

test('the menu finds an app by name', async () => {
  await open('/');
  const drawer = document.querySelector('#nav-drawer')!;
  const find = box(drawer, 'Find an app');
  const shown = () => [...drawer.querySelectorAll('.to-drawer-nav a:not([hidden])')].map((a) => a.textContent!.trim());
  type(find, 'zin');
  await settleAll();
  expect(shown()).toEqual(['Zine']);
  type(find, 'play');
  await settleAll();
  expect(shown()).toHaveLength(2);
  type(find, 'split');
  await settleAll();
  // Enter follows the first app found, which (like every app in the menu) opens in a new tab.
  const followed: HTMLAnchorElement[] = [];
  const keep = (e: Event) => (e.preventDefault(), followed.push((e.target as Element).closest('a')!));
  drawer.addEventListener('click', keep);
  press(find, 'Enter');
  drawer.removeEventListener('click', keep);
  expect(followed.map((a) => [a.getAttribute('href'), a.target])).toEqual([['#/v0/split', '_blank']]);
});

test('keeping documents is opt in, and off again erases them', async () => {
  localStorage.clear();
  await open('#/v0/todo');
  keep().click();
  await until(() => expect(keep().getAttribute('aria-pressed')).toBe('true'));
  await addTask('Buy milk');
  await until(() => expect(location.hash).toMatch(/#\/v0\/todo\/[yzr]/));
  await go('#/');
  expect(document.querySelectorAll('.to-library li')).toHaveLength(1);
  await go('#/v0/write');
  answer(true);
  keep().click();
  await until(() => expect(keep().textContent!.trim()).toBe('Private'));
  await go('#/');
  expect(document.querySelector('.to-library')).toBeNull();
  // Private means nothing of ours left behind.
  expect(Object.keys(localStorage)).toEqual([]);
});

test('everything can be made larger from the menu, and it is remembered', async () => {
  await open('#/v0/todo');
  const size = () => [...document.querySelectorAll<HTMLElement>('#nav-drawer .to-size sl-button')];
  expect(size()[1].textContent).toContain('100%');
  size()[2].click();
  await settleAll();
  size()[2].click();
  await settleAll();
  expect(size()[1].textContent).toContain('120%');
  expect(document.documentElement.style.getPropertyValue('zoom')).toBe('1.2');
  await reopen(true);
  expect(document.documentElement.style.getPropertyValue('zoom')).toBe('1.2');
  size()[1].click();
  await settleAll();
  expect(document.documentElement.style.getPropertyValue('zoom')).toBe('');
});

test('room for a link says when length does not matter', async () => {
  await open('#/v0/write');
  await typeDoc('Some words. '.repeat(20));
  document.querySelector<HTMLElement>('.to-meter sl-progress-ring')!.click();
  await settleAll();
  const rooms = [...document.querySelectorAll('#doc-dialog .to-rooms tbody tr')];
  // Bluesky shows a short form of any link, so the document can grow without using up a post.
  expect(rooms.find((r) => r.textContent!.includes('Bluesky'))!.textContent).toContain('any length');
  expect(rooms.find((r) => r.textContent!.includes('Discord'))!.textContent).toMatch(/\d/);
});
