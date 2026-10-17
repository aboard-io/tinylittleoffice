// The backends from a page (src/kit/share/backends.ts, backends/README.md "Five backends, one shape"): a document opened
// by its address and placed in an editor, whatever holds it. A link's address moves with every edit; a sealed link asks
// the page for its password; and over a journal (backends/journal/journal.ts, answering a fetch of the test's) two
// editors end with one document, a reader's address following and never writing.
import { expect, test } from 'vitest';
import type { ToWriteEditor } from '../../src/apps/write/editor.ts';
import { decodeDoc } from '../../src/kit/core/codec.ts';
import { parseHash, routeHash } from '../../src/kit/core/route.ts';
import { open, place } from '../../src/kit/share/backends.ts';
import { newShared } from '../../src/kit/share/multiparty.ts';
import { newLocker, pack } from '../../src/kit/share/crypt.ts';
import { handle, waiters, type Store } from '../../backends/journal/journal.ts';
import { JournalMemStore } from '../memstore.ts';
import { tick, until } from './wait.ts';

const SERVICE = 'https://journal.test/';
const SITE = 'https://tinylittleoffice.com';
/** The journal service in place: every fetch of the service's address answered by its handler over `store`, as a page of the site asking; a held poll let go when its signal says so. */
function served(store: Store) {
  const real = globalThis.fetch;
  const wake = waiters();
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const r = new Request(input, init);
    if (!r.url.startsWith(SERVICE)) return real(input, init);
    r.headers.set('cf-connecting-ip', '9.9.9.9');
    r.headers.set('origin', SITE);
    const answered = handle(r, store, 'key', Date.now(), SITE, wake);
    const signal = init?.signal;
    if (!signal) return answered;
    return Promise.race([answered, new Promise<Response>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))]);
  }) as typeof fetch;
  return () => void (globalThis.fetch = real);
}

const words = (el: Element) => el.querySelector<HTMLElement>('[contenteditable=true]')!;
/** Typing at `offset` of the first paragraph of an editor on the page. */
const type = async (editor: Element, offset: number, s: string) => {
  words(editor).focus();
  (editor as unknown as ToWriteEditor).text.sel = { anchor: { block: 0, offset }, focus: { block: 0, offset } };
  await (editor as unknown as ToWriteEditor).text.updateComplete;
  for (const ch of s) {
    words(editor).dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: ch, bubbles: true, cancelable: true, composed: true }));
    await tick();
  }
};
const mains = (...ids: string[]) => (document.body.innerHTML = ids.map((id) => `<main id="${id}" class="to-main"></main>`).join(''));
const hashOf = (address: string) => address.slice(address.indexOf('#'));

test('a link: the document is in its address, which moves with every edit, and the moved address opens to the same document', async () => {
  mains('a');
  const opened = (await open('https://tinylittleoffice.com/write/#/v1/write'))!;
  expect(opened).toMatchObject({ app: 'write', text: '', address: 'https://tinylittleoffice.com/write/#/v1/write' });
  const moved: string[] = [];
  const placed = await place(opened, document.querySelector('#a')!, (a) => moved.push(a));
  await type(placed.editor, 0, 'Hi');
  await until(() => moved.length > 0 && decodeDoc(parseHash(hashOf(moved.at(-1)!)).payload).trim() === 'Hi', 'the edit never moved the address');
  expect(moved.at(-1)).toMatch(/^https:\/\/tinylittleoffice\.com\/write\/#\/v1\/write\/./);
  placed.close();
  expect((await open(moved.at(-1)!))!.text.trim()).toBe('Hi');
  expect(await open('https://tinylittleoffice.com/')).toBeNull();
  expect(await open('nothing at all')).toBeNull();
});

test('a sealed link asks the page for its password, opens with the right one alone, and moves sealed', async () => {
  const locker = await newLocker('the-password');
  const address = 'https://tinylittleoffice.com/write/' + routeHash('write', await pack('Secret.\n', locker));
  expect(parseHash(hashOf(address)).sealed).toBe(true);
  expect(await open(address, { password: async () => 'nope' })).toBeNull();
  expect(await open(address, { password: async () => null })).toBeNull();
  expect(await open(address)).toBeNull();
  const opened = (await open(address, { password: async () => 'the-password' }))!;
  expect(opened).toMatchObject({ app: 'write', text: 'Secret.\n' });
  const next = await opened.changed([], 'Secret. More.\n');
  expect(next).not.toBe(address);
  expect(parseHash(hashOf(next)).sealed).toBe(true);
  expect((await open(next, { password: async () => 'the-password' }))!.text).toBe('Secret. More.\n');
});

test('two editors over one journal: what one types the other shows, each told the other’s change over its own; a reader follows and cannot write', async () => {
  const store = new JournalMemStore();
  const done = served(store);
  try {
    mains('a', 'b', 'r');
    const { address, reader } = await newShared(SERVICE, 'write', 'One.\n', 'ann');
    const a = await place((await open(address, { by: 'ann' }))!, document.querySelector('#a')!);
    const b = await place((await open(address, { by: 'bob' }))!, document.querySelector('#b')!);
    const r = await place((await open(reader, { by: 'eve' }))!, document.querySelector('#r')!);
    expect([a.editor.value, b.editor.value, r.editor.value]).toEqual(['One.\n', 'One.\n', 'One.\n']);
    expect(r.editor.readOnly).toBe(true);
    expect(a.editor.readOnly).toBe(false);
    await type(a.editor, 4, ' A');
    await until(() => b.editor.value === 'One. A\n' && r.editor.value === 'One. A\n', 'ann’s typing never reached the others');
    // Bob types at the start while ann goes on at the end: both land, on all three, in the journal's order.
    await Promise.all([type(b.editor, 0, 'B '), type(a.editor, 6, 'A')]);
    await until(() => a.editor.value === 'B One. AA\n' && b.editor.value === a.editor.value && r.editor.value === a.editor.value, 'the two edits never settled on every page');
    expect(store.journals.values().next().value!.last).toBeGreaterThanOrEqual(3);
    // The reader's page edits nothing: no entry is written for it.
    const last = store.journals.values().next().value!.last;
    (r.editor as unknown as ToWriteEditor).text.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: 0 } };
    words(r.editor)?.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'x', bubbles: true, cancelable: true, composed: true }));
    await tick(50);
    expect(store.journals.values().next().value!.last).toBe(last);
    expect(r.editor.value).toBe('B One. AA\n');
    a.close();
    b.close();
    r.close();
  } finally {
    done();
  }
});
